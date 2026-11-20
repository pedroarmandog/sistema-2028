(function () {
  "use strict";
  if (window.PortalVisualPanel) return;
  const V = window.PortalVisual,
    T = window.PortalTema,
    esc = (v) =>
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
  let root,
    api,
    current,
    area = "inicio",
    previewTab = "inicio",
    drafts = {},
    files = {},
    urls = {},
    generation = 0,
    busy = false;
  const fields = ["titulo", "texto", "modo", "ocultarTextos", "x", "y"];
  function item(k) {
    const d = drafts[k] || current.visuais[k];
    return Object.fromEntries(fields.map((n) => [n, d[n]]));
  }
  function status(text, error = false) {
    const s = root.querySelector("#pc-visual-status");
    s.textContent = text;
    s.className = "pc-note " + (error ? "pc-error" : "");
  }
  function change() {
    const f = root.querySelector("#pc-visuais-form");
    drafts[area] = {
      titulo: f.elements.titulo.value,
      texto: f.elements.texto.value,
      modo: f.elements.modo.value,
      ocultarTextos: f.elements.ocultarTextos.checked,
      x: Number(f.elements.x.value),
      y: Number(f.elements.y.value),
    };
    showPreview();
  }
  function editor() {
    const v = item(area),
      f = root.querySelector("#pc-visuais-form");
    for (const k of fields)
      if (k === "ocultarTextos") f.elements[k].checked = v[k];
      else f.elements[k].value = v[k];
    root.querySelector("[data-resolution]").textContent =
      V.AREAS[area].resolucao;
    root.querySelector("#pc-banner-file").value = "";
    root.querySelector("[data-file-state]").textContent = files[area]
      ? "Imagem selecionada, ainda não salva."
      : "JPG, PNG ou WebP, até 5 MB. WebP é recomendado.";
    showPreview();
  }
  function previewArea() {
    return (
      {
        boasVindas: "boasVindas",
        inicio: "inicio",
        pets: "pet",
        agendamento: "agendamento",
        historico: "historico",
        perfil: "boasVindas",
        pet: "pet",
        solicitacoes: "solicitacoes",
      }[previewTab] || area
    );
  }
  function showPreview() {
    if (!root?.isConnected) return;
    const k = previewArea(),
      v = { ...current.visuais[k], ...drafts[k] },
      image = urls[k] || v.imagem,
      values = {
        nome_cliente: "Tutor",
        nome_empresa: "Seu estabelecimento",
        nome_pet: "Seu pet",
      };
    const f = document.getElementById("pc-aparencia-form"),
      cores = { ...current.cores };
    if (f)
      for (const n of T.CAMPOS)
        if (/^#[a-f0-9]{6}$/i.test(f.elements[n]?.value))
          cores[n] = f.elements[n].value;
    const style = Object.entries(T.tokens(cores))
        .map(([n, x]) => n + ":" + x)
        .join(";"),
      full = v.modo === "banner" && (v.personalizada || files[k]),
      title = V.interpolar(v.titulo, values),
      text = V.interpolar(v.texto, values);
    const labels = {
      boasVindas: "Boas-vindas",
      inicio: "Início",
      pets: "Meus Pets",
      agendamento: "Agendar",
      historico: "Histórico",
      perfil: "Meu perfil",
      pet: "Perfil do pet",
      solicitacoes: "Solicitações",
    };
    let body =
      '<section class="hero premium-hero ' +
      (full ? "hero-full" : "") +
      '"><div class="hero-stage"><div class="hero-copy" ' +
      (full && v.ocultarTextos ? "hidden" : "") +
      '><span class="eyebrow">PRÉ-VISUALIZAÇÃO</span><h1>' +
      esc(title) +
      "</h1><p>" +
      esc(text) +
      '</p></div><img class="hero-art" alt="" src="' +
      esc(image) +
      '" style="object-position:' +
      v.x +
      "% " +
      v.y +
      '%"></div><div class="hero-actions"><button class="btn dark">' +
      (previewTab === "agendamento"
        ? "Revisar solicitação"
        : "Agendar cuidado") +
      " →</button></div></section>";
    if (previewTab === "pets")
      body =
        '<h1>Meus Pets</h1><p class="muted">Os pets reais do tutor aparecem aqui.</p><div class="card"><div class="row"><span class="avatar large">♡</span><div><h2>Nome do pet</h2><small>Foto e dados do cadastro</small></div></div></div>';
    if (previewTab === "perfil")
      body =
        '<h1>Meu perfil</h1><div class="card"><h2>Dados pessoais</h2><label>Nome<input disabled placeholder="Nome do tutor"></label><label>Telefone<input disabled placeholder="Telefone cadastrado"></label></div><button class="btn wide">Salvar alterações</button>';
    const iframe = root.querySelector("iframe");
    iframe.srcdoc =
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/cliente-app/app.css"><link rel="stylesheet" href="/cliente-app/premium.css"><style>:root{' +
      style +
      '}body{min-width:0}main{padding-bottom:24px}.topbar{min-height:70px}.hero-stage{min-height:190px}.hero-actions{max-width:90%}</style></head><body><header class="topbar"><small>Logo do estabelecimento</small></header><main><small class="hint">Simulação de aparência · ' +
      labels[previewTab] +
      "</small>" +
      body +
      "</main></body></html>";
    const thumbnail = root.querySelector("[data-image-preview]");
    thumbnail.src = urls[area] || current.visuais[area].imagem;
    thumbnail.style.objectFit =
      item(area).modo === "banner" ? "cover" : "contain";
    thumbnail.style.objectPosition = item(area).x + "% " + item(area).y + "%";
  }
  function updated(r, clean = false) {
    current = r;
    if (clean) {
      drafts = {};
      files = {};
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
      urls = {};
    }
    document.dispatchEvent(
      new CustomEvent("pethub:aparencia-atualizada", { detail: r }),
    );
    window.dispatchEvent(new Event("pethub:portal-atualizado"));
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    change();
    try {
      for (const v of Object.values(drafts)) V.validarItem(v);
    } catch (err) {
      status(err.message, true);
      return;
    }
    busy = true;
    root.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      for (const [k, file] of Object.entries(files)) {
        const data = new FormData();
        data.append("versao", String(current.versao));
        data.append("arquivo", file);
        updated(
          await api("/aparencia/visual/" + k, { method: "POST", body: data }),
        );
        delete files[k];
      }
      const r = await api("/aparencia", {
        method: "PUT",
        body: { versao: current.versao, visuais: drafts },
      });
      updated(r, true);
      document.dispatchEvent(
        new CustomEvent("pethub:config-salva", { detail: { form: e.target } }),
      );
      editor();
      void privateImages();
      status("Imagens, enquadramento e textos salvos para esta empresa.");
    } catch (err) {
      status(err.message, true);
    } finally {
      busy = false;
      root.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  }
  async function restore(all) {
    if (
      busy ||
      !confirm(
        all
          ? "Restaurar cores, imagens e textos padrão somente desta empresa?"
          : "Restaurar imagem e textos padrão de " + V.AREAS[area].nome + "?",
      )
    )
      return;
    busy = true;
    try {
      const r = await api("/aparencia", {
        method: "PUT",
        body: {
          versao: current.versao,
          ...(all ? { restaurarTudo: true } : { visuais: { [area]: null } }),
        },
      });
      if (all) {
        updated(r, true);
        const f = document.getElementById("pc-aparencia-form");
        if (f) {
          for (const k of T.CAMPOS) {
            f.elements[k].value = r.cores[k];
            f.querySelector('[data-paleta-picker="' + k + '"]').value =
              r.cores[k];
          }
          T.aplicar(document.getElementById("pc-tema-preview"), r.cores);
        }
      } else {
        delete drafts[area];
        delete files[area];
        if (urls[area]) URL.revokeObjectURL(urls[area]);
        delete urls[area];
        updated(r);
      }
      editor();
      void privateImages();
      status("Padrão restaurado para esta empresa.");
      document.dispatchEvent(
        new CustomEvent("pethub:config-salva", {
          detail: { form: root.querySelector("form") },
        }),
      );
    } catch (e) {
      status(e.message, true);
    } finally {
      busy = false;
    }
  }
  async function privateImages() {
    const token = window.MobileAuth?.getToken();
    if (!token) return;
    const seq = ++generation;
    for (const k of V.CAMPOS) {
      const url = current.visuais[k].imagem;
      if (!url.startsWith("/api/cliente-portal/")) continue;
      try {
        const r = await fetch((window.API_URL || window.VPS_URL || "") + url, {
          credentials: "include",
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        if (!r.ok) continue;
        const u = URL.createObjectURL(await r.blob());
        if (seq !== generation) {
          URL.revokeObjectURL(u);
          continue;
        }
        if (!files[k]) {
          if (urls[k]) URL.revokeObjectURL(urls[k]);
          urls[k] = u;
        }
      } catch {}
    }
    showPreview();
  }
  function mount(section, request, r) {
    if (!section?.isConnected) return;
    api = request;
    current = r;
    if (section.querySelector("#pc-visuais")) return;
    root = document.createElement("div");
    root.id = "pc-visuais";
    root.className = "pc-visuais";
    section.append(root);
    root.innerHTML =
      '<div class="pc-visual-heading"><div><h2>Imagens e banners do aplicativo</h2><p class="pc-muted">Personalize cada tela sem alterar os outros estabelecimentos. Sem alterações, o mascote e os textos padrão são mantidos.</p></div><button type="button" class="pc-secondary" data-restore-all>Restaurar aparência padrão do PetHub</button></div><div class="pc-visual-workspace"><div><label>Área visual<select id="pc-visual-area">' +
      V.CAMPOS.map(
        (k) =>
          '<option value="' +
          k +
          '" ' +
          (k === area ? "selected" : "") +
          ">" +
          V.AREAS[k].nome +
          "</option>",
      ).join("") +
      '</select></label><form id="pc-visuais-form"><div class="pc-upload-preview"><img data-image-preview alt="Prévia da imagem escolhida"></div><label>Alterar imagem<input id="pc-banner-file" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="pc-muted" data-file-state></p><small>Resolução recomendada: <strong data-resolution></strong>. Ilustrações quadradas e mascotes transparentes: 1000 × 1000 px. As medidas são sugestões.</small><label>Modo de exibição<select name="modo"><option value="ilustracao">Substituir apenas a ilustração (recomendado)</option><option value="banner">Banner personalizado completo</option></select></label><p class="pc-muted">No modo banner, os botões ficam fora da imagem. Use o enquadramento para preservar o assunto principal.</p><div class="pc-grid"><label>Enquadramento horizontal<input type="range" name="x" min="0" max="100"></label><label>Enquadramento vertical<input type="range" name="y" min="0" max="100"></label></div><h3>Textos do aplicativo</h3><label>Título<input name="titulo" maxlength="120" required></label><label>Mensagem<textarea name="texto" maxlength="350"></textarea></label><p class="pc-muted">Variáveis permitidas: {nome_cliente}, {nome_empresa} e {nome_pet}. Os valores reais serão usados no app.</p><label><input type="checkbox" name="ocultarTextos"> Ocultar título e mensagem no banner completo</label><div class="pc-row"><button type="submit">Salvar imagens e textos</button><button type="button" class="pc-secondary" data-restore-area>Restaurar esta área</button></div></form><div id="pc-visual-status" role="status"></div></div><aside class="pc-visual-preview"><h3>Pré-visualização</h3><label>Tela<select id="pc-visual-preview-tab"><option value="boasVindas">Boas-vindas</option><option value="inicio" selected>Início</option><option value="pets">Meus Pets</option><option value="agendamento">Agendamento</option><option value="historico">Histórico</option><option value="perfil">Perfil</option><option value="pet">Perfil do pet</option><option value="solicitacoes">Solicitações</option></select></label><iframe sandbox="allow-same-origin" title="Simulação da aparência do PetHub Cliente"></iframe><p class="pc-muted">Simulação visual. Os dados do tutor e do pet serão preenchidos pelo aplicativo.</p></aside></div>';
    root.querySelector("form").addEventListener("submit", save);
    root.addEventListener("input", (e) => {
      if (e.target.closest("form") && e.target.type !== "file") change();
    });
    root.querySelector("#pc-visual-area").onchange = (e) => {
      area = e.target.value;
      previewTab = area;
      root.querySelector("#pc-visual-preview-tab").value = previewTab;
      editor();
    };
    root.querySelector("#pc-visual-preview-tab").onchange = (e) => {
      previewTab = e.target.value;
      showPreview();
    };
    root.querySelector("#pc-banner-file").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      ) {
        e.target.value = "";
        status("Selecione JPG, PNG ou WebP de até 5 MB.", true);
        return;
      }
      files[area] = file;
      if (urls[area]) URL.revokeObjectURL(urls[area]);
      urls[area] = URL.createObjectURL(file);
      root.querySelector("[data-file-state]").textContent =
        "Imagem selecionada, ainda não salva.";
      showPreview();
    };
    root.querySelector("[data-restore-area]").onclick = () => restore(false);
    root.querySelector("[data-restore-all]").onclick = () => restore(true);
    editor();
    void privateImages();
    document.addEventListener("input", (e) => {
      if (e.target.closest("#pc-aparencia-form")) showPreview();
    });
  }
  document.addEventListener("pethub:aparencia-atualizada", (e) => {
    if (root?.isConnected) {
      current = e.detail;
      showPreview();
    }
  });
  window.PortalVisualPanel = { mount };
})();
