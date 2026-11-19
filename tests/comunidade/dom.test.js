"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path"),
  { JSDOM } = require("jsdom");
const esbuild = require("../../comunidade/node_modules/esbuild");
const profile = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Ana",
    handle: "ana",
    kind: "tutor",
  },
  other = {
    ...profile,
    id: "22222222-2222-4222-8222-222222222222",
    name: "Bobby",
    handle: "bobby",
    kind: "pet",
  };
let bundles = {};
async function dom(entry = "main", options = {}) {
  if (!bundles[entry])
    bundles[entry] = (
      await esbuild.build({
        entryPoints: [
          path.resolve(__dirname, "../../comunidade/src/" + entry + ".js"),
        ],
        bundle: true,
        write: false,
        format: "iife",
        platform: "browser",
        loader: { ".css": "empty" },
        define: {
          "import.meta.env": JSON.stringify({
            BASE_URL: "/comunidade/",
            PROD: false,
            VITE_COMMUNITY_API_URL: "",
          }),
        },
      })
    ).outputFiles[0].text;
  const d = new JSDOM(
      '<!doctype html><div id="app"></div><div id="toast"></div>',
      {
        url: "https://social.example.com/comunidade/?loja=loja-teste#/inicio",
        runScripts: "outside-only",
        pretendToBeVisual: true,
      },
    ),
    w = d.window,
    calls = [];
  let authenticated = options.authenticated !== false;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  w.URL.createObjectURL = () => "blob:test";
  w.URL.revokeObjectURL = () => {};
  w.fetch = async (url, op = {}) => {
    const method = op.method || "GET",
      body = op.body ? JSON.parse(op.body) : null;
    calls.push({ url, method, body, headers: op.headers });
    if (options.fetch) {
      const custom = options.fetch(url, op);
      if (custom)
        return {
          ok: custom.status < 400,
          status: custom.status,
          json: async () => custom.body,
        };
    }
    let data = { ok: true },
      status = 200;
    if (url.endsWith("/session")) {
      status = authenticated ? 200 : 401;
      data = authenticated
        ? {
            user: { id: "test", canEvents: false },
            profiles: [profile, other],
            pets: [],
            csrf: "test-csrf",
          }
        : { erro: "Entre para continuar." };
    } else if (url.endsWith("/login")) authenticated = true;
    else if (url.includes("/notifications")) data = { items: [], unread: 0 };
    else if (url.includes("/explore")) data = { items: [], next: null };
    else if (url.includes("/feed"))
      data = { items: options.posts || [], next: null };
    else if (url.includes("/profiles/"))
      data = { ...profile, own: true, followers: 0, following: 0, posts: 0 };
    else if (url.includes("/events")) data = { items: [], next: null };
    else if (url.endsWith("/logout")) authenticated = false;
    return { ok: status < 400, status, json: async () => data };
  };
  w.eval(bundles[entry]);
  return { w, d, calls, close: () => w.close() };
}
async function until(fn) {
  for (let n = 0; n < 100; n++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail("A interface não chegou ao estado esperado.");
}
test("DOM: boas-vindas usa loja do link, login abre feed real e não grava token em localStorage", async (t) => {
  const f = await dom("main", { authenticated: false });
  t.after(f.close);
  await until(() => f.w.document.querySelector("#login"));
  assert.equal(f.w.document.querySelector("[name=loja]").value, "loja-teste");
  f.w.document.querySelector("[name=email]").value = "ana@example.com";
  f.w.document.querySelector("[name=senha]").value = "SenhaNova1234";
  f.w.document
    .querySelector("#login")
    .dispatchEvent(
      new f.w.Event("submit", { bubbles: true, cancelable: true }),
    );
  await until(() => f.w.document.querySelector("#posts-list"));
  assert.ok(
    f.w.document.body.textContent.includes(
      "A primeira história pode ser a sua.",
    ),
  );
  assert.ok(
    f.calls.some(
      (r) => r.url.endsWith("/login") && r.body.email === "ana@example.com",
    ),
  );
  assert.equal(f.w.localStorage.length, 1);
  assert.equal(f.w.localStorage.key(0), "community_theme");
});
test("DOM: navegação para hashtag abre Explorar com termo; editor publica com CSRF e perfil selecionado", async (t) => {
  const f = await dom();
  t.after(f.close);
  await until(() => f.w.document.querySelector("[data-create]"));
  f.w.location.hash = "/explorar?busca=%23passeios";
  await until(() => f.w.document.querySelector("#social-search"));
  assert.equal(f.w.document.querySelector("#social-search").value, "#passeios");
  await until(() => f.calls.some((r) => r.url.includes("/feed?q=%23passeios")));
  f.w.document.querySelector("[data-create]").click();
  await until(() => f.w.document.querySelector("#composer"));
  const form = f.w.document.querySelector("#composer");
  form.elements.text.value = "Meu primeiro passeio";
  form.dispatchEvent(
    new f.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await until(() =>
    f.calls.some((r) => r.url.endsWith("/posts") && r.method === "POST"),
  );
  const call = f.calls.find(
    (r) => r.url.endsWith("/posts") && r.method === "POST",
  );
  assert.equal(call.headers["X-Community-CSRF"], "test-csrf");
  assert.equal(call.body.profile_id, profile.id);
  assert.equal(call.body.text, "Meu primeiro passeio");
  assert.ok(call.body.idempotency);
});
test("DOM: erro de curtida desfaz atualização otimista; texto de usuário é escapado", async (t) => {
  const post = {
    id: "33333333-3333-4333-8333-333333333333",
    author: profile,
    text: "<img src=x onerror=alert(1)> #passeio",
    media: [],
    kind: "post",
    visibility: "publico",
    createdAt: new Date().toISOString(),
    liked: false,
    saved: false,
    likes: 2,
    comments: 0,
  };
  const f = await dom("main", {
    posts: [post],
    fetch: (url) =>
      url.endsWith("/like")
        ? { status: 503, body: { erro: "Falha de teste" } }
        : null,
  });
  t.after(f.close);
  await until(() => f.w.document.querySelector("[data-action=like]"));
  assert.equal(f.w.document.querySelector(".caption img"), null);
  const b = f.w.document.querySelector("[data-action=like]");
  b.click();
  await until(
    () => f.w.document.querySelector("#toast").textContent === "Falha de teste",
  );
  assert.equal(b.getAttribute("aria-pressed"), "false");
  assert.equal(b.querySelector("span").textContent, "2");
});
test("DOM: seleção de tema persiste preferência e sair retorna ao login", async (t) => {
  const f = await dom();
  t.after(f.close);
  await until(() => f.w.document.querySelector("[data-settings]"));
  f.w.document.querySelector("[data-settings]").click();
  const theme = f.w.document.querySelector("#theme");
  theme.value = "dark";
  theme.dispatchEvent(new f.w.Event("change"));
  assert.equal(f.w.document.documentElement.dataset.theme, "dark");
  assert.equal(f.w.localStorage.getItem("community_theme"), "dark");
  f.w.document.querySelector("#logout").click();
  await until(() => f.w.document.querySelector("#login"));
});
test("DOM: administração renderiza formulário na página correta", async (t) => {
  const f = await dom("admin");
  t.after(f.close);
  assert.ok(f.w.document.querySelector(".admin-login"));
  assert.ok(
    f.w.document.body.textContent.includes("administradores autorizados"),
  );
});
