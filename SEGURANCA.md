# 🔐 Guia de Segurança - GAC System

## Políticas de Segurança Implementadas

### 1. Autenticação e Autorização

#### ✅ JWT (JSON Web Tokens)
- Token com expiração de 24h
- Requer Bearer token em headers: `Authorization: Bearer <token>`
- Token armazenado em localStorage (frontend)
- Renovação automática ao fazer login

```javascript
// Exemplo de requisição autenticada
fetch('http://localhost:3001/api/pessoas', {
  headers: {
    'Authorization': 'Bearer seu_token_aqui'
  }
})
```

#### ✅ Criptografia de Senha
- Algoritmo bcrypt com 10 rounds
- Senhas nunca são armazenadas em texto plano
- Comparação segura com timing attack protection

### 2. Validação de Entrada

#### ✅ CPF
- Validação de formato (000.000.000-00)
- Algoritmo de dígitos verificadores
- Rejeita CPF duplicado

#### ✅ Email
- Validação de formato RFC 5322
- Rejeita emails duplicados

#### ✅ Telefone
- Formato brasileiro: (XX) 9XXXX-XXXX
- Validação de quantidade de dígitos

#### ✅ Campos Obrigatórios
- Nome: mínimo 3 caracteres
- Senha: mínimo 8 caracteres
- Endereço: mínimo 5 caracteres

### 3. Proteção de Dados

#### ✅ Isolamento por Usuário
- Cada usuário só vê seus próprios cadastros
- Mesmo se conseguir o ID, só acessa dados dele

```prisma
// Exemplo: listar pessoas sempre filtra por usuarioId
where: {
  usuarioId: req.usuario.id  // Sempre do usuário autenticado
}
```

#### ✅ Rate Limiting
- Máximo 100 requisições por 15 minutos
- Protege contra brute force e DDoS

#### ✅ CORS
- Apenas localhost:5173 pode acessar API
- Altere em .env se necessário em produção

### 4. Headers de Segurança (Helmet)

Ativado automaticamente:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (em HTTPS)

### 5. Erros e Logging

#### ✅ Respostas Seguras
- Erros genéricos não expõem detalhes técnicos
- Mensagens específicas para o usuário

Não exponha:
- ❌ Stack traces
- ❌ Caminhos de arquivo
- ❌ Versões de software

### 6. Banco de Dados

#### ✅ Prisma com Validação
- Prepared statements (evita SQL injection)
- Tipagem automática
- Relacionamentos definidos

#### ✅ Indíces para Performance
```prisma
@@index([usuarioId])
@@index([cpf])
```

## Boas Práticas - Antes de Produção

### ⚠️ CRÍTICO

1. **Altere JWT_SECRET**
```env
# ❌ NÃO USE ESTE
JWT_SECRET="seu_segredo_jwt_super_seguro_altere_em_producao"

# ✅ USE ALGO ASSIM
JWT_SECRET="aB9kL2pQ5vX8mN1cD7jH4fG6tY3rW0uS"
```

2. **Use Banco de Dados Profissional**
```prisma
# ❌ DESENVOLVIMENTO
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

# ✅ PRODUÇÃO
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Variáveis de Ambiente**
```bash
# Nunca commite .env em Git
# Use serviço como Railway, Vercel, AWS Secrets

DATABASE_URL=seu_banco_de_dados
JWT_SECRET=chave_secreta_forte
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://seu-dominio.com.br
```

4. **HTTPS Obrigatório**
```javascript
// Ative apenas em produção
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

### 🔒 SEGURANÇA

1. **Aumente Rate Limit se Necessário**
```javascript
// Atualmente: 100 req/15min
// Considere reduzir em produção
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50  // Reduzido para produção
});
```

2. **Adicione Logging**
```javascript
// Use winston ou morgan para log de requisições
import morgan from 'morgan';
app.use(morgan('combined'));  // Logs detalhados
```

3. **Monitore Segurança**
```bash
# Verifique vulnerabilidades regularmente
npm audit
npm audit fix
```

4. **Backup do Banco**
```bash
# Faça backup regular do banco de dados
cp prisma/dev.db backup/dev-$(date +%Y%m%d).db
```

### 👥 CONTROLE DE ACESSO

#### Funções de Usuário (Preparado para Expansão)
```prisma
model Usuario {
  funcao String @default("funcionario")  // "funcionario", "admin", "gerente"
}
```

Exemplo de middleware para admin:
```javascript
router.post('/pessoas/relatorio', 
  autenticarToken,
  autorizarFuncao(['admin']),
  (req, res) => {
    // Apenas admin pode gerar relatórios
  }
);
```

### 📱 SEGURANÇA DO FRONTEND

1. **localStorage vs sessionStorage**
```javascript
// Atualmente usa localStorage (persiste após fechar)
// Para mais segurança, use sessionStorage:
localStorage.setItem('token', token);  // ← ATUAL
// sessionStorage.setItem('token', token);  // ← MAIS SEGURO
```

2. **XSS Protection**
```javascript
// React já escapa HTML por padrão
// ✅ Seguro
<div>{dados.nome}</div>

// ❌ NUNCA use dangerouslySetInnerHTML com dados do usuário
<div dangerouslySetInnerHTML={{ __html: dados.html }} />
```

3. **CSRF Protection**
```javascript
// Se adicionar formulário tradicional, use tokens CSRF
// Com SPA React, JWT já oferece proteção natural
```

## Checklist de Segurança

### Antes de Fazer Deploy

- [ ] JWT_SECRET alterado e forte (32+ caracteres)
- [ ] Banco de dados em servidor profissional (não SQLite)
- [ ] HTTPS habilitado
- [ ] CORS_ORIGIN atualizado para seu domínio
- [ ] NODE_ENV = "production"
- [ ] Senhas de acesso ao servidor alteradas
- [ ] Backups configurados
- [ ] Logs centralizados (Sentry, LogRocket, etc)
- [ ] Rate limiting revisado
- [ ] npm audit passed (zero vulnerabilidades)
- [ ] Variáveis de ambiente seguras (não em .env)
- [ ] Firewall/WAF habilitado

### Monitoramento Contínuo

- [ ] Verificar logs diários
- [ ] Monitorar performance
- [ ] Checar ataques de força bruta
- [ ] Auditar acessos incomuns
- [ ] Atualizar dependências mensalmente
- [ ] Realizar testes de penetração

## Reportar Vulnerabilidades

Se encontrar uma vulnerabilidade:

1. **NÃO** publique em redes sociais
2. Envie email para: [seu-email-de-segurança]@gac.com.br
3. Descreva a vulnerabilidade detalhadamente
4. Forneça passos para reproduzir
5. Aguarde resposta em até 48h

## Referências de Segurança

- OWASP Top 10: https://owasp.org/Top10
- Node.js Security: https://nodejs.org/en/docs/guides/security
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html

---

**Última atualização: 27/11/2025**
**Próxima revisão: 27/02/2026**
