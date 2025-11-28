import { getPrismaInstance } from '../_lib/prisma-singleton.js';
import jwt from 'jsonwebtoken';

function extrairToken(req) {
  const cabecalhoAuth = req.headers['authorization'];
  return cabecalhoAuth && cabecalhoAuth.split(' ')[1];
}

function verificarAutenticacao(token) {
  if (!token) throw new Error('Token necessário');
  return jwt.verify(token, process.env.JWT_SECRET);
}

export default async function handler(req, res) {
  const prisma = getPrismaInstance();
  
  if (!prisma) {
    console.error('[ERRO] getPrismaInstance() retornou falsy');
    return res.status(500).json({ erro: 'Falha ao inicializar banco de dados' });
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = extrairToken(req);
    const usuario = verificarAutenticacao(token);

    // GET - Listar todas as comunidades do usuário
    if (req.method === 'GET') {
      const comunidades = await prisma.comunidade.findMany({
        where: { usuarioId: usuario.id },
        orderBy: { orderIndex: 'asc' },
        include: { pessoas: true }
      });

      return res.json(comunidades);
    }

    // POST - Criar nova comunidade
    if (req.method === 'POST') {
      const { nome, descricao, icon, cor } = req.body;

      if (!nome) {
        return res.status(400).json({ erro: 'Nome da comunidade é obrigatório' });
      }

      const comunidadeExistente = await prisma.comunidade.findFirst({
        where: { nome, usuarioId: usuario.id }
      });

      if (comunidadeExistente) {
        return res.status(409).json({ erro: 'Comunidade com este nome já existe' });
      }

      const maxOrder = await prisma.comunidade.aggregate({
        where: { usuarioId: usuario.id },
        _max: { orderIndex: true }
      });

      const comunidade = await prisma.comunidade.create({
        data: {
          nome,
          descricao: descricao || null,
          icon: icon || 'Building2',
          cor: cor || '#16a34a',
          orderIndex: (maxOrder._max.orderIndex || -1) + 1,
          usuarioId: usuario.id
        }
      });

      return res.status(201).json(comunidade);
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    if (erro.message.includes('Token')) {
      return res.status(401).json({ erro: 'Token de acesso necessário' });
    }

    console.error('Erro em comunidades:', erro);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}
