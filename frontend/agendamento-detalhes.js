// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

// Wrappers seguros para modais especiais (fila chamadas até a implementação real estar disponível)
if (typeof window.openAddVermifugoModal !== "function") {
  window._openAddVermifugoModalQueue = [];
  window.openAddVermifugoModal = function (itemInfo) {
    if (typeof window.__realOpenAddVermifugoModal === "function") {
      return window.__realOpenAddVermifugoModal(itemInfo);
    }
    window._openAddVermifugoModalQueue.push(itemInfo);
  };
}

// Reverter check-out (desfazer) — atualiza no banco e na UI
async function desfazerCheckout() {
  try {
    if (!window.agendamentoAtual || !window.agendamentoAtual.id) {
      // usar modal simples se necessário
      try {
        alert("Nenhum agendamento carregado");
      } catch (e) {}
      return;
    }

    // confirmar ação com modal estilizado
    const confirmar = await showConfirmDialog({
      title: "Cancelar Check-out",
      message:
        "Deseja realmente cancelar o check-out deste atendimento? Essa ação reverterá o status para o estado anterior.",
      okText: "OK",
      cancelText: "Cancelar",
    });

    if (!confirmar) return;

    const agId = window.agendamentoAtual.id;
    // decidir status anterior
    const previous = window.agendamentoAtual.__prevStatus || "agendado";

    const resp = await fetch(`/api/agendamentos/${agId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: previous, totalPago: 0, pagamentos: [] }),
    });

    if (resp.ok) {
      try {
        await carregarAgendamento();
      } catch (e) {
        console.warn("Erro recarregando agendamento após desfazer:", e);
      }
      window.agendamentoAtual.status = previous;
      try {
        if (typeof updateCheckoutVisibility === "function")
          updateCheckoutVisibility();
      } catch (e) {}
    } else {
      let txt = "Erro desconhecido";
      try {
        const j = await resp.json();
        txt = j.message || txt;
      } catch (e) {}
      try {
        alert("Erro ao desfazer check-out: " + txt);
      } catch (e) {}
    }
  } catch (e) {
    console.error("Erro em desfazerCheckout():", e);
    try {
      alert("Erro ao desfazer check-out. Verifique sua conexão.");
    } catch (e) {}
  }
}

// Exibe um modal de confirmação centralizado estilizado conforme sistema.
// Recebe um objeto: { title, message, okText, cancelText }
function showConfirmDialog(opts) {
  return new Promise((resolve) => {
    const {
      title = "Confirmação",
      message = "",
      okText = "OK",
      cancelText = "Cancelar",
    } = opts || {};

    // Evitar múltiplos modais
    if (document.getElementById("confirmOverlay")) return resolve(false);

    const overlay = document.createElement("div");
    overlay.id = "confirmOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.45)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "15000";

    const modal = document.createElement("div");
    modal.style.width = "480px";
    modal.style.maxWidth = "92%";
    modal.style.background = "#fff";
    modal.style.borderRadius = "8px";
    modal.style.boxShadow = "0 12px 40px rgba(2,6,23,0.45)";
    modal.style.padding = "18px";
    modal.style.fontFamily = "inherit";

    const h = document.createElement("div");
    h.style.fontSize = "18px";
    h.style.fontWeight = 600;
    h.style.marginBottom = "8px";
    h.textContent = title;

    const p = document.createElement("div");
    p.style.color = "#333";
    p.style.marginBottom = "18px";
    p.textContent = message;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "8px";

    const btnCancel = document.createElement("button");
    btnCancel.textContent = cancelText;
    btnCancel.style.background = "#d9534f";
    btnCancel.style.color = "#fff";
    btnCancel.style.border = "none";
    btnCancel.style.padding = "8px 14px";
    btnCancel.style.borderRadius = "6px";
    btnCancel.style.cursor = "pointer";

    const btnOk = document.createElement("button");
    btnOk.textContent = okText;
    btnOk.style.background = "#28a745";
    btnOk.style.color = "#fff";
    btnOk.style.border = "none";
    btnOk.style.padding = "8px 14px";
    btnOk.style.borderRadius = "6px";
    btnOk.style.cursor = "pointer";

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);

    modal.appendChild(h);
    modal.appendChild(p);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cleanup = () => {
      try {
        overlay.remove();
      } catch (e) {}
    };

    btnCancel.addEventListener("click", function () {
      cleanup();
      resolve(false);
    });
    btnOk.addEventListener("click", function () {
      cleanup();
      resolve(true);
    });

    // fechar ao clicar fora
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });
  });
}

if (typeof window.openAddAntiparasitarioModal !== "function") {
  window._openAddAntiparasitarioModalQueue = [];
  window.openAddAntiparasitarioModal = function (itemInfo) {
    if (typeof window.__realOpenAddAntiparasitarioModal === "function") {
      return window.__realOpenAddAntiparasitarioModal(itemInfo);
    }
    window._openAddAntiparasitarioModalQueue.push(itemInfo);
  };
}

// ==================== FUNÇÕES DE EDIÇÃO - DEFINIDAS NO ESCOPO GLOBAL ====================
// Estas funções precisam estar no escopo global para serem acessíveis de qualquer lugar

// Função para editar vermífugo - aguarda DOMContentLoaded e então a função modal
function openEditVermifugoModal(servicoData, itemElement) {
  console.log("📝 openEditVermifugoModal chamada com:", servicoData);

  const executarAbertura = () => {
    // Esperar até que a função esteja disponível (polling)
    let tentativas = 0;
    const maxTentativas = 50; // 5 segundos máximo

    const tentarAbrir = () => {
      // Garantir que a implementação real dos modais esteja inicializada
      if (
        typeof window.__realOpenAddVermifugoModal !== "function" &&
        typeof openAddItemModal === "function"
      ) {
        console.log(
          "ℹ️ Inicializando modais via openAddItemModal() para expor openAddVermifugoModal",
        );
        try {
          openAddItemModal();
        } catch (e) {
          console.warn("Erro ao chamar openAddItemModal()", e);
        }
      }

      if (typeof window.openAddVermifugoModal === "function") {
        console.log(
          "✅ openAddVermifugoModal disponível, preparando abertura...",
        );

        const fillFields = () => {
          const modal = document.getElementById("modalVermifugo");
          if (!modal) return;
          console.log("✅ Modal encontrado, preenchendo campos...");
          const fields = {
            vermifugoItemNome: servicoData.nome || "",
            vermifugoQtd: servicoData.quantidade || "1",
            vermifugoUnitario: servicoData.unitario || servicoData.valor || "0",
            vermifugoValorFinal: servicoData.total || servicoData.valor || "0",
            vermifugoDose: (servicoData.meta && servicoData.meta.dose) || "",
            vermifugoDataAplic:
              (servicoData.meta && servicoData.meta.dataAplic) || "",
            vermifugoLote: (servicoData.meta && servicoData.meta.lote) || "",
            vermifugoRenovacao:
              (servicoData.meta && servicoData.meta.renovacao) || "",
            vermifugoProfissional: servicoData.profissional || "",
          };
          Object.keys(fields).forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
              el.value = fields[id];
              console.log(`✅ Campo ${id} preenchido com:`, fields[id]);
            } else {
              console.warn(`⚠️ Campo ${id} não encontrado`);
            }
          });
          modal.dataset.editando = "true";
          modal.dataset.servicoId = String(servicoData.id || "");
          console.log("✅ Modal configurado para edição");
        };

        // Ouvir evento customizado (quando o modal for inserido no DOM)
        const onOpened = function () {
          try {
            fillFields();
          } catch (e) {}
        };
        window.addEventListener("modalVermifugoOpened", onOpened, {
          once: true,
        });

        // Chamar abertura (pode disparar o evento)
        window.openAddVermifugoModal({
          nome: servicoData.nome,
          valor: servicoData.unitario || servicoData.valor,
        });

        // Fallback: polling caso evento não seja capturado
        let triesModal = 0;
        const maxModalTries = 60; // 6 segundos
        const waitForModal = () => {
          const modal = document.getElementById("modalVermifugo");
          if (modal) {
            // remover listener caso ainda exista
            try {
              window.removeEventListener("modalVermifugoOpened", onOpened);
            } catch (_) {}
            fillFields();
          } else {
            triesModal++;
            if (triesModal < maxModalTries) {
              setTimeout(waitForModal, 100);
            } else {
              console.error("❌ Timeout esperando modalVermifugo aparecer");
            }
          }
        };
        waitForModal();
      } else {
        tentativas++;
        if (tentativas < maxTentativas) {
          console.log(
            `⏳ Aguardando openAddVermifugoModal... (tentativa ${tentativas}/${maxTentativas})`,
          );
          setTimeout(tentarAbrir, 100);
        } else {
          console.error(
            "❌ Timeout: openAddVermifugoModal não ficou disponível após 5 segundos",
          );
        }
      }
    };

    tentarAbrir();
  };

  // Se já estamos após DOMContentLoaded, executar imediatamente
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    console.log("✅ DOM já carregado, executando abertura...");
    executarAbertura();
  } else {
    // Caso contrário, aguardar DOMContentLoaded
    console.log("⏳ Aguardando DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", executarAbertura);
  }
}

// Função para editar antiparasitário - aguarda DOMContentLoaded e então a função modal
function openEditAntiparasitarioModal(servico, itemElement) {
  console.log("📝 openEditAntiparasitarioModal chamada com:", servico);

  const executarAbertura = () => {
    // Esperar até que a função esteja disponível (polling)
    let tentativas = 0;
    const maxTentativas = 50; // 5 segundos máximo

    const tentarAbrir = () => {
      if (typeof window.openAddAntiparasitarioModal === "function") {
        console.log(
          "✅ openAddAntiparasitarioModal disponível, preparando abertura...",
        );

        const fillFieldsA = () => {
          const modal = document.getElementById("modalAntiparasitario");
          if (!modal) return;
          console.log("✅ Modal encontrado, preenchendo campos...");
          const fields = {
            antiparasitarioItemNome: servico.nome || "",
            antiparasitarioQtd: servico.quantidade || "1",
            antiparasitarioUnitario: servico.unitario || servico.valor || "0",
            antiparasitarioValorFinal: servico.total || servico.valor || "0",
            antiparasitarioDose: (servico.meta && servico.meta.dose) || "",
            antiparasitarioDataAplic:
              (servico.meta && servico.meta.dataAplic) || "",
            antiparasitarioLote: (servico.meta && servico.meta.lote) || "",
            antiparasitarioRenovacao:
              (servico.meta && servico.meta.renovacao) || "",
            antiparasitarioProfissional: servico.profissional || "",
          };
          Object.keys(fields).forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
              el.value = fields[id];
              console.log(`✅ Campo ${id} preenchido com:`, fields[id]);
            } else {
              console.warn(`⚠️ Campo ${id} não encontrado`);
            }
          });
          modal.dataset.editando = "true";
          modal.dataset.servicoId = String(servico.id || "");
          console.log("✅ Modal configurado para edição");
        };

        const onOpenedA = function () {
          try {
            fillFieldsA();
          } catch (e) {}
        };
        window.addEventListener("modalAntiparasitarioOpened", onOpenedA, {
          once: true,
        });
        // Garantir implementação real disponível
        if (
          typeof window.__realOpenAddAntiparasitarioModal !== "function" &&
          typeof openAddItemModal === "function"
        ) {
          console.log(
            "ℹ️ Inicializando modais via openAddItemModal() para expor openAddAntiparasitarioModal",
          );
          try {
            openAddItemModal();
          } catch (e) {
            console.warn("Erro ao chamar openAddItemModal()", e);
          }
        }
        window.openAddAntiparasitarioModal({
          nome: servico.nome,
          valor: servico.unitario || servico.valor,
        });

        // Fallback polling
        let triesModalA = 0;
        const maxModalTriesA = 60;
        const waitForModalA = () => {
          const modal = document.getElementById("modalAntiparasitario");
          if (modal) {
            try {
              window.removeEventListener(
                "modalAntiparasitarioOpened",
                onOpenedA,
              );
            } catch (_) {}
            fillFieldsA();
          } else {
            triesModalA++;
            if (triesModalA < maxModalTriesA) setTimeout(waitForModalA, 100);
            else
              console.error(
                "❌ Timeout esperando modalAntiparasitario aparecer",
              );
          }
        };
        waitForModalA();
      } else {
        tentativas++;
        if (tentativas < maxTentativas) {
          console.log(
            `⏳ Aguardando openAddAntiparasitarioModal... (tentativa ${tentativas}/${maxTentativas})`,
          );
          setTimeout(tentarAbrir, 100);
        } else {
          console.error(
            "❌ Timeout: openAddAntiparasitarioModal não ficou disponível após 5 segundos",
          );
        }
      }
    };

    tentarAbrir();
  };

  // Se já estamos após DOMContentLoaded, executar imediatamente
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    console.log("✅ DOM já carregado, executando abertura...");
    executarAbertura();
  } else {
    // Caso contrário, aguardar DOMContentLoaded
    console.log("⏳ Aguardando DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", executarAbertura);
  }
}

// Expor globalmente
window.openEditVermifugoModal = openEditVermifugoModal;
window.openEditAntiparasitarioModal = openEditAntiparasitarioModal;
console.log("✅ Funções de edição definidas no escopo global");

// ==================== FIM DAS DEFINIÇÕES GLOBAIS ====================

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

    // Modal de edição de um serviço/servico dentro do agendamento
    function openEditServiceModal(itemEl) {
      try {
        console.log("[openEditServiceModal] called for itemEl:", itemEl);
        // limpar modal anterior se existir (forçar re-criação)
        try {
          const prev = document.getElementById("modalEditarServicoOverlay");
          if (prev && prev.parentNode) prev.remove();
        } catch (e) {}

        const currentName =
          itemEl.querySelector(".service-name")?.textContent || "";
        const currentQtd = itemEl.querySelector(".col-qtd")?.textContent || "1";
        const currentUnit =
          itemEl.querySelector(".col-unitario")?.textContent || "0,00";

        const overlay = document.createElement("div");
        overlay.id = "modalEditarServicoOverlay";
        overlay.style.cssText =
          "position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1600000;";

        const modal = document.createElement("div");
        modal.id = "modalEditarServico";
        modal.style.cssText =
          "width:560px;max-width:96%;background:white;border-radius:8px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:hidden;font-family:inherit;z-index:1600001;";
        modal.innerHTML = `
                <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
                    <strong>Editar Item</strong>
                    <button id="fecharModalEditarServico" style="background:transparent;border:none;font-size:18px;cursor:pointer;color:#666">✕</button>
                </div>
                <div style="padding:16px;">
                    <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Produto/Serviço</label>
                    <input id="editServiceInput" type="text" placeholder="Clique para selecionar..." value="${escapeHtmlUnsafe(currentName)}" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;margin-bottom:8px;box-sizing:border-box;" autocomplete="off">
                    <div id="editServiceResults" style="max-height:220px;overflow:auto;border:1px solid #f1f5f9;border-radius:6px;display:none;margin-bottom:8px;"></div>

                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <div style="flex:1">
                            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Quantidade</label>
                            <input id="editServiceQtd" type="number" value="${escapeHtmlUnsafe(currentQtd)}" min="1" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;">
                        </div>
                        <div style="flex:1">
                            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Unitário (cadastrado)</label>
                            <input id="editServiceUnitario" type="text" value="${escapeHtmlUnsafe(currentUnit)}" readonly style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;background:#f7f7f7;">
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <div style="flex:1">
                            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Valor final</label>
                            <input id="editServiceValorFinal" type="text" value="${escapeHtmlUnsafe(currentUnit)}" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;">
                        </div>
                        <div style="width:160px">
                            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">% Desconto</label>
                            <input id="editServiceDescontoPercent" type="number" min="0" max="100" step="0.0001" value="0" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;">
                        </div>
                        <div style="width:160px;display:flex;flex-direction:column;justify-content:flex-end;">
                            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Desconto R$</label>
                            <div id="editServiceDescontoReais" style="padding:10px;border:1px solid #f1f5f9;border-radius:6px;background:#fafafa;">-</div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                        <button id="btnCancelarEditarServico" class="btn" style="background:#6c757d;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
                        <button id="btnSalvarEditarServico" class="btn" style="background:#28a745;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Salvar</button>
                    </div>
                </div>
            `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        // impedir scroll do body enquanto modal aberto
        try {
          document.body.style.overflow = "hidden";
        } catch (e) {}

        const input = document.getElementById("editServiceInput");
        const results = document.getElementById("editServiceResults");

        // search helpers
        let controller = null;
        const doSearch = async (q) => {
          const qq = (q || "").trim();
          if (!qq) {
            results.style.display = "none";
            results.innerHTML = "";
            return;
          }
          try {
            if (controller) controller.abort();
          } catch (e) {}
          controller = new AbortController();
          const signal = controller.signal;
          try {
            results.innerHTML =
              '<div style="padding:10px;color:#666">Carregando...</div>';
            results.style.display = "block";
            const res = await fetch(
              "/api/itens?q=" + encodeURIComponent(qq) + "&limit=40",
              { signal, credentials: "include" },
            );
            if (!res.ok) {
              results.innerHTML =
                '<div style="padding:10px;color:#666">Erro na busca</div>';
              return;
            }
            const data = await res.json();
            const items = Array.isArray(data)
              ? data
              : Array.isArray(data.items)
                ? data.items
                : [];
            if (!items || items.length === 0) {
              results.innerHTML =
                '<div style="padding:10px;color:#666">Nenhum serviço encontrado</div>';
              return;
            }
            const frag = document.createDocumentFragment();
            items.slice(0, 40).forEach((it) => {
              const div = document.createElement("div");
              div.style.cssText =
                "padding:10px;border-bottom:1px solid #f6f6f6;cursor:pointer;";
              div.textContent =
                (it.nome || it.titulo || it.descricao || "") +
                (it.preco
                  ? " — " +
                    formatarMoeda(Number(String(it.preco).replace(",", ".")))
                  : "");
              div.addEventListener("click", () => {
                // preencher campos com o item selecionado
                input.value = it.nome || it.titulo || it.descricao || "";
                input.setAttribute("data-selected-id", String(it.id));
                input.setAttribute(
                  "data-selected-valor",
                  String(it.preco || it.venda || it.valor || 0),
                );
                results.style.display = "none";
                const ev = (it.preco || it.venda || it.valor || 0)
                  .toString()
                  .replace(".", ",");
                const elVal = document.getElementById("editServiceValorFinal");
                if (elVal) elVal.value = ev;
              });
              frag.appendChild(div);
            });
            results.innerHTML = "";
            results.appendChild(frag);
            results.style.display = "block";
          } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("Erro na busca edit modal", err);
            results.innerHTML =
              '<div style="padding:10px;color:#666">Erro na busca</div>';
          }
        };
        const deb = (function () {
          let t;
          return function (fn, ms) {
            clearTimeout(t);
            t = setTimeout(fn, ms || 250);
          };
        })();
        input.addEventListener("input", function () {
          deb(() => doSearch(input.value));
          input.removeAttribute("data-selected-id");
          input.removeAttribute("data-selected-valor");
        });
        input.addEventListener("focus", function () {
          if (input.value) deb(() => doSearch(input.value));
        });

        document
          .getElementById("btnCancelarEditarServico")
          .addEventListener("click", close);
        document
          .getElementById("fecharModalEditarServico")
          .addEventListener("click", close);

        // Vincular recálculo dinâmico do desconto e do valor final
        try {
          const valFinalEl = document.getElementById("editServiceValorFinal");
          const percEl = document.getElementById("editServiceDescontoPercent");
          const reaisEl = document.getElementById("editServiceDescontoReais");
          const unitElModal = document.getElementById("editServiceUnitario");

          // tentar inferir unitário cadastrado a partir do texto atual
          let registeredUnitModal = null;
          try {
            const raw =
              unitElModal && unitElModal.value
                ? String(unitElModal.value).replace(",", ".")
                : currentUnit || "0";
            registeredUnitModal =
              parseFloat(String(raw).replace(",", ".")) || null;
          } catch (e) {
            registeredUnitModal = null;
          }

          // se possível, tentar buscar unitário registrado entre dados do agendamento
          try {
            const sid = itemEl.dataset.serviceId;
            if (
              (registeredUnitModal === null || registeredUnitModal === 0) &&
              sid &&
              Array.isArray(agendamentoAtual && agendamentoAtual.servicos)
            ) {
              const found = agendamentoAtual.servicos.find(
                (x) => String(x.id) === String(sid),
              );
              if (found)
                registeredUnitModal =
                  parseFloat(found.unitario || found.valor || 0) ||
                  registeredUnitModal;
            }
            if (
              (registeredUnitModal === null || registeredUnitModal === 0) &&
              Array.isArray(
                agendamentoAtual && agendamentoAtual.__existingServicosArray,
              )
            ) {
              const found2 = agendamentoAtual.__existingServicosArray.find(
                (x) =>
                  String(x.nome || "").trim() ===
                  String(currentName || "").trim(),
              );
              if (found2)
                registeredUnitModal =
                  parseFloat(found2.unitario || found2.valor || 0) ||
                  registeredUnitModal;
            }
          } catch (e) {}

          function formatMoney(v) {
            try {
              return formatarMoeda(Number(v) || 0);
            } catch (e) {
              return "0,00";
            }
          }

          function recalcFromValor() {
            try {
              const raw = (valFinalEl.value || "").toString().replace(",", ".");
              const finalUnit = parseFloat(raw) || 0;
              const qtdNow =
                parseFloat(document.getElementById("editServiceQtd").value) ||
                1;
              let descontoReaisNow = 0;
              let descontoPercNow = 0;
              if (
                registeredUnitModal &&
                registeredUnitModal > 0 &&
                finalUnit < registeredUnitModal
              ) {
                descontoReaisNow = (registeredUnitModal - finalUnit) * qtdNow;
                descontoPercNow =
                  ((registeredUnitModal - finalUnit) / registeredUnitModal) *
                  100;
              }
              if (percEl) percEl.value = descontoPercNow.toFixed(4);
              if (reaisEl)
                reaisEl.textContent =
                  descontoReaisNow > 0 ? formatMoney(descontoReaisNow) : "-";
            } catch (e) {
              console.warn("recalcFromValor error", e);
            }
          }

          function recalcFromPercent() {
            try {
              const p = parseFloat(percEl.value) || 0;
              const qtdNow =
                parseFloat(document.getElementById("editServiceQtd").value) ||
                1;
              const unitCad = registeredUnitModal || 0;
              const finalUnit = unitCad * (1 - p / 100);
              if (valFinalEl)
                valFinalEl.value = (finalUnit || 0)
                  .toFixed(2)
                  .toString()
                  .replace(".", ",");
              const descontoReaisNow = Math.max(
                0,
                (unitCad - finalUnit) * qtdNow,
              );
              if (reaisEl)
                reaisEl.textContent =
                  descontoReaisNow > 0 ? formatMoney(descontoReaisNow) : "-";
            } catch (e) {
              console.warn("recalcFromPercent error", e);
            }
          }

          if (valFinalEl) valFinalEl.addEventListener("input", recalcFromValor);
          if (percEl) percEl.addEventListener("input", recalcFromPercent);

          // inicializar valores
          try {
            if (valFinalEl) {
              valFinalEl.value = (currentUnit || "")
                .toString()
                .replace(".", ",");
              recalcFromValor();
            }
          } catch (e) {}
        } catch (e) {
          console.warn("Erro ao vincular recalc modal edit:", e);
        }

        async function onSave() {
          try {
            const selId = input.getAttribute("data-selected-id");
            const nome = input.value.trim();
            const qtd =
              parseInt(document.getElementById("editServiceQtd").value) || 1;
            const rawValor = (
              document.getElementById("editServiceValorFinal").value || ""
            )
              .toString()
              .replace(",", ".");
            const enteredUnit = parseFloat(rawValor) || 0;
            const finalTotal = qtd * enteredUnit;

            // localizar unitário cadastrado (preservar valor cadastrado como unitario exibido)
            let registeredUnit = null;
            try {
              const sid = itemEl.dataset.serviceId;
              if (
                sid &&
                Array.isArray(agendamentoAtual && agendamentoAtual.servicos)
              ) {
                const found = agendamentoAtual.servicos.find(
                  (x) => String(x.id) === String(sid),
                );
                if (found)
                  registeredUnit =
                    parseFloat(found.unitario || found.valor || 0) || null;
              }
              if (
                registeredUnit === null &&
                Array.isArray(
                  agendamentoAtual && agendamentoAtual.__existingServicosArray,
                )
              ) {
                const found2 = agendamentoAtual.__existingServicosArray.find(
                  (x) =>
                    String(x.nome || "").trim() ===
                    String(currentName || "").trim(),
                );
                if (found2)
                  registeredUnit =
                    parseFloat(found2.unitario || found2.valor || 0) || null;
              }
            } catch (e) {
              /* ignore */
            }
            if (registeredUnit === null) registeredUnit = enteredUnit;

            // calcular desconto: somente considerar desconto quando o valor inserido for menor
            const descontoRaw = (registeredUnit - enteredUnit) * qtd;
            const descontoAmt = descontoRaw > 0 ? descontoRaw : 0;
            const descontoPercent =
              registeredUnit > 0 && descontoAmt > 0
                ? ((registeredUnit - enteredUnit) / registeredUnit) * 100
                : 0;

            // atualizar DOM do item
            const nameEl = itemEl.querySelector(".service-name");
            if (nameEl) nameEl.textContent = nome;
            const qtdEl = itemEl.querySelector(".col-qtd");
            if (qtdEl) qtdEl.textContent = String(qtd);
            const unitEl = itemEl.querySelector(".col-unitario");
            if (unitEl) unitEl.textContent = formatarMoeda(registeredUnit);
            const descontoEl = itemEl.querySelector(".col-desconto");
            if (descontoEl)
              descontoEl.textContent =
                descontoPercent > 0
                  ? descontoPercent.toFixed(4).replace(".", ",") + "%"
                  : descontoAmt === 0
                    ? "-"
                    : formatarMoeda(descontoAmt);
            const totalEl = itemEl.querySelector(".col-total");
            if (totalEl) totalEl.textContent = formatarMoeda(finalTotal);

            // atualizar agendamentoAtual.servicos (atualizar o item existente, não criar duplicata)
            try {
              // construir objeto atualizado
              const updatedObj = {
                id: selId || itemEl.dataset.serviceId || Date.now(),
                nome: nome,
                quantidade: qtd,
                unitario: registeredUnit,
                valor: enteredUnit,
                descontoPercent: descontoPercent,
                desconto: descontoAmt,
                total: finalTotal,
              };

              // Caso legado: agendamento possui apenas string concatenada em __existingServicosString ou servico
              const hasLegacyString = !!(
                agendamentoAtual &&
                (agendamentoAtual.servico ||
                  agendamentoAtual.__existingServicosString)
              );

              // garantir array base
              if (!Array.isArray(agendamentoAtual.servicos))
                agendamentoAtual.servicos = Array.isArray(
                  agendamentoAtual.__existingServicosArray,
                )
                  ? agendamentoAtual.__existingServicosArray.slice()
                  : [];

              let replaced = false;

              // Se o item DOM é um item legado (dataset.serviceId === 'legacy') ou o agendamento só tinha string
              if (
                itemEl.dataset.serviceId === "legacy" ||
                (!agendamentoAtual.servicos.length && hasLegacyString)
              ) {
                // substituir o comportamento: remover o legado e criar o array com o novo objeto
                agendamentoAtual.servicos = [updatedObj];
                replaced = true;
              }

              // tentar localizar por data-service-id
              if (!replaced) {
                const sid = itemEl.dataset.serviceId;
                if (sid) {
                  for (let i = 0; i < agendamentoAtual.servicos.length; i++) {
                    if (
                      String(agendamentoAtual.servicos[i].id) === String(sid)
                    ) {
                      agendamentoAtual.servicos[i] = Object.assign(
                        {},
                        agendamentoAtual.servicos[i],
                        updatedObj,
                      );
                      replaced = true;
                      break;
                    }
                  }
                }
              }

              // se ainda não encontrou, tentar localizar entre os serviços existentes originalmente carregados do servidor
              // (útil quando o DOM/element dataset foi modificado e o item original está em __existingServicosArray)
              if (
                !replaced &&
                Array.isArray(agendamentoAtual.__existingServicosArray) &&
                currentName
              ) {
                for (
                  let i = 0;
                  i < agendamentoAtual.__existingServicosArray.length;
                  i++
                ) {
                  const orig = agendamentoAtual.__existingServicosArray[i];
                  if (!orig) continue;
                  if (
                    String(orig.nome || "").trim() ===
                    String(currentName || "").trim()
                  ) {
                    // localizar índice correspondente no agendamentoAtual.servicos por id (se existir) ou por nome
                    const targetId = orig.id;
                    let replacedIdx = -1;
                    if (targetId !== undefined && targetId !== null) {
                      replacedIdx = agendamentoAtual.servicos.findIndex(
                        (x) => String(x.id) === String(targetId),
                      );
                    }
                    if (replacedIdx === -1) {
                      replacedIdx = agendamentoAtual.servicos.findIndex(
                        (x) =>
                          String(x.nome || "").trim() ===
                          String(currentName || "").trim(),
                      );
                    }
                    if (replacedIdx !== -1) {
                      agendamentoAtual.servicos[replacedIdx] = Object.assign(
                        {},
                        agendamentoAtual.servicos[replacedIdx],
                        updatedObj,
                      );
                      replaced = true;
                      break;
                    }
                  }
                }
              }

              // fallback: localizar por nome antiga
              if (!replaced && currentName) {
                for (let i = 0; i < agendamentoAtual.servicos.length; i++) {
                  if (
                    String(agendamentoAtual.servicos[i].nome || "").trim() ===
                    String(currentName || "").trim()
                  ) {
                    agendamentoAtual.servicos[i] = Object.assign(
                      {},
                      agendamentoAtual.servicos[i],
                      updatedObj,
                    );
                    replaced = true;
                    break;
                  }
                }
              }

              // fallback por posição DOM
              if (!replaced) {
                try {
                  const category = document.querySelector(".category-section");
                  if (category) {
                    const nodes = Array.from(
                      category.querySelectorAll(".service-item"),
                    );
                    const idx = nodes.indexOf(itemEl);
                    if (idx >= 0) {
                      if (idx < agendamentoAtual.servicos.length) {
                        agendamentoAtual.servicos[idx] = updatedObj;
                        replaced = true;
                      }
                    }
                  }
                } catch (e) {
                  /* ignore */
                }
              }

              if (!replaced) agendamentoAtual.servicos.push(updatedObj);

              // garantir que o elemento DOM tenha o serviceId atualizado
              try {
                itemEl.dataset.serviceId = String(updatedObj.id);
              } catch (e) {}

              // se havia string legado, atualizar também agendamentoAtual.servico para refletir novo nome
              try {
                if (hasLegacyString) {
                  agendamentoAtual.servico = updatedObj.nome;
                  agendamentoAtual.__existingServicosString = updatedObj.nome;
                }
              } catch (e) {}
            } catch (e) {
              console.warn(
                "Erro atualizando agendamentoAtual.servicos no editar",
                e,
              );
            }

            // deduplicar possíveis itens DOM com o mesmo nome antigo (garantir que substituímos a linha clicada)
            try {
              const category = document.querySelector(".category-section");
              if (category && currentName) {
                const nodes = Array.from(
                  category.querySelectorAll(".service-item"),
                );
                nodes.forEach((n) => {
                  if (n === itemEl) return;
                  const nm =
                    n.querySelector(".service-name")?.textContent || "";
                  if (
                    String(nm || "").trim() === String(currentName || "").trim()
                  ) {
                    n.remove();
                  }
                });
              }
            } catch (e) {
              /* ignore */
            }

            // garantir que agendamentoAtual.servicos não tenha duplicatas (prefere id, fallback por nome)
            try {
              if (!Array.isArray(agendamentoAtual.servicos))
                agendamentoAtual.servicos = Array.isArray(
                  agendamentoAtual.__existingServicosArray,
                )
                  ? agendamentoAtual.__existingServicosArray.slice()
                  : [];
              const seen = new Set();
              const dedup = [];
              for (const it of agendamentoAtual.servicos) {
                const key =
                  it && it.id
                    ? String(it.id)
                    : String(it.nome || "") + "::" + String(it.unitario || "");
                if (seen.has(key)) continue;
                seen.add(key);
                dedup.push(it);
              }
              agendamentoAtual.servicos = dedup;
            } catch (e) {
              console.warn("Erro deduplicando agendamentoAtual.servicos", e);
            }

            // persistir e recalcular
            await recalcAndPersistServicos();
            close();
          } catch (e) {
            console.error("Erro ao salvar edição de item", e);
          }
        }

        document
          .getElementById("btnSalvarEditarServico")
          .addEventListener("click", onSave);

        function close() {
          try {
            overlay.remove();
            document.body.style.overflow = "";
          } catch (e) {}
        }
      } catch (e) {
        console.warn("openEditServiceModal error", e);
      }
    }
    // expor globalmente para que handlers fora desta função possam chamar
    try {
      window.openEditServiceModal = openEditServiceModal;
    } catch (e) {}
  });

  // Modal de confirmação reutilizável (estilo do sistema)
  if (typeof window.showConfirmModal === "undefined") {
    window.showConfirmModal = function (message) {
      return new Promise((resolve) => {
        try {
          try {
            const prev = document.getElementById("confirmModalOverlay");
            if (prev && prev.parentNode) prev.remove();
          } catch (e) {}
          const overlay = document.createElement("div");
          overlay.id = "confirmModalOverlay";
          overlay.style.cssText =
            "position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1600000;";

          const modal = document.createElement("div");
          modal.style.cssText =
            "width:420px;max-width:94%;background:white;border-radius:8px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:hidden;font-family:inherit;z-index:1600001;";
          modal.innerHTML = `
                        <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
                            <strong>Confirmação</strong>
                        </div>
                        <div style="padding:16px;color:#222">${escapeHtmlUnsafe(message)}</div>
                        <div style="padding:12px 16px 18px;display:flex;justify-content:flex-end;gap:8px;">
                            <button id="confirmCancel" class="btn" style="background:#6c757d;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
                            <button id="confirmOk" class="btn" style="background:#dc3545;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Excluir</button>
                        </div>
                    `;

          overlay.appendChild(modal);
          document.body.appendChild(overlay);
          try {
            document.body.style.overflow = "hidden";
          } catch (e) {}

          function cleanup() {
            try {
              overlay.remove();
              document.body.style.overflow = "";
            } catch (e) {}
          }

          document
            .getElementById("confirmCancel")
            .addEventListener("click", function () {
              cleanup();
              resolve(false);
            });
          document
            .getElementById("confirmOk")
            .addEventListener("click", function () {
              cleanup();
              resolve(true);
            });
          overlay.addEventListener("click", function (ev) {
            if (ev.target === overlay) {
              cleanup();
              resolve(false);
            }
          });
        } catch (e) {
          console.warn("showConfirmModal error", e);
          resolve(false);
        }
      });
    };
  }

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

// Profissionais cache + seletor
let _profissionaisCache = null;
async function ensureProfissionaisLoaded() {
  if (Array.isArray(_profissionaisCache)) return _profissionaisCache;
  try {
    const resp = await fetch("/api/profissionais", { credentials: "include" });
    if (!resp.ok) throw new Error("Status " + resp.status);
    const data = await resp.json();
    _profissionaisCache = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("Erro carregando profissionais", e);
    _profissionaisCache = [];
  }
  return _profissionaisCache;
}

function openProfessionalSelector(anchorEl) {
  try {
    // fechar qualquer dropdown existente
    const prev = document.getElementById("professionalDropdownOverlay");
    if (prev) prev.remove();
    const overlay = document.createElement("div");
    overlay.id = "professionalDropdownOverlay";
    overlay.style.cssText =
      "position:fixed;left:0;top:0;width:100%;height:100%;z-index:1600002;";

    const box = document.createElement("div");
    box.style.cssText =
      "position:absolute;min-width:240px;max-width:380px;max-height:320px;overflow:auto;background:#fff;border:1px solid #e6e9ee;border-radius:8px;box-shadow:0 10px 30px rgba(2,16,26,0.08);padding:8px;";
    // posicionar próximo ao anchor: alinhar à mesma linha/caixa do elemento
    const rect = anchorEl.getBoundingClientRect();
    // colocar temporariamente fora da tela para medir
    box.style.left = "0px";
    box.style.top = "0px";
    // anexar overlay e box ao DOM antes de medir
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const boxRect = box.getBoundingClientRect();
    const SHIFT_X = 15; // deslocar levemente para a esquerda
    let left = rect.left + window.scrollX - SHIFT_X;
    let top =
      rect.top +
      window.scrollY +
      Math.round((rect.height - boxRect.height) / 2);
    // ajustar para não ultrapassar viewport
    if (left + boxRect.width > window.scrollX + window.innerWidth - 8)
      left = window.scrollX + window.innerWidth - boxRect.width - 8;
    if (left < 8) left = 8;
    if (top + boxRect.height > window.scrollY + window.innerHeight - 8)
      top = window.scrollY + window.innerHeight - boxRect.height - 8;
    if (top < 8) top = 8;
    box.style.left = left + "px";
    box.style.top = top + "px";
    box.innerHTML = `<div style="padding:8px"><input id="profSearchInput" placeholder="Pesquisar profissional..." style="width:100%;padding:8px;border:1px solid #e6e9ee;border-radius:6px;box-sizing:border-box;"></div><div id="profListContainer" style="max-height:240px;overflow:auto;padding:4px;"></div>`;

    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) overlay.remove();
    });

    const container = document.getElementById("profListContainer");
    const input = document.getElementById("profSearchInput");

    function renderList(q) {
      const ql = (q || "").toLowerCase().trim();
      container.innerHTML = "";
      const list = Array.isArray(_profissionaisCache)
        ? _profissionaisCache
        : [];
      const filtered = list
        .filter(
          (p) =>
            !ql ||
            String(p.nome || "")
              .toLowerCase()
              .includes(ql),
        )
        .slice(0, 80);
      if (filtered.length === 0) {
        container.innerHTML =
          '<div style="padding:8px;color:#666">Nenhum profissional encontrado</div>';
        return;
      }
      const frag = document.createDocumentFragment();
      filtered.forEach((p) => {
        const row = document.createElement("div");
        row.style.cssText =
          "padding:8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;";
        row.innerHTML = `<div style="flex:1">${escapeHtmlUnsafe(p.nome || "")}<div style="font-size:12px;color:#888">${escapeHtmlUnsafe(p.cargo || "")}</div></div>`;
        row.addEventListener("click", async function () {
          try {
            // atualizar agendamentoAtual.profissional e persistir
            const nome = p.nome || "";
            if (agendamentoAtual && agendamentoAtual.id) {
              const payload = { profissional: nome };
              console.log("Atualizando profissional via PUT", payload);
              const resp = await fetch(
                `/api/agendamentos/${agendamentoAtual.id}`,
                {
                  method: "PUT",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                },
              );
              if (resp.ok) {
                const updated = await resp.json().catch(() => null);
                if (updated) {
                  agendamentoAtual.profissional = updated.profissional || nome;
                } else {
                  agendamentoAtual.profissional = nome;
                }
              } else {
                agendamentoAtual.profissional = nome;
              }
            }
            // atualizar UI
            try {
              const profSidebar = document.querySelector(
                ".professional-section .professional-content",
              );
              if (profSidebar) {
                profSidebar
                  .querySelectorAll(".prof-name")
                  .forEach((el) => (el.textContent = nome));
              }
              const infoProf = document.querySelector(
                ".info-row:nth-child(2) .info-value",
              );
              if (infoProf) infoProf.textContent = nome;
              document
                .querySelectorAll(
                  ".category-section .col-profissional, .service-item .col-profissional",
                )
                .forEach((el) => {
                  el.textContent = nome;
                });
            } catch (e) {}
            // notificar outras páginas/modulos que o agendamento foi atualizado
            try {
              window.dispatchEvent(
                new CustomEvent("agendamento-updated", {
                  detail: { id: agendamentoAtual.id, profissional: nome },
                }),
              );
            } catch (e) {}
          } catch (e) {
            console.warn("Erro ao setar profissional", e);
          }
          overlay.remove();
        });
        frag.appendChild(row);
      });
      container.appendChild(frag);
    }

    input.addEventListener("input", function () {
      renderList(input.value);
    });
    // carregar cache e renderizar
    ensureProfissionaisLoaded().then(() => renderList(""));
    setTimeout(() => input.focus(), 50);
  } catch (e) {
    console.warn("openProfessionalSelector error", e);
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
  // Attach listeners to all matching menu item instances (robust against duplicated IDs)
  const menuItems = Array.from(document.querySelectorAll(`#${menuItemId}`));
  const submenus = Array.from(document.querySelectorAll(`#${submenuId}`));

  // Remove extra submenu elements if present (keep first)
  if (submenus.length > 1) {
    for (let i = 1; i < submenus.length; i++) submenus[i].remove();
  }

  const submenuEl = document.getElementById(submenuId);
  if (!submenuEl || menuItems.length === 0) return;

  menuItems.forEach((menuItemEl) => {
    const menuContainer =
      menuItemEl.closest(".nav-item-with-submenu") || menuItemEl.parentElement;
    if (!menuContainer) return;
    if (menuItemEl.getAttribute("data-listener-added")) return;

    menuItemEl.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest(".submenu-item")) return;
      fecharOutrosSubmenus(submenuName);
      const isNowOpen = !menuContainer.classList.contains("open");
      menuContainer.classList.toggle("open");
      submenuEl.classList.toggle("open");
      salvarEstadoSubmenu(submenuName, isNowOpen);
    });

    menuItemEl.setAttribute("data-listener-added", "true");
  });

  // Ensure submenu item clicks close the menu
  const submenuItems = submenuEl.querySelectorAll(".submenu-item[href]");
  submenuItems.forEach((item) =>
    item.addEventListener("click", function (e) {
      e.stopPropagation();
      setTimeout(() => {
        document
          .querySelectorAll(".nav-item-with-submenu.open")
          .forEach((c) => c.classList.remove("open"));
        submenuEl.classList.remove("open");
        salvarEstadoSubmenu(submenuName, false);
      }, 150);
    }),
  );
  const submenuItemsSemHref = submenuEl.querySelectorAll(
    ".submenu-item:not([href])",
  );
  submenuItemsSemHref.forEach((item) =>
    item.addEventListener("click", function (e) {
      e.stopPropagation();
      document
        .querySelectorAll(".nav-item-with-submenu.open")
        .forEach((c) => c.classList.remove("open"));
      submenuEl.classList.remove("open");
      salvarEstadoSubmenu(submenuName, false);
    }),
  );
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
document.addEventListener("DOMContentLoaded", function () {
  detectarIDsDuplicados();
  limparEstadoSubmenus();

  // Carregar prontuário ao abrir a página
  const agendamentoId = new URLSearchParams(window.location.search).get("id");
  if (agendamentoId) {
    carregarProntuario(agendamentoId);
  }

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
  // Ligar botão "Adicionar" da sub-aba Vacinas ao modal de Vacina
  (function attachVacinaAddButton() {
    const btnVacinas = document.querySelector(
      "#vacinasSubContent .btn-add-small",
    );
    if (!btnVacinas) return;
    if (btnVacinas.hasAttribute("data-vacina-listener")) return;
    btnVacinas.setAttribute("data-vacina-listener", "true");
    btnVacinas.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        abrirModalVacina();
      } catch (err) {
        console.warn("Erro ao abrir modal de vacina:", err);
      }
    });
  })();
  // Ligar botão "Adicionar" da sub-aba Vermífugos ao modal de Adicionar Item
  (function attachVermifugoAddButton() {
    const btnVermi = document.querySelector(
      "#vermifugosSubContent .btn-add-small",
    );
    if (!btnVermi) return;
    if (btnVermi.hasAttribute("data-vermi-listener")) return;
    btnVermi.setAttribute("data-vermi-listener", "true");
    btnVermi.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Abrir modal de busca de itens - a detecção de vermífugo acontece automaticamente
        openAddItemModal();
      } catch (err) {
        console.warn("Erro ao abrir modal de adicionar item (vermifugo):", err);
      }
    });
  })();
  // Ligar botão "Adicionar" da sub-aba Antiparasitários ao modal de Adicionar Item
  (function attachAntiparasitarioAddButton() {
    const btnAnti = document.querySelector(
      "#antiparasitariosSubContent .btn-add-small",
    );
    if (!btnAnti) return;
    if (btnAnti.hasAttribute("data-anti-listener")) return;
    btnAnti.setAttribute("data-anti-listener", "true");
    btnAnti.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Abrir modal de busca de itens - a detecção de antiparasitário acontece automaticamente
        openAddItemModal();
      } catch (err) {
        console.warn(
          "Erro ao abrir modal de adicionar item (antiparasitario):",
          err,
        );
      }
    });
  })();
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
function configurarSubmenuLateralCaixa() {
  console.log("🔍 Iniciando configuração do submenu lateral Caixa...");

  const caixaSubmenuItem = document.getElementById("caixaSubmenuItem");
  const caixaLateralSubmenu = document.getElementById("caixaLateralSubmenu");
  const submenuItemWithLateral = document.querySelector(
    ".submenu-item-with-lateral",
  );

  console.log("🔍 Elementos encontrados:");
  console.log("- caixaSubmenuItem:", caixaSubmenuItem);
  console.log("- caixaLateralSubmenu:", caixaLateralSubmenu);
  console.log("- submenuItemWithLateral:", submenuItemWithLateral);

  if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
    console.log("✅ Configurando submenu lateral do Caixa...");

    let isSubmenuVisible = false;

    // Função para mostrar submenu
    const showSubmenu = () => {
      console.log("📤 Mostrando submenu lateral");
      caixaLateralSubmenu.style.opacity = "1";
      caixaLateralSubmenu.style.visibility = "visible";
      caixaLateralSubmenu.style.transform = "translateX(0)";
      isSubmenuVisible = true;
    };

    // Função para esconder submenu
    const hideSubmenu = () => {
      console.log("📥 Escondendo submenu lateral");
      caixaLateralSubmenu.style.opacity = "0";
      caixaLateralSubmenu.style.visibility = "hidden";
      caixaLateralSubmenu.style.transform = "translateX(-10px)";
      isSubmenuVisible = false;
    };

    // Configurar hover no container principal
    submenuItemWithLateral.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no container do Caixa");
      showSubmenu();
    });

    submenuItemWithLateral.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do container do Caixa");
      setTimeout(hideSubmenu, 100);
    });

    // Configurar hover no submenu lateral
    caixaLateralSubmenu.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no submenu lateral");
      showSubmenu();
    });

    caixaLateralSubmenu.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do submenu lateral");
      hideSubmenu();
    });

    // Adicionar event listeners para os itens do submenu lateral
    const lateralItems = caixaLateralSubmenu.querySelectorAll(
      ".lateral-submenu-item",
    );
    console.log(
      `🔍 Encontrados ${lateralItems.length} itens no submenu lateral`,
    );

    lateralItems.forEach((item, index) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const texto = this.textContent.trim();
        console.log(`🚀 Clique em: ${texto}`);

        // Aqui você pode adicionar navegação específica para cada item
        switch (texto) {
          case "Abertura/Fechamento":
            alert("Navegando para Abertura/Fechamento de Caixa");
            // window.location.href = '/caixa/abertura-fechamento.html';
            break;
          case "Suprimento/Sangria":
            alert("Navegando para Suprimento/Sangria");
            // window.location.href = '/caixa/suprimento-sangria.html';
            break;
          case "Rel. Demonstrativo de caixa":
            alert("Navegando para Relatório Demonstrativo de Caixa");
            // window.location.href = '/caixa/relatorio-demonstrativo.html';
            break;
        }

        hideSubmenu();
      });

      console.log(
        `✅ Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`,
      );
    });

    console.log("✅ Submenu lateral do Caixa configurado com sucesso!");
  } else {
    console.error("❌ Elementos do submenu lateral Caixa não encontrados");
    console.log(
      "- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML",
    );
    console.log(
      "- Verifique se a classe .submenu-item-with-lateral existe no HTML",
    );
  }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();
  }, 200);
});

