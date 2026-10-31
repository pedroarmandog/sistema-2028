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

  // Verificar se está editando um profissional
  verificarEdicaoProfissional();

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
    inicializarFormularioProfissional();
  }, 200);
});

// ========================================
// FUNCIONALIDADES DO FORMULÁRIO DE CADASTRO
// ========================================

function inicializarFormularioProfissional() {
  console.log("🎯 Inicializando formulário de cadastro de profissional");

  // Configurar máscara para CPF
  const cpfInput = document.getElementById("cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", aplicarMascaraCPF);
  }

  // Configurar máscara para telefone
  const telefoneInput = document.getElementById("telefone");
  if (telefoneInput) {
    telefoneInput.addEventListener("input", aplicarMascaraTelefone);
  }

  // Configurar busca de CEP
  const cepInput = document.getElementById("cep");
  const cepSearch = document.querySelector(".cep-search");
  if (cepInput) {
    cepInput.addEventListener("input", aplicarMascaraCEP);
    cepInput.addEventListener("blur", buscarCEP);
  }
  if (cepSearch) {
    cepSearch.addEventListener("click", buscarCEP);
  }

  // Configurar calendário
  inicializarCalendario();

  // Carregar perfis de comissão da API (só no modo novo cadastro;
  // no modo edição, carregarDadosProfissional já cuida disso)
  const params = new URLSearchParams(window.location.search);
  if (!params.get("id") && !localStorage.getItem("profissionalEditando")) {
    carregarPerfisComissaoProfissional();
  }

  // Configurar botões de ação
  configurarBotoesFormulario();

  // Configurar upload de arquivo
  configurarUploadAssinatura();
}

async function carregarPerfisComissaoProfissional(valorPreSelecionado) {
  const select = document.getElementById("perfilComissao");
  if (!select) return;
  try {
    const resp = await fetch("/api/perfis-comissao?tipo=produto");
    if (!resp.ok) throw new Error("Falha na API");
    const perfis = await resp.json();
    // Repopular mantendo a primeira opção
    select.innerHTML = '<option value="">Selecione um perfil...</option>';
    perfis.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.perfilVendedor;
      select.appendChild(opt);
    });
    // Aplicar valor pré-selecionado se fornecido
    if (valorPreSelecionado != null && valorPreSelecionado !== "") {
      select.value = valorPreSelecionado;
    }
  } catch (e) {
    console.warn("Falha ao carregar perfis de comissão da API:", e);
  }
}

function inicializarCalendario() {
  const dataNascimentoInput = document.getElementById("dataNascimento");
  if (dataNascimentoInput && typeof flatpickr !== "undefined") {
    flatpickr(dataNascimentoInput, {
      locale: "pt",
      dateFormat: "d/m/Y",
      altInput: false,
      allowInput: true,
      maxDate: new Date(),
      yearRange: [1900, new Date().getFullYear()],
      monthSelectorType: "dropdown",
      showMonths: 1,
      inline: false,
      static: false,
      position: "below left",
      theme: "custom-theme",
      disableMobile: false,
      onReady: function (selectedDates, dateStr, instance) {
        // Adicionar botões personalizados
        const calendarContainer = instance.calendarContainer;
        if (!calendarContainer.querySelector(".flatpickr-footer")) {
          const footer = document.createElement("div");
          footer.className = "flatpickr-footer";
          footer.innerHTML = `
                        <button type="button" class="btn-hoje">Hoje</button>
                        <button type="button" class="btn-fechar">Fechar</button>
                    `;

          calendarContainer.appendChild(footer);

          // Event listeners dos botões
          footer.querySelector(".btn-hoje").addEventListener("click", () => {
            instance.setDate(new Date());
          });

          footer.querySelector(".btn-fechar").addEventListener("click", () => {
            instance.close();
          });
        }

        // Garantir que o mês seja exibido corretamente
        const monthContainer = calendarContainer.querySelector(
          ".flatpickr-current-month",
        );
        if (monthContainer) {
          monthContainer.style.display = "flex";
          monthContainer.style.alignItems = "center";
          monthContainer.style.justifyContent = "center";
        }
      },
    });

    console.log("📅 Calendário inicializado com sucesso");
  }
}

function aplicarMascaraCPF(event) {
  let valor = event.target.value.replace(/\D/g, "");
  valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
  valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
  valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  event.target.value = valor;
}

