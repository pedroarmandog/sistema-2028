// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

// helper de notificação: tenta usar funções globais do projeto se existirem
function notify(message, type = "info") {
  try {
    if (typeof window.mostrarNotificacao === "function") {
      window.mostrarNotificacao(message, type);
      return;
    }
    if (typeof window.showToast === "function") {
      window.showToast(
        message,
        type === "error" ? "error" : type === "success" ? "success" : "info",
      );
      return;
    }
  } catch (e) {
    /* ignore */
  }
  // fallback simples
  try {
    alert(message);
  } catch (e) {
    console.log(message);
  }
}

// shim compatível com outras páginas: showNotification -> notify
if (typeof window.showNotification !== "function") {
  window.showNotification = function (message, type = "info") {
    try {
      notify(message, type);
    } catch (e) {
      try {
        alert(message);
      } catch (_) {
        console.log(message);
      }
    }
  };
}

// Garantir a função de notificação do sistema está disponível nesta página
// Garantir a função de notificação do sistema está disponível nesta página
if (typeof window.mostrarNotificacao !== "function") {
  window.mostrarNotificacao = function (mensagem, tipo = "info") {
    try {
      // remover notificação anterior
      const anterior =
        document.querySelector(".notification.notification-success") ||
        document.querySelector(".notification");
      if (anterior) anterior.remove();

      // criar container principal
      const notificacao = document.createElement("div");
      notificacao.className = `notification notification-${tipo}`;

      // aplicar estilos inline para garantir visual consistente (igual ao novo-cliente)
      notificacao.style.position = "fixed";
      notificacao.style.top = "20px";
      notificacao.style.right = "20px";
      notificacao.style.zIndex = "13000";
      notificacao.style.minWidth = "300px";
      notificacao.style.maxWidth = "560px";
      notificacao.style.padding = "14px 18px 14px 72px";
      notificacao.style.borderRadius = "10px";
      notificacao.style.background = "#e8f7ec";
      notificacao.style.color = "#124925";
      notificacao.style.boxShadow = "0 10px 30px rgba(0,0,0,0.12)";
      notificacao.style.fontWeight = "700";
      notificacao.style.display = "flex";
      notificacao.style.alignItems = "center";
      notificacao.style.gap = "12px";

      // barra lateral removida (anti-visual indesejado)
      // Observação: removemos o elemento de barra lateral para evitar a bordinha verde escura.

      // ícone circular
      const iconeEl = document.createElement("i");
      iconeEl.className =
        tipo === "success"
          ? "fas fa-check"
          : tipo === "error"
            ? "fas fa-exclamation"
            : "fas fa-info";
      iconeEl.style.position = "absolute";
      iconeEl.style.left = "12px";
      iconeEl.style.top = "50%";
      iconeEl.style.transform = "translateY(-50%)";
      iconeEl.style.width = "40px";
      iconeEl.style.height = "40px";
      iconeEl.style.display = "inline-flex";
      iconeEl.style.alignItems = "center";
      iconeEl.style.justifyContent = "center";
      iconeEl.style.borderRadius = "50%";
      iconeEl.style.background = "#27ae60";
      iconeEl.style.color = "#ffffff";
      iconeEl.style.fontSize = "14px";
      iconeEl.style.boxShadow = "0 4px 12px rgba(39,174,96,0.22)";
      notificacao.appendChild(iconeEl);

      // mensagem
      const span = document.createElement("span");
      span.className = "message-text";
      span.textContent = mensagem;
      span.style.display = "block";
      span.style.lineHeight = "1.2";
      notificacao.appendChild(span);

      // botão fechar
      const btn = document.createElement("button");
      btn.className = "notification-close";
      btn.setAttribute("aria-label", "Fechar notificação");
      btn.style.marginLeft = "auto";
      btn.style.background = "transparent";
      btn.style.border = "none";
      btn.style.cursor = "pointer";
      btn.style.color = "rgba(18,73,37,0.9)";
      btn.innerHTML = '<i class="fas fa-times"></i>';
      btn.addEventListener("click", () => notificacao.remove());
      notificacao.appendChild(btn);

      document.body.appendChild(notificacao);

      // auto remover
      setTimeout(() => {
        try {
          if (notificacao.parentElement) notificacao.remove();
        } catch (e) {}
      }, 4500);
    } catch (e) {
      try {
        alert(mensagem);
      } catch (ignore) {}
    }
  };
}

// Mostrar modal estilizado (mesmo visual do pet-details) para confirmação de exclusão
function showConfirmDeleteModalMeusPets(message, onConfirm) {
  try {
    let modal = document.getElementById("confirmDeleteModalMeusPets");
    if (!modal) {
      console.warn("confirmDeleteModalMeusPets não encontrada no DOM");
      // fallback para confirm nativo
      confirmar(message || "Confirmar?").then(function (r) {
        if (r && typeof onConfirm === "function") onConfirm();
      });
      return;
    }

    modal.style.display = "flex";
    try {
      document.body.style.overflow = "hidden";
    } catch (e) {}

    const btnOk = modal.querySelector("#confirmDeleteBtnMeusPets");
    const btnCancel = modal.querySelector("#confirmDeleteCancelMeusPets");
    if (!btnOk || !btnCancel) {
      // fallback
      confirmar(message || "Confirmar?").then(function (r) {
        if (r && typeof onConfirm === "function") onConfirm();
      });
      return;
    }

    // remover listeners anteriores clonando
    const newOk = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newOk, btnOk);
    const newCancel = btnCancel.cloneNode(true);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    newOk.addEventListener("click", function () {
      modal.style.display = "none";
      try {
        document.body.style.overflow = "";
      } catch (e) {}
      if (typeof onConfirm === "function") onConfirm();
    });
    newCancel.addEventListener("click", function () {
      modal.style.display = "none";
      try {
        document.body.style.overflow = "";
      } catch (e) {}
    });

    // fechar com ESC
    const escHandler = function (ev) {
      if (ev.key === "Escape") {
        modal.style.display = "none";
        try {
          document.body.style.overflow = "";
        } catch (e) {}
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  } catch (err) {
    console.error("Erro em showConfirmDeleteModalMeusPets", err);
    confirmar(message || "Confirmar?").then(function (r) {
      if (r && typeof onConfirm === "function") onConfirm();
    });
  }
}

function detectarIDsDuplicados() {
  const idsParaVerificar = [
    "clienteMenuItem",
    "clienteSubmenu",
    "petMenuItem",
    "petSubmenu",
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "financeiroMenuItem",
    "financeiroSubmenu",
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "painelMenuItem",
    "painelSubmenu",
    "comprasMenuItem",
    "comprasSubmenu",
  ];

  let problemas = [];
  idsParaVerificar.forEach((id) => {
    const elementos = document.querySelectorAll(`#${id}`);
    if (elementos.length > 1) {
      problemas.push(`ID '${id}' duplicado ${elementos.length} vezes`);
      console.warn(`⚠️  ID DUPLICADO: ${id} (${elementos.length} elementos)`);
    }
  });

  if (problemas.length > 0) {
    console.error("🚨 PROBLEMAS DE IDs DUPLICADOS DETECTADOS:");
    problemas.forEach((p) => console.error(`   - ${p}`));
    return false;
  }

  console.log("✅ Verificação de IDs: Nenhum duplicado encontrado");
  return true;
}

function configurarDropdownInicioRapido() {
  if (window.dropdownConfigurado) return;
  const dropdownBtn = document.getElementById("inicioRapidoBtn");
  const dropdown = document.querySelector(".dropdown");
  if (dropdownBtn && dropdown) {
    dropdownBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = dropdown.classList.contains("open");
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        if (dropdown.classList.contains("open"))
          dropdown.classList.remove("open");
      }
    });

    window.dropdownConfigurado = true;
  }
}

function salvarEstadoSubmenu(submenuId, isOpen) {
  try {
    const estadoSubmenus = JSON.parse(
      localStorage.getItem("estadoSubmenus") || "{}",
    );
    estadoSubmenus[submenuId] = isOpen;
    localStorage.setItem("estadoSubmenus", JSON.stringify(estadoSubmenus));
  } catch (error) {
    console.error(error);
  }
}

function obterEstadoSubmenu(submenuId) {
  try {
    return (
      JSON.parse(localStorage.getItem("estadoSubmenus") || "{}")[submenuId] ||
      false
    );
  } catch (e) {
    return false;
  }
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
  const menuItems = document.querySelectorAll(`#${menuItemId}`);
  const submenus = document.querySelectorAll(`#${submenuId}`);
  if (menuItems.length > 1) {
    for (let i = 1; i < menuItems.length; i++) {
      const duplicateElement = menuItems[i].closest(".nav-item-with-submenu");
      if (duplicateElement) duplicateElement.remove();
    }
  }
  if (submenus.length > 1) {
    for (let i = 1; i < submenus.length; i++) submenus[i].remove();
  }

  const menuItem = document.getElementById(menuItemId);
  const submenu = document.getElementById(submenuId);
  const menuContainer = menuItem?.parentElement;
  if (menuItem && submenu && menuContainer) {
    if (menuItem.getAttribute("data-listener-added")) return;
    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest(".submenu-item")) return;
      fecharOutrosSubmenus(submenuName);
      const isNowOpen = !menuContainer.classList.contains("open");
      menuContainer.classList.toggle("open");
      submenu.classList.toggle("open");
      salvarEstadoSubmenu(submenuName, isNowOpen);
    });

    const submenuItems = submenu.querySelectorAll(".submenu-item[href]");
    submenuItems.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        setTimeout(() => {
          menuContainer.classList.remove("open");
          submenu.classList.remove("open");
          salvarEstadoSubmenu(submenuName, false);
        }, 150);
      }),
    );
    const submenuItemsSemHref = submenu.querySelectorAll(
      ".submenu-item:not([href])",
    );
    submenuItemsSemHref.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        menuContainer.classList.remove("open");
        submenu.classList.remove("open");
        salvarEstadoSubmenu(submenuName, false);
      }),
    );

    menuItem.setAttribute("data-listener-added", "true");
  }
}

function fecharOutrosSubmenus(submenuAtual) {
  const todosSubmenus = [
    { container: "clienteMenuItem", submenu: "clienteSubmenu", id: "cliente" },
    { container: "petMenuItem", submenu: "petSubmenu", id: "pet" },
    {
      container: "atendimentoMenuItem",
      submenu: "atendimentoSubmenu",
      id: "atendimento",
    },
    {
      container: "financeiroMenuItem",
      submenu: "financeiroSubmenu",
      id: "financeiro",
    },
    {
      container: "configuracaoMenuItem",
      submenu: "configuracaoSubmenu",
      id: "configuracao",
    },
    { container: "painelMenuItem", submenu: "painelSubmenu", id: "painel" },
    { container: "comprasMenuItem", submenu: "comprasSubmenu", id: "compras" },
  ];
  todosSubmenus.forEach(({ container, submenu, id }) => {
    if (id !== submenuAtual) {
      const containerElement =
        document.getElementById(container)?.parentElement;
      const submenuElement = document.getElementById(submenu);
      if (containerElement && submenuElement) {
        if (containerElement.classList.contains("open")) {
          containerElement.classList.remove("open");
          submenuElement.classList.remove("open");
          salvarEstadoSubmenu(id, false);
        }
      }
    }
  });
}

function limparEstadoSubmenus() {
  try {
    localStorage.removeItem("estadoSubmenus");
  } catch (e) {}
}

