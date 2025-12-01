import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

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

  if (rota === 'autenticacao/listar' && req.method === 'GET') {
    return autenticacaoListar(req, res);
  }

  if (rota === 'autenticacao/validar-token' && req.method === 'POST') {
    return autenticacaoValidarToken(req, res);
  }

  if (rota === 'autenticacao/convite/validar' && req.method === 'POST') {
    return validarConvite(req, res);
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
    return revogarToken(req, res, id);
  }

  // PESSOAS
  if (rota === 'pessoas' && req.method === 'GET') {
    return pessoasListar(req, res);
  }

  if (rota === 'pessoas' && req.method === 'POST') {
    return pessoasCriar(req, res);
  }

  if (rota.startsWith('pessoas/') && req.method === 'GET') {
    const id = slug[1];
    return pessoasObter(req, res, id);
  }

  if (rota.startsWith('pessoas/') && (req.method === 'PUT' || req.method === 'PATCH')) {
    const id = slug[1];
    return pessoasAtualizar(req, res, id);
  }

  if (rota.startsWith('pessoas/') && req.method === 'DELETE') {
    const id = slug[1];
    return pessoasDeletar(req, res, id);
  }

  return res.status(404).json({ erro: 'Rota não encontrada', rota });
}

// ==================== AUTENTICAÇÃO ====================

async function autenticacaoEntrar(req, res) {
  const prisma = getPrisma();
  try {
    // DEBUG: Verificar o que está chegando no body
    log(`📦 Tipo de req.body: ${typeof req.body}`);
    log(`📦 req.body é null? ${req.body === null}`);
    log(`📦 req.body é undefined? ${req.body === undefined}`);
    log(`📦 req.body: ${JSON.stringify(req.body)}`);
    
    const { email, senha } = req.body || {};
    
    log(`🔐 Tentando login: ${email}`);

    if (!email || !senha) {
      log('Credenciais incompletas', 'error');
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      log(`Usuário não encontrado: ${email}`, 'error');
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    if (!usuario.ativo) {
      log(`Usuário inativo: ${email}`, 'error');
      return res.status(401).json({ erro: 'Usuário desativado' });
    }

    // ⚠️ VERIFICAÇÃO CRÍTICA DA SENHA
    log(`Comparando senha para ${email}...`);
    log(`Senha armazenada tem ${usuario.senha.length} caracteres`);
    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    
    if (!senhaValida) {
      log(`Senha incorreta para: ${email}`, 'error');
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    log(`✅ Login bem-sucedido: ${email}`);
    res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        funcao: usuario.funcao
      }
    });
  } catch (erro) {
    log(`Erro no login: ${erro.message}`, 'error');
    log(`Stack: ${erro.stack}`, 'error');
    res.status(500).json({ erro: 'Erro ao fazer login' });
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

    const ehToken = codigoConvite.startsWith('GAC-TOKEN-');
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
      // VALIDAR CÓDIGO CONVITE
      log(`📧 Validando CÓDIGO para ${email}`);
      const convite = await prisma.codigoConvite.findUnique({ 
        where: { codigo: codigoConvite } 
      });

      if (!convite) {
        log(`Código não encontrado: ${codigoConvite}`, 'error');
        return res.status(401).json({ erro: 'Código de convite inválido' });
      }

      if (convite.usado) {
        log(`Código já foi utilizado: ${codigoConvite}`, 'error');
        return res.status(401).json({ erro: 'Código de convite já foi utilizado' });
      }

      if (convite.dataExpiracao && new Date() > new Date(convite.dataExpiracao)) {
        log(`Código expirado: ${codigoConvite}`, 'error');
        return res.status(401).json({ erro: 'Código de convite expirado' });
      }

      if (convite.email !== email) {
        log(`Email não bate: ${email} vs ${convite.email}`, 'error');
        return res.status(401).json({ erro: 'Este código de convite é para outro email' });
      }

      usuarioFuncao = 'usuario';
      codigoValido = true;
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

    // Marcar como usado
    if (ehToken) {
      await prisma.tokenGeracao.update({
        where: { token: codigoConvite },
        data: {
          usado: true,
          usadoPor: email,
          usadoEm: new Date()
        }
      });
      log(`Token marcado como usado`);
    } else {
      await prisma.codigoConvite.update({
        where: { codigo: codigoConvite },
        data: {
          usado: true,
          usadoPorId: usuario.id,
          usadoEm: new Date()
        }
      });
      log(`Código marcado como usado`);
    }

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

async function validarConvite(req, res) {
  const prisma = getPrisma();
  try {
    const { codigo, email } = req.body;
    log(`📧 Validando CONVITE: ${codigo}`);

    const convite = await prisma.codigoConvite.findUnique({ where: { codigo } });

    if (!convite || convite.usado) {
      return res.status(401).json({ valido: false, erro: 'Código inválido' });
    }

    if (new Date() > new Date(convite.dataExpiracao)) {
      return res.status(401).json({ valido: false, erro: 'Código expirado' });
    }

    res.status(200).json({ 
      valido: true, 
      email: convite.email,
      mensagem: 'Código válido'
    });
  } catch (erro) {
    log(`Erro ao validar convite: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao validar' });
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

async function gerarTokenGeracao(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ erro: 'Email obrigatório' });
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    const tokenPendente = await prisma.tokenGeracao.findFirst({
      where: { email, usado: false }
    });

    if (usuarioExistente || tokenPendente) {
      return res.status(409).json({ erro: 'Email já possui conta ou token pendente' });
    }

    const tokenGerado = `GAC-TOKEN-${Math.random().toString(36).substr(2, 32).toUpperCase()}`;
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 7);

    const tokenDb = await prisma.tokenGeracao.create({
      data: {
        token: tokenGerado,
        email,
        dataExpiracao
      }
    });

    log(`✅ Token gerado para ${email}`);
    res.status(201).json(tokenDb);
  } catch (erro) {
    log(`Erro ao gerar token: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao gerar token' });
  }
}

async function listarTokens(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const tokens = await prisma.tokenGeracao.findMany();
    const pendentes = tokens.filter(t => !t.usado);
    const usados = tokens.filter(t => t.usado);

    res.status(200).json({ pendentes, usados });
  } catch (erro) {
    log(`Erro ao listar tokens: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao listar tokens' });
  }
}

async function revogarToken(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario || usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    await prisma.tokenGeracao.delete({ where: { id: parseInt(id) } });

    log(`✅ Token revogado`);
    res.status(204).end();
  } catch (erro) {
    log(`Erro ao revogar token: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao revogar token' });
  }
}

// ==================== PESSOAS ====================

async function pessoasListar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { pagina = 1, limite = 50, busca = '', status = 'ativo', filtros = null } = req.query;
    const paginaNum = parseInt(pagina) || 1;
    const limiteNum = parseInt(limite) || 50;
    const skip = (paginaNum - 1) * limiteNum;

    // Construir filtros
    const where = {};
    
    // Filtro de status (o campo se chama 'status' no schema)
    if (status && status !== 'todos') {
      where.status = status;
    }

    // Filtro de busca
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { cpf: { contains: busca } },
        { email: { contains: busca, mode: 'insensitive' } }
      ];
    }

    // Log para debug
    log(`👥 Listando pessoas - Página: ${paginaNum}, Limite: ${limiteNum}, Busca: "${busca}", Status: "${status}"`);

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
    res.status(500).json({ erro: 'Erro ao listar pessoas' });
  }
}

