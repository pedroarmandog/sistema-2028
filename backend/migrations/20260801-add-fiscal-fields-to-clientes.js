"use strict";

/**
 * Migration: Adiciona campos fiscais à tabela `clientes`
 *
 * Campos adicionados:
 *   - tipo_pessoa            : 'F' = Pessoa Física, 'J' = Pessoa Jurídica
 *   - cnpj                   : CNPJ para clientes PJ (já existe CPF para PF)
 *   - inscricao_estadual      : Inscrição Estadual (IE) para clientes PJ
 *   - indicador_ie           : Indicador do contribuinte do ICMS (1=contribuinte, 2=isento, 9=não contribuinte)
 *   - codigo_ibge_municipio  : Código IBGE do município do cliente (7 dígitos)
 *   - pais                   : Nome do país
 *   - codigo_pais            : Código do país conforme SEFAZ (1058 = Brasil)
 *
 * IMPORTANTE: O campo `tipoPessoa` já existe no frontend (novo-cliente.html) mas NÃO estava
 * persistido no banco. Esta migration sincroniza banco e frontend.
 *
 * Todos os campos allowNull: true para retrocompatibilidade com registros existentes.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .addColumn("clientes", "tipo_pessoa", {
        type: Sequelize.CHAR(1),
        allowNull: true,
        comment: "F = Pessoa Física, J = Pessoa Jurídica",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("clientes", "cnpj", {
        type: Sequelize.STRING(18),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("clientes", "inscricao_estadual", {
        type: Sequelize.STRING(20),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("clientes", "indicador_ie", {
        type: Sequelize.TINYINT,
        allowNull: true,
        defaultValue: 9,
        comment:
          "1=Contribuinte ICMS, 2=Contribuinte isento, 9=Não contribuinte",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("clientes", "codigo_ibge_municipio", {
        type: Sequelize.STRING(7),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("clientes", "pais", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "Brasil",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("clientes", "codigo_pais", {
        type: Sequelize.CHAR(4),
        allowNull: true,
        defaultValue: "1058",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface
      .removeColumn("clientes", "tipo_pessoa")
      .catch(() => {});
    await queryInterface.removeColumn("clientes", "cnpj").catch(() => {});
    await queryInterface
      .removeColumn("clientes", "inscricao_estadual")
      .catch(() => {});
    await queryInterface
      .removeColumn("clientes", "indicador_ie")
      .catch(() => {});
    await queryInterface
      .removeColumn("clientes", "codigo_ibge_municipio")
      .catch(() => {});
    await queryInterface.removeColumn("clientes", "pais").catch(() => {});
    await queryInterface
      .removeColumn("clientes", "codigo_pais")
      .catch(() => {});
  },
};
