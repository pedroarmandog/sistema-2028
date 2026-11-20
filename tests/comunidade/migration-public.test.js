"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  { fixture } = require("../helpers/community-fixture"),
  { migrate } = require("../../backend/comunidade/migrate");
test("migração 002 preserva usuários, perfis, posts e mídia do esquema 001 sem alterar ERP", async (t) => {
  const f = await fixture(t),
    old = require("../fixtures/community-v001-models.cjs").models(f.db);
  for (const model of Object.values(old)) await model.sync();
  const user = crypto.randomUUID(),
    profile = crypto.randomUUID(),
    post = crypto.randomUUID(),
    media = crypto.randomUUID();
  await old.User.create({ id: user });
  await old.Profile.create({
    id: profile,
    user_id: user,
    tutor_owner: user,
    name: "Perfil anterior",
    handle: "perfil_anterior",
    kind: "tutor",
  });
  await old.Post.create({
    id: post,
    user_id: user,
    profile_id: profile,
    text: "História preservada",
    idempotency: crypto.randomUUID(),
  });
  await old.Media.create({
    id: media,
    user_id: user,
    empresa_id: 1,
    reference: "/uploads/community/antiga.webp",
    mime: "image/webp",
  });
  await old.PostMedia.create({
    id: crypto.randomUUID(),
    post_id: post,
    media_id: media,
  });
  for (const model of Object.values(old)) f.db.modelManager.removeModel(model);
  delete f.db.__community;
  await migrate(f.db);
  await migrate(f.db);
  const m = require("../../backend/comunidade/models").models(f.db);
  assert.equal((await m.Post.findByPk(post)).text, "História preservada");
  assert.equal((await m.Profile.findByPk(profile)).handle, "perfil_anterior");
  assert.equal(
    (await m.Media.findByPk(media)).reference,
    "/uploads/community/antiga.webp",
  );
  assert.equal((await m.User.findByPk(user)).email, null);
  assert.equal(await f.ERP.Cliente.count(), 3);
  assert.equal(await f.ERP.Pet.count(), 3);
  assert.equal(await f.db.models.CommunityMigration.count(), 2);
  assert.equal((await m.Media.findByPk(media)).empresa_id, 1);
});
test("sessão social legada pode atualizar identidade sem login no ERP e preserva perfil", async (t) => {
  const f = await require("./setup").setup(t),
    id = crypto.randomUUID(),
    raw = crypto.randomBytes(32).toString("base64url");
  await f.s.m.User.create({ id });
  await f.s.m.Profile.create({
    id: crypto.randomUUID(),
    user_id: id,
    tutor_owner: id,
    name: "Legado",
    handle: "legado_social",
  });
  await f.s.m.Session.create({
    id: f.s.hash(raw),
    user_id: id,
    expires_at: new Date(Date.now() + 3600000),
  });
  await assert.rejects(
    f.s.context(raw),
    (e) => e.code === "LEGACY_UPGRADE_REQUIRED",
  );
  await f.s.auth.upgrade(raw, {
    email: "legado@example.com",
    senha: "SenhaLegada1234",
    confirmacao: "SenhaLegada1234",
    terms: true,
    adult: true,
  });
  await f.s.auth.verify({ token: f.mails.at(-1).token });
  const login = await f.s.login({
      email: "legado@example.com",
      senha: "SenhaLegada1234",
    }),
    c = await f.s.context(login.raw);
  assert.equal(c.user.id, id);
  assert.equal(c.profiles[0].handle, "legado_social");
  assert.equal(await f.s.m.Link.count(), 0);
});
test("migração vazia gera versões 001 e 002, rollback vazio é possível e não apaga tabelas ERP", async (t) => {
  const { Sequelize } = require("sequelize"),
    db = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      dialectModule: require("../helpers/whatsappSqlite"),
    });
  t.after(() => db.close());
  await db.query("CREATE TABLE ERP_EXISTENTE (id INTEGER PRIMARY KEY)");
  await db.query("INSERT INTO ERP_EXISTENTE VALUES (7)");
  await migrate(db);
  assert.equal(await db.models.CommunityMigration.count(), 2);
  await migrate(db, { downEmpty: true });
  await migrate(db);
  const [rows] = await db.query("SELECT id FROM ERP_EXISTENTE");
  assert.equal(rows[0].id, 7);
});
