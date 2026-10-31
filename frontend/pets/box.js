// box.js
// Gerencia lista de Boxes: render, add, edit, delete - usa localStorage

(function () {
  // debug: indicar que o script foi carregado
  try {
    console.debug("[box.js] carregado");
  } catch (e) {}
  const STORAGE_KEY = "boxesPersonalizados";
  const tbodyId = "boxesList";
  const addBtnId = "addButton";
  const searchInputId = "searchInput";

  function getBoxes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveBoxes(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str).replace(
      /[&<>"'`]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
          "`": "&#96;",
        })[c],
    );
  }

  function renderTable(filter) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const list = getBoxes();
    const rows = list
      .filter((b) => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (
          (b.descricao || "").toLowerCase().includes(q) ||
          (b.abreviacao || "").toLowerCase().includes(q)
        );
      })
      .map((b) => {
        // garantir formato de pets: array
        const petsArr = Array.isArray(b.pets)
          ? b.pets
          : typeof b.pets === "number"
            ? []
            : b.pets || [];
        // Na listagem do box mostramos apenas o nome do pet (sem tutor)
        const petsHtml = petsArr.length
          ? petsArr
              .map(
                (p) =>
                  `<div class="box-pet-item" data-pet-id="${escapeHtml(p.id)}">${escapeHtml(p.nome)} <a href="#" class="remove-pet-link" data-box-id="${b.id}" data-pet-id="${escapeHtml(p.id)}">Remover</a></div>`,
              )
              .join("")
          : '<div class="no-pets">Nenhum pet cadastrado.</div>';
        return `
          <tr data-id="${b.id}">
            <td>
              <div class="box-descricao">${escapeHtml(b.descricao)} <span class="badge">${petsArr.length}</span></div>
              <div class="box-pets-list">${petsHtml}</div>
              <div style="margin-top:8px;"><a href="#" class="add-pet-link" data-box-id="${b.id}">Adicionar Pet</a></div>
            </td>
            <td>${escapeHtml(b.abreviacao)}</td>
            <td>${escapeHtml(b.capacidade)}</td>
            <td>${b.ativo ? "Sim" : "Não"}</td>
            <td><button class="action-icon edit-btn" data-id="${b.id}" title="Editar"><i class="fas fa-pen"></i></button></td>
            <td><button class="action-icon delete-btn" data-id="${b.id}" title="Excluir"><i class="fas fa-trash"></i></button></td>
          </tr>
        `;
      })
      .join("");
    tbody.innerHTML =
      rows ||
      '<tr><td colspan="6" style="color:#6b7280;">Nenhum box cadastrado.</td></tr>';
    attachRowHandlers();
  }

  function attachRowHandlers() {
    document.querySelectorAll(".edit-btn").forEach(
      (btn) =>
        (btn.onclick = () => {
          const id = btn.getAttribute("data-id");
          openPanelForEdit(id);
        }),
    );
    document.querySelectorAll(".delete-btn").forEach(
      (btn) =>
        (btn.onclick = () => {
          const id = btn.getAttribute("data-id");
          deleteBox(id);
        }),
    );
    document.querySelectorAll(".add-pet-link").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const id = a.getAttribute("data-box-id");
        openAddPetPanel(id);
      }),
    );
    document.querySelectorAll(".remove-pet-link").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const boxId = a.getAttribute("data-box-id");
        const petId = a.getAttribute("data-pet-id");
        removePetFromBox(boxId, petId);
      }),
    );
  }

  function removePetFromBox(boxId, petId) {
    const list = getBoxes();
    const idx = list.findIndex((b) => b.id === boxId);
    if (idx === -1) return;
    const b = list[idx];
    b.pets = Array.isArray(b.pets) ? b.pets.filter((p) => p.id !== petId) : [];
    saveBoxes(list);
    renderTable(document.getElementById(searchInputId)?.value || "");
  }

  // Painel pequeno para adicionar pet (autocomplete)
  function openAddPetPanel(boxId) {
    // remove painel existente
    const existing = document.querySelector(".add-pet-backdrop");
    if (existing) existing.remove();
    const panel = document.createElement("div");
    panel.className = "add-pet-backdrop";
    // usar z-index muito alto para evitar conflito com outros elementos do layout
    panel.style.cssText =
      "position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(2,6,23,0.35); z-index:9999; padding:20px;";
    // Não usar a classe global `side-panel` aqui (evita conflitos de CSS do tema). Usar .add-pet-panel e estilos fixos para centralizar.
    panel.innerHTML = `
  <div class="add-pet-panel" style="width:480px; max-width:100%; background:white; border-radius:8px; box-shadow:0 10px 30px rgba(2,6,23,0.12); padding:12px; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:10000;">
        <div style="position:absolute; right:8px; top:8px; display:flex; gap:8px; align-items:center;">
          <button id="addPetSave" class="btn primary btn-primary" style="min-width:90px; padding:8px 12px; background:var(--btn-success, #16a34a); color:#fff; border:none; border-radius:6px; cursor:pointer;">Adicionar</button>
          <button id="addPetClose" class="action-icon" title="Fechar" style="width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center;"><i class="fas fa-times"></i></button>
        </div>
        <div style="padding-right:48px;"> <!-- padding para não permitir overlap com o botão fechar -->
          <div style="display:flex; align-items:center; gap:8px;">
            <input id="addPetInput" placeholder="Digite nome do pet ou tutor" style="width:calc(100% - 160px); padding:10px 12px; border:1px solid #d1d5db; border-radius:4px; outline:none; font-size:14px; box-sizing:border-box;" />
          </div>
          <div style="margin-top:8px; font-size:12px; color:#6b7280;">Dica: selecione um pet nos resultados (não adicione somente o tutor).</div>
          <div class="panel-actions" style="margin-top:8px; padding:0; text-align:right; display:none;">
            <button id="addPetSave_fallback" class="btn primary" style="min-width:110px;">Adicionar</button>
          </div>
        </div>
        <div id="resultados-pet-cliente" style="margin-top:8px; max-height:260px; overflow:auto; border-top:1px solid #f3f4f6; padding-top:6px;"></div>
        <input type="hidden" id="selectedPetId" />
        <div id="selectedPetInfo" style="display:none; margin-top:8px; color:#064e3b;"></div>
      </div>
    `;
    document.body.appendChild(panel);

    const input = panel.querySelector("#addPetInput");
    const results = panel.querySelector("#resultados-pet-cliente");
    const btnClose = panel.querySelector("#addPetClose");
    const btnSave = panel.querySelector("#addPetSave");
    // mantemos um input hidden com ids apenas para compatibilidade externa
    const selectedHidden =
      panel.querySelector("#selectedPetId") ||
      (function () {
        const h = document.createElement("input");
        h.type = "hidden";
        h.id = "selectedPetId";
        panel.appendChild(h);
        return h;
      })();
    const selectedPetInfo = panel.querySelector("#selectedPetInfo");
    // lista local de pets selecionados: [{id,nome,cliente?}]
    let selectedPets = [];

    function renderSelectedChips() {
      if (!selectedPetInfo) return;
      if (selectedPets.length === 0) {
        selectedPetInfo.style.display = "none";
        selectedPetInfo.innerHTML = "";
        selectedHidden.value = "";
        return;
      }
      selectedPetInfo.style.display = "block";
      selectedPetInfo.innerHTML = selectedPets
        .map(
          (p) =>
            `<span class="selected-chip" data-id="${escapeHtml(p.id)}" style="display:inline-block; padding:6px 10px; margin-right:6px; background:#ecfdf5; border-radius:16px; font-size:13px;">${escapeHtml(p.nome)} <a href="#" class="remove-chip" data-id="${escapeHtml(p.id)}" style="margin-left:6px;color:#065f46;text-decoration:none;">✕</a></span>`,
        )
        .join("");
      selectedHidden.value = selectedPets.map((p) => p.id).join(",");
      // bind remove
      selectedPetInfo.querySelectorAll(".remove-chip").forEach((a) =>
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          const id = a.getAttribute("data-id");
          selectedPets = selectedPets.filter((x) => x.id !== id); // unmark in results
          const el = results.querySelector(
            `.search-result-item[data-id="${id}"]`,
          );
          if (el) {
            el.classList.remove("selected");
            el.style.background = "";
          }
          renderSelectedChips();
        }),
      );
    }

    // Busca os pets reais do sistema via API (/api/pets e /api/clientes) com cache local
    const API_CACHE_TTL = 1000 * 60 * 2; // 2 minutos
    if (!window._boxApiCache)
      window._boxApiCache = { pets: null, clients: null, ts: 0 };

    // Tenta vários endpoints (relativo e API_BASE configurado) e retorna o primeiro que funcionar.
    async function fetchSystemData() {
      const now = Date.now();
      if (
        window._boxApiCache.pets &&
        now - window._boxApiCache.ts < API_CACHE_TTL
      )
        return window._boxApiCache;

      async function tryFetchAny(urls) {
        for (const u of urls) {
          try {
            console.debug("[box] tentando", u);
            const r = await fetch(u, { cache: "no-store" });
            if (!r.ok) {
              console.debug("[box] resposta não-ok para", u, r.status);
              continue;
            }
            const j = await r.json();
            return j;
          } catch (e) {
            console.debug("[box] erro ao tentar", u, e);
            continue;
          }
        }
        return null;
      }

      try {
        const proto = location.protocol;
        const API_BASE =
          (window.__API_BASE__ && window.__API_BASE__.toString()) ||
          window.location.origin;
        const hostCandidates = ["/api/pets", API_BASE + "/api/pets"];
        const clientsCandidates = ["/api/clientes", API_BASE + "/api/clientes"];

        const petsData = (await tryFetchAny(hostCandidates)) || [];
        const clientsData = (await tryFetchAny(clientsCandidates)) || [];

        const petsArr = Array.isArray(petsData)
          ? petsData
          : petsData.pets || petsData.clientes || [];
        const clientsArr = Array.isArray(clientsData)
          ? clientsData
          : clientsData.clientes || clientsData.pessoas || [];

        window._boxApiCache = {
          pets: petsArr,
          clients: clientsArr,
          ts: Date.now(),
        };
        return window._boxApiCache;
      } catch (err) {
        console.error("Erro ao buscar /api/pets ou /api/clientes", err);
        results.innerHTML =
          '<div class="search-error">Erro ao buscar dados do servidor</div>';
        return { pets: [], clients: [], ts: Date.now() };
      }
    }

    async function doSearch(q) {
      // se o usuário tiver uma função global especializada, preferimos usar ela (mantendo compatibilidade)
      if (
        typeof window.buscarPetCliente === "function" &&
        window._preferBuscarPetCliente !== true
      ) {
        try {
          window.buscarPetCliente(q);
          return;
        } catch (e) {
          console.error(e);
        }
      }
      // caso contrário, buscamos via API e filtramos localmente
      try {
        console.debug("[box] doSearch:", q);
        results.innerHTML = '<div class="search-loading">Buscando...</div>';
        const data = await fetchSystemData();
        const pets = data.pets || [];
        const clients = data.clients || [];
        // criar mapa de clientes por id
        const clientsMap = {};
        clients.forEach((c) => {
          if (c && (c.id || c._id)) clientsMap[c.id || c._id] = c;
        });
        const ql = q.toLowerCase();
        const résultats = [];
        pets.forEach((p) => {
          const petName = (p.nome || p.name || "").toString().toLowerCase();
          const client =
            clientsMap[p.cliente_id] || clientsMap[p.cliente] || null;
          const clientName = client
            ? client.nome || client.name || ""
            : p.cliente_nome || "";
          if (
            petName.includes(ql) ||
            (clientName && clientName.toLowerCase().includes(ql))
          ) {
            résultats.push({
              id: p.id || p._id || p.codigo || "",
              tipo: "pet",
              nome: p.nome || p.name || "",
              cliente: clientName,
              raca: p.raca || p.especie || "",
            });
          }
        });
        // também permitir busca por clientes (se o query bater apenas em cliente)
        clients.forEach((c) => {
          const nome = (c.nome || c.name || "").toString().toLowerCase();
          if (nome.includes(ql))
            résultats.push({
              id: c.id || c._id || "",
              tipo: "cliente",
              nome: c.nome || c.name || "",
              telefone: c.telefone || "",
            });
        });
        // renderizar: nome em destaque e tutor/telefone abaixo
        if (résultats.length === 0) {
          results.innerHTML =
            '<div class="search-no-results">Nenhum resultado encontrado</div>';
          results.style.display = "block";
          return;
        }
        results.innerHTML = résultats
          .map(
            (item) =>
              `<div class="search-result-item" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;" data-id="${escapeHtml(item.id)}" data-nome="${escapeHtml(item.nome)}" data-cliente="${escapeHtml(item.cliente || "")}" data-tipo="${item.tipo}"><strong style="display:block">${escapeHtml(item.nome)}</strong><div style="font-size:12px;color:#555">${item.tipo === "pet" ? escapeHtml("Tutor: " + (item.cliente || "")) : escapeHtml(item.telefone || "")}${item.raca ? " • " + escapeHtml(item.raca) : ""}</div></div>`,
          )
          .join("");
        results.querySelectorAll(".search-result-item").forEach((el) =>
          el.addEventListener("click", () => {
            const id = el.getAttribute("data-id");
            const nome = el.getAttribute("data-nome");
            const cliente = el.getAttribute("data-cliente");
            const tipo = el.getAttribute("data-tipo");
            if (tipo === "pet") {
              // toggle selection
              const exists = selectedPets.find(
                (p) => String(p.id) === String(id),
              );
              if (exists) {
                selectedPets = selectedPets.filter(
                  (p) => String(p.id) !== String(id),
                );
                el.classList.remove("selected");
                el.style.background = "";
              } else {
                selectedPets.push({ id: id, nome: nome, cliente: cliente });
                el.classList.add("selected");
                el.style.background = "#ecfdf5";
              }
              renderSelectedChips();
              // keep input value for search UX
              input.value = "";
            } else if (tipo === "cliente") {
              showClientPets(id, nome);
            }
          }),
        );
      } catch (err) {
        console.error(err);
        fallbackSearch(q);
      }
    }

    // Fallback simples (pequeno dataset) caso buscarPetCliente não exista
    function fallbackSearch(q) {
      const ds = [
        {
          id: "p1",
          tipo: "pet",
          nome: "Apolo",
          cliente: "Larissa",
          raca: "SRD",
        },
        {
          id: "p2",
          tipo: "pet",
          nome: "Apolo",
          cliente: "Caio Occhi",
          raca: "SRD",
        },
        { id: "p3", tipo: "pet", nome: "Rex", cliente: "João" },
      ];
      const out = ds.filter(
        (it) =>
          (it.nome || "").toLowerCase().includes(q.toLowerCase()) ||
          (it.cliente || "").toLowerCase().includes(q.toLowerCase()),
      );
      results.innerHTML = out
        .map(
          (item) =>
            `<div class="search-result-item" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;" data-id="${escapeHtml(item.id)}" data-nome="${escapeHtml(item.nome)}" data-cliente="${escapeHtml(item.cliente)}" data-tipo="${item.tipo}"><strong style="display:block">${escapeHtml(item.nome)}</strong><div style="font-size:12px;color:#555">${escapeHtml(item.cliente)} ${item.raca ? " • " + escapeHtml(item.raca) : ""}</div></div>`,
        )
        .join("");
      // bind (toggle multi-select)
      results.querySelectorAll(".search-result-item").forEach((el) =>
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-id");
          const nome = el.getAttribute("data-nome");
          const cliente = el.getAttribute("data-cliente");
          const tipo = el.getAttribute("data-tipo");
          if (tipo === "pet") {
            const exists = selectedPets.find(
              (p) => String(p.id) === String(id),
            );
            if (exists) {
              selectedPets = selectedPets.filter(
                (p) => String(p.id) !== String(id),
              );
              el.classList.remove("selected");
              el.style.background = "";
            } else {
              selectedPets.push({ id: id, nome: nome, cliente: cliente });
              el.classList.add("selected");
              el.style.background = "#ecfdf5";
            }
            renderSelectedChips();
            input.value = "";
          } else if (tipo === "cliente") {
            showClientPets(id, nome);
          }
        }),
      );
    }

    // If the global exibirResultadosPetCliente is used, it will fill #resultados-pet-cliente and call selecionarPetCliente when clicked
    // We'll instrument selecionarPetCliente to also set our selected fields if present
    const originalSelecionar = window.selecionarPetCliente;
    window.selecionarPetCliente = function (
      id,
      nome,
      tipo,
      cliente,
      raca,
      telefone,
    ) {
      try {
        if (typeof originalSelecionar === "function")
          originalSelecionar(id, nome, tipo, cliente, raca, telefone);
      } catch (e) {
        console.error(e);
      }
      // If our panel is open, add to selectedPets (toggle)
      try {
        if (typeof id !== "undefined" && id !== null) {
          const exists = selectedPets.find((p) => String(p.id) === String(id));
          if (!exists) {
            selectedPets.push({ id: id, nome: nome, cliente: cliente });
            // mark in results if present
            const el = results.querySelector(
              `.search-result-item[data-id="${escapeHtml(id)}"]`,
            );
            if (el) {
              el.classList.add("selected");
              el.style.background = "#ecfdf5";
            }
            renderSelectedChips();
          }
        }
        const inp =
          document.getElementById("addPetInput") ||
          document.getElementById("petCliente");
        if (inp) inp.value = "";
      } catch (e) {
        console.error(e);
      }
    };

    // debounce helper para evitar muitas requisições
    function debounce(fn, wait) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    }
    const debouncedSearch = debounce(async (q) => {
      if (!q) {
        results.innerHTML = "";
        return;
      }
      await doSearch(q);
    }, 230);
    input.addEventListener("input", () => {
      selectedPetId.value = "";
      selectedPetInfo.style.display = "none";
      const q = input.value.trim();
      debouncedSearch(q);
    });

    // Evitar fechamento indesejado quando o usuário arrasta/seleciona:
    // detectamos onde o pointerdown começou e só fechamos se o pointerdown também iniciou fora do painel interno
    let pointerDownStartedInside = false;
    const inner = panel.querySelector(".add-pet-panel");
    panel.addEventListener("pointerdown", (ev) => {
      pointerDownStartedInside = inner && inner.contains(ev.target);
    });
    panel.addEventListener("click", (ev) => {
      if (ev.target === panel && !pointerDownStartedInside) {
        panel.remove();
        if (originalSelecionar)
          window.selecionarPetCliente = originalSelecionar;
      }
    });
    btnClose.addEventListener("click", () => {
      panel.remove();
      if (originalSelecionar) window.selecionarPetCliente = originalSelecionar;
    });

    btnSave.addEventListener("click", () => {
      if (selectedPets.length === 0) {
        alert("Selecione pelo menos um pet nos resultados antes de adicionar.");
        input.focus();
        return;
      }
      const boxes = getBoxes();
      const idx = boxes.findIndex((b) => b.id === boxId);
      if (idx === -1) return;
      const b = boxes[idx];
      b.pets = Array.isArray(b.pets) ? b.pets : [];
      // Adiciona cada pet selecionado evitando duplicatas
      selectedPets.forEach((p) => {
        const exists = b.pets.find((x) => String(x.id) === String(p.id));
        if (!exists) {
          b.pets.push({ id: p.id || generateId(), nome: p.nome || "" });
        }
      });
      saveBoxes(boxes);
      panel.remove();
      if (originalSelecionar) window.selecionarPetCliente = originalSelecionar;
      renderTable(document.getElementById(searchInputId)?.value || "");
    });

    // Quando o usuário clica em um resultado do tipo 'cliente', mostramos os pets desse tutor para seleção
    function showClientPets(clienteId, clienteNome) {
      const data = window._boxApiCache || { pets: [], clients: [] };
      const pets = data.pets || [];
      const matches = pets.filter(
        (p) =>
          String(p.cliente_id || p.cliente || "").toLowerCase() ===
            String(clienteId).toLowerCase() ||
          (p.cliente_nome || "")
            .toLowerCase()
            .includes((clienteNome || "").toLowerCase()),
      );
      if (matches.length === 0) {
        results.innerHTML = `<div class="search-no-results">Nenhum pet encontrado para ${escapeHtml(clienteNome)}</div>`;
        return;
      }
      results.innerHTML =
        `<div style="padding:6px 8px; font-size:13px; color:#374151;">Pets do tutor ${escapeHtml(clienteNome)}:</div>` +
        matches
          .map(
            (p) =>
              `<div class="search-result-item" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;" data-id="${p.id || p._id || ""}" data-nome="${escapeHtml(p.nome || p.name || "")}"><strong style="display:block">${escapeHtml(p.nome || p.name || "")}</strong><div style="font-size:12px;color:#555">${escapeHtml(p.raca || p.especie || "")}</div></div>`,
          )
          .join("");
      results.querySelectorAll(".search-result-item").forEach((el) =>
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-id");
          const nome = el.getAttribute("data-nome");
          selectedPetId.value = id;
          input.value = nome;
          selectedPetInfo.style.display = "block";
          selectedPetInfo.innerHTML = `${nome} (${escapeHtml(clienteNome)})`;
        }),
      );
    }
  }

  function deleteBox(id) {
    // preferir usar o modal padrão do sistema quando disponível
    const message =
      "Tem certeza que deseja excluir este Box? Essa ação não poderá ser desfeita.";
    const doDelete = () => {
      const list = getBoxes().filter((b) => b.id !== id);
      saveBoxes(list);
      renderTable(document.getElementById(searchInputId)?.value || "");
    };

    // se existe função global padrão, use-a
    try {
      if (typeof window.showConfirmDeleteModal === "function") {
        window.showConfirmDeleteModal(message, "Excluir", doDelete);
        return;
      }
    } catch (e) {
      /* fallthrough to local modal */
    }

    // fallback: criar modal local semelhante ao padrão do sistema
    const backdrop = document.createElement("div");
    backdrop.className = "confirm-backdrop";
    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `<div class="icon"><i class="fas fa-exclamation-triangle"></i></div><h4>Confirmação</h4><p>${message}</p><div class="confirm-actions"><button class="btn secondary cancel-btn">Cancelar</button><button class="btn danger confirm-btn">Excluir</button></div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    modal
      .querySelector(".cancel-btn")
      .addEventListener("click", () => backdrop.remove());
    modal.querySelector(".confirm-btn").addEventListener("click", () => {
      try {
        doDelete();
      } catch (e) {
        console.error(e);
      }
      backdrop.remove();
    });
  }

  // Side panel creation
  function createPanelHtml() {
    const html = document.createElement("div");
    html.className = "side-panel-backdrop";
    html.innerHTML = `
      <div class="side-panel">
        <div class="panel-header">
          <h3 id="panelTitle">Novo Box</h3>
          <button id="panelClose" class="action-icon" title="Fechar"><i class="fas fa-times"></i></button>
        </div>
        <div class="form-group">
          <label>Descrição: <span style="color:#e11d48">*</span></label>
          <input type="text" id="boxDescricao" placeholder="Descrição" />
        </div>
        <div class="form-group">
          <label>Abreviação: <span style="color:#e11d48">*</span></label>
          <input type="text" id="boxAbreviacao" placeholder="Ex.: A1" />
        </div>
        <div class="form-group">
          <label>Capacidade:</label>
          <input type="number" id="boxCapacidade" min="1" value="1" />
        </div>
        <div class="form-group" style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="boxAtivo" checked /> <label for="boxAtivo">Ativo</label>
        </div>
        <div class="panel-actions" style="margin-top:14px;">
          <button id="panelCancel" class="btn secondary">Fechar</button>
          <button id="panelSave" class="btn primary">Salvar</button>
        </div>
      </div>
    `;
    return html;
  }

  let currentEditingId = null;

  function openAddPanel() {
    currentEditingId = null;
    openPanel();
  }

  function openPanelForEdit(id) {
    currentEditingId = id;
    openPanel();
    populatePanel(id);
  }

  function openPanel() {
    if (document.querySelector(".side-panel-backdrop")) return;
    const panel = createPanelHtml();
    document.body.appendChild(panel);
    // obter o elemento interno .side-panel e ativar classe 'show' para a transição/visibilidade
    const side = panel.querySelector(".side-panel");
    // Adiciona classe em next frame para garantir que a transição CSS ocorra
    requestAnimationFrame(() => {
      if (side) side.classList.add("show");
    });
    // wire buttons (scoped ao painel para evitar conflitos de ids duplicados)
    const btnClose = panel.querySelector("#panelClose");
    const btnCancel = panel.querySelector("#panelCancel");
    const btnSave = panel.querySelector("#panelSave");
    if (btnClose) btnClose.onclick = closePanel;
    if (btnCancel) btnCancel.onclick = closePanel;
    if (btnSave) btnSave.onclick = onSavePanel;
    // fechar ao clicar fora (no backdrop)
    panel.addEventListener("click", (ev) => {
      if (ev.target === panel) closePanel();
    });
    // focus no primeiro input
    setTimeout(() => {
      panel.querySelector("#boxDescricao")?.focus();
    }, 120);
  }

  function closePanel() {
    const el = document.querySelector(".side-panel-backdrop");
    if (el) el.remove();
    currentEditingId = null;
  }

  function populatePanel(id) {
    const boxes = getBoxes();
    const b = boxes.find((x) => x.id === id);
    if (!b) return;
    document.getElementById("panelTitle").textContent = "Editar Box";
    document.getElementById("boxDescricao").value = b.descricao || "";
    document.getElementById("boxAbreviacao").value = b.abreviacao || "";
    document.getElementById("boxCapacidade").value = b.capacidade || 1;
    document.getElementById("boxAtivo").checked = !!b.ativo;
  }

  function onSavePanel() {
    const desc = (document.getElementById("boxDescricao").value || "").trim();
    const abrv = (document.getElementById("boxAbreviacao").value || "").trim();
    const capacidade =
      parseInt(document.getElementById("boxCapacidade").value || "1", 10) || 1;
    const ativo = !!document.getElementById("boxAtivo").checked;
    if (!desc) {
      alert("Descrição é obrigatória");
      document.getElementById("boxDescricao").focus();
      return;
    }
    if (!abrv) {
      alert("Abreviação é obrigatória");
      document.getElementById("boxAbreviacao").focus();
      return;
    }

    const list = getBoxes();
    if (currentEditingId) {
      const idx = list.findIndex((x) => x.id === currentEditingId);
      if (idx !== -1) {
        list[idx].descricao = desc;
        list[idx].abreviacao = abrv;
        list[idx].capacidade = capacidade;
        list[idx].ativo = ativo;
      }
    } else {
      // pets deve ser array (não número) para evitar problemas ao renderizar
      const obj = {
        id: generateId(),
        descricao: desc,
        abreviacao: abrv,
        capacidade: capacidade,
        ativo: ativo,
        pets: [],
      };
      list.unshift(obj);
    }
    saveBoxes(list);
    closePanel();
    renderTable(document.getElementById(searchInputId)?.value || "");
  }

  function bind() {
    try {
      const addBtn = document.getElementById(addBtnId);
      if (addBtn) {
        addBtn.addEventListener("click", (e) => {
          e.preventDefault();
          openAddPanel();
        });
        console.debug("[box] bind: addButton encontrado e ligado");
      } else {
        console.debug(
          '[box] bind: addButton NÃO encontrado (id="' + addBtnId + '")',
        );
      }
    } catch (err) {
      console.error("[box] erro ao vincular addButton", err);
    }

    try {
      const search = document.getElementById(searchInputId);
      if (search) {
        search.addEventListener("input", () => renderTable(search.value));
        console.debug("[box] bind: searchInput ligado");
      } else {
        console.debug(
          '[box] bind: searchInput NÃO encontrado (id="' + searchInputId + '")',
        );
      }
    } catch (err) {
      console.error("[box] erro ao vincular searchInput", err);
    }
  }

  function init() {
    try {
      bind();
    } catch (e) {
      console.error("Erro ao vincular eventos do Box:", e);
    }
    try {
      renderTable("");
    } catch (e) {
      console.error("Erro ao renderizar tabela de Box:", e);
    }
  }

  // Se o DOM já estiver pronto, inicializa imediatamente; caso contrário aguarda DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expor função para abrir o painel a partir do HTML ou de outros scripts (fallback)
  try {
    window.openBoxPanel = openAddPanel;
  } catch (e) {
    /* noop */
  }
})();
