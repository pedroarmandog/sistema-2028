/**
 * Model: MensagemAutomatica
 * Templates de mensagens automáticas configuradas pelo usuário.
 * Preparado para SaaS (empresaId).
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MensagemAutomatica = sequelize.define('MensagemAutomatica', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    // Identificador do tipo (ex: 'boas_vindas', 'lembrete_agendamento', etc.)
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    // Texto com variáveis dinâmicas {nome_tutor}, {nome_pet}, etc.
    conteudo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Caminho da imagem opcional a enviar junto
    imagemPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // Mensagem ativa ou não
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Configuração de quando enviar (JSON): { tipo: 'no_dia'|'dias_antes', valor: 1, hora: '09:00' }
    configuracaoEnvio: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Ícone/categoria para exibição no frontend
    icone: {
      type: DataTypes.STRING(50),
      defaultValue: 'fa-calendar',
    },
    // Descrição de marketing para exibir no painel
    descricaoMarketing: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'mensagens_automaticas',
    timestamps: true,
  });

  return MensagemAutomatica;
};
