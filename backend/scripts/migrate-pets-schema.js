/**
 * migrate-pets-schema.js
 * ----------------------
 * Garante que a tabela `pets` no VPS tenha todas as colunas do modelo atual.
 * Seguro para rodar múltiplas vezes (usa ALTER TABLE ... ADD COLUMN IF NOT EXISTS).
 *
 * Uso: node backend/scripts/migrate-pets-schema.js
 */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const { sequelize } = require("../models/Cliente");

const colunas = [
  { nome: "raca", sql: "VARCHAR(100) NULL" },
  { nome: "genero", sql: "VARCHAR(20) NULL" },
  { nome: "porte", sql: "VARCHAR(50) NULL" },
  { nome: "pelagem", sql: "VARCHAR(100) NULL" },
  { nome: "data_nascimento", sql: "DATE NULL" },
  { nome: "chip", sql: "VARCHAR(100) NULL" },
  { nome: "pedigree_rg", sql: "VARCHAR(100) NULL" },
  { nome: "alimentacao", sql: "TEXT NULL" },
  { nome: "tags", sql: "TEXT NULL" },
  { nome: "alergias", sql: "TEXT NULL" },
  { nome: "observacao", sql: "TEXT NULL" },
  { nome: "foto_url", sql: "MEDIUMTEXT NULL" },
  { nome: "ativo", sql: "TINYINT(1) NOT NULL DEFAULT 1" },
  { nome: "empresa_id", sql: "INT NULL" },
];

async function migrar() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão com MySQL OK");

    // Checar colunas existentes
    const [rows] = await sequelize.query("SHOW COLUMNS FROM pets");
    const existentes = rows.map((r) => r.Field);
    console.log("📋 Colunas atuais da tabela pets:", existentes);

    let adicionadas = 0;
    for (const col of colunas) {
      if (!existentes.includes(col.nome)) {
        console.log(`  ➕ Adicionando coluna: ${col.nome}`);
        await sequelize.query(
          `ALTER TABLE pets ADD COLUMN ${col.nome} ${col.sql}`,
        );
        adicionadas++;
      }
    }

    if (adicionadas === 0) {
      console.log("✅ Nenhuma coluna faltando — tabela pets está atualizada!");
    } else {
      console.log(`✅ ${adicionadas} coluna(s) adicionada(s) com sucesso!`);
    }

    // Adicionar índice para empresa_id se não existir
    try {
      await sequelize.query(
        "ALTER TABLE pets ADD INDEX idx_pet_empresa (empresa_id)",
      );
      console.log("✅ Índice idx_pet_empresa adicionado");
    } catch (e) {
      if (e.message && e.message.includes("Duplicate key name")) {
        console.log("  (índice idx_pet_empresa já existe)");
      } else {
        console.warn("  ⚠️ Índice empresa_id:", e.message);
      }
    }

    console.log("\n🎉 Migração concluída!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro na migração:", err.message);
    console.error(err);
    process.exit(1);
  }
}

migrar();
