"use strict";
// Regras exclusivas da importação de produtos. Ausência não é um preço inválido.
const { campos, normalizar } = require("./campos");
const falta = (v) =>
  v == null ||
  /^(?:null|undefined|n\/?a|não informado|nao informado|[-—–])?$/i.test(
    String(v).trim(),
  );
const erro = (m) => Object.assign(new Error(m), { status: 400 });
function numero(v, campo, casas = 2) {
  if (falta(v)) return null;
  let s = String(v)
    .trim()
    .replace(/^(?:R\$|BRL)\s*/i, "")
    .replace(/\s/g, "");
  if (falta(s)) return null;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      if (!/^\d{1,3}(?:\.\d{3})+,\d+$/.test(s))
        throw erro(
          campo + ": valor numérico inválido. Confira o mapeamento da coluna.",
        );
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      if (!/^\d{1,3}(?:,\d{3})+\.\d+$/.test(s))
        throw erro(
          campo + ": valor numérico inválido. Confira o mapeamento da coluna.",
        );
      s = s.replace(/,/g, "");
    }
  } else s = s.replace(",", ".");
  if (!/^\+?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(s))
    throw erro(
      campo +
        ": valor inválido " +
        JSON.stringify(String(v).slice(0, 60)) +
        ". Confira o valor e o mapeamento da coluna.",
    );
  const n = Number(s),
    fator = 10 ** casas,
    arredondado = Math.round((n + Number.EPSILON) * fator) / fator;
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    n > 99999999.99 ||
    Math.abs(n - arredondado) > 1e-8
  )
    throw erro(
      campo +
        ": informe um valor positivo ou zero com até " +
        casas +
        " casas decimais.",
    );
  return arredondado;
}
function converter(raw, Modelo) {
  const dados = {},
    permitidos = campos("produtos");
  for (const [k, v] of Object.entries(raw)) {
    if (!Object.hasOwn(permitidos, k) || falta(v)) continue;
    const attr = Modelo.rawAttributes[k];
    if (!attr) continue;
    const s = String(v).trim();
    if (attr.type.options?.length && s.length > attr.type.options.length)
      throw erro(
        "Campo " +
          (permitidos[k]?.[0] || k) +
          " excede " +
          attr.type.options.length +
          " caracteres.",
      );
    dados[k] = s;
  }
  if (!dados.nome)
    throw erro("Nome obrigatório: informe a identificação do produto.");
  if (dados.unidade)
    dados.unidade = String(dados.unidade)
      .split(/\s*[-—]\s*/)[0]
      .trim()
      .toUpperCase();
  if (dados.tipo) {
    dados.tipo = normalizar(dados.tipo);
    if (!["produto", "servico", "plano"].includes(dados.tipo))
      throw erro("Tipo inválido. Use Produto, Serviço ou Plano.");
  }
  if (dados.finalidade) {
    dados.finalidade = normalizar(dados.finalidade);
    if (!["revenda", "insumo"].includes(dados.finalidade))
      throw erro("Finalidade inválida. Use Revenda ou Insumo.");
  }
  for (const k of [
    "custoBase",
    "preco",
    "aliq_icms",
    "aliq_pis",
    "aliq_cofins",
    "aliq_ipi",
    "peso",
    "estoqueAtual",
    "estoqueMinimo",
    "estoqueIdeal",
    "origem",
  ]) {
    if (!Object.hasOwn(dados, k)) continue;
    const casas = [
      "estoqueAtual",
      "estoqueMinimo",
      "estoqueIdeal",
      "peso",
    ].includes(k)
      ? 3
      : k === "origem"
        ? 0
        : 2;
    const v = numero(dados[k], permitidos[k]?.[0] || k, casas);
    if (v == null) delete dados[k];
    else dados[k] = v;
    if (k.startsWith("aliq_") && v > 100)
      throw erro("Alíquota deve estar entre 0 e 100.");
  }
  if (dados.csosn && dados.cst_icms)
    throw erro("Preencha apenas CST ICMS ou CSOSN.");
  if (dados.ativo != null) {
    const a = normalizar(dados.ativo);
    if (["sim", "true", "1", "ativo"].includes(a)) dados.ativo = "sim";
    else if (["nao", "false", "0", "inativo"].includes(a)) dados.ativo = "nao";
    else throw erro("Ativo deve ser Sim ou Não.");
  }
  return dados;
}
function defaults(dados) {
  // Aplicar SOMENTE na criação. Atualizações não apagam dados que faltam no arquivo.
  return {
    custoBase: null,
    preco: 0,
    estoqueAtual: dados.unidade === "KG" ? null : 0,
    estoqueMinimo: 0,
    estoqueIdeal: 0,
    tipo: "produto",
    finalidade: "revenda",
    unidade: "UN",
    ...dados,
  };
}
module.exports = { falta, numero, converter, defaults };
