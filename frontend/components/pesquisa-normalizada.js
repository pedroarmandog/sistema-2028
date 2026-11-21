(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PetHubPesquisa = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizar(v) {
    return String(v ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }
  function palavras(v) {
    return normalizar(v).split(" ").filter(Boolean).slice(0, 10);
  }
  function corresponde(texto, termo) {
    const n = normalizar(texto);
    return palavras(termo).every((p) => n.includes(p));
  }
  return { normalizar, palavras, corresponde };
});
