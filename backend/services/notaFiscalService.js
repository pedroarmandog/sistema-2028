"use strict";

/**
 * notaFiscalService
 *
 * Serviço centralizado que integra o MÓDULO FISCAL existente ao ciclo de venda.
 * É o ÚNICO ponto do sistema que decide o comportamento fiscal após uma venda
 * ser finalizada (nova-venda e agendamento-detalhes compartilham esta camada).
 *
 * PRINCÍPIOS:
 *  - Reutiliza ConfiguracaoFiscal, NotaFiscal, FiscalPayloadBuilder e
 *    FiscalServiceFactory — NÃO recria o módulo fiscal.
 *  - NÃO altera tabelas/enums existentes: os status canônicos já cobrem o ciclo
 *      rascunho (pendente de emissão) → aguardando (emitindo) → autorizada
 *      → erro | denegada | cancelada.
 *  - NÃO simula autorização: `autorizada` só é gravada quando o provedor
 *    realmente responde sucesso. Sem certificado/provedor a tentativa fica
 *    registrada como `erro` com mensagem clara.
 *  - Vendas sem NF habilitada: `resolveTipoNota` retorna null e o fluxo
 *    simplesmente não cria registros (comportamento anterior preservado).
 */

const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");

const {
  Venda,
  Cliente,
  Empresa,
  Agendamento,
  ConfiguracaoFiscal,
  NotaFiscal,
  Produto,
} = require("../models");

const { FiscalPayloadBuilder, FiscalServiceFactory } = require("./fiscal");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

function _asArray(valor) {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === "string") {
    try {
      const p = JSON.parse(valor);
      return Array.isArray(p) ? p : [];
    } catch (_) {}
  }
  return [];
}

function _asObject(valor) {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor;
  if (typeof valor === "string") {
    try {
      return JSON.parse(valor) || {};
    } catch (_) {}
  }
  return {};
}

/** Extrai CPF (11) ou CNPJ (14) do cliente sem formatação */
function _documentoCliente(cliente) {
  if (!cliente) return null;
  const cpf = String(cliente.cpf || "").replace(/\D/g, "");
  if (cpf) return cpf;
  const cnpj = String(cliente.cnpj || "").replace(/\D/g, "");
  return cnpj || null;
}

/** Recupera o agendamento vinculado a uma venda (via totais.agendamentoId) */
function _agendamentoIdVenda(venda) {
  if (!venda) return null;
  const totais = _asObject(venda.totais);
  return totais?.agendamentoId || totais?.agendamento_id || null;
}

/** Sintetiza um objeto "agendamento" a partir da venda (usado para NFS-e) */
function _sinteticaDeVenda(venda) {
  const itens = _asArray(venda && venda.itens);
  return {
    servicos: itens.map((item, idx) => ({
      id: item?.produto?.id || idx + 1,
      nome: item?.produto?.nome || item?.descricao || item?.nome || "Serviço",
      quantidade: item?.quantidade || 1,
      valor: item?.valorUnitario ?? item?.valor_unitario ?? 0,
      item_lista_servico: item?.item_lista_servico || null,
      municipio_incidencia_iss: item?.municipio_incidencia_iss || null,
      natureza_operacao_iss: item?.natureza_operacao_iss || null,
      impostoISS: item?.impostoISS ?? item?.imposto_iss ?? null,
    })),
    totalPago: venda && (venda.totalPago || 0),
  };
}
/**
 * Detecta se o cliente é pessoa jurídica (destinatário com CNPJ).
 * Usado pela regra do Ajuste SINIEF 11/2025: NFC-e somente para pessoa física.
 */
function _clienteEhPJ(cliente) {
  if (!cliente) return false;
  if (String(cliente.tipo_pessoa || "").toUpperCase() === "J") return true;
  return String(cliente.cnpj || "").replace(/\D/g, "").length > 0;
}

