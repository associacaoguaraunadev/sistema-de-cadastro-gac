import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { gerarTokenGeracao, listarTokens, revogarToken } from './autenticacao/tokens.js';

// Pool de conexão Prisma - CRUCIAL para serverless
let prisma;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn']
    });
  }
  return prisma;
}

// Sistema otimizado para alta concorrência (60+ funcionários)
let clientesSSE = new Set();
let ultimosEventos = new Map(); // Cache de eventos para sincronização
let instanciaId = Math.random().toString(36).substring(7);

// 🛡️ RATE LIMITING POR USUÁRIO (mantido para outras funções se necessário)
let rateLimitMap = new Map(); // userId -> { requests: number, resetTime: number }

function adicionarClienteSSE(res, usuarioId) {
  const cliente = { 
    res, 
    usuarioId, 
    conectadoEm: new Date(),
    instanciaId,
    ativo: true
  };
  clientesSSE.add(cliente);
  
  log(`🔗 Cliente SSE conectado: ${usuarioId} na instância ${instanciaId}, Total: ${clientesSSE.size}`);
  
  // Limpar cliente quando conexão fechar
  res.on('close', () => {
    cliente.ativo = false;
    clientesSSE.delete(cliente);
    log(`🔌 Cliente SSE desconectado: ${usuarioId} da instância ${instanciaId}`);
  });
  
  // Heartbeat para manter conexão ativa no Vercel
  const heartbeat = setInterval(() => {
    try {
      if (cliente.ativo && !res.destroyed) {
        res.write(`event: heartbeat\n`);
        res.write(`data: ${JSON.stringify({ timestamp: new Date(), instanciaId })}\n\n`);
        log(`💓 Heartbeat enviado para cliente ${usuarioId}`);
      } else {
        clearInterval(heartbeat);
      }
    } catch (erro) {
      clearInterval(heartbeat);
      cliente.ativo = false;
      clientesSSE.delete(cliente);
      log(`❌ Erro no heartbeat para cliente ${usuarioId}: ${erro.message}`, 'error');
    }
  }, 300000); // A cada 5 minutos (300 segundos) - apenas manter conexão
  
  cliente.heartbeat = heartbeat;
  
  return cliente;
}

// Sistema aprimorado de envio SSE com suporte a múltiplas instâncias Vercel
function enviarEventoSSE(evento, dados) {
  const eventoId = Math.random().toString(36).substring(7);
  const timestamp = new Date().toISOString();
  
  log(`📤 Preparando envio SSE: ${evento} (ID: ${eventoId}) da instância ${instanciaId} para ${clientesSSE.size} clientes`);
  
  // Armazenar evento no cache para sincronização entre instâncias
  ultimosEventos.set(eventoId, {
    evento,
    dados,
    timestamp,
    instanciaOrigem: instanciaId
  });
  
  // Limpar eventos antigos (manter apenas os últimos 10)
  if (ultimosEventos.size > 10) {
    const primeirachave = ultimosEventos.keys().next().value;
    ultimosEventos.delete(primeirachave);
  }
  
  // Enviar para clientes locais desta instância
  enviarParaClientesLocais(evento, dados, eventoId);
  
  // Broadcast global para outras possíveis instâncias via sistema de heartbeat
  broadcastGlobal(evento, dados, eventoId, timestamp);
}

function enviarParaClientesLocais(evento, dados, eventoId) {
  if (clientesSSE.size === 0) {
    log(`⚠️ Nenhum cliente SSE local conectado para receber evento: ${evento}`, 'error');
    return;
  }

  const eventoData = JSON.stringify({ ...dados, eventoId, instanciaOrigem: instanciaId });
  let sucessos = 0;
  let erros = 0;
  
  clientesSSE.forEach(cliente => {
    try {
      if (cliente.ativo && !cliente.res.destroyed) {
        log(`📨 Enviando ${evento} para cliente ${cliente.usuarioId} (instância ${cliente.instanciaId})...`);
        cliente.res.write(`event: ${evento}\n`);
        cliente.res.write(`data: ${eventoData}\n\n`);
        sucessos++;
      } else {
        log(`🚫 Cliente ${cliente.usuarioId} inativo, removendo...`);
        clientesSSE.delete(cliente);
        erros++;
      }
    } catch (erro) {
      log(`❌ Erro ao enviar SSE para cliente ${cliente.usuarioId}: ${erro.message}`, 'error');
      cliente.ativo = false;
      if (cliente.heartbeat) clearInterval(cliente.heartbeat);
      clientesSSE.delete(cliente);
      erros++;
    }
  });
  
  log(`📊 Resultado envio local SSE: ${sucessos} sucessos, ${erros} erros`);
}

// Sistema de broadcast global para múltiplas instâncias Vercel
async function broadcastGlobal(evento, dados, eventoId, timestamp) {
  try {
    log(`🌐 Iniciando broadcast global do evento ${evento} (ID: ${eventoId})`);
    
    // Nota: Em um ambiente serverless, não podemos garantir comunicação direta entre instâncias
    // O sistema de heartbeat + cache de eventos já ajuda na sincronização
    // Para uma solução completa, seria necessário usar Redis, WebSockets externos, ou Pusher
    
    // Por enquanto, confiamos no sistema de polling que será implementado no frontend
    log(`✅ Broadcast global registrado para evento ${evento}`);
    
  } catch (erro) {
    log(`❌ Erro no broadcast global: ${erro.message}`, 'error');
  }
}

// CORS Handler
function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

// Middlewares
function autenticarToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch (erro) {
    console.error('❌ Erro ao verificar JWT:', erro.message);
    return null;
  }
}

