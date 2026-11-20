/* Layout only: existing forms and API contracts remain independent. */
(function () {
  "use strict";
  if (window.PortalConfigLayout) return;
  const labels = {
    geral: "Geral",
    agendamentos: "Agendamentos",
    aparencia: "Aparência",
    notificacoes: "Notificações",
  };
  let current = "geral",
    root,
    observer;
  const dirty = new Set(),
    revisions = new Map();
  function mark(id) {
    revisions.set(id, (revisions.get(id) || 0) + 1);
    dirty.add(id);
    const f = document.getElementById(id);
    if (f) f.dataset.pcDirty = "1";
    updateDirty();
  }
  function updateDirty() {
    const el = document.getElementById("pc-dirty");
    if (el)
      el.textContent = dirty.size ? "Alterações não salvas" : "Tudo salvo";
    document.querySelectorAll("[data-pc-tab]").forEach((b) => {
      const key = b.dataset.pcTab,
        pending =
          (dirty.has("pc-config-form") &&
            ["geral", "agendamentos"].includes(key)) ||
          (key === "aparencia" &&
            (dirty.has("pc-aparencia-form") || dirty.has("pc-visuais-form"))) ||
          (key === "notificacoes" &&
            (dirty.has("pc-som-form") || dirty.has("pc-mp3-form")));
      b.textContent = labels[key] + (pending ? " •" : "");
    });
  }
  function select(key, focus = false) {
    if (!labels[key] || !root) return;
    current = key;
    root
      .querySelectorAll("[data-pc-panel]")
      .forEach((p) => (p.hidden = p.dataset.pcPanel !== key));
    const form = root.querySelector("#pc-config-form");
    if (form) form.hidden = !["geral", "agendamentos"].includes(key);
    root.querySelectorAll("[data-pc-tab]").forEach((b) => {
      const on = b.dataset.pcTab === key;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
  }
  function details(title, nodes) {
    const d = document.createElement("details"),
      s = document.createElement("summary");
    s.textContent = title;
    d.append(s, ...nodes);
    return d;
  }
  function relocate() {
    const blocks = root.querySelector("#pc-bloqueios"),
      summary = blocks?.closest("details")?.querySelector("summary");
    if (summary) {
      const title = "Bloqueios de agenda (" + blocks.children.length + ")";
      if (summary.textContent !== title) summary.textContent = title;
    }
    for (const [id, key] of [
      ["pc-aparencia", "aparencia"],
      ["pc-som-config", "notificacoes"],
    ]) {
      const el = root.querySelector("#" + id),
        panel = root.querySelector('[data-pc-panel="' + key + '"]');
      if (el && panel && el.parentElement !== panel) panel.replaceChildren(el);
    }
  }
  function mount(target) {
    if (!document.body.classList.contains("pc-settings")) return;
    root = target;
    const form = root.querySelector("#pc-config-form");
    if (!form || root.querySelector("[data-pc-tab]")) return;
    const children = [...form.children],
      cards = children.filter((n) => n.classList.contains("pc-card"));
    if (cards.length < 3) return;
    [...root.children]
      .filter((n) => n.matches("h1,p.pc-muted"))
      .forEach((n) => n.remove());
    const tabs = document.createElement("div");
    tabs.className = "pc-config-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Categorias das configurações");
    for (const [key, label] of Object.entries(labels)) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.pcTab = key;
      b.id = "pc-tab-" + key;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "pc-panel-" + key);
      b.textContent = label;
      tabs.append(b);
    }
    root.prepend(tabs);
    const panels = {};
    for (const key of Object.keys(labels)) {
      const panel = document.createElement("section");
      panel.dataset.pcPanel = key;
      panel.id = "pc-panel-" + key;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "pc-tab-" + key);
      panels[key] = panel;
      if (["geral", "agendamentos"].includes(key)) form.append(panel);
      else root.append(panel);
    }
    panels.geral.append(cards[0]);
    panels.agendamentos.append(cards[1], cards[2]);
    cards[1].classList.add("pc-availability");
    cards[2].classList.add("pc-services");
    const holidays = cards[1].querySelector("[name=feriados]").closest("label");
    const blocks = cards[1].querySelector("#pc-bloqueios"),
      title = blocks.previousElementSibling,
      add = blocks.nextElementSibling;
    const count = blocks.children.length;
    title.remove();
    cards[1].append(
      details("Feriados e dias fechados", [holidays]),
      details("Bloqueios de agenda (" + count + ")", [blocks, add]),
    );
    const footer = document.createElement("div");
    footer.className = "pc-config-save";
    for (const n of children) if (!cards.includes(n)) footer.append(n);
    const submit = footer.querySelector("[type=submit]");
    submit.textContent = "Salvar acesso e agenda";
    form.append(footer);
    for (const key of ["aparencia", "notificacoes"])
      panels[key].innerHTML =
        '<p class="pc-muted" role="status">Carregando configurações…</p>';
    relocate();
    observer?.disconnect();
    observer = new MutationObserver(relocate);
    observer.observe(root, { childList: true, subtree: true });
    select(current);
    updateDirty();
  }
  document.addEventListener("pethub:config-portal", (e) =>
    mount(e.detail.target),
  );
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pc-tab]");
    if (b) select(b.dataset.pcTab);
    if (e.target.closest("[data-pc-addblock],[data-pc-removeblock]")) {
      mark("pc-config-form");
    }
    if (e.target.closest("[data-paleta-preset]")) {
      mark("pc-aparencia-form");
    }
  });
  document.addEventListener("keydown", (e) => {
    const b = e.target.closest("[data-pc-tab]");
    if (!b) return;
    const keys = Object.keys(labels);
    let i = keys.indexOf(current);
    if (e.key === "ArrowRight") i = (i + 1) % keys.length;
    else if (e.key === "ArrowLeft") i = (i + keys.length - 1) % keys.length;
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = keys.length - 1;
    else return;
    e.preventDefault();
    select(keys[i], true);
  });
  function changed(e) {
    const f = e.target.closest("form");
    if (root?.contains(f)) {
      mark(f.id);
    }
  }
  document.addEventListener("input", changed);
  document.addEventListener("change", changed);
  document.addEventListener(
    "submit",
    (e) => {
      if (root?.contains(e.target))
        e.target.dataset.pcSubmitRevision = String(
          revisions.get(e.target.id) || 0,
        );
    },
    true,
  );
  document.addEventListener("pethub:config-salva", (e) => {
    const f = e.detail.form;
    if (
      Number(f.dataset.pcSubmitRevision || 0) === (revisions.get(f.id) || 0)
    ) {
      dirty.delete(f.id);
      delete f.dataset.pcDirty;
    }
    updateDirty();
  });
  // Hidden tabs/details must open before native validation attempts to focus a field.
  document.addEventListener(
    "invalid",
    (e) => {
      const panel = e.target.closest("[data-pc-panel]");
      if (panel) {
        select(panel.dataset.pcPanel);
        let p = e.target.parentElement;
        while (p && p !== panel) {
          if (p.tagName === "DETAILS") p.open = true;
          p = p.parentElement;
        }
      }
    },
    true,
  );
  window.addEventListener("beforeunload", (e) => {
    if (dirty.size) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.PortalConfigLayout = { mount, select };
  const target = document.getElementById("pc-config");
  if (target?.querySelector("#pc-config-form")) mount(target);
})();
