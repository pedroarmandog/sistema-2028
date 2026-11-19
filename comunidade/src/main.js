import "@fontsource-variable/manrope";
import "./style.css";
import { api, setCSRF, BASE } from "./api.js";
import {
  esc,
  icon,
  nav,
  avatar,
  asset,
  toast,
  theme,
  startTheme,
  modal,
} from "./ui.js";
startTheme();
import { state, refresh } from "./state.js";
const app = document.getElementById("app");
function welcome(error = "") {
  app.innerHTML = `<main class="welcome"><section class="welcome-art"><img src="${asset("welcome.webp")}" alt="Cachorro e gato juntos em um jardim" fetchpriority="high"><div class="art-label">Uma comunidade.<br>Infinitas histórias.</div><span class="art-chip">${icon("heart", 18)} Conexões que fazem bem.</span></section><section class="welcome-copy"><a class="brand" href="#/"><span class="brand-mark">${icon("lamp", 24)}</span><span>PetHub <small>COMUNIDADE</small></span></a><p class="eyebrow">PARA QUEM AMA COM PATAS</p><h1>O mundo fica melhor quando nossos pets se conectam<span>.</span></h1><p class="welcome-description">Compartilhe momentos, descubra histórias e encontre uma turma que entende esse amor.</p><form id="login"><h2>Que bom ter você aqui.</h2><p>Use seu acesso do PetHub Cliente. A entrada precisa estar liberada pelo PetHub.</p><label>Link ou código do estabelecimento<input name="loja" required placeholder="Código presente no link do seu pet shop" autocomplete="off"></label><label>E-mail<input name="email" type="email" required autocomplete="username"></label><label>Senha<input name="senha" type="password" required autocomplete="current-password"></label><p class="form-error" role="alert">${esc(error)}</p><button class="primary" type="submit">Entrar na Comunidade ${icon("arrow")}</button></form><div class="welcome-foot">Um espaço para pessoas adultas. Você escolhe o que compartilhar.<br><button type="button" class="text-button" id="principles">Nossos princípios e privacidade</button></div></section></main>`;
  app.querySelector("#login [name=loja]").value =
    new URLSearchParams(location.search).get("loja") || "";
  app.querySelector("#login").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target,
      button = form.querySelector("button");
    button.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(form));
      try {
        if (body.loja.includes("://"))
          body.loja = new URL(body.loja).searchParams.get("loja") || body.loja;
      } catch {}
      await api("/login", { method: "POST", body });
      await refresh();
      await render();
    } catch (err) {
      form.querySelector(".form-error").textContent = err.message;
    } finally {
      button.disabled = false;
    }
  };
  app.querySelector("#principles").onclick = () =>
    modal(
      `<p class="eyebrow">UM ESPAÇO DE CONFIANÇA</p><h2>Pets aproximam. Respeito mantém a gente junto.</h2><p>Compartilhe apenas conteúdo que você tem autorização para publicar. Não exponha endereços residenciais, crianças, documentos ou contatos privados. Fotos e biografias sociais são escolhidas por você e ficam separadas do prontuário e do cadastro do pet shop.</p><p>Você pode denunciar conteúdo, bloquear perfis e solicitar exclusão da conta nas configurações. Nesta versão, o acesso é restrito a maiores de 18 anos e depende de liberação.</p><p>As fotos de boas-vindas são ilustrativas. O feed só mostra publicações reais de participantes.</p>`,
    );
}
async function onboard() {
  const { profileForm } = await import("./profiles.js");
  app.innerHTML = `<main class="onboarding"><a class="brand"><span class="brand-mark">${icon("lamp")}</span><span>PetHub <small>COMUNIDADE</small></span></a><p class="eyebrow">PRIMEIRO, VAMOS NOS CONHECER</p><h1>Uma nova amizade começa com um olá.</h1><p>Crie seu perfil público de tutor. Nenhum dado privado do seu pet shop será publicado automaticamente.</p><section class="surface" id="onboarding-form"></section></main>`;
  profileForm(app.querySelector("#onboarding-form"), null, async () => {
    await refresh();
    await render();
  });
}
function shell(tab) {
  const active = state.me.profiles.find((p) => p.id === state.active);
  app.innerHTML = `<div class="community-shell"><aside class="rail"><a class="brand" href="#/inicio"><span class="brand-mark">${icon("lamp")}</span><span>PetHub<small>COMUNIDADE</small></span></a><nav aria-label="Navegação principal">${nav("inicio", "Início", "home", tab)}${nav("explorar", "Explorar", "explore", tab)}<button class="create-nav" data-create>${icon("plus")} Criar uma história</button>${nav("eventos", "Eventos", "calendar", tab)}${nav("perfil", "Meu perfil", "user", tab)}${nav("salvos", "Salvos", "save", tab)}</nav><div class="rail-foot"><p>Pequenos momentos.<br>Grandes conexões.</p><button class="text-button" data-settings>${icon("settings")} Configurações</button></div></aside><div class="center"><header class="app-header"><a class="mobile-brand" href="#/inicio">PetHub<span>Comunidade</span></a><div class="header-copy"><strong>Seu lugar no mundo pet.</strong><span>Uma boa história merece ser compartilhada.</span></div><div class="header-actions"><button class="icon-btn" data-notifications aria-label="Notificações">${icon("bell")}<i id="unread-dot" hidden></i></button><button class="profile-switch" data-switch aria-label="Alternar perfil">${avatar(active, BASE)}</button></div></header><main id="content" tabindex="-1"><div class="skeleton"></div><div class="skeleton"></div></main></div><aside class="discovery"><section class="discovery-note"><span class="eyebrow">MUITO ALÉM DO FEED</span><h2>Seu próximo encontro pode começar aqui.</h2><p>Descubra experiências para viver junto de quem você ama.</p><a href="#/eventos">Explorar eventos ${icon("arrow", 18)}</a></section><section class="suggestions" id="suggestions"><h3>Novas conexões</h3><div class="skeleton small"></div></section><footer>PetHub Comunidade · 2026<br><button class="text-button" data-settings>Privacidade e preferências</button></footer></aside><nav class="bottom-nav" aria-label="Navegação mobile">${nav("inicio", "Início", "home", tab)}${nav("explorar", "Explorar", "explore", tab)}<button data-create class="create-bubble" aria-label="Criar publicação">${icon("plus", 26)}</button>${nav("eventos", "Eventos", "calendar", tab)}${nav("perfil", "Perfil", "user", tab)}</nav></div>`;
  app.querySelectorAll("[data-create]").forEach(
    (b) =>
      (b.onclick = async () => {
        const { editor } = await import("./posts.js");
        editor();
      }),
  );
  app
    .querySelectorAll("[data-settings]")
    .forEach((b) => (b.onclick = settings));
  app.querySelector("[data-switch]").onclick = () => {
    const dlg = modal(
      `<h2>Qual história vamos contar?</h2><p>Escolha o perfil que vai aparecer nas suas interações.</p><div class="switch-list">${state.me.profiles.map((p) => `<button data-p="${p.id}">${avatar(p, BASE)}<span><strong>${esc(p.name)}</strong><small>@${esc(p.handle)}</small></span>${p.id === state.active ? icon("check") : ""}</button>`).join("")}<button id="new-pet">${icon("plus")} Criar perfil de um pet</button><button id="saved-stories">${icon("save")} Histórias salvas</button><button id="profile-preferences">${icon("settings")} Preferências e privacidade</button></div>`,
    );
    dlg.querySelector("#profile-preferences").onclick = () => {
      dlg.close();
      settings();
    };
    dlg.querySelector("#saved-stories").onclick = () => {
      dlg.close();
      location.hash = "/salvos";
    };
    dlg.querySelectorAll("[data-p]").forEach(
      (b) =>
        (b.onclick = () => {
          state.active = b.dataset.p;
          dlg.close();
          render();
        }),
    );
    dlg.querySelector("#new-pet").onclick = async () => {
      dlg.close();
      const { newPet } = await import("./profiles.js");
      newPet();
    };
  };
  app.querySelector("[data-notifications]").onclick = notifications;
  api("/notifications")
    .then((r) => {
      const dot = document.getElementById("unread-dot");
      if (dot) dot.hidden = !r.unread;
    })
    .catch(() => {});
  api("/explore?limit=4")
    .then((r) => {
      const box = document.getElementById("suggestions");
      if (box)
        box.innerHTML =
          "<h3>Novas conexões</h3>" +
          r.items
            .filter((p) => !state.me.profiles.some((a) => a.id === p.id))
            .map(
              (p) =>
                `<a class="suggestion" href="#/p/${p.id}">${avatar(p, BASE)}<span><strong>${esc(p.name)}</strong><small>@${esc(p.handle)}</small></span>${icon("arrow", 17)}</a>`,
            )
            .join("") +
          (!r.items.length
            ? '<p class="muted">As primeiras amizades vão aparecer por aqui.</p>'
            : "");
    })
    .catch(() => {});
}
export async function render() {
  const seq = ++state.sequence;
  if (!state.me) {
    welcome();
    return;
  }
  try {
    await refresh();
  } catch (e) {
    state.me = null;
    state.cache.clear();
    welcome(e.message);
    return;
  }
  if (seq !== state.sequence) return;
  if (!state.me.profiles.length) {
    await onboard();
    return;
  }
  const route = location.hash.replace(/^#\/?/, "") || "inicio",
    parts = route.split("?")[0].split("/"),
    tab = parts[0] === "p" ? "perfil" : parts[0];
  if (state.route === "inicio" || state.route === "salvos") {
    const cached = state.cache.get(state.route);
    if (cached) cached.scroll = scrollY;
  }
  state.route = route;
  shell(tab);
  const content = document.getElementById("content");
  try {
    if (["inicio", "salvos"].includes(tab)) {
      const { feed } = await import("./posts.js");
      if (seq === state.sequence) await feed(content, tab === "salvos");
    } else if (tab === "post") {
      const { detail } = await import("./posts.js");
      if (seq === state.sequence) await detail(content, parts[1]);
    } else if (tab === "perfil" || tab === "p") {
      const { profile } = await import("./profiles.js");
      if (seq === state.sequence)
        await profile(content, tab === "p" ? parts[1] : state.active);
    } else if (tab === "explorar") {
      const { explore } = await import("./profiles.js");
      if (seq === state.sequence) await explore(content);
    } else if (tab === "eventos") {
      const { events } = await import("./events.js");
      if (seq === state.sequence) await events(content);
    } else {
      content.innerHTML =
        '<h1>Página não encontrada</h1><a href="#/inicio">Voltar ao início</a>';
    }
  } catch (e) {
    if (seq === state.sequence)
      content.innerHTML = `<section class="empty"><h2>Vamos tentar de novo?</h2><p>${esc(e.message)}</p><button class="primary" id="retry">Tentar novamente</button></section>`;
    content.querySelector("#retry")?.addEventListener("click", render);
  }
}
async function notifications() {
  try {
    const result = await api("/notifications"),
      dlg = modal(
        `<h2>Suas conexões estão por aqui.</h2><p>Novidades da sua Comunidade.</p><div class="notification-list">${result.items.map((n) => `<a href="#/${n.kind === "follow" ? "p/" + n.targetId : n.kind === "event" ? "eventos" : "post/" + n.targetId}">${avatar(n.actor, BASE)}<span><strong>${esc(n.actor?.name || "Uma conexão")}</strong><small>${{ like: "curtiu sua publicação", comment: "comentou na sua publicação", follow: "começou a seguir um perfil seu", event: "atualizou um evento" }[n.kind] || "tem uma novidade para você"}</small></span></a>`).join("") || '<p class="muted">As primeiras interações vão aparecer aqui.</p>'}</div>`,
      );
    dlg.querySelectorAll("a").forEach((a) => (a.onclick = () => dlg.close()));
    await api("/notifications/read", { method: "PUT" });
    const dot = document.getElementById("unread-dot");
    if (dot) dot.hidden = true;
  } catch (e) {
    toast(e.message);
  }
}
function settings() {
  const dlg = modal(
    `<p class="eyebrow">DO SEU JEITO</p><h2>Preferências e privacidade</h2><label>Aparência<select id="theme"><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label><button class="settings-action" id="link-account">${icon("plus")} Vincular outro pet shop</button><button class="settings-action" id="blocks">Contas bloqueadas</button><button class="settings-action" id="export">${icon("save")} Exportar meus dados sociais</button><button class="settings-action" id="logout">${icon("logout")} Sair da Comunidade</button><button class="settings-action danger" id="delete">${icon("lock")} Solicitar exclusão da conta</button><p class="muted">O vínculo entre contas só acontece depois de comprovar seu acesso em cada estabelecimento. Nunca unimos pessoas por nome ou telefone.</p>`,
  );
  dlg.querySelector("#theme").value =
    localStorage.getItem("community_theme") || "auto";
  dlg.querySelector("#theme").onchange = (e) => theme(e.target.value);
  dlg.querySelector("#logout").onclick = async () => {
    try {
      await api("/logout", { method: "POST" });
      state.me = null;
      state.cache.clear();
      dlg.close();
      render();
    } catch (e) {
      toast(e.message);
    }
  };
  dlg.querySelector("#blocks").onclick = async () => {
    try {
      const result = await api("/blocks"),
        sub = modal(
          "<h2>Contas bloqueadas</h2>" +
            result.items
              .map(
                (p) =>
                  `<div class="admin-row"><div>${esc(p.name)}</div><button class="secondary" data-unblock="${p.id}">Desbloquear</button></div>`,
              )
              .join("") +
            (result.items.length ? "" : "<p>Nenhuma conta bloqueada.</p>"),
        );
      sub.querySelectorAll("[data-unblock]").forEach(
        (b) =>
          (b.onclick = async () => {
            b.disabled = true;
            try {
              await api("/profiles/" + b.dataset.unblock + "/block", {
                method: "DELETE",
              });
              state.cache.clear();
              b.closest(".admin-row").remove();
              toast("Conta desbloqueada.");
            } catch (e) {
              toast(e.message);
              b.disabled = false;
            }
          }),
      );
    } catch (e) {
      toast(e.message);
    }
  };
  dlg.querySelector("#export").onclick = async () => {
    try {
      const data = await api("/privacy/export"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-comunidade.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast(e.message);
    }
  };
  dlg.querySelector("#link-account").onclick = () => {
    const sub = modal(
      `<h2>Comprove seu outro vínculo</h2><form><label>Código do estabelecimento<input name="loja" required></label><label>E-mail<input name="email" type="email" required></label><label>Senha<input name="senha" type="password" required></label><button class="primary">Verificar e vincular</button><p role="alert" class="form-error"></p></form>`,
    );
    sub.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target,
        b = f.querySelector("button");
      b.disabled = true;
      try {
        await api("/accounts/link", {
          method: "POST",
          body: Object.fromEntries(new FormData(f)),
        });
        await refresh();
        sub.close();
        dlg.close();
        render();
      } catch (err) {
        f.querySelector(".form-error").textContent = err.message;
      } finally {
        b.disabled = false;
      }
    };
  };
  dlg.querySelector("#delete").onclick = () => {
    const confirm = modal(
      '<h2>Encerrar sua conta social?</h2><p>Seu acesso será encerrado e o conteúdo ocultado. A solicitação de exclusão será registrada. Isso não apaga seu cadastro no pet shop.</p><button class="primary danger" id="confirm-erasure">Confirmar solicitação</button>',
    );
    confirm.querySelector("button#confirm-erasure").onclick = async (e) => {
      e.target.disabled = true;
      try {
        const r = await api("/privacy/delete", { method: "POST" });
        state.me = null;
        state.cache.clear();
        confirm.close();
        dlg.close();
        render();
        toast(r.message);
      } catch (err) {
        toast(err.message);
        e.target.disabled = false;
      }
    };
  };
}
window.addEventListener("hashchange", () => render());
window.addEventListener("community:refresh", () => render());
(async () => {
  try {
    await refresh();
    await render();
  } catch (e) {
    welcome(e.status === 401 ? "" : e.message);
  }
})();
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register(import.meta.env.BASE_URL + "sw.js", {
      scope: import.meta.env.BASE_URL,
    })
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller)
            toast(
              "Uma nova versão está pronta. Feche e reabra o aplicativo para atualizar.",
            );
        });
      });
    })
    .catch(() => {});
}

setInterval(() => {
  if (!state.me || document.visibilityState !== "visible") return;
  api("/notifications")
    .then((r) => {
      const dot = document.getElementById("unread-dot");
      if (dot) dot.hidden = !r.unread;
    })
    .catch(() => {});
}, 45000);
