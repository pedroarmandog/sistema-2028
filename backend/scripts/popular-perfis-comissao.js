const { sequelize } = require('../models/Cliente');
const PerfilComissaoFactory = require('../models/PerfilComissao');

async function popularPerfisComissao() {
    try {
        console.log('🚀 Iniciando população de perfis de comissão...');
        
        // Inicializar o modelo
        const PerfilComissao = PerfilComissaoFactory(sequelize);
        
        // Conectar ao banco de dados
        await sequelize.authenticate();
        console.log('✅ Conectado ao banco de dados');

        // Sincronizar a tabela
        await PerfilComissao.sync();
        console.log('✅ Tabela perfis_comissao sincronizada');

        // Dados dos perfis de comissão
        const perfis = [
            {
                perfilVendedor: 'SERVIÇOS',
                descricao: 'Perfil de comissão para serviços gerais',
                percentual: 0.00
            },
            {
                perfilVendedor: 'PRESTADOR DE SERVIÇO',
                descricao: 'Perfil de comissão para prestadores de serviço',
                percentual: 0.00
            },
            {
                perfilVendedor: 'BANHISTA',
                descricao: 'Perfil de comissão para banhistas',
                percentual: 0.00
            }
        ];

        // Verificar se já existem perfis
        const count = await PerfilComissao.count();
        
        if (count > 0) {
            console.log(`⚠️  Já existem ${count} perfis de comissão cadastrados`);
            console.log('🗑️  Removendo perfis existentes...');
            await PerfilComissao.destroy({ where: {}, truncate: true });
        }

        // Inserir os perfis
        console.log('📝 Inserindo perfis de comissão...');
        
        for (const perfil of perfis) {
            await PerfilComissao.create(perfil);
            console.log(`   ✓ ${perfil.perfilVendedor}`);
        }

        console.log(`\n✅ ${perfis.length} perfis de comissão inseridos com sucesso!`);
        
        // Listar os perfis inseridos
        const perfisInseridos = await PerfilComissao.findAll({
            order: [['perfilVendedor', 'ASC']]
        });
        
        console.log('\n📋 Perfis cadastrados:');
        perfisInseridos.forEach((p, index) => {
            console.log(`   ${index + 1}. ${p.perfilVendedor} (ID: ${p.id}, Percentual: ${p.percentual}%)`);
        });

        await sequelize.close();
        console.log('\n🔒 Conexão fechada');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro ao popular perfis de comissão:', error);
        process.exit(1);
    }
}

popularPerfisComissao();
