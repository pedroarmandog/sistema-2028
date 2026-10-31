// Sistema de Filtros Simples e Funcional
console.log("🚀 Filtros simples carregados");

// HABILITADO NOVAMENTE - sistema de filtros ativo
let sistemaFiltrosAtivo = true;

// Interceptar mudança de itens por página para restaurar comportamento normal
window.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que todas as funções estejam carregadas
  setTimeout(() => {
    console.log(
      "📋 Sistema de filtros carregado (temporariamente desabilitado)",
    );
  }, 100);
});

// Função de teste para verificar clientes
window.testarClientes = function () {
  console.log("🧪 === TESTE DE CLIENTES ===");
  console.log("📊 window.todosClientes:", window.todosClientes?.length || 0);
  console.log("📊 window.allClients:", window.allClients?.length || 0);
  console.log(
    "📊 window.clientesFiltrados:",
    window.clientesFiltrados?.length || 0,
  );

  if (window.todosClientes && window.todosClientes.length > 0) {
    console.log("👥 Primeiros 5 clientes:");
    window.todosClientes.slice(0, 5).forEach((cliente, index) => {
      console.log(
        `  ${index + 1}. ${cliente.nome} - Grupo: ${cliente.grupo_cliente}`,
      );
    });
  }

  if (window.allClients && window.allClients.length > 0) {
    console.log("👥 Grupos únicos encontrados nos clientes:");
    const grupos = [
      ...new Set(
        window.allClients.map((c) => c.grupo_cliente).filter((g) => g),
      ),
    ];
    grupos.forEach((grupo) => {
      const key = grupo.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");
      console.log(`  - "${grupo}" → key: "${key}"`);
    });
  }

  console.log("🏷️ Filtros ativos:", window.filtrosAtivos);
  console.log("🧪 ==================");
};

// Nova função para testar filtros especificamente
window.testarFiltros = function () {
  console.log("🔍 === TESTE DE FILTROS ===");
  console.log("🏷️ Filtros ativos:", window.filtrosAtivos);

  if (window.filtrosAtivos.grupos.length > 0) {
    console.log("🔍 Testando aplicação de filtros de grupo...");
    aplicarFiltrosSimples();
  } else {
    console.log("ℹ️ Nenhum filtro de grupo ativo");
  }

  console.log("🔍 ==================");
};

// Função para debugar estado atual dos filtros
window.debugEstadoFiltros = function () {
  console.log("🐛 === DEBUG ESTADO FILTROS ===");
  console.log("🏷️ Filtros ativos grupos:", window.filtrosAtivos.grupos);
  console.log(
    "🏷️ Quantidade de filtros grupos:",
    window.filtrosAtivos.grupos.length,
  );
  console.log("📊 Filtros ativos status:", window.filtrosAtivos.status);
  console.log(
    "📊 Quantidade de filtros status:",
    window.filtrosAtivos.status.length,
  );

  // Verificar checkboxes marcados
  const checkboxes = document.querySelectorAll(
    '#gruposClientesFilter input[type="checkbox"]',
  );
  console.log("☑️ Checkboxes grupos encontrados:", checkboxes.length);

  checkboxes.forEach((checkbox, index) => {
    console.log(
      `  ${index + 1}. Value: "${checkbox.value}" - Checked: ${checkbox.checked}`,
    );
  });

  // Verificar checkboxes de status
  const statusCheckboxes = document.querySelectorAll(
    'input[type="checkbox"][onchange*="alterarFiltroStatus"]',
  );
  console.log("📊 Checkboxes status encontrados:", statusCheckboxes.length);

  statusCheckboxes.forEach((checkbox, index) => {
    console.log(
      `  ${index + 1}. Value: "${checkbox.value}" - Checked: ${checkbox.checked}`,
    );
  });

  // DEBUG: Mostrar grupos reais dos clientes
  console.log("🔍 === GRUPOS REAIS DOS CLIENTES ===");
  const gruposReais = [
    ...new Set(
      window.todosClientes.map((c) => c.grupo_cliente).filter((g) => g),
    ),
  ];
  gruposReais.forEach((grupo) => {
    const key = grupo.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");
    const count = window.todosClientes.filter(
      (c) => c.grupo_cliente === grupo,
    ).length;
    console.log(`  "${grupo}" → key: "${key}" (${count} clientes)`);

    // Debug específico para Assinantes
    if (key === "assinantes" || grupo.toLowerCase().includes("assinante")) {
      console.log(`    🔍 DETALHES ASSINANTES:`);
      const assinantes = window.todosClientes.filter(
        (c) => c.grupo_cliente === grupo,
      );
      assinantes.slice(0, 3).forEach((cliente) => {
        console.log(`      - ${cliente.nome} (id: ${cliente.id})`);
      });
    }
  });

  // Contar clientes por grupo
  if (window.filtrosAtivos.grupos.length > 0) {
    let totalEsperado = 0;
    window.filtrosAtivos.grupos.forEach((grupoKey) => {
      console.log(`🔍 Procurando clientes para grupo key: "${grupoKey}"`);

      const clientesDoGrupo = window.todosClientes.filter((cliente) => {
        if (!cliente.grupo_cliente) return false;
        const clienteKey = cliente.grupo_cliente
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[()]/g, "");

        const match = clienteKey === grupoKey;
        // Mostrar apenas alguns exemplos para não poluir o log
        if (match && clientesDoGrupo.length < 3) {
          console.log(
            `    ✅ ${cliente.nome}: "${cliente.grupo_cliente}" → "${clienteKey}"`,
          );
        }
        return match;
      });

      console.log(`📊 Grupo "${grupoKey}": ${clientesDoGrupo.length} clientes`);
      totalEsperado += clientesDoGrupo.length;
    });
    console.log(`📊 Total esperado: ${totalEsperado} clientes`);
  } else {
    console.log("ℹ️ Nenhum filtro ativo - contando todos os grupos:");
    const gruposReais = [
      ...new Set(
        window.todosClientes.map((c) => c.grupo_cliente).filter((g) => g),
      ),
    ];
    gruposReais.forEach((grupo) => {
      const count = window.todosClientes.filter(
        (c) => c.grupo_cliente === grupo,
      ).length;
      console.log(`  📊 "${grupo}": ${count} clientes`);
    });
  }

  console.log("🐛 ============================");
};

