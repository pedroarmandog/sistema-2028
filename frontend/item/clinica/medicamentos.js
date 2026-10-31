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
    // Sincronizar itens locais: cria no servidor itens que não tenham `id` e atualiza localmente
    async function sincronizarItensLocais() {
      if (!Array.isArray(medicamentosData) || medicamentosData.length === 0)
        return;
      console.log("[medicamentos] Sincronização de itens locais iniciada...");
      let created = 0,
        skipped = 0,
        failed = 0;
      for (const m of medicamentosData.slice()) {
        try {
          if (!m) continue;
          if (m.id) {
            skipped++;
            continue;
          }
          const payload = {
            nome: m.nome || "",
            codigo: m.codigo || "",
            agrupamento: "MEDICAMENTOS",
          };
          try {
            const res = await fetch("/api/itens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              console.warn("[medicamentos] Falha ao criar item:", m.nome);
              failed++;
              continue;
            }
            const result = await res.json();
            m.id = result.id || result.codigo || m.id;
            created++;
          } catch (err) {
            console.warn("[medicamentos] Erro ao criar no servidor:", err);
            failed++;
          }
        } catch (e) {
          console.warn("Erro sincronizando item local:", e);
          failed++;
        }
        // pequeno delay para evitar sobrecarregar o servidor
        await new Promise((r) => setTimeout(r, 80));
      }
      try {
        if (typeof renderizarTabelaMedicamentos === "function")
          renderizarTabelaMedicamentos();
      } catch (e) {}
      console.log(
        "[medicamentos] Sincronização concluída - criados:",
        created,
        "ignorados:",
        skipped,
        "falhas:",
        failed,
      );
      alert(
        "Sincronização concluída. Criados: " +
          created +
          ", ignorados: " +
          skipped +
          ", falhas: " +
          failed,
      );
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
    // Não tratar como erro fatal quando elementos de submenu não existem nesta página.
    console.debug(
      "Elementos do submenu lateral Caixa não encontrados — pulando configuração (não é fatal nesta página).",
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

// ========================================
// FUNCIONALIDADES DA PÁGINA MEDICAMENTOS
// ========================================

// Dados de medicamentos
let medicamentosData = [
  { codigo: 79, nome: "ABERALGINA", controlado: "Não", ativo: true },
  { codigo: 101, nome: "ACETILCISTEÍNA", controlado: "Não", ativo: true },
  { codigo: 2, nome: "ÁCIDO TRANEXÂMICO", controlado: "Não", ativo: true },
  { codigo: 3, nome: "ÁCIDO URSODESOXICÓLICO", controlado: "Não", ativo: true },
  { codigo: 35, nome: "AGEMOXI", controlado: "Não", ativo: true },
  { codigo: 102, nome: "AGEMOXI INJETÁVEL", controlado: "Não", ativo: true },
  { codigo: 103, nome: "ALANTOL", controlado: "Não", ativo: true },
  {
    codigo: 104,
    nome: "AMOXICILINA + CLAVUNATO DE POTÁSSIO",
    controlado: "Sim",
    ativo: true,
  },
  { codigo: 629, nome: "AMPICILINA", controlado: "Sim", ativo: true },
  { codigo: 105, nome: "APOQUEL", controlado: "Não", ativo: true },
  { codigo: 134, nome: "ARTROTABS", controlado: "Não", ativo: true },
  { codigo: 167, nome: "ASSEPTCARE", controlado: "Não", ativo: true },
  { codigo: 36, nome: "ATROPINA 1%", controlado: "Não", ativo: true },
  {
    codigo: 37,
    nome: "ATROPINA 1% (0,2 - 2 mg/kg)",
    controlado: "Não",
    ativo: true,
  },
  { codigo: 168, nome: "AURIVET", controlado: "Não", ativo: true },
  { codigo: 169, nome: "AURIVET CLEAN", controlado: "Não", ativo: true },
  {
    codigo: 170,
    nome: "AZITROMICINA DI-HIDRATADA",
    controlado: "Sim",
    ativo: true,
  },
  { codigo: 171, nome: "BENZOILMETRONIDAZOL", controlado: "Sim", ativo: true },
  { codigo: 200, nome: "BIODEX", controlado: "Não", ativo: true },
  { codigo: 38, nome: "BIONEW", controlado: "Não", ativo: true },
  { codigo: 233, nome: "BIOTOX", controlado: "Não", ativo: true },
  { codigo: 234, nome: "CALMYN CAT", controlado: "Não", ativo: true },
  { codigo: 235, nome: "CALMYN DOG", controlado: "Não", ativo: true },
  { codigo: 236, nome: "CAPSTAR", controlado: "Não", ativo: true },
  { codigo: 237, nome: "CARPOFLAN", controlado: "Não", ativo: true },
  { codigo: 238, nome: "CEFALEXINA", controlado: "Sim", ativo: true },
  { codigo: 39, nome: "CEFALOTINA 1G", controlado: "Não", ativo: true },
  { codigo: 239, nome: "CEFAWORLD", controlado: "Não", ativo: true },
  { codigo: 266, nome: "CEFTRAT", controlado: "Não", ativo: true },
  { codigo: 40, nome: "CEFTRIAXONA SÓDICA", controlado: "Não", ativo: true },
  { codigo: 43, nome: "CERENIA", controlado: "Não", ativo: true },
  { codigo: 299, nome: "CETOCONAZOL", controlado: "Sim", ativo: true },
  { codigo: 332, nome: "CLAVUVET", controlado: "Não", ativo: true },
  { codigo: 365, nome: "CLORESTEN", controlado: "Não", ativo: true },
  {
    codigo: 45,
    nome: "CLORIDRATO DE ONDANSETRONA",
    controlado: "Não",
    ativo: true,
  },
  {
    codigo: 48,
    nome: "CLORIDRATO DE PROMETAZINA",
    controlado: "Não",
    ativo: true,
  },
  {
    codigo: 49,
    nome: "CLORIDRATO DE TRAMADOL",
    controlado: "Sim",
    ativo: true,
  },
  { codigo: 50, nome: "COBOVITAL", controlado: "Não", ativo: true },
  { codigo: 51, nome: "CODEIN", controlado: "Sim", ativo: true },
  { codigo: 398, nome: "COLOSSO PULVERIZAÇÃO", controlado: "Não", ativo: true },
  { codigo: 431, nome: "CONVENIA", controlado: "Sim", ativo: true },
  { codigo: 432, nome: "COPROVET", controlado: "Não", ativo: true },
  { codigo: 433, nome: "CORTISOL", controlado: "Não", ativo: true },
  { codigo: 434, nome: "CRONIDOR", controlado: "Sim", ativo: true },
  {
    codigo: 52,
    nome: "CYTOPOINT 10 - Anticorpo (2,3 a 4,5kg)",
    controlado: "Não",
    ativo: true,
  },
  {
    codigo: 53,
    nome: "CYTOPOINT 20 Anticorpo (4,6 a 9,1 kg)",
    controlado: "Não",
    ativo: true,
  },
  {
    codigo: 54,
    nome: "CYTOPOINT 30 Anticorpo (9,2 - 13,6 kg)",
    controlado: "Não",
    ativo: true,
  },
  {
    codigo: 55,
    nome: "CYTOPOINT 40 Anticorpo (13,7 - 18,1 kg)",
    controlado: "Não",
    ativo: true,
  },
  { codigo: 630, nome: "DECA-DURABOLIN", controlado: "Sim", ativo: true },
  { codigo: 464, nome: "DERMOGEN", controlado: "Não", ativo: true },
  { codigo: 56, nome: "DEXAMETASONA", controlado: "Não", ativo: true },
  { codigo: 58, nome: "DIAZEPAM", controlado: "Não", ativo: true },
  { codigo: 59, nome: "DIPIRONA INJETÁVEL", controlado: "Não", ativo: true },
  {
    codigo: 60,
    nome: "DIPRIONATO DE IMIDOCARB",
    controlado: "Não",
    ativo: true,
  },
  { codigo: 465, nome: "DOXICICLINA", controlado: "Sim", ativo: true },
  { codigo: 62, nome: "DOXICICLINA INJETÁVEL", controlado: "Não", ativo: true },
  { codigo: 466, nome: "DOXINEW", controlado: "Não", ativo: true },
  { codigo: 467, nome: "EMEDRON", controlado: "Não", ativo: true },
  { codigo: 63, nome: "ENROFLOXACINA 10%", controlado: "Não", ativo: true },
  { codigo: 468, nome: "ENRONEW", controlado: "Não", ativo: true },
  { codigo: 469, nome: "ERITROSCAT PASTA", controlado: "Não", ativo: true },
  { codigo: 64, nome: "FENOBARBITAL", controlado: "Não", ativo: true },
  { codigo: 470, nome: "FENZOL PET", controlado: "Não", ativo: true },
  { codigo: 471, nome: "FLORENTERO ACT", controlado: "Não", ativo: true },
  {
    codigo: 472,
    nome: "FRONTILINE PLUS - CÃES",
    controlado: "Não",
    ativo: true,
  },
  {
    codigo: 473,
    nome: "FRONTILINE PLUS - GATOS",
    controlado: "Não",
    ativo: true,
  },
  { codigo: 497, nome: "FURANIL", controlado: "Não", ativo: true },
  { codigo: 530, nome: "GABAPENTINA", controlado: "Sim", ativo: true },
  { codigo: 65, nome: "GARDENAL", controlado: "Não", ativo: true },
  {
    codigo: 531,
    nome: "GATIFLOXACINO 0,3% - COLÍRIO",
    controlado: "Sim",
    ativo: true,
  },
  { codigo: 532, nome: "GAVIZ V", controlado: "Não", ativo: true },
  { codigo: 533, nome: "GLICOFARM PET", controlado: "Não", ativo: true },
  { codigo: 534, nome: "GLICOL PET", controlado: "Não", ativo: true },
  { codigo: 563, nome: "HELMIZOL", controlado: "Sim", ativo: true },
  { codigo: 564, nome: "HEMOLITAN PET", controlado: "Não", ativo: true },
  { codigo: 565, nome: "HEPVET", controlado: "Não", ativo: true },
  { codigo: 596, nome: "IBATRIM", controlado: "Não", ativo: true },
  { codigo: 631, nome: "KEPPRA", controlado: "Sim", ativo: true },
  { codigo: 597, nome: "KERAVIT", controlado: "Não", ativo: true },
  { codigo: 598, nome: "KOLLAGENASE", controlado: "Não", ativo: true },
  { codigo: 599, nome: "K-TREAT", controlado: "Não", ativo: true },
  { codigo: 600, nome: "LACRIBELL", controlado: "Sim", ativo: true },
  { codigo: 601, nome: "LASIX", controlado: "Não", ativo: true },
  { codigo: 66, nome: "LIBRELA 10 mg", controlado: "Não", ativo: true },
  { codigo: 67, nome: "LIBRELA 20 mg", controlado: "Não", ativo: true },
  { codigo: 68, nome: "LIBRELA 30 mg", controlado: "Não", ativo: true },
  { codigo: 602, nome: "LONDRILAC PET", controlado: "Não", ativo: true },
  { codigo: 603, nome: "LORATADINA", controlado: "Não", ativo: true },
  { codigo: 604, nome: "LUFTY", controlado: "Não", ativo: true },
  { codigo: 632, nome: "MANTIDAN", controlado: "Sim", ativo: true },
  { codigo: 605, nome: "MARBOCYL P", controlado: "Não", ativo: true },
  { codigo: 69, nome: "MAXALGINA", controlado: "Não", ativo: true },
  { codigo: 70, nome: "MELOXICAN 0,2%", controlado: "Não", ativo: true },
  { codigo: 606, nome: "MERACILINA", controlado: "Sim", ativo: true },
  { codigo: 607, nome: "MERCEPTON", controlado: "Não", ativo: true },
  { codigo: 71, nome: "METADONA", controlado: "Não", ativo: true },
  { codigo: 72, nome: "METOCLOPRAMIDA", controlado: "Não", ativo: true },
  { codigo: 608, nome: "METRONIDAZOL", controlado: "Sim", ativo: true },
  { codigo: 609, nome: "MIDAZOLAN", controlado: "Sim", ativo: true },
  { codigo: 73, nome: "MIRTAZAPINA", controlado: "Não", ativo: true },
  { codigo: 610, nome: "MUCOMUCIL", controlado: "Não", ativo: true },
  { codigo: 611, nome: "NAUSETRAT", controlado: "Não", ativo: true },
  { codigo: 633, nome: "NOVOLIN NPH", controlado: "Sim", ativo: true },
  { codigo: 634, nome: "OMCILON A ORABASE", controlado: "Sim", ativo: true },
  { codigo: 74, nome: "ORNITIL", controlado: "Não", ativo: true },
  { codigo: 75, nome: "PENICILINA 200.000UI", controlado: "Não", ativo: true },
  { codigo: 635, nome: "PREGABALINA", controlado: "Sim", ativo: true },
  { codigo: 636, nome: "REGENCEL", controlado: "Sim", ativo: true },
  { codigo: 76, nome: "ROBENACOXIBE", controlado: "Não", ativo: true },
  { codigo: 637, nome: "SELEGILINA", controlado: "Sim", ativo: true },
  {
    codigo: 77,
    nome: "SULFAMETOXAZOL + TRIMETROPRIM",
    controlado: "Não",
    ativo: true,
  },
  {
    codigo: 638,
    nome: "SUSPENSÃO ANTITUSSÍGENA PARA COLPASO TRAQUEAL",
    controlado: "Sim",
    ativo: true,
  },
  { codigo: 639, nome: "TEOFILINA", controlado: "Sim", ativo: true },
  { codigo: 640, nome: "TOBRADEX COLIRIO", controlado: "Sim", ativo: true },
  { codigo: 78, nome: "VITAMINA K", controlado: "Não", ativo: true },
];

// Snapshot inicial para fallback caso a mesclagem com o servidor deixe a lista vazia
const __INITIAL_MEDICAMENTOS = Array.isArray(medicamentosData)
  ? medicamentosData.slice()
  : [];

let searchTerm = "";

function inicializarMedicamentos() {
  console.log("💊 Inicializando página de Medicamentos");

  // Configurar event listeners
  configurarEventListenersMedicamentos();

  // Tentar carregar medicamentos do backend e depois renderizar tabela
  try {
    fetch("/api/itens")
      .then(function (res) {
        if (!res.ok) throw new Error("Falha ao buscar itens");
        return res.json();
      })
      .then(async function (list) {
        try {
          if (Array.isArray(list) && list.length > 0) {
            // Mesclar apenas itens que aparentam ser medicamentos (por agrupamento/categoria)
            // ou que já existem na lista local, para evitar sobrescrever com toda a base de itens
            // Construir mapas para merge robusto: priorizar match por `codigo`, depois por nome normalizado
            const merged = Array.isArray(medicamentosData)
              ? medicamentosData.slice()
              : [];
            const mapByCodigo = new Map();
            const mapByNome = new Map();
            merged.forEach(function (m) {
              try {
                const c = m.codigo ? String(m.codigo).trim() : null;
                const n = m.nome
                  ? String(m.nome)
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9\s]/gi, "")
                  : null;
                if (c) mapByCodigo.set(String(c), m);
                if (n) mapByNome.set(n, m);
              } catch (e) {}
            });

            list.forEach(function (p) {
              try {
                const nome = (p.nome || p.descricao || "").toString().trim();
                if (!nome) return;
                const agrup = (p.agrupamento || p.categoria || "")
                  .toString()
                  .toLowerCase();
                const isMedicine =
                  agrup.indexOf("medic") !== -1 ||
                  Array.from(mapByNome.keys()).indexOf(
                    nome.toLowerCase().replace(/[^a-z0-9\s]/gi, ""),
                  ) !== -1;
                if (!isMedicine) return;

                const codigoServidor = p.codigo
                  ? String(p.codigo)
                  : p.id
                    ? String(p.id)
                    : null;
                const nomeNorm = nome
                  .toLowerCase()
                  .replace(/[^a-z0-9\s]/gi, "");

                if (codigoServidor && mapByCodigo.has(String(codigoServidor))) {
                  // atualizar entrada local existente com campos do servidor e garantir id
                  const target = mapByCodigo.get(String(codigoServidor));
                  target.id = p.id || target.id || null;
                  target.nome = nome || target.nome;
                  target.controlado =
                    p.controlado || target.controlado || "Não";
                  target.ativo =
                    p.ativo === "sim" || p.ativo === true || p.ativo === "true"
                      ? true
                      : false;
                  target.principioAtivo =
                    p.principioAtivo || target.principioAtivo || "";
                  target.formaFarmaceutica =
                    p.formaFarmaceutica || target.formaFarmaceutica || "";
                  target.apresentacao =
                    p.apresentacao || target.apresentacao || "";
                  target.viaAdministracao =
                    p.viaAdministracao || target.viaAdministracao || "";
                  target.tipoFarmacia =
                    p.tipoFarmacia || target.tipoFarmacia || "";
                  return;
                }

                if (mapByNome.has(nomeNorm)) {
                  const target = mapByNome.get(nomeNorm);
                  // evitar sobrescrever código local se existir
                  if (!target.id) target.id = p.id || null;
                  target.codigo = target.codigo || p.codigo || p.id;
                  target.nome = nome || target.nome;
                  target.controlado =
                    p.controlado || target.controlado || "Não";
                  target.ativo =
                    p.ativo === "sim" || p.ativo === true || p.ativo === "true"
                      ? true
                      : false;
                  target.principioAtivo =
                    p.principioAtivo || target.principioAtivo || "";
                  target.formaFarmaceutica =
                    p.formaFarmaceutica || target.formaFarmaceutica || "";
                  target.apresentacao =
                    p.apresentacao || target.apresentacao || "";
                  target.viaAdministracao =
                    p.viaAdministracao || target.viaAdministracao || "";
                  target.tipoFarmacia =
                    p.tipoFarmacia || target.tipoFarmacia || "";
                  return;
                }

                // se não encontrou correspondência, adicionar novo registro do servidor (com campos extras)
                merged.push({
                  id: p.id || null,
                  codigo:
                    p.codigo || p.id || String(p.id || Date.now()).slice(-6),
                  nome: nome,
                  controlado: p.controlado || "Não",
                  ativo:
                    p.ativo === "sim" || p.ativo === true || p.ativo === "true"
                      ? true
                      : false,
                  principioAtivo: p.principioAtivo || "",
                  formaFarmaceutica: p.formaFarmaceutica || "",
                  apresentacao: p.apresentacao || "",
                  viaAdministracao: p.viaAdministracao || "",
                  tipoFarmacia: p.tipoFarmacia || "",
                });
              } catch (e) {
                /* ignora item com problemas */
              }
            });
            // aplicar filtro de bloqueio (itens removidos localmente)
            try {
              const br = await fetch("/api/itens/blocked");
              if (br && br.ok) {
                const blocked = await br.json();
                if (Array.isArray(blocked) && blocked.length) {
                  const blockedSetCodigo = new Set(
                    blocked
                      .filter((b) => b.codigo)
                      .map((b) => String(b.codigo)),
                  );
                  const blockedSetNome = new Set(
                    blocked
                      .filter((b) => b.nome)
                      .map((b) => String(b.nome).trim().toLowerCase()),
                  );
                  // filtrar merged
                  for (let i = merged.length - 1; i >= 0; i--) {
                    try {
                      const it = merged[i];
                      if (
                        (it.codigo &&
                          blockedSetCodigo.has(String(it.codigo))) ||
                        (it.nome &&
                          blockedSetNome.has(
                            String(it.nome).trim().toLowerCase(),
                          ))
                      )
                        merged.splice(i, 1);
                    } catch (e) {}
                  }
                }
              }
            } catch (e) {
              console.warn("[medicamentos] Falha ao obter blocked list", e);
            }
            medicamentosData = merged;
          }
        } catch (e) {
          console.warn("Erro mapeando itens recebidos:", e);
        }
        // garantir fallback: se a mesclagem resultou em lista vazia, restaurar snapshot inicial
        try {
          if (
            !Array.isArray(medicamentosData) ||
            medicamentosData.length === 0
          ) {
            medicamentosData = __INITIAL_MEDICAMENTOS.slice();
            console.log(
              "[medicamentos] Aplicando fallback para lista local inicial (restaurado)",
            );
          }
        } catch (e) {}
        // Não usar localStorage para priorizar último salvo — confiar somente no estado obtido do servidor
        renderizarTabelaMedicamentos();
      })
      .catch(function (err) {
        console.warn(
          "Não foi possível carregar itens do servidor, usando dados locais:",
          err,
        );
        renderizarTabelaMedicamentos();
      });
  } catch (e) {
    console.warn("Erro ao inicializar lista de medicamentos:", e);
    renderizarTabelaMedicamentos();
  }

  // após renderizar, tentar reconciliar itens locais com registros do servidor (atribuir `id` quando possível)
  try {
    if (typeof reconciliarIDs === "function") {
      try {
        reconciliarIDs();
      } catch (e) {
        console.warn("Erro iniciando reconciliação de IDs:", e);
      }
    }
  } catch (e) {}
  console.log("✅ Página de Medicamentos inicializada");
}

