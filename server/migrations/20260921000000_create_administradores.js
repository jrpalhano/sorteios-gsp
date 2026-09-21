/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('administradores', {
    id:            { type: 'serial',       primaryKey: true },
    nome:          { type: 'varchar(100)', notNull: true },
    nome_completo: { type: 'varchar(200)', notNull: true },
    email:         { type: 'varchar(200)', notNull: true, unique: true },
    senha_hash:    { type: 'text',         notNull: true },
    ativo:         { type: 'boolean',      notNull: true, default: true },
    criado_em:     { type: 'timestamptz',  default: pgm.func('NOW()') },
  });

  pgm.createIndex('administradores', 'email');
};

exports.down = (pgm) => {
  pgm.dropTable('administradores');
};
