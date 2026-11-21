"use strict";
const { DataTypes, Op } = require("sequelize");
async function preparar(db) {
  const qi = db.getQueryInterface(),
    table = "orcamentos",
    columns = await qi.describeTable(table);
  if (!columns.empresa_id)
    await qi.addColumn(table, "empresa_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  const q = qi.queryGenerator,
    orc = q.quoteTable(table),
    cli = q.quoteTable("Clientes"),
    c = (n) => q.quoteIdentifier(n);
  // Vínculo determinístico pelo ID do cliente; nunca por nome ou pela sessão atual.
  await db.query(
    `UPDATE ${orc} SET ${c("empresa_id")} = (SELECT ${c("empresa_id")} FROM ${cli} WHERE ${cli}.${c("id")} = ${orc}.${c("clienteId")}) WHERE ${orc}.${c("empresa_id")} IS NULL AND ${orc}.${c("clienteId")} IS NOT NULL`,
  );
  const indexes = await qi.showIndex(table);
  if (!indexes.some((i) => i.name === "orcamentos_empresa_data"))
    await qi.addIndex(table, ["empresa_id", "data"], {
      name: "orcamentos_empresa_data",
    });
  const [rows] = await db.query(
    `SELECT COUNT(*) AS pendentes FROM ${orc} WHERE ${c("empresa_id")} IS NULL`,
  );
  return { semEmpresa: Number(rows[0]?.pendentes || 0) };
}
module.exports = { preparar };
if (require.main === module) {
  const { sequelize } = require("../models/Orcamento");
  (async () => {
    try {
      await sequelize.authenticate();
      const r = await preparar(sequelize);
      console.log(
        "Orçamentos preparados. Sem vínculo comprovável:",
        r.semEmpresa,
      );
      if (r.semEmpresa)
        console.log(
          "Revise os registros sem cliente/empresa antes de atribuir um proprietário. Eles não serão expostos entre empresas.",
        );
    } catch (e) {
      console.error("Falha ao preparar orçamentos:", e.message);
      process.exitCode = 1;
    } finally {
      await sequelize.close();
    }
  })();
}
