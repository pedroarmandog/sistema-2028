/* ============================================================
   PetHub Mobile — Página: Pets
   Exibe pets no estabelecimento (checkin/pronto) e lista geral.
   Consome:
   - GET /api/dashboard/pets-no-estabelecimento
   - GET /api/pets
   Auto-refresh a cada 30 segundos.
   ============================================================ */

window.PagePets = (function () {
  "use strict";

  let _container = null;
  let _refreshTimer = null;
  let _todosPets = [];
  let _busca = "";
  let _filtroAtivo = "estabelecimento";

  async function init(container) {
    _container = container;
    _filtroAtivo = "estabelecimento";
    _busca = "";
    _renderShell(container);
    await _carregarDados(container);
    _startAutoRefresh(container);
    _setupSyncListeners();
  }

  function _renderShell(container) {
    container.innerHTML = `
      <div class="page-wrapper" style="padding-top:12px">

        <div class="section-header" style="margin-bottom:12px">
          <span class="section-title">🐾 Pets</span>
        </div>

        <!-- Filtros -->
        <div class="pill-tabs" style="padding:0;margin-bottom:12px">
          <button class="pill-tab active" data-filtro="estabelecimento">No local</button>
          <button class="pill-tab" data-filtro="todos">Todos</button>
        </div>

        <!-- Campo de busca (visível no modo "todos") -->
        <div id="busca-wrapper" style="display:none;margin-bottom:12px">
          <input
            type="search"
            id="input-busca-pet"
            class="form-input"
            placeholder="Buscar por nome..."
            autocomplete="off"
            autocorrect="off"
          >
        </div>

        <!-- Stats no estabelecimento -->
        <div class="stat-grid-3" id="pets-estab-stats" style="margin-bottom:16px">
          ${_skeleton(3)}
        </div>

        <!-- Lista principal -->
        <div id="pets-lista">
          <div class="state-loading"><div class="spinner"></div></div>
        </div>

      </div>
    `;

    _bindEvents(container);
  }

  function _bindEvents(container) {
    // Filtro tabs
    container.querySelectorAll(".pill-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        container
          .querySelectorAll(".pill-tab")
          .forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        _filtroAtivo = btn.dataset.filtro;

        const buscaWrap = container.querySelector("#busca-wrapper");
        if (buscaWrap)
          buscaWrap.style.display = _filtroAtivo === "todos" ? "block" : "none";

        _renderLista(container);
      });
    });

    // Busca
    const inputBusca = container.querySelector("#input-busca-pet");
    if (inputBusca) {
      inputBusca.addEventListener("input", () => {
        _busca = inputBusca.value.toLowerCase().trim();
        _renderLista(container);
      });
    }
  }

  async function _carregarDados(container) {
    try {
      const [petsEstab, todosPets] = await Promise.allSettled([
        MobileApi.get("/api/dashboard/pets-no-estabelecimento"),
        MobileApi.get("/api/pets"),
      ]);

      if (!_container) return;

      // Pets no estabelecimento (agendamentos ativos hoje)
      const estab = petsEstab.status === "fulfilled" ? petsEstab.value : null;

      // Stats
      const statsEl = container.querySelector("#pets-estab-stats");
      if (statsEl && estab) {
        statsEl.innerHTML = `
          <div class="stat-card orange">
            <div class="stat-icon">🛁</div>
            <div class="stat-value">${estab.checkin ?? 0}</div>
            <div class="stat-label">Em banho</div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon">✅</div>
            <div class="stat-value">${estab.pronto ?? 0}</div>
            <div class="stat-label">Prontos</div>
          </div>
          <div class="stat-card blue">
            <div class="stat-icon">📅</div>
            <div class="stat-value">${estab.agendados ?? 0}</div>
            <div class="stat-label">Agendados</div>
          </div>
        `;
      }

      // Guardar todos os pets para busca
      const listaPets =
        todosPets.status === "fulfilled" ? todosPets.value : null;
      _todosPets = Array.isArray(listaPets)
        ? listaPets
        : listaPets?.pets || listaPets?.data || [];

      // Lista dos pets no estabelecimento (dos agendamentos de hoje)
      if (estab?.lista) {
        container.dataset.petsEstab = JSON.stringify(estab.lista);
      } else if (estab?.agendamentos) {
        container.dataset.petsEstab = JSON.stringify(estab.agendamentos);
      } else {
        container.dataset.petsEstab = "[]";
      }

      _renderLista(container);
    } catch (err) {
      const listaEl = container.querySelector("#pets-lista");
      if (listaEl) {
        listaEl.innerHTML = `<div class="state-error">
          <div class="state-icon">⚠️</div>
          <div class="state-sub">${escapeHtml(err.message)}</div>
        </div>`;
      }
    }
  }

  function _renderLista(container) {
    const listaEl = container.querySelector("#pets-lista");
    if (!listaEl) return;

    if (_filtroAtivo === "estabelecimento") {
      let petsEstab = [];
      try {
        petsEstab = JSON.parse(container.dataset.petsEstab || "[]");
      } catch (_) {}
      _renderPetsEstab(listaEl, petsEstab);
    } else {
      _renderTodosPets(listaEl, _todosPets, _busca);
    }
  }

  function _renderPetsEstab(el, lista) {
    if (!lista.length) {
      el.innerHTML = `
        <div class="state-empty">
          <div class="state-icon">🏠</div>
          <div class="state-title">Nenhum pet no local</div>
          <div class="state-sub">Nenhum pet com check-in no momento</div>
        </div>
      `;
      return;
    }

    el.innerHTML =
      `<div class="card">` +
      lista
        .map((item) => {
          const petNome = item.pet?.nome || item.nomePet || item.nome || "Pet";
          const petFoto = item.pet?.fotoUrl || item.foto || null;
          const servico = _nomeServico(
            item.servico || item.tipoServico || item.nomeServico,
          );
          const status = item.status || "checkin";
          const hora = _formatarHora(item.horario || item.horaInicio);
          const cliente = item.cliente?.nome || item.nomeCliente || "";

          const avatarHtml = petFoto
            ? `<img src="${escapeHtml(petFoto)}" alt="${escapeHtml(petNome)}">`
            : `<span style="font-size:20px">🐾</span>`;

          return `
        <div class="list-item">
          <div class="list-item-avatar">${avatarHtml}</div>
          <div class="list-item-info">
            <div class="list-item-title">${escapeHtml(petNome)}</div>
            <div class="list-item-sub">${escapeHtml(servico)} · ${hora}</div>
            ${cliente ? `<div class="list-item-sub">👤 ${escapeHtml(cliente)}</div>` : ""}
          </div>
          <div class="list-item-right">
            <span class="status-badge status-${status}">${_labelStatus(status)}</span>
          </div>
        </div>
      `;
        })
        .join("") +
      `</div>`;
  }

  function _renderTodosPets(el, lista, busca) {
    let filtrados = lista;
    if (busca) {
      filtrados = lista.filter((p) => {
        const nome = (p.nome || "").toLowerCase();
        const dono = (p.cliente?.nome || p.nomeDono || "").toLowerCase();
        const raca = (p.raca || "").toLowerCase();
        return (
          nome.includes(busca) || dono.includes(busca) || raca.includes(busca)
        );
      });
    }

    if (!filtrados.length) {
      el.innerHTML = `
        <div class="state-empty">
          <div class="state-icon">🔍</div>
          <div class="state-title">${busca ? "Nenhum resultado" : "Nenhum pet"}</div>
          <div class="state-sub">${busca ? `Sem pets com "${escapeHtml(busca)}"` : "Nenhum pet cadastrado"}</div>
        </div>
      `;
      return;
    }

    // Paginação simples: mostrar 50 por vez
    const exibir = filtrados.slice(0, 50);
    el.innerHTML =
      `<div class="card">` +
      exibir
        .map((pet) => {
          const foto = pet.foto_url || pet.fotoUrl || pet.foto || null;
          const nome = pet.nome || "Sem nome";
          const raca = pet.raca || "";
          const porte = pet.porte || "";
          const dono = pet.cliente?.nome || pet.nomeDono || "";
          const ativo = pet.ativo !== false;

          const avatarHtml = foto
            ? `<img src="${escapeHtml(foto)}" alt="${escapeHtml(nome)}">`
            : `<span style="font-size:20px">🐾</span>`;

          return `
        <div class="list-item">
          <div class="list-item-avatar">${avatarHtml}</div>
          <div class="list-item-info">
            <div class="list-item-title">${escapeHtml(nome)}
              ${!ativo ? `<span class="chip" style="margin-left:6px;font-size:9px">Inativo</span>` : ""}
            </div>
            <div class="list-item-sub">${[raca, porte].filter(Boolean).map(escapeHtml).join(" · ") || "—"}</div>
            ${dono ? `<div class="list-item-sub">👤 ${escapeHtml(dono)}</div>` : ""}
          </div>
        </div>
      `;
        })
        .join("") +
      `</div>`;

    if (filtrados.length > 50) {
      el.insertAdjacentHTML(
        "beforeend",
        `
        <p style="text-align:center;color:var(--muted);font-size:12px;padding:12px 0">
          Mostrando 50 de ${filtrados.length} pets. Use a busca para filtrar.
        </p>
      `,
      );
    }
  }

  function _startAutoRefresh(container) {
    _stopAutoRefresh();
    _refreshTimer = setInterval(() => _carregarDados(container), 30_000);
  }

  function _stopAutoRefresh() {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  }

  function refresh() {
    if (_container) _carregarDados(_container);
  }

  function destroy() {
    _stopAutoRefresh();
    _container = null;
    _todosPets = [];
    _removeSyncListeners();
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _skeleton(n) {
    return Array(n)
      .fill(0)
      .map(
        () =>
          `<div class="stat-card" style="min-height:80px"><div class="spinner" style="width:16px;height:16px;border-width:2px;margin:auto"></div></div>`,
      )
      .join("");
  }

  function _formatarHora(h) {
    if (!h) return "--:--";
    const m = String(h).match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : String(h).substring(0, 5);
  }

  function _nomeServico(s) {
    if (!s) return "Serviço";
    if (typeof s === "object") return s.nome || s.name || "Serviço";
    const map = {
      banho: "Banho",
      tosa: "Tosa",
      banho_tosa: "Banho e Tosa",
      tosa_higienica: "Tosa Higiênica",
    };
    return map[String(s).toLowerCase()] || String(s);
  }

  function _labelStatus(s) {
    const l = {
      agendado: "Aguardando",
      checkin: "Em Atend.",
      pronto: "Pronto",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return l[s] || s;
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

    // Cliente atualizado/criado/removido → recarregar lista de pets
    const unsub1 = MobileSync.on("cliente-atualizado", () => {
      console.log("[Pets] Sincronizando: cliente-atualizado");
      refresh();
    });
    const unsub2 = MobileSync.on("cliente-criado", () => {
      console.log("[Pets] Sincronizando: cliente-criado");
      refresh();
    });
    const unsub3 = MobileSync.on("cliente-removido", () => {
      console.log("[Pets] Sincronizando: cliente-removido");
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
