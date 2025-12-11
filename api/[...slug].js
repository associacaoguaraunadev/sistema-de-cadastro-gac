import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import Pusher from 'pusher';
import { gerarTokenGeracao, listarTokens, revogarToken } from './autenticacao/tokens.js';
import { enviarEmailRecuperacao, enviarEmailAceiteDigital } from './servicos/email.js';

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

// 🚀 PUSHER - Sistema Real-Time para Serverless (suporta 100 conexões simultâneas)
let pusher;

function getPusher() {
  if (!pusher) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || 'us2',
      useTLS: true
    });
    log('🚀 Pusher inicializado');
  }
  return pusher;
}

// 🛡️ RATE LIMITING POR USUÁRIO (mantido para outras funções se necessário)
let rateLimitMap = new Map(); // userId -> { requests: number, resetTime: number }

// ⚡ PUSHER - Enviar eventos em tempo real para TODOS os clientes (funciona em serverless)
async function enviarEventoPusher(evento, dados) {
  try {
    const pusherInstance = getPusher();
    const eventoId = Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();
    
    const payload = {
      ...dados,
      eventoId,
      timestamp
    };
    
    log(`📤 Preparando envio Pusher:`);
    log(`   Evento: ${evento}`);
    log(`   Canal: gac-realtime`);
    log(`   Pessoa: ${dados.pessoa?.nome || 'N/A'}`);
    log(`   Autor: ${dados.autorFuncao} (ID: ${dados.autorId})`);
    log(`   Payload: ${JSON.stringify(payload)}`);
    
    // Canal 'gac-realtime' - todos os clientes conectados recebem
    await pusherInstance.trigger('gac-realtime', evento, payload);
    
    log(`🚀 Pusher: Evento ${evento} (ID: ${eventoId}) enviado com sucesso para TODOS os clientes`);
    return true;
  } catch (erro) {
    log(`❌ Erro ao enviar evento Pusher: ${erro.message}`, 'error');
    console.error('Stack trace:', erro.stack);
    return false;
  }
}



