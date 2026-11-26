"use strict";
const calc = require("../../frontend/components/venda-calculos");
const json = (v, def) => {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return def;
    }
  }
  return v ?? def;
};
const num = (v, def = 0) => {
  if (v == null || v === "") return def;
  try {
    return calc.centavos(v) / 100;
  } catch {
    return def;
  }
};
function calcularItens(raw) {
  return (Array.isArray(raw) ? raw : []).map((i) => {
    const p = i.produto || {},
      q = require("../../frontend/components/quantidades").numero(i.quantidade ?? 1,{positivo:true}),
      u = num(i.valorUnitario ?? i.preco ?? p.preco),
      d = num(i.desconto);
    if (!Number.isFinite(q) || q <= 0 || u < 0 || d < 0 || d > 100)
      throw Object.assign(
        Error("Quantidade, valor ou desconto inválido no orçamento."),
        { status: 400 },
      );
    const c = calc.calcularItem(q, u, d);
    return {
      ...i,
      nome: String(i.nome ?? i.descricao ?? p.nome ?? "Item não informado"),
      quantidade: q,
      valorUnitario: u,
      desconto: d,
      ...c,
    };
  });
}
function totaisItens(itens) {
  const bruto = itens.reduce((n, i) => n + calc.centavos(i.totalBruto), 0),
    desc = itens.reduce((n, i) => n + calc.centavos(i.descontoValor), 0);
  return {
    subtotal: (bruto / 100).toFixed(2),
    desconto: (desc / 100).toFixed(2),
    total: ((bruto - desc) / 100).toFixed(2),
  };
}
function resumirOrcamento(o) {
  const itens = calcularItens(json(o.itens, [])),
    estimado = totaisItens(itens),
    saved = json(o.totais, {});
  return {
    itens,
    subtotal: num(saved.subtotal ?? estimado.subtotal),
    desconto: num(saved.desconto ?? estimado.desconto),
    total: num(saved.total ?? estimado.total),
  };
}
module.exports = { json, calcularItens, totaisItens, resumirOrcamento };
