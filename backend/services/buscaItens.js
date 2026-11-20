"use strict";
const { Op, fn, col, where } = require("sequelize");
// Não depende da collation do banco (incluindo comparações binárias do TiDB).
function condicaoBuscaItens(termo) {
  const q = String(termo ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  if (!q) return null;
  return {
    [Op.or]: ["nome", "codigo", "id", "codigoBarras"].map((campo) =>
      where(fn("LOWER", col(campo)), { [Op.like]: "%" + q + "%" }),
    ),
  };
}
module.exports = { condicaoBuscaItens };
