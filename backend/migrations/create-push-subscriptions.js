/* ============================================================
   Migration: criar tabela push_subscriptions
   Execute via: node backend/migrations/create-push-subscriptions.js
   ============================================================ */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const { sequelize } = require("../models");

async function run() {
  const queryInterface = sequelize.getQueryInterface();
  const { DataTypes } = require("sequelize");

  const tableExists = await queryInterface
    .showAllTables()
    .then((tables) => tables.includes("push_subscriptions"));

  if (tableExists) {
    console.log("✅ Tabela push_subscriptions já existe — nada a fazer.");
    await sequelize.close();
    return;
  }

  console.log("⏳ Criando tabela push_subscriptions...");

  await queryInterface.createTable("push_subscriptions", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    keys: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    plataforma: {
      type: DataTypes.ENUM("android", "ios", "desktop"),
      defaultValue: "android",
    },
    preferencias: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ultimo_uso: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  // Índices para performance
  await queryInterface.addIndex("push_subscriptions", ["empresa_id", "ativo"], {
    name: "idx_push_empresa_ativo",
  });
  await queryInterface.addIndex("push_subscriptions", ["usuario_id", "ativo"], {
    name: "idx_push_usuario_ativo",
  });
  await queryInterface.addIndex("push_subscriptions", ["endpoint"], {
    unique: true,
    name: "push_subscriptions_endpoint_unique",
  });

  console.log("✅ Tabela push_subscriptions criada com sucesso!");
  await sequelize.close();
}

run().catch((err) => {
  console.error("❌ Erro na migration:", err?.message || err);
  process.exit(1);
});
