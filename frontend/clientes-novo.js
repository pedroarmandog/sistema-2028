// Função para configurar event listeners dos filtros manualmente
function setupFilterEventListeners() {
  console.log("🔧 Configurando event listeners dos filtros...");

  // Encontrar todos os checkboxes de filtro
  const filterCheckboxes = document.querySelectorAll(
    'input[type="checkbox"][onchange*="updateFilterTags"]',
  );
  console.log(`📝 Encontrados ${filterCheckboxes.length} checkboxes de filtro`);

  filterCheckboxes.forEach((checkbox, index) => {
    console.log(
      `🔧 Configurando checkbox ${index + 1}: value="${checkbox.value}"`,
    );

    // Remover o event listener inline e adicionar um novo
    checkbox.removeAttribute("onchange");

    checkbox.addEventListener("change", function () {
      console.log(
        `✅ Checkbox clicado: ${checkbox.value} (${checkbox.checked})`,
      );

      // Determinar a categoria baseada no contexto
      let categoria = "group"; // Padrão para grupos
      if (
        checkbox.closest('[id*="birthday"]') ||
        checkbox.value.includes("hoje") ||
        checkbox.value.includes("semana")
      ) {
        categoria = "birthday";
      }

      console.log(`📂 Categoria detectada: ${categoria}`);
      updateFilterTags(categoria, checkbox);
    });
  });

  // Configurar o input de busca também
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    console.log("🔧 Configurando input de busca...");
    searchInput.removeAttribute("onkeyup");

    searchInput.addEventListener("keyup", function () {
      console.log("🔍 Busca alterada:", searchInput.value);
      applyFilters();
    });
  }

  console.log("✅ Event listeners configurados com sucesso!");
}

// Função de teste para debug
function testFilterFunction() {
  console.log("🧪 === TESTE DE FUNÇÃO ===");
  console.log("📊 Estado atual dos filtros:", activeFiltros);
  console.log("📦 Clientes atuais:", window.allClients?.length || "undefined");
  console.log(
    "📦 Clientes originais:",
    window.originalClients?.length || "undefined",
  );

  // Testar se o filtro funciona manualmente
  console.log("🔧 Adicionando filtro de teste...");
  activeFiltros.group.push("banho-quente");
  console.log("📊 Novo estado:", activeFiltros);

  // Aplicar filtros
  console.log("🔄 Aplicando filtros...");
  applyFilters();
}

// Carregar clientes JavaScript - Versão Corrigida
console.log("🚀 Script clientes-novo.js sendo carregado...");

// Variáveis de Paginação (declaradas globalmente)
window.currentPage = 1;
window.itemsPerPage = 25; // Padrão: 25 itens por página
window.totalClients = 0;
window.allClients = []; // Array com todos os clientes para paginação

// Carregar clientes ao inicializar
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM carregado, carregando clientes...");

  // Verificar se o elemento tbody existe
  const tbody = document.getElementById("clientsTableBody");
  if (tbody) {
    console.log("✅ Elemento clientsTableBody encontrado");
    // Mostrar loading imediatamente
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="color: #3498db; margin-right: 10px;"></i>Carregando clientes...</td></tr>';
  } else {
    console.error("❌ Elemento clientsTableBody NÃO encontrado!");
    console.log(
      "📝 Elementos com ID na página:",
      Array.from(document.querySelectorAll("[id]")).map((el) => el.id),
    );
  }

  // Log do contexto
  console.log("🌐 URL atual:", window.location.href);
  console.log("📄 Title da página:", document.title);

  // Carregar clientes após um pequeno delay para garantir que tudo está pronto
  console.log("⏰ Aguardando 500ms antes de carregar...");
  setTimeout(() => {
    console.log("🚀 Iniciando carregamento dos clientes...");

    loadClients();
  }, 500);

  // Configurar busca em tempo real
  const searchInput = document.getElementById("searchClients");
  if (searchInput) {
    console.log("✅ Input de busca encontrado, configurando eventos");

    // Evento de input (digitação em tempo real)
    searchInput.addEventListener("input", function (event) {
      const searchTerm = event.target.value.trim();
      console.log("🔍 Evento input - Buscando por:", searchTerm);
      searchClientsRealTime(searchTerm);
    });

    // Evento de keyup (fallback)
    searchInput.addEventListener("keyup", function (event) {
      const searchTerm = event.target.value.trim();
      console.log("⌨️ Evento keyup - Buscando por:", searchTerm);
      searchClientsRealTime(searchTerm);
    });

    // Também funcionar com enter
    searchInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        const searchTerm = event.target.value.trim();
        console.log("↵ Enter pressionado - Buscando por:", searchTerm);
        searchClientsRealTime(searchTerm);
      }
    });

    // Teste inicial
    console.log("🧪 Testando busca vazia inicial...");
    searchClientsRealTime("");
  } else {
    console.warn("⚠️ Input de busca não encontrado - ID: searchClients");
    // Listar todos os inputs disponíveis para debug
    const allInputs = document.querySelectorAll("input");
    console.log(
      "📝 Inputs encontrados:",
      Array.from(allInputs).map((inp) => inp.id || inp.name || inp.type),
    );
  }

  loadGruposFilter(); // Carregar grupos para filtros

  // Configurar botão "Novo Cliente"
  const addClientBtn = document.getElementById("addClientBtn");
  if (addClientBtn) {
    addClientBtn.addEventListener("click", function () {
      console.log("➕ Botão Novo Cliente clicado");
      window.location.href = "novo-cliente.html";
    });
    console.log("✅ Event listener do botão Novo Cliente configurado");
  } else {
    console.warn("⚠️ Botão Novo Cliente não encontrado");
  }

  // Configurar eventos dos filtros de forma manual para garantir que funcionem
  setTimeout(() => {
    console.log("🔧 Configurando event listeners dos filtros...");
    setupFilterEventListeners();
  }, 1000);
});

