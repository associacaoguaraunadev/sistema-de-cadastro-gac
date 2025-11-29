import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { manipuladorAssincrono } from '../middleware/manipuladorErro.js';
import { validarDadosUsuario, validarSenha } from '../middleware/validacao.js';
import { autenticarToken } from '../middleware/autenticacao.js';
import { enviarEmailRecuperacaoSenha, enviarEmailConfirmacaoResetado } from '../servicos/email.js';

const rota = express.Router();
const prisma = new PrismaClient();

rota.post('/registrar', manipuladorAssincrono(async (req, res) => {
  const { email, senha, nome } = req.body;
  console.log(`   📝 Tentando registrar novo usuário: ${email}`);

  const errosValidacao = validarDadosUsuario(req.body);
  if (errosValidacao.length > 0) {
    console.log(`   ⚠️ Validação falhou: ${errosValidacao.join(', ')}`);
    return res.status(400).json({ erros: errosValidacao });
  }

  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
  if (usuarioExistente) {
    console.log(`   ⚠️ Email já registrado: ${email}`);
    return res.status(409).json({ erro: 'Email já está registrado' });
  }

  const senhaCriptografada = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      email,
      senha: senhaCriptografada,
      nome,
      funcao: 'funcionario'
    }
  });

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      funcao: usuario.funcao
    },
    token
  });
}));

rota.post('/entrar', manipuladorAssincrono(async (req, res) => {
  const { email, senha } = req.body;
  console.log(`   🔐 Tentando login: ${email}`);

  if (!email || !senha) {
    console.log(`   ⚠️ Credenciais incompletas`);
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo) {
    console.log(`   ❌ Usuário não encontrado ou inativo: ${email}`);
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }

  const senhaCorresponde = await bcrypt.compare(senha, usuario.senha);
  if (!senhaCorresponde) {
    console.log(`   ❌ Senha incorreta para: ${email}`);
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log(`   ✅ Login bem-sucedido para: ${email}`);
  res.json({
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      funcao: usuario.funcao
    },
    token
  });
}));

rota.get('/eu', autenticarToken, manipuladorAssincrono(async (req, res) => {
  console.log(`   👤 Buscando dados do usuário: ${req.usuario.email}`);
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: {
      id: true,
      email: true,
      nome: true,
      funcao: true,
      dataCriacao: true
    }
  });

  res.json(usuario);
}));

// 🔐 RECUPERAÇÃO DE SENHA
rota.post('/esqueci-senha', manipuladorAssincrono(async (req, res) => {
  const { email } = req.body;
  console.log(`   🔑 Solicitação de recuperação de senha: ${email}`);

  if (!email) {
    return res.status(400).json({ erro: 'Email é obrigatório' });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    // Não revelar se o email existe (por segurança)
    console.log(`   ℹ️ Email não encontrado (por segurança, retornamos OK): ${email}`);
    return res.json({ mensagem: 'Se o email existe, você receberá um link de recuperação' });
  }

  // Gerar token de recuperação
  const tokenRecuperacao = jwt.sign(
    { id: usuario.id, email: usuario.email, tipo: 'recuperacao' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Fazer hash do token para armazenar
  const hashToken = await bcrypt.hash(tokenRecuperacao, 10);
  const expiracaoToken = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  // Salvar hash do token no banco
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      tokenRecuperacao: hashToken,
      expiracaoToken
    }
  });

  // Preparar link de recuperação
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const linkRecuperacao = `${frontendURL}/recuperar-senha?token=${tokenRecuperacao}`;

  // Enviar email
  try {
    await enviarEmailRecuperacaoSenha(usuario.email, usuario.nome, tokenRecuperacao, linkRecuperacao);
    console.log(`   ✅ Email de recuperação enviado para ${email}`);
  } catch (erro) {
    console.error(`   ❌ Erro ao enviar email: ${erro.message}`);
    // Mesmo com erro no email, retornar sucesso (por segurança)
  }

  res.json({ mensagem: 'Se o email existe, você receberá um link de recuperação' });
}));