// Função para testar filtros múltiplos
window.testarFiltrosMultiplos = function () {
  console.log("🔍 === TESTE FILTROS MÚLTIPLOS ===");

  // Simular seleção de múltiplos grupos
  window.filtrosAtivos.grupos = ["banho-quente", "banho-frio"];
  console.log("🏷️ Simulando filtros:", window.filtrosAtivos.grupos);

  // Contar clientes por grupo
  const grupos = ["banho-quente", "banho-frio"];
  let totalEsperado = 0;

  grupos.forEach((grupo) => {
    const clientes = window.todosClientes.filter((cliente) => {
      if (!cliente.grupo_cliente) return false;
      const key = cliente.grupo_cliente
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[()]/g, "");
      return key === grupo;
    });
    console.log(`📊 Grupo "${grupo}": ${clientes.length} clientes`);
    totalEsperado += clientes.length;
  });

  console.log(`📊 Total esperado: ${totalEsperado} clientes`);

  // Aplicar filtros
  aplicarFiltrosSimples();

  console.log("🔍 ==================");
};

// Estado dos filtros
window.filtrosAtivos = {
  busca: "",
  grupos: [],
  status: [], // 'ativo', 'inativo'
  aniversariantes: [], // 'hoje', 'esta-semana', 'este-mes'
  diasSemFaturamento: [], // '7-dias', '15-dias', '30-dias', '60-dias'
  dataCadastro: [], // 'hoje', 'ontem', 'ultima-semana', 'ultimo-mes'
};

// Dados dos clientes
window.todosClientes = [];
window.clientesFiltrados = [];

// Função para mostrar/ocultar filtros
function toggleFilters() {
  console.log("🔽 Toggle filtros chamado");

  const filterBar = document.getElementById("filterBar");
  const advancedFilters = document.getElementById("advancedFilters");

  if (!filterBar) {
    console.error("❌ FilterBar não encontrado");
    return;
  }

  const isHidden =
    filterBar.style.display === "none" ||
    filterBar.style.maxHeight === "0px" ||
    !filterBar.classList.contains("expanded");

  if (isHidden) {
    // Mostrar filtros
    filterBar.style.display = "block";
    filterBar.style.maxHeight = "500px";
    filterBar.classList.add("expanded");

    // IMPORTANTE: Adicionar classe expanded aos filtros avançados também
    if (advancedFilters) {
      advancedFilters.classList.add("expanded");
      console.log("✅ Filtros avançados expandidos");
    }

    console.log("✅ Filtros mostrados");

    // Carregar grupos imediatamente
    setTimeout(() => {
      carregarGruposSimples();
    }, 100);
  } else {
    // Ocultar filtros
    filterBar.style.display = "none";
    filterBar.style.maxHeight = "0px";
    filterBar.classList.remove("expanded");

    // Remover classe expanded dos filtros avançados também
    if (advancedFilters) {
      advancedFilters.classList.remove("expanded");
      console.log("✅ Filtros avançados recolhidos");
    }

    console.log("✅ Filtros ocultados");
  }
}

// Carregar grupos de forma simples
async function carregarGruposSimples() {
  console.log("📂 Carregando grupos simples (via API)...");

  const container = document.getElementById("gruposClientesFilter");
  if (!container) {
    console.error("❌ Container de grupos não encontrado");
    console.log(
      "📝 Elementos com ID encontrados:",
      Array.from(document.querySelectorAll("[id]")).map((el) => el.id),
    );
    return;
  }

  console.log("✅ Container encontrado:", container);

  let grupos = [];
  try {
    const resp = await fetch("/api/grupos-clientes");
    if (resp.ok) {
      grupos = await resp.json();
      console.log("✅ Grupos carregados da API:", grupos.length);
    } else {
      console.warn("⚠️ API devolveu", resp.status, "- usando fallback interno");
    }
  } catch (err) {
    console.warn("⚠️ Erro ao acessar API de grupos:", err);
  }

  // fallback se API não retornar nada
  if (!grupos || grupos.length === 0) {
    container.innerHTML =
      '<p style="color: #666; padding: 10px;">Nenhum grupo encontrado</p>';
    // garantir que não fiquem mapeamentos antigos
    atualizarMapeamentoGrupos([]);
    return;
  }

  let html = "";
  grupos.forEach((grupo) => {
    // Converter nome para key (mesmo padrão usado antes)
    const key = grupo.nome
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[()]/g, "");

    html += `
            <label class="checkbox-item" style="display: flex; align-items: center; margin: 10px 0; cursor: pointer; padding: 8px; border-radius: 4px; transition: all 0.3s ease;">
                <input type="checkbox" value="${key}" style="margin-right: 10px;" onchange="alterarFiltroGrupo('${key}', this.checked)">
                <div style="width: 12px; height: 12px; background: ${grupo.cor}; border-radius: 50%; margin-right: 8px;"></div>
                <span style="font-size: 14px;">${grupo.nome}</span>
            </label>
        `;
  });

  container.innerHTML = html;
  console.log("✅ Grupos carregados e inseridos:", grupos.length);
  console.log("📄 HTML inserido:", html.substring(0, 100) + "...");

  // Atualizar mapeamento dinâmico para as tags
  atualizarMapeamentoGrupos(grupos);
}

