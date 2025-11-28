# 🚀 Checklist de Deployment - GAC System

## Antes de Fazer Deploy em Produção

### 1. Segurança - CRÍTICO

- [ ] **JWT_SECRET alterado**
  ```bash
  # Gere uma chave forte (use em .env produção):
  # Exemplo: aB9kL2pQ5vX8mN1cD7jH4fG6tY3rW0uS
  # Mínimo 32 caracteres, com letras, números e símbolos
  ```

- [ ] **NODE_ENV = "production"**
  ```bash
  NODE_ENV="production"
  ```

- [ ] **CORS_ORIGIN atualizado**
  ```bash
  # De:
  CORS_ORIGIN="http://localhost:5173"
  
  # Para:
  CORS_ORIGIN="https://seu-dominio.com.br"
  ```

- [ ] **Banco de dados em servidor profissional**
  ```prisma
  # De SQLite:
  datasource db {
    provider = "sqlite"
    url      = "file:./dev.db"
  }
  
  # Para PostgreSQL (exemplo):
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```

- [ ] **HTTPS/SSL habilitado**
  - Adquira certificado SSL
  - Configure em reverse proxy (Nginx, Apache)
  - Redirecione HTTP → HTTPS

- [ ] **Vulnerabilidades auditadas**
  ```bash
  npm audit
  npm audit fix  # Se necessário
  ```

- [ ] **Senhas padrão alteradas**
  - Banco de dados
  - Servidor
  - Admin accounts

- [ ] **Backup configurado**
  - Backup automático diário
  - Teste restauração
  - Armazene offline

---

### 2. Backend - Configuração

- [ ] **Dependências produção**
  ```bash
  # Remove devDependencies em produção
  npm install --production
  ```

- [ ] **Build otimizado**
  ```bash
  # Compile TypeScript (se usar)
  npm run build
  ```

- [ ] **Variáveis de ambiente**
  ```bash
  # NÃO use arquivo .env em produção!
  # Use:
  # - Variáveis de sistema
  # - Secrets do servidor (Railway, Heroku, AWS)
  # - Arquivo .env apenas local (nunca em Git)
  ```

- [ ] **Logs centralizados**
  - Configure Sentry, LogRocket ou similar
  - Monitore erros em tempo real

- [ ] **Banco de dados migrado**
  ```bash
  # No servidor de produção:
  npm run prisma-migrate
  ```

- [ ] **Servidor rodando em processo gerenciado**
  - PM2
  - systemd
  - Docker
  - Node de plataforma (Railway, Heroku)

- [ ] **Rate limit ajustado**
  ```javascript
  // Para produção, considere aumentar ou adicionar por IP
  const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50  // Reduzido de 100
  });
  ```

- [ ] **Monitoramento habilitado**
  - Uptime robot
  - New Relic
  - DataDog

---

### 3. Frontend - Build

- [ ] **Build testado**
  ```bash
  npm run build
  npm run preview  # Test build localmente
  ```

- [ ] **Variáveis de ambiente configuradas**
  ```bash
  # .env.production (ou variáveis do Vercel/Netlify)
  VITE_API_URL="https://api.seu-dominio.com.br"
  ```

- [ ] **Pasta dist/ pronta**
  - Contém index.html e assets/
  - Sem erros de build
  - Tamanho razoável

- [ ] **Manifesto PWA** (opcional)
  ```json
  // public/manifest.json
  {
    "name": "GAC - Associação",
    "short_name": "GAC",
    "theme_color": "#2e7d32"
  }
  ```

- [ ] **Favicon adicionado**
  ```html
  <!-- index.html -->
  <link rel="icon" href="/favicon.ico" />
  ```

---

### 4. Hospedagem - Escolha Plataforma

#### Option A: Railway (Recomendado para Iniciantes)
```bash
1. Crie conta em railway.app
2. Conecte repositório GitHub
3. Configure variáveis de ambiente
4. Deploy automático com cada push
5. Banco de dados incluído
```

