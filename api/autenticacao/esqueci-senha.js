import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { enviarEmailRecuperacaoSenha } from '../middleware/email.js';

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
      const { email } = req.body;
      console.log(`🔑 Solicitação de recuperação de senha: ${email}`);

      if (!email) {
        return res.status(400).json({ erro: 'Email é obrigatório' });
      }

      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) {
        // Não revelar se o email existe (por segurança)
        console.log(`ℹ️ Email não encontrado (por segurança, retornamos OK): ${email}`);
        return res.json({ mensagem: 'Se o email existe, você receberá um link de recuperação' });
      }

      // Gerar token de recuperação
      const tokenRecuperacao = jwt.sign(
        { id: usuario.id, email: usuario.email, tipo: 'recuperacao' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Fazer hash do token para armazenar
      const crypto = await import('crypto');
      const hashToken = crypto.createHash('sha256').update(tokenRecuperacao).digest('hex');
      const expiracaoToken = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Salvar hash do token no banco
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          tokenRecuperacao: hashToken,
          expiracaoToken
        }
      });

      // Preparar link de recuperação
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      const linkRecuperacao = `${frontendURL}/recuperar-senha?token=${tokenRecuperacao}`;

      // Enviar email
      try {
        await enviarEmailRecuperacaoSenha(usuario.email, usuario.nome, tokenRecuperacao, linkRecuperacao);
        console.log(`✅ Email de recuperação enviado para ${email}`);
      } catch (erro) {
        console.error(`❌ Erro ao enviar email: ${erro.message}`);
        // Mesmo com erro no email, retornar sucesso (por segurança)
      }

      return res.json({ mensagem: 'Se o email existe, você receberá um link de recuperação' });
    }

    res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    console.error('Erro:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
