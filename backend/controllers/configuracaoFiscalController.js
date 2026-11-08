"use strict";

const ConfiguracaoFiscal = require("../models/ConfiguracaoFiscal");
const { FiscalServiceFactory } = require("../services/fiscal");

/**
 * configuracaoFiscalController
 *
 * Gerencia as configurações fiscais por empresa.
 * Rota: /api/fiscal/configuracao
 *
 * SEGURANÇA:
 *   Os campos certificado_digital, senha_certificado_hash e token_api
 *   são retornados MASCARADOS nas respostas GET (não expõe dados sensíveis).
 *   A escrita desses campos é aceita mas deve passar por criptografia
 *   antes de persistir (implementar quando integração for ativada).
 */

// Campos sensíveis que NÃO devem ser retornados nas respostas GET
const { proteger } = require("../services/fiscal/credencial");
const CAMPOS_SENSIVEIS = [
  "certificado_digital",
  "senha_certificado_hash",
  "token_api",
];

function mascarar(config) {
  if (!config) return null;
  const obj = config.toJSON ? config.toJSON() : { ...config };
  for (const campo of CAMPOS_SENSIVEIS) {
    if (obj[campo]) obj[campo] = "***";
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fiscal/configuracao
// Retorna a configuração fiscal da empresa do usuário logado
// ─────────────────────────────────────────────────────────────────────────────

async function getConfiguracao(req, res) {
  try {
    const empresa_id = req.user.empresaId;

    let config = await ConfiguracaoFiscal.findOne({ where: { empresa_id } });

    if (!config) {
      // Retorna defaults sem criar registro — empresa ainda não configurou
      return res.json({
        configurado: false,
        ativo: true,
        empresa_id,
        ambiente: "homologacao",
        modo_emissao: "manual",
        emitir_nfe: false,
        emitir_nfce: false,
        emitir_nfse: false,
        provedores_disponiveis: FiscalServiceFactory.provedoresDisponiveis(),
      });
    }

    return res.json({
      configurado: true,
      ...mascarar(config),
      provedores_disponiveis: FiscalServiceFactory.provedoresDisponiveis(),
    });
  } catch (err) {
    console.error("[fiscal/configuracao] GET:", err);
    return res.status(500).json({ erro: "Erro ao buscar configuração fiscal" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fiscal/configuracao
// Cria ou atualiza a configuração fiscal da empresa (upsert)
// ─────────────────────────────────────────────────────────────────────────────

async function salvarConfiguracao(req, res) {
  try {
    const empresa_id = req.user.empresaId;

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({erro:"Configuração inválida."});
    const normalizarOpcional = (valor) => {
      return valor === "" || valor === undefined ? null : valor;
    };

    // Whitelist de campos aceitos no payload — impede que chaves desconhecidas
    // (ex.: "configurado"/"provedores_disponiveis" devolvidos pelo GET) ou
    // campos inexistentes no banco quebrem o INSERT/UPDATE com erro 500.
    const CAMPOS_PERMITIDOS = [
      "provedor_api",
      "ambiente",
      "modo_emissao",
      "serie_nfe",
      "serie_nfce",
      "serie_nfse",
      "proximo_numero_nfe",
      "proximo_numero_nfce",
      "proximo_numero_nfse",
      "natureza_operacao_padrao",
      "cfop_padrao_saida",
      "cfop_padrao_servico",
      "municipio_ibge",
      "regime_tributario",
      "emitir_nfe",
      "emitir_nfce",
      "emitir_nfse",
      "ativo",
    ];

    // Colunas INTEGER/TINYINT: string vazia vira NULL — o MySQL em modo
    // estrito rejeita '' com "Incorrect integer value" (causa clássica de 500).
    const CAMPOS_NUMERICOS = [
      "proximo_numero_nfe",
      "proximo_numero_nfce",
      "proximo_numero_nfse",
      "regime_tributario",
    ];

    // Booleanos passam direto; demais (strings/ENUMs) são normalizados ('' → null)
    const CAMPOS_BOOLEANOS = [
      "emitir_nfe",
      "emitir_nfce",
      "emitir_nfse",
      "ativo",
    ];

    const dados = { empresa_id };
    for (const campo of CAMPOS_PERMITIDOS) {
      if (!(campo in req.body)) continue; // não enviado → preserva valor atual
      let valor = req.body[campo];
      if (CAMPOS_NUMERICOS.includes(campo)) {
        valor = normalizarOpcional(valor);
        if (valor !== null) {
          valor = Number(valor);
          if (!Number.isFinite(valor)) continue; // valor inválido → ignora campo
        }
      } else if (!CAMPOS_BOOLEANOS.includes(campo)) {
        valor = normalizarOpcional(valor);
      }
      dados[campo] = valor;
    }

    if (dados.ambiente !== undefined && !["homologacao", "producao"].includes(dados.ambiente))
      return res.status(400).json({ erro: "Ambiente fiscal inválido." });
    if (dados.modo_emissao !== undefined && !["automatico","manual","confirmacao","lote"].includes(dados.modo_emissao))
      return res.status(400).json({ erro: "Modo de emissão inválido." });
    if (dados.provedor_api && !FiscalServiceFactory.provedoresDisponiveis().includes(dados.provedor_api))
      return res.status(400).json({ erro: "Este provedor ainda não possui integração de emissão." });
    for (const campo of CAMPOS_BOOLEANOS) {
      if (campo in dados && typeof dados[campo] !== "boolean") return res.status(400).json({ erro: "Valor inválido para " + campo });
    }
    for (const campo of CAMPOS_NUMERICOS) {
      if (req.body[campo] != null && req.body[campo] !== "" &&
          (!Number.isSafeInteger(dados[campo]) || dados[campo] < 1))
        return res.status(400).json({ erro: "Número inválido em " + campo });
    }
    for (const campo of ["serie_nfe","serie_nfce","serie_nfse"]) {
      if (dados[campo] != null && !/^\d{1,3}$/.test(dados[campo])) return res.status(400).json({erro:"Série inválida em " + campo});
    }
    if (dados.municipio_ibge && !/^\d{7}$/.test(dados.municipio_ibge)) return res.status(400).json({erro:"Código IBGE deve ter 7 dígitos."});
    if (dados.cfop_padrao_saida && !/^\d{4}$/.test(dados.cfop_padrao_saida)) return res.status(400).json({erro:"CFOP deve ter 4 dígitos."});
    if (req.body.certificado_digital || req.body.senha_certificado_hash)
      return res.status(400).json({ erro: "O certificado A1 é configurado no provedor. Não envie o certificado ou a senha ao PetHub." });
    const anterior = await ConfiguracaoFiscal.findOne({ where: { empresa_id } });
    const token = req.body.token_api;
    const novoToken = typeof token === "string" && token.trim() && token !== "***";
    if (anterior?.token_api && dados.ambiente && dados.ambiente !== anterior.ambiente && !novoToken)
      return res.status(400).json({ erro: "Para trocar de ambiente, informe o token correspondente." });
    try {
      if (novoToken) dados.token_api = proteger(token.trim(), empresa_id);
      else if (anterior?.token_api && !anterior.token_api.startsWith("ph1:"))
        dados.token_api = proteger(anterior.token_api, empresa_id);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }

    const [config, criado] = await ConfiguracaoFiscal.findOrCreate({
      where: { empresa_id },
      defaults: dados,
    });

    if (!criado) {
      await config.update(dados);
    }

    return res.json({
      sucesso: true,
      mensagem: criado
        ? "Configuração fiscal criada"
        : "Configuração fiscal atualizada",
      config: mascarar(config),
    });
  } catch (err) {
    console.error("[fiscal/configuracao] POST:", err.name);
    return res.status(500).json({ erro: "Erro ao salvar configuração fiscal" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fiscal/configuracao/provedores
// Lista provedores disponíveis
// ─────────────────────────────────────────────────────────────────────────────

async function listarProvedores(req, res) {
  return res.json({
    provedores: FiscalServiceFactory.provedoresDisponiveis(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fiscal/fluxo
// Dados mínimos para os fluxos de venda decidirem os botões/regras fiscais.
// Apenas authUser (sem exigePermissao) para não bloquear operadores de venda.
// ─────────────────────────────────────────────────────────────────────────────

async function getFluxo(req, res) {
  try {
    const { fluxoParaFront } = require("../services/notaFiscalService");
    const fluxo = await fluxoParaFront(req.user.empresaId);
    return res.json(fluxo);
  } catch (err) {
    console.error("[fiscal/fluxo] GET:", err);
    return res.status(500).json({ erro: "Erro ao buscar fluxo fiscal" });
  }
}

module.exports = {
  getConfiguracao,
  salvarConfiguracao,
  listarProvedores,
  getFluxo,
};
