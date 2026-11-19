import "@fontsource-variable/manrope";
import "./style.css";
import { esc, icon, modal, toast, startTheme } from "./ui.js";
import { BASE } from "./api.js";
startTheme();
let token = "",
  tab = "companies";
const app = document.getElementById("app");
async function request(path, body, method) {
  const r = await fetch(BASE + "/api/comunidade-admin" + path, {
    method: method || "GET",
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.erro || "Acesso indisponível.");
  return data;
}
function login() {
  app.innerHTML = `<main class="admin-layout"><form class="admin-login surface"><p class="eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p><h1>PetHub Comunidade</h1><p>Acesso exclusivo a administradores autorizados do PetHub.</p><label>E-mail<input type="email" name="email" autocomplete="username" required></label><label>Senha<input type="password" name="senha" autocomplete="current-password" required></label><button class="primary">Entrar</button><p role="alert" class="form-error"></p></form></main>`;
  app.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const r = await fetch(BASE + "/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
        }),
        data = await r.json();
      if (!r.ok) throw Error(data.error || "Acesso indisponível.");
      token = data.token;
      await request("/companies");
      render();
    } catch (err) {
      e.target.querySelector(".form-error").textContent = err.message;
      token = "";
    } finally {
      b.disabled = false;
    }
  };
}
function render() {
  app.innerHTML = `<main class="admin-layout"><header><div><p class="eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p><h1>Uma comunidade de confiança.</h1></div><button id="logout" class="secondary">Sair</button></header><nav class="admin-tabs">${[
    ["companies", "Liberações"],
    ["users", "Participantes"],
    ["reports", "Denúncias"],
    ["audit", "Auditoria"],
  ]
    .map(
      ([id, label]) =>
        `<button data-tab="${id}" class="${id === tab ? "active" : ""}">${label}</button>`,
    )
    .join(
      "",
    )}</nav><section class="surface" id="admin-content"><div class="skeleton"></div></section></main>`;
  app.querySelector("#logout").onclick = () => {
    token = "";
    login();
  };
  app.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        render();
      }),
  );
  load();
}
async function load() {
  const box = app.querySelector("#admin-content");
  try {
    const rows = await request("/" + tab);
    if (!box.isConnected) return;
    if (tab === "companies") {
      box.innerHTML =
        '<h2>Liberação por empresa e tutor</h2><p class="muted">Ative a empresa e depois as contas individuais que poderão participar.</p>' +
        rows
          .map(
            (r) =>
              `<div class="admin-row"><div><strong>${esc(r.name)}</strong><p>Empresa ${esc(r.id)}</p></div><label class="checkbox"><input type="checkbox" data-company="${r.id}" ${r.enabled ? "checked" : ""}>Liberada</label><button class="secondary" data-accounts="${r.id}">Contas de tutor</button></div>`,
          )
          .join("");
      box.querySelectorAll("[data-company]").forEach(
        (b) =>
          (b.onchange = async () => {
            b.disabled = true;
            try {
              await request(
                "/companies/" + b.dataset.company,
                { enabled: b.checked },
                "PUT",
              );
              toast("Liberação atualizada.");
            } catch (e) {
              b.checked = !b.checked;
              toast(e.message);
            } finally {
              b.disabled = false;
            }
          }),
      );
      box
        .querySelectorAll("[data-accounts]")
        .forEach((b) => (b.onclick = () => accounts(b.dataset.accounts)));
    } else if (tab === "users") {
      box.innerHTML =
        "<h2>Participantes e permissões</h2>" +
        rows
          .map(
            (r) =>
              `<form class="admin-row" data-user="${r.id}"><div><strong>${esc(r.name)}</strong><p>${r.id}</p></div>${r.state === "deleted" ? "<span>Conta excluída</span>" : `<select name="state" aria-label="Estado"><option value="active" ${r.state === "active" ? "selected" : ""}>Ativo</option><option value="suspended" ${r.state === "suspended" ? "selected" : ""}>Suspenso</option></select><select name="role" aria-label="Papel"><option value="member" ${r.role === "member" ? "selected" : ""}>Membro</option><option value="moderator" ${r.role === "moderator" ? "selected" : ""}>Moderador</option></select><label class="checkbox"><input name="canEvents" type="checkbox" ${r.canEvents ? "checked" : ""}>Criar eventos</label><button class="secondary">Salvar</button>`}</form>`,
          )
          .join("");
      box.querySelectorAll("form").forEach(
        (f) =>
          (f.onsubmit = async (e) => {
            e.preventDefault();
            const b = f.querySelector("button");
            b.disabled = true;
            try {
              await request(
                "/users/" + f.dataset.user,
                {
                  state: f.elements.state.value,
                  role: f.elements.role.value,
                  canEvents: f.elements.canEvents.checked,
                },
                "PUT",
              );
              toast("Permissões atualizadas.");
            } catch (err) {
              toast(err.message);
            } finally {
              b.disabled = false;
            }
          }),
      );
    } else if (tab === "reports") {
      box.innerHTML =
        "<h2>Fila de denúncias</h2>" +
        rows
          .map(
            (r) =>
              `<div class="admin-row"><div><strong>${esc(r.kind)}</strong><p>${esc(r.reason)}</p><p>Conteúdo: ${esc(r.target_id)}</p><p>${new Date(r.createdAt).toLocaleString("pt-BR")}</p></div><button class="secondary" data-moderate="${r.id}">Avaliar remoção</button></div>`,
          )
          .join("") +
        (rows.length ? "" : '<p class="muted">Nenhuma denúncia em aberto.</p>');
      box.querySelectorAll("[data-moderate]").forEach(
        (b) =>
          (b.onclick = async () => {
            const r = rows.find((r) => r.id === b.dataset.moderate);
            let content;
            try {
              content = await request("/reports/" + r.id + "/content");
            } catch (e) {
              toast(e.message);
              return;
            }
            const dlg = modal(
              `<h2>Revisar conteúdo denunciado</h2><p>Tipo: ${esc(r.kind)} · ${esc(r.target_id)}</p><p>Denúncia: ${esc(r.reason)}</p><section class="moderation-content"><strong>${esc(content.name)}</strong><p>${esc(content.text)}</p><div id="moderation-photos"></div></section><p>Esta ação oculta o conteúdo e resolve as denúncias vinculadas.</p><form><label>Motivo da decisão<textarea name="reason" required maxlength="1000"></textarea></label><button class="primary danger">Confirmar remoção</button></form>`,
            );
            for (const id of content.media || []) {
              try {
                const response = await fetch(
                  BASE + "/api/comunidade-admin/media/" + id,
                  {
                    headers: { Authorization: "Bearer " + token },
                    cache: "no-store",
                  },
                );
                if (!response.ok) continue;
                const url = URL.createObjectURL(await response.blob()),
                  img = document.createElement("img");
                img.src = url;
                img.alt = "Foto do conteúdo denunciado";
                dlg.querySelector("#moderation-photos").append(img);
                dlg.addEventListener("close", () => URL.revokeObjectURL(url), {
                  once: true,
                });
              } catch {}
            }
            dlg.querySelector("form").onsubmit = async (e) => {
              e.preventDefault();
              const button = e.target.querySelector("button");
              button.disabled = true;
              try {
                await request(
                  "/moderate",
                  {
                    kind: r.kind,
                    id: r.target_id,
                    reason: e.target.elements.reason.value,
                  },
                  "POST",
                );
                dlg.close();
                load();
              } catch (err) {
                toast(err.message);
                button.disabled = false;
              }
            };
          }),
      );
    } else {
      box.innerHTML =
        "<h2>Histórico de decisões</h2>" +
        rows
          .map(
            (r) =>
              `<div class="admin-row"><div><strong>${esc(r.action)}</strong><p>Autor: ${esc(r.actor_id)} · Destino: ${esc(r.target_id)}</p><p>${new Date(r.createdAt).toLocaleString("pt-BR")}</p><pre>${esc(JSON.stringify(r.details, null, 2))}</pre></div></div>`,
          )
          .join("");
    }
  } catch (e) {
    box.innerHTML =
      '<p class="form-error">' +
      esc(e.message) +
      '</p><button class="secondary" id="retry">Tentar novamente</button>';
    box.querySelector("#retry").onclick = load;
  }
}
async function accounts(id) {
  try {
    const rows = await request("/accounts/" + id),
      dlg = modal(
        `<h2>Contas de tutor · ${esc(id)}</h2><p>O tutor precisa de uma conta ativa no PetHub Cliente.</p>${rows.map((r) => `<label class="checkbox"><input data-account="${r.id}" type="checkbox" ${r.enabled ? "checked" : ""}><span>${esc(r.email)} · Cliente ${esc(r.clientId)}</span></label>`).join("") || "<p>Nenhuma conta de tutor cadastrada.</p>"}`,
      );
    dlg.querySelectorAll("[data-account]").forEach(
      (b) =>
        (b.onchange = async () => {
          b.disabled = true;
          try {
            await request(
              "/accounts/" + b.dataset.account,
              { enabled: b.checked },
              "PUT",
            );
          } catch (e) {
            b.checked = !b.checked;
            toast(e.message);
          } finally {
            b.disabled = false;
          }
        }),
    );
  } catch (e) {
    toast(e.message);
  }
}
login();
