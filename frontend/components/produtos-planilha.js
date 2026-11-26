(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PetHubProdutosPlanilha = factory();
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";
  const campos = [
    ["Nome", "nome"],
    ["Tipo", "tipo"],
    ["Finalidade", "finalidade"],
    ["Unidade", "unidade"],
    ["Venda", "preco"],
    ["Custo", "custoBase"],
    ["Estoque atual", "estoqueAtual"],
    ["Estoque mínimo", "estoqueMinimo"],
    ["Estoque ideal", "estoqueIdeal"],
    ["Código", "codigo"],
    ["Código de barras", "codigoBarras"],
    ["SKU", "sku"],
    ["Centro de resultado", "centroResultado"],
    ["Categoria", "categoria"],
    ["Marca", "marca"],
    ["NCM", "ncm"],
    ["CEST", "cest"],
    ["Observação", "observacao"],
  ];
  const numeros = new Set([
    "preco",
    "custoBase",
    "estoqueAtual",
    "estoqueMinimo",
    "estoqueIdeal",
  ]);
  function linhas(produtos) {
    return [
      campos.map((c) => c[0]),
      ...produtos.map((p) =>
        campos.map(([, k]) =>
          p[k] == null ? null : numeros.has(k) ? Number(p[k]) : String(p[k]),
        ),
      ),
    ];
  }
  function csv(produtos) {
    return (
      "\ufeff" +
      linhas(produtos)
        .map((row) =>
          row
            .map((v) => {
              let s = v == null ? "" : String(v);
              if (typeof v === "string" && /^[=+@-]/.test(s)) s = "'" + s;
              return '"' + s.replaceAll('"', '""') + '"';
            })
            .join(";"),
        )
        .join("\r\n")
    );
  }
  return { linhas, csv };
});