#### Option B: Vercel (Frontend) + Railway (Backend)
```bash
Frontend (Vercel):
1. Deploy pasta /frontend
2. Configure build: npm run build
3. Output: dist

Backend (Railway):
1. Deploy pasta /backend
2. Configure start: npm start
```

#### Option C: Docker + AWS/DigitalOcean/Linode
```dockerfile
# Dockerfile (exemplo)
FROM node:18-alpine
WORKDIR /app
COPY backend ./
RUN npm install --production
RUN npm run prisma-migrate
CMD npm start
```

#### Option D: Tradicional (VPS/Servidor Próprio)
```bash
1. SSH em servidor
2. Clone repositório
3. Configure variáveis
4. Use PM2 ou systemd
5. Configure Nginx reverse proxy
```

---

### 5. Banco de Dados - Produção

- [ ] **PostgreSQL instalado e rodando**
  ```bash
  # Ou use gerenciado (Railway, Heroku)
  ```

- [ ] **DATABASE_URL correto**
  ```bash
  DATABASE_URL="postgresql://user:pass@host:5432/gac_prod"
  ```

- [ ] **Migrations aplicadas**
  ```bash
  npm run prisma-migrate
  ```

- [ ] **Backup automático habilitado**
  - Diário
  - Semanal
  - Armazenado offline

- [ ] **Performance otimizada**
  - Índices criados
  - Queries analisadas
  - Connection pooling configurado

---

### 6. DNS e Domínio

- [ ] **Domínio registrado**
  - gac-associacao.com.br
  - ou similar

- [ ] **DNS configurado**
  - Registros A/CNAME
  - Apontam para servidor/CDN

- [ ] **SSL/TLS provisioned**
  - Let's Encrypt (gratuito)
  - ou provedor pago

- [ ] **Email habilitado** (opcional)
  - Para notificações
  - Recovery de senha

---

### 7. Performance

- [ ] **CDN configurado**
  - Cloudflare
  - AWS CloudFront
  - Vercel Edge

- [ ] **Caching habilitado**
  ```javascript
  // Backend
  app.use((req, res, next) => {
    res.set('Cache-Control', 'public, max-age=3600');
    next();
  });
  ```

- [ ] **Compressão ativada**
  ```javascript
  import compression from 'compression';
  app.use(compression());
  ```

- [ ] **HTTP/2 ou HTTP/3**
  - Suportado por Nginx/Apache moderno

- [ ] **Otimização de assets**
  - Imagens comprimidas
  - CSS/JS minificado (Vite faz automaticamente)

---

### 8. Monitoramento

- [ ] **Alerts configurados**
  - Erro 500
  - Tempo de resposta
  - Taxa de erro

- [ ] **Logs agregados**
  ```bash
  # Use serviço como:
  # - Sentry
  # - LogRocket
  # - ELK Stack
  # - CloudWatch
  ```

- [ ] **Uptime monitoring**
  ```bash
  # Uptimerobot.com
  # Monitore /api/saude a cada 5 min
  ```

- [ ] **Performance monitoring**
  - New Relic
  - DataDog
  - Prometheus

---

### 9. Testes Finais

- [ ] **Teste de login**
  - Registre nova conta
  - Faça login
  - Verifique token

- [ ] **Teste CRUD**
  - Crie pessoa
  - Edite dados
  - Busque por CPF
  - Delete registro

- [ ] **Teste de erro**
  - CPF duplicado
  - Dados inválidos
  - Verifique mensagens

- [ ] **Teste de segurança**
  - Tente acessar sem token (deve retornar 401)
  - Tente manipular token (deve retornar 403)
  - Tente SQL injection (deve ser escapado)

- [ ] **Teste de performance**
  - Tempo de resposta < 500ms
  - Sem memory leaks
  - Carga suporta 100+ usuários simultâneos

