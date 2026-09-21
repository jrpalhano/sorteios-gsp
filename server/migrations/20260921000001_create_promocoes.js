/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('promocoes', {
    id:                   { type: 'serial',       primaryKey: true },
    slug:                 { type: 'varchar(100)', notNull: true, unique: true },
    titulo:               { type: 'varchar(200)', notNull: true },
    selo_url:             { type: 'text',         default: null },
    imagem_produtos_url:  { type: 'text',         default: null },
    vigencia_inicio:      { type: 'date',         notNull: true },
    vigencia_fim:         { type: 'date',         notNull: true },
    ativo:                { type: 'boolean',      notNull: true, default: true },
    criado_em:            { type: 'timestamptz',  default: pgm.func('NOW()') },
  });

  pgm.createIndex('promocoes', 'slug');

  pgm.createTable('promocao_produtos', {
    id:           { type: 'serial',       primaryKey: true },
    promocao_id:  { type: 'integer',      notNull: true, references: '"promocoes"(id)', onDelete: 'CASCADE' },
    nome:         { type: 'varchar(200)', notNull: true },
    ordem:        { type: 'integer',      notNull: true, default: 0 },
  });

  pgm.createIndex('promocao_produtos', 'promocao_id');

  pgm.createTable('promocao_regras', {
    id:           { type: 'serial',       primaryKey: true },
    promocao_id:  { type: 'integer',      notNull: true, references: '"promocoes"(id)', onDelete: 'CASCADE' },
    texto:        { type: 'text',         notNull: true },
    ordem:        { type: 'integer',      notNull: true, default: 0 },
  });

  pgm.createIndex('promocao_regras', 'promocao_id');

  pgm.createTable('inscricoes_v2', {
    id:                  { type: 'serial',       primaryKey: true },
    promocao_id:         { type: 'integer',      notNull: true, references: '"promocoes"(id)' },
    loja_id:             { type: 'integer',      notNull: true, references: '"lojas"(id)' },
    nome:                { type: 'varchar(150)', notNull: true },
    telefone:            { type: 'varchar(20)',  notNull: true },
    cpf_enc:             { type: 'text',         notNull: true },
    cpf_iv:              { type: 'varchar(24)',  notNull: true },
    cpf_tag:             { type: 'varchar(32)',  notNull: true },
    numero_cupom:        { type: 'varchar(50)',  notNull: true },
    data_cupom:          { type: 'date',         notNull: true },
    comprou_influencer:  { type: 'boolean',      notNull: true, default: false },
    influencer_nome:     { type: 'varchar(100)', default: null },
    lgpd_aceite:         { type: 'boolean',      notNull: true, default: false },
    lgpd_aceite_em:      { type: 'timestamptz',  default: null },
    recaptcha_score:     { type: 'numeric(3,2)', default: null },
    ip_origem:           { type: 'varchar(45)',  default: null },
    criado_em:           { type: 'timestamptz',  default: pgm.func('NOW()') },
  });

  pgm.createIndex('inscricoes_v2', 'promocao_id');
  pgm.createIndex('inscricoes_v2', 'loja_id');
  pgm.createIndex('inscricoes_v2', 'criado_em');
  pgm.createIndex('inscricoes_v2', 'numero_cupom');
  pgm.createIndex('inscricoes_v2', 'telefone');
};

exports.down = (pgm) => {
  pgm.dropTable('inscricoes_v2');
  pgm.dropTable('promocao_regras');
  pgm.dropTable('promocao_produtos');
  pgm.dropTable('promocoes');
};
