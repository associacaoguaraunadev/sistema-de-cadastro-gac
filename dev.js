import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Iniciando desenvolvimento...\n');

// Iniciar frontend
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

// Iniciar API (backend)
const backend = spawn('node', ['server-local.js'], {
  cwd: path.join(__dirname, 'api'),
  stdio: 'inherit',
  shell: true
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Encerrando servidores...');
  frontend.kill();
  backend.kill();
  process.exit(0);
});
