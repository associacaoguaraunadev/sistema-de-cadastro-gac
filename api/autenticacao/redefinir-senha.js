import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { enviarEmailConfirmacaoResetado } from '../middleware/email.js';

const prisma = new PrismaClient();

// Função para validar força da senha
function validarSenha(senha) {
  const erros = [];

  if (senha.length < 8) {
    erros.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (!/[A-Z]/.test(senha)) {
    erros.push('Senha deve conter pelo menos 1 letra maiúscula');
  }

  if (!/[a-z]/.test(senha)) {
    erros.push('Senha deve conter pelo menos 1 letra minúscula');
  }

  if (!/[0-9]/.test(senha)) {
    erros.push('Senha deve conter pelo menos 1 número');
  }

  if (!/[!@#$%^&*]/.test(senha)) {
    erros.push('Senha deve conter pelo menos 1 caractere especial (!@#$%^&*)');
  }

  return erros;
}

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
      const { token, novaSenha } = req.body;
      console.log(`🔑 Tentando redefinir senha`);

      if (!token || !novaSenha) {
        return res.status(400).json({ erro: 'Token e nova senha são obrigatórios' });
      }

      // Validar força da senha
      const errosSenha = validarSenha(novaSenha);
      if (errosSenha.length > 0) {
        return res.status(400).json({ erros: errosSenha });
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
          console.log(`❌ Usuário não encontrado`);
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
          console.log(`❌ Token não corresponde`);
          return res.status(401).json({ erro: 'Token inválido' });
        }

        // Criptografar nova senha
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        // Atualizar senha e limpar token de recuperação
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            senha: senhaHash,
            tokenRecuperacao: null,
            expiracaoToken: null
          }
        });

        // Enviar email de confirmação
        try {
          await enviarEmailConfirmacaoResetado(usuario.email, usuario.nome);
        } catch (erro) {
          console.error(`⚠️ Erro ao enviar email de confirmação: ${erro.message}`);
          // Continuar mesmo se email falhar
        }

        console.log(`✅ Senha redefinida para ${usuario.email}`);
        return res.json({ mensagem: 'Senha redefinida com sucesso!' });
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
