/**
 * Serviço para gerenciar Tokens de Recuperação de Senha
 * Permite criar, validar e redefinir senha com segurança
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Hash seguro de uma string (usar bcrypt em produção)
 * @param {string} texto Texto a fazer hash
 * @returns {string} Hash do texto
 */
function fazerHash(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

/**
 * Gera um token aleatório seguro
 * @returns {string} Token de 32 caracteres hexadecimais
 */
export function gerarTokenRecuperacao() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Calcula data de expiração (padrão: 2 horas)
 * @returns {Date} Data de expiração
 */
export function calcularExpiracaoRecuperacao() {
  const data = new Date();
  data.setHours(data.getHours() + 2);
  return data;
}

/**
 * Solicita recuperação de senha
 * @param {string} email Email do usuário
 * @returns {Object} Token e URL para recuperação
 */
export async function solicitarRecuperacao(email) {
  try {
    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!usuario) {
      // Não revelar se email existe (segurança)
      throw new Error('Se esse email existe em nossa base, você receberá um link de recuperação');
    }

    // Gerar token
    const tokenRaw = gerarTokenRecuperacao();
    const tokenHash = fazerHash(tokenRaw);
    const dataExpiracao = calcularExpiracaoRecuperacao();

    // Salvar no banco
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tokenRecuperacao: tokenHash,
        expiracaoToken: dataExpiracao
      }
    });

    return {
      email: usuario.email,
      token: tokenRaw,
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/redefinir-senha/${tokenRaw}`,
      expiracaoMinutos: 120
    };
  } catch (erro) {
    console.error('Erro ao solicitar recuperação:', erro);
    throw erro;
  }
}

/**
 * Valida um token de recuperação
 * @param {string} email Email do usuário
 * @param {string} token Token a validar
 * @returns {Object} Dados do usuário se válido
 */
export async function validarTokenRecuperacao(email, token) {
  try {
    if (!email || !token) {
      throw new Error('Email e token são obrigatórios');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Validar token
    const tokenHash = fazerHash(token);
    
    if (usuario.tokenRecuperacao !== tokenHash) {
      throw new Error('Token inválido');
    }

    if (!usuario.expiracaoToken || usuario.expiracaoToken < new Date()) {
      throw new Error('Token expirado');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      valido: true
    };
  } catch (erro) {
    console.error('Erro ao validar token:', erro);
    throw erro;
  }
}

/**
 * Redefine a senha do usuário
 * @param {string} email Email do usuário
 * @param {string} token Token de recuperação
 * @param {string} novaSenha Nova senha
 * @returns {Object} Resultado da operação
 */
export async function redefinirSenha(email, token, novaSenha) {
  try {
    // Validar token
    const usuario = await validarTokenRecuperacao(email, token);

    // Validar nova senha
    if (!novaSenha || novaSenha.length < 8) {
      throw new Error('Senha deve ter pelo menos 8 caracteres');
    }

    // Hash da nova senha (usar bcrypt em produção!)
    const senhaHash = Buffer.from(novaSenha).toString('base64');

    // Atualizar senha e limpar token
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: senhaHash,
        tokenRecuperacao: null,
        expiracaoToken: null
      }
    });

    return {
      sucesso: true,
      mensagem: 'Senha redefinida com sucesso'
    };
  } catch (erro) {
    console.error('Erro ao redefinir senha:', erro);
    throw erro;
  }
}

/**
 * Limpa tokens expirados (pode ser chamado periodicamente)
 * @returns {number} Quantidade de tokens limpos
 */
export async function limparTokensExpirados() {
  try {
    const agora = new Date();

    const resultado = await prisma.usuario.updateMany({
      where: {
        expiracaoToken: { lt: agora }
      },
      data: {
        tokenRecuperacao: null,
        expiracaoToken: null
      }
    });

    return resultado.count;
  } catch (erro) {
    console.error('Erro ao limpar tokens expirados:', erro);
    throw erro;
  }
}

export default {
  gerarTokenRecuperacao,
  calcularExpiracaoRecuperacao,
  solicitarRecuperacao,
  validarTokenRecuperacao,
  redefinirSenha,
  limparTokensExpirados
};
