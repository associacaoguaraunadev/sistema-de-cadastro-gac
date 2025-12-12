import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function fazerHash(texto) { return crypto.createHash('sha256').update(texto).digest('hex'); }
export function gerarTokenRecuperacao() { return crypto.randomBytes(16).toString('hex'); }
export function calcularExpiracaoRecuperacao() { const data = new Date(); data.setHours(data.getHours() + 2); return data; }

export async function solicitarRecuperacao(email) {
  try {
    if (!email || !email.includes('@')) throw new Error('Email inválido');
    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    if (!usuario) throw new Error('Se esse email existe em nossa base, você receberá um link de recuperação');
    const tokenRaw = gerarTokenRecuperacao();
    const tokenHash = fazerHash(tokenRaw);
    const dataExpiracao = calcularExpiracaoRecuperacao();
    await prisma.usuario.update({ where: { id: usuario.id }, data: { tokenRecuperacao: tokenHash, expiracaoToken: dataExpiracao } });
    return { email: usuario.email, token: tokenRaw, url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/redefinir-senha/${tokenRaw}`, expiracaoMinutos: 120 };
  } catch (erro) { console.error('Erro ao solicitar recuperação:', erro); throw erro; }
}

export async function validarTokenRecuperacao(email, token) {
  try {
    if (!email || !token) throw new Error('Email e token são obrigatórios');
    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    if (!usuario) throw new Error('Usuário não encontrado');
    const tokenHash = fazerHash(token);
    if (usuario.tokenRecuperacao !== tokenHash) throw new Error('Token inválido');
    if (!usuario.expiracaoToken || usuario.expiracaoToken < new Date()) throw new Error('Token expirado');
    return { id: usuario.id, email: usuario.email, nome: usuario.nome, valido: true };
  } catch (erro) { console.error('Erro ao validar token:', erro); throw erro; }
}

export async function redefinirSenha(email, token, novaSenha) {
  try {
    const usuario = await validarTokenRecuperacao(email, token);
    if (!novaSenha || novaSenha.length < 8) throw new Error('Senha deve ter pelo menos 8 caracteres');
    const senhaHash = Buffer.from(novaSenha).toString('base64');
    await prisma.usuario.update({ where: { id: usuario.id }, data: { senha: senhaHash, tokenRecuperacao: null, expiracaoToken: null } });
    return { sucesso: true, mensagem: 'Senha redefinida com sucesso' };
  } catch (erro) { console.error('Erro ao redefinir senha:', erro); throw erro; }
}

export async function limparTokensExpirados() { try { const agora = new Date(); const resultado = await prisma.usuario.updateMany({ where: { expiracaoToken: { lt: agora } }, data: { tokenRecuperacao: null, expiracaoToken: null } }); return resultado.count; } catch (erro) { console.error('Erro ao limpar tokens expirados:', erro); throw erro; } }

export default { gerarTokenRecuperacao, calcularExpiracaoRecuperacao, solicitarRecuperacao, validarTokenRecuperacao, redefinirSenha, limparTokensExpirados };
