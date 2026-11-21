(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PetHubEstoque = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function controlaEstoque(p) {
    if (
      String(p?.tipo ?? "")
        .trim()
        .toLowerCase() !== "produto"
    )
      return false;
    return ["controlaEstoque", "controlarEstoque", "controleEstoque"].every(
      (k) => ![false, 0, "0", "false", "nao", "não"].includes(p[k]),
    );
  }
  function precisaReposicao(p) {
    return (
      controlaEstoque(p) &&
      (Number(p.estoqueAtual) <= 0 ||
        Number(p.estoqueAtual) < Number(p.estoqueMinimo))
    );
  }
  return { controlaEstoque, precisaReposicao };
});