// CORS Handler - Suporta múltiplas origens
function setCors(res, req) {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://sistema-de-cadastro-gac.vercel.app',
    'https://gac-gestao.vercel.app'
  ];
  
  const origin = req?.headers?.origin;
  
  // Se a origem está na lista de permitidas, define ela especificamente
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Em desenvolvimento, aceitar qualquer localhost
    if (origin && origin.startsWith('http://localhost')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  } else {
    // Produção: usar apenas origens permitidas ou a origem da requisição se for vercel.app
    if (origin && origin.includes('vercel.app')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[3]); // gac-gestao
    }
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
  
  // Configurar headers SSE com buffering desabilitado para tempo real
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Accel-Buffering', 'no'); // Desabilitar buffering do proxy
  res.status(200);

  // Enviar evento inicial
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ message: 'Conectado ao SSE', usuarioId: usuario.id })}\n\n`);

  // Adicionar cliente à lista
  const cliente = adicionarClienteSSE(res, usuario.id);

  // Keepalive otimizado a cada 5 segundos para tempo real máximo
  const keepalive = setInterval(() => {
    try {
      if (!res.destroyed && res.writable) {
        res.write(`event: keepalive\n`);
        res.write(`data: ${JSON.stringify({ 
          timestamp: new Date().toISOString(),
          instanciaId,
          clientesAtivos: clientesSSE.size
        })}\n\n`);
        
        // Forçar flush para garantir envio imediato
        if (res.flush) {
          res.flush();
        }
      } else {
        clearInterval(keepalive);
        clientesSSE.delete(cliente);
      }
    } catch (erro) {
      log(`Erro no keepalive: ${erro.message}`, 'error');
      clearInterval(keepalive);
      clientesSSE.delete(cliente);
    }
  }, 5000); // Reduzido para 5 segundos para máxima responsividade

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

// Calcular idade a partir da data de nascimento
function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return Math.max(0, idade);
}

// Sanitizar dados de pessoa, convertendo datas
function sanitizarPessoa(data) {
  const dataSanitizada = { ...data };
  
  // Campos que podem ser datas no schema
  const camposDatas = ['dataBeneficio', 'dataCriacao', 'dataAtualizacao', 'dataNascimento'];
  
  camposDatas.forEach(campo => {
    if (dataSanitizada[campo]) {
      dataSanitizada[campo] = converterDataParaIso(dataSanitizada[campo]);
    }
  });
  
  // Remover campo idade se existir (será calculado dinamicamente)
  delete dataSanitizada.idade;
  
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

  // GERENCIAMENTO DE USUÁRIOS (ADMIN ONLY)
  if (rota.startsWith('usuarios/') && req.method === 'DELETE') {
    const id = slug[1];
    req.params = { id };
    return usuariosDeletar(req, res);
  }

  if (rota.startsWith('usuarios/') && rota.includes('/funcao') && req.method === 'PATCH') {
    const id = slug[1];
    req.params = { id };
    return usuariosAlterarFuncao(req, res);
  }

  // EVENTOS SSE
  if (rota === 'eventos/sse' && req.method === 'GET') {
    log(`🚀 Iniciando SSE para rota: ${rota}`);
    return iniciarSSE(req, res);
  }

  // COMUNIDADES - Lista todas as comunidades únicas
  if (rota === 'comunidades' && req.method === 'GET') {
    return comunidadesListar(req, res);
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

  // Rota para transferir pessoas entre usuários
  if (rota === 'pessoas/transferir' && req.method === 'POST') {
    log(`🔄 Chamando pessoasTransferir para rota: ${rota}`);
    return pessoasTransferir(req, res);
  }

  // Rota para deletar pessoas em massa
  if (rota === 'pessoas/deletar-em-massa' && req.method === 'POST') {
    log(`🗑️ Chamando pessoasDeletarEmMassa para rota: ${rota}`);
    return pessoasDeletarEmMassa(req, res);
  }

  // BENEFÍCIOS - Gerenciamento
  if (slug.length >= 2 && slug[0] === 'beneficios' && slug[1] === 'gac') {
    if (req.method === 'GET' && slug.length === 2) {
      return beneficiosGACListar(req, res);
    } else if (req.method === 'POST' && slug.length === 2) {
      return beneficiosGACAdicionar(req, res);
    } else if (req.method === 'PUT' && slug.length === 3) {
      return beneficiosGACRenomear(req, res, slug[2]);
    } else if (req.method === 'DELETE' && slug.length === 3) {
      return beneficiosGACDeletar(req, res, slug[2]);
    }
  }

  if (slug.length >= 2 && slug[0] === 'beneficios' && slug[1] === 'governo') {
    if (req.method === 'GET' && slug.length === 2) {
      return beneficiosGovernoListar(req, res);
    } else if (req.method === 'POST' && slug.length === 2) {
      return beneficiosGovernoAdicionar(req, res);
    } else if (req.method === 'PUT' && slug.length === 3) {
      return beneficiosGovernoRenomear(req, res, slug[2]);
    } else if (req.method === 'DELETE' && slug.length === 3) {
      return beneficiosGovernoDeletar(req, res, slug[2]);
    }
  }

  if (rota === 'pessoas' && req.method === 'GET') {
    return pessoasListar(req, res);
  }

  if (rota === 'pessoas' && req.method === 'POST') {
    console.log('🎯 ROTEAMENTO: Chamando pessoasCriar');
    return pessoasCriar(req, res);
  }

  // Rota de verificação de dependências antes de deletar (DEVE VIR ANTES da rota genérica)
  if (rota.match(/^pessoas\/\d+\/verificar-exclusao$/) && req.method === 'GET') {
    const id = slug[1];
    console.log(`🎯 ROTEAMENTO: Chamando pessoasVerificarExclusao com ID ${id}`);
    return pessoasVerificarExclusao(req, res, id);
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

  // ==================== MÓDULO GUARAÚNA ====================
  
  // ALUNOS
  if (rota === 'guarauna/alunos' && req.method === 'GET') {
    return guaraunaAlunosListar(req, res);
  }
  if (rota === 'guarauna/alunos' && req.method === 'POST') {
    return guaraunaAlunosCriar(req, res);
  }
  if (rota.match(/^guarauna\/alunos\/[^/]+$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaAlunosObter(req, res, id);
  }
  if (rota.match(/^guarauna\/alunos\/[^/]+$/) && req.method === 'PUT') {
    const id = slug[2];
    return guaraunaAlunosAtualizar(req, res, id);
  }
  if (rota.match(/^guarauna\/alunos\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaAlunosDeletar(req, res, id);
  }
  
  // RESPONSÁVEIS LEGAIS
  if (rota === 'guarauna/responsaveis' && req.method === 'GET') {
    return guaraunaResponsaveisListar(req, res);
  }
  if (rota === 'guarauna/responsaveis' && req.method === 'POST') {
    return guaraunaResponsaveisCriar(req, res);
  }
  if (rota.match(/^guarauna\/responsaveis\/[^/]+$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaResponsaveisObter(req, res, id);
  }
  if (rota.match(/^guarauna\/responsaveis\/[^/]+$/) && req.method === 'PUT') {
    const id = slug[2];
    return guaraunaResponsaveisAtualizar(req, res, id);
  }
  if (rota.match(/^guarauna\/responsaveis\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaResponsaveisDeletar(req, res, id);
  }
  
  // VINCULAR ALUNO A RESPONSÁVEL
  if (rota === 'guarauna/alunos-responsaveis' && req.method === 'POST') {
    return guaraunaVincularAlunoResponsavel(req, res);
  }
  if (rota.match(/^guarauna\/alunos-responsaveis\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaDesvincularAlunoResponsavel(req, res, id);
  }
  
  // EDUCADORES
  if (rota === 'guarauna/educadores' && req.method === 'GET') {
    return guaraunaEducadoresListar(req, res);
  }
  if (rota === 'guarauna/educadores' && req.method === 'POST') {
    return guaraunaEducadoresCriar(req, res);
  }
  if (rota.match(/^guarauna\/educadores\/[^/]+$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaEducadoresObter(req, res, id);
  }
  if (rota.match(/^guarauna\/educadores\/[^/]+$/) && req.method === 'PUT') {
    const id = slug[2];
    return guaraunaEducadoresAtualizar(req, res, id);
  }
  if (rota.match(/^guarauna\/educadores\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaEducadoresDeletar(req, res, id);
  }
  
  // TURMAS
  if (rota === 'guarauna/turmas' && req.method === 'GET') {
    return guaraunaTurmasListar(req, res);
  }
  if (rota === 'guarauna/turmas' && req.method === 'POST') {
    return guaraunaTurmasCriar(req, res);
  }
  if (rota.match(/^guarauna\/turmas\/[^/]+$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaTurmasObter(req, res, id);
  }
  if (rota.match(/^guarauna\/turmas\/[^/]+$/) && req.method === 'PUT') {
    const id = slug[2];
    return guaraunaTurmasAtualizar(req, res, id);
  }
  if (rota.match(/^guarauna\/turmas\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaTurmasDeletar(req, res, id);
  }
  
  // ALUNOS EM TURMAS
  if (rota === 'guarauna/alunos-turmas' && req.method === 'POST') {
    return guaraunaMatricularAlunoTurma(req, res);
  }
  if (rota.match(/^guarauna\/alunos-turmas\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaDesmatricularAlunoTurma(req, res, id);
  }
  
  // MATRÍCULAS
  if (rota === 'guarauna/matriculas' && req.method === 'GET') {
    return guaraunaMatriculasListar(req, res);
  }
  if (rota === 'guarauna/matriculas' && req.method === 'POST') {
    return guaraunaMatriculasCriar(req, res);
  }
  if (rota.match(/^guarauna\/matriculas\/[^/]+$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaMatriculasObter(req, res, id);
  }
  if (rota.match(/^guarauna\/matriculas\/[^/]+$/) && req.method === 'PUT') {
    const id = slug[2];
    return guaraunaMatriculasAtualizar(req, res, id);
  }
  if (rota.match(/^guarauna\/matriculas\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaMatriculasDeletar(req, res, id);
  }
  
  // MODELOS DE TERMOS
  if (rota === 'guarauna/modelos-termo' && req.method === 'GET') {
    return guaraunaModelosTermoListar(req, res);
  }
  if (rota === 'guarauna/modelos-termo' && req.method === 'POST') {
    return guaraunaModelosTermoCriar(req, res);
  }
  if (rota.match(/^guarauna\/modelos-termo\/[^/]+$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaModelosTermoObter(req, res, id);
  }
  if (rota.match(/^guarauna\/modelos-termo\/[^/]+$/) && req.method === 'PUT') {
    const id = slug[2];
    return guaraunaModelosTermoAtualizar(req, res, id);
  }
  if (rota.match(/^guarauna\/modelos-termo\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaModelosTermoDeletar(req, res, id);
  }
  
  // EVENTOS COM TERMOS
  if (rota === 'guarauna/eventos' && req.method === 'GET') {
    return guaraunaEventosListar(req, res);
  }
  if (rota === 'guarauna/eventos' && req.method === 'POST') {
    return guaraunaEventosCriar(req, res);
  }
  if (rota.match(/^guarauna\/eventos\/[^/]+$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaEventosObter(req, res, id);
  }
  if (rota.match(/^guarauna\/eventos\/[^/]+$/) && req.method === 'PUT') {
    const id = slug[2];
    return guaraunaEventosAtualizar(req, res, id);
  }
  if (rota.match(/^guarauna\/eventos\/[^/]+$/) && req.method === 'DELETE') {
    const id = slug[2];
    return guaraunaEventosDeletar(req, res, id);
  }
  if (rota.match(/^guarauna\/eventos\/[^/]+\/aceites$/) && req.method === 'GET') {
    const id = slug[2];
    return guaraunaEventosAceitesListar(req, res, id);
  }
  // Criar link de aceite para matrícula (admin/usuário autenticado)
  if (rota === 'guarauna/aceite/matricula' && req.method === 'POST') {
    return guaraunaAceiteCriar(req, res);
  }
  
  // ROTAS PÚBLICAS - ACEITES (não requerem autenticação)
  if (rota.match(/^aceite\/evento\/[^/]+$/) && req.method === 'GET') {
    const codigo = slug[2];
    return aceiteEventoObterPublico(req, res, codigo);
  }
  if (rota.match(/^aceite\/evento\/[^/]+$/) && req.method === 'POST') {
    const codigo = slug[2];
    return aceiteEventoRegistrar(req, res, codigo);
  }
  if (rota.match(/^aceite\/matricula\/[^/]+$/) && req.method === 'GET') {
    const codigo = slug[2];
    return aceiteMatriculaObterPublico(req, res, codigo);
  }
  if (rota.match(/^aceite\/matricula\/[^/]+$/) && req.method === 'POST') {
    const codigo = slug[2];
    return aceiteMatriculaRegistrar(req, res, codigo);
  }
  
  // DASHBOARD GUARAÚNA
  if (rota === 'guarauna/dashboard' && req.method === 'GET') {
    return guaraunaDashboard(req, res);
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

    // Verificar se email existe no sistema
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    
    if (!usuario) {
      log(`⚠️ Tentativa de recuperação para email inexistente: ${email}`);
      return res.status(404).json({ 
        erro: 'Este email não está cadastrado no sistema. Crie uma conta primeiro.'
      });
    }

    // Gerar token de recuperação (10 caracteres em maiúsculas)
    const token = crypto.randomBytes(5).toString('hex').toUpperCase();
    const agora = new Date();
    const expiracao = new Date(agora.getTime() + 30 * 60 * 1000); // 30 minutos

    // Salvar hash do token no banco
    await prisma.usuario.update({
      where: { email },
      data: {
        tokenRecuperacao: await bcrypt.hash(token, 10),
        expiracaoToken: expiracao
      }
    });

    log(`✅ Token de recuperação gerado para ${email} (expira em 30min)`);
    
    // Enviar email com o código
    try {
      await enviarEmailRecuperacao(email, token);
      log(`✅ Email enviado para ${email}`);
    } catch (erroEmail) {
      log(`⚠️ Falha ao enviar email: ${erroEmail.message}`, 'error');
      // Continua mesmo se email falhar - token está salvo no banco
    }
    
    // TEMPORÁRIO: Exibir token em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n📧 TOKEN DE RECUPERAÇÃO [DEV MODE]:`);
      console.log(`   Email: ${email}`);
      console.log(`   Código: ${token}`);
      console.log(`   Expira em: ${expiracao.toLocaleString('pt-BR')}\n`);
    }

    res.status(200).json({ 
      mensagem: 'Se o email estiver cadastrado, você receberá um código de recuperação',
      // Retornar token apenas em desenvolvimento
      ...(process.env.NODE_ENV === 'development' && { debug: { token, expiraEm: expiracao } })
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
    
    if (!usuario) {
      log(`❌ Tentativa de validar token para email inexistente: ${email}`);
      return res.status(401).json({ erro: 'Email não encontrado' });
    }
    
    if (!usuario.tokenRecuperacao) {
      log(`❌ Nenhum token de recuperação ativo para: ${email}`);
      return res.status(401).json({ erro: 'Nenhuma solicitação de recuperação encontrada' });
    }

    // Verificar se expirou
    if (!usuario.expiracaoToken || new Date() > usuario.expiracaoToken) {
      log(`❌ Token expirado para: ${email}`);
      return res.status(401).json({ erro: 'Código expirado. Solicite um novo código de recuperação' });
    }

    // Verificar se o token está correto
    const tokenValido = await bcrypt.compare(token, usuario.tokenRecuperacao);
    
    if (!tokenValido) {
      log(`❌ Token inválido fornecido para: ${email}`);
      return res.status(401).json({ erro: 'Código inválido. Verifique e tente novamente' });
    }

    log(`✅ Token validado com sucesso para: ${email}`);
    res.status(200).json({ 
      mensagem: 'Código validado com sucesso',
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
    
    if (!usuario) {
      log(`❌ Tentativa de redefinir senha para email inexistente: ${email}`);
      return res.status(401).json({ erro: 'Email não encontrado' });
    }
    
    if (!usuario.tokenRecuperacao) {
      log(`❌ Nenhum token de recuperação para redefinir senha: ${email}`);
      return res.status(401).json({ erro: 'Nenhuma solicitação de recuperação encontrada' });
    }

    // Verificar se expirou
    if (!usuario.expiracaoToken || new Date() > usuario.expiracaoToken) {
      log(`❌ Token expirado ao tentar redefinir senha: ${email}`);
      // Limpar token expirado
      await prisma.usuario.update({
        where: { email },
        data: { tokenRecuperacao: null, expiracaoToken: null }
      });
      return res.status(401).json({ erro: 'Código expirado. Solicite um novo código de recuperação' });
    }

    // Verificar se o token está correto
    const tokenValido = await bcrypt.compare(token, usuario.tokenRecuperacao);
    
    if (!tokenValido) {
      log(`❌ Token inválido ao redefinir senha: ${email}`);
      return res.status(401).json({ erro: 'Código inválido. Verifique e tente novamente' });
    }

    // Validações adicionais de senha
    if (!/[A-Z]/.test(novaSenha)) {
      return res.status(400).json({ erro: 'Senha deve conter pelo menos uma letra maiúscula' });
    }
    if (!/[a-z]/.test(novaSenha)) {
      return res.status(400).json({ erro: 'Senha deve conter pelo menos uma letra minúscula' });
    }
    if (!/[0-9]/.test(novaSenha)) {
      return res.status(400).json({ erro: 'Senha deve conter pelo menos um número' });
    }

    // Atualizar senha com bcrypt e limpar token
    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({
      where: { email },
      data: {
        senha: senhaCriptografada,
        tokenRecuperacao: null,
        expiracaoToken: null
      }
    });

    log(`✅ Senha redefinida com sucesso para ${email}`);

    res.status(200).json({ 
      mensagem: 'Senha redefinida com sucesso! Você já pode fazer login'
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

async function usuariosDeletar(req, res) {
  const prisma = getPrisma();
  try {
    // Verificar autenticação
    const usuarioAutenticado = autenticarToken(req);
    if (!usuarioAutenticado) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Apenas admins podem deletar usuários
    if (usuarioAutenticado.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar usuários' });
    }

    const { id } = req.params;
    const idUsuario = parseInt(id);

    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({ erro: 'ID de usuário inválido' });
    }

    // Buscar usuário a ser deletado
    const usuarioParaDeletar = await prisma.usuario.findUnique({
      where: { id: idUsuario },
      include: { pessoas: true }
    });

    if (!usuarioParaDeletar) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // PROTEÇÃO: Não pode deletar o super admin
    const emailSuperAdmin = process.env.EMAIL_SUPERADMIN || 'associacaoguarauna@gmail.com';
    if (usuarioParaDeletar.email === emailSuperAdmin) {
      return res.status(403).json({ 
        erro: 'Este usuário não pode ser deletado (conta principal do sistema)' 
      });
    }

    // Não pode deletar a si mesmo
    if (usuarioParaDeletar.id === usuarioAutenticado.id) {
      return res.status(403).json({ erro: 'Você não pode deletar sua própria conta' });
    }

    // Buscar o super admin para transferir as pessoas
    const superAdmin = await prisma.usuario.findUnique({
      where: { email: emailSuperAdmin }
    });

    if (!superAdmin) {
      return res.status(500).json({ 
        erro: 'Super admin não encontrado. Não é possível transferir as pessoas.' 
      });
    }

    const quantidadePessoas = usuarioParaDeletar.pessoas.length;

    // Transferir todas as pessoas para o super admin (ao invés de deletar)
    if (quantidadePessoas > 0) {
      await prisma.pessoa.updateMany({
        where: { usuarioId: usuarioParaDeletar.id },
        data: { usuarioId: superAdmin.id }
      });

      log(`📦 ${quantidadePessoas} pessoa(s) transferida(s) de ${usuarioParaDeletar.email} para ${superAdmin.email}`);

      // Notificar via Pusher para todos os clientes sobre a transferência
      await enviarEventoPusher('pessoas-transferidas', {
        quantidadePessoas,
        usuarioOrigem: {
          id: usuarioParaDeletar.id,
          nome: usuarioParaDeletar.nome,
          email: usuarioParaDeletar.email
        },
        usuarioDestino: {
          id: superAdmin.id,
          nome: superAdmin.nome,
          email: superAdmin.email
        },
        motivo: 'Usuário deletado do sistema',
        autorId: usuarioAutenticado.id,
        autorFuncao: usuarioAutenticado.funcao
      });
    }

    // Deletar usuário
    await prisma.usuario.delete({
      where: { id: idUsuario }
    });

    log(`✅ Usuário deletado: ${usuarioParaDeletar.email} por ${usuarioAutenticado.email}`);

    res.status(200).json({ 
      mensagem: quantidadePessoas > 0 
        ? `Usuário deletado com sucesso. ${quantidadePessoas} pessoa(s) foram transferidas para o administrador principal.`
        : 'Usuário deletado com sucesso.',
      pessoasTransferidas: quantidadePessoas,
      superAdminDestino: superAdmin.nome
    });
  } catch (erro) {
    log(`Erro ao deletar usuário: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar usuário' });
  }
}

async function usuariosAlterarFuncao(req, res) {
  const prisma = getPrisma();
  try {
    // Verificar autenticação
    const usuarioAutenticado = autenticarToken(req);
    if (!usuarioAutenticado) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Apenas admins podem alterar funções
    if (usuarioAutenticado.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem alterar funções' });
    }

    const { id } = req.params;
    const { funcao } = req.body;
    const idUsuario = parseInt(id);

    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({ erro: 'ID de usuário inválido' });
    }

    if (!funcao || !['admin', 'funcionario'].includes(funcao)) {
      return res.status(400).json({ erro: 'Função inválida. Use "admin" ou "funcionario"' });
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: idUsuario }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // PROTEÇÃO: Não pode alterar função do super admin
    const emailSuperAdmin = process.env.EMAIL_SUPERADMIN || 'associacaoguarauna@gmail.com';
    if (usuario.email === emailSuperAdmin) {
      return res.status(403).json({ 
        erro: 'Este usuário não pode ter sua função alterada (conta principal do sistema)' 
      });
    }

    // Não pode alterar própria função
    if (usuario.id === usuarioAutenticado.id) {
      return res.status(403).json({ erro: 'Você não pode alterar sua própria função' });
    }

    // Atualizar função
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: idUsuario },
      data: { funcao },
      select: { id: true, email: true, nome: true, funcao: true, ativo: true }
    });

    log(`✅ Função alterada: ${usuario.email} de "${usuario.funcao}" para "${funcao}" por ${usuarioAutenticado.email}`);

    res.status(200).json({ 
      mensagem: 'Função alterada com sucesso',
      usuario: usuarioAtualizado
    });
  } catch (erro) {
    log(`Erro ao alterar função: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao alterar função' });
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

    // Filtrar por usuarioId se não for admin
    let filtroUsuario = {};
    if (usuario.funcao !== 'admin') {
      filtroUsuario.usuarioId = usuario.id;
    }

    // Obter o total geral de pessoas do usuário
    const totalGeral = await prisma.pessoa.count({ where: filtroUsuario });

    // Agrupar por comunidade e contar (apenas do usuário)
    const pessoas = await prisma.pessoa.findMany({
      where: filtroUsuario,
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

// ==================== COMUNIDADES - LISTAR ====================
async function comunidadesListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Obter todas as comunidades únicas do banco de dados
    const pessoas = await prisma.pessoa.findMany({
      where: {
        comunidade: { not: null }
      },
      select: { comunidade: true },
      distinct: ['comunidade']
    });

    // Extrair comunidades únicas, filtrar vazias e ordenar
    const comunidadesUnicas = pessoas
      .map(p => p.comunidade)
      .filter(c => c && c.trim() !== '')
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    log(`✅ Listadas ${comunidadesUnicas.length} comunidades únicas`);

    // Retornar como array de objetos - usando nome como ID (comunidade é campo texto)
    const resultado = comunidadesUnicas.map((nome) => ({
      id: nome,
      nome: nome
    }));

    res.status(200).json(resultado);
  } catch (erro) {
    log(`Erro ao listar comunidades: ${erro.message}`, 'error');
    res.status(500).json({ 
      erro: 'Erro ao listar comunidades',
      codigo: 'LISTAR_COMUNIDADES_ERROR'
    });
  }
}

async function pessoasTransferir(req, res) {
  const prisma = getPrisma();
  try {
    // Autenticação
    const usuarioAutenticado = autenticarToken(req);
    if (!usuarioAutenticado) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Apenas admins podem transferir
    if (usuarioAutenticado.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem transferir pessoas' });
    }

    const { pessoaIds, usuarioDestinoId } = req.body;

    // Validações
    if (!pessoaIds || !Array.isArray(pessoaIds) || pessoaIds.length === 0) {
      return res.status(400).json({ erro: 'Lista de IDs de pessoas é obrigatória' });
    }

    if (!usuarioDestinoId) {
      return res.status(400).json({ erro: 'ID do usuário destino é obrigatório' });
    }

    // Validar usuário destino
    const usuarioDestino = await prisma.usuario.findUnique({
      where: { id: parseInt(usuarioDestinoId) },
      select: { id: true, nome: true, email: true, funcao: true, ativo: true }
    });

    if (!usuarioDestino) {
      return res.status(404).json({ erro: 'Usuário destino não encontrado' });
    }

    if (!usuarioDestino.ativo) {
      return res.status(400).json({ erro: 'Usuário destino está inativo' });
    }

    log(`🔄 Iniciando transferência de ${pessoaIds.length} pessoa(s) para ${usuarioDestino.nome} (ID: ${usuarioDestino.id})`);

    // Executar transferência em transação
    const resultado = await prisma.$transaction(async (tx) => {
      // Atualizar todas as pessoas
      const updateResult = await tx.pessoa.updateMany({
        where: {
          id: { in: pessoaIds.map(id => parseInt(id)) }
        },
        data: {
          usuarioId: usuarioDestino.id
        }
      });

      // Buscar as pessoas transferidas para log
      const pessoasTransferidas = await tx.pessoa.findMany({
        where: {
          id: { in: pessoaIds.map(id => parseInt(id)) }
        },
        select: { id: true, nome: true, cpf: true }
      });

      return { quantidade: updateResult.count, pessoas: pessoasTransferidas };
    });

    log(`✅ Transferência concluída: ${resultado.quantidade} pessoa(s) transferida(s)`);
    log(`   De: ${usuarioAutenticado.nome} (ID: ${usuarioAutenticado.id})`);
    log(`   Para: ${usuarioDestino.nome} (ID: ${usuarioDestino.id})`);

    // Enviar evento Pusher para atualização em tempo real
    try {
      await enviarEventoPusher('pessoasTransferidas', {
        quantidade: resultado.quantidade,
        usuarioOrigemId: usuarioAutenticado.id,
        usuarioOrigemNome: usuarioAutenticado.nome,
        usuarioDestinoId: usuarioDestino.id,
        usuarioDestinoNome: usuarioDestino.nome,
        pessoaIds: pessoaIds,
        timestamp: new Date().toISOString()
      });
    } catch (erroPusher) {
      log(`⚠️ Erro ao enviar evento Pusher (não crítico): ${erroPusher.message}`, 'error');
    }

    res.status(200).json({
      mensagem: `${resultado.quantidade} pessoa(s) transferida(s) com sucesso`,
      quantidade: resultado.quantidade,
      usuarioDestino: {
        id: usuarioDestino.id,
        nome: usuarioDestino.nome,
        email: usuarioDestino.email
      }
    });
  } catch (erro) {
    log(`❌ Erro ao transferir pessoas: ${erro.message}`, 'error');
    console.error('Stack trace:', erro.stack);
    res.status(500).json({ 
      erro: 'Erro ao transferir pessoas',
      codigo: 'TRANSFER_PERSONS_ERROR',
      detalhes: erro.message
    });
  }
}

// ==================== BENEFÍCIOS GAC ====================

async function beneficiosGACListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Buscar do catálogo
    const beneficios = await prisma.beneficioGAC.findMany({ orderBy: { tipo: 'asc' } });
    log(`✅ Listados ${beneficios.length} benefícios GAC do catálogo`);
    res.status(200).json({ beneficios: beneficios.map(b => b.tipo) });
  } catch (erro) {
    log(`Erro ao listar benefícios GAC: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar benefícios GAC' });
  }
}

async function beneficiosGACAdicionar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem adicionar benefícios' });
    }

    const { tipo } = req.body;

    if (!tipo || !tipo.trim()) {
      return res.status(400).json({ erro: 'Tipo do benefício é obrigatório' });
    }

    // Verificar se já existe no catálogo
    const existe = await prisma.beneficioGAC.findUnique({ where: { tipo: tipo.trim() } });
    if (existe) {
      return res.status(409).json({ erro: 'Este benefício GAC já existe' });
    }
    await prisma.beneficioGAC.create({ data: { tipo: tipo.trim() } });
    log(`✅ Benefício GAC "${tipo}" adicionado ao catálogo`);
    res.status(201).json({ mensagem: 'Benefício GAC adicionado com sucesso', tipo: tipo.trim() });
  } catch (erro) {
    log(`Erro ao adicionar benefício GAC: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao adicionar benefício GAC' });
  }
}

async function beneficiosGACRenomear(req, res, tipo) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem renomear benefícios' });
    }

    const tipoAntigo = decodeURIComponent(tipo);
    const { novoTipo } = req.body;

    if (!novoTipo || !novoTipo.trim()) {
      return res.status(400).json({ erro: 'Novo tipo é obrigatório' });
    }

    // Renomear no catálogo
    await prisma.beneficioGAC.update({
      where: { tipo: tipoAntigo },
      data: { tipo: novoTipo.trim() }
    });
    log(`✅ Benefício GAC renomeado de "${tipoAntigo}" para "${novoTipo}" no catálogo`);
    res.status(200).json({ mensagem: 'Benefício renomeado com sucesso' });
  } catch (erro) {
    log(`Erro ao renomear benefício GAC: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao renomear benefício GAC' });
  }
}

async function beneficiosGACDeletar(req, res, tipoParam) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar benefícios' });
    }

    const tipo = decodeURIComponent(tipoParam);
    log(`🗑️ Tentando deletar benefício GAC: "${tipo}"`);

    // Verificar se há uso ativo (dataInicio <= hoje <= dataFinal)
    try {
      const pessoasComBeneficio = await prisma.pessoa.findMany({
        where: {
          beneficiosGAC: {
            path: '$.tipo',
            equals: tipo,
          }
        },
        select: { id: true, nome: true, beneficiosGAC: true }
      });

      log(`📊 Encontradas ${pessoasComBeneficio.length} pessoas com benefício "${tipo}"`);

      if (pessoasComBeneficio.length > 0) {
        const hoje = new Date();
        const conflitos = pessoasComBeneficio.filter(p => {
          if (!Array.isArray(p.beneficiosGAC)) {
            log(`⚠️ beneficiosGAC não é array para pessoa ${p.id}`, 'warn');
            return false;
          }
          
          return p.beneficiosGAC.some(b => {
            if (!b || typeof b !== 'object') return false;
            if (b.tipo !== tipo) return false;
            
            // Considera o benefício ativo se a data de hoje está entre o início e o fim
            const dataInicio = new Date(b.dataInicio);
            const dataFinal = b.dataFinal ? new Date(b.dataFinal) : null;
            
            return dataInicio <= hoje && (!dataFinal || dataFinal >= hoje);
          });
        });

        if (conflitos.length > 0) {
          const nomes = conflitos.map(p => p.nome).join(', ');
          log(`❌ Benefício "${tipo}" está ativo para ${conflitos.length} pessoa(s)`);
          res.status(400).json({ 
            erro: 'Não é possível deletar este benefício pois está ativo.',
            mensagem: `O benefício está ativo para ${conflitos.length} pessoa(s): ${nomes}. Encerre ou remova os benefícios ativos primeiro.`
          });
          return;
        }
      }
    } catch (erroConsulta) {
      log(`⚠️ Erro na consulta de benefícios ativos: ${erroConsulta.message}`, 'warn');
      // Se a consulta com path falhar, tentar alternativa
      log(`🔄 Tentando consulta alternativa...`, 'warn');
      
      const todasPessoas = await prisma.pessoa.findMany({
        select: { id: true, nome: true, beneficiosGAC: true }
      });
      
      const pessoasComBeneficio = todasPessoas.filter(p => {
        if (!Array.isArray(p.beneficiosGAC)) return false;
        return p.beneficiosGAC.some(b => b && b.tipo === tipo);
      });
      
      if (pessoasComBeneficio.length > 0) {
        const hoje = new Date();
        const conflitos = pessoasComBeneficio.filter(p => {
          if (!Array.isArray(p.beneficiosGAC)) return false;
          return p.beneficiosGAC.some(b => {
            if (!b || b.tipo !== tipo) return false;
            const dataInicio = new Date(b.dataInicio);
            const dataFinal = b.dataFinal ? new Date(b.dataFinal) : null;
            return dataInicio <= hoje && (!dataFinal || dataFinal >= hoje);
          });
        });

        if (conflitos.length > 0) {
          const nomes = conflitos.map(p => p.nome).join(', ');
          res.status(400).json({ 
            erro: 'Não é possível deletar este benefício pois está ativo.',
            mensagem: `O benefício está ativo para ${conflitos.length} pessoa(s): ${nomes}. Encerre ou remova os benefícios ativos primeiro.`
          });
          return;
        }
      }
    }

    log(`🗑️ Deletando benefício GAC: "${tipo}"`);
    await prisma.beneficioGAC.delete({ where: { tipo } });
    log(`✅ Benefício GAC "${tipo}" removido do catálogo`);
    res.status(200).json({ mensagem: 'Benefício removido com sucesso' });
  } catch (erro) {
    log(`❌ Erro ao deletar benefício GAC: ${erro.message}`, 'error');
    log(`Stack trace: ${erro.stack}`, 'error');
    res.status(500).json({ 
      erro: 'Erro ao deletar benefício GAC',
      mensagem: erro.message 
    });
  }
}

// ==================== BENEFÍCIOS GOVERNO ====================

async function beneficiosGovernoListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const beneficios = await prisma.beneficioGoverno.findMany({ orderBy: { nome: 'asc' } });
    log(`✅ Listados ${beneficios.length} benefícios Governo do catálogo`);
    res.status(200).json({ beneficios: beneficios.map(b => b.nome) });
  } catch (erro) {
    log(`Erro ao listar benefícios Governo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar benefícios Governo' });
  }
}

async function beneficiosGovernoAdicionar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem adicionar benefícios' });
    }

    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: 'Nome do benefício é obrigatório' });
    }

    // Verificar se já existe no catálogo
    const existe = await prisma.beneficioGoverno.findUnique({ where: { nome: nome.trim() } });
    if (existe) {
      return res.status(409).json({ erro: 'Este benefício Governo já existe' });
    }
    await prisma.beneficioGoverno.create({ data: { nome: nome.trim() } });
    log(`✅ Benefício Governo "${nome}" adicionado ao catálogo`);
    res.status(201).json({ mensagem: 'Benefício Governo adicionado com sucesso', nome: nome.trim() });
  } catch (erro) {
    log(`Erro ao adicionar benefício Governo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao adicionar benefício Governo' });
  }
}

async function beneficiosGovernoRenomear(req, res, nome) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem renomear benefícios' });
    }

    const nomeAntigo = decodeURIComponent(nome);
    const { novoNome } = req.body;

    if (!novoNome || !novoNome.trim()) {
      return res.status(400).json({ erro: 'Novo nome é obrigatório' });
    }

    // Renomear no catálogo
    await prisma.beneficioGoverno.update({
      where: { nome: nomeAntigo },
      data: { nome: novoNome.trim() }
    });
    log(`✅ Benefício Governo renomeado de "${nomeAntigo}" para "${novoNome}" no catálogo`);
    res.status(200).json({ mensagem: 'Benefício renomeado com sucesso' });
  } catch (erro) {
    log(`Erro ao renomear benefício Governo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao renomear benefício Governo' });
  }
}

