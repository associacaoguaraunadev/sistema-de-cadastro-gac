import { PrismaClient } from '@prisma/client';
import { validarDadosPessoa, validarCPF } from '../middleware/validacao.js';
import { tratarErroAssincrono } from '../middleware/manipuladorErro.js';
import jwt from 'jsonwebtoken';

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
  const prisma = new PrismaClient();
  
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
      const { pagina = 1, limite = 10, busca = '', status = 'ativo', filtros = null } = req.query;
      
      const pular = (parseInt(pagina) - 1) * parseInt(limite);
      
      const onde = {
        usuarioId: usuario.id,
        status: status || undefined
      };

      if (busca) {
        const buscaNormalizada = normalizarTexto(busca);
        onde.OR = [
          { nome: { contains: buscaNormalizada, mode: 'insensitive' } },
          { cpf: { contains: normalizarCPF(busca) } },
          { email: { contains: buscaNormalizada, mode: 'insensitive' } },
          { telefone: { contains: buscaNormalizada, mode: 'insensitive' } },
          { endereco: { contains: buscaNormalizada, mode: 'insensitive' } },
          { bairro: { contains: buscaNormalizada, mode: 'insensitive' } },
          { cidade: { contains: buscaNormalizada, mode: 'insensitive' } },
          { estado: { contains: buscaNormalizada, mode: 'insensitive' } },
          { cep: { contains: normalizarCEP(busca) } },
          { comunidade: { contains: buscaNormalizada, mode: 'insensitive' } },
          { tipoBeneficio: { contains: buscaNormalizada, mode: 'insensitive' } },
          { observacoes: { contains: buscaNormalizada, mode: 'insensitive' } }
        ];
      }

      // Processar filtros avançados
      if (filtros) {
        try {
          const config = JSON.parse(filtros);
          const { filtros: campos, operador = 'E' } = config;
          
          if (campos && Object.keys(campos).length > 0) {
            const condicoes = Object.entries(campos).map(([campo, config]) => {
              const { valor, operador: op } = config;
              if (!valor) return null;
              
              const mapeoCampo = {
                'nome': 'nome',
                'email': 'email',
                'cpf': 'cpf',
                'telefone': 'telefone',
                'tipoBeneficio': 'tipoBeneficio',
                'endereco': 'endereco',
                'bairro': 'bairro',
                'cidade': 'cidade',
                'estado': 'estado',
                'cep': 'cep',
                'dataNascimento': 'dataNascimento',
                'observacoes': 'observacoes'
              };
              
              const campoMapeado = mapeoCampo[campo];
              if (!campoMapeado) return null;
              
              // Normalizar o valor de busca de acordo com o campo
              let valorNormalizado = valor;
              if (campo === 'cpf') {
                valorNormalizado = normalizarCPF(valor);
              } else if (campo === 'estado') {
                valorNormalizado = valor.toUpperCase();
              } else if (campo === 'email') {
                valorNormalizado = normalizarTexto(valor).toLowerCase();
              } else if (campo === 'telefone') {
                valorNormalizado = normalizarTelefone(valor);
              } else if (campo === 'cep') {
                valorNormalizado = normalizarCEP(valor);
              } else {
                valorNormalizado = normalizarTexto(valor);
              }
              
              const condicao = {};
              
              switch (op) {
                case 'exato':
                  condicao[campoMapeado] = { equals: valorNormalizado, mode: 'insensitive' };
                  break;
                case 'comeca':
                  condicao[campoMapeado] = { startsWith: valorNormalizado, mode: 'insensitive' };
                  break;
                case 'termina':
                  condicao[campoMapeado] = { endsWith: valorNormalizado, mode: 'insensitive' };
                  break;
                case 'igual': // para datas
                  condicao[campoMapeado] = new Date(valorNormalizado);
                  break;
                case 'antes':
                  condicao[campoMapeado] = { lt: new Date(valorNormalizado) };
                  break;
                case 'depois':
                  condicao[campoMapeado] = { gt: new Date(valorNormalizado) };
                  break;
                default: // 'contem'
                  condicao[campoMapeado] = { contains: valorNormalizado, mode: 'insensitive' };
              }
              
              return condicao;
            }).filter(Boolean);
            
            if (condicoes.length > 0) {
              if (operador === 'OU') {
                onde.OR = condicoes;
              } else {
                // Para AND, usar a sintaxe correta do Prisma
                onde.AND = condicoes;
              }
            }
          }
        } catch (erro) {
          console.error('Erro ao processar filtros avançados:', erro);
        }
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

      const cpfNormalizado = normalizarCPF(req.body.cpf);
      const cpfExistente = await prisma.pessoa.findFirst({
        where: { cpf: cpfNormalizado }
      });

      if (cpfExistente) {
        return res.status(409).json({ erro: 'Pessoa com este CPF já cadastrada' });
      }

      const pessoa = await prisma.pessoa.create({
        data: {
          nome: normalizarNome(req.body.nome),
          cpf: cpfNormalizado,
          email: req.body.email ? normalizarTexto(req.body.email).toLowerCase() : null,
          telefone: req.body.telefone ? normalizarTelefone(req.body.telefone) : null,
          endereco: normalizarNome(req.body.endereco),
          bairro: req.body.bairro ? normalizarNome(req.body.bairro) : null,
          cidade: req.body.cidade ? normalizarNome(req.body.cidade) : null,
          estado: req.body.estado ? req.body.estado.toUpperCase() : null,
          cep: req.body.cep ? normalizarCEP(req.body.cep) : null,
          idade: req.body.idade || null,
          comunidade: req.body.comunidade ? normalizarTexto(req.body.comunidade) : null,
          tipoBeneficio: normalizarNome(req.body.tipoBeneficio),
          dataBeneficio: req.body.dataBeneficio ? new Date(req.body.dataBeneficio) : null,
          observacoes: req.body.observacoes ? normalizarTexto(req.body.observacoes) : null,
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
  }
}
