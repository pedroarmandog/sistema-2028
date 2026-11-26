/* @ts-nocheck */
// @ts-nocheck
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { authUser } = require("./middleware/authUser");
const app = express();
// AsyncLocalStorage request context (used by DB logger)
const requestContext = require("./services/requestContext");

const path = require("path");

// Carregar modelos e associações ANTES de qualquer outra coisa
const models = require("./models");
console.log("✅ Modelos e associações carregados");

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requisições sem origin (ex: same-origin, curl, mobile, Postman)
      if (!origin) return callback(null, true);
      const allowed = [
        "https://pethubflow.com.br",
        "https://www.pethubflow.com.br",
        "https://api.pethubflow.com.br",
        "https://pethubflow.pages.dev",
        "https://www.pethubflow.pages.dev",
        "http://72.60.244.46:3000",
        "https://72.60.244.46:3000",
        "https://pethub-api-wdna.onrender.com",
      ];
      if (
        allowed.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("ngrok") ||
        origin.includes("ngrok-free.app")
      ) {
        return callback(null, true);
      }
      // Bloquear origens desconhecidas em produção
      return callback(
        new Error("CORS: origin não permitida: " + origin),
        false,
      );
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "X-PetHub-IA",
      "X-PetHub-Onboarding",
      "X-Onboarding-Context",
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cache-Control",
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);
// O app.use(cors(...)) acima já responde automaticamente aos preflights OPTIONS.

/* PETHUB_IA_INTEGRACAO */
const pethubIA=require('./services/pethubIA').instancia();
// Corpo bruto exclusivamente neste webhook; assinatura verificada antes de interpretar JSON.
app.use('/api/pethub-ia/webhook',require('./routes/pethubIARoutes').criarWebhook(pethubIA));
app.use(bodyParser.json({ limit: "12mb" })); // aumentar limite para aceitar logos grandes
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use('/api/pethub-ia',require('./routes/pethubIARoutes').criarRotas(pethubIA,{authUser,authAdmin:require('./middleware/authAdmin').authAdmin}));
app.get('/configuracoes/pethub-ia.html',authUser,async(req,res)=>{try{await pethubIA.permitidoGestor(req);await pethubIA.assinaturas.estado(req.user.empresaId);res.sendFile(require('node:path').resolve(__dirname,'../frontend/configuracoes/pethub-ia.html'));}catch(e){res.status(e.status||503).type('text/plain').send(e.status===403?'PetHub IA não está liberado para esta empresa.':'PetHub IA indisponível.');}});
// Só o worker da IA é iniciado; não inicia ou substitui sessões WhatsApp.
pethubIA.iniciar();
process.once('SIGTERM',()=>pethubIA.parar());

// Progresso isolado por usuário/empresa; observação não modifica operações do ERP.
const onboardingRuntime=require('./services/onboardingOpcional').instalar(app,{authUser,raiz:__dirname});

app.use("/uploads", require("./routes/midiasRoutes").leitor()); // objetos persistentes; privados exigem autenticação
app.use("/logos", express.static(path.join(__dirname, "../logos"))); // logos SVG do sistema
app.use(
  "/base-conhecimento",
  express.static(path.join(__dirname, "../frontend/base-conhecimento")),
); // Base de Conhecimento

// Global API rate limiter (proteger contra flood de requisições do frontend)
try {
  const rateLimit = require("./middleware/rateLimit");
  app.use(
    "/api/",
    rateLimit({ windowMs: 60 * 1000, max: 300 }), // 300 requests per minute per IP/user
  );
  console.log("✅ Rate limiter global aplicado em /api/ (300req/min)");
} catch (e) {
  console.warn(
    "⚠️ Não foi possível aplicar rate limiter global:",
    e && e.message,
  );
}

// Rota para favicon.ico (browsers buscam este path automaticamente)
app.get("/favicon.ico", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/fivecon/Design sem nome (17).png"),
  );
});

