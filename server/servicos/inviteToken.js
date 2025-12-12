import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function gerarToken() { return crypto.randomBytes(16).toString('hex'); }
export function calcularDataExpiracao(diasValidade = 7) { const data = new Date(); data.setDate(data.getDate() + diasValidade); return data; }

export async function criarConvite(usuarioId, email, diasValidade = 7) {
  try {
    if (!email || !email.includes('@')) throw new Error('Email inválido');
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) throw new Error('Email já cadastrado no sistema');
    const conviteAtivo = await prisma.inviteToken.findFirst({ where: { email, ativo: true, dataExpiracao: { gt: new Date() } } });
    if (conviteAtivo) throw new Error('Já existe um convite ativo para este email');
    const token = gerarToken();
    const dataExpiracao = calcularDataExpiracao(diasValidade);
    const convite = await prisma.inviteToken.create({ data: { token, email: email.toLowerCase(), usuarioId, dataExpiracao } });
    return { id: convite.id, token, email: convite.email, dataExpiracao: convite.dataExpiracao, url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/aceitar-convite/${token}` };
  } catch (erro) { console.error('Erro ao criar convite:', erro); throw erro; }
}

export async function validarConvite(token) {
  try {
    if (!token || typeof token !== 'string') throw new Error('Token inválido');
    const convite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!convite) throw new Error('Token não encontrado');
    if (!convite.ativo) throw new Error('Convite já foi utilizado');
    if (convite.dataExpiracao < new Date()) throw new Error('Convite expirado');
    return { id: convite.id, email: convite.email, valido: true };
  } catch (erro) { console.error('Erro ao validar convite:', erro); throw erro; }
}

export async function utilizarConvite(token, nome, senha) {
  try {
    const convite = await validarConvite(token);
    if (!nome || nome.trim().length < 3) throw new Error('Nome deve ter pelo menos 3 caracteres');
    if (!senha || senha.length < 8) throw new Error('Senha deve ter pelo menos 8 caracteres');
    const senhaHash = Buffer.from(senha).toString('base64');
    const novoUsuario = await prisma.usuario.create({ data: { email: convite.email, senha: senhaHash, nome: nome.trim(), funcao: 'funcionario', ativo: true } });
    await prisma.inviteToken.update({ where: { id: convite.id }, data: { ativo: false, dataUtilizado: new Date() } });
    return { id: novoUsuario.id, email: novoUsuario.email, nome: novoUsuario.nome, funcao: novoUsuario.funcao, dataCriacao: novoUsuario.dataCriacao };
  } catch (erro) { console.error('Erro ao utilizar convite:', erro); throw erro; }
}

export async function listarConvites(usuarioId, page = 1, limite = 10) {
  try {
    const skip = (page - 1) * limite;
    const convites = await prisma.inviteToken.findMany({ where: { usuarioId }, orderBy: { dataCriacao: 'desc' }, skip, take: limite, select: { id: true, email: true, ativo: true, dataCriacao: true, dataExpiracao: true, dataUtilizado: true } });
    const total = await prisma.inviteToken.count({ where: { usuarioId } });
    return { convites, paginacao: { total, pagina: page, limite, totalPaginas: Math.ceil(total / limite) } };
  } catch (erro) { console.error('Erro ao listar convites:', erro); throw erro; }
}

export async function cancelarConvite(conviteId) { try { const convite = await prisma.inviteToken.update({ where: { id: conviteId }, data: { ativo: false } }); return { id: convite.id, email: convite.email, cancelado: true }; } catch (erro) { console.error('Erro ao cancelar convite:', erro); throw erro; } }

export async function contagemConvitesAtivos(usuarioId) { try { const contador = await prisma.inviteToken.count({ where: { usuarioId, ativo: true, dataExpiracao: { gt: new Date() } } }); return contador; } catch (erro) { console.error('Erro ao contar convites:', erro); throw erro; } }

export default { gerarToken, calcularDataExpiracao, criarConvite, validarConvite, utilizarConvite, listarConvites, cancelarConvite, contagemConvitesAtivos };
