// Teste rápido para verificar se os tipos estão sendo carregados
console.log('Testando carregamento de benefícios GAC...');

const salvo = localStorage.getItem('beneficiosGACTipos');
console.log('Dados salvos no localStorage:', salvo);

if (salvo) {
  console.log('Tipos encontrados:', JSON.parse(salvo));
} else {
  const defaults = ['Cesta Básica', 'Auxílio Alimentação', 'Auxílio Financeiro', 'Bolsa Cultura', 'Outro'];
  localStorage.setItem('beneficiosGACTipos', JSON.stringify(defaults));
  console.log('Tipos padrão definidos:', defaults);
}

console.log('Teste finalizado - verifique o console no navegador');