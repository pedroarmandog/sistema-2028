"use strict";
const crypto = require("node:crypto"),
  bcrypt = require("bcryptjs"),
  { DataTypes: D } = require("sequelize");
const { fixture } = require("../helpers/community-fixture"),
  { create } = require("../../backend/comunidade/service"),
  { migrate } = require("../../backend/comunidade/migrate");
async function setup(t) {
  const f = await fixture(t);
  await migrate(f.db);
  const files = new Map(),
    mails = [];
  let clock = new Date();
  const media = () => ({
    store: {
      async gravar(ref, bytes, type) {
        files.set(ref, { bytes, tipo: type });
      },
      async ler(ref) {
        if (!files.has(ref)) throw Error("Objeto indisponível");
        return files.get(ref).bytes;
      },
    },
    async ler(emp, ref) {
      const row = files.get(ref);
      if (!row || row.emp !== emp) throw Error("Não encontrada");
      return row;
    },
  });
  // Only the shared DB connection is available to the public module. No Empresa/Cliente/Pet methods.
  const s = create({
    ERP: { sequelize: f.db },
    media,
    sendMail: async (message) => {
      mails.push(message);
      return { id: "test-delivery-" + crypto.randomUUID() };
    },
    cost: 4,
    now: () => clock,
  });
  const Admin = f.db.define(
    "FixturePlatformAdmin",
    {
      email: D.STRING,
      nome: D.STRING,
      senha: D.STRING,
      ativo: { type: D.BOOLEAN, defaultValue: true },
    },
    { tableName: "fixture_platform_admin" },
  );
  Admin.prototype.validarSenha = function (value) {
    return bcrypt.compare(value, this.senha);
  };
  await Admin.sync();
  await Admin.create({
    id: 99,
    email: "admin@example.com",
    nome: "Admin",
    senha: await bcrypt.hash("Admin-Test-Password", 4),
  });
  const register = async (
    email = "ana@example.com",
    handle = "ana_social",
    name = "Ana",
  ) => {
    await s.auth.register({
      email,
      handle,
      name,
      senha: "SenhaNova1234",
      confirmacao: "SenhaNova1234",
      terms: true,
      adult: true,
    });
    return mails.at(-1);
  };
  const mailA = await register(),
    mailB = await register("bia@example.com", "bia_social", "Bia");
  await s.auth.verify({ token: mailA.token });
  await s.auth.verify({ token: mailB.token });
  const la = await s.login({
      email: "ana@example.com",
      senha: "SenhaNova1234",
    }),
    lb = await s.login({ email: "bia@example.com", senha: "SenhaNova1234" });
  await s.m.User.update({ onboarded_at: clock }, { where: {} });
  const ca = await s.context(la.raw),
    cb = await s.context(lb.raw),
    pa = (await s.self(ca)).profiles[0],
    pb = (await s.self(cb)).profiles[0];
  const publish = (c, p, other = {}) =>
    s.publish(c, {
      profile_id: p.id,
      text: "Uma história #passeio",
      visibility: "publico",
      idempotency: crypto.randomUUID(),
      ...other,
    });
  return {
    ...f,
    s,
    ca,
    cb,
    pa,
    pb,
    la,
    lb,
    publish,
    media,
    files,
    mails,
    Admin,
    register,
    setClock: (v) => (clock = new Date(v)),
    credsA: { email: "ana@example.com", senha: "SenhaNova1234" },
  };
}
module.exports = { setup };
