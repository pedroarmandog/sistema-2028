import "@fontsource-variable/manrope";
import "./style.css";
import "./admin.css";
import { esc, icon, modal, toast, startTheme, theme } from "./ui.js";
import { BASE } from "./api.js";
startTheme();
let session = null,
  csrf = "",
  current = "overview",
  sequence = 0;
const app = document.getElementById("app");
const sections = [
  ["overview", "Visão geral", "home"],
  ["participants", "Participantes", "user"],
  ["posts", "Publicações", "photo"],
  ["reports", "Denúncias", "flag"],
  ["groups", "Comunidades", "paw"],
  ["events", "Eventos", "calendar"],
  ["moderation", "Moderação", "lock"],
  ["stats", "Estatísticas", "explore"],
  ["settings", "Configurações", "settings"],
];
const allowed = () =>
  sections.filter(
    ([id]) =>
      session?.role === "admin" ||
      !["participants", "stats", "settings"].includes(id),
  );
async function request(path, { method = "GET", body } = {}) {
  const r = await fetch(BASE + "/api/comunidade-admin" + path, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-Community-CSRF": csrf } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => ({ erro: "Resposta indisponível." }));
  if (!r.ok)
    throw Object.assign(Error(data.erro || "Não foi possível concluir."), {
      status: r.status,
    });
  return data;
}
const when = (v) =>
  v
    ? new Date(v).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sem atividade";
const status = (s) =>
  `<span class="status-pill ${esc(s)}">${{ active: "Ativa", suspended: "Suspensa", blocked: "Bloqueada", deleted: "Excluída", open: "Pendente", reviewing: "Em análise", resolved: "Resolvida", rejected: "Sem violação", hidden: "Oculto", removed: "Removido", cancelled: "Cancelado" }[s] || esc(s)}</span>`;
const field = (label, name, type = "text", value = "", extra = "") =>
  `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
function login(error = "") {
  session = null;
  csrf = "";
  app.innerHTML = `<main class="admin-entry"><aside><span class="brand-mark">${icon("lamp", 32)}</span><p class="eyebrow">PETHUB COMUNIDADE</p><h1>Um lugar de boas histórias.<br>Uma operação de confiança.</h1><p>Administração privada para acompanhar o crescimento e cuidar da nossa comunidade.</p></aside><form class="admin-login"><p class="eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p><h2>Que bom ter você por aqui.</h2><p class="muted">Use sua conta administrativa autorizada. Contas públicas da Comunidade não têm acesso ao painel.</p>${field("E-mail", "email", "email", "", 'required autocomplete="username"')}${field("Senha", "senha", "password", "", 'required autocomplete="current-password"')}<button class="primary">Entrar no painel ${icon("arrow", 17)}</button><p class="form-error" role="alert">${esc(error)}</p><a class="text-button" href="./">Voltar ao aplicativo público</a></form></main>`;
  app.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const result = await request("/login", {
        method: "POST",
        body: Object.fromEntries(new FormData(e.target)),
      });
      csrf = result.csrf;
      session = await request("/session");
      csrf = session.csrf;
      render();
    } catch (err) {
      e.target.querySelector(".form-error").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}
