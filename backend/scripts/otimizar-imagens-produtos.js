"use strict";
const { DataTypes, Op } = require("sequelize");
async function preparar(Produto) {
  const qi = Produto.sequelize.getQueryInterface(),
    table = Produto.getTableName(),
    cols = await qi.describeTable(table);
  if (!cols.empresa_id)
    await qi.addColumn(table, "empresa_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  if (!cols.imagemVersoes)
    await qi.addColumn(table, "imagemVersoes", {
      type: DataTypes.JSON,
      allowNull: true,
    });
}
async function migrar({
  Produto,
  servico,
  empresaId,
  apos = "",
  limite = 50,
  relatar = console.log,
  aplicar = false,
}) {
  let cursor = apos,
    total = 0;
  for (;;) {
    const rows = await Produto.findAll({
      where: {
        empresa_id: empresaId,
        ...(cursor ? { id: { [Op.gt]: cursor } } : {}),
      },
      order: [["id", "ASC"]],
      limit: Math.min(limite, 100),
    });
    if (!rows.length) break;
    for (const p of rows) {
      let r;
      try {
        r = aplicar
          ? await servico.otimizarRegistro(p)
          : { status: p.imagem ? "a-verificar" : "sem-imagem" };
      } catch (e) {
        r = {
          status: "falha",
          erro:
            e.status === 404 || e.code === "ENOENT"
              ? "Arquivo original não encontrado"
              : e.message,
        };
      }
      cursor = String(p.id);
      total++;
      await relatar({
        empresa: empresaId,
        produto: cursor,
        ...r,
        dados: undefined,
        cursor,
      });
    }
  }
  return { cursor, total };
}
module.exports = { preparar, migrar };
if (require.main === module) {
  const Produto = require("../models/Produto"),
    args = process.argv.slice(2),
    emp = Number(args[args.indexOf("--empresa") + 1]),
    aplicar = args.includes("--aplicar");
  (async () => {
    try {
      await preparar(Produto);
      if (args.includes("--preparar")) {
        console.log(
          "Colunas de imagens preparadas. Nenhum produto ou arquivo removido.",
        );
        return;
      }
      if (!Number.isSafeInteger(emp) || emp < 1)
        throw Error(
          "Informe --empresa ID. Use --aplicar para otimizar; sem isso apenas lista os registros.",
        );
      const fs = require("node:fs/promises"),
        file = args.includes("--relatorio")
          ? args[args.indexOf("--relatorio") + 1]
          : "relatorio-imagens-produtos.jsonl";
      const s = require("../services/produtoImagens").instancia();
      await migrar({
        Produto,
        servico: s,
        empresaId: emp,
        aplicar,
        apos: args.includes("--apos") ? args[args.indexOf("--apos") + 1] : "",
        relatar: async (r) => {
          await fs.appendFile(file, JSON.stringify(r) + "\n");
          console.log(JSON.stringify(r));
        },
      });
    } catch (e) {
      console.error(e.message);
      process.exitCode = 1;
    } finally {
      await Produto.sequelize.close();
    }
  })();
}
