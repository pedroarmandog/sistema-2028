/* Regras de apresentação e rateio de baixas. Não acessa o banco ou cadastros. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./venda-calculos"));
  else root.PetHubContasPagar = factory(root.PetHubCalculos);
})(typeof window === "object" ? window : globalThis, function (C) {
  "use strict";
  function diaBrasil(now = new Date()) {
    const ps = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const p = (k) => ps.find((x) => x.type === k).value;
    return p("year") + "-" + p("month") + "-" + p("day");
  }
  const saldo = (d) =>
    Number(d.saldoPendente ?? d.valorTotal ?? d.totalProdutos ?? 0);
  const escape = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function ratear(documentos, pagamentos) {
    const forms = pagamentos.map((p) => ({
      ...p,
      centavos: C.centavos(p.valor),
    }));
    if (!forms.length || forms.some((p) => p.centavos <= 0))
      throw Error("Informe um pagamento maior que zero.");
    const total = forms.reduce((n, p) => n + p.centavos, 0);
    const saldos = documentos.map((d) => C.centavos(saldo(d)));
    if (total > saldos.reduce((n, x) => n + x, 0))
      throw Error("Pagamento excede o saldo selecionado.");
    let index = 0;
    return documentos
      .map((doc, i) => {
        let restante = saldos[i];
        const partes = [];
        while (restante > 0 && index < forms.length) {
          const p = forms[index],
            valor = Math.min(restante, p.centavos);
          if (valor > 0) {
            const { centavos, ...rest } = p;
            partes.push({ ...rest, valor: valor / 100 });
            restante -= valor;
            p.centavos -= valor;
          }
          if (p.centavos === 0) index++;
        }
        return { id: String(doc.id), pagamentos: partes };
      })
      .filter((d) => d.pagamentos.length);
  }
  async function resposta(res) {
    const json = await res.json().catch(() => ({}));
    if (!res.ok)
      throw Error(
        json.erro ||
          json.error ||
          "Falha na operação financeira (HTTP " + res.status + ").",
      );
    return json;
  }
  return { diaBrasil, saldo, escape, ratear, resposta };
});
