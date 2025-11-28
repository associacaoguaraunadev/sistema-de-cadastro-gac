import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { validarDadosUsuario } from '../middleware/validacao.js';
import { tratarErroAssincrono } from '../middleware/manipuladorErro.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const { email, senha, nome } = req.body;

    const errosValidacao = validarDadosUsuario(req.body);
    if (errosValidacao.length > 0) {
      return res.status(400).json({ erros: errosValidacao });
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
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
  } catch (erro) {
    const { status, erro: mensagem } = tratarErroAssincrono(erro);
    res.status(status).json({ erro: mensagem });
  } finally {
    await prisma.$disconnect();
  }
}