/**
 * Define o tipo de nota mais adequado para uma venda, respeitando a
 * configuração da empresa (mesma regra documentada no FiscalPayloadBuilder):
 *  - Serviço (vinda de agendamento ou item tipo serviço) → NFS-e se habilitada;
 *  - Produtos → NFC-e se habilitada, senão NF-e;
 *  - Se nada habilitado → null (fluxo fiscal não se aplica a esta venda).
 *
 * REGRA FISCAL (Ajuste SINIEF 11/2025 — vigente desde 03/11/2025): NFC-e
 * somente pode ser emitida para consumidor final PESSOA FÍSICA. Destinatário
 * PJ (CNPJ) exige NF-e modelo 55: quando a empresa também emite NF-e o tipo é
 * trocado automaticamente; caso contrário retorna null (bloqueia a emissão).
 * Venda sem cliente identificado (balcão) continua podendo ser NFC-e.
 */
function resolveTipoNota(venda, config, agendamentoId = null, cliente = null) {
  if (!config) return null;

  const idAgendamento = agendamentoId || _agendamentoIdVenda(venda);
  const itens = _asArray(venda && venda.itens);
  const tipos = itens.map((i) =>
    String(i?.tipo || (i && i.produto && i.produto.tipo) || "").toLowerCase(),
  );
  const ehServico =
    !!idAgendamento ||
    tipos.includes("servico") ||
    tipos.includes("serviço") ||
    tipos.includes("servicos");

  let tipo = null;
  if (ehServico && config.emitir_nfse) tipo = "nfse";
  else if (config.emitir_nfce) tipo = "nfce";
  else if (config.emitir_nfe) tipo = "nfe";
  else if (config.emitir_nfse) tipo = "nfse";

  // Destinatário PJ não pode receber NFC-e (Ajuste SINIEF 11/2025)
  if (tipo === "nfce" && _clienteEhPJ(cliente)) {
    if (config.emitir_nfe) return "nfe";
    return null; // PJ e apenas NFC-e habilitada → sem fluxo válido
  }
  return tipo;
}

/**
 * Marca uma nota (e a venda vinculada) com erro de emissão, sem nunca
 * simular autorização.
 */
async function _marcarErroNota(nota, venda, fase, erro) {
  let mensagem =
    (erro && erro.message) || String(erro || "Erro desconhecido na emissão");

  // Mensagens amigáveis para o cenário de testes internos (sem certificado)
  if (/não implementado/i.test(mensagem)) {
    mensagem =
      "Emissão real não iniciada: a integração com o provedor de notas ainda não está ativa nesta instalação (testes internos sem certificado digital).";
  }

  // Provedor bloqueou a emissão porque a empresa/CNPJ ainda não está habilitado
  // para o tipo de documento (ex.: Focus NFe — "Empresa ainda não habilitada
  // para emissão de NFCe"). Orienta o usuário em vez de devolver o texto cru.
  if (/n[ãa]o habilitada para emiss[ãa]o/i.test(mensagem)) {
    mensagem =
      "Empresa ainda não habilitada para este tipo de documento no provedor fiscal " +
      "(ex.: Focus NFe). Habilite a empresa para NFC-e/NF-e no painel do provedor ou " +
      "contate o suporte deles. Alternativa para testes: ajuste os tipos de emissão " +
      "(NF-e/NFC-e/NFS-e) em Configurações → Fiscal.";
  }

  const resposta = {
    sucesso: false,
    fase,
    mensagem,
    detalhe_erro: (erro && erro.message) || null,
    data: new Date().toISOString(),
  };

  await nota
    .update({ status: "erro", resposta_api: resposta })
    .catch(() => {});

  if (venda && !["emitida", "cancelada"].includes(venda.status_fiscal)) {
    venda.status_fiscal = "erro";
    await venda.save().catch(() => {});
  }
}

/**
 * Consulta o provedor algumas vezes até a nota ter desfecho (autorizada ou
 * cancelada). Retorna o resultado final ou null se continuar processando.
 * Usado no fluxo assíncrono (ex.: Focus NFe responde "processando_autorizacao").
 */
async function _consultarAteFinalizar(
  service,
  referencia,
  tipoDocumento = "nfe",
  maxTentativas = 4,
  intervaloMs = 2000,
) {
  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    await new Promise((r) => setTimeout(r, intervaloMs));
    try {
      const st = await service.consultar(referencia, tipoDocumento);
      const status = String((st && st.status) || "");
      if (["autorizado", "cancelado", "erro_autorizacao"].includes(status)) {
        return st;
      }
    } catch (_) {
      // 404/instabilidade logo após o envio é comum — segue tentando
    }
  }
  return null;
}

