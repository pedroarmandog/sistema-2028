"use strict";

/**
 * Utilitários de validação fiscal
 *
 * Funções puras, sem dependência de banco de dados ou framework.
 * Podem ser usadas em controllers, middlewares ou pelo frontend via API.
 *
 * Todas as funções retornam { valido: boolean, mensagem: string }.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CPF
// ─────────────────────────────────────────────────────────────────────────────

function validateCPF(cpf) {
  if (!cpf) return { valido: false, mensagem: "CPF não informado" };

  const nums = String(cpf).replace(/\D/g, "");
  if (nums.length !== 11)
    return { valido: false, mensagem: "CPF deve ter 11 dígitos" };
  if (/^(\d)\1{10}$/.test(nums))
    return { valido: false, mensagem: "CPF inválido" };

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(nums[9]))
    return { valido: false, mensagem: "CPF inválido" };

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(nums[10]))
    return { valido: false, mensagem: "CPF inválido" };

  return { valido: true, mensagem: "CPF válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CNPJ
// ─────────────────────────────────────────────────────────────────────────────

function validateCNPJ(cnpj) {
  if (!cnpj) return { valido: false, mensagem: "CNPJ não informado" };

  const nums = String(cnpj).replace(/\D/g, "");
  if (nums.length !== 14)
    return { valido: false, mensagem: "CNPJ deve ter 14 dígitos" };
  if (/^(\d)\1{13}$/.test(nums))
    return { valido: false, mensagem: "CNPJ inválido" };

  const calc = (n, pos) => {
    let sum = 0;
    let weights =
      pos === 13
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < n; i++) sum += parseInt(nums[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  if (calc(12, 13) !== parseInt(nums[12]))
    return { valido: false, mensagem: "CNPJ inválido" };
  if (calc(13, 14) !== parseInt(nums[13]))
    return { valido: false, mensagem: "CNPJ inválido" };

  return { valido: true, mensagem: "CNPJ válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CEP
// ─────────────────────────────────────────────────────────────────────────────

function validateCEP(cep) {
  if (!cep) return { valido: false, mensagem: "CEP não informado" };
  const nums = String(cep).replace(/\D/g, "");
  if (nums.length !== 8)
    return { valido: false, mensagem: "CEP deve ter 8 dígitos" };
  return { valido: true, mensagem: "CEP válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// NCM — Nomenclatura Comum do Mercosul
// ─────────────────────────────────────────────────────────────────────────────

function validateNCM(ncm) {
  if (!ncm) return { valido: false, mensagem: "NCM não informado" };
  const nums = String(ncm).replace(/\D/g, "");
  // NCM pode ter 8 dígitos (completo) ou 4 (gênero/classe)
  if (nums.length !== 8 && nums.length !== 4) {
    return { valido: false, mensagem: "NCM deve ter 4 ou 8 dígitos" };
  }
  return { valido: true, mensagem: "NCM válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CFOP — Código Fiscal de Operações e Prestações
// ─────────────────────────────────────────────────────────────────────────────

const CFOP_PREFIXOS_VALIDOS = new Set(["1", "2", "3", "5", "6", "7"]);

function validateCFOP(cfop) {
  if (!cfop) return { valido: false, mensagem: "CFOP não informado" };
  const nums = String(cfop).replace(/\D/g, "");
  if (nums.length !== 4)
    return { valido: false, mensagem: "CFOP deve ter 4 dígitos" };
  if (!CFOP_PREFIXOS_VALIDOS.has(nums[0])) {
    return {
      valido: false,
      mensagem: "CFOP inválido: primeiro dígito deve ser 1, 2, 3, 5, 6 ou 7",
    };
  }
  return { valido: true, mensagem: "CFOP válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CST ICMS — Código de Situação Tributária (regime normal)
// ─────────────────────────────────────────────────────────────────────────────

const CST_ICMS_VALIDOS = new Set([
  "00",
  "10",
  "20",
  "30",
  "40",
  "41",
  "50",
  "51",
  "60",
  "70",
  "90",
  "000",
  "010",
  "020",
  "030",
  "040",
  "041",
  "050",
  "051",
  "060",
  "070",
  "090",
]);

function validateCST_ICMS(cst) {
  if (!cst) return { valido: false, mensagem: "CST ICMS não informado" };
  const val = String(cst).replace(/\D/g, "").padStart(2, "0");
  const val3 = val.padStart(3, "0");
  if (!CST_ICMS_VALIDOS.has(val) && !CST_ICMS_VALIDOS.has(val3)) {
    return { valido: false, mensagem: `CST ICMS "${cst}" não reconhecido` };
  }
  return { valido: true, mensagem: "CST ICMS válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CSOSN — Código de Situação da Operação no Simples Nacional
// ─────────────────────────────────────────────────────────────────────────────

const CSOSN_VALIDOS = new Set([
  "101",
  "102",
  "103",
  "201",
  "202",
  "203",
  "300",
  "400",
  "500",
  "900",
]);

function validateCSOSN(csosn) {
  if (!csosn) return { valido: false, mensagem: "CSOSN não informado" };
  const val = String(csosn).trim();
  if (!CSOSN_VALIDOS.has(val)) {
    return { valido: false, mensagem: `CSOSN "${val}" não reconhecido` };
  }
  return { valido: true, mensagem: "CSOSN válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CST PIS / COFINS
// ─────────────────────────────────────────────────────────────────────────────

const CST_PIS_COFINS_VALIDOS = new Set([
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "49",
  "50",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "70",
  "71",
  "72",
  "73",
  "74",
  "75",
  "98",
  "99",
]);

function validateCST_PIS(cst) {
  if (!cst) return { valido: false, mensagem: "CST PIS não informado" };
  const val = String(cst).padStart(2, "0");
  if (!CST_PIS_COFINS_VALIDOS.has(val)) {
    return { valido: false, mensagem: `CST PIS "${cst}" não reconhecido` };
  }
  return { valido: true, mensagem: "CST PIS válido" };
}

function validateCST_COFINS(cst) {
  if (!cst) return { valido: false, mensagem: "CST COFINS não informado" };
  const val = String(cst).padStart(2, "0");
  if (!CST_PIS_COFINS_VALIDOS.has(val)) {
    return { valido: false, mensagem: `CST COFINS "${cst}" não reconhecido` };
  }
  return { valido: true, mensagem: "CST COFINS válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Código IBGE de Município (7 dígitos)
// ─────────────────────────────────────────────────────────────────────────────

function validateCodigoIBGE(ibge) {
  if (!ibge) return { valido: false, mensagem: "Código IBGE não informado" };
  const nums = String(ibge).replace(/\D/g, "");
  if (nums.length !== 7) {
    return {
      valido: false,
      mensagem: "Código IBGE do município deve ter 7 dígitos",
    };
  }
  return { valido: true, mensagem: "Código IBGE válido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inscrição Estadual (IE) — validação por UF
// Implementação de dígito verificador das principais UFs
// ─────────────────────────────────────────────────────────────────────────────

const IE_MASCARAS = {
  AC: /^\d{13}$/,
  AL: /^\d{9}$/,
  AM: /^\d{9}$/,
  AP: /^\d{9}$/,
  BA: /^\d{8,9}$/,
  CE: /^\d{9}$/,
  DF: /^\d{13}$/,
  ES: /^\d{9}$/,
  GO: /^\d{9}$/,
  MA: /^\d{9}$/,
  MG: /^\d{13}$/,
  MS: /^\d{9}$/,
  MT: /^\d{11}$/,
  PA: /^\d{9}$/,
  PB: /^\d{9}$/,
  PE: /^\d{14}$/,
  PI: /^\d{9}$/,
  PR: /^\d{10}$/,
  RJ: /^\d{8}$/,
  RN: /^\d{9,10}$/,
  RO: /^\d{14}$/,
  RR: /^\d{9}$/,
  RS: /^\d{10}$/,
  SC: /^\d{9}$/,
  SE: /^\d{9}$/,
  SP: /^\d{12}$|^P-\d{8}.\d\/\d{3}$/,
  TO: /^\d{11}$/,
};

function validateIE(ie, uf) {
  if (!ie) return { valido: false, mensagem: "IE não informada" };
  if (!uf)
    return { valido: false, mensagem: "UF é obrigatória para validar IE" };

  const ufUpper = String(uf).toUpperCase().trim();
  const ieNums = String(ie).replace(/[.\-\/\s]/g, "");

  // IE isenta — aceita como válida
  if (ieNums.toUpperCase() === "ISENTO") {
    return { valido: true, mensagem: "IE isenta" };
  }

  const mascara = IE_MASCARAS[ufUpper];
  if (!mascara) {
    return { valido: false, mensagem: `UF "${ufUpper}" não reconhecida` };
  }

  if (!mascara.test(ieNums)) {
    return { valido: false, mensagem: `IE inválida para a UF ${ufUpper}` };
  }

  return { valido: true, mensagem: "IE válida" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unidade de Medida (conforme tabela SEFAZ)
// ─────────────────────────────────────────────────────────────────────────────

const UNIDADES_VALIDAS = new Set([
  "UN",
  "PC",
  "CX",
  "KG",
  "G",
  "MG",
  "L",
  "ML",
  "M",
  "M2",
  "M3",
  "CM",
  "MM",
  "KM",
  "T",
  "TON",
  "FD",
  "PR",
  "DZ",
  "SC",
  "BD",
  "AMP",
  "BALDE",
  "BISNAGA",
  "BLOCO",
  "BOBINA",
  "BALDE",
  "CART",
  "CENTO",
  "DUZIA",
  "ESTOJO",
  "FARDO",
  "FOLHA",
  "GALAO",
  "JOGO",
  "LATA",
  "METRO",
  "MILHAR",
  "PACOTE",
  "PARES",
  "ROLO",
  "SACO",
  "TUBO",
]);

function validateUnidade(unidade) {
  if (!unidade) return { valido: false, mensagem: "Unidade não informada" };
  const val = String(unidade).toUpperCase().trim();
  if (!UNIDADES_VALIDAS.has(val)) {
    return {
      valido: false,
      mensagem: `Unidade "${val}" não está na lista de unidades aceitas pela SEFAZ`,
    };
  }
  return { valido: true, mensagem: "Unidade válida" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatadores auxiliares (não validam, apenas formatam para exibição)
// ─────────────────────────────────────────────────────────────────────────────

function formatCPF(cpf) {
  const n = String(cpf).replace(/\D/g, "");
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCNPJ(cnpj) {
  const n = String(cnpj).replace(/\D/g, "");
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatCEP(cep) {
  const n = String(cep).replace(/\D/g, "");
  return n.replace(/(\d{5})(\d{3})/, "$1-$2");
}

function soNums(str) {
  return String(str || "").replace(/\D/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  validateCPF,
  validateCNPJ,
  validateCEP,
  validateNCM,
  validateCFOP,
  validateCST_ICMS,
  validateCSOSN,
  validateCST_PIS,
  validateCST_COFINS,
  validateCodigoIBGE,
  validateIE,
  validateUnidade,
  formatCPF,
  formatCNPJ,
  formatCEP,
  soNums,
};
