const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

/**
 * Model: ConfiguracaoFiscal
 * Tabela: configuracoes_fiscais
 *
 * Armazena a configuração fiscal de cada empresa (relação 1:1).
 * Controla: provedor de emissão, certificado, numeração, ambiente e fluxo de emissão.
 *
 * SEGURANÇA:
 *   Os campos certificado_digital, senha_certificado_hash e token_api
 *   DEVEM ser criptografados com AES-256 pela camada de serviço antes de persistir.
 *   A chave de criptografia deve residir APENAS em variável de ambiente (.env).
 */

const ConfiguracaoFiscal = sequelize.define(
  "ConfiguracaoFiscal",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment:
        "FK para empresas — cada empresa tem no máximo uma configuração fiscal",
    },

    // Certificado e credenciais (criptografados pela camada de serviço)
    certificado_digital: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Certificado A1 base64 — DEVE ser criptografado antes de salvar",
    },
    senha_certificado_hash: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Senha do certificado — DEVE ser criptografada antes de salvar",
    },
    token_api: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment:
        "Token da API do provedor — DEVE ser criptografado antes de salvar",
    },
    provedor_api: {
      type: DataTypes.ENUM("plugnotas", "focusnfe", "enotas", "tecnospeed"),
      allowNull: true,
      comment: "Provedor de emissão fiscal selecionado para esta empresa",
    },

    // Numeração por tipo de documento
    serie_nfe: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: "001",
    },
    serie_nfce: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: "001",
    },
    serie_nfse: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: "001",
    },
    proximo_numero_nfe: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    proximo_numero_nfce: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    proximo_numero_nfse: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },

    // Ambiente de emissão — inicia em homologação por segurança
    ambiente: {
      type: DataTypes.ENUM("homologacao", "producao"),
      allowNull: false,
      defaultValue: "homologacao",
    },

    // Padrões fiscais
    natureza_operacao_padrao: {
      type: DataTypes.STRING(60),
      allowNull: true,
      defaultValue: "VENDA DE MERCADORIA",
    },
    cfop_padrao_saida: {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: "5102",
      comment:
        "CFOP padrão para saída de produto (5102 = venda prod. própria no estado)",
    },
    cfop_padrao_servico: {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: "5933",
      comment: "CFOP padrão para prestação de serviço",
    },
    municipio_ibge: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: "Código IBGE do município da empresa — usado em NF-e e NFS-e",
    },
    regime_tributario: {
      type: DataTypes.TINYINT,
      allowNull: true,
      comment:
        "1=Simples Nacional, 2=Simples Nacional Excesso, 3=Regime Normal",
    },

    // Fluxo de emissão configurável por empresa
    modo_emissao: {
      type: DataTypes.ENUM("automatico", "manual", "lote", "confirmacao"),
      allowNull: false,
      defaultValue: "manual",
      comment:
        "automatico=emite ao finalizar venda; manual=usuário decide; lote=em lote; confirmacao=pede confirmação",
    },
    emitir_nfe: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Habilita emissão de NF-e para esta empresa",
    },
    emitir_nfce: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Habilita emissão de NFC-e para esta empresa",
    },
    emitir_nfse: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Habilita emissão de NFS-e para esta empresa",
    },

    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "configuracoes_fiscais",
    timestamps: true,
  },
);

module.exports = ConfiguracaoFiscal;
