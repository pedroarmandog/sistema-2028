/**
 * Migration: adicionar colunas de lembrete automático na tabela clientes
 * Executa automaticamente no startup (app.js)
 * Seguro para rodar múltiplas vezes (ignora ER_DUP_FIELDNAME)
 */
const { sequelize } = require("../models/Cliente");

async function addLembreteColunas() {
  // Usar "Clientes" com C maiúsculo — MySQL em Linux é case-sensitive
  // e a tabela real no banco de produção foi criada com esse nome.
  const queries = [
    "ALTER TABLE Clientes ADD COLUMN lembrete_automatico_ativo TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE Clientes ADD COLUMN lembrete_automatico_dias INT NOT NULL DEFAULT 30",
    "ALTER TABLE Clientes ADD COLUMN lembrete_produto_id INT NULL",
    "ALTER TABLE Clientes ADD COLUMN lembrete_produto_nome VARCHAR(255) NULL",
  ];

  for (const sql of queries) {
    try {
      await sequelize.query(sql);
      const coluna = sql.match(/ADD COLUMN (\S+)/)[1];
      console.log(`  ✅ clientes.${coluna} adicionada`);
    } catch (err) {
      const msg = String(err && (err.message || err.sqlMessage || ""));
      if (
        msg.includes("Duplicate column name") ||
        msg.includes("ER_DUP_FIELDNAME")
      ) {
        // Coluna já existe — OK
      } else {
        console.warn(`  ⚠️ Migration clientes lembrete: ${msg}`);
      }
    }
  }
}

module.exports = addLembreteColunas;

// Executar diretamente se chamado como script
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await addLembreteColunas();
    } finally {
      await sequelize.close();
    }
  })();
}
