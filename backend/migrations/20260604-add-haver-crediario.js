"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar saldo_haver à tabela clientes
    await queryInterface
      .addColumn("clientes", "saldo_haver", {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      })
      .catch(() => {
        // Coluna pode já existir — ignorar erro
      });

    // Adicionar saldo_crediario à tabela clientes
    await queryInterface
      .addColumn("clientes", "saldo_crediario", {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      })
      .catch(() => {
        // Coluna pode já existir — ignorar erro
      });

    // Criar tabela movimentos_haver
    await queryInterface
      .createTable("movimentos_haver", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        clienteId: { type: Sequelize.INTEGER, allowNull: false },
        clienteNome: { type: Sequelize.STRING, allowNull: true },
        tipo: { type: Sequelize.ENUM("entrada", "saida"), allowNull: false },
        operacao: { type: Sequelize.STRING, allowNull: true },
        valor: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        saldoApos: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        observacao: { type: Sequelize.TEXT, allowNull: true },
        usuarioId: { type: Sequelize.INTEGER, allowNull: true },
        usuarioNome: { type: Sequelize.STRING, allowNull: true },
        vendaId: { type: Sequelize.INTEGER, allowNull: true },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        data: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      })
      .catch(() => {});

    // Criar tabela movimentos_crediario
    await queryInterface
      .createTable("movimentos_crediario", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        clienteId: { type: Sequelize.INTEGER, allowNull: false },
        clienteNome: { type: Sequelize.STRING, allowNull: true },
        tipo: { type: Sequelize.ENUM("debito", "credito"), allowNull: false },
        operacao: { type: Sequelize.STRING, allowNull: true },
        formaPagamento: { type: Sequelize.STRING, allowNull: true },
        valor: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        saldoApos: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        observacao: { type: Sequelize.TEXT, allowNull: true },
        usuarioId: { type: Sequelize.INTEGER, allowNull: true },
        usuarioNome: { type: Sequelize.STRING, allowNull: true },
        vendaId: { type: Sequelize.INTEGER, allowNull: true },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        data: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface
      .removeColumn("clientes", "saldo_haver")
      .catch(() => {});
    await queryInterface
      .removeColumn("clientes", "saldo_crediario")
      .catch(() => {});
    await queryInterface.dropTable("movimentos_haver").catch(() => {});
    await queryInterface.dropTable("movimentos_crediario").catch(() => {});
  },
};
