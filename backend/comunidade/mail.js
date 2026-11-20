"use strict";
// The provider adapter is isolated; missing credentials never simulate delivery.
function mailer(env = process.env, transport = fetch) {
  function configured() {
    return !!(
      env.COMMUNITY_RESEND_API_KEY &&
      env.COMMUNITY_MAIL_FROM &&
      env.COMMUNITY_PUBLIC_URL
    );
  }
  async function send({ to, kind, token, id }) {
    if (!configured())
      throw Object.assign(
        Error("O envio de e-mail ainda não foi configurado pela plataforma."),
        { status: 503, code: "MAIL_NOT_CONFIGURED" },
      );
    let url;
    try {
      url = new URL(env.COMMUNITY_PUBLIC_URL);
      if (url.protocol !== "https:" && env.NODE_ENV !== "test") throw Error();
    } catch {
      throw Object.assign(Error("Configure COMMUNITY_PUBLIC_URL com HTTPS."), {
        status: 503,
      });
    }
    // Token stays in fragment, not access logs. A scanner GET never consumes it.
    url.hash =
      (kind === "verify" ? "/confirmar" : "/redefinir") +
      "?token=" +
      encodeURIComponent(token);
    const subject =
      kind === "verify"
        ? "Confirme seu e-mail — PetHub Comunidade"
        : "Redefina sua senha — PetHub Comunidade";
    const text =
      (kind === "verify"
        ? "Confirme seu cadastro pelo link: "
        : "Solicitação de redefinição de senha: ") +
      url.href +
      "\nSe não foi você, ignore esta mensagem.";
    const response = await transport("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.COMMUNITY_RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": "community-" + id,
      },
      body: JSON.stringify({
        from: env.COMMUNITY_MAIL_FROM,
        to: [to],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id)
      throw Object.assign(
        Error("Não foi possível enviar o e-mail. Tente reenviar em instantes."),
        { status: 503, code: "MAIL_UNAVAILABLE" },
      );
    return { id: data.id };
  }
  return { configured, send };
}
module.exports = { mailer };
