// Uso: node scripts/seed-admin.js
// Cria o primeiro administrador interativamente via linha de comando.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt   = require('bcryptjs');
const readline = require('readline');
const db       = require('../src/db/connection');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n── Criar primeiro administrador ──────────────────────\n');

  const nome          = (await ask('Nome (apelido): ')).trim();
  const nome_completo = (await ask('Nome completo:  ')).trim();
  const email         = (await ask('E-mail:         ')).trim().toLowerCase();
  const senha         = (await ask('Senha:          ')).trim();
  rl.close();

  if (!nome || !nome_completo || !email || !senha) {
    console.error('\nTodos os campos são obrigatórios.');
    process.exit(1);
  }

  if (senha.length < 8) {
    console.error('\nA senha deve ter no mínimo 8 caracteres.');
    process.exit(1);
  }

  const senha_hash = await bcrypt.hash(senha, 12);

  await db.query(
    `INSERT INTO administradores (nome, nome_completo, email, senha_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [nome, nome_completo, email, senha_hash]
  );

  console.log(`\n✔ Administrador "${nome}" criado com sucesso.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\nErro:', err.message);
  process.exit(1);
});
