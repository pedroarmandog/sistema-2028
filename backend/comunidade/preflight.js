"use strict";
// Read-only dependency inspection. Does not connect to the DB or print credentials.
const fs = require("node:fs"),
  path = require("node:path");
let errors = 0;
for (const name of [
  "express",
  "sequelize",
  "cookie-parser",
  "multer",
  "bcryptjs",
  "jsonwebtoken",
  "sharp",
]) {
  try {
    require.resolve(name);
    console.log("OK dependência: " + name);
  } catch {
    errors++;
    console.error(
      "FALTA dependência: " + name + " — instale no package.json da raiz.",
    );
  }
}
for (const name of [
  "../services/clientePortal/auth.js",
  "../services/clientePortal/modelos.js",
  "../services/midias/index.js",
  "../services/midias/armazenamento.js",
  "../services/midias/validar.js",
  "../middleware/authAdmin.js",
  "../models/index.js",
  "../../comunidade/dist/index.html",
]) {
  if (fs.existsSync(path.resolve(__dirname, name)))
    console.log("OK arquivo: " + name);
  else {
    errors++;
    console.error(
      "FALTA arquivo: " +
        name +
        " — restaure o módulo correspondente do seu repositório atual.",
    );
  }
}
if (errors) {
  console.error(
    "Pré-verificação encontrou " +
      errors +
      " pendência(s). Resolva antes de habilitar a Comunidade.",
  );
  process.exitCode = 1;
} else
  console.log(
    "Dependências locais encontradas. A migração e o armazenamento ainda devem ser verificados no ambiente de homologação.",
  );
