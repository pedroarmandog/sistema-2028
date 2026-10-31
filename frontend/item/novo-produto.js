// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

// Fallback global para obter produtos (usado por vários módulos). Se já existir, não sobrescreve.
if (typeof window.getMeusItensFromAPI !== "function") {
  window.getMeusItensFromAPI = async function () {
    try {
      const produtos = await ApiClient.getProdutos();
      return Array.isArray(produtos) ? produtos : [];
    } catch (e) {
      console.error("getMeusItensFromAPI fallback erro:", e);
      return [];
    }
  };
}

// Toast helper: cria notificações sutis no canto superior direito
function showToast(message, type = "info", timeout = 3500) {
  try {
    let container = document.getElementById("global-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "global-toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    toast.textContent = message;
    container.appendChild(toast);
    // forçar transição
    setTimeout(() => toast.classList.add("show"), 10);
    // remover automaticamente
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        try {
          toast.remove();
        } catch (e) {}
      }, 240);
    }, timeout);
  } catch (e) {
    console.warn("showToast falhou", e);
  }
}

// Quick-new modal: abre um modal centralizado para criar um simples item de texto
function openQuickNewModal(title = "Novo", placeholder = "Descrição", onSave) {
  console.log("🔵 openQuickNewModal chamado:", title);

  // criar overlay/modal
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay modal-centered-overlay";

  // Remover todas as classes e aplicar estilos diretamente
  overlay.removeAttribute("class");
  overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: rgba(0, 0, 0, 0.5) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 99999 !important;
    `;

  const modal = document.createElement("div");
  modal.removeAttribute("class");
  modal.style.cssText = `
        background-color: #fff !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        max-width: 500px !important;
        width: 90% !important;
        padding: 0 !important;
        position: relative !important;
    `;
  modal.innerHTML = `
        <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid #ddd; display:flex; align-items:center; justify-content:space-between;">
            <h3 style="margin:0; font-size: 18px; color: #333;">${title}</h3>
            <button type="button" class="btn btn-secondary btn-close-modal" style="padding: 6px 12px; cursor: pointer;">Fechar</button>
        </div>
        <div class="modal-body" style="padding: 18px 20px;">
            <label style="display: block; margin-bottom: 8px;">Descrição: <span style="color:#d00">*</span></label>
            <input type="text" class="form-control quicknew-input" placeholder="${placeholder}" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />
        </div>
        <div class="modal-footer" style="padding: 14px 20px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #ddd;">
            <button type="button" class="btn btn-primary btn-save-quicknew" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
        </div>
    `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  console.log("✅ Modal adicionado ao body", overlay);

  const input = modal.querySelector(".quicknew-input");
  const btnClose = modal.querySelector(".btn-close-modal");
  const btnSave = modal.querySelector(".btn-save-quicknew");

  // foco
  setTimeout(() => input.focus(), 50);

  // Ajustes de estilo para evitar que o botão Salvar fique colado na borda
  try {
    modal.style.maxWidth = "640px";
    modal.style.width = "560px";
    modal.style.boxSizing = "border-box";
    const headerEl = modal.querySelector(".modal-header");
    if (headerEl) headerEl.style.padding = "16px 18px";
    const bodyEl = modal.querySelector(".modal-body");
    if (bodyEl) bodyEl.style.padding = "12px 18px";
    const footerEl = modal.querySelector(".modal-footer");
    if (footerEl) {
      footerEl.style.display = "flex";
      footerEl.style.justifyContent = "flex-end";
      footerEl.style.gap = "12px";
      footerEl.style.padding = "12px 18px";
    }
    if (btnSave) {
      btnSave.style.minWidth = "84px";
      btnSave.style.padding = "8px 14px";
      // garantir texto centralizado
      btnSave.style.display = "inline-flex";
      btnSave.style.alignItems = "center";
      btnSave.style.justifyContent = "center";
      btnSave.style.textAlign = "center";
    }
  } catch (e) {}

  function close() {
    try {
      overlay.remove();
    } catch (e) {}
  }

  btnClose.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });

  btnSave.addEventListener("click", function (e) {
    e.preventDefault();
    const val = (input.value || "").toString().trim();
    if (!val) {
      showToast("Informe a descrição", "warning", 2500);
      input.focus();
      return;
    }
    try {
      if (typeof onSave === "function") {
        const ret = onSave(val);
        // Se a criação retornar uma Promise, aguardar para disparar o evento
        try {
          const lowerTitle = (title || "").toString().toLowerCase();
          const isPerfil =
            lowerTitle.indexOf("perfil") !== -1 ||
            lowerTitle.indexOf("validade") !== -1;
          if (ret && typeof ret.then === "function") {
            ret
              .then((res) => {
                if (isPerfil) {
                  try {
                    document.dispatchEvent(
                      new CustomEvent("perfis_validade:updated", {
                        detail: res,
                      }),
                    );
                  } catch (e) {}
                }
              })
              .catch(() => {});
          } else {
            if (isPerfil) {
              try {
                document.dispatchEvent(
                  new CustomEvent("perfis_validade:updated", { detail: ret }),
                );
              } catch (e) {}
            }
          }
        } catch (e) {
          console.debug("post-onSave dispatch fallback", e);
        }
      }
    } catch (err) {
      console.error(err);
    }
    close();
  });
}

// Modal para Editar Composição do Plano (layout conforme imagem do sistema)
function openEditarComposicaoModal(prefill, onSave) {
  // remover overlays anteriores
  document.querySelectorAll(".modal-overlay").forEach((e) => e.remove());

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.45)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "10000";

  const modal = document.createElement("div");
  modal.className = "modal-box modal-centered";
  modal.style.position = "fixed";
  modal.style.left = "50%";
  modal.style.top = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.width = "520px";
  modal.style.maxWidth = "calc(100% - 40px)";
  modal.style.background = "#fff";
  modal.style.borderRadius = "6px";
  modal.style.boxShadow = "0 8px 24px rgba(19,24,28,0.12)";
  modal.style.overflow = "hidden";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.zIndex = "10001";

  modal.innerHTML = `
        <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eef0f2;background:#fff">
            <h3 style="margin:0;font-size:18px;color:#1f3a45">Composição do Plano</h3>
            <button type="button" class="btn btn-secondary btn-close-modal" style="background:#fff;border:1px solid #e6e9eb;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:#1f3a45">Fechar</button>
        </div>
        <div class="modal-body" style="padding:18px 22px;max-height:60vh;overflow:auto">
            <div style="margin-bottom:14px">
                <label style="display:block;margin-bottom:6px;color:#495057;font-weight:600">Item <span style="color:#c0392b">*</span></label>
                <input type="text" autocomplete="off" id="composicaoItemInput" placeholder="Digite para pesquisar" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:6px" />
            </div>
            <div style="display:flex;gap:10px;margin-bottom:14px">
                <div style="flex:1">
                    <label style="display:block;margin-bottom:6px;color:#495057;font-weight:600">Repetição <span style="color:#c0392b">*</span></label>
                    <input type="text" autocomplete="off" id="composicaoRepeticaoInput" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:6px" />
                </div>
                <div style="flex:1">
                    <label style="display:block;margin-bottom:6px;color:#495057;font-weight:600">Quantidade Mensal <span style="color:#c0392b">*</span></label>
                    <input type="number" autocomplete="off" id="composicaoQuantidadeMensalInput" value="0" min="0" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:6px" />
                </div>
            </div>
        </div>
        <div style="padding:14px 22px;border-top:1px solid #eef0f2;display:flex;justify-content:flex-end;gap:10px;background:#fff">
            <button type="button" id="composicaoOkBtn" style="background:#28a745;color:#fff;border:none;padding:10px 14px;border-radius:6px;cursor:pointer">OK</button>
            <button type="button" id="composicaoCancelBtn" style="background:#6c757d;color:#fff;border:none;padding:10px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
        </div>
    `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // prefill
  try {
    if (prefill && typeof prefill === "object") {
      modal.querySelector("#composicaoItemInput").value = prefill.item || "";
      modal.querySelector("#composicaoRepeticaoInput").value =
        prefill.repeticao || "";
      modal.querySelector("#composicaoQuantidadeMensalInput").value =
        prefill.quantidadeMensal || 0;
    }
  } catch (e) {}

  function cleanupSuggestions() {
    try {
      document
        .querySelectorAll(".composicao-suggestions")
        .forEach((s) => s.remove());
    } catch (e) {}
  }

  function close() {
    cleanupSuggestions();
    overlay.remove();
  }

  const btnClose = modal.querySelector(".btn-close-modal");
  const btnOk = modal.querySelector("#composicaoOkBtn");
  const btnCancel = modal.querySelector("#composicaoCancelBtn");
  const inputItem = modal.querySelector("#composicaoItemInput");

  // Fechar modal
  if (btnClose)
    btnClose.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      close();
    });

  // Evita fechar o modal quando o usuário está selecionando/arrastando texto
  overlay.__lastMouseDownTarget = null;
  overlay.addEventListener("mousedown", function (e) {
    overlay.__lastMouseDownTarget = e.target;
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay && overlay.__lastMouseDownTarget === overlay) {
      e.stopPropagation();
      close();
    }
    overlay.__lastMouseDownTarget = null;
  });

  // criar container de sugestões (dropdown) dentro do wrapper do input
  // criar container de sugestões (dropdown) anexado ao body e posicionado por coordenadas
  const suggestions = document.createElement("div");
  suggestions.className = "composicao-suggestions";
  suggestions.style.display = "none";
  suggestions.style.boxSizing = "border-box";
  document.body.appendChild(suggestions);

  // dropdown para Repetição (Semanal / Quinzenal / Mensal)
  const inputRepeticao = modal.querySelector("#composicaoRepeticaoInput");
  const repeticaoSuggestions = document.createElement("div");
  repeticaoSuggestions.className =
    "composicao-suggestions repeticao-suggestions";
  repeticaoSuggestions.style.display = "none";
  repeticaoSuggestions.style.boxSizing = "border-box";
  document.body.appendChild(repeticaoSuggestions);

  // Cache em memória para produtos (evitar múltiplas chamadas à API)
  let produtosCache = null;

  async function getMeusItensFromAPI() {
    try {
      if (produtosCache) return produtosCache; // usar cache se disponível
      const produtos = await ApiClient.getProdutos();
      produtosCache = Array.isArray(produtos) ? produtos : [];
      return produtosCache;
    } catch (e) {
      console.error("Erro ao buscar produtos da API:", e);
      return [];
    }
  }

  function getMeusItensFromStorage() {
    console.warn(
      "⚠️ getMeusItensFromStorage() está deprecated - use getMeusItensFromAPI()",
    );
    // Retornar cache se disponível, caso contrário array vazio
    return produtosCache || [];
  }

  async function renderSuggestions(filter) {
    const all = await getMeusItensFromAPI();
    function isServiceItem(i) {
      if (!i) return false;
      const tipo = String(i.tipo || i.type || "").toLowerCase();
      const categoria = String(i.categoria || i.category || "").toLowerCase();
      const nome = String(i.nome || i.titulo || i.name || "").toLowerCase();
      // aceitar variações como 'serv', 'servico', 'serviço', 'serviços' e também categoria marcada como 'serviços'
      if (tipo.indexOf("serv") !== -1) return true;
      if (categoria.indexOf("serv") !== -1) return true;
      // alguns itens podem não ter tipo/categoria, mas o nome pode indicar que é serviço (menos comum)
      return false;
    }
    const services = (all || []).filter((i) => isServiceItem(i));
    const q = (filter || "").toLowerCase();
    const items = services.filter((s) =>
      (s.nome || s.titulo || "").toString().toLowerCase().includes(q),
    );
    if (!items || items.length === 0) {
      suggestions.innerHTML =
        '<div class="no-results">Nenhum serviço encontrado</div>';
      suggestions.style.display = "block";
      return;
    }
    suggestions.innerHTML = items
      .map((it) => {
        const nome = escapeHtml(it.nome || it.titulo || "");
        return `<div class="comp-sug-item" data-id="${escapeHtml(String(it.id || ""))}">${nome}</div>`;
      })
      .join("");
    // posicionar o dropdown no body logo abaixo do input, usando coordenadas fixas
    try {
      const rect = inputItem.getBoundingClientRect();
      suggestions.style.position = "fixed";
      suggestions.style.left = rect.left + "px";
      // posicionar logo abaixo da linha inferior do input (pequeno offset de 2px)
      suggestions.style.top = rect.bottom + 2 + "px";
      suggestions.style.width = rect.width + "px";
      suggestions.style.zIndex = "2147483647";
    } catch (e) {
      suggestions.style.position = "absolute";
    }
    suggestions.style.display = "block";
    Array.from(suggestions.querySelectorAll(".comp-sug-item")).forEach((el) =>
      el.addEventListener("click", function () {
        inputItem.value = this.textContent.trim();
        inputItem.setAttribute(
          "data-selected-id",
          this.getAttribute("data-id"),
        );
        suggestions.style.display = "none";
      }),
    );
  }

  function renderRepeticaoSuggestions(filter) {
    const options = ["Semanal", "Quinzenal", "Mensal"];
    const q = (filter || "").toString().toLowerCase();
    const items = options.filter((o) => o.toLowerCase().includes(q));
    if (!items || items.length === 0) {
      repeticaoSuggestions.innerHTML =
        '<div class="no-results">Nenhuma opção</div>';
      repeticaoSuggestions.style.display = "block";
      return;
    }
    repeticaoSuggestions.innerHTML = items
      .map((it) => `<div class="comp-sug-item">${escapeHtml(it)}</div>`)
      .join("");
    try {
      const rect = inputRepeticao.getBoundingClientRect();
      repeticaoSuggestions.style.position = "fixed";
      repeticaoSuggestions.style.left = rect.left + "px";
      repeticaoSuggestions.style.top = rect.bottom + 2 + "px";
      repeticaoSuggestions.style.width = rect.width + "px";
      repeticaoSuggestions.style.zIndex = "2147483647";
    } catch (e) {
      repeticaoSuggestions.style.position = "absolute";
    }
    repeticaoSuggestions.style.display = "block";
    Array.from(repeticaoSuggestions.querySelectorAll(".comp-sug-item")).forEach(
      (el) =>
        el.addEventListener("click", function () {
          inputRepeticao.value = this.textContent.trim();
          repeticaoSuggestions.style.display = "none";
        }),
    );
  }

  inputItem.addEventListener("focus", function () {
    renderSuggestions("");
  });
  inputItem.addEventListener("input", function () {
    renderSuggestions(this.value || "");
  });

  // Repetição: abrir ao focar/clicar e filtrar por input
  if (inputRepeticao) {
    inputRepeticao.addEventListener("focus", function () {
      renderRepeticaoSuggestions("");
    });
    inputRepeticao.addEventListener("click", function (e) {
      e.stopPropagation();
      renderRepeticaoSuggestions("");
    });
    inputRepeticao.addEventListener("input", function () {
      renderRepeticaoSuggestions(this.value || "");
    });
  }

  if (btnOk)
    btnOk.addEventListener("click", async function (e) {
      e.preventDefault();
      const repeticao = (
        modal.querySelector("#composicaoRepeticaoInput").value || ""
      )
        .toString()
        .trim();
      const quantidade =
        parseInt(
          modal.querySelector("#composicaoQuantidadeMensalInput").value || 0,
          10,
        ) || 0;
      if (!item) {
        showToast("Informe o Item", "warning", 2200);
        inputItem.focus();
        return;
      }
      const data = {
        item,
        repeticao,
        quantidade,
        selectedId: inputItem.getAttribute("data-selected-id"),
      };
      try {
        if (typeof onSave === "function") {
          try {
            onSave(data);
          } catch (e) {
            console.error("onSave callback failed", e);
          }
          close();
          showToast("Composição atualizada", "success", 1600);
          return;
        }
      } catch (e) {}
      // default add behaviour
      try {
        const container = document.querySelector(".plano-composicao-content");
        if (container) {
          // remover texto vazio
          const empty = container.querySelector(".plano-composicao-empty");
          if (empty) empty.remove();

          // criar tabela caso não exista
          let table = container.querySelector(".plano-composicao-table");
          if (!table) {
            table = document.createElement("table");
            table.className = "plano-composicao-table";
            table.innerHTML = `<thead><tr><th>Tipo</th><th>Descrição</th><th>Repetição</th><th style="text-align:right">Qtd. Mensal</th></tr></thead><tbody></tbody>`;
            container.appendChild(table);
          }
          const tbody = table.querySelector("tbody");

          // tentar obter metadados do item selecionado pelo id
          let tipoLabel = "Principal";
          let descricao = escapeHtml(item);
          const selectedId = inputItem.getAttribute("data-selected-id");
          if (selectedId) {
            const all = await getMeusItensFromAPI();
            const found = (all || []).find(
              (it) => String(it.id || "") === String(selectedId),
            );
            if (found) {
              descricao = escapeHtml(
                found.nome || found.titulo || found.name || item,
              );
              tipoLabel =
                (
                  found.tipo ||
                  found.categoria ||
                  found.category ||
                  ""
                ).toString() || tipoLabel;
            }
          }

          const tr = document.createElement("tr");
          const qtdLabel =
            quantidade === 1 ? "1 vez ao mês" : quantidade + " vezes ao mês";
          tr.innerHTML = `<td class="pc-tipo">${escapeHtml(tipoLabel)}</td><td class="pc-desc">${descricao}</td><td class="pc-rep">${escapeHtml(repeticao)}</td><td class="pc-qtd" style="text-align:right">${escapeHtml(qtdLabel)} <button type=button class=btn-remove-composicao style="margin-left:12px">Remover</button></td>`;
          tbody.appendChild(tr);
          // animação suave ao inserir
          try {
            tr.classList.add("new-item");
            tr.addEventListener("animationend", function () {
              try {
                tr.classList.remove("new-item");
              } catch (e) {}
            });
          } catch (e) {}

          const btnRem = tr.querySelector(".btn-remove-composicao");
          btnRem.addEventListener("click", function (ev) {
            ev.preventDefault();
            try {
              tr.remove();
              if (!tbody.querySelector("tr")) {
                table.remove();
                const p = document.createElement("p");
                p.className = "plano-composicao-empty";
                p.textContent = "Nenhum item adicionado à composição do plano.";
                container.appendChild(p);
              }
            } catch (e) {}
          });
        }
      } catch (err) {
        console.error("Erro ao adicionar item de composição", err);
      }

      close();
      showToast("Item adicionado à composição", "success", 2000);
    });
}

// util: escapador simples para texto inserido no DOM
function escapeHtml(str) {
  return (str || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// addQuickNewControl: adiciona o botão '...' ao lado de um input e abre o fluxo quick-new
function addQuickNewControl(inputId, storageKey, modalTitle) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper) wrapper = input.parentElement;

  if (getComputedStyle(wrapper).position === "static")
    wrapper.style.position = "relative";
  if (wrapper.querySelector(".input-more")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "input-more";
  btn.title = "Mais";
  btn.innerHTML = "&#8942;";
  btn.style.position = "absolute";
  btn.style.right = "8px";
  btn.style.top = "50%";
  btn.style.transform = "translateY(-50%)";
  btn.style.padding = "6px 8px";
  btn.style.border = "none";
  btn.style.background = "transparent";
  btn.style.cursor = "pointer";
  btn.style.zIndex = 2000;
  try {
    const currentPr = parseInt(getComputedStyle(input).paddingRight) || 0;
    if (currentPr < 40) input.style.paddingRight = currentPr + 36 + "px";
  } catch (e) {}

  let menu = null;

  function openMenu() {
    if (menu) {
      menu.remove();
      menu = null;
      return;
    }
    menu = document.createElement("div");
    menu.className = "mini-menu";
    menu.style.position = "absolute";
    menu.style.top = btn.offsetTop + btn.offsetHeight + 6 + "px";
    menu.style.left = btn.offsetLeft + "px";
    menu.style.zIndex = 10000;
    menu.style.background = "#fff";
    menu.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    menu.style.borderRadius = "6px";
    menu.style.padding = "8px 0";
    menu.style.minWidth = "140px";

    const item = document.createElement("div");
    item.className = "mini-menu-item";
    item.style.padding = "8px 14px";
    item.style.cursor = "pointer";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.innerHTML =
      '<span style="font-size:18px; margin-right:10px; color:#666">+</span><span>Novo</span>';

    item.addEventListener("click", function (e) {
      e.preventDefault();
      if (menu) {
        menu.remove();
        menu = null;
      }
      openQuickNewModal(modalTitle || "Novo", "Descrição", function (val) {
        if (!val || !val.trim()) return;
        const valor = val.trim();
        // Se for marca, tentar criar via API
        if (
          storageKey === "marcas_list" &&
          typeof ApiClient !== "undefined" &&
          ApiClient.criarMarca
        ) {
          ApiClient.criarMarca({ nome: valor })
            .then(() => {
              input.value = valor;
              showToast("Criado com sucesso", "success", 2000);
              try {
                if (
                  input.__select_cached &&
                  Array.isArray(input.__select_cached)
                )
                  input.__select_cached.push({ descricao: valor });
              } catch (e) {}
              try {
                window.dispatchEvent(
                  new CustomEvent("marcas:updated", {
                    detail: { nome: valor },
                  }),
                );
              } catch (e) {}
            })
            .catch((err) => {
              console.debug(
                "[quick-new marca] falha API, aplicando em memória",
                err,
              );
              input.value = valor;
              showToast(
                "Criado localmente (API indisponível)",
                "warning",
                3000,
              );
              try {
                if (
                  input.__select_cached &&
                  Array.isArray(input.__select_cached)
                )
                  input.__select_cached.push({ descricao: valor });
              } catch (e) {}
            });
        } else {
          try {
            const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
            const arr = Array.isArray(raw) ? raw : [];
            if (!arr.includes(valor)) arr.push(valor);
            localStorage.setItem(storageKey, JSON.stringify(arr));
          } catch (e) {
            console.debug("Falha ao salvar localmente", e);
          }
          input.value = valor;
          showToast("Criado com sucesso", "success", 2000);
          try {
            if (input.__select_cached && Array.isArray(input.__select_cached))
              input.__select_cached.push({ descricao: valor });
          } catch (e) {}
          if (inputId === "agrupamento") {
            setTimeout(() => {
              try {
                fetchAgrupamentos().then((items) => {
                  input.__select_cached = items;
                });
              } catch (e) {}
            }, 100);
          }
        }
      });
    });

    menu.appendChild(item);
    wrapper.appendChild(menu);
    setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 10);
  }

  function onDocClick(e) {
    if (!wrapper.contains(e.target)) {
      if (menu) {
        menu.remove();
        menu = null;
      }
      document.removeEventListener("click", onDocClick);
    }
  }
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    openMenu();
  });
  wrapper.appendChild(btn);
}

function detectarIDsDuplicados() {
  const idsParaVerificar = [
    "clienteMenuItem",
    "clienteSubmenu",
    "itemMenuItem",
    "itemSubmenu",
    "petMenuItem",
    "petSubmenu",
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "financeiroMenuItem",
    "financeiroSubmenu",
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "painelMenuItem",
    "painelSubmenu",
    "comprasMenuItem",
    "comprasSubmenu",
  ];

  let problemas = [];
  idsParaVerificar.forEach((id) => {
    const elementos = document.querySelectorAll(`#${id}`);
    if (elementos.length > 1) {
      problemas.push(`ID '${id}' duplicado ${elementos.length} vezes`);
      console.warn(`⚠️  ID DUPLICADO: ${id} (${elementos.length} elementos)`);
    }
  });

  if (problemas.length > 0) {
    console.error("🚨 PROBLEMAS DE IDs DUPLICADOS DETECTADOS:");
    problemas.forEach((p) => console.error(`   - ${p}`));
    return false;
  }

  console.log("✅ Verificação de IDs: Nenhum duplicado encontrado");
  return true;
}

