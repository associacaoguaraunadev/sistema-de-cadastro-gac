#!/usr/bin/env node

/**
 * 🧪 TESTE COMPLETO DO SISTEMA - VERSÃO SIMPLIFICADA
 * Testa todas as endpoints da API
 */

import handler from './api/[...slug].js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const prisma = new PrismaClient();

let token = null;
let passed = 0;
let failed = 0;

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

async function test(nome, metodo, rota, body = null, authToken = null, esperaErro = false) {
  try {
    console.log(`\n📋 ${nome}`);
    console.log(`   ${metodo} ${rota}`);

    const res = createMockRes();
    
    // Limpar query string do slug
    const pathOnly = rota.split('?')[0];
    const slug = pathOnly.split('/').filter(s => s && s.length > 0);

    const headers = {
      'host': 'localhost:3001',
      'content-type': 'application/json'
    };
    
    if (authToken) {
      headers['authorization'] = `Bearer ${authToken}`;
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

    let success;
    if (esperaErro) {
      // Esperamos um erro (4xx)
      success = res.statusCode >= 400 && res.statusCode < 500;
    } else {
      // Esperamos sucesso (2xx)
      success = res.statusCode >= 200 && res.statusCode < 300;
    }
    
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

async function runTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 TESTE COMPLETO DO SISTEMA');
  console.log('═'.repeat(80));

  // ==================== 1. AUTENTICAÇÃO ====================
  console.log('\n\n1️⃣  AUTENTICAÇÃO');
  console.log('─'.repeat(80));

  const login1 = await test('Login admin', 'POST', '/autenticacao/entrar', 
    { email: 'admin@gac.com', senha: 'Admin123!' });
  
  if (login1?.token) {
    token = login1.token;
    console.log(`   Token: ${token.substring(0, 30)}...`);
  }

  const login2 = await test('Login funcionário', 'POST', '/autenticacao/entrar',
    { email: 'funcionario@gac.com', senha: 'Func123!' });

  await test('Login falha (senha errada)', 'POST', '/autenticacao/entrar',
    { email: 'admin@gac.com', senha: 'errada' }, null, true);

  if (token) {
    await test('Get user info (/eu)', 'GET', '/autenticacao/eu', null, token);
    await test('Listar usuários (/listar)', 'GET', '/autenticacao/listar', null, token);
  }

  await test('Health check', 'GET', '/health');

  // ==================== 2. PESSOAS ====================
  console.log('\n\n2️⃣  PESSOAS - Listar, Buscar');
  console.log('─'.repeat(80));

  if (!token) {
    console.log('⏭️  Pulando testes de pessoas (sem token)');
  } else {
    await test('Listar pessoas simples', 'GET', '/pessoas', null, token);
    await test('Listar com paginação', 'GET', '/pessoas?pagina=1&limite=5', null, token);
    await test('Listar com busca', 'GET', '/pessoas?busca=João', null, token);

  }

  // ==================== 3. PESSOAS - CRUD ====================
  console.log('\n\n3️⃣  PESSOAS - CRUD (Criar, Atualizar, Deletar)');
  console.log('─'.repeat(80));

  if (!token) {
    console.log('⏭️  Pulando CRUD (sem token)');
  } else {
    // Criar pessoa com dados únicos
    const timestamp = Date.now();
    const cpf = `${Math.floor(Math.random() * 90000000000) + 10000000000}`;
    
    const novaPessoa = {
      nome: `Teste ${timestamp}`,
      cpf: cpf,
      email: `teste${timestamp}@gac.com`,
      telefone: '(85) 99999-9999',
      endereco: 'Rua Teste, 123',
      bairro: 'Teste',
      cidade: 'Fortaleza',
      estado: 'CE',
      cep: '60000-000',
      idade: 30,
      comunidade: 'Teste',
      tipoBeneficio: 'Cesta Básica'
    };

    const criada = await test('Criar pessoa', 'POST', '/pessoas', novaPessoa, token);
    
    if (criada?.id) {
      const id = criada.id;
      console.log(`   ID criado: ${id}`);

      // Get por ID
      await test(`Get pessoa ${id}`, 'GET', `/pessoas/${id}`, null, token);

      // Atualizar com PUT
      await test(`Atualizar (PUT) ${id}`, 'PUT', `/pessoas/${id}`,
        { nome: 'NOME ATUALIZADO PUT', telefone: '(85) 98888-8888' },
        token);

      // Atualizar com PATCH
      await test(`Atualizar (PATCH) ${id}`, 'PATCH', `/pessoas/${id}`,
        { observacoes: 'Atualizado via PATCH' },
        token);

      // Deletar
      await test(`Deletar pessoa ${id}`, 'DELETE', `/pessoas/${id}`, null, token);
    }
  }

  // ==================== 4. TOKENS ====================
  console.log('\n\n4️⃣  TOKENS - Gerenciamento');
  console.log('─'.repeat(80));

  console.log('⏭️  Testes de tokens pulados (não implementados no teste local)');

  // ==================== 5. ERROS ====================
  console.log('\n\n5️⃣  ERROS & SEGURANÇA');
  console.log('─'.repeat(80));

  await test('GET /pessoas sem token (401)', 'GET', '/pessoas', null, null, true);
  await test('GET /pessoas/999999 (404)', 'GET', '/pessoas/999999', null, token, true);
  await test('Rota inexistente (404)', 'GET', '/inexistente', null, null, true);

  // ==================== RESUMO ====================
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RESULTADO FINAL');
  console.log('═'.repeat(80));
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`📈 Taxa: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM!\n');
  } else {
    console.log(`⚠️  ${failed} testes falharam\n`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

runTests()
  .catch(erro => {
    console.error('\n❌ Erro fatal:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
