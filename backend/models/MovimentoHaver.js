const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const MovimentoHaver = sequelize.define(
  "MovimentoHaver",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    clienteNome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.ENUM("entrada", "saida"),
      allowNull: false,
      comment: "entrada = adiantamento/crédito, saida = utilizado em venda",
    },
    operacao: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Ex: Adiantamento, Utilizado em Venda #123",
    },
    valor: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    saldoApos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: "Saldo de haver após esta movimentação",
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    usuarioNome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vendaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID da venda relacionada (se aplicável)",
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    data: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "movimentos_haver",
    timestamps: true,
  },
);

module.exports = MovimentoHaver;
