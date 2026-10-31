const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Periodicidade = sequelize.define('Periodicidade', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        descricao: {
            type: DataTypes.STRING(256),
            allowNull: false
        },
        dias: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        tableName: 'periodicidades',
        timestamps: true
    });

    return Periodicidade;
};
