# 🎉 Deploy 100% Gratuito - GAC System

## ✅ Opção 1: Railway + PostgreSQL (RECOMENDADO)

Railway tem um **tier gratuito muito generoso**:

```
💰 Crédito Gratuito: $5/mês
⏱️ Válido indefinidamente
📊 Suficiente para: 15.000 registros + backup
🎯 Melhor opção para seu caso
```

### Como Configurar:

#### 1. Criar Conta
```
1. Acesse https://railway.app
2. Clique "Start Now"
3. Faça login com GitHub (grátis)
4. Confirme email
```

#### 2. Criar Novo Projeto
```
1. Clique "New Project"
2. Selecione "Deploy from Repo"
3. Conecte seu repositório GitHub
4. Selecione a branch main
```

#### 3. Adicionar PostgreSQL
```
1. No painel, clique "Add Service"
2. Escolha "PostgreSQL"
3. Clique "Deploy"
4. Aguarde a criação (2-3 min)
```

#### 4. Configurar Variáveis de Ambiente
```
1. Clique na tab "Variables"
2. Copie DATABASE_URL gerada automaticamente
3. Adicione outras variáveis:
```

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=sua_chave_secreta_super_forte_aqui
NODE_ENV=production
PORT=8080
```

#### 5. Deploy Backend
```
1. No painel Railway, clique "New Service"
2. Escolha "GitHub Repo"
3. Selecione seu repositório
4. Configure:
   - Root Directory: backend/
   - Start Command: node src/index.js
5. Clique "Deploy"
```

#### 6. Deploy Frontend
```
1. Novo "New Service" > GitHub Repo
2. Selecione repositório
3. Configure:
   - Root Directory: frontend/
   - Build Command: npm run build
   - Start Command: npm run preview
   - VITE_API_URL: https://seu-backend.railway.app
4. Deploy!
```

---

## ✅ Opção 2: Render + PostgreSQL (ALTERNATIVA)

```
💰 Crédito Gratuito: Ilimitado (150h/mês)
⏱️ Web Services: Sim
📊 Banco de dados: PostgreSQL grátis
🎯 Bom se Railway ficar cheio
```

### Setup Render:

```bash
# 1. https://render.com
# 2. Sign up com GitHub
# 3. New > PostgreSQL
# 4. Free tier: $0/mês
# 5. New > Web Service
# 6. Conectar repositório
# 7. Build: npm install
# 8. Start: npm run start
```

---

## ✅ Opção 3: Vercel + Render (MAIS COMPLEXO)

```
Frontend: Vercel (100% grátis)
Backend: Render (150h grátis/mês)
Banco: PostgreSQL Render (grátis)
```

### Vantagem:
- Frontend muito rápido (CDN global)
- Backend escalável
- PostgreSQL grátis

### Desvantagem:
- Mais complexo de configurar
- Backend hiberna após 15 min inativo

---

## ✅ Opção 4: Heroku (JÁ NÃO RECOMENDADO)

❌ Heroku mudou política em 2022
- Tier gratuito descontinuado
- Novo plano mínimo: $7/mês
- **Não recomendado para novo setup**

---

## ✅ Opção 5: SEM NUVEM - Banco de Dados Local

### Se quiser ZERO custo (até local mesmo):

```
Database: SQLite (local)
Backend: Seu computador/RPI
Frontend: GitHub Pages

