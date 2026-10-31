const express = require("express");
const router = express.Router();
const perfilComissaoController = require("../controllers/perfilComissaoController");
const { authUser } = require("../middleware/authUser");

router.use(authUser);

router.get("/", perfilComissaoController.getAll);
router.get("/:id", perfilComissaoController.getById);
router.post("/", perfilComissaoController.create);
router.put("/:id", perfilComissaoController.update);
router.delete("/:id", perfilComissaoController.delete);

module.exports = router;
