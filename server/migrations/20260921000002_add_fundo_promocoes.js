/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('promocoes', {
    tipo_fundo:  { type: 'varchar(20)', notNull: true, default: 'gradiente' },
    cor_fundo_1: { type: 'varchar(7)',  notNull: true, default: '#000D26'   },
    cor_fundo_2: { type: 'varchar(7)',  notNull: true, default: '#003D90'   },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('promocoes', ['tipo_fundo', 'cor_fundo_1', 'cor_fundo_2']);
};
