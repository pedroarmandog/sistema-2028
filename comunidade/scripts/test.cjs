const path = require("node:path"),
  fs = require("node:fs"),
  cp = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  directory = path.join(root, "tests/comunidade"),
  files = fs
    .readdirSync(directory)
    .filter((f) => f.endsWith(".test.js"))
    .sort()
    .map((f) => path.join(directory, f));
const env = {
  ...process.env,
  NODE_PATH: [path.join(__dirname, "../node_modules"), process.env.NODE_PATH]
    .filter(Boolean)
    .join(path.delimiter),
};
const result = cp.spawnSync(
  process.execPath,
  ["--test", "--test-force-exit", ...files],
  { cwd: root, env, stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
