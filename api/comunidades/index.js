import prisma from '../lib/prisma.js';
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

    // GET - Listar todas as comunidades do usuário com contagem de pessoas
    if (req.method === 'GET') {
      const comunidades = await prisma.comunidade.findMany({
        where: { usuarioId: usuario.id },
        orderBy: { orderIndex: 'asc' },
        include: {
          _count: {
            select: { pessoas: true }
          }
        }
      });

      // Estruturar comunidades com contagem por faixa etária
      const comunidadesComEstatisticas = await Promise.all(
        comunidades.map(async (comunidade) => {
          const pessoas = await prisma.pessoa.findMany({
            where: { comunidadeId: comunidade.id, status: 'ativo' },
            select: { idade: true }
          });

          const criancas = pessoas.filter(p => p.idade !== null && p.idade < 18).length;
          const adultos = pessoas.filter(p => p.idade !== null && p.idade >= 18 && p.idade < 60).length;
          const idosos = pessoas.filter(p => p.idade !== null && p.idade >= 60).length;

          return {
            ...comunidade,
            totalPessoas: pessoas.length,
            criancas,
            adultos,
            idosos
          };
        })
      );

      return res.json(comunidadesComEstatisticas);
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