function destacarSecaoAtiva() {
  const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
  const mapeamentoPaginas = {
    "clientes.html": "clienteMenuItem",
    "novo-cliente.html": "clienteMenuItem",
    "grupos-clientes.html": "clienteMenuItem",
    "meus-clientes.html": "clienteMenuItem",
    "agendamentos-novo.html": "atendimentoMenuItem",
    "agendamentos.html": "atendimentoMenuItem",
    "minha-agenda.html": "atendimentoMenuItem",
    "meus-pets.html": "petMenuItem",
    "novo-pet.html": "petMenuItem",
    "dashboard.html": "dashboard",
  };
  const itemParaDestacar = mapeamentoPaginas[paginaAtual];
  if (itemParaDestacar && itemParaDestacar !== "dashboard") {
    const menuItem = document.getElementById(itemParaDestacar);
    if (menuItem) {
      document
        .querySelectorAll(".nav-item")
        .forEach((item) => item.classList.remove("active"));
      menuItem.classList.add("active");
    }
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  detectarIDsDuplicados();
  limparEstadoSubmenus();

  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  if (menuToggle && sidebar && mainContent) {
    if (!menuToggle.hasAttribute("data-toggle-configured")) {
      menuToggle.setAttribute("data-toggle-configured", "true");
      menuToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
      });
    }
  }

  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768) {
      if (
        sidebar &&
        mainContent &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        sidebar.classList.add("collapsed");
        mainContent.classList.add("sidebar-collapsed");
      }
    }
  });

  configurarDropdownInicioRapido();
  configurarPersistenciaSubmenu("clienteMenuItem", "clienteSubmenu", "cliente");
  configurarPersistenciaSubmenu("painelMenuItem", "painelSubmenu", "painel");
  configurarPersistenciaSubmenu("petMenuItem", "petSubmenu", "pet");
  configurarPersistenciaSubmenu(
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "atendimento",
  );
  configurarPersistenciaSubmenu(
    "financeiroMenuItem",
    "financeiroSubmenu",
    "financeiro",
  );
  configurarPersistenciaSubmenu(
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "configuracao",
  );
  configurarPersistenciaSubmenu("comprasMenuItem", "comprasSubmenu", "compras");
  destacarSecaoAtiva();
});

// Funções de navegação rápida (shims)
function novoAtendimento() {
  window.location.href = "/agendamentos-novo.html";
  closeDropdown();
}
function novoPet() {
  window.location.href = "/pets/cadastro-pet.html";
  closeDropdown();
}
function novoCliente() {
  window.location.href = "/clientes.html";
  closeDropdown();
}
function novoContrato() {
  window.location.href = "/contrato-novo.html";
  closeDropdown();
}
function novaVenda() {
  window.location.href = "/venda-nova.html";
  closeDropdown();
}
function novaContaPagar() {
  window.location.href = "/contas-pagar-nova.html";
  closeDropdown();
}
function closeDropdown() {
  const dropdown = document.querySelector(".dropdown");
  if (dropdown) dropdown.classList.remove("open");
}

/* =====================
   Código da página Meus Pets
   - busca /api/pets e /api/clientes
   - renderiza tabela e pesquisa local
   ===================== */

let _meusPetsData = [];
let _meusClientsMap = {};

// filtros/seleções globais (visíveis para funções fora do DOMContentLoaded)
let _selectedGrupos = [];
let _selectedEspecie = null;
let _selectedEspecies = [];
let _selectedAlimentacaoArr = [];
let _selectedAlimentacao = null;
let _selectedMeses = [];
let _selectedTags = [];

function nomeDoPet(p) {
  return p.nome || p.name || p.nome_pet || p.pet_nome || "";
}
function nomeDoCliente(c) {
  return c.nome || c.name || c.nome_cliente || "";
}

// normalizadores/utilitários usados por filtros (declarados em escopo superior)
function normalizeStr(s) {
  return (s || "").toString().toLowerCase().trim();
}
function grupoKeyFromName(name) {
  if (!name) return "";
  return name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "");
}

function renderPetsTable(pets) {
  const tbody = document.getElementById("petsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!pets || pets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Nenhum pet encontrado</td></tr>';
    return;
  }

  const rows = pets
    .map((p) => {
      const id = p.id || p.codigo || p.codigo_pet || p.pet_id || p._id || "";
      const petName = nomeDoPet(p) || "(sem nome)";
      const clienteId =
        p.cliente_id || p.cliente || p.clienteId || p.tutor_id || null;
      const cliente = clienteId ? _meusClientsMap[clienteId] : null;
      const clienteDisplay = cliente
        ? cliente.id
          ? `${cliente.id} - ${nomeDoCliente(cliente)}`
          : nomeDoCliente(cliente)
        : "—";
      const ativo =
        p.ativo === true ||
        p.ativo === "1" ||
        p.ativo === 1 ||
        p.ativo === "true";
      const fotoUrl = p.foto_url || null;
      const fotoHtml = fotoUrl
        ? `<img src="${fotoUrl.replace(/"/g, "&quot;")}" alt="Foto" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #e0e0e0;display:block;margin:0 auto;">`
        : `<span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#eef0f2;border:2px solid #dde0e3;"><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='#b8bec7'><ellipse cx='8.5' cy='7' rx='2' ry='2.5'/><ellipse cx='15.5' cy='7' rx='2' ry='2.5'/><ellipse cx='4.5' cy='12.5' rx='1.8' ry='2.2'/><ellipse cx='19.5' cy='12.5' rx='1.8' ry='2.2'/><ellipse cx='12' cy='15' rx='4.5' ry='5'/></svg></span>`;

      const petUrl = `/pets/pet-details.html?pet_id=${encodeURIComponent(id)}`;
      const clienteUrl = clienteId
        ? `/client-details.html?id=${encodeURIComponent(clienteId)}`
        : null;
      return `
        <tr data-pet-id="${id}">
          <td>${id}</td>
          <td style="text-align:center;"><a href="${petUrl}" style="cursor:pointer;text-decoration:none;">${fotoHtml}</a></td>
          <td><a href="${petUrl}" style="cursor:pointer;text-decoration:none;color:inherit;">${escapeHtml(petName)}</a></td>
          <td>${clienteUrl ? `<a href="${clienteUrl}" style="cursor:pointer;text-decoration:none;color:inherit;">${escapeHtml(clienteDisplay)}</a>` : escapeHtml(clienteDisplay)}</td>
          <td class="text-center">${ativo ? '<span class="status-active">✓</span>' : '<span class="status-inactive">✕</span>'}</td>
          <td class="text-center"><button class="btn-action" title="Ações">⋮</button></td>
        </tr>`;
    })
    .join("\n");

  tbody.innerHTML = rows;
  // criar dropdown global de ações de linha se não existir
  if (!document.getElementById("__rowActionsDropdown")) {
    const d = document.createElement("div");
    d.id = "__rowActionsDropdown";
    d.className = "row-actions-dropdown";
    d.style.display = "none";
    d.innerHTML = `
            <div class="action-item inativar" data-action="inativar"><i class="fas fa-ban"></i><span>Inativar</span></div>
            <div class="action-item edit" data-action="edit"><i class="fas fa-edit"></i><span>Editar</span></div>
        `;
    document.body.appendChild(d);
  }

  // bind dos botões de ação em cada linha
  Array.from(tbody.querySelectorAll(".btn-action")).forEach((btn) => {
    btn.onclick = function (e) {
      e.stopPropagation();
      const tr = btn.closest("tr");
      if (!tr) return;
      const petId = tr.getAttribute("data-pet-id");
      const rect = btn.getBoundingClientRect();
      const dropdown = document.getElementById("__rowActionsDropdown");
      if (!dropdown) return;
      // mostrar e posicionar dropdown abaixo do botão (calcula largura após tornar visível)
      dropdown.style.display = "block";
      const dw = dropdown.offsetWidth || 160;
      const left = rect.left + window.scrollX + rect.width - dw;
      dropdown.style.left = left + "px";
      dropdown.style.top = rect.bottom + window.scrollY + 8 + "px";
      dropdown.__currentPetId = petId;
      // atualizar item inativar/reativar conforme estado atual do pet
      const petData = (_meusPetsData || []).find(
        (p) =>
          String(p.id || p.codigo || p.pet_id || p._id || "") === String(petId),
      );
      const toggleItem = dropdown.querySelector(
        ".action-item[data-action='inativar'], .action-item[data-action='reativar']",
      );
      if (toggleItem) {
        const estaAtivo =
          !petData ||
          petData.ativo === true ||
          petData.ativo === 1 ||
          petData.ativo === "1" ||
          petData.ativo === "true";
        if (estaAtivo) {
          toggleItem.setAttribute("data-action", "inativar");
          toggleItem.innerHTML =
            '<i class="fas fa-ban"></i><span>Inativar</span>';
          toggleItem.style.color = "";
        } else {
          toggleItem.setAttribute("data-action", "reativar");
          toggleItem.innerHTML =
            '<i class="fas fa-redo"></i><span>Reativar Pet</span>';
          toggleItem.style.color = "#f97316";
        }
      }
    };
  });

  // fechar dropdown ao clicar fora (registrar apenas uma vez)
  if (!document.__rowActionsListenerAdded) {
    document.addEventListener("click", function (ev) {
      const dd = document.getElementById("__rowActionsDropdown");
      if (!dd) return;
      if (dd.style.display === "none") return;
      if (!dd.contains(ev.target)) {
        dd.style.display = "none";
        dd.__currentPetId = null;
      }
    });
    document.__rowActionsListenerAdded = true;
  }

  // handlers para os itens do dropdown
  const rowDd = document.getElementById("__rowActionsDropdown");
  if (rowDd) {
    rowDd.querySelectorAll(".action-item").forEach((item) => {
      item.onclick = function (e) {
        e.stopPropagation();
        const action = this.getAttribute("data-action");
        const petId = rowDd.__currentPetId;
        rowDd.style.display = "none";
        rowDd.__currentPetId = null;
        if (!petId) return;
        if (action === "edit") {
          // navegar para edição do pet
          // tentar obter cliente_id da linha para manter contexto
          const tr = document.querySelector(`tr[data-pet-id="${petId}"]`);
          let clienteId = null;
          if (tr) {
            const clienteText = tr.children[2]
              ? tr.children[2].textContent || ""
              : "";
            const m = clienteText.match(/^(\d+)\s*-\s*/);
            if (m) clienteId = m[1];
          }
          const q = clienteId
            ? `?pet_id=${encodeURIComponent(petId)}&cliente_id=${encodeURIComponent(clienteId)}`
            : `?pet_id=${encodeURIComponent(petId)}`;
          window.location.href = `/pets/pet-details.html${q}`;
        } else if (action === "reativar") {
          (async function doReativar(id) {
            try {
              const resp = await fetch(
                `/api/pets/${encodeURIComponent(id)}/reativar`,
                {
                  method: "PATCH",
                  credentials: "include",
                },
              );
              if (resp && resp.ok) {
                const pet = _meusPetsData.find(
                  (p) =>
                    String(p.id || p.codigo || p.pet_id || p._id || "") ===
                    String(id),
                );
                if (pet) pet.ativo = true;
                try {
                  window._meusPetsData = _meusPetsData;
                } catch (e) {}
                renderPetsTable(_meusPetsData);
                try {
                  if (typeof window.mostrarNotificacao === "function") {
                    window.mostrarNotificacao(
                      "Pet reativado com sucesso!",
                      "success",
                    );
                  }
                } catch (e) {}
              }
            } catch (e) {
              console.warn("erro ao chamar PATCH /reativar", e);
            }
          })(petId);
        } else if (action === "inativar") {
          // confirmar inativação com modal estilizado
          showConfirmDeleteModalMeusPets(
            "Tem certeza que deseja inativar este pet?",
            function () {
              (async function doInativar(id) {
                try {
                  const resp = await fetch(
                    `/api/pets/${encodeURIComponent(id)}/inativar`,
                    {
                      method: "PATCH",
                      credentials: "include",
                    },
                  );
                  if (resp && resp.ok) {
                    // marcar como inativo no array local e re-render
                    const pet = _meusPetsData.find(
                      (p) =>
                        String(p.id || p.codigo || p.pet_id || p._id || "") ===
                        String(id),
                    );
                    if (pet) pet.ativo = false;
                    try {
                      window._meusPetsData = _meusPetsData;
                    } catch (e) {}
                    renderPetsTable(_meusPetsData);
                    // Mostrar notificação
                    try {
                      if (typeof window.mostrarNotificacao === "function") {
                        window.mostrarNotificacao(
                          "Pet inativado com sucesso!",
                          "success",
                        );
                      } else {
                        // fallback: criar notificação com estilo inline igual ao novo-cliente
                        const prev = document.querySelector(
                          ".notification.notification-success",
                        );
                        if (prev) prev.remove();
                        const notif = document.createElement("div");
                        notif.className = "notification notification-success";
                        notif.style.position = "fixed";
                        notif.style.top = "20px";
                        notif.style.right = "20px";
                        notif.style.zIndex = "13000";
                        notif.style.minWidth = "300px";
                        notif.style.maxWidth = "520px";
                        notif.style.padding = "14px 18px 14px 72px";
                        notif.style.borderRadius = "10px";
                        notif.style.background = "#e8f7ec";
                        notif.style.color = "#124925";
                        notif.style.boxShadow = "0 10px 30px rgba(0,0,0,0.12)";
                        notif.style.fontWeight = "700";
                        notif.style.display = "flex";
                        notif.style.alignItems = "center";
                        notif.style.gap = "12px";
                        // barra lateral removida (anti-visual indesejado)
                        // Observação: a barra lateral foi removida para coincidir com o visual esperado.
                        // ícone circular
                        const icon = document.createElement("i");
                        icon.className = "fas fa-check";
                        icon.style.position = "absolute";
                        icon.style.left = "12px";
                        icon.style.top = "50%";
                        icon.style.transform = "translateY(-50%)";
                        icon.style.width = "40px";
                        icon.style.height = "40px";
                        icon.style.display = "inline-flex";
                        icon.style.alignItems = "center";
                        icon.style.justifyContent = "center";
                        icon.style.borderRadius = "50%";
                        icon.style.background = "#27ae60";
                        icon.style.color = "#ffffff";
                        icon.style.fontSize = "14px";
                        icon.style.boxShadow =
                          "0 4px 12px rgba(39,174,96,0.22)";
                        notif.appendChild(icon);
                        // mensagem
                        const span = document.createElement("span");
                        span.className = "message-text";
                        span.textContent = "Pet inativado com sucesso!";
                        span.style.display = "block";
                        span.style.lineHeight = "1.2";
                        notif.appendChild(span);
                        // botão fechar
                        const btn = document.createElement("button");
                        btn.className = "notification-close";
                        btn.setAttribute("aria-label", "Fechar");
                        btn.style.marginLeft = "auto";
                        btn.style.background = "transparent";
                        btn.style.border = "none";
                        btn.style.cursor = "pointer";
                        btn.style.color = "rgba(18,73,37,0.9)";
                        btn.innerHTML = '<i class="fas fa-times"></i>';
                        btn.addEventListener("click", () => notif.remove());
                        notif.appendChild(btn);
                        document.body.appendChild(notif);
                        setTimeout(() => {
                          try {
                            if (notif.parentElement) notif.remove();
                          } catch (e) {}
                        }, 4500);
                      }
                    } catch (e) {
                      try {
                        alert("Pet inativado com sucesso");
                      } catch (_) {}
                    }
                    return;
                  }
                } catch (e) {
                  console.warn("erro ao chamar PATCH /inativar", e);
                }
                // fallback local: marcar como inativo sem reload
                const petFb = _meusPetsData.find(
                  (p) =>
                    String(p.id || p.codigo || p.pet_id || p._id || "") ===
                    String(id),
                );
                if (petFb) petFb.ativo = false;
                try {
                  window._meusPetsData = _meusPetsData;
                } catch (e) {}
                renderPetsTable(_meusPetsData);
                notify("Pet inativado localmente", "info");
              })(petId);
            },
          );
        }
      };
    });
  }
}

