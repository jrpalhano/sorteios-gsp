const crypto = require('crypto');

function encrypt(cpf) {
  const key = Buffer.from(process.env.CPF_ENCRYPTION_KEY, 'hex');
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(cpf, 'utf8'), cipher.final()]);
  return {
    cpf_enc: enc.toString('hex'),
    cpf_iv:  iv.toString('hex'),
    cpf_tag: cipher.getAuthTag().toString('hex'),
  };
}

function decrypt(cpf_enc, cpf_iv, cpf_tag) {
  const key      = Buffer.from(process.env.CPF_ENCRYPTION_KEY, 'hex');
  const iv       = Buffer.from(cpf_iv, 'hex');
  const tag      = Buffer.from(cpf_tag, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(cpf_enc, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

function mask(cpf) {
  // 000.000.000-00  →  ***.***.***-00
  return `***.***.***-${cpf.slice(-2)}`;
}

module.exports = { encrypt, decrypt, mask };
