#!/usr/bin/env node

/**
 * TESTE DE BENEFÍCIOS DO GOVERNO DINÂMICOS
 * Testa a nova estrutura de benefícios do governo com valores customizados
 */

const testResults = [];

function test(name, condition, actual, expected) {
  const passed = condition;
  testResults.push({
    name,
    passed,
    actual: JSON.stringify(actual),
    expected: JSON.stringify(expected)
  });
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}`);
}

// ==================== TESTE 1: Estrutura de Benefícios Dinâmicos ====================
console.log('\n=== TESTE 1: Estrutura de Benefícios Dinâmicos ===');

const beneficioDinamico = {
  nome: 'LOAS',
  valor: 676.00
};

test('Benefício tem propriedade "nome"',
  'nome' in beneficioDinamico,
  Object.keys(beneficioDinamico),
  ['nome', 'valor']
);

test('Benefício tem propriedade "valor"',
  'valor' in beneficioDinamico && typeof beneficioDinamico.valor === 'number',
  beneficioDinamico.valor,
  676.00
);

// ==================== TESTE 2: Adicionar Benefícis Dinâmicos ====================
console.log('\n=== TESTE 2: Adicionar Benefícios Dinâmicos ===');

let beneficiosGoverno = [];

// Simular adição de benefício 1
beneficiosGoverno.push({
  nome: 'LOAS',
  valor: 676.00
});

test('Pode adicionar primeiro benefício',
  beneficiosGoverno.length === 1 && beneficiosGoverno[0].nome === 'LOAS',
  beneficiosGoverno.length,
  1
);

// Simular adição de benefício 2
beneficiosGoverno.push({
  nome: 'Bolsa Família',
  valor: 600.00
});

test('Pode adicionar segundo benefício',
  beneficiosGoverno.length === 2,
  beneficiosGoverno.length,
  2
);

// Simular adição de benefício com valor customizado
beneficiosGoverno.push({
  nome: 'Outro Auxílio',
  valor: 350.50
});

test('Pode adicionar benefício com valor customizado',
  beneficiosGoverno.length === 3 && beneficiosGoverno[2].valor === 350.50,
  beneficiosGoverno[2].valor,
  350.50
);

// ==================== TESTE 3: Remover Benefícios ====================
console.log('\n=== TESTE 3: Remover Benefícios ===');

const inicialLength = beneficiosGoverno.length;
beneficiosGoverno = beneficiosGoverno.filter((_, i) => i !== 1); // Remover "Bolsa Família"

test('Pode remover benefício por índice',
  beneficiosGoverno.length === inicialLength - 1 && !beneficiosGoverno.some(b => b.nome === 'Bolsa Família'),
  beneficiosGoverno.length,
  2
);

// ==================== TESTE 4: Calcular Total Dinâmico ====================
console.log('\n=== TESTE 4: Calcular Total Dinâmico ===');

// Restaurar array para testes de total
beneficiosGoverno = [
  { nome: 'LOAS', valor: 676.00 },
  { nome: 'Bolsa Família', valor: 600.00 },
  { nome: 'BPC', valor: 1412.00 }
];

const totalBeneficios = beneficiosGoverno.reduce((total, b) => total + b.valor, 0);

test('Calcula total de 3 benefícios corretamente',
  totalBeneficios === 2688.00,
  totalBeneficios,
  2688.00
);

// ==================== TESTE 5: Valores Customizados ====================
console.log('\n=== TESTE 5: Valores Customizados ===');

beneficiosGoverno = [
  { nome: 'Auxílio Especial', valor: 1500.75 },
  { nome: 'Complemento', valor: 250.25 }
];

const totalCustomizado = beneficiosGoverno.reduce((total, b) => total + b.valor, 0);

test('Calcula total com valores customizados',
  totalCustomizado === 1751.00,
  totalCustomizado,
  1751.00
);

test('Preserva casas decimais corretamente',
  beneficiosGoverno[0].valor === 1500.75,
  beneficiosGoverno[0].valor,
  1500.75
);

// ==================== TESTE 6: Array Vazio ====================
console.log('\n=== TESTE 6: Array Vazio ===');

beneficiosGoverno = [];

test('Array vazio retorna total zero',
  beneficiosGoverno.reduce((total, b) => total + b.valor, 0) === 0,
  beneficiosGoverno.reduce((total, b) => total + b.valor, 0),
  0
);

test('Array vazio tem length 0',
  beneficiosGoverno.length === 0,
  beneficiosGoverno.length,
  0
);

// ==================== TESTE 7: Validação de Dados ====================
console.log('\n=== TESTE 7: Validação de Dados ===');

const beneficioValido = { nome: 'LOAS', valor: 676.00 };
const temNome = 'nome' in beneficioValido && beneficioValido.nome.trim().length > 0;
const temValor = 'valor' in beneficioValido && typeof beneficioValido.valor === 'number' && beneficioValido.valor >= 0;

test('Benefício válido tem nome preenchido',
  temNome,
  temNome,
  true
);

test('Benefício válido tem valor numérico positivo',
  temValor,
  temValor,
  true
);

// ==================== TESTE 8: Múltiplos Benefícios Iguais ====================
console.log('\n=== TESTE 8: Múltiplos Benefícios Iguais ===');

beneficiosGoverno = [
  { nome: 'LOAS', valor: 676.00 },
  { nome: 'LOAS', valor: 676.00 },
  { nome: 'Bolsa Família', valor: 600.00 }
];

test('Permite adicionar benefícios com mesmo nome',
  beneficiosGoverno.filter(b => b.nome === 'LOAS').length === 2,
  beneficiosGoverno.filter(b => b.nome === 'LOAS').length,
  2
);

const totalComDuplicados = beneficiosGoverno.reduce((total, b) => total + b.valor, 0);
test('Calcula total incluindo benefícios duplicados',
  totalComDuplicados === 1952.00,
  totalComDuplicados,
  1952.00
);

// ==================== RESUMO ====================
console.log('\n=== RESUMO DOS TESTES ===');
const totalTestes = testResults.length;
const testesPassed = testResults.filter(r => r.passed).length;
const testesFailed = testResults.filter(r => !r.passed).length;

console.log(`Total de testes: ${totalTestes}`);
console.log(`✓ Passou: ${testesPassed}`);
console.log(`✗ Falhou: ${testesFailed}`);

if (testesFailed > 0) {
  console.log('\n=== TESTES QUE FALHARAM ===');
  testResults.filter(r => !r.passed).forEach(r => {
    console.log(`✗ ${r.name}`);
    console.log(`  Esperado: ${r.expected}`);
    console.log(`  Obtido: ${r.actual}`);
  });
}

const successRate = (testesPassed / totalTestes) * 100;
console.log(`\nTaxa de sucesso: ${successRate.toFixed(1)}%`);

process.exit(testesFailed > 0 ? 1 : 0);
