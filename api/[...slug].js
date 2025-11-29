import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (erro) {
    return null;
  }
}

// Rotas
async function rotear(req, res, slug) {
  const rota = slug.join('/');

  // HEALTH CHECK
  if (rota === 'health' && req.method === 'GET') {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } catch (erro) {
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

  if (rota.startsWith('pessoas/') && req.method === 'PUT') {
    const id = slug[1];
    return pessoasAtualizar(req, res, id);
  }

  if (rota.startsWith('pessoas/') && req.method === 'DELETE') {
    const id = slug[1];
    return pessoasDeletar(req, res, id);
  }

  if (rota === 'pessoas/transferir' && req.method === 'POST') {
    return pessoasTransferir(req, res);
  }

  return res.status(404).json({ erro: 'Rota não encontrada' });
}

// ==================== AUTENTICAÇÃO ====================

async function autenticacaoEntrar(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
}

async function autenticacaoRegistrar(req, res) {
  try {
    const { email, senha, nome, codigoConvite } = req.body;

    if (!email || !senha || !nome || !codigoConvite) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    const convite = await prisma.codigoConvite.findUnique({ where: { codigo: codigoConvite } });
    if (!convite || convite.usado) {
      return res.status(401).json({ erro: 'Código de convite inválido ou já utilizado' });
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.status(409).json({ erro: 'Email já registrado' });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email,
        senha: senhaCriptografada,
        nome,
        funcao: 'usuario'
      }
    });

    await prisma.codigoConvite.update({
      where: { codigo: codigoConvite },
      data: {
        usado: true,
        usadoPorId: usuario.id,
        usadoEm: new Date()
      }
    });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
      process.env.JWT_SECRET,
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
    res.status(500).json({ erro: 'Erro ao registrar' });
  }
}

async function autenticacaoEu(req, res) {
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const usuarioBd = await prisma.usuario.findUnique({ where: { id: usuario.id } });
    res.status(200).json(usuarioBd);
  } catch (erro) {
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
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
}

async function autenticacaoValidarToken(req, res) {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      return res.status(401).json({ valido: false });
    }

    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valido: true, usuario });
  } catch (erro) {
    res.status(401).json({ valido: false });
  }
}

// ==================== PESSOAS ====================

async function pessoasListar(req, res) {
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const pessoas = await prisma.pessoa.findMany({
      orderBy: { dataCriacao: 'desc' }
    });

    res.status(200).json(pessoas);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao listar pessoas' });
  }
}

async function pessoasCriar(req, res) {
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const { nome, dataNascimento, cpf, rg, email, telefone } = req.body;

    const pessoa = await prisma.pessoa.create({
      data: {
        nome,
        dataNascimento: new Date(dataNascimento),
        cpf,
        rg,
        email,
        telefone,
        criadoPor: usuario.id
      }
    });

    res.status(201).json(pessoa);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao criar pessoa' });
  }
}

async function pessoasObter(req, res, id) {
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const pessoa = await prisma.pessoa.findUnique({ where: { id } });
    if (!pessoa) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }

    res.status(200).json(pessoa);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao obter pessoa' });
  }
}

async function pessoasAtualizar(req, res, id) {
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const pessoa = await prisma.pessoa.update({
      where: { id },
      data: req.body
    });

    res.status(200).json(pessoa);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao atualizar pessoa' });
  }
}

async function pessoasDeletar(req, res, id) {
  try {
    const usuario = autenticarToken(req);
    if (!usuario) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    await prisma.pessoa.delete({ where: { id } });

    res.status(204).end();
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao deletar pessoa' });
  }
}

async function pessoasTransferir(req, res) {
  return res.status(501).json({ erro: 'Não implementado' });
}

// ==================== HANDLER PRINCIPAL ====================

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const slug = req.query.slug || [];
  return rotear(req, res, slug);
}
