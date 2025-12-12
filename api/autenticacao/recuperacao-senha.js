/**
 * API de Recuperação de Senha
 * POST   /api/autenticacao/recuperacao     - Solicitar recuperação
 * POST   /api/autenticacao/validar-token   - Validar token
 * POST   /api/autenticacao/redefinir-senha - Redefinir senha
 */

import {
  solicitarRecuperacao,
  validarTokenRecuperacao,
  redefinirSenha
} from '../servicos/recuperacaoSenha.js';

// Carregamento dinâmico do serviço de email para evitar falhas de import estático
let _emailSvc = null;
async function getEmailSvc() {
  if (_emailSvc) return _emailSvc;
  try {
    _emailSvc = await import('../servicos/email.js');
    return _emailSvc;
  } catch (e1) {
    try {
      _emailSvc = await import('../../server/servicos/email.js');
      return _emailSvc;
    } catch (e2) {
      console.warn('⚠️ Serviço de email não disponível, usando fallback de log.', e1?.message, e2?.message);
      _emailSvc = {
        enviarEmailRecuperacao: async (email, token) => {
          console.log(`📧 [FALLBACK-EMAIL] Código de recuperação para ${email}: ${token}`);
          return { sucesso: false, motivo: 'fallback' };
        }
      };
      return _emailSvc;
    }
  }
}

/**
 * Solicita recuperação de senha
 * POST /api/autenticacao/recuperacao
 * Body: { email }
 */
export async function solicitarRecuperacaoSenha(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ erro: 'Email é obrigatório' });
    }

    const resultado = await solicitarRecuperacao(email);

    // Tentar enviar email (não falhar a rota se envio falhar)
    try {
      const emailSvc = await getEmailSvc();
      const envio = await emailSvc.enviarEmailRecuperacao(resultado.email, resultado.token);
      if (!envio || envio.sucesso === false) {
        console.warn(`Falha no envio de email de recuperação (não bloqueante): ${envio && envio.motivo ? envio.motivo : 'sem motivo'}`);
      }
    } catch (e) {
      console.error('Erro ao enviar email de recuperação (capturado no handler):', e);
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Se esse email existe em nossa base, você receberá um link de recuperação',
      // Em ambiente de desenvolvimento retornamos token para facilitar testes
      debug: process.env.NODE_ENV === 'development' ? {
        token: resultado.token,
        url: resultado.url
      } : undefined
    });
  } catch (erro) {
    console.error('Erro ao solicitar recuperação:', erro);
    return res.status(400).json({
      erro: erro.message || 'Erro ao solicitar recuperação'
    });
  }
}

/**
 * Valida um token de recuperação
 * POST /api/autenticacao/validar-token
 * Body: { email, token }
 */
export async function validarToken(req, res) {
  try {
    const { email, token } = req.body || {};

    if (!email || !token) {
      return res.status(400).json({
        erro: 'Email e token são obrigatórios'
      });
    }

    const usuario = await validarTokenRecuperacao(email, token);

    return res.status(200).json({
      sucesso: true,
      valido: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome
      }
    });
  } catch (erro) {
    console.error('Erro ao validar token:', erro);
    return res.status(400).json({
      valido: false,
      erro: erro.message || 'Token inválido'
    });
  }
}

/**
 * Redefine a senha do usuário
 * POST /api/autenticacao/redefinir-senha
 * Body: { email, token, novaSenha }
 */
export async function redefinirSenhaHandler(req, res) {
  try {
    const { email, token, novaSenha } = req.body || {};

    if (!email || !token || !novaSenha) {
      return res.status(400).json({
        erro: 'Email, token e nova senha são obrigatórios'
      });
    }

    const resultado = await redefinirSenha(email, token, novaSenha);

    return res.status(200).json({
      sucesso: true,
      mensagem: resultado.mensagem
    });
  } catch (erro) {
    console.error('Erro ao redefinir senha:', erro);
    return res.status(400).json({
      erro: erro.message || 'Erro ao redefinir senha'
    });
  }
}

export default {
  solicitarRecuperacaoSenha,
  validarToken,
  redefinirSenhaHandler
};
