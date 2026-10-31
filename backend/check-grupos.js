const { sequelize } = require('./models/Cliente');

(async () => {
  try {
    const [results] = await sequelize.query("SHOW TABLES LIKE 'grupos_clientes'");
    console.log('SHOW TABLES result:', results);
    if (results.length === 0) {
      console.log('Tabela grupos_clientes NÃO encontrada');
    } else {
      const [rows] = await sequelize.query('SELECT COUNT(*) as c FROM grupos_clientes');
      console.log('Linhas em grupos_clientes:', rows[0].c);
    }
    process.exit(0);
  } catch (e) {
    console.error('Erro verificando tabela grupos_clientes:', e);
    process.exit(1);
  }
})();
