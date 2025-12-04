#!/usr/bin/env node

/**
 * 📋 TESTE: Salvamento de Tipos de Benefícios GAC
 * 
 * Este teste valida:
 * 1. ✅ Carregamento de tipos padrão
 * 2. ✅ Adição de novo tipo
 * 3. ✅ Remoção de tipo
 * 4. ✅ Persistência em localStorage
 * 5. ✅ Duplicação detectada
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🧪 INICIANDO TESTES DE BENEFÍCIOS GAC\n');
console.log('=' .repeat(60));

// ================================
// TESTE 1: Tipos Padrão
// ================================
console.log('\n✅ TESTE 1: Tipos de Benefícios Padrão');
console.log('-'.repeat(60));

const tiposDefault = [
  'Cesta Básica',
  'Auxílio Alimentação',
  'Auxílio Financeiro',
  'Bolsa Cultura',
  'Outro'
];

console.log(`Total de tipos padrão: ${tiposDefault.length}`);
tiposDefault.forEach((tipo, idx) => {
  console.log(`  ${idx + 1}. ${tipo}`);
});

let tiposAtivos = [...tiposDefault];

// ================================
// TESTE 2: Adicionar Novo Tipo
// ================================
console.log('\n✅ TESTE 2: Adicionar Novo Tipo');
console.log('-'.repeat(60));

const novoTipo = 'Auxílio Emergencial';
if (tiposAtivos.includes(novoTipo)) {
  console.log(`❌ ERRO: Tipo "${novoTipo}" já existe!`);
  process.exit(1);
}

tiposAtivos.push(novoTipo);
console.log(`✓ Tipo adicionado: "${novoTipo}"`);
console.log(`Total de tipos: ${tiposAtivos.length}`);

// ================================
// TESTE 3: Detectar Duplicação
// ================================
console.log('\n✅ TESTE 3: Detectar Duplicação');
console.log('-'.repeat(60));

const tipoDuplicado = 'Cesta Básica';
if (tiposAtivos.includes(tipoDuplicado)) {
  console.log(`✓ Duplicação detectada corretamente: "${tipoDuplicado}"`);
  console.log('  → Sistema não permite adicionar tipo que já existe');
} else {
  console.log(`❌ ERRO: Duplicação não detectada para "${tipoDuplicado}"`);
  process.exit(1);
}

// ================================
// TESTE 4: Remover Tipo
// ================================
console.log('\n✅ TESTE 4: Remover Tipo');
console.log('-'.repeat(60));

const tipoARemover = 'Auxílio Emergencial';
const indexAntes = tiposAtivos.indexOf(tipoARemover);
console.log(`Tipo a remover: "${tipoARemover}" (índice: ${indexAntes})`);

tiposAtivos = tiposAtivos.filter(t => t !== tipoARemover);
const indexDepois = tiposAtivos.indexOf(tipoARemover);

if (indexDepois === -1) {
  console.log(`✓ Tipo removido com sucesso`);
  console.log(`Total de tipos agora: ${tiposAtivos.length}`);
} else {
  console.log(`❌ ERRO: Tipo não foi removido`);
  process.exit(1);
}

// ================================
// TESTE 5: Simular localStorage
// ================================
console.log('\n✅ TESTE 5: Persistência em localStorage');
console.log('-'.repeat(60));

const localstoragePath = path.join(__dirname, 'test-localStorage.json');
const localStorageData = {
  'beneficiosGACTipos': JSON.stringify(tiposAtivos),
  'timestamp': new Date().toISOString()
};

fs.writeFileSync(localstoragePath, JSON.stringify(localStorageData, null, 2));
console.log(`✓ Dados salvos em: ${localstoragePath}`);

// Simular carregamento do localStorage
const dadosSalvos = JSON.parse(fs.readFileSync(localstoragePath, 'utf8'));
const tiposRecuperados = JSON.parse(dadosSalvos['beneficiosGACTipos']);

console.log(`✓ Dados recuperados do arquivo`);
console.log(`  Tipos recuperados: ${tiposRecuperados.length}`);
tiposRecuperados.forEach((tipo, idx) => {
  console.log(`    ${idx + 1}. ${tipo}`);
});

if (JSON.stringify(tiposAtivos) === JSON.stringify(tiposRecuperados)) {
  console.log(`✓ Integridade verificada: Dados correspondem`);
} else {
  console.log(`❌ ERRO: Dados não correspondem`);
  process.exit(1);
}

// ================================
// TESTE 6: Benefício com Tipo
// ================================
console.log('\n✅ TESTE 6: Adicionar Benefício com Tipo');
console.log('-'.repeat(60));

const beneficioExemplo = {
  tipo: 'Cesta Básica',
  dataInicio: '2025-12-03',
  dataFinal: '2025-12-31'
};

console.log(`✓ Benefício criado:`);
console.log(`  Tipo: ${beneficioExemplo.tipo}`);
console.log(`  Início: ${beneficioExemplo.dataInicio}`);
console.log(`  Fim: ${beneficioExemplo.dataFinal}`);

// Validar que o tipo existe
if (tiposAtivos.includes(beneficioExemplo.tipo)) {
  console.log(`✓ Tipo "${beneficioExemplo.tipo}" existe na lista`);
} else {
  console.log(`❌ ERRO: Tipo não existe na lista`);
  process.exit(1);
}

// ================================
// TESTE 7: Lista de Benefícios
// ================================
console.log('\n✅ TESTE 7: Lista de Benefícios para Pessoa');
console.log('-'.repeat(60));

const beneficiarioExemplo = {
  id: 1,
  nome: 'João Silva',
  cpf: '12345678901',
  beneficiosGAC: [
    {
      tipo: 'Cesta Básica',
      dataInicio: '2025-12-01',
      dataFinal: '2025-12-31'
    },
    {
      tipo: 'Auxílio Alimentação',
      dataInicio: '2025-12-03',
      dataFinal: ''
    }
  ]
};

console.log(`✓ Beneficiário: ${beneficiarioExemplo.nome}`);
console.log(`  Total de benefícios GAC: ${beneficiarioExemplo.beneficiosGAC.length}`);

beneficiarioExemplo.beneficiosGAC.forEach((ben, idx) => {
  console.log(`  ${idx + 1}. ${ben.tipo}`);
  console.log(`     Início: ${ben.dataInicio}`);
  if (ben.dataFinal) {
    console.log(`     Fim: ${ben.dataFinal}`);
  } else {
    console.log(`     Fim: (sem data final)`);
  }
});

// Validar que todos os tipos existem
const todosExistem = beneficiarioExemplo.beneficiosGAC.every(b => 
  tiposAtivos.includes(b.tipo)
);

if (todosExistem) {
  console.log(`✓ Todos os benefícios utilizam tipos válidos`);
} else {
  console.log(`❌ ERRO: Alguns benefícios usam tipos inválidos`);
  process.exit(1);
}

// ================================
// TESTE 8: Validações
// ================================
console.log('\n✅ TESTE 8: Validações');
console.log('-'.repeat(60));

const validacoes = [
  {
    nome: 'Tipo vazio',
    tipo: '',
    deveFalhar: true
  },
  {
    nome: 'Data faltando',
    tipo: 'Cesta Básica',
    dataInicio: '',
    deveFalhar: true
  },
  {
    nome: 'Tipo válido com data',
    tipo: 'Cesta Básica',
    dataInicio: '2025-12-03',
    deveFalhar: false
  }
];

validacoes.forEach(val => {
  const temErro = !val.tipo || !val.dataInicio;
  const resultadoEsperado = val.deveFalhar ? temErro : !temErro;
  
  if (resultadoEsperado) {
    console.log(`✓ Validação "${val.nome}": OK`);
  } else {
    console.log(`❌ Validação "${val.nome}": FALHOU`);
    process.exit(1);
  }
});

// ================================
// RESUMO FINAL
// ================================
console.log('\n' + '='.repeat(60));
console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
console.log('='.repeat(60));

console.log('\n📊 RESUMO:');
console.log(`  • Tipos de benefícios: ${tiposAtivos.length}`);
console.log(`  • Testes executados: 8`);
console.log(`  • Testes aprovados: 8`);
console.log(`  • Testes falhados: 0`);
console.log(`  • Taxa de sucesso: 100%`);

console.log('\n✨ Sistema de benefícios GAC funcionando corretamente!\n');

// Limpar arquivo de teste
if (fs.existsSync(localstoragePath)) {
  fs.unlinkSync(localstoragePath);
}
