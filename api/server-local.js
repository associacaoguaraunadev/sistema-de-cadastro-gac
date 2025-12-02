import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando localmente' });
});

// Importar o handler de catchall como se fosse as rotas
import handler from './[...slug].js';

// Mapear todos os endpoints para o handler catchall
app.all('/:page*', async (req, res) => {
  try {
    // Construir o objeto req no formato esperado pelo handler Vercel
    const vercelReq = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      cookies: req.cookies || {},
      // Simular o path params do Vercel
      query: { __NEXT_DATA__: { slug: req.params.page?.split('/') || [] } }
    };

    // Construir o objeto res no formato esperado
    const statusCode = { code: 200 };
    const vercelRes = {
      status(code) {
        statusCode.code = code;
        res.status(code);
        return this;
      },
      json(data) {
        res.json(data);
        return this;
      },
      setHeader(key, value) {
        res.setHeader(key, value);
        return this;
      },
      send(data) {
        res.send(data);
        return this;
      },
      end() {
        res.end();
        return this;
      }
    };

    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error('❌ Erro ao processar requisição:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: error.message
    });
  }
});

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada', path: req.path });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n✅ API Local rodando em http://localhost:${PORT}`);
  console.log(`📍 Endpoints disponíveis:`);
  console.log(`   - POST http://localhost:${PORT}/api/autenticacao/entrar`);
  console.log(`   - GET http://localhost:${PORT}/api/pessoas`);
  console.log(`   - GET http://localhost:${PORT}/health\n`);
});

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Encerrando servidor...');
  process.exit(0);
});