// Reconciliar IDs: para cada item local sem `id`, buscar no servidor por `codigo` ou `nome` e atribuir `id` quando encontrado
async function reconciliarIDs() {
  if (!Array.isArray(medicamentosData) || medicamentosData.length === 0) return;
  console.log("[medicamentos] Reconciliação de IDs (bulk) iniciada...");
  try {
    const res = await fetch("/api/itens");
    if (!res || !res.ok) {
      console.warn(
        "[medicamentos] Falha ao obter itens do servidor para reconciliação",
      );
      return;
    }
    const serverList = await res.json();
    if (!Array.isArray(serverList) || serverList.length === 0) {
      console.log("[medicamentos] Lista do servidor vazia");
      return;
    }

    const mapByCodigo = new Map();
    const mapByNome = new Map();
    serverList.forEach(function (p) {
      try {
        const codigo = p.codigo
          ? String(p.codigo).trim()
          : p.id
            ? String(p.id)
            : null;
        const nomeNorm = (p.nome || "")
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s]/gi, "");
        if (codigo) mapByCodigo.set(String(codigo), p);
        if (nomeNorm) mapByNome.set(nomeNorm, p);
      } catch (e) {
        /* ignore */
      }
    });

    let updated = false;
    medicamentosData.forEach(function (m) {
      try {
        if (!m || m.id) return;
        const codigoLocal = m.codigo ? String(m.codigo).trim() : null;
        const nomeLocalNorm = (m.nome || "")
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s]/gi, "");
        let found = null;
        if (codigoLocal && mapByCodigo.has(codigoLocal))
          found = mapByCodigo.get(codigoLocal);
        else if (nomeLocalNorm && mapByNome.has(nomeLocalNorm))
          found = mapByNome.get(nomeLocalNorm);
        if (found) {
          m.id = found.id || found.codigo || m.id;
          if (!m.codigo && found.codigo) m.codigo = found.codigo;
          updated = true;
        }
      } catch (e) {
        /* ignore item errors */
      }
    });

    if (updated) {
      try {
        if (typeof renderizarTabelaMedicamentos === "function")
          renderizarTabelaMedicamentos();
      } catch (e) {}
      console.log(
        "[medicamentos] Reconciliação de IDs concluiu com atualizações",
      );
    } else {
      console.log(
        "[medicamentos] Reconciliação de IDs concluiu sem alterações",
      );
    }
  } catch (err) {
    console.warn("[medicamentos] Erro na reconciliação de IDs (bulk):", err);
  }
}