async function beneficiosGovernoDeletar(req, res, nomeParam) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar benefícios' });
    }

    const nome = decodeURIComponent(nomeParam);

    // Verificar se há uso
    let pessoasComBeneficio = [];
    try {
      pessoasComBeneficio = await prisma.pessoa.findMany({
        where: {
          beneficiosGoverno: {
            path: '$.nome',
            equals: nome,
          }
        },
        select: { nome: true, id: true, beneficiosGoverno: true }
      });
    } catch (erroConsulta) {
      log(`⚠️ Erro na consulta de benefícios do governo por JSON path: ${erroConsulta.message}`, 'warn');
      // Fallback manual
      const todasPessoas = await prisma.pessoa.findMany({ select: { nome: true, id: true, beneficiosGoverno: true } });
      pessoasComBeneficio = todasPessoas.filter(p => {
        if (!Array.isArray(p.beneficiosGoverno)) return false;
        return p.beneficiosGoverno.some(b => b && b.nome === nome);
      });
    }

    if (pessoasComBeneficio.length > 0) {
      const nomes = pessoasComBeneficio.map(p => p.nome).join(', ');
      res.status(400).json({ 
        erro: 'Não é possível deletar este benefício pois está em uso.',
        mensagem: `O benefício está vinculado a ${pessoasComBeneficio.length} pessoa(s): ${nomes}. Remova o benefício dessas pessoas antes de deletar.`
      });
      return;
    }

    await prisma.beneficioGoverno.delete({ where: { nome } });
    log(`✅ Benefício Governo "${nome}" removido do catálogo`);
    res.status(200).json({ mensagem: 'Benefício removido com sucesso' });
  } catch (erro) {
    log(`Erro ao deletar benefício Governo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar benefício Governo' });
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
    // Restrição por usuário (não-admin)
    if (usuario.funcao !== 'admin') {
      where.usuarioId = usuario.id;
    }

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
            case 'faixaEtaria':
              // Filtrar por faixa etária baseado em dataNascimento
              const hoje = new Date();
              if (valor.includes('crianças') || valor.includes('0-17')) {
                // Crianças: nascidos há menos de 18 anos
                const dataLimite = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
                condicoes.push({
                  dataNascimento: { gt: dataLimite }
                });
              } else if (valor.includes('adultos') || valor.includes('18-59')) {
                // Adultos: nascidos entre 18 e 59 anos atrás
                const dataMin = new Date(hoje.getFullYear() - 60, hoje.getMonth(), hoje.getDate());
                const dataMax = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
                condicoes.push({
                  dataNascimento: { gte: dataMin, lte: dataMax }
                });
              } else if (valor.includes('idosos') || valor.includes('60+')) {
                // Idosos: nascidos há 60 anos ou mais
                const dataLimite = new Date(hoje.getFullYear() - 60, hoje.getMonth(), hoje.getDate());
                condicoes.push({
                  dataNascimento: { lte: dataLimite }
                });
              }
              break;
            case 'idadeMin':
              // Idade mínima: data de nascimento máxima
              const idadeMin = parseInt(valor);
              if (!isNaN(idadeMin)) {
                const hojeMin = new Date();
                const dataMaxNasc = new Date(hojeMin.getFullYear() - idadeMin, hojeMin.getMonth(), hojeMin.getDate());
                condicoes.push({
                  dataNascimento: { lte: dataMaxNasc }
                });
              }
              break;
            case 'idadeMax':
              // Idade máxima: data de nascimento mínima
              const idadeMax = parseInt(valor);
              if (!isNaN(idadeMax)) {
                const hojeMax = new Date();
                const dataMinNasc = new Date(hojeMax.getFullYear() - idadeMax - 1, hojeMax.getMonth(), hojeMax.getDate());
                condicoes.push({
                  dataNascimento: { gt: dataMinNasc }
                });
              }
              break;
            case 'dataNascimento':
              // Buscar por data de nascimento (formato DD/MM/YYYY convertido)
              try {
                const partes = valor.split('/');
                if (partes.length === 3) {
                  const dia = parseInt(partes[0]);
                  const mes = parseInt(partes[1]) - 1;
                  const ano = parseInt(partes[2]);
                  const dataInicio = new Date(ano, mes, dia);
                  const dataFim = new Date(ano, mes, dia + 1);
                  condicoes.push({
                    dataNascimento: { gte: dataInicio, lt: dataFim }
                  });
                }
              } catch (e) {
                log(`⚠️ Erro ao parsear dataNascimento: ${e.message}`);
              }
              break;
            case 'temBeneficioGAC':
              // Verificar se tem benefícios GAC (array não vazio)
              if (valor === 'sim') {
                condicoes.push({
                  NOT: { beneficiosGAC: { equals: [] } }
                });
              }
              break;
            case 'temBeneficioGoverno':
              // Verificar se tem benefícios do Governo (array não vazio)
              if (valor === 'sim') {
                condicoes.push({
                  NOT: { beneficiosGoverno: { equals: [] } }
                });
              }
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

    // Adicionar idade calculada dinamicamente a cada pessoa
    const pessoasComIdade = pessoas.map(pessoa => ({
      ...pessoa,
      idade: calcularIdade(pessoa.dataNascimento)
    }));

    log(`✅ Retornando ${pessoas.length} de ${total} pessoas`);

    res.status(200).json({
      pessoas: pessoasComIdade,
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

    const { nome, cpf, dataNascimento } = req.body;
    
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

    // Validação: data de nascimento obrigatória
    if (!dataNascimento) {
      return res.status(400).json({ 
        erro: 'Data de nascimento é obrigatória',
        campos: {
          dataNascimento: 'Campo obrigatório'
        }
      });
    }

    // Validação: data de nascimento deve ser válida e não futura
    const dataNasc = new Date(dataNascimento);
    if (isNaN(dataNasc.getTime())) {
      return res.status(400).json({ 
        erro: 'Data de nascimento inválida',
        campos: {
          dataNascimento: 'Data inválida'
        }
      });
    }
    
    if (dataNasc > new Date()) {
      return res.status(400).json({ 
        erro: 'Data de nascimento não pode ser no futuro',
        campos: {
          dataNascimento: 'Data futura não permitida'
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

    const idadeCalculada = calcularIdade(pessoa.dataNascimento);
    log(`✅ Pessoa criada com sucesso: ${pessoa.nome} (ID: ${pessoa.id}, Idade: ${idadeCalculada} anos)`);
    
    // 🚀 Enviar evento Pusher em tempo real para TODOS os clientes
    await enviarEventoPusher('pessoaCadastrada', {
      pessoa: {
        id: pessoa.id,
        nome: pessoa.nome,
        cpf: pessoa.cpf
      },
      autorId: usuario.id,
      autorFuncao: usuario.funcao,
      tipo: 'cadastro'
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

    let pessoa;
    if (usuario.funcao === 'admin') {
      pessoa = await prisma.pessoa.findUnique({ where: { id: parseInt(id) } });
    } else {
      pessoa = await prisma.pessoa.findFirst({ where: { id: parseInt(id), usuarioId: usuario.id } });
    }
    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    // Adicionar idade calculada dinamicamente
    const pessoaComIdade = {
      ...pessoa,
      idade: calcularIdade(pessoa.dataNascimento)
    };

    res.status(200).json(pessoaComIdade);
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

    // Validação: Data de nascimento obrigatória
    if (!req.body.dataNascimento) {
      return res.status(400).json({ 
        erro: 'Data de nascimento é obrigatória',
        campos: {
          dataNascimento: 'Campo obrigatório'
        }
      });
    }

    // Validação: Data de nascimento deve ser válida e não futura
    if (req.body.dataNascimento) {
      const dataNasc = new Date(req.body.dataNascimento);
      if (isNaN(dataNasc.getTime())) {
        return res.status(400).json({ 
          erro: 'Data de nascimento inválida',
          campos: {
            dataNascimento: 'Data inválida'
          }
        });
      }
      
      if (dataNasc > new Date()) {
        return res.status(400).json({ 
          erro: 'Data de nascimento não pode ser no futuro',
          campos: {
            dataNascimento: 'Data futura não permitida'
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
    
    // 🚀 Enviar evento Pusher em tempo real
    await enviarEventoPusher('pessoaAtualizada', {
      pessoa: {
        id: pessoa.id,
        nome: pessoa.nome,
        cpf: pessoa.cpf
      },
      autorId: usuario.id,
      autorFuncao: usuario.funcao,
      tipo: 'edicao'
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

    const pessoaId = parseInt(id);

    // 🛡️ VERIFICAR DEPENDÊNCIAS ANTES DE DELETAR
    const verificacao = await verificarDependenciasPessoa(prisma, pessoaId);
    
    if (!verificacao.podeExcluir) {
      return res.status(409).json({
        erro: 'Não é possível excluir esta pessoa',
        motivo: verificacao.motivoBloqueio,
        dependencias: verificacao.dependencias,
        sugestao: verificacao.sugestao
      });
    }

    // Obter dados da pessoa antes de deletar para o evento
    const pessoaParaDeletar = await prisma.pessoa.findUnique({ 
      where: { id: pessoaId },
      select: { id: true, nome: true, cpf: true }
    });
    
    if (!pessoaParaDeletar) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }
    
    // Deletar pessoa (cascata cuida do resto)
    await prisma.pessoa.delete({ where: { id: pessoaId } });
    
    // 🚀 Enviar evento Pusher em tempo real
    await enviarEventoPusher('pessoaDeletada', {
      pessoa: pessoaParaDeletar,
      autorId: usuario.id,
      autorFuncao: usuario.funcao,
      tipo: 'delecao',
      dependenciasRemovidas: verificacao.dependencias
    });

    res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar pessoa: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar pessoa' });
  }
}

// 🛡️ VERIFICAR DEPENDÊNCIAS DE UMA PESSOA ANTES DE EXCLUIR
async function verificarDependenciasPessoa(prisma, pessoaId) {
  const dependencias = {
    aluno: null,
    responsavel: null,
    educador: null,
    detalhes: []
  };

  let podeExcluir = true;
  let motivoBloqueio = null;
  let sugestao = null;

  // Verificar se é Aluno Guaraúna
  const aluno = await prisma.alunoGuarauna.findUnique({
    where: { pessoaId },
    include: {
      turmas: { where: { ativo: true }, include: { turma: true } },
      matriculas: true,
      aceitesEventos: { include: { eventoTermo: true } },
      responsaveis: { include: { responsavel: { include: { pessoa: true } } } }
    }
  });

  if (aluno) {
    dependencias.aluno = {
      id: aluno.id,
      ativo: aluno.ativo,
      turmas: aluno.turmas.length,
      matriculas: aluno.matriculas.length,
      termosAceitos: aluno.aceitesEventos.length,
      responsaveisVinculados: aluno.responsaveis.length
    };

    // Se tem matrículas ou termos aceitos, bloquear exclusão
    if (aluno.matriculas.length > 0) {
      podeExcluir = false;
      motivoBloqueio = `Este aluno possui ${aluno.matriculas.length} matrícula(s) registrada(s)`;
      sugestao = 'Desative o aluno em vez de excluir, ou remova as matrículas primeiro';
    }

    if (aluno.aceitesEventos.length > 0 && podeExcluir) {
      podeExcluir = false;
      motivoBloqueio = `Este aluno possui ${aluno.aceitesEventos.length} termo(s) aceito(s)`;
      sugestao = 'Termos assinados são documentos legais e não podem ser removidos';
    }

    if (aluno.turmas.length > 0) {
      dependencias.detalhes.push(`Vinculado a ${aluno.turmas.length} turma(s): ${aluno.turmas.map(t => t.turma.nome).join(', ')}`);
    }
  }

  // Verificar se é Responsável Legal
  const responsavel = await prisma.responsavelLegal.findUnique({
    where: { pessoaId },
    include: {
      alunos: { include: { aluno: { include: { pessoa: true } } } },
      aceitesMatricula: true,
      aceitesEventos: true
    }
  });

  if (responsavel) {
    dependencias.responsavel = {
      id: responsavel.id,
      ativo: responsavel.ativo,
      alunosVinculados: responsavel.alunos.length,
      aceitesMatricula: responsavel.aceitesMatricula.length,
      aceitesEventos: responsavel.aceitesEventos.length
    };

    // Se tem aceites digitais (documentos legais), bloquear
    if (responsavel.aceitesMatricula.length > 0 && podeExcluir) {
      podeExcluir = false;
      motivoBloqueio = `Este responsável assinou ${responsavel.aceitesMatricula.length} termo(s) de matrícula`;
      sugestao = 'Termos assinados são documentos legais e não podem ser removidos';
    }

    if (responsavel.aceitesEventos.length > 0 && podeExcluir) {
      podeExcluir = false;
      motivoBloqueio = `Este responsável assinou ${responsavel.aceitesEventos.length} termo(s) de evento`;
      sugestao = 'Termos assinados são documentos legais e não podem ser removidos';
    }

    if (responsavel.alunos.length > 0) {
      const nomesAlunos = responsavel.alunos.map(r => r.aluno.pessoa?.nome || 'Aluno').join(', ');
      dependencias.detalhes.push(`Responsável por ${responsavel.alunos.length} aluno(s): ${nomesAlunos}`);
    }
  }

  // Verificar se é Educador
  const educador = await prisma.educador.findUnique({
    where: { pessoaId },
    include: {
      turmas: { where: { ativa: true } },
      termos: true,
      comunidades: { where: { ativo: true } }
    }
  });

  if (educador) {
    dependencias.educador = {
      id: educador.id,
      ativo: educador.ativo,
      turmasAtivas: educador.turmas.length,
      termosAssinados: educador.termos.length,
      comunidadesAtivas: educador.comunidades.length
    };

    // Se tem termos de educador assinados, bloquear
    if (educador.termos.length > 0 && podeExcluir) {
      podeExcluir = false;
      motivoBloqueio = `Este educador assinou ${educador.termos.length} termo(s) de voluntariado/imagem`;
      sugestao = 'Termos assinados são documentos legais e não podem ser removidos';
    }

    // Se tem turmas ativas, avisar mas permitir (SetNull no schema)
    if (educador.turmas.length > 0) {
      dependencias.detalhes.push(`Responsável por ${educador.turmas.length} turma(s) ativa(s) - serão desvinculadas`);
    }
  }

  return {
    podeExcluir,
    motivoBloqueio,
    sugestao,
    dependencias,
    temDependencias: !!(aluno || responsavel || educador)
  };
}

// 🔍 ENDPOINT: Verificar dependências antes de excluir pessoa
async function pessoasVerificarExclusao(req, res, id) {
  console.log('\n🔍 VERIFICANDO DEPENDÊNCIAS PARA EXCLUSÃO DE PESSOA');
  const prisma = getPrisma();
  
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const pessoaId = parseInt(id);
    
    // Buscar pessoa
    const pessoa = await prisma.pessoa.findUnique({
      where: { id: pessoaId },
      select: { id: true, nome: true, cpf: true, comunidade: true }
    });

    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    // Verificar todas as dependências
    const verificacao = await verificarDependenciasPessoa(prisma, pessoaId);

    res.status(200).json({
      pessoa,
      ...verificacao
    });
  } catch (erro) {
    log(`Erro ao verificar exclusão: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao verificar dependências' });
  }
}

