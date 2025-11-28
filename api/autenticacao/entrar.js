import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { tratarErroAssincrono } from '../middleware/manipuladorErro.js';

const globalForPrisma = global;
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const senhaCorresponde = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorresponde) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
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
