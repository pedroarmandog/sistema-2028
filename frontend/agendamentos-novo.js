// Agendamentos JavaScript

// Pequena função utilitária para escapar HTML em resultados de busca
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

class AgendamentosManager {
  constructor() {
    console.log("🏗️ Construindo AgendamentosManager...");
    this.agendamentos = [];
    this.filtros = {};
    this.viewMode = "list";
    this.period = "day";
    this.currentDate = new Date();
    this._loadToken = 0; // controla race conditions no loadAgendamentos
    try {
      const params = new URLSearchParams(window.location.search || "");
      const periodParam = params.get("period");
      const dateParam = params.get("date");
      this._periodFromUrl = false;
      if (
        periodParam &&
        ["today", "day", "week", "month"].includes(periodParam)
      ) {
        this.period = periodParam;
        this._periodFromUrl = true;
      }
      if (dateParam) {
        const parsed = new Date(dateParam);
        if (!isNaN(parsed.getTime())) this.currentDate = parsed;
      }
      if (this.period === "today") this.currentDate = new Date();
    } catch (e) {
      console.warn("Erro lendo parâmetros de URL:", e);
    }
    console.log("📅 Data atual definida:", this.currentDate);
    this.init();
    console.log("✅ AgendamentosManager construído com sucesso");
  }

  init() {
    console.log("⚙️ Inicializando AgendamentosManager...");
    this.setupEventListeners();
    this.updateDateDisplay();
    this.setupModalEvents();
    this.setupNovoAgendamentoSidebar();
    this.setupUpdateListener();
    // Carregar filtros salvos antes de carregar agendamentos
    this.loadSavedFilters()
      .then(() => {
        // Carregar período salvo e aplicar
        return this.loadSavedPeriod();
      })
      .then(() => {
        // Carregar data salva
        return this.loadSavedDate();
      })
      .then(() => {
        // Carregar agendamentos conforme período atual (Hoje/Dia/Semana/Mês)
        console.log("🔄 Carregando agendamentos para período:", this.period);
        this.handlePeriodChange(this.period);
      });
    // Atualizar lista quando o usuário navegar com o botão Voltar/Avançar
    try {
      window.addEventListener("popstate", () => {
        try {
          this.loadAgendamentos();
        } catch (e) {}
      });
      window.addEventListener("pageshow", (ev) => {
        try {
          if (ev && ev.persisted) this.loadAgendamentos();
        } catch (e) {}
      });
    } catch (e) {
      console.warn("Navigation listeners not attached", e);
    }
    console.log("✅ Inicialização concluída");
  }

