import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { manipuladorAssincrono } from '../middleware/manipuladorErro.js';
import { validarDadosUsuario, validarSenha } from '../middleware/validacao.js';
import { autenticarToken, autorizarFuncao } from '../middleware/autenticacao.js';
import { enviarEmailRecuperacaoSenha, enviarEmailConfirmacaoResetado } from '../servicos/email.js';

const rota = express.Router();
const prisma = new PrismaClient();

rota.post('/registrar', manipuladorAssincrono(async (req, res) => {
  const { email, senha, nome, codigoConvite } = req.body;
  console.log(`   📝 Tentando registrar novo usuário: ${email}`);

  const errosValidacao = validarDadosUsuario(req.body);
  if (errosValidacao.length > 0) {
    console.log(`   ⚠️ Validação falhou: ${errosValidacao.join(', ')}`);
    return res.status(400).json({ erros: errosValidacao });
  }

  // VALIDAR CÓDIGO DE CONVITE OU TOKEN
  if (!codigoConvite) {
    console.log(`   ⚠️ Código/Token não fornecido`);
    return res.status(400).json({ erro: 'Código/Token é obrigatório' });
  }

  const ehToken = codigoConvite.startsWith('GAC-TOKEN-');
  let usuarioFuncao = 'usuario';

  if (ehToken) {
    // FLUXO TOKEN: Criar um Funcionário
    console.log(`   🔑 Validando TOKEN para criar funcionário`);
    
    const token = await prisma.tokenGeracao.findUnique({ where: { token: codigoConvite } });

    if (!token) {
      console.log(`   ⚠️ Token inválido: ${codigoConvite}`);
      return res.status(401).json({ erro: 'Token inválido' });
    }

    if (token.usado) {
      console.log(`   ⚠️ Token já utilizado: ${codigoConvite}`);
      return res.status(401).json({ erro: 'Token já foi utilizado' });
    }

    if (new Date() > token.dataExpiracao) {
      console.log(`   ⚠️ Token expirado: ${codigoConvite}`);
      return res.status(401).json({ erro: 'Token expirado' });
    }

    if (token.email !== email) {
      console.log(`   ⚠️ Email não corresponde ao token: ${email} vs ${token.email}`);
      return res.status(401).json({ erro: 'Este token é para outro email' });
    }

    usuarioFuncao = 'funcionario';
  } else {
    // FLUXO CONVITE: Criar um Usuário
    console.log(`   📧 Validando CÓDIGO para criar usuário`);
    
    const convite = await prisma.codigoConvite.findUnique({ where: { codigo: codigoConvite } });

    if (!convite) {
      console.log(`   ⚠️ Código de convite inválido: ${codigoConvite}`);
      return res.status(401).json({ erro: 'Código de convite inválido' });
    }

    if (convite.usado) {
      console.log(`   ⚠️ Código de convite já utilizado: ${codigoConvite}`);
      return res.status(401).json({ erro: 'Código de convite já foi utilizado' });
    }

    if (convite.dataExpiracao && new Date() > convite.dataExpiracao) {
      console.log(`   ⚠️ Código de convite expirado: ${codigoConvite}`);
      return res.status(401).json({ erro: 'Código de convite expirado' });
    }

    if (convite.email !== email) {
      console.log(`   ⚠️ Email não corresponde ao convite: ${email} vs ${convite.email}`);
      return res.status(401).json({ erro: 'Este código de convite é para outro email' });
    }

    usuarioFuncao = 'usuario';
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
      funcao: usuarioFuncao
    }
  });

  // MARCAR TOKEN OU CONVITE COMO USADO
  if (ehToken) {
    await prisma.tokenGeracao.update({
      where: { token: codigoConvite },
      data: {
        usado: true,
        usadoPor: email,
        usadoEm: new Date()
      }
    });
    console.log(`   ✅ Token marcado como usado`);
  } else {
    await prisma.codigoConvite.update({
      where: { codigo: codigoConvite },
      data: {
        usado: true,
        usadoPorId: usuario.id,
        usadoEm: new Date()
      }
    });
    console.log(`   ✅ Código marcado como usado`);
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log(`   ✅ Usuário registrado com sucesso: ${email}`);
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

rota.get('/listar', autenticarToken, autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
  console.log(`   👥 Listando usuários para transferência`);

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      email: true,
      nome: true,
      funcao: true,
      ativo: true
    },
    where: {
      ativo: true
    },
    orderBy: {
      nome: 'asc'
    }
  });

  console.log(`   ✅ ${usuarios.length} usuários encontrados`);
  res.json(usuarios);
}));

// ========== GERENCIAMENTO DE CÓDIGOS DE CONVITE ==========