Vantagem: 100% gratuito
Desvantagem: Não accessible pela internet
```

**Não recomendado** para GAC porque precisa ser acessado de vários lugares.

---

## 🏆 MINHA RECOMENDAÇÃO: Railway

### Por quê?

| Aspecto | Railway | Render | Vercel |
|--------|---------|--------|--------|
| Setup | ⭐⭐⭐⭐⭐ Muito fácil | ⭐⭐⭐⭐ Fácil | ⭐⭐⭐ Médio |
| Custo | 💰 $5/mês grátis | 💰 150h grátis | 💰 Grátis (frontend) |
| PostgreSQL | ✅ Sim | ✅ Sim | ❌ Não |
| Uptime | ⭐⭐⭐⭐⭐ 99.9% | ⭐⭐⭐⭐ 99% | ⭐⭐⭐⭐⭐ 99.99% |
| Suporte | ⭐⭐⭐⭐ Bom | ⭐⭐⭐ OK | ⭐⭐⭐⭐ Bom |
| Hibernation | ❌ Não | ✅ 15 min | ❌ Não |

**Railway = Melhor custo-benefício!** 🎯

---

## 📋 Guia Passo-a-Passo: Railway

### PASSO 1: Preparar Código

#### 1.1 Backend - arquivo `railway.json`
```bash
cd backend
```

Crie `backend/railway.json`:
```json
{
  "buildCommand": "npm install",
  "startCommand": "node src/index.js"
}
```

#### 1.2 Adicionar `.env` ao `.gitignore`
```bash
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
```

#### 1.3 Garantir `package.json` correto
```bash
cat package.json
```

Deve ter:
```json
{
  "name": "gac-system-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.0.0",
    "bcryptjs": "^2.4.3",
    // ... resto das dependências
  }
}
```

### PASSO 2: Fazer Push para GitHub

```bash
# Do diretório raiz
git add .
git commit -m "Preparado para deploy Railway"
git push origin main
```

### PASSO 3: Criar Conta Railway

```
1. Acesse: https://railway.app
2. Clique "Start Now"
3. Escolha "Login with GitHub"
4. Autorize a aplicação
5. Confirme email
```

### PASSO 4: Criar PostgreSQL

```
1. Painel Railway > "New Project"
2. Clique "Provision PostgreSQL"
3. Aguarde criação (2-3 minutos)
```

### PASSO 5: Deploy Backend

```
1. Mesmo projeto, clique "New Service"
2. Escolha "GitHub Repo"
3. Conecte seu repositório
4. Selecione branch: main
5. Configure:
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: node src/index.js
6. Clique "Deploy"
7. Aguarde (3-5 min)
```

### PASSO 6: Configurar Variáveis (Importante!)

```
1. Clique na aba "Variables"
2. Clique "Raw Editor"
3. Copie e cole:

DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=seu_secret_super_forte_123456
NODE_ENV=production
PORT=3001
```

**Nota:** `${{Postgres.DATABASE_URL}}` conecta automaticamente ao PostgreSQL!

### PASSO 7: Deploy Frontend

```
1. Novo "New Service" > GitHub Repo
2. Root Directory: frontend
3. Build Command: npm run build
4. Start Command: npm run preview
5. Adicionar variável:
   VITE_API_URL=https://seu-backend.railway.app
6. Deploy
```

### PASSO 8: Migrar Banco de Dados

```bash
# SSH no Railway
railway exec npm run prisma-migrate-dev -- --init-dev-deploy-dir prisma/migrations

# Ou, localmente com DATABASE_URL remoto:
DATABASE_URL="sua_url_do_railway" npx prisma migrate deploy
```

---

## 💰 Quanto Custa?

### Railway - Tier Gratuito

```
✅ $5 de crédito / mês
✅ PostgreSQL: $1-2/mês (dentro do crédito)
✅ Backend: $2-3/mês (dentro do crédito)
✅ Total: ~$0/mês! (cabe nos $5 grátis)

Se ultrapassar:
- PostgreSQL: $9/mês (depois dos $5)
- Backend: $5/mês (depois dos $5)
- Seu caso (15k registros): improvável ultrapassar!
```

### Exemplo Real - Seu Caso (15.000 registros)

```
Database:
├─ Armazenamento: 500MB = $0.50
├─ Conexões: ~5 = $0.10
└─ Backup: Incluso = $0

Backend:
├─ CPU: ~10% = $0.50
├─ RAM: ~50MB = $0.20
├─ Bandwidth: ~1GB/mês = $0
└─ Total = $0.70

TOTAL MENSAL = ~$1.20 (DENTRO DOS $5 GRÁTIS!)
```

---

## 🔐 Segurança no Deploy

### 1. JWT_SECRET Seguro
```bash
# Gere uma chave aleatória forte
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Resultado (exemplo):
# a7f8d2e4b1c9e3f5a8d2e4b1c9e3f5a7

