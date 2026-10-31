#!/usr/bin/env node
/**
 * fix-duplicados-atendimento.js
 * -----------------------------
 * Remove ocorrências duplicadas de `<script src="...novo-atendimento-global.js">`
 * em todas as páginas HTML do frontend.
 *
 * Mantém apenas a ÚLTIMA ocorrência (normalmente no final do body, após os demais
 * scripts), eliminando as anteriores que causam:
 *   Uncaught SyntaxError: Identifier 'calendarioCompactoAtual' has already been declared
 *
 * Uso: node scripts/fix-duplicados-atendimento.js
 */
const fs = require("fs");
const path = require("path");

const FRONTEND_DIR = path.resolve(__dirname, "../frontend");

function findAllHtml(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // ignorar node_modules, .git, mobile (PWA usa outro sistema)
      if (e.name === "node_modules" || e.name === ".git" || e.name === "mobile") continue;
      findAllHtml(full, acc);
    } else if (e.name.endsWith(".html")) {
      acc.push(full);
    }
  }
  return acc;
}

const files = findAllHtml(FRONTEND_DIR);
let fixed = 0;
let skipped = 0;

for (const file of files) {
  try {
    let html = fs.readFileSync(file, "utf8");
    // Regex: qualquer <script ...novo-atendimento-global.js...></script>
    const scriptRe = /<script\b[^>]*src=["'][^"']*novo-atendimento-global\.js["'][^>]*>\s*<\/script>/gi;
    const matches = html.match(scriptRe) || [];
    if (matches.length <= 1) {
      skipped++;
      continue;
    }

    // Manter apenas a última ocorrência
    let lastIndex = -1;
    let lastMatch = null;
    let m;
    // reset regex
    scriptRe.lastIndex = 0;
    while ((m = scriptRe.exec(html)) !== null) {
      lastIndex = m.index;
      lastMatch = m[0];
    }

    // Remover todas as ocorrências exceto a última
    const newHtml = html.replace(scriptRe, (full, offset) => {
      if (offset === lastIndex) return full; // manter a última
      return ""; // remover duplicadas
    });

    if (newHtml !== html) {
      fs.writeFileSync(file, newHtml, "utf8");
      console.log(`  ✅ ${path.relative(FRONTEND_DIR, file)} — ${matches.length} ocorrências → 1`);
      fixed++;
    } else {
      skipped++;
    }
  } catch (e) {
    console.warn(`  ⚠️  ${path.relative(FRONTEND_DIR, file)} — erro: ${e.message}`);
  }
}

console.log(`\n📊 Resumo: ${fixed} arquivo(s) corrigido(s), ${skipped} sem duplicação.`);