// Middleware para injetar system-modal.js em todas as páginas HTML
// (garante que o override de alert/confirm/prompt carregue antes de qualquer JS)
// ⚠️ NÃO injetar scripts que possam quebrar o Mobile PWA (fetch-ratelimiter).
const fs = require("fs");
app.use((req, res, next) => {
  if (!req.path.endsWith(".html") || req.path.startsWith("/cliente-app/")) return next();
  const filePath = path.join(__dirname, "../frontend", req.path);
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return next(); // arquivo não encontrado, deixa express.static ou 404 tratar

    // Para o Mobile PWA, injetar APENAS system-modal (não fetch-ratelimiter)
    // que interfere com o MobileApi e causa redirect loops.
    const isMobile = req.path.startsWith("/mobile/");
    const tagsToInject = [];
    if ((req.path==='/painel-admin/admin-dashboard.html'||(!/^\/(cliente-app|mobile|comunidade|painel-admin|login)\//.test(req.path)))&&!html.includes('/components/pethub-ia/loader.js')) tagsToInject.push('<script defer src="/components/pethub-ia/loader.js?v=1"></script>');
    const guia=onboardingRuntime.guia;
    if(guia&&guia.permitida(req.path)&&!html.includes('/components/onboarding/loader.js'))tagsToInject.push(guia.tag);

    if (!req.path.includes('/login/') && !req.path.includes('/painel-admin/') && !req.path.includes('/base-conhecimento/')) tagsToInject.push('<script defer src="/components/cliente-portal-widget.js"></script>');
    // Paleta disponível desde o head nas telas autenticadas do ERP.
    if (!isMobile && !req.path.includes('/login/') && !req.path.includes('/painel-admin/') && !html.includes('tema-bootstrap.js')) {
      tagsToInject.push('<script src="/tema-bootstrap.js"></script>');
    }
    if (!html.includes("system-modal.js")) {
      tagsToInject.push(
        '<script src="/components/system-modal.js" data-system-modal="1"></script>',
      );
    }
    // fetch-ratelimiter NÃO é injetado no Mobile PWA para não conflitar com o MobileApi
    if (!isMobile && !html.includes("fetch-ratelimiter.js")) {
      tagsToInject.push(
        '<script src="/components/fetch-ratelimiter.js" data-fetch-ratelimiter="1"></script>',
      );
    }
    if (tagsToInject.length > 0) {
      html = html.replace(
        /<head([^>]*)>/i,
        `<head$1>\n${tagsToInject.join("\n")}`,
      );
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(html);
  });
});

// Configurar middleware para desabilitar cache de arquivos estáticos
app.use(
  express.static(path.join(__dirname, "../frontend"), {
    setHeaders: (res, path) => {
      if (
        path.endsWith(".js") ||
        path.endsWith(".html") ||
        path.endsWith(".css")
      ) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }),
); // servir arquivos estáticos do frontend

// Middleware de logging para debug de requisições (sempre ativo)
app.use((req, res, next) => {
  console.log(
    `[REQ] ${req.method} ${req.url} — origin: ${req.headers.origin || "sem-origin"}`,
  );
  next();
});

// Middleware: criar contexto por requisição para instrumentação de queries
app.use((req, res, next) => {
  try {
    const id = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    requestContext.run(
      { requestId: id, path: req.originalUrl, method: req.method },
      () => next(),
    );
  } catch (e) {
    next();
  }
});

// Rotas
const clienteRoutes = require("./routes/clienteRoutes");
const petRoutes = require("./routes/petRoutes");
const agendamentoRoutes = require("./routes/agendamentoRoutes");
const servicoRoutes = require("./routes/servicoRoutes");
const relatoriosRoutes = require("./routes/relatoriosRoutes");
const disparadorRoutes = require("./routes/disparadorRoutes");
const instanciaRoutes = require("./routes/instanciaRoutes");
const itemRoutes = require("./routes/itemRoutes");
const vacinaRoutes = require("./routes/vacinaRoutes");
const centroRoutes = require("./routes/centroRoutes");
const marcasRoutes = require("./routes/marcasRoutes");
const tipoEntradasRoutes = require("./routes/tipoEntradasRoutes");
const vendaRoutes = require("./routes/vendaRoutes");
const orcamentoRoutes = require("./routes/orcamentoRoutes");
const caixaRoutes = require("./routes/caixaRoutes");
const movimentoCaixaRoutes = require("./routes/movimentoCaixaRoutes");
const posicaoCaixaRoutes = require("./routes/posicaoCaixaRoutes");
const profissionalRoutes = require("./routes/profissionalRoutes");
const empresaRoutes = require("./routes/empresaRoutes");
const perfilProdutoRoutes = require("./routes/perfilProdutoRoutes");
const perfilClienteRoutes = require("./routes/perfilClienteRoutes");
const descontoRelacaoRoutes = require("./routes/descontoRelacaoRoutes");
const agrupamentoRoutes = require("./routes/agrupamentoRoutes");
const perfilComissaoRoutes = require("./routes/perfilComissaoRoutes");
const comissaoRoutes = require("./routes/comissaoRoutes");
const porteRoutes = require("./routes/porteRoutes");
const pelagemRoutes = require("./routes/pelagemRoutes");
const racaRoutes = require("./routes/racaRoutes");
const boxRoutes = require("./routes/boxRoutes");
const grupoClienteRoutes = require("./routes/grupoClienteRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const userFilterRoutes = require("./routes/userFilterRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const dashboardFullRoutes = require("./routes/dashboardFullRoutes");
const unidadeRoutes = require("./routes/unidadeRoutes");
const fornecedorRoutes = require("./routes/fornecedorRoutes");
const categoriaFinanceiraRoutes = require("./routes/categoriaFinanceiraRoutes");
const periodicidadeRoutes = require("./routes/periodicidadeRoutes");
const contaReceberRoutes = require("./routes/contaReceberRoutes");
// PWA Mobile — Push Notifications
const pushNotificationRoutes = require("./routes/pushNotificationRoutes");
// Disparador de Mensagens (Marketing)
// ISOLAMENTO MULTI-TENANT: módulo agora exige usuário autenticado
// (antes estava público, permitindo acesso a campanhas/contatos de qualquer empresa).
app.use("/api/disparador", authUser, disparadorRoutes);
// Instâncias de WhatsApp por empresa
app.use("/api/instancias", authUser, instanciaRoutes);
// Movimentações manuais: uma transação para documento, saldo e histórico.
app.use("/api", authUser, require("./routes/movimentacoesEstoqueRoutes").criarRotas(require("./models")));
// Integrar módulo Entrada de Mercadoria (Prisma + TypeScript)
// entrada-mercadoria (compiled router)
try {
  const entradaRouter = require("./entrada-mercadoria/dist/routes/entradaRouter");
  app.use("/api/entrada", authUser, entradaRouter);
  console.log("Mounted entrada-mercadoria from dist");
} catch (err) {
  console.warn(
    "entrada-mercadoria router not found in dist. To enable, run prisma generate/migrate and ensure dist exists.",
  );
  // Fallback de desenvolvimento: expor endpoints mínimos para permitir o frontend funcionar
  console.log("⚠️ Montando stubs de /api/entrada (desenvolvimento)");
  // lista simples de entradas (memória) — não persistente
  const __DEV_ENTRADAS = [];

  app.get("/api/entrada/manual", (req, res) => {
    // retornar todas as entradas em memória
    return res.json(__DEV_ENTRADAS);
  });

  app.post("/api/entrada/manual", (req, res) => {
    try {
      const payload = req.body || {};
      // mapear campos conhecidos do frontend para os campos do modelo
      const mapped = Object.assign({}, payload);
      mapped.categoriaFinanceira =
        mapped.categoriaFinanceira || mapped.tipoEntrada || mapped.tipo || null;
      mapped.observacao = mapped.observacao || mapped.observacoes || null;
      mapped.situacao = mapped.situacao || mapped.status || "pendente";
      mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;
      // mapear valor para campo do modelo
      mapped.valorTotal =
        mapped.valorTotal || mapped.valor || mapped.total || 0;
      const id = mapped.id || "sim-" + Date.now();
      const created = Object.assign({}, mapped, {
        id,
        createdAt: new Date(),
      });
      __DEV_ENTRADAS.unshift(created);
      console.log(
        "[api/entrada/manual][stub] POST payload:",
        payload,
        "=> saved:",
        created,
      );
      return res.json(created);
    } catch (e) {
      console.error("Stub POST /api/entrada/manual error", e);
      return res.status(500).json({ error: "Erro interno stub" });
    }
  });

  app.put("/api/entrada/manual/:id", (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body || {};
      // mapear campos conhecidos
      const mapped = Object.assign({}, body);
      mapped.categoriaFinanceira =
        mapped.categoriaFinanceira || mapped.tipoEntrada || mapped.tipo || null;
      mapped.observacao = mapped.observacao || mapped.observacoes || null;
      mapped.situacao = mapped.situacao || mapped.status || "pendente";
      mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;
      mapped.valorTotal =
        mapped.valorTotal || mapped.valor || mapped.total || 0;

      const idx = __DEV_ENTRADAS.findIndex((x) => String(x.id) === String(id));
      if (idx === -1) {
        const created = Object.assign({}, mapped, {
          id,
          updatedAt: new Date(),
        });
        __DEV_ENTRADAS.unshift(created);
        console.log(
          "[api/entrada/manual][stub] PUT create payload:",
          body,
          "=> saved:",
          created,
        );
        return res.json(created);
      }
      __DEV_ENTRADAS[idx] = Object.assign({}, __DEV_ENTRADAS[idx], mapped, {
        id,
        updatedAt: new Date(),
      });
      console.log(
        "[api/entrada/manual][stub] PUT update id=",
        id,
        "payload:",
        body,
        "=> saved:",
        __DEV_ENTRADAS[idx],
      );
      return res.json(__DEV_ENTRADAS[idx]);
    } catch (e) {
      console.error("Stub PUT /api/entrada/manual/:id error", e);
      return res.status(500).json({ error: "Erro interno stub" });
    }
  });
}

// Rota de teste para verificar se o servidor está funcionando
app.get("/api/test", (req, res) => {
  res.json({
    message: "Servidor funcionando!",
    timestamp: new Date().toISOString(),
  });
});

const petTagsRoutes = require("./routes/petTagsRoutes");
// Rotas do módulo de Marketing/WhatsApp
const marketingRoutes = require("./routes/marketingRoutes");
app.use("/api/marketing", authUser, marketingRoutes);

const clientePortal=require('./services/clientePortal').instancia();
const portalRotas=require('./routes/clientePortalRoutes').criarRotas(clientePortal,{authERP:authUser,permissao:require('./middleware/exigePermissao').exigePermissao});
app.use('/api/cliente-app',portalRotas.tutor);
app.use('/api/cliente-portal',portalRotas.gestor);
clientePortal.hooks();
app.use("/api/clientes", clienteRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/pet-tags", petTagsRoutes);
app.use("/api/agendamentos", agendamentoRoutes);
app.use("/api/servicos", servicoRoutes);
app.use("/api/relatorios", relatoriosRoutes);
app.use("/api/itens", itemRoutes);
app.use("/api/vacinas", vacinaRoutes);
app.use("/api/periodicidades", periodicidadeRoutes);
app.use("/api/centros", centroRoutes);
app.use("/api/marcas", marcasRoutes);
app.use("/api/tipo-entradas", tipoEntradasRoutes);

// Inicializar arquivo de tipos com valores padrão se não existir (não sobrescreve existente)
(function ensureTipoEntradasData() {
  try {
    const fs = require("fs");
    const path = require("path");
    const dataFile = path.join(__dirname, "data", "tipo_entradas.json");
    if (!fs.existsSync(dataFile)) {
      const defaults = [
        { id: Date.now(), descricao: "SEM CUSTO", ativo: true },
        { id: Date.now() + 1, descricao: "BRINDE", ativo: true },
        { id: Date.now() + 2, descricao: "ROMANEIO", ativo: true },
        {
          id: Date.now() + 3,
          descricao: "ENTRADA DE TRANSFERENCIA",
          ativo: true,
        },
        { id: Date.now() + 4, descricao: "ACERTO DE ESTOQUE", ativo: true },
        { id: Date.now() + 5, descricao: "GRANEL - ENTRADA", ativo: true },
      ];
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(defaults, null, 2), "utf8");
      console.log("[tipoEntradas] arquivo inicial criado com valores padrão");
    }
  } catch (e) {
    console.warn(
      "Falha ao garantir arquivo tipo_entradas.json",
      e && e.message,
    );
  }
})();
app.use("/api/vendas", vendaRoutes);
app.use("/api/orcamentos", orcamentoRoutes);
app.use("/api/caixas", caixaRoutes);
app.use("/api/movimentos-caixa", movimentoCaixaRoutes);
app.use("/api/posicao-caixa", posicaoCaixaRoutes);
app.use("/api/profissionais", profissionalRoutes);
app.use("/api/empresas", empresaRoutes);
app.use("/api/perfis-produto", perfilProdutoRoutes);
app.use("/api/perfis-cliente", perfilClienteRoutes);
app.use("/api/descontos-relacoes", descontoRelacaoRoutes);
app.use("/api/agrupamentos", agrupamentoRoutes);
app.use("/api/perfis-comissao", perfilComissaoRoutes);
app.use("/api/comissoes", comissaoRoutes);
app.use("/api/portes", porteRoutes);
app.use("/api/pelagens", pelagemRoutes);
app.use("/api/racas", racaRoutes);
app.use("/api/boxes", boxRoutes);
app.use("/api/grupos-clientes", grupoClienteRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/user-filters", userFilterRoutes);
const sessaoRoutes = require("./routes/sessaoRoutes");
app.use("/api/sessoes", sessaoRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/dashboard/full", dashboardFullRoutes);
// PWA Mobile — Push Notifications
app.use("/api/push", pushNotificationRoutes);

// Reutiliza a rota de CEP existente, com timeout e erros controlados.
app.get("/api/cep/:cep",require("./services/consultaCep").endpoint());
app.use("/api/unidades", unidadeRoutes);
app.use("/api/fornecedores", fornecedorRoutes);
app.use("/api/categorias-financeiras", categoriaFinanceiraRoutes);
app.use("/api/contas-receber", contaReceberRoutes);

// Haver e Crediário
const haverRoutes = require("./routes/haverRoutes");
const crediarioRoutes = require("./routes/crediarioRoutes");
app.use("/api/haver", haverRoutes);
app.use("/api/crediario", crediarioRoutes);

// ── Módulo Fiscal (preparação 2026-08-01) ─────────────────────────────────
// Configuração fiscal por empresa e Central Fiscal (registro de NFs).
// Nenhuma emissão real — apenas estrutura preparatória.
const configuracaoFiscalRoutes = require("./routes/configuracaoFiscalRoutes");
const notaFiscalRoutes = require("./routes/notaFiscalRoutes");
app.use("/api/fiscal", configuracaoFiscalRoutes);
app.use("/api/notas-fiscais", notaFiscalRoutes);
// ─────────────────────────────────────────────────────────────────────────

// Painel Financeiro – dados reais do banco
const painelFinanceiroRoutes = require("./routes/painelFinanceiroRoutes");
app.use("/api/painel-financeiro", painelFinanceiroRoutes);

// Painel Admin – controle de empresas, login admin, faturamento
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Lembrete Automático de Produto Recorrente
const produtoLembreteRoutes = require("./routes/produtoLembreteRoutes");
app.use("/api/produto-lembrete", authUser, produtoLembreteRoutes);
// Erros de upload chegam antes do controlador. Não devolver HTML/stack ao usuário.
app.use((err,req,res,next)=>{
  if(!err.publica && err.name!=="MulterError")return next(err);
  console.warn("[Midias] requisição recusada; código="+(err.code||err.status||"UPLOAD"));
  res.status(err.name==="MulterError"?413:err.status||503).json({erro:err.name==="MulterError"?"Arquivo excede o limite ou campo de upload inválido.":err.message,error:err.name==="MulterError"?"Arquivo excede o limite ou campo de upload inválido.":err.message});
});

// Endpoint compatível com frontend: buscar produtos com preço alterado
app.get("/api/editar-produto", async (req, res) => {
  try {
    const Produto = require("./models/Produto");
    const { Op } = require("sequelize");
    const { start, end } = req.query; // expected YYYY-MM-DD

    const where = {};
    if (start && end) {
      // include full end day
      const startDate = new Date(start);
      const endDate = new Date(end + "T23:59:59");
      where.ultimoPrecoAlterado = { [Op.between]: [startDate, endDate] };
    } else if (start) {
      where.ultimoPrecoAlterado = { [Op.gte]: new Date(start) };
    } else if (end) {
      where.ultimoPrecoAlterado = { [Op.lte]: new Date(end + "T23:59:59") };
    } else {
      // sem filtros, retornar vazio para evitar listagem completa
      return res.json([]);
    }

    const produtos = await Produto.findAll({
      where,
      order: [["ultimoPrecoAlterado", "DESC"]],
      limit: 1000,
    });

    // map to lightweight response
    const out = produtos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      estoque: p.estoqueAtual,
      ultimoPrecoAlterado: p.ultimoPrecoAlterado,
    }));
    res.json(out);
  } catch (err) {
    console.error("Erro /api/editar-produto", err);
    res
      .status(500)
      .json({ error: "Erro interno buscando produtos com preços alterados" });
  }
});

const { Cliente, Pet, Agendamento } = require("./models");

// ═══════════════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DO BANCO — cria TODAS as tabelas automaticamente
// ═══════════════════════════════════════════════════════════════════
// Usar a instância exportada por `./models` (garante que todos os modelos
// já foram inicializados antes do sync)
const { sequelize } = require("./models");

async function syncAllTables() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão com MySQL OK — banco: petshop");

    // 0) Migrations: adicionar colunas novas em tabelas já existentes
    try {
      const addLembreteColunas = require("./scripts/add-lembrete-colunas-cliente");
      await addLembreteColunas();
    } catch (e) {
      console.warn("  ⚠️ Migration lembrete colunas:", e.message);
    }

    // 0b) Migration: device_id em sessoes_ativas (identificador por dispositivo)
    try {
      const [cols] = await sequelize.query(
        "SHOW COLUMNS FROM sessoes_ativas LIKE 'device_id'",
      );
      if (cols.length === 0) {
        await sequelize.query(
          "ALTER TABLE sessoes_ativas ADD COLUMN device_id VARCHAR(64) NULL DEFAULT NULL AFTER token_hash",
        );
        await sequelize.query(
          "ALTER TABLE sessoes_ativas ADD INDEX idx_device_id (device_id)",
        );
        console.log("  ✅ Migration: device_id adicionado em sessoes_ativas");
      } else {
        console.log("  ℹ️ device_id já existe em sessoes_ativas — ok");
      }
    } catch (e) {
      console.warn("  ⚠️ Migration device_id:", e.message);
    }

    // 0c) Migration: encerrado_em em sessoes_ativas (soft-close para controle de abas)
    try {
      const [cols3] = await sequelize.query(
        "SHOW COLUMNS FROM sessoes_ativas LIKE 'encerrado_em'",
      );
      if (cols3.length === 0) {
        await sequelize.query(
          "ALTER TABLE sessoes_ativas ADD COLUMN encerrado_em DATETIME NULL DEFAULT NULL AFTER ativo",
        );
        console.log(
          "  ✅ Migration: encerrado_em adicionado em sessoes_ativas",
        );
      } else {
        console.log("  ℹ️ encerrado_em já existe em sessoes_ativas — ok");
      }
    } catch (e) {
      console.warn("  ⚠️ Migration encerrado_em:", e.message);
    }

    // 0d) Migration: numeroOrdem em whatsapp_sessions (numeração por empresa)
    try {
      const [colsOrd] = await sequelize.query(
        "SHOW COLUMNS FROM whatsapp_sessions LIKE 'numeroOrdem'",
      );
      if (colsOrd.length === 0) {
        await sequelize.query(
          "ALTER TABLE whatsapp_sessions ADD COLUMN numeroOrdem INT NOT NULL DEFAULT 1 AFTER nome",
        );
        console.log(
          "  ✅ Migration: numeroOrdem adicionado em whatsapp_sessions",
        );
        // Recalcular números existentes por empresa
        await sequelize.query(`
          UPDATE whatsapp_sessions t
          JOIN (
            SELECT id, empresaId,
              ROW_NUMBER() OVER (PARTITION BY empresaId ORDER BY createdAt ASC) AS num
            FROM whatsapp_sessions
          ) sub ON t.id = sub.id
          SET t.numeroOrdem = sub.num
          WHERE t.createdAt IS NOT NULL
        `);
        console.log(
          "  ✅ Migration: numeroOrdem recalculado para registros existentes",
        );
      } else {
        console.log("  ℹ️ numeroOrdem já existe em whatsapp_sessions — ok");
      }
    } catch (e) {
      console.warn("  ⚠️ Migration numeroOrdem:", e.message);
    }

    // 1) Sync principal: cobre Cliente + todos os factory models (Usuario, Empresa, etc.)
    await sequelize.sync();
    console.log("✅ Tabelas da instância principal criadas");

    // Migration inline: adicionar saldo_haver e saldo_crediario à tabela Clientes
    try {
      const [colsHaver] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'saldo_haver'",
      );
      if (colsHaver.length === 0) {
        await sequelize.query(
          "ALTER TABLE Clientes ADD COLUMN saldo_haver DECIMAL(12,2) NOT NULL DEFAULT 0.00",
        );
        console.log("  ✅ Migration: saldo_haver adicionado em Clientes");
      }
    } catch (e) {
      console.warn("  ⚠️ Migration saldo_haver:", e.message);
    }
    try {
      const [colsCrediario] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'saldo_crediario'",
      );
      if (colsCrediario.length === 0) {
        await sequelize.query(
          "ALTER TABLE Clientes ADD COLUMN saldo_crediario DECIMAL(12,2) NOT NULL DEFAULT 0.00",
        );
        console.log("  ✅ Migration: saldo_crediario adicionado em Clientes");
      }
    } catch (e) {
      console.warn("  ⚠️ Migration saldo_crediario:", e.message);
    }

    // 2) Modelos com instância própria de Sequelize (cada um tem seu new Sequelize)
    //    Precisam de .sync() individual
    const ownInstanceModels = [
      ["Agendamento", require("./models/Agendamento").Agendamento],
      ["Box", require("./models/Box")],
      ["Caixa", require("./models/Caixa").Caixa],
      ["DescontoRelacao", require("./models/DescontoRelacao").DescontoRelacao],
      ["HistoricoEstoque", require("./models/HistoricoEstoque")],
      ["ImpressoraConfig", require("./models/ImpressoraConfig")],
      ["ModeloEtiquetaConfig", require("./models/ModeloEtiquetaConfig")],
      ["MovimentoCaixa", require("./models/MovimentoCaixa").MovimentoCaixa],
      ["Orcamento", require("./models/Orcamento").Orcamento],
      ["PagamentoCaixa", require("./models/PagamentoCaixa").PagamentoCaixa],
      ["Pelagem", require("./models/Pelagem")],
      ["PerfilCliente", require("./models/PerfilCliente")],
      ["PerfilProduto", require("./models/PerfilProduto")],
      ["Porte", require("./models/Porte")],
      ["Produto", require("./models/Produto")],
      ["Profissional", require("./models/Profissional").Profissional],
      ["Raca", require("./models/Raca")],
      ["Venda", require("./models/Venda").Venda],
    ];

    for (const [name, model] of ownInstanceModels) {
      try {
        if (model && typeof model.sync === "function") {
          await model.sync();
          console.log(`  ✅ ${name}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ ${name}: ${err.message}`);
      }
    }

    // 3) ContaReceber — mesmo sequelize que Cliente, garantir criação
    try {
      const ContaReceber = require("./models/ContaReceber");
      await ContaReceber.sync();
      console.log("  ✅ ContaReceber");
    } catch (e) {
      console.warn("  ⚠️ ContaReceber:", e.message);
    }

    // MovimentoHaver e MovimentoCrediario — mesmo sequelize que Cliente
    try {
      const MovimentoHaver = require("./models/MovimentoHaver");
      await MovimentoHaver.sync();
      console.log("  ✅ MovimentoHaver");
    } catch (e) {
      console.warn("  ⚠️ MovimentoHaver:", e.message);
    }
    try {
      const MovimentoCrediario = require("./models/MovimentoCrediario");
      await MovimentoCrediario.sync();
      console.log("  ✅ MovimentoCrediario");
    } catch (e) {
      console.warn("  ⚠️ MovimentoCrediario:", e.message);
    }

    // ProdutoLembreteRecorrente
    try {
      const { ProdutoLembreteRecorrente } = require("./models");
      await ProdutoLembreteRecorrente.sync();
      console.log("  ✅ ProdutoLembreteRecorrente");
    } catch (e) {
      console.warn("  ⚠️ ProdutoLembreteRecorrente:", e.message);
    }

    // 4) Verificar total de tabelas criadas
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log(`\n✅ Total de tabelas no banco: ${tables.length}`);

    // 4) Seeds: criar usuário e admin iniciais
    try {
      const criarUsuarioInicial = require("./scripts/seed-usuario-inicial");
      await criarUsuarioInicial();
    } catch (e) {
      console.warn("⚠️ Seed usuário inicial:", e.message);
    }
    try {
      const criarAdminInicial = require("./scripts/seed-admin-painel");
      await criarAdminInicial();
    } catch (e) {
      console.warn("⚠️ Seed admin painel:", e.message);
    }

    console.log("🎉 Sincronização do banco completa!\n");
  } catch (err) {
    console.error("❌ Erro fatal na sincronização:", err.message);
    console.error(
      "⚠️ O servidor será iniciado mesmo assim, mas algumas tabelas podem não existir.",
    );
  }
}

