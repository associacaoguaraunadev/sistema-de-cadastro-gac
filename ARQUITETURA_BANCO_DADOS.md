# 📊 Arquitetura do Banco de Dados - Sistema GAC

## Visão Geral

O banco de dados PostgreSQL foi projetado para gerenciar:
- Autenticação de usuários (funcionários)
- Cadastro de pessoas beneficiárias
- Benefícios sociais (GAC e Governo)
- Convites para novos funcionários
- Recuperação de senha

---

## 📋 Estrutura de Tabelas

### 1. **Tabela: Usuario**
Armazena informações dos funcionários/administradores do sistema.

```prisma
model Usuario {
  id                  Int      @id @default(autoincrement())
  email               String   @unique
  senha               String
  nome                String
  funcao              String   @default("funcionario")
  ativo               Boolean  @default(true)
  dataCriacao         DateTime @default(now())
  dataAtualizacao     DateTime @updatedAt
  
  // Recuperação de senha
  tokenRecuperacao    String?  
  expiracaoToken      DateTime?
  
  // Relações
  pessoas             Pessoa[]
  inviteTokens        InviteToken[]
}
```

**Campos:**
- `id` - Identificador único (PK)
- `email` - Email único do funcionário
- `senha` - Senha hasheada (base64 ou bcrypt em produção)
- `nome` - Nome completo
- `funcao` - Função (admin, funcionario, etc)
- `ativo` - Se o usuário está ativo
- `tokenRecuperacao` - Hash do token de recuperação de senha
- `expiracaoToken` - Quando o token de recuperação expira

**Índices:**
- Primária: `id`
- Única: `email`

---

### 2. **Tabela: Pessoa**
Armazena informações dos beneficiários cadastrados.

```prisma
model Pessoa {
  id                  Int      @id @default(autoincrement())
  nome                String
  cpf                 String   @unique
  email               String?
  telefone            String?
  endereco            String
  bairro              String?
  cidade              String?
  estado              String?
  cep                 String?
  idade               Int?
  comunidade          String?
  
  // Benefícios (JSON)
  beneficiosGAC       Json     @default("[]")
  beneficiosGoverno   Json     @default("[]")
  
  // Renda
  rendaFamiliar       Float?
  
  observacoes         String?
  status              String   @default("ativo")
  
  // Relação com usuário
  usuarioId           Int
  usuario             Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  
  dataCriacao         DateTime @default(now())
  dataAtualizacao     DateTime @updatedAt
}
```

**Campos:**
- `id` - Identificador único (PK)
- `nome` - Nome completo do beneficiário
- `cpf` - CPF único (sem formatação)
- `email` - Email (opcional)
- `telefone` - Telefone (opcional)
- `endereco` - Endereço (obrigatório)
- `bairro`, `cidade`, `estado`, `cep` - Localização
- `idade` - Idade (opcional)
- `comunidade` - Comunidade onde reside
- `beneficiosGAC` - Array JSON: `[{tipo, dataInicio, dataFinal}, ...]`
- `beneficiosGoverno` - Array JSON: `[{nome, valor}, ...]` (DINÂMICO)
- `rendaFamiliar` - Renda familiar em reais
- `observacoes` - Notas adicionais
- `status` - Status do cadastro
- `usuarioId` - FK para o usuário que criou

**Índices:**
- Primária: `id`
- Única: `cpf`
- FK: `usuarioId`
- Comum: `comunidade`

---

### 3. **Tabela: InviteToken** ⭐ NOVA
Gerencia convites para novos funcionários.

```prisma
model InviteToken {
  id              Int       @id @default(autoincrement())
  token           String    @unique
  email           String
  usuarioId       Int
  usuario         Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  ativo           Boolean   @default(true)
  dataCriacao     DateTime  @default(now())
  dataExpiracao   DateTime
  dataUtilizado   DateTime?
}
```

**Campos:**
- `id` - Identificador único (PK)
- `token` - Token único de 32 caracteres (hex)
- `email` - Email do novo funcionário
- `usuarioId` - Admin que criou o convite (FK)
- `ativo` - Se o convite ainda é válido
- `dataCriacao` - Quando foi criado
- `dataExpiracao` - Quando expira (padrão: 7 dias)
- `dataUtilizado` - Quando foi aceito

**Índices:**
- Primária: `id`
- Única: `token`
- Comum: `email`, `usuarioId`

**Fluxo de Uso:**
1. Admin cria convite → InviteToken é inserido com `ativo=true`
2. Novo funcionário recebe email com link
3. Clica no link → Frontend valida token
4. Preenche nome e senha → API cria novo Usuario
5. InviteToken é marcado como `ativo=false` e `dataUtilizado` preenchido

---

## 🔄 Fluxos Principais

### Fluxo 1: Criar Novo Funcionário via Convite

```
┌─────────────────┐
│ Admin clica em  │
│ "Convidar"      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ POST /api/autenticacao/convites      │
│ Body: { email: "novo@email.com" }   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ criarConvite()                  │
│ - Gera token aleatório          │
│ - Salva InviteToken no banco    │
│ - Define expiração (7 dias)     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Retorna URL de convite:             │
│ /aceitar-convite/{token}            │
└─────────────────────────────────────┘
         │
         ▼
   EMAIL ENVIADO
         │
         ▼
┌──────────────────────────────────┐
│ Novo funcionário clica no link   │
│ Frontend valida token            │
│ GET /api/autenticacao/convites?  │
│     validar=true&token=...       │
└────────┬─────────────────────────┘
         │
         ▼
┌───────────────────────────┐
│ validarConvite()          │
│ - Busca InviteToken       │
│ - Verifica se está ativo  │
│ - Verifica se expirou     │
└────────┬─────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Frontend exibe formulário:         │
│ - Nome completo                    │
│ - Senha                            │
│ - Confirmação de senha             │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ POST /api/autenticacao/convites/aceitar │
│ Body: {                                 │
│   token: "...",                         │
│   nome: "João Silva",                   │
│   senha: "......"                       │
│ }                                       │
└────────┬───────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ utilizarConvite()                │
│ - Valida token                   │
│ - Cria novo Usuario              │
│ - Marca convite como usado       │
└────────┬─────────────────────────┘
         │
         ▼
✅ NOVO FUNCIONÁRIO CRIADO COM SUCESSO
```

