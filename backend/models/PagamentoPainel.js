const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PagamentoPainel = sequelize.define(
    "PagamentoPainel",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "empresas_painel",
          key: "id",
        },
      },
      valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      data_pagamento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("PAGO", "PENDENTE", "ATRASADO"),
        allowNull: false,
        defaultValue: "PAGO",
      },
      observacao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "pagamentos_painel",
      timestamps: true,
    },
  );

  return PagamentoPainel;
};