// ── Migrações fiscais inline (sempre executadas no startup) ────────────────
// Garante que as colunas fiscais existam no banco, independente de NODE_ENV.
// Idempotente: verifica com SHOW COLUMNS antes de cada ALTER TABLE.
async function runFiscalMigrations() {
  try {
    await sequelize.authenticate();
    console.log("🔄 Verificando migrações fiscais...");

    const COLS = {
      itens: [
        ["sku", "VARCHAR(50) NULL"],
        ["gtin", "VARCHAR(14) NULL"],
        ["peso", "DECIMAL(10,3) NULL"],
        ["origem", "TINYINT NULL"],
        ["cfop_padrao", "VARCHAR(5) NULL"],
        ["cst_icms", "VARCHAR(3) NULL"],
        ["csosn", "VARCHAR(3) NULL"],
        ["cst_pis", "VARCHAR(2) NULL"],
        ["cst_cofins", "VARCHAR(2) NULL"],
        ["cst_ipi", "VARCHAR(2) NULL"],
        ["aliq_icms", "DECIMAL(6,2) NULL DEFAULT 0.00"],
        ["aliq_pis", "DECIMAL(6,2) NULL DEFAULT 0.00"],
        ["aliq_cofins", "DECIMAL(6,2) NULL DEFAULT 0.00"],
        ["aliq_ipi", "DECIMAL(6,2) NULL DEFAULT 0.00"],
        ["item_lista_servico", "VARCHAR(10) NULL"],
        ["municipio_incidencia_iss", "VARCHAR(7) NULL"],
        ["natureza_operacao_iss", "VARCHAR(100) NULL"],
        ["cnae_servico", "VARCHAR(7) NULL"],
      ],
      Clientes: [
        ["tipo_pessoa", "CHAR(1) NULL"],
        ["cnpj", "VARCHAR(18) NULL"],
        ["inscricao_estadual", "VARCHAR(20) NULL"],
        ["indicador_ie", "TINYINT NULL DEFAULT 9"],
        ["codigo_ibge_municipio", "VARCHAR(7) NULL"],
        ["pais", "VARCHAR(50) NULL DEFAULT 'Brasil'"],
        ["codigo_pais", "CHAR(4) NULL DEFAULT '1058'"],
      ],
      empresas: [
        ["cnae", "VARCHAR(7) NULL"],
        ["crt", "CHAR(1) NULL"],
        ["codigo_ibge_municipio", "VARCHAR(7) NULL"],
        ["pais", "VARCHAR(50) NULL DEFAULT 'Brasil'"],
        ["codigo_pais", "CHAR(4) NULL DEFAULT '1058'"],
      ],
      vendas: [
        ["numero_nfe", "INT NULL"],
        ["serie_nfe", "VARCHAR(3) NULL"],
        ["chave_acesso_nfe", "VARCHAR(44) NULL"],
        ["data_emissao_nfe", "DATETIME NULL"],
        ["natureza_operacao", "VARCHAR(60) NULL"],
        ["protocolo_nfe", "VARCHAR(15) NULL"],
        ["xml_nfe", "LONGTEXT NULL"],
        ["indicador_presenca", "TINYINT NULL DEFAULT 1"],
        [
          "status_fiscal",
          "ENUM('pendente','emitida','cancelada','erro','aguardando_correcao','nao_aplicavel') NULL DEFAULT 'pendente'",
        ],
        [
          "modo_emissao",
          "ENUM('automatico','manual','lote','confirmacao') NULL",
        ],
      ],
    };

    for (const [tabela, colunas] of Object.entries(COLS)) {
      for (const [nome, sqlType] of colunas) {
        try {
          const [rows] = await sequelize.query(
            `SHOW COLUMNS FROM \`${tabela}\` LIKE '${nome}'`,
          );
          if (rows.length > 0) continue;
          await sequelize.query(
            `ALTER TABLE \`${tabela}\` ADD COLUMN \`${nome}\` ${sqlType}`,
          );
          console.log(`  ✅ ${tabela}.${nome} adicionada`);
        } catch (e) {
          // tabela pode não existir ainda — ignorar
        }
      }
    }

    // Garantir tabelas novas do módulo fiscal
    try {
      const { ConfiguracaoFiscal, NotaFiscal } = require("./models");
      if (ConfiguracaoFiscal?.sync) await ConfiguracaoFiscal.sync();
      if (NotaFiscal?.sync) await NotaFiscal.sync();
    } catch (e) {}

    // Garantir tabela essencial do financeiro (contas_receber).
    // Em produção o AUTO_SYNC fica desabilitado, então a tabela é criada
    // aqui no startup caso não exista (sync() sem alter é idempotente).
    try {
      const ContaReceber = require("./models/ContaReceber");
      if (ContaReceber?.sync) await ContaReceber.sync();
      console.log("  ✅ Tabela contas_receber garantida/criada");
    } catch (e) {
      console.warn("  ⚠️ contas_receber:", e.message);
    }

    console.log("✅ Migrações fiscais verificadas!");
  } catch (err) {
    console.warn("⚠️ Migrações fiscais:", err.message);
  }
}

