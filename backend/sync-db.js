const { Cliente, Pet, Agendamento } = require('./models');
const { sequelize } = require('./models/Cliente');
const HistoricoEstoque = require('./models/HistoricoEstoque');
const { Venda } = require('./models/Venda');

async function syncDatabase() {
    try {
        console.log('🔄 Sincronizando banco de dados...');
        
        // Sincronizar tabelas (alter: true irá ajustar estrutura)
        await sequelize.sync({ alter: true });
        
        // Sincronizar HistoricoEstoque separadamente
        await HistoricoEstoque.sync({ alter: true });
        console.log('✅ Tabela historico_estoque sincronizada!');
        
        // Sincronizar Venda separadamente
        await Venda.sync({ alter: true });
        console.log('✅ Tabela vendas sincronizada!');
        
        console.log('✅ Banco de dados sincronizado com sucesso!');
        
        // Verificar estrutura das tabelas
        const petsTable = await sequelize.query("DESCRIBE pets");
        console.log('📋 Estrutura da tabela pets:', petsTable[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao sincronizar banco:', error);
        process.exit(1);
    }
}

syncDatabase();