// 🗑️ DELEÇÃO EM MASSA DE PESSOAS
async function pessoasDeletarEmMassa(req, res) {
  console.log('\n🗑️🗑️🗑️ FUNÇÃO PESSOAS DELETAR EM MASSA CHAMADA! 🗑️🗑️🗑️');
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Apenas admin pode deletar em massa
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar em massa' });
    }

    const { ids, forcarExclusao } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ erro: 'Lista de IDs é obrigatória' });
    }

    // Limitar a quantidade para evitar timeouts (máximo 100 por vez)
    if (ids.length > 100) {
      return res.status(400).json({ 
        erro: 'Máximo de 100 pessoas por vez',
        mensagem: 'Divida a operação em lotes menores' 
      });
    }

    log(`🗑️ Verificando ${ids.length} pessoas para exclusão em massa`);

    // 🛡️ VERIFICAR DEPENDÊNCIAS DE CADA PESSOA
    const pessoasVerificadas = [];
    const pessoasBloqueadas = [];
    const pessoasLiberadas = [];

    for (const id of ids) {
      const pessoaId = parseInt(id);
      const verificacao = await verificarDependenciasPessoa(prisma, pessoaId);
      
      const pessoa = await prisma.pessoa.findUnique({
        where: { id: pessoaId },
        select: { id: true, nome: true, cpf: true }
      });

      if (!pessoa) continue;

      if (verificacao.podeExcluir) {
        pessoasLiberadas.push({ ...pessoa, verificacao });
      } else {
        pessoasBloqueadas.push({ 
          ...pessoa, 
          motivo: verificacao.motivoBloqueio,
          sugestao: verificacao.sugestao
        });
      }
    }

    // Se não forçar exclusão e houver bloqueadas, retornar relatório
    if (pessoasBloqueadas.length > 0 && !forcarExclusao) {
      return res.status(409).json({
        erro: 'Algumas pessoas não podem ser excluídas',
        bloqueadas: pessoasBloqueadas,
        liberadas: pessoasLiberadas.map(p => ({ id: p.id, nome: p.nome })),
        totalBloqueadas: pessoasBloqueadas.length,
        totalLiberadas: pessoasLiberadas.length,
        mensagem: `${pessoasBloqueadas.length} pessoa(s) possuem dependências que impedem a exclusão. ${pessoasLiberadas.length} podem ser excluídas.`
      });
    }

    // Deletar apenas as pessoas liberadas
    if (pessoasLiberadas.length === 0) {
      return res.status(409).json({
        erro: 'Nenhuma pessoa pode ser excluída',
        bloqueadas: pessoasBloqueadas,
        mensagem: 'Todas as pessoas selecionadas possuem dependências que impedem a exclusão'
      });
    }

    const idsParaDeletar = pessoasLiberadas.map(p => p.id);
    
    const resultado = await prisma.pessoa.deleteMany({
      where: { id: { in: idsParaDeletar } }
    });

    log(`✅ ${resultado.count} pessoas deletadas com sucesso`);

    // 🚀 Enviar evento Pusher para cada pessoa deletada
    for (const pessoa of pessoasLiberadas) {
      await enviarEventoPusher('pessoaDeletada', {
        pessoa: { id: pessoa.id, nome: pessoa.nome, cpf: pessoa.cpf },
        autorId: usuario.id,
        autorFuncao: usuario.funcao,
        tipo: 'delecao-em-massa'
      });
    }

    res.status(200).json({ 
      mensagem: `${resultado.count} pessoas deletadas com sucesso`,
      quantidade: resultado.count,
      bloqueadas: pessoasBloqueadas.length > 0 ? pessoasBloqueadas : undefined
    });
  } catch (erro) {
    log(`Erro ao deletar pessoas em massa: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar pessoas em massa' });
  }
}

// ==================== MÓDULO GUARAÚNA - ALUNOS ====================

async function guaraunaAlunosListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { comunidade, ativo, busca, turmaId } = req.query;

    const where = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (comunidade) where.pessoa = { comunidade };
    if (turmaId) where.turmas = { some: { turmaId, ativo: true } };

    const alunos = await prisma.alunoGuarauna.findMany({
      where,
      include: {
        pessoa: true,
        responsaveis: {
          include: {
            responsavel: {
              include: { pessoa: true }
            }
          }
        },
        turmas: {
          where: { ativo: true },
          include: { turma: true }
        },
        matriculas: {
          orderBy: { ano: 'desc' },
          take: 1
        }
      },
      orderBy: { pessoa: { nome: 'asc' } }
    });

    // Formatar os dados para o frontend
    let resultado = alunos.map(aluno => {
      const formatado = {
        ...aluno,
        // Dados da pessoa para facilitar acesso
        nome: aluno.pessoa?.nome,
        dataNascimento: aluno.pessoa?.dataNascimento,
        comunidade: aluno.pessoa?.comunidade,
        telefone: aluno.pessoa?.telefone,
        cpf: aluno.pessoa?.cpf,
        // Lista de responsáveis formatada
        responsaveis: aluno.responsaveis?.map(ar => ({
          id: ar.responsavel?.id,
          nome: ar.responsavel?.pessoa?.nome,
          parentesco: ar.parentesco,
          principal: ar.principal,
          telefone: ar.responsavel?.pessoa?.telefone
        })) || [],
        // Graduação atual (campo direto no aluno)
        graduacaoAtual: aluno.graduacaoAtual || null,
        // Turma atual (da relação com turmas)
        turmaAtual: aluno.turmas?.[0]?.turma?.nome || null,
        // Matrícula atual
        matriculaAtual: aluno.matriculas?.[0] || null
      };
      
      log(`📋 Aluno: ${formatado.nome} | Graduação: ${formatado.graduacaoAtual} | Responsáveis: ${formatado.responsaveis.length}`);
      return formatado;
    });

    // Filtrar por busca se fornecido
    if (busca) {
      const termoBusca = busca.toLowerCase();
      resultado = resultado.filter(a => 
        a.nome?.toLowerCase().includes(termoBusca) ||
        a.cpf?.includes(termoBusca)
      );
    }

    res.json({ alunos: resultado, total: resultado.length });
  } catch (erro) {
    log(`Erro ao listar alunos: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar alunos' });
  }
}

