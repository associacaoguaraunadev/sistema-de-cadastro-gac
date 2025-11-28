# 🚀 Guia de Setup: Vercel + Supabase

## ✅ PASSO 1: Preparar o Supabase (PostgreSQL Gratuito)

### 1.1 Criar Conta Supabase
```
1. Acesse https://supabase.com
2. Clique "Start your project"
3. Faça login com GitHub (recomendado)
4. Clique "New project"
```

### 1.2 Configurar Projeto
```
Nome: gac-system (ou seu nome)
Senha: Gere senha forte (12+ caracteres)
Região: us-east-1 (mais perto do Brasil, quase)
```

### 1.3 Aguardar Criação
- Supabase cria o banco (2-3 minutos)
- Você recebe a Dashboard

### 1.4 Obter DATABASE_URL
```
1. Na Dashboard, clique "Settings"
2. Clique "Database"
3. Copie a string de conexão em "Connection string" → "URI"
4. Será algo como:
   postgresql://postgres:suaSenha@db.supabase.co:5432/postgres
5. COPIE ESSE VALOR (precisa depois)
```

---

## ✅ PASSO 2: Preparar o Código Localmente

### 2.1 Criar arquivo .env
Na raiz do projeto, crie `.backend/.env`:

```env
DATABASE_URL=postgresql://postgres:sua_senha@db.supabase.co:5432/postgres
JWT_SECRET=seu_segredo_aleatorio_32_caracteres
NODE_ENV=production
CORS_ORIGIN=https://seu-projeto.vercel.app
```

### 2.2 Gerar JWT_SECRET
```bash
# No terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Resultado será algo como: `a1b2c3d4e5f6...` (64 caracteres)

### 2.3 Instalar Dependências da API
```bash
cd api
npm install
cd ..
```

### 2.4 Gerar Migrations Prisma
```bash
cd backend
# Isso cria as tabelas no Supabase
npm run prisma-migrate
```

Se aparecer erro, copie e cole a mensagem aqui para diagnosticar.

---

## ✅ PASSO 3: Deploy no Vercel

### 3.1 Preparar Vercel
```
1. Acesse https://vercel.com
2. Clique "Add New"
3. Clique "Project"
4. Conecte seu repositório GitHub
```

### 3.2 Importar Projeto
```
1. Selecione o repositório "sistema-de-cadastro-gac"
2. Framework Preset: Detecta automaticamente (React)
3. Root Directory: Deixe em branco (raiz do projeto)
4. Build Command: npm run build
5. Output Directory: frontend/dist
```

### 3.3 Configurar Variáveis de Ambiente
Antes de fazer deploy, clique "Environment Variables" e adicione:

```
DATABASE_URL = (valor do Supabase do Passo 1.4)
JWT_SECRET = (valor gerado no Passo 2.2)
CORS_ORIGIN = (será sua URL Vercel, adicione depois)
NODE_ENV = production
VITE_API_URL = (será sua URL Vercel, adicione depois)
```

### 3.4 Primeiro Deploy
```
1. Clique "Deploy"
2. Vercel começa a fazer build
3. Aguarde 3-5 minutos
4. Se tudo OK: Você recebe uma URL tipo "https://seu-projeto.vercel.app"
5. COPIE ESSA URL
```

### 3.5 Atualizar Variáveis (Vercel)
```
1. Volta ao projeto Vercel
2. Clique "Settings" → "Environment Variables"
3. Atualize:
   CORS_ORIGIN = https://seu-projeto.vercel.app
   VITE_API_URL = https://seu-projeto.vercel.app
4. Clique "Redeploy" para aplicar mudanças
```

---

## ✅ PASSO 4: Testar

### 4.1 Abrir Navegador
```
https://seu-projeto.vercel.app
```

### 4.2 Registrar
```
Email: teste@gac.com
Senha: MinSenha2025!
Nome: João Silva
```

Se funcionar: ✅ SUCESSO!

Se erro: vá para Troubleshooting abaixo.

---

## 🚨 TROUBLESHOOTING

### Erro: "Cannot connect to database"
```
Causa: DATABASE_URL está errado ou inválido
Solução:
1. Volta ao Supabase
2. Verifica se a URL está correta
3. Testa localmente: npm run prisma-migrate
```

### Erro: "CORS error" ou "Failed to fetch"
```
Causa: CORS_ORIGIN está errado
Solução:
1. Verifica sua URL Vercel (é exatamente igual?)
2. Sem https://: errado ❌
3. Com trailing slash: errado ❌
4. Exemplo correto: https://seu-projeto.vercel.app ✅
```

### Erro: "Token inválido"
```
Causa: JWT_SECRET está diferente entre local e Vercel
Solução:
1. Verifica se JWT_SECRET é idêntico nas 2 plataformas
2. Se errou, atualiza no Vercel
3. Faz redeploy
```

### Erro: "Database connection timeout"
```
Causa: Supabase com muitas conexões simultâneas
Solução:
1. Verifica se está em horário de pico
2. Tenta novamente em 5 minutos
3. Se persistir, aumenta plan do Supabase ($25/mês)
```

### Erro: "Method not allowed"
```
Causa: URL da API está errada
Solução:
1. No navegador, console (F12)
2. Network → vê qual URL chamou
3. Deve ser: https://seu-projeto.vercel.app/api/...
4. Se estiver "http://" ou porta 3001: errado
5. Volta a Passo 3.5 e reconfigura
```

---

## 📊 RESUMO FINAL

```
LOCAL (Para desenvolvimento):
├─ DATABASE_URL (Supabase)
├─ JWT_SECRET (seu_valor)
├─ CORS_ORIGIN = http://localhost:5173
└─ npm run dev (ambos backend e frontend)

VERCEL (Produção):
├─ DATABASE_URL (Supabase - MESMO valor)
├─ JWT_SECRET (MESMO valor)
├─ CORS_ORIGIN = https://seu-projeto.vercel.app
├─ VITE_API_URL = https://seu-projeto.vercel.app
└─ Deploy automático com cada push no GitHub
```

---

## 🆘 Ainda com dúvida?

Próximos passos recomendados:
1. Verifica se todos os erros acima não se aplicam
2. Abre browser console (F12) e vê exato mensagem erro
3. Tira screenshot do erro
4. Vem conversar!

---

## ✨ PRÓXIMOS PASSOS APÓS TUDO FUNCIONAR

1. Faça backup do banco (Supabase → Backups)
2. Configure autenticação no Supabase (Optional)
3. Monitore uso de requisições (Vercel Analytics)
4. Configure custom domain (Vercel Domains)

Parabéns por chegar aqui! 🎉
