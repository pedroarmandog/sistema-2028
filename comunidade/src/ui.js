export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  lamp: "M9 17h6m-6 3h6M8 14a7 7 0 1 1 8 0l-1 3H9ZM10 23h4",
  home: "m3 10 9-7 9 7v10H3ZM9 20v-7h6v7",
  explore: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-6-3-2 5-4 1 2-5Z",
  plus: "M12 5v14M5 12h14",
  calendar: "M5 5h14v16H5ZM8 3v4m8-4v4M5 10h14",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0",
  heart: "M12 21 3 12C-2 5 6-1 12 6c6-7 14-1 9 6Z",
  comment: "M21 11a9 9 0 0 1-9 9H3v-8a9 9 0 1 1 18-1Z",
  save: "M6 3h12v18l-6-4-6 4Z",
  share: "M12 16V2m-5 5 5-5 5 5M5 12v9h14v-9",
  bell: "M6 17V9a6 6 0 0 1 12 0v8l2 2H4ZM10 22h4",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  close: "m6 6 12 12M18 6 6 18",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5-5-5 5 5 5",
  photo: "M3 4h18v16H3Zm0 12 6-6 5 5 3-3 4 4M15 8h.01",
  check: "m4 12 5 5L20 6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  search: "M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  moon: "M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12",
  logout: "M9 3H3v18h6m5-14 5 5-5 5M8 12h13",
  paw: "M8 14c-4 1-6 6-3 7s5-1 7-1 5 2 7 1 1-6-3-7c-3-2-5-2-8 0ZM4 6v3M9 3v4m6-4v4m5-1v3",
  flag: "M5 22V3c5-4 9 4 14 0v11c-5 4-9-4-14 0",
  lock: "M5 10h14v12H5ZM8 10V6a4 4 0 0 1 8 0v4",
};
export const icon = (name, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.paw}"/></svg>`;
export const asset = (name) => import.meta.env.BASE_URL + "assets/" + name;
export const nav = (path, label, name, active) =>
  `<a href="#/${path}" class="${active === path ? "active" : ""}" ${active === path ? 'aria-current="page"' : ""}>${icon(name)}<span>${label}</span></a>`;
export const ago = (date) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(date)) / 60000));
  return m < 1
    ? "Agora"
    : m < 60
      ? m + " min"
      : m < 1440
        ? Math.floor(m / 60) + " h"
        : new Date(date).toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "short",
          });
};
let toastTimer;
export function toast(text) {
  const box = document.getElementById("toast");
  box.textContent = text;
  box.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("show"), 4500);
}
export function modal(content, { className = "" } = {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "modal " + className;
  dialog.innerHTML = `<button type="button" class="icon-btn close-modal" aria-label="Fechar">${icon("close")}</button>${content}`;
  document.body.append(dialog);
  dialog.querySelector(".close-modal").onclick = () => dialog.close();
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog && dialog.dataset.busy !== "true") dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
  return dialog;
}
export const empty = (title, description, action = "") =>
  `<section class="empty"><span class="empty-symbol">${icon("paw", 36)}</span><h2>${title}</h2><p>${description}</p>${action}</section>`;
export const avatar = (p, base = "", large = false) =>
  p?.avatar
    ? `<img class="avatar ${large ? "large" : ""}" src="${esc(base + p.avatar)}" alt="Foto de ${esc(p.name)}" loading="lazy">`
    : `<span class="avatar fallback ${large ? "large" : ""}" aria-label="Perfil de ${esc(p?.name || "pet")}">${icon(p?.kind === "pet" ? "paw" : "user", large ? 36 : 22)}</span>`;
export function theme(value) {
  try {
    localStorage.setItem("community_theme", value);
  } catch {}
  const dark =
    value === "dark" ||
    (value === "auto" && matchMedia("(prefers-color-scheme:dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
export function startTheme() {
  let value = "auto";
  try {
    value = localStorage.getItem("community_theme") || "auto";
  } catch {}
  theme(value);
  matchMedia("(prefers-color-scheme:dark)").addEventListener("change", () => {
    if (localStorage.getItem("community_theme") === "auto") theme("auto");
  });
}
