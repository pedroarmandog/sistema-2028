"use strict";
const crypto = require("node:crypto"),
  bcrypt = require("bcryptjs");
module.exports = (s, { env = process.env, adminAccounts } = {}) => {
  const accounts = () => adminAccounts || s.ERP.Admin;
  const ids = (name) =>
    (env[name] || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const role = (id) =>
    ids("COMMUNITY_PLATFORM_ADMIN_IDS").includes(String(id))
      ? "admin"
      : ids("COMMUNITY_PLATFORM_MODERATOR_IDS").includes(String(id))
        ? "moderator"
        : null;
  const fail = s.fail,
    dummy = bcrypt.hashSync("unknown-platform-admin", 10);
  async function login(b, ip) {
    await s.auth.limited("admin-ip", ip || "unknown", 25);
    const address =
      typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    await s.auth.limited("admin-login", address, 8);
    if (!accounts())
      throw fail("Cadastro administrativo da plataforma indisponível.", 503);
    const user = await accounts().findOne({ where: { email: address } });
    const valid = user
      ? await user.validarSenha(typeof b.senha === "string" ? b.senha : "")
      : await bcrypt.compare("", dummy);
    if (!user || !valid)
      throw fail("Credenciais administrativas inválidas.", 401);
    if (user.ativo === false || !role(user.id))
      throw fail("Administrador não autorizado para a Comunidade.", 403);
    const raw = crypto.randomBytes(32).toString("base64url");
    await s.m.AdminSession.create({
      id: s.hash(raw),
      admin_id: String(user.id),
      expires_at: new Date(+s.now() + 12 * 3600000),
    });
    await s.audit(user.id, "admin_login", user.id);
    return { raw, csrf: s.hash("admin-csrf:" + raw), role: role(user.id) };
  }
  async function context(raw) {
    if (typeof raw !== "string" || raw.length > 100)
      throw fail("Entre no painel administrativo.", 401);
    const session = await s.m.AdminSession.findByPk(s.hash(raw));
    if (!session || new Date(session.expires_at) <= s.now())
      throw fail("Sessão administrativa expirada.", 401);
    const user = await accounts()?.findByPk(session.admin_id);
    if (!user || user.ativo === false || !role(user.id))
      throw fail("Acesso administrativo revogado.", 403);
    return {
      id: String(user.id),
      role: role(user.id),
      session,
      csrf: s.hash("admin-csrf:" + raw),
      name: user.nome || "Administrador",
    };
  }
  return { login, context };
};
