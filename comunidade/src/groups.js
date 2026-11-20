import { api } from "./api.js";
import { esc, icon, modal, toast, empty } from "./ui.js";
import { editor, report } from "./posts.js";
export async function groups(container) {
  container.innerHTML = `<div class="page-title"><div><p class="eyebrow">INTERESSES QUE APROXIMAM</p><h1>Encontre sua turma.</h1></div><button class="primary" id="new-group">${icon("plus")} Criar comunidade</button></div><form class="search-form"><input name="q" placeholder="Buscar comunidades" aria-label="Buscar comunidades"><button class="secondary">Buscar</button></form><div class="group-list"></div><button class="load-more" hidden>Mais comunidades</button>`;
  let next = null,
    items = [];
  const list = container.querySelector(".group-list"),
    more = container.querySelector(".load-more");
  async function load(append = false) {
    try {
      const result = await api(
        "/groups?" +
          new URLSearchParams({
            q: container.querySelector("input").value,
            ...(append && next ? { after: next } : {}),
          }),
      );
      items = append ? [...items, ...result.items] : result.items;
      next = result.next;
      more.hidden = !next;
      list.innerHTML =
        items
          .map(
            (g) =>
              `<article class="surface group-card"><span class="group-symbol">${icon("paw", 30)}</span><p class="eyebrow">${esc(g.category || "NOVAS CONEXÕES")}</p><h2>${esc(g.name)}</h2><p>${esc(g.description)}</p><small>${g.members} participantes</small><div><button class="${g.joined ? "secondary" : "primary"}" data-join="${g.id}">${g.joined ? "Sair da comunidade" : "Participar"}</button><button class="text-button" data-open="${g.id}">Ver histórias ${icon("arrow", 16)}</button><button class="text-button" data-report-group="${g.id}">${icon("flag", 15)} Denunciar</button></div></article>`,
          )
          .join("") ||
        empty(
          "A próxima turma pode começar com você.",
          "Crie um espaço para quem compartilha os mesmos interesses.",
        );
    } catch (e) {
      toast(e.message);
    }
  }
  list.onclick = async (e) => {
    const reporter = e.target.closest("[data-report-group]");
    if (reporter) {
      report("group", reporter.dataset.reportGroup);
      return;
    }
    const join = e.target.closest("[data-join]"),
      open = e.target.closest("[data-open]");
    if (join) {
      join.disabled = true;
      try {
        const g = items.find((x) => x.id === join.dataset.join);
        await api("/groups/" + g.id + "/membership", {
          method: g.joined ? "DELETE" : "PUT",
        });
        await load();
      } catch (err) {
        toast(err.message);
        join.disabled = false;
      }
    }
    if (open) {
      const g = items.find((x) => x.id === open.dataset.open),
        result = await api("/feed?group=" + g.id),
        dlg = modal(
          `<h2>${esc(g.name)}</h2><p>${esc(g.description)}</p>${g.joined ? '<button class="primary" id="group-post">Compartilhar uma história</button>' : ""}<div class="group-stories">${result.items.map((p) => `<a class="surface text-post" href="#/post/${p.id}"><strong>${esc(p.author.name)}</strong><p>${esc(p.text || "Uma história em fotos")}</p></a>`).join("") || '<p class="muted">Seja a primeira pessoa a contar uma história aqui.</p>'}</div>`,
        );
      dlg.querySelectorAll("a").forEach((a) => (a.onclick = () => dlg.close()));
      dlg.querySelector("#group-post")?.addEventListener("click", () => {
        dlg.close();
        editor("post", g.id);
      });
    }
  };
  container.querySelector("#new-group").onclick = () => {
    const dlg = modal(
      '<h2>Uma turma para chamar de sua.</h2><form><label>Nome<input name="name" maxlength="100" required></label><label>Descrição<textarea name="description" maxlength="1500" required></textarea></label><label>Tema<input name="category" maxlength="80"></label><button class="primary">Criar comunidade</button><p class="form-error" role="alert"></p></form>',
    );
    dlg.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const b = e.target.querySelector("button");
      b.disabled = true;
      try {
        await api("/groups", {
          method: "POST",
          body: Object.fromEntries(new FormData(e.target)),
        });
        dlg.close();
        load();
      } catch (err) {
        e.target.querySelector(".form-error").textContent = err.message;
        b.disabled = false;
      }
    };
  };
  container.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    load();
  };
  more.onclick = () => load(true);
  await load();
}
