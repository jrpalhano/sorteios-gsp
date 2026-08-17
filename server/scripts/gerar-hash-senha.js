// Uso: node scripts/gerar-hash-senha.js SuaSenhaAqui
const bcrypt = require('bcryptjs');

const senha = process.argv[2];
if (!senha) {
  console.error('Informe a senha: node scripts/gerar-hash-senha.js SuaSenha');
  process.exit(1);
}

bcrypt.hash(senha, 12).then(hash => {
  console.log('\nCole isso no seu .env:\n');
  console.log(`ADMIN_PASS_HASH=${hash}\n`);
});
