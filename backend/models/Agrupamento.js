const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Agrupamento = sequelize.define('Agrupamento', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        subgrupos: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        }
    }, {
        tableName: 'agrupamentos',
        timestamps: true
    });

    return Agrupamento;
};
