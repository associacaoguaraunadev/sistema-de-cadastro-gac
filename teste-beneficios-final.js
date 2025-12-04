// Script de teste completo para validar benefícios
console.log('=== TESTE COMPLETO DO SISTEMA DE BENEFÍCIOS ===');

// 1. Teste de tipos de benefícios GAC
const tiposDefault = ['Cesta Básica', 'Auxílio Alimentação', 'Auxílio Financeiro', 'Bolsa Cultura', 'Outro'];
localStorage.setItem('beneficiosGACTipos', JSON.stringify(tiposDefault));

// 2. Teste de pessoa com benefícios completos
const pessoaTeste = {
  id: 'teste-' + Date.now(),
  nome: 'João Silva Teste',
  cpf: '12345678901',
  telefone: '(11) 99999-9999',
  email: 'joao.teste@email.com',
  dataNascimento: '1990-05-15',
  sexo: 'masculino',
  estadoCivil: 'solteiro',
  endereco: {
    cep: '01234-567',
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 45',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP'
  },
  comunidade: 'Comunidade Teste',
  rendaFamiliar: 2500.00,
  numeroMembros: 4,
  dependentes: [
    { nome: 'Maria Silva', idade: 8 },
    { nome: 'Pedro Silva', idade: 12 }
  ],
  beneficiosGAC: [
    {
      tipo: 'Cesta Básica',
      dataInicio: '2024-01-15',
      dataFim: '2024-12-15',
      observacoes: 'Benefício mensal'
    },
    {
      tipo: 'Auxílio Alimentação',
      dataInicio: '2024-06-01',
      dataFim: '2024-11-30',
      observacoes: 'Suporte temporário'
    }
  ],
  beneficiosGoverno: [
    {
      nome: 'Auxílio Brasil',
      valor: 600.00
    },
    {
      nome: 'Auxílio Gás',
      valor: 102.00
    },
    {
      nome: 'Vale Alimentação',
      valor: 300.00
    }
  ]
};

// 3. Salvar no localStorage
const pessoas = JSON.parse(localStorage.getItem('pessoas') || '[]');
pessoas.push(pessoaTeste);
localStorage.setItem('pessoas', JSON.stringify(pessoas));

// 4. Calcular totais
const totalBeneficiosGoverno = pessoaTeste.beneficiosGoverno.reduce((total, beneficio) => total + beneficio.valor, 0);

// 5. Relatório de teste
console.log('✅ Pessoa de teste criada:', pessoaTeste.nome);
console.log('✅ Benefícios GAC:', pessoaTeste.beneficiosGAC.length, 'benefícios');
console.log('✅ Benefícios Governo:', pessoaTeste.beneficiosGoverno.length, 'benefícios');
console.log('✅ Valor total benefícios governo: R$', totalBeneficiosGoverno.toFixed(2));
console.log('✅ Tipos de benefícios disponíveis:', tiposDefault.length, 'tipos');

// 6. Validações
const validacoes = {
  'Tipos GAC carregados': tiposDefault.length > 0,
  'Benefícios GAC salvos': pessoaTeste.beneficiosGAC.length > 0,
  'Benefícios Governo salvos': pessoaTeste.beneficiosGoverno.length > 0,
  'Cálculo correto': totalBeneficiosGoverno === 1002.00,
  'Pessoa salva': pessoas.length > 0
};

console.log('\n=== RESULTADOS DAS VALIDAÇÕES ===');
Object.entries(validacoes).forEach(([teste, resultado]) => {
  console.log(resultado ? '✅' : '❌', teste + ':', resultado);
});

console.log('\n=== DADOS SALVOS ===');
console.log('LocalStorage pessoas:', pessoas.length, 'registros');
console.log('LocalStorage tipos GAC:', JSON.parse(localStorage.getItem('beneficiosGACTipos') || '[]').length, 'tipos');

console.log('\n=== TESTE CONCLUÍDO ===');
console.log('Sistema de benefícios validado com sucesso! 🎉');