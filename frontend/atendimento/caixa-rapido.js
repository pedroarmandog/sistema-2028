/* Interfaces do mesmo caixa: os controles originais são movidos, nunca clonados. */
(() => {
  "use strict";
  if (window.__petHubCaixaInstalado) return;
  window.__petHubCaixaInstalado = true;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const money = (n) =>
    Number(n || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const button = (label, fn, cls = "") => {
    const b = el("button", cls, label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  };
  let layout = "classico",
    selected = null,
    busy = false,
    catalog = [],
    queue = Promise.resolve(),
    timer,
    initialized = false;
  let results = [],
    resultIndex = 0,
    resultsOpen = false,
    inputRevision = 0,
    lastTyped = "";
  const origins = [],
    api = () => window.PetHubVenda;
  const notify = (message, type = "info") =>
    window.mostrarNotificacao(type, message);
  const endpoint = () => ApiClient.request("/vendas/preferencias/layout-caixa");
  function focus(node) {
    node?.focus();
    node?.select?.();
  }
  function move(selector, target) {
    const n = $(selector);
    if (!n) return;
    const anchor = document.createComment("posição original do controle");
    n.before(anchor);
    origins.push([n, anchor]);
    target.append(n);
  }
  async function refreshCatalog() {
    catalog = (await api().produtos()).filter(
      (p) => ![false, "nao", "não", "inativo", 0].includes(p.ativo),
    );
    renderProducts($("#pesquisarProduto")?.value || "");
    renderCart();
  }
  function codes(p) {
    let more = p.codigosBarras || [];
    if (typeof more === "string") {
      try {
        more = JSON.parse(more);
      } catch (_) {
        more = [];
      }
    }
    return [
      p.id,
      p.codigo,
      p.codigoBarras,
      p.codigo_barras,
      p.ean,
      p.gtin,
      ...(Array.isArray(more) ? more : []),
    ];
  }
  function modalOpen() {
    return !!$(
      "dialog[open], #modalPagamento, #modalVendaFinalizada, #pdfModalVendaOverlay, .hc-open",
    );
  }
  function returnToSearch() {
    if (layout !== "rapido" || modalOpen()) return;
    const active = document.activeElement;
    if (active === $("#pesquisarProduto")) return;
    if (
      active &&
      active !== document.body &&
      active !== $("#pesquisarProduto") &&
      !active.closest("#qr-products, #qr-cart, .action-buttons")
    )
      return;
    focus($("#pesquisarProduto"));
  }
  function imageSource(p) {
    if (window.PetHubProdutoImagem && p.imagem) return window.PetHubProdutoImagem.url(p, "miniatura");
    const ref = [p.imagem_url, p.foto_url, p.imagem, p.foto, p.imagemUrl].find(
      (v) => typeof v === "string" && v.trim(),
    );
    if (!ref) return "";
    const src = ref.trim();
    if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(src)) return src;
    if (/^[a-z]+:/i.test(src) && !/^https?:\/\//i.test(src)) return "";
    if (
      src.startsWith("//") ||
      src.includes("\\") ||
      /(^|\/)\.\.(\/|$)/.test(src)
    )
      return "";
    try {
      const base = new URL(
        window.__API_BASE__ || "/api",
        window.location.origin,
      );
      const path =
        /^https?:\/\//i.test(src) || src.startsWith("/")
          ? src
          : src.startsWith("uploads/")
            ? "/" + src
            : "/uploads/" + src.split("/").map(encodeURIComponent).join("/");
      return new URL(path, base.origin).href;
    } catch (_) {
      return "";
    }
  }
  function fallbackPicture(p) {
    const n = el("span", "qr-product-icon");
    n.setAttribute("aria-hidden", "true");
    const icon = el(
      "i",
      /servi|plano/i.test(p.tipo || "") ? "fas fa-scissors" : "fas fa-box",
    );
    n.append(icon);
    return n;
  }
  function picture(p) {
    const src = imageSource(p);
    if (!src) return fallbackPicture(p);
    const frame = el("span", "qr-thumb is-loading"),
      img = el("img");
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 40;
    img.height = 48;
    img.addEventListener("load", () => frame.classList.remove("is-loading"), {
      once: true,
    });
    img.addEventListener("error", () => frame.replaceWith(fallbackPicture(p)), {
      once: true,
    });
    img.src = src;
    frame.append(img);
    return frame;
  }
  function selectResult(index, scroll = false) {
    if (!resultsOpen || !results.length) return;
    resultIndex = Math.max(0, Math.min(results.length - 1, index));
    const cards = [...$("#qr-products").querySelectorAll(".qr-product")];
    cards.forEach((n, i) => {
      n.classList.toggle("qr-result-selected", i === resultIndex);
      n.setAttribute("aria-selected", String(i === resultIndex));
    });
    const active = cards[resultIndex],
      input = $("#pesquisarProduto");
    if (active) input.setAttribute("aria-activedescendant", active.id);
    if (scroll && active) {
      const list = $("#qr-products"),
        r = active.getBoundingClientRect(),
        bounds = list.getBoundingClientRect();
      if (r.bottom > bounds.bottom) list.scrollTop += r.bottom - bounds.bottom;
      if (r.top < bounds.top) list.scrollTop -= bounds.top - r.top;
    }
  }
  function closeResults() {
    resultsOpen = false;
    $("#pesquisarProduto").setAttribute("aria-expanded", "false");
    $("#pesquisarProduto").removeAttribute("aria-activedescendant");
    renderProducts("");
  }
  function renderProducts(term, all = false) {
    const target = $("#qr-products");
    if (!target) return;
    const q = term.trim().toLocaleLowerCase("pt-BR");
    const found = catalog.filter(
      (p) =>
        !q ||
        [p.nome, ...codes(p)].some((v) =>
          String(v || "")
            .toLocaleLowerCase("pt-BR")
            .includes(q),
        ),
    );
    results = found.slice(0, all ? found.length : q ? 100 : 8);
    resultsOpen = Boolean(q);
    resultIndex = 0;
    const input = $("#pesquisarProduto");
    input.setAttribute("aria-expanded", String(resultsOpen));
    input.removeAttribute("aria-activedescendant");
    target.setAttribute("role", resultsOpen ? "listbox" : "group");
    target.replaceChildren();
    $("#qr-product-title").textContent = q
      ? `${found.length} produtos encontrados`
      : "Produtos de acesso rápido";
    for (const [index, p] of results.entries()) {
      const b = button("", () => add(p), "qr-product");
      b.id = "qr-result-" + index;
      if (resultsOpen) {
        b.setAttribute("role", "option");
        b.tabIndex = -1;
      }
      b.append(picture(p));
      const d = el("span");
      d.append(
        el("strong", "", p.nome),
        el("small", "", `Cód. ${p.codigo || p.id}`),
        el("b", "", money(p.preco)),
      );
      b.append(d);
      target.append(b);
    }
    if (!found.length)
      target.append(el("p", "qr-no-results", "Nenhum produto encontrado."));
    if (resultsOpen) selectResult(0);
  }
  function add(p) {
    // Serializa leituras consecutivas para evitar corrida entre consultas de estoque.
    queue = queue
      .then(async () => {
        if ($("#modalPagamento")) return;
        const revision = inputRevision;
        const ok = await api().adicionar(p);
        if (revision !== inputRevision) {
          $("#pesquisarProduto").value = lastTyped;
          renderProducts(lastTyped);
        } else if (ok) {
          selected = api().dados().itens.at(-1)?.id;
          $("#pesquisarProduto").value = "";
          renderProducts("");
        }
        renderCart();
        returnToSearch();
      })
      .catch((e) => notify(e.message, "error"));
    return queue;
  }
  function renderCart() {
    if (!api() || !$("#qr-cart")) return;
    const data = api().dados(),
      box = $("#qr-cart");
    box.replaceChildren();
    $("#qr-count").textContent = `${data.itens.length} itens`;
    if (!data.itens.length) {
      box.append(
        el(
          "div",
          "qr-empty",
          "Passe um código de barras ou selecione um produto para começar.",
        ),
      );
      return;
    }
    if (!data.itens.some((i) => i.id === selected)) selected = data.itens[0].id;
    data.itens.forEach((i) => {
      const row = el("div", `qr-row${i.id === selected ? " selected" : ""}`);
      row.tabIndex = 0;
      row.dataset.id = i.id;
      row.setAttribute(
        "aria-label",
        `${i.produto.nome}, quantidade ${i.quantidade}, ${money(i.totalFinal)}`,
      );
      row.addEventListener("focus", () => {
        selected = i.id;
        box
          .querySelectorAll(".qr-row")
          .forEach((n) => n.classList.toggle("selected", n === row));
      });
      const desc = el("div", "qr-desc");
      desc.append(
        picture(
          catalog.find((p) => String(p.id) === String(i.produto.id)) ||
            i.produto,
        ),
      );
      const name = el("div");
      name.append(
        el("strong", "", i.produto.nome),
        el(
          "small",
          "",
          `Cód. ${i.produto.codigo || i.produto.id} · ${i.desconto || 0}% desc.`,
        ),
      );
      desc.append(name);
      const qty = el("div", "qr-qty");
      const change = (value) => {
        selected = i.id;
        queue = queue
          .then(async () => {
            await api().quantidade(
              i.id,
              typeof value === "function" ? value(i.quantidade) : value,
            );
            renderCart();
          })
          .catch((e) => notify(e.message, "error"));
      };
      const input = el("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.min = "0.001";
      input.step = "any";
      input.value = window.PetHubQuantidades.formatar(i.quantidade,i.produto);
      input.setAttribute("aria-label", `Quantidade de ${i.produto.nome}`);
      let committed = String(input.value);
      const commit = (returnFocus = false) => {
        if (String(input.value) !== committed) {
          committed = String(input.value);
          change(Number(input.value.replace(",", ".")));
        }
        if (returnFocus) queue.then(returnToSearch);
      };
      input.addEventListener("change", () => commit());
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          commit(true);
        }
      });
      qty.append(
        button("−", () => change((q) => Math.max(window.PetHubQuantidades.kg(i.produto)?0.001:1,window.PetHubQuantidades.subtrair(q,window.PetHubQuantidades.kg(i.produto)?0.1:1)))),
        input,
        el("small","qr-unidade",window.PetHubQuantidades.unidade(i.produto)),
        button("+", () => change((q) => window.PetHubQuantidades.somar(q,window.PetHubQuantidades.kg(i.produto)?0.1:1))),
      );
      row.append(
        desc,
        qty,
        el("span", "qr-unit", money(i.valorUnitario)+" / "+window.PetHubQuantidades.unidade(i.produto)),
        el("strong", "qr-line-total", money(i.totalFinal)),
        button("×", () => api().remover(i.id), "qr-remove"),
      );
      box.append(row);
    });
  }
  async function payment(forma) {
    await queue;
    await api().finalizar();
    const modal = $("#modalPagamento");
    if (!modal) return;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Pagamento");
    modal.setAttribute("aria-modal", "true");
    if (!modal.dataset.qrKeyboard) {
      modal.dataset.qrKeyboard = "1";
      modal.addEventListener("keydown", (e) => {
        if (
          e.key === "Enter" &&
          !e.repeat &&
          e.target.matches(".campos-forma input, .campos-forma select")
        ) {
          e.preventDefault();
          e.stopPropagation();
          $("#adicionarPagamento")?.click();
        }
      });
    }
    if (forma && forma !== "multiplo")
      modal.querySelector(`[data-forma="${forma}"]`)?.click();
    const field =
      forma && forma !== "multiplo"
        ? modal.querySelector(`#valor-${forma}`)
        : modal.querySelector(".forma-pagamento");
    focus(field);
    if (!$("#qr-change")) {
      const out = el("p", "qr-change");
      out.id = "qr-change";
      out.setAttribute("role", "status");
      $("#campos-dinheiro").append(out);
      const refresh = () => {
        const total = Number(api().dados().totais.final);
        const paid =
          Number(
            ($("#totalPagoModal")?.textContent || "")
              .replace(/[^\d,]/g, "")
              .replace(",", "."),
          ) || 0;
        const received = Number($("#valor-dinheiro").value) || 0;
        out.textContent = `Troco: ${money(Math.max(0, received - Math.max(0, total - paid)))}`;
      };
      $("#valor-dinheiro").addEventListener("input", refresh);
      refresh();
    }
  }
  async function cancel() {
    if (
      await (window.confirmar
        ? window.confirmar("Descartar os itens desta venda?")
        : Promise.resolve(window.confirm("Descartar os itens desta venda?")))
    ) {
      api().limpar();
      renderCart();
      focus($("#pesquisarProduto"));
    }
  }
  function action(key) {
    switch (key) {
      case "F2":
        focus($("#pesquisarProduto"));
        if ($("#pesquisarProduto").value.trim())
          renderProducts($("#pesquisarProduto").value);
        break;
      case "F3": {
        const rows = [...document.querySelectorAll("#qr-cart .qr-row")];
        focus(
          rows
            .find((n) => n.dataset.id === String(selected))
            ?.querySelector("input") || $("#quantidade"),
        );
        break;
      }
      case "F4":
        focus($("#pesquisarCliente"));
        break;
      case "F6":
        $("#qr-more").open = true;
        focus($("#descontoGeralValor"));
        break;
      case "F7":
        payment();
        break;
      case "F8":
        $("#modalPagamento") ? $("#finalizarPagamento").click() : payment();
        break;
      case "Escape":
        cancel();
        break;
    }
  }
  function build() {
    const shell = el("section", "qr-shell");
    shell.id = "qr-shell";
    shell.hidden = true;
    shell.innerHTML = `<header class="qr-header"><div><span class="qr-cart-symbol">▣</span><strong>CAIXA / PDV</strong><small>Venda rápida</small></div><div class="qr-meta"><span id="qr-operator">Operador</span><time id="qr-clock"></time><span id="qr-status" role="status">Verificando caixa…</span></div></header><nav class="qr-shortcuts" aria-label="Atalhos do caixa"></nav><div class="qr-grid"><aside class="qr-left"><section class="qr-card" id="qr-search"><h2>Buscar produto</h2></section><section class="qr-card"><h2 id="qr-product-title">Produtos de acesso rápido</h2><div id="qr-products" class="qr-products"></div><button type="button" id="qr-all">Ver todos os produtos (F2)</button></section></aside><section class="qr-card qr-middle"><h2>Itens da venda <small id="qr-count"></small></h2><div class="qr-table-head"><span>Produto</span><span>Qtd.</span><span>Unitário</span><span>Total</span></div><div id="qr-cart" role="list" aria-label="Itens da venda"></div><p class="qr-scanner">▥ Leitor de barras pronto · Enter para adicionar</p></section><aside class="qr-right"><div id="qr-totals"></div><div id="qr-customer"></div><button type="button" class="qr-pay" id="qr-payment">Pagamento (F7)</button><button type="button" class="qr-finish" id="qr-finish">✓ FINALIZAR VENDA (F8)</button><details id="qr-more" class="qr-card"><summary>Mais opções da venda</summary><div id="qr-options"></div></details></aside></div><footer class="qr-bottom"><strong>Pagamento rápido</strong></footer>`;
    $(".container .nova-venda-layout").before(shell);
    const shortcuts = {
      F2: "Buscar produto",
      F3: "Quantidade",
      F4: "Cliente",
      F6: "Desconto",
      F7: "Pagamento",
      F8: "Finalizar venda",
      Escape: "Cancelar",
    };
    for (const [key, label] of Object.entries(shortcuts)) {
      const b = button("", () => action(key));
      b.append(
        el("kbd", "", key === "Escape" ? "ESC" : key),
        el("span", "", label),
      );
      $(".qr-shortcuts").append(b);
    }
    for (const [key, label] of [
      ["dinheiro", "Dinheiro"],
      ["pix", "Pix"],
      ["credito", "Cartão crédito"],
      ["debito", "Cartão débito"],
      ["multiplo", "Múltiplo"],
    ])
      $(".qr-bottom").append(button(label, () => payment(key)));
    $("#qr-payment").addEventListener("click", () => payment());
    $("#qr-finish").addEventListener("click", () => action("F8"));
    $("#qr-all").addEventListener("click", () => {
      $("#pesquisarProduto").value = "";
      renderProducts("", true);
      focus($("#pesquisarProduto"));
      $("#qr-product-title").textContent = "Catálogo · digite para filtrar";
    });
    $("#qr-cart").addEventListener("keydown", (e) => {
      if (
        !["ArrowDown", "ArrowUp", "Delete"].includes(e.key) ||
        e.target.tagName === "INPUT"
      )
        return;
      e.preventDefault();
      const rows = [...$("#qr-cart").children],
        idx = rows.findIndex((n) => n.dataset.id === String(selected));
      if (e.key === "Delete") {
        api().remover(selected);
        return;
      }
      rows[
        Math.max(
          0,
          Math.min(rows.length - 1, idx + (e.key === "ArrowDown" ? 1 : -1)),
        )
      ]?.focus();
    });
    const clock = () => {
      $("#qr-clock").textContent = new Date().toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    };
    clock();
    timer = setInterval(clock, 10000);
  }
  function apply(value) {
    if (value === layout && (value === "classico" || origins.length)) return;
    if ($("#modalPagamento"))
      throw Error("Feche o pagamento antes de trocar o visual.");
    if (value === "rapido") {
      move(".search-produto", $("#qr-search"));
      move(".item-form", $("#qr-search"));
      move(".totais-box", $("#qr-totals"));
      move(".cliente-section", $("#qr-customer"));
      for (const s of [
        ".header-actions",
        ".profissional-section",
        ".pagamento-section",
        ".info-section",
        ".action-buttons",
      ])
        move(s, $("#qr-options"));
      layout = value;
      document.body.classList.add("caixa-rapido");
      $("#qr-shell").hidden = false;
      $(".nova-venda-layout").hidden = true;
      renderCart();
      refreshCatalog();
      returnToSearch();
      status();
    } else {
      for (const [n, anchor] of origins.splice(0)) {
        anchor.replaceWith(n);
      }
      layout = value;
      document.body.classList.remove("caixa-rapido");
      $("#qr-shell").hidden = true;
      $(".nova-venda-layout").hidden = false;
    }
  }
  async function status() {
    try {
      const r = await ApiClient.request("/caixas/aberto");
      $("#qr-status").textContent =
        r?.aberto === true ? "● Caixa aberto" : "● Caixa fechado";
      $("#qr-status").classList.toggle("open", r?.aberto === true);
    } catch (_) {
      $("#qr-status").textContent = "Status indisponível";
    }
    $("#qr-operator").textContent =
      `Operador: ${$(".user-menu span")?.textContent?.trim() || "—"}`;
  }
  function selector() {
    const dialog = el("dialog", "qr-dialog");
    dialog.setAttribute("aria-label", "Alterar visual do caixa");
    dialog.append(
      el("h2", "", "Escolha o visual do caixa"),
      el(
        "p",
        "",
        "A escolha vale para todos os usuários desta empresa. A venda atual será preservada.",
      ),
    );
    const cards = el("div", "qr-layout-cards");
    for (const [value, name, description] of [
      [
        "classico",
        "Caixa Clássico",
        "Visual tradicional do caixa, com todos os campos e controles de venda.",
      ],
      [
        "rapido",
        "Caixa Rápido",
        "PDV otimizado para vendas rápidas, atalhos de teclado e leitura de código de barras.",
      ],
    ]) {
      const card = el("article");
      card.append(el("div", `qr-thumbnail ${value}`));
      card.firstChild.innerHTML = "<i></i><i></i><i></i>";
      card.append(
        el("h3", "", name + (value === layout ? " · Em uso" : "")),
        el("p", "", description),
      );
      const b = button(`Usar ${name}`, async () => {
        if (busy) return;
        busy = true;
        b.disabled = true;
        try {
          await queue;
          if ($("#modalPagamento"))
            throw Error("Feche o pagamento antes de trocar o visual.");
          const saved = await ApiClient.request(
            "/vendas/preferencias/layout-caixa",
            { method: "PUT", body: JSON.stringify({ layout: value }) },
          );
          apply(saved.layout);
          dialog.close();
          notify("Visual salvo para esta empresa.");
        } catch (e) {
          notify(e.message || "Não foi possível salvar o visual.", "error");
        } finally {
          busy = false;
          b.disabled = false;
        }
      });
      card.append(b);
      cards.append(card);
    }
    dialog.append(
      cards,
      button("Fechar", () => dialog.close()),
    );
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
  }
  function init() {
    if (initialized || !api() || !$(".nova-venda-layout")) return;
    initialized = true;
    build();
    const layoutButton = button("", selector, "qr-layout-toggle");
    layoutButton.id = "qr-layout-toggle";
    layoutButton.title = "Alterar visual do caixa";
    layoutButton.setAttribute("aria-label", "Alterar visual do caixa");
    layoutButton.append(el("i", "fas fa-exchange-alt"));
    function mountToggle() {
      const header =
        $(".main-content .header .header-right") || $(".header-right");
      if (!header) return;
      const support = header.querySelector("#hcHeaderBtn, .btn-help-center");
      if (support) {
        if (layoutButton.nextElementSibling !== support)
          support.before(layoutButton);
      } else if (layoutButton.parentNode !== header)
        header.prepend(layoutButton);
    }
    mountToggle();
    const headerObserver = new MutationObserver(mountToggle);
    headerObserver.observe($(".header-right") || document.body, {
      childList: true,
      subtree: true,
    });
    window.addEventListener("pagehide", () => headerObserver.disconnect(), {
      once: true,
    });
    const search = $("#pesquisarProduto");
    search.setAttribute("role", "combobox");
    search.setAttribute("aria-controls", "qr-products");
    search.setAttribute("aria-autocomplete", "list");
    search.setAttribute("aria-expanded", "false");
    search.placeholder = "Nome, código ou código de barras";
    $(".btn-nova")?.addEventListener("click", () =>
      queueMicrotask(returnToSearch),
    );
    // Modal de conclusão usa controles originais; restaura foco após seu fechamento.
    const modalObserver = new MutationObserver((records) => {
      if (
        records.some((r) =>
          [...r.removedNodes].some(
            (n) =>
              n.nodeType === 1 &&
              [
                "modalPagamento",
                "modalVendaFinalizada",
                "pdfModalVendaOverlay",
              ].includes(n.id),
          ),
        )
      )
        returnToSearch();
    });
    modalObserver.observe(document.body, { childList: true });
    window.addEventListener("pagehide", () => modalObserver.disconnect(), {
      once: true,
    });
    // Capture intercepts only the rapid view, before legacy Enter handlers.
    document.addEventListener(
      "input",
      (e) => {
        if (e.target.id !== "pesquisarProduto") return;
        delete e.target.dataset.produtoId;
        if (layout === "rapido") {
          e.stopImmediatePropagation();
          inputRevision++;
          lastTyped = e.target.value;
          renderProducts(e.target.value);
        }
      },
      true,
    );
    document.addEventListener(
      "keydown",
      (e) => {
        if (layout !== "rapido") return;
        if ($("dialog[open]")) return; // Native dialog Escape and focus trapping.
        if (e.key === "Escape" && $("#modalPagamento")) {
          e.preventDefault();
          $("#fecharModalPagamento")?.click();
          return;
        }
        if ($("#modalPagamento") && e.key !== "F8") return;
        if (
          e.key === "Escape" &&
          resultsOpen &&
          e.target.id === "pesquisarProduto"
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          closeResults();
          return;
        }
        if ($("#modalVendaFinalizada, #pdfModalVendaOverlay, .hc-open")) return;
        if (["F2", "F3", "F4", "F6", "F7", "F8", "Escape"].includes(e.key)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!e.repeat) action(e.key);
          return;
        }
        if (e.target.id === "pesquisarProduto") {
          if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const term = e.target.value.trim();
            if (e.key === "Escape") {
              closeResults();
              return;
            }
            if (e.key.startsWith("Arrow")) {
              if (!resultsOpen) {
                renderProducts(term);
                selectResult(0, true);
              } else
                selectResult(
                  resultIndex + (e.key === "ArrowDown" ? 1 : -1),
                  true,
                );
              return;
            }
            if (e.repeat || !term) return;
            // Códigos exatos têm prioridade para leitores; texto usa somente o destaque.
            const exact = catalog.filter((p) =>
              codes(p).some(
                (v) =>
                  String(v || "").toLocaleLowerCase("pt-BR") ===
                  term.toLocaleLowerCase("pt-BR"),
              ),
            );
            const chosen =
              exact.length === 1
                ? exact[0]
                : resultsOpen
                  ? results[resultIndex]
                  : null;
            if (!chosen) {
              notify("Nenhum produto selecionado.");
              return;
            }
            e.target.value = "";
            lastTyped = "";
            closeResults();
            add(chosen);
          }
        }
      },
      true,
    );
    document.addEventListener("pethub:venda-atualizada", renderCart);
    document.addEventListener("venda:finalizada", () => {
      if (layout === "rapido") {
        setTimeout(() => {
          refreshCatalog();
          status();
        }, 500);
      }
    });
    window.addEventListener("focus", () => {
      // Sincroniza outros operadores quando não há pagamento/modal em andamento.
      if (
        !document.documentElement.classList.contains("qr-booting") &&
        !busy &&
        !$("#modalPagamento") &&
        !$("dialog[open]")
      )
        endpoint()
          .then((r) => apply(r.layout))
          .catch(() => {});
      if (layout === "rapido") status();
    });
    window.addEventListener("pagehide", () => clearInterval(timer), {
      once: true,
    });
    let loadingPreference = false;
    async function loadInitialLayout() {
      if (loadingPreference) return;
      loadingPreference = true;
      layoutButton.disabled = true;
      const loader = $("#qr-boot-loader"),
        error = $("#qr-boot-error"),
        spinner = $(".qr-boot-spinner");
      if (error) error.hidden = true;
      if (spinner) spinner.hidden = false;
      loader?.setAttribute("aria-label", "Carregando caixa");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const preference = await ApiClient.request(
          "/vendas/preferencias/layout-caixa",
          { signal: controller.signal },
        );
        if (!["classico", "rapido"].includes(preference?.layout))
          throw Error("Visual inválido.");
        apply(preference.layout);
        // Revela somente depois de mover os controles para a interface correta.
        const content = $("#qr-sale-content");
        content?.removeAttribute("inert");
        content?.setAttribute("aria-busy", "false");
        document.documentElement.classList.remove("qr-booting");
        layoutButton.disabled = false;
        if (layout === "rapido") returnToSearch();
      } catch (e) {
        // Sem preferência conhecida, não exibe outro caixa por engano.
        if (spinner) spinner.hidden = true;
        if (error) error.hidden = false;
        loader?.setAttribute(
          "aria-label",
          "Falha ao carregar caixa. Tente novamente.",
        );
      } finally {
        clearTimeout(timeout);
        loadingPreference = false;
      }
    }
    $("#qr-boot-retry")?.addEventListener("click", loadInitialLayout);
    loadInitialLayout();
    window.PetHubCaixa = {
      get layout() {
        return layout;
      },
      aplicar: apply,
      catalogo: refreshCatalog,
    };
  }
  document.addEventListener("pethub:venda-pronta", init, { once: true });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