/**
 * Mescla o cadastro ATUAL dos produtos dentro do snapshot `produto` de cada
 * item da venda. Função PURA (sem banco) — usada pela enriquecedora e
 * exportada para testes.
 *
 * A venda guarda apenas { nome, id } no snapshot; sem este merge, produtos com
 * NCM/CEST/CFOP cadastrados DEPOIS da venda não teriam os dados fiscais na
 * hora da emissão.
 */
function _mesclarCadastroNosItens(itens, produtos) {
  const mapa = new Map();
  for (const p of Array.isArray(produtos) ? produtos : []) {
    const idNum = Number(p && p.id);
    if (Number.isInteger(idNum) && idNum > 0) {
      mapa.set(idNum, p && p.get ? p.get({ plain: true }) : p);
    }
  }
  if (!mapa.size) return itens;

  for (const it of Array.isArray(itens) ? itens : []) {
    if (!it || typeof it !== "object") continue;
    const pid = Number(
      (it.produto && it.produto.id) ?? it.produtoId ?? it.id,
    );
    const cadastro = mapa.get(pid);
    if (!cadastro) continue;
    it.produto = {
      ...(it.produto && typeof it.produto === "object" ? it.produto : {}),
      ...cadastro,
    };
  }
  return itens;
}

/**
 * Enriquece venda.itens com o cadastro atual dos produtos (em memória — não
 * altera a venda gravada). Chamada antes de montar o payload fiscal.
 */
async function _enriquecerItensVendaComCadastro(venda, { produtoModel } = {}) {
  try {
    if (!venda) return;
    const itens = _asArray(venda.itens);
    if (!itens.length) return;

    const ids = [];
    for (const it of itens) {
      const pid = Number(
        (it && ((it.produto && it.produto.id) ?? it.produtoId ?? it.id)) ||
          0,
      );
      if (Number.isInteger(pid) && pid > 0) ids.push(pid);
    }
    if (!ids.length) return;

    const ProdutoModel = produtoModel || Produto;
    const produtos = await ProdutoModel.findAll({
      where: { id: { [Op.in]: [...new Set(ids)] } },
    });

    _mesclarCadastroNosItens(itens, produtos);

    // Reflete em venda.itens quando veio como array (JSON) — sem persistir.
    if (Array.isArray(venda.itens)) venda.itens = itens;
  } catch (e) {
    console.warn(
      "[fiscal] Falha ao enriquecer itens com cadastro de produtos:",
      e && e.message,
    );
  }
}

/**
 * Núcleo da emissão: executa a transmissão via FiscalServiceFactory + payload.
 * Sempre deixa o ciclo da nota em um estado coerente (autorizada/erro).
 */
