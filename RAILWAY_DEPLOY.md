# 🚀 Deploy Railway - Passo-a-Passo

## ✅ Pré-requisitos

- [x] GitHub com seu código
- [x] Railway account (gratuito)
- [ ] Git instalado localmente

---

## 📋 PASSO 1: Fazer Push para GitHub

Certifique-se que seu código está no GitHub:

```bash
# Na raiz do projeto (gac_system)
git status

# Se não estiver inicializado:
git init

# Adicionar tudo
git add .

# Commit
git commit -m "Preparado para deploy Railway com PostgreSQL"

# Push (substitua origin/main conforme seu repo)
git push origin main
```

**Resultado esperado:** Seu código está no GitHub! ✅

---

## 🔑 PASSO 2: Gerar JWT_SECRET Seguro

Execute localmente:

```bash
# Gere uma chave aleatória forte
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Exemplo de resultado:**
```
a7f8d2e4b1c9e3f5a8d2e4b1c9e3f5a7d2e4b1c9e3f5a8d2e4b1c9e3f5a7
```

**Guarde esse valor!** 📝 Você usará na próxima etapa.

---

## 🌐 PASSO 3: Criar Conta Railway

### 3.1 Acesse Railway
```
1. Abra https://railway.app
2. Clique "Start Now"
3. Clique "Login with GitHub"
4. Autorize a aplicação
5. Confirme seu email
```

### 3.2 Criar Novo Projeto
```
1. Clique "New Project"
2. Clique "Provision PostgreSQL"
3. Aguarde 2-3 minutos
```

**Resultado:** Você tem um projeto com PostgreSQL pronto! ✅

---

## 🗄️ PASSO 4: Conectar Backend ao Banco

### 4.1 Adicionar Backend como Serviço

```
1. No painel do Railway, clique "New Service"
2. Escolha "GitHub Repo"
3. Autorize Railway a acessar seu GitHub
4. Selecione: seu-usuario/gac_system
5. Clique "Deploy"
```

### 4.2 Configurar Variáveis de Ambiente

```
1. Clique no serviço "gac-backend" (ou backend)
2. Clique na aba "Variables"
3. Clique "Raw Editor"
4. Copie e cole EXATAMENTE:
```

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=SEU_JWT_SECRET_AQUI (aquele que você gerou acima!)
NODE_ENV=production
PORT=3001
CORS_ORIGIN=${{Railway.publicDomain}}
```

**Importante:** 
- Substitua `SEU_JWT_SECRET_AQUI` pelo que você gerou no PASSO 2
- `${{Postgres.DATABASE_URL}}` conecta AUTOMATICAMENTE ao PostgreSQL!
- `${{Railway.publicDomain}}` é o domínio público do Railway

### 4.3 Configurar Build e Start

```
1. Clique na aba "Settings"
2. Procure "Build Command"
   - Deixar em branco (usa railway.json)
3. Procure "Start Command"
   - Deixar em branco (usa railway.json)
4. Procure "Root Directory"
   - Digite: backend
```

### 4.4 Deploy Backend

```
1. Clique "Deploy"
2. Aguarde 3-5 minutos
3. Verifique logs (aba "Logs")
   - Deve mostrar: "🚀 Servidor GAC iniciado na porta 3001"
```

**Se ver erro:** Veja a seção "Troubleshooting" abaixo.

---

## 🎨 PASSO 5: Deploy Frontend

### 5.1 Adicionar Frontend como Serviço

```
1. Novo "New Service" > GitHub Repo
2. Autorize Railway novamente
3. Selecione seu repositório
4. Deploy
```

### 5.2 Configurar Frontend

```
1. Clique no serviço "frontend"
2. Aba "Variables"
3. Clique "Raw Editor"
4. Cole:
```

```
VITE_API_URL=${{backend.RAILWAY_PUBLIC_URL}}
```

**Importante:** Substitua `backend` pelo nome exato do seu serviço backend no Railway!

### 5.3 Configurar Build

```
1. Aba "Settings"
2. "Root Directory": frontend
3. "Build Command": npm run build
4. "Start Command": npm run preview
```

### 5.4 Deploy

```
1. Clique "Deploy"
2. Aguarde 2-3 minutos
3. Frontend estará em: https://seu-frontend-xxxxx.railway.app
```

---

## ✅ PASSO 6: Testar Sua Aplicação

### 6.1 Acessar Frontend

```
1. Abra: https://seu-frontend-xxxxx.railway.app
2. Clique "Registrar"
3. Crie um usuário de teste:
   - Nome: Admin Teste
   - Email: admin@test.com
   - Senha: Senha@123
```

### 6.2 Login

```
1. Use email e senha criados acima
2. Se funcionar, você vê a lista de beneficiários
3. Tudo funcionando! ✅
```

### 6.3 Criar Beneficiário

```
1. Clique "Novo Cadastro"
2. Preencha os campos OBRIGATÓRIOS:
   - Nome: João Silva
   - CPF: 12345678901
   - Endereço: Rua das Flores, 123
   - Tipo Benefício: Alimentação
3. Deixe vazios: Email, Telefone, etc.
4. Clique "Salvar"
```

