#!/usr/bin/env node
const path = require("path");
const {
  captureWhatsAppQRCode,
  findChromePath,
} = require("../services/puppeteerLauncher");

(async () => {
  try {
    console.log("Detectando Chrome/Chromium...");
    const chrome = findChromePath();
    console.log("Chrome encontrado em:", chrome || "NÃO ENCONTRADO");

    const out = path.join("/tmp", "whatsapp-qr.png");
    console.log(
      "Capturando QR do WhatsApp Web (pode demorar até 2 minutos)...",
    );
    await captureWhatsAppQRCode({ saveTo: out, timeout: 120000 });
    console.log("QR salvo em:", out);
    process.exit(0);
  } catch (err) {
    console.error(
      "Erro ao capturar QR:",
      err && err.message ? err.message : err,
    );
    process.exit(1);
  }
})();
