#!/usr/bin/env node

/**
 * 🔍 Verificador de Conexão Supabase
 * Ajuda a diagnosticar problemas de credenciais
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('\n🔍 VERIFICADOR DE CREDENCIAIS SUPABASE\n');
console.log('═'.repeat(70));

const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!dbUrl) {
  console.log('\n❌ ERRO: DATABASE_URL não está definida em .env');
  process.exit(1);
}

console.log('\n📊 CREDENCIAIS ATUAIS:\n');

// Parse URL
try {
  const url = new URL(dbUrl);
  
  console.log('✅ URL é válida');
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port}`);
  console.log(`   Username: ${url.username}`);
  console.log(`   Database: ${url.pathname.substring(1)}`);
  console.log(`   Search Params: ${url.search}`);
  
  // Verificar se é connection pooling
  if (url.hostname.includes('pooler')) {
    console.log('\n   ✅ Usando Connection Pooling (porta 6543)');
  } else if (url.port === '5432') {
    console.log('\n   ✅ Usando Direct Connection (porta 5432)');
  }
  
  // Verificar senha
  if (!url.password) {
    console.log('\n❌ AVISO: Nenhuma senha detectada na URL');
  } else {
    console.log(`\n   Senha detectada: ${url.password.substring(0, 5)}***`);
  }
  
} catch (erro) {
  console.log(`\n❌ ERRO: URL é inválida - ${erro.message}`);
  console.log('\n💡 Dica: Certifique-se de copiar a URL completa do Supabase');
}

console.log('\n' + '═'.repeat(70));
console.log('\n📝 Para atualizar credenciais:');
console.log('   1. Acesse https://app.supabase.com');
console.log('   2. Copie a CONNECTION STRING correta');
console.log('   3. Atualize DATABASE_URL em .env');
console.log('   4. Execute: node limpar-banco.js\n');
