const express = require("express");
const router = express.Router();
const petController = require("../controllers/petController");
const multer = require("multer");
const { Agendamento, Periodicidade, Pet, Cliente } = require("../models");
const { authUser } = require("../middleware/authUser");

// Aplicar auth em toda a rota de pets
router.use(authUser);

// Helper: após registrar vacina/vermifugo/antiparasitario, agendar envios de vencimento
async function dispararVencimentoSeConfigurado(agendamentoId, petId) {
  try {
    const { MensagemAutomatica } = require("../models");
    const {
      dispararMensagemAutomatica,
      normalizarConfig,
    } = require("../controllers/marketingController");

    const pet = await Pet.findByPk(petId, {
      include: [{ model: Cliente, as: "cliente" }],
    });
    if (!pet?.cliente?.telefone) return;

    const empId = pet.cliente.empresa_id;
    const msg = await MensagemAutomatica.findOne({
      where: { tipo: "vacinas_vencendo", ativo: true, empresaId: empId },
    });
    if (!msg) return;

    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag) return;

    let servicos = ag.servicos;
    if (typeof servicos === "string") servicos = JSON.parse(servicos);
    if (!Array.isArray(servicos)) return;

    const periodicidades = await Periodicidade.findAll();
    const periodicidadesMap = new Map(
      periodicidades.map((p) => [p.descricao.trim().toLowerCase(), p]),
    );

    for (const s of servicos) {
      const meta = s.meta || {};
      if (
        !["vacina", "vermifugo", "antiparasitario"].includes(meta.tipoEspecial)
      )
        continue;

      const dataAplic = meta.dataAplic || ag.dataAgendamento || null;
      const renovacaoLabel = meta.renovacao || "";
      if (!dataAplic || !renovacaoLabel) continue;

      const p = periodicidadesMap.get(renovacaoLabel.trim().toLowerCase());
      if (!p || !p.dias) continue;

      const dStr =
        typeof dataAplic === "string"
          ? dataAplic.slice(0, 10)
          : new Date(dataAplic).toISOString().slice(0, 10);
      const [year, month, day] = dStr.split("-").map(Number);
      const dRenov = new Date(year, month - 1, day);
      dRenov.setDate(dRenov.getDate() + Number(p.dias));

      const tipoLabel =
        meta.tipoEspecial === "vacina"
          ? "vacina"
          : meta.tipoEspecial === "vermifugo"
            ? "vermífugo"
            : "antiparasitário";
      const produtoNome = s.nome || meta.nome || tipoLabel;

      // Modo evento: cria envios para cada dia configurado
      await dispararMensagemAutomatica(
        "vacinas_vencendo",
        {
          nomeTutor: pet.cliente.nome || "Tutor",
          nomePet: pet.nome || "Pet",
          produto: produtoNome,
          tipoEspecial: tipoLabel,
          dataRenovacao: dRenov.toLocaleDateString("pt-BR"),
        },
        pet.cliente.telefone,
        dRenov,
        { clienteId: pet.cliente.id, petId: pet.id, agendamentoId: ag.id },
        empId,
      );
      console.log(
        `[Vencimento] Envios agendados para ${produtoNome} pet=${pet.nome} renovação=${dRenov.toISOString().slice(0, 10)}`,
      );
    }
  } catch (err) {
    console.error(
      "[Vencimento] Erro ao agendar envio após registro:",
      err.message,
    );
  }
}

// Helper: calcula data de renovação somando os dias da periodicidade à data de aplicação
function calcularDataRenovacao(
  dataAplic,
  periodicidadeDescricao,
  periodicidadesMap,
) {
  if (!dataAplic || !periodicidadeDescricao) return null;
  const p = periodicidadesMap.get(
    (periodicidadeDescricao || "").trim().toLowerCase(),
  );
  if (!p || !p.dias) return null;
  // Extrair partes da string (yyyy-mm-dd) para evitar deslocamento de timezone UTC vs local
  const dateStr =
    typeof dataAplic === "string"
      ? dataAplic.slice(0, 10)
      : new Date(dataAplic).toISOString().slice(0, 10);
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day); // local midnight, sem offset UTC
  if (isNaN(d)) return null;
  d.setDate(d.getDate() + Number(p.dias));
  return d.toISOString().slice(0, 10);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Helper: parsear campo servicos (string JSON ou array)