// ===== FUNCIONALIDADES DA PÁGINA DE DETALHES DO AGENDAMENTO =====

// Variável para armazenar os dados do agendamento atual
let agendamentoAtual = null;
// Estado local da UI da aba clínica (sub-abas + aba ativa)
let clinicaStateLocal = { activeTab: null, activeSubTab: null };

// Função para carregar os dados do agendamento
async function carregarAgendamento() {
  try {
    // Pega o ID do agendamento da URL
    const urlParams = new URLSearchParams(window.location.search);
    const agendamentoId = urlParams.get("id");

    console.log("🔍 ID do agendamento da URL:", agendamentoId);

    if (!agendamentoId) {
      console.error("ID do agendamento não encontrado na URL");
      alert("ID do agendamento não encontrado na URL");
      return;
    }

    // Buscar diretamente da API
    // Mostrar placeholders nos itens para evitar flash de conteúdo antigo
    try {
      showItemsPlaceholder();
    } catch (e) {
      /* ignore */
    }

    const url = `/api/agendamentos/${agendamentoId}`;
    console.log(`📡 Buscando agendamento ${agendamentoId} da API...`, url);
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          `Erro ao carregar agendamento: ${response.status} ${response.statusText}`,
        );
      }
      agendamentoAtual = await response.json();
      // garantir que handlers que usam window.agendamentoAtual vejam o mesmo objeto
      try {
        window.agendamentoAtual = agendamentoAtual;
      } catch (e) {
        /* ambiente restrito */
      }
    } catch (fetchErr) {
      console.error("❌ Erro no fetch do agendamento:", fetchErr);
      alert(
        "Erro ao carregar dados do agendamento: " +
          (fetchErr.message || fetchErr) +
          "\nVerifique se o servidor está rodando e se o backend " +
          (window.__API_BASE__ || window.location.origin) +
          " está acessível.",
      );
      return;
    }
    console.log("✅ Agendamento carregado da API:", agendamentoAtual);

    preencherDadosAgendamento(agendamentoAtual);
    try {
      if (typeof updateCheckoutVisibility === "function")
        updateCheckoutVisibility();
    } catch (e) {}
    // Restaurar estado da aba CLÍNICA (se existir) sem regravar imediatamente
    try {
      if (agendamentoAtual && agendamentoAtual.clinicaState) {
        clinicaStateLocal = agendamentoAtual.clinicaState || {
          activeTab: null,
          activeSubTab: null,
        };
        if (clinicaStateLocal.activeTab) {
          // aplicar sem salvar para evitar requests desnecessários
          await alternarAba(clinicaStateLocal.activeTab, true);
        }
        if (clinicaStateLocal.activeSubTab) {
          alternarSubAba(clinicaStateLocal.activeSubTab, true);
        }
      }
    } catch (e) {
      console.warn("Erro restaurando estado da aba clínica:", e);
    }
  } catch (error) {
    console.error("❌ Erro ao carregar agendamento:", error);
    alert("Erro ao carregar dados do agendamento: " + error.message);
  }
}

// Função para carregar dados de exemplo (fallback)
function carregarDadosExemplo() {
  agendamentoAtual = {
    id: 12734,
    Pet: { nome: "Scott - Shih-tzu", idade: "3 anos", peso: "Informar peso" },
    Cliente: { nome: "29 - Claudio", telefone: "(11) 99999-9999" },
    dataAgendamento: "2025-11-05T09:00:00",
    checkin: "2025-11-05T11:25:00",
    status: "check-in",
    estadia: "5 dias",
    box: "-",
    servicos: [
      {
        id: 1,
        nome: "Banho - Assinatura",
        contrato: "#695",
        horario: "09:00",
        data: "05/Nov",
        profissional: "Mariana",
        quantidade: 1,
        unitario: "-",
        desconto: "-",
        total: "-",
      },
      {
        id: 2,
        nome: "Tosa Raspada - Porte Pequeno",
        horario: "17:08",
        data: "05/Nov",
        profissional: "Mariana",
        quantidade: 1,
        unitario: "120,90",
        desconto: "17,287%",
        total: "100,00",
      },
    ],
    observacoes: "Atendimento.",
    total: 100.0,
    pendente: 100.0,
  };

  preencherDadosAgendamento(agendamentoAtual);
  console.log("📝 Dados de exemplo carregados:", agendamentoAtual);
}

// Função para preencher os dados na tela
function preencherDadosAgendamento(agendamento) {
  if (!agendamento) return;

  // Limpar array de serviços adicionados temporários ao recarregar do banco
  try {
    agendamento._addedServicos = [];
  } catch (e) {}

  try {
    console.log("📝 Preenchendo dados:", agendamento);

    // Preenche informações do cabeçalho
    const titulo = document.getElementById("atendimentoTitulo");
    if (titulo) titulo.textContent = `Atendimento ${agendamento.id || ""}`;

    // Dados do Pet - API retorna petNome diretamente ou Pet.nome
    const petNome = document.getElementById("petNome");
    if (petNome) {
      const nomePet =
        agendamento.petNome ||
        agendamento.pet?.nome ||
        agendamento.Pet?.nome ||
        "-";
      petNome.textContent = nomePet;
      if (agendamento.petId) {
        petNome.style.cursor = "pointer";
        petNome.title = "Ver ficha do pet";
        petNome.onclick = () => {
          window.location.href = `/pets/pet-details.html?id=${agendamento.petId}`;
        };
      }
    }

    const petIdade = document.getElementById("petIdade");
    if (petIdade) {
      const idade = agendamento.pet?.idade || agendamento.Pet?.idade || "-";
      petIdade.textContent = idade;
    }

    const petPeso = document.getElementById("petPeso");
    if (petPeso) {
      const peso = agendamento.pet?.peso || agendamento.Pet?.peso || "-";
      petPeso.textContent = peso;
    }

    // Dados do Cliente - API retorna clienteNome diretamente ou Cliente.nome
    const clienteNome = document.getElementById("clienteNome");
    if (clienteNome) {
      const nomeCliente =
        agendamento.clienteNome ||
        agendamento.pet?.cliente?.nome ||
        agendamento.Cliente?.nome ||
        "-";
      clienteNome.textContent = nomeCliente;
      if (agendamento.clienteId) {
        clienteNome.style.cursor = "pointer";
        clienteNome.title = "Ver ficha do cliente";
        clienteNome.onclick = () => {
          window.location.href = `/client-details.html?id=${agendamento.clienteId}`;
        };
      }
    }

    const boxInfo = document.getElementById("boxInfo");
    if (boxInfo) boxInfo.textContent = agendamento.box || "-";

    // Formata e preenche datas
    const dataAgendamento = document.getElementById("dataAgendamento");
    if (dataAgendamento)
      dataAgendamento.textContent = formatarDataHora(
        agendamento.dataAgendamento,
      );

    const checkinInfo = document.getElementById("checkinInfo");
    if (checkinInfo)
      checkinInfo.textContent = formatarDataHora(
        agendamento.checkin || agendamento.dataAgendamento,
      );

    const estadiaInfo = document.getElementById("estadiaInfo");
    if (estadiaInfo) estadiaInfo.textContent = agendamento.estadia || "-";

    // Define o status
    const statusSelect = document.getElementById("statusSelect");
    if (statusSelect) {
      statusSelect.value = agendamento.status || "agendado";
      atualizarClasseStatus(statusSelect);
    }
    // Atualizar o badge visível para refletir o status atual
    try {
      const statusBadge = document.querySelector(".status-badge");
      if (statusBadge) {
        const s = String(agendamento.status || "agendado").toLowerCase();
        const classMap = {
          checkin: "check-in",
          checkout: "check-out",
          concluido: "check-out",
        };
        const statusClass = classMap[s] || s.replace(/[^a-z0-9]+/g, "-");
        const labelMap = {
          agendado: "Agendado",
          "check-in": "Check-in",
          pronto: "Pronto",
          "check-out": "Check-out",
          cancelado: "Cancelado",
        };
        statusBadge.className = `status-badge status-${statusClass}`;
        statusBadge.textContent =
          labelMap[statusClass] || agendamento.status || "Agendado";
      }
      try {
        updateServiceIcons(agendamento.status);
      } catch (e) {}
    } catch (e) {
      console.warn("Erro atualizando status-badge ao preencher dados", e);
    }

    // Preenche observações
    const observacoes = document.getElementById("observacoes");
    if (observacoes) observacoes.value = agendamento.observacoes || "";

    // Renderiza badge Taxi Dog
    try {
      renderizarTaxidog(agendamento);
    } catch (e) {
      console.warn("Erro ao renderizar taxidog:", e);
    }
    // Renderiza a lista de serviços/produtos na seção "Serviços e Produtos"
    try {
      const category = document.querySelector(".category-section");
      if (category) {
        // Remove itens de exemplo existentes
        category.querySelectorAll(".service-item").forEach((n) => n.remove());
      }

      // Limpar vermífugos existentes antes de recarregar do banco
      try {
        const vermifugosContainer = document.querySelector(
          "#vermifugosSubContent .historico-list",
        );
        if (vermifugosContainer) {
          vermifugosContainer
            .querySelectorAll(".vermifugo-item")
            .forEach((n) => n.remove());
        }
      } catch (e) {
        console.warn("Erro ao limpar vermífugos existentes:", e);
      }

      // Limpar vacinas existentes antes de recarregar do banco
      try {
        const vacinasContainer = document.querySelector(
          "#vacinasSubContent .historico-list",
        );
        if (vacinasContainer) {
          vacinasContainer
            .querySelectorAll(".vacina-item")
            .forEach((n) => n.remove());
        }
      } catch (e) {
        console.warn("Erro ao limpar vacinas existentes:", e);
      }

      // Limpar antiparasitários existentes antes de recarregar do banco
      try {
        const antiparasitariosContainer = document.querySelector(
          "#antiparasitariosSubContent .historico-list",
        );
        if (antiparasitariosContainer) {
          antiparasitariosContainer
            .querySelectorAll(".antiparasitario-item")
            .forEach((n) => n.remove());
        }
      } catch (e) {
        console.warn("Erro ao limpar antiparasitários existentes:", e);
      }

      if (category) {
        // Normaliza possíveis fontes de dados
        const servicosArray = Array.isArray(agendamento.servicos)
          ? agendamento.servicos
          : null;
        // manter cópia estruturada dos serviços existentes (pode ser undefined para registros legados)
        try {
          agendamento.__existingServicosArray = Array.isArray(
            agendamento.servicos,
          )
            ? agendamento.servicos.slice()
            : [];
        } catch (e) {
          agendamento.__existingServicosArray = [];
        }
        const nomesConcatenados =
          agendamento.servicosNomes ||
          agendamento.servicos_nome ||
          agendamento.servico ||
          "";
        const valorTotalAgendamento =
          parseFloat(
            agendamento.valor || agendamento.valorTotal || agendamento.total,
          ) || 0;
        // armazenar totals/servicos originais para permitir somar novos itens posteriormente
        try {
          agendamento.__existingTotal = valorTotalAgendamento;
        } catch (e) {}
        try {
          agendamento.__existingServicosString =
            nomesConcatenados || agendamento.servico || "";
        } catch (e) {}

        if (servicosArray && servicosArray.length > 0) {
          console.log(
            `🔍 [preencherDados] Renderizando ${servicosArray.length} serviços:`,
            servicosArray,
          );
          servicosArray.forEach((s, idx) => {
            console.log(
              `  [${idx}] ${s.nome} - tipoEspecial:`,
              s.meta?.tipoEspecial,
            );
            // Se for um serviço especial do tipo 'vermifugo', renderizar na sub-aba Vermífugos
            try {
              if (
                s &&
                s.meta &&
                String(s.meta.tipoEspecial || "").toLowerCase() === "vermifugo"
              ) {
                console.log(`  ✅ [${idx}] Vermífugo detectado`);
                try {
                  appendServiceToCategory(s);
                } catch (e) {
                  console.warn(
                    "Erro appendServiceToCategory para vermifugo ao carregar:",
                    e,
                  );
                }
                return; // pular renderização padrão
              }
            } catch (e) {}
            // Se for um serviço especial do tipo 'vacina', renderizar via appendServiceToCategory
            try {
              if (
                s &&
                s.meta &&
                String(s.meta.tipoEspecial || "").toLowerCase() === "vacina"
              ) {
                console.log(`  ✅ [${idx}] Vacina detectada`);
                try {
                  appendServiceToCategory(s);
                } catch (e) {
                  console.warn(
                    "Erro appendServiceToCategory para vacina ao carregar:",
                    e,
                  );
                }
                return; // pular renderização padrão (appendServiceToCategory já fez tudo)
              }
            } catch (e) {}
            // Se for um serviço especial do tipo 'antiparasitario', renderizar na sub-aba Antiparasitários
            try {
              if (
                s &&
                s.meta &&
                String(s.meta.tipoEspecial || "").toLowerCase() ===
                  "antiparasitario"
              ) {
                try {
                  appendServiceToCategory(s);
                } catch (e) {
                  console.warn(
                    "Erro appendServiceToCategory para antiparasitario ao carregar:",
                    e,
                  );
                }
                return; // pular renderização padrão
              }
            } catch (e) {}
            const nome = s.nome || s.nomeServico || String(s).trim();
            const horario = s.horario || s.time || "";
            const data = s.data || s.dataServico || "";
            const profissional = s.profissional || s.profissionalNome || "";
            const qtd = s.quantidade || s.qtd || 1;
            const unitario =
              parseFloat(s.unitario || s.valor_unitario || s.valor || 0) || 0;
            const total =
              parseFloat(s.total || s.valor || unitario * qtd) ||
              unitario * qtd;

            const item = document.createElement("div");
            item.className = "service-item";
            try {
              if (s && s.id !== undefined && s.id !== null)
                item.dataset.serviceId = String(s.id);
            } catch (e) {}
            // marcar id para ações (pode ser legacy)
            try {
              if (s && s.id !== undefined && s.id !== null)
                item.dataset.serviceId = String(s.id);
            } catch (e) {}
            item.innerHTML = `
                                                        <div class="col-horario">
                                                            <i class="fas fa-clock"></i>
                                                            <div class="time-info">
                                                                <span class="time">${horario || ""}</span>
                                                                <small class="date">${data || ""}</small>
                                                            </div>
                                                        </div>
                                                        <div class="col-descricao">
                                                            <div class="service-name">${escapeHtmlUnsafe(nome)}</div>
                                                        </div>
                                                        <div class="col-profissional">${escapeHtmlUnsafe(profissional)}</div>
                                                        <div class="col-qtd">${escapeHtmlUnsafe(qtd)}</div>
                                                        <div class="col-unitario">${formatarMoeda(unitario)}</div>
                                                        <div class="col-desconto">${escapeHtmlUnsafe(s.desconto || "-")}</div>
                                                        <div class="col-total">${formatarMoeda(total)}</div>
                                                        <div class="col-acoes">
                                                            <button class="btn-item-action" title="Mais opções"><i class="fas fa-ellipsis-v"></i></button>
                                                        </div>
                                                `;
            category.appendChild(item);
          });
        } else if (nomesConcatenados) {
          // Se não houver array, renderiza a string concatenada como um único item
          const item = document.createElement("div");
          item.className = "service-item";
          try {
            item.dataset.serviceId = "legacy";
          } catch (e) {}
          item.innerHTML = `
                                                <div class="col-horario">
                                                    <i class="fas fa-clock"></i>
                                                </div>
                                                <div class="col-descricao">
                                                    <div class="service-name">${escapeHtmlUnsafe(nomesConcatenados)}</div>
                                                </div>
                                                <div class="col-profissional">-</div>
                                                <div class="col-qtd">1</div>
                                                <div class="col-unitario">${formatarMoeda(valorTotalAgendamento)}</div>
                                                <div class="col-desconto">-</div>
                                                <div class="col-total">${formatarMoeda(valorTotalAgendamento)}</div>
                                                <div class="col-acoes">
                                                    <button class="btn-item-action" title="Mais opções"><i class="fas fa-ellipsis-v"></i></button>
                                                </div>
                                        `;
          category.appendChild(item);
        }

        // Atualiza totais laterais
        try {
          const totalGeral = document.getElementById("totalGeral");
          if (totalGeral)
            totalGeral.textContent = formatarMoeda(valorTotalAgendamento);
          const totalPendente = document.getElementById("totalPendente");
          const _totalPago1 = parseFloat(agendamento.totalPago) || 0;
          if (totalPendente)
            totalPendente.textContent = formatarMoeda(
              Math.max(0, valorTotalAgendamento - _totalPago1),
            );
          const amount = document.querySelector(".amount");
          if (amount) amount.textContent = formatarMoeda(valorTotalAgendamento);
        } catch (e) {}

        // Calcular e mostrar desconto agregado (em % e R$)
        try {
          const listExisting = Array.isArray(agendamento.servicos)
            ? agendamento.servicos.slice()
            : [];
          const listAdded = Array.isArray(agendamento._addedServicos)
            ? agendamento._addedServicos.slice()
            : [];
          const map = new Map();
          listExisting.concat(listAdded).forEach((s) => {
            try {
              const key =
                s && s.id !== undefined && s.id !== null
                  ? String(s.id)
                  : JSON.stringify(s);
              if (!map.has(key)) map.set(key, s);
            } catch (e) {}
          });
          const all = Array.from(map.values());

          let totalUnitario = 0;
          let totalFinal = 0;
          all.forEach((s) => {
            const qtd = parseFloat(s.quantidade || 1) || 1;
            const unitCad = parseFloat(s.unitario || s.valor || 0) || 0;
            const finalUnit =
              s.valor !== undefined && s.valor !== null
                ? parseFloat(s.valor)
                : unitCad;
            totalUnitario += qtd * unitCad;
            totalFinal += qtd * finalUnit;
          });

          const descontoReais = Math.max(0, totalUnitario - totalFinal);
          const descontoPercent =
            totalUnitario > 0 ? (descontoReais / totalUnitario) * 100 : 0;

          const elPerc = document.getElementById("descontoPercent");
          const elReais = document.getElementById("descontoReais");
          if (elPerc)
            elPerc.textContent = descontoPercent.toFixed(3).replace(".", ",");
          if (elReais) elReais.textContent = formatarMoeda(descontoReais);
        } catch (e) {
          console.warn("Erro calculando desconto lateral:", e);
        }

        // Atualiza Profissional Responsável na barra lateral (puxa da API/agendamento)
        try {
          const profSection = document.querySelector(
            ".professional-section .professional-content",
          );
          if (profSection) {
            profSection.innerHTML = "";
            const profName =
              agendamento.profissional ||
              agendamento.profissionalNome ||
              (Array.isArray(agendamento.servicos) &&
                agendamento.servicos[0] &&
                (agendamento.servicos[0].profissional ||
                  agendamento.servicos[0].profissionalNome)) ||
              "-";
            const wrapper = document.createElement("div");
            wrapper.className = "prof-card";
            const nameEl = document.createElement("div");
            nameEl.className = "prof-name";
            nameEl.textContent = profName;
            wrapper.appendChild(nameEl);
            // tornar selecionável para abrir dropdown de profissionais
            wrapper.style.cursor = "pointer";
            wrapper.title = "Clique para selecionar/trocar profissional";
            wrapper.addEventListener("click", function (e) {
              e.stopPropagation();
              openProfessionalSelector(wrapper);
            });
            profSection.appendChild(wrapper);
          }
        } catch (e) {
          console.warn("Erro ao preencher Profissional:", e);
        }
      }
    } catch (e) {
      console.warn("Erro ao renderizar serviços:", e);
    }

    // Garantir que todos os locais que exibem o profissional sejam preenchidos
    try {
      const profFromAg =
        agendamento.profissional ||
        agendamento.profissionalNome ||
        (Array.isArray(agendamento.servicos) &&
          agendamento.servicos[0] &&
          (agendamento.servicos[0].profissional ||
            agendamento.servicos[0].profissionalNome)) ||
        "-";
      // Preencher apenas as células de profissional dentro dos itens (não alterar o cabeçalho da tabela)
      document
        .querySelectorAll(
          ".category-section .col-profissional, .service-item .col-profissional",
        )
        .forEach((el) => {
          el.textContent = profFromAg;
        });
      document.querySelectorAll(".agendamento-profissional").forEach((el) => {
        el.textContent = profFromAg;
      });
      const profSidebar = document.querySelector(
        ".professional-section .professional-content",
      );
      if (profSidebar && !profSidebar.textContent.trim()) {
        profSidebar.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.className = "prof-card";
        const nameEl = document.createElement("div");
        nameEl.className = "prof-name";
        nameEl.textContent = profFromAg;
        wrapper.appendChild(nameEl);
        profSidebar.appendChild(wrapper);
      }
      const infoProf = document.querySelector(
        ".info-row:nth-child(2) .info-value",
      );
      if (infoProf) infoProf.textContent = profFromAg;
    } catch (e) {
      console.warn("Erro ao popular profissionais em múltiplos locais:", e);
    }

    // Atualiza ícones dos serviços conforme status
    try {
      updateServiceIcons(
        agendamento.status ||
          agendamento.statusTexto ||
          agendamento.status_nome,
      );
    } catch (e) {
      /* ignore */
    }

    // 🔍 DEBUG: Verificar estado final do DOM após preencher dados
    setTimeout(() => {
      const vacinasContainer = document.querySelector(
        "#vacinasSubContent .historico-list",
      );
      const vacinasItems = vacinasContainer
        ? vacinasContainer.querySelectorAll(".vacina-item")
        : [];
      console.log(
        `🔍 [DEBUG FINAL] Container vacinas existe: ${!!vacinasContainer}`,
      );
      console.log(
        `🔍 [DEBUG FINAL] Items vacinas no DOM: ${vacinasItems.length}`,
      );
      if (vacinasItems.length > 0) {
        console.log(`✅ [DEBUG FINAL] Vacinas estão no DOM!`);
        vacinasItems.forEach((item, idx) => {
          const nome =
            item.querySelector(".vacina-nome")?.textContent || "sem nome";
          console.log(`  [${idx}] ${nome}`);
        });
      }
    }, 200);

    console.log("✅ Dados preenchidos na tela");
  } catch (error) {
    console.error("Erro ao preencher dados:", error);
  }
}

