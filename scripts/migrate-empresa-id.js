const { sequelize } = require("../backend/models/Cliente");

(async () => {
  try {
    // Primeiro garantir que as colunas existem
    const alterTables = ["entradas_mercadoria", "saidas_mercadoria"];
    for (const t of alterTables) {
      try {
        await sequelize.query(
          `ALTER TABLE \`${t}\` ADD COLUMN empresa_id INT NULL`,
        );
        console.log(`${t}: coluna empresa_id adicionada`);
      } catch (e) {
        if (e.message && e.message.includes("Duplicate column")) {
          console.log(`${t}: empresa_id já existe`);
        } else {
          console.warn(`${t}: ${e.message}`);
        }
      }
    }

    // Agora atualizar todos os registros sem empresa_id
    const tables = [
      "itens",
      "fornecedores",
      "entradas_mercadoria",
      "saidas_mercadoria",
      "profissionais",
    ];
    for (const t of tables) {
      const [, meta] = await sequelize.query(
        `UPDATE \`${t}\` SET empresa_id = 1 WHERE empresa_id IS NULL`,
      );
      const affected =
        meta && meta.affectedRows !== undefined ? meta.affectedRows : "?";
      console.log(`${t}: ${affected} registros atualizados -> empresa_id = 1`);
    }
    console.log("Migração concluída!");
    process.exit(0);
  } catch (e) {
    console.error("Erro na migração:", e.message);
    process.exit(1);
  }
})();
