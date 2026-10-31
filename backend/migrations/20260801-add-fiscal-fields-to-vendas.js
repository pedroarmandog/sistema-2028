"use strict";

/**
 * Migration: Adiciona campos fiscais à tabela `vendas`
 *
 * Campos de referência de Nota Fiscal:
 *   - numero_nfe         : Número da NF-e/NFC-e emitida
 *   - serie_nfe          : Série da NF-e (ex: "001")
 *   - chave_acesso_nfe   : Chave de acesso de 44 dígitos
 *   - data_emissao_nfe   : Data/hora da emissão autorizada
 *   - natureza_operacao  : Natureza da operação (ex: "VENDA DE MERCADORIA")
 *   - protocolo_nfe      : Número do protocolo de autorização da SEFAZ
 *   - xml_nfe            : XML da NF-e autorizada (backup local)
 *   - indicador_presenca : Indicador de presença do comprador
 *                          (1=presencial, 2=internet, 3=telemarketing, 9=outros)
 *
 * Status fiscal INDEPENDENTE do status financeiro:
 *   - status_fiscal      : Estado da nota fiscal associada à venda
 *     ENUM: pendente | emitida | cancelada | erro | aguardando_correcao | nao_aplicavel
 *     DEFAULT: 'pendente'
 *
 * Modo de emissão configurável por empresa ou por venda:
 *   - modo_emissao       : Define como a NF será emitida para esta venda específica
 *     ENUM: automatico | manual | lote | confirmacao
 *     NULL = herda o modo configurado em ConfiguracaoFiscal da empresa
 *
 * IMPORTANTE:
 *   - O campo `status` (financeiro: pendente/parcial/pago/cancelado) NÃO é alterado.
 *   - `status_fiscal` e `status` são totalmente independentes.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Referência da NF emitida
    await queryInterface
      .addColumn("vendas", "numero_nfe", {
        type: Sequelize.INTEGER,
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("vendas", "serie_nfe", {
        type: Sequelize.STRING(3),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("vendas", "chave_acesso_nfe", {
        type: Sequelize.STRING(44),
        allowNull: true,
        unique: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("vendas", "data_emissao_nfe", {
        type: Sequelize.DATE,
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("vendas", "natureza_operacao", {
        type: Sequelize.STRING(60),
        allowNull: true,
        comment:
          "Descrição da natureza da operação para NF-e (ex: VENDA DE MERCADORIA)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("vendas", "protocolo_nfe", {
        type: Sequelize.STRING(15),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("vendas", "xml_nfe", {
        type: Sequelize.TEXT("long"),
        allowNull: true,
        comment: "XML da NF-e autorizada (backup local)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("vendas", "indicador_presenca", {
        type: Sequelize.TINYINT,
        allowNull: true,
        defaultValue: 1,
        comment:
          "1=presencial, 2=internet, 3=telemarketing, 4=domicílio, 9=outros",
      })
      .catch(() => {});

    // Status fiscal (INDEPENDENTE do status financeiro)
    await queryInterface
      .addColumn("vendas", "status_fiscal", {
        type: Sequelize.ENUM(
          "pendente",
          "emitida",
          "cancelada",
          "erro",
          "aguardando_correcao",
          "nao_aplicavel",
        ),
        allowNull: true,
        defaultValue: "pendente",
        comment:
          "Status da nota fiscal — independente do status financeiro (campo status)",
      })
      .catch(() => {});

    // Modo de emissão por venda (null = herda da empresa)
    await queryInterface
      .addColumn("vendas", "modo_emissao", {
        type: Sequelize.ENUM("automatico", "manual", "lote", "confirmacao"),
        allowNull: true,
        defaultValue: null,
        comment:
          "Modo de emissão desta venda. NULL = herda de ConfiguracaoFiscal.modo_emissao",
      })
      .catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    const cols = [
      "numero_nfe",
      "serie_nfe",
      "chave_acesso_nfe",
      "data_emissao_nfe",
      "natureza_operacao",
      "protocolo_nfe",
      "xml_nfe",
      "indicador_presenca",
      "status_fiscal",
      "modo_emissao",
    ];
    for (const col of cols) {
      await queryInterface.removeColumn("vendas", col).catch(() => {});
    }

    // Remover ENUMs criados
    await queryInterface.sequelize
      .query("DROP TYPE IF EXISTS `enum_vendas_status_fiscal`")
      .catch(() => {});
    await queryInterface.sequelize
      .query("DROP TYPE IF EXISTS `enum_vendas_modo_emissao`")
      .catch(() => {});
  },
};
