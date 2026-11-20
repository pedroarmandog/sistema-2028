"use strict";
const crypto = require("node:crypto"),
  bcrypt = require("bcryptjs"),
  { Op } = require("sequelize");
const email = (value) => {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )
    throw Object.assign(Error("Informe um e-mail válido."), { status: 400 });
  return value.trim().toLowerCase();
};
function auth(s, { sendMail, env = process.env, cost = 12 } = {}) {
  const { m, db, now, uuid, hash, fail, text } = s,
    dummy = bcrypt.hashSync("community-unknown-user-credential", cost);
  function password(value) {
    if (
      typeof value !== "string" ||
      value.length < 10 ||
      Buffer.byteLength(value) > 72
    )
      throw fail("Use uma senha de pelo menos 10 caracteres e até 72 bytes.");
    return value;
  }
  function handle(value) {
    value = text(value, 30, true).toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(value))
      throw fail("O @ deve ter 3 a 30 letras, números ou _.");
    return value;
  }
  let cleanupAt = 0;
  async function limited(purpose, identity, max = 8) {
    if (+now() > cleanupAt) {
      cleanupAt = +now() + 300000;
      await m.AuthLimit.destroy({ where: { expires_at: { [Op.lt]: now() } } });
    }
    const window = 15 * 60000,
      bucket = Math.floor(+now() / window),
      id = hash(purpose + ":" + identity + ":" + bucket);
    await db.transaction(async (transaction) => {
      const [row] = await m.AuthLimit.findOrCreate({
        where: { id },
        defaults: { attempts: 0, expires_at: new Date((bucket + 2) * window) },
        transaction,
      });
      await row.reload({ transaction, lock: transaction.LOCK.UPDATE });
      if (row.attempts >= max)
        throw fail("Muitas tentativas. Aguarde alguns minutos.", 429);
      await row.increment("attempts", { transaction });
    });
  }
  async function issue(user, kind) {
    const id = uuid(),
      raw = crypto.randomBytes(32).toString("base64url");
    await m.Challenge.create({
      id: hash(raw),
      user_id: user.id,
      kind,
      expires_at: new Date(+now() + (kind === "verify" ? 86400000 : 3600000)),
    });
    const delivery = await m.Mail.create({
      id,
      user_id: user.id,
      kind,
      state: "pending",
    });
    try {
      const result = await sendMail({ to: user.email, kind, token: raw, id });
      await delivery.update({ state: "sent", provider_id: result?.id || null });
    } catch (e) {
      await delivery.update({ state: "failed" });
      await m.Challenge.update(
        { used_at: now() },
        { where: { id: hash(raw) } },
      );
      throw e;
    }
  }
  async function register(b) {
    const address = email(b.email),
      name = text(b.name, 80, true),
      username = handle(b.handle),
      pass = password(b.senha);
    if (pass !== b.confirmacao) throw fail("As senhas não conferem.");
    if (b.terms !== true || b.adult !== true)
      throw fail("Aceite os termos e confirme que tem 18 anos ou mais.");
    await limited("register", address, 3);
    if (await m.User.findOne({ where: { email: address } }))
      throw fail(
        "Este e-mail já tem cadastro. Entre ou recupere sua senha.",
        409,
      );
    if (await m.Profile.findOne({ where: { handle: username } }))
      throw fail("Esse nome de usuário já está em uso.", 409);
    const hashed = await bcrypt.hash(pass, cost);
    const user = await db.transaction(async (transaction) => {
      const u = await m.User.create(
        {
          id: uuid(),
          email: address,
          password_hash: hashed,
          consent_at: now(),
          policy_version: "public-002",
          can_events: true,
        },
        { transaction },
      );
      await m.Profile.create(
        {
          id: uuid(),
          user_id: u.id,
          tutor_owner: u.id,
          kind: "tutor",
          name,
          handle: username,
        },
        { transaction },
      );
      return u;
    });
    try {
      await issue(user, "verify");
      return {
        ok: true,
        verificationRequired: true,
        message: "Cadastro criado. Confira seu e-mail para confirmar a conta.",
      };
    } catch (e) {
      return {
        ok: true,
        verificationRequired: true,
        mailSent: false,
        message:
          "Cadastro criado, mas o e-mail não pôde ser enviado. Use Reenviar confirmação após a plataforma configurar o envio.",
      };
    }
  }
  async function resend(b) {
    const address = email(b.email);
    await limited("resend", address, 3);
    const user = await m.User.findOne({
      where: { email: address, state: "active", verified_at: null },
    });
    if (user) await issue(user, "verify");
    return {
      ok: true,
      message: "Se houver um cadastro pendente, enviamos uma nova confirmação.",
    };
  }
  async function consume(raw, kind, work) {
    if (typeof raw !== "string" || !/^[\w-]{43}$/.test(raw))
      throw fail("Link inválido ou expirado. Solicite outro.");
    return db.transaction(async (transaction) => {
      const token = await m.Challenge.findByPk(hash(raw), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        !token ||
        token.kind !== kind ||
        token.used_at ||
        new Date(token.expires_at) <= now()
      )
        throw fail("Link inválido, expirado ou já utilizado. Solicite outro.");
      const user = await m.User.findByPk(token.user_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user || !["active", "suspended"].includes(user.state))
        throw fail("Conta indisponível.", 403);
      const result = await work(user, transaction);
      await token.update({ used_at: now() }, { transaction });
      return result;
    });
  }
  async function verify(b) {
    return consume(b.token, "verify", async (user, transaction) => {
      if (!user.verified_at)
        await user.update({ verified_at: now() }, { transaction });
      return { ok: true, message: "E-mail confirmado. Entre para continuar." };
    });
  }
  async function forgot(b) {
    const address = email(b.email);
    await limited("forgot", address, 3);
    const user = await m.User.findOne({
      where: {
        email: address,
        verified_at: { [Op.ne]: null },
        state: "active",
      },
    });
    if (user) await issue(user, "reset");
    return {
      ok: true,
      message:
        "Se o e-mail tiver uma conta verificada, enviaremos o link de recuperação.",
    };
  }
  async function reset(b) {
    const pass = password(b.senha);
    if (pass !== b.confirmacao) throw fail("As senhas não conferem.");
    const hashed = await bcrypt.hash(pass, cost);
    return consume(b.token, "reset", async (user, transaction) => {
      await user.update(
        { password_hash: hashed, auth_version: user.auth_version + 1 },
        { transaction },
      );
      await m.Session.destroy({ where: { user_id: user.id }, transaction });
      await m.Challenge.update(
        { used_at: now() },
        {
          where: { user_id: user.id, kind: "reset", used_at: null },
          transaction,
        },
      );
      return {
        ok: true,
        message: "Senha atualizada. Entre com sua nova senha.",
      };
    });
  }
  async function login(b) {
    const address = email(b.email);
    await limited("login", address, 12);
    const user = await m.User.findOne({ where: { email: address } }),
      valid = await bcrypt.compare(
        typeof b.senha === "string" && Buffer.byteLength(b.senha) <= 72
          ? b.senha
          : "",
        user?.password_hash || dummy,
      );
    if (!user || !valid) throw fail("E-mail ou senha inválidos.", 401);
    await s.ensureActive(user);
    if (!user.verified_at)
      throw Object.assign(
        fail(
          "Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação.",
          403,
        ),
        { code: "EMAIL_UNVERIFIED" },
      );
    const raw = crypto.randomBytes(32).toString("base64url");
    await m.Session.create({
      id: hash(raw),
      user_id: user.id,
      auth_version: user.auth_version,
      expires_at: new Date(+now() + 30 * 86400000),
    });
    return { raw, user };
  }
  async function legacy(raw) {
    if (typeof raw !== "string") throw fail("Entre novamente.", 401);
    const session = await m.Session.findByPk(hash(raw));
    if (!session || new Date(session.expires_at) <= now())
      throw fail(
        "Sessão anterior expirada. Procure o suporte da plataforma.",
        401,
      );
    const user = await m.User.findByPk(session.user_id);
    await s.ensureActive(user);
    if (user.email)
      throw fail(
        "Esta conta já utiliza o cadastro público. Entre com e-mail e senha.",
        409,
      );
    return { user, csrf: hash("csrf:" + raw) };
  }
  async function upgrade(raw, b) {
    const { user } = await legacy(raw),
      address = email(b.email),
      pass = password(b.senha);
    if (pass !== b.confirmacao || b.terms !== true || b.adult !== true)
      throw fail("Confirme a senha, os termos e sua maioridade.");
    await limited("upgrade", user.id, 3);
    const hashed = await bcrypt.hash(pass, cost);
    await user.update({
      email: address,
      password_hash: hashed,
      consent_at: now(),
      policy_version: "public-002",
      auth_version: user.auth_version + 1,
    });
    await m.Session.destroy({ where: { user_id: user.id } });
    await issue(user, "verify");
    return {
      ok: true,
      message:
        "Conta social preservada. Confirme o e-mail e entre com a nova senha.",
    };
  }
  return {
    register,
    resend,
    verify,
    forgot,
    reset,
    login,
    legacy,
    upgrade,
    limited,
  };
}
module.exports = { auth, email };
