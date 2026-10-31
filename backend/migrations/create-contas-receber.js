/* ============================================================
   Migração: criar tabela contas_receber (Contas a Receber)
   Execute via: node backend/migrations/create-contas-receber.js
   Idempotente: se a tabela já existir, apenas avisa e encerra.
   O schema replica exatamente o que o modelo ContaReceber gera
   (backend/models/ContaReceber.js).
   ============================================================ */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const { sequelize } = require("../models/Cliente");
const { DataTypes } = require("sequelize");

async function run() {
  const queryInterface = sequelize.getQueryInterface();

  const tables = await queryInterface.showAllTables();
  const tableExists = tables.some((t) => String(t).toLowerCase() === "contas_receber");

  if (tableExists) {
    console.log("✅ Tabela contas_receber já existe — nada a fazer.");
    await sequelize.close();
    process.exit(0);
  }

  console.log("⏳ Criando tabela contas_receber...");

  await queryInterface.createTable("contas_receber", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    clienteId: { type: DataTypes.INTEGER, allowNull: true },
    clienteNome: { type: DataTypes.STRING, allowNull: true },
    descricao: { type: DataTypes.STRING, allowNull: true },
    categoria: { type: DataTypes.STRING, allowNull: true },
    valor: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    dataEmissao: { type: DataTypes.DATEONLY, allowNull: true },
    dataVencimento: { type: DataTypes.DATEONLY, allowNull: true },
    formaPagamento: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: "pendente" },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    parcelas: { type: DataTypes.INTEGER, defaultValue: 1 },
    parcelaNumero: { type: DataTypes.INTEGER, defaultValue: 1 },
    documentoOrigem: { type: DataTypes.STRING, allowNull: true },
    valorPago: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    dataPagamento: { type: DataTypes.DATEONLY, allowNull: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });

  console.log("✅ Tabela contas_receber criada com sucesso!");
  await sequelize.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Erro na migration create-contas-receber:", err?.message || err);
  process.exit(1);
});