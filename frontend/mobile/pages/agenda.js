/* ============================================================
   PetHub Mobile — Página: Agenda
   Exibe agendamentos do dia com navegação por data.
   Consome: GET /api/agendamentos?data=YYYY-MM-DD
   ============================================================ */

window.PageAgenda = (function () {
  "use strict";

  let _container = null;
  let _dataAtual = new Date();
  let _abortController = null;

  async function init(container) {
    _container = container;
    _dataAtual = new Date();
    _renderShell(container);
    await _carregarAgendamentos(container);
    _setupSyncListeners();
  }

  function _renderShell(container) {
    container.innerHTML = `
      <div class="page-wrapper" style="padding-top:12px">

        <!-- Navegação de data -->
        <div class="agenda-date-header">
          <div class="agenda-date-nav">
            <button class="agenda-date-btn" id="btn-dia-ant" aria-label="Dia anterior">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div class="agenda-date-title" id="agenda-data-titulo">—</div>
            <button class="agenda-date-btn" id="btn-dia-prox" aria-label="Próximo dia">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <button class="btn btn-secondary" id="btn-hoje" style="padding:7px 14px;font-size:12px">Hoje</button>
        </div>

        <!-- Pills de filtro por status -->
        <div class="pill-tabs" id="agenda-filtro-tabs" style="margin-bottom:12px">
          <button class="pill-tab active" data-status="todos">Todos</button>
          <button class="pill-tab" data-status="agendado">Agendados</button>
          <button class="pill-tab" data-status="checkin">Em atend.</button>
          <button class="pill-tab" data-status="pronto">Prontos</button>
          <button class="pill-tab" data-status="concluido">Concluídos</button>
          <button class="pill-tab" data-status="cancelado">Cancelados</button>
        </div>

        <!-- Resumo do dia -->
        <div class="stat-grid" id="agenda-resumo" style="margin-bottom:16px">
          <div class="stat-card blue"><div class="spinner" style="width:16px;height:16px;border-width:2px;margin:auto"></div></div>
          <div class="stat-card green"><div class="spinner" style="width:16px;height:16px;border-width:2px;margin:auto"></div></div>
        </div>

        <!-- Lista de agendamentos -->
        <div class="card" id="agenda-lista">
          <div class="state-loading"><div class="spinner"></div><div class="state-sub">Carregando...</div></div>
        </div>

      </div>
    `;

    _atualizarTituloData(container);
    _bindEvents(container);
  }

  function _bindEvents(container) {
    let _filtroAtivo = "todos";

    container.querySelector("#btn-dia-ant").addEventListener("click", () => {
      _dataAtual.setDate(_dataAtual.getDate() - 1);
      _atualizarTituloData(container);
      _carregarAgendamentos(container);
    });

    container.querySelector("#btn-dia-prox").addEventListener("click", () => {
      _dataAtual.setDate(_dataAtual.getDate() + 1);
      _atualizarTituloData(container);
      _carregarAgendamentos(container);
    });

    container.querySelector("#btn-hoje").addEventListener("click", () => {
      _dataAtual = new Date();
      _atualizarTituloData(container);
      _carregarAgendamentos(container);
    });

    // Filtro por status
    container
      .querySelector("#agenda-filtro-tabs")
      .addEventListener("click", (e) => {
        const tab = e.target.closest(".pill-tab");
        if (!tab) return;
        container
          .querySelectorAll(".pill-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        _filtroAtivo = tab.dataset.status;
        _aplicarFiltro(container, _filtroAtivo);
      });
  }

  async function _carregarAgendamentos(container) {
    if (_abortController) _abortController.abort();
    _abortController = new AbortController();

    const listaEl = container.querySelector("#agenda-lista");
    const resumoEl = container.querySelector("#agenda-resumo");
    if (!listaEl) return;

    listaEl.innerHTML = `<div class="state-loading"><div class="spinner"></div></div>`;

    const dataStr = _toISODate(_dataAtual);

    try {
      const data = await MobileApi.get("/api/agendamentos", { data: dataStr });
      if (!_container) return;

      const lista = Array.isArray(data)
        ? data
        : data?.agendamentos || data?.data || [];

      // Armazenar todos para filtro client-side
      listaEl.dataset.todos = JSON.stringify(lista);

      // Calcular resumo
      const total = lista.length;
      const ativos = lista.filter((a) =>
        ["checkin", "pronto"].includes(a.status),
      ).length;

      if (resumoEl) {
        resumoEl.innerHTML = `
          <div class="stat-card blue">
            <div class="stat-icon">📋</div>
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${ativos}</div>
            <div class="stat-label">Em atend.</div>
          </div>
        `;
      }

      // Renderizar lista
      _renderLista(listaEl, lista);
    } catch (err) {
      if (err.name === "AbortError") return;
      if (listaEl) {
        listaEl.innerHTML = `
          <div class="state-error">
            <div class="state-icon">⚠️</div>
            <div class="state-sub">${escapeHtml(err.message || "Erro ao carregar")}</div>
            <button class="btn btn-secondary" style="margin-top:12px;padding:8px 16px;font-size:13px"
              onclick="MobileRouter.navigate('agenda')">Tentar novamente</button>
          </div>
        `;
      }
    }
  }

  function _aplicarFiltro(container, filtro) {
    const listaEl = container.querySelector("#agenda-lista");
    if (!listaEl) return;
    let lista = [];
    try {
      lista = JSON.parse(listaEl.dataset.todos || "[]");
    } catch (_) {}
    const filtrados =
      filtro === "todos" ? lista : lista.filter((a) => a.status === filtro);
    _renderLista(listaEl, filtrados);
  }

  function _renderLista(listaEl, lista) {
    if (!lista.length) {
      listaEl.innerHTML = `
        <div class="state-empty">
          <div class="state-icon">📭</div>
          <div class="state-title">Sem agendamentos</div>
          <div class="state-sub">Nenhum agendamento para este dia</div>
        </div>
      `;
      return;
    }

    // Ordenar por horário
    const ordenados = [...lista].sort((a, b) => {
      const ha = a.horario || a.horaInicio || "";
      const hb = b.horario || b.horaInicio || "";
      return ha.localeCompare(hb);
    });

    listaEl.innerHTML = ordenados
      .map((ag) => {
        const hora = _formatarHora(ag.horario || ag.horaInicio);
        const petNome = ag.pet?.nome || ag.nomePet || ag.petNome || "Pet";
        const petFoto = ag.pet?.fotoUrl || ag.fotoPet || null;
        const servico = _nomeServico(
          ag.servico || ag.tipoServico || ag.nomeServico,
        );
        const cliente =
          ag.cliente?.nome || ag.nomeCliente || ag.clienteNome || "";
        const status = ag.status || "agendado";
        const profissional = ag.profissional?.nome || ag.nomeProfissional || "";

        const avatarHtml = petFoto
          ? `<img src="${escapeHtml(petFoto)}" alt="${escapeHtml(petNome)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
          : `<span style="font-size:20px">🐾</span>`;

        return `
        <div class="agenda-item">
          <div class="agenda-time">
            <span class="agenda-time-main">${hora}</span>
          </div>
          <div class="list-item-avatar">${avatarHtml}</div>
          <div class="agenda-item-body">
            <div class="agenda-pet-name">${escapeHtml(petNome)}</div>
            <div class="agenda-service">${escapeHtml(servico)}</div>
            ${cliente ? `<div class="agenda-client">👤 ${escapeHtml(cliente)}</div>` : ""}
            ${profissional ? `<div class="agenda-client">✂️ ${escapeHtml(profissional)}</div>` : ""}
          </div>
          <div class="list-item-right">
            <span class="status-badge status-${status}">${_labelStatus(status)}</span>
          </div>
        </div>
      `;
      })
      .join("");
  }

  function _atualizarTituloData(container) {
    const el = container.querySelector("#agenda-data-titulo");
    if (!el) return;
    const hoje = new Date();
    const isHoje = _toISODate(_dataAtual) === _toISODate(hoje);
    el.textContent = isHoje
      ? "Hoje"
      : _dataAtual.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });
  }

  function refresh() {
    if (_container) _carregarAgendamentos(_container);
  }

  function destroy() {
    if (_abortController) _abortController.abort();
    _container = null;
    _removeSyncListeners();
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _toISODate(d) {
    // Sempre usa fuso de Brasília (UTC-3, sem DST desde 2019)
    return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  }

  function _formatarHora(horario) {
    if (!horario) return "--:--";
    const m = String(horario).match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : String(horario).substring(0, 5);
  }

  function _nomeServico(servico) {
    if (!servico) return "Serviço";
    if (typeof servico === "object")
      return servico.nome || servico.name || "Serviço";
    const map = {
      banho: "Banho",
      tosa: "Tosa",
      banho_tosa: "Banho e Tosa",
      tosa_higienica: "Tosa Higiênica",
      consulta: "Consulta",
      veterinario: "Veterinário",
    };
    return map[String(servico).toLowerCase()] || String(servico);
  }

  function _labelStatus(s) {
    const labels = {
      agendado: "Agendado",
      checkin: "Em Atend.",
      pronto: "Pronto",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[s] || s;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">");
  }

  /* ── Sincronização ─────────────────────────────────────────── */
  let _syncUnsubscribers = [];

  function _setupSyncListeners() {
    if (typeof MobileSync === "undefined" || !MobileSync.on) return;

    const unsub1 = MobileSync.on("agendamento-atualizado", () => {
      console.log("[Agenda] Sincronizando: agendamento-atualizado");
      refresh();
    });
    const unsub2 = MobileSync.on("agendamento-criado", () => {
      console.log("[Agenda] Sincronizando: agendamento-criado");
      refresh();
    });
    const unsub3 = MobileSync.on("agendamento-cancelado", () => {
      console.log("[Agenda] Sincronizando: agendamento-cancelado");
      refresh();
    });

    _syncUnsubscribers = [unsub1, unsub2, unsub3];
  }

  function _removeSyncListeners() {
    _syncUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
    _syncUnsubscribers = [];
  }

  return { init, refresh, destroy };
})();