// Variáveis globais para mapeamento dinâmico
window.gruposNomesDinamicos = {};
window.gruposCoresDinamicas = {};

// Função para atualizar mapeamento dinâmico dos grupos
function atualizarMapeamentoGrupos(grupos) {
  window.gruposNomesDinamicos = {};
  window.gruposCoresDinamicas = {};

  grupos.forEach((grupo) => {
    const key = grupo.nome
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[()]/g, "");

    window.gruposNomesDinamicos[key] = grupo.nome;
    window.gruposCoresDinamicas[key] = grupo.cor;
  });

  console.log("🔄 Mapeamento atualizado:", {
    nomes: window.gruposNomesDinamicos,
    cores: window.gruposCoresDinamicas,
  });
}

// Alterar filtro de grupo
function alterarFiltroGrupo(grupoKey, isChecked) {
  console.log(`🏷️ === ALTERANDO FILTRO DE GRUPO ===`);
  console.log(`🏷️ Grupo key: "${grupoKey}"`);
  console.log(`🏷️ Checked: ${isChecked}`);
  console.log(`🏷️ Filtros grupos antes:`, window.filtrosAtivos.grupos);

  if (isChecked) {
    if (!window.filtrosAtivos.grupos.includes(grupoKey)) {
      window.filtrosAtivos.grupos.push(grupoKey);
      console.log(`✅ Grupo "${grupoKey}" ADICIONADO`);
    } else {
      console.log(`ℹ️ Grupo "${grupoKey}" já estava na lista`);
    }
  } else {
    window.filtrosAtivos.grupos = window.filtrosAtivos.grupos.filter(
      (g) => g !== grupoKey,
    );
    console.log(`❌ Grupo "${grupoKey}" REMOVIDO`);
  }

  console.log(`🏷️ Filtros grupos depois:`, window.filtrosAtivos.grupos);
  console.log(`�️ ================================`);

  // Atualizar visual dos filtros
  atualizarVisualFiltros();

  // Atualizar tags de filtros ativos
  atualizarTagsFiltros();

  aplicarFiltrosSimples();
}

// Função para atualizar o visual dos filtros
function atualizarVisualFiltros() {
  const checkboxes = document.querySelectorAll(
    '#gruposClientesFilter input[type="checkbox"]',
  );

  checkboxes.forEach((checkbox) => {
    const label = checkbox.closest(".checkbox-item");
    if (!label) return;

    // Sempre manter aparência normal, apenas o checkbox marcado mostra a seleção
    label.style.backgroundColor = "transparent";
    label.style.color = "#333";
    label.style.padding = "8px";
    label.style.border = "none";
    label.style.borderRadius = "4px";

    if (checkbox.checked) {
      label.classList.add("selected");
    } else {
      label.classList.remove("selected");
    }
  });

  // Atualizar ícone do filtro
  atualizarIconeFiltro();
}

// Função para limpar todos os filtros
function limparFiltros() {
  console.log("🧹 Limpando todos os filtros...");

  // Resetar estado dos filtros
  window.filtrosAtivos = {
    busca: "",
    grupos: [],
    status: [],
    aniversariantes: [],
    diasSemFaturamento: [],
    dataCadastro: [],
  };

  // Limpar campo de busca
  const searchInput = document.getElementById("searchClients");
  if (searchInput) {
    searchInput.value = "";
  }

  // Desmarcar todos os checkboxes
  const checkboxes = document.querySelectorAll(
    '.filter-panel input[type="checkbox"]',
  );
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  // CORREÇÃO 3: Restaurar dados originais corretamente
  if (
    window.todosClientesOriginais &&
    window.todosClientesOriginais.length > 0
  ) {
    console.log(
      "🔄 Restaurando dados originais para",
      window.todosClientesOriginais.length,
      "clientes",
    );

    // Restaurar dados no sistema de paginação
    window.allClients = [...window.todosClientesOriginais];
    window.totalClients = window.todosClientesOriginais.length;
    window.currentPage = 1;

    // Limpar flag de filtros ativos
    delete window.todosClientesOriginais;

    // Atualizar exibição
    if (window.updateDisplayAndPagination) {
      window.updateDisplayAndPagination();
    } else {
      window.displayClients(window.allClients);
    }
  } else {
    console.log("🔄 Aplicando filtros vazios (sem dados originais salvos)");
    aplicarFiltrosSimples();
  }

  // Atualizar visual
  atualizarVisualFiltros();
  atualizarTagsFiltros();
  atualizarIconeFiltro();

  console.log("✅ Filtros limpos");
}

// Função para atualizar ícone do filtro
function atualizarIconeFiltro() {
  const filterButton = document.querySelector(
    'button[onclick="toggleFilters()"]',
  );
  if (!filterButton) return;

  // Verificar se há filtros ativos
  const temFiltrosAtivos =
    window.filtrosAtivos.grupos.length > 0 ||
    (window.filtrosAtivos.busca && window.filtrosAtivos.busca.trim() !== "");

  if (temFiltrosAtivos) {
    // Ícone azul quando há filtros ativos
    filterButton.style.backgroundColor = "#007bff";
    filterButton.style.color = "white";
    filterButton.style.border = "1px solid #007bff";
  } else {
    // Ícone normal quando não há filtros
    filterButton.style.backgroundColor = "#ffffff";
    filterButton.style.color = "#6c757d";
    filterButton.style.border = "1px solid #dee2e6";
  }
}

