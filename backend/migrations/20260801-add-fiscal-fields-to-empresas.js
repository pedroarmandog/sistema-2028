"use strict";

/**
 * Migration: Adiciona campos fiscais à tabela `empresas`
 *
 * Campos adicionados:
 *   - cnae               : Classificação Nacional de Atividades Econômicas (7 dígitos)
 *   - crt                : Código de Regime Tributário (1=Simples Nacional, 2=Simples Excesso, 3=Normal)
 *   - codigo_ibge_municipio : Código IBGE do município (7 dígitos) — necessário para NF-e/NFS-e
 *   - pais               : Nome do país (default Brasil)
 *   - codigo_pais        : Código do país conforme tabela SEFAZ (default 1058 = Brasil)
 *
 * Todos os campos são opcionais (allowNull: true) para garantir retrocompatibilidade
 * com registros já existentes.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface
      .addColumn("empresas", "cnae", {
        type: Sequelize.STRING(7),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("empresas", "crt", {
        type: Sequelize.CHAR(1),
        allowNull: true,
        comment:
          "1=Simples Nacional, 2=Simples Nacional Excesso, 3=Regime Normal",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("empresas", "codigo_ibge_municipio", {
        type: Sequelize.STRING(7),
        allowNull: true,
      })
      .catch(() => {});

    await queryInterface
      .addColumn("empresas", "pais", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "Brasil",
      })
      .catch(() => {});

    await queryInterface
      .addColumn("empresas", "codigo_pais", {
        type: Sequelize.CHAR(4),
        allowNull: true,
        defaultValue: "1058",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("empresas", "cnae").catch(() => {});
    await queryInterface.removeColumn("empresas", "crt").catch(() => {});
    await queryInterface
      .removeColumn("empresas", "codigo_ibge_municipio")
      .catch(() => {});
    await queryInterface.removeColumn("empresas", "pais").catch(() => {});
    await queryInterface
      .removeColumn("empresas", "codigo_pais")
      .catch(() => {});
  },
};
