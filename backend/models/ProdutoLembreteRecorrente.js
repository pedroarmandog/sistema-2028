/**
 * Model: ProdutoLembreteRecorrente
 * Armazena os lembretes automáticos de produtos recorrentes por cliente.
 * Cada registro representa um ciclo ativo de lembrete para um produto específico.
 */
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ProdutoLembreteRecorrente = sequelize.define(
    "ProdutoLembreteRecorrente",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Produto pode ser identificado por ID (string para compatibilidade com tabela itens)
      produto_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      produto_nome: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "Produto",
      },
      // Referência à venda que originou o lembrete
      venda_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Lembrete ativo ou não
      ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      // Quantidade de dias do ciclo de recompra (ex: 30 = ração de 30 dias)
      dias_lembrete: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      // Data da última compra/venda deste produto
      data_ultima_venda: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Data calculada para o próximo disparo (data_ultima_venda + dias_lembrete - 1)
      data_proximo_disparo: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Timestamp da última execução do cron para este lembrete
      ultima_execucao: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Status do ciclo: ativo = aguardando disparo, pausado = pausado, cancelado = desligado
      status: {
        type: DataTypes.ENUM("ativo", "pausado", "cancelado"),
        defaultValue: "ativo",
      },
    },
    {
      tableName: "produto_lembrete_recorrente",
      timestamps: true,
      indexes: [
        { fields: ["empresa_id"] },
        { fields: ["cliente_id"] },
        { fields: ["data_proximo_disparo"] },
        { fields: ["ativo", "status"] },
      ],
    },
  );

  return ProdutoLembreteRecorrente;
};
