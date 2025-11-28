# 🌱 COMO RODAR O SEED PARA CRIAR DADOS DE TESTE

## ✅ Pré-requisitos

```bash
# 1. Certifique-se que você tem:
# - Node.js instalado
# - backend/.env configurado com DATABASE_URL
# - Prisma migrado (tabelas criadas)

# Verificar se tudo está OK:
node -v
npm -v
cat backend/.env | grep DATABASE_URL
```

## 🚀 RODAR O SEED

### Opção 1: Da Raiz do Projeto
```bash
# Terminal na raiz (gac_system/)
node seed.js
```

### Opção 2: Adicionar Script ao package.json (Recomendado)

Abra `backend/package.json` e adicione:

```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js",
  "seed": "node ../seed.js",
  "prisma-generate": "prisma generate",
  "prisma-migrate": "prisma migrate dev",
  "prisma-reset": "prisma migrate reset --force"
}
```

Depois rode:
```bash
cd backend
npm run seed
```

---

## 📊 O QUE O SEED CRIA

### ✅ 2 Usuários de Teste

**Admin:**
```
Email: admin@gac.com
Senha: Admin@2025
Função: Admin
```

**Funcionário:**
```
Email: funcionario@gac.com
Senha: Func@2025
Função: Funcionário
```

### ✅ 10 Pessoas de Teste (com Segmentação)

**Crianças (0-17):**
- Gabriel Lima (8 anos) - Cesta Básica
- Mauricio Lima (15 anos) - Auxílio Alimentação
- Beatriz Silva (12 anos) - Cesta Básica

**Adultos (18-59):**
- João da Silva (32 anos) - Auxílio Alimentação
- Maria Santos (45 anos) - Auxílio Financeiro
- Carlos Alberto (38 anos) - Bolsa Cultura
- Ana Paula (28 anos) - Cesta Básica

**Idosos (60+):**
- José da Silva (72 anos) - Cesta Básica
- Rosa Maria (68 anos) - Auxílio Financeiro
- Francisco Oliveira (80 anos) - Cesta Básica
- Francisca Pereira (75 anos) - Auxílio Alimentação

---

## 🎯 RESULTADOS ESPERADOS

Quando rodar, você verá:

```
🌱 Iniciando seed...

✅ Usuário ADMIN criado
   Email: admin@gac.com
   Senha: Admin@2025

✅ Usuário FUNCIONÁRIO já existe

🗑️  0 pessoas antigas do admin removidas

✅ 10 pessoas de teste criadas!

📊 DISTRIBUIÇÃO POR FAIXA ETÁRIA:
   👶 Crianças (0-17): 3
   👨 Adultos (18-59): 4
   👴 Idosos (60+): 4

🎁 DISTRIBUIÇÃO POR BENEFÍCIO:
   • Cesta Básica: 5
   • Auxílio Alimentação: 3
   • Auxílio Financeiro: 2
   • Bolsa Cultura: 1

✨ SEED CONCLUÍDO COM SUCESSO!

🔐 CREDENCIAIS DE TESTE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 ADMIN:
   Email: admin@gac.com
   Senha: Admin@2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 FUNCIONÁRIO:
   Email: funcionario@gac.com
   Senha: Func@2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🧪 DEPOIS DO SEED: TESTAR LOCALMENTE

### 1️⃣ Rodar Backend
```bash
cd backend
npm run dev
```

### 2️⃣ Rodar Frontend (outro terminal)
```bash
cd frontend
npm run dev
```

### 3️⃣ Abrir Navegador
```
http://localhost:5173
```

### 4️⃣ Login com Dados de Teste
```
Email: admin@gac.com
Senha: Admin@2025
```

### 5️⃣ Testar Funcionalidades
- ✅ Listar pessoas (deve ter 10)
- ✅ Buscar por nome/CPF
- ✅ Filtrar por tipo de benefício
- ✅ Ver segmentação por faixa etária
- ✅ Editar uma pessoa
- ✅ Deletar uma pessoa
- ✅ Fazer logout/login

---

## 🔄 RESETAR E RODAR NOVAMENTE

Se quer limpar tudo e rodar novamente:

### Opção 1: Reseed Rápido
```bash
# Apenas deleta pessoas do admin e reinsere
node seed.js
```

### Opção 2: Reset Completo
```bash
cd backend
npm run prisma-reset
cd ..
node seed.js
```

**Cuidado**: `prisma-reset` deleta TUDO (usuários também)!

---

## 📋 DADOS CRIADOS PARA TESTE

Todos os dados incluem:
- ✅ CPF válido (passa em validação)
- ✅ Email único
- ✅ Telefone no formato brasileiro
- ✅ Endereço completo com cidade/estado
- ✅ Idades variadas (para testar segmentação)
- ✅ Benefícios diversos
- ✅ Observações úteis

---

## ❌ TROUBLESHOOTING

### Erro: "DATABASE_URL not found"
```
Solução:
1. Certifique-se que backend/.env existe
2. Verifica se DATABASE_URL está no arquivo
3. Tenta: cat backend/.env
```

### Erro: "Cannot find module '@prisma/client'"
```
Solução:
1. Instala dependências:
   npm install
2. Se ainda não funcionar:
   cd backend && npm install && cd ..
```

### Erro: "Unique constraint failed on cpf"
```
Solução:
1. Os CPFs já estão no banco
2. Rode: npm run prisma-reset (deleta tudo)
3. Depois: node seed.js
```

### Erro: "P1002 - Can't reach database"
```
Solução:
1. Verifica se Supabase está OK
2. Testa DATABASE_URL (copia corretamente do Supabase)
3. Verifica conexão de internet
4. Aguarda alguns segundos e tenta novamente
```

---

## ✨ PRÓXIMAS ETAPAS

Depois que o seed rodar:

1. ✅ Abra a aplicação no navegador
2. ✅ Faça login com `admin@gac.com`
3. ✅ Veja os 10 dados em 3 seções (criança, adulto, idoso)
4. ✅ Teste busca, filtro, edição, deleção
5. ✅ Faça logout e teste com `funcionario@gac.com`

---

## 📞 RESUMO RÁPIDO

```bash
# Pré-requisito: backend/.env com DATABASE_URL

# Rodar seed:
node seed.js

# Depois:
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2

# Abrir: http://localhost:5173
# Login: admin@gac.com / Admin@2025
```

**Sucesso! 🌱**
