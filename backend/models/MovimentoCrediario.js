const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const MovimentoCrediario = sequelize.define(
  "MovimentoCrediario",
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
      type: DataTypes.ENUM("debito", "credito"),
      allowNull: false,
      comment: "debito = novo débito lançado, credito = recebimento/pagamento",
    },
    operacao: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Ex: Débito lançado, Recebimento via Dinheiro, Venda #123",
    },
    formaPagamento: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Forma de pagamento do recebimento (quando tipo=credito)",
    },
    valor: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    saldoApos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: "Saldo do crediário após esta movimentação",
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
      comment: "ID da venda relacionada (se débito originou de venda)",
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
    tableName: "movimentos_crediario",
    timestamps: true,
  },
);

module.exports = MovimentoCrediario;
