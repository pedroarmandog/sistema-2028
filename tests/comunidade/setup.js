"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const { fixture } = require("../helpers/community-fixture"),
  { create } = require("../../backend/comunidade/service"),
  { migrate } = require("../../backend/comunidade/migrate");
async function setup(t) {
  const f = await fixture(t);
  await migrate(f.db);
  const a = await f.ativar(),
    b = await f.ativar(2, 2, "bia@example.com"),
    files = new Map();
  const media = () => ({
    async salvar(emp, bytes, module, options) {
      assert.equal(options.publico, false);
      const url = "private:" + crypto.randomUUID();
      files.set(url, { emp, bytes, tipo: "image/webp" });
      return { url };
    },
    async ler(emp, ref) {
      assert.equal(files.get(ref).emp, emp);
      return files.get(ref);
    },
  });
  let clock = new Date("2026-11-19T10:00:00Z");
  const s = create({ ERP: f.ERP, portal: f.p, media, now: () => clock });
  await s.m.Company.bulkCreate([
    { empresa_id: 1, enabled: true },
    { empresa_id: 2, enabled: true },
  ]);
  for (const x of [a, b])
    await s.m.Link.create({
      conta_id: x.tutor.contaId,
      empresa_id: x.tutor.empresaId,
      enabled: true,
    });
  const creds = async (x) => ({
    loja: (await f.p.config(x.tutor.empresaId)).slug,
    email: x.tutor.conta.email,
    senha: "SenhaNova1234",
  });
  const la = await s.login(await creds(a)),
    lb = await s.login(await creds(b));
  let ca = await s.context(la.raw),
    cb = await s.context(lb.raw);
  const pa = await s.saveProfile(ca, {
      name: "Ana",
      handle: "ana_social",
      adult: true,
      consent: true,
    }),
    pb = await s.saveProfile(cb, {
      name: "Bia",
      handle: "bia_social",
      adult: true,
      consent: true,
    });
  ca = await s.context(la.raw);
  cb = await s.context(lb.raw);
  const publish = (c, profile, other = {}) =>
    s.publish(c, {
      profile_id: profile.id,
      text: "Uma história #passeio",
      visibility: "publico",
      idempotency: crypto.randomUUID(),
      ...other,
    });
  return {
    ...f,
    s,
    a,
    b,
    ca,
    cb,
    pa,
    pb,
    la,
    lb,
    creds,
    publish,
    media,
    setClock: (v) => (clock = new Date(v)),
  };
}
module.exports = { setup };
