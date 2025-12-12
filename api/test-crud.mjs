import handler from './[...slug].js';

async function call(slugArr, method='GET', body=null, headers={}){
  const req = { method, url: '/api/'+slugArr.join('/'), headers: { host: 'localhost:3001', ...headers }, body, query: { slug: slugArr } };
  const res = { statusCode: 200, status(code){ this.statusCode = code; return this; }, json(data){ console.log('RES', slugArr.join('/'), this.statusCode, JSON.stringify(data)); return this; }, setHeader(){}, send(data){ console.log('SEND', data); return this; }, end(){}, write(){}, on(){} };
  await handler(req, res);
}

(async ()=>{
  await call(['health']);
  await call(['pessoas']);
  await call(['autenticacao','entrar'], 'POST', { email: 'naoexiste@example.com', senha: 'x' });
})();
