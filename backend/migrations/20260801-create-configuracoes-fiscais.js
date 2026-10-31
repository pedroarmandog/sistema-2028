"use strict";

/**
 * Migration: Cria tabela `configuracoes_fiscais`
 *
 * Relação 1:1 com a tabela `empresas` (empresa_id UNIQUE).
 * Armazena toda a configuração necessária para futura integração com
 * provedores de emissão fiscal (PlugNotas, Focus NFe, eNotas, Tecnospeed, etc.).
 *
 * CAMPOS DE INTEGRAÇÃO:
 *   - certificado_digital     : Certificado A1 em base64 (será criptografado antes de salvar)
 *   - senha_certificado_hash  : Hash/encrypt da senha do certificado
 *   - token_api               : Token de autenticação na API do provedor
 *   - provedor_api            : Identificador do provedor (plugnotas | focusnfe | enotas | tecnospeed)
 *
 * NUMERAÇÃO (por tipo de documento):
 *   - serie_nfe/nfce/nfse         : Série dos documentos
 *   - proximo_numero_nfe/nfce/nfse: Próximo número a emitir
 *
 * AMBIENTE:
 *   - ambiente       : homologacao | producao (DEFAULT homologacao — segurança)
 *
 * PADRÕES FISCAIS:
 *   - natureza_operacao_padrao : Natureza da operação padrão para novas vendas
 *   - cfop_padrao_saida        : CFOP padrão para saída de produto
 *   - cfop_padrao_servico      : CFOP padrão para prestação de serviço
 *   - municipio_ibge           : Código IBGE do município da empresa
 *   - regime_tributario        : 1=Simples Nacional, 2=Simples Excesso, 3=Normal
 *
 * FLUXO DE EMISSÃO (configurável por empresa):
 *   - modo_emissao  : automatico | manual | lote | confirmacao (DEFAULT manual)
 *   - emitir_nfe    : Flag para habilitar emissão de NF-e
 *   - emitir_nfce   : Flag para habilitar emissão de NFC-e
 *   - emitir_nfse   : Flag para habilitar emissão de NFS-e
 *
 * NOTA DE SEGURANÇA:
 *   Os campos `certificado_digital`, `senha_certificado_hash` e `token_api`
 *   devem ser criptografados com AES-256 antes de persistir no banco.
 *   A chave de criptografia deve residir exclusivamente em variável de ambiente.
 *   Esta migration apenas cria a estrutura — a criptografia é responsabilidade
 *   da camada de serviço (a ser implementada).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("configuracoes_fiscais", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "empresas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      // Certificado e credenciais (a serem criptografados pela camada de serviço)
      certificado_digital: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment:
          "Certificado A1 em base64 — DEVE ser criptografado antes de salvar",
      },
      senha_certificado_hash: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment:
          "Senha do certificado — DEVE ser criptografada antes de salvar",
      },
      token_api: {
        type: Sequelize.STRING(512),
        allowNull: true,
        comment:
          "Token da API do provedor — DEVE ser criptografado antes de salvar",
      },
      provedor_api: {
        type: Sequelize.ENUM("plugnotas", "focusnfe", "enotas", "tecnospeed"),
        allowNull: true,
        comment: "Provedor de emissão fiscal selecionado",
      },

      // Numeração por tipo de documento
      serie_nfe: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: "001",
      },
      serie_nfce: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: "001",
      },
      serie_nfse: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: "001",
      },
      proximo_numero_nfe: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      proximo_numero_nfce: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      proximo_numero_nfse: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },

      // Ambiente de emissão
      ambiente: {
        type: Sequelize.ENUM("homologacao", "producao"),
        allowNull: false,
        defaultValue: "homologacao",
        comment: "Ambiente de emissão — inicia em homologação por segurança",
      },

      // Padrões fiscais
      natureza_operacao_padrao: {
        type: Sequelize.STRING(60),
        allowNull: true,
        defaultValue: "VENDA DE MERCADORIA",
      },
      cfop_padrao_saida: {
        type: Sequelize.STRING(5),
        allowNull: true,
        defaultValue: "5102",
        comment:
          "CFOP padrão para saída de produto (5102 = venda produção própria)",
      },
      cfop_padrao_servico: {
        type: Sequelize.STRING(5),
        allowNull: true,
        defaultValue: "5933",
        comment: "CFOP padrão para serviços (5933 = prestação de serviço)",
      },
      municipio_ibge: {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: "Código IBGE do município da empresa",
      },
      regime_tributario: {
        type: Sequelize.TINYINT,
        allowNull: true,
        comment:
          "1=Simples Nacional, 2=Simples Nacional Excesso, 3=Regime Normal",
      },

      // Fluxo de emissão
      modo_emissao: {
        type: Sequelize.ENUM("automatico", "manual", "lote", "confirmacao"),
        allowNull: false,
        defaultValue: "manual",
        comment:
          "Define como as notas fiscais são emitidas — padrão manual para segurança",
      },
      emitir_nfe: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Habilita emissão de NF-e para esta empresa",
      },
      emitir_nfce: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Habilita emissão de NFC-e para esta empresa",
      },
      emitir_nfse: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Habilita emissão de NFS-e para esta empresa",
      },

      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        ),
      },
    });

    // Índice para busca rápida por empresa
    await queryInterface.addIndex("configuracoes_fiscais", ["empresa_id"], {
      name: "idx_configuracoes_fiscais_empresa",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("configuracoes_fiscais").catch(() => {});
  },
};
