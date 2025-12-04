import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv para carregar o .env da pasta raiz
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📥 ${req.method} ${req.path}`);
  
  // Interceptar res.json para logar resposta
  const originalJson = res.json;
  res.json = function(data) {
    console.log(`[${new Date().toISOString()}] 📤 Response JSON - ${res.statusCode}`);
    return originalJson.call(this, data);
  };
  
  // Interceptar res.send para logar resposta
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[${new Date().toISOString()}] 📤 Response SEND - ${res.statusCode}`);
    return originalSend.call(this, data);
  };
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando localmente' });
});

// Importar o handler de catchall como se fosse as rotas
import handler from './[...slug].js';

// Mapear todos os endpoints para o handler catchall
app.all('*', async (req, res) => {
  try {
    // Extrair o slug do path
    let pathname = req.path;
    
    console.log(`[${new Date().toISOString()}] 🔄 Route handler - path: ${pathname}`);
    
    // Remover /api/ prefix se existir
    if (pathname.startsWith('/api/')) {
      pathname = pathname.slice(5);
    } else if (pathname.startsWith('/api')) {
      pathname = pathname.slice(4);
    }
    
    // Se comça com /, remover
    if (pathname.startsWith('/')) {
      pathname = pathname.slice(1);
    }
    
    // Split e filtrar partes vazias
    const slug = pathname.split('/').filter(p => p.length > 0);
    
    console.log(`[${new Date().toISOString()}] 🔄 Slug extraído: ${slug.join('/')}`);
    
    // Construir o objeto req no formato esperado pelo handler Vercel
    const vercelReq = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: { 
        slug: slug.length > 0 ? slug : [] 
      },
      cookies: req.cookies || {}
    };

    // Construir o objeto res no formato esperado
    const statusCode = { code: 200 };
    const vercelRes = {
      status(code) {
        statusCode.code = code;
        console.log(`[${new Date().toISOString()}] 🎯 Setting status: ${code}`);
        res.status(code);
        return this;
      },
      json(data) {
        console.log(`[${new Date().toISOString()}] 📤 Chamando json() - Status: ${statusCode.code}`);
        res.json(data);
        console.log(`[${new Date().toISOString()}] 📤 json() completado`);
        return this;
      },
      setHeader(key, value) {
        console.log(`[${new Date().toISOString()}] 📋 Header: ${key}: ${value}`);
        res.setHeader(key, value);
        return this;
      },
      send(data) {
        console.log(`[${new Date().toISOString()}] 📤 send() chamado`);
        res.send(data);
        return this;
      },
      end() {
        console.log(`[${new Date().toISOString()}] 📤 end() chamado`);
        res.end();
        return this;
      }
    };

    try {
      await handler(vercelReq, vercelRes);
      console.log(`[${new Date().toISOString()}] ✅ Handler completado com sucesso`);
    } catch (handlerError) {
      console.error(`[${new Date().toISOString()}] ❌ Erro dentro do handler:`, handlerError.message);
      console.error(handlerError.stack);
      throw handlerError;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erro ao processar requisição:`, error);
    console.error(error.stack);
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
