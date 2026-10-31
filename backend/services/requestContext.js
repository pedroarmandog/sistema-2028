const { AsyncLocalStorage } = require("async_hooks");

// Exporta instância compartilhada para manter contexto por requisição
module.exports = new AsyncLocalStorage();
