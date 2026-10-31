const { sequelize } = require("./Cliente");
const { DataTypes } = require("sequelize");

const ContaReceber = sequelize.define(
  "ContaReceber",
  {
    clienteId: { type: DataTypes.INTEGER, allowNull: true },
    clienteNome: { type: DataTypes.STRING, allowNull: true },
    descricao: { type: DataTypes.STRING, allowNull: true },
    categoria: { type: DataTypes.STRING, allowNull: true },
    valor: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    dataEmissao: { type: DataTypes.DATEONLY, allowNull: true },
    dataVencimento: { type: DataTypes.DATEONLY, allowNull: true },
    formaPagamento: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: "pendente" },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    parcelas: { type: DataTypes.INTEGER, defaultValue: 1 },
    parcelaNumero: { type: DataTypes.INTEGER, defaultValue: 1 },
    documentoOrigem: { type: DataTypes.STRING, allowNull: true },
    valorPago: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    dataPagamento: { type: DataTypes.DATEONLY, allowNull: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "contas_receber",
    timestamps: true,
  },
);

module.exports = ContaReceber;
