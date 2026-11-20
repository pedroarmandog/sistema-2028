"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { setup } = require("./setup");
const admin = { id: "99", role: "admin" };
test("dashboard distingue cadastros, verificados e atividade real; não conta quem só registrou", async (t) => {
  const f = await setup(t),
    ops = require("../../backend/comunidade/admin")(f.s);
  await f.register("nao-entrou@example.com", "nao_entrou");
  const r = await ops.totals();
  assert.equal(r.users, 3);
  assert.equal(r.verified, 2);
  assert.equal(r.unverified, 1);
  assert.equal(r.active7, 2);
  assert.equal(r.active30, 2);
  assert.equal(r.pets, 0);
  assert.equal(r.groups, 0);
  assert.equal(r.reports, 0);
});
test("participantes inclui todas as contas e filtros; resposta nunca expõe hash de senha", async (t) => {
  const f = await setup(t),
    ops = require("../../backend/comunidade/admin")(f.s);
  await f.register("nova-lista@example.com", "nova_lista", "Nova Pessoa");
  const users = await ops.participants({ q: "nova-lista", verified: "no" });
  assert.equal(users.items.length, 1);
  assert.equal(users.items[0].email, "nova-lista@example.com");
  assert.equal(users.items[0].pets, 0);
  assert.doesNotMatch(
    JSON.stringify(users),
    /password_hash|SenhaNova|senha_hash/,
  );
  const detail = await ops.participant(f.ca.user.id);
  assert.equal(detail.profiles[0].handle, "ana_social");
  assert.doesNotMatch(
    JSON.stringify(detail),
    /password_hash|cpf|telefone|alergias/,
  );
});
test("denúncia preserva snapshot, estados e decisão; painel atualiza contador após resolver", async (t) => {
  const f = await setup(t),
    ops = require("../../backend/comunidade/admin")(f.s),
    post = await f.publish(f.ca, f.pa);
  await f.s.report(f.cb, {
    kind: "post",
    target_id: post.id,
    reason: "Spam repetido",
  });
  let queue = await ops.reports();
  assert.equal(queue.items.length, 1);
  assert.equal((await ops.totals()).reports, 1);
  const id = queue.items[0].id;
  await ops.decide(admin, id, { action: "review", reason: "Análise iniciada" });
  assert.equal((await ops.reportDetail(id)).state, "reviewing");
  await ops.decide(admin, id, {
    action: "hide",
    reason: "Violação confirmada",
  });
  assert.equal((await ops.totals()).reports, 0);
  assert.equal((await ops.reportDetail(id)).content.state, "hidden");
  assert.equal((await f.s.feed(f.cb)).items.length, 0);
  const report = await f.s.m.Report.findByPk(id);
  assert.equal(report.snapshot.text, post.text);
  assert.equal(
    await f.s.m.Audit.count({ where: { action: "report_hide" } }),
    1,
  );
});
test("suspensão registra motivo, invalida sessão e impede login; reativação exige novo login", async (t) => {
  const f = await setup(t),
    ops = require("../../backend/comunidade/admin")(f.s);
  await ops.sanction(admin, f.ca.user.id, {
    action: "suspend",
    reason: "Assédio confirmado",
    until: new Date(Date.now() + 86400000).toISOString(),
  });
  await assert.rejects(f.s.context(f.la.raw));
  await assert.rejects(f.s.login(f.credsA), (e) => e.status === 403);
  assert.equal(await f.s.m.Sanction.count(), 1);
  await ops.sanction(admin, f.ca.user.id, {
    action: "reactivate",
    reason: "Revisão concluída",
  });
  assert.ok((await f.s.login(f.credsA)).raw);
  await assert.rejects(f.s.context(f.la.raw));
});
test("bloqueio e exclusão moderados são auditados; histórico e ERP permanecem preservados", async (t) => {
  const f = await setup(t),
    ops = require("../../backend/comunidade/admin")(f.s);
  await f.publish(f.ca, f.pa);
  await ops.sanction(admin, f.ca.user.id, {
    action: "block",
    reason: "Golpe confirmado",
  });
  await assert.rejects(f.s.login(f.credsA));
  await ops.sanction(admin, f.ca.user.id, {
    action: "erasure",
    reason: "Solicitação de exclusão analisada",
  });
  assert.equal(await f.ERP.Cliente.count(), 3);
  assert.equal(await f.ERP.Pet.count(), 3);
  assert.equal((await f.s.feed(f.cb)).items.length, 0);
  assert.equal(await f.s.m.Privacy.count(), 1);
  assert.equal(await f.s.m.Sanction.count(), 2);
});
test("gráficos usam registros reais de usuários e interações; retorno deriva de dias distintos", async (t) => {
  const f = await setup(t),
    ops = require("../../backend/comunidade/admin")(f.s);
  await f.publish(f.ca, f.pa);
  let result = await ops.stats({ days: 7 });
  assert.equal(
    result.series.reduce((n, r) => n + r.users, 0),
    2,
  );
  assert.equal(
    result.series.reduce((n, r) => n + r.posts, 0),
    1,
  );
  assert.equal(
    result.series.reduce((n, r) => n + r.active, 0),
    2,
  );
  assert.equal(result.returningUsers, 0);
  const yesterday = new Date(Date.now() - 86400000);
  await f.s.m.Activity.create({
    id: require("crypto").randomUUID(),
    user_id: f.ca.user.id,
    day: new Date(+yesterday - 3 * 3600000).toISOString().slice(0, 10),
  });
  assert.equal((await ops.stats({ days: 30 })).returningUsers, 1);
});
test("comunidades públicas e eventos usam só identidade social; moderação remove da descoberta", async (t) => {
  const f = await setup(t),
    groups = require("../../backend/comunidade/groups")(f.s),
    ops = require("../../backend/comunidade/admin")(f.s);
  const group = await groups.create(f.ca, {
    name: "Passeios em BH",
    description: "Encontros e amizades",
    category: "Passeios",
  });
  await groups.join(f.cb, group.id, true);
  assert.equal((await groups.list(f.cb)).items[0].members, 2);
  await f.publish(f.cb, f.pb, { group_id: group.id });
  assert.equal((await f.s.feed(f.ca, { group: group.id })).items.length, 1);
  await ops.moderate(admin, {
    kind: "group",
    id: group.id,
    state: "hidden",
    reason: "Revisão da comunidade",
  });
  assert.equal((await groups.list(f.cb)).items.length, 0);
  assert.equal((await f.s.feed(f.cb)).items.length, 0);
});
test("configurações salvam limites e regras sem aceitar segredos; backend impõe limite real", async (t) => {
  const f = await setup(t),
    ops = require("../../backend/comunidade/admin")(f.s);
  const cfg = {
    ...f.s.defaults,
    maxPostImages: 1,
    maxPostText: 100,
    postsPerHour: 1,
    apiSecret: "nao-deve-salvar",
  };
  await ops.saveSettings(admin, cfg);
  assert.equal((await f.s.settings()).apiSecret, undefined);
  await f.publish(f.ca, f.pa);
  await assert.rejects(f.publish(f.ca, f.pa), (e) => e.status === 429);
  assert.equal(
    await f.s.m.Audit.count({ where: { action: "platform_settings" } }),
    1,
  );
});
test("papel legado de moderador público não concede APIs administrativas ou remoção alheia", async (t) => {
  const f = await setup(t),
    post = await f.publish(f.ca, f.pa);
  await f.cb.user.update({ role: "moderator" });
  await assert.rejects(
    f.s.remove(f.cb, "post", post.id),
    (e) => e.status === 403,
  );
  assert.equal((await f.s.self(f.cb)).user.role, "member");
});
