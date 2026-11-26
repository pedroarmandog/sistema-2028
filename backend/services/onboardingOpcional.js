"use strict";
// Tutorial é complementar. Sua ausência não deve impedir iniciar o ERP.
// Erros internos de um tutorial instalado não são mascarados como módulo ausente.
const path = require("node:path");
function instalar(app, { authUser, raiz = path.resolve(__dirname, ".."), log = console }) {
  const ids = ["services/onboarding", "routes/onboardingRoutes", "services/onboarding/injecao"];
  const resolvidos = ids.map(id => {
    try { return require.resolve(path.join(raiz, id)); }
    catch (e) { if (e.code !== "MODULE_NOT_FOUND") throw e; return null; }
  });
  if (resolvidos.some(p => !p)) {
    log.warn("[Onboarding] Tutorial não instalado por completo; ERP continua disponível. Ausentes: " + ids.filter((_, i) => !resolvidos[i]).join(", "));
    app.use("/api/onboarding", authUser, (_req, res) => res.status(503).json({ erro: "A central de tutoriais não está instalada nesta versão. As demais funções do PetHub continuam disponíveis." }));
    return { disponivel: false, guia: null };
  }
  const onboarding = require(resolvidos[0]).instancia();
  const routes = require(resolvidos[1]).criarRotas(onboarding, authUser);
  const guia = require(resolvidos[2]);
  app.use("/api/onboarding", routes);
  app.use("/api", onboarding.observar);
  return { disponivel: true, guia };
}
module.exports = { instalar };