// Executar sync somente quando explicitamente habilitado via env `AUTO_SYNC=1`.
// Por padrão, NÃO rodar sync automático para evitar queries massivas na inicialização.
const shouldAutoSync =
  process.env.NODE_ENV !== "production" && process.env.AUTO_SYNC === "1";

if (shouldAutoSync) {
  console.log(
    "🔁 AUTO_SYNC=1 — executando syncAllTables antes de iniciar o servidor",
  );
  syncAllTables()
    .then(() => runFiscalMigrations())
    .then(() => startServer())
    .catch((err) => {
      console.error("❌ syncAllTables falhou:", err && err.message);
      // iniciar servidor mesmo em caso de falha de sync para não bloquear dev
      runFiscalMigrations().then(() => startServer());
    });
} else {
  if (process.env.NODE_ENV === "production") {
    console.log(
      "⚠️ NODE_ENV=production — sincronização automática desabilitada. Iniciando servidor sem sync.",
    );
  } else {
    console.log(
      "⚠️ Auto-sync desabilitado (defina AUTO_SYNC=1 para habilitar). Iniciando servidor sem sync.",
    );
  }
  // SEMPRE executar migrações fiscais inline, independente do ambiente
  // .catch() garante que startServer() execute mesmo se a migração falhar
  runFiscalMigrations()
    .then(() => startServer())
    .catch(() => startServer());
}

