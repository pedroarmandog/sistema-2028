const models = require('../backend/models');

async function associarProdutos() {
    try {
        console.log('🔍 Buscando entrada 50...\n');
        
        const entrada = await models.Entrada.findByPk(50);
        
        if (!entrada) {
            console.log('❌ Entrada 50 não encontrada');
            process.exit(1);
        }
        
        const itens = entrada.itens || [];
        console.log(`📦 Total de itens na entrada: ${itens.length}\n`);
        
        let atualizados = 0;
        let jaAssociados = 0;
        let naoEncontrados = [];
        
        // Para cada item sem matchedId, tentar encontrar o produto pelo código
        for (let item of itens) {
            if (item.matchedId) {
                jaAssociados++;
                continue;
            }
            
            if (!item.codigo) {
                naoEncontrados.push({ descricao: item.descricao, motivo: 'Sem código' });
                continue;
            }
            
            // Buscar produto pelo código
            const produto = await models.Produto.findOne({
                where: { codigo: item.codigo }
            });
            
            if (produto) {
                item.matchedId = produto.id;
                atualizados++;
                console.log(`✅ ${item.codigo} → Produto ID ${produto.id} (${produto.nome})`);
            } else {
                naoEncontrados.push({ codigo: item.codigo, descricao: item.descricao, motivo: 'Produto não encontrado' });
                console.log(`⚠️  ${item.codigo} → Produto não encontrado`);
            }
        }
        
        // Salvar entrada atualizada
        if (atualizados > 0) {
            await entrada.update({ itens });
            console.log(`\n💾 Entrada atualizada com ${atualizados} matchedId(s)\n`);
        }
        
        // Resumo
        console.log('📊 RESUMO:');
        console.log(`   ✅ Já associados: ${jaAssociados}`);
        console.log(`   🔄 Atualizados: ${atualizados}`);
        console.log(`   ❌ Não encontrados: ${naoEncontrados.length}`);
        
        if (naoEncontrados.length > 0) {
            console.log('\n⚠️  ITENS NÃO ENCONTRADOS:');
            naoEncontrados.forEach(item => {
                console.log(`   - ${item.codigo || '(sem código)'}: ${item.descricao?.substring(0, 40)} - ${item.motivo}`);
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        console.error(err);
        process.exit(1);
    }
}

associarProdutos();
