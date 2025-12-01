#!/usr/bin/env node

/**
 * 🔍 Script de Diagnóstico Completo
 * Testa toda a chain de autenticação: Frontend → API → Database
 */

import axios from 'axios';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

console.log('\n' + '═'.repeat(80));
console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE AUTENTICAÇÃO');
console.log('═'.repeat(80) + '\n');

async function testDbConnection() {
  console.log('📊 [1/4] Testando Banco de Dados...');
  const prisma = new PrismaClient({
    log: []
  });

  try {
    const resultado = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Banco de dados conectado');
    
    const usuarioCount = await prisma.usuario.count();
    console.log(`   ✅ Usuários no banco: ${usuarioCount}`);
    
    if (usuarioCount === 0) {
      console.log('   ⚠️  Nenhum usuário encontrado. Execute: npm run seed');
      return false;
    }
    
    const usuarios = await prisma.usuario.findMany({
      select: { email: true, funcao: true },
      take: 5
    });
    console.log(`   📋 Usuários disponíveis:`);
    usuarios.forEach(u => console.log(`      - ${u.email} (${u.funcao})`));
    
    return true;
  } catch (erro) {
    console.error('   ❌ Erro ao conectar banco:', erro.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function testApiEndpoint() {
  console.log('\n📡 [2/4] Testando Endpoint /api/health...');
  
  try {
    const resposta = await axios.get(`${API_URL}/health`, {
      timeout: 5000
    });
    console.log('   ✅ API respondendo');
    console.log(`   Status: ${resposta.status}`);
    return true;
  } catch (erro) {
    console.error('   ❌ API não respondendo:', erro.message);
    console.error(`   URL testada: ${API_URL}/health`);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 [3/4] Testando Login (admin@gac.com)...');
  
  try {
    const resposta = await axios.post(`${API_URL}/autenticacao/entrar`, {
      email: 'admin@gac.com',
      senha: 'Admin123!'
    }, {
      timeout: 5000
    });
    
    console.log('   ✅ Login bem-sucedido!');
    console.log(`   Status: ${resposta.status}`);
    console.log(`   Token recebido: ${resposta.data.token ? 'SIM' : 'NÃO'}`);
    console.log(`   Usuário: ${resposta.data.usuario.email}`);
    return resposta.data.token;
  } catch (erro) {
    console.error('   ❌ Erro no login:', erro.message);
    if (erro.response?.status === 404) {
      console.error('   ⚠️  404! A rota não está sendo encontrada.');
      console.error('   Verifique:');
      console.error('      1. vercel.json tem rewrites?');
      console.error('      2. API_URL está correto?');
      console.error(`      3. URL testada: ${API_URL}/autenticacao/entrar`);
    }
    if (erro.response?.data) {
      console.error(`   Resposta do servidor:`, erro.response.data);
    }
    return null;
  }
}

async function testListaPessoas(token) {
  console.log('\n👥 [4/4] Testando GET /api/pessoas com autenticação...');
  
  if (!token) {
    console.log('   ⏭️  Pulado (sem token do login anterior)');
    return false;
  }

  try {
    const resposta = await axios.get(`${API_URL}/pessoas`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    
    console.log('   ✅ Lista de pessoas obtida!');
    console.log(`   Status: ${resposta.status}`);
    console.log(`   Total de pessoas: ${resposta.data.length}`);
    return true;
  } catch (erro) {
    console.error('   ❌ Erro ao obter lista:', erro.message);
    if (erro.response?.data) {
      console.error(`   Resposta:`, erro.response.data);
    }
    return false;
  }
}

async function main() {
  const db = await testDbConnection();
  const api = await testApiEndpoint();
  const token = await testLogin();
  const pessoas = await testListaPessoas(token);

  console.log('\n' + '═'.repeat(80));
  console.log('📋 RESUMO');
  console.log('═'.repeat(80));
  console.log(`✅ Banco de Dados: ${db ? 'OK' : 'ERRO'}`);
  console.log(`✅ API Disponível: ${api ? 'OK' : 'ERRO'}`);
  console.log(`✅ Login Funciona: ${token ? 'OK' : 'ERRO'}`);
  console.log(`✅ Lista Pessoas: ${pessoas ? 'OK' : 'N/A'}`);
  
  if (db && api && token && pessoas) {
    console.log('\n🎉 SISTEMA TOTALMENTE FUNCIONAL!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os erros acima.\n');
    process.exit(1);
  }
}

main().catch(erro => {
  console.error('\n❌ Erro fatal:', erro);
  process.exit(1);
});
