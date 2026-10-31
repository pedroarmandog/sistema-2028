// Sistema de Lista de Pets
console.log("🐾 Sistema de lista de pets carregado");

// Variáveis globais
let pets = [];
let clientes = [];

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Inicializando lista de pets");

  // Carregar dados
  carregarPets();
  carregarClientes();
});

// Carregar lista de pets
async function carregarPets() {
  try {
    console.log("📡 Carregando lista de pets...");

    mostrarLoading(true);

    const response = await fetch("/api/pets");
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    pets = data.success ? data.pets : data;

    console.log("✅ Pets carregados:", pets.length);

    // Exibir pets
    exibirPets();
  } catch (error) {
    console.error("❌ Erro ao carregar pets:", error);
    mostrarErro("Erro ao carregar lista de pets");
  } finally {
    mostrarLoading(false);
  }
}

// Carregar lista de clientes
async function carregarClientes() {
  try {
    console.log("📡 Carregando lista de clientes...");

    const response = await fetch("/api/clientes");
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    clientes = data.success ? data.clientes : data;

    console.log("✅ Clientes carregados:", clientes.length);
  } catch (error) {
    console.error("❌ Erro ao carregar clientes:", error);
  }
}

// Exibir pets na grid
function exibirPets() {
  const petsGrid = document.getElementById("petsGrid");
  const emptyState = document.getElementById("emptyState");

  if (!petsGrid || !emptyState) return;

  if (pets.length === 0) {
    // Mostrar estado vazio
    petsGrid.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  // Mostrar grid
  petsGrid.style.display = "grid";
  emptyState.style.display = "none";

  // Limpar grid
  petsGrid.innerHTML = "";

  // Adicionar cards dos pets
  pets.forEach((pet) => {
    const petCard = criarCardPet(pet);
    petsGrid.appendChild(petCard);
  });

  console.log(`✅ Exibindo ${pets.length} pets`);
}

// Criar card de pet
function criarCardPet(pet) {
  const card = document.createElement("div");
  card.className = "pet-card";

  // Buscar dados do cliente
  const cliente = clientes.find((c) => c.id === pet.cliente_id);
  const nomeCliente = cliente ? cliente.nome : "Cliente não encontrado";

  // Calcular idade se houver data de nascimento
  const idade = pet.data_nascimento
    ? calcularIdade(new Date(pet.data_nascimento))
    : null;

  // Processar tags
  const tags = pet.tags
    ? pet.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag)
    : [];

  card.innerHTML = `
        <div class="pet-card-header">
            <div class="pet-avatar">
                ${pet.nome.charAt(0).toUpperCase()}
            </div>
            <div class="pet-info">
                <h3>${pet.nome}</h3>
                <p>Cliente: ${nomeCliente}</p>
            </div>
        </div>
        
        <div class="pet-details">
            ${
              pet.raca
                ? `
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Raça:</span>
                    <span class="pet-detail-value">${pet.raca}</span>
                </div>
            `
                : ""
            }
            
            ${
              pet.genero
                ? `
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Gênero:</span>
                    <span class="pet-detail-value">${pet.genero}</span>
                </div>
            `
                : ""
            }
            
            ${
              pet.porte
                ? `
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Porte:</span>
                    <span class="pet-detail-value">${pet.porte}</span>
                </div>
            `
                : ""
            }
            
            ${
              idade
                ? `
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Idade:</span>
                    <span class="pet-detail-value">${idade}</span>
                </div>
            `
                : ""
            }
            
            ${
              pet.chip
                ? `
                <div class="pet-detail-item">
                    <span class="pet-detail-label">Chip:</span>
                    <span class="pet-detail-value">${pet.chip}</span>
                </div>
            `
                : ""
            }
        </div>
        
        ${
          tags.length > 0
            ? `
            <div class="pet-tags">
                ${tags.map((tag) => `<span class="pet-tag">${tag}</span>`).join("")}
            </div>
        `
            : ""
        }
        
        <div class="pet-actions">
            <a href="editar-pet.html?id=${pet.id}" class="btn-action btn-edit">
                <i class="fas fa-edit"></i> Editar
            </a>
            <button onclick="confirmarExclusao(${pet.id}, '${pet.nome}')" class="btn-action btn-delete">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    `;

  return card;
}

