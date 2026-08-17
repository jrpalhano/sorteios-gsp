const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('admin_token', { path: '/api/admin' });
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }
};
