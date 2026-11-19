const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const source = fs
  .readFileSync(
    path.join(
      __dirname,
      "../../comunidade/deploy/cloudflare/functions/api/[[path]].js",
    ),
    "utf8",
  )
  .replace("export async function onRequest", "async function onRequest");
function proxy(fetch) {
  const sandbox = { Request, Response, URL, Headers, fetch };
  vm.runInNewContext(source + "\nthis.proxy=onRequest;", sandbox);
  return sandbox.proxy;
}
test("proxy de domínio preserva cookie/CSRF/JSON e não encaminha endpoints do ERP", async () => {
  let sent;
  const handler = proxy(async (request) => {
    sent = request;
    return new Response('{"ok":true}', {
      headers: {
        "Set-Cookie":
          "pethub_community=test; Path=/api/comunidade; HttpOnly; Secure; SameSite=Lax",
      },
    });
  });
  const request = new Request(
    "https://social.example.com/api/comunidade/posts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Community-CSRF": "csrf-test",
        Cookie: "pethub_community=test",
        Origin: "https://social.example.com",
      },
      body: '{"text":"Passeio"}',
    },
  );
  const result = await handler({
    request,
    env: { COMMUNITY_API_ORIGIN: "https://api.example.com" },
  });
  assert.equal(sent.url, "https://api.example.com/api/comunidade/posts");
  assert.equal(sent.headers.get("Cookie"), "pethub_community=test");
  assert.equal(sent.headers.get("X-Community-CSRF"), "csrf-test");
  assert.equal(await sent.text(), '{"text":"Passeio"}');
  assert.match(result.headers.get("Set-Cookie"), /HttpOnly/);
  assert.equal(result.headers.get("Cache-Control"), "private, no-store");
  const no = await handler({
    request: new Request("https://social.example.com/api/usuarios/me"),
    env: { COMMUNITY_API_ORIGIN: "https://api.example.com" },
  });
  assert.equal(no.status, 404);
});
test("proxy recusa origem de destino ausente ou sem HTTPS", async () => {
  const handler = proxy(() => {
    throw Error("Não deveria conectar");
  });
  for (const env of [
    {},
    { COMMUNITY_API_ORIGIN: "http://insecure.example.com" },
  ]) {
    const response = await handler({
      request: new Request("https://social.example.com/api/comunidade/session"),
      env,
    });
    assert.equal(response.status, 503);
  }
});
