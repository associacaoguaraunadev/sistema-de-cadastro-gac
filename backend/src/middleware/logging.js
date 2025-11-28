export function middlewareLogging(req, res, next) {
  const inicio = Date.now();
  
  // Log da requisição recebida
  console.log(`\n📨 [${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  console.log(`   User-Agent: ${req.get('user-agent')}`);
  
  if (Object.keys(req.body).length > 0) {
    console.log(`   Body: ${JSON.stringify(req.body, null, 2)}`);
  }

  // Interceptar a resposta
  const originalSend = res.send;
  res.send = function(data) {
    const duracao = Date.now() - inicio;
    const statusCode = res.statusCode;
    
    // Cores de status
    let emoji = '✅';
    if (statusCode >= 400 && statusCode < 500) emoji = '⚠️';
    if (statusCode >= 500) emoji = '❌';
    
    console.log(`   ${emoji} Status: ${statusCode} | ⏱️ ${duracao}ms`);
    
    return originalSend.call(this, data);
  };

  next();
}
