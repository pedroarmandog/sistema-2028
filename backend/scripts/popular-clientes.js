const { Cliente, sequelize } = require('../models/Cliente');

// Lista de 51 clientes fictícios
const clientesFicticios = [
    {
        nome: 'Ana Silva Santos',
        telefone: '(11) 98765-4321',
        email: 'ana.silva@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Carlos Eduardo Lima',
        telefone: '(11) 97654-3210',
        email: 'carlos.lima@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Maria Fernanda Costa',
        telefone: '(11) 96543-2109',
        email: 'maria.costa@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'João Pedro Oliveira',
        telefone: '(11) 95432-1098',
        email: 'joao.oliveira@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Juliana Aparecida Souza',
        telefone: '(11) 94321-0987',
        email: 'juliana.souza@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Roberto Carlos Ferreira',
        telefone: '(11) 93210-9876',
        email: 'roberto.ferreira@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Fernanda Cristina Alves',
        telefone: '(11) 92109-8765',
        email: 'fernanda.alves@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Ricardo Henrique Pereira',
        telefone: '(11) 91098-7654',
        email: 'ricardo.pereira@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Camila dos Santos Rosa',
        telefone: '(11) 90987-6543',
        email: 'camila.rosa@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Diego Martins Ribeiro',
        telefone: '(11) 89876-5432',
        email: 'diego.ribeiro@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Patrícia Gomes Silva',
        telefone: '(11) 88765-4321',
        email: 'patricia.silva@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Lucas Gabriel Mendes',
        telefone: '(11) 87654-3210',
        email: 'lucas.mendes@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Beatriz Helena Castro',
        telefone: '(11) 86543-2109',
        email: 'beatriz.castro@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'André Luiz Barbosa',
        telefone: '(11) 85432-1098',
        email: 'andre.barbosa@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Vanessa Rodrigues Nunes',
        telefone: '(11) 84321-0987',
        email: 'vanessa.nunes@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Bruno César Cardoso',
        telefone: '(11) 83210-9876',
        email: 'bruno.cardoso@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Larissa Vitória Campos',
        telefone: '(11) 82109-8765',
        email: 'larissa.campos@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Felipe Augusto Moreira',
        telefone: '(11) 81098-7654',
        email: 'felipe.moreira@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Gabriela Cristiane Ramos',
        telefone: '(11) 80987-6543',
        email: 'gabriela.ramos@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Thiago Alexandre Torres',
        telefone: '(11) 79876-5432',
        email: 'thiago.torres@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Isabella Fernandes Silva',
        telefone: '(11) 78765-4321',
        email: 'isabella.fernandes@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Mateus Henrique Santos',
        telefone: '(11) 77654-3210',
        email: 'mateus.santos@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Natália Cristina Lima',
        telefone: '(11) 76543-2109',
        email: 'natalia.lima@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Rafael Eduardo Costa',
        telefone: '(11) 75432-1098',
        email: 'rafael.costa@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Amanda Vitória Oliveira',
        telefone: '(11) 74321-0987',
        email: 'amanda.oliveira@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Gustavo Rodrigues Souza',
        telefone: '(11) 73210-9876',
        email: 'gustavo.souza@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Priscila dos Santos Ferreira',
        telefone: '(11) 72109-8765',
        email: 'priscila.ferreira@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Leonardo Silva Alves',
        telefone: '(11) 71098-7654',
        email: 'leonardo.alves@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Renata Cristiane Pereira',
        telefone: '(11) 70987-6543',
        email: 'renata.pereira@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Daniel Augusto Rosa',
        telefone: '(11) 69876-5432',
        email: 'daniel.rosa@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Marcela Aparecida Ribeiro',
        telefone: '(11) 68765-4321',
        email: 'marcela.ribeiro@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Vinícius Gabriel Silva',
        telefone: '(11) 67654-3210',
        email: 'vinicius.silva@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Aline Cristina Mendes',
        telefone: '(11) 66543-2109',
        email: 'aline.mendes@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Rodrigo Henrique Castro',
        telefone: '(11) 65432-1098',
        email: 'rodrigo.castro@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Carla Fernanda Barbosa',
        telefone: '(11) 64321-0987',
        email: 'carla.barbosa@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Eduardo Carlos Nunes',
        telefone: '(11) 63210-9876',
        email: 'eduardo.nunes@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Tatiana dos Santos Cardoso',
        telefone: '(11) 62109-8765',
        email: 'tatiana.cardoso@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Alessandro Luiz Campos',
        telefone: '(11) 61098-7654',
        email: 'alessandro.campos@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Fabiana Cristiane Moreira',
        telefone: '(11) 60987-6543',
        email: 'fabiana.moreira@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Paulo Henrique Ramos',
        telefone: '(11) 59876-5432',
        email: 'paulo.ramos@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Simone Aparecida Torres',
        telefone: '(11) 58765-4321',
        email: 'simone.torres@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Marcelo Gabriel Santos',
        telefone: '(11) 57654-3210',
        email: 'marcelo.santos@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Luciana Vitória Lima',
        telefone: '(11) 56543-2109',
        email: 'luciana.lima@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Fábio Eduardo Costa',
        telefone: '(11) 55432-1098',
        email: 'fabio.costa@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Cristiane dos Santos Oliveira',
        telefone: '(11) 54321-0987',
        email: 'cristiane.oliveira@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Henrique Carlos Souza',
        telefone: '(11) 53210-9876',
        email: 'henrique.souza@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Monica Fernanda Ferreira',
        telefone: '(11) 52109-8765',
        email: 'monica.ferreira@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Adriano Luiz Alves',
        telefone: '(11) 51098-7654',
        email: 'adriano.alves@email.com',
        grupo_cliente: 'Banho (FRIO)'
    },
    {
        nome: 'Sabrina Cristina Pereira',
        telefone: '(11) 50987-6543',
        email: 'sabrina.pereira@email.com',
        grupo_cliente: 'Banho (MORNO)'
    },
    {
        nome: 'Igor Henrique Rosa',
        telefone: '(11) 49876-5432',
        email: 'igor.rosa@email.com',
        grupo_cliente: 'Banho (QUENTE)'
    },
    {
        nome: 'Eliane Aparecida Ribeiro',
        telefone: '(11) 48765-4321',
        email: 'eliane.ribeiro@email.com',
        grupo_cliente: 'Banho (FRIO)'
    }
];

