import express from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticarToken } from '../middleware/autenticacao.js';
import { manipuladorAssincrono } from '../middleware/manipuladorErro.js';

const rota = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

rota.use(autenticarToken);

// PATCH - Atualizar comunidade
rota.patch('/:id', manipuladorAssincrono(async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, icon, cor, orderIndex } = req.body;
  console.log(`   ✏️ Atualizando comunidade: ${id}`);

  const comunidade = await prisma.comunidade.findFirst({
    where: { id: parseInt(id), usuarioId: req.usuario.id }
  });

  if (!comunidade) {
    console.log(`   ⚠️ Comunidade não encontrada: ${id}`);
    return res.status(404).json({ erro: 'Comunidade não encontrada' });
  }

  const comunidadeAtualizada = await prisma.comunidade.update({
    where: { id: parseInt(id) },
    data: {
      ...(nome && { nome }),
      ...(descricao !== undefined && { descricao }),
      ...(icon && { icon }),
      ...(cor && { cor }),
      ...(orderIndex !== undefined && { orderIndex })
    }
  });

  console.log(`   ✅ Comunidade atualizada`);
  res.json(comunidadeAtualizada);
}));

// DELETE - Deletar comunidade
rota.delete('/:id', manipuladorAssincrono(async (req, res) => {
  const { id } = req.params;
  console.log(`   🗑️ Deletando comunidade: ${id}`);

  const comunidade = await prisma.comunidade.findFirst({
    where: { id: parseInt(id), usuarioId: req.usuario.id }
  });

  if (!comunidade) {
    console.log(`   ⚠️ Comunidade não encontrada: ${id}`);
    return res.status(404).json({ erro: 'Comunidade não encontrada' });
  }

  await prisma.comunidade.delete({
    where: { id: parseInt(id) }
  });

  console.log(`   ✅ Comunidade deletada`);
  res.json({ mensagem: 'Comunidade deletada com sucesso' });
}));

export default rota;
