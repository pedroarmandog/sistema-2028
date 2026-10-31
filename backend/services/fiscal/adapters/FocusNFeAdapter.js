"use strict";

const { FiscalService } = require("../FiscalService");

/**
 * FocusNFeAdapter - Adapter para o provedor Focus NFe (API v2)
 *
 * Integracao real:
 *   - Autenticacao: HTTP Basic Auth - usuario = token da empresa, senha vazia
 *     (cabecalho `Authorization: Basic base64("token:")`).
 *   - URL base por ambiente:
 *       homologacao -> https://homologacao.focusnfe.com.br/v2
 *       producao    -> https://api.focusnfe.com.br/v2
 *   - Emissao de NF-e (modelo 55), consulta, cancelamento e inutilizacao.
 *
 * Documentacao: https://doc.focusnfe.com.br/llms.txt
 */

const URLS_BASE = {
  homologacao: "https://homologacao.focusnfe.com.br/v2",
  producao: "https://api.focusnfe.com.br/v2",
};

const DEFAULT_AMBIENTE = "homologacao";

// Codigos tPag (NF-e 4.00) aceitos pela Focus
const FORMAS_PAGAMENTO_FOCUS = {
  dinheiro: "01",
  cheque: "02",
  cartao_credito: "03",
  cartao_debito: "04",
  credito_loja: "05",
  vale_alimentacao: "10",
  vale_refeicao: "11",
  vale_presente: "12",
  vale_combustivel: "13",
  duplicata_mercantil: "14",
  boleto: "15",
  deposito_bancario: "16",
  pix: "17",
  transferencia: "18",
  fidelidade_cashback: "19",
  credito_em_loja: "21",
  pix_automatico: "23",
  sem_pagamento: "90",
  pagamento_posterior: "91",
  outro: "99",
};

function _soDigitos(valor) {
  return String(valor == null ? "" : valor).replace(/\D/g, "");
}

function _limpar(valor) {
  if (valor === undefined || valor === null || valor === "") return undefined;
  return valor;
}

function _numero(valor, casas = 2) {
  const n = Number(valor);
  return Number.isFinite(n) ? n.toFixed(casas) : "0";
}

