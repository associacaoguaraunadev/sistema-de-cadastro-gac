import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testarConexao() {
  try {
    console.log('🔍 Testando conexão com o banco...');
    const usuarios = await prisma.usuario.findMany();
    console.log('✅ Conexão OK! Usuários encontrados:', usuarios.length);
    
    if (usuarios.length > 0) {
      console.log('👤 Primeiro usuário:', usuarios[0].email);
    }
  } catch (error) {
    console.log('❌ Erro na conexão:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testarConexao();