function parseServicos(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Rotas para pets
router.post("/", petController.createPet); // Criar pet
router.get("/", petController.getAllPets); // Listar todos os pets

// GET /api/pets/:id/vacinas — vacinas aplicadas ao pet (extraídas dos agendamentos)
router.get("/:id/vacinas", async (req, res) => {
  try {
    const petId = req.params.id;
    const [agendamentos, periodicidades] = await Promise.all([
      Agendamento.findAll({
        where: { petId },
        order: [["dataAgendamento", "DESC"]],
      }),
      Periodicidade.findAll(),
    ]);
    const periodicidadesMap = new Map(
      periodicidades.map((p) => [p.descricao.trim().toLowerCase(), p]),
    );
    const vacinas = [];
    agendamentos.forEach((ag) => {
      parseServicos(ag.servicos).forEach((s) => {
        const meta = s.meta || {};
        if (meta.tipoEspecial === "vacina") {
          const dataAplic = meta.dataAplic || ag.dataAgendamento || null;
          const renovacaoLabel = meta.renovacao || meta.proximaDose || "";
          vacinas.push({
            agendamento_id: ag.id,
            grupo_id: meta.grupo_id || null,
            data_aplicacao: dataAplic,
            vacina: s.nome || meta.nome || "-",
            produto: s.nome || meta.nome || "-",
            lote: meta.lote || "-",
            dose: meta.dose || "-",
            renovacao: renovacaoLabel,
            data_renovacao:
              calcularDataRenovacao(
                dataAplic,
                renovacaoLabel,
                periodicidadesMap,
              ) ||
              renovacaoLabel ||
              "-",
            profissional: s.profissional || ag.profissional || "-",
          });
        }
      });
    });
    return res.json({ vacinas });
  } catch (e) {
    console.error("Erro GET /pets/:id/vacinas:", e);
    return res.status(500).json({ error: "Erro ao buscar vacinas" });
  }
});

// GET /api/pets/:id/vermifugos
router.get("/:id/vermifugos", async (req, res) => {
  try {
    const petId = req.params.id;
    const [agendamentos, periodicidades] = await Promise.all([
      Agendamento.findAll({
        where: { petId },
        order: [["dataAgendamento", "DESC"]],
      }),
      Periodicidade.findAll(),
    ]);
    const periodicidadesMap = new Map(
      periodicidades.map((p) => [p.descricao.trim().toLowerCase(), p]),
    );
    const vermifugos = [];
    agendamentos.forEach((ag) => {
      parseServicos(ag.servicos).forEach((s) => {
        const meta = s.meta || {};
        if (meta.tipoEspecial === "vermifugo") {
          const dataAplic = meta.dataAplic || ag.dataAgendamento || null;
          const renovacaoLabel = meta.renovacao || meta.proximaDose || "";
          vermifugos.push({
            agendamento_id: ag.id,
            grupo_id: meta.grupo_id || null,
            data_aplicacao: dataAplic,
            produto: s.nome || meta.nome || "-",
            lote: meta.lote || "-",
            dose: meta.dose || "-",
            periodicidade: renovacaoLabel || "-",
            renovacao: renovacaoLabel,
            data_renovacao:
              calcularDataRenovacao(
                dataAplic,
                renovacaoLabel,
                periodicidadesMap,
              ) ||
              renovacaoLabel ||
              "-",
            profissional: s.profissional || ag.profissional || "-",
          });
        }
      });
    });
    return res.json({ vermifugos });
  } catch (e) {
    console.error("Erro GET /pets/:id/vermifugos:", e);
    return res.status(500).json({ error: "Erro ao buscar vermifugos" });
  }
});

// GET /api/pets/:id/antiparasitarios
router.get("/:id/antiparasitarios", async (req, res) => {
  try {
    const petId = req.params.id;
    const [agendamentos, periodicidades] = await Promise.all([
      Agendamento.findAll({
        where: { petId },
        order: [["dataAgendamento", "DESC"]],
      }),
      Periodicidade.findAll(),
    ]);
    const periodicidadesMap = new Map(
      periodicidades.map((p) => [p.descricao.trim().toLowerCase(), p]),
    );
    const antiparasitarios = [];
    agendamentos.forEach((ag) => {
      parseServicos(ag.servicos).forEach((s) => {
        const meta = s.meta || {};
        if (meta.tipoEspecial === "antiparasitario") {
          const dataAplic = meta.dataAplic || ag.dataAgendamento || null;
          const renovacaoLabel = meta.renovacao || meta.proximaDose || "";
          antiparasitarios.push({
            agendamento_id: ag.id,
            grupo_id: meta.grupo_id || null,
            data_aplicacao: dataAplic,
            produto: s.nome || meta.nome || "-",
            lote: meta.lote || "-",
            dose: meta.dose || "-",
            periodicidade: renovacaoLabel || "-",
            renovacao: renovacaoLabel,
            data_renovacao:
              calcularDataRenovacao(
                dataAplic,
                renovacaoLabel,
                periodicidadesMap,
              ) ||
              renovacaoLabel ||
              "-",
            profissional: s.profissional || ag.profissional || "-",
          });
        }
      });
    });
    return res.json({ antiparasitarios });
  } catch (e) {
    console.error("Erro GET /pets/:id/antiparasitarios:", e);
    return res.status(500).json({ error: "Erro ao buscar antiparasitários" });
  }
});

// GET /api/pets/:id/historico — histórico clínico e estético do pet
// GET /api/pets/:id/documentos — todos os anexos do prontuário de todos os agendamentos do pet
router.get("/:id/documentos", async (req, res) => {
  try {
    const petId = req.params.id;
    const agendamentos = await Agendamento.findAll({
      where: { petId },
      order: [["dataAgendamento", "DESC"]],
    });
    const documentos = [];

    agendamentos.forEach((ag) => {
      let prontuario = ag.prontuario;
      if (!prontuario) return;
      if (typeof prontuario === "string") {
        try {
          prontuario = JSON.parse(prontuario);
        } catch (e) {
          return;
        }
      }
      if (!Array.isArray(prontuario)) return;

      prontuario.forEach((registro) => {
        if (registro.tipo !== "anexar") return;
        const arquivos = registro.arquivos;
        if (!Array.isArray(arquivos) || arquivos.length === 0) return;
        arquivos.forEach((f) => {
          documentos.push({
            id: f.id || null,
            name: f.name || f.nome || "Arquivo",
            url: f.url,
            type: f.type || f.mimetype || "",
            size: f.size || null,
            agendamento_id: ag.id,
            data: ag.dataAgendamento,
            servico: ag.servico || "",
          });
        });
      });
    });

    return res.json({ documentos });
  } catch (e) {
    console.error("Erro GET /pets/:id/documentos:", e);
    return res.status(500).json({ error: "Erro ao buscar documentos" });
  }
});

router.get("/:id/historico", async (req, res) => {
  try {
    const petId = req.params.id;
    const agendamentos = await Agendamento.findAll({
      where: { petId },
      order: [["dataAgendamento", "DESC"]],
    });
    const historico = [];
    const tiposEspeciais = ["vacina", "vermifugo", "antiparasitario"];
    const tipoMap = {
      vacina: "vacinas",
      vermifugo: "vermifugos",
      antiparasitario: "antiparasitas",
    };

    agendamentos.forEach((ag) => {
      const servicos = parseServicos(ag.servicos);
      if (servicos.length === 0) {
        // agendamento sem servicos detalhados
        historico.push({
          agendamento_id: ag.id,
          data: ag.dataAgendamento,
          horario: ag.horario || null,
          servico: ag.servico || "Atendimento",
          profissional: ag.profissional || "-",
          tipo: "procedimentos",
          categoria: "estetico",
        });
        return;
      }
      servicos.forEach((s) => {
        const meta = s.meta || {};
        if (tiposEspeciais.includes(meta.tipoEspecial)) {
          historico.push({
            agendamento_id: ag.id,
            data: meta.dataAplic || ag.dataAgendamento,
            horario: ag.horario || null,
            servico: s.nome || meta.nome || meta.tipoEspecial,
            profissional: s.profissional || ag.profissional || "-",
            tipo: tipoMap[meta.tipoEspecial] || meta.tipoEspecial,
            categoria: "clinico",
          });
        } else {
          historico.push({
            agendamento_id: ag.id,
            data: ag.dataAgendamento,
            horario: ag.horario || null,
            servico: s.nome || s.servico || ag.servico || "Atendimento",
            profissional: s.profissional || ag.profissional || "-",
            tipo: "procedimentos",
            categoria: "estetico",
          });
        }
      });
    });

    return res.json({ historico });
  } catch (e) {
    console.error("Erro GET /pets/:id/historico:", e);
    return res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

// POST /api/pets/:id/vacinas — registra vacina avulsa criando agendamento
router.post("/:id/vacinas", async (req, res) => {
  try {
    const petId = req.params.id;
    const { nome, dataAplic, dose, lote, renovacao, profissional, grupo_id } =
      req.body;
    if (!nome)
      return res.status(400).json({ error: "Campo nome é obrigatório" });
    const dataAg = dataAplic ? new Date(dataAplic) : new Date();
    const servicoItem = {
      id: Date.now(),
      nome,
      quantidade: 1,
      unitario: 0,
      valor: 0,
      total: 0,
      profissional: profissional || "",
      meta: {
        tipoEspecial: "vacina",
        dataAplic: dataAplic || new Date().toISOString().slice(0, 10),
        dose: dose || "",
        lote: lote || "",
        renovacao: renovacao || "",
        grupo_id: grupo_id || null,
      },
    };
    const ag = await Agendamento.create({
      petId,
      dataAgendamento: dataAg,
      horario: "00:00",
      servico: "vacina",
      servicos: [servicoItem],
      status: "concluido",
      profissional: profissional || "",
      empresa_id: req.user?.empresaId || null,
    });
    // Agendar envios de vencimento automaticamente
    dispararVencimentoSeConfigurado(ag.id, petId).catch(() => {});
    return res.status(201).json({ success: true, agendamento_id: ag.id });
  } catch (e) {
    console.error("Erro POST /pets/:id/vacinas:", e);
    return res.status(500).json({ error: "Erro ao registrar vacina" });
  }
});

// POST /api/pets/:id/vermifugos — registra vermifugo avulso
router.post("/:id/vermifugos", async (req, res) => {
  try {
    const petId = req.params.id;
    const { nome, dataAplic, dose, lote, renovacao, profissional, grupo_id } =
      req.body;
    if (!nome)
      return res.status(400).json({ error: "Campo nome é obrigatório" });
    const dataAg = dataAplic ? new Date(dataAplic) : new Date();
    const servicoItem = {
      id: Date.now(),
      nome,
      quantidade: 1,
      unitario: 0,
      valor: 0,
      total: 0,
      profissional: profissional || "",
      meta: {
        tipoEspecial: "vermifugo",
        dataAplic: dataAplic || new Date().toISOString().slice(0, 10),
        dose: dose || "",
        lote: lote || "",
        renovacao: renovacao || "",
        grupo_id: grupo_id || null,
      },
    };
    const ag = await Agendamento.create({
      petId,
      dataAgendamento: dataAg,
      horario: "00:00",
      servico: "vermifugo",
      servicos: [servicoItem],
      status: "concluido",
      profissional: profissional || "",
      empresa_id: req.user?.empresaId || null,
    });
    // Agendar envios de vencimento automaticamente
    dispararVencimentoSeConfigurado(ag.id, petId).catch(() => {});
    return res.status(201).json({ success: true, agendamento_id: ag.id });
  } catch (e) {
    console.error("Erro POST /pets/:id/vermifugos:", e);
    return res.status(500).json({ error: "Erro ao registrar vermifugo" });
  }
});

// POST /api/pets/:id/antiparasitarios — registra antiparasitário avulso
router.post("/:id/antiparasitarios", async (req, res) => {
  try {
    const petId = req.params.id;
    const { nome, dataAplic, dose, lote, renovacao, profissional, grupo_id } =
      req.body;
    if (!nome)
      return res.status(400).json({ error: "Campo nome é obrigatório" });
    const dataAg = dataAplic ? new Date(dataAplic) : new Date();
    const servicoItem = {
      id: Date.now(),
      nome,
      quantidade: 1,
      unitario: 0,
      valor: 0,
      total: 0,
      profissional: profissional || "",
      meta: {
        tipoEspecial: "antiparasitario",
        dataAplic: dataAplic || new Date().toISOString().slice(0, 10),
        dose: dose || "",
        lote: lote || "",
        renovacao: renovacao || "",
        grupo_id: grupo_id || null,
      },
    };
    const ag = await Agendamento.create({
      petId,
      dataAgendamento: dataAg,
      horario: "00:00",
      servico: "antiparasitario",
      servicos: [servicoItem],
      status: "concluido",
      profissional: profissional || "",
      empresa_id: req.user?.empresaId || null,
    });
    // Agendar envios de vencimento automaticamente
    dispararVencimentoSeConfigurado(ag.id, petId).catch(() => {});
    return res.status(201).json({ success: true, agendamento_id: ag.id });
  } catch (e) {
    console.error("Erro POST /pets/:id/antiparasitarios:", e);
    return res.status(500).json({ error: "Erro ao registrar antiparasitário" });
  }
});

// PUT /api/pets/:petId/vacinas/:agendamentoId — atualiza vacina no agendamento
router.put("/:petId/vacinas/:agendamentoId", async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const { nome, dataAplic, dose, lote, renovacao, profissional } = req.body;
    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag)
      return res.status(404).json({ error: "Agendamento não encontrado" });
    // Deep clone para garantir que o Sequelize detecte a mudança no campo JSON
    let servicos = JSON.parse(JSON.stringify(parseServicos(ag.servicos)));
    const idx = servicos.findIndex(
      (s) => s.meta && s.meta.tipoEspecial === "vacina",
    );
    if (idx >= 0) {
      if (nome) servicos[idx].nome = nome;
      if (profissional !== undefined) servicos[idx].profissional = profissional;
      const meta = servicos[idx].meta;
      if (dataAplic) meta.dataAplic = dataAplic;
      if (dose !== undefined) meta.dose = dose;
      if (lote !== undefined) meta.lote = lote;
      if (renovacao !== undefined) meta.renovacao = renovacao;
    }
    await ag.update({
      dataAgendamento: dataAplic ? new Date(dataAplic) : ag.dataAgendamento,
      profissional: profissional || ag.profissional,
      servicos,
    });
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro PUT /pets/:petId/vacinas/:agendamentoId:", e);
    return res.status(500).json({ error: "Erro ao atualizar vacina" });
  }
});

// DELETE /api/pets/:petId/vacinas/:agendamentoId — exclui agendamento de vacina
router.delete("/:petId/vacinas/:agendamentoId", async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag)
      return res.status(404).json({ error: "Agendamento não encontrado" });
    await ag.destroy();
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro DELETE /pets/:petId/vacinas/:agendamentoId:", e);
    return res.status(500).json({ error: "Erro ao excluir vacina" });
  }
});

