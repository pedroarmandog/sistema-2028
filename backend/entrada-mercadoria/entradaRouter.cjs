// Adapter para carregar o router TypeScript sem rebuild: registra ts-node e importa o arquivo .ts
// Se preferir compilar TS para JS, remova este adaptador e importe o JS compilado.
try {
  // tentar registrar ts-node para permitir require de arquivos .ts
  try {
    require('ts-node').register({ transpileOnly: true, skipProject: true });
  } catch (e) {
    // tentar register do ts-node/register (alternativa)
    try { require('ts-node/register'); } catch (e2) { /* ignorar */ }
  }

  // importar router TS
  const entrada = require('./src/routes/entradaRouter.ts');
  // se o módulo exportar default
  const router = entrada && (entrada.default || entrada);
  module.exports = router;
} catch (err) {
  console.error('Erro ao carregar entradaRouter (adapter):', err && (err.stack || err.message || err));
  // exportar middleware vazio para não quebrar o app
  const express = require('express');
  module.exports = express.Router();
}
