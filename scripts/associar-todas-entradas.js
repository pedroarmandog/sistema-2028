const models = require('../backend/models');

async function associarTodasEntradas() {
    try {
        console.log('🔍 Buscando todas as entradas...\n');
        
        const entradas = await models.Entrada.findAll({
            order: [['id', 'DESC']]
        });
        
        console.log(`📦 Total de entradas: ${entradas.length}\n`);
        
        let totalEntradas = 0;
        let totalItensAtualizados = 0;
        let totalItensJaAssociados = 0;
        let totalItensNaoEncontrados = 0;
        
        for (const entrada of entradas) {
            const itens = entrada.itens || [];
            
            if (itens.length === 0) {
                console.log(`⏭️  Entrada ${entrada.id} - Sem itens`);
                continue;
            }
            
            let atualizados = 0;
            let jaAssociados = 0;
            let naoEncontrados = 0;
            
            for (let item of itens) {
                if (item.matchedId) {
                    jaAssociados++;
                    continue;
                }
                
                if (!item.descricao) {
                    naoEncontrados++;
                    continue;
                }
                
                // Normalizar nome para busca
                const nomeNormalizado = item.descricao.trim().toUpperCase().replace(/\s+/g, ' ');
                
                // Buscar produto por nome
                const produto = await models.Produto.findOne({
                    where: models.sequelize.where(
                        models.sequelize.fn('UPPER', models.sequelize.col('nome')),
                        nomeNormalizado
                    )
                });
                
                if (produto) {
                    item.matchedId = produto.id;
                    atualizados++;
                } else {
                    naoEncontrados++;
                }
            }
            
            // Salvar entrada se houve atualizações
            if (atualizados > 0) {
                await entrada.update({ itens });
                totalEntradas++;
                totalItensAtualizados += atualizados;
                console.log(`✅ Entrada ${entrada.id} (${entrada.fornecedor?.substring(0, 30)}) - ${atualizados} itens associados`);
            } else if (jaAssociados === itens.length) {
                console.log(`✓  Entrada ${entrada.id} - Já associada (${jaAssociados} itens)`);
            } else {
                console.log(`⚠️  Entrada ${entrada.id} - ${naoEncontrados} itens não encontrados`);
            }
            
            totalItensJaAssociados += jaAssociados;
            totalItensNaoEncontrados += naoEncontrados;
        }
        
        console.log('\n📊 RESUMO FINAL:');
        console.log(`   📦 Entradas processadas: ${entradas.length}`);
        console.log(`   💾 Entradas atualizadas: ${totalEntradas}`);
        console.log(`   ✅ Itens já associados: ${totalItensJaAssociados}`);
        console.log(`   🔄 Itens associados agora: ${totalItensAtualizados}`);
        console.log(`   ❌ Itens não encontrados: ${totalItensNaoEncontrados}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        console.error(err);
        process.exit(1);
    }
}

associarTodasEntradas();