rota.post('/validar-token-recuperacao', manipuladorAssincrono(async (req, res) => {
  const { token } = req.body;
  console.log(`   🔑 Validando token de recuperação`);

  if (!token) {
    return res.status(400).json({ erro: 'Token é obrigatório' });
  }

  try {
    // Verificar assinatura do token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.tipo !== 'recuperacao') {
      console.log(`   ❌ Token não é de recuperação`);
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nome: true, tokenRecuperacao: true, expiracaoToken: true }
    });

    if (!usuario || !usuario.tokenRecuperacao) {
      console.log(`   ❌ Usuário não encontrado ou token não salvo`);
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Verificar expiração
    if (new Date() > usuario.expiracaoToken) {
      console.log(`   ❌ Token expirado`);
      return res.status(401).json({ erro: 'Token expirado. Solicite uma nova recuperação de senha' });
    }

    // Verificar se o hash do token corresponde
    const tokenValido = await bcrypt.compare(token, usuario.tokenRecuperacao);
    if (!tokenValido) {
      console.log(`   ❌ Token não corresponde ao hash armazenado`);
      return res.status(401).json({ erro: 'Token inválido' });
    }

    console.log(`   ✅ Token válido para ${usuario.email}`);
    res.json({ valido: true, email: usuario.email });
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      console.log(`   ❌ Token expirou`);
      return res.status(401).json({ erro: 'Token expirado. Solicite uma nova recuperação de senha' });
    }
    if (erro.name === 'JsonWebTokenError') {
      console.log(`   ❌ Token inválido`);
      return res.status(401).json({ erro: 'Token inválido' });
    }
    throw erro;
  }
}));

rota.post('/redefinir-senha', manipuladorAssincrono(async (req, res) => {
  const { token, novaSenha } = req.body;
  console.log(`   🔑 Tentando redefinir senha`);

  if (!token || !novaSenha) {
    return res.status(400).json({ erro: 'Token e nova senha são obrigatórios' });
  }

  // Validar força da senha
  const errosSenha = validarSenha(novaSenha);
  if (errosSenha.length > 0) {
    console.log(`   ⚠️ Validação de senha falhou`);
    return res.status(400).json({ erros: errosSenha });
  }

  try {
    // Verificar assinatura do token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.tipo !== 'recuperacao') {
      console.log(`   ❌ Token não é de recuperação`);
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nome: true, tokenRecuperacao: true, expiracaoToken: true }
    });

    if (!usuario || !usuario.tokenRecuperacao) {
      console.log(`   ❌ Usuário não encontrado`);
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Verificar expiração
    if (new Date() > usuario.expiracaoToken) {
      console.log(`   ❌ Token expirado`);
      return res.status(401).json({ erro: 'Token expirado. Solicite uma nova recuperação de senha' });
    }

    // Verificar se o hash do token corresponde
    const tokenValido = await bcrypt.compare(token, usuario.tokenRecuperacao);
    if (!tokenValido) {
      console.log(`   ❌ Token não corresponde`);
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Criptografar nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha e limpar token de recuperação
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: senhaHash,
        tokenRecuperacao: null,
        expiracaoToken: null
      }
    });

    // Enviar email de confirmação
    try {
      await enviarEmailConfirmacaoResetado(usuario.email, usuario.nome);
    } catch (erro) {
      console.error(`   ⚠️ Erro ao enviar email de confirmação: ${erro.message}`);
      // Continuar mesmo se email falhar
    }

    console.log(`   ✅ Senha redefinida para ${usuario.email}`);
    res.json({ mensagem: 'Senha redefinida com sucesso!' });
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      console.log(`   ❌ Token expirou`);
      return res.status(401).json({ erro: 'Token expirado. Solicite uma nova recuperação de senha' });
    }
    if (erro.name === 'JsonWebTokenError') {
      console.log(`   ❌ Token inválido`);
      return res.status(401).json({ erro: 'Token inválido' });
    }
    throw erro;
  }
}));

export default rota;
