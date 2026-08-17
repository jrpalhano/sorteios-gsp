async function validate(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) return { valido: true, score: null };
  if (process.env.NODE_ENV !== 'production') return { valido: true, score: null };

  const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
  });

  const data = await resp.json();
  const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');

  return {
    valido: data.success === true && data.score >= minScore,
    score:  data.score ?? null,
  };
}

module.exports = { validate };
