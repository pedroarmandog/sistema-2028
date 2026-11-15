require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'production';
const { sequelize } = require('../models');
(async () => { try {
    await require('../services/clientePortal/modelos').preparar(sequelize);
    console.log('Estrutura complementar do PetHub Cliente preparada. Registros do ERP preservados.');
}
catch (e) {
    console.error('Falha ao preparar PetHub Cliente:', e.message);
    process.exitCode = 1;
}
finally {
    await sequelize.close();
} })();
