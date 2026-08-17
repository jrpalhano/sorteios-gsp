const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, slug, nome FROM lojas WHERE ativo = true ORDER BY nome');
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, slug, nome FROM lojas WHERE slug = $1 AND ativo = true',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Loja não encontrada' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
