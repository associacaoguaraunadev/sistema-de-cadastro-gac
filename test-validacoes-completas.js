#!/usr/bin/env node

/**
 * Test suite para validações do formulário e benefícios
 * Testa: data validation, government benefits com valores, renda familiar, validação de campos obrigatórios
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

// ==================== TESTE 1: formatarMoeda ====================
console.log('\n=== TESTE 1: Formatação de Moeda ===');

function formatarMoeda(valor) {
  valor = valor.replace(/\D/g, '');
  const numero = parseInt(valor || '0', 10) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const moeda1 = formatarMoeda('123456');
test('Formata 123456 com símbolo de moeda e separadores',
  moeda1.includes('1') && moeda1.includes('.') && moeda1.includes(',') && moeda1.includes('56'),
  moeda1,
  'Contém: números, separador decimal e símbolo'
);

const moeda2 = formatarMoeda('500');
test('Formata 500 como moeda com 2 casas decimais',
  moeda2.includes('5') && moeda2.includes(',00'),
  moeda2,
  'Contém: 5 e ,00'
);

const moeda3 = formatarMoeda('');
test('Formata string vazia como R$ 0,00',
  moeda3.includes('0') && moeda3.includes(',00'),
  moeda3,
  'Contém: 0 e ,00'
);

// ==================== TESTE 2: extrairValorMoeda ====================
console.log('\n=== TESTE 2: Extração de Valor em Moeda ===');

function extrairValorMoeda(valor) {
  if (!valor) return 0;
  const numeros = valor.replace(/\D/g, '');
  return parseInt(numeros, 10) / 100;
}

test('Extrai R$ 1.234,56 como 1234.56',
  extrairValorMoeda('R$ 1.234,56') === 1234.56,
  extrairValorMoeda('R$ 1.234,56'),
  1234.56
);

test('Extrai R$ 5,00 como 5.00',
  extrairValorMoeda('R$ 5,00') === 5,
  extrairValorMoeda('R$ 5,00'),
  5
);

test('Extrai valor vazio como 0',
  extrairValorMoeda('') === 0,
  extrairValorMoeda(''),
  0
);

// ==================== TESTE 3: validarDataBeneficio ====================
console.log('\n=== TESTE 3: Validação de Datas de Benefício ===');

function validarDataBeneficio(dataInicio, dataFinal) {
  if (!dataInicio) {
    return { valido: false, erro: 'Data de início é obrigatória' };
  }
  if (dataFinal) {
    const inicio = new Date(dataInicio);
    const final = new Date(dataFinal);
    if (final < inicio) {
      return { valido: false, erro: 'Data final não pode ser menor que a data de início' };
    }
  }
  return { valido: true };
}

const validacao1 = validarDataBeneficio('2024-01-01', '2024-01-15');
test('Aceita data final >= data inicial',
  validacao1.valido === true,
  validacao1,
  { valido: true }
);

const validacao2 = validarDataBeneficio('2024-01-15', '2024-01-01');
test('Rejeita data final < data inicial',
  validacao2.valido === false && validacao2.erro.includes('final'),
  validacao2.valido,
  false
);

const validacao3 = validarDataBeneficio('', '2024-01-15');
test('Rejeita data inicial vazia',
  validacao3.valido === false && validacao3.erro.includes('obrigatória'),
  validacao3.valido,
  false
);

const validacao4 = validarDataBeneficio('2024-01-01', null);
test('Aceita data final vazia',
  validacao4.valido === true,
  validacao4,
  { valido: true }
);

const validacao5 = validarDataBeneficio('2024-01-01', '2024-01-01');
test('Aceita datas iguais',
  validacao5.valido === true,
  validacao5,
  { valido: true }
);

// ==================== TESTE 4: calcularTotalBeneficiosGoverno ====================
console.log('\n=== TESTE 4: Cálculo Total de Benefícios do Governo ===');

const beneficiosGovernoOpcoes = [
  { nome: 'LOAS', valor: 676.00 },
  { nome: 'Bolsa Família', valor: 600.00 },
  { nome: 'Auxílio Emergencial', valor: 200.00 },
  { nome: 'BPC', valor: 1412.00 },
  { nome: 'Outro', valor: 0 }
];

function calcularTotalBeneficiosGoverno(beneficiosSelecionados) {
  return beneficiosGovernoOpcoes.reduce((total, beneficio) => {
    if (beneficiosSelecionados.includes(beneficio.nome)) {
      return total + beneficio.valor;
    }
    return total;
  }, 0);
}

test('LOAS + Bolsa Família = 1276',
  calcularTotalBeneficiosGoverno(['LOAS', 'Bolsa Família']) === 1276,
  calcularTotalBeneficiosGoverno(['LOAS', 'Bolsa Família']),
  1276
);

test('Nenhum selecionado = 0',
  calcularTotalBeneficiosGoverno([]) === 0,
  calcularTotalBeneficiosGoverno([]),
  0
);

test('Todos = 2888',
  calcularTotalBeneficiosGoverno(['LOAS', 'Bolsa Família', 'Auxílio Emergencial', 'BPC']) === 2888,
  calcularTotalBeneficiosGoverno(['LOAS', 'Bolsa Família', 'Auxílio Emergencial', 'BPC']),
  2888
);

test('Apenas Auxílio Emergencial = 200',
  calcularTotalBeneficiosGoverno(['Auxílio Emergencial']) === 200,
  calcularTotalBeneficiosGoverno(['Auxílio Emergencial']),
  200
);

// ==================== TESTE 5: validarFormulario ====================
console.log('\n=== TESTE 5: Validação de Campos Obrigatórios ===');

function validarFormulario(formulario) {
  const novosErros = {};
  if (!formulario.nome.trim()) novosErros.nome = 'Campo obrigatório';
  if (!formulario.cpf.trim()) novosErros.cpf = 'Campo obrigatório';
  if (!formulario.endereco.trim()) novosErros.endereco = 'Campo obrigatório';
  if (!formulario.comunidade.trim()) novosErros.comunidade = 'Campo obrigatório';
  return novosErros;
}

const erro1 = validarFormulario({
  nome: '',
  cpf: '12345678900',
  endereco: 'Rua X',
  comunidade: 'Community'
});
test('Detecta nome vazio',
  Object.keys(erro1).includes('nome') && Object.keys(erro1).length === 1,
  Object.keys(erro1),
  ['nome']
);

const erro2 = validarFormulario({
  nome: 'João',
  cpf: '',
  endereco: '',
  comunidade: ''
});
test('Detecta múltiplos campos vazios',
  Object.keys(erro2).length === 3 && 
  Object.keys(erro2).includes('cpf') &&
  Object.keys(erro2).includes('endereco') &&
  Object.keys(erro2).includes('comunidade'),
  Object.keys(erro2).sort(),
  ['cpf', 'comunidade', 'endereco'].sort()
);

const erro3 = validarFormulario({
  nome: 'João Silva',
  cpf: '12345678900',
  endereco: 'Rua X, 123',
  comunidade: 'Community'
});
test('Nenhum erro quando tudo preenchido',
  Object.keys(erro3).length === 0,
  Object.keys(erro3),
  []
);

const erro4 = validarFormulario({
  nome: '   ',
  cpf: '  ',
  endereco: '   ',
  comunidade: 'Community'
});
test('Espaços em branco são considerados vazios',
  Object.keys(erro4).length === 3,
  Object.keys(erro4).length,
  3
);

// ==================== TESTE 6: Estrutura de Benefícios do Governo ====================
console.log('\n=== TESTE 6: Estrutura de Benefícios do Governo ===');

test('LOAS tem nome e valor',
  beneficiosGovernoOpcoes[0].nome === 'LOAS' && beneficiosGovernoOpcoes[0].valor === 676.00,
  beneficiosGovernoOpcoes[0],
  { nome: 'LOAS', valor: 676.00 }
);

test('Bolsa Família tem valor correto',
  beneficiosGovernoOpcoes.find(b => b.nome === 'Bolsa Família').valor === 600.00,
  beneficiosGovernoOpcoes.find(b => b.nome === 'Bolsa Família').valor,
  600.00
);

test('Todos os benefícios têm nome e valor',
  beneficiosGovernoOpcoes.every(b => b.nome && typeof b.valor === 'number'),
  beneficiosGovernoOpcoes.length,
  5
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
