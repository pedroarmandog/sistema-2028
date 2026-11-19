export const BASE = (import.meta.env.VITE_COMMUNITY_API_URL || "").replace(
  /\/+$/,
  "",
);
let csrf = "";
export const setCSRF = (value) => (csrf = value || "");
export async function api(path, { method = "GET", body, signal } = {}) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 20000);
  if (signal)
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const r = await fetch(BASE + "/api/comunidade" + path, {
      credentials: "include",
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-Community-CSRF": csrf } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await r
      .json()
      .catch(() => ({ erro: "Resposta indisponível." }));
    if (!r.ok)
      throw Object.assign(Error(data.erro || "Não foi possível concluir."), {
        status: r.status,
      });
    return data;
  } catch (e) {
    if (e.name === "AbortError")
      throw Error(
        "A conexão demorou. Confira o resultado antes de tentar novamente.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export function upload(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + "/api/comunidade/media");
    xhr.withCredentials = true;
    xhr.timeout = 65000;
    xhr.setRequestHeader("X-Community-CSRF", csrf);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        return reject(Error("Resposta de upload inválida."));
      }
      if (xhr.status < 200 || xhr.status >= 300)
        return reject(Error(data.erro || "Upload indisponível."));
      resolve(data);
    };
    xhr.onerror = xhr.ontimeout = () =>
      reject(Error("Não foi possível enviar a foto. Verifique a conexão."));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
