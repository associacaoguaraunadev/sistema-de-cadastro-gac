/**
 * 🔍 GUIA DE TESTES - FILTROS AVANÇADOS
 * 
 * Como os filtros funcionam agora:
 * 1. Todos os filtros selecionados = AND (TODOS devem coincidir)
 * 2. Busca simples = OR (qualquer campo pode conter o texto)
 * 3. Filtros + Busca = Ambos são aplicados simultaneamente
 * 
 * EXEMPLOS DE RESULTADOS ESPERADOS:
 */

// ✅ CENÁRIO 1: Filtrar por Nome = "João"
// Query: GET /pessoas?filtros={"nome":{"valor":"João","operador":"contem"}}
// Resultado: Retorna TODAS as pessoas com "João" em qualquer parte do nome
// Exemplo: "João Silva", "Joãozinho", "São João"
console.log('TESTE 1: Filtro simples por Nome');

// ✅ CENÁRIO 2: Filtrar por Nome = "João" E CPF = "123"
// Query: GET /pessoas?filtros={"nome":{"valor":"João","operador":"contem"},"cpf":{"valor":"123","operador":"contem"}}
// Resultado: Retorna APENAS pessoas que têm "João" no nome E "123" no CPF
// Exemplo: Se tem "João Silva" com CPF "123.456.789-00" → SIM
//          Se tem "João Silva" com CPF "999.999.999-99" → NÃO
//          Se tem "Maria" com CPF "123.456.789-00" → NÃO
console.log('TESTE 2: Múltiplos filtros com AND');

// ✅ CENÁRIO 3: Filtrar por Nome = "João" E Email = "mail"
// Resultado: Apenas pessoas com "João" no nome E "mail" no email
console.log('TESTE 3: Combinação diferente');

// ✅ CENÁRIO 4: Busca simples "João" (sem filtros avançados)
// Query: GET /pessoas?busca=João
// Resultado: Retorna pessoas onde "João" aparece em QUALQUER campo
// (nome, email, cpf, telefone, endereço, etc.)
console.log('TESTE 4: Busca simples (OR em todos os campos)');

// ✅ CENÁRIO 5: Busca "João" + Filtro Avançado Email = "@gmail.com"
// Query: GET /pessoas?busca=João&filtros={"email":{"valor":"@gmail.com"}}
// Resultado: Pessoas com "João" em qualquer campo E "@gmail.com" no email
console.log('TESTE 5: Busca + Filtro Avançado combinados');

/**
 * 🐛 PROBLEMAS COMUNS E SOLUÇÕES
 */

console.log(`
❌ PROBLEMA: Filtro não filtra nada / retorna todas as pessoas
   CAUSA: O campo no backend pode estar inativo ou não estar sendo processado
   SOLUÇÃO: Verificar console do backend para mensagens de erro
   
❌ PROBLEMA: Filtro retorna pessoas erradas
   CAUSA: Lógica AND/OR misturada incorretamente
   SOLUÇÃO: Verificar que cada filtro adicional usa AND (não OR)
   
❌ PROBLEMA: Filtro funciona mas muito lento
   CAUSA: Falta de índices no banco de dados
   SOLUÇÃO: Adicionar índices nas colunas mais buscadas
   
✅ SOLUÇÃO: Logs detalhados foram adicionados
   BACKEND: Verificar console para "🔍 Filtros avançados recebidos:"
   FRONTEND: Verificar Network tab para params enviados
`);

/**
 * 📊 ESTRUTURA ESPERADA DO OBJETO FILTROS
 */

const exemploFiltros = {
  nome: { valor: "João", operador: "contem" },
  cpf: { valor: "123", operador: "contem" },
  email: { valor: "@gmail", operador: "contem" }
};

console.log('ESTRUTURA DO OBJETO DE FILTROS:', exemploFiltros);

/**
 * 🔧 COMO TESTAR MANUALMENTE
 */

console.log(`
TESTE 1: Abra DevTools (F12)
1. Vá para aba "Network"
2. Aplique filtros no sistema
3. Procure pela requisição GET /pessoas
4. Verifique a query string contém: ?filtros={"nome":...}

TESTE 2: Abra o terminal do backend
1. Procure por mensagens com "🔍 Filtros avançados recebidos:"
2. Verifique cada campo listado
3. Se nada aparecer, o backend não está recebendo os filtros

TESTE 3: Teste direto na API (via curl ou Postman)
GET http://localhost:3001/api/pessoas?filtros={"nome":{"valor":"João","operador":"contem"}}

TESTE 4: Verifique se há dados com esses valores no banco
- Login com um usuário
- Crie algumas pessoas com dados variados
- Depois teste os filtros
`);
