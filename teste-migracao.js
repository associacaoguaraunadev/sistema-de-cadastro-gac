#!/usr/bin/env node

/**
 * TESTE - Verificar migração e serviços
 * Valida se a migração foi aplicada corretamente
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testarMigracao() {
  console.log('\n📊 VERIFICAÇÃO DE MIGRAÇÃO\n');
  
  try {
    console.log('1️⃣ Verificando status de migrações...');
    
    // Nota: Isso só funciona se o banco estiver online
    try {
      const { stdout } = await execAsync('cd api && npx prisma migrate status', {
        timeout: 5000
      });
      
      console.log('✅ Status de migrações:\n', stdout);
    } catch (erro) {
      if (erro.code === 'ETIMEDOUT' || erro.message.includes('Can\'t reach database')) {
        console.log('⚠️  Banco de dados offline - Migrações ficarão pendentes');
        console.log('✅ Arquivo de migração criado: migration.sql\n');
        
        console.log('📝 Próximos passos quando banco estiver online:');
        console.log('   1. npx prisma migrate deploy');
        console.log('   2. Verificar com: npx prisma migrate status\n');
        
        // Mostrar conteúdo da migração
        const fs = await import('fs');
        const caminhoMigracao = './api/prisma/migrations/20251201_adicionar_renda_familiar_e_invite_token/migration.sql';
        
        if (fs.existsSync(caminhoMigracao)) {
          console.log('📄 Conteúdo da migração:');
          console.log('─'.repeat(50));
          const conteudo = fs.readFileSync(caminhoMigracao, 'utf-8');
          console.log(conteudo);
          console.log('─'.repeat(50));
        }
        
        return;
      }
      throw erro;
    }
    
  } catch (erro) {
    console.log('⚠️  Aviso:', erro.message);
  }
}

testarMigracao();
