// Clientes JavaScript

// Abrir modal
function openModal() {
  document.getElementById("clientModal").style.display = "block";
  document.getElementById("clientForm").reset();
}

// Fechar modal
function closeModal() {
  document.getElementById("clientModal").style.display = "none";
}

// Carregar clientes - carregamento silencioso sem notificação
async function loadClients() {
  console.log("🔍 INÍCIO loadClients...");

  // Garantir estado limpo antes de iniciar
  ensureCleanState();

  // Verificar se refresh está ativo
  if (isRefreshing) {
    console.log("⚠️ Refresh em andamento, aguardando...");
    return;
  }

  // Definir flag para evitar conflitos
  isRefreshing = true;

  try {
    console.log("📡 loadClients fazendo fetch...");
    // usar fetch com timeout e tentar relativo como fallback
    let response = null;
    try {
      response = await fetchWithTimeout("/api/clientes", {}, 3000);
    } catch (err) {
      console.warn(
        "⚠️ loadClients: fallback para rota relativa por timeout/erro",
        err && err.message,
      );
      try {
        response = await fetchWithTimeout("/api/clientes", {}, 2500);
      } catch (err2) {
        throw err2;
      }
    }
    console.log("📡 loadClients Response status:", response && response.status);
    if (!response || !response.ok) {
      if (response && response.status === 401) {
        document.cookie =
          "usuarioLogadoId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "usuarioLogadoNome=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login/login.html";
        return;
      }
      throw new Error(
        `HTTP error! status: ${response ? response.status : "no-response"}`,
      );
    }
    const data = await response.json();
    console.log("📄 loadClients Dados recebidos:", data);

    // A API retorna {success: true, clientes: [...]}
    if (data.success && Array.isArray(data.clientes)) {
      console.log(
        "🎯 loadClients CHAMANDO displayClients com",
        data.clientes.length,
        "clientes",
      );
      displayClients(data.clientes);
      console.log(
        "✅ loadClients Clientes carregados silenciosamente:",
        data.clientes.length,
      );
    } else {
      console.error("❌ loadClients Formato de resposta inválido:", data);
      showError("Erro no formato da resposta da API");
    }
  } catch (error) {
    console.error("❌ loadClients Erro ao carregar clientes:", error);
    showError(
      "Erro ao carregar clientes. Verifique se o servidor está rodando.",
    );

    // Mostrar erro na tabela
    const tbody = document.getElementById("clientsTableBody");
    if (tbody) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        Erro ao carregar clientes. Clique em atualizar para tentar novamente.
                    </td>
                </tr>
            `;
    }
  } finally {
    // Sempre garantir estado limpo
    ensureCleanState();
  }
}

// Helper: fetch com timeout usando AbortController
function fetchWithTimeout(resource, options = {}, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const finalOpts = Object.assign({}, options, { signal: controller.signal });
  return fetch(resource, finalOpts).finally(() => clearTimeout(id));
}

// Exibir clientes na tabela
function displayClients(clientes) {
  console.log("📊 INÍCIO displayClientes:", clientes);
  const tbody = document.getElementById("clientsTableBody");

  if (!tbody) {
    console.error("❌ Elemento clientsTableBody não encontrado!");
    return;
  }

  console.log("✅ tbody encontrado:", tbody);

  if (clientes.length === 0) {
    console.log("📝 Nenhum cliente encontrado");
    tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.3;"></i>
                    Nenhum cliente encontrado
                </td>
            </tr>
        `;
    return;
  }

  console.log(`📋 Gerando HTML para ${clientes.length} clientes...`);

  try {
    const htmlContent = clientes
      .map((cliente, index) => {
        const isNewest = index === 0;
        const avatar = cliente.imagem_perfil
          ? `<img src="/uploads/${cliente.imagem_perfil}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
          : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${cliente.nome.charAt(0).toUpperCase()}</div>`;

        const newestBadge = isNewest
          ? '<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">MAIS RECENTE</span>'
          : "";

        return `
                <tr class="client-row ${isNewest ? "newest-client" : ""}" onclick="viewClientDetails(${cliente.id})" style="cursor: pointer;">
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${avatar}
                            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span><strong>${cliente.nome}</strong></span>
                                    ${newestBadge}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>${cliente.email || "---"}</td>
                    <td>${cliente.telefone}</td>
                    <td>${new Date(cliente.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td>
                        <div class="actions-container" onclick="event.stopPropagation();">
                            <button class="btn-action btn-edit" onclick="editClient(${cliente.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteClient(${cliente.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");

    console.log("📄 HTML gerado, tamanho:", htmlContent.length);
    console.log(
      "📄 Primeiro cliente HTML:",
      htmlContent.substring(0, 200) + "...",
    );

    // Atualizar o conteúdo da tabela
    tbody.innerHTML = htmlContent;
    console.log("✅ innerHTML atualizado");

    // Verificar se foi realmente atualizado
    const updatedRows = tbody.querySelectorAll("tr");
    console.log("🔍 Linhas na tabela após atualização:", updatedRows.length);

    // Adicionar estilos de hover para as linhas
    const clientRows = tbody.querySelectorAll(".client-row");
    console.log("🎨 Adicionando hover a", clientRows.length, "linhas");

    clientRows.forEach((row, index) => {
      row.addEventListener("mouseenter", function () {
        this.style.backgroundColor = "#f8f9fa";
      });

      row.addEventListener("mouseleave", function () {
        this.style.backgroundColor = "";
      });
    });

    console.log(
      "✅ FIM displayClientes - Clientes exibidos na tabela com sucesso!",
    );
  } catch (error) {
    console.error("❌ Erro ao gerar HTML dos clientes:", error);
    tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    Erro ao exibir clientes. Tente novamente.
                </td>
            </tr>
        `;
  }
}

// Enviar formulário
async function handleSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const response = await fetch("/api/clientes", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Cliente criado:", result);

    closeModal();
    loadClients(); // Recarregar lista
    showSuccess("Cliente cadastrado com sucesso!");
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    showError("Erro ao cadastrar cliente. Tente novamente.");
  }
}

// Pesquisar clientes
function searchClients(e) {
  const searchTerm = e.target.value.toLowerCase();
  const rows = document.querySelectorAll("#clientsTableBody tr");

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Editar cliente
function editClient(id) {
  // TODO: Implementar edição
  console.log("Editar cliente:", id);
  showInfo("Funcionalidade de edição será implementada em breve.");
}

// Visualizar detalhes do cliente
function viewClientDetails(clientId) {
  window.location.href = `client-details.html?id=${clientId}`;
}

// Excluir cliente
async function deleteClient(id) {
  showCustomAlert(
    "Tem certeza que deseja excluir esse cliente?",
    "Essa ação não poderá ser desfeita",
    async function () {
      try {
        const response = await fetch(`/api/clientes/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        loadClients(); // Recarregar lista
        showSuccess("Cliente excluído com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        showError("Erro ao excluir cliente. Tente novamente.");
      }
    },
  );
}

// Atualizar clientes - VERSÃO DE TESTE SIMPLES
function refreshClients() {
  console.log("🔄 TESTE: refreshClients chamado");

  const tbody = document.getElementById("clientsTableBody");
  console.log("🔍 TESTE: tbody encontrado?", !!tbody);

  if (!tbody) {
    console.error("❌ TESTE: tbody não encontrado!");
    return;
  }

  // Teste 1: Apenas atualizar com conteúdo fixo
  console.log("📝 TESTE: Atualizando com conteúdo fixo...");
  tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px; background: #e8f5e8;">
                ✅ TESTE: Se você está vendo isso, a atualização da tabela funciona!
            </td>
        </tr>
    `;

  console.log("✅ TESTE: HTML atualizado");

  // Aguardar 2 segundos e então carregar os dados reais
  setTimeout(() => {
    console.log("� TESTE: Carregando dados reais após 2 segundos...");

    fetch("/api/clientes")
      .then((response) => {
        console.log("📡 TESTE: Response:", response.status);
        return response.json();
      })
      .then((data) => {
        console.log("📄 TESTE: Dados:", data);

        if (data.success && Array.isArray(data.clientes)) {
          console.log("📋 TESTE: Gerando HTML simples...");

          const simpleHTML = data.clientes
            .map(
              (cliente) => `
                        <tr>
                            <td>${cliente.nome}</td>
                            <td>${cliente.email || "---"}</td>
                            <td>${cliente.telefone}</td>
                            <td>${new Date(cliente.createdAt).toLocaleDateString("pt-BR")}</td>
                            <td>Ações</td>
                        </tr>
                    `,
            )
            .join("");

          console.log("📄 TESTE: HTML gerado, length:", simpleHTML.length);
          tbody.innerHTML = simpleHTML;
          console.log("✅ TESTE: Tabela atualizada com dados reais!");

          showNotification(
            "Lista de clientes atualizada com sucesso!",
            "success",
          );
        } else {
          console.error("❌ TESTE: Dados inválidos");
          tbody.innerHTML = '<tr><td colspan="5">Erro nos dados</td></tr>';
        }
      })
      .catch((error) => {
        console.error("❌ TESTE: Erro:", error);
        tbody.innerHTML = '<tr><td colspan="5">Erro na requisição</td></tr>';
      });
  }, 2000);
}

// Flag para evitar múltiplas execuções simultâneas
let isRefreshing = false;

// Reset da flag ao carregar a página para evitar travamentos
function resetRefreshState() {
  isRefreshing = false;
  console.log("🔄 Estado de refresh resetado");
}

// Função para garantir que o estado está sempre limpo
function ensureCleanState() {
  isRefreshing = false;
  console.log("🧹 Estado limpo garantido");
}

// Chamar reset ao carregar o DOM
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM carregado, resetando estado...");
  ensureCleanState();
  loadClients();
});

// Reset adicional quando a página fica visível
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    console.log("👁️ Página voltou a ficar visível, limpando estado...");
    ensureCleanState();
  }
});

// Reset quando a página está prestes a ser escondida
document.addEventListener("pagehide", function () {
  console.log("🚪 Página sendo escondida, limpando estado...");
  ensureCleanState();
});

// Reset quando a página é mostrada novamente
document.addEventListener("pageshow", function () {
  console.log("🔄 Página mostrada novamente, limpando estado...");
  ensureCleanState();
});

// Atualizar clientes - VERSÃO ROBUSTA
function refreshClientsFix() {
  console.log("🔄 Refresh chamado. isRefreshing antes:", isRefreshing);

  // Sempre forçar reset para evitar travamentos
  ensureCleanState();

  // Definir como ativo
  isRefreshing = true;
  console.log("🔄 Iniciando atualização...");

  const tbody = document.getElementById("clientsTableBody");

  if (!tbody) {
    console.error("❌ Elemento tbody não encontrado!");
    ensureCleanState();
    return;
  }

  // Timeout de segurança - múltiplos níveis
  const timeout1 = setTimeout(() => {
    console.warn("⚠️ TIMEOUT 3s: Limpando estado");
    ensureCleanState();
  }, 3000);

  const timeout2 = setTimeout(() => {
    console.warn("⚠️ TIMEOUT 5s: Limpando estado");
    ensureCleanState();
  }, 5000);

  // Mostrar loading
  tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="5" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="color: #3498db; margin-right: 10px;"></i>
                <span style="color: #3498db; font-weight: 500;">Atualizando lista de clientes...</span>
            </td>
        </tr>
    `;

  // Fazer requisição com timeout e fallback
  fetchWithTimeout("/api/clientes", {}, 4000)
    .catch((err) => {
      console.warn(
        "⚠️ refreshClientsFix: fallback para rota relativa por timeout/erro",
        err && err.message,
      );
      return fetchWithTimeout("/api/clientes", {}, 3000);
    })
    .then((response) => {
      if (!response || !response.ok) throw new Error("Resposta inválida");
      return response.json();
    })
    .then((data) => {
      if (data.success && Array.isArray(data.clientes)) {
        console.log(`� Processando ${data.clientes.length} clientes...`);

        if (data.clientes.length === 0) {
          tbody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.3;"></i>
                                Nenhum cliente encontrado
                            </td>
                        </tr>
                    `;
        } else {
          // Gerar HTML dos clientes
          const clientesHTML = data.clientes
            .map((cliente, index) => {
              const isNewest = index === 0;
              const avatar = cliente.imagem_perfil
                ? `<img src="/uploads/${cliente.imagem_perfil}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
                : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">${cliente.nome.charAt(0).toUpperCase()}</div>`;

              return `
                            <tr class="client-row ${isNewest ? "newest-client" : ""}" onclick="viewClientDetails(${cliente.id})" style="cursor: pointer;">
                                <td>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        ${avatar}
                                        <div>
                                            <strong>${cliente.nome}</strong>
                                            ${isNewest ? '<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 8px;">MAIS RECENTE</span>' : ""}
                                        </div>
                                    </div>
                                </td>
                                <td>${cliente.email || "---"}</td>
                                <td>${cliente.telefone}</td>
                                <td>${new Date(cliente.createdAt).toLocaleDateString("pt-BR")}</td>
                                <td>
                                    <div class="actions-container" onclick="event.stopPropagation();">
                                        <button class="btn-action btn-edit" onclick="editClient(${cliente.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn-action btn-delete" onclick="deleteClient(${cliente.id})" title="Excluir">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
            })
            .join("");

          // Atualizar a tabela
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
        }

        console.log("✅ Clientes exibidos com sucesso!");
        showNotification(
          "Lista de clientes atualizada com sucesso!",
          "success",
        );
      } else {
        throw new Error("Formato de resposta inválido");
      }
    })
    .catch((error) => {
      console.error("❌ Erro:", error);
      showNotification("Erro ao atualizar lista de clientes", "error");
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        Erro ao carregar clientes. Clique em atualizar novamente.
                    </td>
                </tr>
            `;
    })
    .finally(() => {
      // Limpar timeouts
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      // Garantir estado limpo
      ensureCleanState();
      console.log("✅ Refresh finalizado e estado limpo");
    });
}

// Utilitários
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
}

