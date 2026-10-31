"use strict";

/**
 * FiscalPayloadBuilder
 *
 * Responsável por montar o payload normalizado (provider-agnostic) a partir
 * dos dados do sistema (Venda, Cliente, Empresa, Produto).
 *
 * O payload gerado aqui é um objeto intermediário que os adapters convertem
 * para o formato específico do seu provedor (PlugNotas, Focus NFe, etc.).
 *
 * PRINCÍPIOS:
 *   - A forma de pagamento NÃO determina o tipo de nota a emitir.
 *   - O tipo de nota (nfe/nfce/nfse) é definido pela configuração da empresa e
 *     pela natureza do item (produto → NF-e/NFC-e; serviço → NFS-e).
 *   - Este builder não acessa o banco — recebe objetos já carregados.
 *   - Retorna null para campos não preenchidos (adapters decidem o que é obrigatório).
 */

class FiscalPayloadBuilder {
  /**
   * Monta payload para NF-e (Nota Fiscal Eletrônica — produtos)
   *
   * @param {object} venda      - Registro da tabela `vendas` (com itens JSON)
   * @param {object} empresa    - Registro da tabela `empresas` (emitente)
   * @param {object} config     - Registro de `configuracoes_fiscais` da empresa
   * @param {object|null} cliente - Registro da tabela `clientes` (destinatário, pode ser null)
   * @returns {object} Payload normalizado
   */
  static buildNFe(venda, empresa, config, cliente = null) {
    return {
      tipo: "nfe",
      ambiente: config.ambiente,
      natureza_operacao:
        venda.natureza_operacao ||
        config.natureza_operacao_padrao ||
        "VENDA DE MERCADORIA",
      indicador_presenca: venda.indicador_presenca ?? 1,

      emitente: FiscalPayloadBuilder._buildEmitente(empresa, config),
      destinatario: FiscalPayloadBuilder._buildDestinatario(cliente),

      itens: FiscalPayloadBuilder._buildItensNFe(venda.itens || [], config),
      totais: FiscalPayloadBuilder._buildTotais(venda.totais || {}),
      pagamentos: FiscalPayloadBuilder._buildPagamentos(venda.pagamentos || []),

      // Referência interna
      _vendaId: venda.id,
      _empresaId: empresa.id,
    };
  }

