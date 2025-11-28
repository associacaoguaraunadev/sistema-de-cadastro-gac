# 🔧 Troubleshooting Avançado - GAC System

## 🚨 Problemas Comuns e Soluções

### Backend

#### 1. "Porta 3001 já está em uso"

**Sintoma:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Soluções:**

Opção A - Mude a porta:
```bash
cd backend
# Edite .env
PORT=3002

npm run dev
```

Opção B - Libere a porta (Windows):
```powershell
# Encontre processo na porta 3001
netstat -ano | findstr :3001

# Mate o processo (PID = número na saída)
taskkill /PID <numero> /F

# Reinicie
npm run dev
```

Opção C - Libere a porta (PowerShell admin):
```powershell
# Encontre processo
Get-NetTCPConnection -LocalPort 3001

# Mate processo (ajuste comando conforme necessário)
Stop-Process -Id <PID> -Force
```

---

#### 2. "Erro ao conectar ao banco de dados"

**Sintoma:**
```
Error: Could not find database file at (...)
```

**Soluções:**

Opção A - Recrie o banco:
```bash
cd backend

# Remova banco antigo
rm prisma/dev.db

# Recrie estrutura
npm run prisma-migrate

npm run dev
```

Opção B - Resete tudo (cuidado - deleta dados!):
```bash
cd backend
npm run prisma-reset
npm run dev
```

Opção C - Verifique permissões:
```bash
# Verifique se pasta existe
ls -la prisma/

# Se não existir, crie:
mkdir prisma
npm run prisma-migrate
```

---

#### 3. "Cannot find module" ou "Module not found"

**Sintoma:**
```
Error: Cannot find module 'express'
```

**Soluções:**

```bash
cd backend

# Limpe node_modules
rm -r node_modules
rm package-lock.json

# Reinstale
npm install
npm run prisma-migrate
npm run dev
```

---

#### 4. "Token inválido ou expirado"

**Sintoma:**
Frontend retorna erro 403 ao tentar acessar dados

**Soluções:**

Opção A - Verifique JWT_SECRET:
```bash
# .env backend
# Certifique-se que está igual ao que gerou o token
JWT_SECRET="mesmo_segredo_de_antes"
```

Opção B - Limpe token (frontend):
```javascript
// Abra DevTools > Console
localStorage.removeItem('token');
localStorage.removeItem('usuario');
location.reload();

// Faça login novamente
```

Opção C - Verifique data/hora do sistema:
```bash
# Se data do sistema está muito atrasada/adiantada, JWT expira
# Sincronize hora do sistema
```

---

#### 5. "CORS error - Access denied"

**Sintoma:**
```
Access to XMLHttpRequest at 'http://localhost:3001...' from origin 
'http://localhost:5173' has been blocked by CORS policy
```

**Soluções:**

Opção A - Verifique CORS_ORIGIN:
```bash
# .env backend
# Deve ser exatamente:
CORS_ORIGIN="http://localhost:5173"

# Se frontend está em porta diferente:
CORS_ORIGIN="http://localhost:5174"
```

Opção B - Restart após mudança:
```bash
# Salve .env
# Ctrl+C para parar backend
npm run dev  # Reinicie
```

Opção C - Verifique headers da requisição:
```javascript
// Frontend DevTools > Network > selecione requisição
// Veja se Authorization header está presente
// Veja response headers (deve ter Access-Control-Allow-Origin)
```

---

### Frontend

#### 1. "Página branca / Nothing shows"

**Sintoma:**
- Página vazia, branca ou com erros em console

**Soluções:**

Opção A - Verifique if backend está rodando:
```bash
# Terminal 1: abra nova aba PowerShell
curl http://localhost:3001/api/saude

# Se falhar, inicie backend
cd backend
npm run dev
```

Opção B - Limpe cache:
```
Ctrl+Shift+Delete  # Ou Cmd+Shift+Delete em Mac
Selecione "Cookies and other site data"
```

