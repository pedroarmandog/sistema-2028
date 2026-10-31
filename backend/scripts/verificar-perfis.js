// Usar a instância singleton do Sequelize para evitar conexões manuais
const { sequelize } = require("../models/Cliente");

async function verificarPerfis() {
  try {
    // Executa query via pool do Sequelize (usa conexão reutilizável)
    const [rows] = await sequelize.query(
      "SELECT * FROM perfis_comissao ORDER BY id DESC",
    );
    console.log("📊 Total de perfis no banco:", rows.length);
    console.log("\n📋 Lista de perfis:");
    rows.forEach((r) => {
      console.log(`  ID ${r.id}: ${r.perfilVendedor} (${r.descricao})`);
    });
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    // Fechar a conexão quando script terminar (script standalone)
    try {
      await sequelize.close();
    } catch (e) {}
  }
}

verificarPerfis();