function aplicarMascaraTelefone(event) {
  let valor = event.target.value.replace(/\D/g, "");
  valor = valor.replace(/(\d{2})(\d)/, "($1) $2");
  valor = valor.replace(/(\d)(\d{4})$/, "$1-$2");
  event.target.value = valor;
}

function aplicarMascaraCEP(event) {
  let valor = event.target.value.replace(/\D/g, "");
  valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
  event.target.value = valor;
}

function buscarCEP() {
  const cep = document.getElementById("cep").value.replace(/\D/g, "");

  if (cep.length !== 8) return;

  console.log("🔍 Buscando CEP:", cep);

  const _cepApi = (window.VPS_URL || "") + "/api";
  fetch(`${_cepApi}/cep/${cep}`, { credentials: "include" })
    .then((response) => response.json())
    .then((data) => {
      if (!data.erro) {
        preencherEndereco(data);
        mostrarNotificacao("CEP encontrado com sucesso!", "success");
      } else {
        mostrarNotificacao("CEP não encontrado.", "warning");
      }
    })
    .catch((error) => {
      console.error("Erro ao buscar CEP:", error);
      mostrarNotificacao("Erro ao buscar CEP.", "error");
    });
}

function preencherEndereco(data) {
  const campos = {
    endereco: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade + " - " + data.uf,
  };

  Object.entries(campos).forEach(([campo, valor]) => {
    const elemento = document.getElementById(campo);
    if (elemento && valor) {
      elemento.value = valor;
    }
  });
}

function configurarBotoesFormulario() {
  // Botão Salvar
  const btnSalvar = document.getElementById("btnSalvar");
  if (btnSalvar) {
    btnSalvar.addEventListener("click", salvarProfissional);
  }

  // Botão Novo
  const btnNovo = document.getElementById("btnNovo");
  if (btnNovo) {
    btnNovo.addEventListener("click", limparFormulario);
  }

  // Botão Cancelar
  const btnCancelar = document.getElementById("btnCancelar");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", async () => {
      if (
        await confirmar(
          "Deseja realmente cancelar? Todas as alterações não salvas serão perdidas.",
        )
      ) {
        window.history.back();
      }
    });

    // Máscara leve para inserir automaticamente as barras ao digitar (dd/mm/aaaa)
    try {
      const inp = document.getElementById("dataNascimento");
      if (inp) {
        inp.setAttribute("placeholder", "dd/mm/aaaa");
        inp.addEventListener("input", function () {
          const v = this.value.replace(/\D/g, "").slice(0, 8);
          let out = "";
          if (v.length > 0) out = v.slice(0, 2);
          if (v.length > 2) out += "/" + v.slice(2, 4);
          if (v.length > 4) out += "/" + v.slice(4, 8);
          this.value = out;
        });
      }
    } catch (e) {
      console.debug("mask dataNascimento error", e);
    }
  }
}

function configurarUploadAssinatura() {
  const btnUpload = document.querySelector(".btn-upload");
  if (!btnUpload) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".png,image/png";
  input.style.display = "none";
  btnUpload.parentElement.appendChild(input);

  btnUpload.addEventListener("click", () => input.click());

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "image/png") {
      mostrarNotificacao("Apenas arquivos PNG são aceitos.", "warning");
      input.value = "";
      return;
    }

    // Guardar o File para enviar junto ao salvar
    btnUpload._arquivoSelecionado = file;

    const fileInfo = btnUpload.parentElement.querySelector(".file-info");
    fileInfo.textContent = `Arquivo selecionado: ${file.name}`;
    fileInfo.style.color = "var(--color-primary)";

    // Mostrar preview clicável
    _mostrarPreviewAssinatura(URL.createObjectURL(file), file.name);
  });
}

function _mostrarPreviewAssinatura(url, nome) {
  const container = document.querySelector(".file-upload");
  if (!container) return;

  // Remover preview anterior se houver
  const anterior = container.querySelector(".assinatura-preview");
  if (anterior) anterior.remove();

  const preview = document.createElement("div");
  preview.className = "assinatura-preview";
  preview.style.cssText =
    "margin-top:8px;display:flex;align-items:center;gap:8px;";
  preview.innerHTML = `
    <img src="${url}" style="height:40px;border:1px solid #ddd;border-radius:4px;cursor:pointer;" title="Clique para abrir" />
    <a href="${url}" target="_blank" style="font-size:13px;color:var(--color-primary);text-decoration:underline;cursor:pointer;">${nome || "Ver assinatura"}</a>
  `;
  // Clique na imagem abre em nova aba
  preview
    .querySelector("img")
    .addEventListener("click", () => window.open(url, "_blank"));
  container.appendChild(preview);
}

