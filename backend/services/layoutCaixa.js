"use strict";
const { DataTypes } = require("sequelize");
function modelo(db) {
  return (
    db.models.PreferenciaCaixa ||
    db.define(
      "PreferenciaCaixa",
      {
        empresa_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
        },
        layout: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "classico",
          validate: { isIn: [["classico", "rapido"]] },
        },
      },
      { tableName: "preferencias_caixa", timestamps: false },
    )
  );
}
function criarRouter({ db, autorizar }) {
  const router = require("express").Router(),
    Config = modelo(db);
  router.use(autorizar);
  router.use((req, res, next) => {
    if (
      !Number.isSafeInteger(Number(req.user?.empresaId)) ||
      Number(req.user.empresaId) <= 0
    )
      return res
        .status(403)
        .json({ erro: "Empresa autenticada não identificada." });
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/", async (req, res) => {
    try {
      if (Object.keys(req.query).length)
        return res
          .status(400)
          .json({ erro: "A empresa é determinada pela sessão." });
      const config = await Config.findByPk(Number(req.user.empresaId));
      res.json({ layout: config?.layout || "classico" });
    } catch (e) {
      console.error("[LayoutCaixa]", e.message);
      res
        .status(503)
        .json({ erro: "Execute a preparação do layout do caixa no servidor." });
    }
  });
  router.put("/", async (req, res) => {
    const b = req.body;
    if (
      !b ||
      Object.keys(b).length !== 1 ||
      !["classico", "rapido"].includes(b.layout)
    )
      return res
        .status(400)
        .json({ erro: "Envie somente layout: classico ou rapido." });
    // Rejeita escrita cross-origin; mantém sessões por cookie e Bearer do ERP.
    if (req.get("Sec-Fetch-Site") === "cross-site")
      return res.status(403).json({ erro: "Origem não autorizada." });
    try {
      await Config.upsert({
        empresa_id: Number(req.user.empresaId),
        layout: b.layout,
      });
      res.json({ layout: b.layout });
    } catch (e) {
      console.error("[LayoutCaixa]", e.message);
      res
        .status(503)
        .json({ erro: "Não foi possível salvar o visual do caixa." });
    }
  });
  return router;
}
module.exports = { modelo, criarRouter };
