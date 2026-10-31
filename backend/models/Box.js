const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Box = sequelize.define(
  "Box",
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    abreviacao: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    capacidade: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    pets: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Array de objetos {id, nome, tutor}",
    },
  },
  {
    tableName: "boxes",
    timestamps: true,
  },
);

module.exports = Box;