async function guaraunaAlunosCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { 
      pessoaId, 
      // Dados da pessoa (se não tiver pessoaId)
      nome, cpf, dataNascimento, telefone, email, comunidade, endereco, rg,
      // Dados do aluno
      graduacaoAtual, ubs, numeroSUS, doencas, alergias, medicamentos, necessidadesEspeciais,
      observacoes,
      // Responsável a vincular (opcional)
      responsavelId, parentesco
    } = req.body;

    // Função para limpar CPF (remover formatação)
    const limparCPF = (cpf) => cpf ? cpf.replace(/\D/g, '') : null;
    // Função para limpar telefone (remover formatação)
    const limparTelefone = (tel) => tel ? tel.replace(/\D/g, '') : null;

    let pessoaFinalId = pessoaId ? parseInt(pessoaId) : null;

    const cpfLimpo = limparCPF(cpf);
    const telefoneLimpo = limparTelefone(telefone);

    // Se não tem pessoaId, criar ou buscar pessoa pelo CPF
    if (!pessoaFinalId) {
      if (!nome || !comunidade) {
        return res.status(400).json({ erro: 'Nome e comunidade são obrigatórios' });
      }

      // Verificar se já existe pessoa com esse CPF
      if (cpfLimpo && cpfLimpo.length === 11) {
        const pessoaExistente = await prisma.pessoa.findUnique({ where: { cpf: cpfLimpo } });
        if (pessoaExistente) {
          pessoaFinalId = pessoaExistente.id;
          // Atualizar dados da pessoa existente
          await prisma.pessoa.update({
            where: { id: pessoaFinalId },
            data: {
              nome,
              dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
              telefone: telefoneLimpo || undefined,
              email: email || undefined,
              comunidade,
              endereco: endereco || undefined,
              rg: rg || undefined,
              observacoes: observacoes || undefined
            }
          });
        }
      }

      // Se ainda não tem pessoaId, criar nova pessoa
      if (!pessoaFinalId) {
        const novaPessoa = await prisma.pessoa.create({
          data: {
            nome,
            cpf: cpfLimpo || `TEMP-${Date.now()}`, // CPF temporário se não fornecido
            dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
            telefone: telefoneLimpo,
            email,
            comunidade,
            endereco: endereco || '',
            rg,
            observacoes,
            usuarioId: usuario.id
          }
        });
        pessoaFinalId = novaPessoa.id;
        log(`✅ Pessoa criada: ${nome} (ID: ${novaPessoa.id})`);
      }
    } else {
      // Se tem pessoaId, atualizar dados da pessoa
      await prisma.pessoa.update({
        where: { id: pessoaFinalId },
        data: {
          ...(nome && { nome }),
          ...(dataNascimento && { dataNascimento: new Date(dataNascimento) }),
          ...(telefoneLimpo && { telefone: telefoneLimpo }),
          ...(email !== undefined && { email }),
          ...(comunidade && { comunidade }),
          ...(endereco !== undefined && { endereco }),
          ...(rg !== undefined && { rg }),
          ...(observacoes !== undefined && { observacoes })
        }
      });
    }

    // Verificar se pessoa existe
    const pessoa = await prisma.pessoa.findUnique({ where: { id: pessoaFinalId } });
    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    // Verificar se já é aluno
    const alunoExistente = await prisma.alunoGuarauna.findUnique({ where: { pessoaId: pessoaFinalId } });
    if (alunoExistente) {
      return res.status(400).json({ erro: 'Esta pessoa já está cadastrada como aluno' });
    }

    // Criar aluno
    const aluno = await prisma.alunoGuarauna.create({
      data: {
        pessoaId: pessoaFinalId,
        graduacaoAtual,
        ubs,
        numeroSUS,
        doencas,
        alergias,
        medicamentos,
        necessidadesEspeciais
      },
      include: {
        pessoa: true,
        responsaveis: {
          include: {
            responsavel: { include: { pessoa: true } }
          }
        }
      }
    });

    // Se tiver responsável para vincular
    if (responsavelId && parentesco) {
      await prisma.alunoResponsavel.create({
        data: {
          alunoId: aluno.id,
          responsavelId,
          parentesco,
          principal: true
        }
      });
      log(`✅ Responsável vinculado ao aluno: ${aluno.id}`);
    }

    log(`✅ Aluno criado: ${pessoa.nome} (ID: ${aluno.id})`);
    res.status(201).json(aluno);
  } catch (erro) {
    log(`Erro ao criar aluno: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar aluno', detalhes: erro.message });
  }
}

async function guaraunaAlunosObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const aluno = await prisma.alunoGuarauna.findUnique({
      where: { id },
      include: {
        pessoa: true,
        responsaveis: {
          include: {
            responsavel: {
              include: { pessoa: true }
            }
          }
        },
        turmas: {
          include: { turma: true }
        },
        matriculas: {
          orderBy: { ano: 'desc' },
          include: { aceites: true }
        }
      }
    });

    if (!aluno) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    res.json(aluno);
  } catch (erro) {
    log(`Erro ao obter aluno: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter aluno' });
  }
}

async function guaraunaAlunosAtualizar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { 
      // Dados da pessoa
      nome, cpf, dataNascimento, telefone, email, comunidade, endereco, rg, observacoes,
      // Dados do aluno
      graduacaoAtual, ubs, numeroSUS, doencas, alergias, medicamentos, necessidadesEspeciais, ativo 
    } = req.body;

    // Função para limpar CPF (remover formatação)
    const limparCPF = (cpf) => cpf ? cpf.replace(/\D/g, '') : null;
    // Função para limpar telefone (remover formatação)
    const limparTelefone = (tel) => tel ? tel.replace(/\D/g, '') : null;

    // Buscar aluno para obter pessoaId
    const alunoExistente = await prisma.alunoGuarauna.findUnique({
      where: { id },
      include: { pessoa: true }
    });

    if (!alunoExistente) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    const cpfLimpo = limparCPF(cpf);
    const telefoneLimpo = limparTelefone(telefone);

    // Atualizar dados da pessoa
    if (nome || dataNascimento || telefone || email || comunidade || endereco || rg !== undefined || observacoes !== undefined || cpf) {
      await prisma.pessoa.update({
        where: { id: alunoExistente.pessoaId },
        data: {
          ...(nome && { nome }),
          ...(cpfLimpo && cpfLimpo.length === 11 && { cpf: cpfLimpo }),
          ...(dataNascimento && { dataNascimento: new Date(dataNascimento) }),
          ...(telefoneLimpo && { telefone: telefoneLimpo }),
          ...(email !== undefined && { email }),
          ...(comunidade && { comunidade }),
          ...(endereco !== undefined && { endereco }),
          ...(rg !== undefined && { rg }),
          ...(observacoes !== undefined && { observacoes })
        }
      });
    }

    // Atualizar dados do aluno
    const aluno = await prisma.alunoGuarauna.update({
      where: { id },
      data: {
        ...(graduacaoAtual !== undefined && { graduacaoAtual }),
        ...(ubs !== undefined && { ubs }),
        ...(numeroSUS !== undefined && { numeroSUS }),
        ...(doencas !== undefined && { doencas }),
        ...(alergias !== undefined && { alergias }),
        ...(medicamentos !== undefined && { medicamentos }),
        ...(necessidadesEspeciais !== undefined && { necessidadesEspeciais }),
        ...(ativo !== undefined && { ativo })
      },
      include: { 
        pessoa: true,
        responsaveis: {
          include: {
            responsavel: { include: { pessoa: true } }
          }
        }
      }
    });

    log(`✅ Aluno atualizado: ${aluno.pessoa.nome}`);
    res.json(aluno);
  } catch (erro) {
    log(`Erro ao atualizar aluno: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar aluno', detalhes: erro.message });
  }
}

async function guaraunaAlunosDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar alunos' });
    }

    await prisma.alunoGuarauna.delete({ where: { id } });
    log(`✅ Aluno deletado: ${id}`);
    res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar aluno: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar aluno' });
  }
}

// ==================== MÓDULO GUARAÚNA - RESPONSÁVEIS ====================

async function guaraunaResponsaveisListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const responsaveis = await prisma.responsavelLegal.findMany({
      where: { ativo: true },
      include: {
        pessoa: true,
        alunos: {
          include: {
            aluno: {
              include: { pessoa: true }
            }
          }
        }
      },
      orderBy: { pessoa: { nome: 'asc' } }
    });

    res.json(responsaveis);
  } catch (erro) {
    log(`Erro ao listar responsáveis: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar responsáveis' });
  }
}

async function guaraunaResponsaveisCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { 
      pessoaId,
      // Dados da pessoa (se não tiver pessoaId)
      nome, cpf, rg, telefone, email, endereco,
      // Dados do responsável
      profissao, localTrabalho, estaEmpregado,
      // Parentesco e alunos a vincular
      parentesco, alunoIds
    } = req.body;

    // Garantir que estaEmpregado seja booleano
    let valorEmpregado = estaEmpregado;
    if (typeof valorEmpregado === 'string') {
      valorEmpregado = valorEmpregado === 'true' || valorEmpregado === 'sim' || valorEmpregado === '1';
    }
    console.log('[DEBUG] Valor de estaEmpregado recebido (criar):', estaEmpregado, '->', valorEmpregado, typeof valorEmpregado);

    // Função para limpar CPF (remover formatação)
    const limparCPF = (cpf) => cpf ? cpf.replace(/\D/g, '') : null;
    // Função para limpar telefone (remover formatação)
    const limparTelefone = (tel) => tel ? tel.replace(/\D/g, '') : null;

    let pessoaFinalId = pessoaId ? parseInt(pessoaId) : null;

    // Se não tem pessoaId, criar ou buscar pessoa pelo CPF
    if (!pessoaFinalId) {
      if (!nome) {
        return res.status(400).json({ erro: 'Nome é obrigatório' });
      }

      const cpfLimpo = limparCPF(cpf);

      // Verificar se já existe pessoa com esse CPF
      if (cpfLimpo && cpfLimpo.length === 11) {
        const pessoaExistente = await prisma.pessoa.findUnique({ where: { cpf: cpfLimpo } });
        if (pessoaExistente) {
          pessoaFinalId = pessoaExistente.id;
          // Atualizar dados da pessoa existente
          await prisma.pessoa.update({
            where: { id: pessoaFinalId },
            data: {
              nome,
              rg: rg || undefined,
              telefone: limparTelefone(telefone) || undefined,
              email: email || undefined,
              endereco: endereco || undefined
            }
          });
        }
      }

      // Se ainda não tem pessoaId, criar nova pessoa
      if (!pessoaFinalId) {
        const novaPessoa = await prisma.pessoa.create({
          data: {
            nome,
            cpf: cpfLimpo || `TEMP-RESP-${Date.now()}`,
            rg,
            telefone: limparTelefone(telefone),
            email,
            endereco: endereco || '',
            usuarioId: usuario.id
          }
        });
        pessoaFinalId = novaPessoa.id;
        log(`✅ Pessoa criada para responsável: ${nome} (ID: ${novaPessoa.id})`);
      }
    } else {
      // Se tem pessoaId, atualizar dados da pessoa
      await prisma.pessoa.update({
        where: { id: pessoaFinalId },
        data: {
          ...(nome && { nome }),
          ...(rg !== undefined && { rg }),
          ...(telefone && { telefone: limparTelefone(telefone) }),
          ...(email !== undefined && { email }),
          ...(endereco !== undefined && { endereco })
        }
      });
    }

    // Verificar se pessoa existe
    const pessoa = await prisma.pessoa.findUnique({ where: { id: pessoaFinalId } });
    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    // Verificar se já é responsável
    const existente = await prisma.responsavelLegal.findUnique({ where: { pessoaId: pessoaFinalId } });
    if (existente) {
      return res.status(400).json({ erro: 'Esta pessoa já está cadastrada como responsável' });
    }

    // Criar responsável
    const responsavel = await prisma.responsavelLegal.create({
      data: {
        pessoaId: pessoaFinalId,
        profissao,
        localTrabalho,
        estaEmpregado: valorEmpregado,
        parentesco: parentesco && parentesco.trim() ? parentesco : null
      },
      include: { pessoa: true, alunos: { include: { aluno: { include: { pessoa: true } } } } }
    });

    // Vincular aos alunos se fornecidos
    if (alunoIds && Array.isArray(alunoIds) && alunoIds.length > 0) {
      for (const alunoId of alunoIds) {
        try {
          await prisma.alunoResponsavel.create({
            data: {
              alunoId: String(alunoId),
              responsavelId: responsavel.id,
              parentesco: parentesco || 'Responsável',
              principal: alunoIds.indexOf(alunoId) === 0 // Primeiro é principal
            }
          });
          log(`✅ Aluno ${alunoId} vinculado ao responsável ${responsavel.id}`);
        } catch (vinculoErro) {
          log(`⚠️ Erro ao vincular aluno ${alunoId}: ${vinculoErro.message}`, 'warn');
        }
      }
    }

    // Buscar responsável atualizado com vínculos
    const responsavelAtualizado = await prisma.responsavelLegal.findUnique({
      where: { id: responsavel.id },
      include: { 
        pessoa: true, 
        alunos: { include: { aluno: { include: { pessoa: true } } } } 
      }
    });

    log(`✅ Responsável criado: ${pessoa.nome} (ID: ${responsavel.id})`);
    res.status(201).json(responsavelAtualizado);
  } catch (erro) {
    log(`Erro ao criar responsável: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar responsável', detalhes: erro.message });
  }
}

async function guaraunaResponsaveisObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const responsavel = await prisma.responsavelLegal.findUnique({
      where: { id },
      include: {
        pessoa: true,
        alunos: {
          include: {
            aluno: {
              include: { pessoa: true }
            }
          }
        }
      }
    });

    if (!responsavel) {
      return res.status(404).json({ erro: 'Responsável não encontrado' });
    }

    // Log detalhado do objeto retornado
    console.log('[DEBUG] Objeto responsavel retornado ao frontend:', JSON.stringify(responsavel, null, 2));

    // Garantir que o campo estaEmpregado está presente (mesmo que null)
    if (!('estaEmpregado' in responsavel)) {
      responsavel.estaEmpregado = null;
    }

    res.json(responsavel);
  } catch (erro) {
    log(`Erro ao obter responsável: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter responsável' });
  }
}

