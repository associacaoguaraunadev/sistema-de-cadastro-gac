# 🔧 PROBLEMA: Campo rendaFamiliar não existe no banco de dados

## Erro Encontrado

```
❌ Erro ao listar pessoas:
Invalid `prisma.pessoa.findMany()` invocation:
The column `Pessoa.rendaFamiliar` does not exist in the current database.
```

---

## ⚠️ Causa do Problema

A migração do Prisma não foi executada porque o banco de dados estava offline durante a criação da tabela `InviteToken` e do campo `rendaFamiliar`.

### O Que Aconteceu:
1. ✅ Atualizei `schema.prisma` com novos campos
2. ❌ Banco PostgreSQL estava offline
3. ❌ Migração não foi gerada automaticamente
4. ❌ Código tenta usar `rendaFamiliar` que não existe no banco

---

## ✅ Solução Implementada

### 1. Migração SQL Criada

Arquivo: `api/prisma/migrations/20251201_adicionar_renda_familiar_e_invite_token/migration.sql`

```sql
-- Adicionar coluna rendaFamiliar em Pessoa
ALTER TABLE "Pessoa" ADD COLUMN "rendaFamiliar" DOUBLE PRECISION;

-- Criar tabela InviteToken
CREATE TABLE "InviteToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataExpiracao" TIMESTAMP(3) NOT NULL,
    "dataUtilizado" TIMESTAMP(3),

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");
CREATE INDEX "InviteToken_email_idx" ON "InviteToken"("email");
CREATE INDEX "InviteToken_usuarioId_idx" ON "InviteToken"("usuarioId");

-- Criar relacionamento
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_usuarioId_fkey" 
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 2. Como Aplicar a Migração

Quando o banco estiver **ONLINE**, execute:

```bash
# Opção 1: Prisma Migrate Deploy (recomendado)
cd api
npx prisma migrate deploy

# Opção 2: Usar direto no banco (alternativa)
npx prisma db push --skip-generate
```

### 3. Verificar Status

```bash
# Ver se migração foi aplicada
npx prisma migrate status

# Regenerar Prisma Client
npx prisma generate
```

---

## 📊 O Que Será Adicionado ao Banco

### Campo em Pessoa:
- `rendaFamiliar` (DOUBLE PRECISION, NULL) - Renda familiar em reais

### Nova Tabela InviteToken:
```
Coluna                 | Tipo        | Descrição
─────────────────────────────────────────────────────
id (PK)               | INTEGER     | Identificador único
token                 | TEXT UNIQUE | Token de convite (32 chars hex)
email                 | TEXT        | Email do convidado
usuarioId (FK)        | INTEGER     | Quem criou o convite
ativo                 | BOOLEAN     | Se ainda é válido (default: true)
dataCriacao           | TIMESTAMP   | Quando foi criado
dataExpiracao         | TIMESTAMP   | Quando expira (7 dias)
dataUtilizado         | TIMESTAMP   | Quando foi aceito (NULL se pendente)
```

---

## 🔄 Fluxo de Funcionamento

```
┌─────────────────────────────────────┐
│ 1. Código tenta usar rendaFamiliar  │
│    e InviteToken                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Verifica schema.prisma (OK ✓)    │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 3. Tenta usar no banco (ERRO ✗)      │
│    Coluna não existe no BD           │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 4. Executa migração criada:          │
│    npx prisma migrate deploy         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 5. Campo adicionado ao banco (✓)     │
│    Tabela InviteToken criada (✓)     │
└────────┬─────────────────────────────┘
         │
         ▼
✅ CÓDIGO FUNCIONA NORMALMENTE
```

---

## 🚀 Status Atual

### Arquivos Preparados:
- ✅ `schema.prisma` - Atualizado com novos campos
- ✅ `migration.sql` - Criado e pronto para aplicar
- ✅ Serviço `inviteToken.js` - Implementado
- ✅ Serviço `recuperacaoSenha.js` - Implementado
- ✅ Endpoints de convites - Criados
- ✅ Endpoints de recuperação - Criados

### Aguardando:
- ⏳ Banco PostgreSQL online
- ⏳ Executar: `npx prisma migrate deploy`
- ⏳ Regenerar: `npx prisma generate`

---

## 📋 Checklist para Quando o Banco Voltar Online

```
[ ] 1. Banco PostgreSQL online
[ ] 2. npx prisma migrate deploy
[ ] 3. npx prisma migrate status (verificar sucesso)
[ ] 4. npx prisma generate (regenerar cliente)
[ ] 5. Testar leitura de pessoas: GET /api/pessoas
[ ] 6. Testar criação de convite: POST /api/autenticacao/convites
[ ] 7. Testar recuperação: POST /api/autenticacao/recuperacao
```

---

## 💡 Resumo

**Problema:** Coluna `rendaFamiliar` não existe no banco
**Causa:** Migração não foi executada (banco offline)
**Solução:** Migração SQL criada e aguardando execução
**Próximo Passo:** `npx prisma migrate deploy` quando banco voltar online

Toda a lógica de código está pronta e funcionará assim que a migração for aplicada!

---

*Documento criado: 2025-12-01 20:35*
*Migração: 20251201_adicionar_renda_familiar_e_invite_token*
