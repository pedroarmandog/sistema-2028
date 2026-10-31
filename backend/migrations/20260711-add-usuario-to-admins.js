const { QueryTypes } = require('sequelize');

async function up(sequelize) {
  // Adicionar coluna usuario se não existir
  try {
    const [result] = await sequelize.query(
      "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'usuario'"
    );
    
    if (result.count === 0) {
      await sequelize.query(
        "ALTER TABLE admins ADD COLUMN usuario VARCHAR(255) UNIQUE AFTER email"
      );
      console.log('✅ Coluna usuario adicionada na tabela admins');
    } else {
      console.log('ℹ️ Coluna usuario já existe na tabela admins');
    }
  } catch (error) {
    console.error('Erro ao adicionar coluna usuario:', error);
    throw error;
  }
}

async function down(sequelize) {
  try {
    await sequelize.query(
      "ALTER TABLE admins DROP COLUMN usuario"
    );
    console.log('✅ Coluna usuario removida da tabela admins');
  } catch (error) {
    console.error('Erro ao remover coluna usuario:', error);
  }
}

module.exports = { up, down };

if (require.main === module) {
  const { sequelize } = require('../models');
  (async () => {
    try {
      await up(sequelize);
      console.log('Migration executada com sucesso');
      process.exit(0);
    } catch (error) {
      console.error('Erro na migration:', error);
      process.exit(1);
    }
  })();
}