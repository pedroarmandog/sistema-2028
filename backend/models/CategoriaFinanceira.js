const { sequelize } = require("./Cliente");
const { DataTypes } = require("sequelize");

const CategoriaFinanceira = sequelize.define(
  "CategoriaFinanceira",
  {
    descricao: { type: DataTypes.STRING, allowNull: false },
    tipo: { type: DataTypes.STRING, allowNull: false },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "categorias_financeiras",
    timestamps: true,
  },
);

module.exports = CategoriaFinanceira;
