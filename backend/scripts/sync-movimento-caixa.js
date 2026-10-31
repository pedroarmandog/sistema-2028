const { MovimentoCaixa, sequelize } = require('../models/MovimentoCaixa');

async function syncMovimentoCaixa() {
    try {
        console.log('🔄 Sincronizando tabela de movimentos de caixa...');
        
        // Forçar a criação da tabela
        await MovimentoCaixa.sync({ force: false, alter: true });
        
        console.log('✅ Tabela de movimentos de caixa sincronizada com sucesso!');
        console.log('📋 Estrutura da tabela:');
        console.log('   - id (INTEGER, AUTO_INCREMENT)');
        console.log('   - tipo (ENUM: entrada, saida)');
        console.log('   - observacao (STRING)');
        console.log('   - valor (DECIMAL)');
        console.log('   - data (DATE)');
        console.log('   - usuarioId (INTEGER)');
        console.log('   - caixaId (INTEGER)');
        console.log('   - createdAt (DATE)');
        console.log('   - updatedAt (DATE)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao sincronizar tabela de movimentos de caixa:', error);
        process.exit(1);
    }
}

syncMovimentoCaixa();