---

### Fluxo 2: Recuperação de Senha

```
┌──────────────────────┐
│ Usuário clica em     │
│ "Esqueci a senha"    │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ POST /api/autenticacao/recuperacao
│ Body: { email: "user@email.com" }│
└─────────┬──────────────────────┘
          │
          ▼
┌──────────────────────────────────────┐
│ solicitarRecuperacao()               │
│ - Gera token aleatório              │
│ - Faz hash do token                 │
│ - Salva hash no Usuario             │
│ - Define expiração (2 horas)        │
└─────────┬──────────────────────────┘
          │
          ▼
   EMAIL COM LINK ENVIADO
          │
          ▼
┌────────────────────────────────────┐
│ Usuário clica no link              │
│ /redefinir-senha/{token}           │
│ Frontend valida token              │
│ POST /api/autenticacao/validar-token│
│ Body: { email, token }             │
└─────────┬──────────────────────────┘
          │
          ▼
┌────────────────────────────┐
│ validarTokenRecuperacao()  │
│ - Busca usuário por email  │
│ - Faz hash do token        │
│ - Compara com hash salvo   │
│ - Verifica se expirou      │
└─────────┬──────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Frontend exibe:                  │
│ - Campo de nova senha            │
│ - Campo de confirmação           │
└─────────┬────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ POST /api/autenticacao/redefinir-senha
│ Body: {                             │
│   email: "user@email.com",          │
│   token: "...",                     │
│   novaSenha: "..."                  │
│ }                                   │
└─────────┬───────────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│ redefinirSenha()               │
│ - Valida token                 │
│ - Hash da nova senha           │
│ - Atualiza Usuario             │
│ - Limpa token                  │
└─────────┬──────────────────────┘
          │
          ▼
✅ SENHA REDEFINIDA COM SUCESSO
```

---

## 🔐 Segurança

### Implementado:
- ✅ Tokens únicos de 32 caracteres (crypto.randomBytes)
- ✅ Expiração de tokens (7 dias para convites, 2 horas para recuperação)
- ✅ Hash de tokens antes de salvar
- ✅ Email único por usuário
- ✅ CPF único por pessoa
- ✅ Cascade delete (remover usuário remove pessoas e convites)
- ✅ Autenticação JWT para proteger endpoints

### Recomendações para Produção:
- 🔴 Usar **bcrypt** em vez de base64 para senhas
- 🔴 Implementar **rate limiting** nos endpoints de autenticação
- 🔴 Usar **variáveis de ambiente** para JWT_SECRET
- 🔴 Implementar **HTTPS** obrigatoriamente
- 🔴 Usar **email transacional** (SendGrid, Mailgun, etc)
- 🔴 Implementar **2FA** para admins
- 🔴 Logs de auditoria para ações sensíveis

---

## 📈 Estrutura JSON de Benefícios

### Benefícios GAC (Estrutura Fixa):
```json
{
  "beneficiosGAC": [
    {
      "tipo": "Cesta Básica",
      "dataInicio": "2025-01-01",
      "dataFinal": "2025-12-31"
    },
    {
      "tipo": "Bolsa Cultura",
      "dataInicio": "2025-06-01",
      "dataFinal": null
    }
  ]
}
```

### Benefícios Governo (Dinâmico - NOVO):
```json
{
  "beneficiosGoverno": [
    {
      "nome": "LOAS",
      "valor": 676.00
    },
    {
      "nome": "Bolsa Família",
      "valor": 600.00
    },
    {
      "nome": "Auxílio Especial",
      "valor": 1500.00
    }
  ]
}
```

---

## 🚀 Queries Úteis

### Listar todos os convites pendentes:
```sql
SELECT * FROM "InviteToken"
WHERE ativo = true
AND "dataExpiracao" > NOW()
ORDER BY "dataCriacao" DESC;
```

### Contar pessoas por comunidade:
```sql
SELECT comunidade, COUNT(*) as total
FROM "Pessoa"
GROUP BY comunidade
ORDER BY total DESC;
```

### Listar pessoas com benefícios do governo:
```sql
SELECT nome, cpf, "beneficiosGoverno"
FROM "Pessoa"
WHERE "beneficiosGoverno" != '[]'
ORDER BY "dataCriacao" DESC;
```

### Limpeza de tokens expirados:
```sql
UPDATE "Usuario"
SET "tokenRecuperacao" = NULL,
    "expiracaoToken" = NULL
WHERE "expiracaoToken" < NOW();
```

---

## 📝 Resumo

| Tabela | Registro | Propósito |
|--------|----------|----------|
| **Usuario** | Funcionários | Autenticação e gerenciamento de acesso |
| **Pessoa** | Beneficiários | Cadastro de pessoas e seus benefícios |
| **InviteToken** | Convites | Controle de convites para novos funcionários |

**Total de Tabelas:** 3 (antes eram 2, agora com InviteToken ativada)

---

*Última atualização: 2025-12-01*
*Versão: 1.1 com InviteToken e RecuperacaoSenha*