// Inicializa o dropdown customizado do campo "Possui plano" (substitui o <select>)
// Observação: o dropdown de 'Possui plano' foi substituído por um input + .suggestions

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
}

async function fetchPetsAndClients() {
  const tbody = document.getElementById("petsTableBody");
  if (tbody)
    tbody.innerHTML =
      '<tr class="loading-row"><td colspan="6">Carregando...</td></tr>';
  console.debug("[meus-pets] fetchPetsAndClients start");
  try {
    // Tenta várias origens - quando você abre a página com Live Server (porta 5500),
    // a URL relativa `/api/...` não resolve para o backend (que normalmente roda em 3000).
    // Primeiro tentamos a URL relativa; se falhar, tentamos os backends comuns.
    const API_BASE =
      (window.__API_BASE__ && window.__API_BASE__.toString()) ||
      window.location.origin;
    const tryUrls = (path) => [path, API_BASE + path];

    async function tryFetchAny(path) {
      const urls = tryUrls(path);
      let lastErr = null;
      for (const u of urls) {
        try {
          const r = await fetch(u, { credentials: "include" });
          if (r.ok) return r;
          // se r não ok, continue para próximo
          lastErr = new Error(`HTTP ${r.status} ${r.statusText} from ${u}`);
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    }

    const [petsResp, clientsResp] = await Promise.all([
      tryFetchAny("/api/pets"),
      tryFetchAny("/api/clientes"),
    ]);

    let petsJson = [];
    let clientsJson = [];

    if (petsResp && petsResp.ok) {
      const p = await petsResp.json();
      petsJson = Array.isArray(p) ? p : p.pets || p.data || [];
    }
    if (clientsResp && clientsResp.ok) {
      const c = await clientsResp.json();
      clientsJson = Array.isArray(c) ? c : c.clientes || c.data || [];
    }

    // map clients by possible id keys
    _meusClientsMap = {};
    clientsJson.forEach((cli) => {
      const id = cli.id || cli.codigo || cli.cliente_id || cli._id;
      if (id !== undefined) _meusClientsMap[id] = cli;
    });

    _meusPetsData = petsJson || [];
    // também expor como propriedade de window para compatibilidade com outras páginas/scripts
    try {
      window._meusPetsData = _meusPetsData;
    } catch (e) {
      /* ignore */
    }
    console.debug(
      "[meus-pets] pets loaded, count=",
      (_meusPetsData || []).length,
    );
    try {
      renderPetsTable(_meusPetsData);
    } catch (err) {
      console.error("[meus-pets] renderPetsTable failed", err);
      if (tbody)
        tbody.innerHTML =
          '<tr><td colspan="5">Erro ao renderizar pets</td></tr>';
    }
    // sinalizar que os dados de pets foram carregados (para popular sugestões caso estejam abertas)
    try {
      document.dispatchEvent(new CustomEvent("meusPetsLoaded"));
    } catch (e) {
      console.warn("evento meusPetsLoaded falhou", e);
    }
  } catch (err) {
    console.error(err);
    if (tbody)
      tbody.innerHTML =
        '<tr><td colspan="5">Erro ao carregar. Verifique se o backend está rodando e se o endpoint /api/pets e /api/clientes estão acessíveis.</td></tr>';
  }
}

function applyPetSearchFilter() {
  const q = (document.getElementById("searchPetInput")?.value || "")
    .toLowerCase()
    .trim();
  if (!q) {
    renderPetsTable(_meusPetsData);
    return;
  }
  const filtered = _meusPetsData.filter((p) => {
    const petName = (nomeDoPet(p) || "").toLowerCase();
    const id = String(p.id || p.codigo || p.pet_id || p._id || "");
    const micro = String(p.microchip || p.chip || p.micro || "").toLowerCase();
    const clienteId =
      p.cliente_id || p.cliente || p.clienteId || p.tutor_id || null;
    const cliente = clienteId ? _meusClientsMap[clienteId] : null;
    const clienteName = cliente
      ? (nomeDoCliente(cliente) || "").toLowerCase()
      : "";

    return (
      petName.includes(q) ||
      id.includes(q) ||
      micro.includes(q) ||
      clienteName.includes(q)
    );
  });
  renderPetsTable(filtered);
}

document.addEventListener("DOMContentLoaded", function () {
  // inicializar somente se estivermos na página meus-pets.html (pode haver o mesmo script em outras páginas)
  const pathname = window.location.pathname.replace(/\\/g, "/");
  if (
    pathname.endsWith("/meus-pets.html") ||
    pathname.endsWith("/pets/meus-pets.html")
  ) {
    // botões
    const btnAdd = document.getElementById("btnAddPet");
    const btnExport = document.getElementById("btnExport");
    const input = document.getElementById("searchPetInput");
    if (btnAdd)
      btnAdd.addEventListener("click", () => {
        window.location.href = "/pets/cadastro-pet.html";
      });
    if (btnExport)
      btnExport.addEventListener("click", async () => {
        // Exportar imediatamente para XLS seguindo o padrão de clientes.html
        try {
          // coletar pets filtrados e estado dos filtros para debug
          const pets = getFilteredPetsUsingCurrentFilters();
          console.debug(
            "[meus-pets] export requested. filtros:",
            {
              selectedGrupos: _selectedGrupos,
              filter_grupo_input:
                document.getElementById("filter_grupo")?.value,
              selectedEspecies: _selectedEspecies,
              filter_especie_input:
                document.getElementById("filter_especie")?.value,
              selectedAlimentacoes: _selectedAlimentacaoArr,
              filter_alimentacao_input:
                document.getElementById("filter_alimentacao")?.value,
              selectedMeses: _selectedMeses,
              selectedTags: _selectedTags,
              filter_tag_input: document.getElementById("filter_tag")?.value,
            },
            " -> petsCount=",
            (pets || []).length,
          );

          if (!pets || pets.length === 0) {
            showNotification(
              "Nenhum pet corresponde aos filtros selecionados.",
              "info",
            );
            return;
          }

          // garantir XLSX carregado (instala via CDN se necessário)
          try {
            await ensureXLSX();
          } catch (e) {
            console.warn("Falha ao carregar XLSX dinamicamente", e);
            showNotification(
              "Não foi possível carregar a biblioteca de exportação (XLSX). Tente novamente ou verifique a conexão.",
              "error",
            );
            return;
          }

          exportPetsToXLS(pets);
        } catch (err) {
          console.error("Erro no handler de export:", err);
          showNotification(
            "Erro ao processar exportação. Veja console para detalhes.",
            "error",
          );
        }
      });
    if (input) {
      input.addEventListener("input", debounce(applyPetSearchFilter, 200));
    }

    fetchPetsAndClients();
    // toggle painel de filtros
    const btnToggle = document.getElementById("btnToggleFilters");
    const panel = document.getElementById("meusPetsFilterPanel");
    const btnPesquisar = document.getElementById("meusPetsPesquisar");
    const btnCancelar = document.getElementById("meusPetsCancelar");
    if (btnToggle && panel) {
      // Animação suave: usar max-height + classe .expanded (mesmo efeito de clientes.html)
      btnToggle.addEventListener("click", function (e) {
        e.preventDefault();

        const isClosed = !panel.classList.contains("expanded");

        if (isClosed) {
          // Mostrar: garantir display antes de animar maxHeight
          panel.style.display = "block";
          // permitir que o browser registre o display antes de animar
          window.requestAnimationFrame(() => {
            panel.classList.add("expanded");
          });
          btnToggle.classList.add("active");
        } else {
          // Recolher com animação: remover a classe expanded para reduzir max-height
          panel.classList.remove("expanded");
          btnToggle.classList.remove("active");
          // Quando a transição terminar, esconder o elemento para remover do fluxo
          const onTransitionEnd = function (ev) {
            if (ev.propertyName === "max-height") {
              panel.style.display = "none";
              // esconder sugestões caso estejam abertas (estão movidas para body)
              try {
                if (window.__meusPetsSuggestContainer)
                  window.__meusPetsSuggestContainer.style.display = "none";
              } catch (e) {}
              try {
                if (window.__meusPetsTagSuggestContainer)
                  window.__meusPetsTagSuggestContainer.style.display = "none";
              } catch (e) {}
              panel.removeEventListener("transitionend", onTransitionEnd);
            }
          };
          panel.addEventListener("transitionend", onTransitionEnd);
        }
      });
    }
    if (btnCancelar && panel) {
      btnCancelar.addEventListener("click", function (e) {
        e.preventDefault();
        panel.style.display = "none";
        btnToggle?.classList.remove("active");
        try {
          if (window.__meusPetsSuggestContainer)
            window.__meusPetsSuggestContainer.style.display = "none";
        } catch (e) {}
        try {
          if (window.__meusPetsTagSuggestContainer)
            window.__meusPetsTagSuggestContainer.style.display = "none";
        } catch (e) {}
      });
    }
    // --- lógica de sugestões e aplicação de filtro por grupo ---
    // suportar múltiplas seleções

    // normalização para gerar a key a partir do nome
    function grupoKeyFromName(name) {
      if (!name) return "";
      return name
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[()]/g, "");
    }

    async function carregarGruposForMeusPets() {
      const container = document.getElementById("gruposSuggest");
      const input = document.getElementById("filter_grupo");
      if (!container || !input) return [];

      let grupos = [];
      try {
        const resp = await fetch("/api/grupos-clientes");
        if (resp.ok) {
          grupos = await resp.json();
          console.log(
            "✅ Grupos carregados para meus-pets da API:",
            grupos.length,
          );
        } else {
          console.warn(
            "⚠️ API de grupos respondeu",
            resp.status,
            "— usando fallback local",
          );
        }
      } catch (e) {
        console.warn("⚠️ Erro ao carregar grupos da API (meus-pets):", e);
      }

      // fallback padrão se não houver grupos
      if (!grupos || grupos.length === 0) {
        grupos = [
          { nome: "Banho (QUENTE)", cor: "#FF6B6B" },
          { nome: "Banho (FRIO)", cor: "#4ECDC4" },
          { nome: "Assinantes", cor: "#FFD700" },
        ];
      }

      // popular container
      container.innerHTML = "";
      grupos.forEach((g) => {
        const name = g.nome || g.name || "";
        const key = grupoKeyFromName(name);
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.setAttribute("data-key", key);
        div.textContent = name;
        div.addEventListener("click", function () {
          addSelectedGrupo(key, name);
        });
        container.appendChild(div);
      });

      return grupos;
    }

    // se os dados de pets já carregarem depois do foco do usuário, repopular sugestões
    document.addEventListener("meusPetsLoaded", function () {
      try {
        carregarGruposForMeusPets();
      } catch (e) {}
      try {
        carregarEspeciesForMeusPets();
      } catch (e) {}
      try {
        carregarAlimentacoesForMeusPets();
      } catch (e) {}
      try {
        carregarTagsForMeusPets();
      } catch (e) {}
    });

    // mostrar sugestões filtradas pelo que o usuário digita
    const inputGrupo = document.getElementById("filter_grupo");
    const suggestContainer = document.getElementById("gruposSuggest");
    if (inputGrupo && suggestContainer) {
      // mover o container para o body para ficar fora do fluxo do painel (evita expandir o panel)
      try {
        document.body.appendChild(suggestContainer);
        suggestContainer.style.position = "absolute";
        suggestContainer.style.display = "none";
        suggestContainer.style.boxSizing = "border-box";
        // guardar referência global para poder esconder a partir de outros handlers
        window.__meusPetsSuggestContainer = suggestContainer;
      } catch (e) {
        console.warn("não foi possível mover suggestContainer para body", e);
      }

      function positionSuggest() {
        const rect = inputGrupo.getBoundingClientRect();
        suggestContainer.style.left = rect.left + window.scrollX + "px";
        suggestContainer.style.top = rect.bottom + window.scrollY + 6 + "px";
        suggestContainer.style.width = rect.width + "px";
      }

      inputGrupo.addEventListener("focus", function () {
        carregarGruposForMeusPets();
        positionSuggest();
        suggestContainer.style.display = "block";
      });

      inputGrupo.addEventListener("input", function () {
        const q = (this.value || "").toLowerCase().trim();
        const items = suggestContainer.querySelectorAll(".suggestion-item");
        items.forEach((it) => {
          const txt = (it.textContent || "").toLowerCase();
          it.style.display = txt.indexOf(q) === -1 ? "none" : "block";
        });
        // não limpar seleções ao digitar
        // reposicionar caso o input se mova
        positionSuggest();
      });

      // fechar ao clicar fora e reposicionar em scroll/resize
      document.addEventListener("click", function (e) {
        if (!suggestContainer.contains(e.target) && e.target !== inputGrupo)
          suggestContainer.style.display = "none";
      });
      window.addEventListener("scroll", function () {
        if (suggestContainer.style.display === "block") positionSuggest();
      });
      window.addEventListener("resize", function () {
        if (suggestContainer.style.display === "block") positionSuggest();
      });
    }

    // aplicar pesquisa: filtrar por grupo selecionado (pelo key)
    // suporta múltiplas seleções por campo (OR within field, AND across fields)
    // --- aplicar pesquisa combinada: grupo e/ou espécie ---
    // (variáveis de seleção agora declaradas em escopo superior)

    // carregar tags únicas a partir dos pets carregados
    function carregarTagsForMeusPets() {
      const container = document.getElementById("tagSuggest");
      const input = document.getElementById("filter_tag");
      if (!container || !input) return [];

      const set = new Set();
      _meusPetsData.forEach((p) => {
        try {
          if (Array.isArray(p.tags))
            p.tags.forEach((t) => {
              if (t && String(t).trim() !== "") set.add(String(t).trim());
            });
          else if (typeof p.tags === "string") {
            const raw = p.tags.trim();
            if (raw.startsWith("[")) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed))
                  parsed.forEach((t) => {
                    if (t && String(t).trim() !== "") set.add(String(t).trim());
                  });
              } catch (e) {
                raw
                  .replace(/\[|\]/g, "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .forEach((t) => set.add(t));
              }
            } else {
              raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((t) => set.add(t));
            }
          }
        } catch (e) {}
      });

      const tags = Array.from(set).sort((a, b) => a.localeCompare(b));
      container.innerHTML = "";
      tags.forEach((name) => {
        const val = name;
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.setAttribute("data-value", val);
        div.textContent = val;
        div.addEventListener("click", function (e) {
          e.stopPropagation();
          addSelectedTag(val);
        });
        container.appendChild(div);
      });
      return tags;
    }

    function addSelectedTag(val) {
      if (!val) return;
      if (!_selectedTags.includes(val)) {
        _selectedTags.push(val);
        renderTags(
          "filter_tag_selected",
          _selectedTags.map((v) => ({ value: v, label: v, type: "tag" })),
        );
        const it = document.getElementById("filter_tag");
        if (it) it.value = "";
      }
    }

    function removeSelectedTag(val) {
      _selectedTags = _selectedTags.filter((v) => v !== val);
      renderTags(
        "filter_tag_selected",
        _selectedTags.map((v) => ({ value: v, label: v, type: "tag" })),
      );
    }

    // helpers para renderizar tags selecionadas em containers .selected-values
    function renderTags(containerId, items) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";
      items.forEach((it) => {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.textContent = it.label || it.name || it.value || it;
        const rem = document.createElement("span");
        rem.className = "remove";
        rem.innerHTML = "×";
        rem.addEventListener("click", function (e) {
          e.stopPropagation();
          if (it.type === "grupo") removeSelectedGrupo(it.key);
          else if (it.type === "especie") removeSelectedEspecie(it.value);
          else if (it.type === "alim") removeSelectedAlimentacao(it.value);
          else if (it.type === "mes") removeSelectedMes(parseInt(it.value, 10));
          else if (it.type === "tag") removeSelectedTag(it.value);
        });
        tag.appendChild(rem);
        container.appendChild(tag);
      });
    }

    function addSelectedGrupo(key, name) {
      if (!key) return;
      if (!_selectedGrupos.some((g) => g.key === key)) {
        _selectedGrupos.push({ key, name, type: "grupo" });
        renderTags("filter_grupo_selected", _selectedGrupos);
        const ig = document.getElementById("filter_grupo");
        if (ig) ig.value = "";
      }
    }

    function removeSelectedGrupo(key) {
      _selectedGrupos = _selectedGrupos.filter((g) => g.key !== key);
      renderTags("filter_grupo_selected", _selectedGrupos);
    }

    function addSelectedEspecie(val) {
      if (!val) return;
      if (!_selectedEspecies.includes(val)) {
        _selectedEspecies.push(val);
        renderTags(
          "filter_especie_selected",
          _selectedEspecies.map((v) => ({
            value: v,
            label: v,
            type: "especie",
          })),
        );
        const ie = document.getElementById("filter_especie");
        if (ie) ie.value = "";
      }
    }

    function removeSelectedEspecie(val) {
      _selectedEspecies = _selectedEspecies.filter((v) => v !== val);
      renderTags(
        "filter_especie_selected",
        _selectedEspecies.map((v) => ({ value: v, label: v, type: "especie" })),
      );
    }

    function addSelectedAlimentacao(val) {
      if (!val) return;
      if (!_selectedAlimentacaoArr.includes(val)) {
        _selectedAlimentacaoArr.push(val);
        renderTags(
          "filter_alimentacao_selected",
          _selectedAlimentacaoArr.map((v) => ({
            value: v,
            label: v,
            type: "alim",
          })),
        );
        const ia = document.getElementById("filter_alimentacao");
        if (ia) ia.value = "";
      }
    }

    function removeSelectedAlimentacao(val) {
      _selectedAlimentacaoArr = _selectedAlimentacaoArr.filter(
        (v) => v !== val,
      );
      renderTags(
        "filter_alimentacao_selected",
        _selectedAlimentacaoArr.map((v) => ({
          value: v,
          label: v,
          type: "alim",
        })),
      );
    }

    function addSelectedMes(val, label) {
      if (!val) return;
      const n = Number(val);
      if (!n) return;
      if (!_selectedMeses.includes(n)) {
        _selectedMeses.push(n);
        renderTags(
          "filter_mes_selected",
          _selectedMeses.map((v) => ({
            value: v,
            label: label || getMonthName(v),
            type: "mes",
          })),
        );
        const mh = document.getElementById("filter_mes");
        if (mh) mh.value = _selectedMeses.join(",");
        const im = document.getElementById("filter_mes_display");
        if (im) im.value = "";
      }
    }

    function removeSelectedMes(val) {
      _selectedMeses = _selectedMeses.filter((v) => v !== val);
      renderTags(
        "filter_mes_selected",
        _selectedMeses.map((v) => ({
          value: v,
          label: getMonthName(v),
          type: "mes",
        })),
      );
      const mh = document.getElementById("filter_mes");
      if (mh) mh.value = _selectedMeses.join(",");
    }

    function getMonthName(n) {
      const names = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      return names[n - 1] || n;
    }

    function normalizeStr(s) {
      return (s || "").toString().toLowerCase().trim();
    }

    // carregar espécies únicas a partir dos pets carregados
    function carregarEspeciesForMeusPets() {
      const container = document.getElementById("especiesSuggest");
      const input = document.getElementById("filter_especie");
      if (!container || !input) return [];

      // coletar espécies/raças dos pets
      const set = new Set();
      _meusPetsData.forEach((p) => {
        const especie =
          p.especie || p.raca || p.especie_raca || p.species || p.breed || "";
        if (especie && especie.toString().trim() !== "")
          set.add(especie.toString().trim());
      });

      const especies = Array.from(set).sort((a, b) => a.localeCompare(b));
      container.innerHTML = "";
      especies.forEach((name) => {
        const val = name;
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.setAttribute("data-value", val);
        div.textContent = val;
        div.addEventListener("click", function () {
          // adicionar como seleção (multi-select)
          addSelectedEspecie(val);
          // manter sugestões abertas para permitir múltiplas seleções
        });
        container.appendChild(div);
      });

      return especies;
    }

    // carregar tipos de alimentação únicos a partir dos pets carregados
    function carregarAlimentacoesForMeusPets() {
      const container = document.getElementById("alimentacaoSuggest");
      const input = document.getElementById("filter_alimentacao");
      if (!container || !input) return [];

      const set = new Set();
      _meusPetsData.forEach((p) => {
        const alim =
          p.alimentacao ||
          p.tipo_alimentacao ||
          p.alimentacao_tipo ||
          p.food ||
          "";
        if (alim && alim.toString().trim() !== "")
          set.add(alim.toString().trim());
      });

      const itens = Array.from(set).sort((a, b) => a.localeCompare(b));
      container.innerHTML = "";
      itens.forEach((name) => {
        const val = name;
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.setAttribute("data-value", val);
        div.textContent = val;
        div.addEventListener("click", function () {
          // adicionar como seleção (multi-select)
          addSelectedAlimentacao(val);
        });
        container.appendChild(div);
      });

      return itens;
    }

    // carregar tags únicas a partir dos pets carregados (implementação única em outro local)

    // configurar o dropdown de espécies (mover para body, posicionar, listeners)
    const inputEspecie = document.getElementById("filter_especie");
    const especieContainer = document.getElementById("especiesSuggest");
    if (inputEspecie && especieContainer) {
      try {
        document.body.appendChild(especieContainer);
        especieContainer.style.position = "absolute";
        especieContainer.style.display = "none";
        especieContainer.style.boxSizing = "border-box";
        window.__meusPetsEspecieSuggestContainer = especieContainer;
      } catch (e) {
        console.warn("não foi possível mover especieContainer para body", e);
      }

      function positionEspecieSuggest() {
        const rect = inputEspecie.getBoundingClientRect();
        especieContainer.style.left = rect.left + window.scrollX + "px";
        especieContainer.style.top = rect.bottom + window.scrollY + 6 + "px";
        especieContainer.style.width = rect.width + "px";
      }

      inputEspecie.addEventListener("focus", function () {
        carregarEspeciesForMeusPets();
        positionEspecieSuggest();
        especieContainer.style.display = "block";
      });

      inputEspecie.addEventListener("input", function () {
        const q = (this.value || "").toLowerCase().trim();
        const items = especieContainer.querySelectorAll(".suggestion-item");
        items.forEach((it) => {
          const txt = (it.textContent || "").toLowerCase();
          it.style.display = txt.indexOf(q) === -1 ? "none" : "block";
        });
        _selectedEspecie = null;
        positionEspecieSuggest();
      });

      document.addEventListener("click", function (e) {
        if (!especieContainer.contains(e.target) && e.target !== inputEspecie)
          especieContainer.style.display = "none";
      });
      window.addEventListener("scroll", function () {
        if (especieContainer.style.display === "block")
          positionEspecieSuggest();
      });
      window.addEventListener("resize", function () {
        if (especieContainer.style.display === "block")
          positionEspecieSuggest();
      });
    }

    // configurar dropdown de alimentação (mesma abordagem)
    const inputAlimentacao = document.getElementById("filter_alimentacao");
    const alimentacaoContainer = document.getElementById("alimentacaoSuggest");
    if (inputAlimentacao && alimentacaoContainer) {
      try {
        document.body.appendChild(alimentacaoContainer);
        alimentacaoContainer.style.position = "absolute";
        alimentacaoContainer.style.display = "none";
        alimentacaoContainer.style.boxSizing = "border-box";
        window.__meusPetsAlimentacaoSuggestContainer = alimentacaoContainer;
      } catch (e) {
        console.warn(
          "não foi possível mover alimentacaoContainer para body",
          e,
        );
      }

      function positionAlimentacaoSuggest() {
        const rect = inputAlimentacao.getBoundingClientRect();
        alimentacaoContainer.style.left = rect.left + window.scrollX + "px";
        alimentacaoContainer.style.top =
          rect.bottom + window.scrollY + 6 + "px";
        alimentacaoContainer.style.width = rect.width + "px";
      }

      inputAlimentacao.addEventListener("focus", function () {
        carregarAlimentacoesForMeusPets();
        positionAlimentacaoSuggest();
        alimentacaoContainer.style.display = "block";
      });

      inputAlimentacao.addEventListener("input", function () {
        const q = (this.value || "").toLowerCase().trim();
        const items = alimentacaoContainer.querySelectorAll(".suggestion-item");
        items.forEach((it) => {
          const txt = (it.textContent || "").toLowerCase();
          it.style.display = txt.indexOf(q) === -1 ? "none" : "block";
        });
        _selectedAlimentacao = null;
        positionAlimentacaoSuggest();
      });

      document.addEventListener("click", function (e) {
        if (
          !alimentacaoContainer.contains(e.target) &&
          e.target !== inputAlimentacao
        )
          alimentacaoContainer.style.display = "none";
      });
      window.addEventListener("scroll", function () {
        if (alimentacaoContainer.style.display === "block")
          positionAlimentacaoSuggest();
      });
      window.addEventListener("resize", function () {
        if (alimentacaoContainer.style.display === "block")
          positionAlimentacaoSuggest();
      });
    }

    // configurar dropdown de tags (mesma abordagem que espécies/alimentação)
    const inputTag = document.getElementById("filter_tag");
    const tagContainer = document.getElementById("tagSuggest");
    if (inputTag && tagContainer) {
      try {
        document.body.appendChild(tagContainer);
        tagContainer.style.position = "absolute";
        tagContainer.style.display = "none";
        tagContainer.style.boxSizing = "border-box";
        window.__meusPetsTagSuggestContainer = tagContainer;
      } catch (e) {
        console.warn("não foi possível mover tagContainer para body", e);
      }

      function positionTagSuggest() {
        const rect = inputTag.getBoundingClientRect();
        tagContainer.style.left = rect.left + window.scrollX + "px";
        tagContainer.style.top = rect.bottom + window.scrollY + 6 + "px";
        tagContainer.style.width = rect.width + "px";
      }

      inputTag.addEventListener("focus", function () {
        carregarTagsForMeusPets();
        positionTagSuggest();
        tagContainer.style.display = "block";
      });

      inputTag.addEventListener("input", function () {
        const q = (this.value || "").toLowerCase().trim();
        const items = tagContainer.querySelectorAll(".suggestion-item");
        items.forEach((it) => {
          const txt = (it.textContent || "").toLowerCase();
          it.style.display = txt.indexOf(q) === -1 ? "none" : "block";
        });
        positionTagSuggest();
      });

      document.addEventListener("click", function (e) {
        if (!tagContainer.contains(e.target) && e.target !== inputTag)
          tagContainer.style.display = "none";
      });
      window.addEventListener("scroll", function () {
        if (tagContainer.style.display === "block") positionTagSuggest();
      });
      window.addEventListener("resize", function () {
        if (tagContainer.style.display === "block") positionTagSuggest();
      });
    }

    // configurar campo Possui plano para usar o mesmo estilo de suggestions do Tipo de alimentação
    const inputPlanoDisplay = document.getElementById("filter_plano_display");
    const planoHidden = document.getElementById("filter_plano");
    const planoContainer = document.getElementById("planoSuggest");
    if (inputPlanoDisplay && planoHidden && planoContainer) {
      try {
        document.body.appendChild(planoContainer);
        planoContainer.style.position = "absolute";
        planoContainer.style.display = "none";
        planoContainer.style.boxSizing = "border-box";
        window.__meusPetsPlanoSuggestContainer = planoContainer;
      } catch (e) {
        console.warn("não foi possível mover planoContainer para body", e);
      }

      function positionPlanoSuggest() {
        const rect = inputPlanoDisplay.getBoundingClientRect();
        planoContainer.style.left = rect.left + window.scrollX + "px";
        planoContainer.style.top = rect.bottom + window.scrollY + 6 + "px";
        planoContainer.style.width = rect.width + "px";
      }

      inputPlanoDisplay.addEventListener("focus", function () {
        // mostrar sugestões (já está preenchido em HTML staticamente)
        positionPlanoSuggest();
        planoContainer.style.display = "block";
      });

      inputPlanoDisplay.addEventListener("input", function () {
        const q = (this.value || "").toLowerCase().trim();
        const items = planoContainer.querySelectorAll(".suggestion-item");
        items.forEach((it) => {
          const txt = (it.textContent || "").toLowerCase();
          it.style.display = txt.indexOf(q) === -1 ? "none" : "block";
        });
        // limpar valor oculto enquanto digita
        planoHidden.value = "";
        positionPlanoSuggest();
      });

      planoContainer.querySelectorAll(".suggestion-item").forEach((item) =>
        item.addEventListener("click", function (e) {
          e.stopPropagation();
          const val = item.getAttribute("data-value") || "";
          planoHidden.value = val;
          inputPlanoDisplay.value = item.textContent.trim();
          // fechar
          planoContainer.style.display = "none";
        }),
      );

      document.addEventListener("click", function (e) {
        if (
          !planoContainer.contains(e.target) &&
          e.target !== inputPlanoDisplay
        )
          planoContainer.style.display = "none";
      });
      window.addEventListener("scroll", function () {
        if (planoContainer.style.display === "block") positionPlanoSuggest();
      });
      window.addEventListener("resize", function () {
        if (planoContainer.style.display === "block") positionPlanoSuggest();
      });
    }

    // configurar campo Ativo (mesmo estilo de suggestions)
    const inputAtivoDisplay = document.getElementById("filter_ativo_display");
    const ativoHidden = document.getElementById("filter_ativo");
    const ativoContainer = document.getElementById("ativoSuggest");
    if (inputAtivoDisplay && ativoHidden && ativoContainer) {
      try {
        document.body.appendChild(ativoContainer);
        ativoContainer.style.position = "absolute";
        ativoContainer.style.display = "none";
        ativoContainer.style.boxSizing = "border-box";
        window.__meusPetsAtivoSuggestContainer = ativoContainer;
      } catch (e) {
        console.warn("não foi possível mover ativoContainer para body", e);
      }

      function positionAtivoSuggest() {
        const rect = inputAtivoDisplay.getBoundingClientRect();
        ativoContainer.style.left = rect.left + window.scrollX + "px";
        ativoContainer.style.top = rect.bottom + window.scrollY + 6 + "px";
        ativoContainer.style.width = rect.width + "px";
      }

      inputAtivoDisplay.addEventListener("focus", function () {
        positionAtivoSuggest();
        ativoContainer.style.display = "block";
      });
      inputAtivoDisplay.addEventListener("input", function () {
        const q = (this.value || "").toLowerCase().trim();
        const items = ativoContainer.querySelectorAll(".suggestion-item");
        items.forEach((it) => {
          const txt = (it.textContent || "").toLowerCase();
          it.style.display = txt.indexOf(q) === -1 ? "none" : "block";
        });
        // limpar valor oculto enquanto digita
        ativoHidden.value = "";
        positionAtivoSuggest();
      });

      ativoContainer.querySelectorAll(".suggestion-item").forEach((item) =>
        item.addEventListener("click", function (e) {
          e.stopPropagation();
          const val = item.getAttribute("data-value") || "";
          ativoHidden.value = val;
          inputAtivoDisplay.value = item.textContent.trim();
          ativoContainer.style.display = "none";
        }),
      );

      document.addEventListener("click", function (e) {
        if (
          !ativoContainer.contains(e.target) &&
          e.target !== inputAtivoDisplay
        )
          ativoContainer.style.display = "none";
      });
      window.addEventListener("scroll", function () {
        if (ativoContainer.style.display === "block") positionAtivoSuggest();
      });
      window.addEventListener("resize", function () {
        if (ativoContainer.style.display === "block") positionAtivoSuggest();
      });
    }

    // configurar campo Mês aniversário para usar o mesmo estilo de suggestions
    const inputMesDisplay = document.getElementById("filter_mes_display");
    const mesHidden = document.getElementById("filter_mes");
    const mesContainer = document.getElementById("mesSuggest");
    if (inputMesDisplay && mesHidden && mesContainer) {
      try {
        document.body.appendChild(mesContainer);
        mesContainer.style.position = "absolute";
        mesContainer.style.display = "none";
        mesContainer.style.boxSizing = "border-box";
        window.__meusPetsMesSuggestContainer = mesContainer;
      } catch (e) {
        console.warn("não foi possível mover mesContainer para body", e);
      }

      function positionMesSuggest() {
        const rect = inputMesDisplay.getBoundingClientRect();
        mesContainer.style.left = rect.left + window.scrollX + "px";
        mesContainer.style.top = rect.bottom + window.scrollY + 6 + "px";
        mesContainer.style.width = rect.width + "px";
      }

      inputMesDisplay.addEventListener("focus", function () {
        positionMesSuggest();
        mesContainer.style.display = "block";
      });

      inputMesDisplay.addEventListener("input", function () {
        const q = (this.value || "").toLowerCase().trim();
        const items = mesContainer.querySelectorAll(".suggestion-item");
        items.forEach((it) => {
          const txt = (it.textContent || "").toLowerCase();
          it.style.display = txt.indexOf(q) === -1 ? "none" : "block";
        });
        // limpar valor oculto enquanto digita
        mesHidden.value = "";
        positionMesSuggest();
      });

      mesContainer.querySelectorAll(".suggestion-item").forEach((item) =>
        item.addEventListener("click", function (e) {
          e.stopPropagation();
          const val = item.getAttribute("data-value") || "";
          addSelectedMes(val, item.textContent.trim());
          // manter sugestões abertas para permitir múltiplas seleções
        }),
      );

      document.addEventListener("click", function (e) {
        if (!mesContainer.contains(e.target) && e.target !== inputMesDisplay)
          mesContainer.style.display = "none";
      });
      window.addEventListener("scroll", function () {
        if (mesContainer.style.display === "block") positionMesSuggest();
      });
      window.addEventListener("resize", function () {
        if (mesContainer.style.display === "block") positionMesSuggest();
      });
    }

    if (btnPesquisar) {
      btnPesquisar.addEventListener("click", function (e) {
        e.preventDefault();
        // grupos selecionados (array de keys). Se não houver seleção, tentamos ler o valor digitado
        const selectedGrupoKeys = _selectedGrupos.map((g) => g.key);
        const inputVal = document.getElementById("filter_grupo")?.value || "";
        if (selectedGrupoKeys.length === 0 && inputVal)
          selectedGrupoKeys.push(grupoKeyFromName(inputVal));

        // espécies selecionadas (array) - fallback para input livre
        const especieInputVal =
          document.getElementById("filter_especie")?.value || "";
        const selectedEspecies =
          _selectedEspecies && _selectedEspecies.length > 0
            ? _selectedEspecies.slice()
            : especieInputVal
              ? [especieInputVal]
              : [];

        // tags selecionadas (array) - fallback para input livre (OR dentro do campo)
        const tagInputVal = document.getElementById("filter_tag")?.value || "";
        const selectedTagsLocal =
          _selectedTags && _selectedTags.length > 0
            ? _selectedTags.slice()
            : tagInputVal
              ? [tagInputVal]
              : [];

        // alimentações selecionadas
        const alimentacaoInputVal =
          document.getElementById("filter_alimentacao")?.value || "";
        const selectedAlimentacoes =
          _selectedAlimentacaoArr && _selectedAlimentacaoArr.length > 0
            ? _selectedAlimentacaoArr.slice()
            : alimentacaoInputVal
              ? [alimentacaoInputVal]
              : [];

        // plano (single)
        const planoInputVal =
          document.getElementById("filter_plano")?.value || "";
        const planoVal = planoInputVal ? planoInputVal : null;

        // meses selecionados: preferir array _selectedMeses, senão usar hidden (comma separated)
        const mesHiddenVal = document.getElementById("filter_mes")?.value || "";
        let selectedMeses = [];
        if (_selectedMeses && _selectedMeses.length > 0)
          selectedMeses = _selectedMeses.slice();
        else if (mesHiddenVal)
          selectedMeses = mesHiddenVal
            .split(",")
            .map((s) => Number(s))
            .filter((n) => !isNaN(n));

        const normSelectedEspecies = selectedEspecies.map((s) =>
          normalizeStr(s),
        );
        const normSelectedAlims = selectedAlimentacoes.map((s) =>
          normalizeStr(s),
        );

        const filterDataVal =
          document.getElementById("filter_data")?.value || "";

        // filtro de ativo: ler o hidden input preenchido pelo dropdown
        const ativoFilterVal = (
          document.getElementById("filter_ativo")?.value || ""
        )
          .toLowerCase()
          .trim();

        const filtered = _meusPetsData.filter((p) => {
          // checa grupo do cliente: se houver múltiplos selecionados, aceita se clienteKey estiver entre eles
          let okGrupo = true;
          if (selectedGrupoKeys.length > 0) {
            const clienteId =
              p.cliente_id || p.cliente || p.clienteId || p.tutor_id || null;
            const cliente = clienteId ? _meusClientsMap[clienteId] : null;
            if (!cliente) okGrupo = false;
            else {
              const grupoNome =
                cliente.grupo_cliente || cliente.grupo || cliente.group || "";
              const clienteKey = grupoKeyFromName(grupoNome);
              okGrupo = selectedGrupoKeys.includes(clienteKey);
            }
          }

          // checa espécie do pet (OR dentro das espécies selecionadas)
          let okEspecie = true;
          if (normSelectedEspecies.length > 0) {
            const especiePet = (
              p.especie ||
              p.raca ||
              p.species ||
              p.breed ||
              ""
            )
              .toString()
              .trim();
            const normPet = normalizeStr(especiePet);
            okEspecie = normSelectedEspecies.some((s) => s === normPet);
          }

          // checa tipo de alimentação do pet (OR dentro das alimentações selecionadas)
          let okAlimentacao = true;
          if (normSelectedAlims.length > 0) {
            const alimPet = (
              p.alimentacao ||
              p.tipo_alimentacao ||
              p.alimentacao_tipo ||
              p.food ||
              ""
            )
              .toString()
              .trim();
            const normAlimPet = normalizeStr(alimPet);
            okAlimentacao = normSelectedAlims.some((a) => a === normAlimPet);
          }

          // checa plano (mantém single-select)
          let okPlano = true;
          if (planoVal) {
            const planoPet = (p.plano || p.possui_plano || p.has_plan || "")
              .toString()
              .trim();
            if (planoVal === "sim") {
              okPlano =
                normalizeStr(planoPet) === "sim" ||
                normalizeStr(planoPet) === "true" ||
                normalizeStr(planoPet) === "s" ||
                planoPet === "1";
            } else if (planoVal === "nao") {
              okPlano = !(
                normalizeStr(planoPet) === "sim" ||
                normalizeStr(planoPet) === "true" ||
                normalizeStr(planoPet) === "s" ||
                planoPet === "1"
              );
            }
          }

          // checa mês de aniversário do pet (aceita múltiplos meses)
          let okMes = true;
          if (selectedMeses.length > 0) {
            let nascimentoRaw =
              p.data_nascimento ||
              p.nascimento ||
              p.dataNascimento ||
              p.birthdate ||
              p.dob ||
              "";
            let nascimentoDate = null;
            if (nascimentoRaw) {
              try {
                if (
                  typeof nascimentoRaw === "string" &&
                  nascimentoRaw.indexOf("/") !== -1
                ) {
                  const parts = nascimentoRaw.split("/").map((s) => s.trim());
                  if (parts.length === 3) {
                    const dia = parseInt(parts[0], 10) || 1;
                    const mes = (parseInt(parts[1], 10) || 1) - 1;
                    const ano = parseInt(parts[2], 10) || 1970;
                    nascimentoDate = new Date(ano, mes, dia);
                  }
                } else {
                  const d = new Date(nascimentoRaw);
                  if (!isNaN(d.getTime())) nascimentoDate = d;
                }
              } catch (e) {
                nascimentoDate = null;
              }
            }

            if (!nascimentoDate) okMes = false;
            else {
              const petMonth = nascimentoDate.getMonth() + 1; // 1..12
              okMes = selectedMeses.includes(petMonth);
            }
          }

          // checa data de cadastro (se o usuário selecionou uma data específica)
          let okDataCadastro = true;
          if (filterDataVal) {
            // tentativa de localizar um campo de data de cadastro comum
            const possible =
              p.data_cadastro ||
              p.dataCadastro ||
              p.cadastro ||
              p.created_at ||
              p.createdAt ||
              p.created ||
              p.dataCriacao ||
              p.data_criacao ||
              p.criado_em ||
              p.criadoEm ||
              "";
            let cadastroDate = null;
            try {
              if (
                typeof possible === "string" &&
                possible.indexOf("/") !== -1
              ) {
                const parts = possible.split("/").map((s) => s.trim());
                if (parts.length === 3) {
                  const d = parseInt(parts[0], 10) || 1;
                  const m = (parseInt(parts[1], 10) || 1) - 1;
                  const y = parseInt(parts[2], 10) || 1970;
                  cadastroDate = new Date(y, m, d);
                }
              } else if (
                typeof possible === "number" ||
                (!isNaN(Number(possible)) && String(possible).length > 0)
              ) {
                const n = Number(possible);
                cadastroDate = new Date(n);
              } else {
                const d = new Date(possible);
                if (!isNaN(d.getTime())) cadastroDate = d;
              }
            } catch (e) {
              cadastroDate = null;
            }

            if (!cadastroDate) okDataCadastro = false;
            else {
              const dd = String(cadastroDate.getDate()).padStart(2, "0");
              const mm = String(cadastroDate.getMonth() + 1).padStart(2, "0");
              const yyyy = cadastroDate.getFullYear();
              const petFormatted = `${dd}/${mm}/${yyyy}`;
              okDataCadastro = petFormatted === filterDataVal;
            }
          }

          // checa tags selecionadas (OR dentro do campo: aceita se pet tiver ao menos uma das tags selecionadas)
          let okTags = true;
          if (selectedTagsLocal.length > 0) {
            // extrair tags do pet (p.tags pode ser array ou string)
            let petTags = [];
            try {
              if (Array.isArray(p.tags))
                petTags = p.tags.map((t) => String(t).trim());
              else if (typeof p.tags === "string") {
                const raw = p.tags.trim();
                if (raw.startsWith("[")) {
                  try {
                    petTags = JSON.parse(raw);
                  } catch (e) {
                    petTags = raw
                      .replace(/\[|\]/g, "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                  }
                } else {
                  petTags = raw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                }
              }
            } catch (e) {
              petTags = [];
            }

            const normPetTags = petTags.map((t) => normalizeStr(t));
            okTags = selectedTagsLocal.some((st) =>
              normPetTags.includes(normalizeStr(st)),
            );
          }

          // checa ativo
          let okAtivo = true;
          if (ativoFilterVal === "sim") {
            okAtivo =
              p.ativo === true ||
              p.ativo === 1 ||
              p.ativo === "1" ||
              p.ativo === "true";
          } else if (ativoFilterVal === "nao" || ativoFilterVal === "não") {
            okAtivo = !(
              p.ativo === true ||
              p.ativo === 1 ||
              p.ativo === "1" ||
              p.ativo === "true"
            );
          }

          return (
            okGrupo &&
            okEspecie &&
            okAlimentacao &&
            okPlano &&
            okMes &&
            okDataCadastro &&
            okTags &&
            okAtivo
          );
        });

        // se nenhum filtro aplicado, mostra todos (inclui Tags e Ativo na checagem)
        if (
          selectedGrupoKeys.length === 0 &&
          normSelectedEspecies.length === 0 &&
          normSelectedAlims.length === 0 &&
          !planoVal &&
          selectedMeses.length === 0 &&
          !filterDataVal &&
          selectedTagsLocal.length === 0 &&
          !ativoFilterVal
        ) {
          renderPetsTable(_meusPetsData);
        } else {
          renderPetsTable(filtered);
        }

        // fechar painel e limpar estado visual
        panel.classList.remove("expanded");
        panel.style.display = "none";
        btnToggle?.classList.remove("active");
        try {
          if (window.__meusPetsSuggestContainer)
            window.__meusPetsSuggestContainer.style.display = "none";
        } catch (e) {}
        try {
          if (window.__meusPetsEspecieSuggestContainer)
            window.__meusPetsEspecieSuggestContainer.style.display = "none";
        } catch (e) {}
        try {
          if (window.__meusPetsTagSuggestContainer)
            window.__meusPetsTagSuggestContainer.style.display = "none";
        } catch (e) {}
      });
    }
  }
});

