"use strict";
const { Op, cast, col, where, literal } = require("sequelize");
const pesquisa = require("../../frontend/components/pesquisa-normalizada");
const campos = ["nome", "codigo", "id", "codigoBarras"];
const grupos = {
  a: "aáàâãäå",
  e: "eéèêë",
  i: "iíìîï",
  o: "oóòôõö",
  u: "uúùûü",
  c: "cç",
  n: "nñ",
  y: "yýÿ",
};
// Padrões sem quantificadores fornecidos pelo usuário. Classes explícitas também funcionam com collation binária do TiDB.
function padrao(v) {
  return pesquisa
    .normalizar(v)
    .split("")
    .map((c) =>
      c === " "
        ? "[[:space:][:punct:]]+"
        : grupos[c]
          ? "[" + grupos[c] + grupos[c].toUpperCase() + "]"
          : /[a-z]/.test(c)
            ? "[" + c + c.toUpperCase() + "]"
            : c,
    )
    .join("");
}
function condicaoBuscaCampos(termo, fields) {
  const tokens = pesquisa.palavras(String(termo ?? "").slice(0, 300));
  if (!tokens.length) return null;
  return {
    [Op.and]: tokens.map((t) => ({
      [Op.or]: fields.map((c) =>
        where(cast(col(c), "CHAR"), { [Op.regexp]: padrao(t) }),
      ),
    })),
  };
}
function condicaoBuscaItens(termo) {
  return condicaoBuscaCampos(termo, campos);
}
function ordemBuscaItens(termo, db) {
  const p = padrao(String(termo ?? "").slice(0, 300));
  if (!p) return [["nome", "ASC"]];
  return [
    [
      literal(
        "CASE WHEN nome REGEXP " +
          db.escape("^" + p + "$") +
          " THEN 0 WHEN nome REGEXP " +
          db.escape("^" + p) +
          " THEN 1 ELSE 2 END",
      ),
      "ASC",
    ],
    ["nome", "ASC"],
    ["id", "ASC"],
  ];
}
module.exports = {
  condicaoBuscaCampos,
  condicaoBuscaItens,
  ordemBuscaItens,
  padrao,
  ...pesquisa,
};
