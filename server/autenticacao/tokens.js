/**
 * API de Gerenciamento de Tokens de Geração
 * POST   /api/autenticacao/token/gerar   - Gerar novo token
 * GET    /api/autenticacao/token/listar   - Listar tokens
 * DELETE /api/autenticacao/token/:id      - Revogar token
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { verificarToken } from '../middleware/autenticacao.js';

let prisma;

function getPrisma() {
  if (!prisma) {
    try {
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn']
      });
    } catch (err) {
      console.error('❌ Falha ao inicializar Prisma Client. Certifique-se de rodar `npx prisma generate` durante o build/deploy e incluir o client gerado no bundle. Detalhe:', err && (err.stack || err.message) || err);
      throw err;
    }
  }
  return prisma;
}

export async function gerarTokenGeracao(req, res) {
  try {
    const usuario = verificarToken(req, res);
    if (!usuario) return;
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem gerar tokens', statusCode: 403 });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ erro: 'Email inválido', statusCode: 400 });
    }

    const prismaClient = getPrisma();
    const usuarioExistente = await prismaClient.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.status(409).json({ erro: 'Email já possui uma conta criada', statusCode: 409 });
    }

    const tokenPendente = await prismaClient.tokenGeracao.findUnique({ where: { email } });
    if (tokenPendente && !tokenPendente.usado && tokenPendente.dataExpiracao > new Date()) {
      return res.status(409).json({ erro: 'Email já possui um token pendente', statusCode: 409 });
    }

    const tokenHex = crypto.randomBytes(32).toString('hex');
    const token = `GAC-GEN-${tokenHex}`;
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 7);

    const novoToken = await prismaClient.tokenGeracao.upsert({
      where: { email },
      update: { token, usado: false, dataCriacao: new Date(), dataExpiracao },
      create: { email, token, usado: false, dataCriacao: new Date(), dataExpiracao }
    });

    console.log(`✅ Token gerado para ${email}`);

    return res.status(201).json({ sucesso: true, mensagem: 'Token gerado com sucesso', token: novoToken.token, email: novoToken.email, dataExpiracao: novoToken.dataExpiracao });
  } catch (erro) {
    console.error('❌ Erro ao gerar token:', erro);
    if (erro && (erro.message || '').includes('did not initialize') || (erro && (erro.message || '').includes('prisma generate'))) {
      return res.status(503).json({ erro: 'Prisma Client não inicializado. Execute `npx prisma generate` durante o build/deploy.', statusCode: 503 });
    }
    return res.status(500).json({ erro: erro.message || 'Erro ao gerar token', statusCode: 500 });
  }
}

export async function listarTokens(req, res) {
  try {
    const usuario = verificarToken(req, res);
    if (!usuario) return;
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem listar tokens', statusCode: 403 });
    }

    const prismaClient = getPrisma();
    const tokens = await prismaClient.tokenGeracao.findMany({ orderBy: { dataCriacao: 'desc' } });

    const agora = new Date();
    const pendentes = tokens.filter(t => !t.usado && t.dataExpiracao > agora);
    const usados = tokens.filter(t => t.usado || t.dataExpiracao <= agora);

    console.log(`✅ Listados ${tokens.length} tokens (${pendentes.length} pendentes, ${usados.length} usados)`);

    return res.status(200).json({ sucesso: true, pendentes, usados, total: tokens.length });
  } catch (erro) {
    console.error('❌ Erro ao listar tokens:', erro);
    if (erro && (erro.message || '').includes('did not initialize') || (erro && (erro.message || '').includes('prisma generate'))) {
      return res.status(503).json({ erro: 'Prisma Client não inicializado. Execute `npx prisma generate` durante o build/deploy.', statusCode: 503 });
    }
    return res.status(500).json({ erro: erro.message || 'Erro ao listar tokens', statusCode: 500 });
  }
}

export async function revogarToken(req, res) {
  try {
    const usuario = verificarToken(req, res);
    if (!usuario) return;
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem revogar tokens', statusCode: 403 });
    }

    const { id } = req.params;
    if (!id) return res.status(400).json({ erro: 'ID do token não fornecido', statusCode: 400 });

    const prismaClient = getPrisma();
    const tokenDeletado = await prismaClient.tokenGeracao.delete({ where: { id: parseInt(id) } });

    console.log(`✅ Token revogado: ${tokenDeletado.email}`);
    return res.status(200).json({ sucesso: true, mensagem: 'Token revogado com sucesso' });
  } catch (erro) {
    console.error('❌ Erro ao revogar token:', erro);
    if (erro && (erro.message || '').includes('did not initialize') || (erro && (erro.message || '').includes('prisma generate'))) {
      return res.status(503).json({ erro: 'Prisma Client não inicializado. Execute `npx prisma generate` durante o build/deploy.', statusCode: 503 });
    }
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Token não encontrado', statusCode: 404 });
    }
    return res.status(500).json({ erro: erro.message || 'Erro ao revogar token', statusCode: 500 });
  }
}

export default { gerarTokenGeracao, listarTokens, revogarToken };