// Log detalhado
function log(msg, tipo = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${tipo === 'error' ? '❌' : '✅'} ${msg}`);
}

// Função para iniciar conexão Server-Sent Events
function iniciarSSE(req, res) {
  // Para SSE, precisamos do token via query parameter já que EventSource não suporta headers customizados
  const token = req.query.token;
  
  if (!token) {
    log('❌ SSE: Token não fornecido', 'error');
    return res.status(401).json({ erro: 'Token não fornecido para SSE' });
  }

  let usuario;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    usuario = decoded;
    log(`✅ SSE: Token válido para usuário ${usuario.id} (${usuario.funcao})`);
  } catch (erro) {
    log(`❌ SSE: Token inválido - ${erro.message}`, 'error');
    return res.status(401).json({ erro: 'Token inválido para SSE' });
  }

  log(`🔧 Configurando headers SSE para usuário ${usuario.id}`);
  
  // Configurar headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Enviar evento inicial
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ message: 'Conectado ao SSE', usuarioId: usuario.id })}\n\n`);

  // Adicionar cliente à lista
  const cliente = adicionarClienteSSE(res, usuario.id);

  // Keepalive a cada 30 segundos
  const keepalive = setInterval(() => {
    try {
      res.write(`event: keepalive\n`);
      res.write(`data: ${JSON.stringify({ timestamp: new Date() })}\n\n`);
    } catch (erro) {
      clearInterval(keepalive);
      clientesSSE.delete(cliente);
    }
  }, 30000);

  // Limpar interval quando conexão fechar
  res.on('close', () => {
    clearInterval(keepalive);
  });
}

// Converter strings de data para DateTime ISO-8601
function converterDataParaIso(data) {
  if (!data) return null;
  
  // Se já é uma string ISO-8601 válida, retorna como está
  if (typeof data === 'string' && data.includes('T')) {
    try {
      new Date(data).toISOString();
      return data;
    } catch (e) {
      // Continua para processar
    }
  }
  
  // Se é uma string de data simples (YYYY-MM-DD), adiciona hora 00:00:00
  if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return `${data}T00:00:00Z`;
  }
  
  // Se é Date object, converte para ISO
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  return data; // Retorna como está se não conseguir converter
}

// Sanitizar dados de pessoa, convertendo datas
function sanitizarPessoa(data) {
  const dataSanitizada = { ...data };
  
  // Campos que podem ser datas no schema
  const camposDatas = ['dataBeneficio', 'dataCriacao', 'dataAtualizacao'];
  
  camposDatas.forEach(campo => {
    if (dataSanitizada[campo]) {
      dataSanitizada[campo] = converterDataParaIso(dataSanitizada[campo]);
    }
  });
  
  return dataSanitizada;
}

// Rotas
async function rotear(req, res, slug) {
  const rota = slug.join('/');

  // DEBUG: Se rota vazia, retorna erro informativo
  if (!rota || rota === '') {
    log(`⚠️ Rota vazia recebida | query.slug: ${JSON.stringify(req.query.slug)} | req.url: ${req.url}`, 'error');
    return res.status(400).json({ 
      erro: 'Rota não especificada',
      debug: {
        slug: slug,
        rota: rota,
        url: req.url,
        query: req.query
      }
    });
  }

  // HEALTH CHECK
  if (rota === 'health' && req.method === 'GET') {
    try {
      const prisma = getPrisma();
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } catch (erro) {
      log(`Health check falhou: ${erro.message}`, 'error');
      return res.status(500).json({
        status: 'ERROR',
        database: 'disconnected',
        erro: erro.message
      });
    }
  }

  // AUTENTICAÇÃO
  if (rota === 'autenticacao/entrar' && req.method === 'POST') {
    return autenticacaoEntrar(req, res);
  }

  if (rota === 'autenticacao/registrar' && req.method === 'POST') {
    return autenticacaoRegistrar(req, res);
  }

  if (rota === 'autenticacao/eu' && req.method === 'GET') {
    return autenticacaoEu(req, res);
  }

  if (rota === 'autenticacao/esqueci-senha' && req.method === 'POST') {
    return autenticacaoEsqueciSenha(req, res);
  }

  if (rota === 'autenticacao/redefinir-senha' && req.method === 'POST') {
    return autenticacaoRedefinirSenha(req, res);
  }

  if (rota === 'autenticacao/recuperacao-senha/solicitar' && req.method === 'POST') {
    return recuperacaoSenhaSolicitar(req, res);
  }

  if (rota === 'autenticacao/recuperacao-senha/validar-token' && req.method === 'POST') {
    return recuperacaoSenhaValidarToken(req, res);
  }

  if (rota === 'autenticacao/recuperacao-senha/redefinir' && req.method === 'POST') {
    return recuperacaoSenhaRedefinir(req, res);
  }

  if (rota === 'autenticacao/listar' && req.method === 'GET') {
    return autenticacaoListar(req, res);
  }

  if (rota === 'autenticacao/validar-token' && req.method === 'POST') {
    return autenticacaoValidarToken(req, res);
  }

  if (rota === 'autenticacao/token/validar' && req.method === 'POST') {
    return validarTokenGeracao(req, res);
  }

  if (rota === 'autenticacao/token/gerar' && req.method === 'POST') {
    return gerarTokenGeracao(req, res);
  }

  if (rota === 'autenticacao/token/listar' && req.method === 'GET') {
    return listarTokens(req, res);
  }

  if (rota.startsWith('autenticacao/token/') && req.method === 'DELETE') {
    const id = slug[2];
    req.params = { id };
    return revogarToken(req, res);
  }

  // EVENTOS SSE
  if (rota === 'eventos/sse' && req.method === 'GET') {
    log(`🚀 Iniciando SSE para rota: ${rota}`);
    return iniciarSSE(req, res);
  }

  // PESSOAS
  // Rotas específicas devem vir ANTES das genéricas
  if (rota === 'pessoas/validar-cpf' && req.method === 'GET') {
    return pessoasValidarCPF(req, res);
  }



  if (rota === 'pessoas/totais/por-comunidade' && req.method === 'GET') {
    return pessoasTotaisPorComunidade(req, res);
  }

  // Rota para atualizar comunidade em lote (renomear comunidade em todas as pessoas)
  if (rota === 'pessoas/comunidade/atualizar' && req.method === 'PATCH') {
    log(`🔄 Chamando atualizarComunidadeEmLote para rota: ${rota}`);
    return atualizarComunidadeEmLote(req, res);
  }

  if (rota === 'pessoas' && req.method === 'GET') {
    return pessoasListar(req, res);
  }

  if (rota === 'pessoas' && req.method === 'POST') {
    console.log('🎯 ROTEAMENTO: Chamando pessoasCriar');
    return pessoasCriar(req, res);
  }

  // Rota genérica com ID (deve vir por último)
  if (rota.startsWith('pessoas/') && req.method === 'GET') {
    const id = slug[1];
    console.log(`🎯 ROTEAMENTO: Chamando pessoasObter com ID ${id}`);
    return pessoasObter(req, res, id);
  }

  if (rota.startsWith('pessoas/') && (req.method === 'PUT' || req.method === 'PATCH')) {
    const id = slug[1];
    console.log(`🎯 ROTEAMENTO: Chamando pessoasAtualizar com ID ${id}`);
    return pessoasAtualizar(req, res, id);
  }

  if (rota.startsWith('pessoas/') && req.method === 'DELETE') {
    const id = slug[1];
    console.log(`🎯 ROTEAMENTO: Chamando pessoasDeletar com ID ${id}`);
    return pessoasDeletar(req, res, id);
  }

  log(`❌ Rota não encontrada: "${rota}" | Método: ${req.method}`);
  return res.status(404).json({ erro: 'Rota não encontrada', rota });
}