function configurarDropdownInicioRapido() {
  if (window.dropdownConfigurado) return;
  const dropdownBtn = document.getElementById("inicioRapidoBtn");
  const dropdown = document.querySelector(".dropdown");
  if (dropdownBtn && dropdown) {
    dropdownBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = dropdown.classList.contains("open");
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        if (dropdown.classList.contains("open"))
          dropdown.classList.remove("open");
      }
    });

    window.dropdownConfigurado = true;
  }
}

function salvarEstadoSubmenu(submenuId, isOpen) {
  try {
    const estadoSubmenus = JSON.parse(
      localStorage.getItem("estadoSubmenus") || "{}",
    );
    estadoSubmenus[submenuId] = isOpen;
    localStorage.setItem("estadoSubmenus", JSON.stringify(estadoSubmenus));
  } catch (error) {
    console.error(error);
  }
}

function obterEstadoSubmenu(submenuId) {
  try {
    return (
      JSON.parse(localStorage.getItem("estadoSubmenus") || "{}")[submenuId] ||
      false
    );
  } catch (e) {
    return false;
  }
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
  const menuItems = document.querySelectorAll(`#${menuItemId}`);
  const submenus = document.querySelectorAll(`#${submenuId}`);
  if (menuItems.length > 1) {
    for (let i = 1; i < menuItems.length; i++) {
      const duplicateElement = menuItems[i].closest(".nav-item-with-submenu");
      if (duplicateElement) duplicateElement.remove();
    }
  }
  if (submenus.length > 1) {
    for (let i = 1; i < submenus.length; i++) submenus[i].remove();
  }

  const menuItem = document.getElementById(menuItemId);
  const submenu = document.getElementById(submenuId);
  const menuContainer = menuItem?.parentElement;
  if (menuItem && submenu && menuContainer) {
    if (menuItem.getAttribute("data-listener-added")) return;
    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest(".submenu-item")) return;
      fecharOutrosSubmenus(submenuName);
      const isNowOpen = !menuContainer.classList.contains("open");
      menuContainer.classList.toggle("open");
      submenu.classList.toggle("open");
      salvarEstadoSubmenu(submenuName, isNowOpen);
    });

    const submenuItems = submenu.querySelectorAll(".submenu-item[href]");
    submenuItems.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        setTimeout(() => {
          menuContainer.classList.remove("open");
          submenu.classList.remove("open");
          salvarEstadoSubmenu(submenuName, false);
        }, 150);
      }),
    );
    const submenuItemsSemHref = submenu.querySelectorAll(
      ".submenu-item:not([href])",
    );
    submenuItemsSemHref.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        menuContainer.classList.remove("open");
        submenu.classList.remove("open");
        salvarEstadoSubmenu(submenuName, false);
      }),
    );

    menuItem.setAttribute("data-listener-added", "true");
  }
}

function fecharOutrosSubmenus(submenuAtual) {
  const todosSubmenus = [
    { container: "clienteMenuItem", submenu: "clienteSubmenu", id: "cliente" },
    { container: "itemMenuItem", submenu: "itemSubmenu", id: "item" },
    { container: "petMenuItem", submenu: "petSubmenu", id: "pet" },
    {
      container: "atendimentoMenuItem",
      submenu: "atendimentoSubmenu",
      id: "atendimento",
    },
    {
      container: "financeiroMenuItem",
      submenu: "financeiroSubmenu",
      id: "financeiro",
    },
    {
      container: "configuracaoMenuItem",
      submenu: "configuracaoSubmenu",
      id: "configuracao",
    },
    { container: "painelMenuItem", submenu: "painelSubmenu", id: "painel" },
    { container: "comprasMenuItem", submenu: "comprasSubmenu", id: "compras" },
  ];
  todosSubmenus.forEach(({ container, submenu, id }) => {
    if (id !== submenuAtual) {
      const containerElement =
        document.getElementById(container)?.parentElement;
      const submenuElement = document.getElementById(submenu);
      if (containerElement && submenuElement) {
        if (containerElement.classList.contains("open")) {
          containerElement.classList.remove("open");
          submenuElement.classList.remove("open");
          salvarEstadoSubmenu(id, false);
        }
      }
    }
  });
}

function limparEstadoSubmenus() {
  try {
    localStorage.removeItem("estadoSubmenus");
  } catch (e) {}
}

function destacarSecaoAtiva() {
  const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
  const mapeamentoPaginas = {
    "clientes.html": "clienteMenuItem",
    "novo-cliente.html": "clienteMenuItem",
    "grupos-clientes.html": "clienteMenuItem",
    "meus-clientes.html": "clienteMenuItem",
    "meus-itens.html": "itemMenuItem",
    "novo-item.html": "itemMenuItem",
    "agrupamento.html": "itemMenuItem",
    "marca.html": "itemMenuItem",
    "unidade.html": "itemMenuItem",
    "descontos-item.html": "itemMenuItem",
    "comissao.html": "itemMenuItem",
    "etiquetas.html": "itemMenuItem",
    "tributacao.html": "itemMenuItem",
    "estoque.html": "itemMenuItem",
    "clinica.html": "itemMenuItem",
    "manutencao-produtos.html": "itemMenuItem",
    "controle-validade.html": "itemMenuItem",
    "agendamentos-novo.html": "atendimentoMenuItem",
    "agendamentos.html": "atendimentoMenuItem",
    "minha-agenda.html": "atendimentoMenuItem",
    "meus-pets.html": "petMenuItem",
    "novo-pet.html": "petMenuItem",
    "dashboard.html": "dashboard",
  };
  const itemParaDestacar = mapeamentoPaginas[paginaAtual];
  if (itemParaDestacar && itemParaDestacar !== "dashboard") {
    const menuItem = document.getElementById(itemParaDestacar);
    if (menuItem) {
      document
        .querySelectorAll(".nav-item")
        .forEach((item) => item.classList.remove("active"));
      menuItem.classList.add("active");
    }
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", async function () {
  // Pré-carregar produtos da API para uso em autocompletes e composições
  try {
    await getMeusItensFromAPI();
    console.log("✅ Produtos carregados da API");
  } catch (e) {
    console.error("⚠️ Erro ao pré-carregar produtos:", e);
  }

  detectarIDsDuplicados();
  // remover ícones antigos de reticências para evitar duplicação com o botão customizado
  try {
    document
      .querySelectorAll(".input-with-icon .input-icon")
      .forEach((el) => el.remove());
  } catch (e) {}
  limparEstadoSubmenus();

  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  if (menuToggle && sidebar && mainContent) {
    if (!menuToggle.hasAttribute("data-toggle-configured")) {
      menuToggle.setAttribute("data-toggle-configured", "true");
      menuToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
      });
    }
  }

  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768) {
      if (
        sidebar &&
        mainContent &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        sidebar.classList.add("collapsed");
        mainContent.classList.add("sidebar-collapsed");
      }
    }
  });

  configurarDropdownInicioRapido();
  configurarPersistenciaSubmenu("clienteMenuItem", "clienteSubmenu", "cliente");
  configurarPersistenciaSubmenu("itemMenuItem", "itemSubmenu", "item");
  configurarPersistenciaSubmenu("painelMenuItem", "painelSubmenu", "painel");
  configurarPersistenciaSubmenu("petMenuItem", "petSubmenu", "pet");
  configurarPersistenciaSubmenu(
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "atendimento",
  );
  configurarPersistenciaSubmenu(
    "financeiroMenuItem",
    "financeiroSubmenu",
    "financeiro",
  );
  configurarPersistenciaSubmenu(
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "configuracao",
  );
  configurarPersistenciaSubmenu("comprasMenuItem", "comprasSubmenu", "compras");
  destacarSecaoAtiva();
  // conectar o botão Editar Composição para abrir o gerenciador de composições
  try {
    document.querySelectorAll(".btn-editar-composicao").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openComposicaoManagerModal();
      });
    });
  } catch (e) {
    console.debug("btn-editar-composicao listener falhou", e);
  }
});

// Funções de navegação rápida (shims)
function novoAtendimento() {
  window.location.href = "/agendamentos-novo.html";
  closeDropdown();
}
function novoPet() {
  window.location.href = "/pets/cadastro-pet.html";
  closeDropdown();
}
function novoCliente() {
  window.location.href = "/clientes.html";
  closeDropdown();
}
function novoContrato() {
  window.location.href = "/contrato-novo.html";
  closeDropdown();
}
function novaVenda() {
  window.location.href = "/venda-nova.html";
  closeDropdown();
}
function novaContaPagar() {
  window.location.href = "/contas-pagar-nova.html";
  closeDropdown();
}
function closeDropdown() {
  const dropdown = document.querySelector(".dropdown");
  if (dropdown) dropdown.classList.remove("open");
}

// Configurar submenu lateral para Caixa
// ⚠️ Elementos opcionais — algumas páginas não possuem o submenu lateral.
// A função agora silencia silenciosamente quando os elementos não existem
// (em vez de logar erros que poluem o console).
function configurarSubmenuLateralCaixa() {
  // Buscar elementos com fallback para os IDs reais usados nas páginas.
  const caixaSubmenuItem =
    document.getElementById("caixaSubmenuItem") ||
    document.getElementById("attBtnCaixa");
  const caixaLateralSubmenu =
    document.getElementById("caixaLateralSubmenu") ||
    document.getElementById("attSubCaixa");
  const submenuItemWithLateral = document.querySelector(
    ".submenu-item-with-lateral",
  );

  // Se os elementos não existem (página sem o submenu lateral), sair silenciosamente.
  if (!caixaSubmenuItem || !caixaLateralSubmenu) return;
  if (caixaLateralSubmenu.id !== "caixaLateralSubmenu" && !submenuItemWithLateral) {
    // Fallback: usar o próprio botão como trigger de hover se não houver container lateral.
    const trigger =
      submenuItemWithLateral || caixaSubmenuItem;

    let isSubmenuVisible = false;

    // Configurar hover no trigger
    trigger.addEventListener("mouseenter", function () {
      caixaLateralSubmenu.style.display = "block";
      isSubmenuVisible = true;
    });
    trigger.addEventListener("mouseleave", function () {
      setTimeout(() => {
        if (!caixaLateralSubmenu.matches(":hover")) {
          caixaLateralSubmenu.style.display = "none";
          isSubmenuVisible = false;
        }
      }, 100);
    });
    caixaLateralSubmenu.addEventListener("mouseenter", function () {
      caixaLateralSubmenu.style.display = "block";
      isSubmenuVisible = true;
    });
    caixaLateralSubmenu.addEventListener("mouseleave", function () {
      caixaLateralSubmenu.style.display = "none";
      isSubmenuVisible = false;
    });
    return;
  }

  // Configuração completa (com submenuItemWithLateral presente)
  if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
    let isSubmenuVisible = false;

    // Função para mostrar submenu
    const showSubmenu = () => {
      caixaLateralSubmenu.style.opacity = "1";
      caixaLateralSubmenu.style.visibility = "visible";
      caixaLateralSubmenu.style.transform = "translateX(0)";
      isSubmenuVisible = true;
    };

    // Função para esconder submenu
    const hideSubmenu = () => {
      caixaLateralSubmenu.style.opacity = "0";
      caixaLateralSubmenu.style.visibility = "hidden";
      caixaLateralSubmenu.style.transform = "translateX(-10px)";
      isSubmenuVisible = false;
    };

    // Configurar hover no container principal
    submenuItemWithLateral.addEventListener("mouseenter", function () {
      showSubmenu();
    });
    submenuItemWithLateral.addEventListener("mouseleave", function () {
      setTimeout(hideSubmenu, 100);
    });

    // Configurar hover no submenu lateral
    caixaLateralSubmenu.addEventListener("mouseenter", function () {
      showSubmenu();
    });
    caixaLateralSubmenu.addEventListener("mouseleave", function () {
      hideSubmenu();
    });

    // Adicionar event listeners para os itens do submenu lateral
    const lateralItems = caixaLateralSubmenu.querySelectorAll(
      ".lateral-submenu-item",
    );
    lateralItems.forEach((item) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const texto = this.textContent.trim();

        // Aqui você pode adicionar navegação específica para cada item
        switch (texto) {
          case "Abertura/Fechamento":
            window.location.href = "/Caixa/abertura-fechamento.html";
            break;
          case "Suprimento/Sangria":
            window.location.href = "/Caixa/suprimento-sangria.html";
            break;
          case "Rel. Demonstrativo de caixa":
            // Sem página definida ainda
            break;
        }

        hideSubmenu();
      });
    });
  }
  // Se não houver todos os elementos, não logar nada (silencioso).
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();
  }, 200);

  // Inicializar funcionalidades do formulário
  inicializarFormulario();
});

// ========================================
//   FUNCIONALIDADES DO FORMULÁRIO
// ========================================

let produtoAtual = null;

// Array de produtos de exemplo (mesmo do pagina-produto.js)
const produtosExemplo = [
  {
    id: 1,
    nome: "Quatree Snacks Bifinho Sabor Carne 500g",
    codigo: "QT-BIF-500",
    categoria: "Alimentos",
    tipo: "produto",
    finalidade: "revenda",
    centroResultado: "Loja - Venda de Produtos",
    custoBase: 21.0,
    margem: 52.38,
    preco: 31.9,
    estoqueMinimo: 1000,
    estoqueIdeal: 3000,
    estoqueAtual: 3000,
    marca: "Quatree",
    unidade: "UN",
    agrupamento: "",
    perfilComissao: "",
    curva: "",
    diasOportunidadeVenda: "",
    codigoBarras: "",
    ncm: "",
    cest: "",
    perfilDesconto: "",
    empresa: "PET CRIA",
    permiteEstoqueNegativo: "nao",
    localizacao: "",
    fatorCompra: "",
    atendimento: "",
    observacao: "",
    perfilValidade: "",
    validade: "",
  },
  {
    id: 2,
    nome: "Ração Premium Golden Para Cães Adultos 15kg",
    codigo: "GOLD-15KG",
    categoria: "Alimentos",
    tipo: "produto",
    finalidade: "revenda",
    centroResultado: "Loja - Venda de Produtos",
    custoBase: 145.0,
    margem: 31.03,
    preco: 189.9,
    estoqueMinimo: 50,
    estoqueIdeal: 150,
    estoqueAtual: 120,
    marca: "Golden",
    unidade: "UN",
    agrupamento: "",
    perfilComissao: "",
    curva: "",
    diasOportunidadeVenda: "",
    codigoBarras: "",
    ncm: "",
    cest: "",
    perfilDesconto: "",
    empresa: "PET CRIA",
    permiteEstoqueNegativo: "nao",
    localizacao: "",
    fatorCompra: "",
    atendimento: "",
    observacao: "",
    perfilValidade: "",
    validade: "",
  },
];

