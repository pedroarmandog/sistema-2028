import { report } from "./posts.js";
import { api } from "./api.js";
import { state, rerender } from "./state.js";
import { esc, icon, empty, modal, toast } from "./ui.js";
export async function events(container) {
  container.innerHTML = `<div class="page-title"><div><p class="eyebrow">AMIZADES FORA DA TELA</p><h1>Vamos viver uma história?</h1></div>${state.me.user.canEvents ? '<button class="primary" id="new-event">' + icon("plus") + " Organizar encontro</button>" : ""}</div><section class="events-banner"><span>${icon("calendar", 36)}</span><div><h2>Boas companhias. Memórias melhores.</h2><p>Descubra encontros em lugares públicos, na sua cidade.</p></div></section><form class="search-form">${icon("search")}<input name="city" aria-label="Cidade do evento" placeholder="Buscar por cidade"><button class="secondary">Buscar</button></form><div class="events-list" id="events-list"><div class="skeleton"></div></div><button class="load-more" id="more-events" hidden>Mais encontros</button>`;
  let next = null,
    busy = false,
    rows = [];
  const list = container.querySelector("#events-list");
  async function load(append = false) {
    if (busy) return;
    busy = true;
    try {
      const r = await api(
        "/events?" +
          new URLSearchParams({
            city: container.querySelector("input").value,
            ...(append && next ? { after: next } : {}),
          }),
      );
      if (!container.isConnected) return;
      rows = append ? [...rows, ...r.items] : r.items;
      next = r.next;
      container.querySelector("#more-events").hidden = !next;
      list.innerHTML =
        rows
          .map((e) => {
            const date = new Date(e.startsAt);
            return `<article class="event-card surface" data-event="${e.id}"><div class="event-date"><strong>${date.toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>${date.toLocaleDateString("pt-BR", { month: "short" })}</span></div><div class="event-info"><small>${esc(e.city)} · ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small><h2>${esc(e.title)}</h2><p>${esc(e.description)}</p><p class="muted">${esc(e.place)}</p><a href="#/p/${e.organizer.id}">Organizado por ${esc(e.organizer.name)}</a><div class="event-actions"><button class="${e.attending ? "secondary" : "primary"}" data-rsvp>${e.attending ? "Presença confirmada" : "Quero participar"}</button><span>${e.participants} participante${e.participants === 1 ? "" : "s"}</span><button class="text-button" data-report-event>${icon("flag", 15)} Denunciar</button>${e.own ? '<button class="text-button" data-edit>Editar</button><button class="text-button danger" data-cancel>Cancelar evento</button>' : ""}</div></div></article>`;
          })
          .join("") ||
        empty(
          "O próximo encontro está por vir.",
          "Quando houver eventos disponíveis, você poderá encontrá-los aqui e confirmar presença.",
        );
    } catch (err) {
      toast(err.message);
    } finally {
      busy = false;
    }
  }
  list.onclick = async (e) => {
    const article = e.target.closest("[data-event]");
    if (!article) return;
    const event = rows.find((r) => r.id === article.dataset.event),
      rsvp = e.target.closest("[data-rsvp]");
    if (e.target.closest("[data-report-event]")) report("event", event.id);
    if (rsvp) {
      rsvp.disabled = true;
      try {
        await api("/events/" + event.id + "/rsvp", {
          method: event.attending ? "DELETE" : "PUT",
        });
        await load();
      } catch (err) {
        toast(err.message);
        rsvp.disabled = false;
      }
    }
    if (e.target.closest("[data-edit]")) editor(event);
    if (e.target.closest("[data-cancel]")) {
      const dlg = modal(
        '<h2>Cancelar este encontro?</h2><p>Ele deixará de aceitar participantes. Essa ação ficará registrada.</p><button id="yes" class="primary danger">Cancelar evento</button>',
      );
      dlg.querySelector("#yes").onclick = async (e) => {
        e.target.disabled = true;
        try {
          await api("/events/" + event.id, { method: "DELETE" });
          dlg.close();
          load();
        } catch (err) {
          toast(err.message);
          e.target.disabled = false;
        }
      };
    }
  };
  container.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    load();
  };
  container.querySelector("#more-events").onclick = () => load(true);
  container
    .querySelector("#new-event")
    ?.addEventListener("click", () => editor());
  await load();
}
function editor(existing) {
  const dlg = modal(
    `<p class="eyebrow">UMA BOA COMPANHIA COMEÇA COM UM CONVITE</p><h2>${existing ? "Editar encontro" : "Vamos organizar um encontro?"}</h2><form><label>Organizar como<select name="profile_id">${state.me.profiles.map((p) => `<option value="${p.id}" ${p.id === (existing?.organizer?.id || state.active) ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><label>Nome do encontro<input name="title" maxlength="120" value="${esc(existing?.title || "")}" required></label><label>Sobre o evento<textarea name="description" maxlength="2000" required>${esc(existing?.description || "")}</textarea></label><div class="form-grid"><label>Cidade<input name="city" maxlength="100" value="${esc(existing?.city || "")}" required></label><label>Data e horário<input type="datetime-local" name="startsAt" required></label></div><label>Local público<input name="place" maxlength="200" value="${esc(existing?.place || "")}" placeholder="Ex.: entrada principal do parque" required></label><p class="muted">Não divulgue endereços residenciais nem a localização privada dos participantes.</p><button class="primary">Salvar encontro</button><p class="form-error" role="alert"></p></form>`,
  );
  if (existing) {
    const date = new Date(existing.startsAt);
    dlg.querySelector("[name=startsAt]").value = new Date(
      +date - date.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
  }
  dlg.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target,
      b = f.querySelector("button");
    b.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(f));
      body.startsAt = new Date(body.startsAt).toISOString();
      await api("/events" + (existing ? "/" + existing.id : ""), {
        method: existing ? "PUT" : "POST",
        body,
      });
      dlg.close();
      rerender();
      toast("Encontro salvo.");
    } catch (err) {
      f.querySelector(".form-error").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}
