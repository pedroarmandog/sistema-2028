const express = require("express");
const router = express.Router();
const { encerrarDispositivo } = require("../controllers/acessosController");

/**
 * POST /api/sessoes/encerrar-dispositivo
 *
 * Chamado via navigator.sendBeacon() quando a última aba do dispositivo é fechada.
 * Não exige JWT porque sendBeacon não suporta credentials em requisições cross-origin.
 * A autenticação é implícita pelo device_id (UUID gerado no localStorage do cliente).
 *
 * Usa soft-close: ativo=false + encerrado_em=NOW().
 * O heartbeat pode reativar a sessão dentro de 30s (cobre navegação entre páginas).
 */
router.post("/encerrar-dispositivo", async (req, res) => {
  const { device_id } = req.body || {};

  if (
    !device_id ||
    typeof device_id !== "string" ||
    device_id.length < 8 ||
    device_id.length > 128
  ) {
    return res.status(400).json({ ok: false, erro: "device_id inválido" });
  }

  await encerrarDispositivo(device_id);
  return res.json({ ok: true });
});

module.exports = router;