// ==================== AUTENTICAÇÃO ====================

async function autenticacaoEntrar(req, res) {
  // NÃO usar getPrisma() aqui pois pode interferir na resposta
  try {
    const prisma = getPrisma();
    
    // DEBUG COMPLETO: Verificar o que está chegando no body
    log(`\n========== LOGIN DEBUG START ==========`);
    log(`📦 Tipo de req.body: ${typeof req.body}`);
    log(`📦 req.body é null? ${req.body === null}`);
    log(`📦 req.body é undefined? ${req.body === undefined}`);
    log(`📦 req.body: ${JSON.stringify(req.body)}`);
    log(`📦 req.headers['content-type']: ${req.headers['content-type']}`);
    log(`📦 req.headers['content-length']: ${req.headers['content-length']}`);
    log(`========== LOGIN DEBUG END ==========\n`);
    
    const { email, senha } = req.body || {};
    
    log(`🔐 Email extraído: ${email}`);
    log(`🔐 Senha extraída: ${senha ? '***' : 'VAZIA'}`);
    log(`🔐 Tentando login: ${email}`);

    if (!email || !senha) {
      log(`❌ Credenciais incompletas - email: ${!!email}, senha: ${!!senha}`, 'error');
      return res.status(400).json({ 
        erro: 'Por favor, forneça email e senha para fazer login',
        detalhes: {
          emailFornecido: !!email,
          senhaFornecida: !!senha
        }
      });
    }

    log(`🔍 Procurando usuário no banco: ${email}`);
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    
    if (!usuario) {
      log(`❌ Usuário não encontrado: ${email}`, 'error');
      return res.status(401).json({ 
        erro: 'Email ou senha inválidos. Verifique suas credenciais e tente novamente.' 
      });
    }

    log(`✅ Usuário encontrado: ${usuario.email} (ID: ${usuario.id})`);

    if (!usuario.ativo) {
      log(`❌ Usuário inativo: ${email}`, 'error');
      return res.status(401).json({ 
        erro: 'Sua conta foi desativada. Entre em contato com o administrador do sistema.' 
      });
    }

    // ⚠️ VERIFICAÇÃO CRÍTICA DA SENHA
    log(`🔐 Comparando senha para ${email}...`);
    log(`🔐 Senha armazenada tem ${usuario.senha.length} caracteres`);
    log(`🔐 Senha fornecida tem ${senha.length} caracteres`);
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    
    if (!senhaValida) {
      log(`❌ Senha incorreta para: ${email}`, 'error');
      return res.status(401).json({ 
        erro: 'Email ou senha inválidos. Verifique suas credenciais e tente novamente.' 
      });
    }

    log(`✅ Senha válida!`);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    log(`✅ Token gerado com sucesso`);
    log(`✅ Login bem-sucedido: ${email}`);
    
    const resposta = {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        funcao: usuario.funcao
      }
    };
    
    log(`✅ Enviando resposta: ${JSON.stringify(resposta).substring(0, 100)}`);
    res.status(200).json(resposta);
    log(`✅ RESPOSTA ENVIADA COM SUCESSO`);
  } catch (erro) {
    log(`\n❌ ERRO NO LOGIN ❌`, 'error');
    log(`Mensagem: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    log(`Nome do erro: ${erro.name}`, 'error');
    log(`Código: ${erro.code}`, 'error');
    log(`\n`);
    res.status(500).json({ 
      erro: 'Erro ao fazer login',
      debug: {
        mensagem: erro.message,
        tipo: erro.name
      }
    });
  }
}

async function autenticacaoRegistrar(req, res) {
  const prisma = getPrisma();
  try {
    const { email, senha, nome, codigoConvite } = req.body;
    log(`📝 Registrando novo usuário: ${email}`);

    // Validação
    if (!email || !senha || !nome || !codigoConvite) {
      log('Campos obrigatórios faltando', 'error');
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    if (senha.length < 6) {
      log('Senha muito curta', 'error');
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      log(`Email já registrado: ${email}`, 'error');
      return res.status(409).json({ erro: 'Email já registrado' });
    }

    const ehToken = codigoConvite.startsWith('GAC-GEN-') || codigoConvite.startsWith('GAC-TOKEN-');
    let usuarioFuncao = 'usuario';
    let codigoValido = false;

    if (ehToken) {
      // VALIDAR TOKEN GERAÇÃO
      log(`🔑 Validando TOKEN para ${email}`);
      const token = await prisma.tokenGeracao.findUnique({ 
        where: { token: codigoConvite } 
      });

      if (!token) {
        log(`Token não encontrado: ${codigoConvite}`, 'error');
        return res.status(401).json({ erro: 'Token inválido' });
      }

      if (token.usado) {
        log(`Token já foi utilizado: ${codigoConvite}`, 'error');
        return res.status(401).json({ erro: 'Token já foi utilizado' });
      }

      if (new Date() > new Date(token.dataExpiracao)) {
        log(`Token expirado: ${codigoConvite}`, 'error');
        return res.status(401).json({ erro: 'Token expirado' });
      }

      if (token.email !== email) {
        log(`Email não bate: ${email} vs ${token.email}`, 'error');
        return res.status(401).json({ erro: 'Este token é para outro email' });
      }

      usuarioFuncao = 'funcionario';
      codigoValido = true;
    } else {
      // Se não é token, é inválido (removemos suporte a convites)
      log(`Apenas tokens GAC-GEN- são aceitos: ${codigoConvite}`, 'error');
      return res.status(400).json({ erro: 'Código de convite inválido. Use apenas tokens GAC-GEN-' });
    }

    if (!codigoValido) {
      log('Código/Token inválido', 'error');
      return res.status(401).json({ erro: 'Código/Token inválido' });
    }

    // Criptografar SENHA
    log(`Criptografando senha...`);
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    log(`Senha criptografada com ${senhaCriptografada.length} caracteres`);

    // Criar usuário
    const usuario = await prisma.usuario.create({
      data: {
        email,
        senha: senhaCriptografada,
        nome,
        funcao: usuarioFuncao,
        ativo: true
      }
    });

    log(`✅ Usuário criado: ${usuario.id} - ${email}`);

    // Marcar token como usado
    await prisma.tokenGeracao.update({
      where: { token: codigoConvite },
      data: {
        usado: true,
        usadoPor: nome,
        usadoEm: new Date()
      }
    });
    log(`✅ Token marcado como usado por: ${nome}`);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        funcao: usuario.funcao
      }
    });
  } catch (erro) {
    log(`Erro ao registrar: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao registrar usuário' });
  }
}