async function _emitirNotaRecord(nota) {
  if (nota.status === "autorizada") {
    return { nota, emitida: true, status: "autorizada", motivo: null };
  }

  const venda = nota.venda_id
    ? await Venda.findByPk(nota.venda_id).catch(() => null)
    : null;

  const config = await ConfiguracaoFiscal.findOne({
    where: { empresa_id: nota.empresa_id },
  });

  // ── Pré-validações de preparação (não exigem chamada ao provedor) ──
  let preparacaoErro = null;
  if (!config) {
    preparacaoErro =
      "Configuração fiscal não encontrada para esta empresa. Configure o módulo em Configurações → Fiscal.";
  } else if (!config.provedor_api) {
    preparacaoErro =
      "Nenhum provedor de emissão selecionado. Acesse Configurações → Fiscal e selecione um provedor.";
  } else if (!config.token_api && !config.certificado_digital) {
    preparacaoErro =
      "Emissão real não iniciada: credencial do provedor ausente (testes internos sem certificado digital configurado).";
  } else if (!config.emitir_nfe && !config.emitir_nfce && !config.emitir_nfse) {
    preparacaoErro =
      "Nenhum tipo de emissão (NF-e/NFC-e/NFS-e) está habilitado na configuração fiscal.";
  }

  if (preparacaoErro) {
    await _marcarErroNota(nota, venda, "preparacao", new Error(preparacaoErro));
    const notaAtual = await NotaFiscal.findByPk(nota.id);
    return {
      nota: notaAtual,
      emitida: false,
      status: "erro",
      motivo: preparacaoErro,
    };
  }

  try {
    const empresa = nota.empresa_id
      ? await Empresa.findByPk(nota.empresa_id)
      : null;
    const cliente =
      venda && venda.clienteId
        ? await Cliente.findByPk(venda.clienteId).catch(() => null)
        : null;

    // Dados fiscais SEMPRE do cadastro atual dos produtos: a venda grava
    // apenas um snapshot mínimo (nome+id) nos itens; sem isto, produtos com
    // NCM/CEST/CFOP cadastrados DEPOIS da venda não emitiriam.
    if (nota.tipo !== "nfse") {
      await _enriquecerItensVendaComCadastro(venda);
    }

    let payload;
    if (nota.tipo === "nfse") {
      const idAgendamento = nota.agendamento_id || _agendamentoIdVenda(venda);
      let agendamento = null;
      if (idAgendamento) {
        agendamento = await Agendamento.findByPk(idAgendamento).catch(() => null);
      }
      const origem = agendamento || _sinteticaDeVenda(venda);
      payload = FiscalPayloadBuilder.buildNFSe(origem, empresa, config, cliente);
    } else {
      payload = FiscalPayloadBuilder.buildNFe(venda, empresa, config, cliente);
    }

    // Referência única da nota no provedor (usada em consultas/cancelamentos)
    payload._notaId = nota.id;
    // Tipo real do documento (nfe | nfce) — define o endpoint do provedor
    payload._notaTipo = nota.tipo;

    // Marca como "aguardando" (Emitindo) antes de chamar o provedor
    await nota
      .update({
        status: "aguardando",
        numero_requisicao: nota.numero_requisicao ?? null,
      })
      .catch(() => {});

    const service = FiscalServiceFactory.create(config);

    let resposta = null;

    // Se a nota já tem referência de uma tentativa anterior (enviada e ainda
    // em processamento), consulta o status atual ANTES de retransmitir —
    // evita reenviar uma referência já aceita pelo provedor.
    if (
      typeof service.consultar === "function" &&
      nota.numero_requisicao &&
      !["autorizada", "cancelada", "inutilizada"].includes(nota.status)
    ) {
      try {
        const st = await service.consultar(
          nota.numero_requisicao,
          nota.tipo,
        );
        const stStatus = String((st && st.status) || "");
        if (["autorizado", "cancelado"].includes(stStatus)) {
          resposta = st; // já tem desfecho — usa direto
        } else if (stStatus !== "erro_autorizacao") {
          resposta = st; // ainda processando — segue para o fluxo de espera
        }
        // erro_autorizacao → pode reenviar com a mesma referência
      } catch (_) {
        resposta = null; // consulta falhou → segue para nova transmissão
      }
    }

    // Transmite (apenas se a consulta anterior não trouxe desfecho)
    if (!resposta) {
      resposta = await service.transmitir(payload);

      // Fluxo assíncrono: provedor aceitou e está processando na SEFAZ
      if (
        ["processando_autorizacao", "aguardando"].includes(
          String((resposta && resposta.status) || ""),
        )
      ) {
        const referencia =
          resposta?.ref || resposta?.referencia || resposta?.numero_requisicao;
        if (referencia) {
          await nota
            .update({
              status: "aguardando",
              numero_requisicao: String(referencia),
              resposta_api: resposta.dados || resposta,
            })
            .catch(() => {});
          const final = await _consultarAteFinalizar(
            service,
            String(referencia),
            nota.tipo,
          );
          if (
            final &&
            ["autorizado", "cancelado"].includes(String(final.status))
          ) {
            resposta = final;
          }
        }
      }
    }

    // Ainda em processamento após a espera — mantém "aguardando"
    if (
      resposta &&
      ["processando_autorizacao", "aguardando"].includes(
        String(resposta.status || ""),
      )
    ) {
      await nota.update({
        status: "aguardando",
        numero_requisicao:
          resposta.ref || resposta.referencia || nota.numero_requisicao,
        resposta_api: resposta.dados || resposta,
      });
      const notaAtualizada = await NotaFiscal.findByPk(nota.id);
      return {
        nota: notaAtualizada,
        emitida: false,
        status: "aguardando",
        motivo:
          "Nota enviada ao provedor e em processamento na SEFAZ. Em alguns segundos, " +
          "clique em 'Tentar emitir novamente' — o sistema consultará o status e concluirá.",
      };
    }

    // Cancelada no provedor (caso raro, em retentativa)
    if (resposta && String(resposta.status || "") === "cancelado") {
      await nota.update({
        status: "cancelada",
        motivo_cancelamento: "Cancelada no provedor fiscal.",
        resposta_api: resposta.dados || resposta,
      });
      if (venda && venda.status_fiscal !== "emitida") {
        venda.status_fiscal = "cancelada";
        await venda.save().catch(() => {});
      }
      const notaAtualizada = await NotaFiscal.findByPk(nota.id);
      return {
        nota: notaAtualizada,
        emitida: false,
        status: "cancelada",
        motivo: "A nota consta como cancelada no provedor fiscal.",
      };
    }

    // ── Sucesso real do provedor ──
    const dados =
      (resposta && (resposta.dados || resposta.notaFiscal || resposta.nota)) ||
      resposta ||
      {};
    const numero = dados.numero ?? resposta?.numero ?? nota.numero ?? null;
    const serie = dados.serie || resposta?.serie || nota.serie || null;
    const chave =
      dados.chaveAcesso ||
      dados.chave_acesso ||
      dados.chave_nfe ||
      dados.chave ||
      resposta?.chaveAcesso ||
      resposta?.chave_acesso ||
      resposta?.chave ||
      null;
    const protocolo =
      dados.protocolo || resposta?.protocolo || resposta?.id || null;
    const xml = dados.xml || resposta?.xml || null;

    await nota.update({
      status: "autorizada",
      numero: numero ?? nota.numero,
      serie: serie ?? nota.serie,
      chave_acesso: chave || nota.chave_acesso,
      protocolo: protocolo || null,
      numero_requisicao:
        resposta?.ref || resposta?.referencia || nota.numero_requisicao,
      xml_autorizado: xml || nota.xml_autorizado,
      data_emissao: new Date(),
      data_autorizacao: new Date(),
      resposta_api: resposta || { sucesso: true },
    });

    if (venda) {
      venda.status_fiscal = "emitida";
      venda.numero_nfe = numero ?? null;
      venda.serie_nfe = serie ?? null;
      venda.chave_acesso_nfe = chave || null;
      venda.protocolo_nfe = protocolo || null;
      venda.data_emissao_nfe = new Date();
      venda.xml_nfe = xml || null;
      await venda.save().catch(() => {});
    }

    const notaAtualizada = await NotaFiscal.findByPk(nota.id);
    return {
      nota: notaAtualizada,
      emitida: true,
      status: "autorizada",
      motivo: null,
    };
  } catch (err) {
    // Adapters são stubs hoje → cai aqui sem simular autorização
    await _marcarErroNota(nota, venda, "transmissao", err);
    const notaAtualizada = await NotaFiscal.findByPk(nota.id);
    return {
      nota: notaAtualizada,
      emitida: false,
      status: "erro",
      motivo:
        (err && err.message) ||
        "Erro ao tentar transmitir a nota fiscal para o provedor.",
    };
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// API pública do serviço
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dados mínimos que os fluxos de venda precisam para decidir os botões/regras.
 * Rota somente-auth (sem exigePermissao) para não bloquear operadores de venda.
 */
async function fluxoParaFront(empresaId) {
  const config = await ConfiguracaoFiscal.findOne({
    where: { empresa_id: empresaId },
  });

  if (!config || config.ativo === false) {
    return {
      configurado: false,
      ativo: false,
      modo_emissao: "manual",
      ambiente: "homologacao",
      emitir_nfe: false,
      emitir_nfce: false,
      emitir_nfse: false,
      provedor_api: null,
    };
  }

  return {
    configurado: true,
    ativo: true,
    modo_emissao: config.modo_emissao,
    ambiente: config.ambiente,
    emitir_nfe: !!config.emitir_nfe,
    emitir_nfce: !!config.emitir_nfce,
    emitir_nfse: !!config.emitir_nfse,
    provedor_api: config.provedor_api || null,
  };
}

/**
 * Registra (ou reaproveita) uma NotaFiscal pendente (status 'rascunho')
 * vinculada à venda. Sem emitir. É o que alimenta a Central Fiscal nos
 * modos manual / lote / confirmação "não emitir agora".
 */
async function registrarNotaPendente({ vendaId, empresaId }) {
  const venda = await Venda.findByPk(vendaId);
  if (!venda) {
    const e = new Error("Venda não encontrada");
    e.status = 404;
    throw e;
  }
  if (Number(venda.empresa_id) !== Number(empresaId)) {
    const e = new Error("Acesso negado");
    e.status = 403;
    throw e;
  }

  const config = await ConfiguracaoFiscal.findOne({
    where: { empresa_id: empresaId },
  });
  if (!config) {
    const e = new Error(
      "Configuração fiscal não encontrada para esta empresa.",
    );
    e.status = 400;
    throw e;
  }

  const idAgendamento = _agendamentoIdVenda(venda);

  // Cliente carregado ANTES de resolver o tipo: a regra do Ajuste SINIEF
  // 11/2025 depende do documento do destinatário (PJ → NF-e, não NFC-e).
  const cliente = venda.clienteId
    ? await Cliente.findByPk(venda.clienteId).catch(() => null)
    : null;

  const tipo = resolveTipoNota(venda, config, idAgendamento, cliente);
  if (!tipo) {
    // Diferencia a causa para orientar corretamente o usuário
    const msg = _clienteEhPJ(cliente)
      ? "Destinatário pessoa jurídica (CNPJ) exige NF-e (modelo 55), mas a " +
        "NF-e não está habilitada. Habilite 'Emitir NF-e' em Configurações → Fiscal."
      : "Emissão de nota fiscal não habilitada para esta venda (configuração da empresa).";
    const e = new Error(msg);
    e.status = 400;
    throw e;
  }

  // Reaproveitar nota pendente existente (idempotente por venda)
  let nota = await NotaFiscal.findOne({
    where: {
      empresa_id: empresaId,
      venda_id: vendaId,
      status: { [Op.in]: ["rascunho", "erro", "aguardando"] },
    },
    order: [["createdAt", "DESC"]],
  });

  // Se a nota reaproveitada tem tipo diferente do necessário agora (ex.:
  // pendente antiga como NFC-e e a regra PJ→NF-e passou a valer), atualiza —
  // apenas em rascunho/erro. Notas "aguardando" já podem ter sido transmitidas:
  // mantêm o tipo original para consulta/retransmissão funcionar.
  if (
    nota &&
    nota.tipo !== tipo &&
    ["rascunho", "erro"].includes(nota.status)
  ) {
    await nota.update({ tipo }).catch(() => {});
  }

  if (!nota) {
    const totais = _asObject(venda.totais);
    nota = await NotaFiscal.create({
      empresa_id: empresaId,
      venda_id: vendaId,
      agendamento_id: idAgendamento || null,
      tipo,
      status: "rascunho",
      ambiente: config.ambiente || "homologacao",
      serie: config[`serie_${tipo}`] || null,
      natureza_operacao:
        config.natureza_operacao_padrao || "VENDA DE MERCADORIA",
      destinatario_nome: (cliente && cliente.nome) || venda.cliente || null,
      destinatario_documento: _documentoCliente(cliente),
      valor_total: totais?.final ?? venda.totalPago ?? null,
    });
  }

  // Refletir na venda (não sobrescreve estados já consolidados)
  if (!["emitida", "cancelada"].includes(venda.status_fiscal)) {
    venda.status_fiscal = "pendente";
    await venda.save().catch(() => {});
  }

  return { nota, venda, tipo };
}
/**
 * Emite a nota de uma venda. Primeiro garante o registro pendente (criando se
 * necessário), depois executa a transmissão pelo adapter configurado.
 */
async function emitirNotaPorVenda({ vendaId, empresaId }) {
  const { nota } = await registrarNotaPendente({ vendaId, empresaId });
  return _emitirNotaRecord(nota);
}

/** Emite uma nota já cadastrada (Central Fiscal, lote, retentativa). */
async function emitirNotaPorId({ notaId, empresaId }) {
  const nota = await NotaFiscal.findByPk(notaId);
  if (!nota || Number(nota.empresa_id) !== Number(empresaId)) {
    const e = new Error("Nota fiscal não encontrada");
    e.status = 404;
    throw e;
  }
  return _emitirNotaRecord(nota);
}

/** Emissão em lote (Central Fiscal) — valida a empresa de cada nota. */
async function emitirLote({ notasIds, empresaId }) {
  const ids = Array.isArray(notasIds) ? notasIds : [];
  const resultados = [];

  for (const id of ids) {
    const nota = await NotaFiscal.findByPk(id).catch(() => null);
    if (!nota || Number(nota.empresa_id) !== Number(empresaId)) {
      resultados.push({
        nota_id: id,
        emitida: false,
        status: "erro",
        motivo: "Nota não encontrada ou sem permissão",
      });
      continue;
    }
    const r = await _emitirNotaRecord(nota);
    resultados.push({
      nota_id: id,
      emitida: r.emitida,
      status: r.status,
      motivo: r.motivo || null,
    });
  }

  const emitidas = resultados.filter((r) => r.emitida).length;
  return {
    processadas: resultados.length,
    emitidas,
    comErro: resultados.length - emitidas,
    resultados,
  };
}

/**
 * Gera o PDF de DANFE (impressão) para uma nota AUTORIZADA.
 * Usa pdfkit (já utilizado pelo sistema) para gerar localmente, sem depender
 * da integração do provedor — mas apenas para notas realmente autorizadas.
 */
async function gerarDanfe({ notaId, empresaId }) {
  const nota = await NotaFiscal.findByPk(notaId);
  if (!nota || Number(nota.empresa_id) !== Number(empresaId)) {
    const e = new Error("Nota fiscal não encontrada");
    e.status = 404;
    throw e;
  }
  if (nota.status !== "autorizada") {
    const e = new Error(
      "O DANFE só está disponível para notas autorizadas pelo provedor/SEFAZ.",
    );
    e.status = 400;
    throw e;
  }

  const empresa = nota.empresa_id
    ? await Empresa.findByPk(nota.empresa_id).catch(() => null)
    : null;

  const valor = nota.valor_total
    ? `R$ ${Number(nota.valor_total).toFixed(2).replace(".", ",")}`
    : "—";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(20).text("DANFE");
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`Documento Auxiliar da ${nota.tipo.toUpperCase()}`);

    doc.moveDown();
    doc.fontSize(10);
    doc.text(
      `Nota ${nota.tipo.toUpperCase()} Nº ${nota.numero || "—"} / Série ${nota.serie || "001"}`,
    );
    doc.text(`Chave de acesso: ${nota.chave_acesso || "—"}`);
    doc.text(`Protocolo: ${nota.protocolo || "—"}`);
    doc.text(
      `Dados de emissão: ${nota.data_emissao ? nota.data_emissao.toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}`,
    );
    doc.text(
      `Ambiente: ${nota.ambiente === "producao" ? "Produção" : "Homologação (testes)"}`,
    );

    doc.moveDown();
    doc.text("─".repeat(70));
    doc.text("Emitente:");
    doc.text(
      `${empresa ? (empresa.razaoSocial || empresa.nome) : "— empresa não informada"}`,
    );
    doc.text(`CNPJ: ${(empresa && empresa.cnpj) || "—"}`);

    doc.moveDown();
    doc.text("Destinatário:");
    doc.text(`${nota.destinatario_nome || "—"}`);
    doc.text(`Documento: ${nota.destinatario_documento || "—"}`);

    doc.moveDown();
    doc.text("─".repeat(70));
    doc.text(`Valor total: ${valor}`);
    doc.text(`Natureza da operação: ${nota.natureza_operacao || "—"}`);

    doc.moveDown();
    doc.text(
      "Documento impresso para fins de consulta/controle. Emitido pelo sistema PetHub.",
      { align: "center" },
    );
    doc.end();
  });
}

module.exports = {
  fluxoParaFront,
  registrarNotaPendente,
  emitirNotaPorVenda,
  emitirNotaPorId,
  emitirLote,
  gerarDanfe,
  _mesclarCadastroNosItens,
  _enriquecerItensVendaComCadastro,
};