# Use isso como JWT_SECRET no Railway
```

### 2. Banco de Dados Seguro
```
Railway já:
✅ Criptografa em trânsito (SSL/TLS)
✅ Criptografa em repouso
✅ Backup automático diário
✅ Restauração em 1-click
```

### 3. Variáveis de Ambiente
```
✅ Nunca fazer commit de .env
✅ Usar Railway Variables (seguro)
✅ Diferentes valores para dev/prod
```

---

## 🚀 Teste Seu Deploy

```bash
# 1. Frontend deve estar em:
https://seu-frontend.railway.app

# 2. Backend deve responder em:
https://seu-backend.railway.app/api/pessoas

# 3. Testar login:
POST https://seu-backend.railway.app/api/autenticacao/registrar
{
  "nome": "Admin",
  "email": "admin@gac.org.br",
  "senha": "Senha123!",
  "confirmacaoSenha": "Senha123!"
}

# 4. Se receber token JWT, está funcionando! ✅
```

---

## 💡 Dicas de Economia

### Para Nunca Sair da Camada Gratuita:

1. **Use Cache Agressivo**
```javascript
// Apenas recarrega dados a cada 1 hora
const CACHE_TTL = 3600;
```

2. **Comprima Responses**
```javascript
import compression from 'compression';
app.use(compression());
```

3. **Monitore Uso**
```
Railway Dashboard > Usage
Verifique mensalmente se continua nos $5
```

4. **Limpe Dados Antigos**
```sql
-- Delete registros com mais de 2 anos
DELETE FROM pessoa WHERE dataCriacao < NOW() - INTERVAL '2 years';
```

---

## ⚠️ Limitações Railway Gratuito

```
✅ Funciona para: 5-15k registros
✅ Uptime: 99.9% (muito bom)
✅ Bandwidth: Ilimitado
✅ Requisições: Ilimitadas

❌ Limitações:
- Hibernação: Não tem (sempre rodando)
- CPU: Compartilhada (não é problema)
- RAM: 512MB (mais que suficiente)
- Storage: 10GB (mais que suficiente)
```

---

## 🔄 Alternativa se Quiser 0% de Risco de Custo

### Opção: Render (150h grátis = ~6.25 dias/mês)

```bash
# 1. https://render.com
# 2. Sign up GitHub
# 3. New > PostgreSQL
# 4. Free: $0/mês
# 5. New > Web Service (Node)
# 6. Build: npm install
# 7. Start: node src/index.js
# 8. Resultado: $0/mês garantido
```

**Desvantagem:** Hibernação após 15 min (demora 50 seg para acordar)

---

## 📊 Comparativo Final

```
╔═════════════╦═════════════╦════════════╦══════════╗
║  Serviço    ║ Backend     ║ Database   ║  Total   ║
╠═════════════╬═════════════╬════════════╬══════════╣
║ Railway     ║ $5 grátis   ║ Incluso    ║ $0/mês ✅║
║ Render      ║ 150h/mês    ║ $0/mês     ║ $0/mês ✅║
║ Vercel      ║ Paid        ║ N/A        ║ Paid ❌  ║
║ Heroku      ║ $7+/mês     ║ $10+/mês   ║ $17+ ❌  ║
╚═════════════╩═════════════╩════════════╩══════════╝
```

---

## ✅ Próximas Ações

### Se escolher Railway:
```
1. Criar conta em https://railway.app
2. Conectar GitHub
3. Provisionar PostgreSQL
4. Deploy backend + frontend
5. Migrar banco
6. Testar
```

### Se escolher Render:
```
1. Criar conta em https://render.com
2. Provisionar PostgreSQL
3. Criar Web Service
4. Deploy
5. Testar
```

---

## 🎯 Recomendação Final

**Use Railway!** Por quê:

✅ $5/mês grátis é suficiente indefinidamente  
✅ Sem hibernação (sempre rodando)  
✅ Setup muito simples (5 min)  
✅ PostgreSQL incluído  
✅ Suporte ótimo  
✅ 99.9% uptime  

**Sua aplicação rodará de graça para sempre!** 🚀

---

## 📞 Suporte

Se tiver dúvidas:
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Discord Railway: https://discord.gg/railway

Quer que eu crie um **script de deploy automático**?