Opção C - Verifique console para erros:
```javascript
// F12 ou Ctrl+Shift+I
// Aba Console
// Veja mensagens de erro vermelhas
```

Opção D - Reinstale dependências:
```bash
cd frontend
rm -r node_modules
npm install
npm run dev
```

---

#### 2. "Porta 5173 já em uso"

**Sintoma:**
```
Port 5173 is in use, trying another one...
```

**Soluções:**

Opção A - Use porta alternativa:
```bash
cd frontend
npm run dev -- --port 5174
```

Opção B - Mate processo na porta:
```powershell
# PowerShell Admin
Get-NetTCPConnection -LocalPort 5173 | % { taskkill /PID $_.OwningProcess }
```

---

#### 3. "CPF/Email validation errors"

**Sintoma:**
```
CPF inválido
Email inválido
```

**Soluções:**

Para CPF:
```
✅ 123.456.789-09 (com pontos e hífen)
✅ 12345678909 (apenas números)
❌ 111.111.111-11 (todos iguais - sempre inválido)
❌ 000.000.000-00 (todos zeros - sempre inválido)
```

Para Email:
```
✅ usuario@exemplo.com
✅ usuario.nome@exemplo.com.br
❌ usuario@
❌ @exemplo.com
```

Para Telefone:
```
✅ (11) 98765-4321
✅ 11987654321
❌ 123 (muito curto)
```

---

#### 4. "Pessoa com CPF já cadastrada"

**Sintoma:**
```
Pessoa com este CPF já cadastrada
```

**Soluções:**

Opção A - Use CPF diferente:
```
Gere novo CPF válido (veja DADOS_TESTE.txt)
```

Opção B - Delete pessoa anterior:
```
1. Vá para lista
2. Clique ícone de lixeira na pessoa
3. Confirme deleção
4. Tente cadastrar novamente
```

Opção C - Resete banco (apaga tudo):
```bash
cd backend
npm run prisma-reset
# Reinicie frontend
```

---

#### 5. "Logout automático ou Token expirado"

**Sintoma:**
```
Após 24h ou ao recarregar página, é desconectado
```

**Explicação:**
```
Token expira em 24 horas (por design)
localStorage persiste, mas é inválido no servidor
```

**Solução:**
```
Faça login novamente
```

**Para mudar expiração (desenvolvimento):**
```bash
# backend/src/rotas/autenticacao.js
jwt.sign(dados, processo.env.JWT_SECRET, {
  expiresIn: '7d'  // Mude de '24h' para '7d' (7 dias)
});
```

---

### Banco de Dados

#### 1. "Migrations falharam"

**Sintoma:**
```
Migration (XXX) failed to apply cleanly
```

**Soluções:**

Opção A - Resete e recrie:
```bash
cd backend
npm run prisma-reset  # ⚠️ DELETA TUDO
npm run prisma-migrate
npm run dev
```

Opção B - Verifique schema:
```bash
# Abra backend/prisma/schema.prisma
# Procure por erros de sintaxe
# Salve e rode:
npm run prisma-migrate
```

---

#### 2. "Erro ao criar pessoa - campo duplicado"

**Sintoma:**
```
Unique constraint failed
```

**Soluções:**

```bash
cd backend

# Verifique dados duplicados
npm run prisma-reset  # Reseta banco

# Ou delete registro manualmente (veja Prisma Studio)
npx prisma studio
# Interface visual para deletar dados
```

---

## 🔍 Ferramentas de Debug

### 1. Prisma Studio (Visual do Banco)

```bash
cd backend
npx prisma studio

# Abre em http://localhost:5555
# Veja, edite ou delete dados visualmente
```

---

### 2. Network Inspector (DevTools)

```javascript
// F12 → Network tab
// 1. Faça ação no app (login, criar pessoa)
// 2. Veja requisição HTTP
// 3. Clique nela para ver:
//    - Request URL
//    - Method (GET, POST, etc)
//    - Status (200, 400, 401, etc)
//    - Request Headers (Authorization)
//    - Request Body (dados enviados)
//    - Response (dados recebidos)
```

