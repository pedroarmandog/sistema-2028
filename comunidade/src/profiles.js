import { api, upload, BASE } from "./api.js";
import { state, refresh, rerender } from "./state.js";
import { esc, icon, avatar, modal, toast, empty } from "./ui.js";
import { card, report } from "./posts.js";
export function profileForm(container, p, onDone, { pet = null } = {}) {
  container.innerHTML = `<form class="profile-form"><div class="form-grid"><label>Nome público<input name="name" value="${esc(p?.name || pet?.name || "")}" maxlength="80" required></label><label>Seu @identificador<input name="handle" value="${esc(p?.handle || "")}" pattern="[a-z0-9_]{3,30}" minlength="3" maxlength="30" placeholder="ex.: thor_aventureiro" required></label></div><label>Uma pequena apresentação<textarea name="bio" maxlength="500" placeholder="O que faz você ou seu pet ser único?">${esc(p?.bio || "")}</textarea></label><div class="form-grid"><label>Cidade (opcional)<input name="city" value="${esc(p?.city || "")}" maxlength="100" placeholder="Só a cidade, sem endereço"></label><label>Interesses (opcional)<input name="interests" value="${esc(p?.interests || "")}" maxlength="200" placeholder="Passeios, brincadeiras, novas amizades"></label></div>${pet ? `<div class="form-grid"><label>Espécie pública<input name="species" value="${esc(pet.species || "")}" maxlength="60"></label><label>Raça pública (opcional)<input name="breed" maxlength="80"></label></div>` : ""}${!p ? '<label class="checkbox"><input name="adult" type="checkbox" required>Tenho 18 anos ou mais.</label><label class="checkbox"><input name="consent" type="checkbox" required>Autorizo exibir os dados sociais que escolhi preencher. Entendo que eles poderão ser vistos por participantes de outros pet shops.</label>' : ""}<p class="form-error" role="alert"></p><button class="primary" type="submit">${p ? "Salvar perfil" : "Começar novas conexões"} ${icon("arrow")}</button></form>`;
  container.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target,
      b = f.querySelector("button");
    if (b.disabled) return;
    b.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(f));
      await api("/profiles" + (p ? "/" + p.id : ""), {
        method: p ? "PUT" : "POST",
        body: {
          ...data,
          adult: data.adult === "on",
          consent: data.consent === "on",
          ...(pet ? { pet_id: pet.id, company: pet.company } : {}),
        },
      });
      await onDone();
    } catch (err) {
      f.querySelector(".form-error").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}
