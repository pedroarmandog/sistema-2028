const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Porte = sequelize.define(
  "Porte",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "portes",
    timestamps: true,
  },
);

module.exports = Porte;
