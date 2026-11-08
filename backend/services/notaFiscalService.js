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
  if (cliente.tipo_pessoa === "J" && cliente.cnpj) return String(cliente.cnpj).replace(/\D/g, "");
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

// O PetHub não divide automaticamente uma venda mista em dois documentos.
function resolveTipoNota(venda, config, agendamentoId, cliente) {
  if (!config?.ativo) return null;
  const itens = _asArray(venda?.itens);
  const classes = itens.map(item => String(item.tipo || item.produto?.tipo || "").toLowerCase());
  const servicos = classes.filter(tipo => ["servico", "serviço", "servicos", "serviços"].includes(tipo)).length;
  if (servicos && servicos < itens.length) throw Object.assign(new Error("Venda mista: separe produtos e serviços para emitir documentos distintos."), {status:400});
  if (servicos || ((!classes.length || classes.every(tipo => !tipo)) && agendamentoId)) return config.emitir_nfse ? "nfse" : null;
  if ((cliente?.cnpj || cliente?.tipo_pessoa === "J") && config.emitir_nfe) return "nfe";
  return config.emitir_nfce ? "nfce" : config.emitir_nfe ? "nfe" : null;
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
    const id = p?.id;
    if (id != null) {
      mapa.set(String(id), p && p.get ? p.get({ plain: true }) : p);
    }
  }
  if (!mapa.size) return itens;

  for (const it of Array.isArray(itens) ? itens : []) {
    if (!it || typeof it !== "object") continue;
    const pid = String(
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
async function _enriquecerItensVendaComCadastro(venda, { produtoModel, transaction } = {}) {
  const itens = _asArray(venda.itens);
  const idItem = it => it.produto?.id ?? it.produtoId ?? it.id;
  const ids = itens.filter(Boolean).map(idItem).filter(id => id != null).map(String);
  const produtos = ids.length ? await (produtoModel || Produto).findAll({
    transaction,
    where: { empresa_id: venda.empresa_id, id: { [Op.in]: [...new Set(ids)] } }
  }) : [];
  venda.itens = _mesclarCadastroNosItens(itens, produtos);
}

/**
 * Núcleo da emissão: executa a transmissão via FiscalServiceFactory + payload.
 * Sempre deixa o ciclo da nota em um estado coerente (autorizada/erro).
 */
// Antes da transmissão gravamos uma referência estável. Um retry consulta a
// mesma referência, inclusive após falha de rede ou reinício da API.
async function _emitirNotaRecord(nota) {
  const resultado = (motivo = null) => ({
    nota, status: nota.status, emitida: nota.status === "autorizada", motivo,
  });
  if (["autorizada","cancelada","denegada","inutilizada"].includes(nota.status))
    return resultado(nota.status === "autorizada" ? null : "Documento em estado final.");
  const config = await ConfiguracaoFiscal.findOne({ where: { empresa_id: nota.empresa_id } });
  if (!config || !config.ativo || !config["emitir_" + nota.tipo])
    return resultado("Emissão desativada para esta empresa ou tipo de documento.");
  if (nota.ambiente !== config.ambiente)
    return resultado("O ambiente da nota diverge da configuração. A transmissão foi bloqueada.");
  if (nota.tipo === "nfse" || config.provedor_api !== "focusnfe")
    return resultado("Integração disponível para NF-e e NFC-e via Focus. NFS-e e demais provedores ainda não estão implementados.");
  if (!config.token_api) return resultado("Informe o token do ambiente selecionado em Configuração Fiscal.");

  const venda = await Venda.findOne({ where: { id: nota.venda_id || 0, empresa_id: nota.empresa_id } });
  if (!venda) return resultado("Venda da empresa não encontrada. Não há origem válida para transmitir.");
  const ref = nota.numero_requisicao || String(nota.id);
  const estadoAnterior = nota.status;
  const service = FiscalServiceFactory.create(config);
  let resposta;
  let transmitir = !nota.numero_requisicao && estadoAnterior !== "aguardando";
  try {
    if (!transmitir) {
      try { resposta = await service.consultar(ref, nota.tipo); }
      catch (err) {
        if (err.code === "FOCUS_404") {
          if (estadoAnterior === "aguardando" && Date.now() - new Date(nota.updatedAt).getTime() < 120000)
            return resultado("Aguardando confirmação da referência pelo provedor.");
          transmitir = true;
        } else if (err.code === "FOCUS_RECUSOU" && estadoAnterior === "erro") {
          transmitir = true;
        } else throw err;
      }
    }
    if (transmitir) {
      const empresa = await Empresa.findByPk(nota.empresa_id);
      const cliente = venda.clienteId ? await Cliente.findOne({ where: { id: venda.clienteId, empresa_id: nota.empresa_id } }) : null;
      if (!empresa || (venda.clienteId && !cliente)) throw new Error("Emitente ou destinatário não pertence à empresa da nota.");
      await _enriquecerItensVendaComCadastro(venda);
      if (resolveTipoNota(venda, config, _agendamentoIdVenda(venda), cliente) !== nota.tipo)
        throw new Error("O tipo de nota é incompatível com os itens da venda.");
      const payload = FiscalPayloadBuilder.buildNFe(venda, empresa, config, cliente);
      payload._notaId = ref;
      payload._notaTipo = nota.tipo;
      const [reservada] = await NotaFiscal.update({ status: "aguardando", numero_requisicao: ref }, {
        where: { id: nota.id, empresa_id: nota.empresa_id, status: estadoAnterior, updatedAt: nota.updatedAt }
      });
      if (!reservada) { await nota.reload(); return resultado("Outro pedido já processou esta nota."); }
      await nota.reload();
      resposta = await service.transmitir(payload);
    }
  } catch (err) {
    // Uma falha de transporte pode ocorrer após o provedor aceitar a requisição.
    const incerto = nota.numero_requisicao && (err.code === "FOCUS_CONEXAO" || err.status >= 500 || err.status === 429);
    if (incerto) return resultado("Resposta indisponível. Consulte novamente a mesma referência.");
    await gravarResultado("erro", { mensagem: err.message });
    return resultado(err.message);
  }

  async function gravarResultado(status, dados, campos = {}) {
    await NotaFiscal.sequelize.transaction(async transaction => {
      const atual = await NotaFiscal.findByPk(nota.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!["aguardando", "erro", "rascunho"].includes(atual.status)) return;
      const numero_requisicao = atual.numero_requisicao || (estadoAnterior === "aguardando" ? ref : null);
      await atual.update({ status, numero_requisicao, resposta_api: dados, ...campos }, {transaction});
      if (nota.ambiente === "producao") {
        const campoVenda = { autorizada: "emitida", cancelada: "cancelada", erro: "erro", denegada: "erro" }[status];
        if (campoVenda) await venda.update(status === "autorizada" ? {
          status_fiscal: campoVenda, numero_nfe: atual.numero, serie_nfe: atual.serie,
          chave_acesso_nfe: atual.chave_acesso, protocolo_nfe: atual.protocolo,
          data_emissao_nfe: atual.data_emissao, xml_nfe: atual.xml_autorizado
        } : { status_fiscal: campoVenda }, {transaction});
      }
    });
    await nota.reload();
  }

  switch (resposta?.status) {
    case "autorizado": {
      if (!/^\d{44}$/.test(resposta.chave_acesso || "") || resposta.numero == null) {
        await gravarResultado("aguardando", { mensagem: "Resposta de autorização sem número ou chave." });
        return resultado("Confirmação incompleta. Consulte novamente pelo mesmo documento.");
      }
      await gravarResultado("autorizada", resposta, { numero: resposta.numero, serie: resposta.serie || nota.serie,
        chave_acesso: resposta.chave_acesso, protocolo: resposta.protocolo, xml_autorizado: resposta.xml,
        data_emissao: new Date(resposta.dados?.data_emissao || Date.now()), data_autorizacao: new Date() });
      return resultado();
    }
    case "cancelado": await gravarResultado("cancelada", resposta); return resultado("Cancelamento confirmado pelo provedor.");
    case "denegado": await gravarResultado("denegada", resposta); return resultado("Denegação confirmada pelo provedor.");
    case "erro_autorizacao": await gravarResultado("erro", resposta); return resultado("Rejeitada pelo provedor.");
    default:
      await gravarResultado("aguardando", resposta || {});
      return resultado("Sem autorização confirmada. Consulte novamente a mesma nota na Central Fiscal.");
  }
}

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
const registrosEmCurso = new Map();
const emissoesEmCurso = new Map();
function unicaExecucao(mapa, chave, tarefa) {
  if (mapa.has(chave)) return mapa.get(chave);
  const execucao = Promise.resolve().then(tarefa).finally(() => mapa.delete(chave));
  mapa.set(chave, execucao);
  return execucao;
}
function registrarNotaPendente(args) {
  return unicaExecucao(registrosEmCurso, args.empresaId + ":" + args.vendaId, () => registrarComBloqueio(args));
}
async function registrarComBloqueio({ vendaId, empresaId }) {
  return Venda.sequelize.transaction(async transaction => {
    const venda = await Venda.findOne({ where: { id: vendaId, empresa_id: empresaId }, transaction, lock: transaction.LOCK.UPDATE });
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
      where: { empresa_id: empresaId }, transaction,
    });
    if (!config?.ativo) {
      const e = new Error(
        "Configuração fiscal não encontrada para esta empresa.",
      );
      e.status = 400;
      throw e;
    }

    const idAgendamento = _agendamentoIdVenda(venda);

    // Mantém a preferência por NF-e para CNPJ quando ela está habilitada.
    const cliente = venda.clienteId
      ? await Cliente.findOne({ where: { id: venda.clienteId, empresa_id: empresaId }, transaction })
      : null;

    if (venda.clienteId && !cliente) throw Object.assign(new Error("Cliente da venda não pertence à empresa."), {status:400});
    const existentes = await NotaFiscal.findAll({ where: { empresa_id: empresaId, venda_id: vendaId, ambiente: config.ambiente },
      order: [["id","ASC"]], transaction, lock: transaction.LOCK.UPDATE });
    const autorizada = existentes.find(n => n.status === "autorizada");
    if (autorizada) return {nota:autorizada, venda, tipo:autorizada.tipo};
    if (existentes.length > 1) throw Object.assign(new Error("Há mais de um registro fiscal para esta venda e ambiente. Confira as referências na Central antes de emitir."), {status:409});
    let nota = existentes[0];
    if (nota && (nota.numero_requisicao || !["rascunho","erro"].includes(nota.status))) return {nota, venda, tipo:nota.tipo};
    await _enriquecerItensVendaComCadastro(venda, {transaction});
    const tipo = resolveTipoNota(venda, config, idAgendamento, cliente);
    if (!tipo) throw Object.assign(new Error("Documento não habilitado para a natureza dos itens."), {status:400});
    if (nota && nota.tipo !== tipo) await nota.update({tipo, serie: config["serie_" + tipo]}, {transaction});
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
      }, {transaction});
    }
    if (config.ambiente === "producao" && !["emitida","cancelada"].includes(venda.status_fiscal))
      await venda.update({status_fiscal:"pendente"}, {transaction});
    return {nota, venda, tipo};
  });
}
/**
 * Emite a nota de uma venda. Primeiro garante o registro pendente (criando se
 * necessário), depois executa a transmissão pelo adapter configurado.
 */