// PUT /api/pets/:petId/vermifugos/:agendamentoId — atualiza vermífugo no agendamento
router.put("/:petId/vermifugos/:agendamentoId", async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const { nome, dataAplic, dose, lote, renovacao, profissional } = req.body;
    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag)
      return res.status(404).json({ error: "Agendamento não encontrado" });
    // Deep clone para garantir que o Sequelize detecte a mudança no campo JSON
    let servicos = JSON.parse(JSON.stringify(parseServicos(ag.servicos)));
    const idx = servicos.findIndex(
      (s) => s.meta && s.meta.tipoEspecial === "vermifugo",
    );
    if (idx >= 0) {
      if (nome) servicos[idx].nome = nome;
      if (profissional !== undefined) servicos[idx].profissional = profissional;
      const meta = servicos[idx].meta;
      if (dataAplic) meta.dataAplic = dataAplic;
      if (dose !== undefined) meta.dose = dose;
      if (lote !== undefined) meta.lote = lote;
      if (renovacao !== undefined) meta.renovacao = renovacao;
    }
    await ag.update({
      dataAgendamento: dataAplic ? new Date(dataAplic) : ag.dataAgendamento,
      profissional: profissional || ag.profissional,
      servicos,
    });
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro PUT /pets/:petId/vermifugos/:agendamentoId:", e);
    return res.status(500).json({ error: "Erro ao atualizar vermífugo" });
  }
});