// Endpoints para selecionar/obter impressora
app.get("/api/impressora", async (req, res) => {
  try {
    const ImpressoraConfig = require("./models/ImpressoraConfig");
    const registro = await ImpressoraConfig.findOne({
      order: [["updatedAt", "DESC"]],
    });
    if (!registro) return res.json({ tipo: null });
    res.json({
      tipo: registro.tipo,
      usuario: registro.usuario,
      updatedAt: registro.updatedAt,
    });
  } catch (err) {
    console.error("Erro GET /api/impressora", err);
    res.status(500).json({ error: "Erro ao obter configuração de impressora" });
  }
});

app.post("/api/impressora", async (req, res) => {
  try {
    const { tipo, usuario } = req.body || {};
    if (!tipo)
      return res.status(400).json({ error: "Campo tipo é obrigatório" });
    const ImpressoraConfig = require("./models/ImpressoraConfig");
    // Criar novo registro (mantemos histórico simples)
    const novo = await ImpressoraConfig.create({
      tipo: String(tipo),
      usuario: usuario ? String(usuario) : null,
    });
    res.json({
      success: true,
      registro: {
        id: novo.id,
        tipo: novo.tipo,
        usuario: novo.usuario,
        updatedAt: novo.updatedAt,
      },
    });
  } catch (err) {
    console.error("Erro POST /api/impressora", err);
    res
      .status(500)
      .json({ error: "Erro ao salvar configuração de impressora" });
  }
});

