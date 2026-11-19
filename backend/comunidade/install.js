// Integrates before legacy global CORS/HTML middleware; preserves the rest of app.js.
"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const file = path.join(__dirname, "../app.js"),
  source = fs.readFileSync(file, "utf8");
if (source.includes("require('./comunidade').mount")) {
  console.log("Comunidade já integrada.");
  process.exit(0);
}
const match = /const models = require\(["']\.\/models["']\);/.exec(source);
if (!match)
  throw Error(
    "Ponto de integração não encontrado. Nenhum arquivo foi modificado.",
  );
const out =
  source.slice(0, match.index + match[0].length) +
  "\n// Módulo isolado: rotas próprias e frontend sem scripts do ERP.\nrequire('./comunidade').mount(app,{ERP:models});\n" +
  source.slice(match.index + match[0].length);
fs.copyFileSync(file, file + ".before-community");
fs.writeFileSync(file + ".community-new", out);
fs.renameSync(file + ".community-new", file);
console.log("Comunidade integrada; backup em backend/app.js.before-community.");