- [ ] **Teste em diferentes navegadores**
  - Chrome
  - Firefox
  - Safari
  - Edge

- [ ] **Teste em mobile**
  - iOS Safari
  - Android Chrome

---

### 10. Documentação

- [ ] **README atualizado**
  - URLs de produção
  - Credenciais de acesso
  - Contatos para suporte

- [ ] **Runbook criado**
  - Como fazer deploy
  - Como restaurar backup
  - Como escalar
  - Procedimentos de emergência

- [ ] **Documentação de API**
  - Endpoints listados
  - Exemplos de requisição
  - Códigos de erro documentados

- [ ] **Training realizado**
  - Usuários treinados
  - Documentação acessível
  - Suporte disponível

---

### 11. Backup e Disaster Recovery

- [ ] **Backup automático**
  ```bash
  # Diariamente às 2:00 AM
  # Retenção: 30 dias
  # Localização: Servidor externo
  ```

- [ ] **Teste de restauração**
  - Restaure backup em servidor de teste
  - Verifique integridade
  - Documente tempo necessário

- [ ] **Disaster Recovery Plan**
  - RTO: < 4 horas
  - RPO: < 1 hora de dados
  - Procedimentos documentados
  - Contatos de emergência

---

### 12. Escalabilidade (Futuro)

- [ ] **Load balancer preparado**
  - Para múltiplas instâncias
  - Sticky sessions para JWT

- [ ] **Database replication**
  - Master-slave configurado
  - Failover automático

- [ ] **Cache layer**
  - Redis para sessions
  - Cache de queries frequentes

- [ ] **Microserviços** (opcional)
  - Separar autenticação
  - Separar processamento

---

## Checklist por Plataforma

### Railway
- [ ] Conectou repositório
- [ ] Configurou variáveis de ambiente
- [ ] Deploy automático habilitado
- [ ] Custom domain adicionado
- [ ] SSL gerado automaticamente

### Vercel (Frontend)
- [ ] Importou projeto
- [ ] Framework: React/Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables: VITE_API_URL

### Docker + AWS/DigitalOcean
- [ ] Dockerfile criado e testado
- [ ] Image criada e publicada
- [ ] Container rodando localmente
- [ ] Volumes persistentes configurados
- [ ] Networking configurado
- [ ] SSL terminado no load balancer

---

## Pós-Deployment

### Primeiros 7 Dias
- [ ] Monitor 24/7 ativo
- [ ] Suporte em standby
- [ ] Logs sendo coletados
- [ ] Alertas configurados
- [ ] Feedback de usuários coletado

### Primeira Semana
- [ ] Resolver bugs críticos
- [ ] Otimizar performance
- [ ] Habilitar analytics
- [ ] Documentar lições aprendidas

### Primeiro Mês
- [ ] Analisar uso e padrões
- [ ] Planejar melhorias
- [ ] Treinar usuários
- [ ] Documentar procedimentos

---

## Matriz de Responsabilidade

| Atividade | Dev | Ops | Gerente |
|-----------|-----|-----|---------|
| Código | ✓ | - | - |
| Deploy | ✓ | ✓ | - |
| Monitoramento | - | ✓ | ✓ |
| Suporte | ✓ | ✓ | ✓ |
| Backups | - | ✓ | - |
| Performance | ✓ | ✓ | ✓ |

---

## Contatos de Emergência

```
Dev Principal: [NÚMERO]
Ops Principal: [NÚMERO]
Suporte: [EMAIL]
Escalação: [GERENTE]
Fornecedor DB: [CONTATO]
Fornecedor Hospedagem: [CONTATO]
```

---

## Links Úteis

- Railway: https://railway.app
- Vercel: https://vercel.com
- Prisma Docs: https://www.prisma.io/docs
- React Docs: https://react.dev
- Sentry: https://sentry.io
- Uptime Robot: https://uptimerobot.com

---

**Data: 27/11/2025**
**Próxima revisão: 01/12/2025**
