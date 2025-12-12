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
    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn'],
      datasources: { db: { url: dbUrl } }
    });
  }
  return prisma;
}

/**
 * POST /api/autenticacao/token/gerar
 * Gera um novo token de acesso para um email
 * Apenas admins podem gerar tokens
 */
export async function gerarTokenGeracao(req, res) {
  try {
    // Verificar autenticação e se é admin
    const usuario = verificarToken(req, res);
    if (!usuario) return;

    // Verificar se é admin
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ 
        erro: 'Apenas administradores podem gerar tokens',
        statusCode: 403
      });
    }

    const { email } = req.body || {};

    // Validar entrada
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ 
        erro: 'Email inválido',
        statusCode: 400
      });
    }

    const prismaClient = getPrisma();

    // Verificar se o email já tem um usuário
    try {
      const usuarioExistente = await prismaClient.usuario.findUnique({ where: { email } });
      if (usuarioExistente) {
        return res.status(409).json({ erro: 'Email já possui uma conta criada', statusCode: 409 });
      }
    } catch (e) {
      console.error('Erro ao verificar usuário existente (tokens):', e.stack || e.message || e);
      return res.status(500).json({ erro: 'Erro ao verificar existência de usuário' });
    }

    // Verificar se já existe token pendente para esse email (findFirst por segurança)
    try {
      const tokenPendente = await prismaClient.tokenGeracao.findFirst({ where: { email } });
      if (tokenPendente && !tokenPendente.usado && new Date(tokenPendente.dataExpiracao) > new Date()) {
        return res.status(409).json({ erro: 'Email já possui um token pendente', statusCode: 409 });
      }
    } catch (e) {
      console.error('Erro ao verificar token pendente (tokens):', e.stack || e.message || e);
      return res.status(500).json({ erro: 'Erro ao verificar tokens existentes' });
    }

    // Gerar token único com prefixo para identificação
    const tokenHex = crypto.randomBytes(32).toString('hex');
    const token = `GAC-GEN-${tokenHex}`; // Prefixo para identificar como token de geração
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 7); // 7 dias de validade

    // Salvar token no banco com upsert (email é unique no schema)
    try {
      const novoToken = await prismaClient.tokenGeracao.upsert({
        where: { email },
        update: {
          token,
          usado: false,
          dataCriacao: new Date(),
          dataExpiracao
        },
        create: {
          email,
          token,
          usado: false,
          dataCriacao: new Date(),
          dataExpiracao
        }
      });

      console.log(`✅ Token gerado para ${email}`);
      return res.status(201).json({ sucesso: true, mensagem: 'Token gerado com sucesso', token: novoToken.token, email: novoToken.email, dataExpiracao: novoToken.dataExpiracao });
    } catch (e) {
      console.error('Erro ao salvar token (tokens):', e.stack || e.message || e);
      return res.status(500).json({ erro: 'Erro ao salvar token' });
    }
  } catch (erro) {
    console.error('❌ Erro ao gerar token:', erro);
    return res.status(500).json({
      erro: erro.message || 'Erro ao gerar token',
      statusCode: 500
    });
  }
}

/**
 * GET /api/autenticacao/token/listar
 * Lista todos os tokens (pendentes e usados)
 * Apenas admins podem listar tokens
 */
export async function listarTokens(req, res) {
  try {
    // Verificar autenticação e se é admin
    const usuario = verificarToken(req, res);
    if (!usuario) return;

    // Verificar se é admin
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ 
        erro: 'Apenas administradores podem listar tokens',
        statusCode: 403
      });
    }

    const prismaClient = getPrisma();

    // Buscar todos os tokens
    const tokens = await prismaClient.tokenGeracao.findMany({
      orderBy: { dataCriacao: 'desc' }
    });

    // Separar pendentes e usados
    const agora = new Date();
    const pendentes = tokens.filter(t => !t.usado && t.dataExpiracao > agora);
    const usados = tokens.filter(t => t.usado || t.dataExpiracao <= agora);

    console.log(`✅ Listados ${tokens.length} tokens (${pendentes.length} pendentes, ${usados.length} usados)`);

    return res.status(200).json({
      sucesso: true,
      pendentes,
      usados,
      total: tokens.length
    });
  } catch (erro) {
    console.error('❌ Erro ao listar tokens:', erro);
    return res.status(500).json({
      erro: erro.message || 'Erro ao listar tokens',
      statusCode: 500
    });
  }
}

/**
 * DELETE /api/autenticacao/token/:id
 * Revoga um token
 * Apenas admins podem revogar tokens
 */
export async function revogarToken(req, res) {
  try {
    // Verificar autenticação e se é admin
    const usuario = verificarToken(req, res);
    if (!usuario) return;

    // Verificar se é admin
    if (usuario.funcao !== 'admin') {
      return res.status(403).json({ 
        erro: 'Apenas administradores podem revogar tokens',
        statusCode: 403
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        erro: 'ID do token não fornecido',
        statusCode: 400
      });
    }

    const prismaClient = getPrisma();

    // Deletar token
    const tokenDeletado = await prismaClient.tokenGeracao.delete({
      where: { id: parseInt(id) }
    });

    console.log(`✅ Token revogado: ${tokenDeletado.email}`);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Token revogado com sucesso'
    });
  } catch (erro) {
    console.error('❌ Erro ao revogar token:', erro);
    
    if (erro.code === 'P2025') {
      return res.status(404).json({
        erro: 'Token não encontrado',
        statusCode: 404
      });
    }

    return res.status(500).json({
      erro: erro.message || 'Erro ao revogar token',
      statusCode: 500
    });
  }
}
