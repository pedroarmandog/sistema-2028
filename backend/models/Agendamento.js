const { DataTypes } = require("sequelize");
const { sequelize } = require("./Cliente");

const Agendamento = sequelize.define(
  "Agendamento",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    dataAgendamento: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Data e hora do agendamento",
    },
    horario: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: "Horário do agendamento (formato HH:MM)",
    },
    servico: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "Tipo de serviço (consulta, banho, vacina, etc.)",
    },
    servicos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment:
        "Array de serviços/produtos detalhados (cada item com nome, quantidade, valor, etc.)",
    },
    pagamentos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Array de pagamentos efetuados (forma, valor, detalhes)",
    },
    totalPago: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Total efetivamente pago no atendimento",
    },
    prontuario: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Registros do prontuário clínico (anotações, receituário, etc.)",
    },
    clinicaState: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "clinica_state",
      comment: "Estado da UI da aba clínica (ultima aba/sub-aba selecionada)",
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Observações sobre o agendamento",
    },
    profissional: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Nome do profissional responsável",
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Valor do serviço",
    },
    status: {
      type: DataTypes.ENUM(
        "agendado",
        "checkin",
        "pronto",
        "concluido",
        "cancelado",
      ),
      allowNull: false,
      defaultValue: "agendado",
      comment: "Status do agendamento",
    },
    taxidog: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: "Indica se o agendamento teve serviço de taxi dog",
    },
    petId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "pets",
        key: "id",
      },
      comment: "ID do pet relacionado",
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID da empresa proprietária do agendamento",
    },
  },
  {
    tableName: "agendamentos",
    timestamps: true,
    indexes: [
      {
        fields: ["dataAgendamento"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["petId"],
      },
    ],
  },
);

module.exports = { Agendamento };
