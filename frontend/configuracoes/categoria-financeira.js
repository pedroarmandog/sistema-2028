// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

function detectarIDsDuplicados() {
  const idsParaVerificar = [
    "clienteMenuItem",
    "clienteSubmenu",
    "itemMenuItem",
    "itemSubmenu",
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
    { container: "itemMenuItem", submenu: "itemSubmenu", id: "item" },
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
    "meus-itens.html": "itemMenuItem",
    "novo-item.html": "itemMenuItem",
    "agrupamento.html": "itemMenuItem",
    "marca.html": "itemMenuItem",
    "unidade.html": "itemMenuItem",
    "descontos-item.html": "itemMenuItem",
    "comissao.html": "itemMenuItem",
    "etiquetas.html": "itemMenuItem",
    "tributacao.html": "itemMenuItem",
    "estoque.html": "itemMenuItem",
    "clinica.html": "itemMenuItem",
    "manutencao-produtos.html": "itemMenuItem",
    "controle-validade.html": "itemMenuItem",
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
  configurarPersistenciaSubmenu("itemMenuItem", "itemSubmenu", "item");
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

// Configurar submenu lateral para Caixa
function configurarSubmenuLateralCaixa() {
  console.log("🔍 Iniciando configuração do submenu lateral Caixa...");

  const caixaSubmenuItem = document.getElementById("caixaSubmenuItem");
  const caixaLateralSubmenu = document.getElementById("caixaLateralSubmenu");
  const submenuItemWithLateral = document.querySelector(
    ".submenu-item-with-lateral",
  );

  console.log("🔍 Elementos encontrados:");
  console.log("- caixaSubmenuItem:", caixaSubmenuItem);
  console.log("- caixaLateralSubmenu:", caixaLateralSubmenu);
  console.log("- submenuItemWithLateral:", submenuItemWithLateral);

  if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
    console.log("✅ Configurando submenu lateral do Caixa...");

    let isSubmenuVisible = false;

    // Função para mostrar submenu
    const showSubmenu = () => {
      console.log("📤 Mostrando submenu lateral");
      caixaLateralSubmenu.style.opacity = "1";
      caixaLateralSubmenu.style.visibility = "visible";
      caixaLateralSubmenu.style.transform = "translateX(0)";
      isSubmenuVisible = true;
    };

    // Função para esconder submenu
    const hideSubmenu = () => {
      console.log("📥 Escondendo submenu lateral");
      caixaLateralSubmenu.style.opacity = "0";
      caixaLateralSubmenu.style.visibility = "hidden";
      caixaLateralSubmenu.style.transform = "translateX(-10px)";
      isSubmenuVisible = false;
    };

    // Configurar hover no container principal
    submenuItemWithLateral.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no container do Caixa");
      showSubmenu();
    });

    submenuItemWithLateral.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do container do Caixa");
      setTimeout(hideSubmenu, 100);
    });

    // Configurar hover no submenu lateral
    caixaLateralSubmenu.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no submenu lateral");
      showSubmenu();
    });

    caixaLateralSubmenu.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do submenu lateral");
      hideSubmenu();
    });

    // Adicionar event listeners para os itens do submenu lateral
    const lateralItems = caixaLateralSubmenu.querySelectorAll(
      ".lateral-submenu-item",
    );
    console.log(
      `🔍 Encontrados ${lateralItems.length} itens no submenu lateral`,
    );

    lateralItems.forEach((item, index) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const texto = this.textContent.trim();
        console.log(`🚀 Clique em: ${texto}`);

        // Aqui você pode adicionar navegação específica para cada item
        switch (texto) {
          case "Abertura/Fechamento":
            alert("Navegando para Abertura/Fechamento de Caixa");
            // window.location.href = '/caixa/abertura-fechamento.html';
            break;
          case "Suprimento/Sangria":
            alert("Navegando para Suprimento/Sangria");
            // window.location.href = '/caixa/suprimento-sangria.html';
            break;
          case "Rel. Demonstrativo de caixa":
            alert("Navegando para Relatório Demonstrativo de Caixa");
            // window.location.href = '/caixa/relatorio-demonstrativo.html';
            break;
        }

        hideSubmenu();
      });

      console.log(
        `✅ Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`,
      );
    });

    console.log("✅ Submenu lateral do Caixa configurado com sucesso!");
  } else {
    console.error("❌ Elementos do submenu lateral Caixa não encontrados");
    console.log(
      "- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML",
    );
    console.log(
      "- Verifique se a classe .submenu-item-with-lateral existe no HTML",
    );
  }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();
  }, 200);
});

// ==========================================
// FUNCIONALIDADES DA PÁGINA CATEGORIA FINANCEIRA
// ==========================================

let _cfDados = []; // cache em memória
let _cfFiltro = ""; // termo de busca atual

document.addEventListener("DOMContentLoaded", function () {
  inicializarCategoriaFinanceira();
});