// Função para atualizar as tags de filtros ativos
function atualizarTagsFiltros() {
  const filterTags = document.getElementById("filterTags");
  if (!filterTags) return;

  let tagsHtml = "";

  // Usar mapeamento dinâmico (carregado do localStorage)
  const gruposNomes = window.gruposNomesDinamicos || {};
  const gruposCores = window.gruposCoresDinamicas || {};

  // Adicionar tags para grupos ativos
  window.filtrosAtivos.grupos.forEach((grupo) => {
    const nome = gruposNomes[grupo] || grupo;
    const cor = gruposCores[grupo] || "#007bff";

    console.log(`🎨 Tag: Grupo=${grupo}, Nome=${nome}, Cor=${cor}`);

    tagsHtml += `
            <span class="filter-tag" style="background: ${cor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin: 2px; display: inline-block;">
                ${nome}
                <button onclick="removerFiltroGrupo('${grupo}')" style="background: none; border: none; color: white; margin-left: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">×</button>
            </span>
        `;
  });

  filterTags.innerHTML = tagsHtml;
}

// Função para remover filtro de grupo pela tag
function removerFiltroGrupo(grupoKey) {
  // Desmarcar checkbox
  const checkbox = document.querySelector(
    `#gruposClientesFilter input[value="${grupoKey}"]`,
  );
  if (checkbox) {
    checkbox.checked = false;
    alterarFiltroGrupo(grupoKey, false);
  }
}

// Funções para filtros adicionais
function alterarFiltroStatus(status, isChecked) {
  console.log("📊 === ALTERANDO FILTRO DE STATUS ===");
  console.log("📊 Status:", status);
  console.log("📊 Checked:", isChecked);
  console.log("📊 Filtros status antes:", window.filtrosAtivos.status);

  if (isChecked) {
    if (!window.filtrosAtivos.status.includes(status)) {
      window.filtrosAtivos.status.push(status);
      console.log('✅ Status "' + status + '" ADICIONADO');
    }
  } else {
    window.filtrosAtivos.status = window.filtrosAtivos.status.filter(
      (s) => s !== status,
    );
    console.log('❌ Status "' + status + '" REMOVIDO');
  }

  console.log("📊 Filtros status depois:", window.filtrosAtivos.status);
  console.log("📊 ================================");

  aplicarFiltrosSimples();
}

function alterarFiltroAniversariantes(periodo, isChecked) {
  console.log(
    `🎂 Aniversariantes ${periodo}: ${isChecked ? "marcado" : "desmarcado"}`,
  );

  if (isChecked) {
    if (!window.filtrosAtivos.aniversariantes.includes(periodo)) {
      window.filtrosAtivos.aniversariantes.push(periodo);
    }
  } else {
    window.filtrosAtivos.aniversariantes =
      window.filtrosAtivos.aniversariantes.filter((a) => a !== periodo);
  }

  aplicarFiltrosSimples();
}

function alterarFiltroDiasSemFaturamento(dias, isChecked) {
  console.log(
    `💰 Dias sem faturamento ${dias}: ${isChecked ? "marcado" : "desmarcado"}`,
  );

  if (isChecked) {
    if (!window.filtrosAtivos.diasSemFaturamento.includes(dias)) {
      window.filtrosAtivos.diasSemFaturamento.push(dias);
    }
  } else {
    window.filtrosAtivos.diasSemFaturamento =
      window.filtrosAtivos.diasSemFaturamento.filter((d) => d !== dias);
  }

  aplicarFiltrosSimples();
}

function alterarFiltroDataCadastro(periodo, isChecked) {
  console.log(
    `📅 Data cadastro ${periodo}: ${isChecked ? "marcado" : "desmarcado"}`,
  );

  if (isChecked) {
    if (!window.filtrosAtivos.dataCadastro.includes(periodo)) {
      window.filtrosAtivos.dataCadastro.push(periodo);
    }
  } else {
    window.filtrosAtivos.dataCadastro =
      window.filtrosAtivos.dataCadastro.filter((d) => d !== periodo);
  }

  aplicarFiltrosSimples();
}

// Função para buscar clientes diretamente da API
async function buscarClientesDaAPI() {
  try {
    console.log("🌐 Buscando clientes diretamente da API...");
    const response = await fetch("/api/clientes");
    // tentar ler o body como json (seguro)
    const body = await response.json().catch(() => null);

    // Log detalhado para debug de autenticação/rate-limit
    try {
      console.log(
        "[buscarClientesDaAPI] status=",
        response.status,
        "body=",
        body,
      );
      if (response.headers && typeof response.headers.get === "function") {
        console.log(
          "[buscarClientesDaAPI] X-RateLimit-Limit=",
          response.headers.get("x-ratelimit-limit"),
          "Remaining=",
          response.headers.get("x-ratelimit-remaining"),
          "Reset=",
          response.headers.get("x-ratelimit-reset"),
        );
      }
      if (window.__fetchRateLimiterStatus)
        console.debug("[fetch-ratelimiter]", window.__fetchRateLimiterStatus);
    } catch (e) {}

    if (response.ok) {
      // API pode retornar diferentes formatos: array direto ou { success: true, clientes: [...] }
      let clientes = null;
      if (Array.isArray(body)) clientes = body;
      else if (body && Array.isArray(body.clientes)) clientes = body.clientes;
      else if (body && Array.isArray(body.data)) clientes = body.data;

      if (!clientes || clientes.length === 0) {
        console.warn(
          "[buscarClientesDaAPI] nenhum cliente retornado pela API (ou array vazio)",
        );
        return null;
      }

      window.todosClientes = clientes;
      window.allClients = clientes;
      console.log("✅ Clientes obtidos da API:", clientes.length);
      return clientes;
    } else {
      console.error(
        "[buscarClientesDaAPI] Erro ao buscar clientes da API:",
        response.status,
        body,
      );
      // Se não autenticado, verificar sessão explicitamente
      if (response.status === 401 || response.status === 403) {
        try {
          const s = await fetch("/api/usuarios/sessao-ativa");
          const ss = await s.json().catch(() => null);
          console.warn("[sessao-ativa] status=", s.status, "body=", ss);
          if (s.status !== 200 || (ss && ss.ativa === false)) {
            if (window.showNotification)
              window.showNotification(
                "Sessão expirada ou não autenticado. Faça login novamente.",
                "error",
              );
          }
        } catch (e) {
          console.warn("[buscarClientesDaAPI] falha ao checar sessao:", e);
        }
      }
      return null;
    }
  } catch (error) {
    console.error("❌ Erro na requisição:", error);
    return null;
  }
}