// Carregar clientes - carregamento inicial silencioso
async function loadClients(forceRefresh = false) {
  console.log("🔍 Carregando clientes...", forceRefresh ? "(FORÇADO)" : "");

  const tbody = document.getElementById("clientsTableBody");
  if (!tbody) {
    console.error("❌ Elemento tbody não encontrado!");
    return;
  }

  // Limpar completamente a tabela se for um refresh forçado
  if (forceRefresh) {
    tbody.innerHTML = "";
    console.log("🧹 Tabela limpa para refresh forçado");
  }

  // Mostrar loading inicial
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="color: #3498db; margin-right: 10px;"></i>Carregando clientes...</td></tr>';

  try {
    console.log("📡 Fazendo requisição para /api/clientes...");
    // Adicionar timestamp para evitar cache
    const timestamp = new Date().getTime();
    const response = await fetch(
      `/api/clientes?_t=${timestamp}&force=${forceRefresh ? "1" : "0"}`,
      {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
    console.log("📡 Resposta recebida:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📦 Dados recebidos:", data);
    console.log("📦 Tipo de data:", typeof data);
    console.log("📦 Propriedades de data:", Object.keys(data));

    // Verificar se é array direto ou objeto com propriedade
    let clientesArray = [];
    if (Array.isArray(data)) {
      clientesArray = data;
      console.log("✅ Dados são array direto");
    } else if (data.success && Array.isArray(data.clientes)) {
      clientesArray = data.clientes;
      console.log("✅ Dados são objeto com propriedade clientes");
    } else if (data.clientes && Array.isArray(data.clientes)) {
      clientesArray = data.clientes;
      console.log("✅ Dados têm propriedade clientes (sem success)");
    } else {
      console.error("❌ Formato de resposta inválido:", data);
      throw new Error("Formato de resposta inválido");
    }

    console.log(
      "✅ Dados válidos, chamando displayClients com",
      clientesArray.length,
      "clientes",
    );
    displayClients(clientesArray);
    console.log("✅ Clientes carregados:", clientesArray.length);
  } catch (error) {
    console.error("❌ Erro ao carregar clientes:", error);
    tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    Erro ao carregar clientes: ${error.message}<br>
                    <button onclick="loadClients()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Tentar Novamente</button>
                </td>
            </tr>
        `;
  }
}

// Exibir clientes na tabela
function displayClients(clientes) {
  console.log("📋 Configurando paginação para", clientes.length, "clientes");

  // CORREÇÃO: Sempre garantir que temos todos os dados disponíveis
  // Se não temos dados originais salvos, salvar agora
  if (!window.originalClients || window.originalClients.length === 0) {
    window.originalClients = [...clientes];
    console.log(
      "💾 Dados originais salvos:",
      window.originalClients.length,
      "clientes",
    );
  }

  // CORREÇÃO 2: Verificar se há filtros ativos antes de sobrescrever dados
  const hasFiltrosAtivos =
    window.filtrosAtivos &&
    (window.filtrosAtivos.grupos.length > 0 ||
      window.filtrosAtivos.status.length > 0 ||
      window.filtrosAtivos.aniversariantes.length > 0 ||
      window.filtrosAtivos.diasSemFaturamento.length > 0 ||
      window.filtrosAtivos.dataCadastro.length > 0 ||
      (window.filtrosAtivos.busca && window.filtrosAtivos.busca.trim() !== ""));

  if (hasFiltrosAtivos) {
    console.log(
      "🏷️ Filtros ativos detectados - usar dados originais como base",
    );
    // Quando há filtros ativos, usar dados originais como fonte
    window.allClients = window.originalClients || clientes;
    window.totalClients = window.allClients.length;
  } else {
    console.log("🏷️ Nenhum filtro ativo - atualizar allClients normalmente");
    // Armazenar todos os clientes globalmente (comportamento normal)
    window.allClients = clientes || [];
    window.totalClients = window.allClients.length;

    // Sincronizar com o sistema de filtros
    window.todosClientes = [...window.allClients];
    console.log("🔄 Dados sincronizados com sistema de filtros");
  }

  // Resetar para primeira página apenas se não há filtros ou se é carregamento inicial
  if (!hasFiltrosAtivos || !window.currentPage) {
    window.currentPage = 1;
  }

  // Atualizar exibição com paginação
  updateDisplayAndPagination();

  console.log("✅ Sistema de paginação configurado!");
}

// Tornar a função global para uso do sistema de filtros
window.displayClients = displayClients;

// Função de refresh - SIMPLES E FUNCIONAL
function refreshClientsFix() {
  console.log("🔄 Refresh iniciado");

  const tbody = document.getElementById("clientsTableBody");
  if (!tbody) {
    console.error("❌ Elemento tbody não encontrado!");
    return;
  }

  // Mostrar loading
  tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="5" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="color: #3498db; margin-right: 10px;"></i>
                <span style="color: #3498db; font-weight: 500;">Atualizando lista de clientes...</span>
            </td>
        </tr>
    `;

  // Fazer requisição
  const timestamp = new Date().getTime();
  fetch(`/api/clientes?_t=${timestamp}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success && Array.isArray(data.clientes)) {
        displayClients(data.clientes);
        showNotification(
          "Lista de clientes atualizada com sucesso!",
          "success",
        );
        console.log("✅ Refresh concluído com sucesso!");
      } else {
        throw new Error("Formato de resposta inválido");
      }
    })
    .catch((error) => {
      console.error("❌ Erro no refresh:", error);
      showNotification("Erro ao atualizar lista de clientes", "error");
      tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    Erro ao carregar clientes. Clique em atualizar novamente.
                </td>
            </tr>
        `;
    });
}

// Funções de modal (placeholder)
function openModal() {
  console.log("Modal aberto");
}

function closeModal() {
  console.log("Modal fechado");
}

function handleSubmit(event) {
  event.preventDefault();
  console.log("Formulário enviado");
}

function searchClients(event) {
  console.log("Busca:", event.target.value);
}

// Função de busca em tempo real
function searchClientsRealTime(searchTerm) {
  console.log("🔍 Busca em tempo real:", searchTerm);

  // Se não há termo de busca, usar todos os clientes
  if (!searchTerm || searchTerm.trim() === "") {
    window.allClients = window.originalClients || window.allClients;
    window.totalClients = window.allClients.length;
    window.currentPage = 1; // Resetar para primeira página
    updateDisplayAndPagination();
    console.log("✅ Mostrando todos os clientes");
    return;
  }

  // Guardar clientes originais se ainda não foi guardado
  if (!window.originalClients) {
    window.originalClients = [...window.allClients];
  }

  // Normalizar termo de busca (remover acentos e converter para minúsculo)
  const searchNormalized = removeAccents(searchTerm.toLowerCase());

  // Filtrar clientes baseado no termo de busca
  const filteredClients = window.originalClients.filter((cliente) => {
    const searchableText = `${cliente.nome} ${cliente.email || ""} ${cliente.telefone || ""}`;
    const normalizedText = removeAccents(searchableText.toLowerCase());
    return normalizedText.includes(searchNormalized);
  });

  // Atualizar clientes exibidos
  window.allClients = filteredClients;
  window.totalClients = window.allClients.length;
  window.currentPage = 1; // Resetar para primeira página
  updateDisplayAndPagination();

  console.log(
    `✅ Busca concluída: ${window.totalClients} clientes encontrados`,
  );
}
if (rowTextNormalized.includes(searchNormalized)) {
  row.style.display = "";
}

// Função para remover acentos
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function viewClientDetails(id) {
  console.log("🔍 Redirecionando para detalhes do cliente:", id);

  // Redirecionar para página de detalhes do cliente
  window.location.href = `client-details.html?id=${id}`;
}

function editClient(id) {
  console.log("✏️ Redirecionando para edição do cliente:", id);

  // Redirecionar para página de edição com ID do cliente
  window.location.href = `novo-cliente.html?edit=${id}`;
}

function deleteClient(id) {
  console.log("🗑️ Solicitando exclusão do cliente:", id);

  // Buscar informações do cliente para mostrar no modal de confirmação
  const clientRow = document.querySelector(`tr[data-cliente-id="${id}"]`);
  let clientName = "este cliente";

  if (clientRow) {
    const nameCell = clientRow.querySelector("td strong");
    if (nameCell) {
      clientName = nameCell.textContent;
    }
  }

  // Abrir modal personalizado de confirmação
  openDeleteModal(id, clientName);
}

// Função para abrir o modal de confirmação personalizado
function openDeleteModal(clientId, clientName) {
  const modal = document.getElementById("deleteConfirmModal");
  const clientNameElement = document.getElementById("deleteClientName");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  // Definir nome do cliente
  clientNameElement.textContent = `"${clientName}"`;

  // Configurar botão de confirmação
  confirmBtn.onclick = function () {
    closeDeleteModal();
    performDeleteClient(clientId, clientName);
  };

  // Mostrar modal com animação
  modal.classList.add("show");
  // deixar o CSS controlar o display (remover uso de inline styles)

  // Fechar modal com ESC
  document.addEventListener("keydown", function handleEscape(e) {
    if (e.key === "Escape") {
      closeDeleteModal();
      document.removeEventListener("keydown", handleEscape);
    }
  });
}

// Função para fechar o modal de confirmação
function closeDeleteModal() {
  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.remove("show");
  // Remover qualquer estilo inline de display após a animação
  setTimeout(() => {
    try {
      modal.style.removeProperty("display");
    } catch (e) {
      modal.style.display = "";
    }
  }, 300);

  console.log("❌ Modal de exclusão fechado");
}

// Função para executar a exclusão
async function performDeleteClient(id, clientName) {
  console.log("🗑️ Executando exclusão do cliente ID:", id);

  try {
    // Mostrar loading
    showNotification("Excluindo cliente...", "info");

    const response = await fetch(`/api/clientes/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // Se não conseguir fazer parse do JSON, criar uma resposta de erro
      console.error("❌ Erro ao parsear JSON:", jsonError);
      throw new Error("Resposta inválida do servidor");
    }

    if (response.ok && data.success) {
      console.log("✅ Cliente excluído com sucesso");
      showNotification(
        `Cliente "${clientName}" foi excluído com sucesso!`,
        "success",
      );

      // Remover a linha da tabela imediatamente
      const clientRow = document.querySelector(`tr[data-cliente-id="${id}"]`);
      if (clientRow) {
        clientRow.style.transition = "opacity 0.3s ease";
        clientRow.style.opacity = "0";

        setTimeout(() => {
          clientRow.remove();

          // Verificar se ainda há clientes na tabela
          const tbody = document.getElementById("clientsTableBody");
          const remainingRows = tbody.querySelectorAll(".client-row");

          if (remainingRows.length === 0) {
            tbody.innerHTML =
              '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;"><i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.3;"></i>Nenhum cliente encontrado</td></tr>';
          }
        }, 300);
      } else {
        // Se não encontrou a linha, recarregar a lista
        loadClients();
      }
    } else {
      throw new Error(data.error || "Erro ao excluir cliente");
    }
  } catch (error) {
    console.error("❌ Erro ao excluir cliente:", error);
    showNotification(`Erro ao excluir cliente: ${error.message}`, "error");
  }
}

// Sistema de notificações
function showNotification(message, type) {
  if (!type) type = "info";

  // Remover notificações existentes
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = "notification notification-" + type;

  // Criar elementos separadamente para evitar problemas de sintaxe
  const notificationDiv = document.createElement("div");
  const backgroundColor =
    type === "success" ? "#27ae60" : type === "info" ? "#3498db" : "#5a9bd4";
  const iconClass =
    type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

  // Aplicar estilos usando propriedades individuais
  notificationDiv.style.position = "fixed";
  notificationDiv.style.top = "20px";
  notificationDiv.style.right = "20px";
  notificationDiv.style.zIndex = "10000";
  notificationDiv.style.background = backgroundColor;
  notificationDiv.style.color = "white";
  notificationDiv.style.padding = "15px 20px";
  notificationDiv.style.borderRadius = "8px";
  notificationDiv.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  notificationDiv.style.display = "flex";
  notificationDiv.style.alignItems = "center";
  notificationDiv.style.gap = "10px";
  notificationDiv.style.fontFamily =
    "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  notificationDiv.style.fontSize = "14px";
  notificationDiv.style.maxWidth = "350px";
  notificationDiv.style.animation = "slideIn 0.3s ease-out";

  notificationDiv.innerHTML =
    '<i class="fas ' +
    iconClass +
    '"></i><span>' +
    message +
    '</span><button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: auto;">×</button>';

  notification.appendChild(notificationDiv);

  // Adicionar CSS da animação se não existir
  if (!document.querySelector("#notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Auto remover após 5 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Função para exportar clientes para Excel
async function exportToExcel() {
  console.log("📊 Iniciando exportação para Excel...");

  try {
    // Mostrar loading
    showNotification("📊 Preparando exportação...", "info");

    // MODIFICAÇÃO: Usar dados filtrados em vez de buscar da API
    let clientes = [];

    // Verificar se há filtros ativos
    const hasFiltrosAtivos =
      window.filtrosAtivos &&
      (window.filtrosAtivos.grupos.length > 0 ||
        window.filtrosAtivos.status.length > 0 ||
        window.filtrosAtivos.aniversariantes.length > 0 ||
        window.filtrosAtivos.diasSemFaturamento.length > 0 ||
        window.filtrosAtivos.dataCadastro.length > 0 ||
        (window.filtrosAtivos.busca &&
          window.filtrosAtivos.busca.trim() !== ""));

    if (hasFiltrosAtivos) {
      // Usar dados filtrados
      clientes = window.allClients || [];
      console.log(
        "📋 Exportando dados filtrados:",
        clientes.length,
        "clientes",
      );

      // Mostrar quais filtros estão ativos
      const filtrosAtivosTexto = [];
      if (window.filtrosAtivos.grupos.length > 0) {
        filtrosAtivosTexto.push(
          `Grupos: ${window.filtrosAtivos.grupos.join(", ")}`,
        );
      }
      if (window.filtrosAtivos.status.length > 0) {
        filtrosAtivosTexto.push(
          `Status: ${window.filtrosAtivos.status.join(", ")}`,
        );
      }
      if (window.filtrosAtivos.aniversariantes.length > 0) {
        filtrosAtivosTexto.push(
          `Aniversariantes: ${window.filtrosAtivos.aniversariantes.join(", ")}`,
        );
      }
      if (window.filtrosAtivos.busca) {
        filtrosAtivosTexto.push(`Busca: "${window.filtrosAtivos.busca}"`);
      }
      console.log(
        "🏷️ Filtros ativos na exportação:",
        filtrosAtivosTexto.join(" | "),
      );
    } else {
      // Usar todos os dados disponíveis
      clientes = window.originalClients || window.allClients || [];
      console.log("📋 Exportando todos os clientes:", clientes.length);
    }

    if (clientes.length === 0) {
      showNotification("⚠️ Nenhum cliente encontrado para exportar", "info");
      return;
    }

    // Preparar dados para Excel
    const dadosExcel = clientes.map((cliente, index) => ({
      ID: cliente.id,
      Nome: cliente.nome,
      Email: cliente.email || "Não informado",
      Telefone: cliente.telefone,
      CPF: cliente.cpf || "Não informado",
      "Grupo de Cliente": cliente.grupo_cliente || "Não informado",
      Cidade: cliente.cidade || "Não informado",
      "Data de Nascimento": cliente.data_nascimento
        ? new Date(cliente.data_nascimento).toLocaleDateString("pt-BR")
        : "Não informado",
      "Data de Cadastro": new Date(cliente.createdAt).toLocaleDateString(
        "pt-BR",
      ),
      "Hora de Cadastro": new Date(cliente.createdAt).toLocaleTimeString(
        "pt-BR",
      ),
      Status: cliente.ativo ? "Ativo" : "Inativo",
      Observações: cliente.observacoes || "Nenhuma",
    }));

    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // Converter dados para worksheet
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);

    // Definir largura das colunas
    const columnWidths = [
      { wch: 8 }, // ID
      { wch: 25 }, // Nome
      { wch: 30 }, // Email
      { wch: 18 }, // Telefone
      { wch: 15 }, // CPF
      { wch: 20 }, // Grupo de Cliente
      { wch: 20 }, // Cidade
      { wch: 18 }, // Data de Nascimento
      { wch: 15 }, // Data de Cadastro
      { wch: 15 }, // Hora de Cadastro
      { wch: 12 }, // Status
      { wch: 30 }, // Observações
    ];

    worksheet["!cols"] = columnWidths;

    // Adicionar worksheet ao workbook
    const nomeAba = `Clientes_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);

    // Gerar nome do arquivo
    const dataAtual = new Date();
    const dataFormatada = dataAtual
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const horaFormatada = dataAtual
      .toLocaleTimeString("pt-BR")
      .replace(/:/g, "-");

    // Adicionar sufixo se há filtros ativos
    const sufixoFiltro = hasFiltrosAtivos ? "_FILTRADO" : "";
    const nomeArquivo = `Clientes_PetCria${sufixoFiltro}_${dataFormatada}_${horaFormatada}.xlsx`;

    // Fazer download
    XLSX.writeFile(workbook, nomeArquivo);

    console.log("✅ Exportação concluída:", nomeArquivo);

    // Mensagem de sucesso personalizada
    const tipoExportacao = hasFiltrosAtivos ? "filtrados" : "todos os";
    showNotification(
      `✅ Exportado: ${clientes.length} clientes ${tipoExportacao} em ${nomeArquivo}`,
      "success",
    );
  } catch (error) {
    console.error("❌ Erro na exportação:", error);
    showNotification("❌ Erro ao exportar clientes para Excel", "error");
  }
}

// Variáveis de controle dos filtros
let isFilterBarExpanded = false;
let isAdvancedFiltersExpanded = false;

// Objeto para armazenar filtros ativos
let activeFiltros = {
  search: "",
  group: [],
  birthday: [],
  status: [],
  days: [],
  date: [],
};

// Mapeamento de labels para exibição
const filterLabels = {
  group: {
    vip: "VIP",
    regular: "Regular",
    novo: "Novo (último mês)",
  },
  birthday: {
    hoje: "Aniversário: Hoje",
    "esta-semana": "Aniversário: Esta semana",
    "este-mes": "Aniversário: Este mês",
  },
  status: {
    ativo: "Ativo",
    inativo: "Inativo",
  },
  days: {
    7: "7 dias sem faturamento",
    15: "15 dias sem faturamento",
    30: "30 dias sem faturamento",
    60: "60 dias sem faturamento",
  },
  date: {
    hoje: "Cadastro: Hoje",
    ontem: "Cadastro: Ontem",
    "ultima-semana": "Cadastro: Última semana",
    "ultimo-mes": "Cadastro: Último mês",
  },
};

// Função para atualizar tags de filtros
function updateFilterTags(categoria, checkbox) {
  const valor = checkbox.value;
  const isChecked = checkbox.checked;

  console.log(
    `🏷️ Atualizando filtro: ${categoria} = ${valor} (${isChecked ? "marcado" : "desmarcado"})`,
  );
  console.log("📊 Estado atual dos filtros:", activeFiltros);

  if (isChecked) {
    // Adicionar filtro se não existir
    if (!activeFiltros[categoria].includes(valor)) {
      activeFiltros[categoria].push(valor);
      console.log(`✅ Filtro adicionado: ${categoria}[${valor}]`);
    }
  } else {
    // Remover filtro
    activeFiltros[categoria] = activeFiltros[categoria].filter(
      (item) => item !== valor,
    );
    console.log(`❌ Filtro removido: ${categoria}[${valor}]`);
  }

  console.log("📊 Novo estado dos filtros:", activeFiltros);

  // Atualizar exibição das tags
  renderFilterTags();

  // Aplicar filtros automaticamente
  console.log("🔄 Aplicando filtros...");
  applyFilters();
}

// Função para renderizar as tags visuais
function renderFilterTags() {
  const tagsContainer = document.getElementById("filterTags");
  if (!tagsContainer) return;

  tagsContainer.innerHTML = "";

  // Adicionar tag de busca se existir
  if (activeFiltros.search) {
    const searchTag = createFilterTag(
      "search",
      activeFiltros.search,
      `Busca: "${activeFiltros.search}"`,
    );
    tagsContainer.appendChild(searchTag);
  }

  // Adicionar tags para cada categoria
  Object.keys(filterLabels).forEach((categoria) => {
    activeFiltros[categoria].forEach((valor) => {
      const label = filterLabels[categoria][valor] || valor;
      const tag = createFilterTag(categoria, valor, label);
      tagsContainer.appendChild(tag);
    });
  });
}

// Função para criar uma tag individual
function createFilterTag(categoria, valor, label) {
  const tag = document.createElement("div");
  tag.className = "filter-tag";

  // Adicionar classe especial baseada na categoria e valor
  if (categoria === "group") {
    if (valor === "vip") tag.classList.add("quente");
    if (valor === "novo") tag.classList.add("frio");
    if (valor === "regular") tag.classList.add("morno");
  }

  // Adicionar classe vermelha para status inativo
  if (categoria === "status" && valor === "inativo") {
    tag.classList.add("inativo");
  }

  tag.innerHTML = `
        <span>${label}</span>
        <button class="filter-tag-remove" onclick="removeFilterTag('${categoria}', '${valor}')" title="Remover filtro">
            ×
        </button>
    `;

  return tag;
}

// Função para remover uma tag específica
function removeFilterTag(categoria, valor) {
  console.log(`❌ Removendo filtro: ${categoria} = ${valor}`);

  if (categoria === "search") {
    activeFiltros.search = "";
    // Limpar o input de busca (com fallback para ambos os IDs)
    const searchInputElement =
      document.getElementById("searchInput") ||
      document.getElementById("searchClients");
    if (searchInputElement) {
      searchInputElement.value = "";
    }
  } else {
    // Remover do array
    activeFiltros[categoria] = activeFiltros[categoria].filter(
      (item) => item !== valor,
    );

    // Desmarcar o checkbox correspondente
    const checkbox = document.querySelector(
      `input[type="checkbox"][value="${valor}"]`,
    );
    if (checkbox) {
      checkbox.checked = false;
    }
  }

  // Atualizar tags e aplicar filtros
  renderFilterTags();
  applyFilters();
}

// Função para alternar a barra de filtros
function toggleFilters() {
  alert("Função toggleFilters chamada!");
  console.log("🔽 Alternando barra de filtros...");

  const filterBar = document.getElementById("filterBar");
  const filterBtn = document.getElementById("filterToggleBtn");

  console.log("FilterBar encontrado:", !!filterBar);
  console.log("FilterBtn encontrado:", !!filterBtn);

  if (!filterBar) {
    alert("FilterBar não encontrado!");
    console.error("❌ FilterBar não encontrado");
    return;
  }

  if (!filterBtn) {
    alert("FilterBtn não encontrado!");
    console.error("❌ FilterBtn não encontrado");
    return;
  }

  // Alternar visibilidade
  if (filterBar.style.display === "none" || !filterBar.style.display) {
    filterBar.style.display = "block";
    filterBar.style.maxHeight = "500px";
    filterBtn.style.background = "#007bff";
    console.log("✅ Barra de filtros mostrada");
    alert("Filtros abertos!");
  } else {
    filterBar.style.display = "none";
    filterBar.style.maxHeight = "0";
    filterBtn.style.background = "";
    console.log("✅ Barra de filtros escondida");
    alert("Filtros fechados!");
  }
}

// Função para alternar filtros avançados
function toggleAdvancedFilters() {
  console.log("🔽 Alternando filtros avançados...");

  const advancedFilters = document.getElementById("advancedFilters");
  const moreFiltersBtn = document.querySelector(".btn-more-filters");

  if (!advancedFilters || !moreFiltersBtn) {
    console.error("❌ Elementos de filtros avançados não encontrados");
    return;
  }

  isAdvancedFiltersExpanded = !isAdvancedFiltersExpanded;

  if (isAdvancedFiltersExpanded) {
    advancedFilters.classList.add("expanded");
    moreFiltersBtn.classList.add("expanded");
    console.log("✅ Filtros avançados expandidos");
  } else {
    advancedFilters.classList.remove("expanded");
    moreFiltersBtn.classList.remove("expanded");
    console.log("✅ Filtros avançados recolhidos");
  }
}

// Função para remover acentos e normalizar texto para busca
function removerAcentos(texto) {
  if (!texto) return "";

  return texto
    .toLowerCase()
    .normalize("NFD") // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remover marcas diacríticas (acentos)
    .trim();
}

// Função para aplicar filtros
function applyFilters() {
  console.log("🔍 === APLICANDO FILTROS ===");
  console.log("📊 Estado dos filtros:", activeFiltros);

  // Garantir que temos dados originais
  if (!window.originalClients) {
    window.originalClients = [...window.allClients];
    console.log(
      "💾 Dados originais salvos:",
      window.originalClients.length,
      "clientes",
    );
  }

  // Tentar pegar o input de busca com ambos os IDs possíveis
  let searchInputElement =
    document.getElementById("searchInput") ||
    document.getElementById("searchClients");
  const searchInput = searchInputElement
    ? searchInputElement.value.toLowerCase()
    : "";

  console.log("🔍 Termo de busca:", searchInput);
  console.log("� Clientes originais:", window.originalClients.length);

  // Começar com todos os clientes originais
  let clientesFiltrados = [...window.originalClients];
  console.log("🔄 Iniciando com:", clientesFiltrados.length, "clientes");

  // Aplicar filtro de busca textual
  if (searchInput.trim() !== "") {
    const clientesAntes = clientesFiltrados.length;
    clientesFiltrados = clientesFiltrados.filter((cliente) => {
      const searchableText =
        `${cliente.nome} ${cliente.email || ""} ${cliente.telefone || ""}`.toLowerCase();
      return searchableText.includes(searchInput);
    });
    console.log(
      `🔍 Filtro de busca: ${clientesAntes} → ${clientesFiltrados.length} clientes`,
    );
  }

  // Aplicar filtros por grupo
  if (activeFiltros.group.length > 0) {
    const clientesAntes = clientesFiltrados.length;
    console.log("🏷️ Filtros de grupo ativos:", activeFiltros.group);

    clientesFiltrados = clientesFiltrados.filter((cliente) => {
      console.log(
        `👤 Cliente: ${cliente.nome}, Grupo: ${cliente.grupo_cliente}`,
      );

      return activeFiltros.group.some((group) => {
        // Verificar correspondência direta primeiro
        if (cliente.grupo_cliente === group) {
          console.log(
            `   ✅ Match direto: "${cliente.grupo_cliente}" === "${group}"`,
          );
          return true;
        }

        // Verificar usando a conversão de key
        const clienteGrupoKey = cliente.grupo_cliente
          ? cliente.grupo_cliente
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[()]/g, "")
          : "";
        const groupKey = group.toLowerCase().replace(/[()]/g, "");

        const match = clienteGrupoKey === groupKey;
        console.log(
          `   🔍 Comparando keys: "${clienteGrupoKey}" === "${groupKey}" → ${match}`,
        );

        return match;
      });
    });
    console.log(
      `🏷️ Filtro de grupo: ${clientesAntes} → ${clientesFiltrados.length} clientes`,
    );
  }

  console.log("✅ Clientes filtrados:", clientesFiltrados.length);

  // Atualizar clientes exibidos com filtros aplicados
  window.allClients = clientesFiltrados;
  window.totalClients = window.allClients.length;
  window.currentPage = 1; // Resetar para primeira página

  // Atualizar exibição com paginação
  updateDisplayAndPagination();

  // Mostrar feedback
  const totalOriginal = window.originalClients.length;
  const totalFiltrado = window.allClients.length;

  // Contar total de filtros ativos
  const totalFiltros =
    (searchInput ? 1 : 0) +
    activeFiltros.group.length +
    activeFiltros.birthday.length +
    activeFiltros.status.length +
    activeFiltros.days.length +
    activeFiltros.date.length;

  let feedbackMessage = `🔍 ${totalFiltrado} de ${totalOriginal} cliente(s)`;

  if (totalFiltros > 0) {
    feedbackMessage += ` (${totalFiltros} filtro(s) ativo(s))`;
  }

  console.log("✅ Filtros aplicados:", feedbackMessage);
  showNotification(feedbackMessage, "info");
}

// Função para limpar filtros
function clearFilters() {
  console.log("🧹 Limpando filtros...");

  // Limpar objeto de filtros ativos
  activeFiltros = {
    search: "",
    group: [],
    birthday: [],
    status: [],
    days: [],
    date: [],
  };

  // Limpar campo de busca
  const searchInputElement =
    document.getElementById("searchInput") ||
    document.getElementById("searchClients");
  if (searchInputElement) {
    searchInputElement.value = "";
  }

  // Desmarcar todos os checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  // Limpar tags
  renderFilterTags();

  // Restaurar todos os clientes originais
  if (window.originalClients) {
    window.allClients = [...window.originalClients];
    window.totalClients = window.allClients.length;
    window.currentPage = 1;
    updateDisplayAndPagination();
  }

  console.log("✅ Filtros limpos");
  showNotification("🧹 Filtros limpos - mostrando todos os clientes", "info");
}

// ===== SISTEMA DE FILTROS POR GRUPOS =====

// Carregar grupos de clientes para filtros
async function loadGruposFilter() {
  console.log("🏷️ Carregando grupos para filtros...");

  const container = document.getElementById("gruposClientesFilter");
  if (!container) {
    console.warn("⚠️ Container de filtro de grupos não encontrado");
    return;
  }

  try {
    // Tentar carregar do localStorage primeiro
    let grupos = carregarGruposDoLocalStorage();

    // Se não tiver grupos no localStorage, tentar da API
    if (!grupos || grupos.length === 0) {
      try {
        const response = await fetch("/api/grupos-clientes");
        if (response.ok) {
          grupos = await response.json();
          console.log("✅ Grupos carregados da API:", grupos.length);
        } else {
          console.log("⚠️ API não disponível, usando grupos padrão");
          grupos = getGruposPadrao();
        }
      } catch (error) {
        console.log("⚠️ Erro na API, usando grupos padrão");
        grupos = getGruposPadrao();
      }
    } else {
      console.log("📦 Grupos carregados do localStorage:", grupos.length);
    }

    // Renderizar checkboxes dos grupos
    renderGruposFilter(grupos);
  } catch (error) {
    console.error("❌ Erro ao carregar grupos para filtros:", error);
    container.innerHTML = `
            <div style="color: #dc3545; font-size: 0.9em;">
                <i class="fas fa-exclamation-triangle"></i>
                Erro ao carregar grupos
            </div>
        `;
  }
}

// TODO: Substituir por ApiClient.getGruposClientes()
// Não usar localStorage para gruposClientes
function carregarGruposDoLocalStorage() {
  console.warn(
    "⚠️ carregarGruposDoLocalStorage() DEPRECATED - usar ApiClient.getGruposClientes()",
  );
  return []; // Retorna vazio até implementação da API

  /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO
    try {
        const gruposJson = localStorage.getItem('gruposClientes');
        if (gruposJson) {
            const grupos = JSON.parse(gruposJson);
            return grupos;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar grupos do localStorage:', error);
    }
    return [];
    */
}

// Grupos padrão caso não haja grupos criados
function getGruposPadrao() {
  return [
    {
      id: 1,
      nome: "Banho (QUENTE)",
      descricao: "Clientes do grupo Banho Quente",
      cor: "#FF6B6B",
    },
    {
      id: 2,
      nome: "Banho (FRIO)",
      descricao: "Clientes do grupo Banho Frio",
      cor: "#4ECDC4",
    },
    {
      id: 3,
      nome: "Banho (MORNO)",
      descricao: "Clientes do grupo Banho Morno",
      cor: "#45B7D1",
    },
    {
      id: 4,
      nome: "Assinantes",
      descricao: "Clientes assinantes",
      cor: "#96CEB4",
    },
  ];
}

// Renderizar checkboxes dos grupos no filtro
function renderGruposFilter(grupos) {
  const container = document.getElementById("gruposClientesFilter");
  if (!container) return;

  if (!grupos || grupos.length === 0) {
    container.innerHTML = `
            <div style="color: #999; font-size: 0.9em; font-style: italic;">
                <i class="fas fa-info-circle"></i>
                Nenhum grupo criado ainda
            </div>
        `;
    // Limpar labels de grupos se não houver grupos
    filterLabels.group = {};
    return;
  }

  // Atualizar filterLabels dinamicamente com os grupos atuais
  filterLabels.group = {};
  grupos.forEach((grupo) => {
    const key = grupo.nome
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[()]/g, ""); // Converter para key válida
    filterLabels.group[key] = grupo.nome;
  });

  const html = grupos
    .map((grupo) => {
      const key = grupo.nome
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[()]/g, "");
      return `
            <label class="checkbox-item grupo-checkbox-item">
                <input type="checkbox" value="${key}" onchange="updateFilterTags('group', this)">
                <div class="grupo-color-indicator" style="background-color: ${grupo.cor}"></div>
                <span>${grupo.nome}</span>
            </label>
        `;
    })
    .join("");

  container.innerHTML = html;
  console.log("✅ Filtros de grupos renderizados:", grupos.length);
  console.log("🏷️ FilterLabels atualizados:", filterLabels.group);
}