async function autenticacaoEu(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const usuarioBd = await prisma.usuario.findUnique({ where: { id: usuario.id } });
    if (!usuarioBd) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.status(200).json({
      id: usuarioBd.id,
      email: usuarioBd.email,
      nome: usuarioBd.nome,
      funcao: usuarioBd.funcao
    });
  } catch (erro) {
    log(`Erro ao obter usuário: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter usuário' });
  }
}

async function autenticacaoEsqueciSenha(req, res) {
  return res.status(501).json({ erro: 'Não implementado' });
}

async function autenticacaoRedefinirSenha(req, res) {
  return res.status(501).json({ erro: 'Não implementado' });
}

async function recuperacaoSenhaSolicitar(req, res) {
  const prisma = getPrisma();
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ erro: 'Email é obrigatório' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      // Retornar sucesso mesmo se usuário não existe (segurança)
      return res.status(200).json({ 
        mensagem: 'Se o email existe, um código foi enviado',
        email 
      });
    }

    // Gerar token de recuperação
    const token = require('crypto').randomBytes(5).toString('hex').toUpperCase();
    const agora = new Date();
    const expiracao = new Date(agora.getTime() + 30 * 60 * 1000); // 30 minutos

    await prisma.usuario.update({
      where: { email },
      data: {
        tokenRecuperacao: await bcrypt.hash(token, 10),
        expiracaoToken: expiracao
      }
    });

    // Aqui você deveria enviar email com o token
    log(`✅ Token de recuperação gerado para ${email}: ${token}`, 'info');
    console.log(`\n📧 TOKEN DE RECUPERAÇÃO (use este código):`);
    console.log(`   Email: ${email}`);
    console.log(`   Código: ${token}`);
    console.log(`   Expira em: ${expiracao.toLocaleString('pt-BR')}\n`);

    res.status(200).json({ 
      mensagem: 'Se o email existe, um código foi enviado',
      email,
      debug: token // Para testes - remover em produção
    });
  } catch (erro) {
    log(`Erro ao solicitar recuperação: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao solicitar recuperação' });
  }
}

async function recuperacaoSenhaValidarToken(req, res) {
  const prisma = getPrisma();
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ erro: 'Email e token são obrigatórios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    
    if (!usuario || !usuario.tokenRecuperacao) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Verificar se expirou
    if (new Date() > usuario.expiracaoToken) {
      return res.status(401).json({ erro: 'Token expirado' });
    }

    // Verificar se o token está correto
    const tokenValido = await bcrypt.compare(token, usuario.tokenRecuperacao);
    
    if (!tokenValido) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    res.status(200).json({ 
      mensagem: 'Token validado com sucesso',
      email
    });
  } catch (erro) {
    log(`Erro ao validar token: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao validar token' });
  }
}

async function recuperacaoSenhaRedefinir(req, res) {
  const prisma = getPrisma();
  try {
    const { email, token, novaSenha } = req.body;

    if (!email || !token || !novaSenha) {
      return res.status(400).json({ erro: 'Email, token e nova senha são obrigatórios' });
    }

    if (novaSenha.length < 8) {
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 8 caracteres' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    
    if (!usuario || !usuario.tokenRecuperacao) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Verificar se expirou
    if (new Date() > usuario.expiracaoToken) {
      return res.status(401).json({ erro: 'Token expirado' });
    }

    // Verificar se o token está correto
    const tokenValido = await bcrypt.compare(token, usuario.tokenRecuperacao);
    
    if (!tokenValido) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Atualizar senha e limpar token
    await prisma.usuario.update({
      where: { email },
      data: {
        senha: await bcrypt.hash(novaSenha, 10),
        tokenRecuperacao: null,
        expiracaoToken: null
      }
    });

    log(`✅ Senha redefinida com sucesso para ${email}`, 'info');

    res.status(200).json({ 
      mensagem: 'Senha redefinida com sucesso'
    });
  } catch (erro) {
    log(`Erro ao redefinir senha: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao redefinir senha' });
  }
}

