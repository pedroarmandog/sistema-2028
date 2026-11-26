"use strict";
const calc = require("../../frontend/components/venda-calculos");
const existe = (v) => v !== undefined && v !== null && v !== "";
function json(v, padrao) {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return padrao;
    }
  }
  return v ?? padrao;
}
function numero(v, padrao = 0) {
  if (!existe(v)) return padrao;
  const n =
    typeof v === "string"
      ? Number(
          v.replace(/R\$|\s/g, "").includes(",")
            ? v.replace(/R\$|\s|\./g, "").replace(",", ".")
            : v,
        )
      : Number(v);
  return Number.isFinite(n) ? n : padrao;
}
function moeda(v) {
  return numero(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function quantidade(v, unidade) {
  if(require("../../frontend/components/quantidades").kg(unidade||"UN"))return require("../../frontend/components/quantidades").formatar(v,unidade);
  return numero(v).toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}
function dataBrasilia(valor) {
  if (!valor) return "Não informada";
  let v = valor;
  // Strings SQL sem offset seguem o UTC padrão do Sequelize/MySQL deste projeto.
  if (
    typeof v === "string" &&
    /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/.test(v)
  )
    v = v.replace(" ", "T") + "Z";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
    hourCycle: "h23",
  })
    .format(d)
    .replace(",", "");
}
function resumirVenda(venda) {
  const avisos = [],
    raws = json(venda.itens, []),
    t = json(venda.totais, {});
  const itens = (Array.isArray(raws) ? raws : []).map((i) => {
    const p = typeof i.produto === "object" && i.produto ? i.produto : {};
    const qtd = numero(i.quantidade ?? i.qtd, 1),
      unitario = numero(i.valorUnitario ?? i.preco ?? i.unitario ?? p.preco),
      desconto = numero(i.desconto ?? i.descontoPercent);
    const estimado = calc.calcularItem(qtd, unitario, desconto);
    const bruto = calc.centavos(i.totalBruto ?? estimado.totalBruto),
      liquido = calc.centavos(i.totalFinal ?? i.total ?? estimado.totalFinal);
    return {
      codigo: String(p.codigo ?? i.codigo ?? p.id ?? i.produtoId ?? "-"),
      nome: String(
        p.nome ??
          i.nome ??
          i.descricao ??
          (typeof i.produto === "string" ? i.produto : "Item"),
      ),
      unidade: String(
        i.unidade ??
          p.unidade ??
          (/servi/i.test(p.tipo || i.tipo || "") ? "SERV" : "UN"),
      ),
      quantidade: qtd,
      unitario,
      descontoPercent: desconto,
      bruto,
      desconto: bruto - liquido,
      total: liquido,
    };
  });
  const bruto = itens.reduce((n, i) => n + i.bruto, 0),
    descontoItens = itens.reduce((n, i) => n + i.desconto, 0),
    itensLiquidos = bruto - descontoItens;
  const acrescimo = calc.centavos(t.acrescimo ?? 0),
    arredondamento = calc.centavos(t.arredondamento ?? 0);
  const descontoLegado = calc.centavos(t.desconto ?? 0);
  const finalRegistrado = existe(t.final ?? t.totalFinal ?? t.total)
    ? calc.centavos(t.final ?? t.totalFinal ?? t.total)
    : null;
  let geral;
  if (existe(t.descontoGeral)) geral = calc.centavos(t.descontoGeral);
  else if (t.versaoCalculo === 2)
    geral = Math.max(0, descontoLegado - descontoItens);
  else if (
    finalRegistrado !== null &&
    Math.abs(
      bruto - descontoLegado + acrescimo + arredondamento - finalRegistrado,
    ) <= 1
  )
    geral = Math.max(0, descontoLegado - descontoItens);
  else if (
    finalRegistrado !== null &&
    Math.abs(
      itensLiquidos -
        descontoLegado +
        acrescimo +
        arredondamento -
        finalRegistrado,
    ) <= 1
  )
    geral = descontoLegado;
  else if (
    finalRegistrado === null &&
    existe(t.bruto) &&
    descontoLegado >= descontoItens
  ) {
    geral = Math.max(0, descontoLegado - descontoItens);
    avisos.push(
      "Total consolidado ausente; utilizado o resumo dos itens registrados.",
    );
  } else {
    geral = descontoLegado;
    if (descontoItens && descontoLegado)
      avisos.push("Descontos históricos sem discriminação suficiente.");
  }
  const calculado = itensLiquidos - geral + acrescimo + arredondamento,
    final = finalRegistrado ?? Math.max(0, calculado);
  if (finalRegistrado !== null && Math.abs(final - calculado) > 1)
    avisos.push(
      "Totais registrados diferem da soma dos itens. Nenhum dado histórico foi alterado.",
    );
  const formas = {
    dinheiro: "Dinheiro",
    credito: "Cartão de crédito",
    debito: "Cartão de débito",
    pix: "PIX",
    crediario: "Crediário",
    cheque: "Cheque",
    haver: "Haver",
  };
  const pagamentoRaw = json(venda.pagamentos, []);
  const pagamentos = (Array.isArray(pagamentoRaw) ? pagamentoRaw : []).map(
    (p) => {
      const forma = String(p.forma ?? p.tipo ?? "Não informada").toLowerCase();
      return {
        nome: formas[forma] || forma,
        valor: calc.centavos(p.valor ?? 0),
        recebido: existe(p.recebido) ? calc.centavos(p.recebido) : null,
        troco: existe(p.troco) ? calc.centavos(p.troco) : 0,
        parcelas: numero(p.parcelas),
      };
    },
  );
  const totalPago = pagamentos.length
    ? pagamentos.reduce((n, p) => n + p.valor, 0)
    : calc.centavos(venda.totalPago ?? 0);
  const troco = pagamentos.reduce((n, p) => n + p.troco, 0),
    recebido = pagamentos.some((p) => p.recebido !== null)
      ? pagamentos.reduce((n, p) => n + (p.recebido ?? p.valor), 0)
      : totalPago;
  const excesso = Math.max(0, totalPago - final);
  if (excesso > 0 && troco === 0)
    avisos.push(
      "Pagamento registrado acima do total; o histórico não discrimina troco.",
    );
  return {
    id: venda.id,
    data: dataBrasilia(venda.data),
    itens,
    bruto,
    descontoItens,
    descontoGeral: geral,
    descontoTotal: descontoItens + geral,
    itensLiquidos,
    acrescimo,
    arredondamento,
    final,
    totalQuantidade: itens.reduce((n, i) => n + i.quantidade, 0),
    pagamentos,
    totalPago,
    recebido,
    troco,
    saldo: Math.max(0, final - totalPago),
    excesso,
    cliente:
      typeof venda.cliente === "string"
        ? venda.cliente
        : venda.cliente?.nome || "",
    operador: t.operador?.nome || venda.operadorNome || null,
    avisos,
  };
}
module.exports = { resumirVenda, dataBrasilia, moeda, quantidade };
