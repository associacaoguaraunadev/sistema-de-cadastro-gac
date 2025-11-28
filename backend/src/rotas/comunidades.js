import express from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticarToken } from '../middleware/autenticacao.js';
import { manipuladorAssincrono } from '../middleware/manipuladorErro.js';

const rota = express.Router();
const prisma = new PrismaClient();

rota.use(autenticarToken);

// GET - Listar todas as comunidades do usuário
rota.get('/', manipuladorAssincrono(async (req, res) => {
  console.log(`   🏘️ Listando comunidades do usuário: ${req.usuario.email}`);

  const comunidades = await prisma.comunidade.findMany({
    where: { usuarioId: req.usuario.id },
    orderBy: { orderIndex: 'asc' },
    include: { pessoas: true }
  });

  console.log(`   ✅ ${comunidades.length} comunidades retornadas`);
  res.json(comunidades);
}));

// POST - Criar nova comunidade
rota.post('/', manipuladorAssincrono(async (req, res) => {
  const { nome, descricao, icon, cor } = req.body;
  console.log(`   ➕ Criando comunidade: ${nome}`);

  if (!nome) {
    console.log(`   ⚠️ Nome da comunidade é obrigatório`);
    return res.status(400).json({ erro: 'Nome da comunidade é obrigatório' });
  }

  const comunidadeExistente = await prisma.comunidade.findFirst({
    where: { nome, usuarioId: req.usuario.id }
  });

  if (comunidadeExistente) {
    console.log(`   ⚠️ Comunidade com este nome já existe`);
    return res.status(409).json({ erro: 'Comunidade com este nome já existe' });
  }

  const maxOrder = await prisma.comunidade.aggregate({
    where: { usuarioId: req.usuario.id },
    _max: { orderIndex: true }
  });

  const comunidade = await prisma.comunidade.create({
    data: {
      nome,
      descricao: descricao || null,
      icon: icon || 'Building2',
      cor: cor || '#16a34a',
      orderIndex: (maxOrder._max.orderIndex || -1) + 1,
      usuarioId: req.usuario.id
    }
  });

  console.log(`   ✅ Comunidade criada com ID: ${comunidade.id}`);
  res.status(201).json(comunidade);
}));

export default rota;
