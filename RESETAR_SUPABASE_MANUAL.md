# 🔧 Como Resetar Manualmente via Supabase SQL Editor

## Passo 1: Acesse o SQL Editor do Supabase

1. Vá para https://app.supabase.com
2. Selecione o projeto **sistema-de-cadastro-gac**
3. Clique em **SQL Editor** na lateral esquerda
4. Clique em **New Query**

## Passo 2: Execute os Comandos de Limpeza

Cole este código SQL no editor:

```sql
-- Limpar dados mantendo tabelas
TRUNCATE TABLE "Pessoa" CASCADE;
TRUNCATE TABLE "Usuario" CASCADE;

-- Ou deletar e recriar (se houver constraint issues):
-- DROP TABLE IF EXISTS "Pessoa" CASCADE;
-- DROP TABLE IF EXISTS "Usuario" CASCADE;
```

Clique em **Run** (ou Ctrl+Enter)

## Passo 3: Verificar Limpeza

Você pode executar para verificar:

```sql
SELECT COUNT(*) as total_usuarios FROM "Usuario";
SELECT COUNT(*) as total_pessoas FROM "Pessoa";
```

Ambos devem retornar **0**.

## Passo 4: Recriar Dados de Teste

Depois de limpar, volte ao terminal local e execute:

```bash
node seed.js
```

Isso criará os usuários e pessoas de teste automaticamente.

## 🔐 Se Houver Erro de Permissão

Se receber erro "permission denied", pode ser que:

1. **Tabelas não existem**: Execute as migrations
   ```bash
   npx prisma migrate deploy --schema=api/prisma/schema.prisma
   ```

2. **Role sem permissão**: Tente como usuário admin (se disponível)
   ```sql
   -- Se tiver acesso de super user:
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "anon", "authenticated", "service_role";
   ```

## 💡 Alternativa: Usar Vercel Postgres (ao invés de Supabase)

Se continuar tendo problemas com Supabase, considere:

1. Criar um novo banco no Vercel Postgres
2. Atualizar `.env` com nova URL
3. Executar migrations: `npx prisma migrate deploy`
4. Executar seed: `node seed.js`

## ✅ Checklist Final

- [ ] Acessou https://app.supabase.com
- [ ] Executou TRUNCATE ou DROP nas tabelas
- [ ] Verificou que COUNT retorna 0
- [ ] Executou `node seed.js` localmente
- [ ] Dados de teste aparecem no banco