// DELETE /api/pets/:petId/vermifugos/:agendamentoId — exclui agendamento de vermífugo
router.delete("/:petId/vermifugos/:agendamentoId", async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag)
      return res.status(404).json({ error: "Agendamento não encontrado" });
    await ag.destroy();
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro DELETE /pets/:petId/vermifugos/:agendamentoId:", e);
    return res.status(500).json({ error: "Erro ao excluir vermífugo" });
  }
});

// PUT /api/pets/:petId/antiparasitarios/:agendamentoId — atualiza antiparasitário no agendamento
router.put("/:petId/antiparasitarios/:agendamentoId", async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const { nome, dataAplic, dose, lote, renovacao, profissional } = req.body;
    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag)
      return res.status(404).json({ error: "Agendamento não encontrado" });
    // Deep clone para garantir que o Sequelize detecte a mudança no campo JSON
    let servicos = JSON.parse(JSON.stringify(parseServicos(ag.servicos)));
    const idx = servicos.findIndex(
      (s) => s.meta && s.meta.tipoEspecial === "antiparasitario",
    );
    if (idx >= 0) {
      if (nome) servicos[idx].nome = nome;
      if (profissional !== undefined) servicos[idx].profissional = profissional;
      const meta = servicos[idx].meta;
      if (dataAplic) meta.dataAplic = dataAplic;
      if (dose !== undefined) meta.dose = dose;
      if (lote !== undefined) meta.lote = lote;
      if (renovacao !== undefined) meta.renovacao = renovacao;
    }
    await ag.update({
      dataAgendamento: dataAplic ? new Date(dataAplic) : ag.dataAgendamento,
      profissional: profissional || ag.profissional,
      servicos,
    });
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro PUT /pets/:petId/antiparasitarios/:agendamentoId:", e);
    return res.status(500).json({ error: "Erro ao atualizar antiparasitário" });
  }
});

