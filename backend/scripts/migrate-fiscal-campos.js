#!/usr/bin/env node
/**
 * migrate-fiscal-campos.js
 * Aplica as migrations fiscais de 2026-08-01 no banco MySQL.
 * Idempotente — verifica com SHOW COLUMNS antes de cada ALTER TABLE.
 * Uso: node backend/scripts/migrate-fiscal-campos.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { sequelize } = require("../models");

const COLS = {
  itens: [
    ["sku", "VARCHAR(50) NULL"],
    ["gtin", "VARCHAR(14) NULL"],
    ["peso", "DECIMAL(10,3) NULL"],
    ["origem", "TINYINT NULL"],
    ["cfop_padrao", "VARCHAR(5) NULL"],
    ["cst_icms", "VARCHAR(3) NULL"],
    ["csosn", "VARCHAR(3) NULL"],
    ["cst_pis", "VARCHAR(2) NULL"],
    ["cst_cofins", "VARCHAR(2) NULL"],
    ["cst_ipi", "VARCHAR(2) NULL"],
    ["aliq_icms", "DECIMAL(6,2) NULL DEFAULT 0.00"],
    ["aliq_pis", "DECIMAL(6,2) NULL DEFAULT 0.00"],
    ["aliq_cofins", "DECIMAL(6,2) NULL DEFAULT 0.00"],
    ["aliq_ipi", "DECIMAL(6,2) NULL DEFAULT 0.00"],
    ["item_lista_servico", "VARCHAR(10) NULL"],
    ["municipio_incidencia_iss", "VARCHAR(7) NULL"],
    ["natureza_operacao_iss", "VARCHAR(100) NULL"],
    ["cnae_servico", "VARCHAR(7) NULL"],
  ],
  clientes: [
    ["tipo_pessoa", "CHAR(1) NULL"],
    ["cnpj", "VARCHAR(18) NULL"],
    ["inscricao_estadual", "VARCHAR(20) NULL"],
    ["indicador_ie", "TINYINT NULL DEFAULT 9"],
    ["codigo_ibge_municipio", "VARCHAR(7) NULL"],
    ["pais", "VARCHAR(50) NULL DEFAULT 'Brasil'"],
    ["codigo_pais", "CHAR(4) NULL DEFAULT '1058'"],
  ],
  empresas: [
    ["cnae", "VARCHAR(7) NULL"],
    ["crt", "CHAR(1) NULL"],
    ["codigo_ibge_municipio", "VARCHAR(7) NULL"],
    ["pais", "VARCHAR(50) NULL DEFAULT 'Brasil'"],
    ["codigo_pais", "CHAR(4) NULL DEFAULT '1058'"],
  ],
  vendas: [
    ["numero_nfe", "INT NULL"],
    ["serie_nfe", "VARCHAR(3) NULL"],
    ["chave_acesso_nfe", "VARCHAR(44) NULL"],
    ["data_emissao_nfe", "DATETIME NULL"],
    ["natureza_operacao", "VARCHAR(60) NULL"],
    ["protocolo_nfe", "VARCHAR(15) NULL"],
    ["xml_nfe", "LONGTEXT NULL"],
    ["indicador_presenca", "TINYINT NULL DEFAULT 1"],
    ["status_fiscal", "ENUM('pendente','emitida','cancelada','erro','aguardando_correcao','nao_aplicavel') NULL DEFAULT 'pendente'"],
    ["modo_emissao", "ENUM('automatico','manual','lote','confirmacao') NULL"],
  ],
};

async function colunaExiste(tabela, coluna) {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${tabela}\` LIKE '${coluna}'`);
  return rows.length > 0;
}

async function adicionarColunas(tabela, colunas) {
  console.log(`\n📋 Tabela \`${tabela}\`:`);
  let add = 0, ex = 0;
  for (const [nome, sqlType] of colunas) {
    try {
      if (await colunaExiste(tabela, nome)) {
        console.log(`  ℹ️  ${nome} — já existe`);
        ex++;
        continue;
      }
      await sequelize.query(`ALTER TABLE \`${tabela}\` ADD COLUMN \`${nome}\` ${sqlType}`);
      console.log(`  ✅ ${nome} — adicionada`);
      add++;
    } catch (e) {
      console.warn(`  ⚠️  ${nome} — erro: ${e.message}`);
    }
  }
  console.log(`  → ${add} adicionada(s), ${ex} já existente(s)`);
}

async function main() {
  console.log("🚀 Migração de campos fiscais (2026-08-01)...\n");
  await sequelize.authenticate();
  console.log("✅ Conexão MySQL OK\n");

  for (const [tabela, colunas] of Object.entries(COLS)) {
    await adicionarColunas(tabela, colunas);
  }

  console.log("\n📦 Tabelas novas do módulo fiscal:");
  try {
    const { ConfiguracaoFiscal, NotaFiscal } = require("../models");
    if (ConfiguracaoFiscal?.sync) await ConfiguracaoFiscal.sync();
    if (NotaFiscal?.sync) await NotaFiscal.sync();
    console.log("  ✅ configuracoes_fiscais / notas_fiscais — verificadas");
  } catch (e) {
    console.warn("  ⚠️  Erro tabelas fiscais:", e.message);
  }

  console.log("\n🎉 Migração fiscal concluída!");
  await sequelize.close();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e);
  process.exit(1);
});