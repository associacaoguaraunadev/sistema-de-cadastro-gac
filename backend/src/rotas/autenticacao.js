import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { manipuladorAssincrono } from '../middleware/manipuladorErro.js';
import { validarDadosUsuario } from '../middleware/validacao.js';
import { autenticarToken } from '../middleware/autenticacao.js';

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

export default rota;