// Calcular idade do pet
function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);

  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();

  if (meses < 0) {
    anos--;
    meses += 12;
  }

  if (hoje.getDate() < nascimento.getDate()) {
    meses--;
    if (meses < 0) {
      anos--;
      meses += 12;
    }
  }

  // Formatação da idade
  if (anos === 0 && meses === 0) {
    return "Recém-nascido";
  } else if (anos === 0) {
    return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  } else if (meses === 0) {
    return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  } else {
    return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
  }
}

// Confirmar exclusão de pet
async function confirmarExclusao(petId, nomePet) {
  const confirmacao = await confirmar(
    `Tem certeza que deseja excluir o pet "${nomePet}"?\n\nEsta ação não pode ser desfeita.`,
  );

  if (confirmacao) {
    excluirPet(petId);
  }
}

// Excluir pet
async function excluirPet(petId) {
  try {
    console.log("🗑️ Excluindo pet:", petId);

    const response = await fetch(`/api/pets/${petId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
    }

    console.log("✅ Pet excluído com sucesso");

    // Remover pet da lista local
    pets = pets.filter((pet) => pet.id !== petId);

    // Atualizar exibição
    exibirPets();

    // Mostrar mensagem de sucesso
    mostrarNotificacao("Pet excluído com sucesso!", "success");
  } catch (error) {
    console.error("❌ Erro ao excluir pet:", error);
    mostrarNotificacao(error.message || "Erro ao excluir pet", "error");
  }
}

// Mostrar loading
function mostrarLoading(mostrar) {
  const loadingContainer = document.getElementById("loadingContainer");
  const petsGrid = document.getElementById("petsGrid");
  const emptyState = document.getElementById("emptyState");

  if (loadingContainer) {
    if (mostrar) {
      loadingContainer.style.display = "flex";
      if (petsGrid) petsGrid.style.display = "none";
      if (emptyState) emptyState.style.display = "none";
    } else {
      loadingContainer.style.display = "none";
    }
  }
}

// Mostrar erro
function mostrarErro(mensagem) {
  const loadingContainer = document.getElementById("loadingContainer");

  if (loadingContainer) {
    loadingContainer.innerHTML = `
            <div style="text-align: center; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <h3>Erro ao carregar dados</h3>
                <p>${mensagem}</p>
                <button onclick="location.reload()" class="btn-add-pet" style="margin-top: 15px;">
                    <i class="fas fa-refresh"></i>
                    Tentar Novamente
                </button>
            </div>
        `;
  }
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo = "info") {
  // Criar elemento de notificação
  const notificacao = document.createElement("div");
  notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    `;

  // Definir cor baseada no tipo
  switch (tipo) {
    case "success":
      notificacao.style.background = "#28a745";
      break;
    case "error":
      notificacao.style.background = "#dc3545";
      break;
    case "warning":
      notificacao.style.background = "#ffc107";
      notificacao.style.color = "#212529";
      break;
    default:
      notificacao.style.background = "#17a2b8";
  }

  notificacao.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${tipo === "success" ? "check-circle" : tipo === "error" ? "exclamation-triangle" : "info-circle"}"></i>
            <span>${mensagem}</span>
        </div>
    `;

  // Adicionar ao body
  document.body.appendChild(notificacao);

  // Remover após 5 segundos
  setTimeout(() => {
    notificacao.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(notificacao);
    }, 300);
  }, 5000);
}

// Adicionar CSS das animações
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log("✅ Sistema de lista de pets pronto!");
