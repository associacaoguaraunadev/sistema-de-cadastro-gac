#!/usr/bin/env node

/**
 * 🧪 Teste do Endpoint de Pessoas
 */

import handler from './api/[...slug].js';

console.log('\n🧪 TESTANDO ENDPOINT /api/pessoas\n');

// Mock de req
const mockReq = {
  method: 'GET',
  url: '/api/pessoas?pagina=1&limite=50&status=ativo',
  headers: {
    'content-type': 'application/json',
    'host': 'localhost:3001',
    'authorization': '' // Será definido após login
  },
  query: {
    slug: ['pessoas'],
    pagina: '1',
    limite: '50',
    status: 'ativo'
  },
  body: {},
  on: () => {}
};

// Mock de res
let resStatus = 200;
let resData = null;

const mockRes = {
  status: function(code) {
    resStatus = code;
    return this;
  },
  json: function(data) {
    resData = data;
    console.log(`Status: ${resStatus}`);
    console.log(`Dados:`, JSON.stringify(data, null, 2));
  },
  setHeader: () => {},
  end: () => {}
};

// Primeiro fazer login para pegar token
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    // Verificar se existem pessoas no banco
    const totalPessoas = await prisma.pessoa.count();
    console.log(`📊 Total de pessoas no banco: ${totalPessoas}\n`);

    // Fazer login primeiro
    console.log('1️⃣  Fazendo login...');
    const loginReq = {
      method: 'POST',
      url: '/api/autenticacao/entrar',
      headers: { 'host': 'localhost:3001' },
      query: { slug: ['autenticacao', 'entrar'] },
      body: { email: 'admin@gac.com', senha: 'Admin123!' },
      on: function(event, callback) {
        if (event === 'end') setTimeout(callback, 10);
      }
    };

    let token = null;
    const loginRes = {
      status: function(code) { return this; },
      json: function(data) { 
        if (data.token) token = data.token;
        console.log('   ✅ Login bem-sucedido\n');
      },
      setHeader: () => {},
      end: () => {}
    };

    await handler(loginReq, loginRes);

    if (!token) {
      console.error('❌ Erro ao obter token');
      process.exit(1);
    }

    // Agora testar GET de pessoas
    console.log('2️⃣  Testando GET /pessoas');
    mockReq.headers.authorization = `Bearer ${token}`;
    
    await handler(mockReq, mockRes);

    if (resStatus === 200 && resData && Array.isArray(resData.pessoas)) {
      console.log(`\n✅ ENDPOINT DE PESSOAS FUNCIONANDO!`);
      console.log(`   Retornou ${resData.pessoas.length} pessoas de ${resData.total} total`);
      process.exit(0);
    } else {
      console.log('\n❌ ERRO NO ENDPOINT');
      process.exit(1);
    }
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
