// Teste para verificar localStorage dos benefícios GAC
console.log('=== TESTE LOCALSTORAGE BENEFÍCIOS ===');

// Verificar se existe dados salvos
const dados = localStorage.getItem('beneficiosGACTipos');
console.log('Dados no localStorage:', dados);

if (dados) {
    try {
        const parsed = JSON.parse(dados);
        console.log('Dados parseados:', parsed);
        console.log('É array?', Array.isArray(parsed));
        console.log('Quantidade:', parsed.length);
    } catch (error) {
        console.error('Erro ao fazer parse:', error);
    }
} else {
    console.log('Nenhum dado encontrado, criando padrões...');
    const defaults = ['Cesta Básica', 'Auxílio Alimentação', 'Auxílio Financeiro', 'Bolsa Cultura', 'Outro'];
    localStorage.setItem('beneficiosGACTipos', JSON.stringify(defaults));
    console.log('Padrões criados:', defaults);
}

// Verificar novamente
const dadosNovos = localStorage.getItem('beneficiosGACTipos');
console.log('Dados após criação:', dadosNovos);

console.log('=== FIM DO TESTE ===');