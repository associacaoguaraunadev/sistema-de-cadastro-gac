import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 DIAGNÓSTICO DE CONEXÃO DO BANCO');
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });
async function testarConexao() {
  try { await prisma.$connect(); console.log('✅ Conexão estabelecida!'); const result = await prisma.$queryRaw`SELECT 1 as test`; console.log('✅ Query funcionou:', result); const count = await prisma.usuario.count(); console.log('✅ Tabela Usuario acessível. Total de registros:', count); } catch (error) { console.log('❌ ERRO DETALHADO:'); console.log('   - Nome:', error.name); console.log('   - Código:', error.code); console.log('   - Mensagem:', error.message); console.log('   - Meta:', error.meta); } finally { await prisma.$disconnect(); } }

testarConexao();
