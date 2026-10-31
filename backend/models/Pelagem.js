const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Pelagem = sequelize.define(
  "Pelagem",
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
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Tipo ou categoria da pelagem",
    },
  },
  {
    tableName: "pelagens",
    timestamps: true,
    indexes: [
      {
        name: "idx_pelagem_nome_tipo",
        fields: ["nome", "tipo"],
        unique: true,
      },
    ],
  },
);

module.exports = Pelagem;
