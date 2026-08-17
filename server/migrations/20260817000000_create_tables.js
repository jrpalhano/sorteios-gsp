/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('lojas', {
    id:        { type: 'serial',       primaryKey: true },
    slug:      { type: 'varchar(50)',  notNull: true, unique: true },
    nome:      { type: 'varchar(100)', notNull: true },
    ativo:     { type: 'boolean',      default: true },
    criado_em: { type: 'timestamptz',  default: pgm.func('NOW()') },
  });

  pgm.createTable('inscricoes', {
    id:                  { type: 'serial',       primaryKey: true },
    loja_id:             { type: 'integer',      notNull: true, references: '"lojas"(id)' },
    nome:                { type: 'varchar(150)', notNull: true },
    telefone:            { type: 'varchar(20)',  notNull: true },
    cpf_enc:             { type: 'text',         notNull: true },
    cpf_iv:              { type: 'varchar(24)',  notNull: true },
    cpf_tag:             { type: 'varchar(32)',  notNull: true },
    numero_cupom:        { type: 'varchar(50)',  notNull: true, unique: true },
    data_cupom:          { type: 'date',         notNull: true },
    comprou_influencer:  { type: 'boolean',      notNull: true, default: false },
    influencer_nome:     { type: 'varchar(100)', default: null },
    lgpd_aceite:         { type: 'boolean',      notNull: true, default: false },
    lgpd_aceite_em:      { type: 'timestamptz',  default: null },
    recaptcha_score:     { type: 'numeric(3,2)', default: null },
    ip_origem:           { type: 'varchar(45)',  default: null },
    criado_em:           { type: 'timestamptz',  default: pgm.func('NOW()') },
  });

  pgm.createIndex('inscricoes', 'loja_id');
  pgm.createIndex('inscricoes', 'criado_em');
  pgm.createIndex('inscricoes', 'numero_cupom');
  pgm.createIndex('inscricoes', 'telefone');

  // Seed das lojas
  pgm.sql(`
    INSERT INTO lojas (slug, nome) VALUES
      ('piquia', 'Loja PIQUIA'),
      ('centro', 'Loja CENTRO')
    ON CONFLICT (slug) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('inscricoes');
  pgm.dropTable('lojas');
};
