# 🔑 Como Obter Credenciais Corretas do Supabase

## Passo 1: Acesse o Supabase
1. Vá para https://app.supabase.com
2. Faça login com sua conta
3. Selecione o projeto **sistema-de-cadastro-gac**

## Passo 2: Obtenha a DATABASE_URL Correta

### Opção A: Connection String (Recomendado para Pool)
1. No painel do Supabase, clique em **Settings** (ícone de engrenagem)
2. Vá para **Database** no menu esquerdo
3. Procure por **Connection string** (não a URI)
4. Selecione a aba **Pooling** se disponível
5. Copie a string (provavelmente começará com `postgresql://`)
6. Substitua `[YOUR-PASSWORD]` pela senha do seu projeto

### Opção B: Connection String via URI
1. Vá em **Settings** → **Database**
2. Clique em **Connection Pooler** ou **Direct Connection**
3. Copie a URI inteira
4. Note que as senhas podem incluir caracteres especiais

## Passo 3: Atualize o arquivo .env

```bash
# Copie exatamente como aparece no Supabase
DATABASE_URL=postgresql://postgres.XXXXXXXXX:YYYYYYYYY@aws-0-REGION.pooler.supabase.com:6543/postgres

# Para conexão direta (sem pool)
DIRECT_URL=postgresql://postgres.XXXXXXXXX:YYYYYYYYY@aws-0-REGION.supabase.com:5432/postgres
```

## Passo 4: Teste a Conexão

```bash
# Depois de atualizar .env, teste:
node limpar-banco.js
```

## ⚠️ Nota Importante

Se a senha contiver caracteres especiais (como `@`, `#`, `%`, `*`), eles **devem estar corretos** na URL:
- **Não** escape manualmente (o Node.js faz isso automaticamente)
- **Não** use colchetes ou aspas
- Copie exatamente como aparece no Supabase

## 🆘 Se Ainda Não Funcionar

Você pode limpar manualmente via SQL Editor:

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Execute:

```sql
-- Limpar dados mantendo estrutura
TRUNCATE TABLE "Pessoa" CASCADE;
TRUNCATE TABLE "Usuario" CASCADE;
```

Ou se quiser dropar e recriar:

```sql
-- Dropar e recriar tabelas
DROP TABLE IF EXISTS "Pessoa" CASCADE;
DROP TABLE IF EXISTS "Usuario" CASCADE;

-- Depois execute as migrations novamente:
-- npx prisma migrate deploy
```

## 🔍 Verificar Credenciais Atuais

Para ver qual URL está sendo usada:

```bash
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL)"
```