// ========================================
// SISTEMA DE PAGINAÇÃO
// ========================================

// Função para mudar itens por página
function changeItemsPerPage() {
  const select = document.getElementById("itemsPerPage");
  const selectedValue = select.value;

  console.log(
    `📄 ==================== MUDANÇA DE PAGINAÇÃO ====================`,
  );
  console.log(
    `📄 Valor selecionado: "${selectedValue}" (tipo: ${typeof selectedValue})`,
  );
  console.log(`📄 Estado antes da mudança:`);
  console.log(`📄 - itemsPerPage atual: ${window.itemsPerPage}`);
  console.log(`📄 - currentPage atual: ${window.currentPage}`);
  console.log(`📄 - totalClients: ${window.totalClients}`);
  console.log(
    `📄 - allClients.length: ${window.allClients?.length || "undefined"}`,
  );

  // Se selecionou "Todos" (999999), mostrar todos os clientes
  if (selectedValue === "999999") {
    window.itemsPerPage = Math.max(
      window.totalClients || window.allClients.length || 100,
      100,
    );
    console.log(
      `📋 ✅ Configurado para mostrar TODOS: ${window.itemsPerPage} itens`,
    );
  } else {
    window.itemsPerPage = parseInt(selectedValue);
    console.log(
      `📄 ✅ Configurado para ${window.itemsPerPage} itens por página`,
    );
  }

  window.currentPage = 1; // Resetar para primeira página

  console.log(`📄 Estado após a mudança:`);
  console.log(`📄 - itemsPerPage novo: ${window.itemsPerPage}`);
  console.log(`📄 - currentPage novo: ${window.currentPage}`);

  updateDisplayAndPagination();

  console.log(`📄 ==================== FIM DA MUDANÇA ====================`);
}

