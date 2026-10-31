const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Venda = sequelize.define(
  "Venda",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    data: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    cliente: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    profissional: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profissionalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    itens: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    totais: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    pagamentos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    totalPago: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "pendente", // pendente, parcial, pago, cancelado
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // ── Campos Fiscais ──────────────────────────────────────────────────────
    // Adicionados em 2026-08-01 para preparação do módulo fiscal.
    // `status` (financeiro) permanece intocado.
    // `status_fiscal` é completamente independente do status financeiro.
    // Todos allowNull: true — retrocompatível com vendas já lançadas.

    // Referência da NF emitida
    numero_nfe: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    serie_nfe: {
      type: DataTypes.STRING(3),
      allowNull: true,
    },
    chave_acesso_nfe: {
      type: DataTypes.STRING(44),
      allowNull: true,
      unique: true,
    },
    data_emissao_nfe: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    natureza_operacao: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: "Natureza da operação para a NF-e (ex: VENDA DE MERCADORIA)",
    },
    protocolo_nfe: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    xml_nfe: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      comment: "XML da NF-e autorizada (backup local)",
    },
    indicador_presenca: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 1,
      comment:
        "1=presencial, 2=internet, 3=telemarketing, 4=domicílio, 9=outros",
    },

    // Status fiscal (INDEPENDENTE do status financeiro)
    status_fiscal: {
      type: DataTypes.ENUM(
        "pendente",
        "emitida",
        "cancelada",
        "erro",
        "aguardando_correcao",
        "nao_aplicavel",
      ),
      allowNull: true,
      defaultValue: "pendente",
      comment:
        "Status da nota fiscal — independente do campo `status` (financeiro)",
    },

    // Modo de emissão por venda (null = herda da empresa)
    modo_emissao: {
      type: DataTypes.ENUM("automatico", "manual", "lote", "confirmacao"),
      allowNull: true,
      defaultValue: null,
      comment: "NULL = herda de ConfiguracaoFiscal.modo_emissao da empresa",
    },
  },
  {
    tableName: "vendas",
    timestamps: true,
  },
);

module.exports = { Venda, sequelize };
