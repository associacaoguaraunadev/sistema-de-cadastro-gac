import { PrismaClient } from '@prisma/client';
import { validarDadosPessoa, validarCPF } from '../middleware/validacao.js';
import { tratarErroAssincrono } from '../middleware/manipuladorErro.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

function extrairToken(req) {
  const cabecalhoAuth = req.headers['authorization'];
  return cabecalhoAuth && cabecalhoAuth.split(' ')[1];
}

function verificarAutenticacao(token) {
  if (!token) throw new Error('Token necessário');
  return jwt.verify(token, process.env.JWT_SECRET);
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
    const token = extrairToken(req);
    const usuario = verificarAutenticacao(token);
    const { id } = req.query;

    if (req.method === 'GET') {
      const pessoa = await prisma.pessoa.findFirst({
        where: {
          id: parseInt(id),
          usuarioId: usuario.id
        }
      });

      if (!pessoa) {
        return res.status(404).json({ erro: 'Pessoa não encontrada' });
      }

      return res.json(pessoa);
    }

    if (req.method === 'PATCH') {
      const pessoa = await prisma.pessoa.findFirst({
        where: {
          id: parseInt(id),
          usuarioId: usuario.id
        }
      });

      if (!pessoa) {
        return res.status(404).json({ erro: 'Pessoa não encontrada' });
      }

      if (req.body.cpf && req.body.cpf !== pessoa.cpf) {
        if (!validarCPF(req.body.cpf)) {
          return res.status(400).json({ erro: 'CPF inválido' });
        }

        const cpfExistente = await prisma.pessoa.findFirst({
          where: {
            cpf: req.body.cpf,
            NOT: { id: pessoa.id }
          }
        });

        if (cpfExistente) {
          return res.status(409).json({ erro: 'CPF já cadastrado para outra pessoa' });
        }
      }

      const pessoaAtualizada = await prisma.pessoa.update({
        where: { id: parseInt(id) },
        data: {
          nome: req.body.nome || pessoa.nome,
          cpf: req.body.cpf || pessoa.cpf,
          email: req.body.email !== undefined ? req.body.email : pessoa.email,
          telefone: req.body.telefone !== undefined ? req.body.telefone : pessoa.telefone,
          endereco: req.body.endereco || pessoa.endereco,
          bairro: req.body.bairro !== undefined ? req.body.bairro : pessoa.bairro,
          cidade: req.body.cidade !== undefined ? req.body.cidade : pessoa.cidade,
          estado: req.body.estado !== undefined ? req.body.estado : pessoa.estado,
          cep: req.body.cep !== undefined ? req.body.cep : pessoa.cep,
          idade: req.body.idade !== undefined ? req.body.idade : pessoa.idade,
          tipoBeneficio: req.body.tipoBeneficio || pessoa.tipoBeneficio,
          dataBeneficio: req.body.dataBeneficio ? new Date(req.body.dataBeneficio) : pessoa.dataBeneficio,
          observacoes: req.body.observacoes !== undefined ? req.body.observacoes : pessoa.observacoes,
          status: req.body.status || pessoa.status
        }
      });

      return res.json(pessoaAtualizada);
    }

    if (req.method === 'DELETE') {
      const pessoa = await prisma.pessoa.findFirst({
        where: {
          id: parseInt(id),
          usuarioId: usuario.id
        }
      });

      if (!pessoa) {
        return res.status(404).json({ erro: 'Pessoa não encontrada' });
      }

      await prisma.pessoa.delete({
        where: { id: parseInt(id) }
      });

      return res.status(204).send();
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    if (erro.message.includes('Token')) {
      return res.status(401).json({ erro: 'Token de acesso necessário' });
    }
    
    if (erro.name === 'JsonWebTokenError' || erro.name === 'TokenExpiredError') {
      return res.status(403).json({ erro: 'Token inválido ou expirado' });
    }
    
    const { status, erro: mensagem } = tratarErroAssincrono(erro);
    res.status(status).json({ erro: mensagem });
  } finally {
    await prisma.$disconnect();
  }
}