async function guaraunaResponsaveisAtualizar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { 
      // Dados da pessoa
      nome, cpf, rg, telefone, email, endereco,
      // Dados do responsável
      profissao, localTrabalho, estaEmpregado, ativo,
      // Parentesco e alunos a vincular
      parentesco, alunoIds, pessoaId
    } = req.body;

    // Garantir que estaEmpregado seja booleano
    let valorEmpregado = estaEmpregado;
    if (typeof valorEmpregado === 'string') {
      valorEmpregado = valorEmpregado === 'true' || valorEmpregado === 'sim' || valorEmpregado === '1';
    }
    console.log('[DEBUG] Valor de estaEmpregado recebido (atualizar):', estaEmpregado, '->', valorEmpregado, typeof valorEmpregado);

    // Função para limpar CPF (remover formatação)
    const limparCPF = (cpf) => cpf ? cpf.replace(/\D/g, '') : null;
    // Função para limpar telefone (remover formatação)
    const limparTelefone = (tel) => tel ? tel.replace(/\D/g, '') : null;

    // Buscar responsável existente
    const responsavelExistente = await prisma.responsavelLegal.findUnique({
      where: { id },
      include: { pessoa: true, alunos: true }
    });

    if (!responsavelExistente) {
      return res.status(404).json({ erro: 'Responsável não encontrado' });
    }

    // Atualizar dados da pessoa
    if (nome || telefone || email || endereco || rg !== undefined) {
      const cpfLimpo = limparCPF(cpf);
      await prisma.pessoa.update({
        where: { id: responsavelExistente.pessoaId },
        data: {
          ...(nome && { nome }),
          ...(cpfLimpo && cpfLimpo.length === 11 && { cpf: cpfLimpo }),
          ...(rg !== undefined && { rg }),
          ...(telefone && { telefone: limparTelefone(telefone) }),
          ...(email !== undefined && { email }),
          ...(endereco !== undefined && { endereco })
        }
      });
      log(`✅ Pessoa do responsável atualizada: ${nome || responsavelExistente.pessoa.nome}`);
    }

    // Atualizar dados do responsável
    const responsavel = await prisma.responsavelLegal.update({
      where: { id },
      data: { 
        ...(profissao !== undefined && { profissao }),
        ...(localTrabalho !== undefined && { localTrabalho }),
        ...(estaEmpregado !== undefined && { estaEmpregado: valorEmpregado }),
        ...(parentesco !== undefined && { parentesco: parentesco && parentesco.trim() ? parentesco : null }),
        ...(ativo !== undefined && { ativo })
      },
      include: { pessoa: true }
    });

    // Atualizar vínculos com alunos se fornecidos
    if (alunoIds !== undefined && Array.isArray(alunoIds)) {
      // Obter IDs dos alunos atualmente vinculados
      const alunosAtuais = responsavelExistente.alunos.map(a => a.alunoId);
      
      // Alunos a adicionar (estão em alunoIds mas não em alunosAtuais)
      const alunosAdicionar = alunoIds.filter(id => !alunosAtuais.includes(String(id)));
      
      // Alunos a remover (estão em alunosAtuais mas não em alunoIds)
      const alunosRemover = alunosAtuais.filter(id => !alunoIds.map(String).includes(id));

      // Remover vínculos antigos
      if (alunosRemover.length > 0) {
        await prisma.alunoResponsavel.deleteMany({
          where: {
            responsavelId: id,
            alunoId: { in: alunosRemover }
          }
        });
        log(`✅ ${alunosRemover.length} vínculos removidos do responsável ${id}`);
      }

      // Adicionar novos vínculos
      for (const alunoId of alunosAdicionar) {
        try {
          await prisma.alunoResponsavel.create({
            data: {
              alunoId: String(alunoId),
              responsavelId: id,
              parentesco: parentesco || 'Responsável',
              principal: false
            }
          });
          log(`✅ Aluno ${alunoId} vinculado ao responsável ${id}`);
        } catch (vinculoErro) {
          if (vinculoErro.code !== 'P2002') { // Ignorar erro de duplicata
            log(`⚠️ Erro ao vincular aluno ${alunoId}: ${vinculoErro.message}`, 'warn');
          }
        }
      }

      // Atualizar parentesco nos vínculos existentes se fornecido
      if (parentesco) {
        await prisma.alunoResponsavel.updateMany({
          where: { responsavelId: id },
          data: { parentesco }
        });
      }
    }

    // Buscar responsável atualizado com todos os vínculos
    const responsavelAtualizado = await prisma.responsavelLegal.findUnique({
      where: { id },
      include: { 
        pessoa: true, 
        alunos: { include: { aluno: { include: { pessoa: true } } } } 
      }
    });

    log(`✅ Responsável atualizado: ${responsavelAtualizado.pessoa.nome}`);
    res.json(responsavelAtualizado);
  } catch (erro) {
    log(`Erro ao atualizar responsável: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar responsável', detalhes: erro.message });
  }
}

async function guaraunaResponsaveisDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Verificar se é admin
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar responsáveis' });
    }

    // Deletar o responsável (cascade vai remover os vínculos)
    await prisma.responsavelLegal.delete({ where: { id } });

    log(`✅ Responsável deletado: ${id}`);
    res.json({ sucesso: true });
  } catch (erro) {
    log(`Erro ao deletar responsável: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar responsável' });
  }
}

// ==================== MÓDULO GUARAÚNA - VÍNCULO ALUNO-RESPONSÁVEL ====================

async function guaraunaVincularAlunoResponsavel(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { alunoId, responsavelId, parentesco, principal } = req.body;

    // Se for principal, remover flag de outros
    if (principal) {
      await prisma.alunoResponsavel.updateMany({
        where: { alunoId, principal: true },
        data: { principal: false }
      });
    }

    const vinculo = await prisma.alunoResponsavel.create({
      data: {
        alunoId,
        responsavelId,
        parentesco,
        principal: principal || false
      },
      include: {
        aluno: { include: { pessoa: true } },
        responsavel: { include: { pessoa: true } }
      }
    });

    log(`✅ Vínculo criado: ${vinculo.responsavel.pessoa.nome} -> ${vinculo.aluno.pessoa.nome}`);
    res.status(201).json(vinculo);
  } catch (erro) {
    if (erro.code === 'P2002') {
      return res.status(400).json({ erro: 'Este vínculo já existe' });
    }
    log(`Erro ao vincular: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao vincular aluno e responsável' });
  }
}

async function guaraunaDesvincularAlunoResponsavel(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    await prisma.alunoResponsavel.delete({ where: { id } });
    res.status(204).end();
  } catch (erro) {
    log(`Erro ao desvincular: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao desvincular' });
  }
}

// ==================== MÓDULO GUARAÚNA - EDUCADORES ====================

async function guaraunaEducadoresListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const educadores = await prisma.educador.findMany({
      where: { ativo: true },
      include: {
        pessoa: true,
        comunidades: { where: { ativo: true } },
        turmas: { where: { ativa: true } }
      },
      orderBy: { pessoa: { nome: 'asc' } }
    });

    res.json(educadores);
  } catch (erro) {
    log(`Erro ao listar educadores: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar educadores' });
  }
}

async function guaraunaEducadoresCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { 
      pessoaId, 
      // Dados da pessoa (se não tiver pessoaId)
      nome, cpf, telefone, email, endereco,
      // Dados do educador
      apelido, especialidade, graduacao, formacao,
      // Comunidades
      comunidades, comunidadeIds
    } = req.body;

    // Função para limpar CPF (remover formatação)
    const limparCPF = (cpf) => cpf ? cpf.replace(/\D/g, '') : null;
    // Função para limpar telefone (remover formatação)
    const limparTelefone = (tel) => tel ? tel.replace(/\D/g, '') : null;

    let pessoaFinalId = pessoaId ? parseInt(pessoaId) : null;

    // Se não tem pessoaId, criar ou buscar pessoa pelo CPF
    if (!pessoaFinalId) {
      if (!nome) {
        return res.status(400).json({ erro: 'Nome é obrigatório' });
      }

      const cpfLimpo = limparCPF(cpf);

      // Verificar se já existe pessoa com esse CPF
      if (cpfLimpo && cpfLimpo.length === 11) {
        const pessoaExistente = await prisma.pessoa.findUnique({ where: { cpf: cpfLimpo } });
        if (pessoaExistente) {
          pessoaFinalId = pessoaExistente.id;
          // Atualizar dados da pessoa existente
          await prisma.pessoa.update({
            where: { id: pessoaFinalId },
            data: {
              nome,
              telefone: limparTelefone(telefone) || undefined,
              email: email || undefined,
              endereco: endereco || undefined
            }
          });
        }
      }

      // Se ainda não tem pessoaId, criar nova pessoa
      if (!pessoaFinalId) {
        const novaPessoa = await prisma.pessoa.create({
          data: {
            nome,
            cpf: cpfLimpo || `TEMP-EDUC-${Date.now()}`,
            telefone: limparTelefone(telefone),
            email,
            endereco: endereco || '',
            usuarioId: usuario.id
          }
        });
        pessoaFinalId = novaPessoa.id;
        log(`✅ Pessoa criada para educador: ${nome} (ID: ${novaPessoa.id})`);
      }
    }

    // Verificar se pessoa existe
    const pessoa = await prisma.pessoa.findUnique({ where: { id: pessoaFinalId } });
    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    // Verificar se já é educador
    const educadorExistente = await prisma.educador.findUnique({ where: { pessoaId: pessoaFinalId } });
    if (educadorExistente) {
      return res.status(400).json({ erro: 'Esta pessoa já está cadastrada como educador' });
    }

    // Determinar as comunidades a vincular (aceita ambos formatos)
    const listaComunidades = comunidades || comunidadeIds || [];

    // Criar educador
    const educador = await prisma.educador.create({
      data: {
        pessoaId: pessoaFinalId,
        apelido: apelido || null,
        especialidade: especialidade || graduacao || formacao || null,
        comunidades: listaComunidades.length > 0 ? {
          create: listaComunidades.map(c => ({ comunidade: typeof c === 'string' ? c : String(c) }))
        } : undefined
      },
      include: {
        pessoa: true,
        comunidades: true
      }
    });

    log(`✅ Educador criado: ${pessoa.nome} (ID: ${educador.id})`);
    res.status(201).json(educador);
  } catch (erro) {
    log(`Erro ao criar educador: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar educador', detalhes: erro.message });
  }
}

async function guaraunaEducadoresObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const educador = await prisma.educador.findUnique({
      where: { id },
      include: {
        pessoa: true,
        comunidades: true,
        turmas: { include: { alunos: true } },
        termos: true
      }
    });

    if (!educador) {
      return res.status(404).json({ erro: 'Educador não encontrado' });
    }

    res.json(educador);
  } catch (erro) {
    log(`Erro ao obter educador: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter educador' });
  }
}

async function guaraunaEducadoresAtualizar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { 
      // Dados da pessoa
      nome, cpf, telefone, email, endereco,
      // Dados do educador
      apelido, especialidade, graduacao, formacao, ativo,
      // Comunidades
      comunidades, comunidadeIds
    } = req.body;

    // Função para limpar CPF (remover formatação)
    const limparCPF = (cpf) => cpf ? cpf.replace(/\D/g, '') : null;
    // Função para limpar telefone (remover formatação)
    const limparTelefone = (tel) => tel ? tel.replace(/\D/g, '') : null;

    // Buscar educador existente
    const educadorExistente = await prisma.educador.findUnique({
      where: { id },
      include: { pessoa: true, comunidades: true }
    });

    if (!educadorExistente) {
      return res.status(404).json({ erro: 'Educador não encontrado' });
    }

    // Atualizar dados da pessoa
    if (nome || cpf || telefone || email || endereco !== undefined) {
      const cpfLimpo = limparCPF(cpf);
      await prisma.pessoa.update({
        where: { id: educadorExistente.pessoaId },
        data: {
          ...(nome && { nome }),
          ...(cpfLimpo && cpfLimpo.length === 11 && { cpf: cpfLimpo }),
          ...(telefone && { telefone: limparTelefone(telefone) }),
          ...(email !== undefined && { email }),
          ...(endereco !== undefined && { endereco })
        }
      });
    }

    // Atualizar dados do educador
    const educador = await prisma.educador.update({
      where: { id },
      data: { 
        ...(apelido !== undefined && { apelido }),
        ...(especialidade !== undefined && { especialidade }),
        ...(graduacao && { especialidade: graduacao }),
        ...(formacao && !especialidade && !graduacao && { especialidade: formacao }),
        ...(ativo !== undefined && { ativo })
      },
      include: { pessoa: true, comunidades: true }
    });

    // Atualizar comunidades se fornecidas
    const listaComunidades = comunidades || comunidadeIds;
    if (listaComunidades !== undefined && Array.isArray(listaComunidades)) {
      // Remover comunidades antigas
      await prisma.educadorComunidade.deleteMany({
        where: { educadorId: id }
      });

      // Adicionar novas comunidades
      if (listaComunidades.length > 0) {
        for (const c of listaComunidades) {
          await prisma.educadorComunidade.create({
            data: {
              educadorId: id,
              comunidade: typeof c === 'string' ? c : String(c)
            }
          });
        }
      }
    }

    // Buscar educador atualizado
    const educadorAtualizado = await prisma.educador.findUnique({
      where: { id },
      include: { pessoa: true, comunidades: true }
    });

    log(`✅ Educador atualizado: ${educadorAtualizado.pessoa.nome}`);
    res.json(educadorAtualizado);
  } catch (erro) {
    log(`Erro ao atualizar educador: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar educador', detalhes: erro.message });
  }
}

async function guaraunaEducadoresDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar educadores' });
    }

    await prisma.educador.delete({ where: { id } });
    res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar educador: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar educador' });
  }
}

// ==================== MÓDULO GUARAÚNA - TURMAS ====================

async function guaraunaTurmasListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { comunidade, comunidadeId, educadorId, ativa, ano, busca, pagina = '1', limite = '50' } = req.query;

    const where = { ativa: true }; // Por padrão, só turmas ativas
    if (comunidade) where.comunidade = comunidade;
    if (comunidadeId) where.comunidade = comunidadeId; // comunidadeId é o nome
    if (educadorId) where.educadorId = educadorId;
    if (ativa !== undefined) where.ativa = ativa === 'true';
    if (ano) where.ano = parseInt(ano);
    if (busca) {
      where.nome = { contains: busca, mode: 'insensitive' };
    }

    // Contar total
    const total = await prisma.turma.count({ where });
    const paginaNum = parseInt(pagina);
    const limiteNum = parseInt(limite);
    const totalPaginas = Math.ceil(total / limiteNum);

    const turmas = await prisma.turma.findMany({
      where,
      include: {
        educador: { include: { pessoa: true } },
        alunos: {
          where: { ativo: true },
          include: {
            aluno: { include: { pessoa: true } }
          }
        }
      },
      orderBy: [{ comunidade: 'asc' }, { nome: 'asc' }],
      skip: (paginaNum - 1) * limiteNum,
      take: limiteNum
    });

    // Converter diaSemana para diasSemana (array) em cada turma
    const turmasComDias = turmas.map(t => ({
      ...t,
      diasSemana: parseDiasSemana(t.diaSemana)
    }));

    // Retornar no formato padrão ouro
    res.json({
      turmas: turmasComDias,
      total,
      pagina: paginaNum,
      totalPaginas
    });
  } catch (erro) {
    log(`Erro ao listar turmas: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar turmas' });
  }
}

async function guaraunaTurmasCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { nome, comunidade, comunidadeId, educadorId, diaSemana, diasSemana, horarioInicio, horarioFim, ano, faixaEtariaMin, faixaEtariaMax, capacidade, alunoIds } = req.body;

    log(`📝 Criar turma - body recebido: comunidade=${comunidade}, comunidadeId=${comunidadeId}, ano=${ano}, alunoIds=${JSON.stringify(alunoIds)}`);

    // Suporte para diasSemana (array) ou diaSemana (string)
    // Armazena como JSON string no campo diaSemana
    let diaSemanaFinal = diaSemana;
    if (diasSemana && Array.isArray(diasSemana) && diasSemana.length > 0) {
      diaSemanaFinal = JSON.stringify(diasSemana);
    }

    // Aceitar comunidadeId (que é o nome) ou comunidade
    const comunidadeFinal = comunidade || comunidadeId;
    
    if (!comunidadeFinal) {
      return res.status(400).json({ erro: 'Comunidade é obrigatória' });
    }

    // Criar turma com alunos vinculados em uma transação
    const turma = await prisma.$transaction(async (tx) => {
      // Criar a turma
      const novaTurma = await tx.turma.create({
        data: {
          nome,
          comunidade: comunidadeFinal,
          educadorId: educadorId || null,
          ano: ano ? parseInt(ano) : new Date().getFullYear(),
          diaSemana: diaSemanaFinal,
          horarioInicio,
          horarioFim,
          faixaEtariaMin,
          faixaEtariaMax,
          capacidade
        }
      });

      // Vincular alunos se houver
      if (alunoIds && Array.isArray(alunoIds) && alunoIds.length > 0) {
        log(`📝 Vinculando ${alunoIds.length} alunos à turma ${novaTurma.id}`);
        await tx.alunoTurma.createMany({
          data: alunoIds.map(alunoId => ({
            alunoId,
            turmaId: novaTurma.id,
            ativo: true
          })),
          skipDuplicates: true
        });
      }

      // Retornar turma com relações
      return tx.turma.findUnique({
        where: { id: novaTurma.id },
        include: {
          educador: { include: { pessoa: true } },
          alunos: {
            where: { ativo: true },
            include: { aluno: { include: { pessoa: true } } }
          }
        }
      });
    });

    // Converter diaSemana de volta para array ao retornar
    const turmaResposta = {
      ...turma,
      diasSemana: parseDiasSemana(turma.diaSemana)
    };

    log(`✅ Turma criada: ${nome} (${comunidadeFinal}) com ${turma.alunos?.length || 0} alunos`);
    res.status(201).json(turmaResposta);
  } catch (erro) {
    log(`Erro ao criar turma: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar turma' });
  }
}