async function inicializarCategoriaFinanceira() {
  // Botões adicionar
  document
    .querySelector(".btn-adicionar-categoria")
    ?.addEventListener("click", () => abrirModalCategoria());
  document
    .querySelector(".btn-floating-add")
    ?.addEventListener("click", () => abrirModalCategoria());

  // Pesquisa
  const inp = document.getElementById("searchCategoriaFinanceira");
  const btnP = document.querySelector(".btn-pesquisar");
  if (inp) {
    inp.addEventListener("input", () => {
      _cfFiltro = inp.value;
      renderizarTabela();
    });
    inp.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        _cfFiltro = inp.value;
        renderizarTabela();
      }
    });
  }
  if (btnP)
    btnP.addEventListener("click", () => {
      _cfFiltro = inp ? inp.value : "";
      renderizarTabela();
    });

  await carregarCategorias();
}

async function carregarCategorias() {
  try {
    const res = await fetch("/api/categorias-financeiras");
    if (!res.ok) throw new Error("Falha ao carregar");
    _cfDados = await res.json();
    renderizarTabela();
  } catch (e) {
    console.error("Erro ao carregar categorias:", e);
    const tbody = document.getElementById("categoriasTableBody");
    if (tbody)
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#e74c3c;">Erro ao carregar dados.</td></tr>';
  }
}