function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// =========================
// Calendário para campo 'Data do cadastro' (estilo agendamentos)
// =========================
let calendarioFilterAtual = new Date();
let dataSelecionadaFilter = null;

window.toggleCalendarioFilter = function () {
  const cal = document.getElementById("calendarioFilter");
  if (!cal) return;
  if (cal.style.display === "none" || !cal.style.display)
    mostrarCalendarioFilter();
  else esconderCalendarioFilter();
};

function mostrarCalendarioFilter() {
  const cal = document.getElementById("calendarioFilter");
  const input = document.getElementById("filter_data_display");
  if (!cal || !input) return;

  // mover para body para evitar clipping por stacking contexts/overflow
  if (cal.parentElement !== document.body) {
    document.body.appendChild(cal);
    cal.style.position = "absolute";
    cal.style.zIndex = "2000000";
  }

  // posicionar abaixo do input
  function positionCal() {
    const rect = input.getBoundingClientRect();
    cal.style.left = rect.left + window.scrollX + "px";
    cal.style.top = rect.bottom + window.scrollY + 6 + "px";
    // garantir largura compatível — se variável CSS estiver definida, usa ela
    const comp = getComputedStyle(cal);
    const cssWidth = (comp.getPropertyValue("--cal-filter-width") || "").trim();
    if (cssWidth) cal.style.width = cssWidth;
    else cal.style.width = Math.min(360, Math.max(220, rect.width)) + "px";
  }

  positionCal();
  // re-posicionar em scroll/resize
  window.addEventListener("scroll", positionCal);
  window.addEventListener("resize", positionCal);

  cal.style.display = "block";
  cal.style.opacity = "0";
  cal.style.transform = "translateY(-6px)";

  const agora = new Date();
  const brasilia = new Date(
    agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  calendarioFilterAtual = new Date(
    brasilia.getFullYear(),
    brasilia.getMonth(),
    1,
  );
  renderizarCalendarioFilter();

  setTimeout(() => {
    cal.style.transition = "all 0.25s cubic-bezier(0.4,0,0.2,1)";
    cal.style.opacity = "1";
    cal.style.transform = "translateY(0)";
  }, 10);

  setTimeout(() => {
    document.addEventListener("click", fecharCalendarioForaFilter);
  }, 120);
  // guardar referência para limpar listeners quando fechar
  cal.__posFn = positionCal;
}

function esconderCalendarioFilter() {
  const cal = document.getElementById("calendarioFilter");
  if (!cal) return;
  cal.style.transition = "all 0.18s cubic-bezier(0.4,0,0.2,1)";
  cal.style.opacity = "0";
  cal.style.transform = "translateY(-6px)";
  setTimeout(() => {
    cal.style.display = "none";
  }, 180);
  document.removeEventListener("click", fecharCalendarioForaFilter);
  // remover listeners de posicionamento
  if (cal.__posFn) {
    window.removeEventListener("scroll", cal.__posFn);
    window.removeEventListener("resize", cal.__posFn);
    delete cal.__posFn;
  }
}

function fecharCalendarioForaFilter(e) {
  const cal = document.getElementById("calendarioFilter");
  const input = document.getElementById("filter_data_display");
  if (!cal || !input) return;
  if (!cal.contains(e.target) && e.target !== input) esconderCalendarioFilter();
}

function renderizarCalendarioFilter() {
  const mesAno = document.getElementById("mesAnoFilter");
  const diasGrid = document.getElementById("diasFilter");
  if (!mesAno || !diasGrid) return;

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  mesAno.textContent = `${meses[calendarioFilterAtual.getMonth()]} ${calendarioFilterAtual.getFullYear()}`;
  diasGrid.innerHTML = "";

  const primeiroDia = new Date(
    calendarioFilterAtual.getFullYear(),
    calendarioFilterAtual.getMonth(),
    1,
  );
  const ultimoDia = new Date(
    calendarioFilterAtual.getFullYear(),
    calendarioFilterAtual.getMonth() + 1,
    0,
  );
  const inicioDaSemana = primeiroDia.getDay();

  const hoje = new Date();
  const hojeBrasilia = new Date(
    hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );

  // altura das células (puxada da variável CSS se disponível)
  const comp = getComputedStyle(document.getElementById("calendarioFilter"));
  const cellH = comp.getPropertyValue("--cal-cell-height") || "32px";
  for (let i = 0; i < inicioDaSemana; i++) {
    const dv = document.createElement("div");
    dv.style.cssText = `height:${cellH};`;
    diasGrid.appendChild(dv);
  }

  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const diaElemento = document.createElement("div");
    diaElemento.textContent = dia;
    diaElemento.style.cssText = `height:${cellH}; display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:6px; font-size:13px; transition:all 0.18s ease; user-select:none;`;

    const dataAtual = new Date(
      calendarioFilterAtual.getFullYear(),
      calendarioFilterAtual.getMonth(),
      dia,
    );
    const ehHoje = dataAtual.toDateString() === hojeBrasilia.toDateString();

    if (ehHoje) {
      diaElemento.style.background = "#2c5aa0";
      diaElemento.style.color = "white";
      diaElemento.style.fontWeight = "600";
    } else diaElemento.style.color = "#333";

    if (
      dataSelecionadaFilter &&
      dataAtual.toDateString() === dataSelecionadaFilter.toDateString()
    ) {
      diaElemento.style.background = "#28a745";
      diaElemento.style.color = "white";
      diaElemento.style.fontWeight = "600";
    }

    diaElemento.addEventListener("mouseenter", function () {
      if (
        !ehHoje &&
        (!dataSelecionadaFilter ||
          dataAtual.toDateString() !== dataSelecionadaFilter.toDateString())
      ) {
        this.style.background = "#f0f8ff";
        this.style.color = "#2c5aa0";
      }
    });
    diaElemento.addEventListener("mouseleave", function () {
      if (
        !ehHoje &&
        (!dataSelecionadaFilter ||
          dataAtual.toDateString() !== dataSelecionadaFilter.toDateString())
      ) {
        this.style.background = "transparent";
        this.style.color = "#333";
      }
    });

    diaElemento.addEventListener("click", function () {
      selecionarDataFilter(dataAtual);
    });

    diasGrid.appendChild(diaElemento);
  }

  document.getElementById("btnFiltroMesAnterior").onclick = function () {
    calendarioFilterAtual.setMonth(calendarioFilterAtual.getMonth() - 1);
    renderizarCalendarioFilter();
  };
  document.getElementById("btnFiltroMesProximo").onclick = function () {
    calendarioFilterAtual.setMonth(calendarioFilterAtual.getMonth() + 1);
    renderizarCalendarioFilter();
  };
}