export async function newPet() {
  const pets = state.me.pets.filter((p) => !p.linked);
  if (!pets.length) {
    modal(
      `<h2>Seu pet já tem um lugar aqui?</h2><p>Os pets disponíveis são os vinculados às contas de tutor que você comprovou. Cadastre seu pet no PetHub Cliente ou vincule outro estabelecimento nas configurações.</p>`,
    );
    return;
  }
  const dlg = modal(
    `<p class="eyebrow">UMA PERSONALIDADE ÚNICA</p><h2>Um perfil só para ele.</h2><label>Escolha seu pet<select id="pet">${pets.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join("")}</select></label><div id="pet-form"></div>`,
  );
  function draw() {
    profileForm(
      dlg.querySelector("#pet-form"),
      null,
      async () => {
        await refresh();
        dlg.close();
        rerender();
      },
      { pet: pets[Number(dlg.querySelector("#pet").value)] },
    );
  }
  dlg.querySelector("#pet").onchange = draw;
  draw();
}
export async function profile(container, id) {
  const p = await api("/profiles/" + encodeURIComponent(id)),
    posts = await api("/feed?profile=" + encodeURIComponent(id));
  if (!container.isConnected) return;
  container.innerHTML = `<a class="back-link" href="#/inicio">${icon("back", 18)} Voltar</a><section class="profile-hero surface"><div class="profile-cover">${p.cover ? `<img src="${BASE + p.cover}" alt="Capa do perfil de ${esc(p.name)}">` : '<div class="cover-art"></div>'}<span class="profile-type">${p.kind === "pet" ? "Um pet, muitas histórias" : "Parte da nossa Comunidade"}</span></div><div class="profile-info">${avatar(p, BASE, true)}<div class="profile-heading"><div><h1>${esc(p.name)}</h1><span>@${esc(p.handle)}</span></div><button class="icon-btn" id="profile-menu" aria-label="Opções do perfil">${icon("more")}</button></div><p class="profile-bio">${esc(p.bio || "Cada conexão pode ser o começo de uma boa história.")}</p><div class="profile-details">${[
    p.species,
    p.breed,
    p.city,
    p.interests,
  ]
    .filter(Boolean)
    .map((x) => `<span>${esc(x)}</span>`)
    .join(
      "",
    )}</div><div class="profile-stats"><span><strong>${p.posts}</strong> histórias</span><span><strong id="followers">${p.followers}</strong> seguidores</span><span><strong>${p.following}</strong> seguindo</span></div><div class="profile-buttons">${p.own ? '<button class="primary" id="edit-profile">Editar perfil</button><button class="secondary" id="change-photo">Alterar foto</button>' : `<button class="primary" id="follow">${p.isFollowing ? "Seguindo" : "Seguir esse perfil"} ${icon("plus", 18)}</button>`}<button class="secondary" id="share-profile">${icon("share", 18)} Compartilhar</button></div></div></section><div class="section-heading"><h2>Histórias de ${esc(p.name)}</h2><span>${icon("photo", 18)}</span></div><div class="profile-gallery">${posts.items.flatMap((post) => post.media.map((m) => `<a href="#/post/${post.id}"><img src="${BASE + m.url}" alt="Publicação de ${esc(p.name)}" loading="lazy"></a>`)).join("") || '<p class="muted">As fotos publicadas neste perfil vão aparecer aqui.</p>'}</div><div class="profile-text-posts">${posts.items
    .filter((p) => !p.media.length)
    .map(
      (p) =>
        `<a class="surface text-post" href="#/post/${p.id}">${esc(p.text)}</a>`,
    )
    .join(
      "",
    )}</div><button class="load-more" id="profile-more" ${posts.next ? "" : "hidden"}>Mais histórias</button>`;
  container.querySelector("#profile-more").onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const r = await api(
        "/feed?" + new URLSearchParams({ profile: id, after: posts.next }),
      );
      posts.next = r.next;
      b.hidden = !r.next;
      container
        .querySelector(".profile-gallery")
        .insertAdjacentHTML(
          "beforeend",
          r.items
            .flatMap((post) =>
              post.media.map(
                (m) =>
                  `<a href="#/post/${post.id}"><img src="${BASE + m.url}" alt="Publicação de ${esc(p.name)}" loading="lazy"></a>`,
              ),
            )
            .join(""),
        );
      container.querySelector(".profile-text-posts").insertAdjacentHTML(
        "beforeend",
        r.items
          .filter((p) => !p.media.length)
          .map(
            (p) =>
              `<a class="surface text-post" href="#/post/${p.id}">${esc(p.text)}</a>`,
          )
          .join(""),
      );
    } catch (err) {
      toast(err.message);
    } finally {
      b.disabled = false;
    }
  };
  container.querySelector("#follow")?.addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const result = await api("/profiles/" + p.id + "/follow", {
        method: p.isFollowing ? "DELETE" : "PUT",
        body: { profile_id: state.active },
      });
      p.isFollowing = result.isFollowing;
      b.innerHTML =
        (p.isFollowing ? "Seguindo" : "Seguir esse perfil") +
        " " +
        icon("plus", 18);
      container.querySelector("#followers").textContent = result.followers;
      state.cache.clear();
    } catch (err) {
      toast(err.message);
    } finally {
      b.disabled = false;
    }
  });
  container.querySelector("#share-profile").onclick = async () => {
    const url = location.origin + location.pathname + "#/p/" + p.id;
    try {
      if (navigator.share)
        await navigator.share({ title: p.name + " · PetHub Comunidade", url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link do perfil copiado.");
      }
    } catch {}
  };
  container.querySelector("#profile-menu").onclick = () => {
    const dlg = modal(
      `<h2>${esc(p.name)}</h2>${!p.own ? '<button class="settings-action" id="report-profile">Denunciar perfil</button><button class="settings-action danger" id="block-profile">Bloquear esta conta</button>' : "<p>Você pode alterar a foto e os dados públicos deste perfil.</p>"}`,
    );
    dlg
      .querySelector("#report-profile")
      ?.addEventListener("click", () => report("profile", p.id));
    dlg.querySelector("#block-profile")?.addEventListener("click", () => {
      const confirm = modal(
        '<h2>Bloquear essa conta?</h2><p>As interações e publicações dela deixarão de aparecer para você.</p><button id="confirm-block" class="primary danger">Confirmar bloqueio</button>',
      );
      confirm.querySelector("#confirm-block").onclick = async (e) => {
        e.target.disabled = true;
        try {
          await api("/profiles/" + p.id + "/block", { method: "PUT" });
          state.cache.clear();
          confirm.close();
          dlg.close();
          location.hash = "/inicio";
          toast("Conta bloqueada.");
        } catch (err) {
          toast(err.message);
          e.target.disabled = false;
        }
      };
    });
  };
  container.querySelector("#edit-profile")?.addEventListener("click", () => {
    const dlg = modal(
      '<h2>Um perfil com a sua cara.</h2><div id="edit-form"></div>',
    );
    profileForm(dlg.querySelector("#edit-form"), p, async () => {
      await refresh();
      dlg.close();
      rerender();
    });
  });
  container.querySelector("#change-photo")?.addEventListener("click", () => {
    const dlg = modal(
      `<h2>Um novo olhar.</h2><p>Use uma foto sua ou do pet. Nenhuma foto privada do cadastro será publicada automaticamente.</p><form><label>Foto do perfil<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label><label>Usar como<select name="target"><option value="avatar_id">Avatar</option><option value="cover_id">Capa</option></select></label><button class="primary">Enviar e salvar</button><p class="upload-status" role="status"></p><p class="form-error" role="alert"></p></form>`,
    );
    dlg.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target,
        b = f.querySelector("button");
      b.disabled = true;
      try {
        const file = f.elements.photo.files[0],
          media = await upload(
            file,
            (n) => (f.querySelector(".upload-status").textContent = n + "%"),
          );
        await api("/profiles/" + p.id, {
          method: "PUT",
          body: {
            name: p.name,
            handle: p.handle,
            bio: p.bio,
            city: p.city,
            interests: p.interests,
            [f.elements.target.value]: media.id,
          },
        });
        await refresh();
        dlg.close();
        rerender();
      } catch (err) {
        f.querySelector(".form-error").textContent = err.message;
      } finally {
        b.disabled = false;
      }
    };
  });
}
export async function explore(container) {
  container.innerHTML = `<div class="page-title"><div><p class="eyebrow">SEMPRE HÁ ALGO PARA DESCOBRIR</p><h1>Encontre sua turma.</h1></div>${icon("explore", 28)}</div><form class="search-form"><label class="sr" for="social-search">Buscar perfis e histórias</label>${icon("search")}<input id="social-search" name="q" placeholder="Pets, pessoas, cidades ou #histórias" maxlength="100"><button class="secondary">Buscar</button></form><div class="category-chips">${["Cachorros", "Gatos", "Passeios", "Adoção", "Cuidados", "Diversão"].map((x) => `<button data-category="${x}">${x}</button>`).join("")}</div><section id="explore-results"><div class="skeleton"></div></section>`;
  const result = container.querySelector("#explore-results"),
    input = container.querySelector("input");
  input.value =
    new URLSearchParams(location.hash.split("?")[1]).get("busca") || "";
  let sequence = 0;
  async function search() {
    const id = ++sequence;
    result.innerHTML = '<div class="skeleton"></div>';
    try {
      const q = input.value.trim(),
        [people, posts] = await Promise.all([
          api("/explore?q=" + encodeURIComponent(q.replace(/^[@#]/, ""))),
          api("/feed?q=" + encodeURIComponent(q)),
        ]);
      if (id !== sequence || !container.isConnected) return;
      result.innerHTML = `<h2>Novas conexões</h2><div class="profile-results">${people.items.map((p) => `<a class="surface profile-result" href="#/p/${p.id}">${avatar(p, BASE, true)}<strong>${esc(p.name)}</strong><small>@${esc(p.handle)}</small><p>${esc(p.city || p.species || "Uma história para conhecer")}</p><span>Conhecer ${icon("arrow", 16)}</span></a>`).join("") || '<p class="muted">Nenhum perfil encontrado.</p>'}</div><h2 class="section-heading">Histórias da Comunidade</h2><div class="explore-grid">${posts.items.map((p) => `<a href="#/post/${p.id}" class="explore-tile">${p.media[0] ? `<img src="${BASE + p.media[0].url}" alt="Foto de ${esc(p.author.name)}" loading="lazy">` : `<p>${esc(p.text)}</p>`}<span>${esc(p.author.name)}</span></a>`).join("") || '<p class="muted">Ainda não encontramos histórias sobre esse assunto.</p>'}</div><div class="explore-more"></div>`;
      for (const [kind, data] of [
        ["profiles", people],
        ["posts", posts],
      ]) {
        if (!data.next) continue;
        const button = document.createElement("button");
        button.className = "load-more";
        button.textContent =
          kind === "profiles" ? "Mais perfis" : "Mais histórias";
        result.querySelector(".explore-more").append(button);
        button.onclick = async () => {
          button.disabled = true;
          try {
            const r = await api(
              (kind === "profiles" ? "/explore?" : "/feed?") +
                new URLSearchParams({
                  q: kind === "profiles" ? q.replace(/^[@#]/, "") : q,
                  after: data.next,
                }),
            );
            data.next = r.next;
            button.hidden = !r.next;
            const html =
              kind === "profiles"
                ? r.items
                    .map(
                      (p) =>
                        `<a class="surface profile-result" href="#/p/${p.id}">${avatar(p, BASE, true)}<strong>${esc(p.name)}</strong><small>@${esc(p.handle)}</small><p>${esc(p.city || p.species || "Uma história para conhecer")}</p><span>Conhecer ${icon("arrow", 16)}</span></a>`,
                    )
                    .join("")
                : r.items
                    .map(
                      (p) =>
                        `<a href="#/post/${p.id}" class="explore-tile">${p.media[0] ? `<img src="${BASE + p.media[0].url}" alt="Foto de ${esc(p.author.name)}" loading="lazy">` : `<p>${esc(p.text)}</p>`}<span>${esc(p.author.name)}</span></a>`,
                    )
                    .join("");
            result
              .querySelector(
                kind === "profiles" ? ".profile-results" : ".explore-grid",
              )
              .insertAdjacentHTML("beforeend", html);
          } catch (err) {
            toast(err.message);
          } finally {
            button.disabled = false;
          }
        };
      }
    } catch (err) {
      result.innerHTML = empty("A busca fez uma pausa.", esc(err.message));
    }
  }
  container.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    search();
  };
  container.querySelectorAll("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        input.value = b.dataset.category;
        search();
      }),
  );
  await search();
}
