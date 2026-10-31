/* ============================================================
   PetHub Mobile — Página: Dashboard
   Consome APIs existentes do sistema:
   - GET /api/dashboard/resumo
   - GET /api/dashboard/indicadores-atendimento
   - GET /api/dashboard/pets-no-estabelecimento  (novo endpoint)
   - GET /api/painel-financeiro/resumo
   Auto-refresh a cada 30 segundos.
   ============================================================ */

window.PageDashboard = (function () {
  "use strict";

  let _container = null;
  let _refreshTimer = null;
  let _isRefreshing = false;

  async function init(container) {
    console.log("[Dashboard] init() chamado");
    _isRefreshing = false; // Resetar flag para permitir carregamento
    _container = container;
    _render(container);
    console.log("[Dashboard] Chamando _loadData...");
    await _loadData(container);
    console.log("[Dashboard] _loadData concluído, iniciando auto-refresh");
    _startAutoRefresh(container);
  }

  function _render(container) {
    const user = MobileAuth.getUsuario();
    const primeiroNome = (user?.nome || "").split(" ")[0] || "Usuário";
    const hoje = _formatarData(new Date());

    container.innerHTML = `
      <div class="page-wrapper">

        <!-- Hero -->
        <div class="dashboard-hero">
          <div class="hero-greeting">Olá, ${escapeHtml(primeiroNome)} 👋</div>
          <div class="hero-title">Aqui está o resumo de hoje</div>
          <div class="hero-sub" id="dash-hoje">${hoje}</div>
        </div>

        <!-- Faturamento do Dia -->
        <div class="faturamento-card" id="fat-card">
          <div class="faturamento-label">💰 Faturamento do dia</div>
          <div class="faturamento-value" id="fat-dia">
            <div class="spinner"></div>
          </div>
          <div class="faturamento-row">
            <div class="faturamento-item">
              <div class="faturamento-item-label">Esta semana</div>
              <div class="faturamento-item-value" id="fat-semana">—</div>
            </div>
            <div class="faturamento-item">
              <div class="faturamento-item-label">Este mês</div>
              <div class="faturamento-item-value" id="fat-mes">—</div>
            </div>
            <div class="faturamento-item">
              <div class="faturamento-item-label">vs. ontem</div>
              <div class="faturamento-item-value" id="fat-comparativo">—</div>
            </div>
          </div>
        </div>

        <!-- Pets no Estabelecimento -->
        <div class="section-header">
          <span class="section-title">🐾 Pets agora</span>
          <button class="section-action" onclick="MobileRouter.navigate('pets')">Ver todos</button>
        </div>
        <div class="stat-grid-3" id="pets-stats" style="margin-bottom:20px">
          ${_statSkeleton(3)}
        </div>

        <!-- Agendamentos Hoje -->
        <div class="section-header">
          <span class="section-title">📅 Agendamentos</span>
          <button class="section-action" onclick="MobileRouter.navigate('agenda')">Ver agenda</button>
        </div>
        <div class="stat-grid" id="agend-stats" style="margin-bottom:20px">
          ${_statSkeleton(2)}
        </div>

        <!-- Próximos Agendamentos -->
        <div class="section-header">
          <span class="section-title">⏰ Próximos</span>
        </div>
        <div class="card" style="margin-bottom:20px">
          <div id="proximos-list">
            <div class="state-loading"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Métricas -->
        <div class="section-header">
          <span class="section-title">📊 Métricas</span>
        </div>
        <div class="stat-grid" id="metricas-stats" style="margin-bottom:20px">
          ${_statSkeleton(2)}
        </div>

      </div>
    `;
  }

  async function _loadData(container) {
    console.log("[Dashboard] _loadData() chamado, _isRefreshing:", _isRefreshing);
    if (_isRefreshing) {
      console.log("[Dashboard] Já está carregando, saindo...");
      return;
    }
    _isRefreshing = true;

    try {
      console.log("[Dashboard] Iniciando carregamento de dados...");
      console.log("[Dashboard] Container:", container);
      console.log("[Dashboard] _container:", _container);
      
      // Carregar tudo em paralelo para máxima performance
      const [resumo, indicadores, petsEstab, faturamento] =
        await Promise.allSettled([
          MobileApi.get("/api/dashboard/resumo").catch(err => {
            console.error("[Dashboard] Erro em /api/dashboard/resumo:", err);
            return { status: "rejected", reason: err };
          }),
          MobileApi.get("/api/dashboard/indicadores-atendimento").catch(err => {
            console.error("[Dashboard] Erro em /api/dashboard/indicadores-atendimento:", err);
            return { status: "rejected", reason: err };
          }),
          MobileApi.get("/api/dashboard/pets-no-estabelecimento").catch(err => {
            console.error("[Dashboard] Erro em /api/dashboard/pets-no-estabelecimento:", err);
            return { status: "rejected", reason: err };
          }),
          MobileApi.get("/api/dashboard/faturamento-periodos").catch(err => {
            console.error("[Dashboard] Erro em /api/dashboard/faturamento-periodos:", err);
            return { status: "rejected", reason: err };
          }),
        ]);

      console.log("[Dashboard] Resultado das APIs:", {
        resumo: resumo.status,
        indicadores: indicadores.status,
        petsEstab: petsEstab.status,
        faturamento: faturamento.status
      });

      if (!_container) {
        console.log("[Dashboard] _container é null, saindo...");
        return; // componente destruído durante o await
      }

      console.log("[Dashboard] Atualizando UI...");
      _atualizarFaturamento(container, resumo, faturamento);
      _atualizarPets(container, petsEstab, indicadores);
      _atualizarAgendamentos(container, resumo, indicadores);
      _atualizarProximos(container, indicadores);
      _atualizarMetricas(container, resumo);

      // Atualizar badges da nav
      const indData =
        indicadores.status === "fulfilled" ? indicadores.value : null;
      if (indData) {
        const totalAtivos =
          (indData.checkin || 0) +
          (indData.pronto || 0) +
          (indData.agendados || 0);
        MobileBottomNav.setBadge("agenda", totalAtivos || null);
        MobileBottomNav.setBadge(
          "pets",
          (indData.checkin || 0) + (indData.pronto || 0) || null,
        );
      }
      
      console.log("[Dashboard] Dados carregados com sucesso");
    } catch (err) {
      console.error("[Dashboard] Erro ao carregar dados:", err);
    } finally {
      _isRefreshing = false;
      console.log("[Dashboard] _isRefreshing definido como false");
    }
  }

  // Timeout de segurança: se após 5 segundos os dados não carregaram, forçar atualização
  setTimeout(() => {
    if (_container && _isRefreshing) {
      console.warn("[Dashboard] Timeout de 5s atingido, forçando atualização...");
      _isRefreshing = false;
      _loadData(_container);
    }
  }, 5000);

  function _atualizarFaturamento(container, resumoResult, faturamentoResult) {
    const elDia = container.querySelector("#fat-dia");
    const elSem = container.querySelector("#fat-semana");
    const elMes = container.querySelector("#fat-mes");
    const elComp = container.querySelector("#fat-comparativo");
    if (!elDia) return;

    try {
      const resumo =
        resumoResult.status === "fulfilled" ? resumoResult.value : null;
      const fat =
        faturamentoResult.status === "fulfilled" ? faturamentoResult.value : null;

      // Priorizar faturamento do novo endpoint (soma de vendas + agendamentos concluídos)
      // Fallback para resumo antigo
      const valDia = fat?.faturamentoHoje ?? resumo?.vendasTotal ?? 0;
      elDia.textContent = _formatarDinheiro(valDia);

      if (fat) {
        elSem.textContent = _formatarDinheiro(fat.faturamentoSemana || 0);
        elMes.textContent = _formatarDinheiro(fat.faturamentoMes || 0);
      }

      // Comparativo ontem (usar do novo endpoint)
      const ontem = fat?.faturamentoOntem ?? null;
      if (ontem !== null && ontem !== undefined && valDia > 0) {
        const diff = valDia - ontem;
        const pct = ontem > 0 ? ((diff / ontem) * 100).toFixed(0) : null;
        let html = "";
        if (diff > 0) {
          html = `<span class="comparativo up">▲ ${pct ? pct + "%" : _formatarDinheiro(diff)}</span>`;
        } else if (diff < 0) {
          html = `<span class="comparativo down">▼ ${pct ? Math.abs(pct) + "%" : _formatarDinheiro(Math.abs(diff))}</span>`;
        } else {
          html = `<span class="comparativo flat">= igual</span>`;
        }
        elComp.innerHTML = html;
      } else {
        elComp.textContent = "—";
      }
    } catch (e) {
      console.error("[Dashboard] Erro ao atualizar faturamento:", e);
      elDia.textContent = "R$ 0,00";
      elSem.textContent = "—";
      elMes.textContent = "—";
      elComp.textContent = "—";
    }
  }

  function _atualizarPets(container, petsEstabResult, indicadoresResult) {
    const el = container.querySelector("#pets-stats");
    if (!el) return;

    try {
      const pets =
        petsEstabResult.status === "fulfilled" ? petsEstabResult.value : null;
      const ind =
        indicadoresResult.status === "fulfilled" ? indicadoresResult.value : null;

      const checkin = pets?.checkin ?? ind?.checkin ?? 0;
      const pronto = pets?.pronto ?? ind?.pronto ?? 0;
      const concluido = pets?.concluido ?? ind?.concluido ?? 0;

      el.innerHTML = `
        <div class="stat-card orange">
          <div class="stat-icon">🛁</div>
          <div class="stat-value">${checkin}</div>
          <div class="stat-label">Em atend.</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${pronto}</div>
          <div class="stat-label">Prontos</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">🏠</div>
          <div class="stat-value">${concluido}</div>
          <div class="stat-label">Entregues</div>
        </div>
      `;
    } catch (e) {
      console.error("[Dashboard] Erro ao atualizar pets:", e);
      el.innerHTML = `
        <div class="stat-card orange">
          <div class="stat-icon">🛁</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Em atend.</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">✅</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Prontos</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">🏠</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Entregues</div>
        </div>
      `;
    }
  }

  function _atualizarAgendamentos(container, resumoResult, indicadoresResult) {
    const el = container.querySelector("#agend-stats");
    if (!el) return;

    try {
      const resumo =
        resumoResult.status === "fulfilled" ? resumoResult.value : null;
      const ind =
        indicadoresResult.status === "fulfilled" ? indicadoresResult.value : null;

      const total =
        resumo?.agendamentosHoje ??
        ind?.total ??
        (ind ? ind.agendados + ind.checkin + ind.pronto + ind.concluido : 0);
      const agendados = ind?.agendados ?? 0;

      el.innerHTML = `
        <div class="stat-card blue">
          <div class="stat-icon">📅</div>
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total hoje</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">${agendados}</div>
          <div class="stat-label">Aguardando</div>
        </div>
      `;
    } catch (e) {
      console.error("[Dashboard] Erro ao atualizar agendamentos:", e);
      el.innerHTML = `
        <div class="stat-card blue">
          <div class="stat-icon">📅</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Total hoje</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Aguardando</div>
        </div>
      `;
    }
  }

  async function _atualizarProximos(container, indicadoresResult) {
    const el = container.querySelector("#proximos-list");
    if (!el) return;

    try {
      const hoje = new Date().toISOString().split("T")[0];
      const data = await MobileApi.get("/api/agendamentos", {
        data: hoje,
        status: "agendado",
        limite: 5,
      });

      const lista = Array.isArray(data)
        ? data
        : data?.agendamentos || data?.data || [];

      if (!lista.length) {
        el.innerHTML = `<div class="state-empty" style="padding:20px">
          <div class="state-icon">📭</div>
          <div class="state-sub">Nenhum agendamento pendente</div>
        </div>`;
        return;
      }

      el.innerHTML = lista
        .slice(0, 5)
        .map((ag) => {
          const hora = _formatarHora(ag.horario || ag.horaInicio);
          const petNome = ag.pet?.nome || ag.nomePet || "Pet";
          const servico = _nomeServico(
            ag.servico || ag.tipoServico || ag.nomeServico,
          );
          const cliente = ag.cliente?.nome || ag.nomeCliente || "";

          return `
          <div class="agenda-item">
            <div class="agenda-time">
              <span class="agenda-time-main">${hora}</span>
            </div>
            <div class="agenda-item-body">
              <div class="agenda-pet-name">${escapeHtml(petNome)}</div>
              <div class="agenda-service">${escapeHtml(servico)}</div>
              ${cliente ? `<div class="agenda-client">👤 ${escapeHtml(cliente)}</div>` : ""}
            </div>
            <div class="list-item-right">
              <span class="status-badge status-agendado">Ag.</span>
            </div>
          </div>
        `;
        })
        .join("");
    } catch (err) {
      el.innerHTML = `<div class="state-error" style="padding:20px">
        <div class="state-sub">Erro ao carregar agendamentos</div>
      </div>`;
    }
  }

  function _atualizarMetricas(container, resumoResult) {
    const el = container.querySelector("#metricas-stats");
    if (!el) return;

    try {
      const resumo =
        resumoResult.status === "fulfilled" ? resumoResult.value : null;

      const clientes = resumo?.clientes ?? "—";
      const ticketMed =
        resumo?.ticketMedio != null
          ? resumo.ticketMedio
          : resumo?.vendasTotal && resumo?.vendasHoje
            ? (resumo.vendasTotal / resumo.vendasHoje).toFixed(2)
            : null;

      el.innerHTML = `
        <div class="stat-card blue">
          <div class="stat-icon">👥</div>
          <div class="stat-value">${clientes}</div>
          <div class="stat-label">Clientes ativos</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">${ticketMed ? _formatarDinheiro(ticketMed) : "—"}</div>
          <div class="stat-label">Ticket médio</div>
        </div>
      `;
    } catch (e) {
      console.error("[Dashboard] Erro ao atualizar métricas:", e);
      el.innerHTML = `
        <div class="stat-card blue">
          <div class="stat-icon">👥</div>
          <div class="stat-value">0</div>
          <div class="stat-label">Clientes ativos</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">R$ 0,00</div>
          <div class="stat-label">Ticket médio</div>
        </div>
      `;
    }
  }

  function _startAutoRefresh(container) {
    _stopAutoRefresh();
    _refreshTimer = setInterval(() => _loadData(container), 30_000);
  }

  function _stopAutoRefresh() {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  }

  function refresh() {
    if (_container) _loadData(_container);
  }

  function destroy() {
    _stopAutoRefresh();
    _container = null;
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _statSkeleton(n) {
    return Array(n)
      .fill(0)
      .map(
        () => `
      <div class="stat-card" style="min-height:80px">
        <div class="spinner" style="width:18px;height:18px;border-width:2px;margin:auto"></div>
      </div>
    `,
      )
      .join("");
  }

  function _formatarDinheiro(valor) {
    const n = parseFloat(valor) || 0;
    return (
      "R$ " +
      n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function _formatarHora(horario) {
    if (!horario) return "--:--";
    const m = String(horario).match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : String(horario).substring(0, 5);
  }

  function _formatarData(date) {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function _nomeServico(servico) {
    if (!servico) return "Serviço";
    if (typeof servico === "object")
      return servico.nome || servico.name || "Serviço";
    return String(servico);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return { init, refresh, destroy };
})();