// Função para ir para página anterior
function previousPage() {
  if (window.currentPage > 1) {
    window.currentPage--;
    console.log(`⬅️ Indo para página ${window.currentPage}`);
    updateDisplayAndPagination();
  }
}

// Função para ir para próxima página
function nextPage() {
  const totalPages = Math.ceil(window.totalClients / window.itemsPerPage);
  if (window.currentPage < totalPages) {
    window.currentPage++;
    console.log(`➡️ Indo para página ${window.currentPage}`);
    updateDisplayAndPagination();
  }
}

// Função para atualizar a exibição dos clientes com paginação
function updateDisplayAndPagination() {
  console.log(
    `🔄 Atualizando display: página ${window.currentPage}, ${window.itemsPerPage} itens por página, total ${window.totalClients}`,
  );

  // Calcular índices para a página atual
  const startIndex = (window.currentPage - 1) * window.itemsPerPage;
  const endIndex = Math.min(
    startIndex + window.itemsPerPage,
    window.totalClients,
  );

  console.log(`📊 Mostrando clientes de ${startIndex + 1} até ${endIndex}`);

  // Obter clientes da página atual
  const currentPageClients = window.allClients.slice(startIndex, endIndex);

  console.log(`📋 Clientes na página atual: ${currentPageClients.length}`);

  // Atualizar tabela
  updateClientsTable(currentPageClients);

  // Atualizar informações da paginação
  updatePaginationInfo();
}

