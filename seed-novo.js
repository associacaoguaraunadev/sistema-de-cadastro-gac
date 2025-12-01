#!/usr/bin/env node

/**
 * 🌱 Seed Script Completo - 200 pessoas + usuários
 * Popula banco com dados realistas para testes
 */

import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import crypto from 'crypto';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });
dotenv.config({ path: resolve(__dirname, 'api/.env') });
dotenv.config({ path: resolve(__dirname, '.env.local') });

const prisma = new PrismaClient();

// Dados para geração de pessoas realistas
const nomes = [
  'João', 'Maria', 'José', 'Ana', 'Carlos', 'Paula', 'Francisco', 'Beatriz',
  'Fernando', 'Juliana', 'Paulo', 'Monica', 'Roberto', 'Alice', 'Ricardo', 'Sandra',
  'Jorge', 'Fabiana', 'Marcelo', 'Gabriela', 'Alberto', 'Patricia', 'Eduardo', 'Larissa',
  'Rodrigo', 'Camila', 'Andre', 'Vanessa', 'Daniel', 'Fernanda', 'Gustavo', 'Bruna',
  'Lucas', 'Mariana', 'Bruno', 'Alessandra', 'Rafael', 'Yasmin', 'Felipe', 'Viviane',
  'Gabriel', 'Isabela', 'Thiago', 'Caroline', 'Diego', 'Amanda', 'Luiz', 'Natalia'
];

const sobrenomes = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Martins', 'Gomes',
  'Alves', 'Ferreira', 'Rocha', 'Carvalho', 'Ribeiro', 'Mendes', 'Barbosa', 'Monteiro',
  'Teixeira', 'Nunes', 'Dias', 'Pires', 'Campos', 'Correia', 'Moreira', 'Lourenço',
  'Azevedo', 'Bastos', 'Brito', 'Cabral', 'Camargo', 'Chaves', 'Fonseca', 'Guedes',
  'Henriques', 'Itamar', 'Jacinto', 'Kravitz', 'Lazaro', 'Macedo', 'Navarro', 'Okafor'
];

const ruas = [
  'Rua das Flores', 'Avenida Brasil', 'Rua da Paz', 'Avenida Paulista', 'Rua Getúlio Vargas',
  'Rua Monteiro Lobato', 'Avenida Nilo Peçanha', 'Rua Jamel Galindo', 'Rua Oswaldo Cruz',
  'Avenida José Bastos', 'Rua Demócrito Rocha', 'Avenida Central', 'Rua Lopes de Oliveira',
  'Avenida Castelo Branco', 'Rua Barão do Rio Branco', 'Avenida Amazonas', 'Rua 15 de Novembro'
];

const comunidades = ['Vila Cheba', 'Morro da Vila', 'Barragem', 'Parque Centenario', 'Jardim Apura'];

const beneficiosGoverno = [
  { nome: 'LOAS', valor: 1320 },
  { nome: 'Bolsa Família', valor: 600 },
  { nome: 'PBF', valor: 500 },
  { nome: 'Auxílio Alimentação', valor: 450 },
  { nome: 'Vale Aluguel', valor: 800 },
  { nome: 'Auxílio Desemprego', valor: 1100 },
  { nome: 'Aposentadoria Rural', valor: 1420 }
];

const beneficiosGAC = [
  { tipo: 'Cesta Básica', dataInicio: new Date('2024-01-01'), dataFinal: new Date('2025-12-31') },
  { tipo: 'Auxílio Alimentação', dataInicio: new Date('2024-02-01'), dataFinal: new Date('2025-12-31') },
  { tipo: 'Bolsa Educação', dataInicio: new Date('2024-01-15'), dataFinal: new Date('2025-06-30') }
];

function gerarCPF() {
  let cpf = '';
  for (let i = 0; i < 11; i++) {
    cpf += Math.floor(Math.random() * 10);
  }
  return cpf;
}

function gerarPessoa(usuarioId, index) {
  const nome = `${nomes[Math.floor(Math.random() * nomes.length)]} ${sobrenomes[Math.floor(Math.random() * sobrenomes.length)]}`;
  const idade = Math.floor(Math.random() * 80) + 5;
  const comunidade = comunidades[Math.floor(Math.random() * comunidades.length)];
  
  // 60% tem benefícios do governo
  const temBeneficiosGoverno = Math.random() < 0.6;
  const beneficiosGovernoDinâmicos = temBeneficiosGoverno 
    ? [beneficiosGoverno[Math.floor(Math.random() * beneficiosGoverno.length)]]
    : [];

  // 40% tem benefícios GAC
  const temBeneficiosGAC = Math.random() < 0.4;
  const beneficiosGACArray = temBeneficiosGAC
    ? [beneficiosGAC[Math.floor(Math.random() * beneficiosGAC.length)]]
    : [];

  const renda = Math.random() > 0.5 ? (Math.random() * 3000 + 500) : null;

  return {
    nome,
    cpf: gerarCPF(),
    email: `pessoa${index}@gac.local`,
    telefone: `(${String(Math.floor(Math.random() * 90) + 11).padStart(2, '0')}) 9${String(Math.floor(Math.random() * 90000000) + 10000000).padStart(8, '0')}`,
    endereco: `${ruas[Math.floor(Math.random() * ruas.length)]}, ${Math.floor(Math.random() * 1000) + 1}`,
    bairro: `Bairro ${String.fromCharCode(65 + (index % 26))}`,
    cidade: index % 4 === 0 ? 'São Paulo' : index % 4 === 1 ? 'Rio de Janeiro' : index % 4 === 2 ? 'Belo Horizonte' : 'Fortaleza',
    estado: index % 4 === 0 ? 'SP' : index % 4 === 1 ? 'RJ' : index % 4 === 2 ? 'MG' : 'CE',
    cep: `${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`,
    idade,
    comunidade: Math.random() > 0.2 ? comunidade : null,
    beneficiosGoverno: beneficiosGovernoDinâmicos,
    beneficiosGAC: beneficiosGACArray,
    rendaFamiliar: renda,
    observacoes: 'Pessoa cadastrada via seed de teste',
    status: 'ativo',
    usuarioId
  };
}

