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
      const { token } = req.body;
      console.log(`🔑 Validando token de recuperação`);

      if (!token) {
        return res.status(400).json({ erro: 'Token é obrigatório' });
      }

      try {
        // Verificar assinatura do token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.tipo !== 'recuperacao') {
          console.log(`❌ Token não é de recuperação`);
          return res.status(401).json({ erro: 'Token inválido' });
        }

        const usuario = await prisma.usuario.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, nome: true, tokenRecuperacao: true, expiracaoToken: true }
        });

        if (!usuario || !usuario.tokenRecuperacao) {
          console.log(`❌ Usuário não encontrado ou token não salvo`);
          return res.status(401).json({ erro: 'Token inválido' });
        }

        // Verificar expiração
        if (new Date() > usuario.expiracaoToken) {
          console.log(`❌ Token expirado`);
          return res.status(401).json({ erro: 'Token expirado. Solicite uma nova recuperação de senha' });
        }

        // Verificar se o hash do token corresponde
        const crypto = await import('crypto');
        const hashToken = crypto.createHash('sha256').update(token).digest('hex');
        if (hashToken !== usuario.tokenRecuperacao) {
          console.log(`❌ Token não corresponde ao hash armazenado`);
          return res.status(401).json({ erro: 'Token inválido' });
        }

        console.log(`✅ Token válido para ${usuario.email}`);
        return res.json({ valido: true, email: usuario.email });
      } catch (erro) {
        if (erro.name === 'TokenExpiredError') {
          console.log(`❌ Token expirou`);
          return res.status(401).json({ erro: 'Token expirado. Solicite uma nova recuperação de senha' });
        }
        if (erro.name === 'JsonWebTokenError') {
          console.log(`❌ Token inválido`);
          return res.status(401).json({ erro: 'Token inválido' });
        }
        throw erro;
      }
    }

    res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    console.error('Erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
