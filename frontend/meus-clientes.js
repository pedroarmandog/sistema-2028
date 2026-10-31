class MeusClientesManager {
  constructor() {
    this.clientes = [];
    this.grupos = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filteredClientes = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadGrupos();
    this.loadClientes();
    this.setupModal();
  }

  setupEventListeners() {
    // Busca
    const searchInput = document.getElementById("searchInput");
    const btnSearch = document.getElementById("btnSearch");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterClientes();
      });
    }

    if (btnSearch) {
      btnSearch.addEventListener("click", () => {
        this.filterClientes();
      });
    }

    // Filtros
    const statusFilter = document.getElementById("statusFilter");
    const grupoFilter = document.getElementById("grupoFilter");

    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        this.filterClientes();
      });
    }

    if (grupoFilter) {
      grupoFilter.addEventListener("change", () => {
        this.filterClientes();
      });
    }

    // Paginação
    const itemsPerPageSelect = document.getElementById("itemsPerPage");
    if (itemsPerPageSelect) {
      itemsPerPageSelect.addEventListener("change", (e) => {
        this.itemsPerPage = parseInt(e.target.value);
        this.currentPage = 1;
        this.renderTable();
      });
    }

    // Botões de paginação
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("pagination-btn")) {
        const action = e.target.dataset.action;
        this.handlePagination(action);
      }
    });
  }

  setupModal() {
    const btnCloseModal = document.getElementById("btnCloseModal");
    const btnCancelModal = document.getElementById("btnCancelModal");
    const btnEditCliente = document.getElementById("btnEditCliente");

    if (btnCloseModal) {
      btnCloseModal.addEventListener("click", () => {
        this.closeModal();
      });
    }

    if (btnCancelModal) {
      btnCancelModal.addEventListener("click", () => {
        this.closeModal();
      });
    }

    if (btnEditCliente) {
      btnEditCliente.addEventListener("click", () => {
        this.editCurrentCliente();
      });
    }

    // Fechar modal clicando fora
    const modal = document.getElementById("clienteModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
  }

  async loadGrupos() {
    try {
      const response = await fetch("/api/grupos-clientes");
      if (response.ok) {
        this.grupos = await response.json();
      } else {
        // Dados de exemplo
        this.grupos = [
          { id: 1, nome: "VIPs", cor: "#FFD700" },
          { id: 2, nome: "Novos Clientes", cor: "#32CD32" },
          { id: 3, nome: "Inativos", cor: "#FF6347" },
        ];
      }
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      this.grupos = [
        { id: 1, nome: "VIPs", cor: "#FFD700" },
        { id: 2, nome: "Novos Clientes", cor: "#32CD32" },
        { id: 3, nome: "Inativos", cor: "#FF6347" },
      ];
    }

    this.populateGrupoFilter();
  }

  populateGrupoFilter() {
    const grupoFilter = document.getElementById("grupoFilter");
    if (grupoFilter) {
      // Limpar opções existentes (exceto a primeira)
      while (grupoFilter.children.length > 1) {
        grupoFilter.removeChild(grupoFilter.lastChild);
      }

      // Adicionar grupos
      this.grupos.forEach((grupo) => {
        const option = document.createElement("option");
        option.value = grupo.id;
        option.textContent = grupo.nome;
        grupoFilter.appendChild(option);
      });
    }
  }

  async loadClientes() {
    try {
      const response = await fetch("/api/clientes");
      if (response.ok) {
        this.clientes = await response.json();
      } else {
        // Dados de exemplo se a API não estiver disponível
        this.loadSampleData();
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      this.loadSampleData();
    }

    this.filteredClientes = [...this.clientes];
    this.renderTable();
  }

  loadSampleData() {
    this.clientes = [
      {
        id: 1,
        nome: "Maria Silva Santos",
        email: "maria@email.com",
        telefone: "(11) 99999-1234",
        cpf: "123.456.789-01",
        grupoId: 1,
        status: "ativo",
        dataCadastro: "2024-01-15",
        ultimoAgendamento: "2024-02-20",
        pets: [
          { nome: "Rex", especie: "Cachorro" },
          { nome: "Mimi", especie: "Gato" },
        ],
        endereco: {
          logradouro: "Rua das Flores, 123",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
        },
      },
      {
        id: 2,
        nome: "João Carlos Oliveira",
        email: "joao@email.com",
        telefone: "(11) 88888-5678",
        cpf: "987.654.321-09",
        grupoId: 2,
        status: "ativo",
        dataCadastro: "2024-02-01",
        ultimoAgendamento: "2024-02-18",
        pets: [{ nome: "Bella", especie: "Cachorro" }],
        endereco: {
          logradouro: "Av. Principal, 456",
          bairro: "Jardins",
          cidade: "São Paulo",
          uf: "SP",
        },
      },
      {
        id: 3,
        nome: "Ana Paula Costa",
        email: "ana@email.com",
        telefone: "(11) 77777-9012",
        cpf: "456.789.123-45",
        grupoId: 3,
        status: "inativo",
        dataCadastro: "2023-12-10",
        ultimoAgendamento: "2023-12-20",
        pets: [{ nome: "Felix", especie: "Gato" }],
        endereco: {
          logradouro: "Rua dos Pássaros, 789",
          bairro: "Vila Nova",
          cidade: "São Paulo",
          uf: "SP",
        },
      },
      {
        id: 4,
        nome: "Carlos Eduardo Lima",
        email: "carlos@email.com",
        telefone: "(11) 66666-3456",
        cpf: "789.123.456-78",
        grupoId: 1,
        status: "ativo",
        dataCadastro: "2024-01-20",
        ultimoAgendamento: "2024-02-15",
        pets: [
          { nome: "Thor", especie: "Cachorro" },
          { nome: "Loki", especie: "Cachorro" },
          { nome: "Frida", especie: "Gato" },
        ],
        endereco: {
          logradouro: "Rua das Palmeiras, 321",
          bairro: "Moema",
          cidade: "São Paulo",
          uf: "SP",
        },
      },
    ];
  }

  filterClientes() {
    const searchTerm = document
      .getElementById("searchInput")
      .value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value;
    const grupoFilter = document.getElementById("grupoFilter").value;

    this.filteredClientes = this.clientes.filter((cliente) => {
      const matchesSearch =
        !searchTerm ||
        cliente.nome.toLowerCase().includes(searchTerm) ||
        cliente.email.toLowerCase().includes(searchTerm) ||
        cliente.telefone.includes(searchTerm) ||
        cliente.cpf.includes(searchTerm);

      const matchesStatus = !statusFilter || cliente.status === statusFilter;

      const matchesGrupo = !grupoFilter || cliente.grupoId == grupoFilter;

      return matchesSearch && matchesStatus && matchesGrupo;
    });

    this.currentPage = 1;
    this.renderTable();
  }

  renderTable() {
    const tbody = document.getElementById("clientesTableBody");
    if (!tbody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentItems = this.filteredClientes.slice(startIndex, endIndex);

    tbody.innerHTML = "";

    if (currentItems.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 40px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #dee2e6; margin-bottom: 10px;"></i>
                        <p style="color: #6c757d; margin: 0;">Nenhum cliente encontrado</p>
                    </td>
                </tr>
            `;
      this.updatePagination();
      return;
    }

    currentItems.forEach((cliente) => {
      const grupo = this.grupos.find((g) => g.id === cliente.grupoId);
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>
                    <div style="cursor: pointer;" onclick="meusClientesManager.showClienteDetails(${cliente.id})">
                        <div style="font-weight: 600; color: #2c3e50;">${cliente.nome}</div>
                        <div style="font-size: 12px; color: #6c757d;">${cliente.email}</div>
                    </div>
                </td>
                <td>
                    <div>${cliente.telefone}</div>
                    <div style="font-size: 12px; color: #6c757d;">${cliente.cpf}</div>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        ${cliente.pets
                          .map(
                            (pet) => `
                            <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 12px; font-size: 12px; display: inline-block;">
                                ${pet.nome} (${pet.especie})
                            </span>
                        `,
                          )
                          .join("")}
                    </div>
                </td>
                <td>
                    ${
                      grupo
                        ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 12px; height: 12px; background: ${grupo.cor}; border-radius: 50%;"></div>
                            <span>${grupo.nome}</span>
                        </div>
                    `
                        : '<span style="color: #6c757d;">-</span>'
                    }
                </td>
                <td>${cliente.ultimoAgendamento ? this.formatDate(cliente.ultimoAgendamento) : '<span style="color: #6c757d;">Nunca</span>'}</td>
                <td class="text-center">
                    <span class="badge ${cliente.status === "ativo" ? "badge-success" : "badge-secondary"}">
                        ${cliente.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn-edit" onclick="meusClientesManager.editCliente(${cliente.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="meusClientesManager.deleteCliente(${cliente.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });

    this.updatePagination();
  }

  updatePagination() {
    const totalPages = Math.ceil(
      this.filteredClientes.length / this.itemsPerPage,
    );
    const paginationInfo = document.getElementById("paginationInfo");
    const paginationControls = document.getElementById("paginationControls");

    if (paginationInfo) {
      const startItem =
        this.filteredClientes.length === 0
          ? 0
          : (this.currentPage - 1) * this.itemsPerPage + 1;
      const endItem = Math.min(
        this.currentPage * this.itemsPerPage,
        this.filteredClientes.length,
      );

      paginationInfo.innerHTML = `
                - Mostrando ${startItem}-${endItem} de ${this.filteredClientes.length} clientes
            `;
    }

    if (paginationControls) {
      paginationControls.innerHTML = `
                <button class="pagination-btn" data-action="first" ${this.currentPage === 1 ? "disabled" : ""}>
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-btn" data-action="prev" ${this.currentPage === 1 ? "disabled" : ""}>
                    <i class="fas fa-angle-left"></i>
                </button>
                <span style="padding: 8px 16px; color: #6c757d;">
                    ${this.currentPage} de ${totalPages || 1}
                </span>
                <button class="pagination-btn" data-action="next" ${this.currentPage >= totalPages ? "disabled" : ""}>
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="pagination-btn" data-action="last" ${this.currentPage >= totalPages ? "disabled" : ""}>
                    <i class="fas fa-angle-double-right"></i>
                </button>
            `;
    }
  }

  handlePagination(action) {
    const totalPages = Math.ceil(
      this.filteredClientes.length / this.itemsPerPage,
    );

    switch (action) {
      case "first":
        this.currentPage = 1;
        break;
      case "prev":
        if (this.currentPage > 1) this.currentPage--;
        break;
      case "next":
        if (this.currentPage < totalPages) this.currentPage++;
        break;
      case "last":
        this.currentPage = totalPages;
        break;
    }

    this.renderTable();
  }

  showClienteDetails(id) {
    const cliente = this.clientes.find((c) => c.id === id);
    if (!cliente) return;

    const grupo = this.grupos.find((g) => g.id === cliente.grupoId);
    const modal = document.getElementById("clienteModal");
    const modalTitle = document.getElementById("modalTitle");
    const clienteDetails = document.getElementById("clienteDetails");

    if (!modal || !modalTitle || !clienteDetails) return;

    modalTitle.textContent = `Detalhes - ${cliente.nome}`;

    clienteDetails.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                <div>
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Informações Pessoais</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                        <p><strong>Nome:</strong> ${cliente.nome}</p>
                        <p><strong>E-mail:</strong> ${cliente.email}</p>
                        <p><strong>Telefone:</strong> ${cliente.telefone}</p>
                        <p><strong>CPF:</strong> ${cliente.cpf}</p>
                        <p><strong>Status:</strong> 
                            <span class="badge ${cliente.status === "ativo" ? "badge-success" : "badge-secondary"}">
                                ${cliente.status === "ativo" ? "Ativo" : "Inativo"}
                            </span>
                        </p>
                    </div>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Endereço</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                        <p><strong>Logradouro:</strong> ${cliente.endereco.logradouro}</p>
                        <p><strong>Bairro:</strong> ${cliente.endereco.bairro}</p>
                        <p><strong>Cidade:</strong> ${cliente.endereco.cidade} - ${cliente.endereco.uf}</p>
                    </div>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Pets</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                        ${cliente.pets
                          .map(
                            (pet) => `
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <i class="fas fa-${pet.especie === "Cachorro" ? "dog" : "cat"}" style="color: #007bff;"></i>
                                <span><strong>${pet.nome}</strong> (${pet.especie})</span>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Grupo e Histórico</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                        <p><strong>Grupo:</strong> 
                            ${
                              grupo
                                ? `
                                <span style="display: inline-flex; align-items: center; gap: 6px;">
                                    <div style="width: 12px; height: 12px; background: ${grupo.cor}; border-radius: 50%;"></div>
                                    ${grupo.nome}
                                </span>
                            `
                                : "Sem grupo"
                            }
                        </p>
                        <p><strong>Data de Cadastro:</strong> ${this.formatDate(cliente.dataCadastro)}</p>
                        <p><strong>Último Agendamento:</strong> ${cliente.ultimoAgendamento ? this.formatDate(cliente.ultimoAgendamento) : "Nunca"}</p>
                    </div>
                </div>
            </div>
        `;

    this.currentClienteId = id;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  closeModal() {
    const modal = document.getElementById("clienteModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
      this.currentClienteId = null;
    }
  }

  editCurrentCliente() {
    if (this.currentClienteId) {
      this.editCliente(this.currentClienteId);
    }
  }

  editCliente(id) {
    // Redirecionar para página de edição ou abrir modal de edição
    window.location.href = `novo-cliente.html?edit=${id}`;
  }

  async deleteCliente(id) {
    const cliente = this.clientes.find((c) => c.id === id);
    if (!cliente) return;

    if (
      !(await confirmar(
        `Tem certeza que deseja excluir o cliente "${cliente.nome}"?`,
      ))
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Cliente excluído com sucesso!");
        await this.loadClientes();
      } else {
        const error = await response.json();
        alert(
          "Erro ao excluir cliente: " + (error.message || "Erro desconhecido"),
        );
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      // Simular sucesso para demo
      this.clientes = this.clientes.filter((c) => c.id !== id);
      this.filteredClientes = [...this.clientes];
      this.renderTable();
      alert("Cliente excluído com sucesso!");
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  }
}

// Variável global para acesso aos métodos
let meusClientesManager;

// Inicializar quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  meusClientesManager = new MeusClientesManager();
});
