const { Cliente } = require("../models/Cliente");
const { Pet } = require("../models/Pet");
const { Agendamento } = require("../models/Agendamento");

async function popularAgendamentos() {
  try {
    // Primeiro, vamos verificar se há pets disponíveis
    const pets = await Pet.findAll({ limit: 3 });

    if (pets.length === 0) {
      console.log("Nenhum pet encontrado. Criando dados de teste...");

      // Criar cliente de teste
      const cliente = await Cliente.create({
        nome: "João Silva",
        email: "joao@exemplo.com",
        telefone: "(11) 99999-9999",
      });

      // Criar pet de teste
      const pet = await Pet.create({
        nome: "Rex",
        cliente_id: cliente.id,
        raca: "Labrador",
        genero: "Macho",
        porte: "Grande",
        data_nascimento: "2020-05-15",
      });

      pets.push(pet);
    }

    // Criar agendamentos de teste
    const agendamentosParaCriar = [
      {
        dataAgendamento: new Date(),
        horario: "09:00:00",
        servico: "Consulta Veterinária",
        profissional: "Dr. Maria Santos",
        valor: 150.0,
        status: "agendado",
        petId: pets[0].id,
        observacoes: "Primeiro agendamento de teste",
      },
      {
        dataAgendamento: new Date(),
        horario: "14:30:00",
        servico: "Banho e Tosa",
        profissional: "Ana Costa",
        valor: 80.0,
        status: "checkin",
        petId: pets[0].id,
        observacoes: "Pet já chegou",
      },
      {
        dataAgendamento: new Date(),
        horario: "16:00:00",
        servico: "Vacinação",
        profissional: "Dr. Pedro Lima",
        valor: 120.0,
        status: "pronto",
        petId: pets[0].id,
        observacoes: "Vacinação concluída",
      },
      {
        dataAgendamento: new Date(),
        horario: "11:00:00",
        servico: "Consulta de Rotina",
        profissional: "Dra. Carla Souza",
        valor: 100.0,
        status: "cancelado",
        petId: pets[0].id,
        observacoes: "Cancelado pelo cliente",
      },
    ];

    // Verificar se já existem agendamentos (usar count para evitar fetch massivo)
    const agendamentosCount = await Agendamento.count();

    if (agendamentosCount === 0) {
      console.log("Criando agendamentos de teste...");

      for (const agendamentoData of agendamentosParaCriar) {
        const agendamento = await Agendamento.create(agendamentoData);
        console.log(
          `Agendamento criado: ${agendamento.servico} - Status: ${agendamento.status}`,
        );
      }

      console.log("Agendamentos de teste criados com sucesso!");
    } else {
      console.log(`${agendamentosCount} agendamentos já existem no sistema.`);
    }
  } catch (error) {
    console.error("Erro ao popular agendamentos:", error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  popularAgendamentos()
    .then(() => {
      console.log("Script finalizado");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Erro:", error);
      process.exit(1);
    });
}

module.exports = { popularAgendamentos };
