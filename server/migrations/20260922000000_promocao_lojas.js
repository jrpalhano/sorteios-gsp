/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('promocao_lojas', {
    promocao_id: { type: 'integer', notNull: true, references: '"promocoes"(id)', onDelete: 'CASCADE' },
    loja_id:     { type: 'integer', notNull: true, references: '"lojas"(id)',     onDelete: 'CASCADE' },
  });

  pgm.addConstraint('promocao_lojas', 'promocao_lojas_pkey', 'PRIMARY KEY (promocao_id, loja_id)');

  pgm.alterColumn('inscricoes_v2', 'loja_id', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('inscricoes_v2', 'loja_id', { notNull: true });
  pgm.dropTable('promocao_lojas');
};
