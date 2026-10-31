const express = require("express");
const router = express.Router();
const Produto = require("../models/Produto");
const Fornecedor = require("../models/Fornecedor");
const { QueryTypes } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { authUser } = require("../middleware/authUser");

// Todas as rotas de itens requerem autenticação (multi-tenant)
router.use(authUser);

// arquivo para armazenar exclusões locais (bloqueio de itens que existem apenas no frontend)
const blockedFilePath = path.join(
  __dirname,
  "..",
  "data",
  "blocked_medicamentos.json",
);
function readBlocked() {
  try {
    if (!fs.existsSync(blockedFilePath)) return [];
    const txt = fs.readFileSync(blockedFilePath, "utf8");
    return JSON.parse(txt || "[]");
  } catch (e) {
    console.warn("Erro lendo blocked_medicamentos.json", e && e.message);
    return [];
  }
}
function writeBlocked(list) {
  try {
    const dir = path.dirname(blockedFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(blockedFilePath, JSON.stringify(list, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Erro gravando blocked_medicamentos.json", e && e.message);
    return false;
  }
}

// NOTE: last-saved helpers removed — rely on persistent DB state and GET /api/itens

// Listar todos os produtos (do banco) - suporta query q para busca
router.get("/", async (req, res) => {
  try {
    const {
      q,
      excludeAgrupamento,
      agrupamento,
      fornecedorId,
      fornecedor,
      tipo,
    } = req.query;
    const { Op } = require("sequelize");

    // Construir condições dinamicamente para suportar combinações
    const andConditions = [];

    if (q) {
      andConditions.push({
        [Op.or]: [
          { nome: { [Op.like]: `%${q}%` } },
          { codigo: { [Op.like]: `%${q}%` } },
        ],
      });
    }

    if (agrupamento) {
      andConditions.push({ agrupamento: agrupamento });
    }

    if (excludeAgrupamento) {
      // Excluir qualquer item cujo campo `agrupamento` contenha a string fornecida
      andConditions.push({
        agrupamento: { [Op.notLike]: `%${excludeAgrupamento}%` },
      });
    }

    // Filtrar por fornecedorId no JSON `fornecedores` (MySQL JSON_SEARCH)
    if (fornecedorId) {
      const fid = String(fornecedorId).replace(/'/g, "\\'");
      try {
        andConditions.push(
          Produto.sequelize.literal(
            `JSON_SEARCH(fornecedores, 'one', '${fid}', NULL, '$[*].id') IS NOT NULL`,
          ),
        );
      } catch (e) {
        console.warn(
          "Falha ao adicionar condição fornecedorId (literal):",
          e && e.message,
        );
      }
    }

    // Filtrar por nome do fornecedor dentro do JSON `fornecedores` (quando armazenado como objeto)
    if (fornecedor) {
      const fv = String(fornecedor).replace(/'/g, "\\'");
      try {
        andConditions.push(
          Produto.sequelize.literal(
            `JSON_SEARCH(fornecedores, 'one', '${fv}', NULL, '$[*].nome') IS NOT NULL`,
          ),
        );
      } catch (e) {
        console.warn(
          "Falha ao adicionar condição fornecedor (literal):",
          e && e.message,
        );
      }
    }

    // Filtrar por tipo (produto / servico)
    if (tipo) {
      andConditions.push({ tipo: tipo });
    }

    // Filtrar por empresa (multi-tenant)
    if (req.user?.empresaId) {
      andConditions.push({ empresa_id: req.user.empresaId });
    }

    let where = {};
    if (andConditions.length === 1) where = andConditions[0];
    else if (andConditions.length > 1) where = { [Op.and]: andConditions };

    // Log temporário para depuração: mostrar params recebidos e amostra de itens
    try {
      console.log("GET /api/itens - query params:", req.query);
    } catch (e) {}
    const itens = await Produto.findAll({
      where,
      order: [["nome", "ASC"]],
      limit: 1000,
    });
    try {
      console.log(`GET /api/itens - itens retornados: ${itens.length}`);
      if (itens.length > 0) {
        try {
          console.log(
            "Amostra fornecedores do primeiro item:",
            JSON.stringify((itens[0].fornecedores || []).slice(0, 3)),
          );
        } catch (e) {}
      }
    } catch (e) {}
    res.json(itens);
  } catch (error) {
    console.error("Erro ao listar produtos (DB):", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota de depuração: inspecionar conteúdo do JSON `fornecedores` buscando por id ou nome
router.get("/debug-fornecedor", async (req, res) => {
  try {
    const { fornecedorId, fornecedor } = req.query || {};
    if (!fornecedorId && !fornecedor)
      return res
        .status(400)
        .json({ error: "fornecedorId ou fornecedor query obrigatório" });
    const sequelize = Produto.sequelize;
    let sql;
    let replacements = [];
    if (fornecedorId) {
      sql = `SELECT id, nome, fornecedores FROM itens WHERE JSON_SEARCH(fornecedores, 'one', ?, NULL, '$[*].id') IS NOT NULL LIMIT 50`;
      replacements = [String(fornecedorId)];
    } else {
      sql = `SELECT id, nome, fornecedores FROM itens WHERE JSON_SEARCH(fornecedores, 'one', ?, NULL, '$[*].nome') IS NOT NULL LIMIT 50`;
      replacements = [String(fornecedor)];
    }
    const rows = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });
    try {
      console.log("/api/itens/debug-fornecedor - query", {
        fornecedorId,
        fornecedor,
        found: rows.length,
      });
    } catch (e) {}
    return res.json(rows);
  } catch (err) {
    console.error("Erro debug /api/itens/debug-fornecedor", err);
    return res.status(500).json({ error: "erro interno debug" });
  }
});

// Helper: normaliza um array de fornecedores recebido do cliente, tentando preencher `id` e `nome`
async function normalizeFornecedoresArray(inputArr) {
  if (!inputArr) return inputArr;
  try {
    if (!Array.isArray(inputArr)) return inputArr;
    const out = [];
    for (const item of inputArr) {
      try {
        if (!item) {
          out.push(item);
          continue;
        }
        if (typeof item === "string") {
          const name = item.trim();
          const lower = name.toLowerCase();
          let f = await Fornecedor.findOne({
            where: Produto.sequelize.where(
              Produto.sequelize.fn("LOWER", Produto.sequelize.col("nome")),
              lower,
            ),
          });
          if (!f)
            f = await Fornecedor.findOne({
              where: Produto.sequelize.where(
                Produto.sequelize.fn("LOWER", Produto.sequelize.col("nome")),
                { [Produto.sequelize.Op.like]: `%${lower}%` },
              ),
            });
          if (f)
            out.push({ id: String(f.id), nome: f.nome, fornecedor: f.nome });
          else out.push({ nome: name, fornecedor: name });
        } else if (typeof item === "object") {
          const obj = Object.assign({}, item);
          if (obj.id) {
            // confirm exists
            const byId = await Fornecedor.findByPk(String(obj.id));
            if (byId) {
              obj.id = String(byId.id);
              obj.nome = byId.nome;
            } else if (obj.nome) {
              const lower = String(obj.nome).toLowerCase();
              let f = await Fornecedor.findOne({
                where: Produto.sequelize.where(
                  Produto.sequelize.fn("LOWER", Produto.sequelize.col("nome")),
                  lower,
                ),
              });
              if (!f)
                f = await Fornecedor.findOne({
                  where: Produto.sequelize.where(
                    Produto.sequelize.fn(
                      "LOWER",
                      Produto.sequelize.col("nome"),
                    ),
                    { [Produto.sequelize.Op.like]: `%${lower}%` },
                  ),
                });
              if (f) {
                obj.id = String(f.id);
                obj.nome = f.nome;
              }
            }
          } else if (obj.fornecedor || obj.nome) {
            const name = (obj.fornecedor || obj.nome || "").toString().trim();
            const lower = name.toLowerCase();
            let f = await Fornecedor.findOne({
              where: Produto.sequelize.where(
                Produto.sequelize.fn("LOWER", Produto.sequelize.col("nome")),
                lower,
              ),
            });
            if (!f)
              f = await Fornecedor.findOne({
                where: Produto.sequelize.where(
                  Produto.sequelize.fn("LOWER", Produto.sequelize.col("nome")),
                  { [Produto.sequelize.Op.like]: `%${lower}%` },
                ),
              });
            if (f) {
              obj.id = String(f.id);
              obj.nome = f.nome;
            } else obj.nome = name;
          }
          out.push(obj);
        } else {
          out.push(item);
        }
      } catch (e) {
        console.warn(
          "normalizeFornecedoresArray: erro processando item",
          item,
          e && e.message,
        );
        out.push(item);
      }
    }
    return out;
  } catch (e) {
    console.warn("normalizeFornecedoresArray erro", e && e.message);
    return inputArr;
  }
}

// GET blocked items (frontend-only deletions)
router.get("/blocked", async (req, res) => {
  try {
    const list = readBlocked();
    res.json(list);
  } catch (e) {
    console.error("Erro GET /blocked", e);
    res.status(500).json([]);
  }
});

// POST add blocked item
router.post("/blocked", async (req, res) => {
  try {
    const body = req.body || {};
    const codigo =
      body.codigo !== undefined && body.codigo !== null
        ? String(body.codigo).trim()
        : null;
    const nome = body.nome ? String(body.nome).trim() : null;
    if (!codigo && !nome)
      return res.status(400).json({ error: "codigo ou nome obrigatório" });
    const list = readBlocked();
    // evitar duplicatas por codigo ou nome
    const exists = list.find(
      (i) =>
        (codigo && String(i.codigo) === String(codigo)) ||
        (nome && String(i.nome).toLowerCase() === String(nome).toLowerCase()),
    );
    if (exists)
      return res.json({ success: true, message: "já bloqueado", item: exists });
    const item = {
      codigo: codigo || null,
      nome: nome || null,
      addedAt: new Date().toISOString(),
    };
    list.push(item);
    writeBlocked(list);
    res.json({ success: true, item });
  } catch (e) {
    console.error("Erro POST /blocked", e);
    res.status(500).json({ error: "Erro ao bloquear" });
  }
});

// DELETE blocked item by codigo or nome
router.delete("/blocked", async (req, res) => {
  try {
    const { codigo, nome } = req.body || req.query || {};
    if (!codigo && !nome)
      return res.status(400).json({ error: "codigo ou nome obrigatório" });
    let list = readBlocked();
    const before = list.length;
    list = list.filter(
      (i) =>
        !(codigo && String(i.codigo) === String(codigo)) &&
        !(nome && String(i.nome).toLowerCase() === String(nome).toLowerCase()),
    );
    writeBlocked(list);
    res.json({ success: true, removed: before - list.length });
  } catch (e) {
    console.error("Erro DELETE /blocked", e);
    res.status(500).json({ error: "Erro ao remover bloqueio" });
  }
});

// Buscar produto por id
router.get("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const produto = await Produto.findByPk(id);
    if (!produto)
      return res.status(404).json({ error: "Produto não encontrado" });
    res.json(produto);
  } catch (error) {
    console.error("Erro ao obter produto:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET last-saved
router.get("/last-saved", async (req, res) => {
  try {
    const v = readLastSaved();
    res.json({ lastSaved: v });
  } catch (e) {
    console.error("Erro GET /last-saved", e);
    res.status(500).json({ lastSaved: null });
  }
});

// POST last-saved
router.post("/last-saved", async (req, res) => {
  try {
    const body = req.body || {};
    const v =
      body.lastSaved !== undefined && body.lastSaved !== null
        ? String(body.lastSaved)
        : null;
    if (!v) return res.status(400).json({ error: "lastSaved obrigatório" });
    writeLastSaved(v);
    res.json({ success: true, lastSaved: v });
  } catch (e) {
    console.error("Erro POST /last-saved", e);
    res.status(500).json({ error: "Falha ao gravar lastSaved" });
  }
});

// DELETE last-saved
router.delete("/last-saved", async (req, res) => {
  try {
    deleteLastSaved();
    res.json({ success: true });
  } catch (e) {
    console.error("Erro DELETE /last-saved", e);
    res.status(500).json({ error: "Falha ao remover lastSaved" });
  }
});

// Criar produto
router.post("/", async (req, res) => {
  try {
    const data = req.body || {};
    console.debug("POST /api/itens - recebido payload:", data);
    // validação mínima
    const nome =
      data.nome || data.nome === 0
        ? String(data.nome).trim()
        : data.nome || data.descricao
          ? String(data.descricao).trim()
          : "";
    if (!nome) {
      return res
        .status(400)
        .json({ error: "Campo nome/descricao é obrigatório" });
    }

    // preparar payload coerente para o modelo
    const payload = { ...data, nome };
    // Adicionar empresa_id para isolamento multi-tenant
    if (req.user?.empresaId) payload.empresa_id = req.user.empresaId;
    // gerar um código simples quando não fornecido para evitar registros com codigo=null
    try {
      if (!payload.codigo || String(payload.codigo).trim() === "") {
        // usar timestamp curto para evitar colisões simples
        payload.codigo = String(Date.now()).slice(-8);
      }
    } catch (e) {}

    // evitar criação de duplicatas: se já existe item com mesmo nome + agrupamento + empresa, retornar existente
    try {
      const where = { nome };
      if (payload.agrupamento) where.agrupamento = payload.agrupamento;
      if (payload.empresa_id) where.empresa_id = payload.empresa_id;
      const exists = await Produto.findOne({ where });
      if (exists) {
        try {
          console.log(
            "🔔 [DEBUG] Item já existe no DB, retornando existente ao invés de criar:",
            exists.id || exists.codigo,
          );
        } catch (e) {}
        return res
          .status(200)
          .json(exists.get ? exists.get({ plain: true }) : exists);
      }
    } catch (e) {
      console.warn(
        "Erro verificando duplicata antes de criar:",
        e && e.message,
      );
    }
    // Se o cliente enviou um id, usar; caso contrário, gerar um id sequencial baseado no maior id numérico atual
    if (payload.id) {
      payload.id = String(payload.id);
    } else {
      try {
        // tentar obter o maior id numérico existente na tabela e incrementar
        const [[row]] = await Produto.sequelize.query(
          "SELECT MAX(CAST(id AS UNSIGNED)) AS maxId FROM itens",
        );
        const maxId =
          row && row.maxId !== null && row.maxId !== undefined
            ? Number(row.maxId)
            : 0;
        payload.id = String((maxId || 0) + 1);
      } catch (qerr) {
        // fallback para timestamp curto caso a query falhe
        console.warn(
          "⚠️ Falha ao calcular id sequencial, usando timestamp curto como fallback",
          qerr && qerr.message,
        );
        payload.id = String(Date.now()).slice(-8); // manter menor que antes
      }
    }

    // Normalizar lista de fornecedores enviada pelo cliente (preencher id/nome quando possível)
    try {
      if (payload.fornecedores)
        payload.fornecedores = await normalizeFornecedoresArray(
          payload.fornecedores,
        );
    } catch (e) {
      console.warn("Erro normalizando fornecedores no POST:", e && e.message);
    }

    // coerções simples de tipos numéricos (evita erros no DB)
    if (payload.custoBase !== undefined && payload.custoBase !== null)
      payload.custoBase = Number(payload.custoBase) || 0;
    if (payload.preco !== undefined && payload.preco !== null)
      payload.preco = Number(payload.preco) || 0;
    if (payload.margem !== undefined && payload.margem !== null)
      payload.margem = Number(payload.margem) || 0;
    if (payload.estoqueAtual !== undefined && payload.estoqueAtual !== null)
      payload.estoqueAtual = parseInt(payload.estoqueAtual, 10) || 0;
    if (payload.estoqueMinimo !== undefined && payload.estoqueMinimo !== null)
      payload.estoqueMinimo = parseInt(payload.estoqueMinimo, 10) || 0;

    // log payload antes de criar (debug temporário)
    try {
      console.log(
        "🔔 [DEBUG] Criando produto com payload:",
        JSON.stringify(payload),
      );
    } catch (e) {}
    const novo = await Produto.create(payload);
    try {
      console.log("🔔 [DEBUG] Produto criado (DB) id=", String(novo.id));
    } catch (e) {}
    // Recarregar o registro criado diretamente do banco para garantir que todos os campos do modelo sejam retornados
    try {
      const saved = await Produto.findByPk(novo.id);
      if (saved) return res.status(201).json(saved);
    } catch (e) {
      console.warn(
        "⚠️ Falha ao reconsultar produto criado; retornando objeto criado:",
        e && e.message,
      );
    }
    return res.status(201).json(novo);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    // retornar mensagem de erro quando possível para facilitar debug (não vazar stack)
    return res
      .status(500)
      .json({ error: error.message || "Erro interno ao criar produto" });
  }
});

// Atualizar a flag `permiteEstoqueNegativo` para todos os produtos (PUT /permite-estoque-negativo)
// Colocado antes das rotas parametrizadas para evitar conflito com ':id'
router.put("/permite-estoque-negativo", async (req, res) => {
  try {
    const body = req.body || {};
    const valor =
      body.permiteEstoqueNegativo === undefined
        ? null
        : String(body.permiteEstoqueNegativo);
    if (valor === null)
      return res
        .status(400)
        .json({ error: "Campo permiteEstoqueNegativo obrigatório" });

    // Atualiza todos os registros na tabela `itens`
    const [updatedCount] = await Produto.update(
      { permiteEstoqueNegativo: valor },
      { where: {} },
    );

    return res.json({
      success: true,
      permiteEstoqueNegativo: valor,
      updated: Number(updatedCount || 0),
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar permiteEstoqueNegativo globalmente:",
      error,
    );
    return res
      .status(500)
      .json({ error: "Erro interno ao atualizar flag global" });
  }
});

// Atualizar produto
router.put("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const data = req.body || {};
    // debug: log do payload recebido no PUT
    try {
      console.log(
        "🔔 [DEBUG] PUT /api/itens/" + id + " - payload recebido:",
        JSON.stringify(data),
      );
    } catch (e) {}

    const produto = await Produto.findByPk(id);
    if (!produto)
      return res.status(404).json({ error: "Produto não encontrado" });

    // Log para debug de validade
    if (data.validade !== undefined) {
      console.log(`🔄 PUT /api/itens/${id} - Atualizando validade:`, {
        produtoId: id,
        produtoNome: produto.nome?.substring(0, 40),
        validadeRecebida: data.validade,
        validadeAtual: produto.validade,
      });
    }

    // Normalizar campo `ativo` aceitando true/false ou 'sim'/'nao' do cliente
    try {
      if (data.ativo !== undefined && data.ativo !== null) {
        if (data.ativo === true || String(data.ativo).toLowerCase() === "true")
          data.ativo = "sim";
        else if (
          data.ativo === false ||
          String(data.ativo).toLowerCase() === "false"
        )
          data.ativo = "nao";
        else {
          var s = String(data.ativo).toLowerCase();
          if (s === "sim" || s === "nao") data.ativo = s;
        }
      }
    } catch (e) {
      console.debug("Erro normalizando ativo no PUT:", e);
    }

    // Processar imagem se enviada como base64
    if (data.imagem && data.imagem.startsWith("data:image")) {
      try {
        const base64Data = data.imagem.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `produto_${id}_${Date.now()}.png`;
        const uploadPath = path.join(__dirname, "../../uploads", fileName);

        // Criar diretório se não existir
        const uploadDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        fs.writeFileSync(uploadPath, buffer);
        data.imagem = fileName; // Salvar apenas o nome do arquivo
        console.log(`✅ Imagem do produto salva: ${fileName}`);
      } catch (imgError) {
        console.error("❌ Erro ao processar imagem:", imgError);
        // Continuar sem salvar imagem em caso de erro
        delete data.imagem;
      }
    }

    // Se o preço foi alterado pelo cliente, registrar timestamp em `ultimoPrecoAlterado`
    try {
      if (data.preco !== undefined && data.preco !== null) {
        const novoPreco = Number(data.preco);
        const precoAtual = Number(produto.preco) || 0;
        if (!isNaN(novoPreco) && novoPreco !== precoAtual) {
          data.ultimoPrecoAlterado = new Date().toISOString();
        }
      }
    } catch (e) {
      console.debug("Erro verificando alteração de preco:", e);
    }

    // Normalizar fornecedores recebidos no update (preencher id/nome quando possível)
    try {
      if (data.fornecedores)
        data.fornecedores = await normalizeFornecedoresArray(data.fornecedores);
    } catch (e) {
      console.warn("Erro normalizando fornecedores no PUT:", e && e.message);
    }

    await produto.update(data);
    try {
      const plain = produto.get
        ? produto.get({ plain: true })
        : Object.assign({}, produto);
      Object.keys(data || {}).forEach(function (k) {
        if (typeof data[k] !== "undefined") plain[k] = data[k];
      });
      return res.json(plain);
    } catch (e) {
      return res.json(produto);
    }
    try {
      console.log(
        "🔔 [DEBUG] Produto atualizado (DB):",
        JSON.stringify(produto.get ? produto.get({ plain: true }) : produto),
      );
    } catch (e) {}
    console.debug(
      `PUT /api/itens/${id} - após update produto.ativo =`,
      produto.ativo,
    );

    // Log confirmação de atualização de validade
    if (data.validade !== undefined) {
      console.log(`✅ Validade atualizada para produto ${id}:`, {
        validadeEnviada: data.validade,
        validadeGravada: produto.validade,
      });
    }

    res.json(produto);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: "Erro interno ao atualizar produto" });
  }
});

// Atualizar estoque (PUT /:id/estoque) - quantidade + operacao
router.put("/:id/estoque", async (req, res) => {
  try {
    const id = String(req.params.id);
    const { quantidade, operacao, dataAjuste } = req.body;
    if (quantidade === undefined || !operacao)
      return res
        .status(400)
        .json({ error: "Quantidade e operacao obrigatórios" });
    const produto = await Produto.findByPk(id);
    if (!produto)
      return res.status(404).json({ error: "Produto não encontrado" });
    const atual = Number(produto.estoqueAtual) || 0;
    let novoEstoque = atual;
    if (operacao === "reduzir")
      novoEstoque = Math.max(0, atual - Number(quantidade));
    else if (operacao === "adicionar") novoEstoque = atual + Number(quantidade);
    else return res.status(400).json({ error: "Operacao inválida" });
    await produto.update({ estoqueAtual: novoEstoque });

    // Salvar no histórico de estoque
    try {
      const HistoricoEstoque = require("../models/HistoricoEstoque");
      await HistoricoEstoque.create({
        produtoId: id,
        produtoNome: produto.nome,
        dataMovimento: dataAjuste || new Date(),
        operacao:
          operacao === "adicionar"
            ? "Ajuste Manual (Entrada)"
            : "Ajuste Manual (Saída)",
        estoqueAnterior: atual,
        quantidade:
          operacao === "adicionar" ? Number(quantidade) : -Number(quantidade),
        novoEstoque: novoEstoque,
        observacao: `Ajuste de estoque - ${operacao}`,
      });
    } catch (histErr) {
      console.error("Erro ao salvar histórico de estoque:", histErr);
    }

    res.json({
      success: true,
      produto,
      estoqueAnterior: atual,
      novoEstoque,
      operacao,
      quantidade,
    });
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar histórico de estoque de um produto
router.get("/:id/historico-estoque", async (req, res) => {
  try {
    const id = String(req.params.id);
    const HistoricoEstoque = require("../models/HistoricoEstoque");
    const historico = await HistoricoEstoque.findAll({
      where: { produtoId: id },
      order: [["dataMovimento", "DESC"]],
    });
    res.json(historico);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Deletar produto
router.delete("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const produto = await Produto.findByPk(id);
    if (!produto)
      return res.status(404).json({ error: "Produto não encontrado" });
    await produto.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota para importar/migrar uma lista de produtos (POST /import)
router.post("/import", async (req, res) => {
  try {
    const lista = Array.isArray(req.body) ? req.body : req.body.produtos || [];
    if (!Array.isArray(lista) || lista.length === 0)
      return res.status(400).json({ error: "Lista vazia" });

    const results = [];
    for (const p of lista) {
      try {
        const id = p.id
          ? String(p.id)
          : String(Date.now()) + Math.floor(Math.random() * 1000);
        const [registro, created] = await Produto.upsert({ ...p, id });
        results.push({ id, created: !!created });
      } catch (err) {
        console.warn("Falha ao importar item:", p && p.id, err && err.message);
      }
    }
    res.json({ success: true, imported: results.length, details: results });
  } catch (error) {
    console.error("Erro na importacao de itens:", error);
    res.status(500).json({ error: "Erro interno na importacao" });
  }
});

// Helper para interpretar strings de data em vários formatos e retornar Date ou null
function parseDateString(validadeStr) {
  if (!validadeStr) return null;
  // Se já for Date
  if (validadeStr instanceof Date) return validadeStr;

  // Tentar parsing padrão do JS
  const d1 = new Date(validadeStr);
  if (!isNaN(d1.getTime()))
    return new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());

  // Tentar formato DD/MM/YYYY ou D/M/YYYY ou DD-MM-YYYY
  const m = String(validadeStr)
    .trim()
    .match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = Number(m[3]);
    const d2 = new Date(year, month, day);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

// Helper para calcular dias entre hoje e a data de validade (aceita ISO e DD/MM/YYYY)
function calcularDiasParaValidade(validadeStr) {
  const validade = parseDateString(validadeStr);
  if (!validade) return null;
  const hoje = new Date();
  const msPorDia = 1000 * 60 * 60 * 24;
  // comparar somente a parte de datas (zerar horas)
  const v = new Date(
    validade.getFullYear(),
    validade.getMonth(),
    validade.getDate(),
  ).getTime();
  const h = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  ).getTime();
  const diff = (v - h) / msPorDia;
  return Math.ceil(diff);
}

// Normaliza thresholds: retorna { high, low } onde high >= low
function normalizarThresholds(a1, a2) {
  const n1 = Number(a1) || 0;
  const n2 = Number(a2) || 0;
  if (n1 >= n2) return { high: n1, low: n2 };
  return { high: n2, low: n1 };
}

// Calcula status de validade para um produto único
function calcularStatusProduto(
  produto,
  defaults = { firstAlert: 30, secondAlert: 15 },
) {
  const dias = calcularDiasParaValidade(produto.validade);
  if (dias === null || isNaN(dias))
    return { produto, dias: null, status: "normal", mensagem: null };

  // Se o produto possui um perfil de validade, usar os alertas dele
  let alerta1 = defaults.firstAlert;
  let alerta2 = defaults.secondAlert;
  if (
    produto.perfilValidade &&
    (produto.perfilValidade.alerta1 || produto.perfilValidade.alerta2)
  ) {
    alerta1 = produto.perfilValidade.alerta1;
    alerta2 = produto.perfilValidade.alerta2;
  }

  const { high, low } = normalizarThresholds(alerta1, alerta2);

  if (dias <= low) {
    return {
      produto,
      dias,
      status: "critical",
      mensagem: "Produto próximo ao vencimento",
    };
  }
  if (dias <= high) {
    return {
      produto,
      dias,
      status: "warning",
      mensagem: "Produto próximo do vencimento",
    };
  }

  return { produto, dias, status: "normal", mensagem: null };
}

// Rota para calcular status de validade dos produtos internos (GET)
router.get("/validade-status", (req, res) => {
  try {
    const defaults = { firstAlert: 30, secondAlert: 15 };
    const resultados = produtos.map((p) => calcularStatusProduto(p, defaults));
    res.json(resultados);
  } catch (error) {
    console.error("Erro ao calcular status de validade:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota para calcular status de validade para uma lista de produtos enviada no body (POST)
router.post("/validade-status", (req, res) => {
  try {
    const lista = Array.isArray(req.body) ? req.body : req.body.produtos || [];
    const defaults = { firstAlert: 30, secondAlert: 15 };
    const resultados = lista.map((p) => calcularStatusProduto(p, defaults));
    res.json(resultados);
  } catch (error) {
    console.error("Erro ao calcular status de validade (POST):", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;