// Definição global de sincronização (garante função disponível para o botão)
async function sincronizarItensLocais() {
  if (!Array.isArray(medicamentosData) || medicamentosData.length === 0) return;
  console.log(
    "[medicamentos] Sincronização de itens locais (global) iniciada...",
  );
  let created = 0,
    skipped = 0,
    failed = 0;
  for (const m of medicamentosData.slice()) {
    try {
      if (!m) continue;
      if (m.id) {
        skipped++;
        continue;
      }
      // checar existência no servidor por codigo ou nome
      try {
        const q = m.codigo ? String(m.codigo) : m.nome || "";
        const r = await fetch("/api/itens?q=" + encodeURIComponent(q));
        if (r && r.ok) {
          const list = await r.json();
          if (Array.isArray(list) && list.length) {
            const found = list.find(
              (p) =>
                String(p.codigo || "") === String(m.codigo) ||
                (p.nome || "").toString().trim().toLowerCase() ===
                  (m.nome || "").toString().trim().toLowerCase(),
            );
            if (found) {
              m.id = found.id || found.codigo || m.id;
              skipped++;
              continue;
            }
          }
        }
      } catch (e) {
        /* ignore */
      }

      const payload = {
        nome: m.nome || "",
        codigo: m.codigo || "",
        agrupamento: "MEDICAMENTOS",
      };
      try {
        const res = await fetch("/api/itens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.warn("[medicamentos] Falha ao criar item:", m.nome);
          failed++;
          continue;
        }
        const result = await res.json();
        m.id = result.id || result.codigo || m.id;
        created++;
      } catch (err) {
        console.warn("[medicamentos] Erro ao criar no servidor:", err);
        failed++;
      }
    } catch (e) {
      console.warn("Erro sincronizando item local:", e);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  try {
    if (typeof renderizarTabelaMedicamentos === "function")
      renderizarTabelaMedicamentos();
  } catch (e) {}
  console.log(
    "[medicamentos] Sincronização concluída - criados:",
    created,
    "ignorados:",
    skipped,
    "falhas:",
    failed,
  );
  alert(
    "Sincronização concluída. Criados: " +
      created +
      ", ignorados: " +
      skipped +
      ", falhas: " +
      failed,
  );
}

function configurarEventListenersMedicamentos() {
  const btnAdicionar = document.getElementById("btnAdicionarMedicamento");
  const btnMais = document.getElementById("btnMais");
  const btnPesquisar = document.getElementById("btnPesquisar");
  const searchInput = document.getElementById("searchMedicamentos");

  if (btnAdicionar) {
    // Emitir evento para abrir modal quando disponível; não bloquear com alert
    btnAdicionar.addEventListener("click", (e) => {
      try {
        var modalEl = document.getElementById("modalAdicionarMedicamento");
        if (modalEl && modalEl.dataset) {
          try {
            delete modalEl.dataset.editing;
            delete modalEl.dataset.editingLocal;
            delete modalEl.dataset.editingName;
          } catch (e) {}
        }
        document.dispatchEvent(new CustomEvent("abrirAdicionarMedicamento"));
      } catch (err) {
        console.warn("Erro emitindo evento abrirAdicionarMedicamento", err);
      }
    });
  }

  if (btnMais) {
    btnMais.addEventListener("click", () => {
      alert(
        "Opções adicionais:\n\n• Exportar lista\n• Importar medicamentos\n• Configurações",
      );
    });
  }

  // botão de sincronização manual removido — ação de sincronização pode ser executada por script

  if (btnPesquisar) {
    btnPesquisar.addEventListener("click", realizarPesquisaMedicamentos);
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        realizarPesquisaMedicamentos();
      }
    });
  }

  console.log("✅ Event listeners configurados");
}