function salvarProfissional() {
  const form = document.getElementById("cadastroProfissionalForm");
  const formData = new FormData(form);

  // Validações básicas
  const nome = formData.get("nome");
  if (!nome || nome.trim() === "") {
    mostrarNotificacao("Nome é obrigatório.", "error");
    document.getElementById("nome").focus();
    return;
  }

  // Coletar dados do formulário (todos os campos do banco)
  const perfilComissaoVal = formData.get("perfilComissao");
  const funcoesSelecionadas = Array.from(
    document.querySelectorAll('input[name="funcoes"]:checked'),
  )
    .map((cb) => cb.value)
    .join(",");

  const profissionalData = {
    nome: formData.get("nome") || null,
    tipoPessoa: formData.get("tipoPessoa") || null,
    cpf: formData.get("cpf") || null,
    rg: formData.get("rg") || null,
    dataNascimento: formData.get("dataNascimento") || null,
    sexo: formData.get("sexo") || null,
    cep: formData.get("cep") || null,
    endereco: formData.get("endereco") || null,
    numero: formData.get("numero") || null,
    complemento: formData.get("complemento") || null,
    bairro: formData.get("bairro") || null,
    cidade: formData.get("cidade") || null,
    proximidade: formData.get("proximidade") || null,
    telefone: formData.get("telefone") || null,
    email: formData.get("email") || null,
    tags: formData.get("tags") || null,
    funcoes: funcoesSelecionadas || null,
    especialidade: formData.get("especialidade") || null,
    crmv: formData.get("crmv") || null,
    perfilComissao: perfilComissaoVal ? parseInt(perfilComissaoVal) : null,
    status: "ativo",
  };

  console.log("💾 Salvando profissional:", profissionalData);

  // Se houver ID do banco, é edição (PUT); senão é criação (POST)
  const savePromise = _profissionalEditandoDbId
    ? ApiClient.atualizarProfissional(
        _profissionalEditandoDbId,
        profissionalData,
      )
    : ApiClient.criarProfissional(profissionalData);

  savePromise
    .then(async (profissionalSalvo) => {
      console.log("✅ Profissional salvo no backend:", profissionalSalvo);

      // Fazer upload da assinatura se houver arquivo selecionado
      const btnUpload = document.querySelector(".btn-upload");
      const arquivo = btnUpload && btnUpload._arquivoSelecionado;
      const idParaUpload = profissionalSalvo.id || _profissionalEditandoDbId;

      if (arquivo && idParaUpload) {
        try {
          const fd = new FormData();
          fd.append("assinatura", arquivo);
          const resp = await fetch(
            `/api/profissionais/${idParaUpload}/assinatura`,
            {
              method: "POST",
              body: fd,
            },
          );
          if (!resp.ok) throw new Error("Falha no upload");
          console.log("✅ Assinatura enviada com sucesso");
        } catch (err) {
          console.error("❌ Erro ao enviar assinatura:", err);
          mostrarNotificacao(
            "Dados salvos, mas falha ao enviar assinatura.",
            "warning",
          );
        }
      }

      mostrarNotificacao(
        _profissionalEditandoDbId
          ? "Profissional atualizado com sucesso! Redirecionando..."
          : "Profissional salvo com sucesso! Redirecionando...",
        "success",
      );

      setTimeout(() => {
        window.location.href = "profissional.html";
      }, 1500);
    })
    .catch((error) => {
      console.error("❌ Erro ao salvar profissional no backend:", error);
      mostrarNotificacao(
        "Erro ao salvar profissional: " + error.message,
        "error",
      );
    });
}

async function limparFormulario() {
  if (await confirmar("Deseja limpar todos os campos do formulário?")) {
    document.getElementById("cadastroProfissionalForm").reset();
    mostrarNotificacao("Formulário limpo.", "info");
  }
}

function mostrarNotificacao(mensagem, tipo = "info") {
  // Criar elemento de notificação
  const notificacao = document.createElement("div");
  notificacao.className = `notificacao notificacao-${tipo}`;
  notificacao.innerHTML = `
        <div class="notificacao-content">
            <i class="fas fa-${getIconeNotificacao(tipo)}"></i>
            <span>${mensagem}</span>
        </div>
    `;

  // Estilos inline para a notificação
  notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getCorNotificacao(tipo)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;

  document.body.appendChild(notificacao);

  // Remover após 4 segundos
  setTimeout(() => {
    notificacao.style.animation = "slideOutRight 0.3s ease-in";
    setTimeout(() => notificacao.remove(), 300);
  }, 4000);
}

