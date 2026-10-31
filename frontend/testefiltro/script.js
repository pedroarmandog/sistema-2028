// Lista de agendamentos (poderia vir do banco)
const agendamentos = [
  {
    horario: "09:00",
    pet: "Pitucha",
    cliente: "Karoline",
    detalhes: "Banho Premium - Porte Pequeno",
    profissional: "Maria Júlia",
    valor: "R$ 75,90",
    situacao: "agendado"
  },
  {
    horario: "17:00",
    pet: "Tulipa",
    cliente: "Fabricio Bruno",
    detalhes: "Banho Premium - Porte Médio",
    profissional: "Ana Costa",
    valor: "R$ 85,90",
    situacao: "pronto"
  },
  {
    horario: "18:00",
    pet: "Bebel",
    cliente: "Fabricio Bruno",
    detalhes: "Banho Premium - Porte Médio",
    profissional: "Pedro Santos",
    valor: "R$ 85,90",
    situacao: "checkin"
  },
  {
    horario: "19:49",
    pet: "Cleo",
    cliente: "Alessandro Luiz Campos",
    detalhes: "Banho Premium - Porte Pequeno",
    profissional: "Carlos Silva",
    valor: "R$ 75,90",
    situacao: "agendado"
  }
];

const tabela = document.getElementById("lista-agendamentos");
const botoes = document.querySelectorAll(".filtro-btn");

// Função para renderizar
function renderizar(filtro) {
  tabela.innerHTML = "";

  const filtrados = filtro === "todos"
    ? agendamentos
    : agendamentos.filter(a => a.situacao === filtro);

  filtrados.forEach(a => {
    const linha = `
      <tr>
        <td>${a.horario}</td>
        <td><strong>${a.pet}</strong><br>${a.cliente}</td>
        <td>${a.detalhes}</td>
        <td>${a.profissional}</td>
        <td>${a.valor}</td>
        <td><span class="tag ${a.situacao}">${a.situacao}</span></td>
      </tr>
    `;

    tabela.innerHTML += linha;
  });
}

// Inicializa com "todos"
renderizar("todos");

// Controle dos botões
botoes.forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelector(".filtro-btn.ativo").classList.remove("ativo");
    btn.classList.add("ativo");

    const filtro = btn.dataset.filter;
    renderizar(filtro);
  });
});
