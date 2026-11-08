// Adaptador exclusivo do laboratório: expõe ao Sequelize 6 a interface
// callback de sqlite3 usando o SQLite integrado ao Node 22.13+/24.
const { DatabaseSync } = require("node:sqlite");
// O Sequelize passa booleanos JavaScript. O node:sqlite do Node 22 exige
// inteiros para esses parâmetros, tanto no INSERT quanto nas consultas.
function valorSQLite(valor) {
  return typeof valor === "boolean" ? Number(valor) : valor;
}

class Statement {}
class Database {
  constructor(filename, mode, done) {
    if (filename !== ":memory:") throw new Error("O laboratório só aceita SQLite em memória.");
    this.filename = filename;
    this.db = new DatabaseSync(filename);
    queueMicrotask(() => done(null));
  }
  serialize(work) { work(); }
  all(sql, params, done) { this.exec("all", sql, params, done); }
  run(sql, params, done) { this.exec("run", sql, params, done); }
  exec(method, sql, params, done) {
    if (typeof params === "function") { done = params; params = []; }
    const meta = new Statement();
    let result;
    try {
      const stmt = this.db.prepare(sql);
      const args = Array.isArray(params)
        ? params.map(valorSQLite)
        : [Object.fromEntries(Object.entries(params || {}).map(([chave, valor]) => [chave, valorSQLite(valor)]))];
      result = stmt[method](...args);
      if (method === "run") Object.assign(meta, { changes: result.changes, lastID: result.lastInsertRowid });
    } catch (err) {
      if (done) return done.call(meta, err);
      throw err;
    }
    done?.call(meta, null, method === "all" ? result : undefined);
  }
  close(done) { this.db.close(); done?.(); }
}
module.exports = { Database, OPEN_CREATE: 4, OPEN_READWRITE: 2 };
