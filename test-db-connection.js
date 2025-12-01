#!/usr/bin/env node

import { createRequire } from 'module';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: resolve(__dirname, '.env') });

async function testConnection() {
  console.log('\n🔌 TESTANDO CONEXÃO COM O BANCO DE DADOS\n');
  console.log('═'.repeat(60));
  
  console.log('\n📋 Variáveis de Ambiente:');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
  console.log(`DIRECT_URL: ${process.env.DIRECT_URL?.substring(0, 50)}...`);
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });

  try {
    console.log('\n⏳ Tentando conectar...');
    
    // Teste de conexão
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    
    console.log('\n✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
    console.log(`Resultado: ${JSON.stringify(result)}`);
    
    // Contar usuários
    const userCount = await prisma.usuario.count();
    console.log(`\n👥 Usuários no banco: ${userCount}`);
    
    // Contar pessoas
    const pessoasCount = await prisma.pessoa.count();
    console.log(`👤 Pessoas no banco: ${pessoasCount}`);
    
  } catch (error) {
    console.error('\n❌ ERRO NA CONEXÃO:');
    console.error(`Mensagem: ${error.message}`);
    console.error(`Código: ${error.code}`);
    console.error(`\nDetalhes completos:`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    console.log('\n═'.repeat(60) + '\n');
  }
}

testConnection();
