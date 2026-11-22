(function () {
  "use strict";
  const $ = (s) => document.querySelector(s),
    api = window.ClienteAPI.request,
    main = $("#conteudo"),
    modal = $("#modal");
  const paths = {
    home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
    pets: "M8 14c-2 1-4 4-2 6s4 0 6 0 4 2 6 0 0-5-2-6c-2-3-6-3-8 0ZM5 7v2m5-5v3m4-3v3m5 0v2",
    calendar: "M5 5h14v16H5ZM8 3v4m8-4v4M5 10h14m-10 4h2m3 0h2m-7 3h2",
    history: "M3 11a9 9 0 1 1 3 8M3 5v6h6m3-4v5l4 2",
    user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
    bell: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4",
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    heart: "M12 21 3 12C-2 4 7 0 12 7c5-7 14-3 9 5Z",
    photo: "M3 6h5l2-3h4l2 3h5v15H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    check: "m5 12 4 4L19 6",
    shield: "M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7Z",
    logout: "M10 4H4v16h6m4-12 4 4-4 4m-5-4h9",
  };
  const icon = (k) =>
    '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="' +
    (paths[k] || paths.pets) +
    '"/></svg>';
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const date = (d) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d || "")
      ? d.split("-").reverse().join("/")
      : "Não informada";
  const today = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  const when = (d, h) => date(d) + (h ? " · " + h : "");
  const time = (d) =>
    d
      ? new Date(d).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          dateStyle: "short",
          timeStyle: "short",
        })
      : "";
  const money = (v) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const states = {
    PENDENTE: "Em análise",
    PROPOSTA: "Novo horário sugerido",
    PROPOSTA_RECUSADA: "Proposta recusada",
    CONFIRMADA: "Confirmada",
    RECUSADA: "Não aprovada",
    CANCELADA: "Cancelada",
    EXPIRADA: "Expirada",
    agendado: "Confirmado",
    checkin: "No estabelecimento",
    pronto: "Pronto para retirada",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };
  const pill = (s) =>
    '<span class="pill ' +
    (["CONFIRMADA", "agendado", "pronto", "concluido"].includes(s)
      ? "ok"
      : ["PENDENTE", "PROPOSTA", "checkin"].includes(s)
        ? "wait"
        : ["RECUSADA", "CANCELADA", "cancelado", "EXPIRADA"].includes(s)
          ? "bad"
          : "") +
    '">' +
    esc(states[s] || s) +
    "</span>";
  let session = null,
    pets = [],
    appointments = [],
    requests = [],
    services = [],
    notifications = { itens: [], naoLidas: 0 },
    tab = "home",
    eventsource,
    poll,
    refreshing = false,
    falhasDados = {},
    dadosCarregados = new Set(),
    revision = "",
    installPrompt,
    registration,
    bookingKey,
    authBusy = false;
  let loja = new URL(location.href).searchParams.get("loja") || "";
  try {
    loja = loja || localStorage.getItem("pethub-cliente-loja") || "";
  } catch {}
  let emailLogin = "";
  let marcaKey = "",
    marcaSeq = 0;
  function marcaEmpresa(info) {
    const link = $(".marca");
    if (!link) return;
    const slug = info?.slug || loja,
      url = info?.logoUrl || "",
      key = slug + "|" + Boolean(info?.logo) + "|" + url;
    if (marcaKey === key) return;
    marcaKey = key;
    const seq = ++marcaSeq;
    link.href =
      "/cliente-app/app.html" +
      (slug ? "?loja=" + encodeURIComponent(slug) : "");
    link.setAttribute("aria-label", "Página inicial do estabelecimento");
    link.setAttribute("aria-busy", "true");
    const loader = document.createElement("span");
    loader.className = "marca-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-label", "Carregando logo do estabelecimento");
    link.replaceChildren(loader);
    const finish = () => {
      if (seq !== marcaSeq) return;
      loader.remove();
      link.setAttribute("aria-busy", "false");
    };
    if (!info) return;
    if (!info.logo || !url) {
      finish();
      return;
    }
    // Somente endpoints locais de logo, nunca uma URL de imagem vinda do cadastro.
    if (
      !/^\/api\/cliente-app\/loja\/(?:logo|[a-f0-9-]{36}\/logo)(?:\?v=[a-f0-9]+)?$/i.test(
        url,
      )
    ) {
      finish();
      return;
    }
    const img = document.createElement("img");
    img.className = "marca-logo-empresa";
    img.width = 113;
    img.height = 77;
    img.alt = "Logo do estabelecimento";
    img.hidden = true;
    img.onload = () => {
      if (seq !== marcaSeq) return;
      finish();
      img.hidden = false;
    };
    img.onerror = () => {
      if (seq !== marcaSeq) return;
      img.remove();
      finish();
      marcaKey = "";
    };
    link.prepend(img);
    img.src = url;
  }
  function atualizarLoja(slug) {
    if (loja !== slug) {
      window.PortalTema?.aplicar(document, null);
      marcaEmpresa(null);
    }
    loja = slug;
    window.history.replaceState(
      null,
      "",
      location.pathname + "?loja=" + encodeURIComponent(slug),
    );
    try {
      localStorage.setItem("pethub-cliente-loja", slug);
    } catch {}
  }
  let invite = new URLSearchParams(location.hash.slice(1)).get("convite");
  if (invite)
    window.history.replaceState(
      null,
      "",
      location.pathname + (loja ? "?loja=" + encodeURIComponent(loja) : ""),
    );
  function toast(text) {
    $("#aviso").textContent = text;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => ($("#aviso").textContent = ""), 6500);
  }
  function empty(text, k = "pets") {
    return '<div class="empty">' + icon(k) + esc(text) + "</div>";
  }
  function field(label, name, value = "", type = "text", extra = "") {
    return (
      "<label>" +
      esc(label) +
      '<input name="' +
      name +
      '" type="' +
      type +
      '" value="' +
      esc(value) +
      '" ' +
      extra +
      "></label>"
    );
  }
  function select(label, name, options, value = "", extra = "") {
    return (
      "<label>" +
      esc(label) +
      '<select name="' +
      name +
      '" ' +
      extra +
      ">" +
      options
        .map(
          (o) =>
            '<option value="' +
            esc(o.value) +
            '" ' +
            (String(o.value) === String(value) ? "selected" : "") +
            ">" +
            esc(o.label) +
            "</option>",
        )
        .join("") +
      "</select></label>"
    );
  }
  function textArea(label, name, value = "", max = 1000) {
    return (
      "<label>" +
      esc(label) +
      '<textarea name="' +
      name +
      '" maxlength="' +
      max +
      '">' +
      esc(value) +
      "</textarea></label>"
    );
  }
  function errorIn(form, e) {
    let node = form.querySelector("[role=alert]");
    if (!node) {
      node = document.createElement("p");
      node.className = "inline-error";
      node.setAttribute("role", "alert");
      form.append(node);
    }
    node.textContent = e.message || "Não foi possível concluir.";
  }
  async function submitting(form, work) {
    if (form.dataset.busy) return;
    form.dataset.busy = "1";
    const btn = form.querySelector("[type=submit]");
    if (btn) btn.disabled = true;
    try {
      await work();
    } catch (e) {
      errorIn(form, e);
    } finally {
      delete form.dataset.busy;
      if (btn) btn.disabled = false;
    }
  }
  function open(title, html) {
    modal.classList.remove("pet-detail-dialog");
    $("#modal-titulo").textContent = title;
    $("#modal-corpo").innerHTML = html;
    if (!modal.open) modal.showModal();
  }
  $("#fechar-modal").onclick = () => modal.close();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        modal.close();
    }
  });
  function avatar(p, large = false) {
    return p.foto
      ? '<img class="avatar ' +
          (large ? "large" : "") +
          '" src="' +
          esc(p.foto) +
          '" alt="Foto de ' +
          esc(p.nome) +
          '" loading="lazy">'
      : '<span class="avatar ' +
          (large ? "large" : "") +
          '">' +
          icon("pets") +
          "</span>";
  }
  function idade(d) {
    if (!d) return "Idade não informada";
    const fim = today().split("-").map(Number),
      n = d.split("-").map(Number);
    let meses = (fim[0] - n[0]) * 12 + fim[1] - n[1] - (fim[2] < n[2] ? 1 : 0);
    if (meses < 0) return "Recém-nascido";
    if (meses < 12) return meses + " mês(es)";
    return (
      Math.floor(meses / 12) +
      " ano(s)" +
      (meses % 12 ? " e " + (meses % 12) + " mês(es)" : "")
    );
  }
  function petName(id) {
    return pets.find((p) => p.id === Number(id))?.nome || "Pet";
  }
  const Visual = window.PortalVisual;
  let visualPublic = null,
    bookingStep = 1,
    petSearch = "",
    petFilter = "all";
  function visualInfo() {
    return session?.loja || visualPublic;
  }
  function variables(pet) {
    return {
      nome_cliente: session?.perfil?.nome?.split(" ")[0] || "tutor",
      nome_empresa: visualInfo()?.nome || "seu pet shop",
      nome_pet: pet?.nome || pets[0]?.nome || "seu pet",
    };
  }
  function hero(area, action = "", pet = null) {
    const v = Visual.normalizar(visualInfo()?.aparencia?.visuais)[area],
      vars = variables(pet),
      title = Visual.interpolar(v.titulo, vars),
      desc = Visual.interpolar(v.texto, vars),
      full = v.modo === "banner" && v.personalizada;
    return (
      '<section class="hero premium-hero ' +
      (full ? "hero-full" : "") +
      '" data-hero="' +
      area +
      '"><div class="hero-stage"><div class="hero-copy"' +
      (full && v.ocultarTextos ? " hidden" : "") +
      '><span class="eyebrow">' +
      icon("pets") +
      " " +
      esc(area === "inicio" ? vars.nome_empresa : Visual.AREAS[area].nome) +
      "</span><h1>" +
      esc(title) +
      "</h1><p>" +
      esc(desc) +
      '</p></div><img class="hero-art" src="' +
      esc(v.imagem) +
      '" alt="" decoding="async" style="object-position:' +
      v.x +
      "% " +
      v.y +
      '%" ' +
      (area === "inicio" || area === "boasVindas"
        ? 'fetchpriority="high"'
        : 'loading="lazy"') +
      "></div>" +
      (action ? '<div class="hero-actions">' + action + "</div>" : "") +
      "</section>"
    );
  }
  function sectionTitle(title, action = "") {
    return (
      '<div class="section-heading"><h2>' +
      esc(title) +
      "</h2>" +
      action +
      "</div>"
    );
  }
  function pastAppointments() {
    return appointments.filter(
      (a) =>
        a.data <= today() &&
        (!["agendado", "checkin", "pronto"].includes(a.status) ||
          a.data < today()),
    );
  }
  function nextAppointment() {
    return appointments
      .filter(
        (a) =>
          ["agendado", "checkin", "pronto"].includes(a.status) &&
          a.data >= today(),
      )
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0];
  }
  function petsPage() {
    const rows = pets.filter(
      (p) =>
        (!petSearch ||
          [p.nome, p.raca, p.especie].some((v) =>
            String(v || "")
              .toLocaleLowerCase("pt-BR")
              .includes(petSearch),
          )) &&
        (petFilter !== "scheduled" ||
          appointments.some(
            (a) =>
              a.petId === p.id &&
              a.data >= today() &&
              ["agendado", "checkin", "pronto"].includes(a.status),
          )),
    );
    return (
      '<span class="eyebrow">' +
      icon("pets") +
      ' Seu pequeno universo</span><div class="row between"><h1>Meus Pets</h1><button class="btn small" data-newpet>' +
      icon("plus") +
      ' Novo pet</button></div><p class="muted">Perfis, saúde e todo o cuidado dos seus companheiros.</p><label class="pet-search">Buscar pet<input type="search" id="pet-search" placeholder="Nome, raça ou espécie" value="' +
      esc(petSearch) +
      '"></label><div class="chips"><button class="chip ' +
      (petFilter === "all" ? "selected" : "") +
      '" data-pet-filter="all">Todos (' +
      pets.length +
      ')</button><button class="chip ' +
      (petFilter === "scheduled" ? "selected" : "") +
      '" data-pet-filter="scheduled">Com agendamento</button></div><div id="pet-cards">' +
      petCards(rows) +
      "</div>"
    );
  }
  function nav() {
    const tabs = [
      ["home", "Início"],
      ["pets", "Meus Pets"],
      ["booking", "Agendar"],
      ["history", "Histórico"],
      ["profile", "Perfil"],
    ];
    $("#navegacao").innerHTML = tabs
      .map(
        ([id, label]) =>
          '<button data-tab="' +
          id +
          '" class="' +
          (tab === id ? "active" : "") +
          '" ' +
          (tab === id ? 'aria-current="page"' : "") +
          ">" +
          icon(id === "booking" ? "calendar" : id === "profile" ? "user" : id) +
          label +
          "</button>",
      )
      .join("");
    $("#navegacao").hidden = false;
    $("#sino").hidden = false;
    $("#sino").innerHTML =
      icon("bell") +
      (notifications.naoLidas
        ? '<span class="badge-count">' +
          Math.min(notifications.naoLidas, 99) +
          "</span>"
        : "");
  }
  function petCards(rows = pets) {
    return rows.length
      ? '<div class="grid pets">' +
          rows
            .map(
              (p) =>
                '<article class="card pet-card"><div class="row pet-identity">' +
                avatar(p, true) +
                "<div><h2>" +
                esc(p.nome) +
                "</h2><p>" +
                esc(p.raca || p.especie || "Raça não informada") +
                '</p><div class="statline"><span>' +
                esc(
                  p.data_nascimento
                    ? idade(p.data_nascimento)
                    : "Idade não informada",
                ) +
                "</span>" +
                (p.genero ? "<span>" + esc(p.genero) + "</span>" : "") +
                "</div>" +
                (p.ativo ? "" : "<small>Cadastro inativo</small>") +
                '</div></div><div class="pet-quick"><button class="quick" data-pet="' +
                p.id +
                '">' +
                icon("user") +
                " Ver perfil " +
                icon("arrow") +
                '</button><button class="quick" data-pet-area="health" data-id="' +
                p.id +
                '">' +
                icon("shield") +
                " Vacinas " +
                icon("arrow") +
                '</button><button class="quick" data-pet-area="journey" data-id="' +
                p.id +
                '">' +
                icon("history") +
                " Histórico " +
                icon("arrow") +
                "</button></div></article>",
            )
            .join("") +
          "</div>"
      : empty(
          pets.length
            ? "Nenhum pet encontrado com esse filtro."
            : "Cadastre seu primeiro pet para começar.",
        );
  }
  function appointmentCard(a) {
    const p = pets.find((p) => p.id === a.petId) || { nome: petName(a.petId) };
    return (
      '<article class="card appointment-card ' +
      (a.status === "concluido" ? "completed" : "") +
      '"><div class="row between"><div class="row">' +
      avatar(p) +
      "<div><h3>" +
      esc(p.nome) +
      "</h3><small>" +
      when(a.data, a.hora) +
      "</small></div></div>" +
      pill(a.status) +
      '</div><div class="service-strip">' +
      icon("calendar") +
      " <strong>" +
      esc(a.servico) +
      "</strong></div>" +
      (a.profissional
        ? "<small>Profissional: " + esc(a.profissional) + "</small>"
        : "") +
      (a.comunicado
        ? '<div class="note">' + esc(a.comunicado) + "</div>"
        : "") +
      "</article>"
    );
  }
  function requestCards() {
    return requests.length
      ? requests
          .map(
            (p) =>
              '<article class="card"><div class="row between"><h3>' +
              esc(petName(p.petId)) +
              "</h3>" +
              pill(p.estado) +
              "</div><p>" +
              esc(p.servico) +
              "<br><small>Solicitado: " +
              when(p.data, p.hora) +
              "</small></p>" +
              (p.motivo
                ? '<div class="note">' + esc(p.motivo) + "</div>"
                : "") +
              (p.estado === "PROPOSTA" && p.proposta
                ? '<div class="note warning"><strong>Proposta do pet shop</strong><br>' +
                  when(p.proposta.data, p.proposta.hora) +
                  "<br>" +
                  esc(p.proposta.observacao || "") +
                  '<span class="hint">Válida até ' +
                  time(p.proposta.expiraEm) +
                  '. O horário será verificado novamente ao aceitar.</span></div><div class="actions"><button class="btn small" data-request="' +
                  p.id +
                  '" data-action="aceitar_proposta">Aceitar novo horário</button><button class="btn secondary small" data-request="' +
                  p.id +
                  '" data-action="recusar_proposta">Recusar proposta</button></div>'
                : "") +
              (["PENDENTE", "PROPOSTA", "PROPOSTA_RECUSADA"].includes(p.estado)
                ? '<button class="link-btn" data-request="' +
                  p.id +
                  '" data-action="cancelar">Cancelar solicitação</button>'
                : "") +
              (p.estado === "CONFIRMADA"
                ? '<div class="hint">Acompanhe o atendimento no Histórico. Para alterar ou cancelar, contate o estabelecimento.</div>'
                : "") +
              "</article>",
          )
          .join("")
      : empty("Nenhuma solicitação por aqui ainda.", "calendar");
  }
  function home() {
    const next = nextAppointment();
    return (
      hero(
        "inicio",
        '<button class="btn dark" data-tab="booking">' +
          icon("calendar") +
          " Agendar cuidado " +
          icon("arrow") +
          "</button>",
      ) +
      sectionTitle(
        "Próximo encontro",
        '<button class="link-btn" data-tab="requests">Ver pedidos ' +
          icon("arrow") +
          "</button>",
      ) +
      (next
        ? appointmentCard(next)
        : '<div class="card">' +
          empty(
            "Nenhum próximo atendimento confirmado. Solicite um horário para seu pet.",
            "calendar",
          ) +
          "</div>") +
      sectionTitle("Acesso rápido") +
      '<div class="grid three"><button class="quick" data-tab="requests">' +
      icon("calendar") +
      "<span>Meus pedidos</span>" +
      icon("arrow") +
      '</button><button class="quick" data-tab="pets">' +
      icon("heart") +
      "<span>Saúde e vacinas</span>" +
      icon("arrow") +
      '</button><button class="quick" data-tab="pets">' +
      icon("pets") +
      "<span>Meus Pets</span>" +
      icon("arrow") +
      "</button></div>" +
      (notifications.naoLidas
        ? '<button class="notification-summary card" data-tab="notifications">' +
          icon("bell") +
          " " +
          notifications.naoLidas +
          " aviso(s) não lido(s) " +
          icon("arrow") +
          "</button>"
        : "")
    );
  }
  function notificationCards(rows) {
    return rows.length
      ? rows
          .map(
            (n) =>
              '<article class="card notification-card ' +
              (!n.lida ? "unread" : "") +
              '"><div class="notification-icon">' +
              icon(n.tipo === "atendimento" ? "calendar" : "bell") +
              "</div><div><h3>" +
              esc(n.titulo) +
              "</h3><p>" +
              esc(n.texto) +
              "</p><small>" +
              time(n.criadoEm) +
              "</small></div>" +
              (!n.lida ? '<span class="pill wait">Novo</span>' : "") +
              '<button type="button" class="notification-open link-btn" data-open-notice="' +
              n.id +
              '" aria-label="Abrir aviso">' +
              icon("arrow") +
              "</button></article>",
          )
          .join("")
      : empty("Seus avisos e atualizações aparecerão aqui.", "bell");
  }
  function renderHistorico() {
    const rows = pastAppointments();
    return (
      hero(
        "historico",
        '<button class="btn dark" data-tab="requests">Solicitações do app ' +
          icon("arrow") +
          "</button>",
      ) +
      select("Filtrar por pet", "history-pet", [
        { value: "", label: "Todos os pets" },
        ...pets.map((p) => ({ value: p.id, label: p.nome })),
      ]) +
      sectionTitle("Histórico de atendimentos") +
      '<p class="hint">Os status são os registrados pela equipe. Atendimentos futuros ficam em Meus pedidos e Próximo encontro.</p><div class="timeline" id="history-list">' +
      (rows.length
        ? rows.map(appointmentCard).join("")
        : empty("Nenhum atendimento passado registrado.", "history")) +
      "</div>"
    );
  }
  function profile() {
    const p = session.perfil;
    return (
      '<span class="eyebrow">Conta e preferências</span><h1>Meu perfil</h1><p class="muted">Gerencie seus dados, endereço e preferências do app.</p><div class="profile-summary card"><span class="profile-initial">' +
      esc(p.nome?.[0] || "") +
      "</span><div><h2>" +
      esc(p.nome) +
      "</h2><small>Sua conta em " +
      esc(session.loja.nome) +
      '</small></div><button type="button" class="link-btn" data-tab="pets">' +
      pets.length +
      " pet(s) " +
      icon("arrow") +
      '</button></div><form id="profile-form" data-etag="' +
      esc(p.etag) +
      '" class="card form profile-form"><h2>Dados pessoais</h2><div class="form-grid">' +
      field(
        "Nome",
        "nome",
        p.nome,
        "text",
        'required maxlength="200" autocomplete="name"',
      ) +
      field(
        "Telefone",
        "telefone",
        p.telefone,
        "tel",
        'maxlength="30" autocomplete="tel"',
      ) +
      '</div><h2>Endereço</h2><div class="form-grid">' +
      field(
        "CEP",
        "cep",
        p.cep,
        "text",
        'maxlength="10" inputmode="numeric" autocomplete="postal-code"',
      ) +
      field("Cidade", "cidade", p.cidade, "text", 'maxlength="200"') +
      select(
        "Estado (UF)",
        "estado",
        [
          { value: "", label: "Não informado" },
          ..."AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO"
            .split("|")
            .map((value) => ({ value, label: value })),
        ],
        p.estado || "",
      ) +
      "</div>" +
      field(
        "Endereço",
        "endereco",
        p.endereco,
        "text",
        'maxlength="200" autocomplete="street-address"',
      ) +
      '<div class="form-grid">' +
      field("Número", "numero", p.numero, "text", 'maxlength="30"') +
      field(
        "Complemento",
        "complemento",
        p.complemento,
        "text",
        'maxlength="100"',
      ) +
      "</div>" +
      field("Bairro", "bairro", p.bairro, "text", 'maxlength="100"') +
      "<small>E-mail de acesso: " +
      esc(p.emailAcesso) +
      '. Para alterá-lo, fale com o estabelecimento.</small><button type="submit" class="btn">Salvar meus dados</button></form><div class="card"><h2>Seu pet shop</h2>' +
      (session.loja.logo
        ? '<img class="avatar" src="/api/cliente-app/loja/logo" alt="Logo do estabelecimento">'
        : "") +
      "<h3>" +
      esc(session.loja.nome) +
      "</h3><p>" +
      esc(session.loja.endereco || "") +
      "</p>" +
      (session.loja.telefone
        ? '<a class="btn secondary" href="tel:' +
          esc(session.loja.telefone.replace(/[^+0-9]/g, "")) +
          '">Ligar para o estabelecimento</a>'
        : "") +
      '<p class="muted">' +
      esc(
        session.loja.expediente ||
          "Horários sujeitos à confirmação do estabelecimento.",
      ) +
      '</p></div><div class="card"><h2>PetHub sempre com você</h2><p class="muted">Instale este aplicativo na sua tela inicial.</p><button class="btn secondary" data-install>Como instalar</button><div class="divider"></div><h3>Fique por dentro</h3><p class="muted">Os avisos ficam salvos no app. Ative também as notificações do aparelho.</p><div class="actions"><button class="btn secondary" data-push>Ativar notificações</button><button class="link-btn" data-unpush>Desativar neste aparelho</button></div></div><button class="btn danger wide" data-logout>' +
      icon("logout") +
      ' Sair da minha conta</button><p class="hint">Seus registros continuam seguros no estabelecimento. Ao sair, o push deste dispositivo é desativado.</p>'
    );
  }
  function booking() {
    bookingStep = 1;
    if (!session.loja.receberPedidos)
      return (
        hero("agendamento") +
        empty(
          "O estabelecimento não está recebendo solicitações no momento.",
          "calendar",
        ) +
        '<button class="btn secondary" data-tab="profile">Ver contato</button>'
      );
    if (!pets.some((p) => p.ativo))
      return (
        hero("agendamento") +
        empty("Cadastre um pet para solicitar um horário.") +
        '<button class="btn" data-newpet>Adicionar pet</button>'
      );
    if (!services.length)
      return (
        hero("agendamento") +
        empty("Nenhum serviço foi publicado para agendamento.", "calendar")
      );
    return (
      hero("agendamento") +
      '<ol class="booking-progress" aria-label="Etapas do agendamento">' +
      ["Seu pet", "Serviço", "Data", "Horário", "Revisão"]
        .map(
          (x, i) =>
            '<li data-progress="' +
            (i + 1) +
            '" ' +
            (!i ? 'aria-current="step"' : "") +
            "><span>" +
            (i + 1) +
            "</span><small>" +
            x +
            "</small></li>",
        )
        .join("") +
      '</ol><form id="booking-form" class="form booking-form"><fieldset data-book-step="1"><legend>Quem vem nos visitar?</legend>' +
      select(
        "Seu pet",
        "petId",
        pets
          .filter((p) => p.ativo)
          .map((p) => ({ value: p.id, label: p.nome })),
      ) +
      '</fieldset><fieldset data-book-step="2" hidden><legend>Qual cuidado?</legend>' +
      select(
        "Serviço",
        "servicoId",
        services.map((s) => ({ value: s.id, label: s.nome })),
      ) +
      '<div id="service-info" class="note"></div></fieldset><fieldset data-book-step="3" hidden><legend>Escolha a data</legend>' +
      field(
        "Data desejada",
        "data",
        "",
        "date",
        'required min="' + today() + '"',
      ) +
      '</fieldset><fieldset data-book-step="4" hidden><legend>Escolha o horário</legend><div id="slots" aria-live="polite" class="hint">Escolha uma data para consultar os horários.</div>' +
      field("Horário de preferência", "hora", "", "time", "required") +
      '<small>As opções seguem a disponibilidade. Uma preferência fora delas depende da análise da equipe.</small></fieldset><fieldset data-book-step="5" hidden><legend>Revise sua solicitação</legend><div id="booking-review" class="card"></div>' +
      textArea("Observação opcional", "observacao", "", "1000") +
      '<div class="note warning">A equipe confirma o atendimento. Este envio é uma solicitação e ainda não reserva o horário.</div></fieldset><div class="booking-controls"><button type="button" class="btn secondary" data-book-prev hidden>Voltar</button><button type="button" class="btn" data-book-next>Continuar ' +
      icon("arrow") +
      '</button><button type="submit" class="btn" id="book-review" hidden>Revisar e enviar ' +
      icon("arrow") +
      "</button></div></form>"
    );
  }
  function stepBooking(n) {
    const f = $("#booking-form");
    if (!f) return;
    if (n > bookingStep) {
      const fieldset = f.querySelector(
        '[data-book-step="' + bookingStep + '"]',
      );
      for (const el of fieldset.querySelectorAll("input,select,textarea"))
        if (!el.reportValidity()) return;
    }
    bookingStep = Math.max(1, Math.min(5, n));
    f.querySelectorAll("[data-book-step]").forEach(
      (e) => (e.hidden = Number(e.dataset.bookStep) !== bookingStep),
    );
    main.querySelectorAll("[data-progress]").forEach((e) => {
      const i = Number(e.dataset.progress);
      e.classList.toggle("done", i < bookingStep);
      if (i === bookingStep) e.setAttribute("aria-current", "step");
      else e.removeAttribute("aria-current");
    });
    f.querySelector("[data-book-prev]").hidden = bookingStep === 1;
    f.querySelector("[data-book-next]").hidden = bookingStep === 5;
    f.querySelector("#book-review").hidden = bookingStep !== 5;
    if (bookingStep === 4) void loadSlots();
    if (bookingStep === 5) {
      const b = Object.fromEntries(new FormData(f)),
        s = services.find((s) => s.id === b.servicoId);
      $("#booking-review").innerHTML =
        "<h3>" +
        esc(petName(b.petId)) +
        "</h3><p>" +
        esc(s?.nome || "") +
        "</p><p>" +
        when(b.data, b.hora) +
        "</p>" +
        (s?.duracao
          ? "<small>" + s.duracao + " minutos estimados</small>"
          : "");
    }
    f.querySelector("fieldset:not([hidden])")
      .querySelector("input,select,textarea")
      ?.focus();
  }

  const nomesDados = { "/pets": "pets", "/agendamentos": "histórico e agendamentos", "/solicitacoes": "solicitações", "/servicos": "serviços", "/notificacoes": "avisos", "/sessao": "dados da conta" };
  function avisoDados() {
    const nomes = Object.keys(falhasDados).map(p => nomesDados[p]);
    return nomes.length ? '<div class="note" role="status"><strong>Alguns dados não puderam ser atualizados</strong><p>Não foi possível carregar: ' + esc(nomes.join(", ")) + '. Os dados já carregados foram mantidos.</p><button class="btn secondary small" type="button" data-retry-dados>Tentar novamente</button></div>' : "";
  }
  function render() {
    if (!session) return;
    nav();
    const essenciais = { home: ["/pets", "/agendamentos"], pets: ["/pets"], history: ["/pets", "/agendamentos"], booking: ["/pets", "/servicos"], requests: ["/pets", "/solicitacoes"], notifications: ["/notificacoes"] }[tab] || [];
    if (essenciais.some(p => falhasDados[p] && !dadosCarregados.has(p))) {
      main.innerHTML = avisoDados();
      return;
    }
    if (tab === "home") main.innerHTML = home();
    else if (tab === "pets") main.innerHTML = petsPage();
    else if (tab === "booking") {
      main.innerHTML = booking();
      serviceInfo();
    } else if (tab === "history") main.innerHTML = renderHistorico();
    else if (tab === "profile") main.innerHTML = profile();
    else if (tab === "requests")
      main.innerHTML =
        hero("solicitacoes") +
        '<button class="btn small" data-tab="booking">' +
        icon("plus") +
        ' Nova solicitação</button><p class="muted">Acompanhe respostas e aceite novos horários.</p>' +
        requestCards();
    else if (tab === "notifications")
      main.innerHTML =
        '<div class="row between"><h1>Suas novidades</h1><button class="link-btn" data-read>Marcar como lidas</button></div>' +
        notificationCards(notifications.itens);
    const aviso = avisoDados();
    if (aviso) main.innerHTML = aviso + main.innerHTML;
  }
  async function refresh({ redraw = true } = {}) {
    if (refreshing || !session || !navigator.onLine) return;
    refreshing = true;
    try {
      const atual = session;
      const caminhos = ["/pets", "/agendamentos", "/solicitacoes", "/servicos", "/notificacoes", "/sessao"];
      const resultados = await Promise.allSettled(caminhos.map(async path => {
        const data = await api(path);
        if (path === "/notificacoes" ? !Array.isArray(data?.itens) : path === "/sessao" ? !data?.loja || !data?.perfil : !Array.isArray(data))
          throw new Error("Resposta inválida.");
        return data;
      }));
      // Uma resposta atrasada de outra sessão nunca deve preencher esta tela.
      if (session !== atual) return;
      if (resultados.some(r => r.status === "rejected" && [401, 403].includes(r.reason?.status))) {
        loggedOut();
        return;
      }
      resultados.forEach((r, i) => {
        const path = caminhos[i];
        if (r.status === "rejected") { falhasDados[path] = true; return; }
        delete falhasDados[path];
        dadosCarregados.add(path);
        if (path === "/pets") pets = r.value;
        else if (path === "/agendamentos") appointments = r.value;
        else if (path === "/solicitacoes") requests = r.value;
        else if (path === "/servicos") services = r.value;
        else if (path === "/notificacoes") notifications = r.value;
        else session = r.value;
      });
      marcaEmpresa(session.loja);
      window.PortalTema?.aplicar(document, session.loja.aparencia);
      nav();
      if (
        redraw &&
        !modal.open &&
        !main.querySelector("#booking-form") &&
        !main.contains(document.activeElement.closest?.("form"))
      )
        render();
    } catch (e) {
      if (e.status === 401 || e.status === 403) loggedOut();
      else toast("Não foi possível atualizar. Seus dados não foram alterados.");
    } finally {
      refreshing = false;
    }
  }
  function live() {
    eventsource?.close();
    clearInterval(poll);
    eventsource = new EventSource("/api/cliente-app/eventos");
    eventsource.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (revision && revision !== d.revisao) void refresh();
        revision = d.revisao;
      } catch {}
    };
    poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
  }
  async function startSession() {
    try {
      session = await api("/sessao");
      atualizarLoja(session.loja.slug);
      marcaEmpresa(session.loja);
      window.PortalTema?.aplicar(document, session.loja.aparencia);
      await refresh({ redraw: false });
      if (!session) return;
      render();
      live();
    } catch {
      showAuth();
    }
  }
  function loggedOut() {
    emailLogin = "";
    session = null;
    pets = [];
    appointments = [];
    services = [];
    falhasDados = {};
    dadosCarregados.clear();
    requests = [];
    notifications = { itens: [], naoLidas: 0 };
    window.ClienteAPI.limpar();
    eventsource?.close();
    clearInterval(poll);
    modal.close();
    showAuth();
  }
  async function showAuth(mode = invite ? "invite" : "login") {
    if (authBusy) return;
    visualPublic = null;
    marcaEmpresa(null);
    window.PortalTema?.aplicar(document, null);
    $("#navegacao").hidden = true;
    $("#sino").hidden = true;
    let erroLoja = null;
    let nome = "Seu pet shop, mais perto de você";
    if (loja && /^[a-f0-9-]{36}$/i.test(loja))
      try {
        const estabelecimento = await api("/loja/" + loja);
        visualPublic = estabelecimento;
        nome = estabelecimento.nome;
        marcaEmpresa(estabelecimento);
        window.PortalTema?.aplicar(document, estabelecimento.aparencia);
      } catch (e) {
        erroLoja = e;
      }
    const isInvite = mode === "invite",
      isRecovery = mode === "recovery";
    const bloqueado = !isInvite && [403, 404].includes(erroLoja?.status);
    main.innerHTML =
      '<section class="auth">' +
      hero("boasVindas") +
      '<div class="card"><h2>' +
      (isInvite
        ? "Bem-vindo ao seu espaço"
        : isRecovery
          ? "Recuperar meu acesso"
          : "Bom ter você por aqui") +
      '</h2><p class="muted">' +
      (isInvite
        ? "Defina sua senha pessoal para começar."
        : isRecovery
          ? "A recuperação é feita com a equipe do seu pet shop."
          : "Acesse os cuidados de quem é parte da sua família.") +
      "</p>" +
      (erroLoja
        ? '<div class="note warning" role="alert">' +
          esc(
            isInvite
              ? "Não foi possível consultar o estabelecimento. O convite será validado pelo servidor."
              : erroLoja.message,
          ) +
          "</div>"
        : "") +
      '<form id="auth-form" data-mode="' +
      mode +
      '" class="form">' +
      (isInvite
        ? ""
        : (!loja
            ? field(
                "Código do estabelecimento (no convite)",
                "loja",
                "",
                "text",
                'required maxlength="36"',
              )
            : "") +
          field(
            "E-mail de acesso",
            "email",
            emailLogin,
            "email",
            'required maxlength="254" autocomplete="username"',
          )) +
      (isRecovery
        ? ""
        : field(
            isInvite ? "Crie uma senha com letras e números" : "Sua senha",
            "senha",
            "",
            "password",
            "required " +
              (isInvite
                ? 'minlength="10" autocomplete="new-password"'
                : 'autocomplete="current-password"'),
          )) +
      (isInvite
        ? field(
            "Repita sua senha",
            "confirmar",
            "",
            "password",
            'required minlength="10" autocomplete="new-password"',
          ) +
          "<small>Mínimo de 10 caracteres com letras e números. Máximo de 72 bytes.</small>"
        : "") +
      '<button class="btn wide" type="submit" ' +
      (bloqueado ? "disabled" : "") +
      ">" +
      (isInvite
        ? "Ativar meu acesso"
        : isRecovery
          ? "Solicitar recuperação"
          : "Entrar no meu espaço") +
      "</button></form>" +
      (bloqueado
        ? '<button class="link-btn" data-auth="login">Verificar estabelecimento novamente</button>'
        : "") +
      '<button class="link-btn" data-auth="' +
      (isRecovery ? "login" : "recovery") +
      '">' +
      (isRecovery ? "Voltar ao acesso" : "Esqueci minha senha") +
      '</button></div><p class="hint">Ainda não tem acesso? Peça ao estabelecimento um convite para o PetHub Cliente.</p><button class="link-btn" data-install>Como instalar no meu celular</button></section>';
  }
  function petForm(p = {}) {
    const opts = (arr) => [
      { value: "", label: "Não informado" },
      ...arr.map((v) => ({ value: v, label: v })),
    ];
    return (
      '<form id="pet-form" data-id="' +
      (p.id || "") +
      '" data-etag="' +
      esc(p.etag || "") +
      '" class="form">' +
      field("Nome", "nome", p.nome, "text", 'required maxlength="100"') +
      '<div class="form-grid">' +
      field(
        "Espécie",
        "especie",
        p.especie,
        "text",
        'required maxlength="120" placeholder="Ex.: Cão"',
      ) +
      field("Raça", "raca", p.raca, "text", 'maxlength="120"') +
      select("Sexo", "genero", opts(["Macho", "Fêmea"]), p.genero) +
      field(
        "Nascimento",
        "data_nascimento",
        p.data_nascimento,
        "date",
        'max="' + today() + '"',
      ) +
      field(
        "Peso (kg)",
        "peso",
        p.peso,
        "number",
        'min="0.01" max="1500" step="0.01"',
      ) +
      select(
        "Porte",
        "porte",
        opts(["Pequeno", "Médio", "Grande", "Gigante"]),
        p.porte,
      ) +
      field("Cor", "cor", p.cor, "text", 'maxlength="120"') +
      field("Pelagem", "pelagem", p.pelagem, "text", 'maxlength="120"') +
      "</div>" +
      select(
        "Castrado",
        "castrado",
        [
          { value: "", label: "Não informado" },
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
        ],
        p.castrado === true ? "sim" : p.castrado === false ? "nao" : "",
      ) +
      '<div class="note">As informações abaixo são identificadas como fornecidas por você. Não alteram observações profissionais do estabelecimento.</div>' +
      textArea(
        "Alergias informadas",
        "alergiasInformadas",
        p.alergiasInformadas,
      ) +
      textArea("Restrições", "restricoes", p.restricoes) +
      textArea("Informações de saúde", "saude", p.saude) +
      textArea("Preferências de atendimento", "preferencias", p.preferencias) +
      textArea("Observações do tutor", "observacoesTutor", p.observacoesTutor) +
      '<button class="btn" type="submit">Salvar perfil do pet</button></form>'
    );
  }
  async function petDetail(id, area = "profile") {
    const p = pets.find((p) => p.id === Number(id));
    if (!p) return;
    open(
      p.nome,
      '<div class="row">' +
        avatar(p, true) +
        "<div><h2>" +
        esc(p.nome) +
        "</h2><small>" +
        esc(p.raca || p.especie) +
        '</small></div></div><div class="chips">' +
        [
          ["profile", "Perfil"],
          ["photos", "Galeria"],
          ["health", "Saúde e vacinas"],
          ["journey", "Jornada"],
        ]
          .map(
            ([a, l]) =>
              '<button class="chip ' +
              (area === a ? "selected" : "") +
              '" data-pet-area="' +
              a +
              '" data-id="' +
              p.id +
              '">' +
              l +
              "</button>",
          )
          .join("") +
        '</div><div id="pet-area"></div>',
    );
    modal.classList.add("pet-detail-dialog");
    const header = document.createElement("div");
    header.className = "pet-detail-hero";
    header.innerHTML =
      hero("pet", "", p) +
      '<div class="pet-detail-identity">' +
      avatar(p, true) +
      "<div><h2>" +
      esc(p.nome) +
      "</h2><p>" +
      esc(p.raca || p.especie || "Raça não informada") +
      '</p><div class="statline">' +
      (p.peso ? "<span>" + esc(p.peso) + " kg</span>" : "") +
      (p.data_nascimento
        ? "<span>" + esc(idade(p.data_nascimento)) + "</span>"
        : "") +
      "</div></div></div>";
    $("#modal-corpo").prepend(header);
    const target = $("#pet-area");
    if (area === "profile") {
      target.innerHTML =
        '<div class="statline"><span>' +
        esc(p.genero || "Sexo não informado") +
        "</span><span>" +
        esc(p.porte || "Porte não informado") +
        "</span><span>" +
        esc(p.peso ? Number(p.peso) + " kg" : "Peso não informado") +
        "</span><span>" +
        esc(
          p.data_nascimento
            ? "Nascimento: " +
                date(p.data_nascimento) +
                " · " +
                idade(p.data_nascimento)
            : "Nascimento não informado",
        ) +
        "</span></div>" +
        [
          ["Alergias informadas", p.alergiasInformadas],
          ["Restrições", p.restricoes],
          ["Saúde informada", p.saude],
          ["Preferências", p.preferencias],
          ["Observações do tutor", p.observacoesTutor],
        ]
          .filter(([, v]) => v)
          .map(
            ([l, v]) =>
              '<div class="note"><strong>' +
              l +
              "</strong><p>" +
              esc(v) +
              "</p></div>",
          )
          .join("") +
        '<button class="btn secondary" data-editpet="' +
        p.id +
        '">Editar perfil</button>';
      return;
    }
    try {
      if (area === "photos") {
        const rows = await api("/pets/" + id + "/fotos");
        if (!target.isConnected) return;
        target.innerHTML =
          '<form id="photo-form" data-id="' +
          id +
          '" class="form card"><label>Uma nova lembrança<input name="arquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required></label><small>Até 8 MB. A imagem será otimizada e armazenada com acesso privado.</small><button class="btn small" type="submit">Adicionar à galeria</button></form><div class="photos">' +
          rows
            .map(
              (f) =>
                '<div class="photo-wrap"><button data-fullphoto="' +
                esc(f.arquivo) +
                '"><img src="' +
                esc(f.arquivo) +
                '" alt="Foto de ' +
                esc(p.nome) +
                '" loading="lazy"></button><small>' +
                esc(
                  f.origem === "tutor"
                    ? "Enviada por você"
                    : "Compartilhada pelo pet shop",
                ) +
                '</small><div class="actions"><button class="link-btn" data-foto="' +
                f.id +
                '" data-petid="' +
                id +
                '" data-action="principal">Usar no perfil</button>' +
                (f.minha
                  ? '<button class="link-btn" data-foto="' +
                    f.id +
                    '" data-petid="' +
                    id +
                    '" data-action="remover">Remover</button>'
                  : "") +
                "</div></div>",
            )
            .join("") +
          "</div>" +
          (rows.length
            ? ""
            : empty("As fotos da galeria vão aparecer aqui.", "photo"));
      }
      if (area === "health") {
        const rows = await api("/pets/" + id + "/vacinas");
        if (!target.isConnected) return;
        target.innerHTML =
          '<div class="note warning">Esta carteira organiza informações. Ela não confirma proteção clínica. Consulte um veterinário para validar aplicações e reforços.</div><button class="btn small" data-newvacina="' +
          id +
          '">' +
          icon("plus") +
          ' Informar vacina</button><div class="timeline vaccine-timeline" style="margin-top:20px">' +
          rows
            .map((v) => {
              const status = !v.data_aplicacao
                ? "Informação incompleta"
                : v.proxima_dose
                  ? v.proxima_dose < today()
                    ? "Data de reforço ultrapassada"
                    : "Próxima dose: " + date(v.proxima_dose)
                  : "Próxima dose não informada";
              return (
                '<article class="card"><h3>' +
                esc(v.nome) +
                '</h3><span class="pill">' +
                esc(
                  v.origem === "estabelecimento"
                    ? "Registro do estabelecimento"
                    : v.origem === "tutor_conferida"
                      ? "Informado pelo tutor · conferido"
                      : "Informado pelo tutor · não verificado",
                ) +
                "</span><p>Aplicação: " +
                date(v.data_aplicacao) +
                "<br>Responsável: " +
                esc(v.responsavel || "Não informado") +
                '</p><div class="note ' +
                (v.proxima_dose && v.proxima_dose < today() ? "warning" : "") +
                '">' +
                esc(status) +
                "</div>" +
                (v.observacoes ? "<p>" + esc(v.observacoes) + "</p>" : "") +
                (v.comprovante
                  ? '<a target="_blank" rel="noopener" href="/api/cliente-app/pets/' +
                    id +
                    "/vacinas/" +
                    v.id +
                    '/comprovante">Ver comprovante</a>'
                  : "") +
                (v.minha && !v.conferidaEm
                  ? '<form class="proof-form form" data-id="' +
                    id +
                    '" data-vid="' +
                    v.id +
                    '"><label>Comprovante (imagem ou PDF)<input name="arquivo" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><button class="btn secondary small" type="submit">Enviar comprovante</button></form>'
                  : "") +
                "</article>"
              );
            })
            .join("") +
          (rows.length
            ? ""
            : empty("Nenhum registro de vacina encontrado.", "heart")) +
          "</div>";
      }
      if (area === "journey") {
        const [f, v] = await Promise.all([
          api("/pets/" + id + "/fotos"),
          api("/pets/" + id + "/vacinas"),
        ]);
        if (!target.isConnected) return;
        const events = [
          ...(p.criadoEm
            ? [
                {
                  date: p.criadoEm.slice(0, 10),
                  label: "Cadastro do pet",
                  detail: "Início da jornada no estabelecimento",
                },
              ]
            : []),
          ...pastAppointments()
            .filter((a) => a.petId === Number(id))
            .map((a) => ({
              date: a.data,
              label: a.servico,
              detail: states[a.status],
            })),
          ...f.map((f) => ({
            date: f.criadoEm.slice(0, 10),
            label: "Foto adicionada",
            detail: f.origem === "tutor" ? "Por você" : "Pelo estabelecimento",
          })),
          ...v
            .filter((v) => v.data_aplicacao)
            .map((v) => ({
              date: v.data_aplicacao,
              label: v.nome,
              detail:
                v.origem === "estabelecimento"
                  ? "Registro profissional"
                  : "Informação fornecida pelo tutor",
            })),
        ].sort((a, b) => b.date.localeCompare(a.date));
        target.innerHTML =
          "<h3>A jornada de " +
          esc(p.nome) +
          '</h3><div class="timeline">' +
          events
            .map(
              (e) =>
                '<article class="card"><small>' +
                date(e.date) +
                "</small><h3>" +
                esc(e.label) +
                "</h3><small>" +
                esc(e.detail) +
                "</small></article>",
            )
            .join("") +
          "</div>" +
          (events.length
            ? ""
            : empty(
                "A jornada será construída com os registros de " + p.nome + ".",
                "history",
              ));
      }
    } catch (e) {
      target.textContent = e.message;
    }
  }
  function vaccineForm(id) {
    return (
      '<form id="vaccine-form" data-id="' +
      id +
      '" class="form"><div class="note">Registro informado por você. O estabelecimento poderá conferir o comprovante.</div>' +
      field("Nome da vacina", "nome", "", "text", 'required maxlength="120"') +
      field(
        "Data da aplicação",
        "data_aplicacao",
        "",
        "date",
        'max="' + today() + '"',
      ) +
      '<div class="form-grid">' +
      field("Próxima dose registrada", "proxima_dose", "", "date") +
      field("Validade informada", "validade", "", "date") +
      "</div>" +
      field(
        "Clínica ou profissional responsável",
        "responsavel",
        "",
        "text",
        'maxlength="120"',
      ) +
      textArea("Observações", "observacoes") +
      '<small>Informe somente as datas orientadas pelo profissional. O app não calcula calendário veterinário.</small><button class="btn" type="submit">Salvar registro</button></form>'
    );
  }
  let slotsVersion = 0;
  async function loadSlots() {
    const form = $("#booking-form");
    if (!form) return;
    const b = Object.fromEntries(new FormData(form)),
      target = $("#slots"),
      my = ++slotsVersion;
    if (!b.data) return;
    target.textContent = "Consultando horários…";
    try {
      const r = await api(
        "/horarios?" +
          new URLSearchParams({
            petId: b.petId,
            servicoId: b.servicoId,
            data: b.data,
          }),
      );
      if (my !== slotsVersion || !target.isConnected) return;
      target.innerHTML =
        "<p>" +
        esc(r.mensagem) +
        '</p><div class="chips">' +
        r.horarios
          .map(
            (h) =>
              '<button type="button" class="chip" data-hour="' +
              h +
              '">' +
              h +
              "</button>",
          )
          .join("") +
        "</div>" +
        (r.horarios.length
          ? ""
          : "<p>Nenhuma opção disponível. Você pode enviar uma preferência para avaliação ou escolher outra data.</p>");
    } catch (e) {
      if (my === slotsVersion && target.isConnected)
        target.textContent = e.message;
    }
  }
  function serviceInfo() {
    const f = $("#booking-form");
    if (!f) return;
    const s = services.find((s) => s.id === f.elements.servicoId.value);
    $("#service-info").textContent = s
      ? s.duracao +
        " min estimados" +
        (s.preco !== null ? " · " + money(s.preco) : "")
      : "";
  }
  async function push() {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      throw new Error(
        "Este navegador não oferece push. Use a central de avisos do app. No iPhone, instale o app na tela inicial.",
      );
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error(
        "Notificações não autorizadas. Seus avisos continuam disponíveis no aplicativo.",
      );
    const { publicKey } = await api("/push/chave"),
      reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const base = publicKey.replace(/-/g, "+").replace(/_/g, "/"),
        bytes = Uint8Array.from(
          atob(base + "=".repeat((4 - (base.length % 4)) % 4)),
          (c) => c.charCodeAt(0),
        );
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      });
    }
    await api("/push", { method: "POST", body: sub.toJSON() });
    toast("Notificações ativadas neste aparelho.");
  }
  function installing() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.finally(() => (installPrompt = null));
      return;
    }
    open(
      "Leve o PetHub com você",
      '<div class="note"><strong>Android</strong><p>No Chrome, abra o menu ⋮ e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.</p></div><div class="note"><strong>iPhone / iPad</strong><p>No Safari, toque em Compartilhar e em “Adicionar à Tela de Início”. Abra o app pelo novo ícone.</p></div><small>O PetHub Cliente é separado do app do gestor. Para push no iPhone, use o app instalado na tela inicial, com iOS 16.4 ou posterior, e autorize as notificações.</small>',
    );
  }
  // Eventos delegados mantêm as telas independentes de bibliotecas do ERP.
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    try {
      if ("retryDados" in b.dataset) {
        await refresh();
        return;
      }
      if (b.dataset.openNotice) {
        const n = notifications.itens.find(
          (n) => String(n.id) === b.dataset.openNotice,
        );
        if (!n) return;
        if (!n.lida) {
          await api("/notificacoes/" + n.id + "/ler", {
            method: "POST",
            body: {},
          });
          n.lida = true;
          notifications.naoLidas = Math.max(0, notifications.naoLidas - 1);
          nav();
          render();
        }
        open(
          n.titulo,
          "<p>" + esc(n.texto) + "</p><small>" + time(n.criadoEm) + "</small>",
        );
        return;
      }
      if (b.hasAttribute("data-book-next")) {
        stepBooking(bookingStep + 1);
        return;
      }
      if (b.hasAttribute("data-book-prev")) {
        stepBooking(bookingStep - 1);
        return;
      }
      if (b.dataset.petFilter) {
        petFilter = b.dataset.petFilter;
        main.innerHTML = petsPage();
        return;
      }
      if (b.dataset.tab) {
        tab = b.dataset.tab;
        render();
        window.scrollTo({ top: 0, behavior: "instant" });
      } else if (b.hasAttribute("data-auth")) await showAuth(b.dataset.auth);
      else if (b.hasAttribute("data-newpet"))
        open("Um novo companheiro", petForm());
      else if (b.dataset.pet) await petDetail(b.dataset.pet);
      else if (b.dataset.petArea)
        await petDetail(b.dataset.id, b.dataset.petArea);
      else if (b.dataset.editpet) {
        const p = pets.find((p) => p.id === Number(b.dataset.editpet));
        open("Editar " + p.nome, petForm(p));
      } else if (b.dataset.newvacina)
        open("Informar vacina", vaccineForm(b.dataset.newvacina));
      else if (b.dataset.fullphoto)
        open(
          "Uma boa lembrança",
          '<img class="full-photo" src="' +
            esc(b.dataset.fullphoto) +
            '" alt="Foto do pet">',
        );
      else if (b.dataset.hour) {
        const f = $("#booking-form");
        f.elements.hora.value = b.dataset.hour;
        $("#slots")
          .querySelectorAll("button")
          .forEach((x) => x.classList.toggle("selected", x === b));
      } else if (b.dataset.foto) {
        if (
          b.dataset.action === "remover" &&
          !confirm("Remover esta foto da galeria?")
        )
          return;
        b.disabled = true;
        await api(
          "/pets/" + b.dataset.petid + "/fotos/" + b.dataset.foto + "/acao",
          { method: "POST", body: { acao: b.dataset.action } },
        );
        await refresh({ redraw: false });
        await petDetail(b.dataset.petid, "photos");
        toast("Foto atualizada.");
      } else if (b.dataset.request) {
        const p = requests.find((p) => p.id === b.dataset.request);
        if (!p) return;
        if (
          !confirm(
            b.dataset.action === "aceitar_proposta"
              ? "Confirmar o novo horário sugerido?"
              : b.dataset.action === "cancelar"
                ? "Cancelar esta solicitação?"
                : "Recusar a proposta de horário?",
          )
        )
          return;
        b.disabled = true;
        await api("/solicitacoes/" + p.id + "/acao", {
          method: "POST",
          body: {
            acao: b.dataset.action,
            versao: p.versao,
            propostaId: p.proposta?.id,
          },
        });
        await refresh();
        render();
        toast("Solicitação atualizada.");
      } else if (b.hasAttribute("data-read")) {
        await api("/notificacoes/ler", { method: "POST", body: {} });
        await refresh();
        render();
      } else if (b.hasAttribute("data-install")) installing();
      else if (b.hasAttribute("data-push")) {
        b.disabled = true;
        await push();
      } else if (b.hasAttribute("data-unpush")) {
        await api("/push", { method: "DELETE" });
        const sub = await (
          await navigator.serviceWorker.ready
        ).pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        toast("Notificações desativadas neste aparelho.");
      } else if (b.hasAttribute("data-logout")) {
        await api("/logout", { method: "POST", body: {} });
        loggedOut();
      }
    } catch (err) {
      toast(err.message);
      if (err.status === 401) loggedOut();
    } finally {
      if (b.isConnected) b.disabled = false;
    }
  });
  document.addEventListener(
    "error",
    (e) => {
      if (e.target.classList?.contains("hero-art")) {
        e.target.hidden = true;
        return;
      }
      if (e.target.tagName === "IMG" && e.target.classList.contains("avatar")) {
        const span = document.createElement("span");
        span.className = e.target.className;
        span.innerHTML = icon("pets");
        e.target.replaceWith(span);
      }
    },
    true,
  );
  $("#sino").onclick = () => {
    tab = "notifications";
    render();
  };
  document.addEventListener("input", (e) => {
    if (e.target.id === "pet-search") {
      petSearch = e.target.value.trim().toLocaleLowerCase("pt-BR");
      const rows = pets.filter(
        (p) =>
          (!petSearch ||
            [p.nome, p.raca, p.especie].some((v) =>
              String(v || "")
                .toLocaleLowerCase("pt-BR")
                .includes(petSearch),
            )) &&
          (petFilter !== "scheduled" ||
            appointments.some(
              (a) =>
                a.petId === p.id &&
                a.data >= today() &&
                ["agendado", "checkin", "pronto"].includes(a.status),
            )),
      );
      $("#pet-cards").innerHTML = petCards(rows);
    }
  });
  document.addEventListener("change", (e) => {
    if (
      e.target.closest("#booking-form") &&
      ["petId", "servicoId", "data"].includes(e.target.name)
    ) {
      serviceInfo();
      void loadSlots();
    }
    if (e.target.name === "history-pet") {
      const rows = pastAppointments().filter(
        (a) => !e.target.value || a.petId === Number(e.target.value),
      );
      $("#history-list").innerHTML = rows.length
        ? rows.map(appointmentCard).join("")
        : empty("Nenhum atendimento para este pet.", "history");
    }
  });
  document.addEventListener(
    "invalid",
    (e) => {
      const step = e.target.closest("[data-book-step]");
      if (step) stepBooking(Number(step.dataset.bookStep));
    },
    true,
  );
  document.addEventListener("submit", async (e) => {
    const f = e.target;
    if (
      !f.matches(
        "#auth-form,#pet-form,#vaccine-form,#profile-form,#booking-form,#confirm-booking,#photo-form,.proof-form",
      )
    )
      return;
    e.preventDefault();
    await submitting(f, async () => {
      const b = Object.fromEntries(new FormData(f));
      if (f.id === "auth-form") {
        const mode = f.dataset.mode;
        if (mode === "invite") {
          if (b.senha !== b.confirmar)
            throw new Error("As senhas precisam ser iguais.");
          const r = await api("/convite", {
            method: "POST",
            body: { token: invite, senha: b.senha },
          });
          atualizarLoja(r.loja);
          emailLogin = r.email || "";
          invite = null;
          toast("Senha definida. Entre com seu e-mail e sua nova senha.");
          await showAuth("login");
        } else if (mode === "recovery") {
          await api("/recuperar", {
            method: "POST",
            body: { loja: b.loja || loja, email: b.email },
          });
          open(
            "Recuperação de acesso",
            '<div class="note">Se houver um acesso com esses dados, a equipe receberá sua solicitação. Entre em contato com o pet shop para receber um novo convite seguro.</div>',
          );
        } else {
          await api("/login", {
            method: "POST",
            body: { loja: b.loja || loja, email: b.email, senha: b.senha },
          });
          await startSession();
        }
        return;
      }
      if (f.id === "pet-form") {
        const id = f.dataset.id,
          p = pets.find((p) => p.id === Number(id));
        b.castrado =
          b.castrado === "sim" ? true : b.castrado === "nao" ? false : null;
        if (p) b.etag = f.dataset.etag;
        await api("/pets" + (id ? "/" + id : ""), {
          method: id ? "PUT" : "POST",
          body: b,
        });
        modal.close();
        await refresh();
        render();
        toast("Perfil do pet salvo.");
      }
      if (f.id === "profile-form") {
        const r = await api("/perfil", {
          method: "PUT",
          body: { ...b, etag: f.dataset.etag },
        });
        session.perfil = r;
        render();
        toast("Seus dados foram atualizados.");
      }
      if (f.id === "vaccine-form") {
        await api("/pets/" + f.dataset.id + "/vacinas", {
          method: "POST",
          body: b,
        });
        await petDetail(f.dataset.id, "health");
        toast("Registro salvo como informado pelo tutor.");
      }
      if (f.id === "photo-form" || f.classList.contains("proof-form")) {
        const path =
          "/pets/" +
          f.dataset.id +
          (f.id === "photo-form"
            ? "/fotos"
            : "/vacinas/" + f.dataset.vid + "/comprovante");
        await api(path, {
          method: "POST",
          body: new FormData(f),
          timeout: 65000,
        });
        await refresh({ redraw: false });
        await petDetail(
          f.dataset.id,
          f.id === "photo-form" ? "photos" : "health",
        );
        toast("Arquivo salvo com sucesso.");
      }
      if (f.id === "booking-form") {
        if (bookingStep < 5) {
          stepBooking(bookingStep + 1);
          return;
        }
        const s = services.find((s) => s.id === b.servicoId);
        if (!s) throw new Error("Selecione novamente um serviço disponível.");
        bookingKey = crypto.randomUUID();
        open(
          "Confira seu pedido",
          '<div class="card"><h3>' +
            esc(petName(b.petId)) +
            "</h3><p>" +
            esc(s.nome) +
            "<br>" +
            when(b.data, b.hora) +
            "</p><p>" +
            esc(b.observacao || "Sem observações adicionais.") +
            '</p></div><div class="note warning">Esta é uma solicitação. Aguarde a confirmação do estabelecimento.</div><form id="confirm-booking"><button class="btn wide" type="submit">Enviar solicitação</button></form>',
        );
        $("#confirm-booking").pedido = b;
      }
      if (f.id === "confirm-booking") {
        const r = await api("/solicitacoes", {
          method: "POST",
          body: { ...f.pedido, idempotencia: bookingKey },
        });
        modal.close();
        tab = "requests";
        await refresh();
        render();
        toast(
          r.estado === "PENDENTE"
            ? "Solicitação enviada! A equipe analisará seu pedido."
            : "Solicitação já registrada.",
        );
      }
    });
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
  });
  window.addEventListener("offline", () => {
    $("#conexao").hidden = false;
  });
  window.addEventListener("online", () => {
    $("#conexao").hidden = true;
    if (session) void refresh();
    else void startSession();
  });
  $("#conexao").hidden = navigator.onLine;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && session) void refresh();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/cliente-app/service-worker.js", { scope: "/cliente-app/" })
      .then((r) => {
        registration = r;
        r.addEventListener("updatefound", () => {
          const w = r.installing;
          w?.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) {
              toast(
                "Nova versão disponível. Feche e reabra o app para atualizar.",
              );
            }
          });
        });
      })
      .catch(() => {});
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data === "ATUALIZAR_DADOS") void refresh();
    });
  }
  if (invite) void showAuth("invite");
  else void startSession();
})();