// Helper para parsear diasSemana (pode ser JSON array ou string simples)
function parseDiasSemana(diaSemana) {
  if (!diaSemana) return [];
  try {
    const parsed = JSON.parse(diaSemana);
    return Array.isArray(parsed) ? parsed : [diaSemana];
  } catch {
    return diaSemana ? [diaSemana] : [];
  }
}

async function guaraunaTurmasObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const turma = await prisma.turma.findUnique({
      where: { id },
      include: {
        educador: { include: { pessoa: true } },
        alunos: {
          include: {
            aluno: {
              include: {
                pessoa: true,
                responsaveis: {
                  include: { responsavel: { include: { pessoa: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!turma) {
      return res.status(404).json({ erro: 'Turma não encontrada' });
    }

    // Converter diaSemana para diasSemana (array)
    const turmaResposta = {
      ...turma,
      diasSemana: parseDiasSemana(turma.diaSemana)
    };

    res.json(turmaResposta);
  } catch (erro) {
    log(`Erro ao obter turma: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter turma' });
  }
}

async function guaraunaTurmasAtualizar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { nome, comunidade, comunidadeId, educadorId, diaSemana, diasSemana, horarioInicio, horarioFim, ano, faixaEtariaMin, faixaEtariaMax, capacidade, ativa, alunoIds } = req.body;

    log(`📝 Atualizar turma ${id} - alunoIds recebidos: ${JSON.stringify(alunoIds)}`);

    // Suporte para diasSemana (array) ou diaSemana (string)
    let diaSemanaFinal = diaSemana;
    if (diasSemana && Array.isArray(diasSemana) && diasSemana.length > 0) {
      diaSemanaFinal = JSON.stringify(diasSemana);
    }

    // Aceitar comunidadeId (que é o nome) ou comunidade
    const comunidadeFinal = comunidade || comunidadeId;

    // Usar transação para atualizar turma e sincronizar alunos
    const turma = await prisma.$transaction(async (tx) => {
      // Atualizar dados da turma
      await tx.turma.update({
        where: { id },
        data: {
          nome,
          comunidade: comunidadeFinal,
          educadorId: educadorId || null,
          ano: ano ? parseInt(ano) : undefined,
          diaSemana: diaSemanaFinal,
          horarioInicio,
          horarioFim,
          faixaEtariaMin,
          faixaEtariaMax,
          capacidade,
          ativa
        }
      });

      // Sincronizar alunos se alunoIds foi fornecido
      if (alunoIds !== undefined && Array.isArray(alunoIds)) {
        // Obter alunos atuais da turma
        const alunosAtuais = await tx.alunoTurma.findMany({
          where: { turmaId: id, ativo: true },
          select: { alunoId: true }
        });
        const idsAtuais = alunosAtuais.map(a => a.alunoId);

        // Alunos a adicionar (estão em alunoIds mas não em idsAtuais)
        const aAdicionar = alunoIds.filter(aId => !idsAtuais.includes(aId));
        
        // Alunos a remover (estão em idsAtuais mas não em alunoIds)
        const aRemover = idsAtuais.filter(aId => !alunoIds.includes(aId));

        log(`📝 Sincronizando alunos: +${aAdicionar.length} -${aRemover.length}`);

        // Remover alunos que não estão mais na lista (desativar)
        if (aRemover.length > 0) {
          await tx.alunoTurma.updateMany({
            where: { 
              turmaId: id, 
              alunoId: { in: aRemover }
            },
            data: { ativo: false, dataSaida: new Date() }
          });
        }

        // Adicionar novos alunos
        if (aAdicionar.length > 0) {
          // Primeiro tentar reativar registros existentes inativos
          for (const alunoId of aAdicionar) {
            const existente = await tx.alunoTurma.findUnique({
              where: { alunoId_turmaId: { alunoId, turmaId: id } }
            });
            
            if (existente) {
              // Reativar
              await tx.alunoTurma.update({
                where: { id: existente.id },
                data: { ativo: true, dataSaida: null }
              });
            } else {
              // Criar novo
              await tx.alunoTurma.create({
                data: { alunoId, turmaId: id, ativo: true }
              });
            }
          }
        }
      }

      // Retornar turma atualizada com relações
      return tx.turma.findUnique({
        where: { id },
        include: {
          educador: { include: { pessoa: true } },
          alunos: {
            where: { ativo: true },
            include: { aluno: { include: { pessoa: true } } }
          }
        }
      });
    });

    // Converter diaSemana de volta para array ao retornar
    const turmaResposta = {
      ...turma,
      diasSemana: parseDiasSemana(turma.diaSemana)
    };

    log(`✅ Turma atualizada: ${turma.nome} com ${turma.alunos?.length || 0} alunos`);
    res.json(turmaResposta);
  } catch (erro) {
    log(`Erro ao atualizar turma: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar turma' });
  }
}

async function guaraunaTurmasDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar turmas' });
    }

    await prisma.turma.delete({ where: { id } });
    res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar turma: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar turma' });
  }
}

// ==================== MÓDULO GUARAÚNA - ALUNOS EM TURMAS ====================

async function guaraunaMatricularAlunoTurma(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { alunoId, turmaId } = req.body;

    // Verificar capacidade da turma
    const turma = await prisma.turma.findUnique({
      where: { id: turmaId },
      include: { alunos: { where: { ativo: true } } }
    });

    if (turma.capacidade && turma.alunos.length >= turma.capacidade) {
      return res.status(400).json({ erro: 'Turma está com capacidade máxima' });
    }

    const matricula = await prisma.alunoTurma.create({
      data: { alunoId, turmaId },
      include: {
        aluno: { include: { pessoa: true } },
        turma: true
      }
    });

    log(`✅ Aluno matriculado na turma: ${matricula.aluno.pessoa.nome} -> ${matricula.turma.nome}`);
    res.status(201).json(matricula);
  } catch (erro) {
    if (erro.code === 'P2002') {
      return res.status(400).json({ erro: 'Aluno já está matriculado nesta turma' });
    }
    log(`Erro ao matricular aluno: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao matricular aluno' });
  }
}

async function guaraunaDesmatricularAlunoTurma(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    await prisma.alunoTurma.update({
      where: { id },
      data: { ativo: false, dataSaida: new Date() }
    });

    res.status(204).end();
  } catch (erro) {
    log(`Erro ao desmatricular aluno: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao desmatricular aluno' });
  }
}

// ==================== MÓDULO GUARAÚNA - MATRÍCULAS ====================

async function guaraunaMatriculasListar(req, res) {
  const prisma = getPrisma();
  try {
    // Atualizar matrículas antigas para CONCLUIDA (ano anterior ao atual)
    try {
      const anoAtual = new Date().getFullYear();
      await prisma.matricula.updateMany({
        where: { ano: { lt: anoAtual }, status: { not: 'CONCLUIDA' } },
        data: { status: 'CONCLUIDA' }
      });
    } catch (updErr) {
      log(`Aviso: falha ao atualizar status de matrículas antigas: ${updErr.message}`, 'warn');
    }
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { ano, status, alunoId, pagina = 1, limite = 20 } = req.query;

    const where = {};
    if (ano) where.ano = parseInt(ano);
    if (status) where.status = status;
    if (alunoId) where.alunoId = alunoId;

    const paginaAtual = Math.max(1, parseInt(pagina));
    const itensPorPagina = Math.max(1, parseInt(limite));
    const skip = (paginaAtual - 1) * itensPorPagina;

    const [total, matriculas] = await Promise.all([
      prisma.matricula.count({ where }),
      prisma.matricula.findMany({
        where,
        skip,
        take: itensPorPagina,
        include: {
          aluno: {
            include: {
              pessoa: true,
              responsaveis: {
                where: { principal: true },
                include: { responsavel: { include: { pessoa: true } } }
              }
            }
          },
          aceites: true
        },
        orderBy: [{ ano: 'desc' }, { aluno: { pessoa: { nome: 'asc' } } }]
      })
    ]);

    const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));

    res.json({
      matriculas,
      total,
      totalPaginas,
      pagina: paginaAtual
    });
  } catch (erro) {
    log(`Erro ao listar matrículas: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar matrículas' });
  }
}

async function guaraunaMatriculasCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { alunoId, ano, tipo, tamanhoCamiseta, tamanhoCalca, tamanhoCalcado, composicaoFamiliar,
      nomeEscola, horarioEstudo, horaEntrada, horaSaida, situacaoComportamentoEscolar, status, motivoDesistencia
    } = req.body;

    // Validar que o status não seja ATIVA (sistema não permite criar como ATIVA diretamente)
    if (status && String(status).toUpperCase() === 'ATIVA') {
      return res.status(400).json({ erro: 'Não é permitido definir o status como ATIVA via API. Use alteração controlada pelo sistema.' });
    }

    // Verificar se já existe matrícula para este ano
    const existente = await prisma.matricula.findUnique({
      where: { alunoId_ano: { alunoId, ano: parseInt(ano) } }
    });

    if (existente) {
      return res.status(400).json({ erro: `Já existe matrícula para o ano ${ano}` });
    }

    // Se ano é anterior ao ano atual, marcar como CONCLUIDA automaticamente
    const anoNum = parseInt(ano);
    const anoAtual = new Date().getFullYear();
    const statusToSave = (anoNum < anoAtual) ? 'CONCLUIDA' : (status ? status.toString().toUpperCase() : undefined);

    const matricula = await prisma.matricula.create({
      data: {
        alunoId,
        ano: anoNum,
        tipo: (tipo || 'MATRICULA').toString().toUpperCase(),
        tamanhoCamiseta,
        tamanhoCalca,
        tamanhoCalcado,
        nomeEscola,
        horarioEstudo,
        horaEntrada,
        horaSaida,
        situacaoComportamentoEscolar,
        composicaoFamiliar,
        // Normalizar status enum se fornecido e permitido
        ...(statusToSave ? { status: statusToSave } : {}),
        motivoDesistencia
      },
      include: {
        aluno: { include: { pessoa: true } }
      }
    });

    log(`✅ Matrícula criada: ${matricula.aluno.pessoa.nome} - ${ano}`);
    res.status(201).json(matricula);
  } catch (erro) {
    log(`Erro ao criar matrícula: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar matrícula' });
  }
}

async function guaraunaMatriculasObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const matricula = await prisma.matricula.findUnique({
      where: { id },
      include: {
        aluno: {
          include: {
            pessoa: true,
            responsaveis: {
              include: { responsavel: { include: { pessoa: true } } }
            }
          }
        },
        aceites: {
          include: { responsavel: { include: { pessoa: true } } }
        }
      }
    });

    if (!matricula) {
      return res.status(404).json({ erro: 'Matrícula não encontrada' });
    }

    res.json(matricula);
  } catch (erro) {
    log(`Erro ao obter matrícula: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter matrícula' });
  }
}

async function guaraunaMatriculasAtualizar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { tamanhoCamiseta, tamanhoBermuda, tamanhoCalca, tamanhoCalcado, composicaoFamiliar, status, motivoDesistencia,
      nomeEscola, horarioEstudo, horaEntrada, horaSaida, situacaoComportamentoEscolar } = req.body;

    // Impedir que cliente force o status para ATIVA
    if (status && String(status).toUpperCase() === 'ATIVA') {
      return res.status(400).json({ erro: 'Não é permitido definir o status como ATIVA via API.' });
    }

    // Normalizar nomes de campos e status
    const dadosAtualizar = {
      tamanhoCamiseta,
      tamanhoCalca: tamanhoCalca || tamanhoBermuda,
      tamanhoCalcado,
      composicaoFamiliar,
      motivoDesistencia,
      nomeEscola,
      horarioEstudo,
      horaEntrada,
      horaSaida,
      situacaoComportamentoEscolar
    };

    // Se status foi enviado e não é ATIVA (já filtrado), aplicar normalização
    if (status) dadosAtualizar.status = String(status).toUpperCase();

    // Atualizar
    const matricula = await prisma.matricula.update({ where: { id }, data: dadosAtualizar });

    res.json(matricula);
  } catch (erro) {
    log(`Erro ao atualizar matrícula: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar matrícula' });
  }
}

// ==================== MÓDULO GUARAÚNA - MODELOS DE TERMO ====================

async function guaraunaModelosTermoListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { tipo, ativo } = req.query;

    const where = {};
    if (tipo) where.tipo = tipo;
    if (ativo !== undefined) where.ativo = ativo === 'true';

    const modelos = await prisma.modeloTermo.findMany({
      where,
      include: { criadoPor: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' }
    });

    res.json(modelos);
  } catch (erro) {
    log(`Erro ao listar modelos de termo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar modelos de termo' });
  }
}

async function guaraunaModelosTermoCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem criar modelos de termo' });
    }

    const { titulo, tipo, conteudoHTML } = req.body;

    const modelo = await prisma.modeloTermo.create({
      data: {
        titulo,
        tipo,
        conteudoHTML,
        criadoPorId: usuario.id
      }
    });

    log(`✅ Modelo de termo criado: ${titulo}`);
    res.status(201).json(modelo);
  } catch (erro) {
    log(`Erro ao criar modelo de termo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar modelo de termo' });
  }
}

async function guaraunaModelosTermoObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const modelo = await prisma.modeloTermo.findUnique({
      where: { id },
      include: {
        criadoPor: { select: { nome: true } },
        eventos: { orderBy: { criadoEm: 'desc' }, take: 10 }
      }
    });

    if (!modelo) {
      return res.status(404).json({ erro: 'Modelo não encontrado' });
    }

    res.json(modelo);
  } catch (erro) {
    log(`Erro ao obter modelo de termo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter modelo de termo' });
  }
}

async function guaraunaModelosTermoAtualizar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem atualizar modelos' });
    }

    const { titulo, tipo, conteudoHTML, ativo } = req.body;

    const modelo = await prisma.modeloTermo.update({
      where: { id },
      data: { titulo, tipo, conteudoHTML, ativo }
    });

    res.json(modelo);
  } catch (erro) {
    log(`Erro ao atualizar modelo de termo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar modelo de termo' });
  }
}

async function guaraunaModelosTermoDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar modelos' });
    }

    // Desativar ao invés de deletar para manter histórico
    await prisma.modeloTermo.update({
      where: { id },
      data: { ativo: false }
    });

    res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar modelo de termo: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar modelo de termo' });
  }
}