async function pessoasCriar(req, res) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { nome, cpf } = req.body;
    if (!nome || !cpf) {
      return res.status(400).json({ erro: 'Nome e CPF obrigatórios' });
    }

    const pessoa = await prisma.pessoa.create({
      data: {
        ...req.body,
        usuarioId: usuario.id
      }
    });

    res.status(201).json(pessoa);
  } catch (erro) {
    log(`Erro ao criar pessoa: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao criar pessoa' });
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
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const pessoa = await prisma.pessoa.update({
      where: { id: parseInt(id) },
      data: req.body
    });

    res.status(200).json(pessoa);
  } catch (erro) {
    log(`Erro ao atualizar pessoa: ${erro.message}`, 'error');
    res.status(500).json({ erro: 'Erro ao atualizar pessoa' });
  }
}

async function pessoasDeletar(req, res, id) {
  const prisma = getPrisma();
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    await prisma.pessoa.delete({ where: { id: parseInt(id) } });

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
      // Vercel pode já ter parseado o body
      if (req.body) {
        if (typeof req.body === 'string') {
          req.body = JSON.parse(req.body);
        }
        // Se já é objeto, deixa como está
      } else {
        // Se não tem body, tentar ler do stream
        let body = '';
        await new Promise((resolve, reject) => {
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', resolve);
          req.on('error', reject);
        });
        
        if (body) {
          req.body = JSON.parse(body);
        } else {
          req.body = {};
        }
      }
    } catch (erro) {
      log(`Erro ao fazer parse do body: ${erro.message}`, 'error');
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
