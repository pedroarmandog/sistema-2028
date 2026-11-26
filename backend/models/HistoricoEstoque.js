const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const HistoricoEstoque = sequelize.define(
  "HistoricoEstoque",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    produtoId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "produto_id",
    },
    produtoNome: {
      type: DataTypes.STRING(500),
      field: "produto_nome",
    },
    dataMovimento: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "data_movimento",
    },
    operacao: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    estoqueAnterior: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
      field: "estoque_anterior",
    },
    quantidade: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
    },
    novoEstoque: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
      field: "novo_estoque",
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "historico_estoque",
    timestamps: true,
  },
);

module.exports = HistoricoEstoque;
