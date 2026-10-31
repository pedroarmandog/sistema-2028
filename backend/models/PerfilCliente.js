const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const PerfilCliente = sequelize.define(
  "PerfilCliente",
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
    tableName: "perfis_cliente",
    timestamps: true,
  },
);

module.exports = PerfilCliente;
