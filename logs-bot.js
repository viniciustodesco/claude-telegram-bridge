import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const LOG_FILE = join(process.cwd(), 'bot.log');

// Número de linhas para mostrar (padrão: últimas 50)
const lines = process.argv[2] || '50';

if (!existsSync(LOG_FILE)) {
  console.log('❌ Arquivo de log não encontrado.');
  console.log('💡 O bot precisa ter sido iniciado pelo menos uma vez.');
  process.exit(1);
}

console.log(`📄 Últimas ${lines} linhas do log:\n`);
console.log('─'.repeat(70));

// No Windows, não temos tail, então vamos ler o arquivo e pegar as últimas linhas
if (process.platform === 'win32') {
  const content = readFileSync(LOG_FILE, 'utf8');
  const allLines = content.split('\n');
  const lastLines = allLines.slice(-parseInt(lines));
  console.log(lastLines.join('\n'));
} else {
  // Linux/Mac pode usar tail
  const tail = spawn('tail', ['-n', lines, LOG_FILE]);

  tail.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  tail.on('close', () => {
    console.log('\n' + '─'.repeat(70));
  });
}

console.log('─'.repeat(70));
console.log('\n💡 Dicas:');
console.log('   npm run bot:logs 100  - Ver últimas 100 linhas');
console.log('   npm run bot:logs all  - Ver log completo');

// Se pediu "all", mostrar tudo
if (lines === 'all') {
  console.log('\n📄 Log completo:\n');
  console.log(readFileSync(LOG_FILE, 'utf8'));
}