function realizarPesquisaMedicamentos() {
  const searchInput = document.getElementById("searchMedicamentos");
  if (searchInput) {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderizarTabelaMedicamentos();
    console.log(`🔍 Pesquisando por: "${searchTerm}"`);
  }
}

function renderizarTabelaMedicamentos() {
  const tbody = document.getElementById("medicamentosTableBody");

  if (!tbody) {
    console.error("❌ Tbody não encontrado");
    return;
  }

  // Limpar tabela
  tbody.innerHTML = "";

  // Filtrar dados
  let dadosFiltrados = medicamentosData;
  if (searchTerm) {
    dadosFiltrados = medicamentosData.filter(
      (med) =>
        med.nome.toLowerCase().includes(searchTerm) ||
        med.codigo.toString().includes(searchTerm),
    );
  }

  // Renderizar linhas
  dadosFiltrados.forEach((med) => {
    const row = document.createElement("tr");
    var identifier =
      med.id !== undefined && med.id !== null ? med.id : med.codigo;
    // normalizar valor de `ativo` para boolean (aceita true/false, 'sim'/'nao', 'true'/'false')
    var ativoFlag = false;
    try {
      if (med.ativo === true) ativoFlag = true;
      else if (med.ativo === false) ativoFlag = false;
      else {
        var s = String(med.ativo || "").toLowerCase();
        ativoFlag = s === "sim" || s === "true" || s === "1";
      }
    } catch (e) {
      ativoFlag = false;
    }

    row.innerHTML = `
            <td>${med.codigo}</td>
            <td>${med.nome}</td>
            <td><span class="badge-controlado badge-${(med.controlado || "Não").toLowerCase()}">${med.controlado || "Não"}</span></td>
            <td>
                ${ativoFlag ? '<i class="fas fa-check icon-ativo"></i>' : '<i class="fas fa-times icon-inativo" style="color:#c33"></i>'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editarMedicamento('${identifier}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="excluirMedicamento('${identifier}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });

  console.log(
    `✅ Tabela renderizada com ${dadosFiltrados.length} medicamentos`,
  );
}

function editarMedicamento(idOrCode) {
  var medicamento = medicamentosData.find(
    (m) =>
      String(m.id) === String(idOrCode) ||
      String(m.codigo) === String(idOrCode),
  );
  if (!medicamento) {
    console.warn("Medicamento não encontrado para edição:", idOrCode);
    return;
  }
  console.log("✏️ Editar medicamento:", medicamento);

  function populateFrom(med) {
    try {
      var modal = document.getElementById("modalAdicionarMedicamento");
      var nomeInput = document.getElementById("medNomeComercial");
      var tipoSelect = document.getElementById("medTipoFarmacia");
      var principioInput = document.getElementById("medPrincipioAtivo");
      var formaInput = document.getElementById("medForma");
      var apresentacaoInput = document.getElementById("medApresentacao");
      var viaInput = document.getElementById("medVia");

      if (nomeInput) nomeInput.value = med.nome || "";
      if (principioInput) principioInput.value = med.principioAtivo || "";
      try {
        var principioFake = document.querySelector(".principio-display input");
        if (principioFake)
          principioFake.value =
            med.principioAtivo || principioInput.value || "";
      } catch (e) {}
      if (formaInput)
        formaInput.value = med.formaFarmaceutica || med.forma || "";
      try {
        var formaFake = document.querySelector(".forma-display input");
        if (formaFake)
          formaFake.value = med.formaFarmaceutica || formaInput.value || "";
      } catch (e) {}
      if (apresentacaoInput) apresentacaoInput.value = med.apresentacao || "";
      if (viaInput) viaInput.value = med.viaAdministracao || med.via || "";
      try {
        var viaFake = document.querySelector(".via-display input");
        if (viaFake)
          viaFake.value = med.viaAdministracao || viaInput.value || "";
      } catch (e) {}
      if (tipoSelect) {
        try {
          tipoSelect.value = med.tipoFarmacia || tipoSelect.value;
        } catch (e) {}
        try {
          var tipoDisplayInput = document.querySelector(
            ".med-tipo-display input",
          );
          if (tipoDisplayInput)
            tipoDisplayInput.value =
              med.tipoFarmacia || (tipoSelect && tipoSelect.value) || "";
        } catch (e) {}
      }

      // ajustar toggles
      try {
        var ativoVal =
          med.ativo === true ||
          String(med.ativo).toLowerCase() === "sim" ||
          String(med.ativo).toLowerCase() === "true";
        var controladoVal =
          String(med.controlado || "").toLowerCase() === "sim";
        var ativoGroup = modal
          ? modal.querySelectorAll("#medToggleAtivo .toggle-btn")
          : document.querySelectorAll('.toggle-btn[data-target="ativo"]');
        if (ativoGroup && ativoGroup.length) {
          ativoGroup.forEach(function (b) {
            b.classList.remove("active", "negative");
          });
          var btn = ativoVal
            ? Array.from(ativoGroup).find((b) => /sim/i.test(b.textContent))
            : Array.from(ativoGroup).find((b) =>
                /n[aã]o|nao/i.test(b.textContent),
              );
          if (btn) {
            btn.classList.add("active");
            if (/n[aã]o|nao/i.test(btn.textContent))
              btn.classList.add("negative");
          }
          try {
            var hv = modal
              ? modal.querySelector("#medAtivoValue")
              : document.getElementById("medAtivoValue");
            if (hv) hv.value = ativoVal ? "sim" : "nao";
          } catch (e) {}
        }
        var ctrlGroup = modal
          ? modal.querySelectorAll("#medToggleControlado .toggle-btn")
          : document.querySelectorAll('.toggle-btn[data-target="controlado"]');
        if (ctrlGroup && ctrlGroup.length) {
          ctrlGroup.forEach(function (b) {
            b.classList.remove("active", "negative");
          });
          var btnc = controladoVal
            ? Array.from(ctrlGroup).find((b) => /sim/i.test(b.textContent))
            : Array.from(ctrlGroup).find((b) =>
                /n[aã]o|nao/i.test(b.textContent),
              );
          if (btnc) {
            btnc.classList.add("active");
            if (/n[aã]o|nao/i.test(btnc.textContent))
              btnc.classList.add("negative");
          }
          try {
            var hc = modal
              ? modal.querySelector("#medControladoValue")
              : document.getElementById("medControladoValue");
            if (hc) hc.value = controladoVal ? "Sim" : "Não";
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Erro ao ajustar toggles do modal", e);
      }

      var modalEl = document.getElementById("modalAdicionarMedicamento");
      if (modalEl) {
        var title = modalEl.querySelector("#modalMedicamentoTitle");
        if (title) title.textContent = "Editar Medicamento";
        try {
          modalEl.dataset.editingLocal = String(med.id || med.codigo || "");
          modalEl.dataset.editingName = String(med.nome || "");
        } catch (e) {}
        if (med.id) modalEl.dataset.editing = String(med.id);
        else
          try {
            delete modalEl.dataset.editing;
          } catch (e) {}
      }

      var evt = new CustomEvent("abrirAdicionarMedicamento", {
        detail: { id: med.id || med.codigo },
      });
      document.dispatchEvent(evt);
    } catch (err) {
      console.error("Falha ao preencher modal de edição:", err);
    }
  }

  // Se tivermos um id, buscar versão atualizada do servidor antes de preencher
  if (medicamento.id) {
    fetch("/api/itens/" + encodeURIComponent(medicamento.id))
      .then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
      .then(function (serverMed) {
        if (serverMed) return populateFrom(serverMed);
        return populateFrom(medicamento);
      })
      .catch(function (err) {
        console.warn(
          "[medicamentos] falha ao buscar item no servidor, usando local",
          err,
        );
        populateFrom(medicamento);
      });
  } else {
    populateFrom(medicamento);
  }
}

function excluirMedicamento(idOrCode) {
  var medicamento = medicamentosData.find(
    (m) =>
      String(m.id) === String(idOrCode) ||
      String(m.codigo) === String(idOrCode),
  );
  if (!medicamento) return;
  // Usar modal de confirmação estilizado ao invés de alert() nativo
  showConfirmDeleteModal(
    `Deseja realmente excluir o medicamento "${medicamento.nome}"?`,
    async function () {
      console.log("🗑️ Excluir medicamento:", medicamento);

      try {
        // Primeiro: resolver o id real no banco consultando o servidor
        var realId = medicamento.id;

        console.log("[medicamentos] Iniciando exclusão - medicamento:", {
          id: medicamento.id,
          codigo: medicamento.codigo,
          nome: medicamento.nome,
        });

        // Se não temos id, buscar no servidor pelo codigo ou nome
        if (!realId) {
          console.log("[medicamentos] Sem id local, consultando servidor...");

          // Estratégia 1: Buscar por código (sem filtro de agrupamento)
          if (medicamento.codigo) {
            console.log(
              "[medicamentos] Tentativa 1: Buscar por código:",
              medicamento.codigo,
            );
            var searchUrl1 =
              "/api/itens?q=" + encodeURIComponent(medicamento.codigo);
            var searchRes1 = await fetch(searchUrl1);

            if (searchRes1.ok) {
              var items1 = await searchRes1.json();
              console.log(
                "[medicamentos] Busca por código retornou:",
                items1.length,
                "itens",
              );

              if (Array.isArray(items1) && items1.length > 0) {
                var matchCodigo = items1.find(
                  (it) =>
                    String(it.codigo).trim() ===
                    String(medicamento.codigo).trim(),
                );
                if (matchCodigo && matchCodigo.id) {
                  realId = matchCodigo.id;
                  console.log(
                    "[medicamentos] ✅ Id resolvido via código:",
                    realId,
                  );
                }
              }
            }
          }

          // Estratégia 2: Buscar por nome (se não achou por código)
          if (!realId && medicamento.nome) {
            console.log(
              "[medicamentos] Tentativa 2: Buscar por nome:",
              medicamento.nome.substring(0, 20) + "...",
            );
            var searchUrl2 =
              "/api/itens?q=" + encodeURIComponent(medicamento.nome);
            var searchRes2 = await fetch(searchUrl2);

            if (searchRes2.ok) {
              var items2 = await searchRes2.json();
              console.log(
                "[medicamentos] Busca por nome retornou:",
                items2.length,
                "itens",
              );

              if (Array.isArray(items2) && items2.length > 0) {
                console.log(
                  "[medicamentos] Primeiros candidatos:",
                  items2.slice(0, 3).map((i) => ({
                    id: i.id,
                    codigo: i.codigo,
                    nome: i.nome,
                  })),
                );

                var nomeBusca = String(medicamento.nome).trim().toLowerCase();
                var matchNome = items2.find(
                  (it) => String(it.nome).trim().toLowerCase() === nomeBusca,
                );

                if (matchNome && matchNome.id) {
                  realId = matchNome.id;
                  console.log(
                    "[medicamentos] ✅ Id resolvido via nome:",
                    realId,
                  );
                } else {
                  // Fallback: usar primeiro resultado se o nome for similar
                  console.warn(
                    "[medicamentos] ⚠️ Usando primeiro resultado como fallback",
                  );
                  realId = items2[0].id;
                }
              }
            }
          }

          // Se ainda não encontrou, o item não existe no banco
          if (!realId) {
            console.error(
              "[medicamentos] ❌ Item não existe no banco de dados",
            );
            console.log(
              "[medicamentos] 💡 Dica: Este medicamento pode ser apenas local e precisa ser sincronizado primeiro",
            );
          }
        }

        if (!realId) {
          console.error(
            "[medicamentos] ❌ Não foi possível resolver id para exclusão",
          );
          // oferecer opção ao usuário: sincronizar no servidor e então excluir, ou excluir apenas localmente
          try {
            var sincronizar = await confirmar(
              "Medicamento não encontrado no servidor.\nDeseja sincronizar/criar no servidor e depois excluir?\n\nSim = sincronizar e excluir\nNão = excluir apenas localmente",
            );
            if (sincronizar) {
              // tentar criar no servidor
              try {
                var payload = {
                  nome: String(medicamento.nome || ""),
                  codigo: medicamento.codigo || "",
                  agrupamento: "MEDICAMENTOS",
                };
                var createRes = await fetch("/api/itens", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!createRes.ok) {
                  var txt = await createRes.text();
                  alert(
                    "Falha ao criar item no servidor: " +
                      (createRes.status || "") +
                      " " +
                      txt,
                  );
                  return;
                }
                var created = await createRes.json();
                realId = created.id || created.codigo || realId;
                console.log("[medicamentos] Item criado no servidor:", {
                  id: realId,
                  created,
                });
              } catch (ce) {
                console.error("[medicamentos] Erro ao criar no servidor:", ce);
                alert("Erro ao criar no servidor: " + (ce && ce.message));
                return;
              }
            } else {
              // excluir apenas localmente: gravar bloqueio no servidor para não reaparecer após reload
              console.log(
                "[medicamentos] Exclusão local solicitada pelo usuário (marcar como bloqueado)",
              );
              try {
                await fetch("/api/itens/blocked", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    codigo: medicamento.codigo,
                    nome: medicamento.nome,
                  }),
                });
              } catch (e) {
                console.warn(
                  "[medicamentos] Falha ao gravar bloqueio no servidor",
                  e,
                );
              }
              medicamentosData = medicamentosData.filter((m) => {
                return !(
                  String(m.id) === String(idOrCode) ||
                  String(m.codigo) === String(idOrCode) ||
                  String(m.nome || "").trim() ===
                    String(medicamento.nome || "").trim()
                );
              });
              if (typeof renderizarTabelaMedicamentos === "function")
                renderizarTabelaMedicamentos();
              return;
            }
          } catch (e) {
            console.error(
              "[medicamentos] erro tratando opção de sincronizar/excluir localmente",
              e,
            );
            alert("Erro interno: " + (e && e.message));
            return;
          }
        }

        // Agora fazer o DELETE com o id real
        console.log("[medicamentos] Enviando DELETE para id:", realId);
        var deleteRes = await fetch(
          "/api/itens/" + encodeURIComponent(realId),
          { method: "DELETE" },
        );

        if (!deleteRes.ok) {
          var errorText = await deleteRes.text();
          console.error(
            "[medicamentos] DELETE falhou:",
            deleteRes.status,
            errorText,
          );
          try {
            var msg =
              "Falha ao excluir no servidor: " + (deleteRes.status || "");
            if (typeof window.showToast === "function")
              window.showToast(msg, "error", 6000);
            else if (typeof window.showNotification === "function")
              window.showNotification(msg, "error");
            else alert(msg);
          } catch (e) {
            try {
              alert("Falha ao excluir no servidor: " + deleteRes.status);
            } catch (_) {
              console.error(
                "Não foi possível notificar erro de exclusão",
                e,
                _,
              );
            }
          }
          return;
        }

        // Sucesso: remover localmente
        console.log(
          "[medicamentos] Exclusão bem-sucedida, removendo localmente",
        );
        medicamentosData = medicamentosData.filter((m) => {
          return !(
            String(m.id) === String(realId) ||
            String(m.id) === String(idOrCode) ||
            String(m.codigo) === String(idOrCode)
          );
        });
        // Persistir bloqueio para evitar reaparecer na lista (embutida no frontend)
        try {
          await fetch("/api/itens/blocked", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              codigo: medicamento.codigo,
              nome: medicamento.nome,
            }),
          });
        } catch (e) {
          console.warn(
            "[medicamentos] Falha ao gravar bloqueio após exclusão",
            e,
          );
        }

        if (typeof renderizarTabelaMedicamentos === "function")
          renderizarTabelaMedicamentos();
      } catch (err) {
        console.error("Erro ao excluir medicamento:", err);
        var msg =
          "Erro ao excluir: " +
          (err && err.message ? err.message : String(err));
        try {
          if (typeof window.showToast === "function") {
            window.showToast(msg, "error", 6000);
          } else if (typeof window.showNotification === "function") {
            window.showNotification(msg, "error");
          } else {
            alert(msg);
          }
        } catch (e) {
          try {
            alert(msg);
          } catch (_) {
            console.error("Não foi possível exibir notificação de erro", e, _);
          }
        }
      }
    },
  );
}

// Modal confirm helper (reutilizável)
function showConfirmDeleteModal(message, onConfirm) {
  try {
    var modal = document.getElementById("confirmDeleteModal");
    if (!modal) {
      confirmar(message).then(function (r) {
        if (r && typeof onConfirm === "function") onConfirm();
      });
      return;
    }
    var msg = modal.querySelector("#confirmDeleteMessage");
    if (msg) msg.textContent = message;
    var btnOk = modal.querySelector("#confirmDeleteBtn");
    var btnCancel = modal.querySelector("#confirmDeleteCancelBtn");
    function cleanup() {
      // Mover foco para elemento seguro ANTES de aplicar aria-hidden para evitar warning
      try {
        if (document.activeElement && document.activeElement.blur)
          document.activeElement.blur();
        if (document.body && typeof document.body.focus === "function")
          document.body.focus();
      } catch (e) {}
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      try {
        btnOk.removeEventListener("click", ok);
        btnCancel.removeEventListener("click", cancel);
      } catch (e) {}
      try {
        modal.style.display = "none";
      } catch (e) {}
    }
    function ok(e) {
      cleanup();
      if (typeof onConfirm === "function") onConfirm();
    }
    function cancel(e) {
      cleanup();
    }
    // abrir
    try {
      modal.style.display = "flex";
    } catch (e) {}
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    // garantir foco no cancelar por padrão
    try {
      if (btnCancel && typeof btnCancel.focus === "function") btnCancel.focus();
    } catch (e) {}
    // anexar listeners
    if (btnOk) btnOk.addEventListener("click", ok);
    if (btnCancel) btnCancel.addEventListener("click", cancel);
  } catch (e) {
    console.warn("Erro ao abrir confirm modal", e);
    confirmar(message).then(function (r) {
      if (r && typeof onConfirm === "function") onConfirm();
    });
  }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarMedicamentos);
} else {
  inicializarMedicamentos();
}

// Inicializar dropdown custom para 'Tipo Farmácia' no modal de medicamentos
function inicializarTipoFarmacia() {
  try {
    const select = document.getElementById("medTipoFarmacia");
    if (!select) return;

    const optionsList = [
      "Veterinária",
      "Humana",
      "Manipulada Humana",
      "Manipulada Veterinária",
    ];

    // repopular select original (mantemos no DOM por compatibilidade)
    select.innerHTML = "";
    optionsList.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.text = o;
      select.appendChild(opt);
    });

    // esconder select original
    select.hidden = true;
    select.style.display = "none";
    select.style.pointerEvents = "none";
    select.setAttribute("aria-hidden", "true");

    const wrapper = select.parentElement || document.body;

    // criar display
    const display = document.createElement("div");
    display.className = "med-tipo-display";
    display.style.border = "1px solid #eee";
    display.style.padding = "8px 10px";
    display.style.borderRadius = "4px";
    display.style.cursor = "text";
    display.style.display = "flex";
    display.style.alignItems = "center";
    display.style.justifyContent = "space-between";
    display.style.width = "100%";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Pesquisar...";
    input.style.flex = "1";
    input.style.border = "none";
    input.style.outline = "none";
    input.style.marginRight = "8px";
    input.style.fontSize = "14px";
    input.style.background = "transparent";
    input.style.color = "#222";
    // preenche com valor default do select (Veterinária)
    try {
      input.value = select.value || "Veterinária";
    } catch (e) {
      input.value = "Veterinária";
    }
    const caret = document.createElement("i");
    caret.className = "fas fa-caret-down";
    caret.style.marginLeft = "8px";
    caret.style.color = "#888";
    display.appendChild(input);
    display.appendChild(caret);
    wrapper.insertBefore(display, select);

    // set default value in original select
    try {
      select.value = "Veterinária";
    } catch (e) {}

    // dropdown container: anexar ao wrapper para seguir o scroll do modal corretamente
    const dropdown = document.createElement("div");
    dropdown.className = "med-tipo-dropdown";
    dropdown.style.position = "absolute";
    dropdown.style.display = "none";
    dropdown.style.zIndex = 140000;
    dropdown.style.maxHeight = "220px";
    dropdown.style.overflowY = "auto";
    dropdown.style.background = "#fff";
    dropdown.style.border = "1px solid #e6e9eb";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "0 6px 18px rgba(2,6,23,0.12)";
    // garantir que o wrapper seja um contexto posicionado
    try {
      if (getComputedStyle(wrapper).position === "static")
        wrapper.style.position = "relative";
    } catch (e) {}
    wrapper.appendChild(dropdown);

    function position() {
      const r = display.getBoundingClientRect();
      const w = wrapper.getBoundingClientRect();
      const left = Math.round(r.left - w.left);
      const top = Math.round(r.bottom - w.top + 6);
      dropdown.style.minWidth = Math.max(180, r.width) + "px";
      dropdown.style.left = left + "px";
      dropdown.style.top = top + "px";
    }

    function render(filter) {
      dropdown.innerHTML = "";
      const q = (filter || "").toLowerCase();
      const items = optionsList.filter(
        (it) => it.toLowerCase().indexOf(q) !== -1,
      );
      if (items.length === 0) {
        const e = document.createElement("div");
        e.textContent = "Nenhum resultado";
        e.style.padding = "10px 12px";
        dropdown.appendChild(e);
        return;
      }
      items.forEach((text) => {
        const it = document.createElement("div");
        it.className = "med-tipo-item";
        it.style.padding = "10px 12px";
        it.style.cursor = "pointer";
        it.textContent = text;
        it.addEventListener("click", function (e) {
          e.stopPropagation();
          try {
            input.value = text;
            select.value = text;
          } catch (e) {}
          dropdown.style.display = "none";
          document.removeEventListener("click", outside);
        });
        dropdown.appendChild(it);
      });
    }

    function outside(ev) {
      if (!dropdown.contains(ev.target) && !display.contains(ev.target)) {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    }

    // foco/abrir ao clicar em qualquer parte do display
    display.addEventListener("click", function (e) {
      e.stopPropagation();
      requestAnimationFrame(function () {
        position();
        render("");
        dropdown.style.display = "block";
        input.focus();
      });
      setTimeout(() => {
        document.addEventListener("click", outside);
      }, 50);
    });

    // escuta digitação no input para filtrar
    input.addEventListener("input", function () {
      render(this.value);
      requestAnimationFrame(position);
    });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    });
  } catch (err) {
    console.error("Erro inicializando tipo de farmácia:", err);
  }
}

// chamar após DOM pronto
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", inicializarTipoFarmacia);
else inicializarTipoFarmacia();

// Inicializar dropdown para Princípio Ativo
function inicializarPrincipioAtivo() {
  try {
    const inputOrig = document.getElementById("medPrincipioAtivo");
    if (!inputOrig) return;

    const items = [
      "ÁCIDO TRANEXÂMICO",
      "AMOXILINA + CLAVULANATO",
      "SULFATO DE ATROPINA",
      "CIANOCOBALAMINA + VIT",
      "CEFALOTINA",
      "CEFTRIAXONA SÓDICA",
      "CITRATO DE MAROPITANT",
      "CLORIDRATO DE ONDANSETRONA",
      "CLORIDRATO DE PROMETAZINA",
      "CLORIDRATO DE TRAMADOL",
      "COBALAMINA 1MG + CLORIDRATO DE CIPROEPTADINA 12MG",
      "FOSFATO DE CODEÍNA",
      "ANTICORPO MONOCIONAL",
      "FOSFATO DISSÓDICO DE DEXAMETASONA",
      "DIAZEPAM",
      "DIPIRONA",
      "DIPRIONATO DE IMIDOCARB",
      "HICLATO DE DOXICICLINA + BENZETIME DE CLORIDRATO",
      "ENROFLOXACINA",
      "FENOBARBITAL",
      "BENDINVETMAB",
      "DIPIRONA MONOHIDRATADA",
      "MELOXICAN",
      "CLORIDRATO DE METADONA",
      "CLORIDRATO DE METOCLOPRAMIDA",
      "MIRTAZAPINA 2 MG",
      "ASPARTATO DE L-ORNITINA",
      "BENZILPENICILINA + DIDROESTREPTOMICINA + PIROXICAM + CLORIDRATO DE PROCAINA",
      "ROBENACOXIBE",
      "SULFAMETOXAZOL + TRIMETROPRIM",
      "VITAMINA K HIDROSSOLÚVEL",
      "AMOXICILINA TRI-HIDRATADA",
      "OCLACITINIB",
      "CICLONATO DE CLOREXIDINA",
      "AZITROMICINA DI-HIDRATADA",
      "BENZOILMETRONIDAZOL",
      "AMITRAZ",
      "CARPROFENO",
      "CEFALEXINA",
      "CETOCONAZOL",
      "CLAVULANATO DE POTÁSSIO",
      "PREDNISOLONA",
      "FEMBENDAZOL",
      "OMEPRAZOL",
      "SULFADIAZINA",
      "TRIMETOPROIMA",
      "DEXTRANA",
      "HIPROMELOSE",
      "SIMETICONA",
      "MARBOFLOXACINA",
      "DECANOATO DE NANDROLONA",
      "LEVETIRACETAM",
      "CLORIDRATO DE AMANTADINA",
      "INSULINA",
      "TRIAMCINOLONA",
    ];

    // criar wrapper relativo se necessário
    const wrapper = inputOrig.parentElement || document.body;
    try {
      if (getComputedStyle(wrapper).position === "static")
        wrapper.style.position = "relative";
    } catch (e) {}

    // transformar input original em hidden (mantemos valor)
    inputOrig.type = "hidden";

    // display visível (input fake)
    const display = document.createElement("div");
    display.className = "principio-display";
    display.style.border = "1px solid #eee";
    display.style.padding = "8px 10px";
    display.style.borderRadius = "4px";
    display.style.cursor = "text";
    display.style.display = "flex";
    display.style.alignItems = "center";
    display.style.justifyContent = "space-between";
    display.style.width = "100%";
    const fakeInput = document.createElement("input");
    fakeInput.type = "text";
    fakeInput.placeholder = "Pesquisar...";
    fakeInput.style.flex = "1";
    fakeInput.style.border = "none";
    fakeInput.style.outline = "none";
    fakeInput.style.marginRight = "8px";
    fakeInput.style.fontSize = "14px";
    fakeInput.style.background = "transparent";
    fakeInput.value = "";
    const caret = document.createElement("i");
    caret.className = "fas fa-caret-down";
    caret.style.color = "#888";
    caret.style.marginLeft = "8px";
    display.appendChild(fakeInput);
    display.appendChild(caret);
    wrapper.insertBefore(display, inputOrig);

    // dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "principio-dropdown";
    dropdown.style.position = "absolute";
    dropdown.style.display = "none";
    dropdown.style.zIndex = 140000;
    dropdown.style.maxHeight = "200px";
    dropdown.style.overflowY = "auto";
    dropdown.style.background = "#fff";
    dropdown.style.border = "1px solid #e6e9eb";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "0 6px 18px rgba(2,6,23,0.12)";
    wrapper.appendChild(dropdown);

    function position() {
      const r = display.getBoundingClientRect();
      const w = wrapper.getBoundingClientRect();
      dropdown.style.left = Math.round(r.left - w.left) + "px";
      dropdown.style.top = Math.round(r.bottom - w.top + 6) + "px";
      dropdown.style.minWidth = Math.max(200, r.width) + "px";
    }

    function render(filter) {
      dropdown.innerHTML = "";
      const q = (filter || "").toLowerCase();
      const list = items.filter((i) => i.toLowerCase().indexOf(q) !== -1);
      if (list.length === 0) {
        const e = document.createElement("div");
        e.textContent = "Nenhum resultado";
        e.style.padding = "10px 12px";
        dropdown.appendChild(e);
        return;
      }
      list.forEach((text) => {
        const it = document.createElement("div");
        it.className = "principio-item";
        it.style.padding = "8px 12px";
        it.style.cursor = "pointer";
        it.textContent = text;
        it.addEventListener("click", function (e) {
          e.stopPropagation();
          fakeInput.value = text;
          try {
            inputOrig.value = text;
          } catch (e) {}
          dropdown.style.display = "none";
          document.removeEventListener("click", outside);
        });
        dropdown.appendChild(it);
      });
    }

    function outside(ev) {
      if (!dropdown.contains(ev.target) && !display.contains(ev.target)) {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    }

    display.addEventListener("click", function (e) {
      e.stopPropagation();
      requestAnimationFrame(function () {
        position();
        render("");
        dropdown.style.display = "block";
        fakeInput.focus();
      });
      setTimeout(() => {
        document.addEventListener("click", outside);
      }, 50);
    });
    fakeInput.addEventListener("input", function () {
      render(this.value);
      requestAnimationFrame(position);
    });
    fakeInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    });
  } catch (err) {
    console.error("Erro inicializando princípio ativo", err);
  }
}

// chamar após DOM pronto
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", inicializarPrincipioAtivo);
else inicializarPrincipioAtivo();

// Inicializar dropdown para Forma Farmacêutica
function inicializarFormaFarmaceutica() {
  try {
    const inputOrig = document.getElementById("medForma");
    if (!inputOrig) return;
    const items = [
      "Líquido",
      "Comprimido",
      "Pomada",
      "Pasta",
      "Spray",
      "500mg",
      "Suspensão Tópica",
      "Flaconete",
      "40mg",
      "Pó solúvel",
    ];
    const wrapper = inputOrig.parentElement || document.body;
    try {
      if (getComputedStyle(wrapper).position === "static")
        wrapper.style.position = "relative";
    } catch (e) {}
    inputOrig.type = "hidden";
    const display = document.createElement("div");
    display.className = "forma-display";
    display.style.border = "1px solid #eee";
    display.style.padding = "8px 10px";
    display.style.borderRadius = "4px";
    display.style.cursor = "text";
    display.style.display = "flex";
    display.style.alignItems = "center";
    display.style.justifyContent = "space-between";
    display.style.width = "100%";
    const fakeInput = document.createElement("input");
    fakeInput.type = "text";
    fakeInput.placeholder = "Pesquisar...";
    fakeInput.style.flex = "1";
    fakeInput.style.border = "none";
    fakeInput.style.outline = "none";
    fakeInput.style.marginRight = "8px";
    fakeInput.style.fontSize = "14px";
    fakeInput.style.background = "transparent";
    fakeInput.value = "";
    const caret = document.createElement("i");
    caret.className = "fas fa-caret-down";
    caret.style.color = "#888";
    caret.style.marginLeft = "8px";
    display.appendChild(fakeInput);
    display.appendChild(caret);
    wrapper.insertBefore(display, inputOrig);
    const dropdown = document.createElement("div");
    dropdown.className = "forma-dropdown";
    dropdown.style.position = "absolute";
    dropdown.style.display = "none";
    dropdown.style.zIndex = 140000;
    dropdown.style.maxHeight = "200px";
    dropdown.style.overflowY = "auto";
    dropdown.style.background = "#fff";
    dropdown.style.border = "1px solid #e6e9eb";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "0 6px 18px rgba(2,6,23,0.12)";
    wrapper.appendChild(dropdown);
    function position() {
      const r = display.getBoundingClientRect();
      const w = wrapper.getBoundingClientRect();
      dropdown.style.left = Math.round(r.left - w.left) + "px";
      dropdown.style.top = Math.round(r.bottom - w.top + 6) + "px";
      dropdown.style.minWidth = Math.max(180, r.width) + "px";
    }
    function render(filter) {
      dropdown.innerHTML = "";
      const q = (filter || "").toLowerCase();
      const list = items.filter((i) => i.toLowerCase().indexOf(q) !== -1);
      if (list.length === 0) {
        const e = document.createElement("div");
        e.textContent = "Nenhum resultado";
        e.style.padding = "10px 12px";
        dropdown.appendChild(e);
        return;
      }
      list.forEach((text) => {
        const it = document.createElement("div");
        it.className = "forma-item";
        it.style.padding = "8px 12px";
        it.style.cursor = "pointer";
        it.textContent = text;
        it.addEventListener("click", function (e) {
          e.stopPropagation();
          fakeInput.value = text;
          try {
            inputOrig.value = text;
          } catch (e) {}
          dropdown.style.display = "none";
          document.removeEventListener("click", outside);
        });
        dropdown.appendChild(it);
      });
    }
    function outside(ev) {
      if (!dropdown.contains(ev.target) && !display.contains(ev.target)) {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    }
    display.addEventListener("click", function (e) {
      e.stopPropagation();
      requestAnimationFrame(function () {
        position();
        render("");
        dropdown.style.display = "block";
        fakeInput.focus();
      });
      setTimeout(() => {
        document.addEventListener("click", outside);
      }, 50);
    });
    fakeInput.addEventListener("input", function () {
      render(this.value);
      requestAnimationFrame(position);
    });
    fakeInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    });
  } catch (err) {
    console.error("Erro inicializando forma farmacêutica", err);
  }
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", inicializarFormaFarmaceutica);
else inicializarFormaFarmaceutica();

// Inicializar dropdown para Via Adm.
function inicializarViaAdm() {
  try {
    const inputOrig = document.getElementById("medVia");
    if (!inputOrig) return;
    const items = [
      "IV;SC;IM",
      "Oral",
      "IV;SC",
      "SC",
      "IV",
      "SC;IM",
      "IM;IV",
      "IM",
      "Tópico",
    ];
    const wrapper = inputOrig.parentElement || document.body;
    try {
      if (getComputedStyle(wrapper).position === "static")
        wrapper.style.position = "relative";
    } catch (e) {}
    inputOrig.type = "hidden";
    const display = document.createElement("div");
    display.className = "via-display";
    display.style.border = "1px solid #eee";
    display.style.padding = "8px 10px";
    display.style.borderRadius = "4px";
    display.style.cursor = "text";
    display.style.display = "flex";
    display.style.alignItems = "center";
    display.style.justifyContent = "space-between";
    display.style.width = "100%";
    const fakeInput = document.createElement("input");
    fakeInput.type = "text";
    fakeInput.placeholder = "Pesquisar...";
    fakeInput.style.flex = "1";
    fakeInput.style.border = "none";
    fakeInput.style.outline = "none";
    fakeInput.style.marginRight = "8px";
    fakeInput.style.fontSize = "14px";
    fakeInput.style.background = "transparent";
    fakeInput.value = "";
    const caret = document.createElement("i");
    caret.className = "fas fa-caret-down";
    caret.style.color = "#888";
    caret.style.marginLeft = "8px";
    display.appendChild(fakeInput);
    display.appendChild(caret);
    wrapper.insertBefore(display, inputOrig);
    const dropdown = document.createElement("div");
    dropdown.className = "via-dropdown";
    dropdown.style.position = "absolute";
    dropdown.style.display = "none";
    dropdown.style.zIndex = 140000;
    dropdown.style.maxHeight = "200px";
    dropdown.style.overflowY = "auto";
    dropdown.style.background = "#fff";
    dropdown.style.border = "1px solid #e6e9eb";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow = "0 6px 18px rgba(2,6,23,0.12)";
    wrapper.appendChild(dropdown);
    function position() {
      const r = display.getBoundingClientRect();
      const w = wrapper.getBoundingClientRect();
      dropdown.style.left = Math.round(r.left - w.left) + "px";
      dropdown.style.top = Math.round(r.bottom - w.top + 6) + "px";
      dropdown.style.minWidth = Math.max(160, r.width) + "px";
    }
    function render(filter) {
      dropdown.innerHTML = "";
      const q = (filter || "").toLowerCase();
      const list = items.filter((i) => i.toLowerCase().indexOf(q) !== -1);
      if (list.length === 0) {
        const e = document.createElement("div");
        e.textContent = "Nenhum resultado";
        e.style.padding = "10px 12px";
        dropdown.appendChild(e);
        return;
      }
      list.forEach((text) => {
        const it = document.createElement("div");
        it.className = "via-item";
        it.style.padding = "8px 12px";
        it.style.cursor = "pointer";
        it.textContent = text;
        it.addEventListener("click", function (e) {
          e.stopPropagation();
          fakeInput.value = text;
          try {
            inputOrig.value = text;
          } catch (e) {}
          dropdown.style.display = "none";
          document.removeEventListener("click", outside);
        });
        dropdown.appendChild(it);
      });
    }
    function outside(ev) {
      if (!dropdown.contains(ev.target) && !display.contains(ev.target)) {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    }
    display.addEventListener("click", function (e) {
      e.stopPropagation();
      requestAnimationFrame(function () {
        position();
        render("");
        dropdown.style.display = "block";
        fakeInput.focus();
      });
      setTimeout(() => {
        document.addEventListener("click", outside);
      }, 50);
    });
    fakeInput.addEventListener("input", function () {
      render(this.value);
      requestAnimationFrame(position);
    });
    fakeInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        dropdown.style.display = "none";
        document.removeEventListener("click", outside);
      }
    });
  } catch (err) {
    console.error("Erro inicializando Via Adm.", err);
  }
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", inicializarViaAdm);
else inicializarViaAdm();
