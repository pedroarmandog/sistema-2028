"use strict";
const { Op, fn, col, where } = require("sequelize");
function condicaoReposicao(Model) {
  const and = [
    where(fn("LOWER", fn("TRIM", col("tipo"))), "produto"),
    {
      [Op.or]: [
        { estoqueAtual: { [Op.lte]: 0 } },
        where(col("estoqueAtual"), { [Op.lt]: col("estoqueMinimo") }),
      ],
    },
  ];
  // Não confundir `controlado` (medicamento controlado) com controle de estoque.
  // Respeita flags independentes quando existirem na versão instalada, sem consultar colunas inexistentes.
  for (const name of ["controlaEstoque", "controlarEstoque", "controleEstoque"])
    if (Model.rawAttributes?.[name])
      and.push({ [Op.or]: [{ [name]: true }, { [name]: null }] });
  return { [Op.and]: and };
}
module.exports = { condicaoReposicao };