function getIconeNotificacao(tipo) {
  const icones = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };
  return icones[tipo] || "info-circle";
}

function getCorNotificacao(tipo) {
  const cores = {
    success: "#28a745",
    error: "#dc3545",
    warning: "#ffc107",
    info: "#007bff",
  };
  return cores[tipo] || "#007bff";
}

// ID do profissional sendo editado (null = novo cadastro)
let _profissionalEditandoDbId = null;

// Verificar se está editando um profissional
function verificarEdicaoProfissional() {
  // Usar URL param para sobreviver a recarregamentos de página
  const params = new URLSearchParams(window.location.search);
  const codigoProfissional =
    params.get("id") || localStorage.getItem("profissionalEditando");
  if (codigoProfissional) {
    console.log(
      "🔧 Modo edição ativado para profissional código:",
      codigoProfissional,
    );
    carregarDadosProfissional(codigoProfissional);

    // Atualizar título e botão
    const titulo = document.querySelector("h1");
    const botaoSalvar = document.getElementById("salvarProfissional");
    if (titulo) titulo.textContent = "Editar Profissional";
    if (botaoSalvar)
      botaoSalvar.innerHTML =
        '<i class="fas fa-save"></i> Atualizar Profissional';

    // Limpar localStorage (compatibilidade retroativa)
    localStorage.removeItem("profissionalEditando");
  }
}

// Carregar dados do profissional para edição
async function carregarDadosProfissional(id) {
  try {
    console.log("🔄 Carregando profissional do backend com id:", id);
    const profissional = await ApiClient.getProfissional(id);

    if (profissional && profissional.id) {
      console.log("📋 Carregando dados do profissional:", profissional.nome);

      // Salvar ID do banco para usar o PUT ao salvar
      _profissionalEditandoDbId = profissional.id;

      // Carregar perfis primeiro e depois preencher o formulário (para o select de comissão ficar certo)
      await carregarPerfisComissaoProfissional(
        profissional.perfilComissao || profissional.comissao || null,
      );
      preencherFormulario(profissional);
      mostrarNotificacao("Dados carregados para edição!", "info");
    } else {
      console.warn("⚠️ Profissional não encontrado para edição");
      mostrarNotificacao("Profissional não encontrado!", "error");
    }
  } catch (error) {
    console.error("Erro ao carregar dados do profissional:", error);
    mostrarNotificacao("Erro ao carregar dados!", "error");
  }
}

// Preencher formulário com dados do profissional
function preencherFormulario(profissional) {
  // Campos de texto/select simples
  const campos = {
    nome: profissional.nome,
    tipoPessoa: profissional.tipoPessoa,
    cpf: profissional.cpf,
    rg: profissional.rg,
    dataNascimento: profissional.dataNascimento,
    sexo: profissional.sexo,
    cep: profissional.cep,
    endereco: profissional.endereco,
    numero: profissional.numero,
    complemento: profissional.complemento,
    bairro: profissional.bairro,
    cidade: profissional.cidade,
    proximidade: profissional.proximidade,
    telefone: profissional.telefone,
    email: profissional.email,
    tags: profissional.tags,
    especialidade: profissional.especialidade,
    crmv: profissional.crmv,
  };

  Object.keys(campos).forEach((campo) => {
    const elemento = document.getElementById(campo);
    if (elemento && campos[campo] != null) {
      elemento.value = campos[campo];
    }
  });

  // Marcar checkboxes de funções
  if (profissional.funcoes) {
    const funcoesSalvas = profissional.funcoes.split(",").map((f) => f.trim());
    document.querySelectorAll('input[name="funcoes"]').forEach((cb) => {
      cb.checked = funcoesSalvas.includes(cb.value);
    });
  }
  // Exibir assinatura já salva como preview clicável
  if (profissional.assinatura) {
    const fileInfo = document.querySelector(".file-info");
    if (fileInfo) {
      fileInfo.textContent = "Assinatura salva";
      fileInfo.style.color = "var(--color-primary)";
    }
    _mostrarPreviewAssinatura(profissional.assinatura, "Ver assinatura");
  }
  // perfilComissao já foi definido pelo select em carregarPerfisComissaoProfissional

  console.log("✅ Formulário preenchido com dados do profissional");
}
