const express   = require('express');
const router    = express.Router();
const db        = require('../db/connection');
const cpfUtil   = require('../utils/cpf');
const recaptcha = require('../utils/recaptcha');
const { consultaLimiter } = require('../middleware/rateLimiter');

router.get('/', consultaLimiter, async (req, res) => {
  const { telefone, cpf, recaptcha_token } = req.query;

  if (!telefone || !cpf) return res.status(400).json({ erro: 'Informe telefone e CPF' });

  const { valido } = await recaptcha.validate(recaptcha_token || '');
  if (!valido) return res.status(400).json({ erro: 'Verificação de segurança falhou. Tente novamente.' });
  if (!/^\(\d{2}\) \d{4,5}-\d{4}$/.test(telefone)) return res.status(400).json({ erro: 'Telefone inválido' });
  if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf))    return res.status(400).json({ erro: 'CPF inválido' });

  try {
    const { rows } = await db.query(
      `SELECT i.cpf_enc, i.cpf_iv, i.cpf_tag, i.numero_cupom, i.data_cupom, l.nome AS loja
       FROM inscricoes i
       JOIN lojas l ON l.id = i.loja_id
       WHERE i.telefone = $1
       ORDER BY i.data_cupom DESC`,
      [telefone]
    );

    const cpfLimpo = cpf.replace(/\D/g, '');

    const resultado = rows
      .filter(r => {
        try {
          return cpfUtil.decrypt(r.cpf_enc, r.cpf_iv, r.cpf_tag).replace(/\D/g, '') === cpfLimpo;
        } catch { return false; }
      })
      .map(r => ({
        numero_cupom: r.numero_cupom,
        data_cupom:   r.data_cupom,
        loja:         r.loja,
      }));

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
