import { getPrismaInstance } from '../_lib/prisma-singleton.js';
import { validarDadosPessoa, validarCPF } from '../middleware/validacao.js';
import { tratarErroAssincrono } from '../middleware/manipuladorErro.js';
import jwt from 'jsonwebtoken';

let prismaInstance;

function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = getPrismaInstance();
  }
  return prismaInstance;
}

// Função para normalizar strings (trim, espaços múltiplos)
function normalizarTexto(texto) {
  if (!texto || typeof texto !== 'string') return texto;
  
  return texto
    .trim()
    .replace(/\s+/g, ' '); // Remove espaços múltiplos
}

// Função para normalizar nome (primeira letra maiúscula de cada palavra)
function normalizarNome(nome) {
  if (!nome || typeof nome !== 'string') return nome;
  
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(' ');
}

// Função para normalizar CPF (remove caracteres especiais)
function normalizarCPF(cpf) {
  if (!cpf) return cpf;
  return cpf.replace(/\D/g, '');
}

// Função para normalizar telefone
function normalizarTelefone(telefone) {
  if (!telefone) return telefone;
  return telefone.replace(/\s/g, '');
}

// Função para normalizar CEP
function normalizarCEP(cep) {
  if (!cep) return cep;
  return cep.replace(/\D/g, '');
}

function extrairToken(req) {
  const cabecalhoAuth = req.headers['authorization'];
  return cabecalhoAuth && cabecalhoAuth.split(' ')[1];
}

function verificarAutenticacao(token) {
  if (!token) throw new Error('Token necessário');
  return jwt.verify(token, process.env.JWT_SECRET);
}

export default async function handler(req, res) {
  const prisma = getPrisma();
  
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
        const cpfNormalizado = normalizarCPF(req.body.cpf);
        if (!validarCPF(cpfNormalizado)) {
          return res.status(400).json({ erro: 'CPF inválido' });
        }

        const cpfExistente = await prisma.pessoa.findFirst({
          where: {
            cpf: cpfNormalizado,
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
          nome: req.body.nome ? normalizarNome(req.body.nome) : pessoa.nome,
          cpf: req.body.cpf ? normalizarCPF(req.body.cpf) : pessoa.cpf,
          email: req.body.email !== undefined ? (req.body.email ? normalizarTexto(req.body.email).toLowerCase() : null) : pessoa.email,
          telefone: req.body.telefone !== undefined ? (req.body.telefone ? normalizarTelefone(req.body.telefone) : null) : pessoa.telefone,
          endereco: req.body.endereco ? normalizarNome(req.body.endereco) : pessoa.endereco,
          bairro: req.body.bairro !== undefined ? (req.body.bairro ? normalizarNome(req.body.bairro) : null) : pessoa.bairro,
          cidade: req.body.cidade !== undefined ? (req.body.cidade ? normalizarNome(req.body.cidade) : null) : pessoa.cidade,
          estado: req.body.estado !== undefined ? (req.body.estado ? req.body.estado.toUpperCase() : null) : pessoa.estado,
          cep: req.body.cep !== undefined ? (req.body.cep ? normalizarCEP(req.body.cep) : null) : pessoa.cep,
          idade: req.body.idade !== undefined ? req.body.idade : pessoa.idade,
          tipoBeneficio: req.body.tipoBeneficio ? normalizarNome(req.body.tipoBeneficio) : pessoa.tipoBeneficio,
          dataBeneficio: req.body.dataBeneficio ? new Date(req.body.dataBeneficio) : pessoa.dataBeneficio,
          observacoes: req.body.observacoes !== undefined ? (req.body.observacoes ? normalizarTexto(req.body.observacoes) : null) : pessoa.observacoes,
          comunidadeId: req.body.comunidadeId !== undefined ? req.body.comunidadeId : pessoa.comunidadeId,
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
  }
}
