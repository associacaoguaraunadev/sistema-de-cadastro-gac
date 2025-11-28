# ✅ REFACTOR VERCEL + SUPABASE - CHECKLIST COMPLETO

## 🎯 FASE 1: ENTENDER (Agora)

- [ ] Ler `COMECE_AQUI_NOVO.md` (você está aqui!)
- [ ] Ler `QUICK_START.md` (5 min)
- [ ] Entender a estrutura: `ESTRUTURA_VISUAL.md`
- [ ] Saber o que mudou: `MIGRACAO_VERCEL_SUPABASE.md`

---

## 🌐 FASE 2: CONFIGURAR SUPABASE (5 min)

- [ ] Acesso supabase.com
- [ ] Cria conta (GitHub recomendado)
- [ ] Clica "New Project"
- [ ] Seta nome: `gac-system`
- [ ] Seta senha forte
- [ ] Seleciona região: `us-east-1`
- [ ] Aguarda criação (2-3 min)
- [ ] Vai em Settings → Database
- [ ] Copia a CONNECTION STRING (URI)
- [ ] **GUARDA ESSA URL** (precisa depois!)

---

## 💻 FASE 3: CONFIGURAR LOCALMENTE (3 min)

### 3.1 Criar backend/.env
- [ ] Abre `backend/` (ou cria pasta se não existir)
- [ ] Cria arquivo `.env`
- [ ] Copia este conteúdo:

```env
DATABASE_URL=<COLE A URL DO SUPABASE AQUI>
JWT_SECRET=<GENERATE_ABAIXO>
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173
```

### 3.2 Gerar JWT_SECRET
- [ ] Abre PowerShell (Windows) ou Terminal (Mac/Linux)
- [ ] Cola este comando:

**Windows (PowerShell)**:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Mac/Linux**:
```bash
openssl rand -base64 32
```

**Node.js** (qualquer SO):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] Copia o resultado (será uma string longa)
- [ ] Cola em JWT_SECRET no `.env`

### 3.3 Verificar .env
- [ ] DATABASE_URL não está vazio ✅
- [ ] JWT_SECRET não está vazio ✅
- [ ] NODE_ENV = `production` ✅
- [ ] CORS_ORIGIN = `http://localhost:5173` ✅
- [ ] **Salva o arquivo** ✅

---

## 🗄️ FASE 4: CRIAR TABELAS (1 min)

### 4.1 Terminal
- [ ] Abre terminal em `backend/`
- [ ] Cola comando:

```bash
npm run prisma-migrate
```

- [ ] Prisma pergunta: "Enter a name for the new migration:"
- [ ] Cola: `inicial` (ou pressiona ENTER)
- [ ] Aguarda conclusão
- [ ] Vê mensagem: ✅ "Database synced"

### 4.2 Verificar
- [ ] Vai no Supabase Dashboard
- [ ] Clica "Database" → "Tables"
- [ ] Vê: `Usuario` e `Pessoa` criadas ✅

---

## 🧪 FASE 5: TESTAR LOCALMENTE (5 min)

### 5.1 Terminal 1: Backend
- [ ] Abre novo terminal em `backend/`
- [ ] Cola:

```bash
npm run dev
```

- [ ] Vê mensagem: "🚀 Servidor GAC iniciado na porta 3001"
- [ ] **NÃO FECHA ESTE TERMINAL**

### 5.2 Terminal 2: Frontend
- [ ] Abre novo terminal em `frontend/`
- [ ] Cola:

```bash
npm install  (se não feito)
npm run dev
```

- [ ] Vê mensagem: "Local: http://localhost:5173"
- [ ] Navegador abre automaticamente
- [ ] **NÃO FECHA ESTE TERMINAL**

### 5.3 Testar Aplicação
- [ ] Clica "Registre-se aqui"
- [ ] Preenche:
  - Email: `teste@gac.com`
  - Senha: `MinSenha2025!`
  - Nome: `João Silva`
- [ ] Clica "Criar Conta"
- [ ] **DEVE REDIRECIONAR PARA LISTA (vazia)** ✅

### 5.4 Criar Pessoa
- [ ] Clica "Novo Cadastro"
- [ ] Preenche:
  - Nome: `Maria Santos`
  - CPF: `123.456.789-09`
  - Endereço: `Rua Principal, 100`
  - Benefício: `Cesta Básica`
- [ ] Clica "Salvar"
- [ ] **DEVE VOLTAR À LISTA COM PESSOA** ✅

### 5.5 Logout/Login
- [ ] Clica seu nome (canto superior)
- [ ] Clica "Sair"
- [ ] Deve redirecionar para login
- [ ] Faz login novamente com mesmo email/senha
- [ ] **DEVE VER A PESSOA QUE CRIOU** ✅

---

## 🎉 FASE 6: GITHUB (2 min)

### 6.1 Commit
- [ ] Abre novo terminal na raiz do projeto
- [ ] Cola:

```bash
git add .
git commit -m "Refactor: Vercel Serverless + Supabase"
git push origin main
```

- [ ] Aguarda push completar
- [ ] Verifica no GitHub: https://github.com/seu-user/seu-repo
- [ ] Vê o novo commit

---

## 🚀 FASE 7: DEPLOY VERCEL (5 min)

### 7.1 Conectar Repositório
- [ ] Acessa vercel.com
- [ ] Clica "Add New" → "Project"
- [ ] Clica "Import Git Repository"
- [ ] Seleciona: `sistema-de-cadastro-gac`
- [ ] Clica "Import"

