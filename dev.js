#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(label, color, message) {
  console.log(`${color}[${label}]${colors.reset} ${message}`);
}

console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}  GAC Sistema - Desenvolvimento Local${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

// Backend
log('BACKEND', colors.blue, 'Iniciando backend na porta 3001...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Frontend
setTimeout(() => {
  log('FRONTEND', colors.green, 'Iniciando frontend na porta 5173...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (err) => {
    log('FRONTEND', colors.red, `Erro ao iniciar: ${err.message}`);
  });
}, 2000);

backend.on('error', (err) => {
  log('BACKEND', colors.red, `Erro ao iniciar: ${err.message}`);
});

process.on('SIGINT', () => {
  log('SISTEMA', colors.yellow, 'Encerrando...');
  backend.kill();
  process.exit(0);
});
