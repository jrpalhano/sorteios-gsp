const express   = require('express');
const router    = express.Router();
const { body, validationResult } = require('express-validator');
const db        = require('../db/connection');
const cpfUtil   = require('../utils/cpf');
const recaptcha = require('../utils/recaptcha');
const { inscricaoLimiter } = require('../middleware/rateLimiter');

const SLUGS_VALIDOS = ['piquia', 'centro'];

const validacoes = [
  body('nome').trim().escape().isLength({ min: 3 }).withMessage('Nome deve ter ao menos 3 caracteres'),
  body('telefone').trim().matches(/^\(\d{2}\) \d{4,5}-\d{4}$/).withMessage('Telefone inválido'),
  body('cpf').trim().matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).withMessage('CPF inválido'),
  body('numero_cupom').trim().isNumeric().isLength({ min: 1 }).withMessage('Número do cupom inválido'),
  body('data_cupom').isDate({ format: 'YYYY-MM-DD' }).withMessage('Data inválida'),
  body('comprou_influencer').isIn(['true', 'false']).withMessage('Campo inválido'),
  body('influencer_nome')
    .if(body('comprou_influencer').equals('true'))
    .trim().escape().isLength({ min: 2 }).withMessage('Informe o nome da influenciadora'),
  body('loja_slug').isIn(SLUGS_VALIDOS).withMessage('Loja inválida'),
  body('lgpd_aceite').equals('true').withMessage('É necessário aceitar os termos da LGPD'),
];

router.post('/', inscricaoLimiter, validacoes, async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array().map(e => e.msg) });
  }

  const {
    nome, telefone, cpf, numero_cupom, data_cupom,
    comprou_influencer, influencer_nome, loja_slug, recaptcha_token,
  } = req.body;

  const { valido, score } = await recaptcha.validate(recaptcha_token);
  if (!valido) {
    return res.status(400).json({ erro: 'Verificação de segurança falhou. Tente novamente.' });
  }

  try {
    const { rows: lojas } = await db.query(
      'SELECT id FROM lojas WHERE slug = $1 AND ativo = true',
      [loja_slug]
    );
    if (!lojas.length) return res.status(400).json({ erro: 'Loja inválida' });

    const { rows: existente } = await db.query(
      'SELECT id FROM inscricoes WHERE numero_cupom = $1',
      [numero_cupom]
    );
    if (existente.length) {
      return res.status(409).json({ erro: 'Este cupom já foi cadastrado.' });
    }

    const { cpf_enc, cpf_iv, cpf_tag } = cpfUtil.encrypt(cpf);

    await db.query(
      `INSERT INTO inscricoes
         (loja_id, nome, telefone, cpf_enc, cpf_iv, cpf_tag,
          numero_cupom, data_cupom, comprou_influencer, influencer_nome,
          lgpd_aceite, lgpd_aceite_em, recaptcha_score, ip_origem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW(),$11,$12)`,
      [
        lojas[0].id, nome, telefone,
        cpf_enc, cpf_iv, cpf_tag,
        numero_cupom, data_cupom,
        comprou_influencer === 'true',
        comprou_influencer === 'true' ? (influencer_nome || null) : null,
        score,
        req.ip,
      ]
    );

    res.status(201).json({ mensagem: 'Inscrição realizada com sucesso!' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este cupom já foi cadastrado.' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;
