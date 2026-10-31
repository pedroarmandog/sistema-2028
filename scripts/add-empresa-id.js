#!/usr/bin/env node
/**
 * scripts/add-empresa-id.js
 *
 * Cria a coluna `empresa_id` na tabela `usuarios` (se necessário)
 * e popula `empresa_id` a partir do campo JSON `empresas` quando possível.
 *
 * Uso:
 *  node scripts/add-empresa-id.js [--env production|test|development] [--dry-run] [--set "1:1,2:3"]
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

(async () => {
  try {
    const argv = process.argv.slice(2);
    const envArgIndex = argv.findIndex((a) => a === "--env");
    const env =
      (envArgIndex !== -1 && argv[envArgIndex + 1]) ||
      process.env.NODE_ENV ||
      "development";
    const dryRun = argv.includes("--dry-run");

    const setIndex = argv.findIndex((a) => a === "--set");
    const mappings = {};
    if (setIndex !== -1 && argv[setIndex + 1]) {
      argv[setIndex + 1].split(",").forEach((pair) => {
        const [uid, eid] = pair.split(":").map((s) => s.trim());
        if (uid && eid) mappings[Number(uid)] = Number(eid);
      });
    }

    const configPath = path.join(__dirname, "..", "config", "config.json");
    if (!fs.existsSync(configPath)) {
      throw new Error(`config.json não encontrado em ${configPath}`);
    }

    const cfgAll = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const cfg = cfgAll[env];
    if (!cfg)
      throw new Error(`Ambiente '${env}' não encontrado em config.json`);

    console.log(
      `[add-empresa-id] env=${env} db=${cfg.database} host=${cfg.host}`,
    );

    const conn = await mysql.createConnection({
      host: cfg.host,
      user: cfg.username,
      password: cfg.password,
      database: cfg.database,
      multipleStatements: true,
    });

    // Verificar se a coluna existe
    const [colRows] = await conn.execute(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'empresa_id'`,
      [cfg.database],
    );
    const exists = colRows && colRows[0] && Number(colRows[0].c) > 0;
    if (!exists) {
      const sql = "ALTER TABLE usuarios ADD COLUMN empresa_id INT NULL";
      console.log("[add-empresa-id] Executando:", sql);
      if (!dryRun) {
        await conn.execute(sql);
        console.log("[add-empresa-id] coluna `empresa_id` criada.");
      } else {
        console.log("[add-empresa-id] dry-run: não executou alteração.");
      }
    } else {
      console.log("[add-empresa-id] coluna `empresa_id` já existe.");
    }

    // Buscar usuários e popular empresa_id quando ausente
    const [users] = await conn.execute(
      "SELECT id, empresas, empresa_id FROM usuarios",
    );
    let updated = 0;
    for (const u of users) {
      // aplicar mapeamento manual se informado
      if (mappings[u.id]) {
        console.log(
          `[add-empresa-id] aplicando mapeamento manual usuario=${u.id} -> empresa_id=${mappings[u.id]}`,
        );
        if (!dryRun)
          await conn.execute(
            "UPDATE usuarios SET empresa_id = ? WHERE id = ?",
            [mappings[u.id], u.id],
          );
        updated++;
        continue;
      }

      if (u.empresa_id) continue; // já definido

      let empresas = u.empresas;
      if (typeof empresas === "string" && empresas.length > 0) {
        try {
          empresas = JSON.parse(empresas);
        } catch (e) {
          // não JSON — ignorar
        }
      }

      let empresaToSet = null;
      if (Array.isArray(empresas) && empresas.length > 0) {
        const first = empresas[0];
        if (typeof first === "number") empresaToSet = first;
        else if (typeof first === "string") {
          const n = parseInt(first, 10);
          if (!isNaN(n)) empresaToSet = n;
        } else if (first && typeof first === "object") {
          const raw = first.id || first.empresaId || first.ID;
          const n = parseInt(String(raw || ""), 10);
          if (!isNaN(n)) empresaToSet = n;
        }
      }

      if (empresaToSet) {
        console.log(
          `[add-empresa-id] usuario ${u.id} -> empresa_id ${empresaToSet}`,
        );
        if (!dryRun)
          await conn.execute(
            "UPDATE usuarios SET empresa_id = ? WHERE id = ?",
            [empresaToSet, u.id],
          );
        updated++;
      }
    }

    console.log(
      `[add-empresa-id] concluído. total usuarios: ${users.length}, atualizados: ${updated}`,
    );
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error(
      "[add-empresa-id] Erro:",
      err && err.message ? err.message : err,
    );
    process.exit(1);
  }
})();
