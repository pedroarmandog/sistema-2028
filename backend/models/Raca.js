const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Raca = sequelize.define(
  "Raca",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Espécie: Canina, Felina, etc.",
    },
  },
  {
    tableName: "racas",
    timestamps: true,
    indexes: [
      {
        name: "idx_raca_nome_tipo",
        fields: ["nome", "tipo"],
        unique: true,
      },
    ],
  },
);

module.exports = Raca;
