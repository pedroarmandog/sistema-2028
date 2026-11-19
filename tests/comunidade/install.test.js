"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  cp = require("node:child_process");
test("instalador preserva app existente, insere antes do CORS e é idempotente", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "community-install-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "backend/comunidade"), { recursive: true });
  const installer = path.join(dir, "backend/comunidade/install.js"),
    app = path.join(dir, "backend/app.js");
  fs.copyFileSync(
    path.join(__dirname, "../../backend/comunidade/install.js"),
    installer,
  );
  const original =
    'const app = {};\nconst models = require("./models");\napp.use(cors());\n// KEEP ERP ROUTES';
  fs.writeFileSync(app, original);
  cp.execFileSync(process.execPath, [installer]);
  const changed = fs.readFileSync(app, "utf8");
  assert.equal(fs.readFileSync(app + ".before-community", "utf8"), original);
  assert.ok(
    changed.indexOf("require('./comunidade').mount") <
      changed.indexOf("app.use(cors())"),
  );
  assert.ok(changed.includes("// KEEP ERP ROUTES"));
  cp.execFileSync(process.execPath, [installer]);
  assert.equal(fs.readFileSync(app, "utf8"), changed);
});
test("instalador não modifica app com ponto de integração desconhecido", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "community-refuse-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "backend/comunidade"), { recursive: true });
  const installer = path.join(dir, "backend/comunidade/install.js"),
    app = path.join(dir, "backend/app.js");
  fs.copyFileSync(
    path.join(__dirname, "../../backend/comunidade/install.js"),
    installer,
  );
  fs.writeFileSync(app, "// custom app");
  assert.throws(() =>
    cp.execFileSync(process.execPath, [installer], { stdio: "pipe" }),
  );
  assert.equal(fs.readFileSync(app, "utf8"), "// custom app");
});
test("PWA nunca intercepta API/escritas e manifest respeita base; HTML admin usa #app", async () => {
  const sw = fs.readFileSync(
    path.join(__dirname, "../../comunidade/public/sw.js"),
    "utf8",
  );
  const handlers = {};
  require("node:vm").runInNewContext(sw, {
    URL,
    self: {
      registration: { scope: "https://example.com/comunidade/" },
      addEventListener: (name, fn) => (handlers[name] = fn),
    },
    caches: {
      open: async () => ({
        match: async () => ({ cached: true }),
        put: async () => {},
      }),
    },
  });
  for (const [url, method] of [
    ["https://example.com/api/comunidade/session", "GET"],
    ["https://example.com/comunidade/api/private", "GET"],
    ["https://example.com/comunidade/assets/main.js", "POST"],
    ["https://another.example.com/comunidade/assets/a.js", "GET"],
  ]) {
    let intercepted = false;
    handlers.fetch({
      request: { url, method },
      respondWith() {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  let assetPromise;
  handlers.fetch({
    request: {
      url: "https://example.com/comunidade/assets/main.js",
      method: "GET",
    },
    respondWith(p) {
      assetPromise = p;
    },
  });
  assert.ok(assetPromise);
  assert.equal((await assetPromise).cached, true);
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../comunidade/public/manifest.webmanifest"),
      "utf8",
    ),
  );
  assert.equal(manifest.scope, "/comunidade/");
  assert.equal(manifest.display, "standalone");
  assert.match(
    fs.readFileSync(
      path.join(__dirname, "../../comunidade/admin.html"),
      "utf8",
    ),
    /id="app"/,
  );
});
