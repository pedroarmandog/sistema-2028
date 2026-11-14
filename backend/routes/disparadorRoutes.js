const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const upload = require("../services/midias/upload").upload("disparador", { transitorios: ['arquivo'] });

const controller = require("../controllers/disparadorController");

router.post(
  "/campanhas",
  upload.fields([{ name: "arquivo" }, { name: "imagem" }]),
  controller.criarCampanha,
);
router.post("/start/:id", controller.iniciarCampanha);
router.post("/pause/:id", controller.pausarCampanha);
router.post("/continue/:id", controller.continuarCampanha);
router.get("/eventos/:id", controller.eventoSSE);
router.get("/logs/:id", controller.obterLogs);
router.get("/contacts/:id", controller.obterContatos);
router.get("/config", controller.carregarConfig);
router.post("/config", controller.salvarConfig);

module.exports = router;
