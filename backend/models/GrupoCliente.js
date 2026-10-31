const { DataTypes } = require('sequelize');
// Usar a instância compartilhada do sequelize definida em Cliente.js
const { sequelize } = require('./Cliente');

const GrupoCliente = sequelize.define('GrupoCliente', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    descricao: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    cor: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: '#007bff',
        comment: 'Cor em hexadecimal para identificação visual'
    }
}, {
    tableName: 'grupos_clientes',
    timestamps: true
});

module.exports = GrupoCliente;