// Função para formatar data e hora
function formatarDataHora(data) {
  if (!data) return "-";
  try {
    const date = new Date(data);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return data;
  }
}

// Função para formatar moeda
function formatarMoeda(valor) {
  if (typeof valor === "number") {
    return valor.toFixed(2).replace(".", ",");
  }
  return valor || "0,00";
}

// Mostra placeholders '...' na seção de itens enquanto os dados carregam
function showItemsPlaceholder() {
  try {
    const category = document.querySelector(".category-section");
    if (!category) return;

    // Remove itens atuais e adiciona item placeholder
    category.querySelectorAll(".service-item").forEach((n) => n.remove());

    const item = document.createElement("div");
    item.className = "service-item placeholder-item";
    item.innerHTML = `
                        <div class="col-horario">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="col-descricao">
                            <div class="service-name">...</div>
                        </div>
                        <div class="col-profissional">...</div>
                        <div class="col-qtd">...</div>
                        <div class="col-unitario">...</div>
                        <div class="col-desconto">...</div>
                        <div class="col-total">...</div>
                        <div class="col-acoes"></div>
                `;

    category.appendChild(item);

    // Totais também com placeholder
    const totalGeral = document.getElementById("totalGeral");
    if (totalGeral) totalGeral.textContent = "...";
    const totalPendente = document.getElementById("totalPendente");
    if (totalPendente) totalPendente.textContent = "...";
    const amount = document.querySelector(".amount");
    if (amount) amount.textContent = "...";
  } catch (e) {
    console.warn("Erro ao mostrar placeholders:", e);
  }
}

// Função para alternar abas
async function alternarAba(aba, skipSave = false) {
  // Remove classe active de todas as abas
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Adiciona classe active na aba clicada
  const botaoAba = document.querySelector(`[onclick="alternarAba('${aba}')"]`);
  if (botaoAba) botaoAba.classList.add("active");

  const conteudoAba = document.getElementById(`${aba}Content`);
  if (conteudoAba) conteudoAba.classList.add("active");

  // Esconder sidebar direita quando estiver na aba CLÍNICA
  const sidebarRight = document.querySelector(".sidebar-right");
  const detailsContainer = document.querySelector(".details-container");

  if (aba === "clinica") {
    if (sidebarRight) sidebarRight.style.display = "none";
    if (detailsContainer) detailsContainer.classList.add("clinica-mode");
    // esconder botão de Vacina na área do prontuário quando entrar na aba Clínica
    try {
      const vacinaBtn =
        document.querySelector('.prontuario-icons .icon-btn[title="Vacina"]') ||
        (document.querySelector(".prontuario-icons i.fa-syringe") &&
          document
            .querySelector(".prontuario-icons i.fa-syringe")
            .closest("button"));
      if (vacinaBtn) vacinaBtn.style.display = "none";
    } catch (e) {
      console.warn("Erro ao esconder botão Vacina na aba Clínica", e);
    }
  } else {
    if (sidebarRight) sidebarRight.style.display = "block";
    if (detailsContainer) detailsContainer.classList.remove("clinica-mode");

    // restaurar visibilidade do botão Vacina ao sair da aba Clínica
    try {
      const vacinaBtn =
        document.querySelector('.prontuario-icons .icon-btn[title="Vacina"]') ||
        (document.querySelector(".prontuario-icons i.fa-syringe") &&
          document
            .querySelector(".prontuario-icons i.fa-syringe")
            .closest("button"));
      if (vacinaBtn) vacinaBtn.style.display = "";
    } catch (e) {
      console.warn("Erro ao restaurar botão Vacina fora da aba Clínica", e);
    }

    // Atualizar a UI com dados já carregados em memória quando possível
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const agendamentoId = urlParams.get("id");

      // Se já temos o agendamento em memória, reaplicar os dados
      if (
        window.agendamentoAtual &&
        String(window.agendamentoAtual.id) === String(agendamentoId)
      ) {
        try {
          preencherDadosAgendamento(window.agendamentoAtual);
        } catch (e) {
          console.warn("Erro preencherDadosAgendamento (memória):", e);
        }
      } else if (agendamentoId) {
        // Caso não exista em memória, buscar do servidor silenciosamente (sem alertas)
        try {
          const resp = await fetch(`/api/agendamentos/${agendamentoId}`, {
            cache: "no-store",
          });
          if (resp && resp.ok) {
            const fresh = await resp.json();
            try {
              preencherDadosAgendamento(fresh);
            } catch (e) {
              console.warn("Erro preencherDadosAgendamento (fetch):", e);
            }
          } else {
            console.warn(
              "Resposta inválida ao buscar agendamento ao alternar aba:",
              resp && resp.status,
            );
          }
        } catch (err) {
          // Falha na rede: não exibir alert para o usuário aqui, apenas logar
          console.warn(
            "Falha ao buscar agendamento ao alternar aba (silencioso):",
            err,
          );
        }
      }
    } catch (e) {
      console.warn(
        "Erro recarregando agendamento ao alternar para detalhes:",
        e,
      );
    }
  }

  console.log(`📋 Aba alterada para: ${aba}`);

  // atualizar estado local e persistir no banco (sem usar localStorage)
  try {
    clinicaStateLocal.activeTab = aba;
    // manter subAba atual quando alterna para clínica; caso contrário, limpar
    if (aba !== "clinica") clinicaStateLocal.activeSubTab = null;
    if (!skipSave) await enviarClinicaState();
  } catch (e) {
    console.warn("Erro salvando estado da aba clínica:", e);
  }
}

// Função para alternar sub-abas (dentro da aba Clínica)
function alternarSubAba(subAba, skipSave = false) {
  // Remove classe active de todas as sub-abas
  document
    .querySelectorAll(".sub-tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".sub-tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Adiciona classe active na sub-aba clicada
  const botaoSubAba = document.querySelector(
    `[onclick="alternarSubAba('${subAba}')"]`,
  );
  if (botaoSubAba) botaoSubAba.classList.add("active");

  const conteudoSubAba = document.getElementById(`${subAba}SubContent`);
  if (conteudoSubAba) conteudoSubAba.classList.add("active");

  console.log(`📋 Sub-aba alterada para: ${subAba}`);

  // 🔍 DEBUG: Verificar se vacinas estão no DOM após alternância
  if (subAba === "vacinas") {
    setTimeout(() => {
      const container = document.querySelector(
        "#vacinasSubContent .historico-list",
      );
      const items = container ? container.querySelectorAll(".vacina-item") : [];
      console.log(
        `🔍 [DEBUG] Após alternar para vacinas - Container existe: ${!!container}`,
      );
      console.log(
        `🔍 [DEBUG] Após alternar para vacinas - Items no DOM: ${items.length}`,
      );
      if (container)
        console.log(
          `🔍 [DEBUG] Container HTML:`,
          container.innerHTML.substring(0, 500),
        );
    }, 100);
  }

  // persistir sub-aba selecionada
  try {
    clinicaStateLocal.activeSubTab = subAba;
    if (!skipSave) enviarClinicaState();
  } catch (e) {
    console.warn("Erro salvando sub-aba clínica:", e);
  }

  // Ao abrir Histórico, carregar os registros clínicos combinados
  try {
    if (subAba === "historico") {
      try {
        loadClinicalHistory();
      } catch (e) {
        console.warn("Erro carregando histórico clínico:", e);
      }
    }
  } catch (e) {}
}

// Envia clinicaState para o backend (salva no campo clinica_state da tabela agendamentos)
async function enviarClinicaState() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const agendamentoId = urlParams.get("id");
    if (!agendamentoId) return;

    // Apenas enviar o estado da UI — backend armazena clinicaState separadamente
    await fetch(`/api/agendamentos/${agendamentoId}/prontuario`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicaState: clinicaStateLocal }),
    });
    console.log(
      "🔁 Estado da aba clínica enviado ao servidor:",
      clinicaStateLocal,
    );
  } catch (e) {
    console.warn("Falha ao enviar clinicaState:", e);
  }
}

// Variável para armazenar timeout de auto-save
let autoSaveTimeout = null;

// Função para formatar data/hora atual (sem parâmetros)
function formatarDataHoraAgora() {
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR");
  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} - Hoje às ${hora}`;
}

// Função para adicionar campos ao prontuário dinamicamente
function adicionarCampoProntuario(
  tipo,
  conteudo = "",
  dataEmissao = null,
  registroId = null,
  arquivos = null,
) {
  const container = document.getElementById("prontuarioCampos");
  if (!container) return;

  // Remover mensagem de estado vazio
  const emptyState = container.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  // Configuração dos campos
  const campos = {
    peso: {
      label: "Peso",
      icon: "fa-weight",
      color: "#ff6b6b",
      placeholder: "Digite o peso...",
      rows: 2,
    },
    banho: {
      label: "Banho e Tosa",
      icon: "fa-bath",
      color: "#4ecdc4",
      placeholder: "Digite informações sobre banho e tosa...",
      rows: 2,
    },
    medicacao: {
      label: "Medicação",
      icon: "fa-pills",
      color: "#ff9f43",
      placeholder: "Digite a medicação...",
      rows: 3,
    },
    cirurgia: {
      label: "Cirurgia",
      icon: "fa-briefcase-medical",
      color: "#a29bfe",
      placeholder: "Digite informações sobre cirurgia...",
      rows: 3,
    },
    coracao: {
      label: "Avaliação Cardíaca",
      icon: "fa-heartbeat",
      color: "#fd79a8",
      placeholder: "Digite avaliação cardíaca...",
      rows: 2,
    },
    vacina: {
      label: "Vacina",
      icon: "fa-syringe",
      color: "#6c5ce7",
      placeholder: "Digite informações sobre vacina...",
      rows: 2,
    },
    queixas: {
      label: "Queixas e Sintomas",
      icon: "fa-comment-medical",
      color: "#00b894",
      placeholder: "Digite as queixas e sintomas...",
      rows: 3,
    },
    exames: {
      label: "Exames",
      icon: "fa-flask",
      color: "#e17055",
      placeholder: "Digite resultados de exames...",
      rows: 3,
    },
    alergias: {
      label: "Alergias",
      icon: "fa-exclamation-triangle",
      color: "#fdcb6e",
      placeholder: "Digite alergias conhecidas...",
      rows: 2,
    },
    temperatura: {
      label: "Temperatura",
      icon: "fa-thermometer-half",
      color: "#74b9ff",
      placeholder: "Digite a temperatura...",
      rows: 1,
    },
    dieta: {
      label: "Dieta e Alimentação",
      icon: "fa-utensils",
      color: "#55efc4",
      placeholder: "Digite informações sobre dieta...",
      rows: 2,
    },
    compartilhar: {
      label: "Notas para Compartilhar",
      icon: "fa-share-alt",
      color: "#0984e3",
      placeholder: "Digite notas para compartilhar...",
      rows: 3,
    },
    anexar: {
      label: "Anexos e Documentos",
      icon: "fa-paperclip",
      color: "#636e72",
      placeholder: "Digite informações sobre anexos...",
      rows: 2,
    },
  };

  const config = campos[tipo];
  if (!config) return;

  // Criar ID único para o registro se não for fornecido
  if (!registroId)
    registroId = `registro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const dataHora = dataEmissao || formatarDataHoraAgora();

  // Criar elemento do registro (cartão)
  const registroDiv = document.createElement("div");
  registroDiv.className = "prontuario-registro";
  registroDiv.setAttribute("data-tipo", tipo);
  registroDiv.setAttribute("data-registro-id", registroId);
  registroDiv.style.borderLeftColor = config.color;

  // Card especial para Anexos e Documentos
  if (tipo === "anexar") {
    registroDiv.innerHTML = `
            <div class="registro-header">
                <div class="registro-titulo">
                    <i class="fas fa-paperclip" style="color: #636e72;"></i>
                    <span>Anexos e Documentos</span>
                </div>
                <button class="btn-remover-registro" onclick="removerRegistroProntuario('${registroId}')" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="registro-conteudo" contenteditable="false" data-files="[]" style="display:none;"></div>
            <div class="registro-body-anexo">
                <div class="anexo-file-list" id="anexoList-${registroId}"></div>
                <label class="btn-upload-anexo" title="Adicionar arquivo">
                    <i class="fas fa-plus"></i> Adicionar arquivo
                    <input type="file" multiple style="display:none" onchange="uploadAnexoFile(this, '${registroId}')">
                </label>
            </div>
            <div class="registro-footer">
                <i class="far fa-clock"></i> ${dataHora}
            </div>
        `;
    container.appendChild(registroDiv);
    // Restaurar arquivos salvos
    const filesParaRestaurar =
      arquivos && Array.isArray(arquivos) ? arquivos : [];
    if (filesParaRestaurar.length) {
      const conteudoDiv = registroDiv.querySelector(".registro-conteudo");
      if (conteudoDiv)
        conteudoDiv.setAttribute(
          "data-files",
          JSON.stringify(filesParaRestaurar),
        );
      filesParaRestaurar.forEach((f) => _renderAnexoChip(registroId, f));
    }
    console.log("✅ Registro adicionado: Anexos e Documentos");
    return registroId;
  }

  registroDiv.innerHTML = `
        <div class="registro-header">
            <div class="registro-titulo">
                <i class="fas ${config.icon}" style="color: ${config.color};"></i>
                <span>${config.label}</span>
            </div>
            <button class="btn-remover-registro" onclick="removerRegistroProntuario('${registroId}')" title="Remover">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="registro-conteudo" contenteditable="true" data-placeholder="${config.placeholder}">${conteudo}</div>
        <div class="registro-footer">
            <i class="far fa-clock"></i> ${dataHora}
        </div>
    `;

  container.appendChild(registroDiv);

  // Configurar auto-save no contenteditable
  const conteudoDiv = registroDiv.querySelector(".registro-conteudo");
  if (conteudoDiv) {
    // Focar apenas se for novo registro
    if (!conteudo) {
      conteudoDiv.focus();
    }

    // Auto-save ao digitar (debounced)
    conteudoDiv.addEventListener("input", () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        salvarProntuarioAutomatico();
      }, 1500); // Aguarda 1.5 segundos após parar de digitar
    });

    // Salvar ao perder o foco
    conteudoDiv.addEventListener("blur", () => {
      clearTimeout(autoSaveTimeout);
      salvarProntuarioAutomatico();
    });
  }

  console.log(`✅ Registro adicionado: ${config.label}`);
  return registroId;
}

// Função para remover registro do prontuário
function removerRegistroProntuario(registroId) {
  const container = document.getElementById("prontuarioCampos");
  if (!container) return;

  const registro = container.querySelector(
    `[data-registro-id="${registroId}"]`,
  );
  if (registro) {
    registro.remove();
    console.log(`🗑️ Registro removido: ${registroId}`);

    // Salvar após remoção
    salvarProntuarioAutomatico();

    // Se não houver mais registros, mostrar mensagem vazia
    if (container.children.length === 0) {
      container.innerHTML =
        '<p class="empty-state">Clique em um ícone acima para adicionar informações ao prontuário</p>';
    }
  }
}

// Função para coletar dados do prontuário
function coletarDadosProntuario() {
  const container = document.getElementById("prontuarioCampos");
  if (!container) return [];

  const registros = [];
  const elementos = container.querySelectorAll(".prontuario-registro");

  elementos.forEach((el) => {
    const tipo = el.getAttribute("data-tipo");
    const registroId = el.getAttribute("data-registro-id");
    const conteudoDiv = el.querySelector(".registro-conteudo");
    const footer = el.querySelector(".registro-footer");

    if (conteudoDiv && footer) {
      const dataEmissao = footer.textContent
        .replace(/[^\d\/\-:\sàsA-Za-z]/g, "")
        .trim();

      // Card de anexos: salvar arquivos separadamente
      if (tipo === "anexar") {
        let arquivos = [];
        try {
          arquivos = JSON.parse(conteudoDiv.getAttribute("data-files") || "[]");
        } catch (e) {}
        registros.push({
          id: registroId,
          tipo,
          conteudo: "",
          dataEmissao,
          arquivos,
        });
        return; // forEach callback return
      }

      // Cards normais
      const textoPlano = conteudoDiv.textContent.trim();
      const conteudoHtml = conteudoDiv.innerHTML.trim();
      if (textoPlano) {
        registros.push({
          id: registroId,
          tipo,
          conteudo: conteudoHtml,
          dataEmissao,
        });
      }
    }
  });

  console.log("📋 Dados coletados do prontuário:", registros);

  return registros;
}

// Função para salvar prontuário automaticamente
async function salvarProntuarioAutomatico() {
  const agendamentoId = new URLSearchParams(window.location.search).get("id");
  if (!agendamentoId) {
    console.warn("⚠️ ID do agendamento não encontrado");
    return;
  }

  const registros = coletarDadosProntuario();
  console.log("💾 Salvando prontuário para agendamento:", agendamentoId);
  console.log("📝 Registros a salvar:", registros);

  try {
    const response = await fetch(
      `/api/agendamentos/${agendamentoId}/prontuario`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prontuario: registros }),
      },
    );

    console.log("📡 Response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Prontuário salvo automaticamente:", data);
    } else {
      console.error("❌ Erro ao salvar prontuário:", await response.text());
    }
  } catch (error) {
    console.error("❌ Erro ao salvar prontuário:", error);
  }
}

// Função para carregar prontuário existente
async function carregarProntuario(agendamentoId) {
  console.log("🔄 Carregando prontuário do agendamento:", agendamentoId);
  try {
    const response = await fetch(`/api/agendamentos/${agendamentoId}`);
    if (!response.ok) {
      console.warn("⚠️ Erro ao buscar agendamento:", response.status);
      return;
    }

    const agendamento = await response.json();
    console.log("📄 Agendamento carregado:", agendamento);
    console.log("📋 Prontuário encontrado:", agendamento.prontuario);

    if (agendamento.prontuario && Array.isArray(agendamento.prontuario)) {
      console.log(`📝 Restaurando ${agendamento.prontuario.length} registros`);
      agendamento.prontuario.forEach((registro) => {
        // Restaurar registro no prontuário (mantendo o mesmo id salvo)
        const restoredId = adicionarCampoProntuario(
          registro.tipo,
          registro.conteudo,
          registro.dataEmissao,
          registro.id || null,
          registro.arquivos || null,
        );
        // se for vacina, também adicionar na lista de vacinas (aba) e manter vínculo com registro salvo
        try {
          if (registro.tipo === "vacina") {
            const registroId = registro.id || restoredId || null;
            adicionarVacinaNaListaFromConteudo(
              registro.conteudo,
              registro.dataEmissao,
              registroId,
            );
          }
        } catch (e) {
          console.warn(
            "Erro ao adicionar vacina na lista ao carregar prontuário:",
            e,
          );
        }
      });
    } else {
      console.log("ℹ️ Nenhum prontuário encontrado ou prontuário vazio");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar prontuário:", error);
  }
}

// Funções do Modal de Vacina
let vacinasDisponiveis = [];
let profissionaisDisponiveis = [];
let vacinaFetchTimeout = null;
let meusItensEndpoint = null; // cache do endpoint funcional
const meusItensCandidates = [
  "/api/meus-itens",
  "/api/produtos",
  "/api/itens",
  "/api/produtos/meus",
  "/api/items",
  "/api/items/produtos",
];

// Buscar vacinas da API
async function buscarVacinas() {
  const tryList = meusItensEndpoint ? [meusItensEndpoint] : meusItensCandidates;
  let lastErr = null;
  for (const base of tryList) {
    try {
      const resp = await fetch(base);
      if (!resp.ok) {
        lastErr = new Error(`status ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : data.items || data.data || [];
      // filtrar apenas itens de categoria 'Vacina' (variações)
      const filtered = (arr || []).filter((i) => {
        const cat = String(
          i.categoria || i.category || i.categoriaNome || i.agrupamento || "",
        ).toLowerCase();
        return cat.indexOf("vacina") !== -1;
      });
      vacinasDisponiveis = filtered;
      meusItensEndpoint = base; // cacheia endpoint que funcionou
      console.log("💉 Vacinas carregadas via", base, filtered.length);
      return;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  console.warn("❌ Buscar vacinas falhou em todos endpoints:", lastErr);
  vacinasDisponiveis = [];
}

// Buscar vacinas por query (usa /api/meus-itens?q=...)
async function buscarVacinasQuery(q) {
  // tenta endpoint cacheado primeiro, senão varre candidatos
  const tryList = meusItensEndpoint ? [meusItensEndpoint] : meusItensCandidates;
  let lastErr = null;
  for (const base of tryList) {
    const url = base + "?q=" + encodeURIComponent(q);
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        lastErr = new Error(`status ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : data.items || data.data || [];
      // filtrar apenas itens de categoria 'Vacina' (variações)
      const filtered = (arr || []).filter((i) => {
        const cat = String(
          i.categoria || i.category || i.categoriaNome || i.agrupamento || "",
        ).toLowerCase();
        return cat.indexOf("vacina") !== -1;
      });
      vacinasDisponiveis = filtered;
      meusItensEndpoint = base; // cacheia endpoint que funcionou
      console.log("💉 Vacinas (query) carregadas via", base, filtered.length);
      return;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  console.warn(
    "❌ Buscar vacinas por query falhou em todos endpoints:",
    lastErr,
  );
  vacinasDisponiveis = [];
}

// Buscar profissionais da API
async function buscarProfissionais() {
  try {
    const response = await fetch("/api/profissionais");
    if (response.ok) {
      profissionaisDisponiveis = await response.json();
      console.log(
        "👨‍⚕️ Profissionais carregados:",
        profissionaisDisponiveis.length,
      );
    }
  } catch (error) {
    console.error("❌ Erro ao buscar profissionais:", error);
  }
}

// Buscar periodicidades da API (renovações)
let periodicidadesDisponiveis = [];
async function buscarPeriodicidades() {
  const candidates = [
    "/api/periodicidades",
    "/api/periodicidade",
    "/api/periodicities",
  ];
  for (const p of candidates) {
    try {
      const res = await fetch(p);
      if (!res.ok) continue;
      const data = await res.json();
      periodicidadesDisponiveis = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : [];
      console.log(
        "⟳ Periodicidades carregadas via",
        p,
        periodicidadesDisponiveis.length,
      );
      return;
    } catch (e) {
      continue;
    }
  }
  console.warn(
    "⚠️ Não foi possível carregar periodicidades (nenhum endpoint respondeu)",
  );
  periodicidadesDisponiveis = [];
}

function abrirModalVacinaParaEdicao(dados) {
  abrirModalVacina();
  // Preencher campos após abrir
  setTimeout(() => {
    const inputVacina = document.getElementById("nomeVacina");
    const dataAplic = document.getElementById("dataAplicacao");
    const proxDose = document.getElementById("proximaDose");
    const loteInput = document.getElementById("loteVacina");
    const vetInput = document.getElementById("veterinarioVacina");
    const obsInput = document.getElementById("observacoesVacina");

    if (inputVacina) inputVacina.value = dados.nome || "";
    if (dataAplic) dataAplic.value = dados.dataAplicacao || "";
    if (proxDose) proxDose.value = dados.proximaDose || "";
    if (loteInput) loteInput.value = dados.lote || "";
    if (vetInput) vetInput.value = dados.profissional || "";
    if (obsInput) obsInput.value = dados.observacoes || "";

    // Marcar como edição
    const modal = document.getElementById("modalVacina");
    if (modal) {
      modal.dataset.editando = "true";
      modal.dataset.itemOriginal = dados.registroId || "";
    }
  }, 100);
}

function abrirModalVacina() {
  const modal = document.getElementById("modalVacina");
  if (modal) {
    modal.style.display = "flex";
    // Preencher data de hoje como padrão
    const hoje = new Date().toISOString().split("T")[0];
    document.getElementById("dataAplicacao").value = hoje;

    // Buscar vacinas se ainda não foi feito
    if (vacinasDisponiveis.length === 0) {
      buscarVacinas();
    }

    // Buscar profissionais se ainda não foi feito
    if (profissionaisDisponiveis.length === 0) {
      buscarProfissionais();
    }

    // Configurar eventos do input
    configurarAutocompleteVacina();
    configurarAutocompleteProfissional();

    // Focar no primeiro campo
    setTimeout(() => {
      document.getElementById("nomeVacina").focus();
    }, 100);
  }
}

function configurarAutocompleteVacina() {
  const input = document.getElementById("nomeVacina");
  const dropdown = document.getElementById("vacinaDropdown");

  if (!input || !dropdown) return;

  // Mostrar dropdown ao clicar
  input.addEventListener("click", function () {
    mostrarDropdownVacinas();
  });

  // Filtrar ao digitar (faz chamada ao servidor com debounce)
  input.addEventListener("input", function () {
    const texto = this.value.trim();
    if (vacinaFetchTimeout) clearTimeout(vacinaFetchTimeout);
    if (!texto) {
      mostrarDropdownVacinas("");
      return;
    }
    vacinaFetchTimeout = setTimeout(async () => {
      await buscarVacinasQuery(texto);
      mostrarDropdownVacinas(texto.toLowerCase());
    }, 250);
  });

  // Fechar dropdown ao clicar fora
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".vacina-autocomplete")) {
      dropdown.style.display = "none";
    }
  });
}

function mostrarDropdownVacinas(filtro = "") {
  const dropdown = document.getElementById("vacinaDropdown");
  if (!dropdown) return;

  const vacinasFiltradas = filtro
    ? vacinasDisponiveis.filter((v) =>
        (v.nome || "").toLowerCase().includes(filtro),
      )
    : vacinasDisponiveis;

  if (vacinasFiltradas.length === 0) {
    dropdown.innerHTML =
      '<div class="dropdown-item-empty">Nenhuma vacina encontrada</div>';
    dropdown.style.display = "block";
    return;
  }

  dropdown.innerHTML = vacinasFiltradas
    .map((vacina) => {
      const preco = vacina.preco || vacina.venda || vacina.valor || 0;
      const precoFormatado =
        preco > 0 ? `R$ ${formatarMoeda(Number(preco))}` : "";
      return `
            <div class="dropdown-item-vacina" onclick="selecionarVacina(${vacina.id}, '${(vacina.nome || "").replace(/'/g, "\\'")}', ${preco})"> 
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div class="vacina-nome">${vacina.nome || "Sem nome"}</div>
                    ${precoFormatado ? `<div style="font-weight:700; color:#111; margin-left:8px;">${precoFormatado}</div>` : ""}
                </div>
            </div>
        `;
    })
    .join("");

  dropdown.style.display = "block";
}

function selecionarVacina(id, nome, valor = 0) {
  const input = document.getElementById("nomeVacina");
  const dropdown = document.getElementById("vacinaDropdown");

  if (input) {
    input.value = nome;
    input.setAttribute("data-vacina-id", id);
    input.setAttribute("data-vacina-valor", valor);
  }

  if (dropdown) {
    dropdown.style.display = "none";
  }

  console.log("✅ Vacina selecionada:", nome, "Valor:", valor);
}

function configurarAutocompleteProfissional() {
  const input = document.getElementById("veterinarioVacina");
  const dropdown = document.getElementById("profissionalDropdown");

  if (!input || !dropdown) return;

  // Mostrar dropdown ao clicar
  input.addEventListener("click", function () {
    mostrarDropdownProfissionais();
  });

  // Filtrar ao digitar
  input.addEventListener("input", function () {
    const texto = this.value.toLowerCase();
    mostrarDropdownProfissionais(texto);
  });

  // Fechar dropdown ao clicar fora
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".profissional-autocomplete")) {
      dropdown.style.display = "none";
    }
  });
}

function mostrarDropdownProfissionais(filtro = "") {
  const dropdown = document.getElementById("profissionalDropdown");
  if (!dropdown) return;

  const profissionaisFiltrados = filtro
    ? profissionaisDisponiveis.filter((p) =>
        p.nome.toLowerCase().includes(filtro),
      )
    : profissionaisDisponiveis;

  if (profissionaisFiltrados.length === 0) {
    dropdown.innerHTML =
      '<div class="dropdown-item-empty">Nenhum profissional encontrado</div>';
    dropdown.style.display = "block";
    return;
  }

  dropdown.innerHTML = profissionaisFiltrados
    .map(
      (profissional) => `
        <div class="dropdown-item-profissional" onclick="selecionarProfissional(${profissional.id}, '${profissional.nome.replace(/'/g, "\\'")}')">
            <div class="profissional-nome">${profissional.nome}</div>
        </div>
    `,
    )
    .join("");

  dropdown.style.display = "block";
}

function selecionarProfissional(id, nome) {
  const input = document.getElementById("veterinarioVacina");
  const dropdown = document.getElementById("profissionalDropdown");

  if (input) {
    input.value = nome;
    input.setAttribute("data-profissional-id", id);
  }

  if (dropdown) {
    dropdown.style.display = "none";
  }

  console.log("✅ Profissional selecionado:", nome);
}

function fecharModalVacina() {
  const modal = document.getElementById("modalVacina");
  if (modal) {
    modal.style.display = "none";
    // Limpar estado de edição
    delete modal.dataset.editando;
    delete modal.dataset.itemOriginal;

    // Limpar campos
    const inputVacina = document.getElementById("nomeVacina");
    const inputVet = document.getElementById("veterinarioVacina");

    inputVacina.value = "";
    inputVacina.removeAttribute("data-vacina-id");
    inputVacina.removeAttribute("data-vacina-valor");

    document.getElementById("dataAplicacao").value = "";
    document.getElementById("proximaDose").value = "";
    document.getElementById("loteVacina").value = "";

    inputVet.value = "";
    inputVet.removeAttribute("data-profissional-id");

    document.getElementById("observacoesVacina").value = "";

    // Fechar dropdowns
    const vacinaDropdown = document.getElementById("vacinaDropdown");
    const profissionalDropdown = document.getElementById(
      "profissionalDropdown",
    );
    if (vacinaDropdown) vacinaDropdown.style.display = "none";
    if (profissionalDropdown) profissionalDropdown.style.display = "none";
  }
}

