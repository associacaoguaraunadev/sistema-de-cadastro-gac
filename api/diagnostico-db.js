import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🔍 DIAGNÓSTICO DE CONEXÃO DO BANCO');
console.log('================================');
console.log('🔑 DATABASE_URL existe?', process.env.DATABASE_URL ? 'SIM' : 'NÃO');
console.log('🔑 DIRECT_URL existe?', process.env.DIRECT_URL ? 'SIM' : 'NÃO');

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  console.log('📊 Detalhes da conexão:');
  console.log('   - Protocolo:', url.protocol);
  console.log('   - Host:', url.hostname);
  console.log('   - Porta:', url.port);
  console.log('   - Usuário:', url.username);
  console.log('   - Senha:', url.password ? '***DEFINIDA***' : 'NÃO DEFINIDA');
  console.log('   - Banco:', url.pathname);
  console.log('   - Parâmetros:', url.search);
}

console.log('\n🔌 Testando conexão Prisma...');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testarConexao() {
  try {
    console.log('1️⃣ Tentando conectar...');
    await prisma.$connect();
    console.log('✅ Conexão estabelecida!');
    
    console.log('2️⃣ Testando query simples...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query funcionou:', result);
    
    console.log('3️⃣ Verificando tabela Usuario...');
    const count = await prisma.usuario.count();
    console.log('✅ Tabela Usuario acessível. Total de registros:', count);
    
  } catch (error) {
    console.log('❌ ERRO DETALHADO:');
    console.log('   - Nome:', error.name);
    console.log('   - Código:', error.code);
    console.log('   - Mensagem:', error.message);
    console.log('   - Meta:', error.meta);
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔍 POSSÍVEIS CAUSAS:');
      console.log('   1. Senha do banco mudou');
      console.log('   2. Projeto Supabase foi pausado/deletado');
      console.log('   3. IP foi bloqueado');
      console.log('   4. Credenciais expiraram');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testarConexao();