// Endpoints para selecionar/obter Modelo de Etiqueta
app.get("/api/modelo-etiqueta", async (req, res) => {
  try {
    const ModeloEtiquetaConfig = require("./models/ModeloEtiquetaConfig");
    const registro = await ModeloEtiquetaConfig.findOne({
      order: [["updatedAt", "DESC"]],
    });
    if (!registro) return res.json({ modelo: null });
    res.json({
      modelo: registro.modelo,
      usuario: registro.usuario,
      updatedAt: registro.updatedAt,
    });
  } catch (err) {
    console.error("Erro GET /api/modelo-etiqueta", err);
    res
      .status(500)
      .json({ error: "Erro ao obter configuração de modelo de etiqueta" });
  }
});

app.post("/api/modelo-etiqueta", async (req, res) => {
  try {
    const { modelo, usuario } = req.body || {};
    if (!modelo)
      return res.status(400).json({ error: "Campo modelo é obrigatório" });
    const ModeloEtiquetaConfig = require("./models/ModeloEtiquetaConfig");
    const novo = await ModeloEtiquetaConfig.create({
      modelo: String(modelo),
      usuario: usuario ? String(usuario) : null,
    });
    res.json({
      success: true,
      registro: {
        id: novo.id,
        modelo: novo.modelo,
        usuario: novo.usuario,
        updatedAt: novo.updatedAt,
      },
    });
  } catch (err) {
    console.error("Erro POST /api/modelo-etiqueta", err);
    res
      .status(500)
      .json({ error: "Erro ao salvar configuração de modelo de etiqueta" });
  }
});

