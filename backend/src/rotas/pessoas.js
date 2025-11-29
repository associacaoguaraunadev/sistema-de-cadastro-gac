import express from 'express';
import { PrismaClient } from '@prisma/client';
import { autenticarToken, autorizarFuncao } from '../middleware/autenticacao.js';
import { manipuladorAssincrono } from '../middleware/manipuladorErro.js';
import { validarDadosPessoa, validarCPF } from '../middleware/validacao.js';

const rota = express.Router();
const prisma = new PrismaClient();

rota.use(autenticarToken);

rota.get('/', manipuladorAssincrono(async (req, res) => {
  const { status = 'ativo', pagina = 1, limite = 10, busca, filtros } = req.query;
  console.log(`   👥 Listando pessoas | Status: ${status} | Busca: ${busca || 'nenhuma'} | Filtros: ${filtros ? 'sim' : 'não'}`);
  
  const pular = (parseInt(pagina) - 1) * parseInt(limite);
  
  const onde = {
    usuarioId: req.usuario.id,
    status: status ? status : 'ativo'
  };

  // Array para acumular condições AND
  const condicoesAND = [];

  // Se houver busca simples, adiciona como OR em todos os campos
  if (busca) {
    condicoesAND.push({
      OR: [
        { nome: { contains: busca, mode: 'insensitive' } },
        { cpf: { contains: busca, mode: 'insensitive' } },
        { email: { contains: busca, mode: 'insensitive' } },
        { telefone: { contains: busca, mode: 'insensitive' } },
        { endereco: { contains: busca, mode: 'insensitive' } },
        { bairro: { contains: busca, mode: 'insensitive' } },
        { cidade: { contains: busca, mode: 'insensitive' } },
        { estado: { contains: busca, mode: 'insensitive' } },
        { cep: { contains: busca, mode: 'insensitive' } },
        { comunidade: { contains: busca, mode: 'insensitive' } },
        { tipoBeneficio: { contains: busca, mode: 'insensitive' } },
        { observacoes: { contains: busca, mode: 'insensitive' } }
      ]
    });
  }

  // Processar filtros avançados
  if (filtros) {
    try {
      const filtrosObj = JSON.parse(filtros);
      console.log(`   🔍 Filtros avançados recebidos:`, filtrosObj);

      // Para cada filtro avançado, adiciona uma condição AND
      Object.entries(filtrosObj).forEach(([campo, config]) => {
        if (config.valor && config.valor.trim()) {
          const condicao = {};
          
          // Tratamento especial para campos de data
          if (campo === 'dataCriacao' || campo === 'dataAtualizacao') {
            // Converter dd/mm/yyyy para busca (busca por substring na data)
            // Aceita formatos: 15/01/2024, 01/2024, 2024
            condicao[campo] = { contains: config.valor, mode: 'insensitive' };
          } else {
            // Para campos de texto, usar contains normal
            condicao[campo] = { contains: config.valor, mode: 'insensitive' };
          }
          
          condicoesAND.push(condicao);
          console.log(`   ✓ Filtro adicionado: ${campo} contém "${config.valor}"`);
        }
      });
    } catch (erro) {
      console.log(`   ⚠️ Erro ao processar filtros avançados:`, erro.message);
    }
  }

  // Se há condições AND, adicionar ao onde
  if (condicoesAND.length > 0) {
    onde.AND = condicoesAND;
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

  console.log(`   ✅ Retornando ${pessoas.length} de ${total} pessoas`);
  res.json({
    pessoas,
    total,
    pagina: parseInt(pagina),
    paginas: Math.ceil(total / parseInt(limite))
  });
}));

rota.get('/:id', manipuladorAssincrono(async (req, res) => {
  const pessoa = await prisma.pessoa.findFirst({
    where: {
      id: parseInt(req.params.id),
      usuarioId: req.usuario.id
    }
  });

  if (!pessoa) {
    return res.status(404).json({ erro: 'Pessoa não encontrada' });
  }

  res.json(pessoa);
}));

rota.post('/', manipuladorAssincrono(async (req, res) => {
  console.log(`   ➕ Criando nova pessoa: ${req.body.nome}`);
  const errosValidacao = validarDadosPessoa(req.body);
  if (errosValidacao.length > 0) {
    console.log(`   ⚠️ Validação falhou: ${errosValidacao.join(', ')}`);
    return res.status(400).json({ erros: errosValidacao });
  }

  const cpfExistente = await prisma.pessoa.findFirst({
    where: { cpf: req.body.cpf }
  });

  if (cpfExistente) {
    console.log(`   ⚠️ CPF já cadastrado: ${req.body.cpf}`);
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
      comunidade: req.body.comunidade || null,
      tipoBeneficio: req.body.tipoBeneficio,
      dataBeneficio: req.body.dataBeneficio ? new Date(req.body.dataBeneficio) : null,
      observacoes: req.body.observacoes || null,
      usuarioId: req.usuario.id
    }
  });

  console.log(`   ✅ Pessoa criada com ID: ${pessoa.id}`);
  res.status(201).json(pessoa);
}));

rota.patch('/:id', manipuladorAssincrono(async (req, res) => {
  const pessoa = await prisma.pessoa.findFirst({
    where: {
      id: parseInt(req.params.id),
      usuarioId: req.usuario.id
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
    where: { id: parseInt(req.params.id) },
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
      comunidade: req.body.comunidade !== undefined ? req.body.comunidade : pessoa.comunidade,
      tipoBeneficio: req.body.tipoBeneficio || pessoa.tipoBeneficio,
      dataBeneficio: req.body.dataBeneficio ? new Date(req.body.dataBeneficio) : pessoa.dataBeneficio,
      observacoes: req.body.observacoes !== undefined ? req.body.observacoes : pessoa.observacoes,
      status: req.body.status || pessoa.status
    }
  });

  res.json(pessoaAtualizada);
}));

rota.delete('/:id', manipuladorAssincrono(async (req, res) => {
  const pessoa = await prisma.pessoa.findFirst({
    where: {
      id: parseInt(req.params.id),
      usuarioId: req.usuario.id
    }
  });

  if (!pessoa) {
    return res.status(404).json({ erro: 'Pessoa não encontrada' });
  }

  await prisma.pessoa.delete({
    where: { id: parseInt(req.params.id) }
  });

  res.status(204).send();
}));

rota.post('/transferir', autorizarFuncao(['admin']), manipuladorAssincrono(async (req, res) => {
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
  if (usuarioDestinoId === req.usuario.id) {
    return res.status(400).json({ erro: 'Não é possível transferir para o mesmo usuário' });
  }

  // Verificar se todas as pessoas pertencem ao admin (segurança)
  const pessoasVerificacao = await prisma.pessoa.findMany({
    where: {
      id: { in: pessoaIds.map(id => parseInt(id)) },
      usuarioId: req.usuario.id
    }
  });

  if (pessoasVerificacao.length !== pessoaIds.length) {
    return res.status(403).json({ erro: 'Algumas pessoas não pertencem a você' });
  }

  // Transferir pessoas
  const resultado = await prisma.pessoa.updateMany({
    where: {
      id: { in: pessoaIds.map(id => parseInt(id)) },
      usuarioId: req.usuario.id
    },
    data: {
      usuarioId: parseInt(usuarioDestinoId)
    }
  });

  console.log(`✅ ${resultado.count} pessoas transferidas com sucesso`);

  res.json({
    mensagem: `${resultado.count} pessoa(s) transferida(s) com sucesso`,
    quantidade: resultado.count
  });
}));

export default rota;
