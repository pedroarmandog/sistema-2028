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
    renderProducts("");
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
  function picture(p) {
    const src = p.imagem_url || p.foto_url || p.imagem || p.foto || p.imagemUrl;
    if (
      typeof src !== "string" ||
      !/^(\/|https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(src) ||
      src.startsWith("//")
    )
      return el("span", "qr-product-icon", "▧");
    const img = el("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener(
      "error",
      () => img.replaceWith(el("span", "qr-product-icon", "▧")),
      { once: true },
    );
    return img;
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
    target.replaceChildren();
    $("#qr-product-title").textContent = q
      ? `${found.length} produtos encontrados`
      : "Produtos de acesso rápido";
    for (const p of found.slice(0, all ? found.length : q ? 100 : 8)) {
      const b = button("", () => add(p), "qr-product");
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
    if (!found.length) target.append(el("p", "", "Nenhum produto disponível."));
  }
  function add(p) {
    // Serializa leituras consecutivas para evitar corrida entre consultas de estoque.
    queue = queue
      .then(async () => {
        if ($("#modalPagamento")) return;
        const ok = await api().adicionar(p);
        if (ok) {
          selected = api().dados().itens.at(-1)?.id;
          $("#pesquisarProduto").value = "";
          renderProducts("");
        }
        renderCart();
        focus($("#pesquisarProduto"));
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
      desc.append(picture(i.produto));
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
      input.type = "number";
      input.min = "0.001";
      input.step = "any";
      input.value = i.quantidade;
      input.setAttribute("aria-label", `Quantidade de ${i.produto.nome}`);
      input.addEventListener("change", () => change(Number(input.value)));
      qty.append(
        button("−", () => change((q) => q - 1)),
        input,
        button("+", () => change((q) => q + 1)),
      );
      row.append(
        desc,
        qty,
        el("span", "qr-unit", money(i.valorUnitario)),
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
      focus($("#pesquisarProduto"));
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
    const toolbar = el("div", "qr-toolbar");
    toolbar.append(button("⇄ Alterar visual do caixa", selector));
    $(".container").prepend(toolbar);
    // Capture intercepts only the rapid view, before legacy Enter handlers.
    document.addEventListener(
      "input",
      (e) => {
        if (e.target.id !== "pesquisarProduto") return;
        delete e.target.dataset.produtoId;
        if (layout === "rapido") {
          e.stopImmediatePropagation();
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
        if (["F2", "F3", "F4", "F6", "F7", "F8", "Escape"].includes(e.key)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!e.repeat) action(e.key);
          return;
        }
        if (e.key === "Enter" && e.target.id === "pesquisarProduto") {
          e.preventDefault();
          e.stopImmediatePropagation();
          const term = e.target.value.trim();
          e.target.value = "";
          const exact = catalog.filter((p) =>
            [...codes(p), p.nome].some(
              (v) =>
                String(v || "").toLocaleLowerCase("pt-BR") ===
                term.toLocaleLowerCase("pt-BR"),
            ),
          );
          if (exact.length === 1) add(exact[0]);
          else {
            e.target.value = term;
            notify("Selecione um produto nos resultados.");
          }
        }
        if (e.key === "ArrowDown" && e.target.id === "pesquisarProduto") {
          e.preventDefault();
          e.stopImmediatePropagation();
          $("#qr-products button")?.focus();
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
      if (!busy && !$("#modalPagamento") && !$("dialog[open]"))
        endpoint()
          .then((r) => apply(r.layout))
          .catch(() => {});
      if (layout === "rapido") status();
    });
    window.addEventListener("pagehide", () => clearInterval(timer), {
      once: true,
    });
    endpoint()
      .then((r) => apply(r.layout))
      .catch((e) => notify(`Caixa Clássico mantido. ${e.message}`, "warning"));
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
