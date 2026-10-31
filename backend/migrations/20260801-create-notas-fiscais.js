"use strict";

/**
 * Migration: Cria tabela `notas_fiscais`
 *
 * Registro central de todas as notas fiscais do sistema (NF-e, NFC-e, NFS-e).
 * Funciona como a Central Fiscal: todas as emissões, cancelamentos e consultas
 * ficam registradas aqui, independente do módulo que originou (venda, agendamento, etc.).
 *
 * Esta tabela NÃO substitui campos nas tabelas de origem (vendas, agendamentos).
 * Os campos `numero_nfe`, `serie_nfe`, `chave_acesso_nfe` em `vendas` servem como
 * atalho/cache para consulta rápida. A tabela `notas_fiscais` é a fonte de verdade fiscal.
 *
 * CAMPOS DE IDENTIFICAÇÃO:
 *   - tipo              : Tipo do documento (nfe | nfce | nfse)
 *   - numero            : Número da nota
 *   - serie             : Série da nota
 *   - chave_acesso      : Chave de acesso de 44 dígitos (UNIQUE)
 *
 * DADOS DO DESTINATÁRIO:
 *   - destinatario_nome     : Nome/Razão Social do destinatário
 *   - destinatario_documento: CPF (11 dígitos) ou CNPJ (14 dígitos)
 *
 * STATUS E CICLO DE VIDA:
 *   - status            : Estado atual da nota
 *     rascunho | aguardando | autorizada | cancelada | inutilizada | erro | denegada
 *   - motivo_cancelamento: Motivo informado ao cancelar
 *   - protocolo         : Protocolo de autorização da SEFAZ
 *
 * XML E DADOS DA SEFAZ:
 *   - xml_autorizado    : XML da nota autorizada (NF-e/NFC-e)
 *   - xml_cancelamento  : XML do evento de cancelamento
 *   - resposta_api      : Resposta completa da API do provedor (JSON)
 *
 * VÍNCULOS COM MÓDULOS DO SISTEMA:
 *   - venda_id          : FK para vendas (nullable)
 *   - agendamento_id    : FK para agendamentos (nullable)
 *   - referencia_tipo   : Tipo de referência genérica para uso futuro
 *   - referencia_id     : ID da referência genérica
 *
 * RASTREABILIDADE DE INTEGRAÇÃO:
 *   - numero_requisicao : ID da requisição no provedor (para rastreio)
 *   - ambiente          : Ambiente em que foi emitida (homologacao | producao)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notas_fiscais", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "empresas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      // Identificação do documento
      tipo: {
        type: Sequelize.ENUM("nfe", "nfce", "nfse"),
        allowNull: false,
      },
      numero: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      serie: {
        type: Sequelize.STRING(3),
        allowNull: true,
      },
      chave_acesso: {
        type: Sequelize.STRING(44),
        allowNull: true,
        unique: true,
      },

      // Datas
      data_emissao: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      data_autorizacao: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // Destinatário
      destinatario_nome: {
        type: Sequelize.STRING(60),
        allowNull: true,
      },
      destinatario_documento: {
        type: Sequelize.STRING(14),
        allowNull: true,
        comment: "CPF (11 dígitos) ou CNPJ (14 dígitos) sem formatação",
      },

      // Operação
      natureza_operacao: {
        type: Sequelize.STRING(60),
        allowNull: true,
      },
      valor_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },

      // Status e ciclo de vida
      status: {
        type: Sequelize.ENUM(
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
        type: Sequelize.TEXT,
        allowNull: true,
      },
      protocolo: {
        type: Sequelize.STRING(15),
        allowNull: true,
      },

      // XML e resposta da SEFAZ/provedor
      xml_autorizado: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      xml_cancelamento: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resposta_api: {
        type: Sequelize.JSON,
        allowNull: true,
        comment:
          "Resposta completa da API do provedor para rastreio e debugging",
      },

      // Vínculos com módulos do sistema
      venda_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "vendas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      agendamento_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "agendamentos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      referencia_tipo: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment:
          "Tipo de referência genérica (ex: orcamento, entrada) para uso futuro",
      },
      referencia_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "ID da referência genérica",
      },

      // Rastreabilidade de integração
      numero_requisicao: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "ID da requisição no provedor para rastreio de retorno",
      },
      ambiente: {
        type: Sequelize.ENUM("homologacao", "producao"),
        allowNull: false,
        defaultValue: "homologacao",
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

    // Índices para performance na Central Fiscal
    await queryInterface.addIndex("notas_fiscais", ["empresa_id"], {
      name: "idx_notas_fiscais_empresa",
    });
    await queryInterface.addIndex("notas_fiscais", ["status"], {
      name: "idx_notas_fiscais_status",
    });
    await queryInterface.addIndex("notas_fiscais", ["venda_id"], {
      name: "idx_notas_fiscais_venda",
    });
    await queryInterface.addIndex("notas_fiscais", ["agendamento_id"], {
      name: "idx_notas_fiscais_agendamento",
    });
    await queryInterface.addIndex(
      "notas_fiscais",
      ["empresa_id", "tipo", "status"],
      {
        name: "idx_notas_fiscais_empresa_tipo_status",
      },
    );
    await queryInterface.addIndex("notas_fiscais", ["data_emissao"], {
      name: "idx_notas_fiscais_data_emissao",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notas_fiscais").catch(() => {});
  },
};