async function seed() {
  try {
    console.log('\n🌱 INICIANDO SEED COMPLETO DO BANCO DE DADOS\n');
    console.log('═'.repeat(70));

    // Limpar dados existentes (opcional - comentado por segurança)
    // await prisma.pessoa.deleteMany({});
    // await prisma.usuario.deleteMany({});

    // Verificar se já existem usuários
    const usuariosExistentes = await prisma.usuario.count();
    if (usuariosExistentes > 0) {
      console.log('\n⚠️  AVISO: Banco já contém usuários!');
      console.log(`   Total existente: ${usuariosExistentes} usuários`);
      console.log('   Pulando seed de usuários.\n');
    } else {
      // Criar usuários
      console.log('\n👤 CRIANDO USUÁRIOS\n');

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
      console.log('✅ ADMIN criado:');
      console.log(`   Email: admin@gac.com`);
      console.log(`   Senha: Admin@123456`);
      console.log(`   ID: ${usuarioAdmin.id}`);

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
      console.log('\n✅ FUNCIONÁRIO 1 criado:');
      console.log(`   Email: funcionario1@gac.com`);
      console.log(`   Senha: Func@123456`);
      console.log(`   ID: ${usuarioFunc1.id}`);

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
      console.log('\n✅ FUNCIONÁRIO 2 criado:');
      console.log(`   Email: funcionario2@gac.com`);
      console.log(`   Senha: Func@654321`);
      console.log(`   ID: ${usuarioFunc2.id}`);

      console.log('\n═'.repeat(70));

      // Gerar e inserir 200 pessoas
      console.log('\n👥 GERANDO 200 PESSOAS\n');

      const usuariosArray = [usuarioAdmin.id, usuarioFunc1.id, usuarioFunc2.id];
      let pessoasGeradas = [];

      for (let i = 0; i < 200; i++) {
        const usuarioId = usuariosArray[i % usuariosArray.length];
        pessoasGeradas.push(gerarPessoa(usuarioId, i + 1));

        if ((i + 1) % 50 === 0) {
          console.log(`   Gerando... ${i + 1}/200`);
        }
      }

      console.log('   ✅ Todas as 200 pessoas foram geradas');
      console.log('\n   📝 Inserindo no banco de dados...');

      const pessoasCreated = await prisma.pessoa.createMany({
        data: pessoasGeradas,
        skipDuplicates: true
      });

      console.log(`   ✅ ${pessoasCreated.count} pessoas inseridas com sucesso`);

      // Estatísticas
      console.log('\n═'.repeat(70));
      console.log('\n📊 ESTATÍSTICAS FINAIS\n');

      const estatisticas = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN idade < 18 THEN 1 ELSE 0 END) as criancas,
          SUM(CASE WHEN idade >= 18 AND idade < 60 THEN 1 ELSE 0 END) as adultos,
          SUM(CASE WHEN idade >= 60 THEN 1 ELSE 0 END) as idosos,
          COUNT(DISTINCT comunidade) as comunidades_unicas,
          COUNT(DISTINCT "usuarioId") as usuarios_count
        FROM "Pessoa"
      `;

      console.log(`   👥 Total de pessoas: ${estatisticas[0].total}`);
      console.log(`   👶 Crianças (0-17): ${estatisticas[0].criancas}`);
      console.log(`   👨 Adultos (18-59): ${estatisticas[0].adultos}`);
      console.log(`   👴 Idosos (60+): ${estatisticas[0].idosos}`);
      console.log(`   🏘️  Comunidades preenchidas: ${estatisticas[0].comunidades_unicas}`);
      console.log(`   👤 Usuários gerenciadores: ${estatisticas[0].usuarios_count}`);

      console.log('\n═'.repeat(70));
      console.log('\n✨ SEED COMPLETO COM SUCESSO!\n');
    }

  } catch (erro) {
    console.error('\n❌ ERRO NO SEED:', erro.message);
    console.error('\n   Stack trace:');
    console.error(erro.stack);

    if (erro.code === 'P2002') {
      console.error('\n   💡 Dica: Erro de valor único violado (CPF ou email duplicado)');
    }
    if (erro.code === 'P2014') {
      console.error('\n   💡 Dica: Erro de chave estrangeira (usuarioId inválido)');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