function inicializarFormulario() {
  console.log("🎨 Inicializando formulário de edição de produto...");

  // Verificar se há produto para clonar
  let produtoClonar = null;
  try {
    const raw = localStorage.getItem("produtoClonar");
    if (raw) produtoClonar = JSON.parse(raw);
  } catch (e) {}
  const urlParams = new URLSearchParams(window.location.search);
  const produtoId = urlParams.get("id");
  if (produtoClonar) {
    console.log("🟢 Clonando produto:", produtoClonar);
    preencherFormulario(produtoClonar);
    try {
      localStorage.removeItem("produtoClonar");
    } catch (e) {}
  } else if (produtoId) {
    console.log(`📦 Carregando produto ID: ${produtoId}`);
    carregarDadosProduto(parseInt(produtoId));
  }

  // Configurar botões toggle (Tipo, Finalidade, Estoque Negativo)
  configurarBotoesToggle();
  // Se a URL contém ?tipo=..., aplicar seleção inicial (produto/servico/plano)
  try {
    const tipoUrl = urlParams.get("tipo");
    if (tipoUrl) {
      const norm = String(tipoUrl || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      let candidate = null;
      if (norm.indexOf("produto") !== -1) candidate = "produto";
      else if (norm.indexOf("servico") !== -1 || norm.indexOf("servi") !== -1)
        candidate = "servico";
      else if (norm.indexOf("plano") !== -1) candidate = "plano";
      if (candidate) {
        const btn = document.querySelector(
          `.btn-toggle[data-value="${candidate}"]`,
        );
        if (btn) {
          // usar click para disparar handlers já existentes (altera classe e hidden input)
          setTimeout(() => {
            try {
              btn.click();
            } catch (e) {}
          }, 10);
        } else {
          const hidden = document.getElementById("tipo");
          if (hidden) hidden.value = candidate;
        }
      }
    }
  } catch (e) {
    console.debug("aplicar tipo da URL falhou", e);
  }

  // Configurar cálculo de margem
  configurarCalculoMargem();

  // Configurar editor de texto do contrato
  configurarEditorTexto();

  // Configurar botão Salvar
  const formEditarProduto = document.getElementById("formEditarProduto");
  if (formEditarProduto) {
    formEditarProduto.addEventListener("submit", salvarProduto);
  }

  // Toggle do painel de Dados Fiscais
  const btnToggleFiscal = document.getElementById("btnToggleFiscal");
  if (btnToggleFiscal) {
    btnToggleFiscal.addEventListener("click", function () {
      const painel = document.getElementById("painelDadosFiscais");
      const icon = document.getElementById("iconToggleFiscal");
      if (!painel) return;
      if (painel.style.display === "none" || painel.style.display === "") {
        painel.style.display = "block";
        if (icon) icon.className = "fas fa-chevron-up";
        btnToggleFiscal.innerHTML =
          '<i class="fas fa-chevron-up" id="iconToggleFiscal"></i> Recolher';
      } else {
        painel.style.display = "none";
        if (icon) icon.className = "fas fa-chevron-down";
        btnToggleFiscal.innerHTML =
          '<i class="fas fa-chevron-down" id="iconToggleFiscal"></i> Expandir';
      }
    });
  }

  // Configurar botão Novo
  const btnNovo = document.getElementById("btnNovo");
  if (btnNovo) {
    btnNovo.addEventListener("click", limparFormulario);
  }

  // Configurar botão Cancelar
  const btnCancelar = document.getElementById("btnCancelar");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", cancelarEdicao);
  }

  console.log("✅ Formulário inicializado com sucesso!");
  // Configurar dropdown de Centro de Resultado
  configurarDropdownCentroResultado();
  // Configurar dropdown de Categoria (lista local)
  configurarDropdownCategoria();
  // Configurar dropdown de Agrupamento (puxa dados de agrupamento.html)
  configurarDropdownAgrupamento();
  // Configurar dropdown de Unidade (puxa dados de unidade.html / fallback)
  configurarDropdownUnidade();
  // Configurar dropdown de Marca (puxa dados de marca.html / fallback)
  configurarDropdownMarca();
  // Configurar dropdown Perfil de Desconto (puxa de ../descontos/index.html)
  configurarDropdownPerfilDesconto();
  // Configurar dropdown Perfil de Comissão (apenas perfis de produto)
  try {
    configurarDropdownPerfilComissaoNovo();
  } catch (e) {
    console.debug("configurarDropdownPerfilComissaoNovo falhou", e);
  }
  // Configurar dropdown Perfil de Validade (e quick-new)
  try {
    configurarDropdownPerfilValidadeNovo();
  } catch (e) {
    console.debug("configurarDropdownPerfilValidadeNovo falhou", e);
  }
  // Configurar seção de Fornecedores (modal de adicionar fornecedor)
  configurarFornecedores();
  // Configurar campos de Código de Barras dinâmicos
  try {
    setupBarcodeFields();
  } catch (e) {
    console.debug("setupBarcodeFields falhou", e);
  }
  // Preencher campo empresa com nome fantasia da primeira empresa cadastrada
  try {
    loadEmpresaNome();
  } catch (e) {
    console.debug("loadEmpresaNome falhou", e);
  }
}

// Busca empresas e preenche o campo `empresa` com o nome (nome fantasia)
async function loadEmpresaNome() {
  try {
    const el = document.getElementById("empresa");
    if (!el) return;
    const empresas = await ApiClient.getEmpresas();
    if (!empresas || empresas.length === 0) return;
    // procurar empresa que corresponda ao valor atual (se houver)
    const current = (el.value || "").toString().trim();
    let chosen = null;
    if (current) {
      chosen = empresas.find(
        (e) =>
          (e.nome || "").toString().trim() === current ||
          String(e.id || "") === current,
      );
    }
    if (!chosen) {
      // preferir empresas ativas
      chosen = empresas.find((e) => e.ativa === true) || empresas[0];
    }
    if (chosen && chosen.nome) {
      el.value = chosen.nome;
      el.setAttribute("readonly", "readonly");
    }
  } catch (err) {
    console.debug("Erro loadEmpresaNome", err);
  }
}

// ---------- Fornecedores (modal de adicionar + tabela) ----------
function fetchFornecedoresLista() {
  // Sempre buscar direto da API de fornecedores (sem localStorage), retorna [{descricao}]
  return ApiClient.getFornecedores()
    .then((resp) => {
      if (!Array.isArray(resp)) return [];
      return resp.map((f) => ({
        descricao: f.nome || f.razaoSocial || f.nomeFantasia || f.display || f,
      }));
    })
    .catch((err) => {
      console.warn("fetchFornecedoresLista API failed", err);
      return [];
    });
}

