#!/usr/bin/env node

/**
 * 🌱 Seed Script - Adiciona 200 pessoas sem deletar dados existentes
 */

import { createRequire } from 'module';
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
    console.log('\n🌱 ADICIONANDO 200 PESSOAS AO BANCO\n');
    console.log('═'.repeat(70));

    // Obter usuários existentes
    const usuarios = await prisma.usuario.findMany({ select: { id: true, email: true } });

    if (usuarios.length === 0) {
      console.log('\n❌ ERRO: Nenhum usuário encontrado no banco!');
      console.log('   Execute primeiro: node seed-usuarios.js\n');
      return;
    }

    console.log(`\n👤 Usuários encontrados: ${usuarios.length}`);
    usuarios.forEach(u => console.log(`   - ${u.email} (ID: ${u.id})`));

    // Gerar e inserir 200 pessoas
    console.log('\n👥 GERANDO 200 PESSOAS\n');

    let pessoasGeradas = [];

    for (let i = 0; i < 200; i++) {
      const usuarioId = usuarios[i % usuarios.length].id;
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

    const totalPessoas = await prisma.pessoa.count();
    const pessoasData = await prisma.pessoa.findMany({
      select: { idade: true, comunidade: true }
    });

    const criancas = pessoasData.filter(p => p.idade < 18).length;
    const adultos = pessoasData.filter(p => p.idade >= 18 && p.idade < 60).length;
    const idosos = pessoasData.filter(p => p.idade >= 60).length;

    console.log(`   👥 Total de pessoas no banco: ${totalPessoas}`);
    console.log(`   👶 Crianças (0-17): ${criancas}`);
    console.log(`   👨 Adultos (18-59): ${adultos}`);
    console.log(`   👴 Idosos (60+): ${idosos}`);

    const comunidadesUnicas = new Set(pessoasData.map(p => p.comunidade).filter(c => c));
    console.log(`   🏘️  Comunidades preenchidas: ${comunidadesUnicas.size}`);

    console.log('\n═'.repeat(70));
    console.log('\n✨ SEED CONCLUÍDO COM SUCESSO!\n');

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
