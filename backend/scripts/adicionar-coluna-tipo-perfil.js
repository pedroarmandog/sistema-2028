// Usar instância central Sequelize
const { sequelize } = require("../models/Cliente");

async function adicionarColunaTipo() {
  try {
    console.log("🔄 Verificando se coluna tipo já existe...");

    // Verificar se a coluna já existe
    const [columns] = await sequelize.query(
      "SHOW COLUMNS FROM perfis_comissao LIKE 'tipo'",
    );

    if (columns && columns.length > 0) {
      console.log("ℹ️  Coluna tipo já existe");
    } else {
      // Adicionar coluna tipo
      await sequelize.query(
        `ALTER TABLE perfis_comissao 
                 ADD COLUMN tipo ENUM('produto', 'vendedor') DEFAULT 'vendedor' AFTER percentual`,
      );
      console.log("✅ Coluna tipo adicionada com sucesso");
    }

    // Listar perfis atualizados
    const [rows] = await sequelize.query(
      "SELECT id, perfilVendedor, tipo FROM perfis_comissao ORDER BY id",
    );
    console.log("\n📊 Perfis atualizados:");
    rows.forEach((r) => {
      console.log(
        `  ID ${r.id}: ${r.perfilVendedor} (tipo: ${r.tipo || "vendedor"})`,
      );
    });
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    try {
      await sequelize.close();
    } catch (e) {}
  }
}

adicionarColunaTipo();