// Tornar a função global para uso do sistema de filtros
window.updateDisplayAndPagination = updateDisplayAndPagination;

// Função para atualizar as informações da paginação
function updatePaginationInfo() {
  const totalPages = Math.ceil(window.totalClients / window.itemsPerPage);

  // Calcular índices para exibição
  const startIndex =
    window.totalClients > 0
      ? (window.currentPage - 1) * window.itemsPerPage + 1
      : 0;
  const endIndex = Math.min(
    window.currentPage * window.itemsPerPage,
    window.totalClients,
  );

  // Atualizar texto de informação
  const paginationInfo = document.getElementById("paginationInfo");
  if (paginationInfo) {
    paginationInfo.textContent = `${startIndex} - ${endIndex} de ${window.totalClients}`;
  }

  // Atualizar informação da página
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) {
    pageInfo.textContent =
      totalPages > 0
        ? `Página ${window.currentPage} de ${totalPages}`
        : "Página 0 de 0";
  }

  // Controlar botões
  const prevButton = document.getElementById("prevPage");
  const nextButton = document.getElementById("nextPage");

  if (prevButton) {
    prevButton.disabled = window.currentPage <= 1;
  }

  if (nextButton) {
    nextButton.disabled = window.currentPage >= totalPages || totalPages === 0;
  }

  console.log(
    `📊 Paginação: Página ${window.currentPage}/${totalPages}, mostrando ${startIndex}-${endIndex} de ${window.totalClients} clientes`,
  );
}

