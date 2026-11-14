const express = require("express"),
  multer = require("multer"),
  path = require("node:path");
const { Worker } = require("node:worker_threads");
const { authUser } = require("../middleware/authUser");
const { exigePermissao } = require("../middleware/exigePermissao");
const { campos, sugerir } = require("../services/importacao/campos");
const banco = require("../services/importacao/modelos");
const service = require("../services/importacao/servico");
const ativos = new Set();
function criarRotas(tipo) {
  const router = express.Router();
  router.use(
    authUser,
    (req, res, next) => {
      if (
        !Number.isSafeInteger(Number(req.user?.empresaId)) ||
        Number(req.user.empresaId) < 1
      )
        return res.status(403).json({ erro: "Empresa não identificada." });
      res.set("Cache-Control", "no-store");
      next();
    },
    exigePermissao(
      ...(tipo === "clientes"
        ? ["cliente.novo"]
        : ["item.novo.produto", "item.novo"]),
    ),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 8,
      fieldSize: 16000,
    },
  });
  if(tipo==='clientes'){
    const operacoes=()=>require('../services/importacao/operacoes').instancia();
    const tratar=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e.operacaoId)return res.status(e.status||409).json({erro:e.message,operacaoId:e.operacaoId});next(e);}};
    router.post('/operacoes',tratar(async(req,res)=>{
      const p=operacoes();const op=await p.iniciar(req.user.empresaId,req.user.id,req.body.token,req.body.escolhas||{});
      res.status(202).json({operacao:op});
      if(require.main?.filename===path.resolve(__dirname,'../app.js'))p.iniciarMonitor();
    }));
    router.get('/operacoes/atual',tratar(async(req,res)=>res.json({operacao:await operacoes().atual(req.user.empresaId)})));
    router.get('/operacoes/:id',tratar(async(req,res)=>res.json({operacao:await operacoes().obter(req.user.empresaId,req.params.id)})));
    router.get('/operacoes/:id/relatorio',tratar(async(req,res)=>res.json(await operacoes().relatorioFinal(req.user.empresaId,req.params.id))));
    router.post('/operacoes/:id/retomar',tratar(async(req,res)=>res.json({operacao:await operacoes().retomar(req.user.empresaId,req.params.id)})));
  }
  router.get("/modelo", (req, res) => {
    const headers = Object.values(campos(tipo)).map((v) => v[0]);
    res
      .attachment(tipo + "-modelo.csv")
      .type("text/csv; charset=utf-8")
      .send(
        "\ufeff" +
          headers.map((v) => '"' + v.replace(/"/g, '""') + '"').join(";") +
          "\r\n",
      );
  });
  router.get("/campos", async (req, res, next) => {
    try {
      await banco.preparar();
      res.json({
        campos: campos(tipo),
        centros:
          tipo === "produtos"
            ? (await service.centrosDaEmpresa(req.user.empresaId)).map(
                (c) => c.descricao,
              )
            : [],
      });
    } catch (e) {
      next(e);
    }
  });
  router.post("/analisar", upload.single("arquivo"), async (req, res, next) => {
    const chave = String(req.user.empresaId);
    if (ativos.has(chave))
      return res
        .status(409)
        .json({ erro: "Há uma análise em andamento nesta empresa." });
    if (ativos.size >= 2)
      return res
        .status(429)
        .json({
          erro: "O servidor está analisando outros arquivos. Tente novamente em instantes.",
        });
    ativos.add(chave);
    try {
      if (!req.file) throw new Error("Selecione um arquivo CSV, XLS ou XLSX.");
      const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
      if (!["csv", "xls", "xlsx"].includes(ext)) throw new Error("Use CSV, XLS ou XLSX.");
      await banco.preparar();
      const arquivo = await new Promise((resolve, reject) => {
        const w = new Worker(
          path.resolve(__dirname, "../services/importacao/arquivo-worker.js"),
          {
            workerData: { bytes: req.file.buffer, ext, aba: req.body.aba },
            resourceLimits: { maxOldGenerationSizeMb: 96 },
          },
        );
        const timer = setTimeout(() => {
          w.terminate();
          reject(new Error("Arquivo excedeu o tempo de análise."));
        }, 15000);
        w.once("message", (m) => {
          clearTimeout(timer);
          w.terminate();
          m.erro ? reject(new Error(m.erro)) : resolve(m);
        });
        w.once("error", () => {
          clearTimeout(timer);
          reject(new Error("Arquivo inválido ou excede a memória disponível."));
        });
        w.once("exit", (code) => {
          clearTimeout(timer);
          if (code)
            reject(new Error("Análise interrompida. Reduza o arquivo."));
        });
      });
      let mapa = req.body.mapeamento
        ? JSON.parse(req.body.mapeamento)
        : arquivo.cabecalho.map((c) => sugerir(tipo, c));
      if (!Array.isArray(mapa) || mapa.length !== arquivo.cabecalho.length)
        throw new Error("Mapeamento inválido.");
      if (mapa.some((v) => !v))
        return res.json({
          ...arquivo,
          linhas: undefined,
          campos: campos(tipo),
          mapeamento: mapa,
          precisaMapear: true,
        });
      const previa = await service.analisar(
        tipo,
        arquivo,
        mapa,
        req.user.empresaId,
        req.body.centroPadrao,
        req.user.id,
        {referencia:req.body.referenciaHistorico,conciliacao:req.body.conciliacaoHistorico},
      );
      res.json({
        ...previa,
        cabecalho: arquivo.cabecalho,
        referenciaSugerida: arquivo.referenciaSugerida,
        abas: arquivo.abas,
        aba: arquivo.aba,
        mapeamento: mapa,
        campos: campos(tipo),
      });
    } catch (e) {
      e.status ||= 400;
      next(e);
    } finally {
      ativos.delete(chave);
    }
  });
  router.post("/confirmar", async (req, res, next) => {
    try {
      await banco.preparar();
      if (!/^[0-9a-f-]{36}$/.test(req.body.token || ""))
        throw Object.assign(new Error("Prévia inválida."), { status: 400 });
      const escolhas = req.body.escolhas || {};
      if (!escolhas || Array.isArray(escolhas) || typeof escolhas !== "object")
        throw Object.assign(new Error("Escolhas inválidas."), { status: 400 });
      res.json(
        await service.confirmar(
          tipo,
          req.user.empresaId,
          req.user.id,
          req.body.token,
          escolhas,
        ),
      );
    } catch (e) {
      next(e);
    }
  });
  router.use((err, req, res, next) => {
    const status = err instanceof multer.MulterError ? 400 : err.status || 500;
    res
      .status(status)
      .json({
        erro:
          err instanceof multer.MulterError
            ? "Arquivo excede 5 MB ou quantidade de campos permitida."
            : status < 500 || err.publica
              ? err.message
              : tipo === 'clientes'
                ? "Não foi possível atualizar a importação. Consulte o andamento antes de tentar novamente; os lotes confirmados permanecem salvos."
                : "Não foi possível concluir a importação. Nenhum registro desta confirmação foi gravado. Tente novamente.",
      });
  });
  return router;
}
module.exports = { criarRotas };
