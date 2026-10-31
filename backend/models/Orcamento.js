const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Orcamento = sequelize.define(
  "Orcamento",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    data: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    cliente: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    clienteTelefone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profissional: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profissionalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    condicaoPagamento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    itens: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    totais: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    informacoesAdicionais: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "pendente", // pendente, finalizado, faturado, cancelado
    },
  },
  {
    tableName: "orcamentos",
    timestamps: true,
  },
);

module.exports = { Orcamento, sequelize };
