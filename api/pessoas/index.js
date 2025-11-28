import { PrismaClient } from '@prisma/client';
import { validarDadosPessoa, validarCPF } from '../../middleware/validacao.js';
import { tratarErroAssincrono } from '../../middleware/manipuladorErro.js';
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

    if (req.method === 'GET') {
      const { pagina = 1, limite = 10, busca = '', status = 'ativo' } = req.query;
      
      const pular = (parseInt(pagina) - 1) * parseInt(limite);
      
      const onde = {
        usuarioId: usuario.id,
        status: status || undefined
      };

      if (busca) {
        onde.OR = [
          { nome: { contains: busca, mode: 'insensitive' } },
          { cpf: { contains: busca } },
          { email: { contains: busca, mode: 'insensitive' } }
        ];
      }

      const [pessoas, total] = await Promise.all([
        prisma.pessoa.findMany({
          where: onde,
          skip: pular,
          take: parseInt(limite),
          orderBy: { dataCriacao: 'desc' }
        }),
        prisma.pessoa.count({ where: onde })
      ]);

      return res.json({
        pessoas,
        total,
        pagina: parseInt(pagina),
        paginas: Math.ceil(total / parseInt(limite))
      });
    }

    if (req.method === 'POST') {
      const errosValidacao = validarDadosPessoa(req.body);
      if (errosValidacao.length > 0) {
        return res.status(400).json({ erros: errosValidacao });
      }

      const cpfExistente = await prisma.pessoa.findFirst({
        where: { cpf: req.body.cpf }
      });

      if (cpfExistente) {
        return res.status(409).json({ erro: 'Pessoa com este CPF já cadastrada' });
      }

      const pessoa = await prisma.pessoa.create({
        data: {
          nome: req.body.nome,
          cpf: req.body.cpf,
          email: req.body.email || null,
          telefone: req.body.telefone || null,
          endereco: req.body.endereco,
          bairro: req.body.bairro || null,
          cidade: req.body.cidade || null,
          estado: req.body.estado || null,
          cep: req.body.cep || null,
          idade: req.body.idade || null,
          tipoBeneficio: req.body.tipoBeneficio,
          dataBeneficio: req.body.dataBeneficio ? new Date(req.body.dataBeneficio) : null,
          observacoes: req.body.observacoes || null,
          usuarioId: usuario.id
        }
      });

      return res.status(201).json(pessoa);
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