async function emitirNotaPorVenda({ vendaId, empresaId }) {
  const { nota } = await registrarNotaPendente({ vendaId, empresaId });
  return unicaExecucao(emissoesEmCurso, nota.empresa_id + ":" + nota.id, () => _emitirNotaRecord(nota));
}

/** Emite uma nota já cadastrada (Central Fiscal, lote, retentativa). */
async function emitirNotaPorId({ notaId, empresaId }) {
  const nota = await NotaFiscal.findByPk(notaId);
  if (!nota || Number(nota.empresa_id) !== Number(empresaId)) {
    const e = new Error("Nota fiscal não encontrada");
    e.status = 404;
    throw e;
  }
  return unicaExecucao(emissoesEmCurso, nota.empresa_id + ":" + nota.id, () => _emitirNotaRecord(nota));
}

/** Emissão em lote (Central Fiscal) — valida a empresa de cada nota. */
async function emitirLote({ notasIds, empresaId }) {
  const ids = [...new Set(notasIds.map(Number))];
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
    let r;
    try { r = await emitirNotaPorId({notaId: nota.id, empresaId}); }
    catch (err) { r = {emitida:false, status:nota.status, motivo:err.message}; }
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
    comErro: resultados.filter(r => !r.emitida && r.status !== "aguardando").length,
    aguardando: resultados.filter(r => r.status === "aguardando").length,
    resultados,
  };
}

