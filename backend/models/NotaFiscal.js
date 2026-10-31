const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

/**
 * Model: NotaFiscal
 * Tabela: notas_fiscais
 *
 * Registro central de todas as notas fiscais do sistema (NF-e, NFC-e, NFS-e).
 * Esta tabela é a fonte de verdade fiscal — todas as emissões, cancelamentos
 * e consultas ficam registradas aqui, independente do módulo de origem.
 *
 * Relacionamentos:
 *   - empresa_id     → Empresa (obrigatório)
 *   - venda_id       → Venda (opcional — nota pode não ter venda associada)
 *   - agendamento_id → Agendamento (opcional — para NFS-e de serviços agendados)
 *
 * Os campos `numero_nfe`, `serie_nfe`, `chave_acesso_nfe` na tabela `vendas`
 * servem como atalho/cache. Esta tabela é a fonte canônica.
 */

const NotaFiscal = sequelize.define(
  "NotaFiscal",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Identificação do documento fiscal
    tipo: {
      type: DataTypes.ENUM("nfe", "nfce", "nfse"),
      allowNull: false,
    },
    numero: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    serie: {
      type: DataTypes.STRING(3),
      allowNull: true,
    },
    chave_acesso: {
      type: DataTypes.STRING(44),
      allowNull: true,
      unique: true,
      comment: "Chave de acesso de 44 dígitos (única por nota)",
    },

    // Datas
    data_emissao: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    data_autorizacao: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Destinatário
    destinatario_nome: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    destinatario_documento: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment: "CPF (11 dígitos) ou CNPJ (14 dígitos) sem formatação",
    },

    // Dados da operação
    natureza_operacao: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    valor_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    // Status e ciclo de vida
    status: {
      type: DataTypes.ENUM(
        "rascunho",
        "aguardando",
        "autorizada",
        "cancelada",
        "inutilizada",
        "erro",
        "denegada",
      ),
      allowNull: false,
      defaultValue: "rascunho",
    },
    motivo_cancelamento: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    protocolo: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },

    // XML e resposta da SEFAZ/provedor
    xml_autorizado: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    xml_cancelamento: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resposta_api: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Resposta completa da API do provedor para rastreio e debugging",
    },

    // Vínculos com módulos do sistema
    venda_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    agendamento_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    referencia_tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment:
        "Tipo de referência genérica para uso futuro (ex: orcamento, entrada)",
    },
    referencia_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Rastreabilidade de integração
    numero_requisicao: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment:
        "ID da requisição no provedor para rastreio de retorno assíncrono",
    },
    ambiente: {
      type: DataTypes.ENUM("homologacao", "producao"),
      allowNull: false,
      defaultValue: "homologacao",
    },
  },
  {
    tableName: "notas_fiscais",
    timestamps: true,
    indexes: [
      { fields: ["empresa_id"], name: "idx_notas_fiscais_empresa" },
      { fields: ["status"], name: "idx_notas_fiscais_status" },
      { fields: ["venda_id"], name: "idx_notas_fiscais_venda" },
      { fields: ["agendamento_id"], name: "idx_notas_fiscais_agendamento" },
      {
        fields: ["empresa_id", "tipo", "status"],
        name: "idx_notas_fiscais_empresa_tipo_status",
      },
      { fields: ["data_emissao"], name: "idx_notas_fiscais_data_emissao" },
    ],
  },
);

module.exports = NotaFiscal;
