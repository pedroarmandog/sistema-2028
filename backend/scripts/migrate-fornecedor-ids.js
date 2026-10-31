#!/usr/bin/env node
// Script: migrate-fornecedor-ids.js
// Propósito: procurar correspondências entre nomes de fornecedores na tabela `fornecedores`
// e os objetos/strings guardados no JSON `itens`.`fornecedores`, e popular `id`/`nome`.
// Uso:
//   node backend/scripts/migrate-fornecedor-ids.js --dry-run    # somente simula
//   node backend/scripts/migrate-fornecedor-ids.js --apply      # aplica alterações
//   node backend/scripts/migrate-fornecedor-ids.js --limit 100  # limitar processamento

const Produto = require("../models/Produto");
const Fornecedor = require("../models/Fornecedor");
const sequelize = Produto.sequelize;
const { Op } = require("sequelize");

async function findFornecedorByName(name) {
  if (!name) return null;
  const clean = name.toString().trim().toLowerCase();
  // 1) tentamos correspondência exata (lower)
  let f = await Fornecedor.findOne({
    where: sequelize.where(sequelize.fn("LOWER", sequelize.col("nome")), clean),
  });
  if (f) return f;
  // 2) tentamos LIKE %name% (mais permissivo)
  f = await Fornecedor.findOne({
    where: sequelize.where(sequelize.fn("LOWER", sequelize.col("nome")), {
      [Op.like]: `%${clean}%`,
    }),
  });
  return f;
}

async function processOne(produto, dryRun) {
  let fornecedores = produto.fornecedores || [];
  if (!Array.isArray(fornecedores)) return { changed: false };
  let changed = false;
  const out = [];
  for (const item of fornecedores) {
    try {
      if (!item) {
        out.push(item);
        continue;
      }
      if (typeof item === "string") {
        const name = item.trim();
        const f = await findFornecedorByName(name);
        if (f) {
          out.push({ id: String(f.id), nome: f.nome, fornecedor: f.nome });
          changed = true;
        } else {
          out.push({ nome: name, fornecedor: name });
        }
      } else if (typeof item === "object") {
        // já é objeto: verificar id ou nome
        let obj = Object.assign({}, item);
        if (obj.id) {
          // confirmar existe
          const byId = await Fornecedor.findByPk(String(obj.id));
          if (byId) {
            obj.id = String(byId.id);
            obj.nome = byId.nome;
          } else if (obj.nome) {
            const f = await findFornecedorByName(obj.nome);
            if (f) {
              obj.id = String(f.id);
              obj.nome = f.nome;
            }
          }
        } else if (obj.fornecedor || obj.nome) {
          const name = (obj.fornecedor || obj.nome || "").toString().trim();
          const f = await findFornecedorByName(name);
          if (f) {
            obj.id = String(f.id);
            obj.nome = f.nome;
            changed = true;
          } else obj.nome = name;
        }
        out.push(obj);
      } else {
        out.push(item);
      }
    } catch (e) {
      console.warn("Erro processando fornecedor item", item, e && e.message);
      out.push(item);
    }
  }

  // comparar JSON
  try {
    const oldStr = JSON.stringify(fornecedores || []);
    const newStr = JSON.stringify(out || []);
    if (oldStr !== newStr) {
      changed = true;
      if (!dryRun) {
        await Produto.update(
          { fornecedores: out },
          { where: { id: produto.id } },
        );
        return { changed: true, updated: true };
      }
      return { changed: true, updated: false };
    }
  } catch (e) {
    /* ignore */
  }
  return { changed: changed, updated: false };
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun =
    argv.indexOf("--dry-run") !== -1 && argv.indexOf("--apply") === -1;
  const apply = argv.indexOf("--apply") !== -1;
  const limitIndex = argv.indexOf("--limit");
  const limit =
    limitIndex !== -1 && argv[limitIndex + 1]
      ? parseInt(argv[limitIndex + 1], 10)
      : null;

  console.log("Iniciando migração de fornecedorIds", { dryRun, apply, limit });
  try {
    const where = {};
    const order = [["nome", "ASC"]];
    const batchSize = limit || 1000;
    let offset = 0;
    let totalChanged = 0;
    let totalUpdated = 0;
    let processed = 0;
    while (true) {
      const produtosBatch = await Produto.findAll({
        where,
        order,
        limit: batchSize,
        offset,
      });
      if (!produtosBatch || produtosBatch.length === 0) break;
      for (const p of produtosBatch) {
        processed++;
        try {
          const r = await processOne(p, dryRun);
          if (r.changed) totalChanged++;
          if (r.updated) totalUpdated++;
        } catch (e) {
          console.error("Erro processando produto", p.id, e && e.message);
        }
      }
      offset += produtosBatch.length;
      if (produtosBatch.length < batchSize) break;
    }
    console.log("Migração finalizada", {
      processed,
      totalChanged,
      totalUpdated,
      dryRun,
    });
    if (dryRun)
      console.log(
        "Dry-run: nenhuma alteração foi aplicada. Rode com --apply para gravar.",
      );
  } catch (err) {
    console.error("Erro na migração:", err);
    process.exit(1);
  }
  process.exit(0);
}

main();