**Se tudo funcionar:** Seu deploy está pronto! 🎉

---

## 🐛 Troubleshooting

### Erro: "Build command failed"

```
Solução 1: Verificar logs
├─ Railway > Seu Serviço > "Logs"
├─ Procure por "ERROR"
└─ Note a mensagem de erro

Solução 2: Adicionar prisma-migrate
├─ Edite backend/railway.json
├─ Adicione: npx prisma migrate deploy
└─ Faça push para GitHub

Solução 3: Verificar Node version
├─ Railway > Seu Serviço > "Environment"
├─ Procure NODE_VERSION
├─ Configure: 18 ou 20
```

### Erro: "Cannot find module '@prisma/client'"

```
Solução:
├─ Railway > Backend > Variables
├─ Adicione: 
   BUILD_CMD=npm install && npx prisma generate
├─ Redeploy
```

### Erro: "Database connection refused"

```
Solução:
├─ Verifique se PostgreSQL está rodando
├─ Railway > PostgreSQL > Status (deve ser "Running")
├─ DATABASE_URL está correto?
├─ Use: ${{Postgres.DATABASE_URL}}
```

### Frontend não consegue conectar ao Backend

```
Solução 1: Verificar CORS
├─ Railway > Backend > Variables
├─ CORS_ORIGIN deve ter seu frontend URL
├─ Ou deixar vazio para aceitar tudo

Solução 2: Verificar URL da API
├─ Frontend > Variables
├─ VITE_API_URL deve ser: https://seu-backend.railway.app
├─ Não é "localhost"!
```

### Aplicação muito lenta

```
Solução:
├─ Railway > PostgreSQL > Logs
├─ Procure por "slow query"
├─ Ou aumentar RAM (pago)
├─ Seu caso (15k registros) deve ser rápido
```

---

## 💡 Dicas Importantes

### 1. Monitorar Uso do Crédito Gratuito

```
Railway Dashboard > Account > Usage
Monitore mensalmente para não ultrapassar $5
```

### 2. Backups Automáticos

```
Railway > PostgreSQL > Backups
✅ Faz backup automático diário
✅ Pode restaurar em 1-click se algo der errado
```

### 3. Variáveis de Ambiente por Ambiente

```
Desenvolvimento (local):
├─ DATABASE_URL = file:./dev.db
├─ NODE_ENV = development

Produção (Railway):
├─ DATABASE_URL = ${{Postgres.DATABASE_URL}}
├─ NODE_ENV = production
```

### 4. Logs e Debugging

```
Railway > Seu Serviço > Logs
├─ Ver logs em tempo real
├─ Filtra por ERROR, INFO, etc
├─ Muito útil para troubleshooting
```

---

## 📊 Checklist Final

Antes de considerar pronto:

- [ ] Conta Railway criada
- [ ] PostgreSQL provisionado
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] JWT_SECRET configurado
- [ ] CORS_ORIGIN configurado
- [ ] DATABASE_URL usando ${{Postgres.DATABASE_URL}}
- [ ] Frontend consegue acessar Backend
- [ ] Login funciona
- [ ] Criar beneficiário funciona
- [ ] Listar beneficiários funciona
- [ ] Editar beneficiário funciona
- [ ] Deletar beneficiário funciona

---

## 🎯 URLs Finais

Após deploy, você terá:

```
Frontend: https://seu-frontend-xxxxx.railway.app
Backend:  https://seu-backend-xxxxx.railway.app
Database: PostgreSQL (privado, acessível via código)
```

---

## 💰 Custo Final

```
Seu caso (15.000 registros, 5 usuários):
├─ PostgreSQL: ~$1/mês
├─ Backend: ~$0.50/mês
├─ Frontend: ~$0/mês
└─ TOTAL: ~$1.50/mês (DENTRO DOS $5 GRÁTIS!)

Resultado: $0/mês por TEMPO INDEFINIDO! ✅
```

---

## 🆘 Precisa de Ajuda?

Se algo não funcionar:

1. **Verifique os Logs**
   - Railway > Seu Serviço > Logs
   - 90% dos problemas aparecem lá

2. **Verifique as Variáveis**
   - DATABASE_URL, JWT_SECRET, CORS_ORIGIN
   - Typos? Valores errados?

3. **Documentação Official**
   - https://docs.railway.app
   - https://docs.railway.app/deploy/deployments

4. **Discord Railway**
   - https://discord.gg/railway
   - Comunidade muito ativa

---

## ✨ Parabéns! 🎉

Sua aplicação GAC está online e gratuita!

**Próximas ideias:**
- [ ] Adicionar relatórios em PDF
- [ ] Exportar beneficiários em Excel
- [ ] Gráficos e estatísticas
- [ ] Notificações por email
- [ ] Aplicativo mobile

Quer implementar alguma dessas funcionalidades?
