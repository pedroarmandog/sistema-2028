const { sequelize } = require("./Cliente");
const { DataTypes } = require("sequelize");

const Fornecedor = sequelize.define(
  "Fornecedor",
  {
    codigo: { type: DataTypes.STRING },
    nome: { type: DataTypes.STRING, allowNull: false },
    telefone: { type: DataTypes.STRING },
    cnpj: { type: DataTypes.STRING },
    cpf: { type: DataTypes.STRING },
    razaoSocial: { type: DataTypes.STRING },
    contribuinte: { type: DataTypes.STRING },
    consFinal: { type: DataTypes.BOOLEAN, defaultValue: false },
    issRetido: { type: DataTypes.BOOLEAN, defaultValue: false },
    inscEstadual: { type: DataTypes.STRING },
    inscMunicipal: { type: DataTypes.STRING },
    cep: { type: DataTypes.STRING },
    endereco: { type: DataTypes.STRING },
    numero: { type: DataTypes.STRING },
    complemento: { type: DataTypes.STRING },
    bairro: { type: DataTypes.STRING },
    cidade: { type: DataTypes.STRING },
    proximidade: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    tags: { type: DataTypes.TEXT },
    parceiroIndicacao: { type: DataTypes.BOOLEAN, defaultValue: false },
    perfilComissao: { type: DataTypes.STRING },
    observacao: { type: DataTypes.TEXT },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "fornecedores",
    timestamps: true,
  },
);

module.exports = Fornecedor;