---

### 3. Console Log (Frontend)

```javascript
// Adicione logs temporários no React
// frontend/src/servicos/api.js

export const criarPessoa = async (token, dados) => {
  console.log('Criando pessoa com dados:', dados);  // ← LOG
  const cliente = criarClienteAPI(token);
  const resposta = await cliente.post('/pessoas', dados);
  console.log('Resposta do servidor:', resposta.data);  // ← LOG
  return resposta.data;
};
```

---

### 4. Server Logs (Backend)

```javascript
// backend/src/index.js
import { manipuladorErro } from './middleware/manipuladorErro.js';

// Adicione logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});
```

---

### 5. Postman/Insomnia (Testar API)

```
1. Baixe Postman: https://www.postman.com
2. Crie nova requisição:
   - URL: http://localhost:3001/api/autenticacao/entrar
   - Método: POST
   - Headers: Content-Type: application/json
   - Body:
     {
       "email": "seu@email.com",
       "senha": "senha123"
     }
3. Clique Send
4. Veja resposta
```

---

## 📊 Verificar Status dos Servidores

### Teste rápido da API

```bash
# Testar conexão
curl http://localhost:3001/api/saude

# Esperado:
# {"status":"OK","timestamp":"2025-11-27T..."}
```

### Verificar se servidores estão rodando

```powershell
# PowerShell
# Verifique portas ativas
netstat -ano | findstr "3001\|5173"

# Esperado:
# TCP    127.0.0.1:3001         LISTENING      <PID>
# TCP    127.0.0.1:5173         LISTENING      <PID>
```

---

## 🆘 Se Nada Funcionar

### Nuclear Option (Resete Tudo)

```bash
# 1. Parar ambos servidores (Ctrl+C em ambos terminais)

# 2. Limpar tudo
cd backend
rm -r node_modules prisma/dev.db prisma/migrations
cd ../frontend
rm -r node_modules
cd ..

# 3. Reinstalar
cd backend
npm install
npm run prisma-migrate
cd ../frontend
npm install

# 4. Reiniciar
# Terminal 1:
cd backend
npm run dev

# Terminal 2:
cd frontend
npm run dev

# 5. Acessar
# http://localhost:5173
```

---

## 📝 Gerar Relatório de Erro

Se problema persistir, crie relatório:

```
1. Data/Hora do problema: 27/11/2025 14:30
2. Sistema Operacional: Windows 11
3. Node version: v18.12.0 (rodando: node --version)
4. npm version: 9.1.1 (rodando: npm --version)
5. Descrição do erro: [DESCREVA AQUI]
6. Steps para reproduzir:
   - Abri http://localhost:5173
   - Cliquei em Registre-se
   - Inseri dados
   - Recebi erro: [QUAL ERRO?]
7. Screenshots: [UPLOAD SE TIVER]
8. Console errors: [COPIE AQUI]
9. Network errors: [COPIE AQUI]
```

---

## ⚡ Dicas de Performance

### Backend

```bash
# Veja qual processo usa mais CPU
# PowerShell
Get-Process node | Sort-Object -Property CPU -Descending

# Se está lento, pode ser:
# - Banco de dados cheio
# - Query sem índice
# - Muitas requisições simultâneas
```

### Frontend

```javascript
// Adicione Performance marks
performance.mark('inicio-load');
// ... seu código
performance.mark('fim-load');
performance.measure('tempo-total', 'inicio-load', 'fim-load');
console.log(performance.getEntriesByType('measure')[0].duration);
```

---

## 📞 Próximos Passos se Problema Persistir

1. Verifique internet connection
2. Verifique se antivírus está bloqueando portas
3. Verifique se firewall está bloqueando
4. Tente em máquina diferente
5. Reinstale Node.js e npm
6. Entre em contato com suporte

---

**Última atualização: 27/11/2025**
