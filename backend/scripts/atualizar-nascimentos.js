const { Cliente } = require('../models/Cliente');

async function atualizarNascimentos() {
    try {
        console.log('🎂 Atualizando datas de nascimento...');
        
        // Conectar ao banco
        await Cliente.sync();
        console.log('✅ Conexão com banco estabelecida');
        
        // Pegar alguns clientes para atualizar
        const clientes = await Cliente.findAll({ limit: 10 });
        console.log(`📊 Encontrados ${clientes.length} clientes para atualizar`);
        
        const hoje = new Date();
        const updatesPromises = [];
        
        // Definir datas de nascimento variadas
        const datasNascimento = [
            // Aniversário hoje (27 de outubro)
            new Date(1990, 9, 27), // mês 9 = outubro (0-indexed)
            new Date(1985, 9, 27),
            
            // Aniversários esta semana (21-27 de outubro)
            new Date(1992, 9, 25),
            new Date(1988, 9, 23),
            
            // Aniversários este mês (outubro)
            new Date(1993, 9, 15),
            new Date(1987, 9, 8),
            new Date(1995, 9, 30),
            
            // Aniversários outros meses
            new Date(1991, 7, 15), // agosto
            new Date(1989, 11, 5), // dezembro
            new Date(1994, 2, 20)  // março
        ];
        
        // Atualizar clientes com datas de nascimento
        clientes.forEach((cliente, index) => {
            if (index < datasNascimento.length) {
                const dataNascimento = datasNascimento[index];
                
                // Calcular idade
                let idade = hoje.getFullYear() - dataNascimento.getFullYear();
                const mes = hoje.getMonth() - dataNascimento.getMonth();
                if (mes < 0 || (mes === 0 && hoje.getDate() < dataNascimento.getDate())) {
                    idade--;
                }
                
                const updatePromise = cliente.update({
                    data_nascimento: dataNascimento,
                    idade: idade
                }).then(() => {
                    const tipoAniversario = index < 2 ? '🎉 HOJE' : 
                                          index < 4 ? '📅 ESTA SEMANA' :
                                          index < 7 ? '🗓️ ESTE MÊS' : '📆 OUTRO MÊS';
                    console.log(`✅ ${cliente.nome}: ${dataNascimento.toLocaleDateString('pt-BR')} (${idade} anos) ${tipoAniversario}`);
                });
                
                updatesPromises.push(updatePromise);
            }
        });
        
        // Executar todas as atualizações
        await Promise.all(updatesPromises);
        
        console.log('🎉 Processo concluído!');
        console.log(`📈 ${updatesPromises.length} clientes atualizados com datas de nascimento`);
        
        // Mostrar estatísticas
        const aniversariantesHoje = await Cliente.count({
            where: {
                data_nascimento: {
                    [require('sequelize').Op.and]: [
                        require('sequelize').literal(`DAY(data_nascimento) = DAY(NOW())`),
                        require('sequelize').literal(`MONTH(data_nascimento) = MONTH(NOW())`)
                    ]
                }
            }
        });
        
        const aniversariantesEsteMes = await Cliente.count({
            where: {
                data_nascimento: {
                    [require('sequelize').Op.and]: [
                        require('sequelize').literal(`MONTH(data_nascimento) = MONTH(NOW())`)
                    ]
                }
            }
        });
        
        console.log('\n📋 Estatísticas:');
        console.log(`   Aniversariantes hoje: ${aniversariantesHoje}`);
        console.log(`   Aniversariantes este mês: ${aniversariantesEsteMes}`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        process.exit();
    }
}

atualizarNascimentos();