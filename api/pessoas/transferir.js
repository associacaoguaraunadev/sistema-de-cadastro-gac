import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Autenticar e verificar se é admin
      const cabecalhoAuth = req.headers['authorization'];
      const token = cabecalhoAuth && cabecalhoAuth.split(' ')[1];

      if (!token) {
        return res.status(401).json({ erro: 'Token de acesso necessário' });
      }

      let usuarioLogado;
      try {
        usuarioLogado = jwt.verify(token, process.env.JWT_SECRET);
      } catch (erro) {
        return res.status(403).json({ erro: 'Token inválido ou expirado' });
      }

      // Verificar se é admin
      const admin = await prisma.usuario.findUnique({
        where: { id: usuarioLogado.id },
        select: { funcao: true }
      });

      if (!admin || admin.funcao !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas admins podem transferir pessoas.' });
      }

      const { pessoaIds, usuarioDestinoId } = req.body;

      console.log(`🔄 Transferindo ${pessoaIds?.length || 0} pessoas para usuário ${usuarioDestinoId}`);

      // Validações
      if (!pessoaIds || !Array.isArray(pessoaIds) || pessoaIds.length === 0) {
        return res.status(400).json({ erro: 'Lista de pessoas é obrigatória' });
      }

      if (!usuarioDestinoId) {
        return res.status(400).json({ erro: 'Usuário destino é obrigatório' });
      }

      // Verificar se usuário destino existe
      const usuarioDestino = await prisma.usuario.findUnique({
        where: { id: parseInt(usuarioDestinoId) }
      });

      if (!usuarioDestino) {
        return res.status(404).json({ erro: 'Usuário destino não encontrado' });
      }

      // Verificar se o admin está tentando transferir para si mesmo
      if (usuarioDestinoId === usuarioLogado.id) {
        return res.status(400).json({ erro: 'Não é possível transferir para o mesmo usuário' });
      }

      // Verificar se todas as pessoas pertencem ao admin (segurança)
      const pessoasVerificacao = await prisma.pessoa.findMany({
        where: {
          id: { in: pessoaIds.map(id => parseInt(id)) },
          usuarioId: usuarioLogado.id
        }
      });

      if (pessoasVerificacao.length !== pessoaIds.length) {
        return res.status(403).json({ erro: 'Algumas pessoas não pertencem a você' });
      }

      // Transferir pessoas
      const resultado = await prisma.pessoa.updateMany({
        where: {
          id: { in: pessoaIds.map(id => parseInt(id)) },
          usuarioId: usuarioLogado.id
        },
        data: {
          usuarioId: parseInt(usuarioDestinoId)
        }
      });

      console.log(`✅ ${resultado.count} pessoas transferidas com sucesso`);

      return res.json({
        mensagem: `${resultado.count} pessoa(s) transferida(s) com sucesso`,
        quantidade: resultado.count
      });
    }

    res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    console.error('Erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
