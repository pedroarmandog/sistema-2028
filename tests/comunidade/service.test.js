"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const { create } = require("../../backend/comunidade/service"),
  { setup } = require("./setup");
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
  const persisted = create({ ERP: f.ERP, media: f.media });
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

test("eventos respeitam configuração da plataforma, sem liberação individual; presença é idempotente e cancelamento é auditado", async (t) => {
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
  const admin = require("../../backend/comunidade/admin")(f.s);
  await f.ca.user.update({ can_events: false });
  await admin.saveSettings(
    { id: "99", role: "admin" },
    { ...f.s.defaults, eventsEnabled: false },
  );
  await assert.rejects(events.save(f.ca, body), (e) => e.status === 403);
  await admin.saveSettings(
    { id: "99", role: "admin" },
    { ...f.s.defaults, eventsEnabled: true },
  );
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

test("sessão social expira no servidor mesmo com cookie ainda presente", async (t) => {
  const f = await setup(t);
  f.setClock("2027-01-01T00:00:00Z");
  await assert.rejects(f.s.context(f.la.raw), (e) => e.status === 401);
});