// Retorna o array de pets atualmente visível de acordo com os filtros do painel
function getFilteredPetsUsingCurrentFilters() {
  // replicar a mesma lógica usada no botão Pesquisar (sem alterar o estado)
  const selectedGrupoKeys = _selectedGrupos.map((g) => g.key);
  const inputVal = document.getElementById("filter_grupo")?.value || "";
  if (selectedGrupoKeys.length === 0 && inputVal)
    selectedGrupoKeys.push(grupoKeyFromName(inputVal));

  const especieInputVal =
    document.getElementById("filter_especie")?.value || "";
  const selectedEspecies =
    _selectedEspecies && _selectedEspecies.length > 0
      ? _selectedEspecies.slice()
      : especieInputVal
        ? [especieInputVal]
        : [];

  const tagInputVal = document.getElementById("filter_tag")?.value || "";
  const selectedTagsLocal =
    _selectedTags && _selectedTags.length > 0
      ? _selectedTags.slice()
      : tagInputVal
        ? [tagInputVal]
        : [];

  const alimentacaoInputVal =
    document.getElementById("filter_alimentacao")?.value || "";
  const selectedAlimentacoes =
    _selectedAlimentacaoArr && _selectedAlimentacaoArr.length > 0
      ? _selectedAlimentacaoArr.slice()
      : alimentacaoInputVal
        ? [alimentacaoInputVal]
        : [];

  const planoInputVal = document.getElementById("filter_plano")?.value || "";
  const planoVal = planoInputVal ? planoInputVal : null;

  const mesHiddenVal = document.getElementById("filter_mes")?.value || "";
  let selectedMeses = [];
  if (_selectedMeses && _selectedMeses.length > 0)
    selectedMeses = _selectedMeses.slice();
  else if (mesHiddenVal)
    selectedMeses = mesHiddenVal
      .split(",")
      .map((s) => Number(s))
      .filter((n) => !isNaN(n));

  const normSelectedEspecies = selectedEspecies.map((s) => normalizeStr(s));
  const normSelectedAlims = selectedAlimentacoes.map((s) => normalizeStr(s));
  const filterDataVal = document.getElementById("filter_data")?.value || "";

  const filtered = _meusPetsData.filter((p) => {
    // grupo
    let okGrupo = true;
    if (selectedGrupoKeys.length > 0) {
      const clienteId =
        p.cliente_id || p.cliente || p.clienteId || p.tutor_id || null;
      const cliente = clienteId ? _meusClientsMap[clienteId] : null;
      if (!cliente) okGrupo = false;
      else {
        const grupoNome =
          cliente.grupo_cliente || cliente.grupo || cliente.group || "";
        const clienteKey = grupoKeyFromName(grupoNome);
        okGrupo = selectedGrupoKeys.includes(clienteKey);
      }
    }

    // espécie
    let okEspecie = true;
    if (normSelectedEspecies.length > 0) {
      const especiePet = (p.especie || p.raca || p.species || p.breed || "")
        .toString()
        .trim();
      const normPet = normalizeStr(especiePet);
      okEspecie = normSelectedEspecies.some((s) => s === normPet);
    }

    // alimentacao
    let okAlimentacao = true;
    if (normSelectedAlims.length > 0) {
      const alimPet = (
        p.alimentacao ||
        p.tipo_alimentacao ||
        p.alimentacao_tipo ||
        p.food ||
        ""
      )
        .toString()
        .trim();
      const normAlimPet = normalizeStr(alimPet);
      okAlimentacao = normSelectedAlims.some((a) => a === normAlimPet);
    }

    // plano
    let okPlano = true;
    if (planoVal) {
      const planoPet = (p.plano || p.possui_plano || p.has_plan || "")
        .toString()
        .trim();
      if (planoVal === "sim") {
        okPlano =
          normalizeStr(planoPet) === "sim" ||
          normalizeStr(planoPet) === "true" ||
          normalizeStr(planoPet) === "s" ||
          planoPet === "1";
      } else if (planoVal === "nao") {
        okPlano = !(
          normalizeStr(planoPet) === "sim" ||
          normalizeStr(planoPet) === "true" ||
          normalizeStr(planoPet) === "s" ||
          planoPet === "1"
        );
      }
    }

    // meses
    let okMes = true;
    if (selectedMeses.length > 0) {
      let nascimentoRaw =
        p.data_nascimento ||
        p.nascimento ||
        p.dataNascimento ||
        p.birthdate ||
        p.dob ||
        "";
      let nascimentoDate = null;
      if (nascimentoRaw) {
        try {
          if (
            typeof nascimentoRaw === "string" &&
            nascimentoRaw.indexOf("/") !== -1
          ) {
            const parts = nascimentoRaw.split("/").map((s) => s.trim());
            if (parts.length === 3) {
              const dia = parseInt(parts[0], 10) || 1;
              const mes = (parseInt(parts[1], 10) || 1) - 1;
              const ano = parseInt(parts[2], 10) || 1970;
              nascimentoDate = new Date(ano, mes, dia);
            }
          } else {
            const d = new Date(nascimentoRaw);
            if (!isNaN(d.getTime())) nascimentoDate = d;
          }
        } catch (e) {
          nascimentoDate = null;
        }
      }

      if (!nascimentoDate) okMes = false;
      else {
        const petMonth = nascimentoDate.getMonth() + 1; // 1..12
        okMes = selectedMeses.includes(petMonth);
      }
    }

    // data cadastro
    let okDataCadastro = true;
    if (filterDataVal) {
      const possible =
        p.data_cadastro ||
        p.dataCadastro ||
        p.cadastro ||
        p.created_at ||
        p.createdAt ||
        p.created ||
        p.dataCriacao ||
        p.data_criacao ||
        p.criado_em ||
        p.criadoEm ||
        "";
      let cadastroDate = null;
      try {
        if (typeof possible === "string" && possible.indexOf("/") !== -1) {
          const parts = possible.split("/").map((s) => s.trim());
          if (parts.length === 3) {
            const d = parseInt(parts[0], 10) || 1;
            const m = (parseInt(parts[1], 10) || 1) - 1;
            const y = parseInt(parts[2], 10) || 1970;
            cadastroDate = new Date(y, m, d);
          }
        } else if (
          typeof possible === "number" ||
          (!isNaN(Number(possible)) && String(possible).length > 0)
        ) {
          const n = Number(possible);
          cadastroDate = new Date(n);
        } else {
          const d = new Date(possible);
          if (!isNaN(d.getTime())) cadastroDate = d;
        }
      } catch (e) {
        cadastroDate = null;
      }

      if (!cadastroDate) okDataCadastro = false;
      else {
        const dd = String(cadastroDate.getDate()).padStart(2, "0");
        const mm = String(cadastroDate.getMonth() + 1).padStart(2, "0");
        const yyyy = cadastroDate.getFullYear();
        const petFormatted = `${dd}/${mm}/${yyyy}`;
        okDataCadastro = petFormatted === filterDataVal;
      }
    }

    // tags
    let okTags = true;
    if (selectedTagsLocal.length > 0) {
      let petTags = [];
      try {
        if (Array.isArray(p.tags))
          petTags = p.tags.map((t) => String(t).trim());
        else if (typeof p.tags === "string") {
          const raw = p.tags.trim();
          if (raw.startsWith("[")) {
            try {
              petTags = JSON.parse(raw);
            } catch (e) {
              petTags = raw
                .replace(/\[|\]/g, "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            }
          } else {
            petTags = raw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
      } catch (e) {
        petTags = [];
      }

      const normPetTags = petTags.map((t) => normalizeStr(t));
      okTags = selectedTagsLocal.some((st) =>
        normPetTags.includes(normalizeStr(st)),
      );
    }

    return (
      okGrupo &&
      okEspecie &&
      okAlimentacao &&
      okPlano &&
      okMes &&
      okDataCadastro &&
      okTags
    );
  });

  return filtered;
}

// Gera o HTML do relatório (simples, imprimível). O logo é buscado da página (se houver) ou usa /logos padrão.
function generatePetsReportHTML(pets) {
  const logoEl =
    document.querySelector(".logo-pet-cria") ||
    document.querySelector(".logo img");
  const logoSrc =
    logoEl && logoEl.getAttribute && logoEl.getAttribute("src")
      ? logoEl.getAttribute("src")
      : "/fivecon/Design sem nome (17).png";
  const titulo = "RELATÓRIO DE PETS";
  const now = new Date();
  const header = `
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:18px;">
            <img src="${logoSrc}" style="height:60px;object-fit:contain" alt="logo"/>
            <div>
                <h2 style="margin:0">${escapeHtml(titulo)}</h2>
                <div style="font-size:12px;color:#666">Gerado em: ${now.toLocaleString()}</div>
            </div>
        </div>`;

  const rowsHtml = pets
    .map((p) => {
      const id = p.id || p.codigo || p.pet_id || p._id || "";
      const petName = escapeHtml(nomeDoPet(p) || "");
      const cliente =
        p.cliente_id && _meusClientsMap[p.cliente_id]
          ? nomeDoCliente(_meusClientsMap[p.cliente_id])
          : p.cliente_nome || p.cliente || "";
      const especie = escapeHtml(
        (p.especie || p.raca || p.species || "").toString(),
      );
      const raca = escapeHtml((p.raca || p.raca_pet || "").toString());
      const nascimento = escapeHtml(
        p.data_nascimento || p.nascimento || p.dob || "",
      );
      const porte = escapeHtml(p.porte || p.tamanho || "");
      const alimentacao = escapeHtml(p.alimentacao || p.tipo_alimentacao || "");
      const tags = Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "";
      return `
            <div style="border-top:1px solid #ddd;padding:10px 0;display:flex;justify-content:space-between;">
                <div style="flex:1;min-width:260px">
                    <div><strong>Pet:</strong> ${id} - ${petName}</div>
                    <div><strong>Gênero:</strong> ${escapeHtml(p.genero || p.sexo || "")}</div>
                    <div><strong>Espécie:</strong> ${especie}</div>
                    <div><strong>Raça:</strong> ${raca}</div>
                    <div><strong>Dt Nascimento:</strong> ${nascimento}</div>
                    <div><strong>Porte:</strong> ${porte}</div>
                    <div><strong>Alimentação:</strong> ${alimentacao}</div>
                    <div><strong>Tags:</strong> ${escapeHtml(tags)}</div>
                </div>
                <div style="width:260px;padding-left:18px">
                    <div><strong>Cliente:</strong> ${escapeHtml(cliente)}</div>
                    <div><strong>Contato:</strong> ${escapeHtml(p.contato_cliente || "")}</div>
                    <div><strong>Data cadastro:</strong> ${escapeHtml(p.data_cadastro || p.created_at || "")}</div>
                </div>
            </div>`;
    })
    .join("\n");

  const full = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml("Relatório de Pets")}</title>
        <style>body{font-family:Arial,Helvetica,sans-serif;padding:18px;color:#222} h2{margin:0 0 6px 0} .page{max-width:1100px;margin:0 auto}</style>
        </head><body><div class="page">${header}${rowsHtml}</div></body></html>`;
  return full;
}

// Exporta para Excel usando XLSX (já usado em clientes)
function exportPetsToXLS(pets) {
  try {
    if (!window.XLSX) {
      showNotification("Biblioteca XLSX não encontrada", "error");
      return;
    }
    if (!pets || pets.length === 0) {
      showNotification("Nenhum pet para exportar", "info");
      return;
    }
    const dados = pets.map((p) => ({
      ID: p.id || p.codigo || p.pet_id || p._id || "",
      Nome: nomeDoPet(p) || "",
      Cliente:
        p.cliente_id && _meusClientsMap[p.cliente_id]
          ? nomeDoCliente(_meusClientsMap[p.cliente_id])
          : p.cliente_nome || p.cliente || "",
      Especie: p.especie || p.raca || "",
      Raca: p.raca || "",
      Dt_Nascimento: p.data_nascimento || p.nascimento || p.dob || "",
      Porte: p.porte || p.tamanho || "",
      Alimentacao: p.alimentacao || "",
      Tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "",
      Data_Cadastro: p.data_cadastro || p.created_at || "",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pets");
    const now = new Date();
    const filename = `Pets_Export_${now.toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
    showNotification(
      `✅ Exportado ${pets.length} pets em ${filename}`,
      "success",
    );
  } catch (e) {
    console.error("Erro exportPetsToXLS", e);
    showNotification("Erro ao exportar XLS", "error");
  }
}

// Garante que a biblioteca XLSX está disponível. Retorna Promise.
function ensureXLSX() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    const existing = Array.from(document.getElementsByTagName("script")).find(
      (s) => s.src && s.src.indexOf("xlsx") !== -1,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.XLSX));
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load existing XLSX script")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = function () {
      if (window.XLSX) resolve(window.XLSX);
      else reject(new Error("XLSX loaded but window.XLSX not set"));
    };
    s.onerror = function (e) {
      reject(new Error("Erro ao carregar script XLSX: " + e));
    };
    document.head.appendChild(s);
  });
}

