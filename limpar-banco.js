#!/usr/bin/env node

/**
 * 🗑️ Script para limpar dados do Supabase via SQL direto
 * Executa comandos SQL para deletar todos os dados
 */

import { createRequire } from 'module';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client/index.js');

const prisma = new PrismaClient();

async function limparBancoDados() {
  try {
    console.log('\n🗑️  LIMPANDO BANCO DE DADOS DO SUPABASE\n');
    console.log('═'.repeat(60));

    // Step 1: Desabilitar constraints para deletar com sucesso
    console.log('\n📋 STEP 1: Preparando banco para limpeza...');
    
    try {
      // Delete all Pessoa records (respeitando constraint)
      console.log('   Deletando pessoas...');
      const pessoasDelete = await prisma.pessoa.deleteMany({});
      console.log(`   ✅ ${pessoasDelete.count} pessoas removidas`);
    } catch (erro) {
      console.log(`   ⚠️  Erro ao deletar pessoas (ignorando): ${erro.message.substring(0, 100)}`);
    }

    try {
      // Delete all Usuario records
      console.log('   Deletando usuários...');
      const usuariosDelete = await prisma.usuario.deleteMany({});
      console.log(`   ✅ ${usuariosDelete.count} usuários removidos`);
    } catch (erro) {
      console.log(`   ⚠️  Erro ao deletar usuários (ignorando): ${erro.message.substring(0, 100)}`);
    }

    // Step 2: Verificar se banco está limpo
    console.log('\n📋 STEP 2: Verificando limpeza...');
    
    const usuariosCount = await prisma.usuario.count();
    const pessoasCount = await prisma.pessoa.count();

    console.log(`   Usuários no banco: ${usuariosCount}`);
    console.log(`   Pessoas no banco: ${pessoasCount}`);

    if (usuariosCount === 0 && pessoasCount === 0) {
      console.log('\n✨ BANCO DE DADOS LIMPO COM SUCESSO!');
      console.log('\n═'.repeat(60));
      console.log('\nPróximo passo: execute "node seed.js" para criar dados de teste');
      console.log('\n');
    } else {
      console.log('\n⚠️  Ainda há dados no banco. Tentando limpeza alternativa...\n');
      
      // Tentar limpeza via raw query
      try {
        console.log('   Executando DELETE direto...');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Pessoa" CASCADE;');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE "Usuario" CASCADE;');
        console.log('   ✅ Limpeza via TRUNCATE concluída!');
        console.log('\n✨ BANCO DE DADOS LIMPO COM SUCESSO!');
        console.log('═'.repeat(60));
        console.log('\nPróximo passo: execute "node seed.js" para criar dados de teste\n');
      } catch (erro) {
        console.error('\n❌ Erro ao executar TRUNCATE:', erro.message);
        console.log('\n⚠️  Sugestão: Acesse https://supabase.com');
        console.log('   1. Vá em SQL Editor');
        console.log('   2. Execute:');
        console.log('      TRUNCATE TABLE "Pessoa" CASCADE;');
        console.log('      TRUNCATE TABLE "Usuario" CASCADE;');
      }
    }

  } catch (erro) {
    console.error('\n❌ ERRO NA LIMPEZA:', erro.message);
    console.error('\nDicas:');
    console.error('1. Verifique se as credenciais do Supabase estão corretas em .env');
    console.error('2. Verifique se o projeto existe em https://supabase.com');
    console.error('3. Tente limpar manualmente via SQL Editor do Supabase');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

limparBancoDados();