async function salvarVacina() {
  const nomeVacina = document.getElementById("nomeVacina").value.trim();
  const dataAplicacao = document.getElementById("dataAplicacao").value;
  const proximaDose = document.getElementById("proximaDose").value;
  const lote = document.getElementById("loteVacina").value.trim();
  const veterinario = document.getElementById("veterinarioVacina").value.trim();
  const observacoes = document.getElementById("observacoesVacina").value.trim();

  // Obter ID e valor do produto selecionado
  const inputVacina = document.getElementById("nomeVacina");
  const vacinaId = inputVacina
    ? inputVacina.getAttribute("data-vacina-id")
    : null;
  const vacinaValor = inputVacina
    ? parseFloat(inputVacina.getAttribute("data-vacina-valor") || "0")
    : 0;

  if (!nomeVacina) {
    alert("Por favor, informe o nome da vacina");
    document.getElementById("nomeVacina").focus();
    return;
  }

  // Calcular período de renovação se houver próxima dose
  let renovacao = "";
  if (proximaDose && dataAplicacao) {
    try {
      const d1 = new Date(dataAplicacao + "T12:00:00");
      const d2 = new Date(proximaDose + "T12:00:00");
      const diffDias = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDias > 0) {
        renovacao = `${diffDias} dias`;
      }
    } catch (e) {}
  }

  // Criar objeto de serviço compatível com o banco de dados
  const profissional =
    veterinario ||
    (agendamentoAtual && agendamentoAtual.profissional
      ? agendamentoAtual.profissional
      : "-");
  // Gerar ID único sempre (timestamp + random) para permitir múltiplas vacinas iguais
  const uniqueId = `vac-${Date.now()}-${Math.floor(Math.random() * 999999)}`;
  const s = {
    id: uniqueId,
    nome: nomeVacina,
    quantidade: 1,
    unitario: vacinaValor,
    valor: vacinaValor,
    total: vacinaValor,
    profissional: profissional,
  };

  // Adicionar metadados da vacina (usar data de hoje se vazia para aparecer no histórico)
  const _vacinaDataAplic =
    dataAplicacao || new Date().toISOString().slice(0, 10);
  s.meta = {
    dose: "1 dose",
    lote: lote || "",
    dataAplic: _vacinaDataAplic,
    renovacao: renovacao || "",
    proximaDose: proximaDose || "",
    observacoes: observacoes || "",
    tipoEspecial: "vacina",
  };

  // Verificar se está editando uma vacina existente
  const modal = document.getElementById("modalVacina");
  const estaEditando = modal && modal.dataset.editando === "true";
  const registroIdAntigo = modal ? modal.dataset.itemOriginal : null;

  // Se está editando, remover a vacina antiga antes de adicionar a nova
  if (estaEditando && registroIdAntigo) {
    // Remover do DOM
    const itemAntigo = document.querySelector(
      `[data-registro-id="${registroIdAntigo}"]`,
    );
    if (itemAntigo) itemAntigo.remove();

    // Remover do array servicos
    if (Array.isArray(agendamentoAtual.servicos)) {
      agendamentoAtual.servicos = agendamentoAtual.servicos.filter((serv) => {
        const idMatch = String(serv.id) === String(registroIdAntigo);
        const isVacina = serv.meta && serv.meta.tipoEspecial === "vacina";
        return !(idMatch && isVacina);
      });
    }

    // Remover da lista de itens na categoria principal
    const itemNaLista = document.querySelector(
      `.service-item[data-service-id="${registroIdAntigo}"]`,
    );
    if (itemNaLista) itemNaLista.remove();

    // Usar o mesmo ID da vacina antiga ao editar
    s.id = registroIdAntigo;
  }

  // Adicionar ao buffer temporário (mesmo padrão do vermífugo/antiparasitário)
  if (!agendamentoAtual) agendamentoAtual = {};
  if (!Array.isArray(agendamentoAtual._addedServicos))
    agendamentoAtual._addedServicos = [];
  agendamentoAtual._addedServicos.push(s);

  // Formatar conteúdo para exibição
  let conteudo = `Dose: 1 dose<br>`;
  if (_vacinaDataAplic) {
    const dataFormatada = new Date(
      _vacinaDataAplic + "T00:00:00",
    ).toLocaleDateString("pt-BR");
    conteudo += `Aplicação: ${dataFormatada}<br>`;
  }
  if (proximaDose) {
    const proximaFormatada = new Date(
      proximaDose + "T00:00:00",
    ).toLocaleDateString("pt-BR");
    conteudo += `Próxima dose: ${proximaFormatada}<br>`;
  }
  if (lote) {
    conteudo += `Lote: ${lote}<br>`;
  }
  if (veterinario) {
    conteudo += `Profissional: ${veterinario}<br>`;
  }
  if (observacoes) {
    conteudo += `Obs: ${observacoes}`;
  }

  // Adicionar na lista visual (sub-aba Vacinas E lista de Itens)
  // appendServiceToCategory detecta isVacina e faz toda a renderização necessária
  try {
    appendServiceToCategory(s);
  } catch (e) {
    console.warn("Erro adicionando vacina:", e);
  }

  // Persistir no banco de dados mesclando serviços existentes + adicionados (mesmo fluxo do vermifugo)
  try {
    if (agendamentoAtual && agendamentoAtual.id) {
      const existingServicos = Array.isArray(agendamentoAtual.servicos)
        ? agendamentoAtual.servicos.slice()
        : Array.isArray(agendamentoAtual.__existingServicosArray)
          ? agendamentoAtual.__existingServicosArray.slice()
          : [];
      const toAdd = Array.isArray(agendamentoAtual._addedServicos)
        ? agendamentoAtual._addedServicos.slice()
        : [];
      // Concatenar todos os serviços SEM deduplicação (permitir vacinas/itens duplicados)
      const mergedServicos = existingServicos.concat(toAdd || []);
      const nomesConcat = [
        String(
          agendamentoAtual.__existingServicosString ||
            agendamentoAtual.servico ||
            "",
        ),
      ]
        .concat((agendamentoAtual._addedServicos || []).map((x) => x.nome))
        .filter(Boolean)
        .join(" • ");
      const payload = {
        servico: nomesConcat,
        servicos: mergedServicos,
        valor:
          parseFloat(agendamentoAtual.valor || 0) +
          (agendamentoAtual._addedServicos || []).reduce(
            (a, b) => a + (parseFloat(b.total || b.valor || 0) || 0),
            0,
          ),
      };
      console.log(
        "[vacina] Persistindo agendamento id=",
        agendamentoAtual && agendamentoAtual.id,
        "payload=",
        payload,
      );
      const resp = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const updated = await resp.json().catch(() => null);
        if (updated) {
          // Atualizar agendamentoAtual COMPLETAMENTE com a resposta do servidor
          agendamentoAtual = updated;
          agendamentoAtual.__existingTotal = agendamentoAtual.valor;
          agendamentoAtual.__existingServicosString = agendamentoAtual.servico;
          agendamentoAtual._addedServicos = [];
          console.log("[vacina] ✅ Vacina salva no banco com sucesso", updated);
          console.log(
            "[vacina] agendamentoAtual.servicos atualizado:",
            agendamentoAtual.servicos,
          );
          // Atualizar histórico clínico
          console.log(
            "[vacina] Verificando loadClinicalHistory:",
            typeof loadClinicalHistory,
            loadClinicalHistory,
          );
          try {
            console.log("[vacina] ⚡ ANTES de chamar loadClinicalHistory...");
            await loadClinicalHistory();
            console.log("[vacina] ✅ loadClinicalHistory() concluído");
          } catch (e) {
            console.error("[vacina] ❌ ERRO ao chamar loadClinicalHistory:", e);
          }
        } else {
          agendamentoAtual.valor = payload.valor;
          agendamentoAtual.servico = nomesConcat;
          agendamentoAtual.servicos = mergedServicos;
          agendamentoAtual.__existingTotal = agendamentoAtual.valor;
          agendamentoAtual.__existingServicosString = agendamentoAtual.servico;
          agendamentoAtual._addedServicos = [];
          try {
            await loadClinicalHistory();
          } catch (e) {
            console.warn("Erro atualizando histórico após salvar vacina", e);
          }
        }
        // GET após PUT para verificar
        try {
          const check = await fetch(
            `/api/agendamentos/${agendamentoAtual.id}`,
            { credentials: "include" },
          );
          const checkJson = await check.json().catch(() => null);
          console.log(
            "[vacina] GET after PUT, server returned:",
            check.status,
            checkJson,
          );
        } catch (e) {
          console.warn("[vacina] erro ao GET após PUT", e);
        }
      } else {
        const txt = await resp.text().catch(() => null);
        console.warn(
          "PUT /api/agendamentos failed when persisting vacina",
          resp.status,
          txt,
        );
        console.log("[vacina] server response (text):", txt);
      }
    }
  } catch (e) {
    console.warn("Erro ao persistir vacina no banco:", e);
  }

  // Fechar modal
  fecharModalVacina();

  console.log("💉 Vacina salva:", nomeVacina);
}

