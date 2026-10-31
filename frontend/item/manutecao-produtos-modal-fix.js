// Override: Abre um modal centralizado para selecionar ou criar agrupamentos
window.abrirDropdownAgrupamentoFixed = async function abrirDropdownAgrupamento(
  tdElement,
  produtoRow,
) {
  try {
    console.log(
      "[manutecao-produtos] abrirDropdownAgrupamento chamado para id=",
      produtoRow && produtoRow.backendId,
    );

    // fechar outros dropdowns (helper global)
    window.closeAllSelectDropdowns && window.closeAllSelectDropdowns(tdElement);

    // Criar modal centralizado
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "flex";
    // Garantir que o overlay cobre TODA a tela usando inset: 0
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "10000";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.background = "transparent";

    // Desabilitar scroll do body enquanto modal está aberto
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";

    const title = document.createElement("h3");
    title.textContent = "Selecionar Agrupamento";
    modalHeader.appendChild(title);

    const btnClose = document.createElement("button");
    btnClose.className = "btn-close";
    btnClose.textContent = "×";
    btnClose.addEventListener("click", () => {
      modal.remove();
    });
    modalHeader.appendChild(btnClose);

    modalContent.appendChild(modalHeader);

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    const list = document.createElement("div");
    list.style.padding = "0";

    modalBody.appendChild(list);
    modalContent.appendChild(modalBody);

    const modalFooter = document.createElement("div");
    modalFooter.className = "modal-footer";

    const btnNovo = document.createElement("button");
    btnNovo.textContent = "Adicionar novo";
    btnNovo.style.flex = "1";
    btnNovo.style.padding = "8px 16px";
    btnNovo.style.borderRadius = "4px";
    btnNovo.style.border = "1px solid #2b8cff";
    btnNovo.style.background = "#2b8cff";
    btnNovo.style.color = "#fff";
    btnNovo.style.cursor = "pointer";
    btnNovo.style.transition = "background 0.12s ease";
    btnNovo.addEventListener("mouseenter", () => {
      btnNovo.style.background = "#1a73e8";
    });
    btnNovo.addEventListener("mouseleave", () => {
      btnNovo.style.background = "#2b8cff";
    });
    modalFooter.appendChild(btnNovo);

    const btnFechar = document.createElement("button");
    btnFechar.textContent = "Fechar";
    btnFechar.style.padding = "8px 16px";
    btnFechar.style.borderRadius = "4px";
    btnFechar.style.border = "1px solid #c82333";
    btnFechar.style.background = "#dc3545";
    btnFechar.style.color = "#fff";
    btnFechar.style.cursor = "pointer";
    btnFechar.style.transition = "background 0.12s ease";
    btnFechar.addEventListener("mouseenter", () => {
      btnFechar.style.background = "#c82333";
    });
    btnFechar.addEventListener("mouseleave", () => {
      btnFechar.style.background = "#dc3545";
    });
    btnFechar.addEventListener("click", () => {
      modal.remove();
    });
    modalFooter.appendChild(btnFechar);

    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Helper para fechar o modal
    function closeModal() {
      try {
        modal.remove();
        // Restaurar scroll do body e html
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.width = "";
        document.documentElement.style.height = "";
      } catch (e) {}
    }

    // Fechar ao clicar fora do modal
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // buscar agrupamentos do backend
    let agrupamentos = [];
    try {
      agrupamentos = await ApiClient.getAgrupamentos();
    } catch (e) {
      console.warn("[manutecao-produtos] falha ao buscar agrupamentos:", e);
      agrupamentos = [];
    }

    function renderList(data) {
      list.innerHTML = "";
      if (!Array.isArray(data) || data.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Nenhum agrupamento encontrado";
        empty.style.padding = "12px 16px";
        empty.style.color = "#666";
        list.appendChild(empty);
        return;
      }

      data.forEach((item) => {
        const itemEl = document.createElement("div");
        itemEl.style.padding = "10px 16px";
        itemEl.style.cursor = "pointer";
        itemEl.style.borderBottom = "1px solid #f0f0f0";
        itemEl.style.borderRadius = "0";
        itemEl.textContent = item.nome || item.name || String(item);
        itemEl.title = item.nome || item.name || "";
        itemEl.addEventListener("mouseenter", () => {
          itemEl.style.background = "#f5f5f5";
        });
        itemEl.addEventListener("mouseleave", () => {
          itemEl.style.background = "transparent";
        });
        itemEl.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (Array.isArray(item.subgrupos) && item.subgrupos.length > 0) {
            list.innerHTML = "";
            const back = document.createElement("div");
            back.textContent = "← Voltar";
            back.style.padding = "10px 16px";
            back.style.cursor = "pointer";
            back.style.color = "#2b8cff";
            back.style.borderBottom = "1px solid #f0f0f0";
            back.addEventListener("click", () => renderList(agrupamentos));
            list.appendChild(back);

            // opção do agrupamento pai (seleciona para todos os subgrupos)
            const parentEl = document.createElement("div");
            parentEl.style.padding = "10px 16px";
            parentEl.style.cursor = "pointer";
            parentEl.style.borderRadius = "0";
            parentEl.style.fontWeight = "600";
            parentEl.style.borderBottom = "1px solid #f0f0f0";
            parentEl.textContent = item.nome || item.name || "";
            parentEl.addEventListener("mouseenter", () => {
              parentEl.style.background = "#f5f5f5";
            });
            parentEl.addEventListener("mouseleave", () => {
              parentEl.style.background = "transparent";
            });
            parentEl.addEventListener("click", function (evParent) {
              evParent.preventDefault();
              evParent.stopPropagation();
              tdElement.textContent = item.nome || item.name || "";
              const row = tdElement.parentElement;
              const btn = row ? row.querySelector(".btn-salvar") : null;
              if (btn) window.markRowDirty && window.markRowDirty(btn);
              if (item.id) row.dataset.agrupamentoId = item.id;
              closeModal();
            });
            list.appendChild(parentEl);

            item.subgrupos.forEach((sub) => {
              const subEl = document.createElement("div");
              subEl.style.padding = "10px 16px";
              subEl.style.paddingLeft = "28px";
              subEl.style.cursor = "pointer";
              subEl.style.borderBottom = "1px solid #f0f0f0";
              subEl.textContent =
                (item.nome || "") + " / " + (sub.nome || sub.name || sub);
              subEl.addEventListener("mouseenter", () => {
                subEl.style.background = "#f5f5f5";
              });
              subEl.addEventListener("mouseleave", () => {
                subEl.style.background = "transparent";
              });
              subEl.addEventListener("click", function (e2) {
                e2.preventDefault();
                e2.stopPropagation();
                tdElement.textContent = sub.nome || sub.name || sub;
                const row = tdElement.parentElement;
                const btn = row ? row.querySelector(".btn-salvar") : null;
                if (btn) window.markRowDirty && window.markRowDirty(btn);
                if (sub.id) row.dataset.agrupamentoId = sub.id;
                closeModal();
              });
              list.appendChild(subEl);
            });
          } else {
            tdElement.textContent = item.nome || item.name || item;
            const row = tdElement.parentElement;
            const btn = row ? row.querySelector(".btn-salvar") : null;
            if (btn) window.markRowDirty && window.markRowDirty(btn);
            if (item.id) row.dataset.agrupamentoId = item.id;
            closeModal();
          }
        });
        list.appendChild(itemEl);
      });
    }

    renderList(agrupamentos);

    btnFechar.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });

    btnNovo.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Preferir o modal do sistema se disponível
        async function openModalAndRefresh() {
          try {
            // abrir modal (o próprio modal persiste na API via saveAgrupamentoAPI)
            window.openAdicionarAgrupamentoModal &&
              window.openAdicionarAgrupamentoModal();

            // observar fechamento do modal para recarregar agrupamentos
            const observer = new MutationObserver(async function (muts, obs) {
              try {
                if (!document.querySelector(".modal-overlay")) {
                  obs.disconnect();
                  agrupamentos = await ApiClient.getAgrupamentos();
                  renderList(agrupamentos);
                  // tentar selecionar por último criado
                  const last =
                    Array.isArray(agrupamentos) && agrupamentos.length
                      ? agrupamentos[agrupamentos.length - 1]
                      : null;
                  if (last) {
                    tdElement.textContent = last.nome || last.name || last;
                    const row = tdElement.parentElement;
                    const btn = row ? row.querySelector(".btn-salvar") : null;
                    if (btn) window.markRowDirty && window.markRowDirty(btn);
                    if (last.id) row.dataset.agrupamentoId = last.id;
                    closeModal();
                  }
                }
              } catch (inner) {
                console.debug("[manutecao-produtos] observer error", inner);
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          } catch (e) {
            console.debug("[manutecao-produtos] openModalAndRefresh error", e);
          }
        }

        if (typeof window.openAdicionarAgrupamentoModal === "function") {
          openModalAndRefresh();
          return;
        }

        // Fallback: abrir com solicitar
        const nome = await solicitar("Nome do novo agrupamento:");
        if (!nome) return;
        try {
          const criado = await ApiClient.criarAgrupamento({ nome: nome });
          agrupamentos = await ApiClient.getAgrupamentos();
          renderList(agrupamentos);
          if (criado && criado.nome) {
            const encontrado = agrupamentos.find(
              (a) =>
                (a.id && String(a.id) === String(criado.id)) ||
                (a.nome && a.nome === criado.nome),
            );
            if (encontrado) {
              tdElement.textContent = encontrado.nome || criado.nome;
              const row = tdElement.parentElement;
              const btn = row ? row.querySelector(".btn-salvar") : null;
              if (btn) window.markRowDirty && window.markRowDirty(btn);
              if (encontrado.id) row.dataset.agrupamentoId = encontrado.id;
              closeModal();
            }
          }
        } catch (err) {
          console.error(
            "[manutecao-produtos] erro ao criar agrupamento (fallback):",
            err,
          );
          try {
            window.showToast &&
              window.showToast("Erro ao criar agrupamento", "error");
          } catch (e) {}
        }
      } catch (err) {
        console.error("[manutecao-produtos] btnNovo handler falhou:", err);
      }
    });
  } catch (err) {
    console.error("[manutecao-produtos] abrirDropdownAgrupamento falhou:", err);
  }
};

// Substituir a função no escopo global
if (typeof abrirDropdownAgrupamento !== "undefined") {
  console.log(
    "[manutecao-produtos-modal-fix] Substituindo abrirDropdownAgrupamento",
  );
  window.abrirDropdownAgrupamento = window.abrirDropdownAgrupamentoFixed;
}