// Aplicar filtros de forma simples
function aplicarFiltrosSimples() {
  // TEMPORARIAMENTE DESABILITADO para testar paginação
  if (!sistemaFiltrosAtivo) {
    console.log("🚫 Sistema de filtros desabilitado - pular aplicação");
    return;
  }
  console.log("🔧 === INÍCIO APLICAR FILTROS ===");
  console.log("📊 window.todosClientes:", window.todosClientes?.length || 0);
  console.log("📊 window.allClients:", window.allClients?.length || 0);
  console.log(
    "📊 window.clientesFiltrados:",
    window.clientesFiltrados?.length || 0,
  );
  console.log("🏷️ Filtros ativos:", window.filtrosAtivos);
  console.log("🔧 =================================");

  console.log("🔍 Aplicando filtros simples...");

  // Priorizar dados originais se disponíveis, depois window.allClients
  let fonteDados = null;
  if (window.originalClients && window.originalClients.length > 0) {
    fonteDados = window.originalClients;
    console.log(
      "📦 Usando window.originalClients como fonte:",
      fonteDados.length,
    );
  } else if (window.allClients && window.allClients.length > 0) {
    fonteDados = window.allClients;
    console.log("📦 Usando window.allClients como fonte:", fonteDados.length);
  } else if (window.todosClientes && window.todosClientes.length > 0) {
    fonteDados = window.todosClientes;
    console.log(
      "📦 Usando window.todosClientes como fonte:",
      fonteDados.length,
    );
  } else if (window.clientesFiltrados && window.clientesFiltrados.length > 0) {
    fonteDados = window.clientesFiltrados;
    console.log(
      "📦 Usando window.clientesFiltrados como fonte:",
      fonteDados.length,
    );
  }

  if (!fonteDados || fonteDados.length === 0) {
    console.log("🌐 Tentando buscar da API...");
    buscarClientesDaAPI().then((clientes) => {
      if (clientes && clientes.length > 0) {
        aplicarFiltrosSimples(); // Tentar novamente com os dados da API
      } else {
        console.log("⏳ Aguardando clientes serem carregados...");
        console.log("📊 Estado atual:");
        console.log(
          "  - window.todosClientes:",
          window.todosClientes?.length || 0,
        );
        console.log("  - window.allClients:", window.allClients?.length || 0);
        console.log(
          "  - window.clientesFiltrados:",
          window.clientesFiltrados?.length || 0,
        );

        // Tentar novamente em 1 segundo
        setTimeout(() => {
          console.log("🔄 Tentando aplicar filtros novamente...");
          aplicarFiltrosSimples();
        }, 1000);
      }
    });
    return;
  }

  // Sempre atualizar window.todosClientes para garantir dados frescos
  if (fonteDados) {
    window.todosClientes = [...fonteDados];
    console.log(
      "🔄 window.todosClientes atualizado para:",
      window.todosClientes.length,
      "clientes",
    );
  }

  console.log("📊 Total de clientes disponíveis:", fonteDados.length);
  console.log("🏷️ Filtros ativos:", window.filtrosAtivos);

  let filtrados = [...fonteDados];

  // Filtrar por grupos
  if (window.filtrosAtivos.grupos.length > 0) {
    const antesGrupo = filtrados.length;
    console.log("🔍 Iniciando filtro por grupos...");
    console.log("🔍 Grupos para filtrar:", window.filtrosAtivos.grupos);

    // Debug: contar clientes por grupo antes da filtragem
    window.filtrosAtivos.grupos.forEach((grupoFiltro) => {
      const clientesDoGrupo = fonteDados.filter((cliente) => {
        if (!cliente.grupo_cliente) return false;
        const clienteKey = cliente.grupo_cliente
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[()]/g, "");
        return clienteKey === grupoFiltro;
      });
      console.log(
        `📊 Grupo "${grupoFiltro}": ${clientesDoGrupo.length} clientes encontrados`,
      );
    });

    filtrados = filtrados.filter((cliente) => {
      if (!cliente.grupo_cliente) {
        console.log(`  ❌ Cliente ${cliente.nome}: SEM GRUPO`);
        return false;
      }

      const clienteKey = cliente.grupo_cliente
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[()]/g, "");

      const incluir = window.filtrosAtivos.grupos.includes(clienteKey);

      console.log(
        `  ${incluir ? "✅" : "❌"} Cliente ${cliente.nome}: grupo "${cliente.grupo_cliente}" → key "${clienteKey}" → ${incluir ? "INCLUIR" : "EXCLUIR"}`,
      );

      return incluir;
    });

    console.log(`🏷️ Filtro grupo: ${antesGrupo} → ${filtrados.length}`);
    console.log(
      "🏷️ Clientes filtrados por grupo:",
      filtrados.map((c) => c.nome).slice(0, 5),
    );

    // Debug: mostrar contagem final por grupo
    const contagemFinal = {};
    filtrados.forEach((cliente) => {
      const grupo = cliente.grupo_cliente;
      contagemFinal[grupo] = (contagemFinal[grupo] || 0) + 1;
    });
    console.log("📊 Contagem final por grupo:", contagemFinal);
  }

  // Filtrar por status
  if (window.filtrosAtivos.status.length > 0) {
    const antesStatus = filtrados.length;
    console.log("📊 Iniciando filtro por status...");
    console.log("📊 Status para filtrar:", window.filtrosAtivos.status);

    filtrados = filtrados.filter((cliente) => {
      const clienteStatus = cliente.ativo ? "ativo" : "inativo";
      const incluir = window.filtrosAtivos.status.includes(clienteStatus);

      // Debug para alguns clientes
      if (filtrados.indexOf(cliente) < 3) {
        console.log(
          `  📊 Cliente ${cliente.nome}: ativo=${cliente.ativo} → status="${clienteStatus}" → ${incluir ? "INCLUIR" : "EXCLUIR"}`,
        );
      }

      return incluir;
    });

    console.log(`📊 Filtro status: ${antesStatus} → ${filtrados.length}`);
  }

  // Filtrar por data de cadastro
  if (window.filtrosAtivos.dataCadastro.length > 0) {
    const antesData = filtrados.length;
    console.log("📅 Iniciando filtro por data de cadastro...");

    filtrados = filtrados.filter((cliente) => {
      const dataCadastro = new Date(cliente.createdAt);
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);

      return window.filtrosAtivos.dataCadastro.some((periodo) => {
        switch (periodo) {
          case "hoje":
            return dataCadastro.toDateString() === hoje.toDateString();
          case "ontem":
            return dataCadastro.toDateString() === ontem.toDateString();
          case "ultima-semana":
            const umaSemanaAtras = new Date(hoje);
            umaSemanaAtras.setDate(hoje.getDate() - 7);
            return dataCadastro >= umaSemanaAtras;
          case "ultimo-mes":
            const umMesAtras = new Date(hoje);
            umMesAtras.setMonth(hoje.getMonth() - 1);
            return dataCadastro >= umMesAtras;
          default:
            return true;
        }
      });
    });

    console.log(`📅 Filtro data: ${antesData} → ${filtrados.length}`);
  }

  // Filtrar por aniversariantes
  if (
    window.filtrosAtivos.aniversariantes &&
    window.filtrosAtivos.aniversariantes.length > 0
  ) {
    const antesAniversario = filtrados.length;
    console.log("🎂 Iniciando filtro por aniversariantes...");

    filtrados = filtrados.filter((cliente) => {
      // Verificar se tem data de nascimento ou data de nascimento do pet
      const dataNascimento =
        cliente.data_nascimento ||
        (cliente.pets && cliente.pets[0] && cliente.pets[0].data_nascimento);

      if (!dataNascimento) return false;

      const nascimento = new Date(dataNascimento);
      const hoje = new Date();

      return window.filtrosAtivos.aniversariantes.some((periodo) => {
        switch (periodo) {
          case "hoje":
            return (
              nascimento.getDate() === hoje.getDate() &&
              nascimento.getMonth() === hoje.getMonth()
            );
          case "esta-semana":
            const inicioSemana = new Date(hoje);
            inicioSemana.setDate(hoje.getDate() - hoje.getDay());
            const fimSemana = new Date(inicioSemana);
            fimSemana.setDate(inicioSemana.getDate() + 6);

            const aniversarioEsteAno = new Date(
              hoje.getFullYear(),
              nascimento.getMonth(),
              nascimento.getDate(),
            );
            return (
              aniversarioEsteAno >= inicioSemana &&
              aniversarioEsteAno <= fimSemana
            );
          case "este-mes":
            return nascimento.getMonth() === hoje.getMonth();
          default:
            return true;
        }
      });
    });

    console.log(
      `🎂 Filtro aniversariantes: ${antesAniversario} → ${filtrados.length}`,
    );
  }

  // Filtrar por dias sem faturamento
  if (
    window.filtrosAtivos.diasSemFaturamento &&
    window.filtrosAtivos.diasSemFaturamento.length > 0
  ) {
    const antesFaturamento = filtrados.length;
    console.log("💰 Iniciando filtro por dias sem faturamento...");

    filtrados = filtrados.filter((cliente) => {
      // Para implementar quando tivermos dados de faturamento
      // Por enquanto, retorna true para todos os clientes
      return true;
    });

    console.log(
      `💰 Filtro faturamento: ${antesFaturamento} → ${filtrados.length}`,
    );
  }

  // Filtrar por busca de texto
  if (window.filtrosAtivos.busca && window.filtrosAtivos.busca.trim() !== "") {
    const antesBusca = filtrados.length;
    const termoBusca = window.filtrosAtivos.busca.toLowerCase();
    console.log("🔍 Iniciando filtro por busca:", termoBusca);

    filtrados = filtrados.filter((cliente) => {
      const textoCompleto = `
                ${cliente.nome || ""} 
                ${cliente.email || ""} 
                ${cliente.telefone || ""} 
                ${cliente.cpf || ""} 
                ${cliente.cnpj || ""}
                ${cliente.pets ? cliente.pets.map((pet) => `${pet.nome} ${pet.microchip || ""}`).join(" ") : ""}
            `.toLowerCase();

      return textoCompleto.includes(termoBusca);
    });

    console.log(`🔍 Filtro busca: ${antesBusca} → ${filtrados.length}`);
  }

  // Atualizar tabela
  window.clientesFiltrados = filtrados;

  console.log("📋 Clientes filtrados final:", filtrados.length);

  // CORREÇÃO 1: Integração adequada com a paginação
  // Verificar se há filtros ativos
  const hasFiltrosAtivos =
    window.filtrosAtivos.grupos.length > 0 ||
    window.filtrosAtivos.status.length > 0 ||
    window.filtrosAtivos.aniversariantes.length > 0 ||
    window.filtrosAtivos.diasSemFaturamento.length > 0 ||
    window.filtrosAtivos.dataCadastro.length > 0 ||
    (window.filtrosAtivos.busca && window.filtrosAtivos.busca.trim() !== "");

  if (hasFiltrosAtivos) {
    console.log("🏷️ Filtros ativos - atualizando sistema de paginação");

    // Salvar dados originais apenas uma vez
    if (!window.originalClients || window.originalClients.length === 0) {
      window.originalClients = [...fonteDados];
      console.log(
        "💾 Dados originais salvos:",
        window.originalClients.length,
        "clientes",
      );
    }

    // CORREÇÃO: Atualizar window.allClients com dados filtrados para a paginação funcionar
    window.allClients = [...filtrados];
    window.totalClients = filtrados.length;
    window.currentPage = 1; // Voltar para primeira página

    // Chamar a função de atualização da paginação
    if (
      window.updateDisplayAndPagination &&
      typeof window.updateDisplayAndPagination === "function"
    ) {
      console.log("📊 Atualizando exibição com paginação (dados filtrados)");
      window.updateDisplayAndPagination();
    } else {
      console.log("📊 Fallback: usando displayClients diretamente");
      window.displayClients(filtrados);
    }
  } else {
    console.log("🏷️ Nenhum filtro ativo - restaurando dados originais");

    // CORREÇÃO: Restaurar dados originais quando não há filtros
    if (window.originalClients && window.originalClients.length > 0) {
      console.log("🔄 Restaurando dados originais para paginação");
      window.allClients = [...window.originalClients];
      window.totalClients = window.originalClients.length;
      window.currentPage = 1;

      // Atualizar paginação com dados originais
      if (
        window.updateDisplayAndPagination &&
        typeof window.updateDisplayAndPagination === "function"
      ) {
        console.log("🔄 Restaurando dados originais com paginação");
        window.updateDisplayAndPagination();
      } else {
        window.displayClients(window.originalClients);
      }
    }
  }

  // Atualizar informações de paginação
  const paginationInfo = document.querySelector(".pagination-info");
  if (paginationInfo) {
    paginationInfo.innerHTML = `
            <span>
                <strong>${filtrados.length}</strong> de ${window.todosClientes.length} clientes
                ${hasFiltrosAtivos ? "(filtrados)" : ""}
            </span>
        `;
  }

  // Mostrar resultado
  const total = window.todosClientes.length;
  const mostrado = filtrados.length;
  console.log(`📊 Resultado: ${mostrado}/${total} clientes`);

  // Atualizar ícone do filtro
  atualizarIconeFiltro();

  if (window.showNotification) {
    window.showNotification(`🔍 ${mostrado} de ${total} clientes`, "info");
  }
}