function configurarFornecedores() {
  const btn = document.querySelector(".btn-add-fornecedor");
  const tbody = document.getElementById("fornecedoresTableBody");
  if (!btn || !tbody) return;

  // helper: abre modal de fornecedor (usado para adicionar ou editar)
  function openFornecedorModal(prefill, onSave) {
    prefill = prefill || {};
    const overlay = document.createElement("div");
    overlay.removeAttribute("class");
    overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 99999 !important;
        `;
    const modal = document.createElement("div");
    modal.removeAttribute("class");
    modal.style.cssText = `
            background-color: #fff !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
            max-width: 600px !important;
            width: 90% !important;
            padding: 0 !important;
            position: relative !important;
        `;
    modal.innerHTML = `
            <div style="padding: 16px 20px; border-bottom: 1px solid #ddd; display:flex; align-items:center; justify-content:space-between;">
                <h3 style="margin:0; font-size: 18px; color: #333;">Novo Fornecedor/Referência</h3>
                <button type="button" class="modal-close" aria-label="Fechar" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            <div style="padding: 18px 20px;">
                <div style="margin-bottom: 14px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500;">Fornecedor:</label>
                    <div style="position: relative;">
                        <input type="text" id="modalFornecedor" placeholder="Digite para pesquisar" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
                    </div>
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500;">Referência:</label>
                    <input type="text" id="modalReferencia" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500;">Fator de Compra:</label>
                    <input type="text" id="modalFatorCompra" autocomplete="off" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
                </div>
            </div>
            <div style="padding: 14px 20px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #ddd;">
                <button type="button" id="modalSalvarFornecedor" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
                <button type="button" id="modalCancelarFornecedor" style="padding: 8px 16px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
            </div>
        `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // fechar handlers (usa closeModal para também limpar dropdown e listeners)
    function closeModal() {
      try {
        document.removeEventListener("click", onDocClickFornecedores);
      } catch (e) {}
      try {
        if (dropdown && dropdown.parentElement)
          dropdown.parentElement.removeChild(dropdown);
      } catch (e) {}
      try {
        overlay.remove();
      } catch (e) {}
    }
    overlay
      .querySelector(".modal-close")
      .addEventListener("click", () => closeModal());
    overlay
      .querySelector("#modalCancelarFornecedor")
      .addEventListener("click", () => closeModal());

    // carregar lista para typeahead
    let cached = null;
    let dropdown = null;
    fetchFornecedoresLista()
      .then((items) => {
        cached = items;
      })
      .catch(() => {});

    const input = overlay.querySelector("#modalFornecedor");
    const refInput = overlay.querySelector("#modalReferencia");
    const fatorInput = overlay.querySelector("#modalFatorCompra");

    // preencher se houver prefill
    try {
      if (prefill.fornecedor) input.value = prefill.fornecedor;
    } catch (e) {}
    try {
      if (prefill.referencia) refInput.value = prefill.referencia;
    } catch (e) {}
    try {
      if (prefill.fator) fatorInput.value = prefill.fator;
    } catch (e) {}
    try {
      if (prefill.fornecedorId)
        input.dataset.fornecedorId = String(prefill.fornecedorId);
    } catch (e) {}

    function createFornecedorDropdown(items) {
      if (dropdown && dropdown.parentElement)
        dropdown.parentElement.removeChild(dropdown);
      dropdown = document.createElement("div");
      dropdown.style.cssText = `
                position: absolute !important;
                background: white !important;
                border: 1px solid #ccc !important;
                border-radius: 4px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                max-height: 300px !important;
                overflow-y: auto !important;
                z-index: 999999 !important;
            `;

      if (!items || items.length === 0) {
        const el = document.createElement("div");
        el.style.cssText = "padding: 10px 14px; color: #999; font-size: 14px;";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        items.forEach((it) => {
          const el = document.createElement("div");
          el.style.cssText = `
                        padding: 10px 14px !important;
                        cursor: pointer !important;
                        font-size: 14px !important;
                        border-bottom: 1px solid #f0f0f0 !important;
                    `;
          el.textContent = it.descricao;
          el.addEventListener(
            "mouseenter",
            () => (el.style.backgroundColor = "#f5f5f5"),
          );
          el.addEventListener(
            "mouseleave",
            () => (el.style.backgroundColor = "white"),
          );
          el.addEventListener("click", () => {
            input.value = it.descricao;
            try {
              input.dataset.fornecedorId = String(it.id || "");
            } catch (e) {}
            if (dropdown && dropdown.parentElement)
              dropdown.parentElement.removeChild(dropdown);
            dropdown = null;
          });
          dropdown.appendChild(el);
        });
      }

      // posicionar fixo (não rola com a página) usando coordenadas da viewport
      const rect = input.getBoundingClientRect();
      dropdown.style.position = "fixed";
      dropdown.style.left = rect.left + "px";
      dropdown.style.top = rect.bottom + 6 + "px";
      dropdown.style.minWidth = rect.width + "px";
      document.body.appendChild(dropdown);
    }

    function showFornecedorDropdown() {
      if (dropdown) return;
      if (cached) {
        createFornecedorDropdown(cached);
        return;
      }
      fetchFornecedoresLista()
        .then((items) => {
          cached = items;
          createFornecedorDropdown(items);
        })
        .catch(() => {
          createFornecedorDropdown([]);
        });
    }

    input.addEventListener("focus", showFornecedorDropdown);
    input.addEventListener("click", showFornecedorDropdown);

    input.addEventListener("input", function (e) {
      // ao digitar, invalidar o fornecedorId selecionado previamente
      try {
        delete input.dataset.fornecedorId;
      } catch (e) {}
      const q = (input.value || "").toLowerCase().trim();
      if (!cached) return;
      const filtered = cached.filter((it) =>
        (it.descricao || "").toLowerCase().includes(q),
      );
      createFornecedorDropdown(filtered);
    });

    // fechar dropdown ao clicar fora (considerando overlay e dropdown)
    function onDocClickFornecedores(e) {
      if (
        !overlay.contains(e.target) &&
        !(dropdown && dropdown.contains(e.target))
      ) {
        if (dropdown && dropdown.parentElement)
          dropdown.parentElement.removeChild(dropdown);
        dropdown = null;
      }
    }
    setTimeout(() => {
      document.addEventListener("click", onDocClickFornecedores);
    }, 10);

    // salvar
    overlay
      .querySelector("#modalSalvarFornecedor")
      .addEventListener("click", function () {
        const fornecedor = input.value.trim();
        const referencia = refInput.value.trim();
        const fator = fatorInput.value.trim();
        const fornecedorId =
          input.dataset && input.dataset.fornecedorId
            ? String(input.dataset.fornecedorId)
            : null;
        if (!fornecedor) {
          showToast("Informe o fornecedor", "warning");
          return;
        }
        try {
          closeModal();
        } catch (e) {}
        if (typeof onSave === "function")
          onSave({ fornecedor, referencia, fator, fornecedorId });
      });
  }

  // botão adicionar abre modal para criar nova linha
  btn.addEventListener("click", function () {
    openFornecedorModal(null, function (data) {
      const fornecedor = data.fornecedor;
      const referencia = data.referencia;
      const fator = data.fator;
      const fornecedorId = data.fornecedorId || "";
      const tr = document.createElement("tr");
      tr.dataset.fornecedorId = fornecedorId || "";
      tr.innerHTML = `<td>${fornecedor}</td><td>${referencia}</td><td>${fator}</td><td><button type="button" class="btn-action btn-edit" title="Editar"><i class="fas fa-edit"></i></button></td><td><button type="button" class="btn-action btn-delete" title="Excluir"><i class="fas fa-trash"></i></button></td>`;
      tbody.appendChild(tr);
      // delete handler
      tr.querySelector(".btn-delete").addEventListener("click", () => {
        tr.parentElement.removeChild(tr);
      });
      // edit handler: reabrir modal com dados da linha e atualizar
      tr.querySelector(".btn-edit").addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const currentFornecedor = tr.children[0].textContent.trim();
        const currentReferencia = tr.children[1].textContent.trim();
        const currentFator = tr.children[2].textContent.trim();
        const prefill = {
          fornecedor: currentFornecedor,
          referencia: currentReferencia,
          fator: currentFator,
          fornecedorId: tr.dataset.fornecedorId,
        };
        openFornecedorModal(prefill, function (updated) {
          tr.children[0].textContent = updated.fornecedor;
          tr.children[1].textContent = updated.referencia;
          tr.children[2].textContent = updated.fator;
          try {
            tr.dataset.fornecedorId = updated.fornecedorId || "";
          } catch (e) {}
        });
      });
    });
  });
}

// normaliza texto para comparação (remove acentos, trim, lowercase)
function normalizeText(s) {
  try {
    return (s || "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  } catch (e) {
    // fallback para ambientes sem suporte a \p{Diacritic}
    return (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }
}

// Dropdown para Categoria (dados locais das imagens)
function configurarDropdownCategoria() {
  const input = document.getElementById("categoria");
  if (!input) return;

  // lista baseada nas imagens enviadas
  const categorias = [
    "Antiparasitário",
    "Banho",
    "Consulta",
    "Diária",
    "Exame",
    "Procedimento Cirúrgico",
    "Procedimento Clínico",
    "Procedimento Estético",
    "Retorno",
    "Tosa",
    "Vacina",
    "Vermífugo",
    "Banho e Tosa",
    "Rações - Loja",
  ];

  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }

  let dropdown = null;
  let suppress = false;

  input.addEventListener("focus", show);
  input.addEventListener("click", show);

  function show(e) {
    e.stopPropagation();
    if (suppress || dropdown) return;
    const list = document.createElement("div");
    list.className = "select-dropdown";
    categorias.forEach((text) => {
      const it = document.createElement("div");
      it.className = "select-item";
      it.textContent = text;
      it.addEventListener("click", () => {
        input.value = text;
        close();
        try {
          input.blur();
        } catch (e) {}
      });
      list.appendChild(it);
    });
    wrapper.appendChild(list);
    dropdown = list;
    // position below and match width
    dropdown.style.left = input.offsetLeft + "px";
    dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
    dropdown.style.minWidth = input.offsetWidth + "px";
  }

  function close() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppress = true;
    setTimeout(() => {
      suppress = false;
    }, 120);
  }
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) close();
  });
}

// -------------------------
// Dropdown Centro de Resultado
// -------------------------
async function fetchCentroResultados() {
  try {
    const resp = await ApiClient.getCentrosResultado();
    if (!Array.isArray(resp)) return [];
    return resp
      .map((c) => ({
        descricao: c.descricao || c.display || c.name || "",
        unidade: c.unidade || c.unidadeNegocio || c.unidade_negocio || "",
      }))
      .filter((x) => x.descricao);
  } catch (err) {
    console.error("Erro ao buscar centros de resultado da API:", err);
    return [];
  }
}

// Versão ampliada: busca também em localStorage (chave 'centros_list') e mescla sem duplicados
// Keep a simple API-driven fetch; do not merge with localStorage (DB-first)
function fetchCentroResultadosMerged() {
  return fetchCentroResultados();
}

function configurarDropdownCentroResultado() {
  const input = document.getElementById("centroResultado");
  if (!input) return;

  // wrapper para posicionamento do dropdown
  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    wrapper.replaceChild(wrap, input);
    wrap.appendChild(input);
    wrapper = wrap;
  }

  // desativar autocomplete do navegador
  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
  } catch (e) {}

  let dropdown = null;
  let cached = null;
  let suppressOpen = false; // evita reabrir imediatamente após fechar

  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);
  // typeahead para marca
  input.addEventListener("input", function () {
    const q = (input.value || "").trim().toLowerCase();
    if (!cached) return;
    const filtered = cached.filter((it) =>
      (it.descricao || "").toLowerCase().includes(q),
    );
    if (!dropdown) createListFiltered(filtered);
    else {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", () => {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
    }
  });

  function createListFiltered(items) {
    dropdown = document.createElement("div");
    dropdown.className = "select-dropdown";
    if (items.length === 0) {
      const el = document.createElement("div");
      el.className = "select-item no-results";
      el.textContent = "Nenhum resultado";
      dropdown.appendChild(el);
    } else {
      items.forEach((it) => {
        const el = document.createElement("div");
        el.className = "select-item";
        el.textContent = it.descricao;
        el.addEventListener("click", () => {
          input.value = it.descricao;
          closeDropdown();
          try {
            input.blur();
          } catch (e) {}
        });
        dropdown.appendChild(el);
      });
    }
    wrapper.appendChild(dropdown);
    dropdown.style.left = input.offsetLeft + "px";
    dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
    dropdown.style.minWidth = input.offsetWidth + "px";
  }

  // mostrar sugestões enquanto digita (typeahead)
  input.addEventListener("input", function () {
    const q = (input.value || "").trim().toLowerCase();
    if (!cached) return; // ainda não carregado
    const filtered = cached.filter((it) => {
      const u = (it.unidade || "").toLowerCase();
      const d = (it.descricao || "").toLowerCase();
      return u.includes(q) || d.includes(q);
    });
    if (!dropdown) {
      // abrir com os filtrados
      createListFiltered(filtered);
    } else {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent =
            (it.unidade ? it.unidade : "") +
            (it.descricao ? " - " + it.descricao : "");
          el.addEventListener("click", () => {
            input.value = it.unidade || it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
    }
  });

  function createListFiltered(items) {
    dropdown = document.createElement("div");
    dropdown.className = "select-dropdown";
    if (items.length === 0) {
      const el = document.createElement("div");
      el.className = "select-item no-results";
      el.textContent = "Nenhum resultado";
      dropdown.appendChild(el);
    } else {
      items.forEach((it) => {
        const el = document.createElement("div");
        el.className = "select-item";
        el.textContent =
          (it.unidade ? it.unidade : "") +
          (it.descricao ? " - " + it.descricao : "");
        el.addEventListener("click", () => {
          input.value = it.unidade || it.descricao;
          close();
          try {
            input.blur();
          } catch (e) {}
        });
        dropdown.appendChild(el);
      });
    }
    wrapper.appendChild(dropdown);
    dropdown.style.left = input.offsetLeft + "px";
    dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
    dropdown.style.minWidth = input.offsetWidth + "px";
  }

  function showDropdown(e) {
    e.stopPropagation();
    if (dropdown) return;

    const createList = (items) => {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      items.forEach((it) => {
        const el = document.createElement("div");
        el.className = "select-item";
        el.textContent = it.descricao + (it.unidade ? " — " + it.unidade : "");
        el.addEventListener("click", function (ev) {
          console.log("DEBUG centroResultado: item clicado ->", it.descricao);
          input.value = it.descricao;
          // fechar e remover foco para evitar reabertura
          try {
            closeDropdown();
            console.log("DEBUG centroResultado: closeDropdown() chamado");
          } catch (e) {
            console.error("DEBUG centroResultado: closeDropdown() erro", e);
          }
          try {
            input.blur();
          } catch (e) {}
        });
        dropdown.appendChild(el);
      });
      wrapper.appendChild(dropdown);
      // posicionar imediatamente abaixo do input e igualar largura
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    };

    if (suppressOpen) return;
    if (cached) {
      createList(cached);
      return;
    }
    fetchCentroResultadosMerged().then((items) => {
      cached = items;
      createList(items);
    });
  }

  function closeDropdown() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }

  // fechar ao clicar fora
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) closeDropdown();
  });
}

// Registrar quick-new para agrupamento quando o formulário inicializar
document.addEventListener("DOMContentLoaded", function () {
  try {
    configurarDropdownAgrupamentoQuickNewHook();
  } catch (e) {}
});

// -------------------------
// Dropdown Agrupamento
// -------------------------
function fetchAgrupamentos() {
  // Puxar diretamente da API, sem usar localStorage ou scraping
  if (
    typeof ApiClient === "undefined" ||
    typeof ApiClient.getAgrupamentos !== "function"
  ) {
    console.error("ApiClient.getAgrupamentos não disponível");
    return Promise.resolve([]);
  }
  return ApiClient.getAgrupamentos()
    .then(function (data) {
      var items = [];
      try {
        if (Array.isArray(data)) {
          data.forEach(function (g) {
            if (!g) return;
            var gName = (g.name || g.nome || g.label || "").toString().trim();
            if (gName) items.push({ descricao: gName, nivel: "grupo" });
            var subs = g.subgrupos || g.subgroups || g.children || [];
            if (typeof subs === "string") {
              try {
                subs = JSON.parse(subs);
              } catch (e) {
                subs = [subs];
              }
            }
            if (Array.isArray(subs)) {
              subs.forEach(function (s) {
                if (!s) return;
                if (typeof s === "object") {
                  var sname = s.name || s.label || s.descricao || "";
                  if (sname)
                    items.push({ descricao: String(sname), nivel: "subgrupo" });
                } else {
                  items.push({ descricao: String(s), nivel: "subgrupo" });
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn("Erro ao parsear agrupamentos da API", e);
      }
      try {
        items.sort((a, b) =>
          (a.descricao || "").localeCompare(b.descricao || ""),
        );
      } catch (e) {}
      return items;
    })
    .catch(function (err) {
      console.error("Erro ao buscar agrupamentos (API):", err);
      return [];
    });
}

function configurarDropdownAgrupamento() {
  const input = document.getElementById("agrupamento");
  if (!input) return;

  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }

  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;

  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);

  function showDropdown(e) {
    e.stopPropagation();
    if (suppressOpen) return;
    if (dropdown) return;

    const createList = (items) => {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      items.forEach((it) => {
        const el = document.createElement("div");
        el.className = "select-item";
        // adicionar prefixo visual para níveis
        const label =
          it.nivel === "grupo" ? it.descricao.toUpperCase() : it.descricao;
        el.textContent = label;
        el.addEventListener("click", function (ev) {
          input.value = it.descricao;
          closeDropdown();
          try {
            input.blur();
          } catch (e) {}
        });
        dropdown.appendChild(el);
      });
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    };

    if (cached) {
      createList(cached);
      return;
    }
    fetchAgrupamentos().then((items) => {
      cached = items;
      try {
        input.__select_cached = cached;
      } catch (e) {}
      createList(items);
    });
  }

  function closeDropdown() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }

  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) closeDropdown();
  });
}

// -------------------------
// Dropdown Unidade
// -------------------------
function fetchUnidades() {
  // Preferir ApiClient se disponível
  try {
    if (typeof ApiClient !== "undefined" && ApiClient.getUnidades) {
      return ApiClient.getUnidades()
        .then((list) => {
          if (!Array.isArray(list)) return [];
          return list.map((u) => ({
            id: u.id,
            slug: u.slug,
            descricao: u.descricao,
            unidade: u.unidade,
          }));
        })
        .catch((err) => {
          console.error("Erro ApiClient.getUnidades:", err);
          return [];
        });
    }
  } catch (e) {
    console.debug("ApiClient not available for unidades", e);
  }

  // Chamar API REST /api/unidades
  return fetch("/api/unidades")
    .then((r) => {
      if (!r.ok) throw new Error("status " + r.status);
      return r.json();
    })
    .then((list) => {
      if (!Array.isArray(list)) return [];
      return list.map((u) => ({
        id: u.id,
        slug: u.slug,
        descricao: u.descricao,
        unidade: u.unidade,
      }));
    })
    .catch((err) => {
      console.error("Erro ao buscar unidades via API/fallback:", err);
      return [{ descricao: "Unidade", unidade: "UN" }];
    });
}

function configurarDropdownUnidade() {
  const input = document.getElementById("unidade");
  if (!input) return;

  // pré-selecionar UN se vazio
  try {
    if (!input.value || input.value.trim() === "") input.value = "UN";
  } catch (e) {}

  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }

  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;

  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);

  // typeahead: filtrar lista enquanto digita
  input.addEventListener("input", function () {
    const q = normalizeText(input.value || "");
    if (!cached) return; // ainda não carregado
    const filtered = cached.filter((it) => {
      const u = normalizeText(it.unidade || "");
      const d = normalizeText(it.descricao || "");
      return u.includes(q) || d.includes(q);
    });
    if (!dropdown) {
      // abrir com os filtrados
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent =
            (it.unidade ? it.unidade : "") +
            (it.descricao ? " - " + it.descricao : "");
          el.addEventListener("click", () => {
            input.value = it.unidade || it.descricao;
            close();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    } else {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent =
            (it.unidade ? it.unidade : "") +
            (it.descricao ? " - " + it.descricao : "");
          el.addEventListener("click", () => {
            input.value = it.unidade || it.descricao;
            close();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
    }
  });

  function showDropdown(e) {
    e.stopPropagation();
    if (suppressOpen || dropdown) return;
    const createList = (items) => {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      items.forEach((it) => {
        const el = document.createElement("div");
        el.className = "select-item";
        el.textContent =
          (it.unidade ? it.unidade : "") +
          (it.descricao ? " - " + it.descricao : "");
        el.addEventListener("click", () => {
          input.value = it.unidade || it.descricao;
          close();
          try {
            input.blur();
          } catch (e) {}
        });
        dropdown.appendChild(el);
      });
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    };

    if (cached) {
      createList(cached);
      return;
    }
    fetchUnidades().then((items) => {
      cached = items;
      createList(items);
    });
  }

  function close() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) close();
  });
}

// -------------------------
// Dropdown Marca
// -------------------------
function fetchMarcas() {
  // Preferir API centralizada para marcas
  try {
    if (typeof ApiClient !== "undefined" && ApiClient.getMarcas) {
      return ApiClient.getMarcas()
        .then((list) => {
          if (!Array.isArray(list)) return [];
          const items = list
            .map((d) => ({ descricao: (d || "").toString().trim() }))
            .filter((x) => x.descricao);
          items.sort((a, b) =>
            (a.descricao || "").localeCompare(b.descricao || "", "pt-BR"),
          );
          return items;
        })
        .catch((err) => {
          console.error("Erro ao buscar marcas via API:", err);
          return [];
        });
    }
  } catch (e) {
    console.debug("ApiClient não disponível ao buscar marcas:", e);
  }

  // Fallback robusto: tentar carregar página marca.html (quando API não existe)
  const url = "./marca.html";
  return fetch(url)
    .then((r) => r.text())
    .then((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const rows = Array.from(doc.querySelectorAll(".marcas-table tbody tr"));
      if (rows.length > 0) {
        return rows
          .map((r) => {
            const descricao = r.querySelector(".descricao-cell")
              ? r.querySelector(".descricao-cell").textContent.trim()
              : r.textContent.trim();
            return { descricao };
          })
          .filter((x) => x.descricao);
      }
      return [];
    })
    .catch((err) => {
      console.error("Erro ao buscar marcas fallback:", err);
      return [];
    });
}

function configurarDropdownMarca() {
  const input = document.getElementById("marca");
  if (!input) return;

  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }

  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;
  // pré-carregar lista para que digitar mostre sugestões imediatamente
  fetchMarcas()
    .then((items) => {
      cached = items;
      try {
        input.__select_cached = cached;
      } catch (e) {}
    })
    .catch(() => {});
  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);

  // typeahead: filtrar marcas enquanto digita
  input.addEventListener("input", function () {
    const q = normalizeText(input.value || "");
    if (!cached) return;
    const filtered = cached.filter((it) =>
      normalizeText(it.descricao || "").includes(q),
    );
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", () => {
            input.value = it.descricao;
            close();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    } else {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", () => {
            input.value = it.descricao;
            close();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
    }
  });

  function showDropdown(e) {
    e.stopPropagation();
    if (suppressOpen || dropdown) return;
    const createList = (items) => {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      items.forEach((it) => {
        const el = document.createElement("div");
        el.className = "select-item";
        el.textContent = it.descricao;
        el.addEventListener("click", () => {
          input.value = it.descricao;
          close();
          try {
            input.blur();
          } catch (e) {}
        });
        dropdown.appendChild(el);
      });
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    };

    if (cached) {
      createList(cached);
      return;
    }
    fetchMarcas().then((items) => {
      cached = items;
      createList(items);
    });
  }

  function close() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) close();
  });

  // adicionar botão quick-new '...' ao lado do input (salva em localStorage 'marcas_list')
  try {
    addQuickNewControl("marca", "marcas_list", "Nova Marca de Produto");
  } catch (e) {}
}

// adicionar quick-new para agrupamento
function configurarDropdownAgrupamentoQuickNewHook() {
  try {
    addQuickNewControl("agrupamento", "agrupamentos_list", "Novo Agrupamento");
  } catch (e) {}
}

// -------------------------
// Dropdown Perfil de Desconto
// -------------------------
function fetchPerfisDesconto() {
  // Carregar perfis de produto via API (sem usar localStorage)
  try {
    return ApiClient.getPerfisProduto()
      .then((list) => {
        if (!Array.isArray(list)) return [];
        // Filtrar possíveis perfis de "validade" que foram gravados por engano no mesmo endpoint
        return list
          .map((p) => ({
            descricao: (p.descricao || "").toString().trim(),
            id: p.id,
          }))
          .filter((x) => x.descricao)
          .filter((x) => {
            const txt = x.descricao.toLowerCase();
            // excluir padrões de validade tipo "40 - 50" ou que contenham "dias"
            if (/^\s*\d+\s*-\s*\d+\s*(dias)?\s*$/i.test(txt)) return false;
            if (
              txt.includes(" dias") ||
              txt.includes("dia") ||
              txt.match(/\b\d+\s*dias?\b/)
            )
              return false;
            return true;
          });
      })
      .catch((err) => {
        console.error("Erro ao buscar perfis de desconto via API:", err);
        return [];
      });
  } catch (e) {
    console.error("fetchPerfisDesconto unexpected error:", e);
    return Promise.resolve([]);
  }
}

function configurarDropdownPerfilDesconto() {
  console.log("🔎 configurarDropdownPerfilDesconto() iniciando (novo-produto)");
  let input = document.getElementById("perfilDesconto");
  if (!input) {
    // fallback por nome (caso o id não exista por algum motivo)
    input = document.querySelector('[name="perfilDesconto"]');
  }
  if (!input) {
    console.warn("⚠️ perfilDesconto não encontrado no DOM (novo-produto)");
    return;
  }
  try {
    input.removeAttribute("readonly");
    input.removeAttribute("disabled");
  } catch (e) {}
  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;

  fetchPerfisDesconto()
    .then((items) => {
      cached = items;
      console.debug("📥 Perfis de desconto carregados:", cached);
    })
    .catch((err) => {
      console.debug("Erro ao carregar perfis de desconto (novo-produto):", err);
    });

  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);

  input.addEventListener("input", function () {
    const q = (input.value || "").toString().toLowerCase().trim();
    if (!cached) return;
    const filtered = cached.filter((it) =>
      (it.descricao || "").toLowerCase().includes(q),
    );
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", () => {
            input.value = it.descricao;
            close();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    } else {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", () => {
            input.value = it.descricao;
            close();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
    }
  });

  function showDropdown(e) {
    try {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    } catch (e) {}
    if (suppressOpen || dropdown) return;
    const createList = (items) => {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (!items || items.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        items.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", function () {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      // assegurar que o wrapper ainda está no DOM
      try {
        wrapper.appendChild(dropdown);
      } catch (err) {
        document.body.appendChild(dropdown);
      }
      // posicionamento simples (pode ficar diferente se usarmos body)
      try {
        dropdown.style.left = input.offsetLeft + "px";
        dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
        dropdown.style.minWidth = input.offsetWidth + "px";
      } catch (err) {}
    };

    if (cached) {
      createList(cached);
      return;
    }
    fetchPerfisDesconto().then((items) => {
      cached = items;
      createList(items);
    });
  }

  function close() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }
  function closeDropdown() {
    close();
  }
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) close();
  });
}

// -------------------------
// Dropdown Perfil de Comissão (novo-produto)
// -------------------------
async function fetchPerfisComissaoNovo() {
  try {
    // Buscar perfis de comissão da API
    const perfis = await ApiClient.getPerfisComissao();
    console.log("📊 Perfis de comissão carregados da API:", perfis);

    // Filtrar apenas perfis do tipo 'produto'
    const perfisProduto = perfis.filter((p) => p.tipo === "produto");

    // Normalizar para formato esperado { descricao, perfilProduto }
    const items = perfisProduto.map((p) => ({
      descricao: p.perfilVendedor,
      perfilProduto: p.perfilVendedor,
      id: p.id,
    }));

    console.log("✅ Perfis de produto filtrados (tipo=produto):", items);
    return items;
  } catch (error) {
    console.error("❌ Erro ao buscar perfis de comissão:", error);

    // Fallback: tentar localStorage
    const normalize = (s) => (s || "").toString().trim();
    try {
      const itemsMap = {};
      // comissoes_list
      try {
        const raw = JSON.parse(localStorage.getItem("comissoes_list") || "[]");
        if (Array.isArray(raw)) {
          raw.forEach((r) => {
            try {
              if (typeof r === "string") {
                const p = normalize(r);
                if (p) itemsMap[p] = { descricao: p, perfilProduto: p };
              } else if (r && (r.perfilProduto || r.perfilVendedor)) {
                const p = normalize(r.perfilProduto);
                if (p) itemsMap[p] = { descricao: p, perfilProduto: p };
              }
            } catch (e) {}
          });
        }
      } catch (e) {}

      // comissoes_saved (itens com percentual)
      try {
        const raw2 = JSON.parse(
          localStorage.getItem("comissoes_saved") || "[]",
        );
        if (Array.isArray(raw2)) {
          raw2.forEach((s) => {
            try {
              const p = normalize(s.perfilProduto);
              if (p) itemsMap[p] = { descricao: p, perfilProduto: p };
            } catch (e) {}
          });
        }
      } catch (e) {}

      const items = Object.keys(itemsMap).map((k) => itemsMap[k]);
      return items;
    } catch (e) {
      return [];
    }
  }
}

function configurarDropdownPerfilComissaoNovo() {
  let input = document.getElementById("perfilComissao");
  if (!input) input = document.querySelector('[name="perfilComissao"]');
  if (!input) return;
  try {
    input.removeAttribute("readonly");
    input.removeAttribute("disabled");
  } catch (e) {}
  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;

  // pré-carregar apenas perfis de produto
  fetchPerfisComissaoNovo()
    .then((items) => {
      cached = items;
    })
    .catch(() => {});

  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);
  input.addEventListener("input", function () {
    const q = (input.value || "").toLowerCase();
    if (!cached) return;
    const filtered = cached.filter((it) =>
      (it.descricao || "").toLowerCase().includes(q),
    );
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", function () {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    } else {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", function () {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
    }
  });

  // Evitar que o valor de Perfil de Validade seja copiado para Perfil de Comissão
  try {
    input.addEventListener("change", function () {
      const pc = document.getElementById("perfilComissao");
      if (pc && pc.value && pc.value.trim() === (input.value || "").trim()) {
        pc.value = "";
      }
    });
  } catch (e) {
    console.debug("listener clear perfilComissao falhou", e);
  }

  function showDropdown(e) {
    e.stopPropagation();
    if (suppressOpen || dropdown) return;
    const createList = (items) => {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (!items || items.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        items.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", function () {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    };

    if (cached) {
      createList(cached);
      return;
    }
    fetchPerfisComissaoNovo().then((items) => {
      cached = items;
      createList(items);
    });
  }

  function closeDropdown() {
    const wasOpen = dropdown !== null;
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
    if (wasOpen && input && input.value && input.value.trim()) {
      mostrarPainelComissaoProduto(input.value.trim(), wrapper);
    }
  }
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) closeDropdown();
  });

  // atualizar cache quando um novo perfil de comissão for criado/modificado/excluído
  window.addEventListener("perfis_comissao:updated", function () {
    fetchPerfisComissaoNovo()
      .then((items) => {
        cached = items;
        if (dropdown) {
          dropdown.innerHTML = "";
          if (!items || items.length === 0) {
            const el = document.createElement("div");
            el.className = "select-item no-results";
            el.textContent = "Nenhum resultado";
            dropdown.appendChild(el);
          } else {
            items.forEach((it) => {
              const el = document.createElement("div");
              el.className = "select-item";
              el.textContent = it.descricao;
              el.addEventListener("click", function () {
                input.value = it.descricao;
                closeDropdown();
                try {
                  input.blur();
                } catch (e) {}
              });
              dropdown.appendChild(el);
            });
          }
        }
      })
      .catch(() => {});
  });

  // Persistir seleção atual do perfil como rascunho (mantém valor se navegar/fechar)
  try {
    const draftKey = "draft_perfilValidade";
    // carregar rascunho se houver e se input estiver vazio
    const existing = localStorage.getItem(draftKey);
    if (existing && (!input.value || input.value.trim() === "")) {
      input.value = existing;
    }
    // salvar rascunho ao mudar o valor
    input.addEventListener("change", function () {
      try {
        localStorage.setItem(draftKey, input.value || "");
      } catch (e) {}
    });
    input.addEventListener("blur", function () {
      try {
        localStorage.setItem(draftKey, input.value || "");
      } catch (e) {}
    });
    // quando produto for salvo (evento global), limpar rascunho
    window.addEventListener("produto:salvo", function () {
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {}
    });
  } catch (e) {
    console.debug("persist draft perfilValidade falhou", e);
  }
}

async function mostrarPainelComissaoProduto(perfilNome, anchorEl) {
  const painelAnterior = document.getElementById("comissao-perfil-painel");
  if (painelAnterior) painelAnterior.remove();
  if (!perfilNome || !perfilNome.trim()) return;

  const refEl = anchorEl || document.getElementById("perfilComissao");
  if (!refEl) return;
  const container = refEl.closest(".form-group") || refEl.parentElement;
  if (!container) return;

  const painel = document.createElement("div");
  painel.id = "comissao-perfil-painel";
  painel.style.cssText =
    "margin-top:8px;background:#f0f4ff;border:1px solid #c7d3f7;" +
    "border-radius:6px;padding:10px 14px;font-size:13px;line-height:1.5;";
  painel.innerHTML =
    '<div style="font-weight:600;margin-bottom:6px;color:#3a5bcd;">👥 Comissões — ' +
    perfilNome +
    '</div><div id="comissao-perfil-lista" style="color:#555;">Carregando...</div>';
  container.appendChild(painel);

  try {
    const dados = await ApiClient.request(
      `/comissoes/por-perfil?perfil=${encodeURIComponent(perfilNome)}`,
    );
    const lista = document.getElementById("comissao-perfil-lista");
    if (!lista) return;
    if (!dados || dados.length === 0) {
      lista.innerHTML =
        '<em style="color:#999;">Nenhum profissional vinculado a este perfil.</em>';
      return;
    }
    const table = document.createElement("table");
    table.style.cssText = "width:100%;border-collapse:collapse;";
    table.innerHTML =
      "<thead><tr>" +
      '<th style="text-align:left;padding:3px 6px;border-bottom:1px solid #c7d3f7;color:#3a5bcd;">Profissional</th>' +
      '<th style="text-align:right;padding:3px 6px;border-bottom:1px solid #c7d3f7;color:#3a5bcd;">Comissão</th>' +
      "</tr></thead>";
    const tbody = document.createElement("tbody");
    dados.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td style="padding:3px 6px;">${item.profissionalNome || item.perfilVendedor}</td>` +
        `<td style="text-align:right;padding:3px 6px;font-weight:600;">${parseFloat(item.percentual || 0).toFixed(2)}%</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    lista.innerHTML = "";
    lista.appendChild(table);
  } catch (err) {
    const lista = document.getElementById("comissao-perfil-lista");
    if (lista)
      lista.innerHTML =
        '<em style="color:#c0392b;">Erro ao buscar comissões.</em>';
  }
}

// Busca perfis de validade via API (substitui uso de localStorage)
async function fetchPerfisValidadeNovo() {
  try {
    const resp = await ApiClient.getPerfisProduto();
    if (!Array.isArray(resp)) return [];
    // Filtrar entradas indesejadas (ex.: perfis de desconto que eventualmente apareçam aqui)
    const filteredResp = resp.filter((p) => {
      const txt = (p.descricao || p.nome || p.value || "")
        .toString()
        .toLowerCase();
      // Excluir perfis que claramente sejam relacionados a descontos
      if (txt.includes("desconto")) return false;
      // Excluir perfis que contenham padrões de configuração de desconto
      if (txt.includes("fixo:") || txt.includes("maximo:") || txt.includes("%"))
        return false;
      return true;
    });
    const items = filteredResp.map((p) => ({
      descricao: (p.descricao || p.nome || p.value || "").toString(),
      alerta1: p.alerta1 || 0,
      alerta2: p.alerta2 || 0,
    }));
    return items;
  } catch (e) {
    console.debug("[fetchPerfisValidadeNovo] erro ao buscar perfis via API", e);
    return [];
  }
}

function configurarDropdownPerfilValidadeNovo() {
  let input = document.getElementById("perfilValidade");
  if (!input) input = document.querySelector('[name="perfilValidade"]');
  if (!input) return;
  try {
    input.removeAttribute("readonly");
    input.removeAttribute("disabled");
  } catch (e) {}
  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper.classList.contains("select-wrapper")) {
    const wrap = document.createElement("div");
    wrap.className = "select-wrapper";
    try {
      wrapper.replaceChild(wrap, input);
      wrap.appendChild(input);
      wrapper = wrap;
    } catch (e) {
      wrapper = input.parentElement;
    }
  }

  // garantir botão quick-new
  try {
    addQuickNewValidadeControl(
      "perfilValidade",
      "perfis_validade",
      "Novo Perfil de Validade",
    );
  } catch (e) {
    console.debug("addQuickNewValidadeControl falhou", e);
  }

  // Remover possível chave legada 'perfis_validade' no localStorage
  try {
    localStorage.removeItem("perfis_validade");
  } catch (e) {}

  let dropdown = null;
  let cached = null;
  let suppressOpen = false;

  fetchPerfisValidadeNovo()
    .then((items) => {
      cached = items;
    })
    .catch(() => {});

  input.addEventListener("focus", showDropdown);
  input.addEventListener("click", showDropdown);
  input.addEventListener("input", function () {
    const q = (input.value || "").toLowerCase();
    if (!cached) return;
    const filtered = cached.filter((it) =>
      (it.descricao || "").toLowerCase().includes(q),
    );
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", function () {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    } else {
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        filtered.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", function () {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
    }
  });

  function showDropdown(e) {
    e.stopPropagation();
    if (suppressOpen || dropdown) return;
    const createList = (items) => {
      dropdown = document.createElement("div");
      dropdown.className = "select-dropdown";
      if (!items || items.length === 0) {
        const el = document.createElement("div");
        el.className = "select-item no-results";
        el.textContent = "Nenhum resultado";
        dropdown.appendChild(el);
      } else {
        items.forEach((it) => {
          const el = document.createElement("div");
          el.className = "select-item";
          el.textContent = it.descricao;
          el.addEventListener("click", function () {
            input.value = it.descricao;
            closeDropdown();
            try {
              input.blur();
            } catch (e) {}
          });
          dropdown.appendChild(el);
        });
      }
      wrapper.appendChild(dropdown);
      dropdown.style.left = input.offsetLeft + "px";
      dropdown.style.top = input.offsetTop + input.offsetHeight + 6 + "px";
      dropdown.style.minWidth = input.offsetWidth + "px";
    };

    if (cached) {
      createList(cached);
      return;
    }
    fetchPerfisValidadeNovo().then((items) => {
      cached = items;
      createList(items);
    });
  }

  function closeDropdown() {
    if (dropdown && dropdown.parentElement)
      dropdown.parentElement.removeChild(dropdown);
    dropdown = null;
    suppressOpen = true;
    setTimeout(() => {
      suppressOpen = false;
    }, 120);
  }
  document.addEventListener("click", function (e) {
    if (!wrapper.contains(e.target)) closeDropdown();
  });
}

// adiciona quick-new de validade (duplicado aqui para o novo-produto)
function addQuickNewValidadeControl(inputId, storageKey, modalTitle) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let wrapper = input.closest(".input-with-icon") || input.parentElement;
  if (!wrapper) wrapper = input.parentElement;
  if (getComputedStyle(wrapper).position === "static")
    wrapper.style.position = "relative";
  if (wrapper.querySelector(".input-more")) return;
  // remover ícone existente (fa-ellipsis) no contêiner .input-with-icon para evitar sobreposição
  try {
    const iconContainer =
      input.closest(".input-with-icon") || input.parentElement;
    const existingIcon = iconContainer
      ? iconContainer.querySelector(".input-icon")
      : null;
    if (existingIcon) existingIcon.remove();
  } catch (e) {}
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "input-more";
  btn.title = "Mais";
  btn.innerHTML = "&#8942;";
  btn.style.position = "absolute";
  btn.style.right = "8px";
  btn.style.top = "50%";
  btn.style.transform = "translateY(-50%)";
  btn.style.padding = "6px 8px";
  btn.style.border = "none";
  btn.style.background = "transparent";
  btn.style.cursor = "pointer";
  btn.style.zIndex = 2000;
  try {
    const currentPr = parseInt(getComputedStyle(input).paddingRight) || 0;
    if (currentPr < 40) input.style.paddingRight = currentPr + 36 + "px";
  } catch (e) {}
  let menu = null;
  function openMenu() {
    if (menu) {
      menu.remove();
      menu = null;
      return;
    }
    menu = document.createElement("div");
    menu.className = "mini-menu";
    menu.style.position = "absolute";
    menu.style.top = btn.offsetTop + btn.offsetHeight + 6 + "px";
    menu.style.left = btn.offsetLeft + "px";
    menu.style.zIndex = 10000;
    menu.style.background = "#fff";
    menu.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    menu.style.borderRadius = "6px";
    menu.style.padding = "8px 0";
    menu.style.minWidth = "140px";
    const item = document.createElement("div");
    item.className = "mini-menu-item";
    item.style.padding = "8px 14px";
    item.style.cursor = "pointer";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.innerHTML =
      '<span style="font-size:18px; margin-right:10px; color:#666">+</span><span>Novo</span>';
    item.addEventListener("click", function (e) {
      e.preventDefault();
      if (menu) {
        menu.remove();
        menu = null;
      }
      // abrir modal específico para perfil de validade
      const overlay = document.createElement("div");
      overlay.removeAttribute("class");
      overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0, 0, 0, 0.5) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 99999 !important;
            `;
      const modal = document.createElement("div");
      modal.removeAttribute("class");
      modal.style.cssText = `
                background-color: #fff !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
                max-width: 720px !important;
                width: 90% !important;
                padding: 0 !important;
                position: relative !important;
            `;
      modal.innerHTML = `
                <div style="padding: 16px 20px; border-bottom: 1px solid #ddd; display:flex; align-items:center; justify-content:space-between;">
                    <h3 style="margin:0; font-size: 18px; color: #333;">${modalTitle || "Novo Perfil de Validade"}</h3>
                    <button type="button" class="btn btn-secondary btn-close-modal" style="padding: 6px 12px; cursor: pointer; background-color: #6c757d; color: white; border: none; border-radius: 4px;">Fechar</button>
                </div>
                <div style="padding: 18px 20px;">
                    <div style="margin-bottom: 14px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 500;">Descrição: <span style="color:#d00">*</span></label>
                        <input type="text" id="valDescricao" placeholder="Descrição" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />
                    </div>
                    <div style="margin-top:16px;font-weight:600; font-size: 15px;">Quantidade de dias para alertas de validade:</div>
                    <div style="display:flex;gap:18px;margin-top:12px">
                        <div style="flex:1">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500;">1º Alerta: <span style="color:#d00">*</span></label>
                            <input type="number" min="0" id="valAlerta1" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />
                        </div>
                        <div style="flex:1">
                            <label style="display: block; margin-bottom: 6px; font-weight: 500;">2º Alerta: <span style="color:#d00">*</span></label>
                            <input type="number" min="0" id="valAlerta2" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />
                        </div>
                    </div>
                </div>
                <div style="padding: 14px 20px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #ddd;">
                    <button type="button" class="btn btn-primary btn-save-validade" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
                </div>
            `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      try {
        modal.querySelectorAll("input").forEach((i) => {
          i.setAttribute("autocomplete", "off");
          i.autocomplete = "off";
        });
      } catch (e) {}
      const btnClose = modal.querySelector(".btn-close-modal");
      const btnSave = modal.querySelector(".btn-save-validade");
      function close() {
        try {
          overlay.remove();
        } catch (e) {}
      }
      btnClose.addEventListener("click", function (e) {
        e.preventDefault();
        close();
      });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
      });
      btnSave.addEventListener("click", async function (e) {
        e.preventDefault();
        const desc = (modal.querySelector("#valDescricao").value || "")
          .toString()
          .trim();
        const a1 = (modal.querySelector("#valAlerta1").value || "")
          .toString()
          .trim();
        const a2 = (modal.querySelector("#valAlerta2").value || "")
          .toString()
          .trim();
        if (!desc) {
          showToast("Informe a descrição", "warning");
          modal.querySelector("#valDescricao").focus();
          return;
        }
        if (a1 === "") {
          showToast("Informe 1º Alerta", "warning");
          modal.querySelector("#valAlerta1").focus();
          return;
        }
        if (a2 === "") {
          showToast("Informe 2º Alerta", "warning");
          modal.querySelector("#valAlerta2").focus();
          return;
        }

        // Criar perfil de validade no backend via API
        const payload = {
          descricao: desc,
          alerta1: parseInt(a1, 10) || 0,
          alerta2: parseInt(a2, 10) || 0,
        };
        try {
          await ApiClient.criarPerfilProduto(payload);
          // notificar outras partes do app que perfis foram atualizados
          try {
            window.dispatchEvent(
              new CustomEvent("perfis_validade:updated", { detail: payload }),
            );
          } catch (e) {}
          showToast("Perfil de validade criado", "success", 2000);
        } catch (apiErr) {
          console.error(
            "[addQuickNewValidadeControl] erro criar perfil via API",
            apiErr,
          );
          showToast("Erro ao criar perfil (API)", "error");
          // não interrompe o fluxo de preenchimento do input local
        }

        // Atualizar campo local e notificar listeners locais
        input.value = desc;
        try {
          const pc = document.getElementById("perfilComissao");
          if (pc && pc.value && pc.value.trim() === desc) pc.value = "";
        } catch (e) {}
        try {
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (e) {}

        close();
      });
    });
    menu.appendChild(item);
    wrapper.appendChild(menu);
    setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 10);
  }
  function onDocClick(e) {
    if (!wrapper.contains(e.target)) {
      if (menu) {
        menu.remove();
        menu = null;
      }
      document.removeEventListener("click", onDocClick);
    }
  }
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    openMenu();
  });
  wrapper.appendChild(btn);
}