// ==================== MÓDULO GUARAÚNA - EVENTOS COM TERMOS ====================

async function guaraunaEventosListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { ativo, tipo } = req.query;

    const where = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (tipo) where.modeloTermo = { tipo };

    const eventos = await prisma.eventoTermo.findMany({
      where,
      include: {
        modeloTermo: true,
        criadoPor: { select: { nome: true } },
        aceites: {
          include: {
            aluno: { include: { pessoa: true } }
          }
        }
      },
      orderBy: { dataEvento: 'desc' }
    });

    // Adicionar contagem de aceites
    const eventosComContagem = eventos.map(e => ({
      ...e,
      totalAceites: e.aceites.length
    }));

    res.json(eventosComContagem);
  } catch (erro) {
    log(`Erro ao listar eventos: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar eventos' });
  }
}

async function guaraunaEventosCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem criar eventos' });
    }

    const { modeloTermoId, titulo, descricao, dataEvento, localEvento, dataLimiteAceite } = req.body;

    const evento = await prisma.eventoTermo.create({
      data: {
        modeloTermoId,
        titulo,
        descricao,
        dataEvento: new Date(dataEvento),
        localEvento,
        dataLimiteAceite: new Date(dataLimiteAceite),
        criadoPorId: usuario.id
      },
      include: { modeloTermo: true }
    });

    log(`✅ Evento criado: ${titulo}`);
    res.status(201).json(evento);
  } catch (erro) {
    log(`Erro ao criar evento: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar evento' });
  }
}

async function guaraunaEventosObter(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const evento = await prisma.eventoTermo.findUnique({
      where: { id },
      include: {
        modeloTermo: true,
        criadoPor: { select: { nome: true } },
        aceites: {
          include: {
            aluno: { include: { pessoa: true } },
            responsavel: { include: { pessoa: true } }
          }
        }
      }
    });

    if (!evento) {
      return res.status(404).json({ erro: 'Evento não encontrado' });
    }

    res.json(evento);
  } catch (erro) {
    log(`Erro ao obter evento: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter evento' });
  }
}

async function guaraunaEventosAtualizar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem atualizar eventos' });
    }

    const { titulo, descricao, dataEvento, localEvento, dataLimiteAceite, ativo } = req.body;

    const evento = await prisma.eventoTermo.update({
      where: { id },
      data: {
        titulo,
        descricao,
        dataEvento: dataEvento ? new Date(dataEvento) : undefined,
        localEvento,
        dataLimiteAceite: dataLimiteAceite ? new Date(dataLimiteAceite) : undefined,
        ativo
      }
    });

    res.json(evento);
  } catch (erro) {
    log(`Erro ao atualizar evento: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar evento' });
  }
}

async function guaraunaEventosDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem deletar eventos' });
    }

    await prisma.eventoTermo.update({
      where: { id },
      data: { ativo: false }
    });

    res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar evento: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao deletar evento' });
  }
}

async function guaraunaEventosAceitesListar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const aceites = await prisma.aceiteEventoTermo.findMany({
      where: { eventoTermoId: id },
      include: {
        aluno: { include: { pessoa: true } },
        responsavel: { include: { pessoa: true } }
      },
      orderBy: { aceitoEm: 'desc' }
    });

    res.json(aceites);
  } catch (erro) {
    log(`Erro ao listar aceites: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar aceites' });
  }
}

// ==================== ROTAS PÚBLICAS - ACEITES ====================

async function aceiteEventoObterPublico(req, res, codigo) {
  const prisma = getPrisma();
  try {
    const evento = await prisma.eventoTermo.findUnique({
      where: { codigo },
      include: {
        modeloTermo: true
      }
    });

    if (!evento) {
      return res.status(404).json({ erro: 'Evento não encontrado' });
    }

    if (!evento.ativo) {
      return res.status(400).json({ erro: 'Este evento não está mais ativo' });
    }

    if (new Date() > new Date(evento.dataLimiteAceite)) {
      return res.status(400).json({ erro: 'O prazo para aceite expirou' });
    }

    // Retornar dados públicos do evento
    res.json({
      id: evento.id,
      titulo: evento.titulo,
      descricao: evento.descricao,
      dataEvento: evento.dataEvento,
      localEvento: evento.localEvento,
      dataLimiteAceite: evento.dataLimiteAceite,
      termo: {
        titulo: evento.modeloTermo.titulo,
        tipo: evento.modeloTermo.tipo,
        conteudo: evento.modeloTermo.conteudoHTML
      }
    });
  } catch (erro) {
    log(`Erro ao obter evento público: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter evento' });
  }
}

async function aceiteEventoRegistrar(req, res, codigo) {
  const prisma = getPrisma();
  try {
    const { alunoId, responsavelId, aceite } = req.body;

    if (!aceite) {
      return res.status(400).json({ erro: 'É necessário aceitar o termo' });
    }

    const evento = await prisma.eventoTermo.findUnique({ where: { codigo } });

    if (!evento || !evento.ativo) {
      return res.status(404).json({ erro: 'Evento não encontrado ou inativo' });
    }

    if (new Date() > new Date(evento.dataLimiteAceite)) {
      return res.status(400).json({ erro: 'O prazo para aceite expirou' });
    }

    // Gerar hash de verificação
    const hashVerificacao = crypto
      .createHash('sha256')
      .update(`${evento.id}-${alunoId}-${responsavelId}-${Date.now()}`)
      .digest('hex');

    const aceiteRegistro = await prisma.aceiteEventoTermo.create({
      data: {
        eventoTermoId: evento.id,
        alunoId,
        responsavelId,
        dispositivoInfo: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        hashVerificacao
      },
      include: {
        aluno: { include: { pessoa: true } },
        responsavel: { include: { pessoa: true } }
      }
    });

    log(`✅ Aceite registrado: ${aceiteRegistro.aluno.pessoa.nome} para evento ${evento.titulo}`);

    res.status(201).json({
      mensagem: 'Aceite registrado com sucesso',
      hash: hashVerificacao,
      aluno: aceiteRegistro.aluno.pessoa.nome,
      dataAceite: aceiteRegistro.aceitoEm
    });
  } catch (erro) {
    if (erro.code === 'P2002') {
      return res.status(400).json({ erro: 'Este aluno já possui aceite para este evento' });
    }
    log(`Erro ao registrar aceite: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao registrar aceite' });
  }
}

async function aceiteMatriculaObterPublico(req, res, codigo) {
  const prisma = getPrisma();
  try {
    const aceite = await prisma.aceiteDigital.findUnique({
      where: { codigo },
      include: {
        matricula: {
          include: {
            aluno: { include: { pessoa: true } }
          }
        }
      }
    });

    if (!aceite) {
      return res.status(404).json({ erro: 'Link de aceite não encontrado' });
    }

    res.json({
      matricula: aceite.matricula,
      aluno: aceite.matricula.aluno.pessoa.nome
    });
  } catch (erro) {
    log(`Erro ao obter aceite matrícula: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter aceite' });
  }
}

async function aceiteMatriculaRegistrar(req, res, codigo) {
  const prisma = getPrisma();
  try {
    const { responsavelId, termoLGPD, termoResponsabilidade, termoImagem } = req.body;

    const aceiteExistente = await prisma.aceiteDigital.findUnique({ where: { codigo } });

    if (!aceiteExistente) {
      return res.status(404).json({ erro: 'Link de aceite não encontrado' });
    }

    if (aceiteExistente.termoLGPD && aceiteExistente.termoResponsabilidade) {
      return res.status(400).json({ erro: 'Este aceite já foi realizado' });
    }

    const hashVerificacao = crypto
      .createHash('sha256')
      .update(`${aceiteExistente.matriculaId}-${responsavelId}-${Date.now()}`)
      .digest('hex');

    const aceiteAtualizado = await prisma.aceiteDigital.update({
      where: { codigo },
      data: {
        responsavelId,
        termoLGPD,
        termoResponsabilidade,
        termoImagem,
        dispositivoInfo: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        hashVerificacao
      }
    });

    // Atualizar status da matrícula
    await prisma.matricula.update({
      where: { id: aceiteExistente.matriculaId },
      data: { status: 'ATIVA', dataMatricula: new Date() }
    });

    log(`✅ Aceite de matrícula registrado`);

    res.json({
      mensagem: 'Aceite registrado com sucesso',
      hash: hashVerificacao
    });
  } catch (erro) {
    log(`Erro ao registrar aceite matrícula: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao registrar aceite' });
  }
}

// ==================== MÓDULO GUARAÚNA - DASHBOARD ====================

async function guaraunaDashboard(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    log(`📊 Iniciando carregamento do dashboard`);
    // Permite sobrescrever o ano via query ?ano=2025
    const anoQuery = req.query && (req.query.ano || req.query.year);
    const anoAtual = anoQuery ? parseInt(anoQuery, 10) : new Date().getFullYear();
    log(`📊 Ano selecionado: ${anoAtual}`);

    try {
      log(`📊 Contando alunos...`);
      const totalAlunos = await prisma.alunoGuarauna.count();
      log(`✅ Total alunos: ${totalAlunos}`);

      log(`📊 Contando alunos ativos...`);
      const alunosAtivos = await prisma.alunoGuarauna.count({ where: { ativo: true } });
      log(`✅ Alunos ativos: ${alunosAtivos}`);

      log(`📊 Contando responsáveis...`);
      const totalResponsaveis = await prisma.responsavelLegal.count();
      log(`✅ Total responsáveis: ${totalResponsaveis}`);

      log(`📊 Contando educadores...`);
      const totalEducadores = await prisma.educador.count({ where: { ativo: true } });
      log(`✅ Total educadores: ${totalEducadores}`);

      log(`📊 Contando turmas...`);
      const totalTurmas = await prisma.turma.count({ where: { ativa: true } });
      log(`✅ Total turmas: ${totalTurmas}`);

      log(`📊 Contando matrículas do ano ${anoAtual}...`);
      const matriculasAno = await prisma.matricula.count({ where: { ano: anoAtual } });
      log(`✅ Matrículas no ano: ${matriculasAno}`);

      log(`📊 Contando eventos ativos...`);
      const eventosAtivos = await prisma.eventoTermo.count({ where: { ativo: true, dataEvento: { gte: new Date() } } });
      log(`✅ Eventos ativos: ${eventosAtivos}`);

      log(`✅ Dashboard carregado com sucesso`);
      res.json({
        totais: {
          alunos: totalAlunos,
          alunosAtivos,
          responsaveis: totalResponsaveis,
          educadores: totalEducadores,
          turmas: totalTurmas,
          matriculasAno,
          eventosAtivos
        },
        anoAtual
      });
    } catch (eroPrisma) {
      log(`❌ Erro no Prisma: ${eroPrisma.message}`, 'error');
      log(`❌ Stack: ${eroPrisma.stack}`, 'error');
      throw eroPrisma;
    }
  } catch (erro) {
    log(`❌ Erro ao obter dashboard: ${erro.message}`, 'error');
    log(`❌ Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao obter dashboard', detalhes: erro.message });
  }
}

// ==================== HANDLER PRINCIPAL ====================

export default async function handler(req, res) {
  setCors(res, req);

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

async function guaraunaMatriculasDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Deletar matrícula (remove registro)
    await prisma.matricula.delete({ where: { id } });
    log(`✅ Matrícula excluída: ${id}`);
    return res.status(204).end();
  } catch (erro) {
    log(`Erro ao deletar matrícula: ${erro.message}`, 'error');
    return res.status(500).json({ erro: 'Erro ao deletar matrícula' });
  }
}

// ==================== MÓDULO GUARAÚNA - ACEITES (ADMIN) ====================

async function guaraunaAceiteCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { matriculaId, responsavelId, termoLGPD = false, termoResponsabilidade = false, termoImagem = false } = req.body;

    if (!matriculaId || !responsavelId) {
      return res.status(400).json({ erro: 'matriculaId e responsavelId são obrigatórios' });
    }

    // Verificar existência
    const matricula = await prisma.matricula.findUnique({ where: { id: matriculaId } });
    if (!matricula) {
      return res.status(404).json({ erro: 'Matrícula não encontrada' });
    }

    const responsavel = await prisma.responsavelLegal.findUnique({ where: { id: responsavelId } });
    if (!responsavel) {
      return res.status(404).json({ erro: 'Responsável não encontrado' });
    }

    // Gerar código público (UUID) e hash de verificação
    // Usar import dinâmico para compatibilidade com ESM / ambientes sem `require`
    const cryptoMod = await import('crypto');
    const codigo = typeof cryptoMod.randomUUID === 'function'
      ? cryptoMod.randomUUID()
      : cryptoMod.randomBytes(16).toString('hex');
    const hashVerificacao = cryptoMod.createHash('sha256').update(`${matriculaId}-${responsavelId}-${Date.now()}`).digest('hex');

    // Se já existe um aceite para essa matrícula+responsável, retornamos o existente
    let aceite = null;
    try {
      aceite = await prisma.aceiteDigital.findUnique({ where: { matriculaId_responsavelId: { matriculaId, responsavelId } } });
    } catch (errFind) {
      // Alguns clientes/versões do Prisma podem nomear a chave única composta de forma diferente.
      // Tentar buscar pela combinação usando findFirst como fallback.
      aceite = await prisma.aceiteDigital.findFirst({ where: { matriculaId, responsavelId } });
    }

    if (!aceite) {
      aceite = await prisma.aceiteDigital.create({
        data: {
          codigo,
          matriculaId,
          responsavelId,
          termoLGPD,
          termoResponsabilidade,
          termoImagem,
          dispositivoInfo: req.headers['user-agent'],
          ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
          hashVerificacao
        }
      });
    }

    // Tentar enviar email com link público
    try {
      const baseUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
      const linkPublico = `${baseUrl.replace(/\/$/, '')}/aceite/matricula/${codigo}`;

      // Buscar email do responsável (pessoa)
      const responsavelFull = await prisma.responsavelLegal.findUnique({ where: { id: responsavelId }, include: { pessoa: true } });
      const emailDest = responsavelFull?.pessoa?.email;
      const nomeDest = responsavelFull?.pessoa?.nome;

      if (emailDest) {
        const envio = await enviarEmailAceiteDigital(emailDest, nomeDest, codigo, linkPublico);
        log(`📧 Tentativa de envio de aceite para ${emailDest}: ${envio.sucesso ? 'OK' : 'FALHOU'}`);
      } else {
        log(`⚠️ Responsável ${responsavelId} não possui email; link: ${linkPublico}`);
      }
    } catch (errEmail) {
      log(`Erro ao enviar email de aceite: ${errEmail.message}`, 'warn');
    }

    log(`✅ Aceite criado (codigo=${codigo}) para matricula ${matriculaId}`);
    res.status(201).json({ aceite });
  } catch (erro) {
    log(`Erro ao criar aceite: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar aceite', detalhes: erro.message });
  }
}