// Atualizar tabela de forma simples
function atualizarTabelaSimples() {
  const tbody = document.getElementById("clientsTableBody");
  if (!tbody) {
    console.error("❌ Tbody não encontrado");
    return;
  }

  if (window.clientesFiltrados.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-search"></i><br>
                    Nenhum cliente encontrado com os filtros selecionados
                </td>
            </tr>
        `;
    return;
  }

  let html = "";
  window.clientesFiltrados.forEach((cliente) => {
    const dataFormatada = new Date(cliente.createdAt).toLocaleDateString(
      "pt-BR",
    );
    const whatsappLink = cliente.telefone
      ? `https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`
      : "#";

    html += `
            <tr>
                <td>
                    <div style="display: flex; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: #333; font-size: 14px;">
                                ${cliente.nome}
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${cliente.ativo ? "#27ae60" : "#e74c3c"};"></div>
                                <span style="color: ${cliente.ativo ? "#27ae60" : "#e74c3c"}; font-weight: 500; font-size: 11px;">${cliente.ativo ? "Ativo" : "Inativo"}</span>
                            </div>
                            ${
                              cliente.pets && cliente.pets.length > 0
                                ? `<div style="color: #666; font-size: 12px; margin-top: 2px;">
                                    <i class="fas fa-paw" style="margin-right: 4px;"></i>
                                    ${cliente.pets.map((pet) => pet.nome).join(", ")}
                                </div>`
                                : ""
                            }
                        </div>
                    </div>
                </td>
                <td>
                    <div style="color: #495057; font-size: 14px;">
                        ${cliente.email || '<span style="color: #999;">---</span>'}
                    </div>
                </td>
                <td>
                    <div style="color: #495057; font-size: 14px;">
                        ${
                          cliente.telefone
                            ? `<a href="${whatsappLink}" target="_blank" style="color: #25d366; text-decoration: none;">
                                <i class="fab fa-whatsapp" style="margin-right: 4px;"></i>
                                ${cliente.telefone}
                            </a>`
                            : '<span style="color: #999;">---</span>'
                        }
                    </div>
                </td>
                <td>
                    <div style="color: #495057; font-size: 14px;">
                        ${dataFormatada}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="action-btn edit-btn" onclick="editarCliente(${cliente.id})" 
                                style="background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 6px 8px; cursor: pointer; color: #007bff; transition: all 0.2s;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="showDeleteModal(${cliente.id}, '${cliente.nome}')" 
                                style="background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 6px 8px; cursor: pointer; color: #dc3545; transition: all 0.2s;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
  });

  tbody.innerHTML = html;
  console.log(
    `✅ Tabela atualizada com ${window.clientesFiltrados.length} clientes`,
  );
}

