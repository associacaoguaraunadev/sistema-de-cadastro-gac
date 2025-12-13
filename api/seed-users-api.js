import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Load API env
dotenv.config({ path: resolve(__dirname, '.env') });

// If DIRECT_URL is present (direct DB port), prefer it for immediate connections
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Iniciando seed de usuários via api/seed-users-api.js');

    // Clean users (only users and related small tables to be safe)
    await prisma.usuario.deleteMany();

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

    const funcionarios = [
      { email: 'func1@gac.com', nome: 'Ana Func', senha: 'Func@1234!' },
      { email: 'func2@gac.com', nome: 'Bruno Func', senha: 'Func@2345!' },
      { email: 'func3@gac.com', nome: 'Carla Func', senha: 'Func@3456!' },
      { email: 'func4@gac.com', nome: 'Diego Func', senha: 'Func@4567!' }
    ];

    const created = [];
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
      created.push({ email: u.email, senha: f.senha, id: u.id, nome: u.nome });
    }

    console.log('\nUsuários criados:');
    console.log(`Admin: ${admin1.email} / Senha: ${senhaAdmin}`);
    console.log(`Admin: ${admin2.email} / Senha: ${senhaAdmin}`);
    for (const u of created) console.log(`Func: ${u.email} / Senha: ${u.senha}`);

    console.log('\nSeed finalizado.');
  } catch (err) {
    console.error('Erro no seed API:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
