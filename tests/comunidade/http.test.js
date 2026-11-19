"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { setup } = require("./setup");
async function server(t, env = {}) {
  const f = await setup(t),
    express = require("express"),
    app = express();
  const adminAuth = (req, res, next) => {
    if (req.get("Authorization") !== "Bearer platform-test")
      return res.status(401).json({ erro: "Token inválido" });
    req.adminId = 99;
    next();
  };
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
      adminAuth,
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
test("HTTP: cookie seguro, HttpOnly, escopo social; sessão sem segredo; origem estranha recusada", async (t) => {
  const f = await server(t),
    r = await f.request("/api/comunidade/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await f.creds(f.a)),
    });
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie");
  assert.match(cookie, /Path=\/api\/comunidade/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  const session = await f.request("/api/comunidade/session", {
    cookie: f.cookie,
  });
  assert.equal(session.status, 200);
  assert.equal(session.headers.get("cache-control"), "private, no-store");
  assert.doesNotMatch(
    JSON.stringify(await session.json()),
    /senha_hash|pethub_cliente|email|reference/,
  );
  assert.equal(
    (
      await f.request("/api/comunidade/session", {
        cookie: f.cookie,
        headers: { Origin: "https://evil.example.com" },
      })
    ).status,
    403,
  );
});
test("HTTP: CSRF obrigatório nas escritas, token social não serve como token de administração", async (t) => {
  const f = await server(t);
  const body = JSON.stringify({
    profile_id: f.pa.id,
    text: "HTTP teste",
    visibility: "publico",
    idempotency: require("crypto").randomUUID(),
  });
  const missing = await f.request("/api/comunidade/posts", {
    cookie: f.cookie,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  assert.equal(missing.status, 403);
  const good = await f.request("/api/comunidade/posts", {
    cookie: f.cookie,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-CSRF": f.ca.csrf,
    },
    body,
  });
  assert.equal(good.status, 200);
  assert.equal((await good.json()).text, "HTTP teste");
  assert.equal(
    (
      await f.request("/api/comunidade-admin/companies", {
        cookie: f.cookie,
        headers: { Authorization: "Bearer " + f.la.raw },
      })
    ).status,
    401,
  );
});
test("HTTP: feature flag fecha só a Comunidade e mantém rota ERP", async (t) => {
  const f = await server(t, { COMMUNITY_ENABLED: "false" });
  assert.equal(
    (await f.request("/api/comunidade/session", { cookie: f.cookie })).status,
    503,
  );
  assert.equal((await f.request("/api/erp-alive")).status, 200);
});
test("HTTP: admin fora da allowlist é recusado, liberação válida e suspensão são auditadas", async (t) => {
  const f = await server(t);
  let r = await f.request("/api/comunidade-admin/companies", {
    headers: { Authorization: "Bearer platform-test" },
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).length, 2);
  r = await f.request("/api/comunidade-admin/companies/1", {
    method: "PUT",
    headers: {
      Authorization: "Bearer platform-test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled: false }),
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await f.request("/api/comunidade/session", { cookie: f.cookie })).status,
    403,
  );
  assert.equal(
    await f.s.m.Audit.count({ where: { action: "company_access" } }),
    1,
  );
  const no = await server(t, { COMMUNITY_PLATFORM_ADMIN_IDS: "7" });
  assert.equal(
    (
      await no.request("/api/comunidade-admin/companies", {
        headers: { Authorization: "Bearer platform-test" },
      })
    ).status,
    403,
  );
});
test("HTTP: bloqueio remove ator da caixa de notificações", async (t) => {
  const f = await server(t),
    post = await f.publish(f.ca, f.pa);
  await f.s.reaction(f.cb, post.id, "like", true);
  assert.equal(
    (
      await (
        await f.request("/api/comunidade/notifications", { cookie: f.cookie })
      ).json()
    ).items.length,
    1,
  );
  await f.s.block(f.ca, f.pb.id, true);
  const r = await (
    await f.request("/api/comunidade/notifications", { cookie: f.cookie })
  ).json();
  assert.equal(r.items.length, 0);
  assert.equal(r.unread, 0);
});
test("HTTP: pedido de exclusão revoga sessão, oculta conteúdo e mantém cadastro ERP", async (t) => {
  const f = await server(t);
  await f.publish(f.ca, f.pa);
  const r = await f.request("/api/comunidade/privacy/delete", {
    cookie: f.cookie,
    method: "POST",
    headers: { "X-Community-CSRF": f.ca.csrf },
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await f.request("/api/comunidade/session", { cookie: f.cookie })).status,
    401,
  );
  assert.equal((await f.s.feed(f.cb)).items.length, 0);
  assert.equal(await f.ERP.Cliente.count(), 3);
  assert.equal(await f.ERP.Pet.count(), 3);
  assert.equal(await f.s.m.Privacy.count({ where: { state: "pending" } }), 1);
});

test("HTTP: Render aceita HTTPS do próprio Host com Express em HTTP, sem depender da lista de domínio exclusivo", async (t) => {
  const f = await server(t);
  const r = await f.request("/api/comunidade/session", {
    cookie: f.cookie,
    headers: {
      Host: "pethub-api-wdna.onrender.com",
      Origin: "https://pethub-api-wdna.onrender.com",
    },
  });
  assert.equal(r.status, 200);
  assert.equal(
    r.headers.get("Access-Control-Allow-Origin"),
    "https://pethub-api-wdna.onrender.com",
  );
});
test("HTTP: login com credenciais reais funciona no HTTPS do próprio Render", async (t) => {
  const f = await server(t);
  const r = await f.request("/api/comunidade/login", {
    method: "POST",
    headers: {
      Host: "pethub-api-wdna.onrender.com",
      Origin: "https://pethub-api-wdna.onrender.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(await f.creds(f.a)),
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Set-Cookie"), /HttpOnly/);
  assert.equal((await r.json()).ok, true);
});
test("HTTP: não confia em domínio por sufixo nem em X-Forwarded-Host de outra origem", async (t) => {
  const f = await server(t);
  for (const origin of [
    "https://pethub-api-wdna.onrender.com.evil.example",
    "https://evil.example",
    "null",
    "http://pethub-api-wdna.onrender.com",
  ]) {
    const r = await f.request("/api/comunidade/session", {
      cookie: f.cookie,
      headers: {
        Host: "pethub-api-wdna.onrender.com",
        Origin: origin,
        "X-Forwarded-Host": "evil.example",
        "X-Forwarded-Proto": "https",
      },
    });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).codigo, "COMMUNITY_ORIGIN_NOT_ALLOWED");
  }
});
test("HTTP: preflight HTTPS do próprio Render permite os cabeçalhos sociais", async (t) => {
  const f = await server(t);
  const r = await f.request("/api/comunidade/login", {
    method: "OPTIONS",
    headers: {
      Host: "pethub-api-wdna.onrender.com",
      Origin: "https://pethub-api-wdna.onrender.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,x-community-csrf",
    },
  });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.match(
    r.headers.get("Access-Control-Allow-Headers"),
    /X-Community-CSRF/,
  );
});
test("HTTP: 503 informa flag desabilitada; 403 de liberação não é confundido com erro de senha", async (t) => {
  const closed = await server(t, { COMMUNITY_ENABLED: "false" });
  let r = await closed.request("/api/comunidade/login", {
    method: "POST",
    headers: {
      Host: "pethub-api-wdna.onrender.com",
      Origin: "https://pethub-api-wdna.onrender.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(await closed.creds(closed.a)),
  });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).codigo, "COMMUNITY_DISABLED");
  const f = await server(t);
  await f.s.m.Link.update(
    { enabled: false },
    { where: { conta_id: f.a.tutor.contaId } },
  );
  r = await f.request("/api/comunidade/login", {
    method: "POST",
    headers: {
      Host: "pethub-api-wdna.onrender.com",
      Origin: "https://pethub-api-wdna.onrender.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(await f.creds(f.a)),
  });
  assert.equal(r.status, 403);
  assert.match((await r.json()).erro, /liberação/);
});
test("HTTP: falha de tabela ausente retorna orientação de migração sem vazar SQL", async (t) => {
  const f = await server(t);
  f.s.login = async () => {
    throw Object.assign(Error("SQL PRIVATE TEST"), {
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
  assert.doesNotMatch(data.erro, /SQL PRIVATE TEST/);
});