// Abre diálogo simples de exportação (modal em DOM dinâmico)
function openExportDialogForPets() {
  const existing = document.getElementById("__exportPetsModal");
  if (existing) {
    existing.style.display = "flex";
    return;
  }
  const modal = document.createElement("div");
  modal.id = "__exportPetsModal";
  modal.style.position = "fixed";
  modal.style.left = "0";
  modal.style.top = "0";
  modal.style.right = "0";
  modal.style.bottom = "0";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.background = "rgba(0,0,0,0.45)";
  modal.style.zIndex = "20000";

  modal.innerHTML = `
        <div style="width:780px;max-width:96%;background:#fff;border-radius:8px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.25);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0">Exportar Relatório</h3>
                <button id="__exportPetsClose" style="background:transparent;border:none;font-size:18px;cursor:pointer">✕</button>
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:block;font-weight:600;margin-bottom:6px">Formato</label>
                <select id="__exportPetsFormat" style="width:180px;padding:8px">
                    <option value="pdf">pdf</option>
                    <option value="xls">xls</option>
                </select>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button id="__exportPetsPreview" class="btn-primary">Visualizar / Abrir</button>
                <button id="__exportPetsDo" class="btn-primary">Exportar</button>
            </div>
        </div>`;

  document.body.appendChild(modal);
  document.getElementById("__exportPetsClose").addEventListener("click", () => {
    modal.style.display = "none";
  });

  document
    .getElementById("__exportPetsPreview")
    .addEventListener("click", () => {
      const fmt = document.getElementById("__exportPetsFormat").value;
      const pets = getFilteredPetsUsingCurrentFilters();
      if (fmt === "pdf") {
        const html = generatePetsReportHTML(pets);
        const w = window.open("about:blank", "_blank");
        if (!w) {
          showNotification("Bloqueador de popups impediu a abertura", "error");
          return;
        }
        w.document.write(html);
        w.document.close();
      } else if (fmt === "xls") {
        exportPetsToXLS(pets);
      }
    });

  document.getElementById("__exportPetsDo").addEventListener("click", () => {
    const fmt = document.getElementById("__exportPetsFormat").value;
    const pets = getFilteredPetsUsingCurrentFilters();
    if (fmt === "pdf") {
      // abrir em nova aba para o usuário salvar como PDF via imprimir
      const html = generatePetsReportHTML(pets);
      const w = window.open("about:blank", "_blank");
      if (!w) {
        showNotification("Bloqueador de popups impediu a abertura", "error");
        return;
      }
      w.document.write(html);
      w.document.close();
      // instrução ao usuário: usar imprimir -> salvar como PDF
    } else if (fmt === "xls") {
      exportPetsToXLS(pets);
    }
  });
}

function selecionarDataFilter(data) {
  dataSelecionadaFilter = new Date(data);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  const formatted = `${dia}/${mes}/${ano}`;
  const hidden = document.getElementById("filter_data");
  const display = document.getElementById("filter_data_display");
  if (hidden) hidden.value = formatted;
  if (display) display.value = formatted;
  esconderCalendarioFilter();
  renderizarCalendarioFilter();
}

function selecionarHojeFilter() {
  const hoje = new Date();
  const hojeBrasilia = new Date(
    hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  selecionarDataFilter(hojeBrasilia);
}

function fecharCalendarioFilter() {
  esconderCalendarioFilter();
}

// API pública para ajustar dimensões do calendário dinamicamente
window.calendarioFilterSetSize = function (width, cellHeight, padding) {
  const cal = document.getElementById("calendarioFilter");
  if (!cal) return;
  if (width) cal.style.setProperty("--cal-filter-width", width);
  if (cellHeight) cal.style.setProperty("--cal-cell-height", cellHeight);
  if (padding) cal.style.setProperty("--cal-padding", padding);
  // reposicionar e re-renderizar
  if (cal.__posFn) cal.__posFn();
  renderizarCalendarioFilter();
};
