const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const DescontoRelacao = sequelize.define(
  "DescontoRelacao",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    perfilProduto: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    perfilCliente: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    desconto: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    obs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "descontos_relacoes",
    timestamps: true,
  },
);

module.exports = { DescontoRelacao, sequelize };
