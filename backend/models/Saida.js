const { sequelize } = require("./Cliente");
const { DataTypes } = require("sequelize");

const Saida = sequelize.define(
  "Saida",
  {
    fornecedor: { type: DataTypes.STRING },
    numero: { type: DataTypes.STRING },
    serie: { type: DataTypes.STRING },
    dataEmissao: { type: DataTypes.DATEONLY },
    dataSaida: { type: DataTypes.DATEONLY },
    chaveAcesso: { type: DataTypes.STRING },
    transportador: { type: DataTypes.STRING },
    fretePorConta: { type: DataTypes.STRING },
    frete: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    itens: { type: DataTypes.JSON },
    desconto: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    seguro: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    despesa: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    icmsST: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    ipi: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    despesaExtra: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    totalProdutos: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    valorTotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    observacao: { type: DataTypes.TEXT },
    centroResultado: { type: DataTypes.STRING },
    categoriaFinanceira: { type: DataTypes.STRING },
    situacao: { type: DataTypes.STRING, defaultValue: "pendente" },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "saidas_mercadoria",
    timestamps: true,
  },
);

module.exports = Saida;
