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

export async function solicitarRecuperacaoSenha(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ erro: 'Email é obrigatório' });
    }

    const resultado = await solicitarRecuperacao(email);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Se esse email existe em nossa base, você receberá um link de recuperação',
      debug: process.env.NODE_ENV === 'development' ? { token: resultado.token, url: resultado.url } : undefined
    });
  } catch (erro) {
    console.error('Erro ao solicitar recuperação:', erro);
    return res.status(400).json({ erro: erro.message || 'Erro ao solicitar recuperação' });
  }
}

export async function validarToken(req, res) {
  try {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ erro: 'Email e token são obrigatórios' });
    const usuario = await validarTokenRecuperacao(email, token);
    return res.status(200).json({ sucesso: true, valido: true, usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome } });
  } catch (erro) {
    console.error('Erro ao validar token:', erro);
    return res.status(400).json({ valido: false, erro: erro.message || 'Token inválido' });
  }
}

export async function redefinirSenhaHandler(req, res) {
  try {
    const { email, token, novaSenha } = req.body;
    if (!email || !token || !novaSenha) return res.status(400).json({ erro: 'Email, token e nova senha são obrigatórios' });
    const resultado = await redefinirSenha(email, token, novaSenha);
    return res.status(200).json({ sucesso: true, mensagem: resultado.mensagem });
  } catch (erro) {
    console.error('Erro ao redefinir senha:', erro);
    return res.status(400).json({ erro: erro.message || 'Erro ao redefinir senha' });
  }
}

export default { solicitarRecuperacaoSenha, validarToken, redefinirSenhaHandler };
