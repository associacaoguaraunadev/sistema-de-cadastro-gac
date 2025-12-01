#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function test() {
  console.log('\n🧪 TESTANDO API LOCAL\n');
  
  try {
    // Test 1: Health
    console.log('1️⃣  GET /health');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅', health.data);
    
    // Test 2: Login
    console.log('\n2️⃣  POST /autenticacao/entrar');
    const login = await axios.post(`${BASE_URL}/autenticacao/entrar`, {
      email: 'admin@gac.com',
      senha: 'Admin123!'
    });
    console.log('   ✅ Status:', login.status);
    console.log('   ✅ Usuário:', login.data.usuario.email);
    console.log('   ✅ Token:', login.data.token.substring(0, 20) + '...');
    
    // Test 3: Pessoas com auth
    console.log('\n3️⃣  GET /pessoas (com token)');
    const pessoas = await axios.get(`${BASE_URL}/pessoas`, {
      headers: { 'Authorization': `Bearer ${login.data.token}` }
    });
    console.log('   ✅ Total de pessoas:', pessoas.data.length);
    
    console.log('\n✅ TODOS OS TESTES PASSARAM!\n');
    process.exit(0);
  } catch (erro) {
    console.error('\n❌ ERRO:', erro.message);
    if (erro.response?.data) {
      console.error('Resposta:', erro.response.data);
    }
    process.exit(1);
  }
}

// Esperar um pouco para o servidor ficar pronto
setTimeout(test, 500);
