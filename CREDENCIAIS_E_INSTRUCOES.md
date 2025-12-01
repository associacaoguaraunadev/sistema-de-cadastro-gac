# 🔐 CREDENCIAIS DO SISTEMA - GAC

## ✅ Status do Banco de Dados

- **Banco:** PostgreSQL via Supabase
- **Host:** aws-1-us-east-2.pooler.supabase.com:5432
- **Usuários:** 3 (1 admin + 2 funcionários)
- **Pessoas:** 200 distribuídas entre comunidades ✅
- **Migrations:** Todas aplicadas ✅
- **Data de População:** 1º de Dezembro de 2025

---

## 👤 CREDENCIAIS DE ACESSO

### 🏆 ADMINISTRADOR
```
Email: admin@gac.com
Senha: Admin@123456
Função: admin
```

### 👨‍💼 FUNCIONÁRIO 1
```
Email: funcionario1@gac.com
Senha: Func@123456
Função: funcionario
```

### 👨‍💼 FUNCIONÁRIO 2
```
Email: funcionario2@gac.com
Senha: Func@654321
Função: funcionario
```

---

## 🌍 URL DO SISTEMA

```
Frontend: http://localhost:3000 (local)
Frontend: https://sistema-de-cadastro-gac.vercel.app (produção)
Backend: http://localhost:3001/api (local)
Backend: https://sistema-de-cadastro-gac.vercel.app/api (produção)
```

---

## 📊 DADOS POPULADOS

### Distribuição de Pessoas por Comunidade
- **Vila Cheba:** ~40 pessoas
- **Morro da Vila:** ~40 pessoas
- **Barragem:** ~40 pessoas
- **Parque Centenario:** ~40 pessoas
- **Jardim Apura:** ~40 pessoas

### Distribuição por Faixa Etária
- **Crianças (0-17):** ~33 pessoas
- **Adultos (18-59):** ~93 pessoas
- **Idosos (60+):** ~74 pessoas

### Beneficiários
- ~60% tem benefícios do governo (LOAS, Bolsa Família, PBF, etc)
- ~40% tem benefícios GAC (Cesta Básica, Auxílio Alimentação, Bolsa Educação)
- ~50% tem renda familiar registrada

---

## 🔄 SISTEMA DE RECUPERAÇÃO DE SENHA

### ✅ Fluxo Implementado Completo

#### 1️⃣ **Solicitar Recuperação** (Frontend)
- Clique em "Esqueci minha senha"
- Digite seu email
- Sistema gera código de 10 caracteres (válido por 30 minutos)

#### 2️⃣ **Validar Código** (Frontend)
- Receberá código no console (em desenvolvimento)
- Digite o código recebido
- Sistema valida se ainda está válido

#### 3️⃣ **Redefinir Senha** (Frontend)
- Defina nova senha (mín. 8 caracteres)
- Confirme a senha
- Senha é atualizada no banco de dados

### 🔧 Endpoints Backend

#### Solicitar Recuperação
```
POST /api/autenticacao/recuperacao-senha/solicitar
Content-Type: application/json

{
  "email": "usuario@email.com"
}

Response:
{
  "mensagem": "Se o email existe, um código foi enviado",
  "email": "usuario@email.com",
  "debug": "ABC123XYZ" // Token para teste
}
```

#### Validar Token
```
POST /api/autenticacao/recuperacao-senha/validar-token
Content-Type: application/json

{
  "email": "usuario@email.com",
  "token": "ABC123XYZ"
}

Response:
{
  "mensagem": "Token validado com sucesso",
  "email": "usuario@email.com"
}
```

#### Redefinir Senha
```
POST /api/autenticacao/recuperacao-senha/redefinir
Content-Type: application/json

{
  "email": "usuario@email.com",
  "token": "ABC123XYZ",
  "novaSenha": "NovaSenha@123"
}

Response:
{
  "mensagem": "Senha redefinida com sucesso"
}
```

---

## 🧪 COMO TESTAR FLUXO DE RECUPERAÇÃO

### Teste Local:
1. Acesse http://localhost:3000/entrar
2. Clique em "Esqueci minha senha"
3. Digite `admin@gac.com`
4. Confira o console do Node para ver o código gerado
5. Copie o código de 10 caracteres
6. Digite na tela
7. Defina nova senha e confirme
8. Tente fazer login com nova senha

### Teste em Produção:
1. Acesse https://sistema-de-cadastro-gac.vercel.app/entrar
2. Clique em "Esqueci minha senha"
3. Digite um email válido
4. **Nota:** Em produção, o código seria enviado por email real (não implementado)

---

## 🛠️ TECNOLOGIAS

### Frontend
- React 18 + Vite
- React Router v6
- Validação de formulários
- Toast notifications

### Backend
- Node.js + Express (serverless)
- Prisma ORM
- PostgreSQL
- JWT autenticação
- bcryptjs para hash de senhas

### Banco de Dados
- PostgreSQL via Supabase
- Migrations versionadas
- Relacionamentos com FK

---

## 📋 O QUE FOI IMPLEMENTADO

### ✅ Recuperação de Senha
- [x] Componente FormularioRecuperacaoSenha.jsx (3 etapas)
- [x] Rotas de recuperação no frontend (main.jsx)
- [x] Endpoints backend completos (3 endpoints)
- [x] Geração segura de tokens (5 bytes hex)
- [x] Hash bcrypt de tokens
- [x] Validação de expiração (30 minutos)
- [x] Atualização de senha no banco
- [x] Limpeza de tokens após uso

### ✅ Usuários Seed
- [x] 1 Administrador com acesso total
- [x] 2 Funcionários com acesso padrão
- [x] Senhas criptografadas com bcryptjs
- [x] Script seed-usuarios.js para recriação

### ✅ Pessoas Seed
- [x] 200 pessoas com dados realistas
- [x] Distribuição entre 5 comunidades
- [x] Distribuição por faixa etária
- [x] Benefícios dinamicamente atribuídos
- [x] Renda familiar para ~50%
- [x] Script seed-pessoas.js para população

### ✅ Benefícios Dinâmicos
- [x] Benefícios GAC como array JSON
- [x] Benefícios Governo como array JSON com {nome, valor}
- [x] Campo rendaFamiliar adicionado
- [x] UI completa para adicionar/remover benefícios

---

## 🚀 SCRIPTS DISPONÍVEIS

### `seed-usuarios.js`
Cria/recria 3 usuários (1 admin + 2 funcionários) e limpa o banco
```bash
node seed-usuarios.js
```

### `seed-pessoas.js`
Adiciona 200 pessoas sem deletar dados existentes
```bash
node seed-pessoas.js
```

---

## 🚀 PRÓXIMOS PASSOS (Opcional)

1. **Email Real:** Integrar com serviço de email (SendGrid, AWS SES)
2. **Rate Limiting:** Limitar tentativas de recuperação
3. **2FA:** Autenticação de dois fatores
4. **Audit Log:** Registrar alterações de senha
5. **Webhook:** Notificações de segurança

---

## 📞 SUPORTE

Para questões:
- Verificar logs: `console` no Node.js ou browser DevTools
- Checar banco: Prisma Studio (`npx prisma studio`)
- Validar tokens: Copiar token JWT e decodificar em jwt.io

---

**Última atualização:** 1º de Dezembro de 2025  
**Versão:** 1.0  
**Status:** ✅ Produção
