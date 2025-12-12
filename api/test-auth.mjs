import handler from './[...slug].js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function buildToken() {
  const user = await prisma.usuario.findFirst();
  if (!user) {
    console.error('No usuario found in DB to build token');
    process.exit(1);
  }
  const token = jwt.sign({ id: user.id, email: user.email, funcao: user.funcao }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
  console.log('Using usuario:', user.id, user.email, user.funcao);
  return token;
}

async function call(slugArr, method='GET', body=null, token=null) {
  const req = { method, url: '/api/' + slugArr.join('/'), headers: { host: 'localhost:3001', authorization: token ? `Bearer ${token}` : undefined, 'content-type': 'application/json' }, body, query: { slug: slugArr } };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { console.log(`> ${method} /${slugArr.join('/')} -> ${this.statusCode}`); console.log(JSON.stringify(data).substring(0,1000)); return this; },
    setHeader() {}, send() { return this; }, end() { return this; }, write() { return this; }, on() {}
  };
  try {
    await handler(req, res);
  } catch (err) {
    console.error(`ERROR calling ${slugArr.join('/')}:`, err.message);
  }
}

(async ()=>{
  const token = await buildToken();
  const routes = [
    ['health'],
    ['pessoas'],
    ['pessoas','listar'],
    ['usuarios'],
    ['autenticacao','eu'],
    ['guarauna','alunos'],
    ['guarauna','responsaveis'],
    ['guarauna','educadores'],
    ['guarauna','turmas'],
    ['guarauna','matriculas'],
    ['guarauna','tokens'],
    ['guarauna','beneficios'],
    ['guarauna','metricas'],
    ['guarauna','transferencia']
  ];

  for (const r of routes) {
    await call(r, 'GET', null, token);
  }

  // Try create pessoa (minimal)
  const nova = { nome: 'Teste API', email: 'teste-api@example.com', cpf: '00000000000' };
  await call(['pessoas'], 'POST', nova, token);

  console.log('\nSmoke tests completed');
  process.exit(0);
})();
