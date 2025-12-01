# ⚠️ Problema: Seed Não Funciona - Credenciais Supabase Inválidas

## O Erro
```
Authentication failed against database server, 
the provided database credentials for `postgres` are not valid.
```

## Causas Possíveis

1. **Credenciais mudaram** no Supabase
2. **Senha expirou** ou foi resetada
3. **URL de conexão está incorreta**

---

## Solução 1: Verificar Credenciais (Recomendado)

### Passo 1: Acesse o Supabase Console
- Abra https://console.supabase.com
- Selecione seu projeto
- Vá em **Settings** → **Database**

### Passo 2: Copie a Connection String Correta
Procure por **Connection pooling** (porta 6543):
```
postgresql://postgres.XXXXXXXXXXXX:YYYYYYYYYY@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Passo 3: Atualize o `.env`
```dotenv
DATABASE_URL=<cole aqui a nova connection string>
DIRECT_URL=<mesma URL mas com porta 5432 no final>
```

### Passo 4: Teste a Conexão
```bash
node test-db-connection.js
```

### Passo 5: Se funcionar, rode o seed
```bash
npm run seed
```

---

## Solução 2: Reset de Senha (Se Necessário)

Se as credenciais estão completamente perdidas:

1. Acesse https://console.supabase.com
2. Vá em **Settings** → **Database** 
3. Clique em "Reset Database Password"
4. Copie a nova senha
5. Construa a nova CONNECTION STRING com a nova senha
6. Atualize o `.env`

---

## Solução 3: Usar Database Local (Alternativa)

Se o Supabase não funcionar, você pode usar PostgreSQL local:

### Instalar PostgreSQL
- Windows: https://www.postgresql.org/download/windows/
- Criar um banco: `CREATE DATABASE gac_system;`

### Atualizar `.env`
```dotenv
DATABASE_URL=postgresql://postgres:sua_senha_local@localhost:5432/gac_system
DIRECT_URL=postgresql://postgres:sua_senha_local@localhost:5432/gac_system
```

---

## Status Atual

✅ Seed script configurado corretamente  
✅ Prisma client gerado  
❌ Conexão ao banco bloqueada por credenciais inválidas  

**Próximo passo:** Verificar credenciais no Supabase console
