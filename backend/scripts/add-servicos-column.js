const { sequelize } = require('../models/Cliente');

async function run() {
  try {
    console.log('Conectando ao banco...');
    await sequelize.authenticate();
    console.log('Conectado. Executando ALTER TABLE...');

    const sql = "ALTER TABLE agendamentos ADD COLUMN servicos JSON NULL";
    await sequelize.query(sql);

    console.log('Coluna `servicos` adicionada com sucesso.');
  } catch (err) {
    // tratar coluna já existente
    const msg = (err && (err.message || err.sqlMessage || '')).toString();
    if (msg.includes('Duplicate column name') || msg.includes('ER_DUP_FIELDNAME') || msg.includes('Unknown column')) {
      console.warn('Aviso: coluna `servicos` já existe ou não pôde ser adicionada. Mensagem:', msg);
      process.exitCode = 0;
      return;
    }
    console.error('Erro ao adicionar coluna `servicos`:', err);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch(e){}
  }
}

run();
