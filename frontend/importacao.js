(() => {
  "use strict";
  const config = document.currentScript.dataset;
  const tipo = config.tipo;
  const root =
    tipo === "clientes" ? "/api/clientes/importacao" : "/api/itens/importacao";
  const titulo =
    tipo === "clientes" ? "Importar Clientes" : "Importar Produtos";
  let modal,
    anterior,
    arquivo,
    meta,
    previa,
    escolhas = {},
    pagina = 0,
    ocupado = false,
    relatorio = [];
  const el = (tag, texto) => {
    const n = document.createElement(tag);
    if (texto != null) n.textContent = texto;
    return n;
  };
  function botao(texto, fn, classe = "") {
    const b = el("button", texto);
    b.type = "button";
    b.className = classe;
    b.onclick = fn;
    return b;
  }
  async function request(url, options = {}) {
    const r = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      ...options,
    });
    const d = await r.json();
    if (!r.ok)
      throw new Error(d.erro || d.error || "Falha ao acessar a importação.");
    return d;
  }
  function aviso(texto, erro = false) {
    const n = modal.querySelector(".notice");
    n.textContent = texto;
    n.classList.toggle("error", erro);
  }
  function busy(v) {
    ocupado = v;
    modal.querySelector("progress").hidden = !v;
    modal.querySelectorAll("button,select,input").forEach((n) => {
      if (v) {
        n.dataset.phDisabled = String(n.disabled);
        n.disabled = true;
      } else if (n.dataset.phDisabled != null) {
        n.disabled = n.dataset.phDisabled === "true";
        delete n.dataset.phDisabled;
      }
    });
    modal.querySelector("[data-confirmar]").disabled = v || !previa?.token;
  }
  function invalidar() {
    previa = null;
    modal.querySelector("[data-confirmar]").disabled = true;
    modal.querySelector(".table-wrap").replaceChildren();
    relatorio = [];
  }
  function fechar() {
    if (ocupado) return;
    modal.remove();
    modal = null;
    anterior?.focus();
    document.removeEventListener("keydown", tecla);
  }
  function tecla(e) {
    if (e.key === "Escape") fechar();
    if (e.key === "Tab" && modal) {
      const ns = [...modal.querySelectorAll("button,select,input,a")].filter(
        (n) => !n.disabled && n.offsetParent !== null,
      );
      if (e.shiftKey && document.activeElement === ns[0]) {
        e.preventDefault();
        ns.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === ns.at(-1)) {
        e.preventDefault();
        ns[0]?.focus();
      }
    }
  }
  function csv(linhas, nome) {
    const texto =
      "\ufeff" +
      linhas
        .map((row) =>
          row
            .map((v) => {
              let s = String(v ?? "");
              if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
              return '"' + s.replace(/"/g, '""') + '"';
            })
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
        new Blob([texto], { type: "text/csv;charset=utf-8" }),
      ),
      a = el("a");
    a.href = url;
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderizarMapa(d) {
    const box = modal.querySelector(".mapping");
    box.replaceChildren();
    if (d.abas?.length > 1) {
      const label = el("label", "Aba da planilha"),
        select = el("select");
      select.id = "ph-aba";
      d.abas.forEach((nome) => {
        const o = el("option", nome);
        o.value = nome;
        select.append(o);
      });
      select.value = d.aba;
      select.onchange = () => {
        modal
          .querySelectorAll("[data-coluna]")
          .forEach((n) => n.parentElement.remove());
        invalidar();
      };
      label.append(select);
      box.append(label);
    }
    d.cabecalho.forEach((nome, i) => {
      const label = el("label", nome || "Coluna " + (i + 1)),
        select = el("select");
      select.dataset.coluna = i;
      const vazio = el("option", "Selecione um campo");
      vazio.value = "";
      select.append(vazio);
      const ignorar = el("option", "Ignorar esta coluna");
      ignorar.value = "ignorar";
      select.append(ignorar);
      Object.entries(meta.campos).forEach(([k, nomes]) => {
        const o = el("option", nomes[0]);
        o.value = k;
        select.append(o);
      });
      select.value = d.mapeamento[i] || "";
      select.onchange = () => {
        invalidar();
        aviso("Clique em Analisar planilha para conferir o novo mapeamento.");
      };
      label.append(select);
      box.append(label);
    });
  }
  function tabela() {
    const box = modal.querySelector(".table-wrap");
    box.replaceChildren();
    const t = el("table"),
      head = el("tr");
    ["Linha", "Registro", "Validação / classificação", "Ação"].forEach((s) =>
      head.append(el("th", s)),
    );
    t.append(head);
    const rows = previa.linhas;
    rows.slice(pagina * 50, pagina * 50 + 50).forEach((row) => {
      const tr = el("tr");
      tr.append(el("td", row.linha));
      const detalhes = Object.entries(row.dados || {})
        .map(([k, v]) => (meta.campos[k]?.[0] || k) + " = " + v)
        .join("\n");
      const td = el(
        "td",
        detalhes || "Confira os campos obrigatórios da linha",
      );
      td.style.whiteSpace = "pre-wrap";
      tr.append(td);
      tr.append(
        el(
          "td",
          row.erro ||
            [row.aviso, row.classificacao].filter(Boolean).join(" · ") ||
            "Válido",
        ),
      );
      const acao = el("td");
      if (row.erro || row.repetida) acao.textContent = "Ignorar";
      else {
        const select = el("select");
        const opcoes = row.existente
          ? [
              ["ignorar", "Ignorar duplicado"],
              ["atualizar", "Atualizar campos preenchidos"],
            ]
          : [
              ["criar", "Importar"],
              ["ignorar", "Ignorar"],
            ];
        opcoes.forEach(([valor, nome]) => {
          const o = el("option", nome);
          o.value = valor;
          select.append(o);
        });
        select.value = escolhas[row.linha] || row.acao;
        select.onchange = () => {
          escolhas[row.linha] = select.value;
        };
        select.setAttribute("aria-label", "Ação da linha " + row.linha);
        acao.append(select);
      }
      tr.append(acao);
      t.append(tr);
    });
    box.append(t);
    const pager = el("div");
    pager.className = "pager";
    const ant = botao("Anterior", () => {
        pagina--;
        tabela();
      }),
      prox = botao("Próxima", () => {
        pagina++;
        tabela();
      });
    ant.disabled = pagina === 0;
    prox.disabled = (pagina + 1) * 50 >= rows.length;
    pager.append(
      ant,
      el(
        "span",
        "Página " +
          (pagina + 1) +
          " de " +
          Math.max(1, Math.ceil(rows.length / 50)),
      ),
      prox,
    );
    box.append(pager);
  }
  async function analisar() {
    if (!arquivo) {
      aviso("Selecione um arquivo CSV, XLS ou XLSX.", true);
      return;
    }
    const mapa = [...modal.querySelectorAll("[data-coluna]")].map(
      (n) => n.value,
    );
    if (mapa.length && mapa.some((v) => !v)) {
      aviso(
        "Associe cada coluna a um campo ou escolha Ignorar esta coluna.",
        true,
      );
      return;
    }
    const form = new FormData();
    form.append("arquivo", arquivo);
    if (mapa.length) form.append("mapeamento", JSON.stringify(mapa));
    const aba = modal.querySelector("#ph-aba")?.value;
    if (aba) form.append("aba", aba);
    form.append("centroPadrao", modal.querySelector("#ph-centro")?.value || "");
    busy(true);
    aviso("Analisando arquivo…");
    try {
      const d = await request(root + "/analisar", {
        method: "POST",
        body: form,
      });
      renderizarMapa(d);
      if (d.precisaMapear) {
        invalidar();
        aviso(
          "Confirme o destino das colunas não reconhecidas e clique em Analisar planilha.",
        );
        return;
      }
      previa = d;
      escolhas = {};
      pagina = 0;
      tabela();
      relatorio = d.linhas
        .filter((r) => r.erro || r.repetida)
        .map((r) => ({
          linha: r.linha,
          motivo: r.erro || r.aviso,
          registro: JSON.stringify(r.dados || r.originais),
        }));
      const r = d.resumo;
      aviso(
        r.total +
          " registros · " +
          r.validos +
          " válidos · " +
          r.erros +
          " com erro · " +
          r.duplicados +
          " avisos de duplicidade. Confira as ações antes de confirmar.",
      );
    } catch (e) {
      invalidar();
      aviso(e.message, true);
    } finally {
      busy(false);
    }
  }
  async function confirmar() {
    if (!previa?.token) return;
    busy(true);
    aviso("Salvando registros. Aguarde…");
    try {
      const d = await request(root + "/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: previa.token, escolhas }),
      });
      relatorio = d.relatorio;
      previa = null;
      aviso(
        d.criados +
          " criados · " +
          d.atualizados +
          " atualizados · " +
          d.ignorados +
          " ignorados.",
      );
      modal.querySelector(".table-wrap").replaceChildren();
      modal
        .querySelector("footer")
        .append(botao("Atualizar lista", () => location.reload(), "primary"));
    } catch (e) {
      aviso(e.message, true);
    } finally {
      busy(false);
    }
  }
  async function abrir() {
    if (modal) return;
    anterior = document.activeElement;
    arquivo = null;
    previa = null;
    escolhas = {};
    relatorio = [];
    modal = el("div");
    modal.className = "ph-import-backdrop";
    const dialog = el("section");
    dialog.className = "ph-import";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", titulo);
    const header = el("header");
    header.append(el("h2", titulo), botao("Fechar", fechar));
    const main = el("main");
    main.append(
      el(
        "p",
        tipo === "clientes"
          ? "Importe sua planilha com as colunas em qualquer ordem. Nome é obrigatório."
          : "Nome, custo e venda são obrigatórios. Confira a classificação dos centros antes de salvar.",
      ),
    );
    const download = el("a", "Baixar Modelo CSV");
    download.href = root + "/modelo";
    download.download = "";
    main.append(download);
    const drop = el(
      "label",
      "Selecione ou arraste um arquivo CSV, XLS ou XLSX. Até 5 MB e 2.500 registros.",
    );
    drop.className = "drop";
    const input = el("input");
    input.type = "file";
    input.accept = ".csv,.xls,.xlsx";
    drop.append(input);
    function escolher(file) {
      arquivo = file;
      invalidar();
      modal.querySelector(".mapping").replaceChildren();
      aviso(
        file ? "Arquivo selecionado — " + file.name : "Selecione uma planilha.",
      );
    }
    input.onchange = () => escolher(input.files[0]);
    drop.ondragover = (e) => e.preventDefault();
    drop.ondrop = (e) => {
      e.preventDefault();
      escolher(e.dataTransfer.files[0]);
    };
    main.append(drop);
    const progress = el("progress");
    progress.hidden = true;
    main.append(progress);
    const notice = el("div");
    notice.className = "notice";
    notice.setAttribute("role", "status");
    main.append(notice);
    const mapping = el("div");
    mapping.className = "mapping";
    main.append(mapping);
    const centro = el("label", "Centro padrão para itens sem correspondência");
    centro.hidden = tipo !== "produtos";
    const select = el("select");
    select.id = "ph-centro";
    select.onchange = invalidar;
    centro.append(select);
    main.append(centro);
    if (tipo === "produtos") {
      const gerenciar = el("a", "Gerenciar centros de resultado desta empresa");
      gerenciar.href = "/configuracoes/centro-resultado.html";
      gerenciar.target = "_blank";
      gerenciar.rel = "noopener";
      main.append(
        gerenciar,
        el(
          "p",
          "Após cadastrar um novo centro, feche e reabra a importação para atualizar as opções.",
        ),
      );
    }
    main.append(botao("Analisar planilha", analisar));
    const table = el("div");
    table.className = "table-wrap";
    main.append(table);
    const footer = el("footer"),
      confirm = botao("Confirmar importação", confirmar, "primary");
    confirm.dataset.confirmar = "";
    confirm.disabled = true;
    footer.append(
      botao("Baixar relatório", () =>
        csv(
          [
            ["Linha", "Motivo", "Registro"],
            ...relatorio.map((r) => [r.linha, r.motivo, r.registro || ""]),
          ],
          tipo + "-relatorio.csv",
        ),
      ),
      botao("Cancelar", fechar),
      confirm,
    );
    dialog.append(header, main, footer);
    modal.append(dialog);
    document.body.append(modal);
    document.addEventListener("keydown", tecla);
    header.querySelector("button").focus();
    busy(true);
    try {
      meta = await request(root + "/campos");
      const o = el("option", "Selecione se necessário");
      o.value = "";
      select.append(o);
      meta.centros.forEach((nome) => {
        const o = el("option", nome);
        o.value = nome;
        select.append(o);
      });
      aviso(
        tipo === "produtos" && !meta.centros.length
          ? "Cadastre um Centro de Resultado na empresa antes de importar os produtos."
          : "Selecione o arquivo e clique em Analisar planilha.",
      );
    } catch (e) {
      aviso(e.message, true);
    } finally {
      busy(false);
    }
  }
  function iniciar() {
    const alvo = document.querySelector(config.alvo);
    if (!alvo) return;
    const b = botao(titulo, abrir, "ph-import-launch");
    alvo.append(b);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
