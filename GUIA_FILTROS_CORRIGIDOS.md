# 🔍 Guia de Correção dos Filtros Avançados

## O Que Foi Corrigido

### 1️⃣ Backend (pessoas.js)
- ✅ Adicionada lógica para processar `filtrosAvancados` da query
- ✅ Implementada correta combinação AND de múltiplos filtros
- ✅ Adicionados logs detalhados para debug

### 2️⃣ Frontend (ListaPessoas.jsx)
- ✅ Corrigida passagem de `config.filtros` em vez de `config`
- ✅ Adicionados logs para rastrear os filtros aplicados
- ✅ Melhorada clareza do fluxo de dados

## Como Testar

### ✅ Teste 1: Verificar se os Filtros Chegam ao Backend

1. **Abra o terminal onde o backend está rodando**
   ```
   Frontend: http://localhost:5173
   Backend:  http://localhost:3001
   ```

2. **No navegador:**
   - Faça login
   - Vá para a lista de pessoas
   - Abra o **DevTools** (F12)
   - Vá para aba **Console**

3. **Aplique um filtro simples:**
   - Clique em "Filtros" (botão com ícone de filtro)
   - Preencha **Nome = "João"**
   - Clique em "Buscar"

4. **Observe:**
   - No console do navegador (Frontend): Você deve ver mensagens como:
     ```
     🔍 [ListaPessoas] Carregando com filtros
     Busca: 
     Filtros Avançados: {nome: {valor: "João", operador: "contem"}}
     ```
   
   - No terminal do backend: Você deve ver:
     ```
     👥 Listando pessoas | Status: ativo | Busca: nenhuma | Filtros: sim
     🔍 Filtros avançados recebidos: {nome: {valor: "João", operador: "contem"}}
     ✓ Filtro adicionado: nome contém "João"
     ✅ Retornando X de Y pessoas
     ```

### ✅ Teste 2: Testar Múltiplos Filtros

1. **Aplique 2 filtros:**
   - Nome = "João"
   - CPF = "123"
   - Clique em "Buscar"

2. **Resultado esperado:**
   - Backend mostra:
     ```
     ✓ Filtro adicionado: nome contém "João"
     ✓ Filtro adicionado: cpf contém "123"
     ✅ Retornando X de Y pessoas
     ```
   - Frontend retorna APENAS pessoas que têm "João" no nome **E** "123" no CPF

3. **Se retornar pessoas erradas:**
   - Significa que a lógica AND não está funcionando
   - Verifique se há `console.log` aparecendo no backend

### ✅ Teste 3: Testar via API Diretamente

1. **Obtenha o token:**
   - Vá para DevTools → Application → LocalStorage
   - Procure por "token"
   - Copie o valor completo

2. **Abra PowerShell e rode:**
   ```powershell
   # No diretório do projeto
   .\teste-filtros.ps1 -Token "seu_token_aqui" -Teste "todos"
   ```

3. **Ou use curl:**
   ```bash
   curl -H "Authorization: Bearer SEU_TOKEN" \
     "http://localhost:3001/api/pessoas?filtros={\"nome\":{\"valor\":\"João\",\"operador\":\"contem\"}}"
   ```

## Possíveis Problemas e Soluções

### ❌ Problema 1: Filtro não muda nada (retorna mesmas pessoas)

**Causas possíveis:**
1. O backend não está recebendo os filtros
2. Os filtros estão malformados
3. Erro no processamento JSON

**Solução:**
1. Verifique console do backend - há mensagens de "Filtros avançados recebidos:"?
2. Se não, o filtro não está sendo enviado corretamente
3. Verifique aba "Network" no DevTools:
   - Procure por GET request para `/api/pessoas`
   - Veja a Query String - há `filtros=...`?

### ❌ Problema 2: Retorna pessoas erradas

**Causa possível:**
- Lógica AND/OR invertida
- Campos sendo comparados incorretamente

**Solução:**
1. Verifique os logs do backend
2. Certifique-se que cada filtro adiciona uma nova condição AND
3. Teste com dados específicos que você sabe que deveriam/não deveriam aparecer

### ❌ Problema 3: Filtro retorna erro 500

**Causa possível:**
- Erro ao processar JSON
- Campo não existe no Prisma

**Solução:**
1. Verifique se o campo existe em `prisma/schema.prisma`
2. Verifique a aba Network - qual é a mensagem de erro exata?
3. Rodou uma migração recente? Sincronize o Prisma:
   ```bash
   cd backend
   npx prisma generate
   ```

## Estrutura de Dados

### Formato do Filtro Avançado

```javascript
// Quando o usuário aplica múltiplos filtros no modal:
{
  nome: { valor: "João", operador: "contem" },
  cpf: { valor: "123", operador: "contem" },
  email: { valor: "@gmail", operador: "contem" }
}

// Isso é enviado para a API como:
GET /pessoas?filtros={"nome":{"valor":"João","operador":"contem"},"cpf":{"valor":"123"}...}

// O backend recebe e processa como:
// - AND entre cada campo
// - Cada campo usa LIKE/contains insensitive
```

## Logs para Adicionar Você Mesmo (se precisar)

### Frontend (em ListaPessoas.jsx)
```javascript
// Quando aplicar filtros:
console.log('🔍 Filtros aplicados:', filtrosAvancados);

// Quando carregar pessoas:
console.log('📡 Enviando requisição:', { busca, filtrosAvancados, pagina });
```

### Backend (em pessoas.js - GET /)
```javascript
console.log('🔍 Query recebida:', req.query);
console.log('🔍 Filtros recebidos:', filtros);
console.log('🔍 Condições AND:', condicoesAND);
console.log('🔍 Cláusula WHERE final:', onde);
```

## Próximas Melhorias (Opcional)

- [ ] Adicionar histórico de buscas
- [ ] Salvar filtros favoritos
- [ ] Adicionar operador "OU" (além de "E")
- [ ] Adicionar operadores como "=", ">", "<", "não contém"
- [ ] Adicionar filtro por data (intervalo)
- [ ] Adicionar filtro por comunidade/benefício

## Resumo da Implementação

| Componente | Mudança |
|-----------|---------|
| `backend/src/rotas/pessoas.js` | Adicionada lógica de filtros avançados com AND |
| `frontend/src/componentes/ListaPessoas.jsx` | Corrigida passagem de `config.filtros` |
| `frontend/src/servicos/api.js` | Já passa corretamente via `params.filtros` |
| **Logs** | Adicionados em backend e frontend para debug |

---

**Data**: 29/11/2025  
**Status**: ✅ Implementado e Testável  
**Próximo Passo**: Execute os testes acima para validar