// Gerar novo código de convite (Admin)
rota.post('/convite/gerar', autenticarToken, autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
  const { email } = req.body;
  console.log(`   🎁 Gerando código de convite para: ${email}`);

  if (!email) {
    return res.status(400).json({ erro: 'Email é obrigatório' });
  }

  // Validar se email já existe no sistema
  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
  if (usuarioExistente) {
    return res.status(409).json({ erro: 'Este email já possui uma conta' });
  }

  // Verificar se já há convite pendente para este email
  const convitePendente = await prisma.codigoConvite.findFirst({
    where: { email, usado: false }
  });

  if (convitePendente) {
    return res.status(409).json({ 
      erro: 'Já existe um convite pendente para este email',
      codigo: convitePendente.codigo 
    });
  }

  // Gerar código único
  const codigo = `GAC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const convite = await prisma.codigoConvite.create({
    data: {
      codigo,
      email,
      dataExpiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    }
  });

  console.log(`   ✅ Código de convite gerado: ${codigo}`);
  res.status(201).json({
    codigo: convite.codigo,
    email: convite.email,
    dataExpiracao: convite.dataExpiracao,
    mensagem: 'Envie este código ao novo usuário'
  });
}));

// Listar códigos de convite (Admin)
rota.get('/convite/listar', autenticarToken, autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
  console.log(`   📋 Listando códigos de convite`);

  const convites = await prisma.codigoConvite.findMany({
    orderBy: { dataCriacao: 'desc' }
  });

  const pendentes = convites.filter(c => !c.usado);
  const usados = convites.filter(c => c.usado);

  console.log(`   ✅ ${pendentes.length} pendentes, ${usados.length} usados`);
  res.json({
    pendentes,
    usados,
    total: convites.length
  });
}));

// Revogar código de convite (Admin)
rota.delete('/convite/:codigo', autenticarToken, autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
  const { codigo } = req.params;
  console.log(`   🗑️ Revogando código: ${codigo}`);

  const convite = await prisma.codigoConvite.findUnique({ where: { codigo } });
  
  if (!convite) {
    return res.status(404).json({ erro: 'Código não encontrado' });
  }

  if (convite.usado) {
    return res.status(400).json({ erro: 'Não é possível revogar um código já utilizado' });
  }

  await prisma.codigoConvite.delete({ where: { codigo } });

  console.log(`   ✅ Código revogado`);
  res.json({ mensagem: 'Código revogado com sucesso' });
}));

// Validar código de convite (Frontend)
rota.post('/convite/validar', manipuladorAssincrono(async (req, res) => {
  const { codigo } = req.body;
  console.log(`   🔍 Validando código: ${codigo}`);

  if (!codigo) {
    return res.status(400).json({ erro: 'Código é obrigatório', valido: false });
  }

  const convite = await prisma.codigoConvite.findUnique({ where: { codigo } });

  if (!convite) {
    console.log(`   ❌ Código inválido`);
    return res.status(404).json({ erro: 'Código de convite inválido', valido: false });
  }

  if (convite.usado) {
    console.log(`   ❌ Código já foi utilizado`);
    return res.status(400).json({ erro: 'Código já foi utilizado', valido: false });
  }

  if (convite.dataExpiracao && new Date() > convite.dataExpiracao) {
    console.log(`   ❌ Código expirado`);
    return res.status(400).json({ erro: 'Código expirado', valido: false });
  }

  console.log(`   ✅ Código válido`);
  res.json({ 
    valido: true, 
    email: convite.email,
    mensagem: 'Código válido! Continue com o registro'
  });
}));

// ========== GERENCIAMENTO DE TOKENS DE GERAÇÃO ==========

// Gerar token de geração (Admin) - para delegar poder de gerar convites
rota.post('/token/gerar', autenticarToken, autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
  const { email } = req.body;
  console.log(`   🔑 Gerando token de geração para: ${email}`);

  if (!email) {
    return res.status(400).json({ erro: 'Email é obrigatório' });
  }

  // Verificar se email já está no sistema
  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
  if (usuarioExistente) {
    return res.status(409).json({ erro: 'Este email já possui uma conta' });
  }

  // Gerar token único
  const tokenGerado = `GAC-TOKEN-${Date.now()}-${Math.random().toString(36).substr(2, 12).toUpperCase()}`;

  const token = await prisma.tokenGeracao.create({
    data: {
      token: tokenGerado,
      email,
      usuarioId: req.usuario.id,
      dataExpiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    }
  });

  console.log(`   ✅ Token gerado: ${tokenGerado}`);
  res.status(201).json({
    token: token.token,
    email: token.email,
    dataExpiracao: token.dataExpiracao,
    mensagem: 'Compartilhe este token com o usuário que gerará os convites'
  });
}));

// Listar tokens de geração (Admin)
rota.get('/token/listar', autenticarToken, autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
  console.log(`   📋 Listando tokens de geração`);

  const tokens = await prisma.tokenGeracao.findMany({
    where: { usuarioId: req.usuario.id },
    orderBy: { dataCriacao: 'desc' }
  });

  const pendentes = tokens.filter(t => !t.usado);
  const usados = tokens.filter(t => t.usado);

  console.log(`   ✅ ${pendentes.length} pendentes, ${usados.length} usados`);
  res.json({
    pendentes,
    usados,
    total: tokens.length
  });
}));

// Revogar token de geração (Admin)
rota.delete('/token/:tokenId', autenticarToken, autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
  const { tokenId } = req.params;
  console.log(`   🗑️ Revogando token ID: ${tokenId}`);

  const token = await prisma.tokenGeracao.findFirst({ 
    where: { id: parseInt(tokenId), usuarioId: req.usuario.id }
  });
  
  if (!token) {
    return res.status(404).json({ erro: 'Token não encontrado' });
  }

  if (token.usado) {
    return res.status(400).json({ erro: 'Não é possível revogar um token já utilizado' });
  }

  await prisma.tokenGeracao.delete({ where: { id: parseInt(tokenId) } });

  console.log(`   ✅ Token revogado`);
  res.json({ mensagem: 'Token revogado com sucesso' });
}));

// Validar e usar token de geração (Frontend - usuário com token gera convites)
rota.post('/token/validar', manipuladorAssincrono(async (req, res) => {
  const { token } = req.body;
  console.log(`   🔍 Validando token de geração`);
  console.log(`   📝 Token recebido: ${token?.substring(0, 20)}...`);

  if (!token) {
    return res.status(400).json({ erro: 'Token é obrigatório', valido: false });
  }

  const tokenData = await prisma.tokenGeracao.findUnique({ where: { token } });

  if (!tokenData) {
    console.log(`   ❌ Token inválido - não encontrado no banco`);
    console.log(`   📊 Tokens no banco:`, (await prisma.tokenGeracao.findMany({ take: 5 })).map(t => t.token));
    return res.status(404).json({ erro: 'Token inválido', valido: false });
  }

  if (tokenData.usado) {
    console.log(`   ❌ Token já foi utilizado`);
    return res.status(400).json({ erro: 'Token já foi utilizado', valido: false });
  }

  if (new Date() > tokenData.dataExpiracao) {
    console.log(`   ❌ Token expirado`);
    return res.status(400).json({ erro: 'Token expirado', valido: false });
  }

  console.log(`   ✅ Token válido`);
  res.json({ 
    valido: true, 
    email: tokenData.email,
    mensagem: 'Token válido! Você pode gerar códigos de convite'
  });
}));

// Usar token para gerar primeira conta de gerador de convites
rota.post('/token/usar', manipuladorAssincrono(async (req, res) => {
  const { token, email, senha, nome } = req.body;
  console.log(`   🔑 Usando token para criar gerador: ${email}`);

  if (!token || !email || !senha || !nome) {
    return res.status(400).json({ erro: 'Token, email, senha e nome são obrigatórios' });
  }

  // Validar força da senha
  const errosSenha = validarSenha(senha);
  if (errosSenha.length > 0) {
    return res.status(400).json({ erros: errosSenha });
  }

  // Verificar token
  const tokenData = await prisma.tokenGeracao.findUnique({ where: { token } });

  if (!tokenData) {
    return res.status(404).json({ erro: 'Token inválido' });
  }

  if (tokenData.usado) {
    return res.status(400).json({ erro: 'Token já foi utilizado' });
  }

  if (new Date() > tokenData.dataExpiracao) {
    return res.status(400).json({ erro: 'Token expirado' });
  }

  if (tokenData.email !== email) {
    return res.status(400).json({ erro: 'Email não corresponde ao token' });
  }

  // Verificar se usuário já existe
  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
  if (usuarioExistente) {
    return res.status(409).json({ erro: 'Este email já possui uma conta' });
  }

  // Criar usuário com função 'gerador'
  const senhaHash = await bcrypt.hash(senha, 10);
  const novoUsuario = await prisma.usuario.create({
    data: {
      email,
      nome,
      senha: senhaHash,
      funcao: 'gerador', // Função especial para gerar convites
      ativo: true
    }
  });

  // Marcar token como usado
  await prisma.tokenGeracao.update({
    where: { id: tokenData.id },
    data: {
      usado: true,
      usadoPor: email,
      usadoEm: new Date()
    }
  });

  // Gerar JWT para o novo usuário
  const jwtToken = jwt.sign(
    { id: novoUsuario.id, email: novoUsuario.email, funcao: novoUsuario.funcao },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log(`   ✅ Usuário gerador criado: ${email}`);
  res.status(201).json({
    usuario: {
      id: novoUsuario.id,
      email: novoUsuario.email,
      nome: novoUsuario.nome,
      funcao: novoUsuario.funcao
    },
    token: jwtToken,
    mensagem: 'Gerador de convites criado com sucesso!'
  });
}));

export default rota;
