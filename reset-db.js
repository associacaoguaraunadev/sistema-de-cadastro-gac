#!/usr/bin/env node

/**
 * 🔄 Script de Reset Completo do Banco de Dados
 * Remove todos os dados e reinicia com dados de teste
 */

import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Carregar variáveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

// Importar Prisma do local correto (api/node_modules)
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client/index.js');

const prisma = new PrismaClient({
  // Especificar o schema do Prisma
});

async function resetDatabase() {
  try {
    console.log('\n🔄 INICIANDO RESET COMPLETO DO BANCO DE DADOS\n');
    console.log('═'.repeat(60));

    // Step 1: Deletar todos os registros
    console.log('\n📋 STEP 1: Limpando dados existentes...');
    
    const pessoasDeleted = await prisma.pessoa.deleteMany({});
    console.log(`   ✅ ${pessoasDeleted.count} pessoas removidas`);

    const usuariosDeleted = await prisma.usuario.deleteMany({});
    console.log(`   ✅ ${usuariosDeleted.count} usuários removidos`);

    // Step 2: Criar usuários
    console.log('\n📋 STEP 2: Criando usuários...');

    const usuarioAdmin = await prisma.usuario.create({
      data: {
        email: 'admin@gac.com',
        senha: await bcrypt.hash('Admin123!', 10),
        nome: 'Administrador GAC',
        funcao: 'admin',
        ativo: true
      }
    });
    console.log(`   ✅ Admin: admin@gac.com (Senha: Admin123!)`);

    const usuarioFunc = await prisma.usuario.create({
      data: {
        email: 'funcionario@gac.com',
        senha: await bcrypt.hash('Func123!', 10),
        nome: 'João Funcionário',
        funcao: 'funcionario',
        ativo: true
      }
    });
    console.log(`   ✅ Funcionário: funcionario@gac.com (Senha: Func123!)`);

    // Step 3: Criar pessoas de teste
    console.log('\n📋 STEP 3: Criando pessoas de teste...');

    const pessoasData = [
      // CRIANÇAS (0-17 anos)
      {
        nome: 'Gabriel Lima',
        cpf: '12345678901',
        email: 'gabriel@gac.com',
        telefone: '(11) 98765-4321',
        endereco: 'Rua Jamel Galindo, 100',
        bairro: 'Interlagos',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '03875-550',
        idade: 8,
        comunidade: 'Vila Cheba',
        tipoBeneficio: 'Cesta Básica',
        dataBeneficio: new Date('2024-01-15'),
        observacoes: 'Criança em situação de vulnerabilidade',
        status: 'ativo',
        usuarioId: usuarioAdmin.id
      },
      {
        nome: 'Mauricio Lima',
        cpf: '23456789012',
        email: 'mauricio@gac.com',
        telefone: '(88) 22985-9598',
        endereco: 'Rua Monteiro Lobato, 40',
        bairro: 'Centro',
        cidade: 'Fortaleza',
        estado: 'CE',
        cep: '04815-200',
        idade: 15,
        comunidade: 'Barragem',
        tipoBeneficio: 'Auxílio Alimentação',
        dataBeneficio: new Date('2024-02-20'),
        observacoes: 'Adolescente - bolsa educação',
        status: 'ativo',
        usuarioId: usuarioAdmin.id
      },
      {
        nome: 'Beatriz Silva',
        cpf: '34567890123',
        email: 'beatriz@gac.com',
        telefone: '(11) 99876-5432',
        endereco: 'Avenida Brasil, 250',
        bairro: 'Vila Mariana',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '04101-010',
        idade: 12,
        comunidade: 'Morro da Vila',
        tipoBeneficio: 'Cesta Básica',
        dataBeneficio: new Date('2024-03-10'),
        observacoes: 'Inscrita em programa de assistência social',
        status: 'ativo',
        usuarioId: usuarioAdmin.id
      },

      // ADULTOS (18-59 anos)
      {
        nome: 'João da Silva',
        cpf: '45678901234',
        email: 'joao@gac.com',
        telefone: '(11) 98888-1111',
        endereco: 'Rua das Flores, 123',
        bairro: 'Pinheiros',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '05422-010',
        idade: 32,
        comunidade: 'Parque Centenario',
        tipoBeneficio: 'Auxílio Alimentação',
        dataBeneficio: new Date('2023-12-05'),
        observacoes: 'Desempregado, busca oportunidade',
        status: 'ativo',
        usuarioId: usuarioAdmin.id
      },
      {
        nome: 'Maria Santos',
        cpf: '56789012345',
        email: 'maria@gac.com',
        telefone: '(21) 97777-2222',
        endereco: 'Avenida Principal, 456',
        bairro: 'Copacabana',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        cep: '20060-010',
        idade: 45,
        comunidade: 'Jardim Apura',
        tipoBeneficio: 'Auxílio Financeiro',
        dataBeneficio: new Date('2023-11-12'),
        observacoes: 'Mãe de 2 filhos, salário mínimo',
        status: 'ativo',
        usuarioId: usuarioAdmin.id
      },
      {
        nome: 'Carlos Alberto',
        cpf: '67890123456',
        email: 'carlos@gac.com',
        telefone: '(31) 98765-4321',
        endereco: 'Rua Getúlio Vargas, 789',
        bairro: 'Funcionários',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        cep: '30150-250',
        idade: 38,
        comunidade: null,
        tipoBeneficio: 'Bolsa Cultura',
        dataBeneficio: new Date('2024-01-30'),
        observacoes: 'Artista - projeto cultural GAC',
        status: 'ativo',
        usuarioId: usuarioFunc.id
      },
      {
        nome: 'Ana Paula',
        cpf: '78901234567',
        email: 'ana@gac.com',
        telefone: '(85) 98777-6666',
        endereco: 'Avenida José Bastos, 654',
        bairro: 'Aldeota',
        cidade: 'Fortaleza',
        estado: 'CE',
        cep: '60110-160',
        idade: 28,
        comunidade: 'Vila Cheba',
        tipoBeneficio: 'Cesta Básica',
        dataBeneficio: new Date('2024-02-08'),
        observacoes: 'Mãe solo, renda baixa',
        status: 'ativo',
        usuarioId: usuarioFunc.id
      },

      // IDOSOS (60+)
      {
        nome: 'José da Silva',
        cpf: '89012345678',
        email: 'jose@gac.com',
        telefone: '(11) 98765-0000',
        endereco: 'Rua da Paz, 999',
        bairro: 'Vila Santa Rita',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '04157-170',
        idade: 72,
        comunidade: 'Barragem',
        tipoBeneficio: 'Cesta Básica',
        dataBeneficio: new Date('2023-10-20'),
        observacoes: 'Aposentado, vive com neta',
        status: 'ativo',
        usuarioId: usuarioAdmin.id
      },
      {
        nome: 'Rosa Maria',
        cpf: '90123456789',
        email: 'rosa@gac.com',
        telefone: '(21) 99999-1111',
        endereco: 'Avenida Central, 321',
        bairro: 'Madureira',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        cep: '20760-040',
        idade: 68,
        comunidade: 'Morro da Vila',
        tipoBeneficio: 'Auxílio Financeiro',
        dataBeneficio: new Date('2023-09-15'),
        observacoes: 'Viúva, recebe ajuda familiar',
        status: 'ativo',
        usuarioId: usuarioAdmin.id
      },
      {
        nome: 'Francisco Oliveira',
        cpf: '01234567890',
        email: 'francisco@gac.com',
        telefone: '(31) 98888-2222',
        endereco: 'Rua Oswaldo Cruz, 111',
        bairro: 'Centro-Sul',
        cidade: 'Belo Horizonte',
        estado: 'MG',
        cep: '30130-100',
        idade: 80,
        comunidade: 'Parque Centenario',
        tipoBeneficio: 'Cesta Básica',
        dataBeneficio: new Date('2023-08-25'),
        observacoes: 'Idoso, sem renda própria',
        status: 'ativo',
        usuarioId: usuarioFunc.id
      },
      {
        nome: 'Francisca Pereira',
        cpf: '11234567890',
        email: 'francisca@gac.com',
        telefone: '(85) 99888-3333',
        endereco: 'Rua Demócrito Rocha, 555',
        bairro: 'José de Alencar',
        cidade: 'Fortaleza',
        estado: 'CE',
        cep: '60135-290',
        idade: 75,
        comunidade: 'Jardim Apura',
        tipoBeneficio: 'Auxílio Alimentação',
        dataBeneficio: new Date('2024-02-15'),
        observacoes: 'Idosa, cliente de longa data',
        status: 'ativo',
        usuarioId: usuarioFunc.id
      }
    ];

    const pessoasCreated = await prisma.pessoa.createMany({
      data: pessoasData
    });
    console.log(`   ✅ ${pessoasCreated.count} pessoas criadas`);

    // Step 4: Estatísticas
    console.log('\n📊 ESTATÍSTICAS FINAIS:');

    const criancas = pessoasData.filter(p => p.idade < 18).length;
    const adultos = pessoasData.filter(p => p.idade >= 18 && p.idade < 60).length;
    const idosos = pessoasData.filter(p => p.idade >= 60).length;

    console.log(`   👶 Crianças (0-17): ${criancas}`);
    console.log(`   👨 Adultos (18-59): ${adultos}`);
    console.log(`   👴 Idosos (60+): ${idosos}`);

    const beneficiosCount = pessoasData.reduce((acc, p) => {
      acc[p.tipoBeneficio] = (acc[p.tipoBeneficio] || 0) + 1;
      return acc;
    }, {});

    console.log('\n   Benefícios:');
    Object.entries(beneficiosCount).forEach(([benef, count]) => {
      console.log(`     • ${benef}: ${count}`);
    });

    // Step 5: Credenciais
    console.log('\n' + '═'.repeat(60));
    console.log('\n🔐 CREDENCIAIS DE TESTE:');
    console.log('─'.repeat(60));
    console.log('\n📧 ADMIN:');
    console.log('   Email: admin@gac.com');
    console.log('   Senha: Admin123!');
    console.log('   Função: admin');
    console.log('\n📧 FUNCIONÁRIO:');
    console.log('   Email: funcionario@gac.com');
    console.log('   Senha: Func123!');
    console.log('   Função: funcionario');
    console.log('\n' + '═'.repeat(60));
    console.log('\n✨ RESET CONCLUÍDO COM SUCESSO!\n');

  } catch (erro) {
    console.error('\n❌ ERRO NO RESET:', erro.message);
    console.error(erro);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
