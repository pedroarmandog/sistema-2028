"use strict";
const path = require("node:path"),
  express = require("express");
function mount(app, { ERP, env = process.env, portal, media, adminAuth } = {}) {
  const service = require("./service").create({
    ERP,
    portal: portal || (() => require("../services/clientePortal").instancia()),
    media: media || (() => require("../services/midias").instancia()),
  });
  const routes = require("./routes").routes(service, {
    env,
    adminAuth: adminAuth || require("../middleware/authAdmin").authAdmin,
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
