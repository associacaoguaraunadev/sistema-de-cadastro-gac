/**
 * Serviço para gerenciar Invite Tokens
 * Permite criar, validar e utilizar tokens de convite para novos funcionários
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gera um token aleatório seguro
 * @returns {string} Token de 32 caracteres hexadecimais
 */
export function gerarToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Calcula data de expiração (padrão: 7 dias)
 * @param {number} diasValidade Número de dias válidos (default: 7)
 * @returns {Date} Data de expiração
 */
export function calcularDataExpiracao(diasValidade = 7) {
  const data = new Date();
  data.setDate(data.getDate() + diasValidade);
  return data;
}

/**
 * Cria um novo convite para um funcionário
 * @param {number} usuarioId ID do usuário admin criando o convite
 * @param {string} email Email do funcionário a ser convidado
 * @param {number} diasValidade Dias até expiração (default: 7)
 * @returns {Object} Objeto com token e dados do convite
 */
export async function criarConvite(usuarioId, email, diasValidade = 7) {
  try {
    // Validar email
    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    // Verificar se já existe usuário com esse email
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      throw new Error('Email já cadastrado no sistema');
    }

    // Verificar se já existe convite ativo para esse email
    const conviteAtivo = await prisma.inviteToken.findFirst({
      where: {
        email,
        ativo: true,
        dataExpiracao: { gt: new Date() }
      }
    });

    if (conviteAtivo) {
      throw new Error('Já existe um convite ativo para este email');
    }

    // Gerar token
    const token = gerarToken();
    const dataExpiracao = calcularDataExpiracao(diasValidade);

    // Criar inviteToken no banco
    const convite = await prisma.inviteToken.create({
      data: {
        token,
        email: email.toLowerCase(),
        usuarioId,
        dataExpiracao
      }
    });

    return {
      id: convite.id,
      token,
      email: convite.email,
      dataExpiracao: convite.dataExpiracao,
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/aceitar-convite/${token}`
    };
  } catch (erro) {
    console.error('Erro ao criar convite:', erro);
    throw erro;
  }
}

/**
 * Valida um token de convite
 * @param {string} token Token a validar
 * @returns {Object} Dados do convite se válido
 */
export async function validarConvite(token) {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token inválido');
    }

    const convite = await prisma.inviteToken.findUnique({
      where: { token }
    });

    if (!convite) {
      throw new Error('Token não encontrado');
    }

    if (!convite.ativo) {
      throw new Error('Convite já foi utilizado');
    }

    const agora = new Date();
    if (convite.dataExpiracao < agora) {
      throw new Error('Convite expirado');
    }

    return {
      id: convite.id,
      email: convite.email,
      valido: true
    };
  } catch (erro) {
    console.error('Erro ao validar convite:', erro);
    throw erro;
  }
}

/**
 * Utiliza um convite (marca como utilizado e cria novo usuário)
 * @param {string} token Token do convite
 * @param {string} nome Nome do novo funcionário
 * @param {string} senha Senha do novo funcionário
 * @returns {Object} Dados do novo usuário criado
 */
export async function utilizarConvite(token, nome, senha) {
  try {
    // Validar convite
    const convite = await validarConvite(token);

    // Validar dados
    if (!nome || nome.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres');
    }

    if (!senha || senha.length < 8) {
      throw new Error('Senha deve ter pelo menos 8 caracteres');
    }

    // Hash da senha (simplificado - use bcrypt em produção!)
    const senhaHash = Buffer.from(senha).toString('base64');

    // Criar novo usuário
    const novoUsuario = await prisma.usuario.create({
      data: {
        email: convite.email,
        senha: senhaHash,
        nome: nome.trim(),
        funcao: 'funcionario',
        ativo: true
      }
    });

    // Marcar convite como utilizado
    await prisma.inviteToken.update({
      where: { id: convite.id },
      data: {
        ativo: false,
        dataUtilizado: new Date()
      }
    });

    return {
      id: novoUsuario.id,
      email: novoUsuario.email,
      nome: novoUsuario.nome,
      funcao: novoUsuario.funcao,
      dataCriacao: novoUsuario.dataCriacao
    };
  } catch (erro) {
    console.error('Erro ao utilizar convite:', erro);
    throw erro;
  }
}

/**
 * Lista todos os convites (com paginação)
 * @param {number} usuarioId ID do usuário (admin only)
 * @param {number} page Página (default: 1)
 * @param {number} limite Itens por página (default: 10)
 * @returns {Object} Lista de convites e paginação
 */
export async function listarConvites(usuarioId, page = 1, limite = 10) {
  try {
    const skip = (page - 1) * limite;

    const convites = await prisma.inviteToken.findMany({
      where: { usuarioId },
      orderBy: { dataCriacao: 'desc' },
      skip,
      take: limite,
      select: {
        id: true,
        email: true,
        ativo: true,
        dataCriacao: true,
        dataExpiracao: true,
        dataUtilizado: true
      }
    });

    const total = await prisma.inviteToken.count({
      where: { usuarioId }
    });

    return {
      convites,
      paginacao: {
        total,
        pagina: page,
        limite,
        totalPaginas: Math.ceil(total / limite)
      }
    };
  } catch (erro) {
    console.error('Erro ao listar convites:', erro);
    throw erro;
  }
}

/**
 * Cancela um convite (desativa-o)
 * @param {number} conviteId ID do convite
 * @returns {Object} Convite cancelado
 */
export async function cancelarConvite(conviteId) {
  try {
    const convite = await prisma.inviteToken.update({
      where: { id: conviteId },
      data: { ativo: false }
    });

    return {
      id: convite.id,
      email: convite.email,
      cancelado: true
    };
  } catch (erro) {
    console.error('Erro ao cancelar convite:', erro);
    throw erro;
  }
}

/**
 * Conta convites ativos (não expirados e ainda não utilizados)
 * @param {number} usuarioId ID do usuário
 * @returns {number} Quantidade de convites ativos
 */
export async function contagemConvitesAtivos(usuarioId) {
  try {
    const contador = await prisma.inviteToken.count({
      where: {
        usuarioId,
        ativo: true,
        dataExpiracao: { gt: new Date() }
      }
    });

    return contador;
  } catch (erro) {
    console.error('Erro ao contar convites:', erro);
    throw erro;
  }
}

export default {
  gerarToken,
  calcularDataExpiracao,
  criarConvite,
  validarConvite,
  utilizarConvite,
  listarConvites,
  cancelarConvite,
  contagemConvitesAtivos
};