function renderizarTabela() {
  const tbody = document.getElementById("categoriasTableBody");
  if (!tbody) return;

  const termo = (_cfFiltro || "").toLowerCase().trim();
  const dados = termo
    ? _cfDados.filter(
        (c) =>
          c.descricao.toLowerCase().includes(termo) ||
          c.tipo.toLowerCase().includes(termo),
      )
    : _cfDados;

  if (dados.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa;">Nenhuma categoria encontrada.</td></tr>';
    _atualizarContador(0, 0);
    return;
  }

  tbody.innerHTML = dados
    .map(
      (c) => `
        <tr data-id="${c.id}">
            <td>${_esc(c.descricao)}</td>
            <td>${_esc(c.tipo)}</td>
            <td>
                ${
                  c.ativo
                    ? '<span class="status-ativo"><i class="fas fa-check"></i></span>'
                    : '<span class="status-inativo" style="color:#aaa;"><i class="fas fa-times"></i></span>'
                }
            </td>
            <td>
                <button class="btn-action btn-edit" data-id="${c.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>
                <button class="btn-action btn-delete" data-id="${c.id}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("");

  tbody.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () =>
      abrirModalCategoria(parseInt(btn.dataset.id)),
    );
  });
  tbody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () =>
      confirmarExcluir(parseInt(btn.dataset.id)),
    );
  });

  _atualizarContador(dados.length, _cfDados.length);
}

function _atualizarContador(exibidos, total) {
  const el = document.querySelector(".page-info");
  if (el)
    el.textContent =
      exibidos === total
        ? `1 - ${total} de ${total}`
        : `${exibidos} de ${total}`;
}

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- MODAL ADICIONAR / EDITAR ----

function abrirModalCategoria(id = null) {
  const cat = id ? _cfDados.find((c) => c.id === id) : null;
  const titulo = cat
    ? "Editar Categoria Financeira"
    : "Nova Categoria Financeira";

  const overlay = document.createElement("div");
  overlay.id = "cfModalOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;";

  overlay.innerHTML = `
        <div style="background:#fff;border-radius:10px;width:420px;max-width:95vw;padding:28px 28px 20px;box-shadow:0 8px 32px rgba(0,0,0,.18);position:relative;">
            <h3 style="margin:0 0 22px;font-size:17px;font-weight:600;color:#222;">${titulo}</h3>
            <div style="margin-bottom:18px;">
                <label style="display:block;font-size:12px;color:#888;margin-bottom:5px;">Descrição *</label>
                <input id="cfInputDesc" type="text" value="${_esc(cat?.descricao ?? "")}"
                    placeholder="Ex: Energia Elétrica"
                    style="width:100%;box-sizing:border-box;border:none;border-bottom:2px solid #ccc;outline:none;padding:6px 2px;font-size:14px;transition:border-color .2s;"
                    onfocus="this.style.borderBottomColor='#2ecc71'" onblur="this.style.borderBottomColor='#ccc'">
            </div>
            <div style="margin-bottom:18px;">
                <label style="display:block;font-size:12px;color:#888;margin-bottom:5px;">Tipo *</label>
                <select id="cfSelectTipo"
                    style="width:100%;box-sizing:border-box;border:none;border-bottom:2px solid #ccc;outline:none;padding:6px 2px;font-size:14px;background:transparent;cursor:pointer;"
                    onfocus="this.style.borderBottomColor='#2ecc71'" onblur="this.style.borderBottomColor='#ccc'">
                    <option value="">Selecione...</option>
                    <option value="CUSTO" ${cat?.tipo === "CUSTO" ? "selected" : ""}>Custo</option>
                    <option value="DESPESA" ${cat?.tipo === "DESPESA" ? "selected" : ""}>Despesa</option>
                    <option value="INVESTIMENTO" ${cat?.tipo === "INVESTIMENTO" ? "selected" : ""}>Investimento</option>
                    <option value="RECEITA" ${cat?.tipo === "RECEITA" ? "selected" : ""}>Receita</option>
                </select>
            </div>
            <div style="margin-bottom:24px;display:flex;align-items:center;gap:12px;">
                <label style="font-size:13px;color:#555;">Ativo</label>
                <label style="position:relative;display:inline-block;width:44px;height:24px;">
                    <input type="checkbox" id="cfToggleAtivo" ${(cat ? cat.ativo : true) ? "checked" : ""} style="opacity:0;width:0;height:0;">
                    <span id="cfToggleSlider" style="position:absolute;cursor:pointer;inset:0;background:${(cat ? cat.ativo : true) ? "#1abc9c" : "#ccc"};border-radius:24px;transition:background .3s;">
                        <span style="position:absolute;height:18px;width:18px;left:${(cat ? cat.ativo : true) ? "23px" : "3px"};bottom:3px;background:#fff;border-radius:50%;transition:left .3s;display:block;" id="cfToggleThumb"></span>
                    </span>
                </label>
            </div>
            <div id="cfErro" style="color:#e74c3c;font-size:12px;margin-bottom:10px;display:none;"></div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="cfBtnCancelar" style="padding:9px 22px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;color:#555;">Cancelar</button>
                <button id="cfBtnSalvar" style="padding:9px 22px;border:none;border-radius:6px;background:#2ecc71;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">Salvar</button>
            </div>
        </div>
    `;

  document.body.appendChild(overlay);

  // Toggle ativo animado
  const chk = overlay.querySelector("#cfToggleAtivo");
  const slider = overlay.querySelector("#cfToggleSlider");
  const thumb = overlay.querySelector("#cfToggleThumb");
  chk.addEventListener("change", () => {
    slider.style.background = chk.checked ? "#1abc9c" : "#ccc";
    thumb.style.left = chk.checked ? "23px" : "3px";
  });

  const fechar = () => overlay.remove();
  overlay.querySelector("#cfBtnCancelar").addEventListener("click", fechar);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });

  overlay.querySelector("#cfBtnSalvar").addEventListener("click", async () => {
    const descricao = document.getElementById("cfInputDesc").value.trim();
    const tipo = document.getElementById("cfSelectTipo").value;
    const ativo = document.getElementById("cfToggleAtivo").checked;
    const erroEl = document.getElementById("cfErro");

    if (!descricao) {
      erroEl.textContent = "Descrição é obrigatória.";
      erroEl.style.display = "block";
      return;
    }
    if (!tipo) {
      erroEl.textContent = "Selecione um tipo.";
      erroEl.style.display = "block";
      return;
    }
    erroEl.style.display = "none";

    const btn = overlay.querySelector("#cfBtnSalvar");
    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
      const url = cat
        ? `/api/categorias-financeiras/${cat.id}`
        : "/api/categorias-financeiras";
      const method = cat ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao, tipo, ativo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao salvar");
      }
      fechar();
      await carregarCategorias();
      _mostrarToast(
        cat ? "Categoria atualizada!" : "Categoria criada!",
        "success",
      );
    } catch (e) {
      erroEl.textContent = e.message;
      erroEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Salvar";
    }
  });

  setTimeout(() => document.getElementById("cfInputDesc")?.focus(), 80);
}

// ---- MODAL EXCLUIR ----

function confirmarExcluir(id) {
  const cat = _cfDados.find((c) => c.id === id);
  if (!cat) return;

  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9100;display:flex;align-items:center;justify-content:center;";
  overlay.innerHTML = `
        <div style="background:#fff;border-radius:10px;width:360px;max-width:95vw;padding:28px;box-shadow:0 8px 32px rgba(0,0,0,.18);">
            <h3 style="margin:0 0 10px;font-size:17px;color:#222;">Excluir categoria</h3>
            <p style="margin:0 0 22px;font-size:14px;color:#555;">Tem certeza que deseja excluir <strong>${_esc(cat.descricao)}</strong>?<br>Esta ação não pode ser desfeita.</p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="cfDelCancelar" style="padding:9px 22px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;color:#555;">Cancelar</button>
                <button id="cfDelConfirmar" style="padding:9px 22px;border:none;border-radius:6px;background:#e74c3c;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">Excluir</button>
            </div>
        </div>
    `;
  document.body.appendChild(overlay);

  const fechar = () => overlay.remove();
  overlay.querySelector("#cfDelCancelar").addEventListener("click", fechar);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });

  overlay
    .querySelector("#cfDelConfirmar")
    .addEventListener("click", async () => {
      const btn = overlay.querySelector("#cfDelConfirmar");
      btn.disabled = true;
      btn.textContent = "Excluindo...";
      try {
        const res = await fetch(`/api/categorias-financeiras/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Erro ao excluir");
        fechar();
        await carregarCategorias();
        _mostrarToast("Categoria excluída!", "success");
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Excluir";
        _mostrarToast("Erro ao excluir categoria.", "error");
      }
    });
}

// ---- TOAST ----

function _mostrarToast(msg, tipo = "success") {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:8px;font-size:14px;color:#fff;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.18);background:${tipo === "success" ? "#2ecc71" : "#e74c3c"};opacity:0;transition:opacity .25s;`;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 2800);
}
