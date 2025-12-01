/**
 * API de Gerenciamento de Convites
 * POST   /api/convites           - Criar novo convite
 * GET    /api/convites           - Listar convites
 * GET    /api/convites/validar   - Validar token
 * POST   /api/convites/aceitar   - Aceitar convite e criar usuário
 * DELETE /api/convites/:id       - Cancelar convite
 */

import {
  criarConvite,
  validarConvite,
  utilizarConvite,
  listarConvites,
  cancelarConvite
} from '../servicos/inviteToken.js';
import { verificarToken } from '../middleware/autenticacao.js';

export async function POST(req, res) {
  try {
    // Verificar autenticação
    const usuarioId = verificarToken(req, res);
    if (!usuarioId) return;

    const { email, diasValidade } = req.body;

    // Validar entrada
    if (!email) {
      return res.status(400).json({ erro: 'Email é obrigatório' });
    }

    // Criar convite
    const convite = await criarConvite(usuarioId, email, diasValidade || 7);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Convite criado com sucesso',
      convite
    });
  } catch (erro) {
    console.error('Erro ao criar convite:', erro);
    return res.status(400).json({
      erro: erro.message || 'Erro ao criar convite'
    });
  }
}

export async function GET(req, res) {
  try {
    const { query } = req;

    // GET /api/convites/validar?token=abc123
    if (query.validar && query.token) {
      try {
        const convite = await validarConvite(query.token);
        return res.status(200).json({
          valido: true,
          email: convite.email
        });
      } catch (erro) {
        return res.status(400).json({
          valido: false,
          erro: erro.message
        });
      }
    }

    // GET /api/convites - Listar convites
    const usuarioId = verificarToken(req, res);
    if (!usuarioId) return;

    const page = parseInt(query.page) || 1;
    const limite = parseInt(query.limite) || 10;

    const resultado = await listarConvites(usuarioId, page, limite);

    return res.status(200).json({
      sucesso: true,
      ...resultado
    });
  } catch (erro) {
    console.error('Erro ao listar convites:', erro);
    return res.status(400).json({
      erro: erro.message || 'Erro ao listar convites'
    });
  }
}

export async function POST_ACEITAR(req, res) {
  try {
    const { token, nome, senha } = req.body;

    // Validar entrada
    if (!token || !nome || !senha) {
      return res.status(400).json({
        erro: 'Token, nome e senha são obrigatórios'
      });
    }

    // Aceitar convite
    const novoUsuario = await utilizarConvite(token, nome, senha);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Conta criada com sucesso',
      usuario: novoUsuario
    });
  } catch (erro) {
    console.error('Erro ao aceitar convite:', erro);
    return res.status(400).json({
      erro: erro.message || 'Erro ao aceitar convite'
    });
  }
}

export async function DELETE(req, res) {
  try {
    const usuarioId = verificarToken(req, res);
    if (!usuarioId) return;

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ erro: 'ID do convite é obrigatório' });
    }

    const convite = await cancelarConvite(parseInt(id));

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Convite cancelado com sucesso',
      convite
    });
  } catch (erro) {
    console.error('Erro ao cancelar convite:', erro);
    return res.status(400).json({
      erro: erro.message || 'Erro ao cancelar convite'
    });
  }
}
