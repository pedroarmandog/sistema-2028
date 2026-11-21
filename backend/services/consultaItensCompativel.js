"use strict";
// A coluna opcional da otimização de fotos não pode interromper a leitura dos cadastros antigos.
const SEM_VARIANTES = Symbol.for("pethub.itens.sem-variantes");
async function consultarItens(Model, metodo, opcoes = {}) {
  try {
    return await Model[metodo](opcoes);
  } catch (error) {
    const detalhe = String(
      error.original?.message || error.parent?.message || error.message || "",
    );
    if (
      !/(unknown column|no such column)/i.test(detalhe) ||
      !/imagemVersoes/i.test(detalhe)
    )
      throw error;
    const attributes = Array.isArray(opcoes.attributes)
      ? opcoes.attributes.filter((a) => a !== "imagemVersoes")
      : {
          ...opcoes.attributes,
          exclude: [...(opcoes.attributes?.exclude || []), "imagemVersoes"],
        };
    const result = await Model[metodo]({ ...opcoes, attributes });
    for (const item of Array.isArray(result) ? result : [result])
      if (item && typeof item === "object")
        Object.defineProperty(item, SEM_VARIANTES, { value: true });
    return result;
  }
}
module.exports = { consultarItens, SEM_VARIANTES };
