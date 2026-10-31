// Atualizar clientes - VERSÃO FUNCIONAL
function refreshClients() {
  console.log("🔄 Iniciando refresh de clientes...");

  // Encontrar elementos para animação
  const refreshButton = document.querySelector(
    'button[onclick="refreshClients()"]',
  );
  const refreshIcon = refreshButton?.querySelector("i");
  const tbody = document.getElementById("clientsTableBody");

  if (!tbody) {
    console.error("❌ Elemento tbody não encontrado!");
    return;
  }

  // Adicionar animação no botão
  if (refreshButton && refreshIcon) {
    refreshButton.classList.add("refreshing");
    refreshIcon.style.animation = "spin 1s linear infinite";
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
  fetch("/api/clientes")
    .then((response) => {
      console.log("📡 Response recebido:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log("📄 Dados recebidos:", data);

      if (data.success && Array.isArray(data.clientes)) {
        console.log(`📋 Processando ${data.clientes.length} clientes...`);

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
          // HTML simples e funcional
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
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <strong>${cliente.nome}</strong>
                                                ${isNewest ? '<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold;">MAIS RECENTE</span>' : ""}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>${cliente.email || "---"}</td>
                                <td>${cliente.telefone}</td>
                                <td>${new Date(cliente.createdAt).toLocaleDateString("pt-BR")}</td>
                                <td>
                                    <div class="action-buttons" onclick="event.stopPropagation();">
                                        <button class="btn-edit" onclick="editClient(${cliente.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn-delete" onclick="deleteClient(${cliente.id})" title="Excluir">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
            })
            .join("");

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
      // Parar animação
      if (refreshButton && refreshIcon) {
        refreshButton.classList.remove("refreshing");
        refreshIcon.style.animation = "";
      }
    });
}
