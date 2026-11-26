/* Unidade cadastral e precisão de estoque. Compartilhado por navegador e servidor. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PetHubQuantidades = factory();
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";
  const erro = (m) => Object.assign(new Error(m), { status: 400 });
  function unidade(p) {
    const u = typeof p === "object" ? p?.unidade || "UN" : p || "UN";
    return String(u)
      .trim()
      .split(/\s*[-—]\s*/)[0]
      .toUpperCase();
  }
  const kg = (p) => unidade(p) === "KG";
  function mil(v) {
    let s = String(v ?? "").trim();
    if (s.includes(",")) {
      if (s.includes("."))
        throw erro(
          "Use vírgula ou ponto na quantidade, sem separador de milhares.",
        );
      s = s.replace(",", ".");
    }
    if (!/^-?\d+(?:\.\d+)?$/.test(s)) throw erro("Quantidade inválida.");
    const [a, b = ""] = s.replace("-", "").split(".");
    if (b.length > 3 && /[^0]/.test(b.slice(3)))
      throw erro("Quantidade deve ter no máximo três casas decimais.");
    const n = BigInt(a) * 1000n + BigInt((b + "000").slice(0, 3));
    if (n > 999999999999n) throw erro("Quantidade fora do limite.");
    return Number(s.startsWith("-") ? -n : n);
  }
  function numero(v, { positivo = false, naoNegativo = false } = {}) {
    const n = mil(v);
    if ((positivo && n <= 0) || (naoNegativo && n < 0))
      throw erro(
        "Informe uma quantidade " +
          (positivo ? "maior que zero." : "positiva ou zero."),
      );
    return n / 1000;
  }
  const somar = (a, b) => (mil(a) + mil(b)) / 1000;
  const subtrair = (a, b) => (mil(a) - mil(b)) / 1000;
  function validar(v, p, op = {}) {
    const n = numero(v, op);
    if (kg(p)) return n;
    return n;
  }
  function formatar(v, p) {
    return numero(v ?? 0).toLocaleString("pt-BR", {
      minimumFractionDigits: kg(p) ? 3 : 0,
      maximumFractionDigits: 3,
    });
  }
  function embalagem(qtd, peso, custo) {
    const q = numero(qtd, { positivo: true }),
      p = numero(peso, { positivo: true });
    const produto = BigInt(mil(q)) * BigInt(mil(p));
    if (produto % 1000n)
      throw erro("A conversão deve resultar em até três casas decimais.");
    const total = numero(String(Number(produto / 1000n) / 1000), {
      positivo: true,
    });
    let custoKg = null;
    if (custo != null && custo !== "") {
      const s = String(custo).replace(",", ".");
      if (!/^\d+(\.\d{1,2})?$/.test(s))
        throw erro("Custo da embalagem inválido.");
      const [a, b = ""] = s.split(".");
      const c = BigInt(a) * 100n + BigInt((b + "00").slice(0, 2));
      const div = BigInt(mil(p));
      custoKg = Number((c * 1000n + div / 2n) / div) / 100;
    }
    return { quantidade: total, custoKg };
  }
  return {
    unidade,
    kg,
    mil,
    numero,
    somar,
    subtrair,
    validar,
    formatar,
    embalagem,
  };
});
