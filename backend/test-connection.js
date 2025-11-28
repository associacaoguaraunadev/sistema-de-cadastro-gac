import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conectado ao banco com sucesso!');
    console.log('Resultado:', result);
  } catch (e) {
    console.log('❌ Erro de conexão:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
