# 🚀 Configuração de Environment Variables - Vercel

## 📋 Passos para Configurar na Vercel

### 1️⃣ Acesse o Dashboard da Vercel

1. Abra https://vercel.com/dashboard
2. Clique no seu projeto **"sistema-de-cadastro-gac"**
3. Vá para a aba **Settings** (engrenagem no topo)

### 2️⃣ Vá para Environment Variables

- No menu esquerdo, procure por **Environment Variables**
- Clique nele

### 3️⃣ Adicione Cada Variável

Para cada variável abaixo, clique em **"Add New"** e configure:

---

### 📝 Variável 1: DATABASE_URL

**Nome:** `DATABASE_URL`

**Valor:**
```
postgresql://postgres.oashngynwtkaxefphenv:95Hx30xlr8*@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**Environments:** ☑️ Production ☑️ Preview ☑️ Development

Clique **"Save"**

---

### 📝 Variável 2: DIRECT_URL

**Nome:** `DIRECT_URL`

**Valor:**
```
postgresql://postgres.oashngynwtkaxefphenv:95Hx30xlr8*@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**Environments:** ☑️ Production ☑️ Preview ☑️ Development

Clique **"Save"**

---

### 📝 Variável 3: JWT_SECRET

**Nome:** `JWT_SECRET`

**Valor:**
```
ef5c74a38f055e19631c644aca2f6a3fb646d2456d99f1b8c50ed310436ab90c
```

**Environments:** ☑️ Production ☑️ Preview ☑️ Development

Clique **"Save"**

---

### 📝 Variável 4: CORS_ORIGIN

**Nome:** `CORS_ORIGIN`

**Valor:** (SUBSTITUA pelo nome real do seu projeto)
```
https://SEU-PROJETO-GAC.vercel.app
```

⚠️ **IMPORTANTE:** 
- Se seu projeto na Vercel se chama "sistema-de-cadastro-gac", use: `https://sistema-de-cadastro-gac.vercel.app`
- Se seu projeto se chama "meu-gac", use: `https://meu-gac.vercel.app`

**Environments:** ☑️ Production ☑️ Preview ☑️ Development

Clique **"Save"**

---

### 📝 Variável 5: NODE_ENV

**Nome:** `NODE_ENV`

**Valor:**
```
production
```

**Environments:** ☑️ Production ☑️ Preview ☑️ Development

Clique **"Save"**

---

### 📝 Variável 6: VITE_API_URL

**Nome:** `VITE_API_URL`

**Valor:** (SUBSTITUA pelo nome real do seu projeto)
```
https://SEU-PROJETO-GAC.vercel.app/api
```

⚠️ **IMPORTANTE:**
- Se seu projeto é "sistema-de-cadastro-gac", use: `https://sistema-de-cadastro-gac.vercel.app/api`
- Se seu projeto é "meu-gac", use: `https://meu-gac.vercel.app/api`

**Environments:** ☑️ Production ☑️ Preview ☑️ Development

Clique **"Save"**

---

## 4️⃣ Redeploy o Projeto

### Opção A: Via Dashboard

1. Clique na aba **"Deployments"**
2. Procure pelo deployment mais recente (geralmente em vermelho/falhou)
3. Clique nos **3 pontinhos (...)** no lado direito
4. Selecione **"Redeploy"**

### Opção B: Fazer novo Push

```bash
cd seu-projeto
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

---

## 5️⃣ Acompanhe o Build

- A Vercel começará o novo build automaticamente
- Você verá o log em tempo real
- Aguarde até ver: ✅ **Built and Deployed Successfully**

Se der erro, clique no build e veja o log completo do erro.

---

## ✅ Como Verificar se Funcionou

1. Acesse seu site: `https://seu-projeto-gac.vercel.app`
2. Tente fazer login com:
   - Email: `admin@test.com`
   - Senha: `Senha@123`
3. Se conseguir ver a lista de beneficiários, está tudo funcionando! 🎉

---

## 🔍 Encontrando o Nome Exato do Seu Projeto

- No dashboard da Vercel, observe a URL: `https://vercel.com/...`
- Ou procure por um botão que mostra o nome do projeto (geralmente no topo)
- O nome é exatamente o que vem antes de `.vercel.app`

Exemplo:
- Se a URL final é `sistema-de-cadastro-gac.vercel.app`
- Então CORS_ORIGIN = `https://sistema-de-cadastro-gac.vercel.app`
- E VITE_API_URL = `https://sistema-de-cadastro-gac.vercel.app/api`

---

## ⚠️ Checklist Final

Antes de fazer Redeploy, confirme:

- [ ] DATABASE_URL está configurada
- [ ] DIRECT_URL está configurada
- [ ] JWT_SECRET está configurada
- [ ] CORS_ORIGIN está com a URL correta do seu projeto
- [ ] NODE_ENV está setado como "production"
- [ ] VITE_API_URL está com a URL correta + /api
- [ ] Todas as 6 variáveis foram setadas em Production, Preview e Development
- [ ] Novo código foi feito push para GitHub (vercel.json corrigido)

---

## 🆘 Se der erro ainda

Se continuar dando erro de "Environment variable not found", verifique:

1. **Digitou corretamente o nome?** (case-sensitive: `DATABASE_URL` não é igual a `database_url`)
2. **Selecionou os ambientes corretos?** (deve estar marcado Production, Preview e Development)
3. **Clicou "Save" em cada variável?**
4. **Fez Redeploy após adicionar as variáveis?**

Se nenhum desses resolver, envie uma screenshot do erro para eu analisar! 📸

