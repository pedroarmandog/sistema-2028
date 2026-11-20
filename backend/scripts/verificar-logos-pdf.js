'use strict';
// Verificação local, sem conectar ao banco nem modificar arquivos.
for (const pacote of ['pdfkit', 'sharp']) {
  try { require(pacote); console.log(pacote + ': disponível'); }
  catch (_) { console.error(pacote + ': ausente. Instale como dependência de produção.'); process.exitCode = 1; }
}