process.on("unhandledRejection", err => console.error("[UnhandledRejection]", err?.message));
process.on("uncaughtException", err => console.error("[UncaughtException]", err?.message));

// Iniciar o servidor SOMENTE após sync do banco
function startServer() {
  // Migrations pendentes: sempre rodar antes de iniciar o servidor
  (async () => {
    try {
      const addLembreteColunas = require("./scripts/add-lembrete-colunas-cliente");
      await addLembreteColunas();
    } catch (e) {
      console.warn("⚠️ Migration lembrete colunas no startup:", e.message);
    }

    // Migration: device_id em sessoes_ativas (roda sempre — garante coluna em produção)
    try {
      const [cols] = await sequelize.query(
        "SHOW COLUMNS FROM sessoes_ativas LIKE 'device_id'",
      );
      if (cols.length === 0) {
        await sequelize.query(
          "ALTER TABLE sessoes_ativas ADD COLUMN device_id VARCHAR(64) NULL DEFAULT NULL AFTER token_hash",
        );
        await sequelize.query(
          "ALTER TABLE sessoes_ativas ADD INDEX idx_device_id (device_id)",
        );
        console.log("✅ Migration: device_id adicionado em sessoes_ativas");
      }
    } catch (e) {
      console.warn("⚠️ Migration device_id no startup:", e.message);
    }

    // Migration: encerrado_em em sessoes_ativas (roda sempre — garante coluna em produção)
    try {
      const [cols2] = await sequelize.query(
        "SHOW COLUMNS FROM sessoes_ativas LIKE 'encerrado_em'",
      );
      if (cols2.length === 0) {
        await sequelize.query(
          "ALTER TABLE sessoes_ativas ADD COLUMN encerrado_em DATETIME NULL DEFAULT NULL AFTER ativo",
        );
        console.log("✅ Migration: encerrado_em adicionado em sessoes_ativas");
      }
    } catch (e) {
      console.warn("⚠️ Migration encerrado_em no startup:", e.message);
    }

    // Migration: numeroOrdem em whatsapp_sessions (roda sempre no startup)
    try {
      const [colsOrd2] = await sequelize.query(
        "SHOW COLUMNS FROM whatsapp_sessions LIKE 'numeroOrdem'",
      );
      if (colsOrd2.length === 0) {
        await sequelize.query(
          "ALTER TABLE whatsapp_sessions ADD COLUMN numeroOrdem INT NOT NULL DEFAULT 1 AFTER nome",
        );
        console.log(
          "✅ Migration: numeroOrdem adicionado em whatsapp_sessions",
        );
        // Recalcular números existentes por empresa
        await sequelize.query(`
          UPDATE whatsapp_sessions t
          JOIN (
            SELECT id, empresaId,
              ROW_NUMBER() OVER (PARTITION BY empresaId ORDER BY createdAt ASC) AS num
            FROM whatsapp_sessions
          ) sub ON t.id = sub.id
          SET t.numeroOrdem = sub.num
          WHERE t.createdAt IS NOT NULL
        `);
        console.log("✅ Migration: numeroOrdem recalculado");
      }
    } catch (e) {
      console.warn("⚠️ Migration numeroOrdem no startup:", e.message);
    }

    // Migration: saldo_haver e saldo_crediario em Clientes (roda sempre no startup)
    // Necessário porque o modelo Cliente define defaultValue para esses campos,
    // e o Sequelize os inclui no INSERT mesmo sem serem passados. Se a coluna
    // não existir no banco, o INSERT falha com ER_BAD_FIELD_ERROR (500).
    try {
      const [colsHaverStartup] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'saldo_haver'",
      );
      if (colsHaverStartup.length === 0) {
        await sequelize.query(
          "ALTER TABLE Clientes ADD COLUMN saldo_haver DECIMAL(12,2) NOT NULL DEFAULT 0.00",
        );
        console.log("✅ Migration: saldo_haver adicionado em Clientes");
      }
    } catch (e) {
      console.warn("⚠️ Migration saldo_haver no startup:", e.message);
    }
    try {
      const [colsCrediarioStartup] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'saldo_crediario'",
      );
      if (colsCrediarioStartup.length === 0) {
        await sequelize.query(
          "ALTER TABLE Clientes ADD COLUMN saldo_crediario DECIMAL(12,2) NOT NULL DEFAULT 0.00",
        );
        console.log("✅ Migration: saldo_crediario adicionado em Clientes");
      }
    } catch (e) {
      console.warn("⚠️ Migration saldo_crediario no startup:", e.message);
    }

    // Migration: empresa_id em Clientes (roda sempre no startup)
    // Garante que o isolamento por empresa funcione mesmo se a migração
    // add-empresa-id não tiver sido executada.
    try {
      const [colsEmpresaStartup] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'empresa_id'",
      );
      if (colsEmpresaStartup.length === 0) {
        await sequelize.query(
          "ALTER TABLE Clientes ADD COLUMN empresa_id INT NULL DEFAULT NULL",
        );
        await sequelize.query(
          "ALTER TABLE Clientes ADD INDEX idx_clientes_empresa_id (empresa_id)",
        );
        console.log("✅ Migration: empresa_id adicionado em Clientes");
      }
    } catch (e) {
      console.warn("⚠️ Migration empresa_id no startup:", e.message);
    }

    // Migration: garantir que telefone, email e cpf aceitem NULL (roda sempre no startup)
    // Necessário porque o modelo Cliente define esses campos como opcionais (allowNull: true),
    // mas o banco pode ter sido criado com NOT NULL. O Sequelize não altera colunas existentes.
    try {
      const [colsTelefoneNull] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'telefone'",
      );
      if (colsTelefoneNull.length > 0 && colsTelefoneNull[0].Null === "NO") {
        await sequelize.query(
          "ALTER TABLE Clientes MODIFY COLUMN telefone VARCHAR(255) NULL",
        );
        console.log("✅ Migration: telefone alterado para NULL em Clientes");
      }
    } catch (e) {
      console.warn("⚠️ Migration telefone NULL no startup:", e.message);
    }
    try {
      const [colsEmailNull] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'email'",
      );
      if (colsEmailNull.length > 0 && colsEmailNull[0].Null === "NO") {
        await sequelize.query(
          "ALTER TABLE Clientes MODIFY COLUMN email VARCHAR(255) NULL",
        );
        console.log("✅ Migration: email alterado para NULL em Clientes");
      }
    } catch (e) {
      console.warn("⚠️ Migration email NULL no startup:", e.message);
    }
    try {
      const [colsCpfNull] = await sequelize.query(
        "SHOW COLUMNS FROM Clientes LIKE 'cpf'",
      );
      if (colsCpfNull.length > 0 && colsCpfNull[0].Null === "NO") {
        await sequelize.query(
          "ALTER TABLE Clientes MODIFY COLUMN cpf VARCHAR(255) NULL",
        );
        console.log("✅ Migration: cpf alterado para NULL em Clientes");
      }
    } catch (e) {
      console.warn("⚠️ Migration cpf NULL no startup:", e.message);
    }

    // Garantir tabela produto_lembrete_recorrente
    try {
      const { ProdutoLembreteRecorrente } = require("./models");
      await ProdutoLembreteRecorrente.sync();
      console.log("✅ Tabela produto_lembrete_recorrente OK");
    } catch (e) {
      console.warn("⚠️ Sync ProdutoLembreteRecorrente no startup:", e.message);
    }
    // Processar lembretes atrasados no startup (recupera registros que não foram disparados)
    setTimeout(async () => {
      try {
        const {
          processarLembretes,
        } = require("./controllers/produtoLembreteController");
        await processarLembretes();
        console.log("✅ Processamento de lembretes atrasados concluído");
      } catch (e) {
        console.warn("⚠️ Erro ao processar lembretes no startup:", e.message);
      }
    }, 5000); // aguarda 5s para o servidor estar completamente pronto
  })();

  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} ✅`);
    // Só o portal fica desativado se ainda não houver segredo/migração. O ERP continua.
    if(process.env.JWT_CLIENTE_SECRET) clientePortal.notificacoes.iniciar();
    console.log(`🔗 URL: http://localhost:${PORT}`);

    // Iniciar agendador de mensagens WhatsApp (node-cron)
    try {
      const { iniciarAgendador } = require("./services/whatsappQueue");
      iniciarAgendador();
    } catch (err) {
      console.warn(
        "⚠️ Não foi possível iniciar agendador WhatsApp:",
        err.message,
      );
    }

    // Restaurar credenciais/chaves cifradas; status antigo não gera um novo QR.
    const whatsappService = require("./services/whatsappService");
    whatsappService.iniciarMonitor();
    const importacaoClientes=require("./services/importacao/operacoes").instancia();
    importacaoClientes.iniciarMonitor();
    let encerrandoWhatsapp = false;
    const encerrarServidor = async () => {
      if (encerrandoWhatsapp) return;
      encerrandoWhatsapp = true;
      const limite = setTimeout(() => process.exit(0), 8000);
      limite.unref();
      await Promise.allSettled([whatsappService.suspender(),importacaoClientes.parar()]); // Sessão preservada e checkpoint de importação seguro.
      server.close(() => process.exit(0));
    };
    process.once("SIGTERM", encerrarServidor);
    process.once("SIGINT", encerrarServidor);

    // Limpeza periódica de sessões inativas (a cada 60 segundos).
    // Com SESSAO_TIMEOUT_SECONDS = 90s, sessões expiram em no máximo 150s após browser fechar.
    setInterval(async () => {
      try {
        const {
          limparSessoesExpiradas,
        } = require("./controllers/acessosController");
        await limparSessoesExpiradas();
      } catch (e) {
        // silencioso — não interromper o servidor por erro de limpeza
      }
    }, 60 * 1000); // 60 segundos
    console.log(
      "✅ Limpeza periódica de sessões inativas iniciada (a cada 60s)",
    );

    // Cron: verificação de vencimentos do painel admin (mover para 09:00)
    try {
      const cron = require("node-cron");
      const {
        verificarVencimentos,
      } = require("./controllers/empresaPainelController");
      cron.schedule("0 9 * * *", async () => {
        const executionLock = require("./services/executionLock");
        const res = await executionLock.withLock(
          "verificarVencimentos",
          async () => {
            console.log("[cron] Executando verificação de vencimentos...");
            await verificarVencimentos();
          },
        );
        if (res && res.skipped)
          console.log(`[cron] verificarVencimentos ignorado: ${res.reason}`);
      });
      console.log("✅ Cron de verificação de vencimentos agendado (09:00)");
    } catch (err) {
      console.warn(
        "⚠️ Não foi possível iniciar cron de vencimentos:",
        err.message,
      );
    }

    // Cron: backup automático diário de todas as empresas (todo dia às 00:00)
    try {
      const cron = require("node-cron");
      const { executarBackupGeral } = require("./services/backupService");

      cron.schedule("0 0 * * *", async () => {
        console.log("[cron] Executando backup diário automático (limitado)...");
        try {
          // Processar um número limitado de empresas por execução para evitar picos
          await executarBackupGeral({ maxPerRun: 1, delayBetweenMs: 1000 });
        } catch (err) {
          console.error("[cron] Erro no backup diário:", err && err.message);
        }
      });
      console.log("✅ Cron de backup diário iniciado (00:00, limitado)");
    } catch (err) {
      console.warn("⚠️ Não foi possível iniciar cron de backup:", err.message);
    }

    // Marketing: aniversários, agendamentos, vencimentos e recorrências são
    // planejados pelo ciclo único da whatsappQueue, com fuso explícito e recibos.

    const address = server.address();
    if (address) {
      console.log("📊 Endereço:", address);
      console.log("🌐 Hostname:", address.address);
      console.log("👂 Escutando na porta:", address.port);
    }
  });

  server.on("error", (error) => {
    console.error("❌ Erro no servidor:", error.message);
    if (error.code === "EADDRINUSE") {
      console.error(`🚫 Porta ${PORT} já está em uso!`);
      process.exit(1);
    }
  });

  server.on("listening", () => {
    console.log("✅ Servidor pronto para receber conexões!");
  });
} // fim startServer()
