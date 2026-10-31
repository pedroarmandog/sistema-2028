const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Produto = sequelize.define(
  "Produto",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    codigo: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    tipo: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: "produto",
    },
    finalidade: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    centroResultado: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    marca: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    unidade: {
      type: DataTypes.STRING(32),
      allowNull: true,
      defaultValue: "UN",
    },
    agrupamento: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    perfilComissao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    curva: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    custoBase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    margem: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0,
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    ultimoPrecoAlterado: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estoqueAtual: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    estoqueMinimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    estoqueIdeal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    perfilDesconto: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    fornecedores: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    composicao: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Campos clínicos/medicinais adicionais esperados pelo frontend
    controlado: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    principioAtivo: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    formaFarmaceutica: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    apresentacao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    viaAdministracao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    tipoFarmacia: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    perfilValidade: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    validade: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    diasOportunidadeVenda: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    apresentacoesDiferentes: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    empresa: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    permiteEstoqueNegativo: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: "nao",
    },
    localizacao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    fatorCompra: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    atendimento: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    percentualMargem: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0,
    },
    reaisMargem: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    // Campos específicos de serviço/plano
    diasOportunidadeVendaServico: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    duracaoHoras: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    duracaoMinutos: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    situacaoTributariaECF: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    impostoISS: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    tipoPlano: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    textoContrato: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    ncm: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    cest: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    codigosBarras: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    codigoBarras: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    imagem: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: "sim",
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // ── Campos Fiscais ──────────────────────────────────────────────────────
    // Adicionados em 2026-08-01 para preparação do módulo fiscal.
    // NCM e CEST já existiam — os campos abaixo completam a tributação.
    // Todos allowNull: true — retrocompatível com produtos já cadastrados.

    // Identificação adicional
    sku: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Código SKU interno",
    },
    gtin: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment:
        "GTIN/EAN-13 internacional (distinto de codigoBarras que pode ser interno)",
    },
    peso: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: "Peso bruto em kg (campo pesBruto da NF-e)",
    },

    // Tributação ICMS
    origem: {
      type: DataTypes.TINYINT,
      allowNull: true,
      comment:
        "0=Nacional, 1=Estrangeira import. direta, 2=Estrangeira merc. interno, 3..7=variações",
    },
    cfop_padrao: {
      type: DataTypes.STRING(5),
      allowNull: true,
      comment: "CFOP padrão de saída para este produto (ex: 5102)",
    },
    cst_icms: {
      type: DataTypes.STRING(3),
      allowNull: true,
      comment: "CST ICMS para regime normal (ex: 000, 010, 020, 040...)",
    },
    csosn: {
      type: DataTypes.STRING(3),
      allowNull: true,
      comment: "CSOSN para Simples Nacional (ex: 101, 102, 103, 201, 400...)",
    },
    cst_pis: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: "CST PIS/PASEP (ex: 01, 07, 49...)",
    },
    cst_cofins: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: "CST COFINS (ex: 01, 07, 49...)",
    },
    cst_ipi: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: "CST IPI (ex: 00, 49, 50, 99...)",
    },
    aliq_icms: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: "Alíquota ICMS (%)",
    },
    aliq_pis: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: "Alíquota PIS (%)",
    },
    aliq_cofins: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: "Alíquota COFINS (%)",
    },
    aliq_ipi: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: "Alíquota IPI (%)",
    },

    // Campos específicos de serviço (NFS-e / LC 116/2003)
    item_lista_servico: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Código da Lista de Serviços LC 116/2003 (ex: 01.01, 14.01)",
    },
    municipio_incidencia_iss: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: "Código IBGE do município onde o ISS é devido",
    },
    natureza_operacao_iss: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Natureza da operação para fins de ISS/NFS-e",
    },
    cnae_servico: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: "CNAE da atividade relacionada ao serviço",
    },
  },
  {
    tableName: "itens",
    timestamps: true,
  },
);

module.exports = Produto;