function configurarBotoesToggle() {
  const botoesToggle = document.querySelectorAll(".btn-toggle");

  botoesToggle.forEach((botao) => {
    botao.addEventListener("click", function (e) {
      e.preventDefault();

      // Remover active de todos os botões do mesmo grupo
      const grupo = this.closest(".btn-group");
      grupo.querySelectorAll(".btn-toggle").forEach((btn) => {
        btn.classList.remove("active");
      });

      // Adicionar active no botão clicado
      this.classList.add("active");

      // Atualizar input hidden correspondente
      const inputHidden = grupo.nextElementSibling;
      if (inputHidden && inputHidden.type === "hidden") {
        inputHidden.value = this.dataset.value;
      }

      // Se for botão de Tipo (Produto/Serviço/Plano), alternar campos
      if (
        this.dataset.value === "produto" ||
        this.dataset.value === "servico" ||
        this.dataset.value === "plano"
      ) {
        alternarCamposPorTipo(this.dataset.value);
      }
    });
  });
}

function alternarCamposPorTipo(tipo) {
  console.log(`🔄 Alternando campos para tipo: ${tipo}`);

  const camposProduto = document.getElementById("camposProduto");
  const camposServico = document.getElementById("camposServico");
  const camposPlano = document.getElementById("camposPlano");
  const secaoEstoque = document.getElementById("secaoEstoque");
  const secaoFornecedores = document.getElementById("secaoFornecedores");
  const secaoTextoContrato = document.getElementById("secaoTextoContrato");
  const detalhesTitle = document.getElementById("detalhesTitle");

  // Encontrar seção Validade (próxima seção após Formulários)
  const secaoValidade = Array.from(
    document.querySelectorAll(".section-title"),
  ).find((title) => title.textContent.trim() === "Validade");
  const secaoValidadeContainer = secaoValidade
    ? secaoValidade.parentElement
    : null;

  if (tipo === "produto") {
    // Mostrar campos de Produto
    if (camposProduto) camposProduto.style.display = "block";
    if (camposServico) camposServico.style.display = "none";
    if (camposPlano) camposPlano.style.display = "none";
    if (secaoEstoque) secaoEstoque.style.display = "block";
    if (secaoFornecedores) secaoFornecedores.style.display = "block";
    if (secaoTextoContrato) secaoTextoContrato.style.display = "none";
    if (detalhesTitle) detalhesTitle.textContent = "Detalhes do Produto";

    // Mostrar Validade
    if (secaoValidade) {
      secaoValidade.style.display = "block";
      // Mostrar os form-rows seguintes
      let nextElement = secaoValidade.nextElementSibling;
      while (
        nextElement &&
        !nextElement.classList.contains("section-title") &&
        !nextElement.classList.contains("form-actions")
      ) {
        nextElement.style.display = "flex";
        nextElement = nextElement.nextElementSibling;
      }
    }

    console.log("✅ Campos de Produto exibidos");
  } else if (tipo === "servico") {
    // Mostrar campos de Serviço
    if (camposProduto) camposProduto.style.display = "none";
    if (camposServico) camposServico.style.display = "block";
    if (camposPlano) camposPlano.style.display = "none";
    if (secaoEstoque) secaoEstoque.style.display = "none";
    if (secaoFornecedores) secaoFornecedores.style.display = "none";
    if (secaoTextoContrato) secaoTextoContrato.style.display = "none";
    if (detalhesTitle) detalhesTitle.textContent = "Detalhes do Serviço";

    // Mostrar campos fiscais específicos de serviço (NFS-e)
    const camposFiscaisServico = document.getElementById(
      "camposFiscaisServico",
    );
    if (camposFiscaisServico) camposFiscaisServico.style.display = "block";

    // Ocultar Validade
    if (secaoValidade) {
      secaoValidade.style.display = "none";
      // Ocultar os form-rows seguintes
      let nextElement = secaoValidade.nextElementSibling;
      while (
        nextElement &&
        !nextElement.classList.contains("section-title") &&
        !nextElement.classList.contains("form-actions")
      ) {
        nextElement.style.display = "none";
        nextElement = nextElement.nextElementSibling;
      }
    }

    console.log("✅ Campos de Serviço exibidos");
  } else if (tipo === "plano") {
    // Mostrar campos de Plano
    if (camposProduto) camposProduto.style.display = "none";
    if (camposServico) camposServico.style.display = "none";
    if (camposPlano) camposPlano.style.display = "block";
    if (secaoEstoque) secaoEstoque.style.display = "none";
    if (secaoFornecedores) secaoFornecedores.style.display = "none";
    if (secaoTextoContrato) secaoTextoContrato.style.display = "block";
    if (detalhesTitle) detalhesTitle.textContent = "Detalhes do Plano";

    // Ocultar Validade
    if (secaoValidade) {
      secaoValidade.style.display = "none";
      // Ocultar os form-rows seguintes
      let nextElement = secaoValidade.nextElementSibling;
      while (
        nextElement &&
        !nextElement.classList.contains("section-title") &&
        !nextElement.classList.contains("form-actions")
      ) {
        nextElement.style.display = "none";
        nextElement = nextElement.nextElementSibling;
      }
    }

    console.log("✅ Campos de Plano exibidos");
  }
}

function configurarCalculoMargem() {
  const custo = document.getElementById("custo");
  const percentualMargem = document.getElementById("percentualMargem");
  const reaisMargem = document.getElementById("reaisMargem");
  const venda = document.getElementById("venda");

  // Calcular margem quando custo ou percentual mudarem
  if (custo && percentualMargem && reaisMargem && venda) {
    custo.addEventListener("input", calcularPrecoVenda);
    percentualMargem.addEventListener("input", calcularPrecoVenda);
    venda.addEventListener("input", calcularMargem);
    // Quando o usuário editar o valor em R$ de margem, recalcular venda e percentual
    reaisMargem.addEventListener("input", function () {
      const custoVal = parseFloat(custo.value) || 0;
      const margemReais = parseFloat(this.value) || 0;
      const novoVenda = custoVal + margemReais;
      venda.value = novoVenda.toFixed(2);
      if (custoVal > 0) {
        const percentual = (margemReais / custoVal) * 100;
        percentualMargem.value = percentual.toFixed(2);
      } else {
        percentualMargem.value = (0).toFixed(2);
      }
    });
  }
}

function calcularPrecoVenda() {
  const custo = parseFloat(document.getElementById("custo").value) || 0;
  const percentualMargem =
    parseFloat(document.getElementById("percentualMargem").value) || 0;

  const margemReais = (custo * percentualMargem) / 100;
  const precoVenda = custo + margemReais;

  document.getElementById("reaisMargem").value = margemReais.toFixed(2);
  document.getElementById("venda").value = precoVenda.toFixed(2);
}

function calcularMargem() {
  const custo = parseFloat(document.getElementById("custo").value) || 0;
  const venda = parseFloat(document.getElementById("venda").value) || 0;

  if (custo > 0) {
    const margemReais = venda - custo;
    const percentualMargem = (margemReais / custo) * 100;

    document.getElementById("reaisMargem").value = margemReais.toFixed(2);
    document.getElementById("percentualMargem").value =
      percentualMargem.toFixed(2);
  }
}

function carregarDadosProduto(produtoId) {
  console.log(`📡 Carregando dados do produto ID: ${produtoId}`);
  // Primeiro tentar buscar nos itens salvos em localStorage (meusItens)
  let produto = null;
  try {
    const raw = localStorage.getItem("meusItens");
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        produto = stored.find((p) => Number(p.id) === Number(produtoId));
        if (produto)
          console.debug("[editar-produto] produto encontrado em localStorage");
      }
    }
  } catch (e) {
    console.debug("[editar-produto] erro lendo localStorage", e);
  }

  // Se não encontrado, fallback para produtosExemplo local
  if (!produto) {
    produto = (produtosExemplo || []).find(
      (p) => Number(p.id) === Number(produtoId),
    );
  }

  if (produto) {
    produtoAtual = produto;
    console.log("✅ Produto encontrado:", produto);
    preencherFormulario(produto);
  } else {
    console.error(`❌ Produto com ID ${produtoId} não encontrado`);
    alert("Produto não encontrado!");
  }
}

