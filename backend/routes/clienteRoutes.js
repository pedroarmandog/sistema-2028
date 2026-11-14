const express = require("express");
const router = express.Router();
router.use("/importacao", require("./importacaoRoutes").criarRotas("clientes"));
const clienteController = require("../controllers/clienteController");
const multer = require("multer");
const { authUser } = require("../middleware/authUser");

const upload = require("../services/midias/upload").upload("clientes");

router.use(authUser);
router.use((req,res,next) => {
  if (!Number.isSafeInteger(Number(req.user?.empresaId)) || Number(req.user.empresaId) <= 0)
    return res.status(403).json({success:false,error:"Empresa não identificada."});
  res.set("Cache-Control","private, no-store");
  next();
});

const inteligencia = require('../controllers/clienteInteligenciaController');
const { exigePermissao } = require('../middleware/exigePermissao');
router.get('/auditoria-importacao',exigePermissao('cliente.novo'),async(req,res)=>{try{res.json(await require('../services/listagemClientes').auditoria(require('../models').sequelize,req.user.empresaId));}catch(e){res.status(500).json({erro:'Não foi possível consultar a auditoria.'});}});
router.get('/busca-venda', require('../services/buscaClientesVenda').endpoint);
router.get('/:id/inteligencia', inteligencia.obter);
router.get('/:id/analise-vendas', inteligencia.analise);
router.put('/:id/inteligencia', exigePermissao('cliente.editar','cliente.novo'), inteligencia.salvar);

// Rotas para clientes (protegidas por empresa)
router.post(
  "/",
  authUser,
  upload.single("imagem_perfil"),
  clienteController.createCliente,
);
router.get("/", authUser, clienteController.getAllClientes);
router.get("/:id", authUser, clienteController.getClienteById);
router.put(
  "/:id",
  authUser,
  require("../services/midias/upload").exigirRegistro("Cliente"),
  upload.single("imagem_perfil"),
  clienteController.updateCliente,
);
router.delete("/:id", authUser, clienteController.deleteCliente);

module.exports = router;
