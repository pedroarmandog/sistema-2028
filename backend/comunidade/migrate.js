"use strict";
const { DataTypes: D } = require("sequelize");
async function migrate(db, { downEmpty = false } = {}) {
  const m = require("./models").models(db),
    qi = db.getQueryInterface();
  const history =
    db.models.CommunityMigration ||
    db.define(
      "CommunityMigration",
      { version: { type: D.STRING(20), primaryKey: true } },
      { tableName: "community_migrations", updatedAt: false },
    );
  await history.sync();
  if (downEmpty) {
    for (const model of Object.values(m))
      if (await model.count())
        throw Error("Rollback recusado: existem dados da Comunidade.");
    for (const model of Object.values(m).reverse()) await model.drop();
    await history.destroy({ where: {} });
    return;
  }
  // Version 002 only adds nullable/defaulted fields. Never sync({alter:true}) or reset ERP tables.
  const tables = (await qi.showAllTables()).map((t) =>
    typeof t === "string" ? t : t.tableName,
  );
  if (!(await history.findByPk("002"))) {
    for (const model of Object.values(m)) {
      if (!tables.includes(model.tableName)) {
        await model.sync();
        continue;
      }
      const columns = await qi.describeTable(model.tableName);
      for (const [field, attribute] of Object.entries(model.rawAttributes))
        if (!columns[attribute.field || field]) {
          const definition = { ...attribute };
          delete definition.Model;
          delete definition.fieldName;
          delete definition._modelAttribute;
          delete definition.unique;
          await qi.addColumn(
            model.tableName,
            attribute.field || field,
            definition,
          );
        }
    }
    // Keep the legacy empresa_id column unchanged. New user-owned files use 0
    // solely as a compatibility marker, never as an ERP company or authorization source.
    for (const model of Object.values(m)) await model.sync();
    const indexes = await qi.showIndex(m.User.tableName);
    if (!indexes.some((i) => i.name === "cm_user_email"))
      await qi.addIndex(m.User.tableName, ["email"], {
        unique: true,
        name: "cm_user_email",
      });
    if (!(await history.findByPk("001")))
      await history.create({ version: "001" });
    await history.create({ version: "002" });
  }
}
if (require.main === module) {
  require("dotenv").config();
  const db = require("../models").sequelize;
  migrate(db, { downEmpty: process.argv.includes("--down-empty") })
    .then(() =>
      console.log(
        "Migrações da Comunidade concluídas (001/002, cadastro público).",
      ),
    )
    .catch((e) => {
      console.error("Falha na migração da Comunidade:", e.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
module.exports = { migrate };
