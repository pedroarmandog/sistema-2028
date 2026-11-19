"use strict";
const VERSION = "001";
async function migrate(db, { downEmpty = false } = {}) {
  const models = require("./models").models(db);
  const history =
    db.models.CommunityMigration ||
    db.define(
      "CommunityMigration",
      {
        version: {
          type: require("sequelize").DataTypes.STRING(20),
          primaryKey: true,
        },
      },
      { tableName: "community_migrations", updatedAt: false },
    );
  await history.sync();
  if (downEmpty) {
    for (const m of Object.values(models))
      if (await m.count())
        throw Error(
          "Rollback recusado: existem dados da Comunidade. Nenhum dado foi apagado.",
        );
    for (const m of Object.values(models).reverse()) await m.drop();
    await history.destroy({ where: { version: VERSION } });
    return;
  }
  if (await history.findByPk(VERSION)) return;
  // sync without alter also repairs missing indexes after an interrupted initial run.
  for (const m of Object.values(models)) await m.sync();
  await history.create({ version: VERSION });
}
if (require.main === module) {
  require("dotenv").config();
  const db = require("../models").sequelize;
  migrate(db, { downEmpty: process.argv.includes("--down-empty") })
    .then(() => console.log("Migração 001 da Comunidade concluída."))
    .catch((e) => {
      console.error("Falha na migração da Comunidade:", e.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
module.exports = { migrate };