async function popularBanco() {
    try {
        console.log('🚀 Iniciando população do banco de dados...');
        
        // Sincronizar banco
        await sequelize.sync();
        console.log('✅ Conexão com banco estabelecida');
        
        // Verificar se já existem clientes
        const clientesExistentes = await Cliente.count();
        console.log(`📊 Clientes existentes no banco: ${clientesExistentes}`);
        
        // Adicionar clientes fictícios
        let clientesAdicionados = 0;
        
        for (const clienteData of clientesFicticios) {
            try {
                // Verificar se já existe um cliente com este email
                const clienteExistente = await Cliente.findOne({
                    where: { email: clienteData.email }
                });
                
                if (!clienteExistente) {
                    await Cliente.create(clienteData);
                    clientesAdicionados++;
                    console.log(`✅ Cliente adicionado: ${clienteData.nome} (${clienteData.grupo_cliente})`);
                } else {
                    console.log(`⚠️ Cliente já existe: ${clienteData.nome}`);
                }
            } catch (error) {
                console.error(`❌ Erro ao adicionar ${clienteData.nome}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Processo concluído!`);
        console.log(`📈 ${clientesAdicionados} novos clientes adicionados`);
        console.log(`📊 Total de clientes no banco: ${await Cliente.count()}`);
        
        // Mostrar distribuição por grupo
        console.log('\n📋 Distribuição por grupos:');
        const grupos = ['Banho (MORNO)', 'Banho (QUENTE)', 'Banho (FRIO)'];
        
        for (const grupo of grupos) {
            const count = await Cliente.count({
                where: { grupo_cliente: grupo }
            });
            console.log(`   ${grupo}: ${count} clientes`);
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await sequelize.close();
        console.log('\n🔌 Conexão com banco fechada');
        process.exit(0);
    }
}

// Executar script
popularBanco();