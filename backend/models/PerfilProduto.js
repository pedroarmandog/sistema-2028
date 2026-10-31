const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const PerfilProduto = sequelize.define(
  "PerfilProduto",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fixo: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
    },
    maximo: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
    },
    gerente: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "perfis_produto",
    timestamps: true,
  },
);

module.exports = PerfilProduto;
