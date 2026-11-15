// Render e ambientes locais recebem cookies exclusivos do host que fez o login.
module.exports = function sessionCookieDomain(req) {
  const host = (req.hostname || "").toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1" ||
      host === "[::1]" || host === "::1" || host.endsWith(".onrender.com")) return undefined;
  const configured = process.env.COOKIE_DOMAIN?.trim().replace(/^\./, "").toLowerCase();
  if (configured && (host === configured || host.endsWith("." + configured))) return configured;
  if (host === "pethubflow.com.br" || host.endsWith(".pethubflow.com.br")) return "pethubflow.com.br";
  return undefined;
};
