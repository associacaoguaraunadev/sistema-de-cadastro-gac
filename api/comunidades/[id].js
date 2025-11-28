import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

let prismaInstance;

function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

function extrairToken(req) {
  const cabecalhoAuth = req.headers['authorization'];
  return cabecalhoAuth && cabecalhoAuth.split(' ')[1];
}

function verificarAutenticacao(token) {
  if (!token) throw new Error('Token necessário');
  return jwt.verify(token, process.env.JWT_SECRET);
}

export default async function handler(req, res) {
  const prisma = getPrisma();
  
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
    const { id } = req.query;

    const comunidade = await prisma.comunidade.findFirst({
      where: { id: parseInt(id), usuarioId: usuario.id }
    });

    if (!comunidade) {
      return res.status(404).json({ erro: 'Comunidade não encontrada' });
    }

    // PATCH - Atualizar comunidade
    if (req.method === 'PATCH') {
      const { nome, descricao, icon, cor, orderIndex } = req.body;

      if (nome && nome !== comunidade.nome) {
        const nomeExistente = await prisma.comunidade.findFirst({
          where: { nome, usuarioId: usuario.id, NOT: { id: comunidade.id } }
        });

        if (nomeExistente) {
          return res.status(409).json({ erro: 'Comunidade com este nome já existe' });
        }
      }

      const comunidadeAtualizada = await prisma.comunidade.update({
        where: { id: parseInt(id) },
        data: {
          nome: nome || comunidade.nome,
          descricao: descricao !== undefined ? descricao : comunidade.descricao,
          icon: icon || comunidade.icon,
          cor: cor || comunidade.cor,
          orderIndex: orderIndex !== undefined ? orderIndex : comunidade.orderIndex
        }
      });

      return res.json(comunidadeAtualizada);
    }

    // DELETE - Deletar comunidade
    if (req.method === 'DELETE') {
      await prisma.comunidade.delete({
        where: { id: parseInt(id) }
      });

      return res.status(204).end();
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    if (erro.message.includes('Token')) {
      return res.status(401).json({ erro: 'Token de acesso necessário' });
    }

    console.error('Erro em comunidade [id]:', erro);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}
