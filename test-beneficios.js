#!/usr/bin/env node

/**
 * TESTE DE BENEFÍCIOS GAC E GOVERNO
 * Testa a nova estrutura de benefícios com arrays JSON
 */

import handler from './api/[...slug].js';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'ef5c74a38f055e19631c644aca2f6a3fb646d2456d99f1b8c50ed310436ab90c';

let passed = 0;
let failed = 0;
let usuarioId = null;

function createMockRes() {
  let statusCode = 200;
  let body = null;
  
  return {
    statusCode,
    body,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
    },
    setHeader: () => {},
    end: () => {}
  };
}

async function test(nome, metodo, rota, body = null, token = null) {
  try {
    console.log(`\n📋 ${nome}`);
    console.log(`   ${metodo} ${rota}`);

    const res = createMockRes();
    
    const pathOnly = rota.split('?')[0];
    const slug = pathOnly.split('/').filter(s => s && s.length > 0);

    const headers = {
      'host': 'localhost:3001',
      'content-type': 'application/json'
    };
    
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }

    const req = {
      method: metodo,
      url: `/api${rota}`,
      headers,
      query: { slug },
      body: body || {},
      on: function(event, callback) {
        if (event === 'data' && body) {
          callback(Buffer.from(JSON.stringify(body)));
        } else if (event === 'end') {
          setTimeout(callback, 10);
        }
      }
    };

    await handler(req, res);

    const success = res.statusCode >= 200 && res.statusCode < 300;
    
    if (success) {
      console.log(`   ✅ Status: ${res.statusCode}`);
      passed++;
      return res.body;
    } else {
      console.log(`   ❌ Status: ${res.statusCode}`);
      if (res.body?.erro) console.log(`   Erro:`, res.body.erro);
      failed++;
      return null;
    }
  } catch (erro) {
    console.log(`   ❌ Erro fatal: ${erro.message}`);
    failed++;
    return null;
  }
}

// ============ EXECUTAR TESTES ============

console.log('\n🧪 INICIANDO TESTES DE BENEFÍCIOS GAC E GOVERNO\n');

// Setup: Criar usuário de teste
console.log('⚙️  Preparando ambiente de teste...');
const emailTeste = `beneficio-test-${Date.now()}@teste.com`;
let usuario = await prisma.usuario.create({
  data: {
    email: emailTeste,
    senha: 'senha123',
    nome: 'Teste Benefícios',
    funcao: 'funcionario'
  }
});
usuarioId = usuario.id;
console.log(`✅ Usuário criado: ID ${usuarioId}`);

// Gerar token para o usuário
const token = jwt.sign(
  { id: usuarioId, email: usuario.email, funcao: usuario.funcao },
  JWT_SECRET,
  { expiresIn: '24h' }
);

// Teste 1: Criar pessoa com múltiplos benefícios GAC
const pessoa1 = await test(
  'Criar pessoa com múltiplos benefícios GAC',
  'POST',
  '/pessoas',
  {
    nome: 'João Silva Tester',
    cpf: '12345678901',
    endereco: 'Rua Teste, 123',
    comunidade: 'Vila Cheba',
    beneficiosGAC: [
      {
        tipo: 'Cesta Básica',
        dataInicio: '2025-01-01',
        dataFinal: '2025-12-31'
      },
      {
        tipo: 'Auxílio Financeiro',
        dataInicio: '2025-02-01',
        dataFinal: null
      }
    ],
    beneficiosGoverno: [
      { nome: 'LOAS', valor: 676.00 },
      { nome: 'Bolsa Família', valor: 600.00 }
    ]
  },
  token
);

if (pessoa1) {
  console.log('   ✓ beneficiosGAC é array:', Array.isArray(pessoa1.beneficiosGAC));
  console.log('   ✓ Quantidade de benefícios GAC:', pessoa1.beneficiosGAC?.length);
  console.log('   ✓ beneficiosGoverno é array:', Array.isArray(pessoa1.beneficiosGoverno));
  console.log('   ✓ Quantidade de benefícios governo:', pessoa1.beneficiosGoverno?.length);
  console.log('   ✓ Primeiro benefício tem nome e valor:', pessoa1.beneficiosGoverno?.[0]?.nome && pessoa1.beneficiosGoverno?.[0]?.valor);
}

// Teste 2: Criar pessoa com benefícios vazios
const pessoa2 = await test(
  'Criar pessoa com benefícios vazios',
  'POST',
  '/pessoas',
  {
    nome: 'Maria Santos Tester',
    cpf: '98765432109',
    endereco: 'Rua Exemplo, 456',
    comunidade: 'Morro da Vila',
    beneficiosGAC: [],
    beneficiosGoverno: []
  },
  token
);

if (pessoa2) {
  console.log('   ✓ beneficiosGAC vazio:', pessoa2.beneficiosGAC?.length === 0);
  console.log('   ✓ beneficiosGoverno vazio:', pessoa2.beneficiosGoverno?.length === 0);
}