async function arquivoAutorizado({notaId, empresaId}, formato) {
  const nota = await NotaFiscal.findOne({where:{id:notaId,empresa_id:empresaId}});
  if (!nota) throw Object.assign(new Error("Nota fiscal não encontrada"), {status:404});
  if (nota.status !== "autorizada") throw Object.assign(new Error("Documento ainda não autorizado."), {status:400});
  if (formato === "xml" && nota.xml_autorizado) return nota.xml_autorizado;
  const config = await ConfiguracaoFiscal.findOne({where:{empresa_id:empresaId}});
  if (!config || config.ambiente !== nota.ambiente || config.provedor_api !== "focusnfe" || !nota.numero_requisicao)
    throw Object.assign(new Error("Consulte o arquivo no mesmo provedor e ambiente da emissão."), {status:409});
  const adapter = FiscalServiceFactory.create(config);
  return formato === "pdf" ? adapter.downloadDanfe(nota.numero_requisicao, nota.tipo)
                           : adapter.downloadXml(nota.numero_requisicao, nota.tipo);
}

module.exports = {
  fluxoParaFront,
  registrarNotaPendente,
  emitirNotaPorVenda,
  emitirNotaPorId,
  emitirLote,
  gerarDanfe: args => arquivoAutorizado(args, "pdf"),
  obterXml: args => arquivoAutorizado(args, "xml"),
  _mesclarCadastroNosItens,
  _enriquecerItensVendaComCadastro,
};
