const { Caixa, sequelize } = require('../models/Caixa');

async function syncCaixa() {
    try {
        console.log('🔄 Sincronizando tabela de caixas...');
        
        // Forçar a criação da tabela
        await Caixa.sync({ force: false, alter: true });
        
        console.log('✅ Tabela de caixas sincronizada com sucesso!');
        console.log('📋 Estrutura da tabela:');
        console.log('   - id (INTEGER, AUTO_INCREMENT)');
        console.log('   - numero (STRING)');
        console.log('   - aberto (BOOLEAN)');
        console.log('   - usuarioId (INTEGER)');
        console.log('   - usuario (STRING)');
        console.log('   - dataAbertura (DATE)');
        console.log('   - dataFechamento (DATE)');
        console.log('   - saldoInicial (DECIMAL)');
        console.log('   - valorFundoTroco (DECIMAL)');
        console.log('   - saldoFinal (DECIMAL)');
        console.log('   - createdAt (DATE)');
        console.log('   - updatedAt (DATE)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao sincronizar tabela de caixas:', error);
        process.exit(1);
    }
}

syncCaixa();
