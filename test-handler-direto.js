#!/usr/bin/env node

/**
 * 🔐 Teste Direto do Login Local
 * Testa o handler da API sem servidor HTTP
 */

import handler from './api/[...slug].js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('\n🧪 TESTANDO HANDLER DA API DIRETO\n');

// Mock de req
const mockReq = {
  method: 'POST',
  url: '/api/autenticacao/entrar',
  headers: {
    'content-type': 'application/json',
    'host': 'localhost:3001'
  },
  query: {
    slug: ['autenticacao', 'entrar']
  },
  body: {
    email: 'admin@gac.com',
    senha: 'Admin123!'
  },
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
    console.log(`✅ Resposta Status: ${resStatus}`);
    if (resStatus === 200) {
      console.log(`✅ Usuário: ${data.usuario?.email}`);
      console.log(`✅ Token recebido (${data.token?.length} caracteres)`);
    } else {
      console.log(`❌ Erro: ${data.erro}`);
    }
  },
  setHeader: () => {},
  end: () => {}
};

// Executar handler
(async () => {
  try {
    await handler(mockReq, mockRes);
    
    if (resStatus === 200) {
      console.log('\n✅ LOGIN FUNCIONANDO!\n');
      process.exit(0);
    } else {
      console.log('\n❌ LOGIN FALHOU\n');
      process.exit(1);
    }
  } catch (erro) {
    console.error('\n❌ Erro ao executar handler:', erro);
    process.exit(1);
  }
})();