function preencherFormulario(dados) {
  console.log("🔄 Preenchendo formulário com dados do produto...");

  // Campos básicos
  if (dados.nome) document.getElementById("descricao").value = dados.nome;
  if (dados.centroResultado)
    document.getElementById("centroResultado").value = dados.centroResultado;
  if (dados.categoria)
    document.getElementById("categoria").value = dados.categoria;
  if (dados.agrupamento)
    document.getElementById("agrupamento").value = dados.agrupamento;
  if (dados.perfilComissao)
    document.getElementById("perfilComissao").value = dados.perfilComissao;
  if (dados.curva) document.getElementById("curva").value = dados.curva;

  // Detalhes do Produto
  if (dados.unidade) document.getElementById("unidade").value = dados.unidade;
  if (dados.diasOportunidadeVenda)
    document.getElementById("diasOportunidadeVenda").value =
      dados.diasOportunidadeVenda;
  if (dados.marca) document.getElementById("marca").value = dados.marca;
  if (dados.codigoBarras)
    document.getElementById("codigoBarras").value = dados.codigoBarras;
  if (dados.ncm) document.getElementById("ncm").value = dados.ncm;
  if (dados.cest) document.getElementById("cest").value = dados.cest;

  // Campos fiscais
  const camposFiscaisIds = [
    "sku",
    "gtin",
    "peso",
    "origem",
    "cfop_padrao",
    "cst_icms",
    "csosn",
    "cst_pis",
    "cst_cofins",
    "cst_ipi",
    "aliq_icms",
    "aliq_pis",
    "aliq_cofins",
    "aliq_ipi",
    "item_lista_servico",
    "municipio_incidencia_iss",
    "natureza_operacao_iss",
    "cnae_servico",
  ];
  camposFiscaisIds.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && dados[id] !== undefined && dados[id] !== null) {
      el.value = dados[id];
    }
  });
  // Se algum campo fiscal está preenchido, expandir o painel
  if (
    camposFiscaisIds.some(function (id) {
      return dados[id];
    })
  ) {
    const painel = document.getElementById("painelDadosFiscais");
    const icon = document.getElementById("iconToggleFiscal");
    const btn = document.getElementById("btnToggleFiscal");
    if (painel) painel.style.display = "block";
    if (icon) {
      icon.className = "fas fa-chevron-up";
    }
    if (btn)
      btn.innerHTML =
        '<i class="fas fa-chevron-up" id="iconToggleFiscal"></i> Recolher';
  }

  // Precificação (coerção de tipos para evitar TypeError ao chamar toFixed)
  try {
    const custoBaseNum =
      typeof dados.custoBase === "number"
        ? dados.custoBase
        : Number(dados.custoBase) || 0;
    const precoNum =
      typeof dados.preco === "number" ? dados.preco : Number(dados.preco) || 0;
    if (custoBaseNum || precoNum) {
      // Se só tem preco (vindo do XML), colocar em custo e deixar venda em branco
      const custoFinal = custoBaseNum || precoNum;
      const vendaFinal = custoBaseNum ? precoNum : 0;

      document.getElementById("custo").value = custoFinal.toFixed(2);
      document.getElementById("venda").value =
        vendaFinal > 0 ? vendaFinal.toFixed(2) : "";

      // Calcular margem apenas quando ambos estão definidos
      if (custoFinal > 0 && vendaFinal > 0) {
        const margemReais = vendaFinal - custoFinal;
        const percentualMargem = (margemReais / custoFinal) * 100;
        document.getElementById("reaisMargem").value = margemReais.toFixed(2);
        document.getElementById("percentualMargem").value =
          percentualMargem.toFixed(2);
      } else {
        document.getElementById("reaisMargem").value = "";
        document.getElementById("percentualMargem").value = "";
      }
    }
  } catch (e) {
    console.debug("Erro ao preencher preços/margem:", e);
  }

  if (dados.perfilDesconto)
    document.getElementById("perfilDesconto").value = dados.perfilDesconto;

  // Estoque
  if (dados.empresa) document.getElementById("empresa").value = dados.empresa;
  if (dados.estoqueMinimo)
    document.getElementById("estoqueMinimo").value = dados.estoqueMinimo;
  if (dados.estoqueIdeal)
    document.getElementById("estoqueIdeal").value = dados.estoqueIdeal;
  if (dados.localizacao)
    document.getElementById("localizacao").value = dados.localizacao;
  if (dados.fatorCompra)
    document.getElementById("fatorCompra").value = dados.fatorCompra;

  // Formulários
  if (dados.atendimento)
    document.getElementById("atendimento").value = dados.atendimento;
  if (dados.observacao)
    document.getElementById("observacao").value = dados.observacao;

  // Validade
  if (dados.perfilValidade)
    document.getElementById("perfilValidade").value = dados.perfilValidade;
  if (dados.validade)
    document.getElementById("validade").value = dados.validade;
  // Fornecedores: preencher tabela se houver
  try {
    if (Array.isArray(dados.fornecedores) && dados.fornecedores.length > 0) {
      const tbody = document.getElementById("fornecedoresTableBody");
      if (tbody) {
        // limpar existentes
        tbody.innerHTML = "";
        dados.fornecedores.forEach((f) => {
          const nome = f.fornecedor || f.nome || "";
          const referencia = f.referencia || f.ref || "";
          const fator = f.fatorCompra || f.fator || "";
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${nome}</td><td>${referencia}</td><td>${fator}</td><td><button class="btn-action btn-edit" title="Editar"><i class="fas fa-edit"></i></button></td><td><button class="btn-action btn-delete" title="Excluir"><i class="fas fa-trash"></i></button></td>`;
          tbody.appendChild(tr);
          // excluir
          const del = tr.querySelector(".btn-delete");
          if (del)
            del.addEventListener("click", () => {
              try {
                tr.parentElement.removeChild(tr);
              } catch (e) {}
            });
          // editar (abre modal similar ao configurarFornecedores)
          const edit = tr.querySelector(".btn-edit");
          if (edit)
            edit.addEventListener("click", () => {
              // preencher modal com valores e abrir para edição
              const overlay = document.createElement("div");
              overlay.className = "modal-overlay modal-fornecedor-overlay";
              const modal = document.createElement("div");
              modal.className = "modal modal-fornecedor";
              modal.innerHTML = `
                            <div class="modal-header"><h3>Editar Fornecedor/Referência</h3><button class="modal-close" aria-label="Fechar">×</button></div>
                            <div class="modal-body">
                                <div class="form-group"><label>Fornecedor:</label><div class="input-with-icon"><input type="text" id="modalFornecedorEdit" value="${nome}"></div></div>
                                <div class="form-group"><label>Referência:</label><input type="text" id="modalReferenciaEdit" value="${referencia}"></div>
                                <div class="form-group"><label>Fator de Compra:</label><input type="text" id="modalFatorCompraEdit" value="${fator}"></div>
                            </div>
                            <div class="modal-actions"><button class="btn-primary" id="modalSalvarFornecedorEdit">Salvar</button><button class="btn-secondary" id="modalCancelarFornecedorEdit">Cancelar</button></div>
                        `;
              overlay.appendChild(modal);
              document.body.appendChild(overlay);
              overlay
                .querySelector(".modal-close")
                .addEventListener("click", () => overlay.remove());
              overlay
                .querySelector("#modalCancelarFornecedorEdit")
                .addEventListener("click", () => overlay.remove());
              overlay
                .querySelector("#modalSalvarFornecedorEdit")
                .addEventListener("click", () => {
                  const nf = document
                    .getElementById("modalFornecedorEdit")
                    .value.trim();
                  const nr = document
                    .getElementById("modalReferenciaEdit")
                    .value.trim();
                  const nfator = document
                    .getElementById("modalFatorCompraEdit")
                    .value.trim();
                  tr.children[0].textContent = nf;
                  tr.children[1].textContent = nr;
                  tr.children[2].textContent = nfator;
                  overlay.remove();
                });
            });
        });
      }
    }
  } catch (e) {
    console.debug("erro preenchendo fornecedores", e);
  }

  // Configurar botões toggle
  if (dados.tipo) {
    ativarBotaoToggle("tipo", dados.tipo);
  }

  if (dados.finalidade) {
    ativarBotaoToggle("finalidade", dados.finalidade);
  }

  if (dados.permiteEstoqueNegativo) {
    ativarBotaoToggle("permiteEstoqueNegativo", dados.permiteEstoqueNegativo);
  }

  // Campos específicos de serviço/plano: preencher duração e relacionados
  try {
    if (dados.diasOportunidadeVendaServico)
      document.getElementById("diasOportunidadeVendaServico").value =
        dados.diasOportunidadeVendaServico;
    if (
      dados.duracaoHoras !== undefined &&
      document.getElementById("duracaoHoras")
    )
      document.getElementById("duracaoHoras").value = dados.duracaoHoras;
    if (
      dados.duracaoMinutos !== undefined &&
      document.getElementById("duracaoMinutos")
    )
      document.getElementById("duracaoMinutos").value = dados.duracaoMinutos;
    if (dados.situacaoTributariaECF)
      document.getElementById("situacaoTributariaECF").value =
        dados.situacaoTributariaECF;
    if (dados.impostoISS)
      document.getElementById("impostoISS").value = dados.impostoISS;
  } catch (e) {
    console.debug("erro preenchendo campos de serviço (novo-produto)", e);
  }

  // (campo 'apresentacoesDiferentes' removido)

  console.log("✅ Formulário preenchido com sucesso!");

  // preencher select Tipo do Plano (se aplicável)
  try {
    const sel = document.getElementById("tipoPlanoSelect");
    if (sel && dados && dados.tipoPlano) {
      sel.value = (dados.tipoPlano || "").toString().toLowerCase();
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch (e) {
    /* noop */
  }
}

// Se a página for aberta a partir da importação XML (sessionStorage.novoProdutoFromXML), preencher automaticamente
document.addEventListener("DOMContentLoaded", function () {
  try {
    const raw = sessionStorage.getItem("novoProdutoFromXML");
    if (raw) {
      const dados = JSON.parse(raw);
      // mapear campos mínimos: nome/descricao e ncm
      const mapped = {};
      if (dados.nome) mapped.nome = dados.nome;
      if (dados.ncm) mapped.ncm = dados.ncm;
      if (dados.codigo) mapped.codigo = dados.codigo;
      if (dados.preco) mapped.preco = dados.preco;
      if (dados.validade) mapped.validade = dados.validade;
      // chamar preencherFormulario para aplicar valores conhecidos
      preencherFormulario(mapped);
      // abrir painel lateral de edição de NCM/Descrição semelhante ao layout solicitado
      try {
        openEditarNcmPanel(mapped);
      } catch (e) {
        console.warn("openEditarNcmPanel failed", e);
      }
      // armazenar índice original (se houver) para retorno ao modal de import
      try {
        if (
          dados._orig_parsed_index !== undefined &&
          dados._orig_parsed_index !== null
        ) {
          window.__origParsedIndex = Number(dados._orig_parsed_index);
          try {
            const f =
              document.getElementById("formEditarProduto") || document.body;
            const hid = document.createElement("input");
            hid.type = "hidden";
            hid.id = "__origParsedIndex";
            hid.value = String(window.__origParsedIndex);
            f.appendChild(hid);
          } catch (e) {
            /* noop */
          }
        }
      } catch (e) {}
      // remover chave para evitar reaplicação indevida
      try {
        sessionStorage.removeItem("novoProdutoFromXML");
      } catch (e) {}
    }
  } catch (e) {
    console.warn("Erro lendo novoProdutoFromXML", e);
  }
});

// Abre uma aba/painel lateral para editar NCM e Descrição (estilo sistema)
function openEditarNcmPanel(dados) {
  // remover painéis anteriores
  const prev = document.getElementById("editarNcmPanel");
  if (prev) prev.remove();
  const overlay = document.createElement("div");
  overlay.id = "editarNcmPanel";
  overlay.style.position = "fixed";
  overlay.style.right = "0";
  overlay.style.top = "0";
  overlay.style.bottom = "0";
  overlay.style.width = "420px";
  overlay.style.maxWidth = "100%";
  overlay.style.background = "#fff";
  overlay.style.boxShadow =
    "0 0 0 1px rgba(0,0,0,0.02), -12px 0 40px rgba(2,6,23,0.12)";
  overlay.style.zIndex = "120000";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  // header
  const header = document.createElement("div");
  header.style.padding = "14px 18px";
  header.style.borderBottom = "1px solid #eef0f2";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  const h = document.createElement("h3");
  h.textContent = "Editando NCM";
  h.style.margin = "0";
  h.style.fontSize = "16px";
  h.style.color = "#333";
  header.appendChild(h);
  const btnClose = document.createElement("button");
  btnClose.className = "btn btn-secondary";
  btnClose.textContent = "Fechar";
  btnClose.style.background = "#6c757d";
  btnClose.style.color = "#fff";
  btnClose.style.border = "none";
  btnClose.style.padding = "6px 10px";
  btnClose.style.borderRadius = "6px";
  header.appendChild(btnClose);
  overlay.appendChild(header);

  const body = document.createElement("div");
  body.style.padding = "18px";
  body.style.overflow = "auto";
  body.style.flex = "1";
  body.innerHTML = `
        <div style="margin-bottom:12px;background:#e6f4ff;padding:12px;border-radius:6px;color:#035388">É necessário informar um perfil de tributação para este NCM.</div>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:6px;font-weight:600">NCM <span style="color:#c0392b">*</span></label><input id="editarNcm_input_ncm" type="text" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:4px" /></div>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:6px;font-weight:600">Descrição <span style="color:#c0392b">*</span></label><textarea id="editarNcm_input_desc" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:4px;height:86px"></textarea></div>
        <div style="margin-bottom:12px"><label style="display:block;margin-bottom:6px;font-weight:600">Perfil de Tributação <span style="color:#c0392b">*</span></label>
            <div id="editarNcm_perfil_container" style="border:1px solid #eee;padding:6px 10px;border-radius:4px;color:#333;display:flex;align-items:center;justify-content:space-between;cursor:text">
                <span id="editarNcm_perfil_text" style="color:#888">Selecione um perfil</span>
                <i id="editarNcm_perfil_icon" class="fas fa-caret-down" style="margin-left:8px;color:#888"></i>
            </div>
            <input type="hidden" id="editarNcm_perfil_value" />
        </div>
    `;
  overlay.appendChild(body);

  const footer = document.createElement("div");
  footer.style.padding = "14px 18px";
  footer.style.borderTop = "1px solid #eef0f2";
  footer.style.display = "flex";
  footer.style.justifyContent = "flex-end";
  footer.style.gap = "12px";
  const btnSave = document.createElement("button");
  btnSave.textContent = "Salvar NCM";
  btnSave.className = "btn btn-primary";
  btnSave.style.background = "#28a745";
  btnSave.style.color = "#fff";
  btnSave.style.border = "none";
  btnSave.style.padding = "10px 14px";
  btnSave.style.borderRadius = "6px";
  footer.appendChild(btnSave);
  overlay.appendChild(footer);

  document.body.appendChild(overlay);

  // --- Configurar dropdown de Perfil de Tributação (estilo sistema)
  try {
    const perfilContainer = document.getElementById(
      "editarNcm_perfil_container",
    );
    let perfilText = document.getElementById("editarNcm_perfil_text");
    const perfilValue = document.getElementById("editarNcm_perfil_value");

    // Lista de perfis (pode ser substituída por fetch futuramente)
    const perfilOptions = [
      "Não incidência ICMS",
      "Servicos - Aliquota ICMS Inválida",
      "Tributado 7%",
      "Tributado 25%",
      "Isento de ICMS",
      "Tributado ICMS Aliquota (x)",
      "Substituição Tributária ICMS",
      "Isento IPI",
      "Tributado IPI",
      "Suspensão ICMS",
      "Imune ICMS",
      "Revenda - ICMS Normal",
      "Serviço - ISS",
      "Ex-Tipi",
      "OutrosPerfis - Exemplo",
    ];

    // criar dropdown flutuante
    let perfilDropdown = document.createElement("div");
    perfilDropdown.className = "autocomplete-list";
    perfilDropdown.style.position = "absolute";
    perfilDropdown.style.display = "none";
    perfilDropdown.style.zIndex = 140000;
    perfilDropdown.style.maxHeight = "260px";
    perfilDropdown.style.overflowY = "auto";
    perfilDropdown.style.background = "#fff";
    perfilDropdown.style.border = "1px solid #e6e9eb";
    perfilDropdown.style.borderRadius = "6px";
    perfilDropdown.style.boxShadow = "0 6px 18px rgba(2,6,23,0.12)";
    document.body.appendChild(perfilDropdown);

    function positionPerfilDropdown() {
      const r = perfilContainer.getBoundingClientRect();
      perfilDropdown.style.minWidth = Math.max(250, r.width) + "px";
      perfilDropdown.style.left =
        Math.round(r.left + window.pageXOffset) + "px";
      perfilDropdown.style.top =
        Math.round(r.bottom + window.pageYOffset + 6) + "px";
    }

    function renderPerfilList(filter) {
      perfilDropdown.innerHTML = "";
      const top = document.createElement("div");
      top.className = "autocomplete-topline";
      perfilDropdown.appendChild(top);
      const normalized = (filter || "").toLowerCase();
      const items = perfilOptions.filter(
        (p) => p.toLowerCase().indexOf(normalized) !== -1,
      );
      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "dropdown-empty";
        empty.textContent = "Nenhum resultado";
        empty.style.padding = "10px 12px";
        perfilDropdown.appendChild(empty);
        return;
      }
      items.forEach((text) => {
        const it = document.createElement("div");
        it.className = "grupo-dropdown-item";
        it.style.padding = "10px 12px";
        it.style.cursor = "pointer";
        it.textContent = text;
        it.addEventListener("click", function (e) {
          e.stopPropagation();
          // atualizar visual no container e valor oculto
          perfilContainer.innerHTML =
            '<span id="editarNcm_perfil_text" style="color:#222">' +
            text +
            '</span><i id="editarNcm_perfil_icon" class="fas fa-caret-down" style="margin-left:8px;color:#888"></i>';
          perfilValue.value = text;
          // rebind perfilText
          try {
            perfilText = document.getElementById("editarNcm_perfil_text");
          } catch (e) {}
          // fechar dropdown e remover listener de clique fora imediatamente
          try {
            perfilDropdown.style.display = "none";
          } catch (e) {}
          try {
            document.removeEventListener("click", outsideClick);
          } catch (e) {}
          // garantir que o estado principal também seja atualizado
          try {
            const main = document.getElementById("perfilTributacao");
            if (main) {
              if (main.tagName.toLowerCase() === "select") {
                for (let i = 0; i < main.options.length; i++) {
                  if (main.options[i].text === text) {
                    main.value = main.options[i].value;
                    break;
                  }
                }
              } else {
                main.value = text;
              }
            }
          } catch (e) {}
        });
        perfilDropdown.appendChild(it);
      });
    }

    // abrir com busca (criar input temporário)
    perfilContainer.addEventListener("click", function (e) {
      e.stopPropagation();
      // transformar em modo busca — começar com filtro vazio para mostrar todas opções
      const current =
        perfilText &&
        perfilText.textContent &&
        perfilText.textContent !== "Selecione um perfil"
          ? perfilText.textContent
          : "";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = current || "Pesquisar...";
      input.value = "";
      input.style.width = "100%";
      input.style.border = "none";
      input.style.outline = "none";
      input.style.background = "transparent";
      input.style.fontSize = "14px";
      perfilContainer.innerHTML = "";
      perfilContainer.appendChild(input);
      perfilContainer.appendChild(
        document.getElementById("editarNcm_perfil_icon") ||
          document.createElement("i"),
      );
      positionPerfilDropdown();
      renderPerfilList("");
      perfilDropdown.style.display = "block";
      input.focus();

      function onInput() {
        renderPerfilList(input.value);
        positionPerfilDropdown();
      }
      input.addEventListener("input", onInput);

      function closeAndRestore() {
        // restaurar label
        const val = perfilValue.value || "";
        const color = val ? "#222" : "#888";
        perfilContainer.innerHTML =
          '<span id="editarNcm_perfil_text" style="color:' +
          color +
          '">' +
          (val || "Selecione um perfil") +
          '</span><i id="editarNcm_perfil_icon" class="fas fa-caret-down" style="margin-left:8px;color:#888"></i>';
        // rebind references
        try {
          perfilText = document.getElementById("editarNcm_perfil_text");
        } catch (e) {}
        perfilDropdown.style.display = "none";
        document.removeEventListener("click", outsideClick);
      }

      function outsideClick(ev) {
        if (
          !perfilDropdown.contains(ev.target) &&
          !perfilContainer.contains(ev.target)
        ) {
          closeAndRestore();
        }
      }
      setTimeout(() => {
        document.addEventListener("click", outsideClick);
      }, 50);

      // keyboard: ESC to close
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          closeAndRestore();
        }
        if (ev.key === "ArrowDown") {
          const f = perfilDropdown.querySelector(".grupo-dropdown-item");
          if (f) f.focus();
        }
      });
    });
  } catch (e) {
    console.debug("Erro configurando dropdown perfil tributacao", e);
  }

  // preencher valores iniciais
  try {
    if (dados) {
      if (dados.ncm) {
        document.getElementById("editarNcm_input_ncm").value = dados.ncm;
      } else {
        // tentar fallback: ler sessionStorage.entradaImported usando índice original
        try {
          if (dados._orig_parsed_index !== undefined) {
            const raw = sessionStorage.getItem("entradaImported");
            if (raw) {
              const parsed = JSON.parse(raw);
              const idx = Number(dados._orig_parsed_index);
              if (parsed && Array.isArray(parsed.items) && parsed.items[idx]) {
                const candidate = parsed.items[idx];
                const fNcm = (
                  candidate.ncm ||
                  candidate.NCM ||
                  candidate.Ncm ||
                  (candidate.prod &&
                    (candidate.prod.ncm || candidate.prod.NCM)) ||
                  candidate.NCMTrib ||
                  candidate.cNCM ||
                  ""
                )
                  .toString()
                  .trim();
                if (fNcm) {
                  document.getElementById("editarNcm_input_ncm").value = fNcm;
                  console.debug(
                    "openEditarNcmPanel: preenchido ncm via entradaImported index",
                    idx,
                    fNcm,
                  );
                }
              }
            }
          }
        } catch (e) {
          console.debug(
            "openEditarNcmPanel: fallback entradaImported read failed",
            e,
          );
        }
      }
      if (dados.nome || dados.descricao)
        document.getElementById("editarNcm_input_desc").value =
          dados.nome || dados.descricao || "";
      // tentar também preencher campo principal se já estiver no DOM
      try {
        const mainNcm = document.getElementById("ncm");
        if (mainNcm && document.getElementById("editarNcm_input_ncm").value)
          mainNcm.value = document.getElementById("editarNcm_input_ncm").value;
      } catch (e) {}
    }
  } catch (e) {}

  btnClose.addEventListener("click", function () {
    try {
      overlay.remove();
    } catch (e) {}
  });

  btnSave.addEventListener("click", function () {
    try {
      const nVal = (
        document.getElementById("editarNcm_input_ncm").value || ""
      ).trim();
      const dVal = (
        document.getElementById("editarNcm_input_desc").value || ""
      ).trim();
      if (!nVal || !dVal) {
        alert("Preencha NCM e Descrição");
        return;
      }
      // preencher o formulário principal
      try {
        if (document.getElementById("ncm"))
          document.getElementById("ncm").value = nVal;
      } catch (e) {}
      try {
        if (document.getElementById("descricao"))
          document.getElementById("descricao").value = dVal;
      } catch (e) {}
      // fechar painel
      overlay.remove();
      showToast("NCM salvo no formulário", "success", 3000);
    } catch (e) {
      console.error("Salvar NCM error", e);
      alert("Erro ao salvar NCM");
    }
  });
}

// Configura campos dinâmicos de código de barras (múltiplos, com uma estrela indicando o padrão)
function setupBarcodeFields() {
  try {
    const input = document.getElementById("codigoBarras");
    if (!input) return;

    // Criar container se ainda não existir
    let wrapper = document.getElementById("barcodeFieldsContainer");
    const inputWithAction = input.closest(".input-with-action");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "barcodeFieldsContainer";
      wrapper.className = "barcode-fields-container";
      // substituir o .input-with-action pelo container e mover o input para dentro
      if (inputWithAction && inputWithAction.parentElement) {
        inputWithAction.parentElement.replaceChild(wrapper, inputWithAction);
        const inner = document.createElement("div");
        inner.className = "barcode-list";
        wrapper.appendChild(inner);
        // mover inputWithAction para a primeira linha
        const firstRow = createBarcodeRow(input.value || "", true);
        inner.appendChild(firstRow);
        // mover o add button (se existir) para o wrapper
        const addBtn =
          inputWithAction.querySelector &&
          inputWithAction.querySelector(".btn-add-barcode")
            ? inputWithAction.querySelector(".btn-add-barcode")
            : null;
        if (addBtn) {
          addBtn.addEventListener("click", function (e) {
            e.preventDefault();
            addBarcodeField();
          });
          wrapper.appendChild(addBtn);
        }
        // limpar original inputWithAction
      } else {
        // fallback: criar estrutura ao redor do input
        const parent = input.parentElement;
        parent.appendChild(wrapper);
        const inner = document.createElement("div");
        inner.className = "barcode-list";
        wrapper.appendChild(inner);
        inner.appendChild(createBarcodeRow(input.value || "", true));
      }
    }

    function createBarcodeRow(value = "", isDefault = false) {
      const row = document.createElement("div");
      row.className = "barcode-row";
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "form-control barcode-input";
      inp.value = value || "";
      inp.placeholder = "Código de barras";
      inp.style.flex = "1";

      const star = document.createElement("button");
      star.type = "button";
      star.className = "btn-barcode-star";
      star.title = "Definir como padrão";
      star.innerHTML = isDefault ? "★" : "☆";
      star.style.cursor = "pointer";
      star.style.border = "none";
      star.style.background = "transparent";
      star.style.fontSize = "18px";
      // cor: amarelo escuro quando ativo, cinza quando inativo
      star.style.color = isDefault ? "#ffd900ff" : "#666666";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn-barcode-remove";
      remove.title = "Remover";
      remove.innerHTML = "✕";
      remove.style.cursor = "pointer";
      remove.style.border = "none";
      remove.style.background = "transparent";
      remove.style.color = "#c00";

      star.addEventListener("click", function (e) {
        e.preventDefault();
        // desmarcar outras e ajustar cor
        const allStars = document.querySelectorAll(".btn-barcode-star");
        allStars.forEach((s) => {
          s.innerHTML = "☆";
          s.style.color = "#666666";
        });
        star.innerHTML = "★";
        star.style.color = "#ffd900ff";
      });

      remove.addEventListener("click", function (e) {
        e.preventDefault();
        const list = row.parentElement;
        try {
          row.remove();
        } catch (e) {}
        // garantir que exista pelo menos uma linha
        const remaining = list.querySelectorAll(".barcode-row");
        if (remaining.length === 0) {
          const newRow = createBarcodeRow("", true);
          list.appendChild(newRow);
        }
      });

      row.appendChild(inp);
      row.appendChild(star);
      row.appendChild(remove);
      return row;
    }

    function addBarcodeField(initial = "") {
      const list = wrapper.querySelector(".barcode-list");
      if (!list) return;
      const row = createBarcodeRow(initial, false);
      list.appendChild(row);
      // garantir que apenas uma estrela esteja marcada
      const stars = list.querySelectorAll(".btn-barcode-star");
      if (stars.length === 1) {
        stars[0].innerHTML = "★";
        stars[0].style.color = "#b8860b";
      }
    }

    // expor para testes/manipulação global se necessário
    window.addBarcodeField = addBarcodeField;
  } catch (e) {
    console.debug("setupBarcodeFields error", e);
  }
}

function ativarBotaoToggle(inputName, valor) {
  const input = document.getElementById(inputName);
  if (input) {
    input.value = valor;
    const grupo = input.previousElementSibling;
    if (grupo && grupo.classList.contains("btn-group")) {
      grupo.querySelectorAll(".btn-toggle").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.value === valor) {
          btn.classList.add("active");
        }
      });
    }
    // Se ativamos o toggle de tipo por script, alternar os campos correspondentes
    try {
      if (inputName === "tipo") alternarCamposPorTipo(valor);
    } catch (e) {}
  }
}

async function salvarProduto(e) {
  e.preventDefault();

  console.log("💾 Salvando produto...");

  const formData = new FormData(e.target);
  const dados = Object.fromEntries(formData.entries());

  console.log("📦 Dados do formulário:", dados);

  // Persistir no backend via API
  try {
    // coletar fornecedores da tabela
    const fornecedores = [];
    try {
      const tbody = document.getElementById("fornecedoresTableBody");
      if (tbody) {
        Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
          const tds = tr.querySelectorAll("td");
          const f =
            tds[0] && tds[0].textContent ? tds[0].textContent.trim() : "";
          const referencia =
            tds[1] && tds[1].textContent ? tds[1].textContent.trim() : "";
          const fator =
            tds[2] && tds[2].textContent ? tds[2].textContent.trim() : "";
          try {
            const fid =
              tr.dataset && tr.dataset.fornecedorId
                ? String(tr.dataset.fornecedorId)
                : null;
            if (f) {
              const obj = {
                fornecedor: f,
                nome: f,
                referencia: referencia,
                fatorCompra: fator,
              };
              if (fid) obj.id = fid;
              fornecedores.push(obj);
            }
          } catch (e) {
            if (f)
              fornecedores.push({
                fornecedor: f,
                referencia: referencia,
                fatorCompra: fator,
              });
          }
        });
      }
    } catch (e) {
      console.debug("erro coletando fornecedores", e);
    }

    const custoVal = Number(dados.custo || dados.custoBase) || 0;
    const precoVal = Number(dados.venda || dados.preco) || 0;
    const margemPercent =
      custoVal > 0 ? ((precoVal - custoVal) / custoVal) * 100 : 0;

    // coletar códigos de barras das linhas dinâmicas (se existirem)
    let collectedBarcodes = [];
    try {
      const rows = document.querySelectorAll(".barcode-row");
      if (rows && rows.length > 0) {
        collectedBarcodes = Array.from(rows)
          .map((r) =>
            r.querySelector(".barcode-input")
              ? r.querySelector(".barcode-input").value.trim()
              : "",
          )
          .filter(Boolean);
      } else {
        // fallback para input único
        const single = (dados.codigoBarras || "").toString().trim();
        if (single) collectedBarcodes = [single];
      }
    } catch (e) {
      console.debug("erro coletando barcodes", e);
    }

    const item = {
      // quando for novo produto, não forçar um id aqui (deixe o backend atribuir auto-incremento)
      id: produtoAtual && produtoAtual.id ? produtoAtual.id : undefined,
      nome: (dados.descricao || "").toString().trim(),
      // codigo principal: a marcada com estrela ou o primeiro disponível
      codigo: (function () {
        try {
          const st = document.querySelector(".btn-barcode-star");
          if (st && st.innerHTML === "★") {
            const row = st.closest(".barcode-row");
            if (row)
              return row.querySelector(".barcode-input")
                ? row.querySelector(".barcode-input").value.trim()
                : "";
          }
        } catch (e) {}
        return (collectedBarcodes[0] || "").toString().trim();
      })(),
      codigoBarras: (collectedBarcodes[0] || "").toString().trim(),
      categoria: (dados.categoria || "").toString().trim(),
      tipo: (dados.tipo || "produto").toString(),
      finalidade: (dados.finalidade || "").toString(),
      centroResultado: (dados.centroResultado || "").toString(),
      marca: (dados.marca || "").toString(),
      unidade: (dados.unidade || "").toString(),
      agrupamento: (dados.agrupamento || "").toString(),
      perfilComissao: (dados.perfilComissao || "").toString(),
      curva: (dados.curva || "").toString(),
      preco: precoVal,
      custoBase: custoVal,
      margem: Number(margemPercent.toFixed(2)),
      estoqueMinimo: Number(dados.estoqueMinimo) || 0,
      estoqueAtual: Number(dados.estoqueAtual) || 0,
      estoqueIdeal: Number(dados.estoqueIdeal) || 0,
      perfilDesconto: (dados.perfilDesconto || "").toString(),
      fornecedores: fornecedores,
      perfilValidade: (dados.perfilValidade || "").toString(),
      validade: (dados.validade || "").toString(),
      diasOportunidadeVenda: (dados.diasOportunidadeVenda || "").toString(),
      empresa: (
        dados.empresa ||
        document.getElementById("empresa")?.value ||
        ""
      ).toString(),
      permiteEstoqueNegativo: (
        dados.permiteEstoqueNegativo ||
        document.getElementById("permiteEstoqueNegativo")?.value ||
        "nao"
      ).toString(),
      localizacao: (dados.localizacao || "").toString(),
      fatorCompra: (dados.fatorCompra || "").toString(),
      atendimento: (dados.atendimento || "").toString(),
      observacao: (
        dados.observacao ||
        document.getElementById("observacao")?.value ||
        ""
      ).toString(),
      percentualMargem: Number(dados.percentualMargem) || 0,
      reaisMargem: Number(dados.reaisMargem) || 0,
      // campos de serviço/plano
      diasOportunidadeVendaServico: (
        dados.diasOportunidadeVendaServico || ""
      ).toString(),
      duracaoHoras: (dados.duracaoHoras || "").toString(),
      duracaoMinutos: (dados.duracaoMinutos || "").toString(),
      situacaoTributariaECF: (dados.situacaoTributariaECF || "").toString(),
      impostoISS: (dados.impostoISS || "").toString(),
      tipoPlano: (dados.tipoPlano || "").toString(),
      textoContrato: document.getElementById("textoContrato")
        ? document.getElementById("textoContrato").innerHTML
        : "",
      imagem: null,
      ativo: produtoAtual && produtoAtual.ativo ? produtoAtual.ativo : "sim",
      createdAt:
        produtoAtual && produtoAtual.createdAt
          ? produtoAtual.createdAt
          : new Date().toISOString(),

      // Campos fiscais
      ncm: (dados.ncm || "").toString().trim(),
      cest: (dados.cest || "").toString().trim(),
      sku: (dados.sku || "").toString(),
      gtin: (dados.gtin || "").toString(),
      peso: dados.peso ? Number(dados.peso) : null,
      origem:
        dados.origem !== undefined && dados.origem !== ""
          ? Number(dados.origem)
          : null,
      cfop_padrao: (dados.cfop_padrao || "").toString(),
      cst_icms: (dados.cst_icms || "").toString(),
      csosn: (dados.csosn || "").toString(),
      cst_pis: (dados.cst_pis || "").toString(),
      cst_cofins: (dados.cst_cofins || "").toString(),
      cst_ipi: (dados.cst_ipi || "").toString(),
      aliq_icms: dados.aliq_icms ? Number(dados.aliq_icms) : 0,
      aliq_pis: dados.aliq_pis ? Number(dados.aliq_pis) : 0,
      aliq_cofins: dados.aliq_cofins ? Number(dados.aliq_cofins) : 0,
      aliq_ipi: dados.aliq_ipi ? Number(dados.aliq_ipi) : 0,
      item_lista_servico: (dados.item_lista_servico || "").toString(),
      municipio_incidencia_iss: (
        dados.municipio_incidencia_iss || ""
      ).toString(),
      natureza_operacao_iss: (dados.natureza_operacao_iss || "").toString(),
      cnae_servico: (dados.cnae_servico || "").toString(),
    };

    // Anexar lista completa de códigos de barras (frontend-only field); backend precisa suportar para persistir
    try {
      if (collectedBarcodes && collectedBarcodes.length > 0)
        item.codigosBarras = collectedBarcodes;
    } catch (e) {}

    // coletar composição do plano (se houver)
    const composicao = [];
    try {
      const container = document.querySelector(".plano-composicao-content");
      if (container) {
        const rows = container.querySelectorAll(
          "table.plano-composicao-table tbody tr",
        );
        Array.from(rows).forEach((tr) => {
          try {
            const tipo = tr.querySelector(".pc-tipo")
              ? tr.querySelector(".pc-tipo").textContent.trim()
              : "";
            const itemDesc = tr.querySelector(".pc-desc")
              ? tr.querySelector(".pc-desc").textContent.trim()
              : "";
            const repeticao = tr.querySelector(".pc-rep")
              ? tr.querySelector(".pc-rep").textContent.trim()
              : "";
            let quantidade = 0;
            const qtdText = tr.querySelector(".pc-qtd")
              ? tr.querySelector(".pc-qtd").textContent
              : "";
            const m = (qtdText || "").toString().match(/(\d+)/);
            if (m) quantidade = parseInt(m[1], 10) || 0;
            const selectedId = tr.getAttribute("data-selected-id") || null;
            composicao.push({
              tipo,
              item: itemDesc,
              repeticao,
              quantidade,
              selectedId,
            });
          } catch (e) {}
        });
      }
    } catch (e) {
      console.debug("erro coletando composicao (novo-produto)", e);
    }

    // Validação: se for Plano, exigir pelo menos um item de composição
    try {
      const tipoAtual = (
        dados.tipo ||
        document.getElementById("tipo")?.value ||
        ""
      ).toString();
      if (tipoAtual === "plano" && (!composicao || composicao.length === 0)) {
        showToast("Escolha uma composição do plano", "error", 3800);
        return; // impedir salvamento
      }
    } catch (e) {
      /* ignore */
    }

    // anexar composicao ao item salvo
    try {
      item.composicao = composicao;
    } catch (e) {}

    // Se for novo produto, remover campo `id` para permitir que o backend use auto-incremento
    if (!produtoAtual && item.id === undefined) {
      try {
        delete item.id;
      } catch (e) {}
    }

    // Salvar produto via API
    console.log("📤 Enviando novo produto (payload):", item);
    const produtoSalvo = await ApiClient.criarProduto(item);
    console.log("✅ Produto salvo via API:", produtoSalvo);
    // Nota: não aplicar regras globais ao criar um novo produto.
    // A regra de 'permiteEstoqueNegativo' só deve ser aplicada globalmente quando
    // o usuário alterar esse campo em um produto existente (feito no editar-produto).

    showToast("Produto salvo com sucesso", "success", 1200);

    // Guardar referência do produto criado para retorno ao modal de import
    try {
      const origIdx =
        (document.getElementById("__origParsedIndex") &&
          document.getElementById("__origParsedIndex").value) ||
        window.__origParsedIndex ||
        null;
      const last = {
        id: produtoSalvo.id,
        nome:
          produtoSalvo.nome ||
          produtoSalvo.descricao ||
          item.nome ||
          item.descricao ||
          null,
        codigo: produtoSalvo.codigo || item.codigo || null,
        preco: produtoSalvo.preco || item.preco || null,
        _orig_parsed_index: origIdx !== null ? Number(origIdx) : null,
      };
      try {
        sessionStorage.setItem("lastCreatedProduct", JSON.stringify(last));
      } catch (e) {
        console.debug("sessionStorage set failed", e);
      }
    } catch (e) {
      console.debug("Erro preparando lastCreatedProduct", e);
    }

    // Verificar se veio do fluxo de importação XML
    const fromXML =
      new URLSearchParams(window.location.search).get("from") === "xml";

    // Redirecionar: se veio do XML, voltar para entrada-mercadoria com modal aberto
    if (fromXML) {
      setTimeout(() => {
        try {
          const origIdx =
            (document.getElementById("__origParsedIndex") &&
              document.getElementById("__origParsedIndex").value) ||
            window.__origParsedIndex ||
            "";
          const q =
            "?openMapping=1" +
            (origIdx !== "" ? "&origIdx=" + encodeURIComponent(origIdx) : "");
          window.location.href = "../compras/entrada-mercadoria.html" + q;
        } catch (e) {
          window.location.href = "./meus-itens.html";
        }
      }, 800);
    } else {
      // Fluxo normal: vai para meus-itens
      setTimeout(() => {
        window.location.href = "./meus-itens.html";
      }, 800);
    }

    // notificar rascunho salvo para limpar draft de perfilValidade
    window.dispatchEvent(
      new CustomEvent("produto:salvo", { detail: { itemId: produtoSalvo.id } }),
    );
    // Registrar preço inicial no histórico local para este produto
    try {
      const phKey = "priceHistory:" + produtoSalvo.id;
      // data em horário de Brasília
      const hoje = (function () {
        try {
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
          }).format(new Date());
        } catch (e) {
          return new Date().toISOString().split("T")[0];
        }
      })();
      const entry = {
        date: hoje,
        sale: Number(item.preco) || null,
        cost: Number(item.custoBase) || null,
      };
      let arr = [];
      try {
        arr = JSON.parse(localStorage.getItem(phKey) || "[]");
        if (!Array.isArray(arr)) arr = [];
      } catch (e) {
        arr = [];
      }
      arr.push(entry);
      localStorage.setItem(phKey, JSON.stringify(arr));
      try {
        localStorage.setItem(
          "priceHistoryUpdate",
          JSON.stringify({
            id: produtoSalvo.id,
            date: hoje,
            sale: entry.sale,
            cost: entry.cost,
            t: Date.now(),
          }),
        );
      } catch (e) {}
    } catch (e) {
      console.debug("Falha ao registrar priceHistory local (novo-produto)", e);
    }
  } catch (err) {
    console.error("❌ Erro ao salvar produto:", err);
    alert("Erro ao salvar produto: " + err.message);
  }
}

function limparFormulario() {
  console.log("🧹 Limpando formulário...");

  const form = document.getElementById("formEditarProduto");
  if (form) {
    form.reset();

    // Reset dos botões toggle para o primeiro de cada grupo
    document.querySelectorAll(".btn-group").forEach((grupo) => {
      const botoes = grupo.querySelectorAll(".btn-toggle");
      botoes.forEach((btn, index) => {
        btn.classList.remove("active");
        if (index === 0) {
          btn.classList.add("active");
        }
      });
    });

    produtoAtual = null;
  }

  console.log("✅ Formulário limpo!");
}

function cancelarEdicao() {
  console.log("❌ Cancelando edição...");

  showConfirmDialog(
    "Deseja realmente cancelar? As alterações não salvas serão perdidas.",
    function () {
      window.location.href = "./meus-itens.html";
    },
  );
}

// Mostrar diálogo de confirmação customizado (reutilizável)
function showConfirmDialog(message, onConfirm, opts = {}) {
  try {
    const title = opts.title || "Confirmação";
    const confirmText = opts.confirmText || "OK";
    const cancelText = opts.cancelText || "Cancelar";
    const confirmClass = opts.confirmClass || "qc-confirm";

    // remover overlays antigos
    document
      .querySelectorAll(".custom-confirm-overlay, .modal-overlay, .qc-overlay")
      .forEach((e) => e.remove());
    const overlay = document.createElement("div");
    overlay.className = "custom-confirm-overlay";
    overlay.style.position = "fixed";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.45)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "20000";

    const modal = document.createElement("div");
    modal.className = "custom-confirm-box";
    modal.style.background = "#fff";
    modal.style.borderRadius = "10px";
    modal.style.boxShadow = "0 12px 36px rgba(0,0,0,0.18)";
    modal.style.padding = "20px";
    modal.style.maxWidth = "640px";
    modal.style.width = "min(92%,720px)";
    modal.style.fontFamily = "inherit";

    modal.innerHTML = `
            <div style="font-weight:700;margin-bottom:10px;font-size:16px;color:#2b2b2b">${escapeHtml(title)}</div>
            <div style="margin-bottom:18px;color:#444">${escapeHtml(message)}</div>
            <div style="text-align:right;display:flex;gap:12px;justify-content:flex-end">
                <button class="custom-confirm-cancel" style="padding:10px 16px;border-radius:10px;border:1px solid #f0d7d9;background:#fff;color:#333;cursor:pointer">${escapeHtml(cancelText)}</button>
                <button class="${confirmClass}" style="padding:10px 18px;border-radius:12px;border:none;background:#8b3b41;color:#fff;font-weight:600;cursor:pointer">${escapeHtml(confirmText)}</button>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const btnCancel = modal.querySelector(".custom-confirm-cancel");
    const btnConfirm = modal.querySelector("." + confirmClass);
    function close() {
      try {
        overlay.remove();
      } catch (e) {}
    }
    btnCancel.addEventListener("click", function (e) {
      e.preventDefault();
      close();
    });
    btnConfirm.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        if (typeof onConfirm === "function") onConfirm();
      } catch (err) {
        console.debug(err);
      }
      close();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
  } catch (e) {
    console.debug("showConfirmDialog error", e);
    if (typeof onConfirm === "function") {
      confirmar(message).then(function (r) {
        if (r) onConfirm();
      });
    }
  }
}

// Configurar Editor de Texto do Contrato
function configurarEditorTexto() {
  const editorBtns = document.querySelectorAll(".editor-btn");
  const editorContent = document.getElementById("textoContrato");
  const editorSelect = document.querySelector(".editor-select");

  if (!editorContent) return;

  // Configurar botões de formatação
  editorBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const icon = btn.querySelector("i");

      if (icon.classList.contains("fa-bold")) {
        document.execCommand("bold", false, null);
        btn.classList.toggle("active");
      } else if (icon.classList.contains("fa-italic")) {
        document.execCommand("italic", false, null);
        btn.classList.toggle("active");
      } else if (icon.classList.contains("fa-underline")) {
        document.execCommand("underline", false, null);
        btn.classList.toggle("active");
      } else if (icon.classList.contains("fa-list-ul")) {
        document.execCommand("insertUnorderedList", false, null);
      } else if (icon.classList.contains("fa-list-ol")) {
        document.execCommand("insertOrderedList", false, null);
      } else if (icon.classList.contains("fa-remove-format")) {
        document.execCommand("removeFormat", false, null);
        editorBtns.forEach((b) => b.classList.remove("active"));
      }
    });
  });

  // Configurar seletor de estilo
  if (editorSelect) {
    editorSelect.addEventListener("change", (e) => {
      const value = e.target.value;

      switch (value) {
        case "heading1":
          document.execCommand("formatBlock", false, "<h1>");
          break;
        case "heading2":
          document.execCommand("formatBlock", false, "<h2>");
          break;
        case "heading3":
          document.execCommand("formatBlock", false, "<h3>");
          break;
        case "normal":
          document.execCommand("formatBlock", false, "<p>");
          break;
      }
    });
  }

  // Remover placeholder ao focar
  editorContent.addEventListener("focus", () => {
    if (editorContent.innerHTML === "<p><em>Insira o texto aqui...</em></p>") {
      editorContent.innerHTML = "<p><br></p>";
    }
  });

  // Configurar grupos de variáveis (acordeão)
  const variableGroups = document.querySelectorAll(".variable-group-title");
  variableGroups.forEach((group) => {
    group.addEventListener("click", () => {
      group.parentElement.classList.toggle("expanded");
    });
  });
}

