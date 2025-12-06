# Correção CORS - Sistema de Recuperação de Senha

## Problema Identificado
CORS bloqueando requisições de produção (https://sistema-de-cadastro-gac.vercel.app) para a API.

## Alterações Realizadas

### 1. Backend - `api/[...slug].js`
- ✅ Atualizada função `setCors()` para suportar múltiplas origens
- ✅ Lista de origens permitidas:
  - `http://localhost:5173` (dev local Vite)
  - `http://localhost:3000` (dev local alternativo)
  - `https://sistema-de-cadastro-gac.vercel.app` (produção antiga)
  - `https://gac-gestao.vercel.app` (produção atual)
- ✅ Aceita automaticamente qualquer domínio `*.vercel.app` em produção
- ✅ Lógica inteligente: aceita qualquer localhost em desenvolvimento

### 2. Frontend - `FormularioRecuperacaoSenha.jsx`
- ✅ Substituídas URLs hardcoded por variável de ambiente `VITE_API_URL`
- ✅ URLs agora se adaptam automaticamente ao ambiente

### 3. Configuração de Ambiente

#### Frontend
- ✅ Criado `.env.development` → `VITE_API_URL=http://localhost:3001/api`
- ✅ Criado `.env.production` → `VITE_API_URL=/api`

#### Backend
- ✅ Criado `.env.example` com documentação

### 4. Vercel Config - `vercel.json`
- ✅ CORS header atualizado para origem específica de produção
- ✅ Remove conflito entre headers do Vercel e código

## Instruções para Deploy

### 1. Commit e Push
```bash
git add .
git commit -m "fix: corrigir CORS para produção no sistema de recuperação de senha"
git push origin main
```

### 2. Variáveis de Ambiente na Vercel
Acesse: https://vercel.com/associacaoguaraunadev/sistema-de-cadastro-gac/settings/environment-variables

**IMPORTANTE:** Não precisa adicionar `VITE_API_URL` na Vercel, pois usamos `/api` em produção (proxy automático).

Verifique se estas variáveis existem:
- ✅ `DATABASE_URL`
- ✅ `DIRECT_URL`
- ✅ `JWT_SECRET`
- ✅ `PUSHER_APP_ID`
- ✅ `PUSHER_KEY`
- ✅ `PUSHER_SECRET`
- ✅ `PUSHER_CLUSTER`
- ⚠️ **REMOVER** `CORS_ORIGIN` (não é mais necessário, código gerencia isso)

### 3. Redeploy
Após o push, a Vercel fará deploy automático. Ou force um redeploy:
- Acesse o dashboard da Vercel
- Vá em "Deployments"
- Clique nos 3 pontos do último deploy → "Redeploy"

## Como Funciona Agora

### Desenvolvimento (Local)
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- CORS: Aceita qualquer `localhost:*`

### Produção (Vercel)
- Frontend: `https://gac-gestao.vercel.app`
- Backend (API): `https://gac-gestao.vercel.app/api`
- CORS: Aceita qualquer origem `*.vercel.app` automaticamente
- Proxy: Vercel roteia `/api/*` automaticamente

## Testes Após Deploy

1. **Abra**: https://gac-gestao.vercel.app/recuperar-senha
2. **Digite** um email válido cadastrado
3. **Verifique** o console do navegador (F12):
   - ✅ Não deve ter erro de CORS
   - ✅ Requisição para `/api/autenticacao/recuperacao-senha/solicitar` deve retornar 200
4. **Console do servidor** (Vercel Logs):
   - ✅ Deve aparecer o código de recuperação em desenvolvimento
   - ✅ Em produção, código não aparece (segurança)

## Rollback (se necessário)
```bash
git revert HEAD
git push origin main
```

## Próximos Passos (Opcional)
- [ ] Implementar envio de email real (Resend, SendGrid, etc)
- [ ] Adicionar rate limiting para recuperação de senha
- [ ] Logs estruturados para debugging em produção
