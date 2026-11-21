(function () {
  "use strict";
  if (window.PetHubFeatures) return;
  const config = {
    relatorioDRE: false,
    relatorioRecebiveisProdutos: false,
    relatorioDemonstrativoCaixa: false,
    devolucaoVenda: false,
    sugestaoCompra: false,
    entradaPeriodo: false,
    entradaProduto: false,
  };
  const normalizar = (v) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const rotas = {
    "rel-demonstrativo-resultados.html": "relatorioDRE",
    "rel-recebiveis-produto.html": "relatorioRecebiveisProdutos",
    "rel-demonstrativo-caixa.html": "relatorioDemonstrativoCaixa",
    "devolucao-venda.html": "devolucaoVenda",
    "sugestao-compra.html": "sugestaoCompra",
    "entrada-no-periodo.html": "entradaPeriodo",
    "entrada-por-produto.html": "entradaProduto",
  };
  const labels = {
    "demonstrativo de resultados": "relatorioDRE",
    "recebiveis por produtos": "relatorioRecebiveisProdutos",
    "recebiveis por produto": "relatorioRecebiveisProdutos",
    "demonstrativo de caixa": "relatorioDemonstrativoCaixa",
    "devolucao de venda": "devolucaoVenda",
    "sugestao de compra": "sugestaoCompra",
    "entrada no periodo": "entradaPeriodo",
    "entrada por produto": "entradaProduto",
  };
  function identificar(el) {
    if (el.dataset?.pethubFeature) return el.dataset.pethubFeature;
    const href =
      el.getAttribute("href") ||
      el.dataset?.url ||
      el.dataset?.href ||
      el.getAttribute("onclick")?.match(/['"]([^'"]+\.html)[^'"]*['"]/)?.[1] ||
      "";
    try {
      const key = new URL(href, location.href).pathname.split("/").pop();
      if (rotas[key]) return rotas[key];
    } catch (_) {}
    const label = normalizar(
      el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.textContent,
    ).replace(/^rel\.?\s*/, "");
    return labels[label];
  }
  const style = document.createElement("style");
  style.id = "pethub-feature-visibility";
  style.textContent =
    Object.keys(config)
      .map(
        (k) =>
          `html[data-pethub-${k.toLowerCase()}="off"] [data-pethub-feature="${k}"]{display:none!important}`,
      )
      .join("\n") + "\n[data-pethub-empty-group]{display:none!important}";
  document.head.append(style);
  function aplicar(root = document) {
    Object.entries(config).forEach(([k, v]) =>
      document.documentElement.setAttribute(
        "data-pethub-" + k.toLowerCase(),
        v ? "on" : "off",
      ),
    );
    const els = [
      ...(root.matches?.(
        'a,button,[role="tab"],[data-pethub-feature],[data-url],[data-href],.menu-result,.search-result-item',
      )
        ? [root]
        : []),
      ...root.querySelectorAll(
        'a,button,[role="tab"],[data-pethub-feature],[data-url],[data-href],.menu-result,.search-result-item',
      ),
    ];
    for (const el of els) {
      const feature = identificar(el);
      if (feature) el.dataset.pethubFeature = feature;
    }
    for (const [header, group] of [
      ["compBtnRelatorios", "compSubRelatorios"],
      ["attBtnRelatorios", "attSubRelatorios"],
      ["attBtnCaixa", "attSubCaixa"],
      ["attBtnVendas", "attSubVendas"],
    ]) {
      const h = document.getElementById(header),
        g = document.getElementById(group);
      if (!h || !g) continue;
      const links = [...g.querySelectorAll("a,button")];
      const vazio =
        links.length > 0 &&
        links.every((e) => {
          const f = identificar(e);
          return f && config[f] === false;
        });
      for (const el of [h, g])
        if (vazio) el.setAttribute("data-pethub-empty-group", "");
        else el.removeAttribute("data-pethub-empty-group");
    }
  }
  window.PetHubFeatures = {
    config,
    aplicar,
    identificar,
    habilitado: (k) => config[k] !== false,
    set(k, v) {
      if (k in config) {
        config[k] = !!v;
        aplicar();
      }
    },
  };
  const observer = new MutationObserver((records) => {
    for (const r of records)
      for (const n of r.addedNodes) if (n.nodeType === 1) aplicar(n);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  aplicar();
  document.addEventListener("DOMContentLoaded", () => aplicar());
})();
