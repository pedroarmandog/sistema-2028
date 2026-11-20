"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { setup } = require("./setup");
async function server(t, env = {}) {
  const f = await setup(t),
    express = require("express"),
    app = express();
  const { router, admin } = require("../../backend/comunidade/routes").routes(
    f.s,
    {
      env: {
        NODE_ENV: "production",
        COMMUNITY_ENABLED: "true",
        COMMUNITY_ORIGINS: "https://comunidade.example.com",
        JWT_SECRET: "test-only",
        COMMUNITY_PLATFORM_ADMIN_IDS: "99",
        ...env,
      },
      adminAccounts: f.Admin,
    },
  );
  app.use("/api/comunidade", router);
  app.use("/api/comunidade-admin", admin);
  app.get("/api/erp-alive", (req, res) => res.json({ ok: true }));
  const listener = app.listen(0, "127.0.0.1");
  await new Promise((r) => listener.once("listening", r));
  t.after(() => new Promise((r) => listener.close(r)));
  const root = "http://127.0.0.1:" + listener.address().port;
  return {
    ...f,
    request: async (path, op = {}) => {
      const headers = {
        ...(op.cookie ? { Cookie: op.cookie } : {}),
        ...op.headers,
      };
      // Node fetch rewrites Host; use the HTTP client for an accurate TLS-proxy fixture.
      if (headers.Host)
        return new Promise((resolve, reject) => {
          const request = require("node:http").request(
            root + path,
            { method: op.method || "GET", headers },
            (response) => {
              const chunks = [];
              response.on("data", (chunk) => chunks.push(chunk));
              response.on("end", () => {
                const body = Buffer.concat(chunks).toString();
                const returned = new Headers();
                for (const [key, value] of Object.entries(response.headers))
                  for (const v of Array.isArray(value) ? value : [value])
                    if (v !== undefined) returned.append(key, v);
                resolve({
                  status: response.statusCode,
                  headers: returned,
                  json: async () => JSON.parse(body),
                });
              });
            },
          );
          request.on("error", reject);
          request.end(op.body);
        });
      return fetch(root + path, { ...op, headers });
    },
    cookie: "pethub_community=" + f.la.raw,
  };
}
async function adminLogin(f) {
  const r = await f.request("/api/comunidade-admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@example.com",
      senha: "Admin-Test-Password",
    }),
  });
  const result = await r.json();
  return {
    response: r,
    cookie: r.headers.get("Set-Cookie")?.split(";")[0],
    csrf: result.csrf,
    body: result,
  };
}
test("HTTP: conta pública entra com e-mail/senha, sem código de loja e com cookie próprio", async (t) => {
  const f = await server(t),
    r = await f.request("/api/comunidade/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f.credsA),
    });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Set-Cookie"), /pethub_community=/);
  assert.match(r.headers.get("Set-Cookie"), /HttpOnly/);
  assert.match(r.headers.get("Set-Cookie"), /Secure/);
  const self = await f.request("/api/comunidade/session", { cookie: f.cookie });
  assert.equal(self.status, 200);
  assert.doesNotMatch(
    JSON.stringify(await self.json()),
    /password_hash|empresa_id|cliente_id|senha_hash/,
  );
});
test("HTTP: cadastro envia token pelo adaptador, não no JSON, e exige verificação", async (t) => {
  const f = await server(t),
    r = await f.request("/api/comunidade/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Nova",
        handle: "nova_http",
        email: "nova-http@example.com",
        senha: "SenhaNova1234",
        confirmacao: "SenhaNova1234",
        terms: true,
        adult: true,
      }),
    });
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.verificationRequired, true);
  assert.ok(f.mails.at(-1).token);
  assert.equal(data.token, undefined);
  const login = await f.request("/api/comunidade/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nova-http@example.com",
      senha: "SenhaNova1234",
    }),
  });
  assert.equal(login.status, 403);
  assert.equal((await login.json()).codigo, "EMAIL_UNVERIFIED");
});
test("HTTP: escritas protegidas exigem CSRF mesmo com cookie válido", async (t) => {
  const f = await server(t),
    body = JSON.stringify({
      profile_id: f.pa.id,
      text: "Passeio HTTP",
      visibility: "publico",
      idempotency: require("crypto").randomUUID(),
    });
  let r = await f.request("/api/comunidade/posts", {
    cookie: f.cookie,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  assert.equal(r.status, 403);
  r = await f.request("/api/comunidade/posts", {
    cookie: f.cookie,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-CSRF": f.ca.csrf,
    },
    body,
  });
  assert.equal(r.status, 200);
});
test("HTTP: login independente aceita HTTPS do próprio Render atrás de proxy HTTP", async (t) => {
  const f = await server(t),
    r = await f.request("/api/comunidade/login", {
      method: "POST",
      headers: {
        Host: "pethub-api-wdna.onrender.com",
        Origin: "https://pethub-api-wdna.onrender.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(f.credsA),
    });
  assert.equal(r.status, 200);
  assert.equal(
    r.headers.get("Access-Control-Allow-Origin"),
    "https://pethub-api-wdna.onrender.com",
  );
});
test("HTTP: rejeita outra origem, downgrade em produção e cabeçalhos encaminhados falsos", async (t) => {
  const f = await server(t);
  for (const origin of [
    "https://evil.example.com",
    "https://pethub-api-wdna.onrender.com.evil.example",
    "null",
    "http://pethub-api-wdna.onrender.com",
  ]) {
    const r = await f.request("/api/comunidade/session", {
      cookie: f.cookie,
      headers: {
        Host: "pethub-api-wdna.onrender.com",
        Origin: origin,
        "X-Forwarded-Host": "evil.example.com",
        "X-Forwarded-Proto": "https",
      },
    });
    assert.equal(r.status, 403);
  }
  const preflight = await f.request("/api/comunidade/login", {
    method: "OPTIONS",
    headers: {
      Host: "pethub-api-wdna.onrender.com",
      Origin: "https://pethub-api-wdna.onrender.com",
    },
  });
  assert.equal(preflight.status, 204);
});
test("HTTP: usuário comum e antigo JWT sem sessão administrativa não acessam APIs privadas", async (t) => {
  const f = await server(t);
  assert.equal(
    (
      await f.request("/api/comunidade-admin/participants", {
        cookie: f.cookie,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await f.request("/api/comunidade-admin/overview", {
        headers: { Authorization: "Bearer platform-test" },
      })
    ).status,
    401,
  );
  assert.equal(
    (await f.request("/api/comunidade-admin/settings", { cookie: f.cookie }))
      .status,
    401,
  );
});
test("HTTP: administrador autorizado obtém cookie separado; logout revoga sessão no servidor", async (t) => {
  const f = await server(t),
    a = await adminLogin(f);
  assert.equal(a.response.status, 200);
  assert.match(a.response.headers.get("Set-Cookie"), /pethub_community_admin=/);
  assert.match(
    a.response.headers.get("Set-Cookie"),
    /Path=\/api\/comunidade-admin/,
  );
  assert.equal(
    (
      await f.request("/api/comunidade-admin/participants", {
        cookie: a.cookie,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request("/api/comunidade-admin/logout", {
        cookie: a.cookie,
        method: "POST",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/api/comunidade-admin/logout", {
        cookie: a.cookie,
        method: "POST",
        headers: { "X-Community-CSRF": a.csrf },
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.request("/api/comunidade-admin/overview", { cookie: a.cookie }))
      .status,
    401,
  );
  assert.equal(
    (await f.request("/api/comunidade/session", { cookie: f.cookie })).status,
    200,
  );
});
test("HTTP: conta administrativa do ERP fora da allowlist não vira administradora da Comunidade", async (t) => {
  const f = await server(t, { COMMUNITY_PLATFORM_ADMIN_IDS: "7" });
  const a = await adminLogin(f);
  assert.equal(a.response.status, 403);
  assert.equal(await f.s.m.AdminSession.count(), 0);
});
test("HTTP: moderador acessa denúncias, mas não configurações, lista de e-mails ou bloqueio permanente", async (t) => {
  const f = await server(t, {
      COMMUNITY_PLATFORM_ADMIN_IDS: "",
      COMMUNITY_PLATFORM_MODERATOR_IDS: "99",
    }),
    a = await adminLogin(f);
  assert.equal(a.body.role, "moderator");
  assert.equal(
    (await f.request("/api/comunidade-admin/reports", { cookie: a.cookie }))
      .status,
    200,
  );
  for (const path of ["/settings", "/participants", "/stats"])
    assert.equal(
      (await f.request("/api/comunidade-admin" + path, { cookie: a.cookie }))
        .status,
      403,
    );
  const p = await f.publish(f.ca, f.pa);
  await f.s.report(f.cb, { kind: "post", target_id: p.id, reason: "Assédio" });
  const report = await f.s.m.Report.findOne();
  const r = await f.request(
    "/api/comunidade-admin/reports/" + report.id + "/decision",
    {
      cookie: a.cookie,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Community-CSRF": a.csrf,
      },
      body: JSON.stringify({
        action: "block",
        reason: "Tentativa de bloqueio",
      }),
    },
  );
  assert.equal(r.status, 403);
});
test("HTTP: pausa pública não fecha a administração nem outras rotas do ERP", async (t) => {
  const f = await server(t, { COMMUNITY_ENABLED: "false" });
  assert.equal(
    (await f.request("/api/comunidade/session", { cookie: f.cookie })).status,
    503,
  );
  assert.equal((await f.request("/api/erp-alive")).status, 200);
  const a = await adminLogin(f);
  assert.equal(a.response.status, 200);
  assert.equal(
    (await f.request("/api/comunidade-admin/overview", { cookie: a.cookie }))
      .status,
    200,
  );
});
test("HTTP: pedido de exclusão encerra sessão social sem apagar dados ERP", async (t) => {
  const f = await server(t);
  const r = await f.request("/api/comunidade/privacy/delete", {
    method: "POST",
    cookie: f.cookie,
    headers: { "X-Community-CSRF": f.ca.csrf },
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await f.request("/api/comunidade/session", { cookie: f.cookie })).status,
    401,
  );
  assert.equal(await f.ERP.Cliente.count(), 3);
  assert.equal(await f.ERP.Pet.count(), 3);
});
test("HTTP: orienta migração ausente sem vazar SQL ou credenciais", async (t) => {
  const f = await server(t);
  f.s.login = async () => {
    throw Object.assign(Error("PRIVATE SQL"), {
      original: { code: "ER_NO_SUCH_TABLE", errno: 1146 },
    });
  };
  const r = await f.request("/api/comunidade/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(r.status, 503);
  const data = await r.json();
  assert.equal(data.codigo, "COMMUNITY_MIGRATION_REQUIRED");
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE SQL/);
});
test("HTTP: fluxo completo cadastra, confirma, entra, cria pet e publica sem empresa", async (t) => {
  const f = await server(t);
  const send = async (path, body, extra = {}) =>
    f.request("/api/comunidade" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extra.headers },
      ...extra,
      body: JSON.stringify(body),
    });
  let r = await send("/auth/register", {
    name: "Tutor público",
    handle: "tutor_fluxo",
    email: "fluxo@example.com",
    senha: "SenhaFluxo1234",
    confirmacao: "SenhaFluxo1234",
    terms: true,
    adult: true,
  });
  assert.equal(r.status, 200);
  r = await send("/auth/verify", { token: f.mails.at(-1).token });
  assert.equal(r.status, 200);
  r = await send("/login", {
    email: "fluxo@example.com",
    senha: "SenhaFluxo1234",
  });
  assert.equal(r.status, 200);
  const cookie = r.headers.get("Set-Cookie").split(";")[0],
    session = await (
      await f.request("/api/comunidade/session", { cookie })
    ).json(),
    headers = {
      "Content-Type": "application/json",
      "X-Community-CSRF": session.csrf,
    };
  r = await send(
    "/profiles",
    {
      kind: "pet",
      name: "Luna",
      handle: "luna_fluxo",
      species: "Gato",
      consent: true,
      adult: true,
    },
    { cookie, headers },
  );
  assert.equal(r.status, 200);
  const pet = await r.json();
  r = await send(
    "/posts",
    {
      profile_id: pet.id,
      text: "Minha primeira história",
      visibility: "publico",
      idempotency: require("crypto").randomUUID(),
    },
    { cookie, headers },
  );
  assert.equal(r.status, 200);
  const feed = await (
    await f.request("/api/comunidade/feed", { cookie })
  ).json();
  assert.equal(feed.items[0].author.name, "Luna");
  assert.equal(await f.s.m.Link.count(), 0);
  assert.equal(await f.ERP.Pet.count(), 3);
});
