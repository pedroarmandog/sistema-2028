import { api, upload, BASE } from "./api.js";
import { state, rerender } from "./state.js";
import { esc, icon, avatar, ago, modal, empty, toast, asset } from "./ui.js";
let feedObserver;
window.addEventListener("hashchange", () => feedObserver?.disconnect());
window.addEventListener("community:refresh", () => feedObserver?.disconnect());
const author = () => state.me.profiles.find((p) => p.id === state.active);
const caption = (v) =>
  esc(v).replace(
    /(^|\s)(#[\p{L}\p{N}_]+)/gu,
    (_, space, tag) =>
      space +
      `<a class="hashtag" href="#/explorar?busca=${encodeURIComponent(tag)}">${tag}</a>`,
  );
export function card(p) {
  return `<article class="post surface" data-post="${p.id}"><header class="post-header"><a href="#/p/${p.author.id}" class="author">${avatar(p.author, BASE)}<span><strong>${esc(p.author.name)}</strong><small>@${esc(p.author.handle)} <i>·</i> ${ago(p.createdAt)}</small></span></a><button class="icon-btn" data-action="menu" aria-label="Opções da publicação">${icon("more")}</button></header>${p.text ? `<p class="caption">${caption(p.text)}</p>` : ""}${p.media.length ? `<div class="gallery" aria-label="Fotos da publicação">${p.media.map((m, i) => `<button data-action="photo" data-photo="${i}" aria-label="Ampliar foto ${i + 1}"><img src="${BASE + m.url}" alt="Foto publicada por ${esc(p.author.name)}" loading="lazy" width="${m.width}" height="${m.height}"></button>`).join("")}</div>${p.media.length > 1 ? `<div class="gallery-indicator">${p.media.length} fotos · deslize para ver</div>` : ""}` : ""}<div class="post-actions"><button data-action="like" class="${p.liked ? "liked" : ""}" aria-label="Curtir" aria-pressed="${p.liked}">${icon("heart")}<span>${p.likes || ""}</span></button><button data-action="comments" aria-label="Comentários">${icon("comment")}<span>${p.comments || ""}</span></button><button data-action="share" aria-label="Compartilhar">${icon("share")}</button><button data-action="save" class="save-action ${p.saved ? "saved" : ""}" aria-label="Salvar publicação" aria-pressed="${p.saved}">${icon("save")}</button></div>${p.likes ? `<p class="post-likes">${p.likes} pessoa${p.likes === 1 ? " curtiu" : "s curtiram"} este momento</p>` : ""}${p.comments ? `<button class="comment-preview" data-action="comments">Ver ${p.comments} comentário${p.comments === 1 ? "" : "s"}</button>` : ""}<small class="visibility">${{ publico: "Compartilhado com a Comunidade", seguidores: "Para seguidores deste perfil", privado: "Só você pode ver" }[p.visibility]}</small></article>`;
}
function bindCards(container, posts) {
  container.onclick = async (e) => {
    const b = e.target.closest("[data-action]"),
      article = b?.closest("[data-post]");
    if (!b || !article || b.disabled) return;
    const p = posts.find((p) => p.id === article.dataset.post);
    if (!p) return;
    const act = b.dataset.action;
    if (act === "photo") {
      const img = p.media[Number(b.dataset.photo)];
      modal(
        `<img class="full-photo" src="${BASE + img.url}" alt="Foto de ${esc(p.author.name)}">`,
        { className: "media-modal" },
      );
      return;
    }
    if (act === "comments") {
      comments(p);
      return;
    }
    if (act === "share") {
      const url = location.origin + location.pathname + "#/post/" + p.id;
      try {
        if (navigator.share)
          await navigator.share({
            title: "Uma história da Comunidade PetHub",
            url,
          });
        else {
          await navigator.clipboard.writeText(url);
          toast("Link copiado.");
        }
      } catch (e) {
        if (e.name !== "AbortError") toast("Não foi possível compartilhar.");
      }
      return;
    }
    if (act === "menu") {
      const dlg = modal(
        `<h2>Esta publicação</h2><button class="settings-action" id="report">${icon("flag")} Denunciar</button>${p.own ? '<button class="settings-action danger" id="remove">Remover minha publicação</button>' : ""}`,
      );
      dlg.querySelector("#report").onclick = () => report("post", p.id);
      dlg.querySelector("#remove")?.addEventListener("click", () => {
        const confirm = modal(
          '<h2>Remover publicação?</h2><p>Ela deixará de aparecer na Comunidade.</p><button class="primary danger" id="yes">Remover</button>',
        );
        confirm.querySelector("#yes").onclick = async (event) => {
          event.target.disabled = true;
          try {
            await api("/posts/" + p.id, { method: "DELETE" });
            confirm.close();
            dlg.close();
            state.cache.clear();
            rerender();
          } catch (err) {
            toast(err.message);
            event.target.disabled = false;
          }
        };
      });
      return;
    }
    if (["like", "save"].includes(act)) {
      const old = act === "like" ? p.liked : p.saved;
      b.disabled = true;
      b.classList.toggle(act === "like" ? "liked" : "saved", !old);
      b.setAttribute("aria-pressed", String(!old));
      if (act === "like")
        b.querySelector("span").textContent = p.likes + (old ? -1 : 1) || "";
      try {
        const updated = await api("/posts/" + p.id + "/" + act, {
          method: old ? "DELETE" : "PUT",
          body: { profile_id: state.active },
        });
        Object.assign(p, updated);
        article.outerHTML = card(p);
      } catch (err) {
        b.classList.toggle(act === "like" ? "liked" : "saved", old);
        b.setAttribute("aria-pressed", String(old));
        if (act === "like") b.querySelector("span").textContent = p.likes || "";
        toast(err.message);
      } finally {
        b.disabled = false;
      }
    }
  };
}
export function report(kind, id) {
  const dlg = modal(
    `<h2>O que aconteceu?</h2><p>Explique o motivo para a equipe de moderação.</p><form><label>Categoria<select name="category">${(state.me.platform?.reportReasons || ["Outros"]).map((r) => `<option>${esc(r)}</option>`).join("")}</select></label><label>Motivo<textarea name="reason" maxlength="1000" required></textarea></label><button class="primary">Enviar denúncia</button><p class="form-error" role="alert"></p></form>`,
  );
  dlg.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      await api("/reports", {
        method: "POST",
        body: {
          kind,
          target_id: id,
          reason:
            (new FormData(e.target).get("category") || "Outros") +
            ": " +
            new FormData(e.target).get("reason"),
        },
      });
      dlg.close();
      toast("Denúncia enviada à moderação.");
    } catch (err) {
      e.target.querySelector(".form-error").textContent = err.message;
      b.disabled = false;
    }
  };
}
async function comments(post) {
  const dlg = modal(
    `<h2>Boas conversas começam aqui.</h2><p>Comentários em ${esc(post.author.name)}</p><div class="comments-list"><div class="skeleton small"></div></div><form class="comment-form"><input name="text" maxlength="1000" aria-label="Seu comentário" placeholder="Deixe uma mensagem com carinho…" required><button class="icon-btn" aria-label="Publicar comentário">${icon("arrow")}</button></form>`,
  );
  let next = null,
    reply = null;
  const list = dlg.querySelector(".comments-list");
  async function load(append = false) {
    try {
      const r = await api(
        "/posts/" +
          post.id +
          "/comments" +
          (append && next ? "?after=" + encodeURIComponent(next) : ""),
      );
      if (!dlg.isConnected) return;
      if (!append) list.innerHTML = "";
      for (const c of r.items) {
        const item = document.createElement("div");
        item.className = "comment";
        item.innerHTML = `${avatar(c.author, BASE)}<div><strong>${esc(c.author.name)}</strong><p>${esc(c.text)}</p><small>${ago(c.createdAt)} ${c.parentId ? "· resposta" : ""}</small><button class="text-button" data-reply="${c.id}">Responder</button>${c.own ? `<button class="text-button danger" data-remove="${c.id}">Excluir</button>` : `<button class="text-button" data-report="${c.id}">Denunciar</button>`}</div>`;
        list.append(item);
      }
      next = r.next;
      dlg.querySelector("[data-more]")?.remove();
      if (next) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.more = "";
        b.className = "text-button";
        b.textContent = "Mais comentários";
        b.onclick = () => load(true);
        list.append(b);
      }
      if (!list.children.length)
        list.innerHTML =
          '<p class="muted">Seja a primeira pessoa a comentar.</p>';
    } catch (err) {
      toast(err.message);
    }
  }
  await load();
  list.onclick = async (e) => {
    const r = e.target.closest("[data-reply]"),
      d = e.target.closest("[data-remove]"),
      reporter = e.target.closest("[data-report]");
    if (r) {
      reply = r.dataset.reply;
      dlg.querySelector("input").placeholder = "Sua resposta…";
      dlg.querySelector("input").focus();
    }
    if (d) {
      const confirm = modal(
        '<h2>Excluir este comentário?</h2><button class="primary danger" id="confirm-comment-delete">Excluir comentário</button>',
      );
      confirm.querySelector("#confirm-comment-delete").onclick = async (e) => {
        e.target.disabled = true;
        try {
          await api("/comments/" + d.dataset.remove, { method: "DELETE" });
          confirm.close();
          state.cache.clear();
          await load();
        } catch (err) {
          toast(err.message);
          e.target.disabled = false;
        }
      };
    }
    if (reporter) report("comment", reporter.dataset.report);
  };
  dlg.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      await api("/posts/" + post.id + "/comments", {
        method: "POST",
        body: {
          profile_id: state.active,
          text: e.target.elements.text.value,
          parent_id: reply,
        },
      });
      e.target.reset();
      reply = null;
      state.cache.clear();
      await load();
    } catch (err) {
      toast(err.message);
    } finally {
      b.disabled = false;
    }
  };
}
export async function feed(container, saved = false) {
  const cacheKey = saved ? "salvos" : "inicio";
  let cache = state.cache.get(cacheKey) || {
    items: [],
    next: null,
    filter: "para-voce",
    scroll: 0,
    loaded: false,
  };
  state.cache.set(cacheKey, cache);
  container.innerHTML = `<div class="page-title"><div><p class="eyebrow">FEITO DE AFETO</p><h1>${saved ? "Histórias para guardar." : "O seu universo pet."}</h1></div><button class="icon-btn" id="refresh-feed" aria-label="Atualizar feed">${icon("arrow")}</button></div>${
    !saved
      ? `<div class="moments" id="moments"><button class="moment new" id="new-moment"><span>${icon("plus", 25)}</span><small>Seu momento</small></button></div><div class="feed-filters">${[
          ["para-voce", "Para você"],
          ["seguindo", "Seguindo"],
          ["recentes", "Recentes"],
        ]
          .map(
            ([id, label]) =>
              `<button data-filter="${id}" class="${cache.filter === id ? "active" : ""}">${label}</button>`,
          )
          .join(
            "",
          )}</div><button class="compose-prompt" id="compose-prompt">${avatar(author(), BASE)}<span>Qual foi a aventura de hoje?</span>${icon("photo")}</button>`
      : ""
  }<div id="posts-list"></div><button class="load-more" id="load-more" hidden>Ver mais histórias</button>`;
  const list = container.querySelector("#posts-list"),
    more = container.querySelector("#load-more");
  let busy = false;
  function draw() {
    list.innerHTML =
      cache.items.map(card).join("") ||
      empty(
        saved
          ? "Suas favoritas, bem guardadas."
          : "A primeira história pode ser a sua.",
        saved
          ? "Toque no marcador de uma publicação para encontrá-la aqui."
          : "Compartilhe a rotina, uma descoberta ou aquele momento que faz o seu dia.",
        saved
          ? ""
          : '<button class="primary" data-empty-create>Compartilhar uma história</button>',
      );
    more.hidden = !cache.next;
    bindCards(list, cache.items);
    list
      .querySelector("[data-empty-create]")
      ?.addEventListener("click", () => editor());
  }
  async function load(reset = false) {
    if (busy) return;
    busy = true;
    more.disabled = true;
    if (reset) {
      cache.items = [];
      cache.next = null;
      cache.loaded = false;
      list.innerHTML = '<div class="skeleton"></div>';
    }
    try {
      const r = await api(
        "/feed?" +
          new URLSearchParams({
            ...(saved ? { saved: "1" } : {}),
            filter: cache.filter,
            ...(cache.next ? { after: cache.next } : {}),
          }),
      );
      if (!container.isConnected) return;
      const known = new Set(cache.items.map((p) => p.id));
      cache.items.push(...r.items.filter((p) => !known.has(p.id)));
      cache.next = r.next;
      cache.loaded = true;
      draw();
    } catch (err) {
      toast(err.message);
      if (!cache.loaded)
        list.innerHTML = empty("Não foi possível carregar.", esc(err.message));
    } finally {
      busy = false;
      more.disabled = false;
    }
  }
  more.onclick = () => load();
  if ("IntersectionObserver" in window) {
    feedObserver?.disconnect();
    feedObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && cache.next && !busy)
          load();
      },
      { rootMargin: "300px" },
    );
    feedObserver.observe(more);
  }
  container.querySelector("#refresh-feed").onclick = () => load(true);
  container.querySelectorAll("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        cache.filter = b.dataset.filter;
        container
          .querySelectorAll("[data-filter]")
          .forEach((a) => a.classList.toggle("active", a === b));
        load(true);
      }),
  );
  container
    .querySelector("#compose-prompt")
    ?.addEventListener("click", () => editor());
  container
    .querySelector("#new-moment")
    ?.addEventListener("click", () => editor("momento"));
  if (cache.loaded) {
    draw();
    requestAnimationFrame(() => scrollTo(0, cache.scroll));
  } else await load();
  if (!saved) {
    try {
      const r = await api("/feed?kind=momento");
      const moments = container.querySelector("#moments");
      if (!moments?.isConnected) return;
      for (const [i, p] of r.items.entries()) {
        const b = document.createElement("button");
        b.className = "moment";
        b.innerHTML = `<span>${avatar(p.author, BASE)}</span><small>${esc(p.author.name)}</small>`;
        b.onclick = () => stories(r.items, i);
        moments.append(b);
      }
    } catch {}
  }
}
export async function detail(container, id) {
  const { item } = await api("/posts/" + encodeURIComponent(id));
  if (!container.isConnected) return;
  container.innerHTML = `<a class="back-link" href="#/inicio">${icon("back", 18)} Voltar ao feed</a><div id="single-post">${card(item)}</div>`;
  bindCards(container.querySelector("#single-post"), [item]);
}
export function editor(kind = "post", groupId = null) {
  const moment = kind === "momento",
    draftKey = crypto.randomUUID(),
    files = [],
    uploaded = new Map();
  const dlg = modal(
    `<p class="eyebrow">${moment ? "POR 24 HORAS" : "UMA HISTÓRIA SÓ SUA"}</p><h2>${moment ? "Compartilhe um Momento." : "O que aconteceu por aí?"}</h2><form id="composer"><label>Publicar como<select name="profile_id">${state.me.profiles.map((p) => `<option value="${p.id}" ${p.id === state.active ? "selected" : ""}>${esc(p.name)} · @${esc(p.handle)}</option>`).join("")}</select></label><label class="sr">Legenda</label><textarea name="text" maxlength="3000" placeholder="As pequenas aventuras também merecem uma história…"></textarea><div class="upload-preview" id="upload-preview"></div><label class="upload-drop">${icon("photo")} <span>Adicionar ${moment ? "uma foto" : "até 6 fotos"}</span><input type="file" id="files" accept="image/jpeg,image/png,image/webp" ${moment ? "" : "multiple"}></label><div class="form-grid"><label>Quem pode ver?<select name="visibility"><option value="publico">Comunidade</option><option value="seguidores">Seguidores deste perfil</option><option value="privado">Só eu</option></select></label>${moment ? '<label>Cor da legenda<input type="color" name="color" value="#ffffff"></label>' : ""}</div><p class="muted">Compartilhe fotos suas, com autorização das pessoas que aparecem. Nesta versão, vídeos ainda não estão disponíveis.</p><p class="form-error" role="alert"></p><button class="primary" type="submit">${moment ? "Publicar Momento" : "Compartilhar história"} ${icon("arrow")}</button><p class="upload-status" role="status"></p></form>`,
    { className: "composer-modal" },
  );
  const form = dlg.querySelector("form"),
    preview = dlg.querySelector("#upload-preview");
  let busy = false;
  function draw() {
    preview.innerHTML = files
      .map(
        (f, i) =>
          `<div><img src="${f.url}" alt="Prévia da foto ${i + 1}"><div><button type="button" data-up="${i}" aria-label="Mover foto ${i + 1} para a esquerda">←</button><button type="button" data-remove="${i}" aria-label="Remover foto ${i + 1}">×</button></div></div>`,
      )
      .join("");
  }
  preview.onclick = (e) => {
    if (busy) return;
    const remove = e.target.dataset.remove,
      up = e.target.dataset.up;
    if (remove !== undefined) {
      URL.revokeObjectURL(files[Number(remove)].url);
      files.splice(Number(remove), 1);
      draw();
    }
    if (up !== undefined && Number(up) > 0) {
      const i = Number(up);
      [files[i - 1], files[i]] = [files[i], files[i - 1]];
      draw();
    }
  };
  dlg.querySelector("#files").onchange = (e) => {
    if (busy) return;
    for (const f of e.target.files) {
      if (files.length >= (moment ? 1 : 6)) {
        toast("Limite de fotos atingido.");
        break;
      }
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
        f.size > 8 * 1024 * 1024
      ) {
        toast("Use uma foto JPEG, PNG ou WebP de até 8 MB.");
        continue;
      }
      files.push({ file: f, url: URL.createObjectURL(f) });
    }
    e.target.value = "";
    draw();
  };
  dlg.addEventListener("cancel", (e) => {
    if (busy) e.preventDefault();
  });
  dlg.addEventListener(
    "close",
    () => files.forEach((f) => URL.revokeObjectURL(f.url)),
    { once: true },
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    dlg.dataset.busy = "true";
    const fields = Object.fromEntries(new FormData(form));
    const b = form.querySelector("[type=submit]"),
      close = dlg.querySelector(".close-modal");
    b.disabled = close.disabled = true;
    try {
      const media = [];
      for (const [i, f] of files.entries()) {
        if (!uploaded.has(f.file))
          uploaded.set(
            f.file,
            await upload(
              f.file,
              (n) =>
                (form.querySelector(".upload-status").textContent =
                  `Foto ${i + 1} de ${files.length} · ${n}%`),
            ),
          );
        media.push(uploaded.get(f.file).id);
      }
      const body = {
        ...fields,
        media,
        idempotency: draftKey,
        kind,
        ...(groupId ? { group_id: groupId } : {}),
      };
      await api("/posts", { method: "POST", body });
      state.cache.clear();
      dlg.close();
      location.hash = "/inicio";
      rerender();
      toast(
        moment
          ? "Momento publicado por 24 horas."
          : "Sua história já está na Comunidade.",
      );
    } catch (err) {
      form.querySelector(".form-error").textContent = err.message;
    } finally {
      busy = false;
      delete dlg.dataset.busy;
      b.disabled = close.disabled = false;
    }
  };
}
function stories(items, index = 0) {
  const dlg = modal('<div id="story-content"></div>', {
    className: "story-modal",
  });
  let timer,
    started = 0,
    remaining = 8000,
    paused = false;
  const holder = dlg.querySelector("#story-content");
  function show() {
    clearTimeout(timer);
    if (index < 0 || index >= items.length) {
      dlg.close();
      return;
    }
    const p = items[index];
    remaining = 8000;
    holder.innerHTML = `<div class="story-progress">${items.map((_, i) => `<i class="${i < index ? "complete" : i === index ? "current" : ""}"></i>`).join("")}</div><a class="story-author" href="#/p/${p.author.id}">${avatar(p.author, BASE)}<span>${esc(p.author.name)}<small>${ago(p.createdAt)}</small></span></a><button class="icon-btn story-report" aria-label="Denunciar Momento">${icon("flag", 18)}</button><img class="story-photo" src="${BASE + p.media[0].url}" alt="Momento de ${esc(p.author.name)}"><p class="story-caption" style="color:${p.color || "#ffffff"}">${esc(p.text)}</p><button class="story-prev" aria-label="Momento anterior"></button><button class="story-next" aria-label="Próximo Momento"></button>`;
    holder.querySelector("a").onclick = () => dlg.close();
    holder.querySelector(".story-report").onclick = () => {
      clearTimeout(timer);
      report("post", p.id);
    };
    holder.querySelector(".story-prev").onclick = () => {
      index--;
      show();
    };
    holder.querySelector(".story-next").onclick = () => {
      index++;
      show();
    };
    holder.querySelector(".story-photo").onpointerdown = () => {
      clearTimeout(timer);
      remaining -= Date.now() - started;
      paused = true;
      holder.querySelector(".current").style.animationPlayState = "paused";
    };
    holder.querySelector(".story-photo").onpointerup = () => {
      if (paused) {
        paused = false;
        resume();
        holder.querySelector(".current").style.animationPlayState = "running";
      }
    };
    api("/posts/" + p.id + "/view", { method: "PUT" }).catch(() => {});
    resume();
  }
  function resume() {
    started = Date.now();
    timer = setTimeout(() => {
      index++;
      show();
    }, remaining);
  }
  dlg.addEventListener("close", () => clearTimeout(timer), { once: true });
  show();
}