// Gerenciador de Composições: lista e permite editar/Adicionar via modal
function openComposicaoManagerModal() {
  const container = document.querySelector(".plano-composicao-content");
  const table = container
    ? container.querySelector(".plano-composicao-table")
    : null;
  // se não houver tabela, abrir editor direto para adicionar
  if (!table || !table.querySelector("tbody tr")) {
    openEditarComposicaoModal();
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.45)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "10000";

  const modal = document.createElement("div");
  modal.className = "modal-box modal-centered";
  modal.style.position = "fixed";
  modal.style.left = "50%";
  modal.style.top = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.width = "520px";
  modal.style.maxWidth = "calc(100% - 40px)";
  modal.style.background = "#fff";
  modal.style.borderRadius = "6px";
  modal.style.boxShadow = "0 8px 24px rgba(19,24,28,0.12)";
  modal.style.overflow = "hidden";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.zIndex = "10001";

  modal.innerHTML = `
        <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eef0f2;background:#fff">
            <h3 style="margin:0;font-size:18px;color:#1f3a45">Composição do Plano</h3>
            <button type="button" class="btn btn-secondary btn-close-modal" style="background:#fff;border:1px solid #e6e9eb;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:#1f3a45">Fechar</button>
        </div>
        <div class="modal-body" style="padding:18px 22px;max-height:60vh;overflow:auto"><div class="comp-list"></div></div>
        <div style="padding:14px 22px;border-top:1px solid #eef0f2;display:flex;justify-content:flex-end;gap:10px;background:#fff">
            <button type="button" class="btn btn-primary btn-add-composicao" style="background:#28a745;color:#fff;border:none;padding:10px 14px;border-radius:6px;cursor:pointer">Adicionar Item</button>
        </div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const btnClose = modal.querySelector(".btn-close-modal");
  const btnAdd = modal.querySelector(".btn-add-composicao");
  const listRoot = modal.querySelector(".comp-list");
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  rows.forEach((r, idx) => {
    const tipo = r.querySelector(".pc-tipo")
      ? r.querySelector(".pc-tipo").textContent
      : "";
    const desc = r.querySelector(".pc-desc")
      ? r.querySelector(".pc-desc").textContent
      : "";
    const rep = r.querySelector(".pc-rep")
      ? r.querySelector(".pc-rep").textContent
      : "";
    const qtd = r.querySelector(".pc-qtd")
      ? r.querySelector(".pc-qtd").textContent
      : "";
    const itemEl = document.createElement("div");
    itemEl.className = "comp-list-item";
    itemEl.style.padding = "12px 8px";
    itemEl.style.borderBottom = "1px solid #f1f1f1";
    // layout similar à imagem anexa: título, meta e botão Editar
    itemEl.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(desc)}</strong><div style=\"font-size:12px;color:#6c757d;margin-top:6px\">${escapeHtml(tipo)} • ${escapeHtml(rep)} • ${escapeHtml(qtd)}</div></div><div><button type=button class='btn btn-secondary btn-edit-composicao' data-idx='${idx}'>Editar</button></div></div>`;
    listRoot.appendChild(itemEl);
    try {
      itemEl.classList.add("new-item");
      itemEl.addEventListener("animationend", function () {
        try {
          itemEl.classList.remove("new-item");
        } catch (e) {}
      });
    } catch (e) {}
    const btnEdit = itemEl.querySelector(".btn-edit-composicao");
    btnEdit.addEventListener("click", function () {
      const prefill = {
        item: desc,
        repeticao: rep,
        quantidade: parseInt(
          (qtd || "0").toString().match(/(\d+)/)?.[0] || 0,
          10,
        ),
      };
      openEditarComposicaoModal(prefill, function (data) {
        try {
          const newDesc = data.selectedId
            ? getMeusItensFromStorage().find(
                (it) => String(it.id || "") === String(data.selectedId),
              )?.nome || data.item
            : data.item;
          const newTipo =
            (
              getMeusItensFromStorage().find(
                (it) => String(it.id || "") === String(data.selectedId),
              ) || {}
            ).tipo || "Principal";
          const newQtdLabel =
            data.quantidade === 1
              ? "1 vez ao mês"
              : data.quantidade + " vezes ao mês";
          if (r.querySelector(".pc-desc"))
            r.querySelector(".pc-desc").textContent = newDesc;
          if (r.querySelector(".pc-tipo"))
            r.querySelector(".pc-tipo").textContent = newTipo;
          if (r.querySelector(".pc-rep"))
            r.querySelector(".pc-rep").textContent = data.repeticao;
          if (r.querySelector(".pc-qtd"))
            r.querySelector(".pc-qtd").innerHTML =
              newQtdLabel +
              ' <button type=button class=btn-remove-composicao style="margin-left:12px">Remover</button>';
          const btnRem = r.querySelector(".btn-remove-composicao");
          if (btnRem) {
            btnRem.addEventListener("click", function (ev) {
              ev.preventDefault();
              try {
                r.remove();
                if (!table.querySelector("tbody tr")) {
                  table.remove();
                  const p = document.createElement("p");
                  p.className = "plano-composicao-empty";
                  p.textContent =
                    "Nenhum item adicionado à composição do plano.";
                  container.appendChild(p);
                }
              } catch (e) {}
            });
          }
        } catch (e) {
          console.error(e);
        }
      });
    });
  });
  function rebuildList() {
    listRoot.innerHTML = "";
    const newRows = Array.from(table.querySelectorAll("tbody tr"));
    newRows.forEach((r, idx) => {
      const tipo = r.querySelector(".pc-tipo")
        ? r.querySelector(".pc-tipo").textContent
        : "";
      const desc = r.querySelector(".pc-desc")
        ? r.querySelector(".pc-desc").textContent
        : "";
      const rep = r.querySelector(".pc-rep")
        ? r.querySelector(".pc-rep").textContent
        : "";
      const qtd = r.querySelector(".pc-qtd")
        ? r.querySelector(".pc-qtd").textContent
        : "";
      const itemEl = document.createElement("div");
      itemEl.className = "comp-list-item";
      itemEl.style.padding = "12px 8px";
      itemEl.style.borderBottom = "1px solid #f1f1f1";
      itemEl.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(desc)}</strong><div style=\"font-size:12px;color:#6c757d;margin-top:6px\">${escapeHtml(tipo)} • ${escapeHtml(rep)} • ${escapeHtml(qtd)}</div></div><div><button type=button class='btn btn-secondary btn-edit-composicao' data-idx='${idx}'>Editar</button></div></div>`;
      listRoot.appendChild(itemEl);
      try {
        itemEl.classList.add("new-item");
        itemEl.addEventListener("animationend", function () {
          try {
            itemEl.classList.remove("new-item");
          } catch (e) {}
        });
      } catch (e) {}
      const btnEdit = itemEl.querySelector(".btn-edit-composicao");
      btnEdit.addEventListener("click", function () {
        const prefill = {
          item: desc,
          repeticao: rep,
          quantidade: parseInt(
            (qtd || "0").toString().match(/(\d+)/)?.[0] || 0,
            10,
          ),
        };
        openEditarComposicaoModal(prefill, function (data) {
          try {
            const newDesc = data.selectedId
              ? getMeusItensFromStorage().find(
                  (it) => String(it.id || "") === String(data.selectedId),
                )?.nome || data.item
              : data.item;
            const newTipo =
              (
                getMeusItensFromStorage().find(
                  (it) => String(it.id || "") === String(data.selectedId),
                ) || {}
              ).tipo || "Principal";
            const newQtdLabel =
              data.quantidade === 1
                ? "1 vez ao mês"
                : data.quantidade + " vezes ao mês";
            if (r.querySelector(".pc-desc"))
              r.querySelector(".pc-desc").textContent = newDesc;
            if (r.querySelector(".pc-tipo"))
              r.querySelector(".pc-tipo").textContent = newTipo;
            if (r.querySelector(".pc-rep"))
              r.querySelector(".pc-rep").textContent = data.repeticao;
            if (r.querySelector(".pc-qtd"))
              r.querySelector(".pc-qtd").innerHTML =
                newQtdLabel +
                ' <button type=button class=btn-remove-composicao style="margin-left:12px">Remover</button>';
            const btnRem = r.querySelector(".btn-remove-composicao");
            if (btnRem) {
              btnRem.addEventListener("click", function (ev) {
                ev.preventDefault();
                try {
                  r.remove();
                  if (!table.querySelector("tbody tr")) {
                    table.remove();
                    const p = document.createElement("p");
                    p.className = "plano-composicao-empty";
                    p.textContent =
                      "Nenhum item adicionado à composição do plano.";
                    container.appendChild(p);
                  }
                } catch (e) {}
              });
            }
          } catch (e) {
            console.error(e);
          }
          // after editing, rebuild manager list to reflect changes
          rebuildList();
        });
      });
    });
  }
  // initial build
  rebuildList();
  function insertRowFromData(data) {
    try {
      const container = document.querySelector(".plano-composicao-content");
      if (!container) return;
      const empty = container.querySelector(".plano-composicao-empty");
      if (empty) empty.remove();
      let table = container.querySelector(".plano-composicao-table");
      if (!table) {
        table = document.createElement("table");
        table.className = "plano-composicao-table";
        table.innerHTML = `<thead><tr><th>Tipo</th><th>Descrição</th><th>Repetição</th><th style="text-align:right">Qtd. Mensal</th></tr></thead><tbody></tbody>`;
        container.appendChild(table);
      }
      const tbody = table.querySelector("tbody");
      let tipoLabel = "Principal";
      let descricao = escapeHtml(data.item || "");
      if (data.selectedId) {
        const all = getMeusItensFromStorage();
        const found = (all || []).find(
          (it) => String(it.id || "") === String(data.selectedId),
        );
        if (found) {
          descricao = escapeHtml(
            found.nome || found.titulo || found.name || data.item,
          );
          tipoLabel =
            (found.tipo || found.categoria || "").toString() || tipoLabel;
        }
      }
      const qtdLabel =
        data.quantidade === 1
          ? "1 vez ao mês"
          : data.quantidade + " vezes ao mês";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="pc-tipo">${escapeHtml(tipoLabel)}</td><td class="pc-desc">${descricao}</td><td class="pc-rep">${escapeHtml(data.repeticao)}</td><td class="pc-qtd" style="text-align:right">${escapeHtml(qtdLabel)} <button type=button class=btn-remove-composicao style="margin-left:12px">Remover</button></td>`;
      tbody.appendChild(tr);
      // animação suave
      try {
        tr.classList.add("new-item");
        tr.addEventListener("animationend", function () {
          try {
            tr.classList.remove("new-item");
          } catch (e) {}
        });
      } catch (e) {}
      const btnRem = tr.querySelector(".btn-remove-composicao");
      if (btnRem) {
        btnRem.addEventListener("click", function (ev) {
          ev.preventDefault();
          try {
            tr.remove();
            if (!tbody.querySelector("tr")) {
              table.remove();
              const p = document.createElement("p");
              p.className = "plano-composicao-empty";
              p.textContent = "Nenhum item adicionado à composição do plano.";
              container.appendChild(p);
            }
          } catch (e) {}
        });
      }
    } catch (e) {
      console.error("insertRowFromData failed", e);
    }
  }

  btnAdd.addEventListener("click", function () {
    openEditarComposicaoModal(null, function (data) {
      // add the returned data into the main composition table, then refresh list
      insertRowFromData(data);
      setTimeout(rebuildList, 60);
    });
  });
  btnClose.addEventListener("click", function (e) {
    e.preventDefault();
    try {
      overlay.remove();
    } catch (e) {}
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay)
      try {
        overlay.remove();
      } catch (e) {}
  });
}

// (listener já ligado na inicialização principal acima)

// removed custom agrupamento overlay to use standard dropdown logic

// --- Tipo do Plano: dropdown + ajuda contextual ---
(function setupTipoPlanoHelp() {
  const mapping = {
    mensalidade: {
      title: "Mensalidade",
      text: "O plano é válido apenas dentro do mês corrente. Caso o tutor não utilize todos os banhos dentro do mês, o valor não é acumulado para o mês seguinte. Ao virar o mês, a cobrança é integral novamente, mesmo que não tenha utilizado todos os serviços.",
    },
    consumo: {
      title: "Consumo",
      text: "Os banhos ficam disponíveis para o tutor usar quando quiser, sem depender do mês vigente. Ideal para quem não tem um dia fixo para trazer o pet: os créditos acumulam e podem ser utilizados ao longo do tempo, conforme a necessidade.",
    },
  };

  function els(root = document) {
    return {
      select: root.getElementById("tipoPlanoSelect"),
      btn: root.getElementById("tipoHelpBtn"),
      panel: root.getElementById("tipoHelpPanel"),
      title: root.getElementById("tipoHelpTitle"),
      text: root.getElementById("tipoHelpText"),
    };
  }

  function init() {
    const e = els();
    if (!e.select) return;

    function update() {
      const v = (e.select.value || "").toLowerCase();
      if (!v) {
        if (e.btn) e.btn.style.display = "none";
        if (e.panel) e.panel.style.display = "none";
        return;
      }
      if (e.btn) e.btn.style.display = "flex";
      const m = mapping[v] || { title: "", text: "" };
      if (e.title) e.title.textContent = m.title;
      if (e.text) e.text.textContent = m.text;
    }

    e.select.addEventListener("change", update);

    function hidePanel() {
      if (!e.panel) return;
      e.panel.style.display = "none";
      e.panel.style.left = "";
      e.panel.style.top = "";
      e.panel.style.position = "absolute";
    }
    function showPanelAtButton() {
      if (!e.panel || !e.btn) return;
      e.panel.style.display = "block";
      e.panel.style.position = "fixed";
      const rect = e.btn.getBoundingClientRect();
      // garantir layout antes de medir
      requestAnimationFrame(function () {
        const panelRect = e.panel.getBoundingClientRect();
        let left = Math.round(rect.right + 8);
        // se não couber à direita, posicionar à esquerda
        if (left + panelRect.width > window.innerWidth - 8) {
          left = Math.round(rect.left - panelRect.width - 8);
        }
        let top = Math.round(rect.top + rect.height / 2 - panelRect.height / 2);
        // evitar fora da viewport
        if (top < 8) top = 8;
        if (top + panelRect.height > window.innerHeight - 8)
          top = window.innerHeight - panelRect.height - 8;
        e.panel.style.left = left + "px";
        e.panel.style.top = top + "px";
      });
    }

    if (e.btn)
      e.btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!e.panel) return;
        if (e.panel.style.display === "block") hidePanel();
        else showPanelAtButton();
      });

    // fechar painel ao clicar fora (considera botão também)
    document.addEventListener("click", function (ev) {
      const p = e.panel;
      const b = e.btn;
      if (!p) return;
      if (
        p.style.display === "block" &&
        !p.contains(ev.target) &&
        ev.target !== b
      )
        hidePanel();
    });

    // inicializar dependendo do valor já presente
    update();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