// Função para atualizar a tabela de clientes (separada para reutilizar)
function updateClientsTable(clients) {
  const tbody = document.getElementById("clientsTableBody");
  if (!tbody) {
    console.error("❌ Elemento clientsTableBody não encontrado");
    return;
  }

  if (!clients || clients.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-users" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    Nenhum cliente encontrado
                </td>
            </tr>
        `;
    return;
  }

  let clientesHTML = "";

  clients.forEach((cliente, index) => {
    // Determinar se é o mais recente (primeiro da lista original)
    const isNewest = window.originalClients
      ? window.originalClients[0] && window.originalClients[0].id === cliente.id
      : index === 0;

    // Avatar
    let avatar = "";
    if (cliente.imagem_perfil) {
      avatar =
        '<img src="/uploads/' +
        cliente.imagem_perfil +
        '" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">';
    } else {
      avatar =
        '<div style="width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">' +
        cliente.nome.charAt(0).toUpperCase() +
        "</div>";
    }

    // Badge de mais recente
    const newestBadge = isNewest
      ? '<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 8px;">MAIS RECENTE</span>'
      : "";

    // Status do cliente
    const isAtivo =
      cliente.ativo === true || cliente.ativo === 1 || cliente.ativo === "true";
    const statusHTML = `
            <div style="display: flex; align-items: center; gap: 4px; margin-top: 3px; font-size: 11px;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${isAtivo ? "#27ae60" : "#e74c3c"};"></div>
                <span style="color: ${isAtivo ? "#27ae60" : "#e74c3c"}; font-weight: 500;">${isAtivo ? "Ativo" : "Inativo"}</span>
            </div>
        `;

    // Data formatada
    const dataFormatada = cliente.createdAt
      ? new Date(cliente.createdAt).toLocaleDateString("pt-BR")
      : cliente.data_cadastro
        ? new Date(cliente.data_cadastro).toLocaleDateString("pt-BR")
        : new Date().toLocaleDateString("pt-BR");

    clientesHTML +=
      '<tr class="client-row" onclick="viewClientDetails(' +
      cliente.id +
      ')" style="cursor: pointer;" data-grupo="' +
      (cliente.grupo_cliente || "") +
      '" data-cliente-id="' +
      cliente.id +
      '" data-nascimento="' +
      (cliente.data_nascimento || "") +
      '">';
    clientesHTML +=
      '<td><div style="display: flex; align-items: center; gap: 12px;">' +
      avatar +
      "<div><strong>" +
      cliente.nome +
      "</strong>" +
      newestBadge +
      statusHTML +
      "</div></div></td>";
    clientesHTML += "<td>" + (cliente.email || "---") + "</td>";
    clientesHTML += "<td>" + (cliente.telefone || "---") + "</td>";
    // Pets cell: if cliente.pets is present, show names (max 2) with +N; otherwise show button to fetch
    if (Array.isArray(cliente.pets) && cliente.pets.length > 0) {
      const petNames = cliente.pets.map((p) => p.nome || p.name || "Pet");
      const petsText = petNames.join(", ");
      clientesHTML += '<td class="pets-cell">' + petsText + "</td>";
    } else {
      // Não mostrar botão "Ver Pets" — colocar placeholder que será preenchido pelo prefetch
      clientesHTML +=
        '<td class="pets-cell"><span class="pets-placeholder">—</span></td>';
    }

    clientesHTML += "<td>" + dataFormatada + "</td>";
    clientesHTML +=
      '<td><div class="action-buttons" onclick="event.stopPropagation();"><button class="btn-edit" onclick="editClient(' +
      cliente.id +
      ')" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-delete" onclick="deleteClient(' +
      cliente.id +
      ')" title="Excluir"><i class="fas fa-trash"></i></button></div></td>';
    clientesHTML += "</tr>";
  });

  tbody.innerHTML = clientesHTML;

  // Adicionar eventos de hover
  tbody.querySelectorAll(".client-row").forEach((row) => {
    row.addEventListener("mouseenter", () => {
      row.style.backgroundColor = "#f8f9fa";
    });
    row.addEventListener("mouseleave", () => {
      row.style.backgroundColor = "";
    });
  });

  // PREFETCH: buscar automaticamente os pets das linhas que ainda não tem
  // nomes exibidos (aquelas que renderizamos com o placeholder '.pets-placeholder').
  // Fazemos em background com pequeno espaçamento para não sobrecarregar a API.
  tbody.querySelectorAll(".pets-cell").forEach((cell, idx) => {
    const hasPlaceholder = cell.querySelector(".pets-placeholder");
    const hasButton = cell.querySelector("button.btn-small"); // por segurança, caso ainda exista
    if (hasPlaceholder || hasButton) {
      const tr = cell.closest("tr");
      const clientId = tr ? tr.getAttribute("data-cliente-id") : null;
      if (clientId) {
        // escalonar as requisições (120ms de intervalo por linha)
        setTimeout(() => {
          fetchPetsForClient(clientId, cell).catch((err) => {
            // silencioso: manter o placeholder se falhar
            console.debug("Erro ao prefetch pets para cliente", clientId, err);
          });
        }, idx * 120);
      }
    }
  });
}

// Buscar pets de um cliente sob demanda e preencher a célula correspondente
async function fetchAndShowPets(event, clientId) {
  try {
    // event pode ser undefined quando chamada programaticamente
    if (event && typeof event.stopPropagation === "function")
      event.stopPropagation();
    // localizar célula a partir do event.target quando possível
    let cell = null;
    if (event && event.target) {
      const btn = event.target;
      const tr = btn.closest("tr");
      cell = tr ? tr.querySelector(".pets-cell") : null;
    }
    // se não achou célula via event, localizar pelo clientId
    if (!cell && clientId) {
      const tr = document.querySelector(`tr[data-cliente-id="${clientId}"]`);
      cell = tr ? tr.querySelector(".pets-cell") : null;
    }
    if (!cell) return;

    // delegar para a função reutilizável
    await fetchPetsForClient(clientId, cell);
  } catch (err) {
    console.error("Erro ao buscar pets:", err);
    // tentar recuperar a célula para mostrar erro
    try {
      const tr = document.querySelector(`tr[data-cliente-id="${clientId}"]`);
      const cell = tr ? tr.querySelector(".pets-cell") : null;
      if (cell) cell.innerHTML = '<span style="color:#e74c3c">Erro</span>';
    } catch (e) {
      // noop
    }
  }
}

window.fetchAndShowPets = fetchAndShowPets;

// Função reutilizável que busca pets e atualiza a célula fornecida.
async function fetchPetsForClient(clientId, cell) {
  if (!cell) return;
  try {
    // prevenir mudanças de largura que causam tremor: reservar largura mínima para a célula
    try {
      cell.style.minWidth = "160px";
    } catch (e) {}
    // mostrar apenas o ícone de loading (sem texto) para não alterar a largura
    cell.innerHTML =
      '<i class="fas fa-spinner fa-spin" style="color:#3498db"></i>';

    const resp = await fetch(`/api/pets?cliente_id=${clientId}`);
    if (!resp.ok) throw new Error("Erro na requisição");
    const data = await resp.json();
    // aceitar tanto { pets: [...] } quanto array direto
    let pets = [];
    if (Array.isArray(data)) pets = data;
    else if (data && Array.isArray(data.pets)) pets = data.pets;

    if (!pets || pets.length === 0) {
      cell.innerHTML = '<span style="color:#6c757d">Sem pets</span>';
      return;
    }

    const names = pets.map((p) => p.nome || p.name || "Pet");
    const preview = names.join(", ");
    // mostrar apenas os nomes, sem botão
    cell.innerHTML = preview;
  } catch (err) {
    console.error("Erro ao buscar pets (fetchPetsForClient):", err);
    cell.innerHTML = '<span style="color:#e74c3c">Erro</span>';
    throw err;
  }
}

// Sistema de debounce para evitar múltiplas chamadas
let refreshTimeout = null;
let isRefreshingClientes = false;

function forceRefreshClients(reason = "unknown") {
  console.log(`🔄 Forçando refresh dos clientes (motivo: ${reason})`);

  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  if (isRefreshingClientes) {
    console.log("🔄 Refresh já em andamento, aguardando...");
    return;
  }

  refreshTimeout = setTimeout(async () => {
    isRefreshingClientes = true;
    try {
      console.log("🔄 Executando refresh FORÇADO...");
      await loadClients(true); // Passar true para forçar
      console.log("✅ Refresh FORÇADO concluído com sucesso!");
    } catch (error) {
      console.error("❌ Erro no refresh:", error);
    } finally {
      isRefreshingClientes = false;
    }
  }, 300);
}

// Função para recarregar grupos quando a página ganha foco (atualizar quando volta de grupos-clientes.html)
let lastFocusTime = Date.now();
window.addEventListener("focus", () => {
  const currentTime = Date.now();
  const timeDiff = currentTime - lastFocusTime;

  console.log(
    "🔄 Página ganhou foco, tempo desde último foco:",
    timeDiff + "ms",
  );

  // Se passou mais de 1 segundo, forçar atualização
  if (timeDiff > 1000) {
    console.log("🔄 Período fora da página, atualizando dados...");
    loadGruposFilter();
    forceRefreshClients("focus-after-time");
  }

  lastFocusTime = currentTime;
});

window.addEventListener("blur", () => {
  console.log("🔄 Página perdeu foco");
  lastFocusTime = Date.now();
});

// Detectar quando o usuário volta à página usando botão voltar do navegador
window.addEventListener("pageshow", (event) => {
  console.log("🔄 Evento pageshow disparado, persisted:", event.persisted);
  if (event.persisted) {
    console.log(
      "🔄 Página restaurada do cache (botão voltar), recarregando dados...",
    );
    loadGruposFilter();
    forceRefreshClients("pageshow-cache");
  }
});

// Detectar mudanças de visibilidade da aba
document.addEventListener("visibilitychange", () => {
  console.log("🔄 Visibilidade mudou, hidden:", document.hidden);
  if (!document.hidden) {
    console.log("🔄 Aba se tornou visível, verificando atualizações...");
    loadGruposFilter();
    forceRefreshClients("visibility-change");
  }
});

// Sistema para detectar quando voltamos de outras páginas
let pageLoadTime = Date.now();
window.addEventListener("beforeunload", () => {
  localStorage.setItem("lastPageUnload", Date.now().toString());
});

// Verificar se voltamos de outra página
window.addEventListener("load", () => {
  console.log("🔄 Página carregada");
  const lastUnload = localStorage.getItem("lastPageUnload");
  const currentTime = Date.now();

  if (lastUnload && currentTime - parseInt(lastUnload) < 10000) {
    // 10 segundos
    console.log(
      "🔄 Detectado retorno recente de outra página, forçando atualização...",
    );
    setTimeout(() => {
      loadGruposFilter();
      forceRefreshClients("load-after-unload");
    }, 500);
  }
});

// Adicionar também ao DOMContentLoaded para garantir
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 DOM carregado, verificando necessidade de atualização...");

  // Verificar se há flag de atualização pendente
  const needsUpdate = localStorage.getItem("clienteStatusUpdated");
  if (needsUpdate) {
    console.log("🔄 Flag de atualização encontrado, forçando refresh...");
    setTimeout(() => {
      forceRefreshClients("localstorage-flag");
      localStorage.removeItem("clienteStatusUpdated");
    }, 1000);
  }

  // Verificar se chegamos via navegação do navegador
  if (performance.navigation.type === 2) {
    // TYPE_BACK_FORWARD
    console.log(
      "🔄 Detectado navegação via botão voltar/avançar, forçando atualização...",
    );
    setTimeout(() => {
      forceRefreshClients("navigation-back-forward");
    }, 500);
  }
});

// Detectar mudanças no histórico do navegador
window.addEventListener("popstate", () => {
  console.log("🔄 Evento popstate detectado (navegação do histórico)");
  forceRefreshClients("popstate");
});

// Implementar uma versão mais robusta do auto-refresh
let isPageVisible = true;
let hasLeftPage = false;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    isPageVisible = false;
    hasLeftPage = true;
    console.log("🔄 Página ficou oculta");
  } else {
    isPageVisible = true;
    if (hasLeftPage) {
      console.log(
        "🔄 Página voltou a ficar visível após estar oculta, atualizando...",
      );
      forceRefreshClients("visibility-return");
    }
  }
});

// Forçar atualização na inicialização da página
window.addEventListener("DOMContentLoaded", () => {
  // Aguardar um pouco para garantir que tudo está carregado
  setTimeout(() => {
    console.log("🔄 Forçando primeira atualização após carregamento...");
    forceRefreshClients("dom-loaded");
  }, 1500);
});

// Sistema adicional para garantir atualização
let lastUpdateCheck = Date.now();
window.addEventListener("focus", () => {
  const now = Date.now();
  if (now - lastUpdateCheck > 3000) {
    // 3 segundos
    console.log("🔄 Focus após tempo significativo, garantindo atualização...");
    forceRefreshClients("focus-guaranteed");
    lastUpdateCheck = now;
  }
});

// Sistema de verificação ativa de localStorage
setInterval(() => {
  const needsUpdate = localStorage.getItem("clienteStatusUpdated");
  if (needsUpdate && !document.hidden) {
    console.log("🔄 Detectada atualização pendente via polling, executando...");
    forceRefreshClients("polling-detection");
    localStorage.removeItem("clienteStatusUpdated");
  }
}, 2000); // Verificar a cada 2 segundos

// Sistema de backup que força atualização quando há mudanças de localStorage
let reloadFallbackCount = 0;
let storageCheckInterval = setInterval(() => {
  if (!document.hidden && document.hasFocus()) {
    const lastChange = localStorage.getItem("lastClientChange");
    if (lastChange) {
      const changeTime = parseInt(lastChange);
      const now = Date.now();

      if (now - changeTime < 30000) {
        // 30 segundos
        console.log("🔄 Mudança recente detectada, verificando atualização...");
        forceRefreshClients("recent-change-detected");
        localStorage.removeItem("lastClientChange");

        // Se já tentou várias vezes, usar fallback mais agressivo
        reloadFallbackCount++;
        if (reloadFallbackCount > 3) {
          console.log("🔄 Muitas tentativas, usando reload como fallback...");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    }
  }
}, 5000); // Verificar a cada 5 segundos

// Reset do contador quando página carrega
window.addEventListener("load", () => {
  reloadFallbackCount = 0;
});

// Detectar mudanças no localStorage de outras abas
window.addEventListener("storage", (e) => {
  if (e.key === "gruposClientes") {
    console.log("🔄 Grupos atualizados em outra aba, recarregando filtros...");
    loadGruposFilter();
  }

  // Detectar atualizações de status de clientes
  if (e.key === "clienteStatusUpdated") {
    console.log(
      "🔄 Status de cliente atualizado em outra aba, recarregando...",
    );
    forceRefreshClients("storage-event");
    localStorage.removeItem("clienteStatusUpdated"); // Limpar o flag
  }
});

// Sistema de verificação periódica para mudanças (polling leve)
let lastCheckTime = Date.now();
setInterval(async () => {
  // Verificar apenas se a página está visível
  if (!document.hidden && document.hasFocus()) {
    try {
      const response = await fetch(
        `/api/clientes/check-updates?since=${lastCheckTime}`,
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.hasUpdates) {
          console.log(
            "🔄 Detectadas atualizações via polling, recarregando...",
          );
          loadClients();
        }
      }
    } catch (error) {
      // Ignorar erros de polling silenciosamente
    }
    lastCheckTime = Date.now();
  }
}, 10000); // Verificar a cada 10 segundos
