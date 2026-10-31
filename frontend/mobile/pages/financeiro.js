/* ============================================================
   PetHub Mobile — Página: Financeiro
   Consome: GET /api/painel-financeiro/resumo
            GET /api/dashboard/resumo (complementar)
   ============================================================ */

window.PageFinanceiro = (function () {
  "use strict";

  let _container = null;
  let _refreshTimer = null;

  async function init(container) {
    _container = container;
    _renderShell(container);
    await _carregarDados(container);
    _startAutoRefresh(container);
  }

  function _renderShell(container) {
    container.innerHTML = `
      <div class="page-wrapper" style="padding-top:12px">

        <div class="section-header" style="margin-bottom:16px">
          <span class="section-title">💰 Financeiro</span>
          <span id="fin-ultima-atualizacao" style="font-size:11px;color:var(--muted)"></span>
        </div>

        <!-- Faturamento do Ano -->
        <div class="faturamento-card" id="fin-fat-card">
          <div class="faturamento-label">💰 Faturamento do ano</div>
          <div id="fin-fat-dia" style="font-family:'Poppins',sans-serif;font-size:36px;font-weight:800;color:var(--green);line-height:1;margin-bottom:8px">
            <div class="spinner"></div>
          </div>
          <p style="font-size:12px;color:var(--muted)">Até o momento</p>
          <div class="faturamento-row" style="margin-top:12px">
            <div class="faturamento-item">
              <div class="faturamento-item-label">Semana</div>
              <div class="faturamento-item-value" id="fin-fat-semana">—</div>
            </div>
            <div class="faturamento-item">
              <div class="faturamento-item-label">Mês</div>
              <div class="faturamento-item-value" id="fin-fat-mes">—</div>
            </div>
          </div>
        </div>

        <!-- Grid de métricas -->
        <div class="section-header" style="margin-bottom:12px">
          <span class="section-title">📊 Resumo do dia</span>
        </div>
        <div class="stat-grid" id="fin-metricas" style="margin-bottom:20px">
          ${_skeleton(2)}
        </div>

        <!-- A Receber -->
        <div class="section-header" style="margin-bottom:12px">
          <span class="section-title">📥 A Receber</span>
        </div>
        <div class="stat-grid" id="fin-receber" style="margin-bottom:20px">
          ${_skeleton(2)}
        </div>

        <!-- Últimas Vendas -->
        <div class="section-header" style="margin-bottom:12px">
          <span class="section-title">🛒 Últimas movimentações</span>
        </div>
        <div class="card" id="fin-vendas">
          <div class="state-loading"><div class="spinner"></div></div>
        </div>

      </div>
    `;
  }

  async function _carregarDados(container) {
    try {
      const [finResult, resumoResult, fatPeriodosResult, contasPeriodoResult] = await Promise.allSettled([
        MobileApi.get("/api/painel-financeiro/resumo"),
        MobileApi.get("/api/dashboard/resumo"),
        MobileApi.get("/api/dashboard/faturamento-periodos"),
        MobileApi.get("/api/contas-receber/resumo/periodo"),
      ]);

      if (!_container) return;

      const fin = finResult.status === "fulfilled" ? finResult.value : null;
      const resumo =
        resumoResult.status === "fulfilled" ? resumoResult.value : null;
      const fatPeriodos =
        fatPeriodosResult.status === "fulfilled" ? fatPeriodosResult.value : null;
      const contasPeriodo =
        contasPeriodoResult.status === "fulfilled" ? contasPeriodoResult.value : null;

      // Atualizar timestamp
      const tsEl = container.querySelector("#fin-ultima-atualizacao");
      if (tsEl)
        tsEl.textContent =
          "Atualizado " +
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });

      // Faturamento principal: usar faturamentoAno do endpoint de períodos
      const valAno = fatPeriodos?.faturamentoAno ?? 0;
      // Fallback: se não tiver faturamentoAno, usa o faturamento do dia
      const fatAno = valAno || resumo?.vendasTotal || fin?.hoje?.recebido || 0;
      const fatSem = fatPeriodos?.faturamentoSemana || fin?.semana?.recebido || fin?.essaSemana?.total || 0;
      const fatMes = fatPeriodos?.faturamentoMes || fin?.mes?.recebido || fin?.esseMes?.total || 0;

      const elDia = container.querySelector("#fin-fat-dia");
      if (elDia) elDia.textContent = _fmt(fatAno);
      const elSem = container.querySelector("#fin-fat-semana");
      if (elSem) elSem.textContent = _fmt(fatSem);
      const elMes = container.querySelector("#fin-fat-mes");
      if (elMes) elMes.textContent = _fmt(fatMes);

      // Métricas do dia
      const metEl = container.querySelector("#fin-metricas");
      if (metEl) {
        const numVendas = resumo?.vendasHoje || 0;
        const faturamentoHoje = fatPeriodos?.faturamentoHoje || resumo?.vendasTotal || 0;
        const ticketMedio = numVendas > 0 ? faturamentoHoje / numVendas : 0;
        metEl.innerHTML = `
          <div class="stat-card blue">
            <div class="stat-icon">🛒</div>
            <div class="stat-value">${numVendas}</div>
            <div class="stat-label">Vendas hoje</div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon">🎯</div>
            <div class="stat-value">${_fmt(ticketMedio)}</div>
            <div class="stat-label">Ticket médio</div>
          </div>
        `;
      }

      // A Receber
      const recEl = container.querySelector("#fin-receber");
      if (recEl) {
        // A API /api/painel-financeiro/resumo retorna { receber: { hoje, essaSemana, esseMes, ... }, pagar: {...} }
        // O endpoint /api/contas-receber/resumo/periodo retorna { hoje, essaSemana, ... } específico de contas_receber
        // NOTA: NÃO somar os dois, pois ambos já incluem contas_receber. Usar apenas contasPeriodo que é mais específico
        const receberHoje = contasPeriodo?.hoje || 0;
        const receberMes = contasPeriodo?.esseMes || 0;
        recEl.innerHTML = `
          <div class="stat-card orange">
            <div class="stat-icon">📅</div>
            <div class="stat-value">${_fmt(receberHoje)}</div>
            <div class="stat-label">Vence hoje</div>
          </div>
          <div class="stat-card blue">
            <div class="stat-icon">📆</div>
            <div class="stat-value">${_fmt(receberMes)}</div>
            <div class="stat-label">No mês</div>
          </div>
        `;
      }

      // Últimas movimentações
      await _carregarUltimasMovimentacoes(container);
    } catch (err) {
      console.error("[Financeiro] Erro:", err);
    }
  }

  async function _carregarUltimasMovimentacoes(container) {
    const el = container.querySelector("#fin-vendas");
    if (!el) return;

    try {
      const hoje = new Date().toISOString().split("T")[0];
      const data = await MobileApi.get("/api/vendas", {
        dataInicio: hoje,
        dataFim: hoje,
        limite: 10,
      });

      const lista = Array.isArray(data)
        ? data
        : data?.vendas || data?.data || [];

      if (!lista.length) {
        el.innerHTML = `<div class="state-empty" style="padding:20px">
          <div class="state-icon">📭</div>
          <div class="state-sub">Nenhuma venda hoje</div>
        </div>`;
        return;
      }

      el.innerHTML = lista
        .slice(0, 8)
        .map((v) => {
          const cliente =
            v.cliente?.nome || v.nomeCliente || v.Cliente?.nome || "Cliente";
          const valor = _extrairTotal(v);
          const dataObj = v.data || v.createdAt ? new Date(v.data || v.createdAt) : null;
          const dataFormatada = dataObj
            ? dataObj.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
            : "";
          const hora = dataObj
            ? dataObj.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--";
          const status = v.status || "pago";

          const statusClass =
            status === "pago"
              ? "pronto"
              : status === "cancelado"
                ? "cancelado"
                : "checkin";

          return `
          <div class="list-item">
            <div class="list-item-avatar" style="background:var(--green-glow)">
              <span style="font-size:18px">💳</span>
            </div>
            <div class="list-item-info">
              <div class="list-item-title">${escapeHtml(cliente)}</div>
              <div class="list-item-sub">${dataFormatada} ${hora}</div>
            </div>
            <div class="list-item-right">
              <div style="font-weight:700;font-size:14px;color:var(--green)">${_fmt(valor)}</div>
              <span class="status-badge status-${statusClass}" style="font-size:9px">${_labelStatus(status)}</span>
            </div>
          </div>
        `;
        })
        .join("");
    } catch (err) {
      el.innerHTML = `<div class="state-error" style="padding:20px">
        <div class="state-sub">Erro ao carregar movimentações</div>
      </div>`;
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
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _fmt(valor) {
    const n = parseFloat(valor) || 0;
    return (
      "R$ " +
      n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function _extrairTotal(venda) {
    if (!venda) return 0;
    try {
      const t = venda.totais;
      if (!t) return venda.total || venda.valorTotal || 0;
      const obj = typeof t === "string" ? JSON.parse(t) : t;
      return obj.final || obj.totalFinal || obj.total || 0;
    } catch (_) {
      return venda.total || venda.valorTotal || 0;
    }
  }

  function _skeleton(n) {
    return Array(n)
      .fill(0)
      .map(
        () =>
          `<div class="stat-card" style="min-height:80px"><div class="spinner" style="width:16px;height:16px;border-width:2px;margin:auto"></div></div>`,
      )
      .join("");
  }

  function _labelStatus(s) {
    const l = {
      pago: "Pago",
      pendente: "Pendente",
      parcial: "Parcial",
      cancelado: "Cancelado",
    };
    return l[s] || s;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return { init, refresh, destroy };
})();