async function autenticacaoListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const usuarios = await prisma.usuario.findMany({
      select: { id: true, email: true, nome: true, funcao: true, ativo: true }
    });

    res.status(200).json(usuarios);
  } catch (erro) {
    log(`Erro ao listar usuários: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
}

async function autenticacaoValidarToken(req, res) {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      return res.status(401).json({ valido: false });
    }

    const usuario = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    res.status(200).json({ valido: true, usuario });
  } catch (erro) {
    res.status(401).json({ valido: false });
  }
}

async function validarTokenGeracao(req, res) {
  const prisma = getPrisma();
  try {
    const { token, codigo } = req.body;
    const codigoAtual = token || codigo;
    
    log(`🔑 Validando TOKEN: ${codigoAtual?.substring(0, 20)}...`);

    const tokenDb = await prisma.tokenGeracao.findUnique({ 
      where: { token: codigoAtual } 
    });

    if (!tokenDb || tokenDb.usado) {
      return res.status(401).json({ valido: false, erro: 'Token inválido' });
    }

    if (new Date() > new Date(tokenDb.dataExpiracao)) {
      return res.status(401).json({ valido: false, erro: 'Token expirado' });
    }

    res.status(200).json({ 
      valido: true, 
      email: tokenDb.email,
      mensagem: 'Token válido'
    });
  } catch (erro) {
    log(`Erro ao validar token: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao validar' });
  }
}

// ==================== PESSOAS ====================

async function atualizarComunidadeEmLote(req, res) {
  log(`🔄 INICIANDO atualizarComunidadeEmLote`);
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { nomeAntigo, nomeNovo } = req.body;

    if (!nomeAntigo || !nomeNovo) {
      return res.status(400).json({ 
        erro: 'Nome antigo e nome novo são obrigatórios',
        campos: {
          nomeAntigo: !nomeAntigo ? 'Campo obrigatório' : null,
          nomeNovo: !nomeNovo ? 'Campo obrigatório' : null
        }
      });
    }

    log(`🏘️ Atualizando comunidade em lote: "${nomeAntigo}" → "${nomeNovo}"`);

    // Contar quantas pessoas serão afetadas
    const pessoasAfetadas = await prisma.pessoa.count({
      where: {
        comunidade: nomeAntigo
      }
    });

    if (pessoasAfetadas === 0) {
      log(`⚠️ Nenhuma pessoa encontrada com a comunidade "${nomeAntigo}"`);
      return res.status(200).json({ 
        message: `Nenhuma pessoa encontrada com a comunidade "${nomeAntigo}"`,
        pessoasAtualizadas: 0
      });
    }

    // Atualizar todas as pessoas com a comunidade antiga
    const resultado = await prisma.pessoa.updateMany({
      where: {
        comunidade: nomeAntigo
      },
      data: {
        comunidade: nomeNovo
      }
    });

    log(`✅ ${resultado.count} pessoas atualizadas de "${nomeAntigo}" para "${nomeNovo}"`);

    res.status(200).json({
      message: `Comunidade renomeada com sucesso`,
      nomeAntigo,
      nomeNovo,
      pessoasAtualizadas: resultado.count
    });

  } catch (erro) {
    log(`Erro ao atualizar comunidade em lote: ${erro.message}`, 'error');
    res.status(500).json({ 
      erro: 'Erro ao atualizar comunidade nas pessoas',
      codigo: 'UPDATE_COMMUNITY_BATCH_ERROR'
    });
  }
}

async function pessoasValidarCPF(req, res) {
  const prisma = getPrisma();
  try {
    console.log('🚨 DENTRO DA FUNÇÃO pessoasValidarCPF!');
    log(`🔍 Validando CPF: ${req.query.cpf}`);
    
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { cpf, excluir } = req.query;

    if (!cpf) {
      return res.status(400).json({ erro: 'CPF é obrigatório' });
    }

    // Limpar CPF (apenas números)
    const cpfLimpo = cpf.replace(/\D/g, '');
    log(`📋 CPF limpo: ${cpfLimpo}, Excluir ID: ${excluir || 'nenhum'}`);

    // Verificar se já existe pessoa com esse CPF
    const where = { cpf: cpfLimpo };
    
    // Se estamos editando uma pessoa, excluir ela da verificação
    if (excluir) {
      where.id = { not: parseInt(excluir) };
    }

    log(`🔍 Consulta where: ${JSON.stringify(where)}`);
    const pessoaExistente = await prisma.pessoa.findFirst({ where });
    log(`📊 Resultado da consulta: ${pessoaExistente ? 'CPF já existe' : 'CPF disponível'}`);

    if (pessoaExistente) {
      log(`❌ CPF ${cpf} já cadastrado para: ${pessoaExistente.nome} (ID: ${pessoaExistente.id})`);
      return res.status(409).json({ 
        erro: 'CPF já cadastrado',
        mensagem: `Já existe um beneficiário cadastrado com o CPF ${cpf}`,
        pessoa: {
          id: pessoaExistente.id,
          nome: pessoaExistente.nome
        }
      });
    }

    log(`✅ CPF ${cpf} disponível para cadastro`);
    res.status(200).json({ 
      valido: true,
      mensagem: 'CPF disponível para cadastro'
    });

  } catch (erro) {
    log(`❌ Erro ao validar CPF ${req.query.cpf}: ${erro.message}`, 'error');
    console.error('Stack trace:', erro.stack);
    res.status(500).json({ 
      erro: 'Erro ao validar CPF',
      codigo: 'VALIDATE_CPF_ERROR',
      detalhes: erro.message
    });
  }
}

async function pessoasTotaisPorComunidade(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Obter o total geral de pessoas
    const totalGeral = await prisma.pessoa.count();

    // Agrupar por comunidade e contar
    const pessoas = await prisma.pessoa.findMany({
      select: { comunidade: true }
    });

    // Contar por comunidade
    const totalPorComunidade = {};
    pessoas.forEach(pessoa => {
      if (pessoa.comunidade) {
        totalPorComunidade[pessoa.comunidade] = (totalPorComunidade[pessoa.comunidade] || 0) + 1;
      }
    });

    log(`✅ Totais por comunidade obtidos - Total geral: ${totalGeral}`);

    res.status(200).json({
      totalGeral,
      totalPorComunidade
    });
  } catch (erro) {
    log(`Erro ao obter totais por comunidade: ${erro.message}`, 'error');
    res.status(500).json({ 
      erro: 'Erro ao obter totais por comunidade',
      codigo: 'TOTAIS_COMUNIDADE_ERROR'
    });
  }
}

