const jwt = require('jsonwebtoken');
const db  = require('../db/connection');

module.exports = async function auth(req, res, next) {
  // 1. Verifica presença do cookie
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });

  // 2. Verifica assinatura e expiração do JWT
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.clearCookie('admin_token', { path: '/' });
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }

  // 3. Confirma que o admin existe e está ativo no banco
  try {
    const { rows } = await db.query(
      'SELECT id, nome, nome_completo, email, ativo FROM administradores WHERE id = $1',
      [payload.id]
    );

    if (rows.length === 0) {
      res.clearCookie('admin_token', { path: '/' });
      return res.status(401).json({ erro: 'Conta não encontrada.' });
    }

    if (!rows[0].ativo) {
      res.clearCookie('admin_token', { path: '/' });
      return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o responsável.' });
    }

    req.admin = rows[0];
    next();
  } catch {
    return res.status(500).json({ erro: 'Erro interno ao verificar sessão.' });
  }
};
