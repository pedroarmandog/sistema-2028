#!/usr/bin/env node
/**
 * Script para renumerar os ids da tabela `itens` em ordem de criação
 * Uso:
 *  - Dry run (mostrar o mapeamento): `node renumerar_itens_sequencial.js`
 *  - Aplicar alterações: `node renumerar_itens_sequencial.js --apply`
 *
 * Atenção: este script modifica chaves primárias. Faça backup do banco antes de executar com --apply.
 */

const Produto = require("../models/Produto");
const HistoricoEstoque = require("../models/HistoricoEstoque");

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(
    "Iniciando renumeração de itens (ordem por createdAt) - apply=",
    apply,
  );

  const sequelize = Produto.sequelize;

  // Carregar todos os produtos em batches ordenados por createdAt (ascendente)
  const batchSize = 1000;
  let offset = 0;
  const produtos = [];
  while (true) {
    const batch = await Produto.findAll({
      order: [["createdAt", "ASC"]],
      limit: batchSize,
      offset,
      attributes: ["id"],
    });
    if (!batch || batch.length === 0) break;
    produtos.push(...batch.map((b) => ({ id: b.id })));
    offset += batch.length;
    if (batch.length < batchSize) break;
  }
  if (!produtos || produtos.length === 0) {
    console.log("Nenhum produto encontrado na tabela `itens`. Nada a fazer.");
    process.exit(0);
  }

  // Construir mapeamento oldId -> newId (strings)
  const mapping = produtos.map((p, idx) => ({
    oldId: String(p.id),
    newId: String(idx + 1),
  }));

  console.log(`Total produtos: ${mapping.length}`);
  console.log("Exemplo de 10 primeiros mapeamentos:");
  mapping
    .slice(0, 10)
    .forEach((m) => console.log(`  ${m.oldId} -> ${m.newId}`));

  // Mostrar aviso e sair se não for aplicar
  if (!apply) {
    console.log(
      "\nDry run completo. Para aplicar as alterações execute com --apply",
    );
    process.exit(0);
  }

  console.log(
    "\nAplicando renumeração - certifique-se de ter backup do DB antes de continuar",
  );

  const t = await sequelize.transaction();
  try {
    // Passo 1: mover ids para temporários (prefixo TMP_) para evitar conflitos de PK
    for (const m of mapping) {
      const tmp = `TMP_${m.newId}`;
      // Atualizar tabelas que referenciam produto id primeiro
      try {
        await sequelize.query(
          "UPDATE historico_estoque SET produto_id = :tmp WHERE produto_id = :old",
          { replacements: { tmp, old: m.oldId }, transaction: t },
        );
      } catch (e) {
        // Se a tabela não existir ou coluna não existir, logar e continuar
        console.warn(
          "Aviso atualizando historico_estoque (pode não existir):",
          e.message || e,
        );
      }

      // Atualizar a própria tabela itens (PK)
      await sequelize.query("UPDATE itens SET id = :tmp WHERE id = :old", {
        replacements: { tmp, old: m.oldId },
        transaction: t,
      });
    }

    // Passo 2: remover prefixos TMP_ e colocar ids finais numéricos (strings)
    for (const m of mapping) {
      const tmp = `TMP_${m.newId}`;
      await sequelize.query("UPDATE itens SET id = :new WHERE id = :tmp", {
        replacements: { new: m.newId, tmp },
        transaction: t,
      });
      try {
        await sequelize.query(
          "UPDATE historico_estoque SET produto_id = :new WHERE produto_id = :tmp",
          { replacements: { new: m.newId, tmp }, transaction: t },
        );
      } catch (e) {
        console.warn(
          "Aviso atualizando historico_estoque (segunda fase):",
          e.message || e,
        );
      }
    }

    await t.commit();
    console.log(
      "Renumeração aplicada com sucesso. Total atualizado:",
      mapping.length,
    );
  } catch (err) {
    await t.rollback();
    console.error(
      "Erro aplicando renumeração, transação revertida:",
      err && err.message ? err.message : err,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(
    "Erro no script de renumeração:",
    e && e.message ? e.message : e,
  );
  process.exit(1);
});
