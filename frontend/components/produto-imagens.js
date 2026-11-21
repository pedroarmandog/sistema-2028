(function () {
  "use strict";
  if (window.PetHubProdutoImagem) return;
  const versao = "20261121-midia1";
  function hash(s) {
    let n = 2166136261;
    for (let i = 0; i < s.length; i++) {
      n ^= s.charCodeAt(i);
      n = Math.imul(n, 16777619);
    }
    return (n >>> 0).toString(16);
  }
  function url(p, tamanho = "miniatura") {
    const ref = [
      p?.imagem,
      p?.imagem_url,
      p?.foto_url,
      p?.foto,
      p?.imagemUrl,
    ].find((v) => typeof v === "string" && v.trim());
    if (!ref) return "";
    if (p.id != null) {
      const base = new URL(window.__API_BASE__ || "/api", location.origin),
        prefix =
          base.pathname.replace(/\/$/, "").replace(/\/api$/, "") + "/api";
      return new URL(
        prefix +
          "/itens/" +
          encodeURIComponent(p.id) +
          "/imagem?versao=" +
          encodeURIComponent(tamanho) +
          "&v=" +
          encodeURIComponent((p.empresa_id || "") + ":" + hash(ref)),
        base.origin,
      ).href;
    }
    if (/^data:image\//i.test(ref)) return ref;
    try {
      if (/^https?:\/\//i.test(ref)) return new URL(ref).href;
      if (ref.startsWith("//") || ref.includes("..") || ref.includes("\\"))
        return "";
      return new URL(
        ref.startsWith("/")
          ? ref
          : ref.startsWith("uploads/")
            ? "/" + ref
            : "/uploads/" + ref,
        location.origin,
      ).href;
    } catch {
      return "";
    }
  }
  function aplicar(img, p, tamanho = "miniatura") {
    const src = url(p, tamanho),
      parent = img.parentElement;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.width = tamanho === "miniatura" ? 80 : 480;
    img.height = tamanho === "miniatura" ? 80 : 480;
    img.style.objectFit = "contain";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.opacity = "0";
    img.style.display = src ? "block" : "none";
    if (parent) {
      if (getComputedStyle(parent).position === "static")
        parent.style.position = "relative";
      let fallback = parent.querySelector("[data-produto-placeholder]");
      if (!fallback) {
        fallback = document.createElement("span");
        fallback.dataset.produtoPlaceholder = "";
        fallback.setAttribute("aria-label", "Foto indisponível");
        fallback.innerHTML = '<i class="fas fa-box" aria-hidden="true"></i>';
        fallback.style.cssText =
          "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9aa6b2;background:#f3f5f7;border-radius:6px;pointer-events:none";
        parent.append(fallback);
      }
      img.onload = () => {
        img.style.opacity = "1";
        fallback.style.display = "none";
        parent.classList.remove("is-loading");
      };
      img.onerror = () => {
        img.style.display = "none";
        img.removeAttribute("src");
        fallback.style.display = "flex";
        parent.classList.remove("is-loading");
      };
      if (src) parent.classList.add("is-loading");
    }
    if (src) img.src = src;
    else img.removeAttribute("src");
  }
  async function lerArquivo(file) {
    if (!file || file.size > 8 * 1024 * 1024)
      throw Error("Escolha uma imagem de até 8 MB.");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(file);
    });
  }
  function renderizarLista(grid, itens, criar) {
    grid.replaceChildren();
    let index = 0;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.produtosMais = "";
    button.style.cssText =
      "grid-column:1/-1;padding:12px;border:1px solid #d2dce5;background:white;border-radius:8px;cursor:pointer";
    function batch() {
      const frag = document.createDocumentFragment();
      const end = Math.min(index + 60, itens.length);
      for (; index < end; index++) frag.append(criar(itens[index]));
      button.remove();
      grid.append(frag);
      if (index < itens.length) {
        button.textContent = "Carregar mais · " + index + " de " + itens.length;
        grid.append(button);
      }
    }
    button.addEventListener("click", batch);
    batch();
  }
  window.PetHubProdutoImagem = {
    versao,
    url,
    aplicar,
    lerArquivo,
    renderizarLista,
  };
})();
