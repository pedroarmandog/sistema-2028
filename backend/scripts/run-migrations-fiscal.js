/**
 * run-migrations-fiscal.js
 *
 * Executa todas as migrations do módulo fiscal em ordem.
 * Cada migration usa .catch(() => {}) internamente — colunas/tabelas
 * já existentes são ignoradas com segurança (idempotente).
 *
 * USO no servidor:
 *   cd /root/sistema-2026
 *   node backend/scripts/run-migrations-fiscal.js
 */

"use strict";

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const sequelize = require("../models/Cliente");
const Sequelize = require("sequelize");

const plano = [
  {
    nome: "add-fiscal-fields-to-empresas",
    migration: require("../migrations/20260801-add-fiscal-fields-to-empresas"),
  },
  {
    nome: "add-fiscal-fields-to-clientes",
    migration: require("../migrations/20260801-add-fiscal-fields-to-clientes"),
  },
  {
    nome: "add-fiscal-fields-to-itens",
    migration: require("../migrations/20260801-add-fiscal-fields-to-itens"),
  },
  {
    nome: "add-fiscal-fields-to-vendas",
    migration: require("../migrations/20260801-add-fiscal-fields-to-vendas"),
  },
  {
    nome: "create-configuracoes-fiscais",
    migration: require("../migrations/20260801-create-configuracoes-fiscais"),
  },
  {
    nome: "create-notas-fiscais",
    migration: require("../migrations/20260801-create-notas-fiscais"),
  },
];

async function run() {
  const qi = sequelize.getQueryInterface();

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     Migrations Módulo Fiscal — PetHub 2026       ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  let ok = 0;
  let skip = 0;
  let erros = 0;

  for (let i = 0; i < plano.length; i++) {
    const { nome, migration } = plano[i];
    process.stdout.write(`  [${i + 1}/${plano.length}] ${nome} ... `);

    try {
      await migration.up(qi, Sequelize);
      console.log("✅ OK");
      ok++;
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      const jaExiste =
        msg.includes("duplicate column") ||
        msg.includes("already exists") ||
        msg.includes("já existe") ||
        (msg.includes("can't create table") && msg.includes("already exists"));

      if (jaExiste) {
        console.log("⚠️  já aplicada");
        skip++;
      } else {
        console.log("❌ ERRO");
        console.error(`     → ${err.message}`);
        erros++;
      }
    }
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(
    `  ✅ Aplicadas: ${ok}  ⚠️  Já existentes: ${skip}  ❌ Erros: ${erros}`,
  );
  console.log(`──────────────────────────────────────────────────`);

  if (erros > 0) {
    console.log("\n⚠️  Algumas migrations falharam. Verifique os erros acima.");
    console.log(
      "   O sistema pode apresentar instabilidade nos módulos fiscais.",
    );
  } else {
    console.log("\n🎉 Banco de dados atualizado com sucesso!");
    console.log("   Execute: pm2 restart pethub-api\n");
  }

  await sequelize.close().catch(() => {});
  process.exit(erros > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("\n❌ Falha fatal ao executar migrations:", err.message);
  process.exit(1);
});
