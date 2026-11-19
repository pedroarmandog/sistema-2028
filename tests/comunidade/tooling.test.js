"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { Sequelize } = require("sequelize"),
  { migrate } = require("../../backend/comunidade/migrate");
test("rollback de esquema vazio remove só tabelas da Comunidade e permite reaplicar migração", async (t) => {
  const db = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
    dialectModule: require("../helpers/whatsappSqlite"),
  });
  t.after(() => db.close());
  await db.query("CREATE TABLE ERP_EXISTENTE (id INTEGER PRIMARY KEY)");
  await db.query("INSERT INTO ERP_EXISTENTE VALUES (7)");
  await migrate(db);
  await migrate(db, { downEmpty: true });
  const tables = await db.getQueryInterface().showAllTables();
  assert.ok(tables.includes("ERP_EXISTENTE"));
  assert.ok(!tables.includes("community_users"));
  await migrate(db);
  assert.equal(await db.models.CommunityMigration.count(), 1);
  const [rows] = await db.query("SELECT id FROM ERP_EXISTENTE");
  assert.equal(rows[0].id, 7);
});
