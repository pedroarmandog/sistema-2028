import "@fontsource-variable/manrope";
import "./style.css";
import "./admin.css";
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
import { welcome as authWelcome } from "./auth-ui.js";
function welcome(error = "") {
  authWelcome(error, async () => {
    await refresh();
    location.hash = "/inicio";
    await render();
  });
}
async function onboard() {
  const { profileForm } = await import("./profiles.js");
  app.innerHTML = `<main class="onboarding"><a class="brand"><span class="brand-mark">${icon("lamp")}</span><span>PetHub<small>COMUNIDADE</small></span></a><p class="eyebrow">SUA HISTÓRIA, DO SEU JEITO</p><h1>Vamos deixar esse cantinho com a sua cara?</h1><p>Uma foto, seus interesses e uma pequena apresentação ajudam a encontrar sua turma. Ter um pet é opcional.</p><section class="surface" id="onboarding-form"></section><button class="text-button" id="skip-onboarding">Fazer isso depois e conhecer o feed ${icon("arrow", 16)}</button></main>`;
  const finish = async () => {
    await api("/onboarding/finish", { method: "POST" });
    await refresh();
    await render();
  };
  profileForm(
    app.querySelector("#onboarding-form"),
    state.me.profiles.find((p) => p.kind === "tutor"),
    finish,
  );
  app.querySelector("#skip-onboarding").onclick = finish;
}

function shell(tab) {
  const active = state.me.profiles.find((p) => p.id === state.active);
  app.innerHTML = `<div class="community-shell"><aside class="rail"><a class="brand" href="#/inicio"><span class="brand-mark">${icon("lamp")}</span><span>PetHub<small>COMUNIDADE</small></span></a><nav aria-label="Navegação principal">${nav("inicio", "Início", "home", tab)}${nav("explorar", "Explorar", "explore", tab)}<button class="create-nav" data-create>${icon("plus")} Criar uma história</button>${nav("eventos", "Eventos", "calendar", tab)}${nav("grupos", "Comunidades", "paw", tab)}${nav("perfil", "Meu perfil", "user", tab)}${nav("salvos", "Salvos", "save", tab)}</nav><div class="rail-foot"><p>Pequenos momentos.<br>Grandes conexões.</p><button class="text-button" data-settings>${icon("settings")} Configurações</button></div></aside><div class="center"><header class="app-header"><a class="mobile-brand" href="#/inicio">PetHub<span>Comunidade</span></a><div class="header-copy"><strong>Seu lugar no mundo pet.</strong><span>Uma boa história merece ser compartilhada.</span></div><div class="header-actions"><button class="icon-btn" data-notifications aria-label="Notificações">${icon("bell")}<i id="unread-dot" hidden></i></button><button class="profile-switch" data-switch aria-label="Alternar perfil">${avatar(active, BASE)}</button></div></header>${state.me.platform?.info ? `<aside class="platform-message">${esc(state.me.platform.info)}</aside>` : ""}<main id="content" tabindex="-1"><div class="skeleton"></div><div class="skeleton"></div></main></div><aside class="discovery"><section class="discovery-note"><span class="eyebrow">MUITO ALÉM DO FEED</span><h2>Seu próximo encontro pode começar aqui.</h2><p>Descubra experiências para viver junto de quem você ama.</p><a href="#/eventos">Explorar eventos ${icon("arrow", 18)}</a></section><section class="suggestions" id="suggestions"><h3>Novas conexões</h3><div class="skeleton small"></div></section><footer>PetHub Comunidade · 2026<br><button class="text-button" data-settings>Privacidade e preferências</button></footer></aside><nav class="bottom-nav" aria-label="Navegação mobile">${nav("inicio", "Início", "home", tab)}${nav("explorar", "Explorar", "explore", tab)}<button data-create class="create-bubble" aria-label="Criar publicação">${icon("plus", 26)}</button>${nav("eventos", "Eventos", "calendar", tab)}${nav("perfil", "Perfil", "user", tab)}</nav></div>`;
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
  const publicRoute = location.hash.replace(/^#\/?/, "").split("?")[0];
  if (
    [
      "entrar",
      "criar-conta",
      "recuperar",
      "redefinir",
      "confirmar",
      "reenviar",
      "atualizar-conta",
    ].includes(publicRoute)
  ) {
    welcome();
    return;
  }
  if (!state.me) {
    welcome();
    return;
  }
  try {
    await refresh();
  } catch (e) {
    if (e.code === "LEGACY_UPGRADE_REQUIRED")
      location.hash = "/atualizar-conta";
    state.me = null;
    state.cache.clear();
    welcome(e.message);
    return;
  }
  if (seq !== state.sequence) return;
  if (!state.me.profiles.length || !state.me.user.onboarded) {
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
    } else if (tab === "grupos") {
      const { groups } = await import("./groups.js");
      if (seq === state.sequence) await groups(content);
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
    `<p class="eyebrow">DO SEU JEITO</p><h2>Preferências e privacidade</h2><label>Aparência<select id="theme"><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label><button class="settings-action" id="blocks">Contas bloqueadas</button><button class="settings-action" id="export">${icon("save")} Exportar meus dados sociais</button><button class="settings-action" id="logout">${icon("logout")} Sair da Comunidade</button><button class="settings-action danger" id="delete">${icon("lock")} Solicitar exclusão da conta</button><p class="muted">Sua conta e os pets cadastrados aqui são independentes de pet shops.</p>`,
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
  dlg.querySelector("#delete").onclick = () => {
    const confirm = modal(
      '<h2>Encerrar sua conta social?</h2><p>Seu acesso será encerrado e o conteúdo ocultado. A solicitação de exclusão será registrada. A exclusão física seguirá a política de retenção da plataforma.</p><button class="primary danger" id="confirm-erasure">Confirmar solicitação</button>',
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
    if (e.code === "LEGACY_UPGRADE_REQUIRED")
      location.hash = "/atualizar-conta";
    welcome(
      e.status === 401 && e.code !== "LEGACY_UPGRADE_REQUIRED" ? "" : e.message,
    );
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
