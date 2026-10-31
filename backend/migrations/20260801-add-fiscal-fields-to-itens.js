"use strict";

/**
 * Migration: Adiciona campos fiscais à tabela `itens` (Produto/Serviço)
 *
 * PRODUTOS — campos tributários:
 *   - sku                : Código SKU interno
 *   - gtin               : GTIN/EAN-13 (diferente de codigoBarras que pode ser interno)
 *   - peso               : Peso bruto em kg (necessário para NF-e — campo pesBruto)
 *   - origem             : Origem da mercadoria (0=nacional, 1-7=importado; tabela ICMS)
 *   - cfop_padrao        : CFOP padrão para saída (ex: 5102=Venda produção própria estado)
 *   - cst_icms           : Código de Situação Tributária do ICMS (regime normal)
 *   - csosn              : Código de Situação da Operação Simples Nacional
 *   - cst_pis            : CST PIS/PASEP
 *   - cst_cofins         : CST COFINS
 *   - cst_ipi            : CST IPI
 *   - aliq_icms          : Alíquota ICMS (%)
 *   - aliq_pis           : Alíquota PIS (%)
 *   - aliq_cofins        : Alíquota COFINS (%)
 *   - aliq_ipi           : Alíquota IPI (%)
 *
 * SERVIÇOS — campos NFS-e (LC 116/2003):
 *   - item_lista_servico      : Código do item da Lista de Serviços (ex: "01.01")
 *   - municipio_incidencia_iss: Código IBGE do município onde o ISS é devido
 *   - natureza_operacao_iss   : Natureza da operação para ISS
 *   - cnae_servico            : CNAE da atividade relacionada ao serviço
 *
 * Todos allowNull: true — retrocompatível com produtos/serviços já cadastrados.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // --- CAMPOS GERAIS ---
    await queryInterface
      .addColumn("itens", "sku", {
        type: Sequelize.STRING(50),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "gtin", {
        type: Sequelize.STRING(14),
        allowNull: true,
        comment: "GTIN/EAN-13 internacional (diferente de codigoBarras)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "peso", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        comment: "Peso bruto em kg",
      })
      .catch(() => {});

    // --- CAMPOS TRIBUTÁRIOS ICMS ---
    await queryInterface
      .addColumn("itens", "origem", {
        type: Sequelize.TINYINT,
        allowNull: true,
        comment:
          "0=Nacional, 1=Estrangeira importação direta, 2=Estrangeira adquirida mercado interno, 3..7=variações",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "cfop_padrao", {
        type: Sequelize.STRING(5),
        allowNull: true,
        comment: "CFOP padrão para saída (ex: 5102)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "cst_icms", {
        type: Sequelize.STRING(3),
        allowNull: true,
        comment: "CST ICMS — regime normal (000, 010, 020...)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "csosn", {
        type: Sequelize.STRING(3),
        allowNull: true,
        comment: "CSOSN — Simples Nacional (101, 102, 103, 201...)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "cst_pis", {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: "CST PIS/PASEP (01..99)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "cst_cofins", {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: "CST COFINS (01..99)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "cst_ipi", {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: "CST IPI (00..99)",
      })
      .catch(() => {});

    // --- ALÍQUOTAS ---
    await queryInterface
      .addColumn("itens", "aliq_icms", {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: "Alíquota ICMS (%)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "aliq_pis", {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: "Alíquota PIS (%)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "aliq_cofins", {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: "Alíquota COFINS (%)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "aliq_ipi", {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: "Alíquota IPI (%)",
      })
      .catch(() => {});

    // --- CAMPOS ESPECÍFICOS DE SERVIÇO (NFS-e) ---
    await queryInterface
      .addColumn("itens", "item_lista_servico", {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: "Código da Lista de Serviços LC 116/2003 (ex: 01.01, 14.01)",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "municipio_incidencia_iss", {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: "Código IBGE do município onde o ISS é devido",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "natureza_operacao_iss", {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Natureza da operação para fins de ISS/NFS-e",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("itens", "cnae_servico", {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: "CNAE da atividade relacionada ao serviço",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    const cols = [
      "sku",
      "gtin",
      "peso",
      "origem",
      "cfop_padrao",
      "cst_icms",
      "csosn",
      "cst_pis",
      "cst_cofins",
      "cst_ipi",
      "aliq_icms",
      "aliq_pis",
      "aliq_cofins",
      "aliq_ipi",
      "item_lista_servico",
      "municipio_incidencia_iss",
      "natureza_operacao_iss",
      "cnae_servico",
    ];
    for (const col of cols) {
      await queryInterface.removeColumn("itens", col).catch(() => {});
    }
  },
};
