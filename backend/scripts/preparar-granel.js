"use strict";
// Execute somente com backup e no banco configurado do ERP. Não apaga dados.
const { DataTypes } = require("sequelize");
async function preparar(db) {
  const q = db.getQueryInterface();
  for (const [table, cols] of [
    ["itens", ["estoqueAtual", "estoqueMinimo", "estoqueIdeal"]],
    ["historico_estoque", ["estoque_anterior", "quantidade", "novo_estoque"]],
  ]) {
    const schema = await q.describeTable(table);
    for (const col of cols) {
      if (!schema[col]) throw Error("Coluna ausente: " + table + "." + col);
      if (!/^DECIMAL\(15,\s*3\)$/i.test(schema[col].type)) {
        const [[r]] = await db.query(
          "SELECT COUNT(*) AS invalidos FROM `" +
            table +
            "` WHERE ABS(`" +
            col +
            "`) > 999999999999.999",
        );
        if (Number(r.invalidos))
          throw Error("Valores fora da faixa em " + table + "." + col);
        await q.changeColumn(table, col, {
          type: DataTypes.DECIMAL(15, 3),
          allowNull: schema[col].allowNull,
          defaultValue: schema[col].defaultValue,
        });
        console.log("DECIMAL(15,3): " + table + "." + col);
      }
    }
  }
  for (const table of ["vendas", "entradas_mercadoria", "saidas_mercadoria"]) {
    const schema = await q.describeTable(table);
    if (!schema.estoqueProcessado) {
      await q.addColumn(table, "estoqueProcessado", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log("Controle transacional: " + table + ".estoqueProcessado");
    }
  }
  console.log(
    "Preparação granel concluída. Registros anteriores não foram remarcados nem tiveram saldo recalculado.",
  );
}
module.exports = { preparar };
if (require.main === module) {
  require("dotenv").config({
    path: require("node:path").resolve(__dirname, "../../.env"),
  });
  const { sequelize } = require("../models/Cliente");
  preparar(sequelize)
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}