// Capturar clientes quando carregarem, sem interceptar a função
let tentativasCaptura = 0;
const maxTentativas = 10;

function tentarCapturarClientes() {
  tentativasCaptura++;
  console.log(`🔄 Tentativa ${tentativasCaptura} de capturar clientes...`);

  // Verificar múltiplas fontes
  if (window.allClients && window.allClients.length > 0) {
    console.log(
      "📦 Clientes encontrados em window.allClients:",
      window.allClients.length,
    );
    window.todosClientes = window.allClients;
    return true;
  }

  if (window.clientesFiltrados && window.clientesFiltrados.length > 0) {
    console.log(
      "📦 Clientes encontrados em window.clientesFiltrados:",
      window.clientesFiltrados.length,
    );
    window.todosClientes = window.clientesFiltrados;
    return true;
  }

  // Verificar se a tabela tem conteúdo
  const tbody = document.getElementById("clientsTableBody");
  if (tbody && tbody.children.length > 1) {
    // Mais de 1 linha (cabeçalho)
    console.log("📋 Tabela com conteúdo encontrada, tentando extrair dados...");
  }

  if (tentativasCaptura < maxTentativas) {
    setTimeout(tentarCapturarClientes, 500);
    return false;
  }

  console.log(
    "⚠️ Não foi possível capturar os clientes após",
    maxTentativas,
    "tentativas",
  );
  return false;
}

