// Model: PagamentoCaixa
// Tabela movimentacoes_caixa — registra pagamentos de serviços no caixa do dia
const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const PagamentoCaixa = sequelize.define(
  "PagamentoCaixa",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // ID do cliente (referência à tabela clientes)
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Nome do cliente (desnormalizado para consultas rápidas)
    cliente_nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // ID do pet (referência à tabela pets)
    pet_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Nome do pet (desnormalizado para consultas rápidas)
    pet_nome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Descrição do serviço prestado
    servico: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Forma de pagamento: dinheiro, pix ou cartao
    forma_pagamento: {
      type: DataTypes.ENUM("dinheiro", "pix", "cartao"),
      allowNull: false,
    },
    // Valor do pagamento
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // Data/hora da movimentação
    data_movimentacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "movimentacoes_caixa",
    timestamps: true,
  },
);

module.exports = { PagamentoCaixa, sequelize };
