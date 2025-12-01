# 🔐 Configuração de Variáveis de Ambiente no Vercel

## ⚠️ IMPORTANTE: Seu sistema foi reestruturado!

A rota de autenticação estava retornando **404** porque:
1. ✅ Você tinha **múltiplos handlers conflitantes** (`api/autenticacao/`, `api/pessoas/`, `api/[...slug].js`)
2. ✅ O arquivo `.vercelignore` estava **ignorando toda a pasta `api/`**
3. ✅ As URLs de ambiente estavam **incorretas**

## ✅ Mudanças Realizadas

1. **Removidas rotas conflitantes** (agora usar apenas `api/[...slug].js`)
2. **Corrigido `.vercelignore`** para incluir a pasta `api/`
3. **Atualizado `vercel.json`** com rewrites e headers CORS
4. **Atualizado `.env`** com a URL correta do Vercel

## 🔧 Próximos Passos: Configurar Variáveis no Vercel

### Acesse o Vercel Dashboard:
1. Vá para: https://vercel.com/dashboard
2. Selecione o projeto: **sistema-de-cadastro-gac**
3. Vá em: **Settings** → **Environment Variables**

### Adicione as Variáveis Abaixo:

```
DATABASE_URL = postgresql://postgres.oashngynwtkaxefphenv:[95Hx30xlr8*]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL = postgresql://postgres.oashngynwtkaxefphenv:[95Hx30xlr8*]@aws-1-us-east-2.pooler.supabase.com:5432/postgres
JWT_SECRET = ef5c74a38f055e19631c644aca2f6a3fb646d2456d99f1b8c50ed310436ab90c
CORS_ORIGIN = https://sistema-de-cadastro-gac.vercel.app
NODE_ENV = production
VITE_API_URL = https://sistema-de-cadastro-gac.vercel.app/api
```

### Selecione os Environments:
- ✅ Production
- ✅ Preview
- ✅ Development

### Salve as Mudanças

## ✅ Redeployer o Projeto

Após adicionar as variáveis:

1. No Vercel Dashboard, clique em **Deployments**
2. Localize o último deploy (deve estar em "Processing" ou "Ready")
3. Clique em **...** (três pontos) e selecione **Redeploy**
4. Aguarde a conclusão do deploy

Ou execute localmente:
```bash
git pull
git push  # Isso vai triggar um novo deploy automaticamente
```

## 🧪 Teste a Autenticação

### 1. Verifique se a API está respondendo:
```bash
curl https://sistema-de-cadastro-gac.vercel.app/api/health
```

Deve retornar:
```json
{
  "status": "OK",
  "timestamp": "2025-12-01T...",
  "database": "connected"
}
```

### 2. Teste o login:
Acesse: https://sistema-de-cadastro-gac.vercel.app/entrar

Use credenciais:
- Email: `admin@gac.com`
- Senha: `Admin123!`

## 📊 Estrutura de Rotas Consolidada

Todas as requisições agora são tratadas por `api/[...slug].js`:

### Autenticação
- `POST /api/autenticacao/entrar` - Login
- `POST /api/autenticacao/registrar` - Registro
- `GET /api/autenticacao/eu` - Dados do usuário atual
- `POST /api/autenticacao/validar-token` - Validar JWT
- `GET /api/autenticacao/listar` - Listar usuários (admin)

### Pessoas
- `GET /api/pessoas` - Listar pessoas
- `POST /api/pessoas` - Criar pessoa
- `GET /api/pessoas/:id` - Obter pessoa
- `PUT /api/pessoas/:id` - Atualizar pessoa
- `DELETE /api/pessoas/:id` - Deletar pessoa

### Tokens
- `POST /api/autenticacao/token/gerar` - Gerar token (admin)
- `GET /api/autenticacao/token/listar` - Listar tokens (admin)
- `DELETE /api/autenticacao/token/:id` - Revogar token (admin)
- `POST /api/autenticacao/token/validar` - Validar token

## 🐛 Troubleshooting

### Se ainda receber 404:
1. Verifique se o deploy no Vercel foi bem-sucedido (veja a aba Deployments)
2. Limpe o cache do navegador: `Ctrl+Shift+Delete` ou `Cmd+Shift+Delete`
3. Verifique as variáveis de ambiente: Settings → Environment Variables
4. Aguarde 2-3 minutos após o deploy para as mudanças entrar em vigor

### Se receber erro de CORS:
1. Verifique se `CORS_ORIGIN` está definido corretamente
2. O `vercel.json` já define headers CORS globais

### Se receber erro 500 de banco de dados:
1. Verifique se `DATABASE_URL` está correto
2. Verifique se `DIRECT_URL` está correto
3. Pode ser necessário executar as migrations:
   ```bash
   npx prisma migrate deploy
   ```

## 📝 Notas Importantes

1. **Não altere** os arquivos em `api/autenticacao/` ou `api/pessoas/` (foram removidos)
2. **Todas as rotas** agora passam por `api/[...slug].js`
3. **O frontend** automaticamente usa `VITE_API_URL` do Vercel
4. **As credenciais** no `.env` devem ser mantidas **seguras e privadas**

## ✨ Próximas Steps Recomendadas

1. ✅ Configurar variáveis no Vercel
2. ✅ Testar o login em produção
3. ✅ Verificar os logs no Vercel (Functions → Logs)
4. ✅ Considerar adicionar mais validações e tratamento de erros
5. ✅ Implementar refresh tokens
6. ✅ Adicionar rate limiting para proteção contra brute force

---

**Última atualização:** 1º de dezembro de 2025
**Status:** Sistema reestruturado e pronto para deploy
