"use strict";
// Validação de entrada das duas interfaces. A gravação continua no vendaController.
function criarValidador({ Produto, Cliente, Profissional, Caixa }) {
  const cents = (n) => Math.round(Number(n) * 100);
  const numero = (n) => typeof n === "number" && Number.isFinite(n);
  return async (req, res, next) => {
    if (req.body?.origemInterface !== "caixa-compartilhado") return next();
    const fail = (msg) => res.status(400).json({ erro: msg });
    const b = req.body,
      emp = Number(req.user?.empresaId);
    if (!Number.isSafeInteger(emp) || emp <= 0)
      return res.status(403).json({ erro: "Empresa não identificada." });
    if (req.get("Sec-Fetch-Site") === "cross-site")
      return res.status(403).json({ erro: "Origem não autorizada." });
    try {
      if (!(await Caixa.findOne({ where: { empresa_id: emp, aberto: true } })))
        return res
          .status(409)
          .json({ erro: "Caixa fechado. Abra o caixa para realizar vendas." });
      if (!Array.isArray(b.itens) || !b.itens.length || b.itens.length > 1000)
        return fail("Itens da venda inválidos.");
      let bruto = 0,
        liquidoItens = 0;
      const quantidades = new Map();
      for (const i of b.itens) {
        if (
          !i.produto?.id ||
          !numero(i.quantidade) ||
          i.quantidade <= 0 ||
          !numero(i.valorUnitario) ||
          i.valorUnitario < 0 ||
          !numero(i.desconto) ||
          i.desconto < 0 ||
          i.desconto > 100
        )
          return fail("Quantidade, preço ou desconto inválido.");
        const totalBruto = i.quantidade * i.valorUnitario,
          totalFinal = totalBruto * (1 - i.desconto / 100);
        if (
          !numero(i.totalBruto) ||
          !numero(i.totalFinal) ||
          Math.abs(cents(i.totalBruto) - cents(totalBruto)) > 1 ||
          Math.abs(cents(i.totalFinal) - cents(totalFinal)) > 1
        )
          return fail(
            "Os valores dos itens foram alterados. Atualize a venda.",
          );
        bruto += totalBruto;
        liquidoItens += totalFinal;
        const id = String(i.produto.id);
        quantidades.set(id, (quantidades.get(id) || 0) + i.quantidade);
      }
      const produtos = await Produto.findAll({
        where: { id: [...quantidades.keys()], empresa_id: emp },
      });
      if (produtos.length !== quantidades.size)
        return fail("Há produto indisponível para esta empresa.");
      for (const p of produtos) {
        const permite = [true, 1, "1", "sim", "true"].includes(
          p.permiteEstoqueNegativo,
        );
        if (
          p.tipo === "produto" &&
          !permite &&
          quantidades.get(String(p.id)) > Number(p.estoqueAtual || 0)
        )
          return fail("Quantidade informada não disponível no estoque.");
      }
      for (const [id, Model] of [
        [b.clienteId, Cliente],
        [b.profissionalId, Profissional],
      ]) {
        if (
          id != null &&
          !(await Model.findOne({ where: { id, empresa_id: emp } }))
        )
          return fail(
            "Cliente ou profissional indisponível para esta empresa.",
          );
      }
      const totals = b.totais;
      if (
        !totals ||
        !["bruto", "desconto", "acrescimo", "final"].every((k) =>
          numero(totals[k]),
        ) ||
        totals.desconto < 0 ||
        totals.acrescimo < 0 ||
        totals.final < 0 ||
        !numero(totals.arredondamento || 0)
      )
        return fail("Totais inválidos.");
      if (
        Math.abs(cents(bruto) - cents(totals.bruto)) > 1 ||
        cents(totals.desconto) + 1 < cents(bruto - liquidoItens) ||
        Math.abs(
          cents(
            bruto -
              totals.desconto +
              totals.acrescimo +
              (totals.arredondamento || 0),
          ) - cents(totals.final),
        ) > 1
      )
        return fail("Totais divergentes. Atualize a venda.");
      if (!["pendente", "pago", "parcial"].includes(b.status))
        return fail("Status da venda inválido.");
      if (b.status !== "pendente") {
        if (
          !Array.isArray(b.pagamentos) ||
          !b.pagamentos.length ||
          b.pagamentos.some(
            (p) =>
              !numero(p.valor) ||
              p.valor <= 0 ||
              ![
                "dinheiro",
                "pix",
                "credito",
                "debito",
                "crediario",
                "haver",
                "cheque",
              ].includes(p.forma),
          )
        )
          return fail("Pagamentos inválidos.");
        const pago = b.pagamentos.reduce((n, p) => n + cents(p.valor), 0);
        if (
          !numero(b.totalPago) ||
          pago !== cents(b.totalPago) ||
          (b.status === "pago" && Math.abs(pago - cents(totals.final)) > 1) ||
          pago > cents(totals.final) + 1
        )
          return fail("A soma dos pagamentos não confere com a venda.");
      }
      // Nenhuma alteração de empresa vinda do payload alcança o controller.
      const campos = [
        "origemInterface",
        "timestamp",
        "itens",
        "totais",
        "pagamentos",
        "totalPago",
        "status",
        "cliente",
        "clienteId",
        "profissional",
        "profissionalId",
        "observacoes",
      ];
      Object.keys(b).forEach((k) => {
        if (!campos.includes(k)) delete b[k];
      });
      return next();
    } catch (e) {
      console.error("[ValidarVendaCaixa]", e.message);
      return res
        .status(503)
        .json({
          erro: "Não foi possível validar esta venda. Tente novamente.",
        });
    }
  };
}
module.exports = { criarValidador };
