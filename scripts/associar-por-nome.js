const models = require('../backend/models');

async function associarPorNome() {
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
        
        for (let item of itens) {
            if (item.matchedId) {
                jaAssociados++;
                continue;
            }
            
            if (!item.descricao) {
                naoEncontrados.push({ motivo: 'Sem descrição' });
                continue;
            }
            
            // Normalizar nome para busca (remover espaços extras, converter para maiúsculas)
            const nomeNormalizado = item.descricao.trim().toUpperCase().replace(/\s+/g, ' ');
            
            // Buscar produto por nome similar
            const produto = await models.Produto.findOne({
                where: models.sequelize.where(
                    models.sequelize.fn('UPPER', models.sequelize.col('nome')),
                    nomeNormalizado
                )
            });
            
            if (produto) {
                item.matchedId = produto.id;
                atualizados++;
                console.log(`✅ "${item.descricao.substring(0, 40)}" → Produto ID ${produto.id}`);
            } else {
                naoEncontrados.push({ descricao: item.descricao, motivo: 'Produto não encontrado' });
                console.log(`⚠️  "${item.descricao.substring(0, 40)}" → Produto não encontrado`);
            }
        }
        
        // Salvar entrada atualizada
        if (atualizados > 0) {
            await entrada.update({ itens });
            console.log(`\n💾 Entrada atualizada com ${atualizados} matchedId(s)\n`);
        }
        
        console.log('📊 RESUMO:');
        console.log(`   ✅ Já associados: ${jaAssociados}`);
        console.log(`   🔄 Atualizados: ${atualizados}`);
        console.log(`   ❌ Não encontrados: ${naoEncontrados.length}`);
        
        if (naoEncontrados.length > 0 && naoEncontrados.length <= 10) {
            console.log('\n⚠️  ITENS NÃO ENCONTRADOS:');
            naoEncontrados.forEach(item => {
                console.log(`   - ${item.descricao?.substring(0, 50)} - ${item.motivo}`);
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        console.error(err);
        process.exit(1);
    }
}

associarPorNome();