// Salvar referência da função original sem interceptar
if (window.displayClients && typeof window.displayClients === "function") {
  window.displayClientsOriginal = window.displayClients;
  console.log("✅ Função displayClients original salva");
} else {
  console.log(
    "⚠️ Função displayClients não encontrada no carregamento inicial",
  );
  // Tentar capturar de outras formas
  setTimeout(tentarCapturarClientes, 1000);
}

// Observer para capturar clientes quando carregarem
const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      const tbody = document.getElementById("clientsTableBody");
      if (tbody && tbody.children.length > 1) {
        // Tentar capturar clientes quando a tabela for populada
        if (window.allClients && window.allClients.length > 0) {
          window.todosClientes = window.allClients;
          console.log(
            "👁️ Observer: Clientes capturados da tabela:",
            window.allClients.length,
          );
        }
      }
    }
  });
});

// Observar mudanças na tabela
const tbody = document.getElementById("clientsTableBody");
if (tbody) {
  observer.observe(tbody, { childList: true, subtree: true });
}

console.log("✅ Sistema de filtros simples pronto!");

// Função para verificar a estrutura do DOM
function verificarEstruturaDom() {
  console.log("🔍 Verificando estrutura do DOM...");

  const filterBar = document.getElementById("filterBar");
  const gruposContainer = document.getElementById("gruposClientesFilter");
  const advancedFilters = document.getElementById("advancedFilters");

  console.log("📊 Elementos encontrados:");
  console.log("  - filterBar:", filterBar ? "✅" : "❌", filterBar);
  console.log(
    "  - gruposContainer:",
    gruposContainer ? "✅" : "❌",
    gruposContainer,
  );
  console.log(
    "  - advancedFilters:",
    advancedFilters ? "✅" : "❌",
    advancedFilters,
  );

  if (gruposContainer) {
    console.log(
      "📝 Conteúdo atual do container de grupos:",
      gruposContainer.innerHTML,
    );
    console.log("📏 Dimensões do container:", {
      width: gruposContainer.offsetWidth,
      height: gruposContainer.offsetHeight,
      display: window.getComputedStyle(gruposContainer).display,
      visibility: window.getComputedStyle(gruposContainer).visibility,
    });
  }
}

// Função para recarregar grupos (útil quando um novo grupo é criado)
function recarregarGrupos() {
  console.log("🔄 Recarregando grupos...");
  carregarGruposSimples();
  atualizarVisualFiltros();
  atualizarTagsFiltros();
}

// Expor função globalmente
window.recarregarGruposFiltros = recarregarGrupos;

// Interceptar a função de busca para atualizar o ícone
function interceptarBusca() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  // Substituir completamente o evento onkeyup
  searchInput.removeAttribute("onkeyup");
  searchInput.addEventListener("input", function () {
    window.filtrosAtivos.busca = this.value;
    atualizarIconeFiltro();

    // Aplicar nossos filtros em vez do sistema antigo
    aplicarFiltrosSimples();
  });

  console.log(
    "🔄 Sistema de busca interceptado e redirecionado para nossos filtros",
  );
}

// Desabilitar função applyFilters original se existir
function desabilitarSistemaAntigo() {
  if (window.applyFilters) {
    console.log("🚫 Desabilitando sistema de filtros antigo...");
    window.applyFiltersOriginal = window.applyFilters;
    window.applyFilters = function () {
      console.log("🔄 Redirecionando para nosso sistema de filtros...");
      aplicarFiltrosSimples();
    };
  }

  // REMOVIDO: interceptação que estava causando problemas
  // A função updateDisplayAndPagination deve funcionar normalmente
}

// Carregar grupos automaticamente quando a página carregar
document.addEventListener("DOMContentLoaded", function () {
  console.log(
    "📄 DOM carregado - inicializando filtros simples (DESABILITADO)",
  );

  // TEMPORARIAMENTE DESABILITADO
  if (!sistemaFiltrosAtivo) {
    console.log("🚫 Sistema de filtros desabilitado - não carregar grupos");
    return;
  }

  setTimeout(() => {
    console.log("🔄 Carregando grupos automaticamente...");
    desabilitarSistemaAntigo();
    carregarGruposSimples();
    verificarEstruturaDom();
    interceptarBusca();

    // Aguardar um pouco mais para garantir que os elementos foram criados
    setTimeout(() => {
      atualizarVisualFiltros();
      atualizarTagsFiltros();
      atualizarIconeFiltro();
    }, 200);
  }, 1000);

  // Listener para detectar mudanças no localStorage
  window.addEventListener("storage", function (e) {
    if (e.key === "gruposClientes") {
      console.log("🔄 Detectada mudança nos grupos - recarregando...");
      recarregarGrupos();
    }
  });
});
