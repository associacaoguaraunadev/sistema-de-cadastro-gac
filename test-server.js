#!/usr/bin/env node

/**
 * 🚀 Servidor de Teste Local
 * Para testar a API localmente antes de fazer deploy
 */

import http from 'http';
import handler from './api/[...slug].js';

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // Simular context do Vercel
  req.query = {};
  
  // Extrair slug da URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  if (pathname.startsWith('/api/')) {
    const slug = pathname.slice(5).split('/').filter(s => s);
    req.query.slug = slug;
  }
  
  // Chamar handler
  try {
    await handler(req, res);
  } catch (erro) {
    console.error('❌ Erro no handler:', erro);
    res.writeHead(500);
    res.end(JSON.stringify({ erro: erro.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor de teste rodando em http://localhost:${PORT}`);
  console.log(`\nTeste os endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/autenticacao/entrar`);
  console.log(`   GET  http://localhost:${PORT}/api/pessoas\n`);
});

server.on('error', (erro) => {
  console.error('❌ Erro do servidor:', erro);
  process.exit(1);
});