function showSuccess(message) {
  showNotification(message, "success");
}

function showError(message) {
  showNotification(message, "error");
}

function showInfo(message) {
  showNotification(message, "info");
}

/*
function showNotification(message, type) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${getIconByType(type)}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Adicionar estilos se não existirem
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 6px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 3000;
                animation: slideIn 0.3s ease;
            }
            
            .notification-success { background: #27ae60; }
            .notification-error { background: #5a9bd4; }
            .notification-info { background: #3498db; }
            
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                margin-left: auto;
            }
            
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

function getIconByType(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

// Modal de confirmação personalizado
function showCustomAlert(title, message, onConfirm) {
    // Remover modal existente se houver
    const existingModal = document.querySelector('.custom-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="modal-title">${title}</h3>
                <p class="modal-message">${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel">Cancelar</button>
                    <button class="btn-confirm">Excluir</button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(modal);
    
    // Adicionar event listeners
    const btnCancel = modal.querySelector('.btn-cancel');
    const btnConfirm = modal.querySelector('.btn-confirm');
    const overlay = modal.querySelector('.modal-overlay');
    
    btnCancel.addEventListener('click', () => {
        modal.remove();
    });
    
    btnConfirm.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            modal.remove();
        }
    });
    
    // Mostrar modal com animação
    setTimeout(() => modal.classList.add('show'), 10);
}
*/
