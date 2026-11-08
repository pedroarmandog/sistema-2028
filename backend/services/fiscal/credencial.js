"use strict";
const crypto = require("node:crypto");
const prefixo = "ph1:";
function chave() {
  const valor = process.env.FISCAL_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(valor)) throw new Error("Configure FISCAL_ENCRYPTION_KEY com 64 caracteres hexadecimais.");
  return Buffer.from(valor, "hex");
}
function proteger(valor, empresa) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  c.setAAD(Buffer.from(String(empresa)));
  const dados = Buffer.concat([c.update(valor, "utf8"), c.final()]);
  const resultado = prefixo + Buffer.concat([iv, c.getAuthTag(), dados]).toString("base64");
  if (resultado.length > 512) throw new Error("Token excede a capacidade da coluna token_api.");
  return resultado;
}
function abrir(valor, empresa) {
  if (!valor || !valor.startsWith(prefixo)) return valor; // compatibilidade com registros anteriores
  const dados = Buffer.from(valor.slice(prefixo.length), "base64");
  const c = crypto.createDecipheriv("aes-256-gcm", chave(), dados.subarray(0, 12));
  c.setAAD(Buffer.from(String(empresa)));
  c.setAuthTag(dados.subarray(12, 28));
  return Buffer.concat([c.update(dados.subarray(28)), c.final()]).toString("utf8");
}
module.exports = { proteger, abrir };