function render() {
  app.innerHTML = `<div class="ops-shell"><aside class="ops-rail"><a href="#overview" class="brand"><span class="brand-mark">${icon("lamp")}</span><span>PetHub<small>COMUNIDADE ADMIN</small></span></a><p class="rail-label">CENTRAL DE OPERAÇÃO</p><nav>${allowed()
    .map(
      ([id, label, i]) =>
        `<button data-section="${id}" class="${current === id ? "active" : ""}">${icon(i, 19)} ${label}</button>`,
    )
    .join(
      "",
    )}</nav><div class="ops-rail-bottom"><small>${session.role === "admin" ? "Administrador geral" : "Moderador"} · ${esc(session.name)}</small><button class="text-button" id="logout">${icon("logout", 17)} Sair do painel</button></div></aside><div class="ops-main"><header class="ops-header"><div><p class="eyebrow">CUIDAR DAS CONEXÕES É CUIDAR DA COMUNIDADE</p><h1>${sections.find((s) => s[0] === current)?.[1] || "Visão geral"}</h1></div><div><button class="icon-btn" id="refresh" aria-label="Atualizar indicadores">${icon("arrow")}</button><button class="icon-btn" id="theme-toggle" aria-label="Alternar tema">${icon("moon")}</button><span class="admin-avatar">${esc(session.name?.slice(0, 1) || "P")}</span></div></header><main id="ops-content"><div class="skeleton"></div></main><footer class="ops-footer">PetHub Comunidade · Dados reais da plataforma · Horários de Brasília</footer></div></div>`;
  app.querySelectorAll("[data-section]").forEach(
    (b) =>
      (b.onclick = () => {
        current = b.dataset.section;
        location.hash = current;
        render();
      }),
  );
  app.querySelector("#logout").onclick = async () => {
    try {
      await request("/logout", { method: "POST" });
      login();
    } catch (e) {
      toast(e.message);
    }
  };
  app.querySelector("#refresh").onclick = load;
  app.querySelector("#theme-toggle").onclick = () =>
    theme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  load();
}
async function load() {
  const seq = ++sequence,
    box = app.querySelector("#ops-content");
  box.innerHTML = '<div class="skeleton"></div>';
  try {
    if (current === "overview") await overview(box);
    else if (current === "participants") await participants(box);
    else if (current === "reports") await reports(box);
    else if (["posts", "groups", "events"].includes(current))
      await contents(
        box,
        { posts: "post", groups: "group", events: "event" }[current],
      );
    else if (current === "stats") await statistics(box);
    else if (current === "moderation") await moderation(box);
    else if (current === "settings") await settings(box);
  } catch (e) {
    if (seq !== sequence) return;
    if (e.status === 401) {
      login("Sua sessão expirou. Entre novamente.");
      return;
    }
    box.innerHTML = `<section class="surface ops-empty"><h2>Vamos tentar novamente?</h2><p>${esc(e.message)}</p><button class="secondary" id="retry-load">Tentar novamente</button></section>`;
    box.querySelector("button").onclick = load;
  }
}
function metric(label, value, name, note = "") {
  return `<article class="metric-card"><span>${icon(name, 20)}</span><p>${label}</p><strong>${Number(value || 0).toLocaleString("pt-BR")}</strong>${note ? `<small>${note}</small>` : ""}</article>`;
}
function chart(container, series, keys) {
  const max = Math.max(
      1,
      ...series.flatMap((r) => keys.map((k) => Number(r[k.id] || 0))),
    ),
    width = 700,
    height = 230,
    pad = 30,
    step = (width - pad * 2) / Math.max(1, series.length - 1),
    colors = ["#E79A28", "#458C8A", "#8C7CBA", "#D47A74"];
  container.innerHTML = `<svg class="ops-chart" viewBox="0 0 ${width} ${height + 35}" role="img" aria-label="Gráfico de ${keys.map((k) => k.label).join(" e ")}"><g class="chart-grid">${[0, 0.25, 0.5, 0.75, 1].map((n) => `<line x1="${pad}" y1="${height - pad - n * (height - pad * 2)}" x2="${width - pad}" y2="${height - pad - n * (height - pad * 2)}"/><text x="2" y="${height - pad - n * (height - pad * 2) + 4}">${Math.round(max * n)}</text>`).join("")}</g>${keys
    .map(
      (key, index) =>
        `<g data-series="${key.id}"><polyline points="${series.map((r, i) => `${pad + i * step},${height - pad - ((r[key.id] || 0) / max) * (height - pad * 2)}`).join(" ")}" fill="none" stroke="${colors[index]}" stroke-width="3" stroke-linejoin="round"/>${series
          .filter((_, i) => series.length <= 31 || i % 7 === 0)
          .map((r) => {
            const i = series.indexOf(r);
            return `<circle cx="${pad + i * step}" cy="${height - pad - ((r[key.id] || 0) / max) * (height - pad * 2)}" r="4" fill="${colors[index]}" tabindex="0"><title>${r.day}: ${key.label} — ${r[key.id] || 0}</title></circle>`;
          })
          .join("")}</g>`,
    )
    .join("")}${series
    .filter(
      (_, i) =>
        i === 0 ||
        i === Math.floor(series.length / 2) ||
        i === series.length - 1,
    )
    .map(
      (r) =>
        `<text x="${pad + series.indexOf(r) * step}" y="${height + 5}" text-anchor="middle">${r.day.slice(5).split("-").reverse().join("/")}</text>`,
    )
    .join(
      "",
    )}</svg><div class="chart-legend">${keys.map((k, i) => `<button data-legend="${k.id}" style="--line-color:${colors[i]}"><i></i>${k.label}</button>`).join("")}</div><details class="chart-data"><summary>Ver tabela de dados</summary><div class="table-scroll"><table><thead><tr><th>Dia</th>${keys.map((k) => `<th>${k.label}</th>`).join("")}</tr></thead><tbody>${series.map((r) => `<tr><td>${r.day}</td>${keys.map((k) => `<td>${r[k.id] || 0}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
  container.querySelectorAll("[data-legend]").forEach(
    (b) =>
      (b.onclick = () => {
        const line = container.querySelector(
          `[data-series="${b.dataset.legend}"]`,
        );
        line.style.display = line.style.display === "none" ? "" : "none";
        b.classList.toggle("muted-line");
      }),
  );
}
async function overview(box) {
  const [data, stats] = await Promise.all([
    request("/overview"),
    session.role === "admin" ? request("/stats?days=7") : Promise.resolve(null),
  ]);
  if (!box.isConnected) return;
  box.innerHTML = `<div class="ops-intro"><div><span class="online-dot"></span> Uma visão clara de quem está construindo essa história.</div><small>Atualizado: ${when(data.generatedAt)}</small></div><section class="metric-grid">${metric("Pessoas na Comunidade", data.users, "user", "Contas criadas")}${metric("Ativos nos últimos 7 dias", data.active7, "explore", "Contas únicas com atividade")}${metric("Novos cadastros hoje", data.todayUsers, "plus", "Desde 00h em Brasília")}${metric("Denúncias a analisar", data.reports, "flag", "Pendentes e em análise")}</section><div class="ops-two-col"><section class="surface chart-card"><div class="ops-card-heading"><div><p class="eyebrow">CRESCIMENTO DA COMUNIDADE</p><h2>Novas histórias começam aqui.</h2></div><span>Últimos 7 dias</span></div><div id="overview-chart"></div></section><section class="surface verification-card"><p class="eyebrow">CONTAS VERIFICADAS</p><h2>Conexões com mais confiança.</h2><div class="verification-ring" style="--verified:${data.users ? Math.round((data.verified / data.users) * 100) : 0}%"><div><strong>${data.verified}</strong><small>E-mails confirmados</small></div></div><div class="ring-caption"><span>${data.unverified} pendentes</span><span>${data.suspended} suspensas</span></div></section></div><section class="surface ops-summary"><div><p class="eyebrow">ALÉM DOS PRIMEIROS NÚMEROS</p><h2>A Comunidade em movimento.</h2></div><div class="summary-grid">${[
    ["Ativos em 30 dias", data.active30],
    ["Cadastros no mês", data.monthUsers],
    ["Cadastros em 7 dias", data.weekUsers],
    ["Pets cadastrados", data.pets],
    ["Publicações ativas", data.posts],
    ["Publicações criadas (total)", data.postsTotal],
    ["Ativos 30 dias / cadastros", (data.active30Ratio || 0) + "%"],
    ["Publicações hoje", data.postsToday],
    ["Comentários hoje", data.commentsToday],
    ["Momentos publicados", data.moments],
    ["Comunidades ativas", data.groups],
    ["Eventos ativos", data.events],
    ["Contas bloqueadas", data.blocked],
  ]
    .map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`)
    .join(
      "",
    )}</div></section><p class="ops-definition">${esc(data.activityDefinition)}</p>`;
  if (stats)
    chart(box.querySelector("#overview-chart"), stats.series, [
      { id: "users", label: "Novos cadastros" },
      { id: "active", label: "Usuários ativos" },
    ]);
  else
    box.querySelector("#overview-chart").innerHTML =
      '<p class="muted">Gráficos detalhados são exclusivos do administrador geral.</p>';
}
function table(headers, rows) {
  return `<div class="table-scroll"><table><thead><tr>${headers.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${headers.length}" class="no-results">Nenhum registro encontrado com esses filtros.</td></tr>`}</tbody></table></div>`;
}
function filterForm(fields) {
  return `<form class="ops-filters">${fields}<button class="primary">Filtrar ${icon("search", 16)}</button><button type="reset" class="secondary">Limpar</button></form>`;
}
function select(label, name, items) {
  return `<label>${label}<select name="${name}">${items.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select></label>`;
}
function pager(box, endpoint, draw) {
  const form = box.querySelector("form"),
    target = box.querySelector(".ops-results"),
    more = box.querySelector(".load-more");
  let items = [],
    next = null,
    busy = false;
  async function load(append = false) {
    if (busy) return;
    busy = true;
    more.disabled = true;
    try {
      const query = new URLSearchParams(Object.fromEntries(new FormData(form)));
      if (append && next) query.set("after", next);
      const result = await request(endpoint + "?" + query);
      if (!box.isConnected) return;
      items = append ? [...items, ...result.items] : result.items;
      next = result.next;
      more.hidden = !next;
      draw(target, items);
    } catch (e) {
      toast(e.message);
    } finally {
      busy = false;
      more.disabled = false;
    }
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    load();
  };
  form.onreset = () => setTimeout(() => load(), 0);
  more.onclick = () => load(true);
  load();
  return load;
}
async function participants(box) {
  box.innerHTML = `<section class="surface ops-panel"><div class="ops-card-heading"><h2>Quem faz parte da Comunidade</h2><span>Todas as contas, com ou sem pet</span></div>${filterForm(
    field("Buscar", "q", "search", "", 'placeholder="Nome, @ ou e-mail"') +
      select("Status", "status", [
        ["", "Todos"],
        ["active", "Ativa"],
        ["suspended", "Suspensa"],
        ["blocked", "Bloqueada"],
        ["deleted", "Excluída"],
      ]) +
      select("E-mail", "verified", [
        ["", "Todos"],
        ["yes", "Verificado"],
        ["no", "Pendente"],
      ]) +
      select("Atividade", "activity", [
        ["", "Todas"],
        ["active", "Ativos em 7 dias"],
        ["inactive", "Sem atividade em 7 dias"],
      ]) +
      field("De", "from", "date") +
      field("Até", "to", "date"),
  )}<div class="ops-results"></div><button class="load-more" hidden>Mais participantes</button></section>`;
  pager(box, "/participants", (target, rows) => {
    target.innerHTML = table(
      [
        "Participante",
        "E-mail",
        "Status",
        "Cadastro",
        "Última atividade",
        "Pets / posts",
        "Denúncias",
        "",
      ],
      rows.map(
        (u) =>
          `<tr><td><div class="table-person">${u.profile?.avatar ? `<img src="${BASE + u.profile.avatar}" alt="">` : `<span>${icon("user", 18)}</span>`}<div><strong>${esc(u.profile?.name || "Conta anterior")}</strong><small>@${esc(u.profile?.handle || "—")}</small></div></div></td><td>${esc(u.email || "Atualização pendente")}<small>${u.verified ? "Verificado" : "Não verificado"}</small></td><td>${status(u.state)}</td><td>${when(u.createdAt)}</td><td>${when(u.lastActiveAt)}</td><td>${u.pets} / ${u.posts}</td><td>${u.reports}</td><td><button class="row-action" data-user="${u.id}">Detalhes ${icon("arrow", 15)}</button></td></tr>`,
      ),
    );
    target
      .querySelectorAll("[data-user]")
      .forEach((b) => (b.onclick = () => participantDetail(b.dataset.user)));
  });
}
async function participantDetail(id) {
  try {
    const u = await request("/participants/" + id),
      dlg = modal(
        `<p class="eyebrow">PARTICIPANTE · ${esc(id)}</p><h2>${esc(u.profiles.find((p) => p.kind === "tutor")?.name || "Conta anterior")}</h2><p>${esc(u.email || "Sem e-mail público confirmado")} · ${status(u.state)}</p><div class="detail-facts"><p>Cadastro: ${when(u.createdAt)}</p><p>Última atividade: ${when(u.lastActiveAt)}</p><p>E-mail ${u.verified ? "verificado" : "pendente"}</p></div><h3>Perfis</h3>${u.profiles.map((p) => `<a class="profile-detail-link" href="./#/p/${p.id}" target="_blank" rel="noopener">${esc(p.name)} · @${esc(p.handle)} ${icon("arrow", 14)}</a>`).join("")}<h3>Publicações públicas recentes</h3>${u.posts.map((p) => `<p class="detail-post">${esc(p.text || "Publicação em fotos")} ${status(p.state)}</p>`).join("") || '<p class="muted">Nenhuma publicação pública.</p>'}<h3>Histórico de sanções</h3>${u.sanctions.map((x) => `<p class="audit-item"><strong>${esc(x.action)}</strong> · ${when(x.createdAt)}<br>${esc(x.reason)}<small>Administrador ${esc(x.admin_id)}</small></p>`).join("") || '<p class="muted">Nenhuma sanção.</p>'}<h3>Denúncias relacionadas: ${u.reports.length}</h3>${u.reports.map((r) => `<button class="row-action" data-report="${r.id}">${esc(r.reason.slice(0, 80))} ${status(r.state)}</button>`).join("")}<div class="detail-actions">${u.state !== "deleted" ? '<button class="secondary" data-action="warn">Advertir</button><button class="secondary" data-action="suspend">Suspender</button><button class="secondary" data-action="reactivate">Reativar</button><button class="secondary danger" data-action="block">Bloquear</button><button class="secondary danger" data-action="erasure">Iniciar exclusão</button>' : ""}</div>`,
        { className: "ops-detail" },
      );
    dlg
      .querySelectorAll("[data-report]")
      .forEach((b) => (b.onclick = () => reportDetail(b.dataset.report)));
    dlg.querySelectorAll("[data-action]").forEach(
      (b) =>
        (b.onclick = () =>
          sanctionDialog(id, b.dataset.action, () => {
            dlg.close();
            load();
          })),
    );
  } catch (e) {
    toast(e.message);
  }
}
function sanctionDialog(id, action, done) {
  const labels = {
      warn: "Advertir conta",
      suspend: "Suspender temporariamente",
      reactivate: "Reativar conta",
      block: "Bloquear conta",
      erasure: "Iniciar exclusão",
    },
    dlg = modal(
      `<h2>${labels[action]}</h2><p>Essa decisão será registrada com seu ID, data e motivo. Suspensão, bloqueio e exclusão encerram as sessões da conta. A exclusão física segue o processo de retenção.</p><form><label>Justificativa<textarea name="reason" required maxlength="1000"></textarea></label>${action === "suspend" ? field("Suspensa até", "until", "datetime-local", "", "required") : ""}<button class="primary ${["block", "erasure"].includes(action) ? "danger" : ""}">Confirmar decisão</button><p class="form-error" role="alert"></p></form>`,
    );
  dlg.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const body = { ...Object.fromEntries(new FormData(e.target)), action };
      if (body.until) body.until = new Date(body.until).toISOString();
      await request("/participants/" + id + "/action", {
        method: "POST",
        body,
      });
      dlg.close();
      done();
      toast("Decisão registrada.");
    } catch (err) {
      e.target.querySelector(".form-error").textContent = err.message;
      b.disabled = false;
    }
  };
}
async function reports(box) {
  box.innerHTML = `<section class="surface ops-panel"><div class="ops-card-heading"><h2>Cuidando das boas conexões</h2><span>Fila de denúncias e decisões</span></div>${filterForm(
    select("Estado", "status", [
      ["", "Pendentes e em análise"],
      ["open", "Pendente"],
      ["reviewing", "Em análise"],
      ["resolved", "Resolvida"],
      ["rejected", "Sem violação"],
    ]) +
      select("Tipo", "kind", [
        ["", "Todos"],
        ["post", "Publicação / Momento"],
        ["comment", "Comentário"],
        ["profile", "Perfil"],
        ["group", "Comunidade"],
        ["event", "Evento"],
      ]),
  )}<div class="ops-results"></div><button class="load-more" hidden>Mais denúncias</button></section>`;
  pager(box, "/reports", (target, rows) => {
    target.innerHTML = table(
      ["Registro", "Tipo / estado", "Motivo", "Envolvidos", "Recebida", ""],
      rows.map(
        (r) =>
          `<tr><td><small>${esc(r.id.slice(0, 8))}</small><span class="priority-pill">${esc(r.priority)}</span></td><td>${esc(r.kind)}<br>${status(r.state)}</td><td class="reason-cell">${esc(r.reason)}</td><td><small>Relator: ${esc(r.reporterId?.slice(0, 8))}</small><small>Conta: ${esc(r.targetUser?.slice(0, 8) || "—")}</small></td><td>${when(r.createdAt)}</td><td><button class="row-action" data-report="${r.id}">Analisar ${icon("arrow", 15)}</button></td></tr>`,
      ),
    );
    target
      .querySelectorAll("[data-report]")
      .forEach((b) => (b.onclick = () => reportDetail(b.dataset.report)));
  });
}
async function reportDetail(id) {
  try {
    const r = await request("/reports/" + id),
      content = r.content || {},
      dlg = modal(
        `<p class="eyebrow">DENÚNCIA · ${esc(r.kind)}</p><h2>Analisar com atenção. Decidir com clareza.</h2><p>${esc(r.reason)}</p><p class="muted">Relator: ${esc(r.reporterId)}<br>Conta responsável: ${esc(r.targetUser || "indisponível")}</p><section class="reported-content"><strong>${esc(content.name)}</strong><p>${esc(content.text)}</p>${(content.media || []).map((id) => `<img src="${BASE}/api/comunidade-admin/media/${id}" alt="Conteúdo preservado para análise">`).join("")}${status(content.state)}</section><h3>Histórico relacionado</h3>${r.audit.map((a) => `<p class="audit-item">${esc(a.action)} · ${when(a.createdAt)}<br>${esc(a.details?.reason || "")}</p>`).join("") || '<p class="muted">Nenhuma decisão anterior.</p>'}<p class="muted">${r.related.length} denúncia(s) relacionada(s). As decisões ficam auditadas e não apagam fisicamente as evidências.</p><form>${select("Decisão", "action", [["review", "Marcar em análise"], ["reject", "Arquivar sem violação"], ["hide", "Ocultar conteúdo"], ["remove", "Remover da exibição"], ["warn", "Advertir responsável"], ["suspend", "Suspender responsável"], ...(session.role === "admin" ? [["block", "Bloquear responsável"]] : []), ["resolve", "Resolver com justificativa"]])}<label>Justificativa<textarea name="reason" required maxlength="1000"></textarea></label>${field("Se suspender: até", "until", "datetime-local")}<button class="primary">Confirmar e registrar decisão</button><p class="form-error" role="alert"></p></form>`,
        { className: "ops-detail" },
      );
    dlg.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const b = e.target.querySelector("button");
      b.disabled = true;
      try {
        const body = Object.fromEntries(new FormData(e.target));
        if (body.until) body.until = new Date(body.until).toISOString();
        await request("/reports/" + id + "/decision", { method: "POST", body });
        dlg.close();
        await load();
        toast("Denúncia atualizada.");
      } catch (err) {
        e.target.querySelector(".form-error").textContent = err.message;
        b.disabled = false;
      }
    };
  } catch (e) {
    toast(e.message);
  }
}
async function contents(box, kind) {
  const title = {
    post: "Histórias compartilhadas",
    group: "Comunidades e interesses",
    event: "Encontros que aproximam",
  }[kind];
  box.innerHTML = `<section class="surface ops-panel"><div class="ops-card-heading"><h2>${title}</h2><span>Consulta e moderação de conteúdo</span></div>${filterForm(
    field("Buscar", "q", "search", "", 'placeholder="Texto ou nome"') +
      select("Estado", "state", [
        ["", "Todos"],
        ["active", "Ativo"],
        ["hidden", "Oculto"],
        ["removed", "Removido"],
        ...(kind === "event" ? [["cancelled", "Cancelado"]] : []),
      ]) +
      select("Denúncia", "reported", [
        ["", "Todos"],
        ["yes", "Com denúncia"],
      ]) +
      (kind === "post"
        ? select("Tipo", "kind", [
            ["", "Todos"],
            ["post", "Publicação"],
            ["momento", "Momento"],
          ]) +
          select("Mídia", "media", [
            ["", "Todos"],
            ["photo", "Com foto"],
          ]) +
          field("ID do autor", "author")
        : "") +
      field("De", "from", "date") +
      field("Até", "to", "date"),
  )}<div class="ops-results"></div><button class="load-more" hidden>Mais registros</button></section>`;
  pager(box, "/contents/" + kind, (target, rows) => {
    target.innerHTML = table(
      ["Conteúdo", "Responsável", "Estado", "Atividade", "Data", ""],
      rows.map(
        (r) =>
          `<tr><td class="content-cell"><strong>${esc(r.name || r.text.slice(0, 90) || "Publicação em fotos")}</strong><small>${esc(r.kind)} · ${r.reports} denúncia(s)</small></td><td>${esc(r.author?.name || "Conta removida")}<small>@${esc(r.author?.handle || "—")}</small></td><td>${status(r.state)}</td><td>${kind === "post" ? `${r.likes} curtidas · ${r.comments} comentários` : kind === "group" ? `${r.members} membros` : `${r.participants} presenças · ${esc(r.city || "")}`}</td><td>${when(r.startsAt || r.createdAt)}</td><td><button class="row-action" data-content="${r.id}">Revisar ${icon("arrow", 15)}</button></td></tr>`,
      ),
    );
    target.querySelectorAll("[data-content]").forEach(
      (b) =>
        (b.onclick = () => {
          const row = rows.find((r) => r.id === b.dataset.content);
          const dlg = modal(
            `<p class="eyebrow">REVISÃO · ${esc(kind)}</p><h2>${esc(row.name || row.author?.name || "Publicação")}</h2><p>${esc(row.text)}</p>${row.media.map((id) => `<img class="review-photo" src="${BASE}/api/comunidade-admin/media/${id}" alt="Imagem em análise">`).join("")}${kind === "post" ? '<h3>Comentários</h3><div id="review-comments">Carregando comentários…</div>' : ""}<form>${select("Estado", "state", [[row.state, "Manter estado atual"], ["hidden", "Ocultar"], ["removed", "Remover da exibição"], ...(kind === "event" ? [["cancelled", "Cancelar evento"]] : []), ...(kind === "group" ? [["suspended", "Suspender comunidade"]] : []), ...(session.role === "admin" ? [["active", "Restaurar"]] : [])])}<label>Motivo<textarea name="reason" maxlength="1000" required></textarea></label><button class="primary">Confirmar moderação</button><p class="form-error" role="alert"></p></form>`,
          );
          if (kind === "post") {
            let next = null;
            const holder = dlg.querySelector("#review-comments");
            const loadComments = async () => {
              try {
                const result = await request(
                  "/contents/post/" +
                    row.id +
                    "/comments" +
                    (next ? "?after=" + encodeURIComponent(next) : ""),
                );
                holder.querySelector("[data-more-comments]")?.remove();
                if (!next) holder.innerHTML = "";
                next = result.next;
                holder.insertAdjacentHTML(
                  "beforeend",
                  result.items
                    .map(
                      (c) =>
                        `<p class="audit-item"><strong>${esc(c.author?.name || "Conta removida")}</strong> · ${status(c.state)}<br>${esc(c.text)}</p>`,
                    )
                    .join("") || '<p class="muted">Nenhum comentário.</p>',
                );
                if (next) {
                  const more = document.createElement("button");
                  more.type = "button";
                  more.className = "text-button";
                  more.dataset.moreComments = "";
                  more.textContent = "Mais comentários";
                  more.onclick = loadComments;
                  holder.append(more);
                }
              } catch (err) {
                holder.textContent = err.message;
              }
            };
            loadComments();
          }
          dlg.querySelector("form").onsubmit = async (e) => {
            e.preventDefault();
            const button = e.target.querySelector("button");
            button.disabled = true;
            try {
              await request("/moderate", {
                method: "POST",
                body: {
                  kind,
                  id: row.id,
                  ...Object.fromEntries(new FormData(e.target)),
                },
              });
              dlg.close();
              load();
              toast("Ação registrada.");
            } catch (err) {
              e.target.querySelector(".form-error").textContent = err.message;
              button.disabled = false;
            }
          };
        }),
    );
  });
}
async function statistics(box) {
  box.innerHTML = `<section class="surface chart-card"><div class="ops-card-heading"><div><p class="eyebrow">CRESCIMENTO E ENGAJAMENTO</p><h2>Dados para acompanhar a jornada.</h2></div><select id="stats-period" aria-label="Período"><option value="7">Últimos 7 dias</option><option value="30" selected>Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 12 meses</option></select></div><div id="growth-chart"></div></section><section class="surface chart-card"><div class="ops-card-heading"><h2>Interações que aproximam</h2><select id="engagement-kind" aria-label="Indicador de engajamento">${[
    ["posts", "Publicações"],
    ["likes", "Curtidas"],
    ["comments", "Comentários"],
    ["moments", "Momentos"],
    ["follows", "Novos seguidores"],
    ["rsvps", "Presenças em eventos"],
    ["groups", "Novas comunidades"],
    ["members", "Participações em comunidades"],
  ]
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join(
      "",
    )}</select></div><div id="engagement-chart"></div></section><section class="surface ops-summary" id="retention"></section><section class="surface ops-summary" id="popular"></section><p class="ops-definition" id="stats-definition"></p>`;
  let data;
  async function draw() {
    data = await request(
      "/stats?days=" + box.querySelector("#stats-period").value,
    );
    if (!box.isConnected) return;
    chart(box.querySelector("#growth-chart"), data.series, [
      { id: "users", label: "Novos cadastros" },
      { id: "active", label: "Usuários ativos" },
    ]);
    engagement();
    box.querySelector("#retention").innerHTML =
      `<h2>Quem volta, constrói comunidade.</h2><p><strong>${data.returningUsers}</strong> contas tiveram atividade em dois ou mais dias diferentes no período selecionado.</p><p class="muted">Esse indicador mede retorno observado, não uma taxa de retenção por coorte. Média de ${data.averageActiveDays || 0} dias ativos por conta que utilizou a plataforma no período.</p>`;
    box.querySelector("#popular").innerHTML =
      "<h2>Publicações com mais curtidas</h2>" +
      data.popular
        .map(
          (p) =>
            `<div class="popular-row"><p>${esc(p.text || "História em fotos")}</p><span>${p.likes} curtidas · ${p.comments} comentários</span></div>`,
        )
        .join("") +
      (data.popular.length
        ? ""
        : '<p class="muted">As primeiras interações vão aparecer aqui.</p>');
    box.querySelector("#stats-definition").textContent = data.definition;
  }
  function engagement() {
    const select = box.querySelector("#engagement-kind");
    chart(box.querySelector("#engagement-chart"), data.series, [
      { id: select.value, label: select.selectedOptions[0].textContent },
    ]);
  }
  box.querySelector("#stats-period").onchange = () =>
    draw().catch((e) => toast(e.message));
  box.querySelector("#engagement-kind").onchange = engagement;
  await draw();
}
async function moderation(box) {
  const result = await request("/moderation");
  if (!box.isConnected) return;
  box.innerHTML = `<section class="metric-grid">${metric("Contas suspensas", result.counts.suspended, "lock")}${metric("Contas bloqueadas", result.counts.blocked, "flag")}${metric("Limites de autenticação acionados", result.authLimits, "settings", "Buckets com 3+ tentativas na janela; não significa ataque confirmado")}${metric("Falhas de envio em 24h", result.mailFailures, "bell")}</section><section class="surface ops-panel"><h2>Histórico de decisões</h2>${table(
    ["Ação", "Responsável", "Destino", "Justificativa", "Data"],
    result.recentAudit.rows.map(
      (a) =>
        `<tr><td>${esc(a.action)}</td><td>${esc(a.actor_id)}</td><td><small>${esc(a.target_id)}</small></td><td>${esc(a.details?.reason || "Registro técnico")}</td><td>${when(a.createdAt)}</td></tr>`,
    ),
  )}<button class="load-more" id="audit-more" ${result.recentAudit.next ? "" : "hidden"}>Mais decisões</button></section>`;
  let next = result.recentAudit.next;
  box.querySelector("#audit-more").onclick = async (e) => {
    e.target.disabled = true;
    try {
      const r = await request("/audit?after=" + encodeURIComponent(next));
      next = r.next;
      e.target.hidden = !next;
      box
        .querySelector("tbody")
        .insertAdjacentHTML(
          "beforeend",
          r.items
            .map(
              (a) =>
                `<tr><td>${esc(a.action)}</td><td>${esc(a.actor_id)}</td><td>${esc(a.target_id)}</td><td>${esc(a.details?.reason || "Registro técnico")}</td><td>${when(a.createdAt)}</td></tr>`,
            )
            .join(""),
        );
    } catch (err) {
      toast(err.message);
    } finally {
      e.target.disabled = false;
    }
  };
}
async function settings(box) {
  const cfg = await request("/settings");
  box.innerHTML = `<section class="surface ops-panel settings-panel"><p class="eyebrow">IDENTIDADE E PROTEÇÃO</p><h2>Uma operação com regras claras.</h2><p class="muted">Segredos, credenciais e configurações de infraestrutura são gerenciados no ambiente da API.</p><form><label>Regras públicas<textarea name="rules" maxlength="5000" required>${esc(cfg.rules)}</textarea></label><label>Mensagem informativa<textarea name="info" maxlength="500">${esc(cfg.info)}</textarea></label><div class="form-grid"><label>Categorias de denúncia (uma por linha)<textarea name="reportReasons" required>${esc(cfg.reportReasons.join("\n"))}</textarea></label><label>Interesses (um por linha)<textarea name="interests" required>${esc(cfg.interests.join("\n"))}</textarea></label></div><div class="form-grid">${field("Fotos por publicação (1–6)", "maxPostImages", "number", cfg.maxPostImages, 'min="1" max="6" required')}${field("MB por imagem (1–8)", "maxImageMB", "number", cfg.maxImageMB, 'min="1" max="8" required')}${field("Caracteres por publicação (100–3000)", "maxPostText", "number", cfg.maxPostText, 'min="100" max="3000" required')}${field("Publicações por conta/hora (1–100)", "postsPerHour", "number", cfg.postsPerHour, 'min="1" max="100" required')}</div><label class="checkbox"><input name="groupsEnabled" type="checkbox" ${cfg.groupsEnabled ? "checked" : ""}>Permitir criar comunidades</label><label class="checkbox"><input name="eventsEnabled" type="checkbox" ${cfg.eventsEnabled ? "checked" : ""}>Permitir criar eventos</label><button class="primary">Salvar configurações</button><p class="form-error" role="alert"></p></form></section>`;
  box.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(e.target));
      for (const name of [
        "maxPostImages",
        "maxImageMB",
        "maxPostText",
        "postsPerHour",
      ])
        data[name] = Number(data[name]);
      for (const name of ["reportReasons", "interests"])
        data[name] = data[name]
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      data.groupsEnabled = e.target.elements.groupsEnabled.checked;
      data.eventsEnabled = e.target.elements.eventsEnabled.checked;
      await request("/settings", { method: "PUT", body: data });
      toast("Configurações salvas.");
    } catch (err) {
      e.target.querySelector(".form-error").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}
window.addEventListener("hashchange", () => {
  if (!session) return;
  const next = location.hash.slice(1);
  if (allowed().some((s) => s[0] === next) && next !== current) {
    current = next;
    render();
  }
});
(async () => {
  try {
    session = await request("/session");
    csrf = session.csrf;
    const hash = location.hash.slice(1);
    if (allowed().some((s) => s[0] === hash)) current = hash;
    render();
  } catch {
    login();
  }
})();
