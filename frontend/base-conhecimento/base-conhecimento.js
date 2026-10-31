// ================================================================
//  BASE DE CONHECIMENTO PETHUB — LÓGICA PRINCIPAL (DESIGN PREMIUM)
// ================================================================
(function () {
  "use strict";

  const KB = {
    CONFIG: {
      artigosPath: "/base-conhecimento/data/artigos.json",
      artigosDir: "/base-conhecimento/artigos/",
      debounceMs: 250,
    },

    state: {
      artigos: [],
      categorias: {},
      currentPage: "home",
      currentCategory: null,
      currentArticle: null,
    },

    categoriasMeta: {
      dashboard: { icon: "📊", name: "Dashboard", desc: "Visão geral do sistema, widgets e métricas do seu negócio." },
      agenda: { icon: "📅", name: "Agenda", desc: "Gerencie agendamentos, check-in, check-out e muito mais." },
      clientes: { icon: "👥", name: "Clientes", desc: "Cadastro e gestão completa de clientes." },
      pets: { icon: "🐶", name: "Pets", desc: "Cadastro e gestão de pets, raças, pelagens e boxes." },
      produtos: { icon: "📦", name: "Produtos", desc: "Cadastro de produtos, serviços, planos e comissões." },
      estoque: { icon: "📋", name: "Estoque", desc: "Controle de entrada, saída, transferência e validade." },
      clinica: { icon: "💊", name: "Clínica", desc: "Medicamentos, vacinas e periodicidade." },
      vendas: { icon: "🛒", name: "Vendas", desc: "Nova venda, consulta, devolução e orçamentos." },
      caixa: { icon: "💰", name: "Caixa", desc: "Abertura, fechamento, suprimento e sangria de caixa." },
      compras: { icon: "📥", name: "Compras", desc: "Entrada de mercadoria e cadastro de fornecedores." },
      financeiro: { icon: "📈", name: "Financeiro", desc: "Contas a receber/pagar, cartão, haver e crediário." },
      marketing: { icon: "📢", name: "Marketing", desc: "WhatsApp, disparo de mensagens e automações." },
      relatorios: { icon: "📊", name: "Relatórios", desc: "Relatórios de venda, atendimento, comissão e mais." },
      configuracoes: { icon: "⚙", name: "Configurações", desc: "Configure empresa, usuários, PDV, feriados e mais." },
      mobile: { icon: "📱", name: "App do Gestor", desc: "Aplicativo mobile para acompanhamento do dia a dia." },
      notificacoes: { icon: "🔔", name: "Notificações", desc: "Push notifications e lembretes automáticos." },
      "painel-admin": { icon: "🛡️", name: "Painel Admin", desc: "Administração de empresas e controle do sistema." },
    },

    dicas: [
      { icon: "💡", text: "Use os atalhos de teclado para agilizar o atendimento no balcão." },
      { icon: "⭐", text: "Clientes frequentes podem ser marcados com grupo de cliente para descontos especiais." },
      { icon: "🔔", text: "Ative as notificações push para não perder nenhum agendamento." },
      { icon: "📱", text: "Baixe o App do Gestor para acompanhar o movimento do seu pet shop de qualquer lugar." },
    ],

    novidades: [
      { icon: "🎉", title: "App do Gestor", desc: "A versão mobile do PetHub já está disponível.", date: "Jul/2026" },
      { icon: "🤖", title: "Automação de Marketing", desc: "Dispare mensagens automáticas para clientes.", date: "Jun/2026" },
      { icon: "📊", title: "Painel Financeiro", desc: "Acompanhe suas finanças em tempo real.", date: "Mai/2026" },
      { icon: "📱", title: "Push Notifications", desc: "Receba notificações no celular sobre agendamentos.", date: "Abr/2026" },
    ],

    heroSuggestions: [
      { text: "Agendamento", category: "agenda" },
      { text: "WhatsApp", category: "marketing" },
      { text: "Financeiro", category: "financeiro" },
      { text: "Produtos", category: "produtos" },
      { text: "Relatórios", category: "relatorios" },
    ],

    async init() {
      try {
        await this.carregarArtigos();
        this.renderHome();
        this.setupSearch();
        this.setupNavigation();
        this.setupNavbar();
        this.setupMobileMenu();
        this.hideLoading();
      } catch (err) {
        console.error("[KB] Erro:", err);
        this.showError("Não foi possível carregar a base de conhecimento.");
      }
    },

    setupNavbar() {
      const navbar = document.getElementById("kbNavbar");
      if (!navbar) return;
      let ticking = false;
      window.addEventListener("scroll", () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            navbar.classList.toggle("scrolled", window.scrollY > 20);
            ticking = false;
          });
          ticking = true;
        }
      });
    },

    setupMobileMenu() {
      const toggle = document.getElementById("kbNavToggle");
      const menu = document.querySelector(".kb-navbar-center");
      const overlay = document.getElementById("kbMobileOverlay");
      if (!toggle || !menu) return;
      const close = () => { menu.classList.remove("open"); toggle.classList.remove("open"); if (overlay) overlay.classList.remove("open"); };
      toggle.addEventListener("click", () => { menu.classList.toggle("open"); toggle.classList.toggle("open"); if (overlay) overlay.classList.toggle("open"); });
      if (overlay) overlay.addEventListener("click", close);
      menu.querySelectorAll(".kb-nav-link").forEach((l) => l.addEventListener("click", close));
    },

    async carregarArtigos() {
      const resp = await fetch(KB.CONFIG.artigosPath);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      KB.state.artigos = data.artigos || [];
      KB.state.categorias = {};
      for (const art of KB.state.artigos) {
        const cat = art.category || "outros";
        if (!KB.state.categorias[cat]) KB.state.categorias[cat] = [];
        KB.state.categorias[cat].push(art);
      }
    },

    renderHome() {
      const content = document.getElementById("kbContent");
      if (!content) return;
      const featured = KB.state.artigos.slice(0, 6);
      const topArticles = KB.state.artigos.slice(6, 10);
      const thumbs = ["📋", "📝", "🎯", "📊", "💡", "⚡"];
      const types = ["tutorial", "guide", "video"];
      const labels = ["Passo a passo", "Guia Completo", "Vídeo Tutorial"];

      content.innerHTML = `
        <section class="kb-hero">
          <div class="kb-hero-content">
            <h1 class="kb-hero-title">Como podemos ajudar você hoje?</h1>
            <p class="kb-hero-subtitle">Encontre tutoriais, vídeos e respostas sobre todas as funcionalidades do PetHub.</p>
            <div class="kb-hero-search-wrapper">
              <span class="kb-hero-search-icon">🔍</span>
              <input type="text" class="kb-hero-search-input" id="kbSearchInput"
                     placeholder="Pesquise por artigos, tutoriais, funcionalidades..."
                     autocomplete="off" aria-label="Pesquisar">
              <button class="kb-hero-search-clear" id="kbSearchClear" aria-label="Limpar pesquisa">✕</button>
              <div class="kb-search-results" id="kbSearchResults"></div>
            </div>
            <div class="kb-hero-suggestions">
              <span class="kb-hero-suggestions-label">Sugestões:</span>
              ${this.heroSuggestions.map((s) => `<a href="#" class="kb-hero-tag" data-category="${s.category}">${this.esc(s.text)}</a>`).join("")}
            </div>
          </div>
          <div class="kb-hero-mascot">
            <img src="/mascote pethub/mascote-pethub.png" alt="Mascote PetHub" loading="eager">
          </div>
        </section>

        <div class="kb-layout">
          <div class="kb-layout-main">
            <h2 class="kb-section-title"><span class="kb-section-icon">📂</span> Navegue por módulo</h2>
            <div class="kb-categories-grid" id="kbCategoriesGrid">${this.renderCategorias()}</div>

            <h2 class="kb-section-title"><span class="kb-section-icon">�</span> Dicas Rápidas</h2>
            <div class="kb-tips-grid">${KB.dicas.map((t) => `<div class="kb-tip-card"><span class="kb-tip-icon">${t.icon}</span><span>${this.esc(t.text)}</span></div>`).join("")}</div>

            <h2 class="kb-section-title"><span class="kb-section-icon">🔥</span> Artigos em Destaque</h2>
            <div class="kb-featured-grid">
              ${featured.map((art, i) => {
                const m = KB.categoriasMeta[art.category] || {};
                const ti = i % 3;
                return `<a href="#" class="kb-featured-card" data-article="${art.slug}" data-category="${art.category}">
                  <div class="kb-feat-thumb">${thumbs[i % thumbs.length]}</div>
                  <div class="kb-feat-body">
                    <span class="kb-feat-category">${m.icon || ""} ${m.name || art.category}</span>
                    <div class="kb-feat-title">${this.esc(art.title)}</div>
                    <div class="kb-feat-desc">${this.esc(art.description)}</div>
                    <div class="kb-feat-meta"><span>⏱ ${art.readingTime || "—"}</span><span class="kb-feat-type ${types[ti]}">${labels[ti]}</span></div>
                  </div>
                </a>`;
              }).join("")}
            </div>
          </div>

          <aside class="kb-layout-sidebar">
            <div class="kb-sidebar-section">
              <h3 class="kb-sidebar-title">🔥 Mais acessados</h3>
              <div class="kb-sidebar-list">
                ${topArticles.map((art) => {
                  const m = KB.categoriasMeta[art.category] || {};
                  return `<a href="#" class="kb-sidebar-item" data-article="${art.slug}" data-category="${art.category}"><span class="kb-sidebar-icon">${art.icon || m.icon || "📄"}</span>${this.esc(art.title)}</a>`;
                }).join("")}
              </div>
            </div>
            <div class="kb-sidebar-section">
              <h3 class="kb-sidebar-title">� Novidades</h3>
              ${KB.novidades.map((n) => `<div class="kb-sidebar-news-item"><span class="kb-news-icon">${n.icon}</span><div class="kb-news-content"><div class="kb-news-title">${this.esc(n.title)}</div><div class="kb-news-desc">${this.esc(n.desc)}</div><div class="kb-news-date">${n.date}</div></div></div>`).join("")}
            </div>
          </aside>
        </div>
      `;

      KB.state.currentPage = "home";
      this.updateBreadcrumb();
      this.setupSearch();
      this.setupNavigation();
      this.animateCards();
    },

    animateCards() {
      document.querySelectorAll(".kb-category-card, .kb-featured-card, .kb-tip-card").forEach((card, i) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        card.style.transitionDelay = (i * 0.05) + "s";
        setTimeout(() => { card.style.opacity = "1"; card.style.transform = "translateY(0)"; }, 50);
      });
    },

    renderCategorias() {
      const order = Object.keys(KB.categoriasMeta);
      return order.filter((cat) => KB.state.categorias[cat] && KB.state.categorias[cat].length > 0).map((cat) => {
        const meta = KB.categoriasMeta[cat] || { icon: "📁", name: cat, desc: "" };
        const count = KB.state.categorias[cat].length;
        return `<a href="#" class="kb-category-card" data-category="${cat}"><span class="kb-cat-icon-wrap">${meta.icon}</span><div class="kb-cat-info"><div class="kb-cat-name">${this.esc(meta.name)}</div><div class="kb-cat-desc">${this.esc(meta.desc)}</div></div><span class="kb-cat-count">${count} artigo${count !== 1 ? "s" : ""}</span></a>`;
      }).join("");
    },

    renderCategoria(category) {
      const content = document.getElementById("kbContent");
      if (!content) return;
      const artigos = KB.state.categorias[category];
      if (!artigos || !artigos.length) { this.showError("Categoria não encontrada."); return; }
      const meta = KB.categoriasMeta[category] || { icon: "📁", name: category, desc: "" };
      content.innerHTML = `<div class="kb-category-page"><div class="kb-category-header"><span class="kb-cat-icon-large">${meta.icon}</span><div class="kb-cat-info"><h1>${this.esc(meta.name)}</h1><p>${this.esc(meta.desc)}</p></div></div>
        <div class="kb-article-list">${artigos.map((art) => `<a href="#" class="kb-article-list-item" data-article="${art.slug}" data-category="${category}"><span class="kb-list-icon">${art.icon || meta.icon || "📄"}</span><div class="kb-list-info"><div class="kb-list-title">${this.esc(art.title)}</div><div class="kb-list-desc">${this.esc(art.description)}</div></div><div class="kb-list-meta"><span>⏱ ${art.readingTime || "—"}</span></div></a>`).join("")}</div></div>`;
      KB.state.currentPage = "category";
      KB.state.currentCategory = category;
      this.updateBreadcrumb(category);
      this.setupNavigation();
    },

    async renderArtigo(category, slug) {
      const content = document.getElementById("kbContent");
      if (!content) return;
      const artigos = KB.state.categorias[category] || [];
      const artigo = artigos.find((a) => a.slug === slug);
      if (!artigo) { this.showError("Artigo não encontrado."); return; }
      content.innerHTML = `<div class="kb-loading"><div class="kb-loading-spinner"></div><p>Carregando artigo...</p></div>`;
      try {
        const resp = await fetch(KB.CONFIG.artigosDir + category + "/" + slug + ".md");
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        let md = await resp.text();
        md = md.replace(/^---[\s\S]*?---\s*/m, "");
        const html = marked.parse(md, { breaks: true, gfm: true });
        const relacionados = artigos.filter((a) => a.slug !== slug).slice(0, 4);
        const meta = KB.categoriasMeta[category] || {};
        content.innerHTML = `<div class="kb-article-page"><div class="kb-article-header"><h1>${artigo.icon || meta.icon || ""} ${this.esc(artigo.title)}</h1><p class="kb-article-desc">${this.esc(artigo.description)}</p>
          <div class="kb-article-meta-bar"><span>⏱ ${artigo.readingTime || "—"}</span><span style="color:var(--kb-text);font-weight:600;">${artigo.level || "Iniciante"}</span><span>📂 ${meta.name || category}</span></div></div>
          <div class="kb-article-content">${html}</div>
          ${relacionados.length ? `<div class="kb-related-articles"><h3>📚 Artigos Relacionados</h3><div class="kb-related-grid">${relacionados.map((r) => `<a href="#" class="kb-related-item" data-article="${r.slug}" data-category="${category}"><span class="kb-rel-icon">${r.icon || meta.icon || "📄"}</span><span class="kb-rel-title">${this.esc(r.title)}</span></a>`).join("")}</div></div>` : ""}</div>`;
        KB.state.currentPage = "article";
        KB.state.currentCategory = category;
        KB.state.currentArticle = slug;
        this.updateBreadcrumb(category, artigo.title);
        this.setupNavigation();
        this.setupFaqAccordion();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        console.error("[KB] Erro artigo:", err);
        this.showError("Erro ao carregar o artigo.");
      }
    },

    setupFaqAccordion() {
      document.querySelectorAll(".kb-faq-question").forEach((q) => {
        q.addEventListener("click", function () {
          const a = this.nextElementSibling;
          const open = a.classList.contains("open");
          document.querySelectorAll(".kb-faq-answer.open").forEach((x) => { x.classList.remove("open"); x.previousElementSibling.classList.remove("open"); });
          if (!open) { a.classList.add("open"); this.classList.add("open"); }
        });
      });
    },

    setupNavigation() {
      document.querySelectorAll("[data-category]:not([data-article])").forEach((el) => {
        el.removeEventListener("click", KB._navHandler);
        el.addEventListener("click", KB._navHandler = function (e) { e.preventDefault(); KB.renderCategoria(this.dataset.category); });
      });
      document.querySelectorAll("[data-article]").forEach((el) => {
        el.removeEventListener("click", KB._artHandler);
        el.addEventListener("click", KB._artHandler = function (e) { e.preventDefault(); const s = this.dataset.article, c = this.dataset.category; if (s && c) KB.renderArtigo(c, s); });
      });
    },

    setupSearch() {
      const input = document.getElementById("kbSearchInput");
      const results = document.getElementById("kbSearchResults");
      const clear = document.getElementById("kbSearchClear");
      if (!input || !results) return;
      let timer = null;
      const search = () => {
        const q = input.value.trim().toLowerCase();
        if (clear) clear.classList.toggle("visible", q.length > 0);
        if (q.length < 2) { results.classList.remove("visible"); return; }
        const found = KB.state.artigos.filter((a) => (a.title + " " + a.description + " " + (a.tags || []).join(" ") + " " + a.category).toLowerCase().includes(q)).slice(0, 8);
        results.innerHTML = found.length ? found.map((a) => { const m = KB.categoriasMeta[a.category] || {}; return `<a href="#" class="kb-search-result-item" data-article="${a.slug}" data-category="${a.category}"><span class="kb-result-icon">${a.icon || m.icon || "📄"}</span><div class="kb-result-info"><div class="kb-result-title">${this.highlight(a.title, q)}</div><div class="kb-result-category"><span>${m.name || a.category}</span></div></div></a>`; }).join("") : `<div class="kb-search-no-results"><span class="kb-no-results-icon">🔍</span>Nenhum resultado para "${this.esc(q)}"</div>`;
        results.classList.add("visible");
        this.setupNavigation();
      };
      input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => search.call(this), KB.CONFIG.debounceMs); });
      input.addEventListener("focus", () => { if (input.value.trim().length >= 2) results.classList.add("visible"); });
      document.addEventListener("click", (e) => { if (!e.target.closest(".kb-hero-search-wrapper, .kb-search-wrapper")) results.classList.remove("visible"); });
      input.addEventListener("keydown", (e) => { if (e.key === "Escape") { results.classList.remove("visible"); input.blur(); } });
      if (clear) clear.addEventListener("click", () => { input.value = ""; results.classList.remove("visible"); clear.classList.remove("visible"); input.focus(); });
    },

    updateBreadcrumb(category, articleTitle) {
      const bc = document.getElementById("kbBreadcrumb");
      if (!bc) return;
      const meta = KB.categoriasMeta[category] || {};
      if (!category) { bc.innerHTML = '<a href="/base-conhecimento/index.html">Início</a>'; return; }
      if (!articleTitle) { bc.innerHTML = '<a href="/base-conhecimento/index.html" id="kbBreadcrumbHome">Início</a><span class="kb-separator">›</span><span class="kb-current">' + (meta.icon || "") + " " + this.esc(meta.name || category) + '</span>'; const h = document.getElementById("kbBreadcrumbHome"); if (h) h.addEventListener("click", (e) => { e.preventDefault(); KB.renderHome(); }); return; }
      bc.innerHTML = '<a href="/base-conhecimento/index.html" id="kbBreadcrumbHome">Início</a><span class="kb-separator">›</span><a href="#" id="kbBreadcrumbCat" data-category="' + category + '">' + (meta.icon || "") + " " + this.esc(meta.name || category) + '</a><span class="kb-separator">›</span><span class="kb-current">' + this.esc(articleTitle) + "</span>";
      const cl = document.getElementById("kbBreadcrumbCat"); if (cl) cl.addEventListener("click", (e) => { e.preventDefault(); KB.renderCategoria(category); });
      const hl = document.getElementById("kbBreadcrumbHome"); if (hl) hl.addEventListener("click", (e) => { e.preventDefault(); KB.renderHome(); });
    },

    esc(str) { if (!str) return ""; return String(str).replace(/&/g, '\x26amp;').replace(/</g, '\x26lt;').replace(/>/g, '\x26gt;').replace(/"/g, '\x26quot;').replace(/'/g, '\x26#39;'); },
    highlight(text, query) { if (!text || !query) return this.esc(text); const e = this.esc(text); const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); return e.replace(new RegExp("(" + q + ")", "gi"), "<strong style='color:#f59e0b'>$1</strong>"); },
    hideLoading() { const l = document.getElementById("kbLoading"); if (l) l.style.display = "none"; },
    showError(msg) { const c = document.getElementById("kbContent"); if (!c) return; c.innerHTML = '<div class="kb-empty"><span class="kb-empty-icon">😕</span><p>' + this.esc(msg) + '</p><a href="/base-conhecimento/index.html" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#f59e0b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Voltar à Central de Ajuda</a></div>'; this.hideLoading(); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => KB.init()); else KB.init();
  window.KB = KB;
})();