### 7.2 Configurar Build
- [ ] Root Directory: deixa em branco (raiz)
- [ ] Framework Preset: React (auto)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `frontend/dist`

### 7.3 Adicionar Variáveis
- [ ] Clica "Environment Variables"
- [ ] Adiciona 5 variáveis:

```
DATABASE_URL = [copia do Supabase]
JWT_SECRET = [mesmo do .env local]
NODE_ENV = production
CORS_ORIGIN = [deixa vazio, atualiza depois]
VITE_API_URL = [deixa vazio, atualiza depois]
```

- [ ] Clica "Deploy"
- [ ] Aguarda 3-5 minutos

### 7.4 Receber URL
- [ ] Vercel mostra: "https://seu-projeto-XXXXX.vercel.app"
- [ ] **COPIA ESSA URL**

---

## 🔄 FASE 8: FINALIZAR VARIÁVEIS (2 min)

### 8.1 Atualizar Vercel
- [ ] Volta para Vercel (seu projeto)
- [ ] Clica "Settings" → "Environment Variables"
- [ ] Edita CORS_ORIGIN:
  - Valor: `https://seu-projeto-XXXXX.vercel.app` (do passo 7.4)
- [ ] Edita VITE_API_URL:
  - Valor: `https://seu-projeto-XXXXX.vercel.app` (MESMO)
- [ ] Clica "Save"

### 8.2 Redeploy
- [ ] Volta para "Deployments"
- [ ] Encontra último deploy (será "Building" ou "Ready")
- [ ] Clica os "..." (três pontinhos)
- [ ] Clica "Redeploy"
- [ ] Aguarda 1-2 minutos

---

## 🎯 FASE 9: TESTE FINAL (5 min)

### 9.1 Abrir em Produção
- [ ] Abre navegador
- [ ] Cola URL: `https://seu-projeto-XXXXX.vercel.app`
- [ ] Página deve carregar (pode levar 2-3s primeira vez)

### 9.2 Testar Registro
- [ ] Clica "Registre-se aqui"
- [ ] Preenche com emails DIFERENTES:
  - Email: `usuario@seu-dominio.com`
  - Senha: `SenhaSegura2025!`
  - Nome: `Seu Nome`
- [ ] Clica "Criar Conta"
- [ ] **DEVE FUNCIONAR** ✅

### 9.3 Testar Criar Pessoa
- [ ] Clica "Novo Cadastro"
- [ ] Preenche dados completos
- [ ] Clica "Salvar"
- [ ] **DEVE APARECER NA LISTA** ✅

### 9.4 Teste Completo
- [ ] Logout
- [ ] Login novamente
- [ ] Pessoa deve estar lá
- [ ] **TUDO FUNCIONANDO!** ✅

---

## 📊 RESUMO FINAL

```
✅ Supabase criado
✅ Database URL copiado
✅ backend/.env configurado
✅ JWT_SECRET gerado
✅ Tabelas criadas (prisma migrate)
✅ Backend roda em localhost:3001
✅ Frontend roda em localhost:5173
✅ Testes locais passaram
✅ GitHub commitado
✅ Vercel conectado
✅ Variáveis setadas
✅ Primeiro deploy feito
✅ Teste final passou

🎉 VOCÊ ESTÁ EM PRODUÇÃO!
```

---

## 🆘 ERROS DURANTE PROCESSO?

### Erro: "DATABASE_URL é inválido"
```
Solução:
1. Volta Supabase
2. Copia novamente a URL (exato, sem espaços)
3. Cola em backend/.env
```

### Erro: "Cannot connect to database"
```
Solução:
1. Verifica se Supabase password é forte
2. Tenta `npm run prisma-migrate` novamente
3. Se persistir, reinicia Supabase
```

### Erro: "CORS error" em produção
```
Solução:
1. Volta Vercel
2. Verifica CORS_ORIGIN exato
3. Sem https://: ERRADO ❌
4. Com trailing slash: ERRADO ❌
5. Exemplo correto: https://seu-projeto.vercel.app ✅
6. Faz redeploy
```

### Erro: "npm: command not found"
```
Solução:
1. Instala Node.js: https://nodejs.org
2. Reinicia terminal
3. Verifica: node -v && npm -v
```

---

## 📞 PRÓXIMOS PASSOS (Depois de Tudo OK)

- [ ] Compartilha URL com GAC para feedback
- [ ] Configure custom domain (opcional)
- [ ] Ative backups automáticos Supabase
- [ ] Monitore analytics Vercel
- [ ] Documente URL final para equipe

---

## ✨ PARABÉNS!

Seu projeto agora está:

```
✅ Online 24/7
✅ Escalável automaticamente
✅ Seguro em produção
✅ Sem servidor para gerenciar
✅ Pronto para GAC usar!
```

**URL Final**: `https://seu-projeto-XXXXX.vercel.app`

Compartilha com GAC e diz para testar! 🎉

---

## 📚 REFERÊNCIAS RÁPIDAS

| Problema | Arquivo |
|----------|---------|
| Não entendo o processo | SETUP_VERCEL_SUPABASE.md |
| Quero testar localmente | TESTE_LOCAL.md |
| Algoritmo da API | ESTRUTURA_VISUAL.md |
| O que mudou no código | MIGRACAO_VERCEL_SUPABASE.md |
| Quero ver tudo resumido | RESUMO_REFACTOR.md |

---

**Sucesso! Deixe-me saber quando estiver em produção! 🚀**
