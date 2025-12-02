import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Iniciando desenvolvimento...\n');

// Iniciar frontend
const frontend = spawn('npm', ['run', 'dev:frontend'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit'
});

// Iniciar backend
const backend = spawn('npm', ['run', 'dev:backend'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit'
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Encerrando servidores...');
  frontend.kill();
  backend.kill();
  process.exit(0);
});
