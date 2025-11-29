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
    if (req.method === 'GET') {
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
        return res.status(403).json({ erro: 'Acesso negado. Apenas admins podem listar usuários.' });
      }

      console.log(`👥 Listando usuários para transferência`);

      const usuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          email: true,
          nome: true,
          funcao: true,
          ativo: true
        },
        where: {
          ativo: true
        },
        orderBy: {
          nome: 'asc'
        }
      });

      console.log(`✅ ${usuarios.length} usuários encontrados`);
      return res.json(usuarios);
    }

    res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    console.error('Erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
