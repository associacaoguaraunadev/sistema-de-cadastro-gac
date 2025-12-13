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
    console.log('\n👤 CRIANDO 6 USUÁRIOS (2 ADM + 4 FUNCIONÁRIOS)\n');

    // Admins (mesma senha para ambos)
    const senhaAdmin = 'Gac@admin!@';

    const admin1 = await prisma.usuario.create({
      data: {
        email: 'admin1@gac.com',
        senha: await bcrypt.hash(senhaAdmin, 10),
        nome: 'Administrador GAC 1',
        funcao: 'admin',
        ativo: true
      }
    });

    const admin2 = await prisma.usuario.create({
      data: {
        email: 'admin2@gac.com',
        senha: await bcrypt.hash(senhaAdmin, 10),
        nome: 'Administrador GAC 2',
        funcao: 'admin',
        ativo: true
      }
    });

    console.log('✅ ADMINISTRADORES:');
    console.log(`   Email: ${admin1.email}  Senha: ${senhaAdmin}`);
    console.log(`   Email: ${admin2.email}  Senha: ${senhaAdmin}`);

    // Funcionários
    const funcionarios = [
      { email: 'func1@gac.com', nome: 'Ana Func', senha: 'Func@1234!' },
      { email: 'func2@gac.com', nome: 'Bruno Func', senha: 'Func@2345!' },
      { email: 'func3@gac.com', nome: 'Carla Func', senha: 'Func@3456!' },
      { email: 'func4@gac.com', nome: 'Diego Func', senha: 'Func@4567!' }
    ];

    for (const f of funcionarios) {
      const u = await prisma.usuario.create({
        data: {
          email: f.email,
          senha: await bcrypt.hash(f.senha, 10),
          nome: f.nome,
          funcao: 'funcionario',
          ativo: true
        }
      });
      console.log(`\n✅ FUNCIONÁRIO: ${u.nome}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Senha: ${f.senha}`);
      console.log(`   ID: ${u.id}`);
    }

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
