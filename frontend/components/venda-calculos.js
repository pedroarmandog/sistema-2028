/* Cálculos compartilhados pelo caixa e pela leitura de comprovantes. Sem acesso a cadastros. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PetHubCalculos = factory();
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";
  function decimal(valor) {
    let s = String(valor ?? 0)
      .trim()
      .replace(/R\$|\s/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    if (/e/i.test(s)) s = Number(s).toFixed(8);
    if (!/^-?\d*(\.\d*)?$/.test(s) || !/\d/.test(s))
      throw Error("Valor numérico inválido.");
    const negativo = s.startsWith("-");
    s = s.replace("-", "");
    const [a, b = ""] = s.split(".");
    return { n: BigInt((a || "0") + b), d: 10n ** BigInt(b.length), negativo };
  }
  function arredondar(n, d) {
    return (n + d / 2n) / d;
  }
  function centavos(v) {
    const x = decimal(v);
    const n = Number(arredondar(x.n * 100n, x.d));
    if (!Number.isSafeInteger(n)) throw Error("Valor fora do limite.");
    return x.negativo ? -n : n;
  }
  function multiplicar(centavos, quantidade) {
    const q = decimal(quantidade);
    const n = Number(arredondar(BigInt(Math.abs(centavos)) * q.n, q.d));
    return centavos < 0 !== q.negativo ? -n : n;
  }
  function percentual(base, p) {
    const x = decimal(p);
    return (
      Number(arredondar(BigInt(Math.abs(base)) * x.n, x.d * 100n)) *
      (x.negativo ? -1 : 1)
    );
  }
  function calcularItem(qtd, unitario, desconto = 0) {
    const bruto = multiplicar(centavos(unitario), qtd),
      desc = percentual(bruto, desconto);
    return {
      totalBruto: bruto / 100,
      descontoValor: desc / 100,
      totalFinal: (bruto - desc) / 100,
    };
  }
  function calcularTotais(itens, c = {}) {
    const bruto = itens.reduce((n, i) => n + centavos(i.totalBruto), 0),
      liquido = itens.reduce((n, i) => n + centavos(i.totalFinal), 0);
    const acrescimo =
      Number(c.acrescimoPercent) > 0
        ? percentual(liquido, c.acrescimoPercent)
        : centavos(c.acrescimoValor || 0);
    const descontoGeral =
      Number(c.descontoPercent) > 0
        ? percentual(liquido, c.descontoPercent)
        : centavos(c.descontoValor || 0);
    const arredondamento = centavos(c.arredondamento || 0),
      final = Math.max(0, liquido + acrescimo - descontoGeral + arredondamento);
    return {
      versaoCalculo: 2,
      bruto: bruto / 100,
      descontoItens: (bruto - liquido) / 100,
      descontoGeral: descontoGeral / 100,
      desconto: (bruto - liquido + descontoGeral) / 100,
      acrescimo: acrescimo / 100,
      arredondamento: arredondamento / 100,
      final: final / 100,
    };
  }
  return { centavos, multiplicar, percentual, calcularItem, calcularTotais };
});