  setupEventListeners() {
    console.log("🎧 Configurando event listeners...");

    // Verificar se elementos existem
    console.log("🔍 Verificando elementos...");
    const statusTags = document.querySelectorAll(".status-tag");
    const applyBtn = document.querySelector(".btn-filter");
    const refreshBtn = document.querySelector(".btn-refresh");

    console.log(`🏷️ Status tags encontradas: ${statusTags.length}`);
    console.log(`🔘 Botão aplicar: ${applyBtn ? "SIM" : "NÃO"}`);
    console.log(`🔄 Botão refresh: ${refreshBtn ? "SIM" : "NÃO"}`);

    // Menu toggle para sidebar — ligar a todos os botões .menu-toggle
    const menuToggles = Array.from(document.querySelectorAll(".menu-toggle"));
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");

    console.log("Elementos encontrados:", {
      menuToggles: menuToggles.length,
      sidebar: !!sidebar,
      mainContent: !!mainContent,
    });

    if (menuToggles.length && sidebar && mainContent) {
      // Se outro módulo já configurou o toggle (ex: menu.js), não reaplicar handlers
      const alreadyConfigured = menuToggles.some(
        (t) =>
          t.hasAttribute("data-toggle-configured") ||
          t.hasAttribute("data-toggle-attached"),
      );
      if (alreadyConfigured) {
        console.log(
          "[agendamentos-novo] menu toggle já configurado por outro módulo; pulando registro local",
        );
      } else {
        menuToggles.forEach((mt) => {
          if (!mt.hasAttribute("data-toggle-attached")) {
            mt.setAttribute("data-toggle-attached", "true");
            mt.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              console.log("Menu toggle clicado!");
              sidebar.classList.toggle("collapsed");
              mainContent.classList.toggle("sidebar-collapsed");
              console.log(
                "Sidebar collapsed:",
                sidebar.classList.contains("collapsed"),
              );
              console.log(
                "Main content collapsed:",
                mainContent.classList.contains("sidebar-collapsed"),
              );
            });
          }
        });
      }
    } else {
      console.error("Elementos não encontrados para o menu toggle");
    }

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener("click", function (e) {
      if (window.innerWidth <= 768) {
        const clickedOnToggle = menuToggles.some((t) => t.contains(e.target));
        if (
          sidebar &&
          mainContent &&
          !sidebar.contains(e.target) &&
          !clickedOnToggle
        ) {
          sidebar.classList.add("collapsed");
          mainContent.classList.add("sidebar-collapsed");
        }
      }
    });

    // View toggle buttons
    const viewBtns = document.querySelectorAll(".view-btn");
    console.log(`👀 View buttons: ${viewBtns.length}`);
    viewBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".view-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.viewMode = e.target.dataset.view;
        this.renderAgendamentos();
      });
    });

    // Date navigation
    const prevBtn = document.getElementById("prevDate");
    const nextBtn = document.getElementById("nextDate");
    console.log(`📅 Prev button: ${prevBtn ? "SIM" : "NÃO"}`);
    console.log(`📅 Next button: ${nextBtn ? "SIM" : "NÃO"}`);

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        // Se estiver em 'today', trocar para 'day' para permitir navegação por data
        if (this.period === "today") {
          this.period = "day";
          document
            .querySelectorAll(".view-period-btn")
            .forEach((b) => b.classList.remove("active"));
          const dayBtn = document.querySelector(
            '.view-period-btn[data-period="day"]',
          );
          if (dayBtn) dayBtn.classList.add("active");
          try {
            this.savePeriod();
          } catch (e) {
            console.warn("savePeriod() indisponível", e);
          }
        }

        if (this.period === "week") {
          this.currentDate.setDate(this.currentDate.getDate() - 7);
        } else if (this.period === "month") {
          this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        } else {
          this.currentDate.setDate(this.currentDate.getDate() - 1);
        }
        this.updateDateDisplay();
        this.handlePeriodChange(this.period);
        this.saveCurrentDate(); // Salvar data no banco
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        // Se estiver em 'today', trocar para 'day' para permitir navegação por data
        if (this.period === "today") {
          this.period = "day";
          document
            .querySelectorAll(".view-period-btn")
            .forEach((b) => b.classList.remove("active"));
          const dayBtn = document.querySelector(
            '.view-period-btn[data-period="day"]',
          );
          if (dayBtn) dayBtn.classList.add("active");
          try {
            this.savePeriod();
          } catch (e) {
            console.warn("savePeriod() indisponível", e);
          }
        }

        if (this.period === "week") {
          this.currentDate.setDate(this.currentDate.getDate() + 7);
        } else if (this.period === "month") {
          this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        } else {
          this.currentDate.setDate(this.currentDate.getDate() + 1);
        }
        this.updateDateDisplay();
        this.handlePeriodChange(this.period);
        this.saveCurrentDate(); // Salvar data no banco
      });
    }

    // Period buttons
    const periodBtns = document.querySelectorAll(".view-period-btn");
    console.log(`📊 Period buttons: ${periodBtns.length}`);
    periodBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".view-period-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.handlePeriodChange(e.target.dataset.period);
        this.savePeriod(); // Salvar no banco
      });
    });

    // Status filters
    console.log("🏷️ Configurando filtros de status...");
    document.querySelectorAll(".status-tag").forEach((tag, index) => {
      console.log(
        `  Configurando tag ${index}: ${tag.textContent} - Classes: ${tag.className}`,
      );
      tag.addEventListener("click", (e) => {
        console.log(`🖱️ Clicou na tag: ${e.target.textContent}`);

        const isCurrentlyActive = e.target.classList.contains("active");
        const activeTags = document.querySelectorAll(".status-tag.active");

        console.log(`  Atualmente ativo: ${isCurrentlyActive}`);
        console.log(`  Total de tags ativas: ${activeTags.length}`);

        // Se está tentando desmarcar e é o único ativo, não permitir
        if (isCurrentlyActive && activeTags.length === 1) {
          console.log("🚫 Não é possível desmarcar o último filtro ativo");
          return; // Não fazer nada
        }

        // Caso contrário, permitir toggle normal
        e.target.classList.toggle("active");
        console.log(
          `  Status após toggle: ${e.target.classList.contains("active")}`,
        );

        // Aplicar filtros imediatamente
        this.updateStatusFilters();
        this.saveStatusFilters(); // Salvar no banco
        this.renderAgendamentos();
      });
    });

    // Apply filter button
    const btnApply = document.querySelector(".btn-apply");
    if (btnApply) {
      btnApply.addEventListener("click", () => {
        console.log("🔘 Botão aplicar filtros clicado");
        this.applyFilters();
      });
    } else {
      console.log("⚠️ Botão .btn-apply não encontrado");
    }

    // Clear filters button
    const btnClear = document.querySelector(".btn-clear");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        console.log("🧹 Botão limpar filtros clicado");
        this.clearFilters();
      });
    } else {
      console.log("⚠️ Botão .btn-clear não encontrado");
    }

    // Apply filter button (aplica filtros gerais: pet/cliente, profissional, etc.)
    const btnFilter = document.querySelector(".btn-filter");
    if (btnFilter) {
      btnFilter.addEventListener("click", () => {
        console.log("🎯 Botão aplicar filtro clicado (pet/profissional)");
        this.applyFilters();
      });
    } else {
      console.log("⚠️ Botão .btn-filter não encontrado");
    }

    // Filtros Pet/Cliente e Profissional: filtra em tempo real ao digitar
    let _filterDebounce = null;
    const inputPet = document.getElementById("filterPetCliente");
    const inputProf = document.getElementById("filterProfissional");
    const onFilterInput = () => {
      clearTimeout(_filterDebounce);
      _filterDebounce = setTimeout(() => {
        this.applyFilters();
      }, 300);
    };
    if (inputPet) inputPet.addEventListener("input", onFilterInput);
    if (inputProf) inputProf.addEventListener("input", onFilterInput);

    // Refresh button
    const btnRefresh = document.querySelector(".btn-refresh");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => {
        console.log("🔄 Atualizando agendamentos...");

        // Adicionar animação de rotação ao ícone
        const icon = btnRefresh.querySelector("i");
        if (icon) {
          icon.style.animation = "spin 1s linear infinite";
        }

        // Recarregar agendamentos
        this.handlePeriodChange(this.period);

        // Remover animação após 1 segundo
        setTimeout(() => {
          if (icon) {
            icon.style.animation = "";
          }
        }, 1000);
      });
    } else {
      console.log("⚠️ Botão .btn-refresh não encontrado");
    }

    // Escutar atualizações vindas de outras abas/janelas (BroadcastChannel)
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("agendamentos_channel");
        bc.onmessage = (ev) => {
          const data = ev.data;
          if (data && data.type === "status-updated") {
            console.log(
              "🔔 Recebido update de status via BroadcastChannel",
              data,
            );
            this.updateRowStatusInList(String(data.id), data.status);
          }
        };
      }
    } catch (e) {
      console.warn("BroadcastChannel não disponível", e);
    }

    // Fallback: mensagens via postMessage
    window.addEventListener("message", (ev) => {
      try {
        const data = ev.data;
        if (data && data.type === "status-updated") {
          console.log("🔔 Recebido update de status via postMessage", data);
          this.updateRowStatusInList(String(data.id), data.status);
        }
      } catch (e) {
        /* ignore */
      }
    });

    // Select all checkbox
    document.getElementById("selectAll").addEventListener("change", (e) => {
      this.toggleSelectAll(e.target.checked);
    });

    // Form submission
    document
      .getElementById("agendamentoForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveAgendamento();
      });

    // Submenu Cliente - não adicionar listener se já configurado globalmente
    const clienteMenuItem = document.getElementById("clienteMenuItem");
    const clienteSubmenu = document.getElementById("clienteSubmenu");
    const clienteMenuContainer = clienteMenuItem?.parentElement;

    if (clienteMenuItem && clienteSubmenu && clienteMenuContainer) {
      if (!clienteMenuItem.hasAttribute("data-listener-added")) {
        clienteMenuItem.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();

          // Toggle submenu
          clienteMenuContainer.classList.toggle("open");
          clienteSubmenu.classList.toggle("open");

          console.log("Submenu cliente toggled");
        });
        clienteMenuItem.setAttribute("data-listener-added", "true");
      } else {
        console.log(
          "Submenu cliente listener já configurado pelo script global — pulando listener local",
        );
      }
    }
  }

  setupModalEvents() {
    const modal = document.getElementById("agendamentoModal");
    const closeBtn = modal.querySelector(".modal-close");

    closeBtn.addEventListener("click", () => {
      this.closeAgendamentoModal();
    });

    // Close modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeAgendamentoModal();
      }
    });

    // Load pets for select
    this.loadPetsForSelect();
  }

  updateDateDisplay() {
    const dateEl = document.getElementById("currentDate");
    if (!dateEl) return;

    if (this.period === "week") {
      // Mostrar intervalo da semana
      const d = new Date(this.currentDate);
      const day = d.getDay();
      const diff = (day + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const opts = { day: "2-digit", month: "2-digit", year: "numeric" };
      const start = monday.toLocaleDateString("pt-BR", opts);
      const end = sunday.toLocaleDateString("pt-BR", opts);
      dateEl.textContent = `${start} - ${end}`;
    } else if (this.period === "month") {
      // Mostrar mês e ano
      const opts = { month: "long", year: "numeric" };
      dateEl.textContent = this.currentDate.toLocaleDateString("pt-BR", opts);
    } else {
      // Dia único
      const options = {
        day: "numeric",
        month: "long",
        year: "numeric",
      };
      const dateStr = this.currentDate.toLocaleDateString("pt-BR", options);
      dateEl.textContent = dateStr;
    }
  }

  handlePeriodChange(period) {
    // definir período atual e carregar conforme tipo
    this.period = period || this.period || "day";
    switch (this.period) {
      case "today":
        this.currentDate = new Date();
        this.updateDateDisplay();
        this.loadAgendamentos();
        this.saveCurrentDate(); // Salvar data resetada para hoje
        break;
      case "day":
        // carregar agendamentos do dia selecionado
        this.loadAgendamentos();
        break;
      case "week":
        this.showWeekView();
        break;
      case "month":
        this.showMonthView();
        break;
      case "appointments":
        this.showAppointmentsView();
        break;
      case "calendar":
        this.showCalendarView();
        break;
      case "activities":
        this.showActivitiesView();
        break;
    }
  }

  async loadAgendamentos() {
    try {
      console.log("🔄 Carregando agendamentos...");
      console.log("📅 Data atual:", this.currentDate);

      // Token para descartar respostas de requisições obsoletas (race condition)
      const loadToken = ++this._loadToken;

      // Usar data local (YYYY-MM-DD) para evitar timezone
      const pad = (n) => String(n).padStart(2, "0");
      const dateStr = `${this.currentDate.getFullYear()}-${pad(this.currentDate.getMonth() + 1)}-${pad(this.currentDate.getDate())}`;
      console.log("📅 Data formatada (local):", dateStr);

      // Montar URL com filtros de status ativos
      let url = `/api/agendamentos?data=${dateStr}`;
      const statusAtivos =
        this.filtros && this.filtros.status && this.filtros.status.length > 0
          ? this.filtros.status
          : [];
      // Se filtro de texto (pet/profissional) estiver ativo, sempre incluir cancelados
      // para que agendamentos cancelados apareçam nos resultados de busca por texto
      const temFiltroTexto = !!(
        this.filtros &&
        (this.filtros.petCliente || this.filtros.profissional)
      );
      if (statusAtivos.includes("cancelado") || temFiltroTexto) {
        url += "&incluirCancelados=true";
      }
      // Quando há filtro(s) de status específicos (sem filtro de texto), passar para a API
      if (statusAtivos.length > 0 && !temFiltroTexto) {
        statusAtivos.forEach((s) => {
          url += `&status[]=${encodeURIComponent(s)}`;
        });
      }

      const response = await fetch(url, { credentials: "include" });
      console.log("📡 Response status:", response.status);

      // Ignorar resposta se outra requisição mais recente foi iniciada
      if (loadToken !== this._loadToken) {
        console.log("⚠️ Resposta descartada (requisição obsoleta)");
        return;
      }

      if (response.ok) {
        this.agendamentos = await response.json();
        console.log("✅ Agendamentos carregados:", this.agendamentos.length);
        console.log("📋 Dados:", this.agendamentos);
      } else {
        console.log("❌ Erro na resposta:", response.status);
        this.agendamentos = [];
      }

      console.log("🎯 Filtros atuais:", this.filtros);
      this.renderAgendamentos();
    } catch (error) {
      console.error("💥 Erro ao carregar agendamentos:", error);
      this.agendamentos = [];
      this.renderAgendamentos();
    }
  }

  // Atualizar linha específica ao receber evento de agendamento atualizado
  setupUpdateListener() {
    try {
      window.addEventListener("agendamento-updated", (e) => {
        try {
          const d = e.detail || {};
          if (!d || !d.id) return;
          const row = document.querySelector(
            `.agendamento-row[data-agendamento-id="${d.id}"]`,
          );
          if (row) {
            const profEl = row.querySelector(".agendamento-profissional");
            if (profEl) profEl.textContent = d.profissional || "-";
            // atualizar observações se enviadas no evento
            if (d.hasOwnProperty("observacoes")) {
              try {
                const detailsEl = row.querySelector(".agendamento-detalhes");
                if (detailsEl) {
                  const existingObs = detailsEl.querySelector(
                    ".agendamento-observacao",
                  );
                  if (d.observacoes) {
                    const obsHtml = `<div class="agendamento-observacao" style="color:#c12b2b;font-size:12px;margin-top:4px;display:flex;align-items:flex-start;gap:6px;"><i class="fas fa-sticky-note" style="font-size:12px;line-height:1;opacity:0.9;margin-top:2px;flex-shrink:0"></i><div style="line-height:1.4;word-break:break-word;overflow-wrap:anywhere;min-width:0">${escapeHtml(d.observacoes)}</div></div>`;
                    if (existingObs) {
                      existingObs.outerHTML = obsHtml;
                    } else {
                      detailsEl.insertAdjacentHTML("beforeend", obsHtml);
                    }
                  } else {
                    if (existingObs) existingObs.remove();
                  }
                }
              } catch (e) {
                console.warn("erro atualizando observacoes na linha", e);
              }
            }
          } else {
            // se a linha não está renderizada (outro período ou não carregada), recarregar a lista
            this.loadAgendamentos();
          }
        } catch (err) {
          console.warn("agendamento-updated handler error", err);
        }
      });
    } catch (e) {
      console.warn("setupUpdateListener error", e);
    }
  }

  renderAgendamentos() {
    console.log("🎨 Renderizando agendamentos...");
    console.log("📊 Total de agendamentos:", this.agendamentos.length);
    console.log("🔵 Período atual:", this.period);

    const tableBody = document.getElementById("agendamentosTableBody");

    // Aplicar filtros antes de renderizar
    let agendamentosFiltrados = this.filterAgendamentos();
    console.log("🔍 Agendamentos filtrados:", agendamentosFiltrados.length);
    console.log("🎯 Filtros aplicados:", this.filtros);

    // Se estiver em week ou month, agrupar por data com cabeçalhos
    if (this.period === "week" || this.period === "month") {
      console.log("✅ Renderizando agrupado por data (week/month)");
      this.renderAgendamentosGroupedByDate(agendamentosFiltrados, tableBody);
      return;
    }

    console.log("📝 Renderizando lista normal (day/today)");

    if (agendamentosFiltrados.length === 0) {
      console.log("📭 Nenhum agendamento após filtragem");
      tableBody.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Nenhum agendamento encontrado</h3>
                    <p>Não há agendamentos com o status "${this.filtros.status ? this.filtros.status.join(", ") : "agendado"}" no período selecionado.</p>
                    <button class="btn-primary" onclick="novoAtendimento()">
                        <i class="fas fa-plus"></i>
                        Novo Agendamento
                    </button>
                </div>
            `;
      return;
    }

    const agendamentosHtml = agendamentosFiltrados
      .map((agendamento) => {
        // Mapear status do banco para className CSS
        const statusClassMap = {
          agendado: "agendado",
          checkin: "check-in",
          pronto: "pronto",
          concluido: "check-out",
          checkout: "check-out",
          cancelado: "cancelado",
        };
        const statusClass =
          statusClassMap[agendamento.status] || agendamento.status;
        // determinar data do agendamento (YYYY-MM-DD) — não altera estrutura, apenas atributo
        let dateKey = "";
        if (agendamento.data) dateKey = String(agendamento.data).split("T")[0];
        else if (
          agendamento.horario &&
          typeof agendamento.horario === "string" &&
          agendamento.horario.includes("T")
        )
          dateKey = agendamento.horario.split("T")[0];
        else if (agendamento.horario && typeof agendamento.horario === "number")
          dateKey = new Date(agendamento.horario).toLocaleDateString("sv-SE", {
            timeZone: "America/Sao_Paulo",
          });
        else
          dateKey = new Date(this.currentDate).toLocaleDateString("sv-SE", {
            timeZone: "America/Sao_Paulo",
          });

        return `
            <div class="agendamento-row" data-date="${dateKey}" data-agendamento-id="${agendamento.id}" data-status="${agendamento.status}">
                <div class="agendamento-controls">
                    <label class="checkbox-label">
                        <input type="checkbox" value="${agendamento.id}">
                        <span class="checkmark"></span>
                    </label>
                </div>
                <div class="agendamento-columns">
                    <div class="agendamento-horario">${this.formatTimeBR(agendamento.horario)}</div>
                    <div class="agendamento-pet-cliente">
                        <strong>${agendamento.petNome}</strong><br>
                        <small>${agendamento.clienteNome}</small>
                    </div>
                    <div class="agendamento-detalhes">${agendamento.servico}
                        ${agendamento.petObservacao ? `<div class="agendamento-pet-observacao" style="color:#c12b2b;font-size:12px;margin-top:4px;display:flex;align-items:flex-start;gap:6px;"><i class="fas fa-paw" style="font-size:12px;line-height:1;opacity:0.9;margin-top:2px;flex-shrink:0"></i><div style="line-height:1.4;word-break:break-word;overflow-wrap:anywhere;min-width:0">${escapeHtml(agendamento.petObservacao)}</div></div>` : ""}
                        ${agendamento.observacoes ? `<div class="agendamento-observacao" style="color:#c12b2b;font-size:12px;margin-top:4px;display:flex;align-items:flex-start;gap:6px;"><i class="fas fa-sticky-note" style="font-size:12px;line-height:1;opacity:0.9;margin-top:2px;flex-shrink:0"></i><div style="line-height:1.4;word-break:break-word;overflow-wrap:anywhere;min-width:0">${escapeHtml(agendamento.observacoes)}</div></div>` : ""}
                    </div>
                    <div class="agendamento-profissional">${agendamento.profissional || "-"}</div>
                    <div class="agendamento-valor">${this.formatCurrency(agendamento.valor)}</div>
                    <div class="agendamento-situacao">
                        <span class="status-badge status-${statusClass}">
                            ${this.getStatusLabel(agendamento.status)}
                        </span>
                    </div>
                    <div class="agendamento-actions">
                        <button class="action-icon" title="Localização" onclick="(function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){} if(window.agendamentosManager){ agendamentosManager.marcarCheckin(${agendamento.id}); } return false; })(event)">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                        <button class="action-icon" title="Compartilhar" onclick="agendamentosManager.shareAgendamento(${agendamento.id})">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="action-icon" title="Mais opções" disabled style="cursor:default;opacity:1;color:#555;pointer-events:none;">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
      })
      .join("");

    console.log("✅ HTML gerado, inserindo no DOM");
    tableBody.innerHTML = agendamentosHtml;

    // Agrupar visualmente por data sem alterar os elementos individuais
    (function groupRowsByDate() {
      try {
        const rows = Array.from(tableBody.querySelectorAll(".agendamento-row"));
        if (!rows.length) return;
        const groups = {};
        rows.forEach((r) => {
          const dk = r.getAttribute("data-date") || "";
          if (!groups[dk]) groups[dk] = [];
          groups[dk].push(r.outerHTML);
        });
        const sortedDates = Object.keys(groups).sort();
        const now = new Date();
        const todayKey = now.toLocaleDateString("sv-SE", {
          timeZone: "America/Sao_Paulo",
        });
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowKey = tomorrow.toLocaleDateString("sv-SE", {
          timeZone: "America/Sao_Paulo",
        });

        const newHtml = sortedDates
          .map((dateKey) => {
            const parts = dateKey.split("-");
            const labelDate =
              parts.length === 3
                ? `${parts[2]}/${parts[1]}/${parts[0]}`
                : dateKey;
            const label =
              dateKey === todayKey
                ? `${labelDate} - Hoje`
                : dateKey === tomorrowKey
                  ? `${labelDate} - Amanhã`
                  : labelDate;
            return `
                        <div class="agendamento-section">
                            <div class="agendamento-section-header">
                                <div class="section-date">${label}</div>
                                <div class="section-count">(${groups[dateKey].length})</div>
                            </div>
                            <div class="agendamento-section-body">${groups[dateKey].join("")}</div>
                        </div>
                    `;
          })
          .join("");

        tableBody.innerHTML = newHtml;
      } catch (e) {
        console.warn("Erro ao agrupar linhas por data", e);
      }
    })();

    // Adicionar event listeners para navegação aos detalhes
    this.setupAgendamentoClickListeners();
    // Adicionar listeners para o badge de status (abrir menu de ações)
    this.setupStatusBadgeListeners();
  }

  // Atualiza visualmente uma linha da lista pelo id do agendamento
  updateRowStatusInList(id, status) {
    try {
      const tableBody = document.getElementById("agendamentosTableBody");
      if (!tableBody) return;
      const row = tableBody.querySelector(
        `.agendamento-row[data-agendamento-id="${id}"]`,
      );
      if (!row) return;
      const badge = row.querySelector(".status-badge");
      if (!badge) return;

      // Normaliza o nome da classe para corresponder ao CSS (ex: 'checkin' -> 'check-in')
      const s = String(status || "").toLowerCase();
      const classMap = {
        checkin: "check-in",
        "check-in": "check-in",
        checkout: "check-out",
        "check-out": "check-out",
        concluido: "check-out",
      };
      const statusClass = classMap[s] || s.replace(/[^a-z0-9]+/g, "-");

      const labelMap = {
        agendado: "Agendado",
        "check-in": "Check-in",
        pronto: "Pronto",
        "check-out": "Check-out",
        cancelado: "Cancelado",
      };
      const display = labelMap[statusClass] || status;

      // Remover estilos inline antigos para garantir que o CSS se aplique
      badge.removeAttribute("style");

      badge.className = `status-badge status-${statusClass}`;
      badge.textContent = display;
    } catch (e) {
      console.error("Erro ao atualizar status na lista:", e);
    }
  }

  renderAgendamentosGroupedByDate(agendamentos, tableBody) {
    console.log(
      "📦 renderAgendamentosGroupedByDate chamado com:",
      agendamentos.length,
      "agendamentos",
    );

    if (agendamentos.length === 0) {
      tableBody.innerHTML =
        '<div class="empty-state"><h3>Nenhum agendamento encontrado</h3></div>';
      return;
    }

    // Log do primeiro agendamento completo para debug
    if (agendamentos.length > 0) {
      console.log(
        "📋 Estrutura completa do primeiro agendamento:",
        JSON.stringify(agendamentos[0], null, 2),
      );
    }

    // Agrupar por data
    const groups = {};
    agendamentos.forEach((a) => {
      let dateKey = "";
      console.log(
        "🔍 Agendamento:",
        a.id,
        "data:",
        a.data,
        "horario:",
        a.horario,
      );
      // Tentar extrair data de dataAgendamento primeiro (converter para fuso Brasília)
      if (a.dataAgendamento)
        dateKey = new Date(a.dataAgendamento).toLocaleDateString("sv-SE", {
          timeZone: "America/Sao_Paulo",
        });
      else if (a.data) dateKey = String(a.data).split("T")[0];
      else if (
        a.horario &&
        typeof a.horario === "string" &&
        a.horario.includes("T")
      )
        dateKey = a.horario.split("T")[0];
      else if (a.horario && typeof a.horario === "number")
        dateKey = new Date(a.horario).toISOString().split("T")[0];
      else dateKey = new Date(this.currentDate).toISOString().split("T")[0];
      console.log("📅 DateKey extraída:", dateKey);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(a);
    });
    console.log("📊 Grupos criados:", Object.keys(groups));

    const sortedDates = Object.keys(groups).sort();
    const now = new Date();
    const todayKey = now.toLocaleDateString("sv-SE", {
      timeZone: "America/Sao_Paulo",
    });
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowKey = tomorrow.toLocaleDateString("sv-SE", {
      timeZone: "America/Sao_Paulo",
    });

    let html = "";
    sortedDates.forEach((dateKey) => {
      const items = groups[dateKey];
      const parts = dateKey.split("-");
      const labelDate =
        parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateKey;
      const label =
        dateKey === todayKey
          ? `${labelDate} - Hoje`
          : dateKey === tomorrowKey
            ? `${labelDate} - Amanhã`
            : labelDate;

      // Cabeçalho da seção (linha cinza)
      html += `
                <div class="agendamento-section">
                    <div class="agendamento-section-header">
                        <div class="section-date">${label}</div>
                        <div class="section-count">(${items.length})</div>
                    </div>
                    <div class="agendamento-section-body">`;

      // Renderizar cada agendamento
      items.forEach((agendamento) => {
        const statusClassMap = {
          agendado: "agendado",
          checkin: "check-in",
          pronto: "pronto",
          concluido: "check-out",
          checkout: "check-out",
          cancelado: "cancelado",
        };
        const statusClass =
          statusClassMap[agendamento.status] || agendamento.status;

        html += `
                    <div class="agendamento-row" data-date="${dateKey}" data-agendamento-id="${agendamento.id}" data-status="${agendamento.status}">
                        <div class="agendamento-controls">
                            <label class="checkbox-label">
                                <input type="checkbox" value="${agendamento.id}">
                                <span class="checkmark"></span>
                            </label>
                        </div>
                        <div class="agendamento-columns">
                            <div class="agendamento-horario">${this.formatTimeBR(agendamento.horario)}</div>
                            <div class="agendamento-pet-cliente">
                                <strong>${agendamento.petNome}</strong><br>
                                <small>${agendamento.clienteNome}</small>
                            </div>
                            <div class="agendamento-detalhes">${agendamento.servico}
                                ${agendamento.petObservacao ? `<div class="agendamento-pet-observacao" style="color:#c12b2b;font-size:12px;margin-top:4px;display:flex;align-items:flex-start;gap:6px;"><i class="fas fa-paw" style="font-size:12px;line-height:1;opacity:0.9;margin-top:2px;flex-shrink:0"></i><div style="line-height:1.4;word-break:break-word;overflow-wrap:anywhere;min-width:0">${escapeHtml(agendamento.petObservacao)}</div></div>` : ""}
                                ${agendamento.observacoes ? `<div class="agendamento-observacao" style="color:#c12b2b;font-size:12px;margin-top:4px;display:flex;align-items:flex-start;gap:6px;"><i class="fas fa-sticky-note" style="font-size:12px;line-height:1;opacity:0.9;margin-top:2px;flex-shrink:0"></i><div style="line-height:1.4;word-break:break-word;overflow-wrap:anywhere;min-width:0">${escapeHtml(agendamento.observacoes)}</div></div>` : ""}
                            </div>
                            <div class="agendamento-profissional">${agendamento.profissional || "-"}</div>
                            <div class="agendamento-valor">${this.formatCurrency(agendamento.valor)}</div>
                            <div class="agendamento-situacao">
                                <span class="status-badge status-${statusClass}">${this.getStatusLabel(agendamento.status)}</span>
                            </div>
                            <div class="agendamento-actions">
                                <button class="action-icon" title="Check-in" onclick="(function(e){e.stopPropagation(); if(window.agendamentosManager){agendamentosManager.marcarCheckin(${agendamento.id})}})(event)"><i class="fas fa-map-marker-alt"></i></button>
                                <button class="action-icon" title="Compartilhar" onclick="agendamentosManager.shareAgendamento(${agendamento.id})"><i class="fas fa-external-link-alt"></i></button>
                                <button class="action-icon" title="Mais opções" disabled style="cursor:default;opacity:1;color:#555;pointer-events:none;"><i class="fas fa-ellipsis-v"></i></button>
                            </div>
                        </div>
                    </div>`;
      });

      html += `
                    </div>
                </div>`;
    });

    console.log("📝 HTML gerado, grupos encontrados:", sortedDates.length);
    console.log("📏 Tamanho do HTML:", html.length, "caracteres");
    tableBody.innerHTML = html;
    console.log("✅ HTML inserido no DOM");
    this.setupAgendamentoClickListeners();
    this.setupStatusBadgeListeners();
  }

  setupAgendamentoClickListeners() {
    const agendamentoRows = document.querySelectorAll(".agendamento-row");
    agendamentoRows.forEach((row) => {
      row.addEventListener("click", (e) => {
        // Não redirecionar se clicou no checkbox
        if (
          e.target.type === "checkbox" ||
          e.target.closest(".checkbox-label")
        ) {
          return;
        }

        const agendamentoId = row.getAttribute("data-agendamento-id");
        if (agendamentoId) {
          console.log(
            `🎯 Navegando para detalhes do agendamento ${agendamentoId}`,
          );
          window.location.href = `agendamento-detalhes.html?id=${agendamentoId}`;
        }
      });

      // Adicionar cursor pointer e estilo hover
      row.style.cursor = "pointer";
      row.addEventListener("mouseenter", () => {
        row.style.backgroundColor = "#f8f9fa";
      });
      row.addEventListener("mouseleave", () => {
        row.style.backgroundColor = "";
      });
    });
  }

  setupStatusBadgeListeners() {
    // Remover menus existentes se houver
    const removeMenu = () => {
      document.querySelectorAll(".status-menu").forEach((m) => m.remove());
      try {
        window._openStatusMenuFor = null;
      } catch (e) {}
    };

    if (typeof window._openStatusMenuFor === "undefined")
      window._openStatusMenuFor = null;

    // Listener delegado para garantir funcionamento mesmo após re-render
    if (!document._agendamentoStatusDelegateAttached) {
      document._agendamentoStatusDelegateAttached = true;
      document.addEventListener(
        "click",
        (ev) => {
          const badge = ev.target.closest?.(".status-badge");
          if (!badge) return;
          ev.stopPropagation();
          // identificar agendamento
          const row = badge.closest(".agendamento-row");
          const agendamentoId = row?.getAttribute("data-agendamento-id");
          // toggle: fechar se já estiver aberto para mesmo id
          if (
            agendamentoId &&
            window._openStatusMenuFor &&
            String(window._openStatusMenuFor) === String(agendamentoId)
          ) {
            removeMenu();
            return;
          }
          // criar um evento customizado para reutilizar e abrir menu
          const custom = new CustomEvent("agendamentoStatusClick", {
            detail: { badge, agendamentoId },
          });
          document.dispatchEvent(custom);
        },
        true,
      ); // use capture phase so we intercept before row click handlers

      // Listener que efetivamente cria o menu quando disparado
      document.addEventListener("agendamentoStatusClick", (e) => {
        const badge = e.detail.badge;
        // simular clique para criar menu (reaproveita o código abaixo criando menu)
        // Para não duplicar código mantemos a implementação aqui

        // Remover menus existentes
        removeMenu();

        const row = badge.closest(".agendamento-row");
        const agendamentoId =
          e.detail.agendamentoId || row?.getAttribute("data-agendamento-id");
        if (!agendamentoId) return;

        console.log(
          "[StatusMenu][delegado] Abrindo menu para agendamento",
          agendamentoId,
        );

        const menu = document.createElement("div");
        menu.className = "status-menu";
        menu.style.position = "absolute";
        if (agendamentoId) {
          menu.setAttribute("data-for", agendamentoId);
          try {
            window._openStatusMenuFor = agendamentoId;
          } catch (e) {}
        }
        menu.style.zIndex = "99999";
        menu.style.visibility = "hidden";
        if (agendamentoId) {
          menu.setAttribute("data-for", agendamentoId);
          try {
            window._openStatusMenuFor = agendamentoId;
          } catch (e) {}
        }

        const options = [
          {
            label: "Agendado",
            value: "agendado",
            className: "agendado",
            dot: "#6c757d",
          },
          {
            label: "Check-in",
            value: "checkin",
            className: "check-in",
            dot: "#1e88e5",
          },
          {
            label: "Pronto",
            value: "pronto",
            className: "pronto",
            dot: "#7b1fa2",
          },
          {
            label: "Check-out",
            value: "concluido",
            className: "check-out",
            dot: "#2e7d32",
          },
          {
            label: "Cancelado",
            value: "cancelado",
            className: "cancelado",
            dot: "#c12b2b",
          },
        ];

        options.forEach((opt) => {
          const item = document.createElement("div");
          item.className = "item";
          item.innerHTML = `<span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${opt.dot};margin-right:8px;vertical-align:middle;"></span> ${opt.label}`;
          item.addEventListener("click", async (ev) => {
            ev.stopPropagation();

            // Check-out deve ser feito na página de detalhes (requer pagamento)
            if (opt.value === "concluido") {
              removeMenu();
              window.location.href = `agendamento-detalhes.html?id=${encodeURIComponent(agendamentoId)}`;
              return;
            }

            // Cancelar: fluxo com dois modais + credenciais de gerente
            if (opt.value === "cancelado") {
              removeMenu();
              if (typeof window.iniciarFluxoCancelamento === "function") {
                window.iniciarFluxoCancelamento(agendamentoId, () => {
                  // Atualizar badge para Cancelado visualmente, depois recarregar
                  const rowEl =
                    row ||
                    document.querySelector(
                      `[data-agendamento-id="${agendamentoId}"]`,
                    );
                  if (rowEl) {
                    const b = rowEl.querySelector(".status-badge");
                    if (b) {
                      b.textContent = "Cancelado";
                      b.className = "status-badge status-cancelado";
                    }
                  }
                  setTimeout(() => {
                    if (window.agendamentosManager)
                      window.agendamentosManager.loadAgendamentos();
                  }, 800);
                });
              }
              return;
            }

            try {
              const res = await fetch(
                `/api/agendamentos/${agendamentoId}/status`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: opt.value }),
                  credentials: "include",
                },
              );

              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Erro" }));
                alert(err.error || "Erro ao atualizar status");
                removeMenu();
                return;
              }

              // Atualiza apenas o badge localmente sem recarregar a lista (evita que o item suma)
              badge.textContent = opt.label;
              const cls = opt.className || opt.value;
              badge.className = `status-badge status-${cls}`;

              // Atualizar data-status na row para sincronizar
              if (row) {
                row.setAttribute("data-status", opt.value);
              }
              // Notificar outras abas/janelas sobre a mudança de status
              try {
                if (typeof BroadcastChannel !== "undefined") {
                  const bc = new BroadcastChannel("agendamentos_channel");
                  bc.postMessage({
                    type: "status-updated",
                    id: agendamentoId,
                    status: opt.value,
                  });
                  bc.close();
                } else if (window.opener && window.opener.postMessage) {
                  window.opener.postMessage(
                    {
                      type: "status-updated",
                      id: agendamentoId,
                      status: opt.value,
                    },
                    "*",
                  );
                }
              } catch (e) {
                console.warn("Erro notificando status via BroadcastChannel", e);
              }
            } catch (error) {
              console.error("Erro ao atualizar status:", error);
              alert("Erro ao atualizar status");
            } finally {
              removeMenu();
            }
          });
          menu.appendChild(item);
        });

        document.body.appendChild(menu);
        const rect = badge.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        let left = rect.left + scrollX;
        let top = rect.bottom + scrollY + 6;

        // Obter dimensões do menu
        menu.style.visibility = "hidden";
        menu.style.display = "block";
        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;

        // Verificar espaço disponível abaixo e acima
        const viewportHeight =
          window.innerHeight || document.documentElement.clientHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Se não houver espaço embaixo mas houver em cima, abrir para cima
        if (spaceBelow < menuHeight + 20 && spaceAbove > menuHeight + 20) {
          top = rect.top + scrollY - menuHeight - 6;
          console.log("📜 Menu aberto para CIMA");
        }

        // Ajustar posição horizontal se sair da tela
        const viewportWidth = document.documentElement.clientWidth;
        if (left + menuWidth > viewportWidth - 8) {
          left = Math.max(8, viewportWidth - menuWidth - 8);
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = "visible";

        const onDocClick = (ev2) => {
          if (!menu.contains(ev2.target) && ev2.target !== badge) {
            removeMenu();
            document.removeEventListener("click", onDocClick);
          }
        };
        document.addEventListener("click", onDocClick);
        const closeOnScroll = () => {
          removeMenu();
          window.removeEventListener("scroll", closeOnScroll);
          window.removeEventListener("resize", closeOnScroll);
        };
        window.addEventListener("scroll", closeOnScroll);
        window.addEventListener("resize", closeOnScroll);
      });
    }

    if (document._agendamentoStatusDelegateAttached) {
      console.log("[StatusMenu] Delegado ativo; pulando handlers individuais");
      return;
    }

    document.querySelectorAll(".status-badge").forEach((badge) => {
      // evitar duplicar listeners
      badge.removeEventListener("click", badge._statusClickHandler);

      const handler = async (e) => {
        e.stopPropagation();
        removeMenu();

        const row = badge.closest(".agendamento-row");
        const agendamentoId = row?.getAttribute("data-agendamento-id");
        if (!agendamentoId) return;

        console.log(
          "[StatusMenu] Abrindo menu para agendamento",
          agendamentoId,
        );

        // Criar menu
        const menu = document.createElement("div");
        menu.className = "status-menu";
        menu.style.position = "absolute";

        const options = [
          { label: "Agendado", value: "agendado", dot: "#6c757d" },
          {
            label: "Check-in",
            value: "checkin",
            className: "check-in",
            dot: "#1e88e5",
          },
          {
            label: "Pronto",
            value: "pronto",
            className: "pronto",
            dot: "#7b1fa2",
          },
          {
            label: "Check-out",
            value: "concluido",
            className: "check-out",
            dot: "#2e7d32",
          },
          {
            label: "Cancelado",
            value: "cancelado",
            className: "cancelado",
            dot: "#c12b2b",
          },
        ];

        options.forEach((opt) => {
          const item = document.createElement("div");
          item.className = "item";
          item.innerHTML = `<span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${opt.dot};margin-right:8px;vertical-align:middle;"></span> ${opt.label}`;
          item.addEventListener("click", async (ev) => {
            ev.stopPropagation();

            // Check-out deve ser concluído na página de detalhes (requer pagamento)
            if (opt.value === "concluido") {
              removeMenu();
              window.location.href = `agendamento-detalhes.html?id=${encodeURIComponent(agendamentoId)}`;
              return;
            }

            // Cancelar: fluxo com dois modais + credenciais de gerente
            if (opt.value === "cancelado") {
              removeMenu();
              if (typeof window.iniciarFluxoCancelamento === "function") {
                window.iniciarFluxoCancelamento(agendamentoId, () => {
                  // Atualizar badge para Cancelado visualmente, depois recarregar
                  const rowEl = badge.closest(".agendamento-row");
                  if (rowEl) {
                    const b = rowEl.querySelector(".status-badge");
                    if (b) {
                      b.textContent = "Cancelado";
                      b.className = "status-badge status-cancelado";
                    }
                  }
                  setTimeout(() => {
                    if (window.agendamentosManager)
                      window.agendamentosManager.loadAgendamentos();
                  }, 800);
                });
              }
              return;
            }

            // Chamar API para atualizar status
            try {
              const res = await fetch(
                `/api/agendamentos/${agendamentoId}/status`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: opt.value }),
                  credentials: "include",
                },
              );

              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Erro" }));
                alert(err.error || "Erro ao atualizar status");
                removeMenu();
                return;
              }

              // Atualiza apenas o badge localmente sem recarregar a lista (evita que o item suma)
              badge.textContent = opt.label;
              const cls = opt.className || opt.value;
              badge.className = `status-badge status-${cls}`;

              // Atualizar data-status na row para sincronizar
              const row = badge.closest(".agendamento-row");
              if (row) {
                row.setAttribute("data-status", opt.value);
              }
              // Notificar outras abas/janelas sobre a mudança de status
              try {
                if (typeof BroadcastChannel !== "undefined") {
                  const bc = new BroadcastChannel("agendamentos_channel");
                  bc.postMessage({
                    type: "status-updated",
                    id: agendamentoId,
                    status: opt.value,
                  });
                  bc.close();
                } else if (window.opener && window.opener.postMessage) {
                  window.opener.postMessage(
                    {
                      type: "status-updated",
                      id: agendamentoId,
                      status: opt.value,
                    },
                    "*",
                  );
                }
              } catch (e) {
                console.warn("Erro notificando status via BroadcastChannel", e);
              }
            } catch (error) {
              console.error("Erro ao atualizar status:", error);
              alert("Erro ao atualizar status");
            } finally {
              removeMenu();
            }
          });
          menu.appendChild(item);
        });

        // Append ao body para evitar overflow do container
        document.body.appendChild(menu);

        // posicionar menu abaixo do badge e garantir que fique dentro da viewport
        const rect = badge.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        let left = rect.left + scrollX;
        let top = rect.bottom + scrollY + 6;

        // ajustar se ultrapassar a largura
        const menuRectEst = menu.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        if (left + menuRectEst.width > viewportWidth - 8) {
          left = Math.max(8, viewportWidth - menuRectEst.width - 8);
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;

        // Se o menu não estiver visível (altura 0 ou fora da tela), anexar dentro da row como fallback
        const checkVisible = () => {
          const mr = menu.getBoundingClientRect();
          if (mr.width === 0 || mr.height === 0 || mr.bottom < 0) {
            console.warn(
              "[StatusMenu] menu possivelmente invisível, anexando fallback no row",
            );
            removeMenu();
            row.appendChild(menu);
            menu.style.position = "relative";
            menu.style.left = "";
            menu.style.top = "";
          }
        };
        setTimeout(checkVisible, 100);

        // fechar ao clicar fora
        const onDocClick = (ev) => {
          if (!menu.contains(ev.target) && ev.target !== badge) {
            removeMenu();
            document.removeEventListener("click", onDocClick);
          }
        };
        document.addEventListener("click", onDocClick);

        // fechar ao rolar ou redimensionar
        const closeOnScroll = () => {
          removeMenu();
          window.removeEventListener("scroll", closeOnScroll);
          window.removeEventListener("resize", closeOnScroll);
        };
        window.addEventListener("scroll", closeOnScroll);
        window.addEventListener("resize", closeOnScroll);
      };

      badge.addEventListener("click", handler);
      badge._statusClickHandler = handler;
    });
  }

  filterAgendamentos() {
    console.log("🔍 Iniciando filtro de agendamentos...");
    console.log("📋 Agendamentos originais:", this.agendamentos.length);

    let filtrados = [...this.agendamentos];

    // Filtro por status
    if (this.filtros.status && this.filtros.status.length > 0) {
      console.log("🏷️ Filtrando por status:", this.filtros.status);
      const antesDoFiltro = filtrados.length;

      filtrados = filtrados.filter((agendamento) => {
        // Mapear 'checkout' para incluir também 'concluido' do banco
        const statusBusca = agendamento.status;
        let incluir = this.filtros.status.includes(statusBusca);

        // Se o filtro inclui 'checkout', aceitar também 'concluido'
        if (
          !incluir &&
          this.filtros.status.includes("checkout") &&
          statusBusca === "concluido"
        ) {
          incluir = true;
        }

        console.log(
          `  - ${agendamento.id}: ${statusBusca} → ${incluir ? "INCLUIR" : "EXCLUIR"}`,
        );
        return incluir;
      });

      console.log(
        `📊 Filtro de status: ${antesDoFiltro} → ${filtrados.length}`,
      );
    } else {
      console.log(
        "🚫 Nenhum filtro de status - mostrando todos os agendamentos",
      );
    }

    // Filtro por pet/cliente
    if (this.filtros.petCliente) {
      console.log("🐕 Filtrando por pet/cliente:", this.filtros.petCliente);
      const termo = this.filtros.petCliente.toLowerCase();
      filtrados = filtrados.filter(
        (agendamento) =>
          (agendamento.petNome &&
            agendamento.petNome.toLowerCase().includes(termo)) ||
          (agendamento.clienteNome &&
            agendamento.clienteNome.toLowerCase().includes(termo)),
      );
    }

    // Filtro por profissional
    if (this.filtros.profissional) {
      const termo = this.filtros.profissional.toLowerCase();
      filtrados = filtrados.filter(
        (agendamento) =>
          agendamento.profissional &&
          agendamento.profissional.toLowerCase().includes(termo),
      );
    }

    // Filtro por número
    if (this.filtros.numero) {
      filtrados = filtrados.filter(
        (agendamento) =>
          agendamento.numero &&
          agendamento.numero.toString().includes(this.filtros.numero),
      );
    }

    // Filtro por área
    if (this.filtros.area) {
      filtrados = filtrados.filter(
        (agendamento) => agendamento.area === this.filtros.area,
      );
    }

    // Filtro por categoria
    if (this.filtros.categoria) {
      filtrados = filtrados.filter(
        (agendamento) => agendamento.categoria === this.filtros.categoria,
      );
    }

    // Filtro por horário
    if (this.filtros.horario) {
      filtrados = filtrados.filter(
        (agendamento) =>
          agendamento.horario &&
          agendamento.horario.includes(this.filtros.horario),
      );
    }

    console.log("✅ Filtro concluído:", filtrados.length, "agendamentos");
    return filtrados;
  }

  getStatusLabel(status) {
    const labels = {
      agendado: "Agendado",
      checkin: "Check-in",
      pronto: "Pronto",
      checkout: "Check-out",
      concluido: "Check-out",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  }

  formatTimeBR(horario) {
    if (!horario && horario !== 0) return "-";
    // Se já estiver no formato HH:MM:SS
    if (typeof horario === "string" && /^\d{2}:\d{2}:\d{2}$/.test(horario)) {
      return horario.slice(0, 5);
    }

    // Se for string ISO ou contém 'T' (data completa)
    try {
      if (
        typeof horario === "string" &&
        (horario.includes("T") || horario.includes("-"))
      ) {
        const d = new Date(horario);
        if (!isNaN(d)) {
          return new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "America/Sao_Paulo",
          }).format(d);
        }
      }

      // Se for número (timestamp)
      const n = Number(horario);
      if (!isNaN(n)) {
        const d2 = new Date(n);
        if (!isNaN(d2))
          return new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "America/Sao_Paulo",
          }).format(d2);
      }
    } catch (e) {
      console.warn("formatTimeBR erro ao formatar:", e);
    }

    // Fallback: se string com pelo menos 5 chars, pegar HH:MM
    const s = String(horario);
    if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
    return s;
  }
  formatCurrency(value) {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  applyFilters() {
    // Preservar filtros de status (controlados pelas tags, não pelo form)
    const statusAtual =
      this.filtros && this.filtros.status ? this.filtros.status : [];
    this.filtros = {
      status: statusAtual,
      petCliente: document.getElementById("filterPetCliente").value,
      profissional: document.getElementById("filterProfissional").value,
      numero: document.getElementById("filterNumero").value,
      endereco: document.getElementById("filterEndereco").value,
      area: document.getElementById("filterArea").value,
      categoria: document.getElementById("filterCategoria").value,
      levaTraz: document.getElementById("filterLevaTraz").value,
      horario: document.getElementById("filterHorario").value,
      andamento: document.getElementById("filterAndamento").checked,
      exibirEndereco: document.getElementById("filterExibirEnerco").checked,
    };

    // Persistir filtros de texto no localStorage
    try {
      localStorage.setItem(
        "ag_filtro_petCliente",
        this.filtros.petCliente || "",
      );
      localStorage.setItem(
        "ag_filtro_profissional",
        this.filtros.profissional || "",
      );
    } catch (e) {}

    // Recarregar conforme o período atual (day/week/month)
    this.handlePeriodChange(this.period || "day");
  }

  clearFilters() {
    document.getElementById("filterPetCliente").value = "";
    document.getElementById("filterProfissional").value = "";
    document.getElementById("filterNumero").value = "";
    document.getElementById("filterEndereco").value = "";
    document.getElementById("filterArea").value = "";
    document.getElementById("filterCategoria").value = "";
    document.getElementById("filterLevaTraz").value = "";
    document.getElementById("filterHorario").value = "";
    document.getElementById("filterAndamento").checked = false;
    document.getElementById("filterExibirEnerco").checked = false;

    // Limpar persistência
    try {
      localStorage.removeItem("ag_filtro_petCliente");
      localStorage.removeItem("ag_filtro_profissional");
    } catch (e) {}

    this.filtros = {};
    this.loadAgendamentos();
  }

  updateStatusFilters() {
    console.log("🏷️ Atualizando filtros de status...");

    const activeTags = document.querySelectorAll(".status-tag.active");
    console.log("📌 Tags ativas encontradas:", activeTags.length);

    const statusFilters = Array.from(activeTags)
      .map((tag) => {
        if (tag.classList.contains("status-agendado")) return "agendado";
        if (tag.classList.contains("status-checkin")) return "checkin";
        if (tag.classList.contains("status-pronto")) return "pronto";
        if (tag.classList.contains("status-checkout")) return "checkout";
        if (tag.classList.contains("status-cancelado")) return "cancelado";
      })
      .filter((status) => status !== undefined);

    console.log("🎯 Status filtros mapeados:", statusFilters);
    this.filtros.status = statusFilters;
    console.log("💾 Filtros atualizados:", this.filtros);
  }

  applyStatusFilters() {
    this.updateStatusFilters();
    this.loadAgendamentos();
  }

  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll(
      '.agendamento-row input[type="checkbox"]',
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked;
    });
  }

  openAgendamentoModal() {
    document.getElementById("agendamentoModal").style.display = "block";

    // Set default date to today
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("agendamentoData").value = today;
  }

  closeAgendamentoModal() {
    document.getElementById("agendamentoModal").style.display = "none";
    document.getElementById("agendamentoForm").reset();
  }

  async loadPetsForSelect() {
    try {
      const response = await fetch("/api/pets");
      if (response.ok) {
        const data = await response.json();
        // API pode retornar array ou objeto com propriedade (ex: { pets: [...] })
        let pets = [];
        if (Array.isArray(data)) pets = data;
        else if (Array.isArray(data.pets)) pets = data.pets;
        else if (Array.isArray(data.rows)) pets = data.rows;
        else {
          console.warn("loadPetsForSelect: resposta inesperada", data);
        }

        const select = document.getElementById("agendamentoPet");
        select.innerHTML = '<option value="">Selecionar Pet</option>';
        pets.forEach((pet) => {
          const option = document.createElement("option");
          option.value = pet.id || pet.ID || "";
          const clienteNome =
            pet.Cliente?.nome || pet.cliente?.nome || pet.clienteNome || "";
          option.textContent = `${pet.nome || pet.Nome} - ${clienteNome}`;
          select.appendChild(option);
        });
      } else {
        const text = await response.text().catch(() => null);
        console.error(
          "loadPetsForSelect: resposta inválida",
          response.status,
          text,
        );
      }
    } catch (error) {
      console.error("Erro ao carregar pets:", error);
    }
  }

  async saveAgendamento() {
    const formData = new FormData(document.getElementById("agendamentoForm"));
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch("/api/agendamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        this.showNotification("Agendamento criado com sucesso!", "success");
        this.closeAgendamentoModal();
        this.loadAgendamentos();
      } else {
        throw new Error("Erro ao criar agendamento");
      }
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      this.showNotification(
        "Erro ao criar agendamento. Tente novamente.",
        "error",
      );
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);

    // Remove on click
    notification
      .querySelector(".notification-close")
      .addEventListener("click", () => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      });
  }

  // Calendar view methods (to be implemented)
  // Helper: buscar agendamentos para uma data (YYYY-MM-DD)
  async fetchAgendamentosForDate(dateStr) {
    try {
      let url = `/api/agendamentos?data=${encodeURIComponent(dateStr)}`;
      // Incluir cancelados quando filtro de texto ativo ou status cancelado selecionado
      const temFiltroTexto = !!(
        this.filtros &&
        (this.filtros.petCliente || this.filtros.profissional)
      );
      const temCancelado = !!(
        this.filtros &&
        this.filtros.status &&
        this.filtros.status.includes("cancelado")
      );
      if (temFiltroTexto || temCancelado) {
        url += "&incluirCancelados=true";
      }
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.rows || data.agendamentos || [];
    } catch (e) {
      console.warn("fetchAgendamentosForDate falhou for", dateStr, e);
      return [];
    }
  }

  // Carrega agendamentos combinando várias datas (array de YYYY-MM-DD)
  async loadAgendamentosForDates(dates) {
    try {
      console.log(
        "🔄 Carregando agendamentos para múltiplas datas:",
        dates.length,
      );
      const promises = dates.map((d) => this.fetchAgendamentosForDate(d));
      const results = await Promise.all(promises);
      // Achatar arrays e normalizar
      this.agendamentos = results.flat();
      console.log("✅ Total combinado:", this.agendamentos.length);
      this.renderAgendamentos();
    } catch (e) {
      console.error("Erro loadAgendamentosForDates:", e);
      this.agendamentos = [];
      this.renderAgendamentos();
    }
  }
  showWeekView() {
    // Carregar agendamentos para os 7 dias da semana que contém currentDate
    const d = new Date(this.currentDate);
    const day = d.getDay();
    const diff = (day + 6) % 7; // dias desde segunda
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      dates.push(dt.toISOString().split("T")[0]);
    }
    this.updateDateDisplay();
    this.loadAgendamentosForDates(dates);
  }

  showMonthView() {
    // Carregar agendamentos para todos os dias do mês da currentDate
    const d = new Date(this.currentDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const dates = [];
    for (let dt = new Date(first); dt <= last; dt.setDate(dt.getDate() + 1)) {
      dates.push(new Date(dt).toISOString().split("T")[0]);
    }
    this.updateDateDisplay();
    this.loadAgendamentosForDates(dates);
  }

  showAppointmentsView() {
    console.log("Appointments view - current view");
  }

  showCalendarView() {
    console.log("Calendar view - to be implemented with FullCalendar");
  }

  showActivitiesView() {
    console.log("Activities view - to be implemented");
  }

  // Novo Agendamento Sidebar Manager
  setupNovoAgendamentoSidebar() {
    const btnNovoAgendamento = document.getElementById("btnNovoAgendamento");
    const sidebar = document.getElementById("novoAgendamentoSidebar");
    const btnCloseSidebar = document.getElementById("btnCloseSidebar");
    const btnCancelarAgendamento = document.getElementById(
      "btnCancelarAgendamento",
    );
    const form = document.getElementById("novoAgendamentoForm");

    // Abrir sidebar
    if (btnNovoAgendamento) {
      btnNovoAgendamento.addEventListener("click", (e) => {
        e.preventDefault();
        this.openAgendamentoSidebar();
      });
    }

    // Fechar sidebar
    if (btnCloseSidebar) {
      btnCloseSidebar.addEventListener("click", () => {
        this.closeAgendamentoSidebar();
      });
    }

    if (btnCancelarAgendamento) {
      btnCancelarAgendamento.addEventListener("click", () => {
        this.closeAgendamentoSidebar();
      });
    }

    // Submit form
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitNovoAgendamento();
      });
    }

    // Setup search functionality
    this.setupPetClienteSearch();
    this.setupServicoSearch();
    this.setupCalculoValores();
  }

  openAgendamentoSidebar() {
    const sidebar = document.getElementById("novoAgendamentoSidebar");
    const overlay = this.createOverlay();

    if (sidebar) {
      sidebar.classList.add("open");
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";

      // Set default date to today
      const dataAgendamento = document.getElementById("dataAgendamento");
      if (dataAgendamento) {
        dataAgendamento.value = new Date().toISOString().split("T")[0];
      }
    }
  }

  closeAgendamentoSidebar() {
    const sidebar = document.getElementById("novoAgendamentoSidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    const form = document.getElementById("novoAgendamentoForm");

    if (sidebar) {
      sidebar.classList.remove("open");
    }

    if (overlay) {
      overlay.remove();
    }

    if (form) {
      form.reset();
      this.clearSelectedPet();
      this.clearSelectedServico();
    }

    document.body.style.overflow = "";
  }

  createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay show";
    overlay.addEventListener("click", () => {
      this.closeAgendamentoSidebar();
    });
    return overlay;
  }

  setupPetClienteSearch() {
    const input = document.getElementById("petCliente");
    // HTML uses id="resultados-pet-cliente"
    const results = document.getElementById("resultados-pet-cliente");
    let searchTimeout;

    if (input && results) {
      input.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
          results.classList.remove("show");
          return;
        }

        searchTimeout = setTimeout(() => {
          this.searchPetsClientes(query, results);
        }, 300);
      });

      // Hide results on click outside
      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
          results.classList.remove("show");
        }
      });
    } else {
      console.warn("setupPetClienteSearch: elementos não encontrados", {
        input: !!input,
        results: !!results,
      });
    }
  }

  async searchPetsClientes(query, resultsContainer) {
    try {
      const q = query.toLowerCase();

      // 1) Try to use in-page pets data if available (meus-pets.js defines _meusPetsData)
      if (
        typeof _meusPetsData !== "undefined" &&
        Array.isArray(_meusPetsData) &&
        _meusPetsData.length > 0
      ) {
        console.debug(
          "[agendamentos-novo] searchPetsClientes: using in-page _meusPetsData, items=",
          _meusPetsData.length,
        );
        const pets = _meusPetsData
          .filter((p) => {
            const nome = String(
              p.nome || p.pet || p.nome_pet || "",
            ).toLowerCase();
            const cliente = String(
              p.cliente || p.nome_cliente || p.owner || p.clienteNome || "",
            ).toLowerCase();
            return nome.includes(q) || cliente.includes(q);
          })
          .map((p) => ({
            id: p.id || p.codigo || p.pet_id || p._id || null,
            nome: p.nome || p.pet || p.nome_pet,
            cliente:
              p.cliente || p.nome_cliente || p.owner || p.clienteNome || "",
            clienteId:
              p.clienteId ||
              p.cliente_id ||
              p.clienteCodigo ||
              p.codigo_cliente ||
              p.clienteId ||
              "",
            especie: p.especie || p.tipo || "",
            raca: p.raca || p.raca_nome || "",
          }));

        this.displaySearchResults([], pets, resultsContainer);
        return;
      }

      // 2) Try API endpoints (if backend available)
      let pets = [];
      console.debug(
        "[agendamentos-novo] searchPetsClientes: in-page data not available, trying /api/pets fallback",
      );
      try {
        const petsResponse = await fetch(
          `/api/pets?search=${encodeURIComponent(query)}`,
        ).catch(() => null);
        if (petsResponse && petsResponse.ok) {
          const apiPets = await petsResponse.json();
          pets = (Array.isArray(apiPets) ? apiPets : apiPets.pets || []).map(
            (p) => ({
              id: p.id || p.codigo || p.pet_id || null,
              nome: p.nome || p.pet || "",
              cliente: p.cliente || p.nome_cliente || p.owner || "",
              clienteId: p.clienteId || p.cliente_id || p.codigo_cliente || "",
              especie: p.especie || p.tipo || "",
              raca: p.raca || "",
            }),
          );
        }
      } catch (e) {
        console.debug("API /api/pets não disponível ou falhou", e && e.message);
      }

      // 3) Fallback to sample data
      if (!pets || pets.length === 0) {
        const sample = this.getSamplePetsClientes();
        pets = sample.pets.filter(
          (p) =>
            (p.nome || "").toLowerCase().includes(q) ||
            (p.cliente || "").toLowerCase().includes(q),
        );
      }

      this.displaySearchResults([], pets, resultsContainer);
    } catch (error) {
      console.error("Erro na busca:", error);
      const sample = this.getSamplePetsClientes();
      const pets = sample.pets.filter(
        (p) =>
          (p.nome || "").toLowerCase().includes(query.toLowerCase()) ||
          (p.cliente || "").toLowerCase().includes(query.toLowerCase()),
      );
      this.displaySearchResults([], pets, resultsContainer);
      console.debug(
        "[agendamentos-novo] searchPetsClientes: falling back to sample data",
      );
    }
  }

  getSamplePetsClientes() {
    return {
      clientes: [
        {
          id: 1,
          nome: "Maria Silva Santos",
          email: "maria@email.com",
          telefone: "(11) 99999-1234",
        },
        {
          id: 2,
          nome: "João Carlos Oliveira",
          email: "joao@email.com",
          telefone: "(11) 88888-5678",
        },
        {
          id: 3,
          nome: "Ana Paula Costa",
          email: "ana@email.com",
          telefone: "(11) 77777-9012",
        },
      ],
      pets: [
        {
          id: 1,
          nome: "Rex",
          especie: "Cachorro",
          raca: "Labrador",
          cliente: "Maria Silva Santos",
          clienteId: 1,
        },
        {
          id: 2,
          nome: "Mimi",
          especie: "Gato",
          raca: "SRD",
          cliente: "Maria Silva Santos",
          clienteId: 1,
        },
        {
          id: 3,
          nome: "Bella",
          especie: "Cachorro",
          raca: "Golden",
          cliente: "João Carlos Oliveira",
          clienteId: 2,
        },
        {
          id: 4,
          nome: "Felix",
          especie: "Gato",
          raca: "Persa",
          cliente: "Ana Paula Costa",
          clienteId: 3,
        },
      ],
    };
  }

  displaySearchResults(clientes, pets, container) {
    container.innerHTML = "";

    // Show pet-first entries: pet name (bold) and client + code below
    pets.forEach((pet) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
                <div class="search-result-name">${escapeHtml(pet.nome || "")}</div>
                <div class="search-result-details">${escapeHtml(pet.cliente || "")} <span style="color:#999;">Código: ${escapeHtml(pet.clienteId || "")}</span></div>
            `;
      item.addEventListener("click", () => {
        this.selectPet(pet);
        container.classList.remove("show");
      });
      container.appendChild(item);
    });

    if (pets.length > 0) {
      container.classList.add("show");
    } else {
      container.innerHTML =
        '<div class="search-result-item" style="padding:10px; color:#999; text-align:center;">Nenhum resultado encontrado</div>';
      container.classList.add("show");
    }
  }

  selectPet(pet) {
    const input = document.getElementById("petCliente");
    const selectedPetId = document.getElementById("selectedPetId");
    const selectedInfo = document.getElementById("selectedPetInfo");

    if (input) input.value = `${pet.nome} - ${pet.cliente}`;
    if (selectedPetId) selectedPetId.value = pet.id;

    if (selectedInfo) {
      selectedInfo.innerHTML = `
                <div class="selected-pet-name">${pet.nome}</div>
                <div class="selected-pet-details">${pet.especie} - ${pet.raca} | Cliente: ${pet.cliente}</div>
            `;
      selectedInfo.classList.add("show");
    }
  }

  selectCliente(cliente) {
    const input = document.getElementById("petCliente");
    const selectedInfo = document.getElementById("selectedPetInfo");

    if (input) input.value = cliente.nome;

    if (selectedInfo) {
      selectedInfo.innerHTML = `
                <div class="selected-pet-name">${cliente.nome}</div>
                <div class="selected-pet-details">${cliente.email} | ${cliente.telefone}</div>
            `;
      selectedInfo.classList.add("show");
    }
  }

  clearSelectedPet() {
    const selectedPetId = document.getElementById("selectedPetId");
    const selectedInfo = document.getElementById("selectedPetInfo");

    if (selectedPetId) selectedPetId.value = "";
    if (selectedInfo) {
      selectedInfo.classList.remove("show");
      selectedInfo.innerHTML = "";
    }
  }

  setupServicoSearch() {
    const input = document.getElementById("servico");
    const results = document.getElementById("servicoResults");
    let searchTimeout;

    if (input && results) {
      input.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
          results.classList.remove("show");
          return;
        }

        searchTimeout = setTimeout(() => {
          this.searchServicos(query, results);
        }, 300);
      });

      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
          results.classList.remove("show");
        }
      });
    }
  }

  searchServicos(query, resultsContainer) {
    const servicos = [
      { id: 1, nome: "Banho", preco: 25.0, descricao: "Banho completo" },
      {
        id: 2,
        nome: "Banho e Tosa",
        preco: 45.0,
        descricao: "Banho + Tosa higiênica",
      },
      {
        id: 3,
        nome: "Tosa Completa",
        preco: 60.0,
        descricao: "Tosa completa com acabamento",
      },
      {
        id: 4,
        nome: "Consulta Veterinária",
        preco: 80.0,
        descricao: "Consulta clínica geral",
      },
      {
        id: 5,
        nome: "Vacinação",
        preco: 35.0,
        descricao: "Aplicação de vacina",
      },
      {
        id: 6,
        nome: "Exame de Sangue",
        preco: 120.0,
        descricao: "Hemograma completo",
      },
    ];

    const filteredServicos = servicos.filter(
      (s) =>
        s.nome.toLowerCase().includes(query.toLowerCase()) ||
        s.descricao.toLowerCase().includes(query.toLowerCase()),
    );

    resultsContainer.innerHTML = "";

    filteredServicos.forEach((servico) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
                <div class="search-result-name">${servico.nome}</div>
                <div class="search-result-details">${servico.descricao} - R$ ${servico.preco.toFixed(2)}</div>
            `;
      item.addEventListener("click", () => {
        this.selectServico(servico);
        resultsContainer.classList.remove("show");
      });
      resultsContainer.appendChild(item);
    });

    if (filteredServicos.length > 0) {
      resultsContainer.classList.add("show");
    } else {
      resultsContainer.innerHTML =
        '<div class="search-result-item">Nenhum serviço encontrado</div>';
      resultsContainer.classList.add("show");
    }
  }

  selectServico(servico) {
    const input = document.getElementById("servico");
    const selectedServicoId = document.getElementById("selectedServicoId");
    const valorUnitario = document.getElementById("valorUnitario");

    if (input) input.value = servico.nome;
    if (selectedServicoId) selectedServicoId.value = servico.id;
    if (valorUnitario) valorUnitario.value = servico.preco.toFixed(2);

    this.calcularValorFinal();
  }

  clearSelectedServico() {
    const selectedServicoId = document.getElementById("selectedServicoId");
    const valorUnitario = document.getElementById("valorUnitario");

    if (selectedServicoId) selectedServicoId.value = "";
    if (valorUnitario) valorUnitario.value = "";
  }

  setupCalculoValores() {
    const quantidade = document.getElementById("quantidade");
    const desconto = document.getElementById("desconto");

    if (quantidade) {
      quantidade.addEventListener("input", () => this.calcularValorFinal());
    }

    if (desconto) {
      desconto.addEventListener("input", () => this.calcularValorFinal());
    }
  }

  calcularValorFinal() {
    const valorUnitario = parseFloat(
      document.getElementById("valorUnitario")?.value || 0,
    );
    const quantidade = parseInt(
      document.getElementById("quantidade")?.value || 1,
    );
    const desconto = parseFloat(
      document.getElementById("desconto")?.value || 0,
    );
    const valorFinal = document.getElementById("valorFinal");

    if (valorUnitario > 0) {
      const valorTotal = valorUnitario * quantidade;
      const valorComDesconto = valorTotal - (valorTotal * desconto) / 100;

      if (valorFinal) {
        valorFinal.value = valorComDesconto.toFixed(2);
      }
    }
  }

  async submitNovoAgendamento() {
    const form = document.getElementById("novoAgendamentoForm");
    const formData = new FormData(form);

    // Validar campos obrigatórios
    const petId = document.getElementById("selectedPetId")?.value;
    const servicoId = document.getElementById("selectedServicoId")?.value;
    const data =
      formData.get("dataAgendamento") ||
      document.getElementById("dataAgendamento")?.value;
    const horario =
      formData.get("horarioAgendamento") ||
      document.getElementById("horarioAgendamento")?.value;

    if (!petId && !document.getElementById("petCliente")?.value) {
      alert("Por favor, selecione um pet ou cliente.");
      return;
    }

    if (!servicoId && !document.getElementById("servico")?.value) {
      alert("Por favor, selecione um serviço.");
      return;
    }

    if (!data) {
      alert("Por favor, selecione uma data.");
      return;
    }

    if (!horario) {
      alert("Por favor, selecione um horário.");
      return;
    }

    const agendamentoData = {
      petId: petId || null,
      cliente: document.getElementById("petCliente")?.value,
      servico: document.getElementById("servico")?.value,
      servicoId: servicoId || null,
      data: data,
      hora: horario,
      valor: parseFloat(document.getElementById("valorFinal")?.value || 0),
      profissional: document.getElementById("profissional")?.value,
      observacoes: document.getElementById("observacoes")?.value,
      status: document.getElementById("statusAgendamento")?.value || "agendado",
    };

    try {
      const response = await fetch("/api/agendamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agendamentoData),
      });

      if (response.ok) {
        const result = await response.json();
        alert("Agendamento criado com sucesso!");
        this.closeAgendamentoSidebar();
        this.loadAgendamentos(); // Recarregar a lista
      } else {
        const error = await response.json();
        alert(
          "Erro ao criar agendamento: " +
            (error.message || "Erro desconhecido"),
        );
      }
    } catch (error) {
      console.error("Erro ao enviar agendamento:", error);
      alert(
        "Erro ao criar agendamento. Verifique sua conexão e tente novamente.",
      );
    }
  }

  // Métodos para ações dos ícones
  showLocation(agendamentoId) {
    console.log("📍 Mostrar localização para agendamento:", agendamentoId);
    // TODO: Implementar funcionalidade de localização
    alert("Funcionalidade de localização será implementada em breve!");
  }

  shareAgendamento(agendamentoId) {
    console.log(
      "� Redirecionando para checkout do agendamento:",
      agendamentoId,
    );
    // Redireciona para a página de detalhes para finalizar checkout
    window.location.href = `agendamento-detalhes.html?id=${agendamentoId}`;
  }

  showMoreOptions(agendamentoId, event) {
    if (event) event.stopPropagation();
    console.log("⋮ Mostrar mais opções para agendamento:", agendamentoId);
    // TODO: Implementar menu de opções
    alert("Menu de opções será implementado em breve!");
  }

  // Marca um agendamento como check-in (disparado pelo ícone azul)
  async marcarCheckin(agendamentoId) {
    try {
      const res = await fetch(`/api/agendamentos/${agendamentoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checkin" }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        alert(err.error || "Erro ao marcar check-in");
        return;
      }

      // Atualiza localmente a linha na lista
      this.updateRowStatusInList(String(agendamentoId), "checkin");

      // Atualiza o array local se presente
      try {
        const idx = this.agendamentos.findIndex(
          (a) => String(a.id) === String(agendamentoId),
        );
        if (idx !== -1) this.agendamentos[idx].status = "checkin";
      } catch (e) {
        /* ignore */
      }

      // Notificar outras abas
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("agendamentos_channel");
          bc.postMessage({
            type: "status-updated",
            id: agendamentoId,
            status: "checkin",
          });
          bc.close();
        } else if (window.postMessage) {
          window.postMessage(
            { type: "status-updated", id: agendamentoId, status: "checkin" },
            "*",
          );
        }
      } catch (e) {
        console.warn("Erro ao notificar abas sobre check-in", e);
      }
    } catch (error) {
      console.error("Erro ao marcar check-in:", error);
      alert("Erro ao marcar check-in. Tente novamente.");
    }
  }

  // ========== PERSISTÊNCIA DOS FILTROS DE SITUAÇÃO ==========

  async loadSavedFilters() {
    try {
      const response = await fetch(
        "/api/user-filters?pagina=agendamentos-novo",
      );
      if (!response.ok) {
        console.log("ℹ️ Nenhum filtro salvo encontrado");
        return;
      }

      const data = await response.json();
      console.log("📥 Filtros carregados:", data);

      // Parse filtros se vier como string
      let filtros = data.filtros;
      if (typeof filtros === "string") {
        try {
          filtros = JSON.parse(filtros);
        } catch (e) {
          console.warn("Não foi possível parsear filtros:", e);
          return;
        }
      }

      if (
        filtros &&
        filtros.statusFilters &&
        Array.isArray(filtros.statusFilters)
      ) {
        // Aplicar filtros salvos às tags
        this.applyStatusFilters(filtros.statusFilters);
        // Atualizar array interno
        this.filtros.status = filtros.statusFilters;
        console.log("✅ Filtros de situação aplicados:", filtros.statusFilters);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar filtros salvos:", error);
    }

    // NÃO restaurar filtros de texto do localStorage automaticamente.
    // Filtros de texto (petCliente, profissional) ficam apenas na sessão atual
    // e não devem persistir entre carregamentos de página, pois fazem a API
    // retornar apenas agendamentos que contenham o termo pesquisado.
    // O usuário deve reaplicar os filtros manualmente se desejar.
    // Limpar localStorage para garantir que filtros antigos não interfiram.
    try {
      localStorage.removeItem("ag_filtro_petCliente");
      localStorage.removeItem("ag_filtro_profissional");
    } catch (e) {}
  }

  applyStatusFilters(statusArray) {
    // Remover 'active' de todas as tags primeiro
    const allTags = document.querySelectorAll(".status-tag");
    allTags.forEach((tag) => tag.classList.remove("active"));

    // Adicionar 'active' apenas nas tags que estão no array salvo
    statusArray.forEach((status) => {
      const tag = document.querySelector(`.status-tag.status-${status}`);
      if (tag) {
        tag.classList.add("active");
      }
    });
  }

  async saveStatusFilters() {
    try {
      // Primeiro, buscar o estado atual de filtersCollapsed para não sobrescrever
      let currentFiltersCollapsed = false;
      let currentPeriod = this.period;
      try {
        const currentResp = await fetch(
          "/api/user-filters?pagina=agendamentos-novo",
        );
        if (currentResp.ok) {
          const currentData = await currentResp.json();
          let filtros = currentData.filtros;
          if (typeof filtros === "string") {
            filtros = JSON.parse(filtros);
          }
          if (filtros && typeof filtros.filtersCollapsed !== "undefined") {
            currentFiltersCollapsed = filtros.filtersCollapsed;
          }
          if (filtros && filtros.selectedPeriod) {
            currentPeriod = filtros.selectedPeriod;
          }
        }
      } catch (e) {
        console.warn("Não foi possível buscar estado atual:", e);
      }

      const payload = {
        pagina: "agendamentos-novo",
        filtros: {
          filtersCollapsed: currentFiltersCollapsed,
          statusFilters: this.filtros.status,
          selectedPeriod: currentPeriod,
        },
      };

      const response = await fetch("/api/user-filters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar filtros");
      }

      console.log("💾 Filtros salvos:", this.filtros.status);
    } catch (error) {
      console.error("❌ Erro ao salvar filtros:", error);
    }
  }

  async loadSavedPeriod() {
    try {
      const response = await fetch(
        "/api/user-filters?pagina=agendamentos-novo",
      );
      if (!response.ok) {
        console.log("ℹ️ Nenhum período salvo encontrado");
        return;
      }

      const data = await response.json();

      // Parse filtros se vier como string
      let filtros = data.filtros;
      if (typeof filtros === "string") {
        try {
          filtros = JSON.parse(filtros);
        } catch (e) {
          console.warn("Não foi possível parsear filtros:", e);
          return;
        }
      }

      if (filtros && filtros.selectedPeriod) {
        if (!this._periodFromUrl) {
          this.period = filtros.selectedPeriod;
          // Aplicar classe active no botão correto
          document.querySelectorAll(".view-period-btn").forEach((btn) => {
            btn.classList.remove("active");
            if (btn.dataset.period === filtros.selectedPeriod) {
              btn.classList.add("active");
            }
          });
          console.log("✅ Período aplicado:", filtros.selectedPeriod);
        } else {
          console.log("ℹ️ Período salvo ignorado devido a parâmetro de URL");
        }
      }
    } catch (error) {
      console.error("❌ Erro ao carregar período salvo:", error);
    }
  }

  async savePeriod() {
    try {
      // Buscar estado atual para não sobrescrever outros campos
      let currentFiltersCollapsed = false;
      let currentStatusFilters = this.filtros.status;
      let currentDate = this.currentDate.toISOString();
      try {
        const currentResp = await fetch(
          "/api/user-filters?pagina=agendamentos-novo",
        );
        if (currentResp.ok) {
          const currentData = await currentResp.json();
          let filtros = currentData.filtros;
          if (typeof filtros === "string") {
            filtros = JSON.parse(filtros);
          }
          if (filtros && typeof filtros.filtersCollapsed !== "undefined") {
            currentFiltersCollapsed = filtros.filtersCollapsed;
          }
          if (filtros && filtros.statusFilters) {
            currentStatusFilters = filtros.statusFilters;
          }
          if (filtros && filtros.currentDate) {
            currentDate = filtros.currentDate;
          }
        }
      } catch (e) {
        console.warn("Não foi possível buscar estado atual:", e);
      }

      const payload = {
        pagina: "agendamentos-novo",
        filtros: {
          filtersCollapsed: currentFiltersCollapsed,
          statusFilters: currentStatusFilters,
          selectedPeriod: this.period,
          currentDate: currentDate,
        },
      };

      const response = await fetch("/api/user-filters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar período");
      }

      console.log("💾 Período salvo:", this.period);
    } catch (error) {
      console.error("❌ Erro ao salvar período:", error);
    }
  }

  async loadSavedDate() {
    try {
      const response = await fetch(
        "/api/user-filters?pagina=agendamentos-novo",
      );
      if (!response.ok) {
        console.log("ℹ️ Nenhuma data salva encontrada");
        return;
      }

      const data = await response.json();

      // Parse filtros se vier como string
      let filtros = data.filtros;
      if (typeof filtros === "string") {
        try {
          filtros = JSON.parse(filtros);
        } catch (e) {
          console.warn("Não foi possível parsear filtros:", e);
          return;
        }
      }

      if (filtros && filtros.currentDate) {
        this.currentDate = new Date(filtros.currentDate);
        this.updateDateDisplay();
        console.log("✅ Data aplicada:", this.currentDate);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar data salva:", error);
    }
  }

  async saveCurrentDate() {
    try {
      // Buscar estado atual para não sobrescrever outros campos
      let currentFiltersCollapsed = false;
      let currentStatusFilters = this.filtros.status;
      let currentPeriod = this.period;
      try {
        const currentResp = await fetch(
          "/api/user-filters?pagina=agendamentos-novo",
        );
        if (currentResp.ok) {
          const currentData = await currentResp.json();
          let filtros = currentData.filtros;
          if (typeof filtros === "string") {
            filtros = JSON.parse(filtros);
          }
          if (filtros && typeof filtros.filtersCollapsed !== "undefined") {
            currentFiltersCollapsed = filtros.filtersCollapsed;
          }
          if (filtros && filtros.statusFilters) {
            currentStatusFilters = filtros.statusFilters;
          }
          if (filtros && filtros.selectedPeriod) {
            currentPeriod = filtros.selectedPeriod;
          }
        }
      } catch (e) {
        console.warn("Não foi possível buscar estado atual:", e);
      }

      const payload = {
        pagina: "agendamentos-novo",
        filtros: {
          filtersCollapsed: currentFiltersCollapsed,
          statusFilters: currentStatusFilters,
          selectedPeriod: currentPeriod,
          currentDate: this.currentDate.toISOString(),
        },
      };

      const response = await fetch("/api/user-filters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar data");
      }

      console.log("💾 Data salva:", this.currentDate);
    } catch (error) {
      console.error("❌ Erro ao salvar data:", error);
    }
  }
}

// --- Garantir fechamento de dropdowns/menus ao voltar com o botão do navegador ---
function _closeAllOpenMenus() {
  try {
    // fechar elementos com classes comuns de dropdown/menu
    const selectors = [".submenu.open", ".menu.open", ".popover.show"];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.remove("show");
        el.classList.remove("open");
        try {
          el.style.display = "none";
        } catch (e) {}
        try {
          el.style.opacity = "";
          el.style.visibility = "";
        } catch (e) {}
      });
    });
    // Fechar dropdowns: apenas remover a classe open/show do container, sem display:none
    document
      .querySelectorAll(".dropdown.show, .dropdown.open")
      .forEach((el) => {
        el.classList.remove("show");
        el.classList.remove("open");
      });

    // fechar .dropdown-menu e .submenu individualmente e limpar estilos inline
    document
      .querySelectorAll(".dropdown-menu, .submenu, .popover")
      .forEach((el) => {
        el.classList.remove("show");
        el.classList.remove("open");
        // Não forçar display:none em .dropdown-menu; o CSS usa .dropdown.open para exibir
        if (!el.classList.contains("dropdown-menu")) {
          try {
            el.style.display = "none";
          } catch (e) {}
        } else {
          try {
            el.style.removeProperty("display");
          } catch (e) {}
        }
        try {
          el.style.opacity = "";
          el.style.visibility = "";
        } catch (e) {}
        try {
          el.removeAttribute("aria-hidden");
        } catch (e) {}
        // Remover 'open' do container pai .dropdown
        try {
          const parent = el.closest(".dropdown");
          if (parent) parent.classList.remove("open");
        } catch (e) {}
      });

    // ajustar toggles com aria-expanded
    document.querySelectorAll('[aria-expanded="true"]').forEach((t) => {
      try {
        t.setAttribute("aria-expanded", "false");
      } catch (e) {}
      try {
        t.classList.remove("show");
      } catch (e) {}
    });

    // limpar toggles especificos (ex.: inicioRapidoBtn)
    try {
      const inicioBtn = document.getElementById("inicioRapidoBtn");
      const inicioMenu = document.getElementById("inicioRapidoMenu");
      if (inicioBtn)
        try {
          inicioBtn.classList.remove("show");
          inicioBtn.setAttribute("aria-expanded", "false");
          const dropdown = inicioBtn.closest(".dropdown");
          if (dropdown) dropdown.classList.remove("open");
        } catch (e) {}
      if (inicioMenu)
        try {
          inicioMenu.classList.remove("show");
          inicioMenu.style.removeProperty("display");
        } catch (e) {}
    } catch (e) {}
  } catch (e) {
    console.warn("_closeAllOpenMenus error", e);
  }
}

// Executar ao voltar/forward do navegador
try {
  window.addEventListener("pageshow", (ev) => {
    try {
      _closeAllOpenMenus();
    } catch (e) {}
  });
  window.addEventListener("popstate", () => {
    try {
      _closeAllOpenMenus();
    } catch (e) {}
  });
} catch (e) {
  console.warn("Navigation listeners not attached (global)", e);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM carregado, iniciando AgendamentosManager...");
  window.agendamentosManager = new AgendamentosManager();
  console.log(
    "✅ AgendamentosManager inicializado:",
    window.agendamentosManager,
  );
});

// Fallback para garantir inicialização
window.addEventListener("load", () => {
  if (!window.agendamentosManager) {
    console.log("🔄 Fallback: Inicializando AgendamentosManager...");
    window.agendamentosManager = new AgendamentosManager();
  }
});

// Functions for dropdown menu integration
// NOTA: novoAtendimento() é definido globalmente em novo-atendimento-global.js
// Não sobrescrever aqui para garantir que sempre abra o modal azul correto
