const router = require("express").Router();
const { authUser } = require("../middleware/authUser");
const { exigePermissao } = require("../middleware/exigePermissao");
const { Centro, preparar } = require("../services/importacao/modelos");
const { centrosDaEmpresa } = require("../services/importacao/servico");
const { normalizar } = require("../services/importacao/campos");
router.use(authUser, (req, res, next) => {
  if (
    !Number.isSafeInteger(Number(req.user?.empresaId)) ||
    Number(req.user.empresaId) < 1
  )
    return res.sendStatus(403);
  res.set("Cache-Control", "no-store");
  next();
});
router.get("/", async (req, res, next) => {
  try {
    res.json(await centrosDaEmpresa(req.user.empresaId));
  } catch (e) {
    next(e);
  }
});
router.post(
  "/",
  exigePermissao("item.novo", "item.novo.produto", "configuracoes.centro"),
  async (req, res, next) => {
    try {
      await preparar();
      const descricao = String(
          req.body.descricao || req.body.display || "",
        ).trim(),
        unidade = String(
          req.body.unidade || req.body.unidadeNegocio || "",
        ).trim();
      if (!descricao || descricao.length > 256 || unidade.length > 256)
        return res
          .status(400)
          .json({ error: "Descrição ou unidade inválida." });
      const slug = require("node:crypto")
        .createHash("sha256")
        .update(normalizar(descricao))
        .digest("hex")
        .slice(0, 32);
      const [row, created] = await Centro.findOrCreate({
        where: { empresa_id: req.user.empresaId, slug },
        defaults: { descricao, unidade },
      });
      res
        .status(created ? 201 : 409)
        .json(created ? row : { error: "Centro já existe." });
    } catch (e) {
      next(e);
    }
  },
);
router.put(
  "/:slug",
  exigePermissao("item.novo", "item.novo.produto", "configuracoes.centro"),
  async (req, res, next) => {
    try {
      const descricao = String(req.body.descricao || "").trim(),
        unidade = String(req.body.unidade || "").trim();
      if (!descricao || descricao.length > 256 || unidade.length > 256)
        return res
          .status(400)
          .json({ error: "Descrição ou unidade inválida." });
      const { sequelize } = require("../services/importacao/modelos");
      const alterado = await sequelize.transaction(async (transaction) => {
        const row = await Centro.findOne({
          where: { empresa_id: req.user.empresaId, slug: req.params.slug },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!row) return null;
        const antes = row.descricao;
        const slug = require("node:crypto")
          .createHash("sha256")
          .update(normalizar(descricao))
          .digest("hex")
          .slice(0, 32);
        await row.update({ descricao, unidade, slug }, { transaction });
        await require("../models/Produto").update(
          { centroResultado: descricao },
          {
            where: { empresa_id: req.user.empresaId, centroResultado: antes },
            transaction,
          },
        );
        return row;
      });
      if (!alterado)
        return res.status(404).json({ error: "Centro não encontrado." });
      res.json(alterado);
    } catch (e) {
      if (e.name === "SequelizeUniqueConstraintError")
        return res.status(409).json({ error: "Centro já existe." });
      next(e);
    }
  },
);
router.delete(
  "/:slug",
  exigePermissao("item.novo", "item.novo.produto", "configuracoes.centro"),
  async (req, res, next) => {
    try {
      const row = await Centro.findOne({
        where: { empresa_id: req.user.empresaId, slug: req.params.slug },
      });
      if (!row)
        return res.status(404).json({ error: "Centro não encontrado." });
      const Produto = require("../models/Produto");
      if (
        await Produto.count({
          where: {
            empresa_id: req.user.empresaId,
            centroResultado: row.descricao,
          },
        })
      )
        return res
          .status(409)
          .json({ error: "Centro em uso por produtos desta empresa." });
      await row.destroy();
      res.json({ success: true, removed: row });
    } catch (e) {
      next(e);
    }
  },
);
router.use((err, req, res, next) =>
  res
    .status(500)
    .json({ error: "Não foi possível acessar os centros desta empresa." }),
);
module.exports = router;