// DELETE /api/pets/:petId/antiparasitarios/:agendamentoId — exclui agendamento de antiparasitário
router.delete("/:petId/antiparasitarios/:agendamentoId", async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag)
      return res.status(404).json({ error: "Agendamento não encontrado" });
    await ag.destroy();
    return res.json({ success: true });
  } catch (e) {
    console.error(
      "Erro DELETE /pets/:petId/antiparasitarios/:agendamentoId:",
      e,
    );
    return res.status(500).json({ error: "Erro ao excluir antiparasitário" });
  }
});

// POST /api/pets/:petId/documentos — upload de documentos avulsos para o pet
router.post(
  "/:petId/documentos",
  upload.array("arquivos", 20),
  async (req, res) => {
    try {
      const petId = req.params.petId;
      const files = req.files || [];
      if (files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const hoje = new Date();
      const hojeStr = hoje.toISOString().slice(0, 10);
      const horarioStr = hoje.toTimeString().slice(0, 5) || "00:00";

      const arquivos = files.map((f) => ({
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: f.originalname || f.filename,
        url: `/uploads/${f.filename}`,
        type: f.mimetype || "",
        size: f.size || null,
      }));

      const prontuario = JSON.stringify([{ tipo: "anexar", arquivos }]);

      const novoAg = await Agendamento.create({
        petId: parseInt(petId),
        dataAgendamento: hojeStr,
        horario: horarioStr,
        servico: "documento",
        status: "concluido",
        prontuario,
      });

      return res.json({ success: true, agendamento_id: novoAg.id });
    } catch (e) {
      console.error("Erro POST /pets/:petId/documentos:", e);
      return res.status(500).json({ error: "Erro ao salvar documento" });
    }
  },
);

// DELETE /api/pets/:petId/documentos/:agendamentoId — remove arquivo específico do prontuário
// Se body.url === '__all__', remove todos os anexos deste agendamento
router.delete("/:petId/documentos/:agendamentoId", async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const { url } = req.body;
    const ag = await Agendamento.findByPk(agendamentoId);
    if (!ag)
      return res.status(404).json({ error: "Agendamento não encontrado" });
    let prontuario = ag.prontuario;
    if (typeof prontuario === "string") {
      try {
        prontuario = JSON.parse(prontuario);
      } catch (e) {
        prontuario = [];
      }
    }
    if (!Array.isArray(prontuario)) {
      return res.status(400).json({ error: "Prontuário inválido" });
    }
    if (url === "__all__") {
      // Remove todos os registros de tipo "anexar"
      prontuario = prontuario.filter((reg) => reg.tipo !== "anexar");
    } else {
      prontuario = prontuario
        .map((reg) => {
          if (reg.tipo !== "anexar" || !Array.isArray(reg.arquivos)) return reg;
          return {
            ...reg,
            arquivos: reg.arquivos.filter((f) => f.url !== url),
          };
        })
        .filter(
          (reg) =>
            reg.tipo !== "anexar" || (reg.arquivos && reg.arquivos.length > 0),
        );
    }
    await ag.update({ prontuario: JSON.stringify(prontuario) });
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro DELETE /pets/:petId/documentos/:agendamentoId:", e);
    return res.status(500).json({ error: "Erro ao excluir documento" });
  }
});

