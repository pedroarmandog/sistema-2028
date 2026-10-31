/**
 * Script para criar/sincronizar a tabela profissionais no banco de dados
 * Uso: node backend/scripts/sync-profissionais.js
 */

const { Profissional, sequelize } = require('../models/Profissional');

async function syncProfissionais() {
    console.log('🔄 Sincronizando tabela profissionais...');
    
    try {
        // Testar conexão
        await sequelize.authenticate();
        console.log('✅ Conexão com banco de dados estabelecida');
        
        // Sincronizar tabela (cria se não existir, altera se necessário)
        await Profissional.sync({ alter: true });
        console.log('✅ Tabela profissionais sincronizada com sucesso!');
        
        // Verificar se tabela foi criada
        const [results] = await sequelize.query('SHOW TABLES LIKE "profissionais"');
        if (results.length > 0) {
            console.log('✅ Tabela profissionais existe no banco');
            
            // Mostrar estrutura da tabela
            const [columns] = await sequelize.query('DESCRIBE profissionais');
            console.log('\n📋 Estrutura da tabela:');
            console.table(columns);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao sincronizar tabela:', error);
        process.exit(1);
    }
}

syncProfissionais();
