const { Agrupamento } = require('../models');

const agrupamentosTeste = [
    {
        name: 'Assinatura Centro de Estética',
        subgrupos: ['Banho e Tosa', 'BANHO E TOSA', 'BANHOS AVULSOS', 'TOSAS', 'ADICIONAIS', 'PLANOS']
    },
    {
        name: 'CONSULTÓRIO',
        subgrupos: ['CONSULTAS', 'EXAMES', 'PROCEDIMENTOS CLINICOS', 'PROCEDIMENTO CIRURGICO']
    },
    {
        name: 'LOJA',
        subgrupos: ['RAÇÕES', 'MEDICAMENTOS', 'VACINAS', 'VERMIFUGOS', 'ANTIPARASITARIOS', 'BRINQUEDOS', 'HIGIENE', 'ROUPAS']
    },
    {
        name: 'Consultorio',
        subgrupos: []
    },
    {
        name: 'Teste 9',
        subgrupos: []
    },
    {
        name: 'Ladinho',
        subgrupos: []
    },
    {
        name: 'teste 5',
        subgrupos: []
    }
];

async function popular() {
    try {
        console.log('🔄 Populando agrupamentos...');
        
        for (const agrup of agrupamentosTeste) {
            const [agrupamento, created] = await Agrupamento.findOrCreate({
                where: { name: agrup.name },
                defaults: {
                    name: agrup.name,
                    subgrupos: agrup.subgrupos
                }
            });
            
            if (created) {
                console.log(`✅ Criado: ${agrup.name} (${agrup.subgrupos.length} subgrupos)`);
            } else {
                console.log(`⏭️  Já existe: ${agrup.name}`);
            }
        }
        
        console.log('\n✅ Agrupamentos populados com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao popular agrupamentos:', error);
        process.exit(1);
    }
}

popular();
