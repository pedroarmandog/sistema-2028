const models = require('../backend/models');
const { Op } = require('sequelize');

async function verificarProdutos() {
    try {
        // Buscar produtos com nome contendo QUATREE
        const prods = await models.Produto.findAll({
            where: {
                nome: {
                    [Op.like]: '%QUATREE%'
                }
            },
            limit: 10
        });
        
        console.log(`\n📦 Produtos QUATREE encontrados: ${prods.length}\n`);
        
        prods.forEach(p => {
            console.log(`  ID ${p.id} - Cód: ${p.codigo || '(sem código)'} - ${p.nome.substring(0,50)}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO:', err.message);
        process.exit(1);
    }
}

verificarProdutos();
