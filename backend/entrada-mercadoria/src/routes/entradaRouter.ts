import express from 'express';
import multer from 'multer';
import * as controller from '../controllers/entradaController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// importar XML (upload file)
router.post('/import-xml', upload.single('file'), controller.importXml);

// listagem com filtros
router.get('/', controller.listNotas);
router.get('/:id', controller.getNota);
router.get('/:id/xml', controller.downloadXml);
router.get('/:id/espelho', controller.espelhoNota);

// ações
router.post('/:id/ignorar', controller.ignoreNota);
router.get('/:id/danfe', controller.danfe);

// itens e relacionamento
router.get('/:id/itens', controller.listItens);
router.post('/:id/itens/:itemId/link', controller.linkItem);
router.post('/:id/finalizar', controller.finalizar);

export default router;
