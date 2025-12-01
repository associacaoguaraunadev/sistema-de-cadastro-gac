#!/usr/bin/env node

/**
 * 🌱 Seed Script - Apenas 3 Usuários (1 Admin + 2 Funcionários)
 * Limpa banco e cria usuários novos
 */

import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });
dotenv.config({ path: resolve(__dirname, 'api/.env') });
dotenv.config({ path: resolve(__dirname, '.env.local') });

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('\n🌱 LIMPANDO E RECRIANDO USUÁRIOS\n');
    console.log('═'.repeat(70));

    // ⚠️ Limpar todos os dados (CUIDADO!)
    console.log('\n🗑️  Limpando dados existentes...\n');
    
    await prisma.pessoa.deleteMany({});
    console.log('   ✅ Pessoas deletadas');
    
    await prisma.inviteToken.deleteMany({});
    console.log('   ✅ Tokens de convite deletados');
    
    await prisma.usuario.deleteMany({});
    console.log('   ✅ Usuários deletados');

    console.log('\n═'.repeat(70));
    console.log('\n👤 CRIANDO 3 USUÁRIOS\n');

    // Admin
    const usuarioAdmin = await prisma.usuario.create({
      data: {
        email: 'admin@gac.com',
        senha: await bcrypt.hash('Admin@123456', 10),
        nome: 'Administrador GAC',
        funcao: 'admin',
        ativo: true
      }
    });
    console.log('✅ ADMINISTRADOR:');
    console.log(`   Email: ${usuarioAdmin.email}`);
    console.log(`   Senha: Admin@123456`);
    console.log(`   ID: ${usuarioAdmin.id}`);
    console.log(`   Função: ${usuarioAdmin.funcao}`);

    // Funcionário 1
    const usuarioFunc1 = await prisma.usuario.create({
      data: {
        email: 'funcionario1@gac.com',
        senha: await bcrypt.hash('Func@123456', 10),
        nome: 'Maria Funcionária',
        funcao: 'funcionario',
        ativo: true
      }
    });
    console.log('\n✅ FUNCIONÁRIO 1:');
    console.log(`   Email: ${usuarioFunc1.email}`);
    console.log(`   Senha: Func@123456`);
    console.log(`   ID: ${usuarioFunc1.id}`);
    console.log(`   Função: ${usuarioFunc1.funcao}`);

    // Funcionário 2
    const usuarioFunc2 = await prisma.usuario.create({
      data: {
        email: 'funcionario2@gac.com',
        senha: await bcrypt.hash('Func@654321', 10),
        nome: 'Carlos Funcionário',
        funcao: 'funcionario',
        ativo: true
      }
    });
    console.log('\n✅ FUNCIONÁRIO 2:');
    console.log(`   Email: ${usuarioFunc2.email}`);
    console.log(`   Senha: Func@654321`);
    console.log(`   ID: ${usuarioFunc2.id}`);
    console.log(`   Função: ${usuarioFunc2.funcao}`);

    console.log('\n═'.repeat(70));
    console.log('\n✨ SEED CONCLUÍDO COM SUCESSO!\n');
    console.log('📝 Usuários criados e prontos para usar.');
    console.log('💾 Banco de dados limpo e reconstruído.\n');

  } catch (erro) {
    console.error('\n❌ ERRO NO SEED:', erro.message);
    console.error('\nStack trace:');
    console.error(erro.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
