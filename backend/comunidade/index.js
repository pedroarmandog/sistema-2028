"use strict";
const path = require("node:path"),
  express = require("express");
function mount(
  app,
  { ERP, env = process.env, media, sendMail, adminAccounts } = {},
) {
  let sharedMedia;
  const mediaService = () =>
    (sharedMedia ??= {
      store: require("../services/midias/armazenamento").criarArmazenamento(),
      ler: (empresa, ref) =>
        require("../services/midias").instancia().ler(empresa, ref),
    });
  const service = require("./service").create({
    ERP,
    media: media || mediaService,
    sendMail,
    env,
  });
  const routes = require("./routes").routes(service, {
    env,
    adminAccounts,
  });
  app.use("/api/comunidade", routes.router);
  app.use("/api/comunidade-admin", routes.admin);
  const dist = path.join(__dirname, "../../comunidade/dist");
  app.use(
    "/comunidade",
    express.static(dist, {
      index: "index.html",
      setHeaders(res, file) {
        if (file.endsWith("sw.js") || file.endsWith(".html"))
          res.set("Cache-Control", "no-cache");
      },
    }),
  );
  return service;
}
module.exports = { mount };
