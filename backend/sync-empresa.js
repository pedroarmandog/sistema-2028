/**
 * Script para sincronizar o modelo Empresa com o banco de dados.
 * Adiciona as colunas faltantes à tabela `empresas`.
 * Uso: node backend/sync-empresa.js
 */
const { sequelize } = require("./models/Cliente");
const EmpresaFactory = require("./models/Empresa");

async function syncEmpresa() {
  try {
    console.log("🔄 Sincronizando modelo Empresa...");
    const Empresa = EmpresaFactory(sequelize);
    await Empresa.sync({ alter: true });
    console.log("✅ Modelo Empresa sincronizado com sucesso!");
    console.log("📋 As novas colunas foram adicionadas à tabela 'empresas'.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao sincronizar Empresa:", error.message);
    console.error(error);
    process.exit(1);
  }
}

syncEmpresa();