// Teste 3: Criar pessoa com apenas 1 benefício GAC
const pessoa3 = await test(
  'Criar pessoa com apenas 1 benefício GAC',
  'POST',
  '/pessoas',
  {
    nome: 'Carlos Oliveira Tester',
    cpf: '11111111111',
    endereco: 'Rua Nova, 789',
    comunidade: 'Barragem',
    beneficiosGAC: [
      {
        tipo: 'Bolsa Cultura',
        dataInicio: '2025-03-01',
        dataFinal: '2025-09-01'
      }
    ],
    beneficiosGoverno: []
  },
  token
);

if (pessoa3) {
  console.log('   ✓ Benefício criado:', pessoa3.beneficiosGAC?.[0]?.tipo);
}

// Teste 4: Criar pessoa com múltiplos benefícios do governo
const pessoa4 = await test(
  'Criar pessoa com múltiplos benefícios do governo',
  'POST',
  '/pessoas',
  {
    nome: 'Ana Costa Tester',
    cpf: '22222222222',
    endereco: 'Avenida Principal, 999',
    comunidade: 'Parque Centenario',
    beneficiosGAC: [],
    beneficiosGoverno: [
      { nome: 'LOAS', valor: 676.00 },
      { nome: 'Bolsa Família', valor: 600.00 },
      { nome: 'BPC', valor: 1412.00 },
      { nome: 'Auxílio Emergencial', valor: 200.00 }
    ]
  },
  token
);

if (pessoa4) {
  console.log('   ✓ Total de benefícios governo:', pessoa4.beneficiosGoverno?.length);
  const temBPC = pessoa4.beneficiosGoverno?.some(b => b.nome === 'BPC');
  console.log('   ✓ Inclui BPC:', temBPC);
}

// Teste 5: Benefício sem data final (contínuo)
const pessoa5 = await test(
  'Criar pessoa com benefício sem data final (contínuo)',
  'POST',
  '/pessoas',
  {
    nome: 'Pedro Lima Tester',
    cpf: '33333333333',
    endereco: 'Rua Longa, 111',
    comunidade: 'Jardim Apura',
    beneficiosGAC: [
      {
        tipo: 'Auxílio Alimentação',
        dataInicio: '2024-01-01',
        dataFinal: null
      }
    ],
    beneficiosGoverno: [
      { nome: 'Bolsa Família', valor: 600.00 }
    ]
  },
  token
);

if (pessoa5) {
  console.log('   ✓ Data final é null:', pessoa5.beneficiosGAC?.[0]?.dataFinal === null);
}

// Teste 6: Compatibilidade - criar sem informar benefícios
const pessoa6 = await test(
  'Criar pessoa sem informar benefícios (compatibilidade)',
  'POST',
  '/pessoas',
  {
    nome: 'Lucas Mendes Tester',
    cpf: '44444444444',
    endereco: 'Travessa Escura, 222',
    comunidade: 'Vila Cheba'
  },
  token
);

if (pessoa6) {
  console.log('   ✓ beneficiosGAC padrão é array:', Array.isArray(pessoa6.beneficiosGAC));
  console.log('   ✓ beneficiosGoverno padrão é array:', Array.isArray(pessoa6.beneficiosGoverno));
}

// Teste 7: Obter pessoa com benefícios
if (pessoa1) {
  const pessoaObtida = await test(
    'Obter pessoa com benefícios GAC',
    'GET',
    `/pessoas/${pessoa1.id}`,
    null,
    token
  );
  
  if (pessoaObtida) {
    console.log('   ✓ Benefícios mantidos após recuperar:', pessoaObtida.beneficiosGAC?.length > 0);
  }
}

// Teste 8: Atualizar pessoa adicionando benefícios
if (pessoa2) {
  const pessoaAtualizada = await test(
    'Atualizar pessoa adicionando benefícios',
    'PUT',
    `/pessoas/${pessoa2.id}`,
    {
      nome: 'Maria Santos Tester',
      cpf: '98765432109',
      endereco: 'Rua Exemplo, 456',
      comunidade: 'Morro da Vila',
      beneficiosGAC: [
        {
          tipo: 'Cesta Básica',
          dataInicio: '2025-04-01',
          dataFinal: null
        }
      ],
      beneficiosGoverno: [
        { nome: 'LOAS', valor: 676.00 }
      ]
    },
    token
  );
  
  if (pessoaAtualizada) {
    console.log('   ✓ Beneficios adicionados após atualização:', pessoaAtualizada.beneficiosGAC?.length > 0);
  }
}

// Cleanup
console.log('\n🧹 Limpando dados de teste...');
try {
  await prisma.pessoa.deleteMany({
    where: {
      usuarioId: usuarioId
    }
  });
  await prisma.usuario.delete({
    where: { id: usuarioId }
  });
  console.log('✅ Limpeza concluída');
} catch (e) {
  console.log('⚠️  Erro na limpeza:', e.message);
}

// Resultado final
console.log('\n' + '='.repeat(60));
console.log('📊 RESULTADO FINAL DOS TESTES DE BENEFÍCIOS');
console.log('='.repeat(60));
console.log(`✓ Passou: ${passed}`);
console.log(`✗ Falhou: ${failed}`);
console.log(`📈 Taxa: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n✅ TODOS OS TESTES DE BENEFÍCIOS PASSARAM!');
} else {
  console.log(`\n❌ ${failed} TESTE(S) FALHARAM`);
}

console.log('');
await prisma.$disconnect();
process.exit(failed > 0 ? 1 : 0);