// Adiciona visualmente a vacina na lista da sub-aba 'vacinas'
function adicionarVacinaNaLista(
  nome,
  detalhesHtmlOuDados,
  dataAplicacao,
  registroId,
) {
  console.log("🔍 [adicionarVacinaNaLista] Chamada com:", {
    nome,
    dataAplicacao,
    registroId,
  });
  const container = document.querySelector(
    "#vacinasSubContent .historico-list",
  );
  console.log("🔍 [adicionarVacinaNaLista] Container encontrado:", !!container);
  if (!container) {
    console.warn(
      "⚠️ [adicionarVacinaNaLista] Container não encontrado! Vacina não será renderizada na sub-aba.",
    );
    return;
  }

  // remover estado vazio se presente
  console.log("🧽 [adicionarVacinaNaLista] Removendo estado vazio...");
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();

  console.log("🧽 [adicionarVacinaNaLista] Criando elemento item...");
  const item = document.createElement("div");
  item.className = "vacina-item";
  if (registroId) item.dataset.registroId = registroId;

  // Extrair informações dos detalhes (pode ser HTML string ou objeto estruturado)
  console.log("🧽 [adicionarVacinaNaLista] Processando detalhes...");
  let dose = "1 dose";
  let profissional = "";
  let lote = "";
  let renovacao = "";
  let proximaDose = "";

  // Se receber um objeto estruturado (chamada interna do sistema)
  if (typeof detalhesHtmlOuDados === "object" && detalhesHtmlOuDados !== null) {
    console.log(
      "🧽 [adicionarVacinaNaLista] Detalhes são objeto estruturado:",
      detalhesHtmlOuDados,
    );
    dose = detalhesHtmlOuDados.dose || "1 dose";
    profissional = detalhesHtmlOuDados.profissional || "";
    lote = detalhesHtmlOuDados.lote || "";
    proximaDose = detalhesHtmlOuDados.proximaDose || "";
    renovacao = detalhesHtmlOuDados.renovacao || "";
    console.log("🧽 [adicionarVacinaNaLista] Dados extraídos:", {
      dose,
      profissional,
      lote,
      proximaDose,
      renovacao,
    });
  } else {
    // Se receber HTML string (retrocompatibilidade)
    const detalhesHtml = detalhesHtmlOuDados || "";
    try {
      const tmp = document.createElement("div");
      tmp.innerHTML = detalhesHtml;
      const text = tmp.textContent || "";

      // Extrair dose
      const doseMatch = text.match(/Dose[:\s]+([^\n•]+)/i);
      if (doseMatch) dose = doseMatch[1].trim();

      // Extrair profissional
      const profMatch = text.match(/Profissional[:\s]+([^\n•]+)/i);
      if (profMatch) profissional = profMatch[1].trim();

      // Extrair lote
      const loteMatch = text.match(/Lote[:\s]+([^\n•]+)/i);
      if (loteMatch) lote = loteMatch[1].trim();

      // Extrair próxima dose
      const proxMatch = text.match(/Próxima dose[:\s]+([^\n•]+)/i);
      if (proxMatch) proximaDose = proxMatch[1].trim();
    } catch (e) {
      console.warn("Erro ao extrair detalhes da vacina:", e);
    }
  }

  // Formatar data de aplicação
  let dataAplicFormatada = dataAplicacao || "-";
  try {
    if (dataAplicacao && dataAplicacao.includes("-")) {
      const [y, m, d] = dataAplicacao.split("-");
      dataAplicFormatada = `${d}/${m}/${y}`;
    } else if (dataAplicacao && dataAplicacao.includes("/")) {
      dataAplicFormatada = dataAplicacao;
    }
  } catch (e) {}

  // Calcular texto de renovação se houver próxima dose
  let renovacaoTexto = "";
  try {
    if (proximaDose && dataAplicacao) {
      const d1 = new Date(dataAplicacao + "T12:00:00");
      const d2 = new Date(proximaDose + "T12:00:00");
      const diffDias = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDias > 0) {
        // Formatar data de renovação
        const dd = String(d2.getDate()).padStart(2, "0");
        const mm = String(d2.getMonth() + 1).padStart(2, "0");
        const yyyy = d2.getFullYear();
        renovacaoTexto = `Renovar dia ${dd}/${mm}/${yyyy} (${diffDias} dias)`;
      }
    }
  } catch (e) {}

  console.log("🧽 [adicionarVacinaNaLista] Criando HTML do item...");
  console.log("🧽 [adicionarVacinaNaLista] Parâmetros para HTML:", {
    nome,
    dose,
    dataAplicFormatada,
    profissional,
    lote,
    renovacaoTexto,
  });

  // Aplicar estilos diretamente no item (sem wrapper interno)
  item.style.cssText =
    "display:flex;align-items:stretch;justify-content:space-between;padding:16px;background:#fff;border:1px solid #e6e9ee;border-radius:8px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:all 0.2s ease;width:100%;box-sizing:border-box;";
  item.onmouseover = function () {
    this.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  };
  item.onmouseout = function () {
    this.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
  };

  try {
    item.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:0;">
                <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);border-radius:8px;flex-shrink:0;color:#fff;font-weight:700;font-size:14px;">
                    <i class="fas fa-syringe" style="font-size:18px;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div class="vacina-nome" style="font-weight:700;color:#1a1d29;font-size:15px;margin-bottom:6px;line-height:1.3;">${escapeHtmlUnsafe(nome)}</div>
                    ${renovacaoTexto ? `<div style="font-size:13px;color:#6c5ce7;font-weight:600;margin-bottom:4px;"><i class="fas fa-sync-alt" style="font-size:11px;margin-right:4px;"></i>${escapeHtmlUnsafe(renovacaoTexto)}</div>` : ""}
                    <div style="font-size:13px;color:#5a6c7d;margin-bottom:2px;">Dose: ${escapeHtmlUnsafe(dose)} • Aplicada em: ${escapeHtmlUnsafe(dataAplicFormatada)}</div>
                    <div style="font-size:12px;color:#7d8a99;">Profissional: ${escapeHtmlUnsafe(profissional || "-")}${lote ? " • Lote: " + escapeHtmlUnsafe(lote) : ""}</div>
                </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;margin-left:12px;flex-shrink:0;">
                <button class="btn-icon-action" title="Renovar" data-action="renovar" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#6c5ce7';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                    <i class="fas fa-sync-alt" style="font-size:14px;"></i>
                </button>
                <button class="btn-icon-action" title="Editar" data-action="editar" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#007bff';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                    <i class="fas fa-pencil-alt" style="font-size:14px;"></i>
                </button>
                <button class="btn-icon-action" title="Remover" data-action="remove" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#dc3545';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                    <i class="fas fa-times" style="font-size:16px;"></i>
                </button>
            </div>
    `;

    console.log("✅ [adicionarVacinaNaLista] HTML criado com sucesso");
  } catch (e) {
    console.error("❌ [adicionarVacinaNaLista] ERRO ao criar innerHTML:", e);
    return;
  }

  console.log("🔗 [adicionarVacinaNaLista] Adicionando event listeners...");
  // Ligar botão de renovar
  item
    .querySelector('[data-action="renovar"]')
    .addEventListener("click", async function (e) {
      e.stopPropagation();
      try {
        abrirModalVacina();
      } catch (e) {
        console.warn("Erro ao renovar vacina", e);
      }
    });

  // Ligar botão de editar
  item
    .querySelector('[data-action="editar"]')
    .addEventListener("click", async function (e) {
      e.stopPropagation();
      try {
        // Abrir modal com dados preenchidos
        abrirModalVacinaParaEdicao({
          nome: nome,
          dataAplicacao: dataAplicacao,
          proximaDose: detalhesHtmlOuDados?.proximaDose || "",
          lote: detalhesHtmlOuDados?.lote || lote || "",
          profissional: detalhesHtmlOuDados?.profissional || profissional || "",
          observacoes: "",
          itemOriginal: item,
          registroId: registroId,
        });
      } catch (e) {
        console.warn("Erro ao editar vacina", e);
      }
    });

  // Ligar botão de remover
  item
    .querySelector('[data-action="remove"]')
    .addEventListener("click", async function (ev) {
      ev.stopPropagation();
      try {
        const confirmed = await showConfirmModal("Remover esta vacina?");
        if (!confirmed) return;

        // Remover do DOM (sub-aba)
        item.remove();

        // Encontrar e remover a vacina do array servicos pelo nome, data e lote
        if (Array.isArray(agendamentoAtual.servicos)) {
          agendamentoAtual.servicos = agendamentoAtual.servicos.filter((s) => {
            if (!s.meta || s.meta.tipoEspecial !== "vacina") return true;
            // Remove se corresponder aos mesmos dados
            const mesmoNome = s.nome === nome;
            const mesmaData = s.meta.dataAplic === dataAplicacao;
            const mesmoLote = s.meta.lote === lote;
            return !(mesmoNome && mesmaData && mesmoLote);
          });
        }

        // Remover também da lista de itens
        const itensVacina = document.querySelectorAll(".service-item");
        itensVacina.forEach((itemEl) => {
          const servicoNome =
            itemEl.querySelector(".service-name")?.textContent || "";
          if (servicoNome === nome) {
            itemEl.remove();
          }
        });

        // Persistir a remoção no banco
        await recalcAndPersistServicos();
        console.log("✅ Vacina removida do banco de dados");
      } catch (e) {
        console.warn("Erro ao processar remoção de vacina", e);
      }
    });

  console.log("📌 [adicionarVacinaNaLista] Adicionando item ao container...");
  container.appendChild(item);
  console.log("✅ [adicionarVacinaNaLista] Item adicionado com sucesso!");

  try {
    const scrollParent = getScrollParent(container);
    if (scrollParent && typeof item.scrollIntoView === "function")
      item.scrollIntoView({ behavior: "smooth", block: "end" });
  } catch (e) {}
  console.log("🎉 [adicionarVacinaNaLista] FUNÇÃO CONCLUÍDA COM SUCESSO");
}

// Extrai nome e detalhes de um conteúdo HTML salvo no prontuário e adiciona na lista
function adicionarVacinaNaListaFromConteudo(
  conteudoHtml,
  dataEmissao,
  registroId,
) {
  try {
    const tmp = document.createElement("div");
    tmp.innerHTML = conteudoHtml || "";
    const strong = tmp.querySelector("strong");
    const nome = strong
      ? strong.textContent.trim()
      : (tmp.textContent || "").split("\n")[0].trim();
    // remover a tag strong do html de detalhes
    if (strong) strong.remove();
    const detalhes = tmp.innerHTML.trim();
    adicionarVacinaNaLista(
      nome || "Vacina",
      detalhes,
      dataEmissao || "",
      registroId,
    );
  } catch (e) {
    console.warn("Falha ao parsear conteúdo da vacina:", e);
    adicionarVacinaNaLista(
      (conteudoHtml || "").slice(0, 50),
      conteudoHtml,
      dataEmissao || "",
    );
  }
}

// Remove um registro do prontuário pelo id e persiste a alteração
function removerRegistroProntuarioPorId(registroId) {
  try {
    // Preferir usar função existente que opera no container correto
    if (typeof removerRegistroProntuario === "function") {
      removerRegistroProntuario(registroId);
      return;
    }
    const container = document.getElementById("prontuarioCampos");
    if (!container) return;
    const registro = container.querySelector(
      `[data-registro-id="${registroId}"]`,
    );
    if (registro) {
      registro.remove();
      salvarProntuarioAutomatico();
    }
  } catch (e) {
    console.warn("Erro ao remover registro por id:", e);
  }
}

// Tentativa de remoção por conteúdo (fallback quando não houver registroId)
function removerRegistroProntuarioPorConteudo(
  nome,
  detalhesHtml,
  dataAplicacao,
) {
  try {
    const container = document.getElementById("prontuarioCampos");
    if (!container) return;
    const nodes = Array.from(
      container.querySelectorAll(".prontuario-registro"),
    );
    let removed = false;
    nodes.forEach((node) => {
      const text = (node.innerText || "").replace(/\s+/g, " ");
      if (
        text.includes((nome || "").trim()) &&
        (dataAplicacao ? text.includes(dataAplicacao) : true)
      ) {
        node.remove();
        removed = true;
      }
    });
    if (removed) salvarProntuarioAutomatico();
  } catch (e) {
    console.warn("Erro ao remover registro por conteudo:", e);
  }
}

// helper: escapar texto simples para evitar injection quando inserimos nome
function escapeHtmlText(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fechar modal ao clicar no overlay
document.addEventListener("click", function (e) {
  const modal = document.getElementById("modalVacina");
  if (modal && e.target.classList.contains("modal-vacina-overlay")) {
    fecharModalVacina();
  }
});

// Função para atualizar a classe CSS do status
function atualizarClasseStatus(selectElement) {
  const status = selectElement.value;

  // Remove todas as classes de status
  selectElement.className = "status-select";

  // Adiciona classe específica baseada no status
  // normalizar possíveis variantes de valor (ex: 'checkin' vs 'check-in')
  const normalized = String(status).toLowerCase().replace(/_/g, "-");
  // limpar estilos inline anteriores
  selectElement.style.background = "";
  selectElement.style.color = "";
  selectElement.style.border = "";
  selectElement.style.boxShadow = "";

  switch (normalized) {
    case "agendado":
      // outlined gray
      selectElement.style.background = "#ffffff";
      selectElement.style.color = "#6c757d";
      selectElement.style.border = "2px solid #6c757d";
      selectElement.style.boxShadow = "none";
      break;
    case "checkin":
    case "check-in":
      // filled blue
      selectElement.style.background = "#1e88e5";
      selectElement.style.color = "#ffffff";
      selectElement.style.border = "none";
      break;
    case "confirmado":
      // keep confirmed as blue variant (legacy mapping)
      selectElement.style.background = "#1e88e5";
      selectElement.style.color = "#ffffff";
      selectElement.style.border = "none";
      break;
    case "pronto":
      // light purple
      selectElement.style.background = "#f5eafd";
      selectElement.style.color = "#8e24aa";
      selectElement.style.border = "none";
      break;
    case "em-atendimento":
      // treat as orange-ish
      selectElement.style.background = "#fff4e6";
      selectElement.style.color = "#ff8a00";
      selectElement.style.border = "none";
      break;
    case "concluido":
    case "check-out":
    case "checkout":
    case "finalizado":
      // light green
      selectElement.style.background = "#edf7ee";
      selectElement.style.color = "#2e7d32";
      selectElement.style.border = "none";
      break;
    case "cancelado":
      // canceled: red solid
      selectElement.style.background = "#c12b2b";
      selectElement.style.color = "#ffffff";
      selectElement.style.border = "none";
      break;
    default:
      selectElement.style.background = "#ffffff";
      selectElement.style.color = "#333";
      selectElement.style.border = "1px solid #ddd";
  }
}

// Atualiza ícones dos serviços: relógio -> check quando status for check-out/concluido
function updateServiceIcons(status) {
  try {
    const normalized = String(status || "").toLowerCase();
    const isChecked = ["concluido", "check-out", "checkout"].includes(
      normalized,
    );
    const icons = document.querySelectorAll(".category-section .col-horario i");
    icons.forEach((i) => {
      // remover classes antigas
      i.classList.remove("fa-clock");
      i.classList.remove("fa-check");
      i.classList.remove("fa-check-circle");
      if (isChecked) {
        i.classList.add("fa-check");
        i.style.color = "#2e7d32";
      } else {
        i.classList.add("fa-clock");
        i.style.color = "";
      }
    });
  } catch (e) {
    console.warn("Erro updateServiceIcons", e);
  }
}

// Função para finalizar cobrança e fazer checkout
async function finalizarCobranca() {
  console.log(
    ">> finalizarCobranca invoked",
    agendamentoAtual && agendamentoAtual.id,
  );
  if (!agendamentoAtual) {
    alert("Nenhum agendamento carregado");
    return;
  }

  // removed confirmation dialog to open payment modal directly

  try {
    // Calcular total do agendamento (base + itens adicionados nesta sessão)
    let baseTotal =
      parseFloat(
        agendamentoAtual.__existingTotal ||
          agendamentoAtual.valor ||
          agendamentoAtual.valorTotal ||
          agendamentoAtual.total ||
          0,
      ) || 0;
    let addedTotal = 0;
    try {
      addedTotal = (agendamentoAtual._addedServicos || []).reduce((acc, it) => {
        const v =
          parseFloat(
            String(it.total || it.valor || it.unitario || 0)
              .toString()
              .replace(",", "."),
          ) || 0;
        return acc + v;
      }, 0);
    } catch (e) {
      addedTotal = 0;
    }

    const totalVenda = baseTotal + addedTotal;

    // Abrir o modal de pagamento (reutiliza o modal de nova-venda)
    try {
      // Escuta o evento único disparado quando a venda for finalizada
      document.addEventListener(
        "venda:finalizada",
        async function onVendaFinalizada(ev) {
          try {
            // Ao confirmar que a venda foi salva, marcar o agendamento como concluído
            // enviar também os dados de pagamento para persistência no agendamento
            const vendaSalva = ev && ev.detail ? ev.detail : null;
            const pagamentos =
              vendaSalva && vendaSalva.pagamentos
                ? vendaSalva.pagamentos
                : null;
            const totalPago =
              vendaSalva && vendaSalva.totalPago ? vendaSalva.totalPago : null;

            const payload = { status: "concluido" };
            if (pagamentos) payload.pagamentos = pagamentos;
            if (totalPago !== null && totalPago !== undefined)
              payload.totalPago = totalPago;

            const response = await fetch(
              `/api/agendamentos/${agendamentoAtual.id}/status`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
              },
            );

            if (response.ok) {
              console.log("✅ Check-out realizado após pagamento");

              // Recarregar do servidor para garantir que o status/pagamentos foram persistidos
              try {
                await carregarAgendamento();
                console.log("Agendamento recarregado após PATCH status");
              } catch (e) {
                console.warn("Erro recarregando agendamento após PATCH:", e);
              }

              // Atualiza o select visual
              const statusSelect = document.getElementById("statusSelect");
              if (statusSelect) {
                statusSelect.value = "concluido";
                atualizarClasseStatus(statusSelect);
              }

              // Atualiza objeto local e ícones/linhas (já atualizado por carregarAgendamento, mas garantir)
              agendamentoAtual.status = "concluido";
              try {
                atualizarLinhaListaStatus(agendamentoAtual.id, "concluido");
              } catch (e) {}
              try {
                updateServiceIcons("concluido");
              } catch (e) {}
              try {
                if (typeof updateCheckoutVisibility === "function")
                  updateCheckoutVisibility();
              } catch (e) {}
            } else {
              let errText = "Erro desconhecido";
              try {
                const errJson = await response.json();
                errText = errJson.message || errText;
              } catch (e) {}
              alert("Erro ao finalizar cobrança: " + errText);
            }
          } catch (err) {
            console.error("Erro processando venda finalizada:", err);
            alert(
              "Erro ao processar finalização do agendamento após pagamento.",
            );
          }
        },
        { once: true },
      );

      // Chamar modal com o total do agendamento
      try {
        if (typeof abrirModalPagamento === "function") {
          // Preparar seed com itens do agendamento (compatível com formatos legados)
          let seedItens = [];
          if (
            Array.isArray(agendamentoAtual.servicos) &&
            agendamentoAtual.servicos.length > 0
          ) {
            seedItens = agendamentoAtual.servicos;
          } else if (
            Array.isArray(agendamentoAtual.__existingServicosArray) &&
            agendamentoAtual.__existingServicosArray.length > 0
          ) {
            seedItens = agendamentoAtual.__existingServicosArray;
          } else {
            // tentar extrair de string legada (servico / servicosNomes)
            const nomes =
              agendamentoAtual.servicosNomes ||
              agendamentoAtual.servicos_nome ||
              agendamentoAtual.servico ||
              agendamentoAtual.__existingServicosString ||
              "";
            const totalLegado =
              parseFloat(
                agendamentoAtual.__existingTotal ||
                  agendamentoAtual.valor ||
                  agendamentoAtual.valorTotal ||
                  agendamentoAtual.total,
              ) || 0;
            if (nomes && String(nomes).trim()) {
              seedItens = [
                {
                  id: "legacy-" + (agendamentoAtual.id || Date.now()),
                  produto: { nome: String(nomes).trim(), id: null },
                  quantidade: 1,
                  valorUnitario: totalLegado,
                  totalBruto: totalLegado,
                  totalFinal: totalLegado,
                },
              ];
            }
          }

          const seed = {
            itens: seedItens || [],
            cliente:
              agendamentoAtual.cliente ||
              agendamentoAtual.clienteNome ||
              (document.getElementById("clienteNome")
                ? document.getElementById("clienteNome").textContent
                : ""),
            clienteId: agendamentoAtual.clienteId || null,
            profissional:
              agendamentoAtual.profissional ||
              agendamentoAtual.profissionalNome ||
              (document.querySelector(
                ".professional-section .professional-content",
              )
                ? document.querySelector(
                    ".professional-section .professional-content",
                  ).textContent
                : ""),
            profissionalId: agendamentoAtual.profissionalId || null,
          };
          // Marcar seed com o id do agendamento para que a venda possa ser relacionada
          if (agendamentoAtual && agendamentoAtual.id)
            seed.agendamentoId = agendamentoAtual.id;
          abrirModalPagamento(totalVenda, seed);
        } else {
          console.warn("abrirModalPagamento não disponível");
          alert("Não foi possível abrir o modal de pagamento.");
        }
      } catch (err) {
        console.error("Erro ao abrir modal de pagamento:", err);
        alert("Erro ao abrir modal de pagamento.");
      }

      // Não prosseguir aqui; o processamento do status ocorrerá quando o evento for disparado
      return;
    } catch (err) {
      console.error("Erro ao iniciar fluxo de pagamento:", err);
      alert("Erro ao iniciar fluxo de pagamento.");
      return;
    }
  } catch (error) {
    console.error("Erro ao finalizar cobrança:", error);
    alert(
      "Erro ao finalizar cobrança. Verifique sua conexão e tente novamente.",
    );
  }
}

// Função para salvar alterações do status
async function salvarStatus() {
  if (!agendamentoAtual) return;

  const statusSelect = document.getElementById("statusSelect");
  const novoStatus = statusSelect.value;

  try {
    // Atualiza o objeto local
    agendamentoAtual.status = novoStatus;

    // Tenta salvar na API
    const response = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
      credentials: "include",
    });

    if (response.ok) {
      console.log("✅ Status atualizado na API");
      // Atualiza visualmente qualquer linha da lista presente nesta página
      try {
        atualizarLinhaListaStatus(agendamentoAtual.id, novoStatus);
      } catch (e) {
        console.warn(
          "Não foi possível atualizar a linha da lista localmente",
          e,
        );
      }

      // Atualizar ícones dos serviços na página de detalhes
      try {
        updateServiceIcons(novoStatus);
      } catch (e) {
        console.warn("Erro ao atualizar ícones após salvar status", e);
      }

      // Notifica outras abas/janelas via BroadcastChannel (se disponível)
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const bc = new BroadcastChannel("agendamentos_channel");
          bc.postMessage({
            type: "status-updated",
            id: agendamentoAtual.id,
            status: novoStatus,
          });
          bc.close();
        } else if (window.opener && window.opener.postMessage) {
          window.opener.postMessage(
            {
              type: "status-updated",
              id: agendamentoAtual.id,
              status: novoStatus,
            },
            "*",
          );
        }
      } catch (e) {
        console.warn("Broadcast de status falhou", e);
      }
    } else {
      console.warn("⚠️ Erro ao salvar na API, salvando apenas no localStorage");
    }

    // Atualiza no localStorage
    atualizarLocalStorage();
    console.log(`📊 Status alterado para: ${novoStatus}`);
    try {
      if (typeof updateCheckoutVisibility === "function")
        updateCheckoutVisibility();
    } catch (e) {}
  } catch (error) {
    console.error("Erro ao salvar status:", error);
    // Atualiza apenas no localStorage em caso de erro
    atualizarLocalStorage();
    try {
      if (typeof updateCheckoutVisibility === "function")
        updateCheckoutVisibility();
    } catch (e) {}
  }
}

// Atualiza a linha da lista de agendamentos caso ela exista no DOM desta página
function atualizarLinhaListaStatus(id, status) {
  try {
    const row = document.querySelector(
      `.agendamento-row[data-agendamento-id="${id}"]`,
    );
    if (!row) return;
    const badge = row.querySelector(".status-badge");
    if (!badge) return;

    // Mapear label para exibição
    const s = String(status || "").toLowerCase();
    const classMap = {
      checkin: "check-in",
      "check-in": "check-in",
      checkout: "check-out",
      "check-out": "check-out",
      concluido: "check-out",
    };
    const statusClass = classMap[s] || s.replace(/[^a-z0-9]+/g, "-");

    const labelMap = {
      agendado: "Agendado",
      "check-in": "Check-in",
      pronto: "Pronto",
      "check-out": "Check-out",
      cancelado: "Cancelado",
    };
    const display = labelMap[statusClass] || status;

    // Remover estilos inline antigos para aplicar CSS corretamente
    badge.removeAttribute("style");

    badge.className = `status-badge status-${statusClass}`;
    badge.textContent = display;
  } catch (e) {
    console.error("Erro ao atualizar linha de lista localmente:", e);
  }
}

// TODO: Remover função - usar ApiClient.atualizarAgendamento() ao invés de localStorage
function atualizarLocalStorage() {
  console.warn(
    "⚠️ atualizarLocalStorage() DEPRECATED - usar ApiClient.atualizarAgendamento()",
  );
  return; // Função desabilitada

  /* CÓDIGO ANTIGO - REMOVER
    if (!agendamentoAtual) return;
    
    try {
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const index = agendamentos.findIndex(ag => ag.id == agendamentoAtual.id);
        
        if (index !== -1) {
            agendamentos[index] = { ...agendamentos[index], ...agendamentoAtual };
        } else {
            agendamentos.push(agendamentoAtual);
        }
        
        localStorage.setItem('agendamentos_persistidos', JSON.stringify(agendamentos));
        console.log('💾 Dados salvos no localStorage');
    } catch (error) {
        console.error('Erro ao atualizar localStorage:', error);
    }
    */
}

// Função para salvar observações
async function salvarObservacoes() {
  if (!agendamentoAtual) return;

  const observacoesText = document.getElementById("observacoes");
  if (!observacoesText) return;

  const novasObservacoes = observacoesText.value;

  try {
    // Atualiza o objeto local
    agendamentoAtual.observacoes = novasObservacoes;

    // Tenta salvar na API
    const response = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observacoes: novasObservacoes }),
      credentials: "include",
    });

    if (response.ok) {
      console.log("✅ Observações atualizadas na API");
    } else {
      console.warn("⚠️ Erro ao salvar na API, salvando apenas no localStorage");
    }

    // Atualiza no localStorage
    atualizarLocalStorage();
    console.log("📝 Observações salvas");
    try {
      const ev = new CustomEvent("agendamento-updated", {
        detail: { id: agendamentoAtual.id, observacoes: novasObservacoes },
      });
      window.dispatchEvent(ev);
    } catch (e) {
      /* ignore */
    }
  } catch (error) {
    console.error("Erro ao salvar observações:", error);
    atualizarLocalStorage();
  }
}

// Função para voltar à lista de agendamentos
function voltarParaLista() {
  window.location.href = "agendamentos-novo.html";
}

// Abre modal pequeno centralizado para adicionar item (produto/serviço)
function openAddItemModal() {
  // prevent opening when a vermifugo modal is active
  try {
    if (window._vermifugoModalOpen) return;
  } catch (e) {}
  // bloquear se agendamento já estiver finalizado / check-out
  try {
    const normalizedStatus = String(
      (agendamentoAtual && agendamentoAtual.status) || "",
    )
      .toLowerCase()
      .replace(/_/g, "-");
    if (
      ["concluido", "check-out", "checkout", "finalizado"].includes(
        normalizedStatus,
      )
    ) {
      try {
        if (typeof showNotification === "function") {
          showNotification(
            "Atendimento finalizado — não é possível adicionar itens.",
            "error",
          );
        } else {
          alert("Atendimento finalizado — não é possível adicionar itens.");
        }
      } catch (e) {
        try {
          alert("Atendimento finalizado — não é possível adicionar itens.");
        } catch (_) {}
      }
      return;
    }
  } catch (e) {}

  // evitar múltiplos modais
  if (document.getElementById("modalAdicionarItem")) return;

  const overlay = document.createElement("div");
  overlay.id = "modalAdicionarItemOverlay";
  overlay.style.cssText =
    "position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1200000;";

  const modal = document.createElement("div");
  modal.id = "modalAdicionarItem";
  modal.style.cssText =
    "width:520px;background:white;border-radius:8px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:hidden;font-family:inherit;";
  modal.innerHTML = `
        <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
            <strong>Adicionar Item</strong>
            <button id="fecharModalAdicionarItem" style="background:transparent;border:none;font-size:18px;cursor:pointer;color:#666">✕</button>
        </div>
        <div style="padding:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Produto/Serviço *</label>
            <input id="adicionarItemInput" type="text" placeholder="Digite para buscar..." style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;margin-bottom:8px;box-sizing:border-box;">
            <div id="adicionarItemResults" style="max-height:220px;overflow:auto;border:1px solid #f1f5f9;border-radius:6px;display:none;margin-bottom:8px;"></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                <button id="btnSalvarItem" class="btn" style="background:#28a745;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Salvar</button>
                <button id="btnFecharItem" class="btn" style="background:#c12b2b;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
            </div>
        </div>
    `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const input = document.getElementById("adicionarItemInput");
  const results = document.getElementById("adicionarItemResults");

  // garantir array para itens adicionados nesta sessão (não sobrescreve dados do servidor)
  if (!agendamentoAtual) agendamentoAtual = {};
  if (!Array.isArray(agendamentoAtual._addedServicos))
    agendamentoAtual._addedServicos = [];

  // Busca direto via API (não usa cache no navegador). Usa AbortController para cancelar requisições pendentes.
  let __currentSearchController = null;
  const SEARCH_API_PATH = "/api/itens?q="; // endpoint que retorna itens do banco (usar ?q= para compatibilidade)
  let __loadingTimeout = null;
  let __isComposing = false;

  async function doSearch(q) {
    const qq = (q || "").trim();
    if (!qq) {
      results.style.display = "none";
      results.innerHTML = "";
      return;
    }

    // cancela requisição anterior
    try {
      if (__currentSearchController) __currentSearchController.abort();
    } catch (e) {}
    __currentSearchController = new AbortController();
    const signal = __currentSearchController.signal;

    // não sobrescrever resultados imediatamente — evita piscar ao digitar rápido
    // exibe o indicador "Carregando..." apenas se a requisição demorar
    try {
      if (__loadingTimeout) clearTimeout(__loadingTimeout);
    } catch (e) {}
    __loadingTimeout = setTimeout(() => {
      try {
        results.innerHTML =
          '<div style="padding:10px;color:#666">Carregando...</div>';
        results.style.display = "block";
      } catch (e) {}
    }, 300);

    try {
      const url = SEARCH_API_PATH + encodeURIComponent(qq) + "&limit=20";
      const res = await fetch(url, {
        method: "GET",
        signal,
        credentials: "include",
      });
      if (!res.ok) {
        try {
          if (__loadingTimeout) clearTimeout(__loadingTimeout);
        } catch (e) {}
        results.innerHTML =
          '<div style="padding:10px;color:#666">Erro ao buscar serviços</div>';
        return;
      }
      const data = await res.json();
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : [];
      if (!items || items.length === 0) {
        results.innerHTML =
          '<div style="padding:10px;color:#666">Nenhum serviço encontrado</div>';
        return;
      }

      // renderizar via DocumentFragment para performance
      const frag = document.createDocumentFragment();
      items.slice(0, 20).forEach((it) => {
        const div = document.createElement("div");
        div.className = "resultado-add-item";
        div.setAttribute("data-id", String(it.id));
        div.style.cssText =
          "padding:10px;border-bottom:1px solid #f6f6f6;cursor:pointer;";
        const title = document.createElement("div");
        title.style.fontWeight = "400";
        title.style.color = "#222";
        title.textContent = it.nome || it.titulo || it.descricao || "";
        const meta = document.createElement("div");
        meta.style.fontSize = "13px";
        meta.style.color = "#6b7280";
        meta.style.display = "flex";
        meta.style.justifyContent = "space-between";
        meta.style.alignItems = "center";
        const preco = it.preco || it.venda || it.valor || 0;
        const leftSpan = document.createElement("div");
        leftSpan.style.flex = "1";
        leftSpan.textContent = it.tipo ? it.tipo + " • " : "";
        const priceSpan = document.createElement("div");
        priceSpan.style.fontWeight = "700";
        priceSpan.style.color = "#111";
        priceSpan.style.marginLeft = "8px";
        priceSpan.textContent = preco
          ? "R$ " + formatarMoeda(Number(String(preco).replace(",", ".")))
          : "";
        meta.appendChild(leftSpan);
        meta.appendChild(priceSpan);
        div.appendChild(title);
        div.appendChild(meta);
        div.addEventListener("click", async function () {
          input.value = it.nome || it.titulo || "";
          input.setAttribute("data-selected-id", String(it.id));
          input.setAttribute("data-selected-valor", String(preco || 0));
          // armazenar categoria/agrupamento para decisões posteriores
          const cat = (it.categoria || it.agrupamento || it.tipo || "")
            .toString()
            .toLowerCase();
          input.setAttribute("data-selected-categoria", cat);
          results.style.display = "none";
          try {
            // se o próprio objeto já indica vermífugo, abrir o modal imediatamente
            if (cat && cat.indexOf("vermifug") !== -1) {
              openAddVermifugoModal({
                id: it.id,
                nome: it.nome || it.titulo,
                valor: preco,
              });
              return;
            }
            // fallback rápido: checar nome/titulo
            const nameCheck = (it.nome || it.titulo || "")
              .toString()
              .toLowerCase();
            if (nameCheck.indexOf("vermifug") !== -1) {
              openAddVermifugoModal({
                id: it.id,
                nome: it.nome || it.titulo,
                valor: preco,
              });
              return;
            }
          } catch (e) {
            console.warn(
              "Erro ao abrir modal de vermifugo automaticamente:",
              e,
            );
          }
        });
        frag.appendChild(div);
      });
      results.innerHTML = "";
      results.appendChild(frag);
      results.style.display = "block";
      try {
        if (__loadingTimeout) clearTimeout(__loadingTimeout);
      } catch (e) {}
    } catch (err) {
      try {
        if (__loadingTimeout) clearTimeout(__loadingTimeout);
      } catch (e) {}
      if (err.name === "AbortError") return; // requisição cancelada
      console.warn("Erro na busca de itens:", err);
      results.innerHTML =
        '<div style="padding:10px;color:#666">Erro ao buscar serviços</div>';
    }
  }

  const deb = (function () {
    let t;
    return function (fn, ms) {
      clearTimeout(t);
      t = setTimeout(fn, ms || 200);
    };
  })();
  // Desativar autocomplete nativo
  try {
    input.setAttribute("autocomplete", "off");
  } catch (e) {}
  // Lidar com composição (IME) — não buscar durante composição
  let __isComposingLocal = false;
  input.addEventListener("compositionstart", function () {
    __isComposingLocal = true;
  });
  input.addEventListener("compositionend", function () {
    __isComposingLocal = false;
    deb(() => doSearch(input.value));
  });

  // Chamar busca com debounce — ignorar se em composição
  input.addEventListener("input", function (e) {
    if (input.hasAttribute("data-selected-id")) {
      input.removeAttribute("data-selected-id");
      input.removeAttribute("data-selected-valor");
    }
    if (__isComposingLocal) return;
    deb(() => doSearch(input.value));
  });

  input.addEventListener("focus", function () {
    if (input.value) deb(() => doSearch(input.value), 0);
  });

  // Salvar item (permite adicionar múltiplos)
  document
    .getElementById("btnSalvarItem")
    .addEventListener("click", async function () {
      const selId = input.getAttribute("data-selected-id");
      const nome = input.value.trim();
      const valor =
        Number(
          String(input.getAttribute("data-selected-valor") || "0").replace(
            ",",
            ".",
          ),
        ) || 0;
      const categoriaSel = (
        input.getAttribute("data-selected-categoria") || ""
      ).toLowerCase();

      // função helper para detectar 'vermifugo' em um objeto
      const looksLikeVermifugo = (obj) => {
        if (!obj) return false;
        const fields = [
          "categoria",
          "agrupamento",
          "tipo",
          "grupo",
          "group",
          "categoriaNome",
          "agrupamentoNome",
          "tags",
          "descricao",
        ];
        for (let f of fields) {
          try {
            const v = (obj[f] || (obj[f] && obj[f].nome) || "")
              .toString()
              .toLowerCase();
            if (v.indexOf("vermifug") !== -1) return true;
          } catch (e) {}
        }
        // também checar nome/titulo
        try {
          if (
            (obj.nome || obj.titulo || "")
              .toString()
              .toLowerCase()
              .indexOf("vermifug") !== -1
          )
            return true;
        } catch (e) {}
        return false;
      };

      // função helper para detectar 'antiparasitario' em um objeto
      const looksLikeAntiparasitario = (obj) => {
        if (!obj) return false;
        const fields = [
          "categoria",
          "agrupamento",
          "tipo",
          "grupo",
          "group",
          "categoriaNome",
          "agrupamentoNome",
          "tags",
          "descricao",
        ];
        for (let f of fields) {
          try {
            const v = (obj[f] || (obj[f] && obj[f].nome) || "")
              .toString()
              .toLowerCase();
            if (v.indexOf("antiparasit") !== -1) return true;
          } catch (e) {}
        }
        // também checar nome/titulo
        try {
          if (
            (obj.nome || obj.titulo || "")
              .toString()
              .toLowerCase()
              .indexOf("antiparasit") !== -1
          )
            return true;
        } catch (e) {}
        return false;
      };

      // se categoria já indica vermifugo, abrir modal
      if (categoriaSel && categoriaSel.indexOf("vermifug") !== -1) {
        openAddVermifugoModal({ id: selId, nome, valor });
        return;
      }

      // se categoria já indica antiparasitário, abrir modal
      if (categoriaSel && categoriaSel.indexOf("antiparasit") !== -1) {
        openAddAntiparasitarioModal({ id: selId, nome, valor });
        return;
      }

      // caso categoria não esteja disponível ou não caia no padrão, buscar detalhes do item por id e verificar
      if (selId) {
        try {
          const candidatePaths = [
            "/api/itens/",
            "/api/produtos/",
            "/api/items/",
            "/api/meus-itens/",
          ];
          let detail = null;
          for (const p of candidatePaths) {
            try {
              const res = await fetch(p + encodeURIComponent(selId), {
                credentials: "include",
              });
              if (!res.ok) continue;
              detail = await res.json();
              if (detail) break;
            } catch (e) {
              continue;
            }
          }
          if (looksLikeVermifugo(detail)) {
            openAddVermifugoModal({ id: selId, nome, valor });
            return;
          }
          if (looksLikeAntiparasitario(detail)) {
            openAddAntiparasitarioModal({ id: selId, nome, valor });
            return;
          }
        } catch (e) {
          console.warn(
            "Erro ao buscar detalhes do item para detectar categoria:",
            e,
          );
        }
      }
      if (!nome || (!selId && nome.length === 0)) {
        try {
          if (window.showNotification) {
            window.showNotification(
              "Por favor, selecione um serviço/produto primeiro",
              "error",
            );
          } else {
            alert("Por favor, selecione um serviço/produto primeiro");
          }
        } catch (e) {
          console.warn("notify failed", e);
        }
        return;
      }

      // criar objeto de serviço compatível com preencherDadosAgendamento
      const s = {
        id: selId || Date.now(),
        nome: nome,
        quantidade: 1,
        unitario: valor,
        valor: valor,
        total: valor,
        profissional:
          agendamentoAtual && agendamentoAtual.profissional
            ? agendamentoAtual.profissional
            : "-",
      };
      if (!agendamentoAtual) agendamentoAtual = {};
      if (!Array.isArray(agendamentoAtual._addedServicos))
        agendamentoAtual._addedServicos = [];
      agendamentoAtual._addedServicos.push(s);

      // atualizar DOM: anexar item ao final da category-section (imediato)
      appendServiceToCategory(s);
      // marcar como já presente na lista local para evitar re-append até confirmação do servidor
      try {
        if (!Array.isArray(agendamentoAtual.servicos))
          agendamentoAtual.servicos = Array.isArray(
            agendamentoAtual.__existingServicosArray,
          )
            ? agendamentoAtual.__existingServicosArray.slice()
            : [];
        // adicionar ao array local imediatamente (mantendo unicidade por id)
        const exists = (agendamentoAtual.servicos || []).some(
          (x) => String(x.id) === String(s.id),
        );
        if (!exists) agendamentoAtual.servicos.push(s);
      } catch (e) {
        console.warn(
          "Erro ao atualizar agendamentoAtual.servicos localmente",
          e,
        );
      }

      // recalcular total: soma do total já existente no agendamento (do servidor) + itens adicionados nesta sessão
      let baseTotal =
        parseFloat(
          agendamentoAtual.__existingTotal || agendamentoAtual.valor || 0,
        ) || 0;
      let addedTotal = 0;
      try {
        addedTotal = (agendamentoAtual._addedServicos || []).reduce(
          (acc, it) => {
            const v =
              parseFloat(
                String(it.total || it.valor || it.unitario || 0)
                  .toString()
                  .replace(",", "."),
              ) || 0;
            return acc + v;
          },
          0,
        );
      } catch (e) {
        addedTotal = 0;
      }
      const newTotal = baseTotal + addedTotal;

      // concatenar nomes: manter nomes já salvos no servidor e acrescentar os novos
      const existingNames = String(
        agendamentoAtual.__existingServicosString ||
          agendamentoAtual.servico ||
          "",
      ).trim();
      const addedNames = (agendamentoAtual._addedServicos || [])
        .map((x) => x.nome)
        .filter(Boolean);
      const nomesConcat = [existingNames]
        .concat(addedNames)
        .filter(Boolean)
        .join(" • ");

      // atualizar totais no DOM imediatamente
      try {
        const _tp2 =
          parseFloat((agendamentoAtual && agendamentoAtual.totalPago) || 0) ||
          0;
        document.getElementById("totalGeral").textContent =
          formatarMoeda(newTotal);
        document.getElementById("totalPendente").textContent = formatarMoeda(
          Math.max(0, newTotal - _tp2),
        );
        const amount = document.querySelector(".amount");
        if (amount) amount.textContent = formatarMoeda(newTotal);
      } catch (e) {}

      // Enviar atualização para o backend (PUT) para persistir o novo serviço e novo valor
      try {
        if (agendamentoAtual && agendamentoAtual.id) {
          // Montar array de serviços a ser enviado: pegar array existente do servidor (se houver)
          const existingServicos = Array.isArray(agendamentoAtual.servicos)
            ? agendamentoAtual.servicos.slice()
            : Array.isArray(agendamentoAtual.__existingServicosArray)
              ? agendamentoAtual.__existingServicosArray.slice()
              : [];
          const toAdd = Array.isArray(agendamentoAtual._addedServicos)
            ? agendamentoAtual._addedServicos.slice()
            : [];
          // concatenar e deduplicar por id (stringified)
          const combined = existingServicos.concat(toAdd || []);
          const seen = new Set();
          const mergedServicos = combined.filter((it) => {
            const id =
              it && it.id !== undefined && it.id !== null
                ? String(it.id)
                : JSON.stringify(it);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });

          const resp = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              servico: nomesConcat,
              servicos: mergedServicos,
              valor: newTotal,
            }),
          });
          if (resp.ok) {
            const updated = await resp.json().catch(() => null);
            // atualizar objeto local com o valor retornado
            if (updated) {
              agendamentoAtual.valor =
                updated.valor !== undefined ? updated.valor : newTotal;
              agendamentoAtual.servico = updated.servico || nomesConcat;
              agendamentoAtual.servicos = Array.isArray(updated.servicos)
                ? updated.servicos
                : mergedServicos;
              agendamentoAtual.__existingTotal = agendamentoAtual.valor;
              agendamentoAtual.__existingServicosString =
                agendamentoAtual.servico;
              // marcar itens adicionados como persistidos
              agendamentoAtual._addedServicos = [];
            } else {
              agendamentoAtual.valor = newTotal;
              agendamentoAtual.servico = nomesConcat;
              agendamentoAtual.servicos = mergedServicos;
              agendamentoAtual.__existingTotal = agendamentoAtual.valor;
              agendamentoAtual.__existingServicosString =
                agendamentoAtual.servico;
              agendamentoAtual._addedServicos = [];
            }
            try {
              if (window.showNotification)
                window.showNotification("Item adicionado e salvo", "success");
            } catch (e) {}
          } else {
            const txt = await resp.text().catch(() => null);
            try {
              if (window.showNotification)
                window.showNotification("Erro ao salvar no servidor", "error");
              else alert("Erro ao salvar no servidor");
            } catch (e) {}
            console.warn("PUT /api/agendamentos failed", resp.status, txt);
          }
        } else {
          // sem id do agendamento: apenas manter no frontend
          try {
            if (window.showNotification)
              window.showNotification(
                "Item adicionado localmente (sem agendamento salvo)",
                "warning",
              );
          } catch (e) {}
        }
      } catch (err) {
        console.error("Erro salvando item no backend", err);
        try {
          if (window.showNotification)
            window.showNotification("Erro ao salvar no servidor", "error");
          else alert("Erro ao salvar no servidor");
        } catch (e) {}
      }

      // limpar input para permitir adicionar outro
      input.value = "";
      input.removeAttribute("data-selected-id");
      input.removeAttribute("data-selected-valor");
      input.focus();
    });

  // Modal detalhado para vermífugo (tornar acessível globalmente)
  function openAddVermifugoModal(itemInfo) {
    // mark modal open to prevent other modals opening underneath
    try {
      window._vermifugoModalOpen = true;
    } catch (e) {}
    if (!itemInfo) itemInfo = {};
    if (document.getElementById("modalVermifugo")) return;
    const overlay = document.createElement("div");
    overlay.id = "modalVermifugoOverlay";
    overlay.style.cssText =
      "position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1200000;";

    const modal = document.createElement("div");
    modal.id = "modalVermifugo";
    modal.style.cssText =
      "width:820px;max-width:95%;background:white;border-radius:6px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:auto;font-family:inherit;max-height:90vh;";
    const nomeVal = itemInfo.nome || "";
    const valorVal =
      itemInfo.valor !== undefined && itemInfo.valor !== null
        ? itemInfo.valor
        : "";
    const hoje = new Date()
      .toISOString()
      .slice(0, 10)
      .split("-")
      .reverse()
      .join("/");
    modal.innerHTML = `
            <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
                <strong>Adicionar Item</strong>
                <button id="fecharModalVermifugo" style="background:transparent;border:none;font-size:18px;cursor:pointer;color:#666">✕</button>
            </div>
            <div style="padding:18px;">
                <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Item Avulso <span style="color:#c0392b">*</span></label>
                <input id="vermifugoItemNome" type="text" value="${escapeHtmlText(nomeVal)}" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:4px;margin-bottom:12px;box-sizing:border-box;">

                <div style="display:flex;gap:12px;">
                    <div style="flex:1">
                        <label>Qtd. *</label>
                        <input id="vermifugoQtd" type="text" value="1" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Unitário *</label>
                        <input id="vermifugoUnitario" type="text" value="${escapeHtmlText(String(valorVal))}" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>% Desconto</label>
                        <input id="vermifugoDesconto" type="text" value="0" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Valor Final *</label>
                        <input id="vermifugoValorFinal" type="text" value="${escapeHtmlText(String(valorVal))}" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                </div>

                <div style="margin-top:12px;display:flex;gap:12px;">
                    <div style="flex:1">
                        <label>Renovação</label>
                        <input id="vermifugoRenovacao" type="text" value="" placeholder="Ex: 30 dias" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Lote</label>
                        <input id="vermifugoLote" type="text" value="" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                </div>

                <div style="margin-top:12px;display:flex;gap:12px;">
                    <div style="flex:1">
                        <label>Dose *</label>
                        <input id="vermifugoDose" type="text" value="" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Data Aplicação *</label>
                        <input id="vermifugoDataAplic" type="date" value="${new Date().toISOString().slice(0, 10)}" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Profissional</label>
                        <input id="vermifugoProfissional" type="text" placeholder="Digite para pesquisar profissionais" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                </div>

                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
                    <button id="btnSalvarVermifugo" class="btn" style="background:#28a745;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Salvar</button>
                    <button id="btnCancelarVermifugo" class="btn" style="background:#6c757d;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
                </div>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    try {
      window.dispatchEvent(
        new CustomEvent("modalVermifugoOpened", {
          detail: { id: itemInfo && itemInfo.id },
        }),
      );
    } catch (e) {}

    // criar dropdowns para Renovação e Profissional
    const renovInput = document.getElementById("vermifugoRenovacao");
    const profInput = document.getElementById("vermifugoProfissional");
    // helper para criar dropdown container
    function createDropdown(idFor) {
      const d = document.createElement("div");
      d.className = "modal-dropdown";
      d.style.cssText =
        "position:absolute;background:#fff;border:1px solid #e6e9ee;border-radius:6px;box-shadow:0 8px 20px rgba(2,16,26,0.12);max-height:220px;overflow:auto;z-index:1300000;display:none;";
      d.id = idFor;
      document.body.appendChild(d);
      return d;
    }

    const renovDropdown = createDropdown("vermifugoRenovacaoDropdown");
    const profDropdown = createDropdown("vermifugoProfissionalDropdown");

    // posicionar dropdown próximo ao input
    function positionDropdown(inputEl, dropdownEl) {
      try {
        const r = inputEl.getBoundingClientRect();
        dropdownEl.style.minWidth = Math.max(240, r.width) + "px";
        dropdownEl.style.left = window.scrollX + r.left + "px";
        dropdownEl.style.top = window.scrollY + r.bottom + 6 + "px";
      } catch (e) {}
    }

    // popular renovDropdown com periodicidades (array de objetos ou strings)
    function showRenovDropdown(filter) {
      if (!renovInput) return;
      if (
        !Array.isArray(periodicidadesDisponiveis) ||
        periodicidadesDisponiveis.length === 0
      ) {
        renovDropdown.innerHTML =
          '<div style="padding:8px;color:#666">Nenhuma opção</div>';
        renovDropdown.style.display = "block";
        positionDropdown(renovInput, renovDropdown);
        return;
      }
      const q = (filter || "").toString().toLowerCase();
      const matches = periodicidadesDisponiveis
        .filter((it) => {
          const label =
            it && (it.descricao || it.nome || it.label || it.titulo)
              ? it.descricao || it.nome || it.label || it.titulo
              : typeof it === "string"
                ? it
                : "";
          return String(label).toLowerCase().indexOf(q) !== -1;
        })
        .slice(0, 30);
      const frag = document.createDocumentFragment();
      matches.forEach((m) => {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.style.cssText =
          "padding:8px 12px;cursor:pointer;border-bottom:1px solid #f4f6f8;";
        const label =
          m && (m.descricao || m.nome || m.label || m.titulo)
            ? m.descricao || m.nome || m.label || m.titulo
            : typeof m === "string"
              ? m
              : JSON.stringify(m);
        div.textContent = label;
        div.addEventListener("click", function () {
          renovInput.value = label;
          renovInput.setAttribute("data-selected-renovacao", label);
          // store the id when available for later submission
          if (m && (m.id || m._id))
            renovInput.setAttribute(
              "data-selected-renovacao-id",
              String(m.id || m._id),
            );
          renovDropdown.style.display = "none";
        });
        frag.appendChild(div);
      });
      renovDropdown.innerHTML = "";
      renovDropdown.appendChild(frag);
      renovDropdown.style.display = "block";
      positionDropdown(renovInput, renovDropdown);
    }

    // popular profDropdown com profissionais
    function showProfDropdown(filter) {
      if (!profInput) return;
      const q = (filter || "").toString().toLowerCase();
      const list = Array.isArray(profissionaisDisponiveis)
        ? profissionaisDisponiveis
        : [];
      const matches = list
        .filter(
          (p) =>
            ((p.nome || p.name || "") + " " + (p.apelido || ""))
              .toString()
              .toLowerCase()
              .indexOf(q) !== -1,
        )
        .slice(0, 30);
      const frag = document.createDocumentFragment();
      if (matches.length === 0) {
        const div = document.createElement("div");
        div.style.padding = "8px";
        div.style.color = "#666";
        div.textContent = "Nenhum profissional";
        frag.appendChild(div);
      }
      matches.forEach((p) => {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.style.cssText =
          "padding:8px 12px;cursor:pointer;border-bottom:1px solid #f4f6f8;";
        div.textContent = p.nome || p.name || "";
        div.addEventListener("click", function () {
          profInput.value = p.nome || p.name || "";
          profInput.setAttribute(
            "data-selected-profissional-id",
            String(p.id || p._id || ""),
          );
          profDropdown.style.display = "none";
        });
        frag.appendChild(div);
      });
      profDropdown.innerHTML = "";
      profDropdown.appendChild(frag);
      profDropdown.style.display = "block";
      positionDropdown(profInput, profDropdown);
    }

    // eventos: abrir/filtrar ao digitar
    if (renovInput) {
      renovInput.addEventListener("focus", async function () {
        if (periodicidadesDisponiveis.length === 0)
          await buscarPeriodicidades();
        showRenovDropdown(renovInput.value || "");
      });
      renovInput.addEventListener("input", function () {
        showRenovDropdown(this.value || "");
      });
      document.addEventListener("click", function (e) {
        if (!renovDropdown.contains(e.target) && e.target !== renovInput)
          renovDropdown.style.display = "none";
      });
    }

    if (profInput) {
      profInput.addEventListener("focus", async function () {
        if (profissionaisDisponiveis.length === 0) await buscarProfissionais();
        showProfDropdown(profInput.value || "");
      });
      profInput.addEventListener("input", function () {
        showProfDropdown(this.value || "");
      });
      document.addEventListener("click", function (e) {
        if (!profDropdown.contains(e.target) && e.target !== profInput)
          profDropdown.style.display = "none";
      });
    }

    document
      .getElementById("fecharModalVermifugo")
      .addEventListener("click", () => {
        try {
          window._vermifugoModalOpen = false;
        } catch (e) {}
        overlay.remove();
        // Remover modal "Adicionar Item" e overlay se existirem
        const modalAdicionarItemOverlay = document.getElementById(
          "modalAdicionarItemOverlay",
        );
        if (modalAdicionarItemOverlay) modalAdicionarItemOverlay.remove();
        const modalAdicionarItem =
          document.getElementById("modalAdicionarItem");
        if (modalAdicionarItem) modalAdicionarItem.remove();
      });
    document
      .getElementById("btnCancelarVermifugo")
      .addEventListener("click", () => {
        try {
          window._vermifugoModalOpen = false;
        } catch (e) {}
        overlay.remove();
        // Remover modal "Adicionar Item" e overlay se existirem
        const modalAdicionarItemOverlay = document.getElementById(
          "modalAdicionarItemOverlay",
        );
        if (modalAdicionarItemOverlay) modalAdicionarItemOverlay.remove();
        const modalAdicionarItem =
          document.getElementById("modalAdicionarItem");
        if (modalAdicionarItem) modalAdicionarItem.remove();
      });

    document
      .getElementById("btnSalvarVermifugo")
      .addEventListener("click", async function (e) {
        try {
          if (e && e.stopPropagation) e.stopPropagation();
        } catch (e) {}
        const nome = document.getElementById("vermifugoItemNome").value.trim();
        const qtd =
          parseFloat(
            String(
              document.getElementById("vermifugoQtd").value || "1",
            ).replace(",", "."),
          ) || 1;
        const unitario =
          parseFloat(
            String(
              document.getElementById("vermifugoUnitario").value || "0",
            ).replace(",", "."),
          ) || 0;
        const descontoPerc =
          parseFloat(
            String(
              document.getElementById("vermifugoDesconto").value || "0",
            ).replace(",", "."),
          ) || 0;
        const valorFinal =
          parseFloat(
            String(
              document.getElementById("vermifugoValorFinal").value || unitario,
            ).replace(",", "."),
          ) || unitario;
        const dose = document.getElementById("vermifugoDose").value.trim();
        const dataAplic = document.getElementById("vermifugoDataAplic").value;
        const renovInputEl = document.getElementById("vermifugoRenovacao");
        const renovacao =
          renovInputEl && renovInputEl.value ? renovInputEl.value.trim() : "";
        const renovacaoId =
          renovInputEl &&
          (renovInputEl.getAttribute("data-selected-renovacao-id") ||
            renovInputEl.getAttribute("data-selected-renovacao-id"))
            ? renovInputEl.getAttribute("data-selected-renovacao-id") || ""
            : "";
        const lote = document.getElementById("vermifugoLote").value.trim();
        const profissional =
          document.getElementById("vermifugoProfissional").value.trim() ||
          (agendamentoAtual && agendamentoAtual.profissional
            ? agendamentoAtual.profissional
            : "-");

        // criar objeto compatível com o fluxo existente
        const s = {
          id: Date.now() + Math.random(),
          nome: nome,
          quantidade: qtd,
          unitario: unitario,
          valor: valorFinal,
          total: qtd * valorFinal,
          profissional: profissional,
        };
        // adicionar metadados (dose, lote, data)
        s.meta = {
          dose,
          lote,
          dataAplic,
          renovacao,
          renovacaoId,
          tipoEspecial: "vermifugo",
        };

        // detectar se estamos em modo de edição (modal marcado previamente)
        const modalV = document.getElementById("modalVermifugo");
        const isEditV =
          modalV &&
          modalV.dataset &&
          String(modalV.dataset.editando) === "true";

        if (!agendamentoAtual) agendamentoAtual = {};

        if (isEditV) {
          const servicoId =
            modalV.dataset && modalV.dataset.servicoId
              ? String(modalV.dataset.servicoId)
              : "";
          if (servicoId) s.id = servicoId;

          // substituir item em agendamentoAtual.servicos ou em _addedServicos
          if (!Array.isArray(agendamentoAtual.servicos))
            agendamentoAtual.servicos = Array.isArray(
              agendamentoAtual.__existingServicosArray,
            )
              ? agendamentoAtual.__existingServicosArray.slice()
              : [];
          let replaced = false;
          if (Array.isArray(agendamentoAtual.servicos)) {
            agendamentoAtual.servicos = agendamentoAtual.servicos.map((it) => {
              if (String(it && it.id) === String(servicoId)) {
                replaced = true;
                return s;
              }
              return it;
            });
          }
          if (!replaced && Array.isArray(agendamentoAtual._addedServicos)) {
            agendamentoAtual._addedServicos =
              agendamentoAtual._addedServicos.map((it) =>
                String(it && it.id) === String(servicoId) ? s : it,
              );
          }

          // atualizar DOM: remover elementos antigos com esse id e re-renderizar o item atualizado
          try {
            const olds = document.querySelectorAll(
              `[data-service-id="${s.id}"]`,
            );
            olds.forEach((el) => el.remove());
            appendServiceToCategory(s);
          } catch (e) {
            console.warn("Erro ao atualizar UI do vermifugo editado", e);
          }
        } else {
          if (!Array.isArray(agendamentoAtual._addedServicos))
            agendamentoAtual._addedServicos = [];
          agendamentoAtual._addedServicos.push(s);

          // anexar no DOM e persistir usando o mesmo fluxo que já existe
          try {
            appendServiceToCategory(s);
          } catch (e) {
            console.warn("Erro anexando serviço na UI", e);
          }
        }

        // atualizar totais (reutiliza lógica do handler acima)
        try {
          document.getElementById("totalGeral").textContent = formatarMoeda(
            (parseFloat(agendamentoAtual.valor || 0) || 0) +
              (agendamentoAtual._addedServicos || []).reduce(
                (a, b) => a + (parseFloat(b.total || b.valor || 0) || 0),
                0,
              ),
          );
        } catch (e) {}

        // Persistir imediatamente (se houver agendamentoAtual.id) e tratar resposta
        try {
          if (agendamentoAtual && agendamentoAtual.id) {
            const existingServicos = Array.isArray(agendamentoAtual.servicos)
              ? agendamentoAtual.servicos.slice()
              : Array.isArray(agendamentoAtual.__existingServicosArray)
                ? agendamentoAtual.__existingServicosArray.slice()
                : [];
            const toAdd = Array.isArray(agendamentoAtual._addedServicos)
              ? agendamentoAtual._addedServicos.slice()
              : [];
            const combined = existingServicos.concat(toAdd || []);
            const seen = new Set();
            const mergedServicos = combined.filter((it) => {
              const id =
                it && it.id !== undefined && it.id !== null
                  ? String(it.id)
                  : JSON.stringify(it);
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
            const nomesConcat = [
              String(
                agendamentoAtual.__existingServicosString ||
                  agendamentoAtual.servico ||
                  "",
              ),
            ]
              .concat(
                (agendamentoAtual._addedServicos || []).map((x) => x.nome),
              )
              .filter(Boolean)
              .join(" • ");
            const payload = {
              servico: nomesConcat,
              servicos: mergedServicos,
              valor:
                parseFloat(agendamentoAtual.valor || 0) +
                (agendamentoAtual._addedServicos || []).reduce(
                  (a, b) => a + (parseFloat(b.total || b.valor || 0) || 0),
                  0,
                ),
            };
            console.log(
              "[vermifugo] Persistindo agendamento id=",
              agendamentoAtual && agendamentoAtual.id,
              "payload=",
              payload,
            );
            const resp = await fetch(
              `/api/agendamentos/${agendamentoAtual.id}`,
              {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            );
            if (resp.ok) {
              const updated = await resp.json().catch(() => null);
              if (updated) {
                agendamentoAtual.valor =
                  updated.valor !== undefined ? updated.valor : payload.valor;
                agendamentoAtual.servico = updated.servico || nomesConcat;
                agendamentoAtual.servicos = Array.isArray(updated.servicos)
                  ? updated.servicos
                  : mergedServicos;
                agendamentoAtual.__existingTotal = agendamentoAtual.valor;
                agendamentoAtual.__existingServicosString =
                  agendamentoAtual.servico;
                // marcar itens adicionados como persistidos
                agendamentoAtual._addedServicos = [];
              } else {
                agendamentoAtual.valor = payload.valor;
                agendamentoAtual.servico = nomesConcat;
                agendamentoAtual.servicos = mergedServicos;
                agendamentoAtual.__existingTotal = agendamentoAtual.valor;
                agendamentoAtual.__existingServicosString =
                  agendamentoAtual.servico;
                agendamentoAtual._addedServicos = [];
              }
              // Verificar estado no servidor imediatamente (GET) e logar
              try {
                const check = await fetch(
                  `/api/agendamentos/${agendamentoAtual.id}`,
                  { credentials: "include" },
                );
                const checkJson = await check.json().catch(() => null);
                console.log(
                  "[vermifugo] GET after PUT, server returned:",
                  check.status,
                  checkJson,
                );
              } catch (e) {
                console.warn("[vermifugo] erro ao GET após PUT", e);
              }
            } else {
              const txt = await resp.text().catch(() => null);
              console.warn(
                "PUT /api/agendamentos failed when persisting vermifugo",
                resp.status,
                txt,
              );
              console.log("[vermifugo] server response (text):", txt);
            }
          }
        } catch (e) {
          console.warn("Erro ao persistir vermifugo", e);
        }

        // ensure any small 'Adicionar Item' modal is closed (avoid it re-opening)
        try {
          const mOverlay = document.getElementById("modalAdicionarItemOverlay");
          if (mOverlay) mOverlay.remove();
          const mModal = document.getElementById("modalAdicionarItem");
          if (mModal) mModal.remove();
        } catch (e) {}
        try {
          window._vermifugoModalOpen = false;
        } catch (e) {}
        overlay.remove();
      });
  }

  // Expor função real e flush da fila (se o wrapper já enfileirou chamadas)
  window.__realOpenAddVermifugoModal = openAddVermifugoModal;
  window.openAddVermifugoModal = openAddVermifugoModal;
  window._openAddVermifugoModal = openAddVermifugoModal; // Alias para uso interno
  console.log("✅ openAddVermifugoModal definida e exposta globalmente");
  if (
    Array.isArray(window._openAddVermifugoModalQueue) &&
    window._openAddVermifugoModalQueue.length
  ) {
    console.log(
      "🔁 Flush da fila de openAddVermifugoModal:",
      window._openAddVermifugoModalQueue.length,
    );
    window._openAddVermifugoModalQueue.forEach((args) => {
      try {
        openAddVermifugoModal(args);
      } catch (e) {
        console.warn("Erro ao processar fila openAddVermifugoModal", e);
      }
    });
    window._openAddVermifugoModalQueue = [];
  }

  // Modal de edição de vermífugo
  function openEditVermifugoModal(servicoData, itemElement) {
    // Abrir modal de adição com dados preenchidos
    openAddVermifugoModal({
      nome: servicoData.nome,
      valor: servicoData.unitario || servicoData.valor,
    });

    // Preencher campos após modal abrir
    setTimeout(() => {
      const nomeInput = document.getElementById("vermifugoItemNome");
      const qtdInput = document.getElementById("vermifugoQtd");
      const unitInput = document.getElementById("vermifugoUnitario");
      const valorInput = document.getElementById("vermifugoValorFinal");
      const doseInput = document.getElementById("vermifugoDose");
      const dataInput = document.getElementById("vermifugoDataAplic");
      const loteInput = document.getElementById("vermifugoLote");
      const renovInput = document.getElementById("vermifugoRenovacao");
      const profInput = document.getElementById("vermifugoProfissional");

      if (nomeInput) nomeInput.value = servicoData.nome || "";
      if (qtdInput) qtdInput.value = servicoData.quantidade || "1";
      if (unitInput)
        unitInput.value = servicoData.unitario || servicoData.valor || "0";
      if (valorInput)
        valorInput.value = servicoData.total || servicoData.valor || "0";
      if (doseInput)
        doseInput.value = (servicoData.meta && servicoData.meta.dose) || "";
      if (dataInput)
        dataInput.value =
          (servicoData.meta && servicoData.meta.dataAplic) || "";
      if (loteInput)
        loteInput.value = (servicoData.meta && servicoData.meta.lote) || "";
      if (renovInput)
        renovInput.value =
          (servicoData.meta && servicoData.meta.renovacao) || "";
      if (profInput) profInput.value = servicoData.profissional || "";

      // Marcar como edição para remover item antigo ao salvar
      const modal = document.getElementById("modalVermifugo");
      if (modal) {
        modal.dataset.editando = "true";
        modal.dataset.servicoId = String(servicoData.id || "");
      }
    }, 200);
  }

  // Modal detalhado para antiparasitário (similar ao vermífugo, mas com tipoEspecial: 'antiparasitario')
  function openAddAntiparasitarioModal(itemInfo) {
    // mark modal open to prevent other modals opening underneath
    try {
      window._antiparasitarioModalOpen = true;
    } catch (e) {}
    if (!itemInfo) itemInfo = {};
    if (document.getElementById("modalAntiparasitario")) return;
    const overlay = document.createElement("div");
    overlay.id = "modalAntiparasitarioOverlay";
    overlay.style.cssText =
      "position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1200000;";

    const modal = document.createElement("div");
    modal.id = "modalAntiparasitario";
    modal.style.cssText =
      "width:820px;max-width:95%;background:white;border-radius:6px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:auto;font-family:inherit;max-height:90vh;";
    const nomeVal = itemInfo.nome || "";
    const valorVal =
      itemInfo.valor !== undefined && itemInfo.valor !== null
        ? itemInfo.valor
        : "";
    modal.innerHTML = `
            <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
                <strong>Adicionar Antiparasitário</strong>
                <button id="fecharModalAntiparasitario" style="background:transparent;border:none;font-size:18px;cursor:pointer;color:#666">✕</button>
            </div>
            <div style="padding:18px;">
                <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Item Avulso <span style="color:#c0392b">*</span></label>
                <input id="antiparasitarioItemNome" type="text" value="${escapeHtmlText(nomeVal)}" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:4px;margin-bottom:12px;box-sizing:border-box;">

                <div style="display:flex;gap:12px;">
                    <div style="flex:1">
                        <label>Qtd. *</label>
                        <input id="antiparasitarioQtd" type="text" value="1" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Unitário *</label>
                        <input id="antiparasitarioUnitario" type="text" value="${escapeHtmlText(String(valorVal))}" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>% Desconto</label>
                        <input id="antiparasitarioDesconto" type="text" value="0" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Valor Final *</label>
                        <input id="antiparasitarioValorFinal" type="text" value="${escapeHtmlText(String(valorVal))}" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                </div>

                <div style="margin-top:12px;display:flex;gap:12px;">
                    <div style="flex:1">
                        <label>Renovação</label>
                        <input id="antiparasitarioRenovacao" type="text" value="" placeholder="Ex: 30 dias" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Lote</label>
                        <input id="antiparasitarioLote" type="text" value="" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                </div>

                <div style="margin-top:12px;display:flex;gap:12px;">
                    <div style="flex:1">
                        <label>Dose *</label>
                        <input id="antiparasitarioDose" type="text" value="" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Data Aplicação *</label>
                        <input id="antiparasitarioDataAplic" type="date" value="${new Date().toISOString().slice(0, 10)}" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label>Profissional</label>
                        <input id="antiparasitarioProfissional" type="text" placeholder="Digite para pesquisar profissionais" style="width:100%;padding:8px;border:1px solid #dfe6ef;border-radius:4px;">
                    </div>
                </div>

                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
                    <button id="btnSalvarAntiparasitario" class="btn" style="background:#e74c3c;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Salvar</button>
                    <button id="btnCancelarAntiparasitario" class="btn" style="background:#6c757d;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
                </div>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    try {
      window.dispatchEvent(
        new CustomEvent("modalAntiparasitarioOpened", {
          detail: { id: itemInfo && itemInfo.id },
        }),
      );
    } catch (e) {}

    // criar dropdowns para Renovação e Profissional
    const renovInput = document.getElementById("antiparasitarioRenovacao");
    const profInput = document.getElementById("antiparasitarioProfissional");

    // helper para criar dropdown container
    function createDropdown(idFor) {
      const d = document.createElement("div");
      d.className = "modal-dropdown";
      d.style.cssText =
        "position:absolute;background:#fff;border:1px solid #e6e9ee;border-radius:6px;box-shadow:0 8px 20px rgba(2,16,26,0.12);max-height:220px;overflow:auto;z-index:1300000;display:none;";
      d.id = idFor;
      document.body.appendChild(d);
      return d;
    }

    const renovDropdown = createDropdown("antiparasitarioRenovacaoDropdown");
    const profDropdown = createDropdown("antiparasitarioProfissionalDropdown");

    // posicionar dropdown próximo ao input
    function positionDropdown(inputEl, dropdownEl) {
      try {
        const r = inputEl.getBoundingClientRect();
        dropdownEl.style.minWidth = Math.max(240, r.width) + "px";
        dropdownEl.style.left = window.scrollX + r.left + "px";
        dropdownEl.style.top = window.scrollY + r.bottom + 6 + "px";
      } catch (e) {}
    }

    // popular renovDropdown com periodicidades
    function showRenovDropdown(filter) {
      if (!renovInput) return;
      if (
        !Array.isArray(periodicidadesDisponiveis) ||
        periodicidadesDisponiveis.length === 0
      ) {
        renovDropdown.innerHTML =
          '<div style="padding:8px;color:#666">Nenhuma opção</div>';
        renovDropdown.style.display = "block";
        positionDropdown(renovInput, renovDropdown);
        return;
      }
      const q = (filter || "").toString().toLowerCase();
      const matches = periodicidadesDisponiveis
        .filter((it) => {
          const label =
            it && (it.descricao || it.nome || it.label || it.titulo)
              ? it.descricao || it.nome || it.label || it.titulo
              : typeof it === "string"
                ? it
                : "";
          return String(label).toLowerCase().indexOf(q) !== -1;
        })
        .slice(0, 30);
      const frag = document.createDocumentFragment();
      matches.forEach((m) => {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.style.cssText =
          "padding:8px 12px;cursor:pointer;border-bottom:1px solid #f4f6f8;";
        const label =
          m && (m.descricao || m.nome || m.label || m.titulo)
            ? m.descricao || m.nome || m.label || m.titulo
            : typeof m === "string"
              ? m
              : JSON.stringify(m);
        div.textContent = label;
        div.addEventListener("click", function () {
          renovInput.value = label;
          renovInput.setAttribute("data-selected-renovacao", label);
          if (m && (m.id || m._id))
            renovInput.setAttribute(
              "data-selected-renovacao-id",
              String(m.id || m._id),
            );
          renovDropdown.style.display = "none";
        });
        frag.appendChild(div);
      });
      renovDropdown.innerHTML = "";
      renovDropdown.appendChild(frag);
      renovDropdown.style.display = "block";
      positionDropdown(renovInput, renovDropdown);
    }

    // popular profDropdown com profissionais
    function showProfDropdown(filter) {
      if (!profInput) return;
      const q = (filter || "").toString().toLowerCase();
      const list = Array.isArray(profissionaisDisponiveis)
        ? profissionaisDisponiveis
        : [];
      const matches = list
        .filter(
          (p) =>
            ((p.nome || p.name || "") + " " + (p.apelido || ""))
              .toString()
              .toLowerCase()
              .indexOf(q) !== -1,
        )
        .slice(0, 30);
      const frag = document.createDocumentFragment();
      if (matches.length === 0) {
        const div = document.createElement("div");
        div.style.padding = "8px";
        div.style.color = "#666";
        div.textContent = "Nenhum profissional";
        frag.appendChild(div);
      }
      matches.forEach((p) => {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.style.cssText =
          "padding:8px 12px;cursor:pointer;border-bottom:1px solid #f4f6f8;";
        div.textContent = p.nome || p.name || "";
        div.addEventListener("click", function () {
          profInput.value = p.nome || p.name || "";
          profInput.setAttribute(
            "data-selected-profissional-id",
            String(p.id || p._id || ""),
          );
          profDropdown.style.display = "none";
        });
        frag.appendChild(div);
      });
      profDropdown.innerHTML = "";
      profDropdown.appendChild(frag);
      profDropdown.style.display = "block";
      positionDropdown(profInput, profDropdown);
    }

    // eventos: abrir/filtrar ao digitar
    if (renovInput) {
      renovInput.addEventListener("focus", async function () {
        if (periodicidadesDisponiveis.length === 0)
          await buscarPeriodicidades();
        showRenovDropdown(renovInput.value || "");
      });
      renovInput.addEventListener("input", function () {
        showRenovDropdown(this.value || "");
      });
      document.addEventListener("click", function (e) {
        if (!renovDropdown.contains(e.target) && e.target !== renovInput)
          renovDropdown.style.display = "none";
      });
    }

    if (profInput) {
      profInput.addEventListener("focus", async function () {
        if (profissionaisDisponiveis.length === 0) await buscarProfissionais();
        showProfDropdown(profInput.value || "");
      });
      profInput.addEventListener("input", function () {
        showProfDropdown(this.value || "");
      });
      document.addEventListener("click", function (e) {
        if (!profDropdown.contains(e.target) && e.target !== profInput)
          profDropdown.style.display = "none";
      });
    }

    document
      .getElementById("fecharModalAntiparasitario")
      .addEventListener("click", () => {
        try {
          window._antiparasitarioModalOpen = false;
        } catch (e) {}
        overlay.remove();
        renovDropdown.remove();
        profDropdown.remove();
        // Remover modal "Adicionar Item" e overlay se existirem
        const modalAdicionarItemOverlay = document.getElementById(
          "modalAdicionarItemOverlay",
        );
        if (modalAdicionarItemOverlay) modalAdicionarItemOverlay.remove();
        const modalAdicionarItem =
          document.getElementById("modalAdicionarItem");
        if (modalAdicionarItem) modalAdicionarItem.remove();
      });
    document
      .getElementById("btnCancelarAntiparasitario")
      .addEventListener("click", () => {
        try {
          window._antiparasitarioModalOpen = false;
        } catch (e) {}
        overlay.remove();
        renovDropdown.remove();
        profDropdown.remove();
        // Remover modal "Adicionar Item" e overlay se existirem
        const modalAdicionarItemOverlay = document.getElementById(
          "modalAdicionarItemOverlay",
        );
        if (modalAdicionarItemOverlay) modalAdicionarItemOverlay.remove();
        const modalAdicionarItem =
          document.getElementById("modalAdicionarItem");
        if (modalAdicionarItem) modalAdicionarItem.remove();
      });

    document
      .getElementById("btnSalvarAntiparasitario")
      .addEventListener("click", async function (e) {
        try {
          if (e && e.stopPropagation) e.stopPropagation();
        } catch (e) {}
        const nome = document
          .getElementById("antiparasitarioItemNome")
          .value.trim();
        const qtd =
          parseFloat(
            String(
              document.getElementById("antiparasitarioQtd").value || "1",
            ).replace(",", "."),
          ) || 1;
        const unitario =
          parseFloat(
            String(
              document.getElementById("antiparasitarioUnitario").value || "0",
            ).replace(",", "."),
          ) || 0;
        const valorFinal =
          parseFloat(
            String(
              document.getElementById("antiparasitarioValorFinal").value ||
                unitario,
            ).replace(",", "."),
          ) || unitario;
        const dose = document
          .getElementById("antiparasitarioDose")
          .value.trim();
        const dataAplic = document.getElementById(
          "antiparasitarioDataAplic",
        ).value;
        const renovacao = document
          .getElementById("antiparasitarioRenovacao")
          .value.trim();
        const lote = document
          .getElementById("antiparasitarioLote")
          .value.trim();
        const profissional =
          document.getElementById("antiparasitarioProfissional").value.trim() ||
          (agendamentoAtual && agendamentoAtual.profissional
            ? agendamentoAtual.profissional
            : "-");

        // criar objeto compatível com o fluxo existente
        const s = {
          id: Date.now() + Math.random(),
          nome: nome,
          quantidade: qtd,
          unitario: unitario,
          valor: valorFinal,
          total: qtd * valorFinal,
          profissional: profissional,
        };
        s.meta = {
          dose,
          lote,
          dataAplic,
          renovacao,
          tipoEspecial: "antiparasitario",
        };

        // detectar se estamos em modo de edição (modal marcado previamente)
        const modalA = document.getElementById("modalAntiparasitario");
        const isEditA =
          modalA &&
          modalA.dataset &&
          String(modalA.dataset.editando) === "true";

        if (!agendamentoAtual) agendamentoAtual = {};

        if (isEditA) {
          const servicoId =
            modalA.dataset && modalA.dataset.servicoId
              ? String(modalA.dataset.servicoId)
              : "";
          if (servicoId) s.id = servicoId;

          if (!Array.isArray(agendamentoAtual.servicos))
            agendamentoAtual.servicos = Array.isArray(
              agendamentoAtual.__existingServicosArray,
            )
              ? agendamentoAtual.__existingServicosArray.slice()
              : [];
          let replaced = false;
          if (Array.isArray(agendamentoAtual.servicos)) {
            agendamentoAtual.servicos = agendamentoAtual.servicos.map((it) => {
              if (String(it && it.id) === String(servicoId)) {
                replaced = true;
                return s;
              }
              return it;
            });
          }
          if (!replaced && Array.isArray(agendamentoAtual._addedServicos)) {
            agendamentoAtual._addedServicos =
              agendamentoAtual._addedServicos.map((it) =>
                String(it && it.id) === String(servicoId) ? s : it,
              );
          }

          // atualizar DOM: remover elementos antigos com esse id e re-renderizar o item atualizado
          try {
            const olds = document.querySelectorAll(
              `[data-service-id="${s.id}"]`,
            );
            olds.forEach((el) => el.remove());
            appendServiceToCategory(s);
          } catch (e) {
            console.warn("Erro ao atualizar UI do antiparasitario editado", e);
          }
        } else {
          if (!Array.isArray(agendamentoAtual._addedServicos))
            agendamentoAtual._addedServicos = [];
          agendamentoAtual._addedServicos.push(s);

          try {
            appendServiceToCategory(s);
          } catch (e) {
            console.warn("Erro anexando antiparasitário na UI", e);
          }
        }

        // Persistir imediatamente
        try {
          if (agendamentoAtual && agendamentoAtual.id) {
            const existingServicos = Array.isArray(agendamentoAtual.servicos)
              ? agendamentoAtual.servicos.slice()
              : Array.isArray(agendamentoAtual.__existingServicosArray)
                ? agendamentoAtual.__existingServicosArray.slice()
                : [];
            const toAdd = Array.isArray(agendamentoAtual._addedServicos)
              ? agendamentoAtual._addedServicos.slice()
              : [];
            const combined = existingServicos.concat(toAdd || []);
            const seen = new Set();
            const mergedServicos = combined.filter((it) => {
              const id =
                it && it.id !== undefined && it.id !== null
                  ? String(it.id)
                  : JSON.stringify(it);
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
            const nomesConcat = [
              String(
                agendamentoAtual.__existingServicosString ||
                  agendamentoAtual.servico ||
                  "",
              ),
            ]
              .concat(
                (agendamentoAtual._addedServicos || []).map((x) => x.nome),
              )
              .filter(Boolean)
              .join(" • ");
            const payload = {
              servico: nomesConcat,
              servicos: mergedServicos,
              valor:
                parseFloat(agendamentoAtual.valor || 0) +
                (agendamentoAtual._addedServicos || []).reduce(
                  (a, b) => a + (parseFloat(b.total || b.valor || 0) || 0),
                  0,
                ),
            };

            const resp = await fetch(
              `/api/agendamentos/${agendamentoAtual.id}`,
              {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            );
            if (resp.ok) {
              const updated = await resp.json().catch(() => null);
              if (updated) {
                agendamentoAtual.valor =
                  updated.valor !== undefined ? updated.valor : payload.valor;
                agendamentoAtual.servico = updated.servico || nomesConcat;
                agendamentoAtual.servicos = Array.isArray(updated.servicos)
                  ? updated.servicos
                  : mergedServicos;
                agendamentoAtual.__existingTotal = agendamentoAtual.valor;
                agendamentoAtual.__existingServicosString =
                  agendamentoAtual.servico;
                agendamentoAtual._addedServicos = [];
              } else {
                agendamentoAtual.valor = payload.valor;
                agendamentoAtual.servico = nomesConcat;
                agendamentoAtual.servicos = mergedServicos;
                agendamentoAtual.__existingTotal = agendamentoAtual.valor;
                agendamentoAtual.__existingServicosString =
                  agendamentoAtual.servico;
                agendamentoAtual._addedServicos = [];
              }
            }
          }
        } catch (e) {
          console.warn("Erro ao persistir antiparasitário", e);
        }

        // Fechar todos os modais abertos
        try {
          const mOverlay = document.getElementById("modalAdicionarItemOverlay");
          if (mOverlay) mOverlay.remove();
          const mModal = document.getElementById("modalAdicionarItem");
          if (mModal) mModal.remove();
        } catch (e) {}

        try {
          window._antiparasitarioModalOpen = false;
        } catch (e) {}
        overlay.remove();
        renovDropdown.remove();
        profDropdown.remove();
      });
  }

  // Expor função real e flush da fila (se o wrapper já enfileirou chamadas)
  window.__realOpenAddAntiparasitarioModal = openAddAntiparasitarioModal;
  window.openAddAntiparasitarioModal = openAddAntiparasitarioModal;
  window._openAddAntiparasitarioModal = openAddAntiparasitarioModal; // Alias para uso interno
  console.log("✅ openAddAntiparasitarioModal definida e exposta globalmente");
  if (
    Array.isArray(window._openAddAntiparasitarioModalQueue) &&
    window._openAddAntiparasitarioModalQueue.length
  ) {
    console.log(
      "🔁 Flush da fila de openAddAntiparasitarioModal:",
      window._openAddAntiparasitarioModalQueue.length,
    );
    window._openAddAntiparasitarioModalQueue.forEach((args) => {
      try {
        openAddAntiparasitarioModal(args);
      } catch (e) {
        console.warn("Erro ao processar fila openAddAntiparasitarioModal", e);
      }
    });
    window._openAddAntiparasitarioModalQueue = [];
  }

  // Função para editar antiparasitário existente
  function openEditAntiparasitarioModal(servico, itemElement) {
    // Abrir modal de adição com dados preenchidos
    openAddAntiparasitarioModal({
      nome: servico.nome,
      valor: servico.unitario || servico.valor,
    });

    // Preencher campos após modal abrir
    setTimeout(() => {
      const doseInput = document.getElementById("antiparasitarioDose");
      const dataInput = document.getElementById("antiparasitarioDataAplic");
      const loteInput = document.getElementById("antiparasitarioLote");
      const renovInput = document.getElementById("antiparasitarioRenovacao");
      const profInput = document.getElementById("antiparasitarioProfissional");
      const qtdInput = document.getElementById("antiparasitarioQtd");

      if (doseInput)
        doseInput.value = (servico.meta && servico.meta.dose) || "";
      if (dataInput)
        dataInput.value = (servico.meta && servico.meta.dataAplic) || "";
      if (loteInput)
        loteInput.value = (servico.meta && servico.meta.lote) || "";
      if (renovInput)
        renovInput.value = (servico.meta && servico.meta.renovacao) || "";
      if (profInput) profInput.value = servico.profissional || "";
      if (qtdInput) qtdInput.value = servico.quantidade || "1";

      // Marcar como edição para remover item antigo ao salvar
      const modal = document.getElementById("modalAntiparasitario");
      if (modal) {
        modal.dataset.editando = "true";
        modal.dataset.servicoId = String(servico.id || "");
      }
    }, 200);
  }

  document
    .getElementById("btnFecharItem")
    .addEventListener("click", closeModal);
  document
    .getElementById("fecharModalAdicionarItem")
    .addEventListener("click", closeModal);

  function closeModal() {
    try {
      overlay.remove();
    } catch (e) {}
  }
}

function appendServiceToCategory(s) {
  try {
    // Se for vermifugo, vacina ou antiparasitário, renderizar tanto na sub-aba específica quanto na lista de itens
    const isVermifugo = s && s.meta && s.meta.tipoEspecial === "vermifugo";
    const isVacina = s && s.meta && s.meta.tipoEspecial === "vacina";
    const isAntiparasitario =
      s && s.meta && s.meta.tipoEspecial === "antiparasitario";
    const isItemEspecial = isVermifugo || isVacina || isAntiparasitario;

    if (isVermifugo) {
      const container = document.querySelector(
        "#vermifugosSubContent .historico-list",
      );
      if (!container) return;

      // remover estado vazio
      const empty = container.querySelector(".empty-state");
      if (empty) empty.remove();

      const item = document.createElement("div");
      item.className = "vermifugo-item";
      item.setAttribute("data-service-id", String(s.id || ""));

      const nome = s.nome || "";
      const dataAplic =
        s.meta && s.meta.dataAplic ? s.meta.dataAplic : s.data || "";
      const dose = s.meta && s.meta.dose ? s.meta.dose : "";
      const profissional = s.profissional || "";
      const lote = s.meta && s.meta.lote ? s.meta.lote : "";
      const renovacao = s.meta && s.meta.renovacao ? s.meta.renovacao : "";

      // Formatar data de aplicação para exibição (DD/MM/YYYY)
      let dataAplicFormatada = dataAplic || "-";
      try {
        if (dataAplic && dataAplic.includes("-")) {
          const [y, m, d] = dataAplic.split("-");
          dataAplicFormatada = `${d}/${m}/${y}`;
        }
      } catch (e) {}

      // Calcular data de renovação se houver período informado
      let renovacaoTexto = renovacao || "";
      let dataRenovacao = "";
      try {
        if (renovacao && dataAplic) {
          const dias = parseInt(renovacao.match(/\d+/)?.[0] || "0");
          if (dias > 0) {
            const dataBase = new Date(dataAplic + "T12:00:00");
            dataBase.setDate(dataBase.getDate() + dias);
            const dd = String(dataBase.getDate()).padStart(2, "0");
            const mm = String(dataBase.getMonth() + 1).padStart(2, "0");
            const yyyy = dataBase.getFullYear();
            dataRenovacao = `${dd}/${mm}/${yyyy}`;
            renovacaoTexto = `Renovar dia ${dataRenovacao} (${renovacao})`;
          }
        }
      } catch (e) {}

      item.innerHTML = `
                <div style="display:flex;align-items:stretch;justify-content:space-between;padding:16px;background:#fff;border:1px solid #e6e9ee;border-radius:8px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:all 0.2s ease;width:100%;box-sizing:border-box;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">
                    <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:linear-gradient(135deg, #28a745 0%, #20c997 100%);border-radius:8px;flex-shrink:0;color:#fff;font-weight:700;font-size:14px;">
                            <i class="fas fa-capsules" style="font-size:18px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;color:#1a1d29;font-size:15px;margin-bottom:6px;line-height:1.3;">${escapeHtmlUnsafe(nome)}</div>
                            ${renovacaoTexto ? `<div style="font-size:13px;color:#28a745;font-weight:600;margin-bottom:4px;"><i class="fas fa-sync-alt" style="font-size:11px;margin-right:4px;"></i>${escapeHtmlUnsafe(renovacaoTexto)}</div>` : ""}
                            <div style="font-size:13px;color:#5a6c7d;margin-bottom:2px;">Dose: ${escapeHtmlUnsafe(dose || "-")} • Aplicada em: ${escapeHtmlUnsafe(dataAplicFormatada)}</div>
                            <div style="font-size:12px;color:#7d8a99;">Profissional: ${escapeHtmlUnsafe(profissional || "-")}${lote ? " • Lote: " + escapeHtmlUnsafe(lote) : ""}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;margin-left:12px;flex-shrink:0;">
                        <button class="btn-icon-action" title="Renovar" data-action="renovar" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#28a745';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                            <i class="fas fa-sync-alt" style="font-size:14px;"></i>
                        </button>
                        <button class="btn-icon-action" title="Editar" data-action="editar" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#007bff';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                            <i class="fas fa-pencil-alt" style="font-size:14px;"></i>
                        </button>
                        <button class="btn-icon-action" title="Remover" data-action="remove" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#dc3545';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                            <i class="fas fa-times" style="font-size:16px;"></i>
                        </button>
                    </div>
                </div>
            `;

      // Ligar botão de renovar
      item
        .querySelector('[data-action="renovar"]')
        .addEventListener("click", async function (e) {
          e.stopPropagation();
          try {
            // Abrir modal para renovar o vermífugo (adicionar nova dose)
            openAddVermifugoModal({
              id: Date.now(), // novo ID para nova dose
              nome: nome,
              valor: s.unitario || s.valor || 0,
            });
          } catch (e) {
            console.warn("Erro ao renovar vermifugo", e);
          }
        });

      // Ligar botão de editar
      item
        .querySelector('[data-action="editar"]')
        .addEventListener("click", async function (e) {
          e.stopPropagation();
          try {
            // Abrir modal de edição (similar ao modal de adicionar, mas preenchido)
            console.log(
              "🔍 Tentando abrir modal de edição de vermífugo, função existe?",
              typeof window.openEditVermifugoModal,
            );
            window.openEditVermifugoModal(s, item);
          } catch (e) {
            console.warn("Erro ao editar vermifugo", e);
          }
        });

      // Ligar botão de remover (agora com confirmação)
      item
        .querySelector('[data-action="remove"]')
        .addEventListener("click", async function (e) {
          e.stopPropagation();
          try {
            const confirmed = await showConfirmModal("Remover este vermífugo?");
            if (!confirmed) return;

            // remover do DOM (sub-aba)
            item.remove();
            // remover também da lista de itens
            const itemNaLista = document.querySelector(
              `.service-item[data-service-id="${s.id}"]`,
            );
            if (itemNaLista) itemNaLista.remove();
            // atualizar arrays locais e persistir
            if (Array.isArray(agendamentoAtual.servicos))
              agendamentoAtual.servicos = agendamentoAtual.servicos.filter(
                (x) => String(x.id) !== String(s.id),
              );
            if (Array.isArray(agendamentoAtual._addedServicos))
              agendamentoAtual._addedServicos =
                agendamentoAtual._addedServicos.filter(
                  (x) => String(x.id) !== String(s.id),
                );
            // persistir prontuario/servicos conforme o fluxo
            try {
              await recalcAndPersistServicos();
            } catch (e) {
              console.warn("Erro ao persistir depois de remover vermifugo", e);
            }
          } catch (e) {
            console.warn("Erro removendo vermifugo UI", e);
          }
        });

      container.appendChild(item);
      try {
        const scrollParent = getScrollParent(container);
        if (scrollParent && typeof item.scrollIntoView === "function")
          item.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch (e) {}
      // NÃO usar return aqui - continuar para adicionar também na lista de itens
    }

    // Se for antiparasitário, renderizar na sub-aba de Antiparasitários
    if (isAntiparasitario) {
      const container = document.querySelector(
        "#antiparasitariosSubContent .historico-list",
      );
      if (!container) return;

      // remover estado vazio
      const empty = container.querySelector(".empty-state");
      if (empty) empty.remove();

      const item = document.createElement("div");
      item.className = "antiparasitario-item";
      item.setAttribute("data-service-id", String(s.id || ""));

      const nome = s.nome || "";
      const dataAplic =
        s.meta && s.meta.dataAplic ? s.meta.dataAplic : s.data || "";
      const dose = s.meta && s.meta.dose ? s.meta.dose : "";
      const profissional = s.profissional || "";
      const lote = s.meta && s.meta.lote ? s.meta.lote : "";
      const renovacao = s.meta && s.meta.renovacao ? s.meta.renovacao : "";

      // Formatar data de aplicação para exibição (DD/MM/YYYY)
      let dataAplicFormatada = dataAplic || "-";
      try {
        if (dataAplic && dataAplic.includes("-")) {
          const [y, m, d] = dataAplic.split("-");
          dataAplicFormatada = `${d}/${m}/${y}`;
        }
      } catch (e) {}

      // Calcular data de renovação se houver período informado
      let renovacaoTexto = renovacao || "";
      let dataRenovacao = "";
      try {
        if (renovacao && dataAplic) {
          const dias = parseInt(renovacao.match(/\d+/)?.[0] || "0");
          if (dias > 0) {
            const dataBase = new Date(dataAplic + "T12:00:00");
            dataBase.setDate(dataBase.getDate() + dias);
            const dd = String(dataBase.getDate()).padStart(2, "0");
            const mm = String(dataBase.getMonth() + 1).padStart(2, "0");
            const yyyy = dataBase.getFullYear();
            dataRenovacao = `${dd}/${mm}/${yyyy}`;
            renovacaoTexto = `Renovar dia ${dataRenovacao} (${renovacao})`;
          }
        }
      } catch (e) {}

      item.innerHTML = `
                <div style="display:flex;align-items:stretch;justify-content:space-between;padding:16px;background:#fff;border:1px solid #e6e9ee;border-radius:8px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:all 0.2s ease;width:100%;box-sizing:border-box;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">
                    <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:linear-gradient(135deg, #e74c3c 0%, #f39c12 100%);border-radius:8px;flex-shrink:0;color:#fff;font-weight:700;font-size:14px;">
                            <i class="fas fa-shield-virus" style="font-size:18px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;color:#1a1d29;font-size:15px;margin-bottom:6px;line-height:1.3;">${escapeHtmlUnsafe(nome)}</div>
                            ${renovacaoTexto ? `<div style="font-size:13px;color:#e74c3c;font-weight:600;margin-bottom:4px;"><i class="fas fa-sync-alt" style="font-size:11px;margin-right:4px;"></i>${escapeHtmlUnsafe(renovacaoTexto)}</div>` : ""}
                            <div style="font-size:13px;color:#5a6c7d;margin-bottom:2px;">Dose: ${escapeHtmlUnsafe(dose || "-")} • Aplicada em: ${escapeHtmlUnsafe(dataAplicFormatada)}</div>
                            <div style="font-size:12px;color:#7d8a99;">Profissional: ${escapeHtmlUnsafe(profissional || "-")}${lote ? " • Lote: " + escapeHtmlUnsafe(lote) : ""}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;margin-left:12px;flex-shrink:0;">
                        <button class="btn-icon-action" title="Renovar" data-action="renovar" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#e74c3c';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                            <i class="fas fa-sync-alt" style="font-size:14px;"></i>
                        </button>
                        <button class="btn-icon-action" title="Editar" data-action="editar" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#007bff';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                            <i class="fas fa-pencil-alt" style="font-size:14px;"></i>
                        </button>
                        <button class="btn-icon-action" title="Remover" data-action="remove" style="background:transparent;border:none;color:#6c757d;cursor:pointer;padding:8px;border-radius:6px;transition:all 0.2s ease;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#f0f2f5';this.style.color='#dc3545';" onmouseout="this.style.background='transparent';this.style.color='#6c757d';">
                            <i class="fas fa-times" style="font-size:16px;"></i>
                        </button>
                    </div>
                </div>
            `;

      // Ligar botão de renovar
      item
        .querySelector('[data-action="renovar"]')
        .addEventListener("click", async function (e) {
          e.stopPropagation();
          try {
            // Abrir modal para renovar o antiparasitário
            openAddItemModal();
          } catch (e) {
            console.warn("Erro ao renovar antiparasitario", e);
          }
        });

      // Ligar botão de editar
      item
        .querySelector('[data-action="editar"]')
        .addEventListener("click", async function (e) {
          e.stopPropagation();
          try {
            // Abrir modal de edição com dados preenchidos
            console.log(
              "🔍 Tentando abrir modal de edição de antiparasitário, função existe?",
              typeof window.openEditAntiparasitarioModal,
            );
            window.openEditAntiparasitarioModal(s, item);
          } catch (e) {
            console.warn("Erro ao editar antiparasitario", e);
          }
        });

      // Ligar botão de remover (agora com confirmação)
      item
        .querySelector('[data-action="remove"]')
        .addEventListener("click", async function (e) {
          e.stopPropagation();
          try {
            const confirmed = await showConfirmModal(
              "Remover este antiparasitário?",
            );
            if (!confirmed) return;

            // remover do DOM (sub-aba)
            item.remove();
            // remover também da lista de itens
            const itemNaLista = document.querySelector(
              `.service-item[data-service-id="${s.id}"]`,
            );
            if (itemNaLista) itemNaLista.remove();
            // atualizar arrays locais e persistir
            if (Array.isArray(agendamentoAtual.servicos))
              agendamentoAtual.servicos = agendamentoAtual.servicos.filter(
                (x) => String(x.id) !== String(s.id),
              );
            if (Array.isArray(agendamentoAtual._addedServicos))
              agendamentoAtual._addedServicos =
                agendamentoAtual._addedServicos.filter(
                  (x) => String(x.id) !== String(s.id),
                );
            // persistir prontuario/servicos conforme o fluxo
            try {
              await recalcAndPersistServicos();
            } catch (e) {
              console.warn(
                "Erro ao persistir depois de remover antiparasitario",
                e,
              );
            }
          } catch (e) {
            console.warn("Erro removendo antiparasitario UI", e);
          }
        });

      container.appendChild(item);
      try {
        const scrollParent = getScrollParent(container);
        if (scrollParent && typeof item.scrollIntoView === "function")
          item.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch (e) {}
      // NÃO usar return aqui - continuar para adicionar também na lista de itens
    }

    // Se for vacina, renderizar na sub-aba de Vacinas
    if (isVacina) {
      console.log("💉 [appendServiceToCategory] Vacina detectada:", s.nome);
      const nome = s.nome || "";
      const dataAplic = s.meta && s.meta.dataAplic ? s.meta.dataAplic : "";
      const lote = s.meta && s.meta.lote ? s.meta.lote : "";
      const profissional = s.profissional || "";
      const proximaDose =
        s.meta && s.meta.proximaDose ? s.meta.proximaDose : "";
      const dose = s.meta && s.meta.dose ? s.meta.dose : "1 dose";
      console.log("💉 [appendServiceToCategory] Dados da vacina:", {
        nome,
        dataAplic,
        lote,
        profissional,
        proximaDose,
        dose,
      });

      const dadosVacina = {
        dose: dose,
        profissional: profissional,
        lote: lote,
        proximaDose: proximaDose,
      };

      try {
        adicionarVacinaNaLista(nome, dadosVacina, dataAplic, s.id);
      } catch (e) {
        console.warn("Erro ao adicionar vacina na sub-aba:", e);
      }
      // NÃO usar return aqui - continuar para adicionar também na lista de itens
    }

    // Renderizar serviço na lista de itens (categoria principal)
    const category = document.querySelector(".category-section");
    if (!category) return;

    // montar dados do serviço recebido
    const horario = s.horario || s.time || "";
    const data = s.data || "";
    const nomeG = s.nome || s.nomeServico || "";
    const profissionalG = s.profissional || "";
    const qtd = s.quantidade || 1;
    const unitario = parseFloat(s.unitario || s.valor || 0) || 0;
    const total = parseFloat(s.total || unitario * qtd) || unitario * qtd;

    const item = document.createElement("div");
    item.className = "service-item";
    item.setAttribute("data-service-id", String(s.id || ""));
    item.innerHTML = `
                <div class="col-horario">
                    <i class="fas fa-clock"></i>
                    <div class="time-info">
                        <span class="time">${escapeHtmlUnsafe(horario)}</span>
                        <small class="date">${escapeHtmlUnsafe(data)}</small>
                    </div>
                </div>
                <div class="col-descricao">
                    <div class="service-name">${escapeHtmlUnsafe(nomeG)}</div>
                </div>
                <div class="col-profissional">${escapeHtmlUnsafe(profissionalG)}</div>
                <div class="col-qtd">${escapeHtmlUnsafe(qtd)}</div>
                <div class="col-unitario">${formatarMoeda(unitario)}</div>
                <div class="col-desconto">-</div>
                <div class="col-total">${formatarMoeda(total)}</div>
                <div class="col-acoes">
                    <button class="btn-item-action" title="Mais opções"><i class="fas fa-ellipsis-v"></i></button>
                </div>
        `;

    category.appendChild(item);
    try {
      const scrollParent = getScrollParent(category);
      if (scrollParent && typeof item.scrollIntoView === "function")
        item.scrollIntoView({ behavior: "smooth", block: "end" });
    } catch (e) {}
  } catch (e) {
    console.warn("appendServiceToCategory error", e);
  }
}

// Cria/retorna o menu de ações usado por cada item (singleton)
function getServiceItemMenu() {
  let menu = document.getElementById("serviceItemActionsMenu");
  if (menu) return menu;
  menu = document.createElement("div");
  menu.id = "serviceItemActionsMenu";
  menu.style.cssText =
    "position:absolute;z-index:1400000;background:white;border:1px solid #e6e9ee;border-radius:8px;box-shadow:0 10px 30px rgba(2,16,26,0.08);min-width:140px;padding:6px;";
  menu.innerHTML = `
            <div class="sia-row" data-action="edit" style="padding:8px 10px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px;">✎ <span>Editar</span></div>
            <div class="sia-row" data-action="delete" style="padding:8px 10px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px;">✖ <span>Excluir</span></div>
        `;
  document.body.appendChild(menu);

  // listener global para cliques nas opções
  menu.addEventListener("click", async function (e) {
    const row = e.target.closest(".sia-row");
    if (!row) return;
    const action = row.getAttribute("data-action");
    const targetFor = menu.getAttribute("data-for");
    const itemEl = targetFor
      ? document.querySelector(`[data-service-id="${targetFor}"]`)
      : null;
    if (action === "delete") {
      if (!itemEl) {
        hideServiceItemMenu();
        return;
      }
      // confirmar via modal estilizado
      try {
        const confirmed = await showConfirmModal(
          "Deseja remover este item do agendamento?",
        );
        if (!confirmed) {
          hideServiceItemMenu();
          return;
        }
      } catch (e) {
        hideServiceItemMenu();
        return;
      }
      // encontrar índice no agendamentoAtual.servicos e remover
      try {
        const sid = itemEl.dataset.serviceId;
        if (Array.isArray(agendamentoAtual.servicos)) {
          // Verificar se é item especial antes de remover
          const servicoRemovido = agendamentoAtual.servicos.find(
            (x) => String(x.id) === String(sid),
          );
          agendamentoAtual.servicos = agendamentoAtual.servicos.filter(
            (x) => String(x.id) !== String(sid),
          );

          // Se for item especial, remover também das sub-abas correspondentes
          if (
            servicoRemovido &&
            servicoRemovido.meta &&
            servicoRemovido.meta.tipoEspecial
          ) {
            const tipo = servicoRemovido.meta.tipoEspecial;
            if (tipo === "vacina") {
              // Remover card de vacina
              const vacinaCards = document.querySelectorAll(".vacina-item");
              vacinaCards.forEach((card) => {
                const cardData = card.dataset;
                if (
                  cardData.dose === servicoRemovido.meta.dose &&
                  cardData.lote === servicoRemovido.meta.lote &&
                  cardData.dataAplic === servicoRemovido.meta.dataAplic
                ) {
                  card.remove();
                }
              });
            } else if (tipo === "vermifugo") {
              // Remover card de vermífugo
              const vermifugoCards =
                document.querySelectorAll(".vermifugo-item");
              vermifugoCards.forEach((card) => {
                const cardData = card.dataset;
                if (
                  cardData.dose === servicoRemovido.meta.dose &&
                  cardData.lote === servicoRemovido.meta.lote &&
                  cardData.dataAplic === servicoRemovido.meta.dataAplic
                ) {
                  card.remove();
                }
              });
            } else if (tipo === "antiparasitario") {
              // Remover card de antiparasitário
              const antiparasitarioCards = document.querySelectorAll(
                ".antiparasitario-item",
              );
              antiparasitarioCards.forEach((card) => {
                const cardData = card.dataset;
                if (
                  cardData.dose === servicoRemovido.meta.dose &&
                  cardData.lote === servicoRemovido.meta.lote &&
                  cardData.dataAplic === servicoRemovido.meta.dataAplic
                ) {
                  card.remove();
                }
              });
            }
          }
        }
        // remover visualmente
        itemEl.remove();
        // recalcular totals
        recalcAndPersistServicos();
      } catch (e) {
        console.warn("Erro ao excluir item", e);
      }
      hideServiceItemMenu();
    } else if (action === "edit") {
      hideServiceItemMenu();
      if (!itemEl) return;
      // abrir modal de edição rico
      openEditServiceModal(itemEl);
    }
  });

  // fechar ao clicar fora
  document.addEventListener("click", function (ev) {
    if (!menu.contains(ev.target) && !ev.target.closest(".btn-item-action"))
      hideServiceItemMenu();
  });

  return menu;
}

function hideServiceItemMenu() {
  const m = document.getElementById("serviceItemActionsMenu");
  if (m) m.style.display = "none";
}

function openServiceItemMenu(buttonEl, itemEl) {
  try {
    const menu = getServiceItemMenu();
    // marcar para qual item está aberto (usar id)
    const sid = itemEl.dataset.serviceId || "";
    menu.setAttribute("data-for", sid);
    // posicionar próximo ao botão
    const rect = buttonEl.getBoundingClientRect();
    const left = rect.right + window.scrollX - menu.offsetWidth;
    const top = rect.bottom + window.scrollY + 8;
    menu.style.left = (left > 8 ? left : rect.left + window.scrollX) + "px";
    menu.style.top = top + "px";
    menu.style.display = "block";
  } catch (e) {
    console.warn("openServiceItemMenu error", e);
  }
}

// Recalcula total e envia PUT para persistir `servicos` e `servico` concatenado
async function recalcAndPersistServicos() {
  try {
    const arr = Array.isArray(agendamentoAtual.servicos)
      ? agendamentoAtual.servicos
      : [];
    // calcular total considerando 'total', 'valor' ou 'unitario'
    const total = arr.reduce((acc, it) => {
      const v =
        parseFloat(
          String(it.total || it.valor || it.unitario || 0)
            .toString()
            .replace(",", "."),
        ) || 0;
      return acc + v;
    }, 0);
    const names = arr
      .map((s) =>
        s && (s.nome || s.name || s.nomeServico)
          ? s.nome || s.name || s.nomeServico
          : "",
      )
      .filter(Boolean)
      .join(" • ");

    // calcular totais para desconto (unitario cadastrado x valor final)
    let totalUnitario = 0;
    let totalFinal = 0;
    try {
      arr.forEach((s) => {
        const qtd = parseFloat(s.quantidade || 1) || 1;
        const unitCad = parseFloat(s.unitario || s.valor || 0) || 0;
        const finalUnit =
          s.valor !== undefined && s.valor !== null
            ? parseFloat(s.valor)
            : unitCad;
        totalUnitario += qtd * unitCad;
        totalFinal += qtd * finalUnit;
      });
    } catch (e) {
      totalUnitario = 0;
      totalFinal = total;
    }

    const descontoReais = Math.max(0, totalUnitario - totalFinal);
    const descontoPercent =
      totalUnitario > 0 ? (descontoReais / totalUnitario) * 100 : 0;

    // atualizar DOM dos totais
    try {
      const _tp3 =
        parseFloat((agendamentoAtual && agendamentoAtual.totalPago) || 0) || 0;
      document.getElementById("totalGeral").textContent = formatarMoeda(total);
      document.getElementById("totalPendente").textContent = formatarMoeda(
        Math.max(0, total - _tp3),
      );
      const amount = document.querySelector(".amount");
      if (amount) amount.textContent = formatarMoeda(total);

      const elPerc = document.getElementById("descontoPercent");
      if (elPerc)
        elPerc.textContent = descontoPercent.toFixed(3).replace(".", ",");
      const elReais = document.getElementById("descontoReais");
      if (elReais) elReais.textContent = formatarMoeda(descontoReais);
    } catch (e) {}

    // enviar atualização para API
    if (agendamentoAtual && agendamentoAtual.id) {
      // log payload para debug
      try {
        console.log(
          "PUT /api/agendamentos/" + agendamentoAtual.id + " payload:",
          {
            servicosCount: arr.length,
            servicos: arr,
            servico: names,
            valor: total,
          },
        );
      } catch (e) {}
      const resp = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicos: arr, servico: names, valor: total }),
      });
      if (resp.ok) {
        const updated = await resp.json().catch(() => null);
        if (updated) {
          agendamentoAtual.servicos = Array.isArray(updated.servicos)
            ? updated.servicos
            : arr;
          agendamentoAtual.servico = updated.servico || names;
          agendamentoAtual.valor =
            updated.valor !== undefined ? updated.valor : total;
        }
      } else {
        const txt = await resp.text().catch(() => null);
        console.warn("recall persist failed", resp.status, txt);
      }
    }
  } catch (e) {
    console.warn("recalcAndPersistServicos error", e);
  }
}

// Função para adicionar item (placeholder)
function adicionarItem() {
  console.log("🔧 Função adicionar item será implementada");
  alert("Função de adicionar item será implementada em breve!");
}

// Carrega histórico clínico combinado (vacinas, vermífugos, antiparasitários)
async function loadClinicalHistory() {
  console.log("[loadClinicalHistory] 🚀 FUNÇÃO EXECUTADA - Linha 4138");
  console.log(
    "[loadClinicalHistory] Iniciando carregamento do histórico clínico...",
  );
  try {
    console.log(
      "[loadClinicalHistory] Procurando container #historicoSubContent .historico-list...",
    );
    const container = document.querySelector(
      "#historicoSubContent .historico-list",
    );
    console.log("[loadClinicalHistory] Container resultado:", container);
    if (!container) {
      console.error(
        "[loadClinicalHistory] ❌ Container #historicoSubContent .historico-list NÃO ENCONTRADO! Abortando.",
      );
      return;
    }
    console.log(
      "[loadClinicalHistory] Container encontrado, limpando conteúdo...",
    );
    // limpar
    container.innerHTML = "";

    const entries = [];

    // 1) registros do prontuário (se houver)
    try {
      if (agendamentoAtual && Array.isArray(agendamentoAtual.prontuario)) {
        agendamentoAtual.prontuario.forEach((reg) => {
          const tipoRaw = (reg.tipo || "").toString().toLowerCase();
          let tipo = null;
          if (tipoRaw.indexOf("vacina") !== -1) tipo = "vacina";
          else if (tipoRaw.indexOf("vermifug") !== -1) tipo = "vermifugo";
          else if (tipoRaw.indexOf("antiparasit") !== -1)
            tipo = "antiparasitario";
          if (tipo)
            entries.push({
              source: "prontuario",
              tipo,
              data: reg.dataEmissao || reg.data || null,
              registro: reg,
            });
        });
      }
    } catch (e) {
      console.warn("Erro coletando prontuário para histórico:", e);
    }

    // 2) serviços do agendamento com meta.tipoEspecial
    try {
      const servs = Array.isArray(agendamentoAtual && agendamentoAtual.servicos)
        ? agendamentoAtual.servicos
        : [];
      servs.forEach((s) => {
        try {
          const tipo =
            s && s.meta && s.meta.tipoEspecial ? s.meta.tipoEspecial : null;
          if (
            tipo &&
            ["vacina", "vermifugo", "antiparasitario"].includes(tipo)
          ) {
            const data =
              s.meta && s.meta.dataAplic ? s.meta.dataAplic : s.data || null;
            entries.push({ source: "servico", tipo, data, servico: s });
          }
        } catch (e) {}
      });
    } catch (e) {
      console.warn("Erro coletando serviços para histórico:", e);
    }

    // ordenar do mais recente para o mais antigo
    const parseDateToTs = (d) => {
      if (!d) return 0;
      try {
        if (typeof d === "number") return d;
        if (d.indexOf && d.indexOf("-") !== -1) return new Date(d).getTime();
        if (d.indexOf && d.indexOf("/") !== -1) {
          // dd/mm/yyyy
          const parts = d.split("/");
          if (parts.length === 3)
            return new Date(
              parts[2] + "-" + parts[1] + "-" + parts[0],
            ).getTime();
        }
        return new Date(d).getTime() || 0;
      } catch (e) {
        return 0;
      }
    };

    entries.sort((a, b) => parseDateToTs(b.data) - parseDateToTs(a.data));

    console.log(
      `[loadClinicalHistory] Total de ${entries.length} entradas encontradas:`,
      entries,
    );

    if (entries.length === 0) {
      console.log(
        "[loadClinicalHistory] Nenhuma entrada encontrada, exibindo estado vazio",
      );
      container.innerHTML =
        '<p class="empty-state">Nenhum registro encontrado</p>';
      return;
    }

    // helper para criar cards seguindo o mesmo estilo (sem ícones de ação)
    const createCard = (
      tipo,
      nome,
      dataAplic,
      profissional,
      lote,
      dose,
      renovacao,
      sourceObj,
    ) => {
      const item = document.createElement("div");
      item.className = "historico-card";
      item.dataset.tipo = tipo; // Adicionar atributo data-tipo para filtros
      // escolher paleta e ícone
      let gradient = "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)";
      let icon = "fas fa-syringe";
      if (tipo === "vermifugo") {
        gradient = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
        icon = "fas fa-capsules";
      }
      if (tipo === "antiparasitario") {
        gradient = "linear-gradient(135deg, #e74c3c 0%, #f39c12 100%)";
        icon = "fas fa-shield-virus";
      }

      let dataFormat = dataAplic || "-";
      try {
        if (dataAplic && dataAplic.indexOf("-") !== -1) {
          const [y, m, d] = dataAplic.split("-");
          dataFormat = `${d}/${m}/${y}`;
        }
      } catch (e) {}

      item.innerHTML = `
                <div style="display:flex;align-items:stretch;justify-content:space-between;padding:16px;background:#fff;border:1px solid #e6e9ee;border-radius:8px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:all 0.2s ease;width:100%;box-sizing:border-box;">
                    <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:${gradient};border-radius:8px;flex-shrink:0;color:#fff;font-weight:700;font-size:14px;">
                            <i class="${icon}" style="font-size:18px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;color:#1a1d29;font-size:15px;margin-bottom:6px;line-height:1.3;">${escapeHtmlUnsafe(nome)}</div>
                            <div style="font-size:13px;color:#5a6c7d;margin-bottom:2px;">Dose: ${escapeHtmlUnsafe(dose || "-")} • Aplicada em: ${escapeHtmlUnsafe(dataFormat)}</div>
                            <div style="font-size:12px;color:#7d8a99;">Profissional: ${escapeHtmlUnsafe(profissional || "-")}${lote ? " • Lote: " + escapeHtmlUnsafe(lote) : ""}</div>
                        </div>
                    </div>
                </div>
            `;

      return item;
    };

    // montar e anexar
    for (const en of entries) {
      try {
        if (en.source === "servico") {
          const s = en.servico;
          const nome = s.nome || "";
          const data =
            s.meta && s.meta.dataAplic ? s.meta.dataAplic : s.data || "";
          const profissional = s.profissional || "";
          const lote = s.meta && s.meta.lote ? s.meta.lote : "";
          const dose = s.meta && s.meta.dose ? s.meta.dose : "";
          const card = createCard(
            en.tipo,
            nome,
            data,
            profissional,
            lote,
            dose,
            s.meta && s.meta.renovacao ? s.meta.renovacao : "",
            en,
          );
          container.appendChild(card);
        } else if (en.source === "prontuario") {
          // para prontuário precisamos extrair nome/detalhes do HTML salvo — reutilizar função existente
          try {
            if (en.tipo === "vacina") {
              // usar parsing existente: adicionarVacinaNaListaFromConteudo cria vacina-item — mas queremos o card no histórico
              // então vamos extrair o nome e usar o conteúdo
              const tmp = document.createElement("div");
              tmp.innerHTML = en.registro.conteudo || "";
              const strong = tmp.querySelector("strong");
              const nome = strong
                ? strong.textContent.trim()
                : (tmp.textContent || "").split("\n")[0].trim();
              // extrair alguns detalhes do conteúdo simplificadamente
              let profissional = "";
              let lote = "";
              let dose = "";
              const txt = tmp.textContent || "";
              try {
                const profMatch = txt.match(/Profissional[:\s]+([^\n•]+)/i);
                if (profMatch) profissional = profMatch[1].trim();
              } catch (e) {}
              try {
                const loteMatch = txt.match(/Lote[:\s]+([^\n•]+)/i);
                if (loteMatch) lote = loteMatch[1].trim();
              } catch (e) {}
              try {
                const doseMatch = txt.match(/Dose[:\s]+([^\n•]+)/i);
                if (doseMatch) dose = doseMatch[1].trim();
              } catch (e) {}
              const card = createCard(
                en.tipo,
                nome || "Vacina",
                en.data || "",
                profissional,
                lote,
                dose,
                "",
                en,
              );
              container.appendChild(card);
            } else {
              // para outros tipos do prontuário, renderizar título simples
              const tmp = document.createElement("div");
              tmp.innerHTML = en.registro.conteudo || "";
              const title = tmp.textContent
                ? (tmp.textContent || "").split("\n")[0].trim()
                : en.registro.conteudo || "Registro";
              const card = createCard(
                en.tipo,
                title,
                en.data || "",
                "",
                "",
                "",
                "",
                en,
              );
              container.appendChild(card);
            }
          } catch (e) {
            console.warn(
              "Erro renderizando registro do prontuário no histórico:",
              e,
            );
          }
        }
      } catch (e) {
        console.warn("Erro anexando entrada ao histórico:", e);
      }
    }

    // adicionar botão ver-mais ao final
    const more = document.createElement("a");
    more.href = "#";
    more.className = "ver-mais";
    more.textContent = "Ver mais";
    container.appendChild(more);

    // Aplicar filtros ativos se houverem
    if (
      window._historicoFiltrosAtivos &&
      window._historicoFiltrosAtivos.length > 0
    ) {
      aplicarFiltrosHistorico(window._historicoFiltrosAtivos);
    }
  } catch (e) {
    console.error("[loadClinicalHistory] ERRO:", e);
  }
}

// Variável global para armazenar os filtros ativos
window._historicoFiltrosAtivos = [];

// Função para abrir modal de filtros do histórico
function abrirModalFiltrosHistorico() {
  // Evitar duplicados
  if (document.getElementById("modalFiltrosHistorico")) return;

  // Criar overlay
  const overlay = document.createElement("div");
  overlay.id = "modalFiltrosHistoricoOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;";

  // Criar modal
  const modal = document.createElement("div");
  modal.id = "modalFiltrosHistorico";
  modal.style.cssText =
    "background:#fff;border-radius:8px;padding:24px;width:90%;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.15);";

  // Tipos disponíveis para filtrar
  const tipos = [
    { value: "consulta", label: "Consultas e Retornos" },
    { value: "procedimento", label: "Procedimentos" },
    { value: "exame", label: "Exames" },
    { value: "receita", label: "Receitas" },
    { value: "vacina", label: "Vacinas" },
    { value: "vermifugo", label: "Vermífugos" },
    { value: "antiparasitario", label: "Antiparasitas" },
  ];

  // Construir HTML do modal
  let checkboxesHTML = "";
  tipos.forEach((tipo) => {
    const checked = window._historicoFiltrosAtivos.includes(tipo.value)
      ? "checked"
      : "";
    checkboxesHTML += `
            <div style="display:flex;align-items:center;margin-bottom:12px;">
                <input type="checkbox" id="filtro_${tipo.value}" value="${tipo.value}" ${checked} style="margin-right:8px;width:18px;height:18px;cursor:pointer;">
                <label for="filtro_${tipo.value}" style="cursor:pointer;font-size:14px;color:#333;">${tipo.label}</label>
            </div>
        `;
  });

  modal.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e0e0e0;">
            <div style="display:flex;align-items:center;gap:8px;">
                <i class="fas fa-filter" style="color:#007bff;"></i>
                <h3 style="margin:0;font-size:18px;font-weight:600;color:#333;">Filtrar</h3>
            </div>
            <button id="fecharModalFiltros" style="background:transparent;border:none;font-size:20px;cursor:pointer;color:#666;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:background 0.2s;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='transparent'">✕</button>
        </div>
        <div style="margin-bottom:24px;">
            ${checkboxesHTML}
        </div>
        <div style="margin-top:20px;">
            <a href="#" id="limparFiltrosHistorico" style="color:#007bff;text-decoration:none;font-size:14px;display:inline-block;margin-bottom:16px;transition:color 0.2s;" onmouseover="this.style.color='#0056b3'" onmouseout="this.style.color='#007bff'">Limpar Filtros</a>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button id="btnCancelarFiltros" style="background:#6c757d;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:background 0.2s;" onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">Cancelar</button>
            <button id="btnOkFiltros" style="background:#007bff;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:background 0.2s;" onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">OK</button>
        </div>
    `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Handlers
  document
    .getElementById("fecharModalFiltros")
    .addEventListener("click", () => overlay.remove());
  document
    .getElementById("btnCancelarFiltros")
    .addEventListener("click", () => overlay.remove());

  document
    .getElementById("limparFiltrosHistorico")
    .addEventListener("click", (e) => {
      e.preventDefault();
      tipos.forEach((tipo) => {
        const checkbox = document.getElementById(`filtro_${tipo.value}`);
        if (checkbox) checkbox.checked = false;
      });
    });

  document.getElementById("btnOkFiltros").addEventListener("click", () => {
    // Coletar filtros selecionados
    const filtrosSelecionados = [];
    tipos.forEach((tipo) => {
      const checkbox = document.getElementById(`filtro_${tipo.value}`);
      if (checkbox && checkbox.checked) {
        filtrosSelecionados.push(tipo.value);
      }
    });

    // Salvar filtros ativos
    window._historicoFiltrosAtivos = filtrosSelecionados;

    // Aplicar filtros
    aplicarFiltrosHistorico(filtrosSelecionados);

    // Fechar modal
    overlay.remove();
  });

  // Fechar ao clicar fora
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// Função para aplicar filtros no histórico
function aplicarFiltrosHistorico(filtros) {
  const container = document.querySelector(
    "#historicoSubContent .historico-list",
  );
  if (!container) return;

  const cards = container.querySelectorAll(".historico-card");
  let visibleCount = 0;

  cards.forEach((card) => {
    // Pegar o tipo do card (pode estar em data-tipo ou precisamos detectar pelo conteúdo)
    let tipoCard = card.dataset.tipo;

    // Se não tiver data-tipo, tentar detectar pelo ícone ou conteúdo
    if (!tipoCard) {
      const icon = card.querySelector("i");
      if (icon) {
        if (icon.classList.contains("fa-syringe")) tipoCard = "vacina";
        else if (icon.classList.contains("fa-capsules")) tipoCard = "vermifugo";
        else if (icon.classList.contains("fa-shield-virus"))
          tipoCard = "antiparasitario";
      }
    }

    // Se nenhum filtro está ativo (todos selecionados), mostrar tudo
    if (filtros.length === 0 || filtros.length === 7) {
      card.style.display = "";
      visibleCount++;
    }
    // Senão, mostrar apenas os que correspondem ao filtro
    else if (tipoCard && filtros.includes(tipoCard)) {
      card.style.display = "";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  // Atualizar mensagem de vazio se necessário
  const emptyState = container.querySelector(".empty-state");
  if (emptyState) {
    if (visibleCount === 0 && cards.length > 0) {
      emptyState.textContent =
        "Nenhum registro encontrado com os filtros selecionados";
      emptyState.style.display = "block";
    } else if (visibleCount === 0) {
      emptyState.textContent = "Nenhum registro encontrado";
      emptyState.style.display = "block";
    } else {
      emptyState.style.display = "none";
    }
  }

  console.log(
    `✅ Filtros aplicados: ${filtros.join(", ")} - ${visibleCount} cards visíveis`,
  );
}

// Função para encontrar o elemento scrollável pai
function getScrollParent(element) {
  if (!element) return document.documentElement;

  const overflowY = window.getComputedStyle(element).overflowY;
  const isScrollable = overflowY !== "visible" && overflowY !== "hidden";

  if (isScrollable && element.scrollHeight >= element.clientHeight) {
    return element;
  }

  return getScrollParent(element.parentElement) || document.documentElement;
}

// Setup do dropdown de status
function setupStatusDropdown() {
  const removeMenu = () => {
    document.querySelectorAll(".status-menu").forEach((m) => m.remove());
    try {
      window._openStatusMenuForDetails = null;
    } catch (e) {}
  };

  if (typeof window._openStatusMenuForDetails === "undefined") {
    window._openStatusMenuForDetails = null;
  }

  // Listener para o badge de status
  const statusBadge = document.querySelector(".status-badge");
  if (!statusBadge) return;

  // Remover listener anterior se existir
  if (statusBadge._detailsStatusHandler) {
    statusBadge.removeEventListener("click", statusBadge._detailsStatusHandler);
  }
  if (statusBadge._detailsStatusKeyHandler) {
    statusBadge.removeEventListener(
      "keydown",
      statusBadge._detailsStatusKeyHandler,
    );
  }

  const handler = (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Toggle: fechar se já estiver aberto
    if (window._openStatusMenuForDetails) {
      removeMenu();
      return;
    }

    // Remover menus existentes
    removeMenu();

    const agendamentoId = agendamentoAtual?.id;
    if (!agendamentoId) return;

    console.log(
      "[StatusMenu][detalhes] Abrindo menu para agendamento",
      agendamentoId,
    );

    const menu = document.createElement("div");
    menu.className = "status-menu";
    menu.style.position = "absolute";
    menu.style.zIndex = "99999";
    menu.style.visibility = "hidden";
    window._openStatusMenuForDetails = true;

    const options = [
      { label: "Agendado", value: "agendado", dot: "#6c757d" },
      { label: "Check-in", value: "checkin", dot: "#1e88e5" },
      { label: "Pronto", value: "pronto", dot: "#7b1fa2" },
      { label: "Check-out", value: "concluido", dot: "#2e7d32" },
      { label: "Cancelado", value: "cancelado", dot: "#c12b2b" },
    ];

    options.forEach((opt) => {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `<span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${opt.dot};margin-right:8px;vertical-align:middle;"></span> ${opt.label}`;
      item.addEventListener("click", async (ev) => {
        ev.stopPropagation();

        // Check-out só pode ser feito na aba Detalhes (requer pagamento)
        if (opt.value === "concluido") {
          const abaAtiva =
            typeof clinicaStateLocal !== "undefined" &&
            clinicaStateLocal.activeTab
              ? clinicaStateLocal.activeTab
              : document.querySelector(".tab-btn.active")?.dataset?.tab || "";

          if (abaAtiva === "clinica") {
            console.log(
              "⚠️ Check-out bloqueado: aba Clínica ativa. Redirecionando para aba Detalhes.",
            );
            removeMenu();
            if (typeof alternarAba === "function") {
              await alternarAba("detalhes");
            } else {
              const btnDetalhes = document.querySelector(
                '[onclick*="alternarAba"][onclick*="detalhes"], [data-tab="detalhes"]',
              );
              if (btnDetalhes) btnDetalhes.click();
            }
            return;
          }

          // Bloquear checkout se atendimento estiver cancelado
          if (agendamentoAtual && agendamentoAtual.status === "cancelado") {
            removeMenu();
            try {
              if (typeof showNotification === "function") {
                showNotification(
                  "Não é possível realizar o check-out. Este atendimento foi cancelado.",
                  "warning",
                );
              }
            } catch (e) {}
            return;
          }

          // Aba Detalhes ativa: abrir modal de pagamento via finalizarCobranca()
          removeMenu();
          try {
            if (!window.agendamentoAtual) window.agendamentoAtual = {};
            window.agendamentoAtual.__prevStatus =
              window.agendamentoAtual.status || "agendado";
            finalizarCobranca();
          } catch (e) {
            console.error(
              "Erro ao chamar finalizarCobranca via StatusMenu:",
              e,
            );
          }
          return;
        }

        // Cancelar: fluxo com dois modais + credenciais de gerente
        if (opt.value === "cancelado") {
          removeMenu();
          if (typeof window.iniciarFluxoCancelamento === "function") {
            window.iniciarFluxoCancelamento(agendamentoId, () => {
              // Redirecionar de volta para a lista de agendamentos
              window.location.href = "agendamentos-novo.html";
            });
          }
          return;
        }

        try {
          const res = await fetch(`/api/agendamentos/${agendamentoId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: opt.value }),
            credentials: "include",
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Erro" }));
            alert(err.error || "Erro ao atualizar status");
            removeMenu();
            return;
          }

          // Atualizar o select (oculto) para manter compatibilidade
          const statusSelectEl = document.getElementById("statusSelect");
          if (statusSelectEl) statusSelectEl.value = opt.value;

          // Atualizar o badge visível
          statusBadge.textContent = opt.label;
          statusBadge.className = `status-badge status-${opt.value}`;

          // Atualizar agendamentoAtual
          if (agendamentoAtual) {
            agendamentoAtual.status = opt.value;
          }

          // Atualizar classes/estilos locais imediatamente
          try {
            if (statusSelectEl) atualizarClasseStatus(statusSelectEl);
          } catch (e) {
            console.warn("falha atualizarClasseStatus", e);
          }
          try {
            atualizarLinhaListaStatus(agendamentoId, opt.value);
          } catch (e) {
            /* pode não existir na página */
          }
          try {
            updateServiceIcons(opt.value);
          } catch (e) {
            console.warn("falha updateServiceIcons", e);
          }

          console.log("✅ Status atualizado com sucesso");
        } catch (error) {
          console.error("Erro ao atualizar status:", error);
          alert("Erro ao atualizar status");
        } finally {
          removeMenu();
        }
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    const rect = statusBadge.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    let left = rect.left + scrollX;
    let top = rect.bottom + scrollY + 6;

    // Obter dimensões do menu
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;

    // Verificar espaço disponível abaixo e acima
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Se não houver espaço embaixo mas houver em cima, abrir para cima
    if (spaceBelow < menuHeight + 20 && spaceAbove > menuHeight + 20) {
      top = rect.top + scrollY - menuHeight - 6;
      console.log("📜 Menu aberto para CIMA");
    }

    // Ajustar posição horizontal se sair da tela
    const viewportWidth = document.documentElement.clientWidth;
    if (left + menuWidth > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - menuWidth - 8);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";

    const onDocClick = (ev2) => {
      if (!menu.contains(ev2.target) && ev2.target !== statusBadge) {
        removeMenu();
        document.removeEventListener("click", onDocClick);
      }
    };
    document.addEventListener("click", onDocClick);

    const closeOnScroll = () => {
      removeMenu();
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
  };

  statusBadge._detailsStatusHandler = handler;
  statusBadge.addEventListener("click", handler);
  // abrir via teclado (Enter / Space)
  const keyHandler = function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler(e);
    }
  };
  statusBadge._detailsStatusKeyHandler = keyHandler;
  statusBadge.addEventListener("keydown", keyHandler);

  console.log("✅ Dropdown de status configurado");
}

// Escuta atualizações de status vindas de outras abas/janelas e atualiza a view de detalhes
function listenForExternalStatusUpdates() {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("agendamentos_channel");
      bc.onmessage = (ev) => {
        try {
          const data = ev.data;
          if (!data || data.type !== "status-updated") return;
          if (
            !agendamentoAtual ||
            String(agendamentoAtual.id) !== String(data.id)
          )
            return;
          // Aplicar novo status localmente
          const novo = String(data.status || "").toLowerCase();
          const statusSelect = document.getElementById("statusSelect");
          const statusBadge = document.querySelector(".status-badge");
          if (statusSelect) statusSelect.value = novo;
          if (statusBadge) {
            const classMap = {
              checkin: "check-in",
              checkout: "check-out",
              concluido: "check-out",
            };
            const statusClass =
              classMap[novo] || novo.replace(/[^a-z0-9]+/g, "-");
            const labelMap = {
              agendado: "Agendado",
              "check-in": "Check-in",
              pronto: "Pronto",
              "check-out": "Check-out",
              cancelado: "Cancelado",
            };
            statusBadge.className = `status-badge status-${statusClass}`;
            statusBadge.textContent = labelMap[statusClass] || data.status;
          }
          // atualizar objeto atual e ícones
          if (agendamentoAtual) agendamentoAtual.status = novo;
          try {
            updateServiceIcons(novo);
          } catch (e) {}
          console.log(
            "[agendamento-detalhes] status atualizado via BroadcastChannel:",
            novo,
          );
        } catch (e) {
          console.warn("Erro no listener BroadcastChannel (detalhes):", e);
        }
      };
    }
  } catch (e) {
    console.warn("BroadcastChannel não disponível (detalhes):", e);
  }

  // Fallback via postMessage
  try {
    window.addEventListener("message", function (ev) {
      try {
        const data = ev.data;
        if (!data || data.type !== "status-updated") return;
        if (
          !agendamentoAtual ||
          String(agendamentoAtual.id) !== String(data.id)
        )
          return;
        const novo = String(data.status || "").toLowerCase();
        const statusSelect = document.getElementById("statusSelect");
        const statusBadge = document.querySelector(".status-badge");
        if (statusSelect) statusSelect.value = novo;
        if (statusBadge) {
          const classMap = {
            checkin: "check-in",
            checkout: "check-out",
            concluido: "check-out",
          };
          const statusClass =
            classMap[novo] || novo.replace(/[^a-z0-9]+/g, "-");
          const labelMap = {
            agendado: "Agendado",
            "check-in": "Check-in",
            pronto: "Pronto",
            "check-out": "Check-out",
            cancelado: "Cancelado",
          };
          statusBadge.className = `status-badge status-${statusClass}`;
          statusBadge.textContent = labelMap[statusClass] || data.status;
        }
        if (agendamentoAtual) agendamentoAtual.status = novo;
        try {
          updateServiceIcons(novo);
        } catch (e) {}
        console.log(
          "[agendamento-detalhes] status atualizado via postMessage:",
          novo,
        );
      } catch (e) {
        /* ignore */
      }
    });
  } catch (e) {
    /* ignore */
  }
}

// Event Listeners - configuração inicial
document.addEventListener("DOMContentLoaded", function () {
  console.log("🎯 Inicializando página de detalhes do agendamento...");

  // Carrega os dados do agendamento
  carregarAgendamento();

  // Configura listener para mudança de status
  const statusSelect = document.getElementById("statusSelect");
  if (statusSelect) {
    statusSelect.addEventListener("change", function () {
      atualizarClasseStatus(this);
      salvarStatus();
    });
  }

  // Configurar botão de filtrar histórico
  const btnFiltrarHistorico = document.getElementById("btnFiltrarHistorico");
  if (btnFiltrarHistorico) {
    btnFiltrarHistorico.addEventListener("click", (e) => {
      e.preventDefault();
      abrirModalFiltrosHistorico();
    });
    console.log("✅ Botão de filtrar histórico configurado");
  }

  // Escutar atualizações externas de status
  try {
    listenForExternalStatusUpdates();
  } catch (e) {
    console.warn("Não foi possível ativar listener externo de status", e);
  }

  // Recarregar dados ao voltar ao foco/visibilidade (garante estado atual quando BroadcastChannel falhar)
  try {
    window.addEventListener("focus", () => {
      try {
        carregarAgendamento();
      } catch (e) {}
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        try {
          carregarAgendamento();
        } catch (e) {}
      }
    });
  } catch (e) {
    console.warn(
      "Não foi possível configurar listeners de foco/visibilidade",
      e,
    );
  }

  // Configura listener para observações com debounce
  const observacoesText = document.getElementById("observacoes");
  if (observacoesText) {
    let timeoutObservacoes;
    observacoesText.addEventListener("input", function () {
      clearTimeout(timeoutObservacoes);
      timeoutObservacoes = setTimeout(salvarObservacoes, 1500); // Salva após 1.5s sem digitação
    });
    // Salvar também ao sair do campo
    observacoesText.addEventListener("blur", function () {
      clearTimeout(timeoutObservacoes);
      salvarObservacoes();
    });
  }

  // Botão Editar -> abrir modal de novo atendimento com dados preenchidos
  try {
    const btnEditar = document.querySelector(".btn-editar");
    if (btnEditar) {
      btnEditar.addEventListener("click", async function () {
        try {
          // Bloquear edição se o checkout já foi feito
          if (agendamentoAtual && agendamentoAtual.status === "concluido") {
            try {
              if (typeof showNotification === "function") {
                showNotification(
                  "Não é possível editar um atendimento com Check-out realizado. Desfaça o checkout primeiro.",
                  "error",
                );
              } else {
                alert(
                  "Não é possível editar um atendimento com Check-out realizado. Desfaça o checkout primeiro.",
                );
              }
            } catch (e) {
              alert(
                "Não é possível editar um atendimento com Check-out realizado.",
              );
            }
            return;
          }

          const id =
            (agendamentoAtual && agendamentoAtual.id) ||
            this.getAttribute("data-agendamento-id") ||
            new URLSearchParams(window.location.search).get("id");
          if (!id)
            return showNotification(
              "ID do agendamento não encontrado",
              "error",
            );

          // Buscar agendamento na API
          const resp = await fetch(`/api/agendamentos/${id}`, {
            credentials: "include",
          });
          if (!resp.ok)
            return showNotification("Erro ao buscar agendamento", "error");
          const ag = await resp.json();

          // Abrir modal global de novo agendamento
          try {
            abrirNovoAgendamentoModal();
          } catch (e) {
            console.warn("abrirNovoAgendamentoModal não disponível", e);
          }

          // Definir ID de edição
          window.agendamentoEmEdicaoId = ag.id;

          // Ocultar botão "Salvar e Ir" no modo de edição
          setTimeout(() => {
            const btnSalvarEIr = document.getElementById("salvarEIr");
            if (btnSalvarEIr) {
              btnSalvarEIr.style.display = "none";
            }
          }, 50);

          // Aguarda o modal ser criado no DOM
          setTimeout(() => {
            try {
              // Preencher campos básicos
              const petInput = document.getElementById("petClienteGlobal");
              if (petInput) {
                petInput.value = ag.petNome || "";
                if (ag.petId) {
                  petInput.setAttribute(
                    "data-selected-pet-id",
                    String(ag.petId),
                  );
                  petInput.dataset.selectedPetId = String(ag.petId);
                }
              }

              const dataInput = document.getElementById("dataGlobal");
              if (dataInput) {
                // Converter data para formato brasileiro DD/MM/YYYY
                if (ag.dataAgendamento) {
                  // Pegar apenas a parte da data (YYYY-MM-DD)
                  const dataStr = ag.dataAgendamento.split("T")[0];
                  const [ano, mes, dia] = dataStr.split("-");
                  // Formato brasileiro: DD/MM/YYYY
                  dataInput.value = `${dia}/${mes}/${ano}`;
                } else {
                  dataInput.value = "";
                }
              }

              const horaInput = document.getElementById("horaGlobal");
              if (horaInput) horaInput.value = ag.horario || "";

              // Profissional - usar o input visível e remover placeholder
              const profInput = document.getElementById(
                "profissionalGlobalInput",
              );
              if (profInput) {
                profInput.value = ag.profissional || "";
                if (ag.profissional) {
                  profInput.placeholder = "";
                }
              }
              const profHidden = document.getElementById(
                "profissionalGlobalId",
              );
              if (profHidden && ag.profissionalId)
                profHidden.value = ag.profissionalId;

              const obs = document.getElementById("observacoesGlobal");
              if (obs) obs.value = ag.observacoes || "";

              // Preencher serviços (se existirem)
              try {
                const listaContainer = document.getElementById("listaServicos");
                const servicosContainer = document.getElementById(
                  "servicosAdicionados",
                );
                const valorTotalElement = document.getElementById("valorTotal");
                const servs = ag.servicos || [];
                window.servicosAdicionados = servs.map((s) => ({
                  id: s.id || s.nome,
                  nome: s.nome || s.description || "",
                  valor: parseFloat(s.total || s.valor || s.unitario || 0) || 0,
                  quantidade: parseFloat(s.quantidade) || 1,
                  unitario: parseFloat(s.unitario || s.valor || 0) || 0,
                  desconto: parseFloat(s.desconto) || 0,
                }));

                if (window.servicosAdicionados.length === 0) {
                  if (listaContainer) listaContainer.style.display = "none";
                } else {
                  // Usar a função global de renderização se disponível
                  if (
                    typeof window.renderizarListaServicosGlobal === "function"
                  ) {
                    window.renderizarListaServicosGlobal();
                  } else {
                    // Fallback: renderização inline
                    if (listaContainer) listaContainer.style.display = "block";
                    if (servicosContainer && valorTotalElement) {
                      // Calcular valor do serviço
                      const calcValor = (s) => {
                        const qtd = parseFloat(s.quantidade) || 1;
                        const unit =
                          parseFloat(s.unitario) || parseFloat(s.valor) || 0;
                        const desc = parseFloat(s.desconto) || 0;
                        const sub = qtd * unit;
                        return sub - sub * (desc / 100);
                      };

                      servicosContainer.innerHTML = window.servicosAdicionados
                        .map((servico, index) => {
                          const valorCalc = calcValor(servico);
                          return `\
                                                <div style="background: white; border-radius: 6px; margin-bottom: 12px; padding: 12px; border: 1px solid #e0e0e0;">\
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">\
                                                        <span style="flex: 1; color: #333; font-weight: 600;">${servico.nome}</span>\
                                                        <button type="button" onclick="window.removerServicoGlobal('${servico.id}')" style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">\
                                                            <i class="fas fa-times"></i>\
                                                        </button>\
                                                    </div>\
                                                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">\
                                                        <div>\
                                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Qtd. *</label>\
                                                            <input type="number" min="0.001" step="0.001" value="${servico.quantidade || 1}" \
                                                                onchange="window.atualizarServicoGlobal(${index}, 'quantidade', parseFloat(this.value) || 1)"\
                                                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                                                        </div>\
                                                        <div>\
                                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Unitário *</label>\
                                                            <input type="number" min="0" step="0.01" value="${(servico.unitario || servico.valor || 0).toFixed(2)}" \
                                                                onchange="window.atualizarServicoGlobal(${index}, 'unitario', parseFloat(this.value) || 0)"\
                                                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                                                        </div>\
                                                        <div>\
                                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">% Desconto</label>\
                                                            <input type="number" min="0" max="100" step="0.0001" value="${(servico.desconto || 0).toFixed(4)}" \
                                                                onchange="window.atualizarServicoGlobal(${index}, 'desconto', parseFloat(this.value) || 0)"\
                                                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                                                        </div>\
                                                    </div>\
                                                    <div style="text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">\
                                                        <span style="color: #666; font-size: 12px;">Subtotal: </span>\
                                                        <span style="color: #28a745; font-weight: 600; font-size: 14px;">R$ ${valorCalc.toFixed(2).replace(".", ",")}</span>\
                                                    </div>\
                                                </div>`;
                        })
                        .join("");

                      const total = window.servicosAdicionados.reduce(
                        (acc, s) => acc + calcValor(s),
                        0,
                      );
                      valorTotalElement.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
                    }
                  }
                }
              } catch (e) {
                console.warn("Erro ao preencher serviços no modal", e);
              }
            } catch (e) {
              console.error("Erro ao preencher modal de edição", e);
            }
          }, 120);
        } catch (e) {
          console.error("Erro ao abrir edição:", e);
          showNotification("Erro ao abrir edição do agendamento", "error");
        }
      });
    }
  } catch (e) {
    console.warn("Não foi possível vincular botão editar", e);
  }

  // A aba inicial será restaurada a partir do servidor em `carregarAgendamento()`

  // Carregar dados do agendamento atual
  carregarDadosAgendamento();

  // Configurar dropdown de status
  setTimeout(() => {
    setupStatusDropdown();
  }, 300);

  // Configurar botão + Item para abrir modal de adicionar item
  const btnAddItem = document.querySelector(".btn-add-item");
  if (btnAddItem) {
    btnAddItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openAddItemModal();
    });
  }

  // Configurar botão + Imprimir para gerar comprovante em PDF
  const btnImprimirComprovante = document.querySelector(
    ".btn-imprimir-comprovante",
  );
  console.log(
    "🔍 Botão Imprimir Comprovante encontrado:",
    !!btnImprimirComprovante,
  );
  if (btnImprimirComprovante) {
    btnImprimirComprovante.addEventListener("click", async function (e) {
      e.preventDefault();
      console.log("🖱️ Botão Imprimir clicado!");
      try {
        const agendamentoId = new URLSearchParams(window.location.search).get(
          "id",
        );
        console.log("📋 Agendamento ID:", agendamentoId);
        if (!agendamentoId) {
          return showNotification("ID do agendamento não encontrado", "error");
        }

        showNotification("Gerando comprovante...", "info");

        // Gerar PDF via API
        const response = await fetch(
          `/api/agendamentos/${agendamentoId}/comprovante`,
          {
            credentials: "include",
          },
        );

        console.log("📡 Response status:", response.status);

        if (!response.ok) {
          let msg = "Erro ao gerar comprovante";
          try {
            const errData = await response.json();
            if (errData && (errData.erro || errData.error)) {
              msg = errData.erro || errData.error;
            }
          } catch (_) {}
          throw new Error(msg);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        console.log("📄 PDF gerado, abrindo modal...");
        openPdfModal(blobUrl, "Comprovante de atendimento");
      } catch (error) {
        console.error("❌ Erro ao gerar comprovante:", error);
        showNotification(
          (error && error.message) || "Erro ao gerar comprovante",
          "error",
        );
      }
    });
  } else {
    console.warn("⚠️ Botão .btn-imprimir-comprovante não encontrado no DOM");
  }

  // Configurar botão Importar (lateral direita) - manter funcionalidade original se houver
  const btnImport = document.querySelector(".btn-import");
  if (btnImport) {
    btnImport.addEventListener("click", function (e) {
      e.preventDefault();
      showNotification(
        "Função de importação será implementada em breve",
        "info",
      );
    });
  }

  // Delegation: abrir menu de ações do item (Editar / Excluir)
  document.addEventListener("click", function (event) {
    const btn = event.target.closest(".btn-item-action");
    if (!btn) return;
    event.stopPropagation();
    // localizar a service-item pai
    const itemEl = btn.closest(".service-item");
    if (!itemEl) return;
    openServiceItemMenu(btn, itemEl);
  });

  console.log("✅ Página de detalhes do agendamento inicializada");
});

// Função para carregar dados do agendamento atual
function carregarDadosAgendamento() {
  try {
    // Recuperar dados do localStorage
    const agendamentoData = localStorage.getItem("agendamento_atual");

    if (agendamentoData) {
      const agendamento = JSON.parse(agendamentoData);
      console.log("📋 Carregando dados do agendamento:", agendamento);

      // Atualizar título do atendimento
      const titulo = document.getElementById("atendimentoTitulo");
      if (titulo) {
        titulo.textContent = `Atendimento ${agendamento.id}`;
      }

      // Atualizar dados do pet
      const petNome = document.getElementById("petNome");
      if (petNome) {
        petNome.textContent = agendamento.petNome || "Pet não informado";
      }

      // Atualizar nome do cliente
      const clienteNome = document.getElementById("clienteNome");
      if (clienteNome) {
        clienteNome.textContent =
          agendamento.clienteNome || "Cliente não informado";
      }

      // Atualizar horário no card
      const horarioElement = document.querySelector(".info-row .info-value");
      if (horarioElement) {
        horarioElement.textContent = agendamento.horario || "Não informado";
      }

      // Atualizar profissional
      const profissionalElement = document.querySelector(
        ".info-row:nth-child(2) .info-value",
      );
      if (profissionalElement) {
        profissionalElement.textContent =
          agendamento.profissional || "Não informado";
      }

      // Atualizar serviço na tabela
      const servicoElement = document.querySelector(
        ".service-item .service-details .service-name",
      );
      if (servicoElement) {
        servicoElement.textContent =
          agendamento.servico || "Serviço não informado";
      }

      // Atualizar valor na tabela
      const valorElement = document.querySelector(
        ".service-item .service-details .service-price",
      );
      if (valorElement) {
        const valor = agendamento.valor || 0;
        valorElement.textContent = formatCurrencyBR(valor);
      }

      // Atualizar totais
      const subtotalElement = document.getElementById("subtotal");
      const totalElement = document.getElementById("total");
      if (subtotalElement && totalElement) {
        const valor = agendamento.valor || 0;
        subtotalElement.textContent = formatCurrencyBR(valor);
        totalElement.textContent = formatCurrencyBR(valor);
      }

      // Atualizar status do agendamento (badge visível) e sincronizar select oculto
      const statusElement = document.querySelector(".status-badge");
      const statusSelectEl = document.getElementById("statusSelect");
      if (statusElement && agendamento.status) {
        statusElement.className = `status-badge status-${agendamento.status}`;
        statusElement.textContent =
          agendamento.statusTexto || agendamento.status;
        if (statusSelectEl) statusSelectEl.value = agendamento.status;
      }

      console.log("✅ Dados do agendamento carregados com sucesso");
    } else {
      console.log("⚠️ Nenhum agendamento encontrado no localStorage");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar dados do agendamento:", error);
  }
}

// Função auxiliar para formatar moeda (caso não exista)
function formatCurrencyBR(value) {
  if (typeof value !== "number") {
    value = parseFloat(value) || 0;
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Função para voltar à lista de agendamentos
function voltarParaLista() {
  window.location.href = "agendamentos-novo.html";
}

// Função para abrir modal de PDF
function openPdfModal(blobUrl, title = "Comprovante de atendimento") {
  // evitar duplicados
  if (document.getElementById("pdfModalOverlay")) return;

  // inserir estilos se necessário
  if (!document.getElementById("pdfModalStyles")) {
    const style = document.createElement("style");
    style.id = "pdfModalStyles";
    style.innerHTML = `
            .pdf-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:14000}
            .pdf-modal{width:92%;max-width:1150px;height:86%;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(2,6,23,0.45);overflow:hidden;display:flex;flex-direction:column}
            .pdf-modal-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e6e9ee;background:#f7f7f8}
            .pdf-modal-title{font-weight:600;color:#222}
            .pdf-modal-toolbar{display:flex;gap:8px;align-items:center}
            .pdf-modal-iframe{flex:1;border:0;width:100%;height:100%}
            .pdf-modal-actions a, .pdf-modal-actions button{background:transparent;border:0;color:#1f2937;padding:6px 10px;border-radius:6px;cursor:pointer}
            .pdf-modal-close{background:#fff;border:1px solid #ddd;padding:6px 10px;border-radius:6px}
        `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement("div");
  overlay.id = "pdfModalOverlay";
  overlay.className = "pdf-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "pdf-modal";

  const header = document.createElement("div");
  header.className = "pdf-modal-header";
  const hTitle = document.createElement("div");
  hTitle.className = "pdf-modal-title";
  hTitle.textContent = title;

  const toolbar = document.createElement("div");
  toolbar.className = "pdf-modal-toolbar pdf-modal-actions";

  const viewBtn = document.createElement("a");
  viewBtn.href = "#";
  viewBtn.textContent = "Ver em uma nova aba";
  viewBtn.onclick = function (ev) {
    ev.preventDefault();
    window.open(blobUrl, "_blank");
  };

  const closeBtn = document.createElement("button");
  closeBtn.className = "pdf-modal-close";
  closeBtn.textContent = "✕ Fechar";
  closeBtn.onclick = function () {
    overlay.remove();
  };

  toolbar.appendChild(viewBtn);
  toolbar.appendChild(closeBtn);

  header.appendChild(hTitle);
  header.appendChild(toolbar);

  const iframe = document.createElement("iframe");
  iframe.className = "pdf-modal-iframe";
  iframe.src = blobUrl;

  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Fechar ao clicar fora do modal
  overlay.onclick = function (e) {
    if (e.target === overlay) overlay.remove();
  };
}

// Inicializar handlers de botões da sidebar direita
document.addEventListener("DOMContentLoaded", function () {
  try {
    const btnCheckout = document.querySelector(".btn-checkout");
    if (btnCheckout) {
      try {
        btnCheckout.removeEventListener("click", finalizarCobranca);
      } catch (e) {}
      btnCheckout.addEventListener("click", async function (ev) {
        ev.preventDefault();
        try {
          // Se a aba ativa for "clínica", redirecionar para aba "detalhes" sem fazer checkout
          const abaAtiva =
            typeof clinicaStateLocal !== "undefined" &&
            clinicaStateLocal.activeTab
              ? clinicaStateLocal.activeTab
              : document.querySelector(".tab-btn.active")?.dataset?.tab || "";

          if (abaAtiva === "clinica") {
            console.log(
              "⚠️ Check-out bloqueado: aba Clínica ativa. Redirecionando para aba Detalhes.",
            );
            if (typeof alternarAba === "function") {
              await alternarAba("detalhes");
            } else {
              // fallback: clicar no botão da aba detalhes diretamente
              const btnDetalhes = document.querySelector(
                '[onclick*="alternarAba"][onclick*="detalhes"], [data-tab="detalhes"]',
              );
              if (btnDetalhes) btnDetalhes.click();
            }
            return;
          }

          // Bloquear checkout se atendimento estiver cancelado
          if (
            window.agendamentoAtual &&
            window.agendamentoAtual.status === "cancelado"
          ) {
            try {
              if (typeof showNotification === "function") {
                showNotification(
                  "Não é possível realizar o check-out. Este atendimento foi cancelado.",
                  "warning",
                );
              }
            } catch (e) {}
            return;
          }

          if (!window.agendamentoAtual) window.agendamentoAtual = {};
          window.agendamentoAtual.__prevStatus =
            window.agendamentoAtual.status || "agendado";

          // Abrir modal de pagamento; a confirmação e o PATCH são tratados dentro de `finalizarCobranca()`
          finalizarCobranca();
        } catch (e) {
          console.error("Erro ao chamar finalizarCobranca via botão", e);
        }
      });
      console.log("✔️ Handler de checkout registrado");
    } else {
      console.log(
        "ℹ️ Botão .btn-checkout não encontrado no DOM ao inicializar.",
      );
    }
    // Mover o botão "Desfazer Checkout" (se existir) para a mesma área do botão "Fazer Checkout"
    try {
      const sidebarActions = document.querySelector(
        ".sidebar-right .action-buttons",
      );
      if (sidebarActions) {
        // Criar um novo botão Desfazer na sidebar (garante posição correta)
        const existingSidebarDesfazer =
          sidebarActions.querySelector(".btn-desfazer");
        if (!existingSidebarDesfazer) {
          const newBtn = document.createElement("button");
          // copiar classes do btnCheckout para manter aparência, se existir
          try {
            newBtn.className = btnCheckout
              ? Array.from(btnCheckout.classList).join(" ")
              : "btn-checkout";
          } catch (e) {
            newBtn.className = "btn-checkout";
          }
          newBtn.classList.add("btn-desfazer");
          newBtn.innerHTML = '<i class="fas fa-undo"></i> Desfazer Checkout';
          // inserir antes do botão de import
          const btnImport = sidebarActions.querySelector(".btn-import");
          // iniciar oculto; visibilidade será controlada por updateCheckoutVisibility()
          newBtn.style.display = "none";
          if (btnImport) sidebarActions.insertBefore(newBtn, btnImport);
          else sidebarActions.appendChild(newBtn);
          // listener
          window.__desfazerListener = function (ev) {
            ev.preventDefault();
            try {
              if (typeof desfazerCheckout === "function") desfazerCheckout();
            } catch (err) {
              console.error("Erro ao executar desfazerCheckout()", err);
            }
          };
          newBtn.addEventListener("click", window.__desfazerListener);
          console.log("✔️ Botão Desfazer (novo) inserido na sidebar direita");
        }

        // esconder o botão original no header (se existir) para evitar duplicação visual
        try {
          const headerDesfazer = document.querySelector(
            ".action-buttons-container .btn-desfazer",
          );
          if (headerDesfazer) headerDesfazer.style.display = "none";
        } catch (e) {}
      } else {
        console.log(
          "ℹ️ Container .sidebar-right .action-buttons não encontrado.",
        );
      }
    } catch (e) {
      console.warn("Erro ao inserir botão Desfazer na sidebar:", e);
    }
  } catch (e) {
    console.warn("Erro registrando handlers da sidebar:", e);
  }
});

// Atualiza visibilidade entre botões Fazer Checkout / Desfazer Checkout
function updateCheckoutVisibility() {
  try {
    const btnCheckout = document.querySelector(
      ".sidebar-right .action-buttons .btn-checkout",
    );
    // .btn-desfazer pode ter sido renomeado/copiado — procurar por texto ou classe original
    let btnDesfazer = document.querySelector(
      ".sidebar-right .action-buttons .btn-desfazer",
    );
    if (!btnDesfazer) {
      // fallback: procurar por botão com texto 'Desfazer' dentro da sidebar
      const candidates = Array.from(
        document.querySelectorAll(".sidebar-right .action-buttons button"),
      );
      btnDesfazer =
        candidates.find((b) => /desfazer/i.test(b.textContent || "")) || null;
    }

    const status =
      window.agendamentoAtual && window.agendamentoAtual.status
        ? String(window.agendamentoAtual.status).toLowerCase()
        : "";
    console.log("🔁 updateCheckoutVisibility:", {
      status,
      btnCheckoutExists: !!btnCheckout,
      btnDesfazerExists: !!btnDesfazer,
    });
    const isChecked = ["concluido", "check-out", "checkout"].includes(status);

    if (isChecked) {
      if (btnCheckout) btnCheckout.style.display = "none";
      if (btnDesfazer) btnDesfazer.style.display = "";
    } else {
      if (btnCheckout) btnCheckout.style.display = "";
      if (btnDesfazer) btnDesfazer.style.display = "none";
    }
  } catch (e) {
    console.warn("Erro updateCheckoutVisibility", e);
  }
}

// ====================== ANEXOS DO PRONTUÁRIO ======================

/**
 * Renderiza um chip de arquivo dentro do card de Anexos do prontuário.
 */
function _renderAnexoChip(registroId, fileInfo) {
  const list = document.getElementById(`anexoList-${registroId}`);
  if (!list) return;

  const type = (fileInfo.type || "").toLowerCase();
  let icon = "fa-file";
  if (type.startsWith("image/")) icon = "fa-file-image";
  else if (type === "application/pdf") icon = "fa-file-pdf";
  else if (type.includes("word") || type.includes("document"))
    icon = "fa-file-word";
  else if (type.includes("excel") || type.includes("spreadsheet"))
    icon = "fa-file-excel";

  const chip = document.createElement("div");
  chip.className = "anexo-chip";
  const fid = fileInfo.id || "";
  chip.setAttribute("data-file-id", fid);
  chip.innerHTML = `
        <span class="anexo-chip-inner" onclick="abrirAnexo('${fileInfo.url}')" title="Clique para visualizar">
            <i class="fas ${icon}"></i>
            <span class="anexo-chip-name">${fileInfo.name}</span>
        </span>
        <button class="anexo-chip-remove" onclick="removerAnexoChip(this,'${registroId}','${fid}')" title="Remover">
            <i class="fas fa-times"></i>
        </button>
    `;
  list.appendChild(chip);
}

/** Abre um anexo em nova aba */
function abrirAnexo(url) {
  window.open(url, "_blank");
}

/** Remove um chip de anexo e atualiza data-files */
function removerAnexoChip(btn, registroId, fileId) {
  const chip = btn.closest(".anexo-chip");
  if (chip) chip.remove();
  const registro = document.querySelector(`[data-registro-id="${registroId}"]`);
  if (registro) {
    const conteudoDiv = registro.querySelector(".registro-conteudo");
    if (conteudoDiv) {
      let files = [];
      try {
        files = JSON.parse(conteudoDiv.getAttribute("data-files") || "[]");
      } catch (e) {}
      files = files.filter((f) => f.id !== fileId);
      conteudoDiv.setAttribute("data-files", JSON.stringify(files));
    }
  }
  salvarProntuarioAutomatico();
}

/** Faz upload de um ou mais arquivos e adiciona os chips */
async function uploadAnexoFile(input, registroId) {
  const agendamentoId = new URLSearchParams(window.location.search).get("id");
  if (!agendamentoId) return;
  const files = Array.from(input.files);
  if (!files.length) return;

  for (const file of files) {
    const formData = new FormData();
    formData.append("arquivo", file);
    try {
      const resp = await fetch(
        `/api/agendamentos/${agendamentoId}/prontuario/anexos`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const fileInfo = await resp.json();

      _renderAnexoChip(registroId, fileInfo);

      const registro = document.querySelector(
        `[data-registro-id="${registroId}"]`,
      );
      if (registro) {
        const conteudoDiv = registro.querySelector(".registro-conteudo");
        if (conteudoDiv) {
          let arr = [];
          try {
            arr = JSON.parse(conteudoDiv.getAttribute("data-files") || "[]");
          } catch (e) {}
          arr.push(fileInfo);
          conteudoDiv.setAttribute("data-files", JSON.stringify(arr));
        }
      }
    } catch (e) {
      console.error("Erro ao enviar arquivo:", e);
      try {
        showNotification("Erro ao enviar arquivo: " + file.name, "error");
      } catch (_) {}
    }
  }
  input.value = "";
  salvarProntuarioAutomatico();
}

// ======================== PRONTUÁRIO PDF ========================
async function gerarPdfProntuario() {
  // Salvar antes de gerar para garantir dados atualizados
  await salvarProntuarioAutomatico();

  const agendamentoId = new URLSearchParams(window.location.search).get("id");
  if (!agendamentoId) {
    showNotification("ID do agendamento não encontrado.", "error");
    return;
  }

  const prontuarioData = coletarDadosProntuario();
  if (!prontuarioData || prontuarioData.length === 0) {
    showNotification(
      "O prontuário está vazio. Adicione registros antes de gerar o PDF.",
      "warning",
    );
    return;
  }

  showNotification("Gerando PDF do prontuário...", "info");
  window.open(`/api/agendamentos/${agendamentoId}/prontuario/pdf`, "_blank");
}

// ====================== TAXI DOG ======================

/**
 * Renderiza o badge de Taxi Dog com base no agendamento atual.
 * Bloqueia a interação quando o status for 'concluido'.
 */
function renderizarTaxidog(agendamento) {
  const valorEl = document.getElementById("taxidogValor");
  const display = document.getElementById("taxidogDisplay");
  const chevron = document.getElementById("taxidogChevron");
  if (!valorEl || !display) return;

  const ativo = !!(agendamento && agendamento.taxidog);
  valorEl.textContent = ativo ? "Sim" : "Não";
  valorEl.className = ativo ? "taxidog-sim" : "taxidog-nao";

  const bloqueado = !!(agendamento && agendamento.status === "concluido");
  display.setAttribute("data-bloqueado", bloqueado ? "true" : "false");
  display.title = bloqueado
    ? "Desfaça o checkout para alterar o Taxi Dog"
    : "Clique para alterar";
  if (chevron) chevron.style.display = bloqueado ? "none" : "";

  // Exibir endereço completo quando Taxi Dog estiver ativo
  try {
    const addrEl = document.getElementById("taxidogAddress");
    if (!addrEl) return;
    if (ativo) {
      // tentar obter dados do cliente do agendamento (várias fontes possíveis)
      const cliente = agendamento?.pet?.cliente || agendamento?.Cliente || null;
      const petName =
        agendamento?.petNome ||
        agendamento?.pet?.nome ||
        agendamento?.Pet?.nome ||
        "";

      if (cliente) {
        const rua = cliente.endereco || "";
        const numero = cliente.numero || "";
        const complemento = cliente.complemento || "";
        const bairro = cliente.bairro || "";
        const cidade = cliente.cidade || "";
        const estado = cliente.estado || "";
        const cep = cliente.cep || "";

        const line1 = `${escapeHtmlText(cliente.nome || "")} ${petName ? "• " + escapeHtmlText(petName) : ""}`;
        const parts = [];
        if (rua)
          parts.push(
            escapeHtmlText(rua) + (numero ? ", " + escapeHtmlText(numero) : ""),
          );
        if (complemento) parts.push("Compl.: " + escapeHtmlText(complemento));
        const local = [
          bairro,
          cidade ? cidade + (estado ? "/" + estado : "") : null,
        ]
          .filter(Boolean)
          .map(escapeHtmlText)
          .join(" • ");

        addrEl.innerHTML = `
          <div style="background:var(--bg-card,#fff);border:1px solid #e9ecef;padding:10px;border-radius:8px;color:var(--text-primary,#222);">
            <div style="font-weight:600; margin-bottom:6px;">${line1}</div>
            <div style="font-size:13px;color:#555;">${parts.join(" • ")}</div>
            ${local ? `<div style="font-size:12px;color:#777;margin-top:6px;">${local}${cep ? " • CEP " + escapeHtmlText(cep) : ""}</div>` : ""}
          </div>
        `;
        addrEl.style.display = "block";
      } else {
        addrEl.style.display = "none";
      }
    } else {
      // esconder quando Taxi Dog = Não
      addrEl.style.display = "none";
    }
  } catch (e) {
    console.warn("Erro ao renderizar endereço Taxi Dog:", e);
  }
}

/**
 * Abre/fecha o dropdown de Taxi Dog.
 * Não permite abrir se o checkout już foi feito.
 */
function toggleTaxidogDropdown() {
  if (agendamentoAtual && agendamentoAtual.status === "concluido") {
    try {
      if (typeof showNotification === "function") {
        showNotification(
          "Desfaça o checkout antes de alterar o Taxi Dog.",
          "error",
        );
      } else {
        alert("Desfaça o checkout antes de alterar o Taxi Dog.");
      }
    } catch (e) {
      alert("Desfaça o checkout antes de alterar o Taxi Dog.");
    }
    return;
  }
  const dropdown = document.getElementById("taxidogDropdown");
  const chevron = document.getElementById("taxidogChevron");
  if (!dropdown) return;
  const aberto = dropdown.style.display !== "none";
  dropdown.style.display = aberto ? "none" : "block";
  if (chevron) chevron.classList.toggle("open", !aberto);
}

/**
 * Salva a opção de Taxi Dog no banco via API e atualiza o badge.
 * @param {boolean} valor - true = Sim, false = Não
 */
async function salvarTaxidog(valor) {
  const dropdown = document.getElementById("taxidogDropdown");
  const chevron = document.getElementById("taxidogChevron");
  if (dropdown) dropdown.style.display = "none";
  if (chevron) chevron.classList.remove("open");

  if (!agendamentoAtual) return;

  try {
    const resp = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxidog: valor }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    agendamentoAtual.taxidog = valor;
    try {
      window.agendamentoAtual = agendamentoAtual;
    } catch (e) {}
    renderizarTaxidog(agendamentoAtual);
    console.log("✅ Taxidog salvo:", valor ? "Sim" : "Não");
  } catch (e) {
    console.error("Erro salvando taxidog:", e);
    alert("Erro ao salvar o Taxi Dog: " + e.message);
  }
}

// Fecha o dropdown de taxidog ao clicar fora
document.addEventListener("click", function (e) {
  const container = document.getElementById("taxidogContainer");
  const dropdown = document.getElementById("taxidogDropdown");
  const chevron = document.getElementById("taxidogChevron");
  if (dropdown && container && !container.contains(e.target)) {
    dropdown.style.display = "none";
    if (chevron) chevron.classList.remove("open");
  }
});