  /**
   * Monta payload para NFS-e (Nota Fiscal de Serviços Eletrônica)
   *
   * @param {object} agendamento - Registro da tabela `agendamentos`
   * @param {object} empresa     - Registro da tabela `empresas` (prestador)
   * @param {object} config      - Registro de `configuracoes_fiscais`
   * @param {object|null} cliente - Registro de `clientes` (tomador)
   * @returns {object} Payload normalizado
   */
  static buildNFSe(agendamento, empresa, config, cliente = null) {
    const servicos = Array.isArray(agendamento.servicos)
      ? agendamento.servicos
      : [];

    return {
      tipo: "nfse",
      ambiente: config.ambiente,

      prestador: FiscalPayloadBuilder._buildEmitente(empresa, config),
      tomador: FiscalPayloadBuilder._buildDestinatario(cliente),

      servicos: servicos.map((s) => ({
        descricao: s.nome || s.descricao || "",
        quantidade: s.quantidade || 1,
        valor_unitario: s.valor || 0,
        valor_total: (s.quantidade || 1) * (s.valor || 0),
        item_lista_servico: s.item_lista_servico || null,
        municipio_incidencia_iss:
          s.municipio_incidencia_iss || config.municipio_ibge || null,
        natureza_operacao: s.natureza_operacao_iss || null,
        cnae_servico: s.cnae_servico || empresa.cnae || null,
        aliq_iss: s.impostoISS || null,
      })),

      valor_total: agendamento.totalPago || agendamento.valor || 0,

      // Referência interna
      _agendamentoId: agendamento.id,
      _empresaId: empresa.id,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Builders internos
  // ──────────────────────────────────────────────────────────────────────────

  static _buildEmitente(empresa, config) {
    const end = empresa.endereco || {};
    return {
      razao_social: empresa.razaoSocial || empresa.nome,
      nome_fantasia: empresa.nome,
      cnpj: (empresa.cnpj || "").replace(/\D/g, ""),
      ie: empresa.inscricaoEstadual || null,
      im: empresa.inscricaoMunicipal || null,
      cnae: empresa.cnae || null,
      crt: empresa.crt || config.regime_tributario || null,
      regime_tributario: config.regime_tributario || null,

      endereco: {
        logradouro: end.logradouro || end.endereco || null,
        numero: end.numero || null,
        complemento: end.complemento || null,
        bairro: end.bairro || null,
        municipio: end.cidade || end.municipio || null,
        codigo_ibge:
          empresa.codigo_ibge_municipio || config.municipio_ibge || null,
        uf: end.uf || end.estado || null,
        cep: (end.cep || "").replace(/\D/g, ""),
        pais: empresa.pais || "Brasil",
        codigo_pais: empresa.codigo_pais || "1058",
      },

      telefone: empresa.telefone || null,
      email: empresa.email || null,
    };
  }

  static _buildDestinatario(cliente) {
    if (!cliente) {
      return { consumidor_final: true };
    }

    const isPJ = cliente.tipo_pessoa === "J" || (cliente.cnpj && !cliente.cpf);
    const documento = isPJ
      ? (cliente.cnpj || "").replace(/\D/g, "")
      : (cliente.cpf || "").replace(/\D/g, "");

    return {
      tipo_pessoa: cliente.tipo_pessoa || (isPJ ? "J" : "F"),
      documento,
      razao_social: cliente.nome,
      ie: cliente.inscricao_estadual || null,
      indicador_ie: cliente.indicador_ie ?? 9,
      consumidor_final: !isPJ,

      endereco: {
        logradouro: cliente.endereco || null,
        numero: cliente.numero || null,
        complemento: cliente.complemento || null,
        bairro: cliente.bairro || null,
        municipio: cliente.cidade || null,
        codigo_ibge: cliente.codigo_ibge_municipio || null,
        uf: cliente.estado || null,
        cep: (cliente.cep || "").replace(/\D/g, ""),
        pais: cliente.pais || "Brasil",
        codigo_pais: cliente.codigo_pais || "1058",
      },

      telefone: cliente.telefone || null,
      email: cliente.email || null,
    };
  }

  static _buildItensNFe(itens, config) {
    return itens.map((item, idx) => {
      const produto = item.produto || item;
      return {
        numero: idx + 1,
        codigo_produto: produto.id || produto.codigo || String(idx + 1),
        descricao: produto.nome || item.descricao || "",
        ncm: produto.ncm || null,
        cest: produto.cest || null,
        cfop: produto.cfop_padrao || config.cfop_padrao_saida || "5102",
        unidade: produto.unidade || "UN",
        gtin: produto.gtin || produto.codigoBarras || "SEM GTIN",
        quantidade: item.quantidade || 1,
        valor_unitario: item.valorUnitario || item.valor_unitario || 0,
        valor_total: item.subtotal || item.valor || 0,
        desconto: item.desconto || 0,
        peso: produto.peso || null,
        origem: produto.origem ?? 0,
        cst_icms: produto.cst_icms || null,
        csosn: produto.csosn || null,
        aliq_icms: produto.aliq_icms || 0,
        cst_pis: produto.cst_pis || null,
        aliq_pis: produto.aliq_pis || 0,
        cst_cofins: produto.cst_cofins || null,
        aliq_cofins: produto.aliq_cofins || 0,
        cst_ipi: produto.cst_ipi || null,
        aliq_ipi: produto.aliq_ipi || 0,
      };
    });
  }

  static _buildTotais(totais) {
    return {
      valor_produtos: totais.bruto || 0,
      desconto: totais.desconto || 0,
      acrescimo: totais.acrescimo || 0,
      frete: totais.frete || 0,
      valor_total: totais.final || 0,
    };
  }

  static _buildPagamentos(pagamentos) {
    // Mapeia formas de pagamento do sistema para códigos da NF-e
    // Não define tipo de nota — apenas registra como foi pago
    const mapaForma = {
      dinheiro: "01",
      cheque: "02",
      cartao_credito: "03",
      cartao_debito: "04",
      credito_loja: "05",
      vale_alimentacao: "10",
      vale_refeicao: "11",
      vale_presente: "12",
      vale_combustivel: "13",
      boleto: "15",
      pix: "17",
      transferencia: "18",
      crediario: "99",
      haver: "99",
      outro: "99",
    };

    return pagamentos.map((p) => {
      const forma = String(p.forma || "")
        .toLowerCase()
        .replace(/\s/g, "_");
      return {
        forma_pagamento: mapaForma[forma] || "99",
        valor: p.valor || 0,
        descricao: p.forma || null,
      };
    });
  }
}

module.exports = FiscalPayloadBuilder;