// POST /api/pets/:id/foto — salva base64 da foto no campo foto_url do pet
router.post("/:id/foto", async (req, res) => {
  try {
    const { id } = req.params;
    const { foto_url } = req.body;
    if (!foto_url) {
      return res.status(400).json({ error: "foto_url é obrigatório" });
    }
    const { Pet } = require("../models");
    const pet = await Pet.findByPk(id);
    if (!pet) return res.status(404).json({ error: "Pet não encontrado" });
    await pet.update({ foto_url });
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro POST /pets/:id/foto:", e);
    return res.status(500).json({ error: "Erro ao salvar foto" });
  }
});

// DELETE /api/pets/:id/foto — remove foto do pet
router.delete("/:id/foto", async (req, res) => {
  try {
    const { id } = req.params;
    const { Pet } = require("../models");
    const pet = await Pet.findByPk(id);
    if (!pet) return res.status(404).json({ error: "Pet não encontrado" });
    await pet.update({ foto_url: null });
    return res.json({ success: true });
  } catch (e) {
    console.error("Erro DELETE /pets/:id/foto:", e);
    return res.status(500).json({ error: "Erro ao remover foto" });
  }
});

// PATCH /api/pets/:id/inativar — inativa o pet sem excluir (soft delete)
router.patch("/:id/inativar", async (req, res) => {
  try {
    const { id } = req.params;
    const { Pet } = require("../models");
    const pet = await Pet.findByPk(id);
    if (!pet)
      return res
        .status(404)
        .json({ success: false, message: "Pet não encontrado" });
    await pet.update({ ativo: false });
    return res.json({ success: true, message: "Pet inativado com sucesso" });
  } catch (e) {
    console.error("Erro PATCH /pets/:id/inativar:", e);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao inativar pet" });
  }
});

// PATCH /api/pets/:id/reativar — reactive o pet (marca ativo=true)
router.patch("/:id/reativar", async (req, res) => {
  try {
    const { id } = req.params;
    const { Pet } = require("../models");
    const pet = await Pet.findByPk(id);
    if (!pet)
      return res
        .status(404)
        .json({ success: false, message: "Pet não encontrado" });
    await pet.update({ ativo: true });
    return res.json({ success: true, message: "Pet reativado com sucesso" });
  } catch (e) {
    console.error("Erro PATCH /pets/:id/reativar:", e);
    return res
      .status(500)
      .json({ success: false, message: "Erro ao reativar pet" });
  }
});

router.get("/:id", petController.getPetById); // Buscar pet por ID
router.put("/:id", petController.updatePet); // Atualizar pet
router.delete("/:id", petController.deletePet); // Excluir pet

module.exports = router;
