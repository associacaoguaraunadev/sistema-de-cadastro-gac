#!/usr/bin/env node

/**
 * 🔍 Diagnóstico de Autenticação - Sistema GAC
 * 
 * Este script verifica se o sistema de autenticação está funcionando corretamente
 * 
 * Uso: node diagnostico-autenticacao.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

async function teste(nome, funcao) {
  console.log(`\n📝 Testando: ${nome}`);
  console.log('─'.repeat(60));
  try {
    const resultado = await funcao();
    console.log('✅ Sucesso!', resultado);
    return true;
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    if (erro.response) {
      console.error('   Status:', erro.response.status);
      console.error('   Dados:', erro.response.data);
    }
    return false;
  }
}

async function testarHealth() {
  const resposta = await fetch(`${BASE_URL}/health`);
  if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
  const dados = await resposta.json();
  return JSON.stringify(dados, null, 2);
}

async function testarLogin() {
  const resposta = await fetch(`${BASE_URL}/autenticacao/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@gac.com',
      senha: 'Admin123!'
    })
  });
  if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
  const dados = await resposta.json();
  return `Token recebido (${dados.token?.length || 0} caracteres)`;
}

async function testarRotaNaoExistente() {
  const resposta = await fetch(`${BASE_URL}/rota-inexistente`);
  if (resposta.status === 404) {
    const dados = await resposta.json();
    return `Retorno 404 correto: ${dados.erro}`;
  }
  throw new Error(`Esperava 404, recebeu ${resposta.status}`);
}

async function main() {
  console.log('🔐 DIAGNÓSTICO DE AUTENTICAÇÃO - SISTEMA GAC');
  console.log('═'.repeat(60));
  console.log(`URL Base: ${BASE_URL}`);
  console.log('═'.repeat(60));

  const testes = [
    ['Health Check', testarHealth],
    ['Login (Credenciais Corretas)', testarLogin],
    ['Rota Não Existente (404)', testarRotaNaoExistente]
  ];

  let sucessos = 0;
  for (const [nome, funcao] of testes) {
    if (await teste(nome, funcao)) {
      sucessos++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Resultado: ${sucessos}/${testes.length} testes passaram`);
  console.log('═'.repeat(60));

  if (sucessos === testes.length) {
    console.log('✅ Sistema funcionando corretamente!');
    process.exit(0);
  } else {
    console.log('❌ Existem problemas no sistema.');
    console.log('\n💡 Dicas:');
    console.log('- Verifique se o servidor está rodando');
    console.log('- Verifique as variáveis de ambiente');
    console.log('- Verifique se o banco de dados está conectado');
    console.log('- Verifique os logs do servidor');
    process.exit(1);
  }
}

main().catch(erro => {
  console.error('❌ Erro fatal:', erro.message);
  process.exit(1);
});
