"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const { create } = require("../../backend/comunidade/service"),
  { migrate } = require("../../backend/comunidade/migrate"),
  { setup } = require("./setup");
test("login reutiliza senha real do portal, mantém sessão ERP e emite token opaco separado", async (t) => {
  const f = await setup(t);
  assert.match(f.la.raw, /^[\w-]{43}$/);
  assert.notEqual(f.la.raw, f.a.cookie.value);
  assert.equal((await f.p.auth.contexto(f.a.cookie.value)).clienteId, 1);
  assert.equal((await f.s.context(f.la.raw)).user.id, f.ca.user.id);
  await assert.rejects(f.s.login({ ...(await f.creds(f.a)), senha: "errada" }));
  assert.equal(await f.s.m.Session.count(), 2);
});
test("perfis públicos excluem dados clínicos e contatos do ERP; pet alheio é recusado", async (t) => {
  const f = await setup(t),
    self = await f.s.self(f.ca);
  assert.equal(self.pets[0].name, "Bobby");
  assert.doesNotMatch(
    JSON.stringify(self),
    /SEGREDO|PRIVADO|ana@example|telefone|cpf|alergias/,
  );
  await assert.rejects(
    f.s.saveProfile(f.ca, {
      name: "Mel",
      handle: "mel_pet",
      pet_id: 2,
      company: 1,
      adult: true,
      consent: true,
    }),
    (e) => e.status === 403,
  );
  const pet = await f.s.saveProfile(f.ca, {
    name: "Bobby",
    handle: "bobby_pet",
    pet_id: 1,
    company: 1,
    adult: true,
    consent: true,
    species: "Cachorro",
  });
  assert.equal(pet.kind, "pet");
  assert.equal(await f.ERP.Pet.count(), 3);
  await assert.rejects(
    f.s.saveProfile(f.ca, {
      name: "Outra Ana",
      handle: "ana_segunda",
      adult: true,
      consent: true,
    }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    f.s.saveProfile(f.cb, { name: "Troca", handle: "hack" }, f.pa.id),
    (e) => e.status === 403,
  );
});
test("liberação de empresa, conta, portal e versão da senha são revalidadas em cada acesso", async (t) => {
  const f = await setup(t);
  await f.s.m.Company.update({ enabled: false }, { where: { empresa_id: 1 } });
  await assert.rejects(f.s.context(f.la.raw), (e) => e.status === 403);
  await f.s.m.Company.update({ enabled: true }, { where: { empresa_id: 1 } });
  await f.s.m.Link.update(
    { enabled: false },
    { where: { conta_id: f.a.tutor.contaId } },
  );
  await assert.rejects(f.s.login(await f.creds(f.a)), (e) => e.status === 403);
  await f.s.m.Link.update(
    { enabled: true },
    { where: { conta_id: f.a.tutor.contaId } },
  );
  await f.p.m.Config.update({ ativo: false }, { where: { empresa_id: 1 } });
  await assert.rejects(f.s.context(f.la.raw));
  await f.p.m.Config.update({ ativo: true }, { where: { empresa_id: 1 } });
  await f.p.m.Conta.increment("versao", { where: { id: f.a.tutor.contaId } });
  await assert.rejects(f.s.context(f.la.raw));
});
test("idempotência da publicação e curtida; seguidores e privados respeitam audiência", async (t) => {
  const f = await setup(t),
    key = crypto.randomUUID(),
    post = await f.publish(f.ca, f.pa, { idempotency: key });
  assert.equal((await f.publish(f.ca, f.pa, { idempotency: key })).id, post.id);
  assert.equal(await f.s.m.Post.count(), 1);
  await f.s.reaction(f.cb, post.id, "like", true);
  await f.s.reaction(f.cb, post.id, "like", true);
  assert.equal(await f.s.m.Like.count(), 1);
  assert.equal(await f.s.m.Notification.count(), 1);
  await f.s.reaction(f.cb, post.id, "like", false);
  assert.equal(await f.s.m.Like.count(), 0);
  const followers = await f.publish(f.ca, f.pa, { visibility: "seguidores" }),
    secret = await f.publish(f.ca, f.pa, { visibility: "privado" });
  await assert.rejects(
    f.s.visiblePost(f.cb, followers.id),
    (e) => e.status === 404,
  );
  await f.s.follow(f.cb, f.pa.id, f.pb.id, true);
  assert.equal((await f.s.visiblePost(f.cb, followers.id)).id, followers.id);
  await assert.rejects(
    f.s.visiblePost(f.cb, secret.id),
    (e) => e.status === 404,
  );
  assert.equal((await f.s.feed(f.cb)).items.length, 2);
});
test("comentário e resposta reais; não aceita resposta em post diferente; moderação oculta", async (t) => {
  const f = await setup(t),
    post = await f.publish(f.ca, f.pa),
    other = await f.publish(f.ca, f.pa);
  const c = await f.s.comment(f.cb, post.id, {
    profile_id: f.pb.id,
    text: "Adorei!",
  });
  await assert.rejects(
    f.s.comment(f.ca, other.id, {
      profile_id: f.pa.id,
      parent_id: c.id,
      text: "Resposta",
    }),
    (e) => e.status === 404,
  );
  await f.s.comment(f.ca, post.id, {
    profile_id: f.pa.id,
    parent_id: c.id,
    text: "Obrigada!",
  });
  assert.equal((await f.s.comments(f.ca, post.id, {})).items.length, 2);
  await assert.rejects(
    f.s.remove(f.ca, "comment", c.id),
    (e) => e.status === 403,
  );
  await f.s.remove(f.cb, "comment", c.id);
  assert.equal(
    (await f.s.postsDTO(f.ca, [await f.s.visiblePost(f.ca, post.id)]))[0]
      .comments,
    1,
  );
  await f.s.m.Profile.update({ state: "removed" }, { where: { id: f.pa.id } });
  assert.equal((await f.s.feed(f.cb)).items.length, 0);
  await assert.rejects(f.s.visiblePost(f.cb, post.id));
});
test("upload valida bytes, reencoda foto e não expõe referência privada; mídia privada exige audiência", async (t) => {
  const f = await setup(t),
    sharp = require("sharp");
  await assert.rejects(
    f.s.upload(f.ca, { buffer: Buffer.from("<svg></svg>") }),
  );
  const buffer = await sharp({
      create: { width: 24, height: 16, channels: 3, background: "#ffaa33" },
    })
      .png()
      .toBuffer(),
    photo = await f.s.upload(f.ca, { buffer });
  assert.doesNotMatch(JSON.stringify(photo), /private:|empresa_id/);
  await assert.rejects(f.s.readMedia(f.cb, photo.id), (e) => e.status === 404);
  await f.publish(f.ca, f.pa, { media: [photo.id], visibility: "privado" });
  await assert.rejects(f.s.readMedia(f.cb, photo.id), (e) => e.status === 404);
  const pub = await f.publish(f.ca, f.pa, { media: [photo.id] });
  const persisted = create({ ERP: f.ERP, portal: f.p, media: f.media });
  assert.equal((await persisted.readMedia(f.cb, photo.id)).tipo, "image/webp");
  await f.s.remove(f.ca, "post", pub.id);
  await assert.rejects(f.s.readMedia(f.cb, photo.id));
});
test("bloqueio bilateral oculta perfis, feed e fotos; expiração de Momento é no servidor", async (t) => {
  const f = await setup(t),
    sharp = require("sharp"),
    buffer = await sharp({
      create: { width: 5, height: 5, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
    photo = await f.s.upload(f.ca, { buffer });
  const post = await f.publish(f.ca, f.pa, {
    media: [photo.id],
    kind: "momento",
  });
  await f.s.follow(f.cb, f.pa.id, f.pb.id, true);
  assert.equal((await f.s.feed(f.cb, { kind: "momento" })).items.length, 1);
  f.setClock("2026-11-21T10:00:00Z");
  await assert.rejects(f.s.visiblePost(f.cb, post.id));
  assert.equal((await f.s.feed(f.cb, { kind: "momento" })).items.length, 0);
  await f.publish(f.ca, f.pa);
  await f.s.block(f.cb, f.pa.id, true);
  assert.equal((await f.s.feed(f.cb)).items.length, 0);
  await assert.rejects(f.s.profile(f.ca, f.pb.id));
  await assert.rejects(f.s.readMedia(f.cb, photo.id));
});
test("paginação composta não repete linhas com data igual e valida cursor", async (t) => {
  const f = await setup(t);
  for (let i = 0; i < 5; i++) await f.publish(f.ca, f.pa);
  await f.s.m.Post.update(
    { createdAt: new Date("2026-11-19T12:00:00Z") },
    { where: {} },
  );
  const a = await f.s.feed(f.cb, { limit: 2 }),
    b = await f.s.feed(f.cb, { limit: 2, after: a.next }),
    c = await f.s.feed(f.cb, { limit: 2, after: b.next });
  assert.equal(
    new Set([...a.items, ...b.items, ...c.items].map((r) => r.id)).size,
    5,
  );
  assert.equal(c.next, null);
  await assert.rejects(f.s.feed(f.cb, { after: "invalid" }));
});
test("eventos exigem permissão; presença é idempotente e cancelamento é auditado", async (t) => {
  const f = await setup(t),
    events = require("../../backend/comunidade/events")(f.s),
    body = {
      profile_id: f.pa.id,
      title: "Passeio no parque",
      description: "Encontro de amigos",
      city: "Belo Horizonte",
      place: "Entrada do parque",
      startsAt: "2026-12-01T13:00:00Z",
    };
  await assert.rejects(events.save(f.ca, body), (e) => e.status === 403);
  await f.ca.user.update({ can_events: true });
  const ev = await events.save(f.ca, body);
  await events.rsvp(f.cb, ev.id, true);
  await events.rsvp(f.cb, ev.id, true);
  assert.equal((await events.list(f.cb)).items[0].participants, 1);
  await assert.rejects(events.cancel(f.cb, ev.id));
  await events.cancel(f.ca, ev.id);
  assert.equal((await events.list(f.cb)).items.length, 0);
  assert.equal(
    await f.s.m.Audit.count({ where: { action: "cancel_event" } }),
    1,
  );
});
test("vínculo entre empresas exige prova de posse e nunca mescla duas contas sociais já existentes", async (t) => {
  const f = await setup(t);
  await assert.rejects(
    f.s.linkAccount(f.ca, await f.creds(f.b)),
    (e) => e.status === 409,
  );
  await assert.rejects(
    f.s.linkAccount(f.ca, { ...(await f.creds(f.b)), senha: "errada" }),
  );
  assert.equal((await f.s.context(f.la.raw)).links.length, 1);
});
test("migração é idempotente, cria FKs e preserva dados ERP; rollback com dados é recusado", async (t) => {
  const f = await setup(t);
  await migrate(f.db);
  assert.equal(await f.ERP.Pet.count(), 3);
  assert.equal(await f.ERP.Cliente.count(), 3);
  assert.equal(await f.db.models.CommunityMigration.count(), 1);
  await assert.rejects(migrate(f.db, { downEmpty: true }), /Rollback recusado/);
  assert.equal(await f.s.m.User.count(), 2);
  await assert.rejects(
    f.s.m.Like.create({
      id: crypto.randomUUID(),
      user_id: f.ca.user.id,
      post_id: crypto.randomUUID(),
    }),
  );
});
module.exports = { setup };
test("vínculo comprovado com outra empresa mantém uma identidade e continua após revogar a primeira", async (t) => {
  const f = await setup(t);
  await f.ERP.Cliente.create({
    id: 4,
    nome: "Ana Loja 2",
    empresa_id: 2,
    email: "ana.loja2@example.com",
  });
  await f.ERP.Pet.create({ id: 4, nome: "Luna", cliente_id: 4, empresa_id: 2 });
  const second = await f.ativar(4, 2, "ana.loja2@example.com");
  await f.s.m.Link.create({
    conta_id: second.tutor.contaId,
    empresa_id: 2,
    enabled: true,
  });
  await f.s.linkAccount(f.ca, await f.creds(second));
  let context = await f.s.context(f.la.raw);
  assert.equal(context.links.length, 2);
  assert.equal(await f.s.m.User.count(), 2);
  assert.deepEqual((await f.s.self(context)).pets.map((p) => p.name).sort(), [
    "Bobby",
    "Luna",
  ]);
  await f.s.m.Company.update({ enabled: false }, { where: { empresa_id: 1 } });
  context = await f.s.context(f.la.raw);
  assert.equal(context.user.id, f.ca.user.id);
  assert.equal(context.links.length, 1);
});
test("sessão social expira no servidor mesmo com cookie ainda presente", async (t) => {
  const f = await setup(t);
  f.setClock("2027-01-01T00:00:00Z");
  await assert.rejects(f.s.context(f.la.raw), (e) => e.status === 401);
});