function _dataHora(data) {
  const d = data instanceof Date ? data : new Date();
  const p = (x) => String(x).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

function _referencia(payload) {
  if (payload && payload._notaId != null) return String(payload._notaId);
  if (payload && payload._vendaId != null) {
    const v = String(payload._vendaId).replace(/\D/g, "");
    return v ? `v${v}` : `nfe${Date.now()}`;
  }
  return `nfe${Date.now()}`;
}
class FocusNFeAdapter extends FiscalService {
  /**
   * @param {object} config - Instancia de ConfiguracaoFiscal da empresa
   */
  constructor(config) {
    super(config);
    this.provedor = "focusnfe";
    this.token = config ? config.token_api || null : null;
    this.ambiente = (config && config.ambiente) || DEFAULT_AMBIENTE;
    this.baseUrl = URLS_BASE[this.ambiente] || URLS_BASE[DEFAULT_AMBIENTE];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers HTTP
  // ─────────────────────────────────────────────────────────────────────────

  _authHeader() {
    if (!this.token) {
      const e = new Error(
        "Token do Focus NFe nao configurado. Acesse Configuracoes -> Configuracao Fiscal " +
          "e informe o token no campo 'Token / API Key do Provedor'.",
      );
      e.code = "FOCUS_SEM_TOKEN";
      throw e;
    }
    return "Basic " + Buffer.from(`${this.token}:`, "utf8").toString("base64");
  }

  _montarErro(mensagemBase, corpo) {
    if (!corpo || typeof corpo !== "object") return mensagemBase;

    const detalhes = [];
    if (corpo.mensagem) detalhes.push(String(corpo.mensagem));
    if (corpo.mensagem_sefaz) detalhes.push(`SEFAZ: ${corpo.mensagem_sefaz}`);
    if (Array.isArray(corpo.erros)) {
      for (const er of corpo.erros) {
        if (er && er.mensagem) {
          detalhes.push(er.campo ? `${er.campo}: ${er.mensagem}` : String(er.mensagem));
        }
      }
    }
    if (!detalhes.length && corpo.detail) detalhes.push(String(corpo.detail));
    if (!detalhes.length && corpo.message) detalhes.push(String(corpo.message));

    return detalhes.length ? `${mensagemBase}\n${detalhes.join(" | ")}` : mensagemBase;
  }
async _request(metodo, caminho, { body, timeoutMs = 45000 } = {}) {
    const headers = {
      Authorization: this._authHeader(),
      Accept: "application/json",
    };
    const options = { method: metodo, headers };

    if (
      typeof AbortSignal !== "undefined" &&
      typeof AbortSignal.timeout === "function"
    ) {
      options.signal = AbortSignal.timeout(timeoutMs);
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    let resp;
    try {
      resp = await fetch(`${this.baseUrl}${caminho}`, options);
    } catch (err) {
      const e = new Error(
        `Falha de conexao com o Focus NFe (ambiente: ${this.ambiente}): ${err.message}`,
      );
      e.code = "FOCUS_CONEXAO";
      e.cause = err;
      throw e;
    }

    const texto = await resp.text().catch(() => null);
    let corpo = null;
    if (texto) {
      try {
        corpo = JSON.parse(texto);
      } catch (_) {
        corpo = null;
      }
    }

    if (resp.status === 401) {
      const e = new Error(
        "Autenticacao recusada pelo Focus NFe (HTTP 401). Confira o token e o ambiente " +
          "(o token de producao nao funciona em homologacao e vice-versa).",
      );
      e.code = "FOCUS_401";
      e.status = resp.status;
      throw e;
    }
    if (resp.status === 404) {
      const e = new Error(
        this._montarErro(
          `Registro nao encontrado no Focus NFe (HTTP 404): ${caminho}`,
          corpo,
        ),
      );
      e.code = "FOCUS_404";
      e.status = resp.status;
      throw e;
    }
    if (!resp.ok) {
      const msg = this._montarErro(
        `Focus NFe respondeu HTTP ${resp.status} em ${metodo} ${caminho}`,
        corpo,
      );
      const e = new Error(msg);
      e.code = "FOCUS_HTTP";
      e.status = resp.status;
      e.resposta = corpo;
      throw e;
    }

    return corpo == null ? {} : corpo;
  }

  async _baixar(url, { buffer = false } = {}) {
    const headers = { Authorization: this._authHeader(), Accept: "*/*" };
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const e = new Error(
        `Falha ao baixar arquivo do Focus NFe (HTTP ${resp.status}): ${url}`,
      );
      e.code = "FOCUS_DOWNLOAD";
      e.status = resp.status;
      throw e;
    }
    if (buffer) return Buffer.from(await resp.arrayBuffer());
    return await resp.text();
  }
static _baseICMS(item, config) {
    const crt = config ? config.crt || config.regime_tributario || null : null;
    const simples = String(crt) === "1" || String(crt) === "2";
    if (item && item.csosn) return String(item.csosn).padStart(3, "0");
    if (item && item.cst_icms) return String(item.cst_icms);
    return simples ? "102" : "00";
  }

  static montarPayloadNFe(payload, config = null, tipoDocumento = "nfe") {
    const emitente = (payload && payload.emitente) || {};
    const destinatario = (payload && payload.destinatario) || {};
    const itens = Array.isArray(payload && payload.itens) ? payload.itens : [];
    const pagamentos = Array.isArray(payload && payload.pagamentos)
      ? payload.pagamentos
      : [];
    const totais = (payload && payload.totais) || {};
    const endEmit = emitente.endereco || {};
    const endDest = destinatario.endereco || {};

    // O cadastro da Empresa aceita CPF (11) ou CNPJ (14) no campo cnpj
    const docEmit = _soDigitos(emitente.cnpj);
    const docDest = _soDigitos(destinatario.documento);
    const ufEmit = (endEmit.uf || "").toUpperCase();
    const ufDest = (endDest.uf || "").toUpperCase();
    const localDestino = ufEmit && ufEmit === ufDest ? "1" : "2";

    const ieDest = _limpar(destinatario.ie);
    const ehNfce = tipoDocumento === "nfce";

    const corpo = {
      natureza_operacao:
        (payload && payload.natureza_operacao) || "VENDA DE MERCADORIA",
      data_emissao: _dataHora(new Date()),
      tipo_documento: "1",
      local_destino: localDestino,
      finalidade_emissao: "1",
      // NFC-e só pode ser emitida para consumidor final
      consumidor_final: ehNfce
        ? "1"
        : destinatario.consumidor_final
          ? "1"
          : "0",
      presenca_comprador: String(
        (payload && payload.indicador_presenca) || "1",
      ),
    };
    if (!ehNfce) {
      // dhSaiEnt existe apenas na NF-e (modelo 55)
      corpo.data_entrada_saida = _dataHora(new Date());
    }

    // Emitente — CPF (11 dígitos) ou CNPJ (14 dígitos)
    if (docEmit.length === 14) corpo.cnpj_emitente = docEmit;
    else if (docEmit.length === 11) corpo.cpf_emitente = docEmit;

    corpo.nome_emitente = _limpar(emitente.razao_social);
    corpo.nome_fantasia_emitente = _limpar(emitente.nome_fantasia);
    corpo.inscricao_estadual_emitente = _soDigitos(emitente.ie) || null;
    corpo.inscricao_municipal_emitente = _limpar(emitente.im);
    corpo.cnae_fiscal_emitente = _soDigitos(emitente.cnae) || null;
    corpo.logradouro_emitente = _limpar(endEmit.logradouro);
    corpo.numero_emitente = _limpar(endEmit.numero);
    corpo.complemento_emitente = _limpar(endEmit.complemento);
    corpo.bairro_emitente = _limpar(endEmit.bairro);
    corpo.municipio_emitente = _limpar(endEmit.municipio);
    corpo.codigo_municipio_emitente = _soDigitos(endEmit.codigo_ibge) || null;
    corpo.uf_emitente = ufEmit || null;
    corpo.cep_emitente = _soDigitos(endEmit.cep) || null;
    corpo.telefone_emitente = _soDigitos(emitente.telefone) || null;

    // Destinatario
    if (docDest.length >= 14) corpo.cnpj_destinatario = docDest;
    else if (docDest.length) corpo.cpf_destinatario = docDest;
    if (destinatario.razao_social) {
      corpo.nome_destinatario = _limpar(destinatario.razao_social);
    }
    corpo.logradouro_destinatario = _limpar(endDest.logradouro);
    corpo.numero_destinatario = _limpar(endDest.numero);
    corpo.complemento_destinatario = _limpar(endDest.complemento);
    corpo.bairro_destinatario = _limpar(endDest.bairro);
    corpo.municipio_destinatario = _limpar(endDest.municipio);
    corpo.codigo_municipio_destinatario = _soDigitos(endDest.codigo_ibge) || null;
    corpo.uf_destinatario = ufDest || null;
    corpo.cep_destinatario = _soDigitos(endDest.cep) || null;
    corpo.telefone_destinatario = _soDigitos(destinatario.telefone) || null;
    if (destinatario.email) corpo.email_destinatario = _limpar(destinatario.email);
    // Indicador da IE do destinatario so faz sentido quando identificado
    if (docDest.length) {
      corpo.indicador_inscricao_estadual_destinatario = ieDest ? "1" : "9";
    }

// Itens de produto
    corpo.itens = itens.map((item, idx) => {
      const quantidade = item.quantidade || 1;
      const valorUnit = item.valor_unitario ?? 0;
      const valorBruto =
        item.valor_total ?? item.subtotal ?? quantidade * valorUnit;
      const ncm = _soDigitos(item.ncm);
      const icmsSituacao = FocusNFeAdapter._baseICMS(item, config);
      return {
        numero_item: idx + 1,
        codigo_produto: String(_limpar(item.codigo_produto) || idx + 1),
        descricao: String(item.descricao || "").slice(0, 120) || "Produto",
        codigo_ncm: ncm || null,
        cest: item.cest ? String(item.cest) : null,
        cfop: String(item.cfop || "5102"),
        unidade_comercial: item.unidade || "UN",
        quantidade_comercial: _numero(quantidade, 4),
        valor_unitario_comercial: _numero(valorUnit, 10),
        unidade_tributavel: item.unidade || "UN",
        quantidade_tributavel: _numero(quantidade, 4),
        valor_unitario_tributavel: _numero(valorUnit, 10),
        valor_bruto: _numero(valorBruto, 2),
        valor_desconto: _numero(item.desconto || 0, 2),
        inclui_no_total: 1,
        icms_origem: String(item.origem ?? 0),
        icms_situacao_tributaria: icmsSituacao,
        pis_situacao_tributaria: item.cst_pis || "07",
        cofins_situacao_tributaria: item.cst_cofins || "07",
        valor_total_item: _numero(valorBruto, 2),
      };
    });

    // Totais
    const total = totais.valor_total ?? totais.final;
    if (total != null) corpo.valor_total = _numero(total, 2);

    // Pagamentos
    const formas = pagamentos.length
      ? pagamentos
      : [{ forma_pagamento: "01", valor: total || 0 }];
    corpo.pagamentos = formas.map((p) => {
      const jaCodificada =
        p.forma_pagamento && /^\d{1,2}$/.test(String(p.forma_pagamento));
      const forma = String(p.forma || "")
        .toLowerCase()
        .replace(/\s/g, "_");
      return {
        indicador_pagamento: "1",
        forma_pagamento: jaCodificada
          ? String(p.forma_pagamento).padStart(2, "0")
          : FORMAS_PAGAMENTO_FOCUS[forma] || "99",
        valor_pagamento: _numero(p.valor, 2),
      };
    });

    // Remove campos nulos/vazios (as validacoes obrigatorias ficam no transmitir)
    for (const chave of Object.keys(corpo)) {
      if (corpo[chave] === null || corpo[chave] === undefined) {
        delete corpo[chave];
      }
    }

    return corpo;
  }
/** Normaliza a resposta da Focus para o contrato do servico fiscal. */
  _normalizar(resposta, ref) {
    const status = String((resposta && resposta.status) || "");
    const base = {
      ref,
      sucesso: true,
      status: status || "indefinido",
      numero: resposta && (resposta.numero ?? null),
      serie: resposta && (resposta.serie ?? null),
      chave_acesso:
        (resposta &&
          (resposta.chave_nfe ||
            resposta.chave_nfce ||
            resposta.chave)) ||
        null,
      protocolo:
        (resposta && (resposta.protocolo_sefaz || resposta.protocolo)) ||
        null,
      xml: (resposta && resposta.xml) || null,
      caminho_xml:
        (resposta &&
          (resposta.caminho_xml_nota_fiscal || resposta.caminho_xml)) ||
        null,
      caminho_danfe: (resposta && resposta.caminho_danfe) || null,
      dados: resposta || {},
    };

    if (status === "erro_autorizacao" || status === "erro_cancelamento") {
      const e = new Error(
        this._montarErro(
          "A SEFAZ nao autorizou a operacao via Focus NFe.",
          resposta,
        ),
      );
      e.code = "FOCUS_RECUSOU";
      throw e;
    }

    return base;
  }

  /**
   * Transmite NF-e ou NFC-e. POST /{nfe|nfce}?ref={referencia}
   * O tipo do documento vem de payload._notaTipo (gravado pelo servico fiscal);
   * cai em "nfe" quando ausente.
   */
  async transmitir(payload) {
    const doc =
      payload && (payload._notaTipo === "nfce" || payload.tipo === "nfce")
        ? "nfce"
        : "nfe";

    const ref = _referencia(payload);
    const corpo = FocusNFeAdapter.montarPayloadNFe(
      payload,
      this.config,
      doc,
    );

    // ── Validacoes locais antes de gastar a chamada (mensagens acionaveis) ──
    if (!corpo.cnpj_emitente && !corpo.cpf_emitente) {
      throw new Error(
        "CPF/CNPJ do emitente nao informado ou invalido. Preencha o CPF (11 digitos) ou o " +
          "CNPJ (14 digitos) da empresa em Configuracoes -> Empresa. Importante: use o mesmo " +
          "documento com que a empresa foi cadastrada no painel do provedor.",
      );
    }
    if (!corpo.itens || !corpo.itens.length) {
      throw new Error("A venda nao possui itens para emitir.");
    }
    const itensSemNcm = corpo.itens.filter((i) => !i.codigo_ncm);
    if (itensSemNcm.length) {
      throw new Error(
        "Todo produto precisa ter NCM cadastrado para emissao fiscal. Itens sem NCM: " +
          itensSemNcm.map((i) => i.descricao).join(", ") +
          ".",
      );
    }

    if (doc === "nfe") {
      // NF-e (modelo 55) EXIGE destinatario identificado com endereco completo.
      // Para venda de balcao sem identificacao, use NFC-e.
      const faltando = [];
      if (!corpo.nome_destinatario) faltando.push("nome do cliente");
      if (!corpo.cpf_destinatario && !corpo.cnpj_destinatario)
        faltando.push("CPF/CNPJ do cliente");
      if (!corpo.logradouro_destinatario) faltando.push("logradouro");
      if (!corpo.numero_destinatario) faltando.push("numero do endereco");
      if (!corpo.bairro_destinatario) faltando.push("bairro");
      if (!corpo.municipio_destinatario) faltando.push("municipio");
      if (!corpo.uf_destinatario) faltando.push("UF");
      if (faltando.length) {
        throw new Error(
          "NF-e exige cliente cadastrado com CPF/CNPJ e endereco completo. Faltando: " +
            faltando.join(", ") +
            ". Para venda de balcao sem identificacao do cliente, marque 'Emitir NFC-e' " +
            "em Configuracoes -> Fiscal.",
        );
      }
    }

    const resposta = await this._request(
      "POST",
      `/${doc}?ref=${encodeURIComponent(ref)}`,
      { body: corpo },
    );

    const normalizado = this._normalizar(resposta, ref);

    if (
      normalizado.status === "autorizado" &&
      normalizado.caminho_xml &&
      !normalizado.xml
    ) {
      try {
        normalizado.xml = await this._baixar(normalizado.caminho_xml);
      } catch (_) {
        // XML autorizado pode nao estar disponivel de imediato - segue sem ele.
      }
    }

    return normalizado;
  }

  /** Consulta o status de um documento pela referencia. GET /{doc}/{referencia} */
  async consultar(chaveOuRequisicao, tipoDocumento = "nfe") {
    if (!chaveOuRequisicao) {
      const e = new Error(
        "Referencia (numero_requisicao) e obrigatoria para consultar no Focus NFe.",
      );
      e.code = "FOCUS_SEM_REF";
      throw e;
    }
    const ref = String(chaveOuRequisicao);

    if (/^\d{44}$/.test(ref)) {
      throw new Error(
        "Focus NFe consulta notas pela referencia do sistema (numero_requisicao), " +
          "nao pela chave de acesso. Informe a referencia salva na nota.",
      );
    }

    // Tenta primeiro o documento informado; se nao existir (404), tenta o outro
    const docs =
      tipoDocumento === "nfce" ? ["nfce", "nfe"] : ["nfe", "nfce"];

    let ultimoErro = null;
    for (let i = 0; i < docs.length; i++) {
      try {
        const resposta = await this._request(
          "GET",
          `/${docs[i]}/${encodeURIComponent(ref)}`,
        );
        return this._normalizar(resposta, ref);
      } catch (err) {
        ultimoErro = err;
        if (err && err.code === "FOCUS_404" && i < docs.length - 1) {
          continue; // ref pode ter sido criada como o outro documento
        }
        throw err;
      }
    }
    throw ultimoErro;
  }
/**
   * Cancela uma NF-e/NFC-e autorizada (dentro do prazo legal).
   * DELETE /{nfe|nfce}/{referencia} com body { justificativa }
   */
  async cancelar(chaveAcesso, motivo, tipoDocumento = "nfe") {
    const justificativa = String(motivo || "").trim();
    if (justificativa.length < 15) {
      throw new Error(
        "Justificativa do cancelamento deve ter no minimo 15 caracteres.",
      );
    }

    if (/^\d{44}$/.test(String(chaveAcesso))) {
      throw new Error(
        "Para cancelar no Focus NFe informe a referencia da nota (numero_requisicao), " +
          "nao apenas a chave de acesso.",
      );
    }

    const doc = tipoDocumento === "nfce" ? "nfce" : "nfe";
    const resposta = await this._request(
      "DELETE",
      `/${doc}/${encodeURIComponent(chaveAcesso)}`,
      { body: { justificativa } },
    );
    const normalizado = this._normalizar(resposta, chaveAcesso);
    if (normalizado.status === "cancelado") {
      return { sucesso: true, status: "cancelado", dados: resposta };
    }
    return normalizado;
  }

  /**
   * Inutiliza uma faixa de numeracao de NF-e (sincrono).
   * POST /nfe/inutilizacao
   */
  async inutilizar(serie, numeroInicial, numeroFinal, motivo) {
    const justificativa = String(motivo || "").trim();
    if (justificativa.length < 15) {
      throw new Error(
        "Justificativa da inutilizacao deve ter no minimo 15 caracteres.",
      );
    }

    const cnpj =
      (this.config && this.config.cnpj_emitente) ||
      (this.config && this.config.cnpj) ||
      null;
    if (!cnpj) {
      throw new Error(
        "CNPJ do emitente nao configurado para a inutilizacao de numeracao.",
      );
    }

    const resposta = await this._request("POST", "/nfe/inutilizacao", {
      body: {
        cnpj: _soDigitos(cnpj),
        serie: String(serie || "1"),
        numero_inicial: String(numeroInicial),
        numero_final: String(numeroFinal),
        justificativa,
      },
    });

    const status = String((resposta && resposta.status) || "");
    if (status === "erro_autorizacao") {
      const e = new Error(
        this._montarErro(
          "Inutilizacao rejeitada pela SEFAZ via Focus NFe.",
          resposta,
        ),
      );
      e.code = "FOCUS_RECUSOU";
      throw e;
    }

    return {
      sucesso: status === "autorizado",
      status: status === "autorizado" ? "inutilizada" : status || "indefinido",
      protocolo: resposta && resposta.protocolo_sefaz,
      dados: resposta || {},
    };
  }
/**
   * Baixa o DANFE em PDF (pela referencia da nota - a Focus v2 entrega o PDF
   * atraves do caminho retornado na consulta/emissao).
   */
  async downloadDanfe(chaveAcesso) {
    const consulta = await this.consultar(chaveAcesso);
    if (!consulta.caminho_danfe) {
      throw new Error("URL do DANFe nao disponivel no Focus NFe para esta nota.");
    }
    return this._baixar(consulta.caminho_danfe, { buffer: true });
  }

  /** Baixa o XML autorizado (referencia da nota). */
  async downloadXml(chaveAcesso) {
    const consulta = await this.consultar(chaveAcesso);
    if (!consulta.caminho_xml) {
      throw new Error("URL do XML nao disponivel no Focus NFe para esta nota.");
    }
    return this._baixar(consulta.caminho_xml);
  }
}

module.exports = FocusNFeAdapter;