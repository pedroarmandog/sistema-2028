const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Caixa = sequelize.define(
  "Caixa",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aberto: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    usuario: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dataAbertura: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dataFechamento: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    saldoInicial: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    valorFundoTroco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment:
        "Valor de fundo de troco que vai alterando com vendas em dinheiro",
    },
    saldoFinal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "caixas",
    timestamps: true,
  },
);

module.exports = { Caixa, sequelize };
