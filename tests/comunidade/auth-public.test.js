"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { setup } = require("./setup");
test("cadastro público independente cria conta sem empresa, hash seguro e envio real pelo adaptador", async (t) => {
  const f = await setup(t),
    mail = await f.register("nova@example.com", "nova_pessoa", "Nova Pessoa"),
    user = await f.s.m.User.findOne({ where: { email: "nova@example.com" } });
  assert.ok(user.password_hash.startsWith("$2"));
  assert.equal(user.verified_at, null);
  assert.equal(mail.kind, "verify");
  assert.equal(mail.to, user.email);
  assert.notEqual(
    (await f.s.m.Challenge.findOne({ where: { user_id: user.id } })).id,
    mail.token,
  );
  await assert.rejects(
    f.s.login({ email: user.email, senha: "SenhaNova1234" }),
    (e) => e.code === "EMAIL_UNVERIFIED",
  );
  assert.equal(await f.s.m.Link.count(), 0);
  assert.equal(await f.ERP.Cliente.count(), 3);
});
test("e-mail e @ duplicados são recusados; campos obrigatórios, termos e confirmação são validados", async (t) => {
  const f = await setup(t);
  await assert.rejects(
    f.register("ANA@example.com", "outro_handle"),
    (e) => e.status === 409,
  );
  await assert.rejects(
    f.register("outro@example.com", "ana_social"),
    (e) => e.status === 409,
  );
  const body = {
    email: "valid@example.com",
    handle: "valido",
    name: "Teste",
    senha: "SenhaNova1234",
    confirmacao: "SenhaNova1234",
    terms: true,
    adult: true,
  };
  for (const patch of [
    { terms: false },
    { adult: false },
    { confirmacao: "diferente" },
    { senha: "curta" },
    { email: "invalido" },
    { handle: "<script>" },
  ])
    await assert.rejects(f.s.auth.register({ ...body, ...patch }));
});
test("confirmação consome token uma vez; expiração não libera a conta", async (t) => {
  const f = await setup(t),
    mail = await f.register("verificar@example.com", "verificar");
  await f.s.auth.verify({ token: mail.token });
  await assert.rejects(f.s.auth.verify({ token: mail.token }));
  const expired = await f.register("expira@example.com", "expira");
  f.setClock(new Date(Date.now() + 2 * 86400000));
  await assert.rejects(f.s.auth.verify({ token: expired.token }));
  await assert.rejects(
    f.s.login({ email: "expira@example.com", senha: "SenhaNova1234" }),
  );
});
test("usuário verificado acessa feed e cadastra pet sem consultar ERP", async (t) => {
  const f = await setup(t);
  const pet = await f.s.saveProfile(f.ca, {
    kind: "pet",
    name: "Bobby",
    handle: "bobby_publico",
    species: "Cachorro",
    adult: true,
    consent: true,
  });
  assert.equal(pet.kind, "pet");
  assert.equal(await f.ERP.Pet.count(), 3);
  await assert.rejects(
    f.s.saveProfile(f.cb, { name: "Alheio", handle: "alheio" }, pet.id),
    (e) => e.status === 403,
  );
  await f.publish(f.ca, f.pa);
  assert.equal((await f.s.feed(f.cb)).items.length, 1);
  await f.s.comment(f.cb, (await f.s.feed(f.cb)).items[0].id, {
    profile_id: f.pb.id,
    text: "Bem-vindo!",
  });
  assert.equal(await f.s.m.Comment.count(), 1);
});
test("recuperação usa token único, troca senha e revoga todas as sessões anteriores", async (t) => {
  const f = await setup(t);
  await f.s.auth.forgot({ email: "ana@example.com" });
  const mail = f.mails.at(-1);
  await assert.rejects(
    f.s.auth.reset({
      token: mail.token,
      senha: "OutraSenha1234",
      confirmacao: "diferente",
    }),
  );
  await f.s.auth.reset({
    token: mail.token,
    senha: "OutraSenha1234",
    confirmacao: "OutraSenha1234",
  });
  await assert.rejects(f.s.context(f.la.raw), (e) => e.status === 401);
  await assert.rejects(f.s.login(f.credsA), (e) => e.status === 401);
  assert.ok(
    (await f.s.login({ email: "ana@example.com", senha: "OutraSenha1234" }))
      .raw,
  );
  await assert.rejects(
    f.s.auth.reset({
      token: mail.token,
      senha: "TerceiraSenha1234",
      confirmacao: "TerceiraSenha1234",
    }),
  );
});
test("reenvio respeita limite e não confirma a conta sozinho", async (t) => {
  const f = await setup(t);
  await f.register("reenviar@example.com", "reenviar");
  await f.s.auth.resend({ email: "reenviar@example.com" });
  assert.equal(f.mails.at(-1).kind, "verify");
  assert.equal(
    (await f.s.m.User.findOne({ where: { email: "reenviar@example.com" } }))
      .verified_at,
    null,
  );
  await f.s.auth.resend({ email: "reenviar@example.com" });
  await f.s.auth.resend({ email: "reenviar@example.com" });
  await assert.rejects(
    f.s.auth.resend({ email: "reenviar@example.com" }),
    (e) => e.status === 429,
  );
});
test("falha no envio não simula e-mail entregue e não verifica cadastro", async (t) => {
  const f = await setup(t),
    s = require("../../backend/comunidade/service").create({
      ERP: { sequelize: f.db },
      media: f.media,
      cost: 4,
      sendMail: async () => {
        throw Object.assign(Error("Indisponível"), { status: 503 });
      },
    });
  const result = await s.auth.register({
    email: "falha@example.com",
    name: "Falha",
    handle: "falha_mail",
    senha: "SenhaNova1234",
    confirmacao: "SenhaNova1234",
    adult: true,
    terms: true,
  });
  assert.equal(result.mailSent, false);
  assert.equal(await s.m.Mail.count({ where: { state: "failed" } }), 1);
  await assert.rejects(
    s.login({ email: "falha@example.com", senha: "SenhaNova1234" }),
  );
});
test("cadastros novos não recebem papel administrativo nem precisam de pet", async (t) => {
  const f = await setup(t),
    mail = await f.register("sem-pet@example.com", "sem_pet");
  await f.s.auth.verify({ token: mail.token });
  const logged = await f.s.login({
      email: mail.to,
      senha: "SenhaNova1234",
      role: "admin",
    }),
    context = await f.s.context(logged.raw);
  assert.equal(context.user.role, "member");
  assert.equal((await f.s.self(context)).profiles.length, 1);
  assert.equal(context.profiles[0].kind, "tutor");
  assert.equal(await f.s.m.AdminSession.count(), 0);
});
test("contas não verificadas não aparecem na descoberta nem passam por contexto com sessão forjada no laboratório", async (t) => {
  const f = await setup(t),
    mail = await f.register("pendente@example.com", "pendente_oculto"),
    u = await f.s.m.User.findOne({ where: { email: mail.to } }),
    p = await f.s.m.Profile.findOne({ where: { user_id: u.id } }),
    raw = require("crypto").randomBytes(32).toString("base64url");
  assert.equal(
    (await f.s.explore(f.ca, { q: "pendente_oculto" })).items.length,
    0,
  );
  await assert.rejects(f.s.profile(f.ca, p.id));
  await f.s.m.Session.create({
    id: f.s.hash(raw),
    user_id: u.id,
    auth_version: u.auth_version,
    expires_at: new Date(Date.now() + 3600000),
  });
  await assert.rejects(f.s.context(raw), (e) => e.code === "EMAIL_UNVERIFIED");
});
test("alterar senha pública não altera a autenticação nem encerra sessões do PetHub Cliente", async (t) => {
  const f = await setup(t),
    portal = await f.ativar();
  await f.s.auth.forgot({ email: "ana@example.com" });
  await f.s.auth.reset({
    token: f.mails.at(-1).token,
    senha: "NovaSenhaPublica1234",
    confirmacao: "NovaSenhaPublica1234",
  });
  assert.equal((await f.p.auth.contexto(portal.cookie.value)).clienteId, 1);
  const cfg = await f.p.config(1);
  let token;
  await f.p.auth.login(
    { loja: cfg.slug, email: "ana@example.com", senha: "SenhaNova1234" },
    { cookie: (n, v) => (token = v) },
  );
  assert.equal((await f.p.auth.contexto(token)).clienteId, 1);
});
test("unicidade de e-mail e nome de usuário também é imposta pelo banco", async (t) => {
  const f = await setup(t);
  await assert.rejects(
    f.s.m.User.create({
      id: require("crypto").randomUUID(),
      email: "ana@example.com",
    }),
    (e) =>
      e.name === "SequelizeUniqueConstraintError" ||
      /UNIQUE constraint failed/.test(e.message),
  );
  await assert.rejects(
    f.s.m.Profile.create({
      id: require("crypto").randomUUID(),
      user_id: f.cb.user.id,
      kind: "pet",
      name: "Outro",
      handle: "ana_social",
    }),
    (e) =>
      e.name === "SequelizeUniqueConstraintError" ||
      /UNIQUE constraint failed/.test(e.message),
  );
});
