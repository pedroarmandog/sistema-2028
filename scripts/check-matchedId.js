const models = require('../backend/models');

async function check() {
    try {
        const entrada = await models.Entrada.findByPk(50);
        
        if (!entrada) {
            console.log('❌ Entrada 50 não encontrada');
            process.exit(1);
        }
        
        const itens = entrada.itens || [];
        console.log(`\n📦 ENTRADA 50 - Total de itens: ${itens.length}\n`);
        
        if (itens.length > 0) {
            console.log('🔍 PRIMEIRO ITEM:');
            console.log(JSON.stringify(itens[0], null, 2));
            console.log(`\n✅ TEM matchedId? ${itens[0].matchedId ? 'SIM (' + itens[0].matchedId + ')' : 'NÃO'}`);
            
            // Verificar quantos itens têm matchedId
            const comMatch = itens.filter(i => i.matchedId).length;
            const semMatch = itens.length - comMatch;
            
            console.log(`\n📊 RESUMO:`);
            console.log(`   ✅ Com matchedId: ${comMatch}`);
            console.log(`   ❌ Sem matchedId: ${semMatch}`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        process.exit(1);
    }
}

check();
