import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { tratarErroAssincrono } from '../middleware/manipuladorErro.js';

const prisma = new PrismaClient();

function extrairToken(req) {
  const cabecalhoAuth = req.headers['authorization'];
  return cabecalhoAuth && cabecalhoAuth.split(' ')[1];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const token = extrairToken(req);

    if (!token) {
      return res.status(401).json({ erro: 'Token de acesso necessário' });
    }

    const usuario = jwt.verify(token, process.env.JWT_SECRET);

    const usuarioBD = await prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: {
        id: true,
        email: true,
        nome: true,
        funcao: true,
        dataCriacao: true
      }
    });

    if (!usuarioBD) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(usuarioBD);
  } catch (erro) {
    if (erro.name === 'JsonWebTokenError' || erro.name === 'TokenExpiredError') {
      return res.status(403).json({ erro: 'Token inválido ou expirado' });
    }
    
    const { status, erro: mensagem } = tratarErroAssincrono(erro);
    res.status(status).json({ erro: mensagem });
  } finally {
    await prisma.$disconnect();
  }
}
