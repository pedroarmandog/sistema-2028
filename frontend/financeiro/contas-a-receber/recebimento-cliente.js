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

// ==================== RECEBIMENTOS ====================

// ── Estado global ─────────────────────────────────────────────────────────────
let todosDocumentos = []; // documentos pendentes/parciais
let todosHistorico = []; // documentos pagos
let filteredDocumentos = []; // documentos após filtro
let documentosSelecionados = [];
let clientesCache = [];
let categoriasCache = [];
let tabAtual = "documentos";

const API_BASE =
  typeof window !== "undefined" && window.API_URL ? window.API_URL : "";

// ── Utilitários ───────────────────────────────────────────────────────────────
function fmtVal(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmtData(d) {
  if (!d) return "-";
  try {
    const [y, m, dia] = String(d).split("T")[0].split("-");
    return `${dia}/${m}/${y}`;
  } catch {
    return d;
  }
}
function statusBadge(status) {
  const map = {
    pendente: { bg: "#fff3e0", color: "#e65100", label: "Pendente" },
    parcial: { bg: "#e8f5e9", color: "#2e7d32", label: "Parcial" },
    pago: { bg: "#e3f2fd", color: "#1565c0", label: "Pago" },
    cancelado: { bg: "#fce4ec", color: "#b71c1c", label: "Cancelado" },
  };
  const s = (status || "pendente").toLowerCase();
  const cfg = map[s] || { bg: "#f5f5f5", color: "#555", label: status };
  return `<span style="background:${cfg.bg};color:${cfg.color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${cfg.label}</span>`;
}
function mostrarToast(msg, tipo = "success") {
  const cor =
    tipo === "error" ? "#d32f2f" : tipo === "info" ? "#1565c0" : "#2e7d32";
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:28px;right:28px;background:${cor};color:#fff;padding:13px 22px;border-radius:10px;font-size:14px;font-weight:600;z-index:999999;box-shadow:0 4px 14px rgba(0,0,0,0.25);opacity:0;transition:opacity 0.3s;`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ── Carregamento de dados ─────────────────────────────────────────────────────
async function carregarDocumentos() {
  try {
    const clienteNome = (
      document.getElementById("filtroCliente")?.value || ""
    ).trim();
    const params = new URLSearchParams({
      status: "pendente,parcial",
      limit: "500",
    });
    if (clienteNome) params.set("clienteNome", clienteNome);

    const res = await fetch(`${API_BASE}/api/contas-receber?${params}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    todosDocumentos = Array.isArray(data) ? data : [];
    filteredDocumentos = [...todosDocumentos];
    aplicarFiltros();
  } catch (e) {
    console.error("[recebimento-cliente] Erro ao carregar documentos:", e);
    mostrarToast(
      "Erro ao carregar documentos. Verifique sua conexão.",
      "error",
    );
  }
}

async function carregarHistorico() {
  try {
    const clienteNome = (
      document.getElementById("filtroCliente")?.value || ""
    ).trim();
    const params = new URLSearchParams({ status: "pago", limit: "500" });
    if (clienteNome) params.set("clienteNome", clienteNome);

    const res = await fetch(`${API_BASE}/api/contas-receber?${params}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    todosHistorico = Array.isArray(data) ? data : [];
    renderizarTabelaHistorico();
  } catch (e) {
    console.error("[recebimento-cliente] Erro ao carregar histórico:", e);
  }
}

async function carregarClientes() {
  try {
    const res = await fetch(`${API_BASE}/api/clientes?limit=500`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    // API retorna { success: true, clientes: [...] }
    clientesCache = Array.isArray(data)
      ? data
      : Array.isArray(data.clientes)
        ? data.clientes
        : Array.isArray(data.rows)
          ? data.rows
          : [];
    console.log(
      "[recebimento-cliente] Clientes carregados:",
      clientesCache.length,
    );
  } catch (e) {
    console.warn("[recebimento-cliente] Aviso ao carregar clientes:", e);
  }
}

async function carregarCategorias() {
  try {
    const res = await fetch(`${API_BASE}/api/categorias-financeiras`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    categoriasCache = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("[recebimento-cliente] Aviso ao carregar categorias:", e);
  }
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function aplicarFiltros() {
  const clienteNome = (document.getElementById("filtroCliente")?.value || "")
    .trim()
    .toLowerCase();
  const documento = (document.getElementById("filtroDocumento")?.value || "")
    .trim()
    .toLowerCase();
  const nota = (document.getElementById("filtroNota")?.value || "")
    .trim()
    .toLowerCase();
  const dataVenc = (
    document.getElementById("filtroDataVencimento")?.value || ""
  ).trim();
  const previsao = document.getElementById("filtroPrevisao")?.value || "todos";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d7 = new Date(hoje);
  d7.setDate(hoje.getDate() + 7);
  const d30 = new Date(hoje);
  d30.setDate(hoje.getDate() + 30);

  filteredDocumentos = todosDocumentos.filter((doc) => {
    if (
      clienteNome &&
      !(doc.clienteNome || "").toLowerCase().includes(clienteNome)
    )
      return false;
    if (documento && !String(doc.id || "").includes(documento)) return false;
    if (nota && !(doc.descricao || "").toLowerCase().includes(nota))
      return false;
    if (dataVenc && (doc.dataVencimento || "").split("T")[0] !== dataVenc)
      return false;
    if (previsao !== "todos" && doc.dataVencimento) {
      try {
        const dv = new Date(doc.dataVencimento + "T00:00:00");
        if (previsao === "atrasado" && dv >= hoje) return false;
        if (previsao === "hoje" && dv.toDateString() !== hoje.toDateString())
          return false;
        if (previsao === "proximos7" && (dv < hoje || dv > d7)) return false;
        if (previsao === "proximos30" && (dv < hoje || dv > d30)) return false;
      } catch (_) {}
    }
    return true;
  });

  documentosSelecionados = [];
  renderizarTabelaRecebimentos();
}

// ── Renderização da tabela ────────────────────────────────────────────────────
function renderizarTabelaRecebimentos() {
  const tbody = document.getElementById("tabelaRecebimentosBody");
  if (!tbody) return;

  if (!filteredDocumentos || filteredDocumentos.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="13">
          <div class="empty-message">
            <i class="fas fa-inbox"></i>
            <p>Nenhum documento a receber encontrado</p>
            <p class="empty-subtitle">Crie um novo documento ou ajuste os filtros</p>
          </div>
        </td>
      </tr>`;
    atualizarValorReceber(0);
    return;
  }

  tbody.innerHTML = filteredDocumentos
    .map((doc) => {
      const saldo = Math.max(
        0,
        parseFloat(doc.valor || 0) - parseFloat(doc.valorPago || 0),
      );
      const parc =
        doc.parcelas > 1 ? `${doc.parcelaNumero}/${doc.parcelas}` : "1/1";
      const isAtrasado =
        doc.dataVencimento &&
        new Date(doc.dataVencimento + "T00:00:00") < new Date() &&
        doc.status !== "pago";
      return `
      <tr style="${isAtrasado ? "background:#fff8f0;" : ""}">
        <td><input type="checkbox" class="checkbox-documento" data-id="${doc.id}"></td>
        <td>${String(doc.id).padStart(4, "0")}/${parc}</td>
        <td>${fmtData(doc.dataEmissao)}</td>
        <td style="${isAtrasado ? "color:#e65100;font-weight:600;" : ""}">${fmtData(doc.dataVencimento)}</td>
        <td>${doc.clienteNome || "-"}</td>
        <td>${doc.descricao || "-"}</td>
        <td>R$ ${fmtVal(doc.valor)}</td>
        <td>R$ 0,00</td>
        <td>R$ 0,00</td>
        <td>R$ ${fmtVal(saldo)}</td>
        <td>${statusBadge(doc.status)}</td>
        <td>R$ <strong>${fmtVal(saldo)}</strong></td>
        <td>
          <button class="btn-opcoes-doc" onclick="abrirMenuOpcoes(${doc.id}, this)" title="Opções">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </td>
      </tr>`;
    })
    .join("");

  configurarCheckboxes();
  calcularTotalReceber();
}

function renderizarTabelaHistorico() {
  const tbody = document.getElementById("tabelaRecebimentosBody");
  if (!tbody) return;
  if (!todosHistorico || todosHistorico.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state"><td colspan="13">
        <div class="empty-message"><i class="fas fa-history"></i><p>Nenhum histórico encontrado</p></div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = todosHistorico
    .map(
      (doc) => `
    <tr>
      <td><input type="checkbox" class="checkbox-documento" data-id="${doc.id}" disabled></td>
      <td>${String(doc.id).padStart(4, "0")}</td>
      <td>${fmtData(doc.dataEmissao)}</td>
      <td>${fmtData(doc.dataVencimento)}</td>
      <td>${doc.clienteNome || "-"}</td>
      <td>${doc.descricao || "-"}</td>
      <td>R$ ${fmtVal(doc.valor)}</td>
      <td>R$ 0,00</td><td>R$ 0,00</td>
      <td>R$ ${fmtVal(doc.valorPago)}</td>
      <td>${statusBadge(doc.status)}</td>
      <td>R$ <strong>${fmtVal(doc.valorPago)}</strong></td>
      <td>
        <button onclick="excluirDocumentoHistorico(${doc.id})" title="Excluir" style="background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;color:#d32f2f;font-size:15px;" onmouseenter="this.style.background='#fdecea'" onmouseleave="this.style.background='none'">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>`,
    )
    .join("");
}

// ── Valores totais ────────────────────────────────────────────────────────────
function calcularTotalReceber() {
  const total = filteredDocumentos.reduce(
    (s, d) =>
      s + Math.max(0, parseFloat(d.valor || 0) - parseFloat(d.valorPago || 0)),
    0,
  );
  atualizarValorReceber(total);
}
function atualizarValorReceber(v) {
  const el = document.getElementById("valorReceber");
  if (el) el.textContent = `R$ ${fmtVal(v)}`;
}

// ── Checkboxes ────────────────────────────────────────────────────────────────
function configurarCheckboxes() {
  const cbAll = document.getElementById("checkboxSelectAll");
  const cbs = document.querySelectorAll(".checkbox-documento:not([disabled])");
  if (cbAll) {
    cbAll.addEventListener("change", function () {
      cbs.forEach((cb) => {
        cb.checked = this.checked;
      });
      atualizarSelecionados();
    });
  }
  cbs.forEach((cb) =>
    cb.addEventListener("change", () => {
      atualizarSelecionados();
      if (cbAll) cbAll.checked = Array.from(cbs).every((c) => c.checked);
    }),
  );
}
function atualizarSelecionados() {
  documentosSelecionados = Array.from(
    document.querySelectorAll(".checkbox-documento:checked"),
  ).map((c) => c.dataset.id);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function configurarTabs() {
  document.querySelectorAll(".tab-item").forEach((tab) => {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".tab-item")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      tabAtual = this.getAttribute("data-tab");
      if (tabAtual === "documentos") {
        carregarDocumentos();
      } else if (tabAtual === "historico") {
        carregarHistorico();
      } else {
        const tbody = document.getElementById("tabelaRecebimentosBody");
        if (tbody)
          tbody.innerHTML = `
          <tr class="empty-state"><td colspan="13">
            <div class="empty-message"><i class="fas fa-sync-alt"></i><p>Sem renegociações</p></div>
          </td></tr>`;
      }
    });
  });
}

// ── Menu de opções do documento ───────────────────────────────────────────────
function abrirMenuOpcoes(id, btn) {
  document
    .querySelectorAll(".menu-opcoes-flutuante")
    .forEach((m) => m.remove());
  const menu = document.createElement("div");
  menu.className = "menu-opcoes-flutuante";
  menu.style.cssText =
    "position:fixed;background:#fff;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:99990;min-width:180px;overflow:hidden;";
  menu.innerHTML = `
    <div class="op-item" onclick="abrirModalReceber(${id})" style="padding:11px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:14px;color:#333;hover:background:#f5f5f5;">
      <i class="fas fa-check-circle" style="color:#2e7d32;"></i> Receber
    </div>
    <div class="op-item" onclick="excluirDocumento(${id})" style="padding:11px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:14px;color:#d32f2f;">
      <i class="fas fa-trash"></i> Excluir
    </div>`;
  menu.querySelectorAll(".op-item").forEach((el) => {
    el.addEventListener("mouseenter", () => (el.style.background = "#f5f5f5"));
    el.addEventListener("mouseleave", () => (el.style.background = ""));
  });
  const rect = btn.getBoundingClientRect();
  menu.style.top = rect.bottom + 4 + "px";
  menu.style.left = rect.left - 140 + "px";
  document.body.appendChild(menu);
  setTimeout(
    () =>
      document.addEventListener("click", () => menu.remove(), { once: true }),
    10,
  );
}

// ── Modal: Receber documento ──────────────────────────────────────────────────
function abrirModalReceber(id) {
  document
    .querySelectorAll(".modal-receber-overlay")
    .forEach((m) => m.remove());
  const doc = todosDocumentos.find((d) => d.id == id);
  if (!doc) {
    mostrarToast("Documento não encontrado", "error");
    return;
  }
  const saldo = Math.max(
    0,
    parseFloat(doc.valor || 0) - parseFloat(doc.valorPago || 0),
  );

  const overlay = document.createElement("div");
  overlay.className = "modal-receber-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99998;display:flex;align-items:center;justify-content:center;";
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:2px solid #1976d2;width:95%;max-width:460px;overflow:hidden;">
      <div style="background:#1976d2;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#fff;font-size:16px;font-weight:600;"><i class="fas fa-hand-holding-usd" style="margin-right:8px;"></i>Receber Documento</span>
        <button id="mrFechar" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;">×</button>
      </div>
      <div style="padding:22px 26px;">
        <p style="margin:0 0 16px;color:#555;font-size:14px;">
          Cliente: <strong>${doc.clienteNome || "N/D"}</strong> &nbsp;|&nbsp; Saldo: <strong style="color:#2e7d32;">R$ ${fmtVal(saldo)}</strong>
        </p>
        <div style="margin-bottom:14px;">
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Valor a Receber *</label>
          <input type="number" id="mrValor" value="${saldo.toFixed(2)}" step="0.01" min="0.01"
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
        <div style="margin-bottom:14px;">
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Data do Recebimento</label>
          <input type="date" id="mrData" value="${new Date().toISOString().split("T")[0]}"
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
        <div style="margin-bottom:20px;">
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Forma de Pagamento</label>
          <select id="mrForma" style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
            <option value="">Selecione</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Boleto">Boleto</option>
            <option value="Transferência">Transferência Bancária</option>
          </select>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button id="mrCancelar" style="padding:11px 22px;border:2px solid #e0e0e0;background:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#555;">Cancelar</button>
          <button id="mrConfirmar" style="padding:11px 22px;background:#2e7d32;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;">
            <i class="fas fa-check"></i> Confirmar Recebimento
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const fechar = () => overlay.remove();
  overlay.querySelector("#mrFechar").addEventListener("click", fechar);
  overlay.querySelector("#mrCancelar").addEventListener("click", fechar);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });

  overlay.querySelector("#mrConfirmar").addEventListener("click", async () => {
    const valorRecebido = parseFloat(
      overlay.querySelector("#mrValor").value || "0",
    );
    const dataPagamento = overlay.querySelector("#mrData").value;
    const formaPagamento = overlay.querySelector("#mrForma").value;
    if (valorRecebido <= 0) {
      mostrarToast("Informe um valor válido", "error");
      return;
    }

    const btn = overlay.querySelector("#mrConfirmar");
    btn.disabled = true;
    btn.textContent = "Salvando...";
    try {
      const res = await fetch(`${API_BASE}/api/contas-receber/${id}/receber`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorRecebido, dataPagamento, formaPagamento }),
      });
      if (!res.ok) throw new Error("status " + res.status);
      mostrarToast("Recebimento registrado com sucesso!");
      fechar();
      await carregarDocumentos();
    } catch (e) {
      console.error("[modalReceber] Erro:", e);
      mostrarToast("Erro ao registrar recebimento", "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Recebimento';
    }
  });
}

// ── Modal de confirmação no estilo do sistema ────────────────────────────────
function confirmarModal({
  titulo,
  mensagem,
  textoBotaoOk = "Confirmar",
  corHeader = "#1976d2",
  iconeHeader = "fa-question-circle",
}) {
  return new Promise((resolve) => {
    document
      .querySelectorAll(".modal-confirmar-overlay")
      .forEach((m) => m.remove());
    const overlay = document.createElement("div");
    overlay.className = "modal-confirmar-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:2px solid ${corHeader};width:95%;max-width:420px;overflow:hidden;">
        <div style="background:${corHeader};padding:16px 22px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#fff;font-size:16px;font-weight:600;"><i class="fas ${iconeHeader}" style="margin-right:8px;"></i>${titulo}</span>
          <button class="mc-fechar" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;">×</button>
        </div>
        <div style="padding:22px 26px;">
          <p style="margin:0 0 22px;color:#555;font-size:14px;line-height:1.6;">${mensagem}</p>
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button class="mc-cancelar" style="padding:11px 22px;border:2px solid #e0e0e0;background:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#555;">Cancelar</button>
            <button class="mc-confirmar" style="padding:11px 22px;background:${corHeader};border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;">${textoBotaoOk}</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const fechar = (val) => {
      overlay.remove();
      resolve(val);
    };
    overlay
      .querySelector(".mc-fechar")
      .addEventListener("click", () => fechar(false));
    overlay
      .querySelector(".mc-cancelar")
      .addEventListener("click", () => fechar(false));
    overlay
      .querySelector(".mc-confirmar")
      .addEventListener("click", () => fechar(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) fechar(false);
    });
  });
}

// ── Excluir documento ─────────────────────────────────────────────────────────
async function excluirDocumento(id) {
  if (
    !(await confirmarModal({
      titulo: "Excluir Documento",
      mensagem: "Deseja realmente excluir este documento a receber?",
      textoBotaoOk: "Excluir",
      corHeader: "#d32f2f",
      iconeHeader: "fa-trash",
    }))
  )
    return;
  try {
    const res = await fetch(`${API_BASE}/api/contas-receber/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("status " + res.status);
    mostrarToast("Documento excluído com sucesso!");
    await carregarDocumentos();
  } catch (e) {
    console.error("[excluirDocumento] Erro:", e);
    mostrarToast("Erro ao excluir documento", "error");
  }
}

async function excluirDocumentoHistorico(id) {
  if (
    !(await confirmarModal({
      titulo: "Excluir Recebimento",
      mensagem: "Deseja realmente excluir este recebimento do histórico?",
      textoBotaoOk: "Excluir",
      corHeader: "#d32f2f",
      iconeHeader: "fa-trash",
    }))
  )
    return;
  try {
    const res = await fetch(`${API_BASE}/api/contas-receber/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("status " + res.status);
    mostrarToast("Recebimento excluído com sucesso!");
    await carregarHistorico();
  } catch (e) {
    console.error("[excluirDocumentoHistorico] Erro:", e);
    mostrarToast("Erro ao excluir recebimento", "error");
  }
}

// ── Modal: Novo Documento a Receber ──────────────────────────────────────────
function abrirModalNovoDocReceber() {
  document
    .querySelectorAll(".modal-novo-doc-overlay")
    .forEach((m) => m.remove());
  const hoje = new Date().toISOString().split("T")[0];

  const opsCat = [
    "",
    ...categoriasCache.map((c) => c.descricao || c.nome || ""),
  ]
    .map(
      (c, i) =>
        `<option value="${c}">${i === 0 ? "Selecione uma categoria" : c}</option>`,
    )
    .join("");

  const overlay = document.createElement("div");
  overlay.className = "modal-novo-doc-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99998;display:flex;align-items:center;justify-content:center;overflow-y:auto;";

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:2px solid #1976d2;width:95%;max-width:640px;margin:20px auto;overflow:hidden;">
      <div style="background:#1976d2;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="fas fa-file-invoice-dollar" style="color:#fff;font-size:18px;"></i>
          <span style="color:#fff;font-size:16px;font-weight:600;">Novo Documento a Receber</span>
        </div>
        <button id="ndFechar" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
      </div>

      <div style="padding:22px 26px;max-height:75vh;overflow-y:auto;">

        <!-- Cliente -->
        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Cliente</label>
          <div style="position:relative;margin-top:6px;">
            <input type="text" id="ndCliente" autocomplete="off" placeholder="Busque pelo nome do cliente"
              style="width:100%;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
              onfocus="this.style.borderColor='#1976d2'" onblur="setTimeout(()=>this.style.borderColor='#e0e0e0',200)">
            <input type="hidden" id="ndClienteId">
            <div id="ndClienteDD" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #dce1e7;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.12);z-index:9999;max-height:180px;overflow-y:auto;"></div>
          </div>
        </div>

        <!-- Descrição -->
        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Descrição</label>
          <input type="text" id="ndDescricao" placeholder="Descrição do documento"
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
        </div>

        <!-- Categoria -->
        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Categoria</label>
          <select id="ndCategoria" style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
            ${opsCat}
          </select>
        </div>

        <!-- Valor / Parcelas / Emissão / Vencimento -->
        <div style="display:grid;grid-template-columns:1fr 80px 1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Valor *</label>
            <input type="number" id="ndValor" step="0.01" min="0.01" placeholder="0,00"
              style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Parcelas</label>
            <input type="number" id="ndParcelas" value="1" min="1" step="1"
              style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Emissão</label>
            <input type="date" id="ndEmissao" value="${hoje}"
              style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Vencimento *</label>
            <input type="date" id="ndVencimento" value="${hoje}"
              style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
          </div>
        </div>

        <!-- Forma de pagamento / Status -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Forma de Pagamento</label>
            <select id="ndFormaPagamento" style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
              <option value="">Selecione</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência">Transferência Bancária</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Status</label>
            <select id="ndStatus" style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
              <option value="pendente" selected>Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Pago</option>
            </select>
          </div>
        </div>

        <!-- Observações -->
        <div style="margin-bottom:20px;">
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Observações</label>
          <textarea id="ndObservacoes" rows="3" placeholder="Observações sobre este documento..."
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;resize:vertical;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'"></textarea>
        </div>

        <!-- Ações -->
        <div style="display:flex;gap:12px;justify-content:flex-end;border-top:1px solid #f0f0f0;padding-top:16px;">
          <button id="ndCancelar" style="padding:11px 22px;border:2px solid #e0e0e0;background:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#555;">
            Cancelar
          </button>
          <button id="ndSalvar" style="padding:11px 22px;background:#1976d2;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;">
            <i class="fas fa-save"></i> Salvar Documento
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Fechar modal
  let fechar = () => overlay.remove();
  overlay.querySelector("#ndFechar").addEventListener("click", () => fechar());
  overlay
    .querySelector("#ndCancelar")
    .addEventListener("click", () => fechar());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });

  // Autocomplete de clientes
  const inputCliente = overlay.querySelector("#ndCliente");
  const inputClienteId = overlay.querySelector("#ndClienteId");
  const ddCliente = overlay.querySelector("#ndClienteDD");
  // Mover ddCliente para document.body para evitar clipping do overflow-y:auto do modal
  document.body.appendChild(ddCliente);

  function posicionarDD() {
    const rect = inputCliente.getBoundingClientRect();
    ddCliente.style.top = rect.bottom + window.scrollY + "px";
    ddCliente.style.left = rect.left + window.scrollX + "px";
    ddCliente.style.width = rect.width + "px";
  }

  function showClientDD(itens) {
    ddCliente.innerHTML = "";
    if (!itens || !itens.length) {
      ddCliente.style.display = "none";
      return;
    }
    // position:fixed via body para não ser cortado pelo overflow do modal
    ddCliente.style.cssText = [
      "position:absolute",
      "background:#fff",
      "border:1px solid #dce1e7",
      "border-radius:6px",
      "box-shadow:0 4px 14px rgba(0,0,0,0.15)",
      "z-index:999999",
      "max-height:200px",
      "overflow-y:auto",
      "display:block",
    ].join(";");
    posicionarDD();
    itens.slice(0, 60).forEach((c) => {
      const item = document.createElement("div");
      item.style.cssText =
        "padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      item.textContent = c.nome || c.nomeCompleto || `Cliente #${c.id}`;
      item.addEventListener(
        "mouseenter",
        () => (item.style.background = "#f5f5f5"),
      );
      item.addEventListener("mouseleave", () => (item.style.background = ""));
      item.addEventListener("mousedown", (ev) => {
        ev.preventDefault(); // evita blur antes do click
        inputCliente.value = item.textContent;
        inputClienteId.value = c.id;
        ddCliente.style.display = "none";
      });
      ddCliente.appendChild(item);
    });
  }

  function ocultarDD() {
    ddCliente.style.display = "none";
  }

  inputCliente.addEventListener("input", () => {
    const q = inputCliente.value.trim().toLowerCase();
    const fil = q
      ? clientesCache.filter((c) =>
          (c.nome || c.nomeCompleto || "").toLowerCase().includes(q),
        )
      : clientesCache;
    showClientDD(fil);
    if (!q) inputClienteId.value = "";
  });
  inputCliente.addEventListener("focus", () => showClientDD(clientesCache));
  inputCliente.addEventListener("blur", () => setTimeout(ocultarDD, 150));

  // Limpar ddCliente quando modal fechar
  const _fecharOriginal = fechar;
  fechar = () => {
    ddCliente.remove();
    _fecharOriginal();
  };

  // Salvar
  overlay.querySelector("#ndSalvar").addEventListener("click", async () => {
    const valor = parseFloat(overlay.querySelector("#ndValor").value || "0");
    const vencimento = overlay.querySelector("#ndVencimento").value;
    if (!valor || valor <= 0) {
      mostrarToast("Informe um valor válido", "error");
      return;
    }
    if (!vencimento) {
      mostrarToast("Informe a data de vencimento", "error");
      return;
    }

    const payload = {
      clienteId: overlay.querySelector("#ndClienteId").value || null,
      clienteNome: overlay.querySelector("#ndCliente").value.trim() || null,
      descricao: overlay.querySelector("#ndDescricao").value.trim() || null,
      categoria: overlay.querySelector("#ndCategoria").value || null,
      valor,
      dataEmissao:
        overlay.querySelector("#ndEmissao").value ||
        new Date().toISOString().split("T")[0],
      dataVencimento: vencimento,
      formaPagamento: overlay.querySelector("#ndFormaPagamento").value || null,
      status: overlay.querySelector("#ndStatus").value || "pendente",
      observacoes: overlay.querySelector("#ndObservacoes").value.trim() || null,
      parcelas: parseInt(overlay.querySelector("#ndParcelas").value || "1", 10),
    };

    const btn = overlay.querySelector("#ndSalvar");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
      const res = await fetch(`${API_BASE}/api/contas-receber`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "status " + res.status);
      }
      mostrarToast("Documento a receber criado com sucesso!");
      fechar();
      await carregarDocumentos();
    } catch (e) {
      console.error("[modalNovoDoc] Erro:", e);
      mostrarToast("Erro ao salvar: " + e.message, "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Salvar Documento';
    }
  });
}

// ── Event listeners principais ────────────────────────────────────────────────
function configurarEventListeners() {
  // Botão "Doc. Receber"
  const btnDocReceber = document.getElementById("btnDocReceber");
  if (btnDocReceber)
    btnDocReceber.addEventListener("click", abrirModalNovoDocReceber);

  // Botão Pesquisar
  const btnPesquisar = document.getElementById("btnPesquisar");
  if (btnPesquisar)
    btnPesquisar.addEventListener("click", () => {
      if (tabAtual === "historico") carregarHistorico();
      else carregarDocumentos();
    });

  // Enter nos campos de filtro
  ["filtroCliente", "filtroDocumento", "filtroNota"].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
      el.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          if (tabAtual === "historico") carregarHistorico();
          else carregarDocumentos();
        }
      });
    if (el && id === "filtroCliente") {
      el.addEventListener("input", () => {
        if (!el.value.trim()) aplicarFiltros();
      });
    }
  });

  // Botão Receber (rodapé)
  const btnReceber = document.getElementById("btnReceber");
  if (btnReceber)
    btnReceber.addEventListener("click", async () => {
      if (!documentosSelecionados.length) {
        mostrarToast("Selecione ao menos um documento para receber", "info");
        return;
      }
      if (documentosSelecionados.length === 1) {
        abrirModalReceber(documentosSelecionados[0]);
        return;
      }
      if (
        !(await confirmarModal({
          titulo: "Confirmar Recebimento",
          mensagem: `Receber <strong>${documentosSelecionados.length}</strong> documento(s) pelo valor total?`,
          textoBotaoOk: "Receber",
          corHeader: "#1976d2",
          iconeHeader: "fa-check-circle",
        }))
      )
        return;
      let erros = 0;
      for (const id of documentosSelecionados) {
        try {
          await fetch(`${API_BASE}/api/contas-receber/${id}/receber`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              valorRecebido: parseFloat(
                todosDocumentos.find((d) => d.id == id)?.valor || 0,
              ),
              dataPagamento: new Date().toISOString().split("T")[0],
            }),
          });
        } catch (_) {
          erros++;
        }
      }
      if (erros)
        mostrarToast(`${erros} erro(s) ao processar recebimentos`, "error");
      else
        mostrarToast(
          `${documentosSelecionados.length} documento(s) recebidos!`,
        );
      await carregarDocumentos();
    });

  // Botão Limpar
  const btnLimpar = document.getElementById("btnLimpar");
  if (btnLimpar)
    btnLimpar.addEventListener("click", () => {
      [
        "filtroCliente",
        "filtroDocumento",
        "filtroNota",
        "filtroDataVencimento",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const fp = document.getElementById("filtroPrevisao");
      if (fp) fp.value = "todos";
      carregarDocumentos();
    });

  // Botão Voltar
  const btnVoltar = document.getElementById("btnVoltar");
  if (btnVoltar)
    btnVoltar.addEventListener("click", () => window.history.back());

  // Botão Mais Opções
  const btnMais = document.getElementById("btnMaisOpcoes");
  if (btnMais)
    btnMais.addEventListener("click", () =>
      mostrarToast("Mais opções em breve", "info"),
    );
}

// ── Inicialização ─────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async function () {
  configurarTabs();
  configurarEventListeners();
  // Carregar dados em paralelo
  await Promise.all([carregarClientes(), carregarCategorias()]);
  await carregarDocumentos();
});
