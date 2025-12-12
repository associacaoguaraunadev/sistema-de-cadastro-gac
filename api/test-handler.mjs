import handler from './[...slug].js';

async function run() {
  const req = {
    method: 'GET',
    url: '/api/health',
    headers: { host: 'localhost:3001' },
    query: { slug: ['health'] }
  };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { console.log('RES_JSON', this.statusCode, JSON.stringify(data)); return this; },
    setHeader() {}, send() {}, end() {}
  };

  await handler(req, res);
}

run().catch(e=>{ console.error('ERROR', e); process.exit(1); });
