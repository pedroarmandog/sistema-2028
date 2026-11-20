"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { mailer } = require("../../backend/comunidade/mail");
test("adaptador de e-mail envia para API configurada, usa fragmento e chave de idempotência", async () => {
  let request;
  const m = mailer(
    {
      NODE_ENV: "test",
      COMMUNITY_RESEND_API_KEY: "test-key",
      COMMUNITY_MAIL_FROM: "PetHub <noreply@example.com>",
      COMMUNITY_PUBLIC_URL: "https://social.example.com/comunidade/",
    },
    async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: "test-delivery" }) };
    },
  );
  assert.equal(m.configured(), true);
  assert.equal(
    (
      await m.send({
        to: "user@example.com",
        kind: "verify",
        token: "test-token",
        id: "delivery-1",
      })
    ).id,
    "test-delivery",
  );
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(
    request.options.headers["Idempotency-Key"],
    "community-delivery-1",
  );
  const body = JSON.parse(request.options.body);
  assert.equal(body.to[0], "user@example.com");
  assert.match(body.text, /#\/confirmar\?token=test-token/);
});
test("e-mail sem credenciais ou com falha do provedor nunca retorna sucesso fictício", async () => {
  await assert.rejects(
    mailer({}).send({}),
    (e) => e.code === "MAIL_NOT_CONFIGURED",
  );
  const m = mailer(
    {
      COMMUNITY_RESEND_API_KEY: "test",
      COMMUNITY_MAIL_FROM: "no@example.com",
      COMMUNITY_PUBLIC_URL: "https://social.example.com",
    },
    async () => ({ ok: false, json: async () => ({ error: "failure" }) }),
  );
  await assert.rejects(
    m.send({ to: "u@example.com", token: "token", id: "id", kind: "reset" }),
    (e) => e.code === "MAIL_UNAVAILABLE",
  );
});