async function pessoasListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { pagina = 1, limite = 50, busca = '', filtros = null } = req.query;
    const paginaNum = parseInt(pagina) || 1;
    const limiteNum = parseInt(limite) || 50;
    const skip = (paginaNum - 1) * limiteNum;

    // Construir filtros
    const where = {};

    // Processar filtros avançados se fornecidos
    if (filtros) {
      try {
        const filtrosObj = typeof filtros === 'string' ? JSON.parse(filtros) : filtros;
        
        // Construir condições AND para múltiplos critérios
        const condicoes = [];
        
        Object.entries(filtrosObj).forEach(([campo, config]) => {
          if (!config || !config.valor) return;
          
          const valor = config.valor.toString().trim().toLowerCase();
          
          // Mapear campo e criar condição apropriada
          switch (campo) {
            case 'nome':
              condicoes.push({
                nome: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'cpf':
              condicoes.push({
                cpf: { contains: valor }
              });
              break;
            case 'email':
              condicoes.push({
                email: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'telefone':
              condicoes.push({
                telefone: { contains: valor }
              });
              break;
            case 'tipoBeneficio':
              condicoes.push({
                tipoBeneficio: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'endereco':
              condicoes.push({
                endereco: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'bairro':
              condicoes.push({
                bairro: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'cidade':
              condicoes.push({
                cidade: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'estado':
              condicoes.push({
                estado: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'cep':
              condicoes.push({
                cep: { contains: valor }
              });
              break;
            case 'comunidade':
              condicoes.push({
                comunidade: { contains: valor, mode: 'insensitive' }
              });
              break;
            case 'dataCriacao':
              // Buscar por data exata ou parcial
              condicoes.push({
                dataCriacao: { contains: valor }
              });
              break;
            case 'dataAtualizacao':
              condicoes.push({
                dataAtualizacao: { contains: valor }
              });
              break;
          }
        });
        
        // Se houver condições, usar AND
        if (condicoes.length > 0) {
          where.AND = condicoes;
        }
        
        log(`🔍 Filtros avançados aplicados: ${JSON.stringify(filtrosObj)}`);
      } catch (erro) {
        log(`⚠️ Erro ao processar filtros avançados: ${erro.message}`, 'error');
      }
    }

    // Filtro de busca simples (se não houver filtros avançados)
    if (busca && !filtros) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { cpf: { contains: busca } },
        { email: { contains: busca, mode: 'insensitive' } }
      ];
    }

    // Log para debug
    log(`👥 Listando pessoas - Página: ${paginaNum}, Limite: ${limiteNum}`);
    if (busca) log(`   Busca simples: "${busca}"`);
    if (filtros) log(`   Filtros avançados aplicados`);

    // Contar total
    const total = await prisma.pessoa.count({ where });

    // Buscar pessoas
    const pessoas = await prisma.pessoa.findMany({
      where,
      orderBy: { dataCriacao: 'desc' },
      take: limiteNum,
      skip
    });

    log(`✅ Retornando ${pessoas.length} de ${total} pessoas`);

    res.status(200).json({
      pessoas,
      total,
      pagina: paginaNum,
      limite: limiteNum,
      totalPaginas: Math.ceil(total / limiteNum)
    });
  } catch (erro) {
    log(`Erro ao listar pessoas: ${erro.message}`, 'error');
    res.status(500).json({ 
      erro: 'Erro ao listar pessoas. Tente recarregar a página ou tente novamente em alguns momentos.',
      codigo: 'LIST_PERSONS_ERROR'
    });
  }
}

// 🚀 FUNÇÃO OTIMIZADA PARA ALTA CONCORRÊNCIA (60+ funcionários)
async function pessoasUltimaAtualizacao(req, res) {
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // 🛡️ RATE LIMITING: Máximo 10 requests por minuto por usuário
    const agora = Date.now();
    const userRateLimit = rateLimitMap.get(usuario.id) || { requests: 0, resetTime: agora + 60000 };
    
    if (agora < userRateLimit.resetTime) {
      if (userRateLimit.requests >= 10) {
        log(`🚫 Rate limit excedido para usuário ${usuario.id}`, 'error');
        return res.status(429).json({ erro: 'Muitas requisições. Tente novamente em 1 minuto.' });
      }
      userRateLimit.requests++;
    } else {
      userRateLimit.requests = 1;
      userRateLimit.resetTime = agora + 60000;
    }
    rateLimitMap.set(usuario.id, userRateLimit);

    // 📦 CACHE INTELIGENTE: Evitar queries desnecessárias no banco
    if (cacheUltimaAtualizacao.data && (agora - cacheUltimaAtualizacao.timestamp < cacheUltimaAtualizacao.ttl)) {
      log(`📦 Cache hit para usuário ${usuario.id} - evitando query no banco`);
      
      // Headers de cache para o cliente
      res.setHeader('Cache-Control', 'max-age=30, must-revalidate');
      res.setHeader('ETag', `"${cacheUltimaAtualizacao.timestamp}"`);
      
      return res.status(200).json(cacheUltimaAtualizacao.data);
    }

    log(`🔍 Cache miss - buscando no banco para usuário ${usuario.id}`);

    const prisma = getPrisma();
    
    // 🎯 QUERY OTIMIZADA: Uma única query usando UNION (mais eficiente)
    const ultimaModificacao = await prisma.$queryRaw`
      SELECT p.*, u.id as autor_id, u.nome as autor_nome, u.funcao as autor_funcao,
             GREATEST(p.dataCriacao, COALESCE(p.dataAtualizacao, p.dataCriacao)) as ultima_data
      FROM pessoa p
      JOIN usuario u ON p.usuarioId = u.id
      ORDER BY ultima_data DESC
      LIMIT 1
    `;
    
    if (ultimaModificacao.length === 0) {
      resultado = {
        ultimaAtualizacao: new Date().toISOString(),
        ultimoAutor: null
      };
    } else {
      const pessoa = ultimaModificacao[0];
      resultado = {
        ultimaAtualizacao: pessoa.ultima_data,
        ultimoAutor: {
          id: pessoa.autor_id,
          nome: pessoa.autor_nome,
          funcao: pessoa.autor_funcao
        }
      };
    }

    // 📦 ATUALIZAR CACHE para próximas requisições
    cacheUltimaAtualizacao = {
      data: resultado,
      timestamp: agora,
      ttl: 30000
    };

    log(`✅ Última modificação processada e cacheada para ${userRateLimit.requests}/10 requests`);

    // Headers otimizados para cache
    res.setHeader('Cache-Control', 'max-age=30, must-revalidate');
    res.setHeader('ETag', `"${agora}"`);
    
    return res.status(200).json(resultado);
    
    if (!ultimaPessoa) {
      return res.status(200).json({
        ultimaAtualizacao: new Date().toISOString(),
        ultimoAutor: null
      });
    }
    
    log(`🔍 Última modificação: ${ultimaData} por ${ultimaPessoa.usuario.nome} (${ultimaPessoa.usuario.funcao})`);
    
    res.status(200).json({
      ultimaAtualizacao: ultimaData,
      ultimoAutor: {
        id: ultimaPessoa.usuario.id,
        nome: ultimaPessoa.usuario.nome,
        funcao: ultimaPessoa.usuario.funcao
      }
    });
    
  } catch (erro) {
    log(`Erro ao buscar última atualização: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao buscar última atualização' });
  }
}

async function pessoasCriar(req, res) {
  console.log('\n🚀🚀🚀 FUNÇÃO PESSOAS CRIAR CHAMADA! 🚀🚀🚀');
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { nome, cpf, idade } = req.body;
    
    // Validação: nome e CPF obrigatórios
    if (!nome || !cpf) {
      return res.status(400).json({ 
        erro: 'Nome e CPF são obrigatórios',
        campos: {
          nome: !nome ? 'Campo obrigatório' : null,
          cpf: !cpf ? 'Campo obrigatório' : null
        }
      });
    }

    // Validação: CPF deve ter exatamente 11 dígitos
    const cpfLimpo = (cpf || '').toString().replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ 
        erro: `CPF incompleto (${cpfLimpo.length}/11 dígitos). Digite o CPF completo.`,
        campos: {
          cpf: `CPF deve ter 11 dígitos (fornecidos: ${cpfLimpo.length})`
        }
      });
    }

    // Validação: idade obrigatória
    if (idade === null || idade === undefined || idade === '') {
      return res.status(400).json({ 
        erro: 'Idade é obrigatória',
        campos: {
          idade: 'Campo obrigatório'
        }
      });
    }

    // Validação: idade deve ser um número válido
    const idadeNum = parseInt(idade);
    if (isNaN(idadeNum) || idadeNum < 0 || idadeNum > 150) {
      return res.status(400).json({ 
        erro: 'Idade deve ser um número entre 0 e 150',
        campos: {
          idade: 'Valor inválido'
        }
      });
    }

    const dataSanitizada = sanitizarPessoa(req.body);

    const pessoa = await prisma.pessoa.create({
      data: {
        ...dataSanitizada,
        usuarioId: usuario.id
      }
    });

    log(`✅ Pessoa criada com sucesso: ${pessoa.nome} (ID: ${pessoa.id}, Idade: ${pessoa.idade})`);
    
    // Enviar evento SSE para todos os clientes conectados
    log(`📡 Enviando evento SSE: pessoaCadastrada para ${clientesSSE.size} clientes`);
    enviarEventoSSE('pessoaCadastrada', {
      pessoa: {
        id: pessoa.id,
        nome: pessoa.nome,
        cpf: pessoa.cpf
      },
      autorId: usuario.id,
      autorFuncao: usuario.funcao,
      tipo: 'cadastro',
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json(pessoa);
  } catch (erro) {
    log(`❌ Erro ao criar pessoa: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ 
      erro: 'Erro ao cadastrar pessoa. Verifique os dados e tente novamente.',
      codigo: 'CREATE_PERSON_ERROR'
    });
  }
}

async function pessoasObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const pessoa = await prisma.pessoa.findUnique({ where: { id: parseInt(id) } });
    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    res.status(200).json(pessoa);
  } catch (erro) {
    log(`Erro ao obter pessoa: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter pessoa' });
  }
}

async function pessoasAtualizar(req, res, id) {
  console.log('\n✏️✏️✏️ FUNÇÃO PESSOAS ATUALIZAR CHAMADA! ✏️✏️✏️');
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Validação: CPF deve ter exatamente 11 dígitos (se fornecido)
    if (req.body.cpf) {
      const cpfLimpo = (req.body.cpf || '').toString().replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        return res.status(400).json({ 
          erro: `CPF incompleto (${cpfLimpo.length}/11 dígitos). Digite o CPF completo.`,
          campos: {
            cpf: `CPF deve ter 11 dígitos (fornecidos: ${cpfLimpo.length})`
          }
        });
      }
    }

    // Validação: Idade obrigatória
    if (req.body.idade === null || req.body.idade === undefined || req.body.idade === '') {
      return res.status(400).json({ 
        erro: 'Idade é obrigatória',
        campos: {
          idade: 'Campo obrigatório'
        }
      });
    }

    // Validação: Idade deve ser um número válido
    if (req.body.idade) {
      const idadeNum = parseInt(req.body.idade);
      if (isNaN(idadeNum) || idadeNum < 0 || idadeNum > 150) {
        return res.status(400).json({ 
          erro: 'Idade deve ser um número entre 0 e 150',
          campos: {
            idade: 'Valor inválido'
          }
        });
      }
    }

    const dataSanitizada = sanitizarPessoa(req.body);

    const pessoa = await prisma.pessoa.update({
      where: { id: parseInt(id) },
      data: dataSanitizada
    });

    log(`✅ Pessoa atualizada com sucesso: ${pessoa.nome} (ID: ${pessoa.id})`);
    
    // Enviar evento SSE para todos os clientes conectados
    log(`📡 Enviando evento SSE: pessoaAtualizada para ${clientesSSE.size} clientes`);
    enviarEventoSSE('pessoaAtualizada', {
      pessoa: {
        id: pessoa.id,
        nome: pessoa.nome,
        cpf: pessoa.cpf
      },
      autorId: usuario.id,
      autorFuncao: usuario.funcao,
      tipo: 'edicao',
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json(pessoa);
  } catch (erro) {
    log(`Erro ao atualizar pessoa: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar pessoa' });
  }
}

async function pessoasDeletar(req, res, id) {
  console.log('\n🗑️🗑️🗑️ FUNÇÃO PESSOAS DELETAR CHAMADA! 🗑️🗑️🗑️');
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Obter dados da pessoa antes de deletar para o evento
    const pessoaParaDeletar = await prisma.pessoa.findUnique({ 
      where: { id: parseInt(id) },
      select: { id: true, nome: true, cpf: true }
    });
    
    await prisma.pessoa.delete({ where: { id: parseInt(id) } });
    
    // Enviar evento SSE para todos os clientes conectados
    if (pessoaParaDeletar) {
      log(`📡 Enviando evento SSE: pessoaDeletada para ${clientesSSE.size} clientes`);
      enviarEventoSSE('pessoaDeletada', {
        pessoa: pessoaParaDeletar,
        autorId: usuario.id,
        autorFuncao: usuario.funcao,
        tipo: 'delecao',
        timestamp: new Date().toISOString()
      });
    }

    res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar pessoa: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar pessoa' });
  }
}

// ==================== HANDLER PRINCIPAL ====================

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // PARSE DO BODY - CRUCIAL PARA VERCEL
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      log(`\n🔄 INICIANDO PARSE DO BODY 🔄`);
      log(`Método: ${req.method}`);
      log(`Content-Type: ${req.headers['content-type']}`);
      log(`Content-Length: ${req.headers['content-length']}`);
      log(`req.body já existe? ${!!req.body}`);
      log(`typeof req.body: ${typeof req.body}`);
      
      // Vercel pode já ter parseado o body
      if (req.body) {
        log(`Body já existe`);
        if (typeof req.body === 'string') {
          log(`Body é string, parseando...`);
          req.body = JSON.parse(req.body);
          log(`✅ Body parseado: ${JSON.stringify(req.body).substring(0, 100)}`);
        } else if (typeof req.body === 'object') {
          log(`✅ Body já é objeto: ${JSON.stringify(req.body).substring(0, 100)}`);
        }
      } else {
        // Se não tem body, tentar ler do stream
        log(`Body não existe, lendo do stream...`);
        let body = '';
        await new Promise((resolve, reject) => {
          req.on('data', chunk => {
            log(`📥 Chunk recebido: ${chunk.length} bytes`);
            body += chunk.toString();
          });
          req.on('end', () => {
            log(`📥 Stream finalizado. Total: ${body.length} bytes`);
            resolve();
          });
          req.on('error', (err) => {
            log(`❌ Erro no stream: ${err.message}`, 'error');
            reject(err);
          });
        });
        
        if (body && body.trim().length > 0) {
          log(`Body raw: ${body.substring(0, 200)}`);
          req.body = JSON.parse(body);
          log(`✅ Body parseado do stream: ${JSON.stringify(req.body).substring(0, 100)}`);
        } else {
          log(`⚠️ Body vazio após ler stream`, 'error');
          req.body = {};
        }
      }
      log(`🔄 FIM PARSE DO BODY 🔄\n`);
    } catch (erro) {
      log(`❌ Erro ao fazer parse do body: ${erro.message}`, 'error');
      log(`Stack: ${erro.stack}`, 'error');
      req.body = {};
    }
  } else {
    req.body = {};
  }

  // Extrair slug de forma segura e robusta
  let slug = [];
  
  // Método 1: req.query.slug (padrão Vercel para [...slug])
  if (req.query.slug && Array.isArray(req.query.slug)) {
    slug = req.query.slug;
    log(`📌 Slug obtido de req.query.slug (array): ${slug.join('/')}`);
  } else if (req.query.slug && typeof req.query.slug === 'string') {
    slug = [req.query.slug];
    log(`📌 Slug obtido de req.query.slug (string): ${slug.join('/')}`);
  }
  // Método 2: Extrair do URL se não conseguir por query
  else if (req.url && req.url.length > 1) {
    try {
      // Usar URL API do WHATWG para parsing seguro
      const baseUrl = `http://${req.headers.host || 'localhost'}`;
      const urlObj = new URL(req.url, baseUrl);
      let pathname = urlObj.pathname;
      
      // Remover /api/ prefix
      if (pathname.startsWith('/api/')) {
        pathname = pathname.slice(5); // Remove "/api/"
      } else if (pathname.startsWith('/api')) {
        pathname = pathname.slice(4); // Remove "/api"
      }
      
      // Split e filtrar partes vazias
      slug = pathname.split('/').filter(p => p.length > 0);
      log(`📌 Slug obtido do URL pathname: ${slug.join('/')}`);
    } catch (erro) {
      log(`Erro ao fazer parse da URL: ${erro.message}`, 'error');
      log(`URL original: ${req.url}`);
      slug = [];
    }
  }

  // Limpar query strings do slug (em caso de teste local)
  slug = slug.map(s => {
    const parts = s.split('?');
    return parts[0]; // Retorna apenas a parte antes de '?'
  }).filter(s => s.length > 0);

  // Fazer parse de query strings do URL
  if (!req.query || Object.keys(req.query).length === 0 || !req.query.pagina) {
    try {
      const baseUrl = `http://${req.headers.host || 'localhost'}`;
      const urlObj = new URL(req.url, baseUrl);
      req.query = req.query || {};
      
      // Pega todos os parâmetros de query
      const searchParams = new URLSearchParams(urlObj.search);
      searchParams.forEach((value, key) => {
        req.query[key] = value;
      });
      
      // Se nenhum parâmetro foi encontrado no URL, tenta manter os existentes
      if (searchParams.size === 0 && Object.keys(req.query).length > 1) {
        // Ok, já tinha query
      }
    } catch (erro) {
      req.query = req.query || {};
    }
  }

  const rotaStr = slug.join('/');
  log(`📍 [${req.method}] Rota: "${rotaStr}" | URL: "${req.url}" | Host: ${req.headers.host}`);
  
  // DEBUG: Se rota vazia, logar mais detalhes
  if (!rotaStr || rotaStr === '') {
    log(`⚠️ ROTA VAZIA! query.slug: ${JSON.stringify(req.query.slug)}`, 'error');
  }
  
  return rotear(req, res, slug);
}
