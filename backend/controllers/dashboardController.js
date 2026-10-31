const {
  Produto,
  Cliente,
  Pet,
  Agendamento,
  Venda,
  Entrada,
  Periodicidade,
  sequelize,
} = require("../models");
const { Op, literal } = require("sequelize");
const cache = require("../utils/simpleCache");

function handleError(res, context, error) {
  console.error(context, error);
  return res
    .status(500)
    .json({ erro: context, mensagem: error?.message, stack: error?.stack });
}

/**
 * Retorna a data de hoje no horário de Brasília (America/Sao_Paulo)
 * como string no formato YYYY-MM-DD.
 * Usa toLocaleDateString com timezone explícito para ser independente
 * do timezone do servidor Node.js.
 * @returns {string} ex: "2026-07-05"
 */
function getHojeBrasilStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// Produtos com estoque baixo ou sem estoque
exports.produtosEstoqueBaixo = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    // Usar condição literal para comparar colunas diretamente no SQL
    const condition = "(estoqueAtual = 0) OR (estoqueAtual < estoqueMinimo)";
    const whereClause = { [Op.and]: [literal(condition)] };
    if (empresaId) whereClause.empresa_id = empresaId;
    const cacheKey = `dashboard:produtosEstoqueBaixo:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const produtos = await Produto.findAll({
      attributes: ["id", "nome", "estoqueAtual", "estoqueMinimo"],
      where: whereClause,
      order: [["estoqueAtual", "ASC"]],
      limit: 50,
    });

    const result = produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      estoqueAtual: p.estoqueAtual,
      estoqueMinimo: p.estoqueMinimo,
    }));
    cache.set(cacheKey, result, 10); // cache 10s
    console.log(`Encontrados ${result.length} produtos com estoque baixo`);
    res.json(result);
  } catch (error) {
    return handleError(res, "Erro ao buscar produtos com estoque baixo", error);
  }
};

// Resumo do dashboard: clientes, agendamentos hoje, vendas hoje, faturamento e ticket médio
exports.resumo = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:resumo:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const clientesTable = Cliente.getTableName
      ? Cliente.getTableName()
      : "clientes";
    const agTable = Agendamento.getTableName
      ? Agendamento.getTableName()
      : "agendamentos";
    const vendasTable = Venda.getTableName ? Venda.getTableName() : "vendas";

    const dataBrasil = getHojeBrasilStr();

    const empresaFilter = empresaId ? "AND empresa_id = :empresaId" : "";

    // Range do dia de hoje (offset -03:00) para evitar problemas de timezone
    const hojeStart = new Date(`${dataBrasil}T00:00:00-03:00`);
    const hojeNext = new Date(hojeStart);
    hojeNext.setDate(hojeStart.getDate() + 1);
    const hojeStartStr = hojeStart.toISOString().slice(0, 19).replace("T", " ");
    const hojeNextStr = hojeNext.toISOString().slice(0, 19).replace("T", " ");

    // Primeiro dia do mês (em Brasília) para contar clientes do mês
    const hojeParts = dataBrasil.split("-");
    const ano = parseInt(hojeParts[0], 10);
    const mes = parseInt(hojeParts[1], 10);
    const inicioMesStr = `${ano}-${String(mes).padStart(2, "0")}-01`;
    // Range do mês (offset -03:00)
    const mesStart = new Date(`${inicioMesStr}T00:00:00-03:00`);
    const mesEnd = new Date(hojeNext); // até o final do dia de hoje
    const mesStartStr = mesStart.toISOString().slice(0, 19).replace("T", " ");
    const mesEndStr = mesEnd.toISOString().slice(0, 19).replace("T", " ");

    const sql = `SELECT
      (SELECT COUNT(*) FROM ${clientesTable} WHERE 1=1 ${empresaFilter}) AS clientes,
      (SELECT COUNT(*) FROM ${clientesTable} WHERE createdAt >= :inicioMes AND createdAt < :hojeNext ${empresaFilter}) AS clientesMes,
      (SELECT COUNT(*) FROM ${agTable} WHERE dataAgendamento >= :hojeStart AND dataAgendamento < :hojeNext ${empresaFilter}) AS agendamentosHoje,
      (SELECT COUNT(*) FROM ${vendasTable} WHERE data >= :hojeStart AND data < :hojeNext AND status <> 'cancelado' ${empresaFilter}) AS vendasHoje,
      (SELECT COALESCE(SUM(COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.final')) AS DECIMAL(15,2)),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.totalFinal')) AS DECIMAL(15,2)),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.total')) AS DECIMAL(15,2)),
        0
      )),0) FROM ${vendasTable} WHERE data >= :hojeStart AND data < :hojeNext AND status <> 'cancelado' ${empresaFilter}) AS vendasTotal`;

    const replacements = {
      hojeStart: hojeStartStr,
      hojeNext: hojeNextStr,
      inicioMes: mesStartStr,
    };
    if (empresaId) replacements.empresaId = empresaId;

    const rows = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    const r = rows && rows[0] ? rows[0] : {};
    const clientes = Number(r.clientes || 0);
    const clientesMes = Number(r.clientesMes || 0);
    const agendamentosHoje = Number(r.agendamentosHoje || 0);
    const vendasHoje = Number(r.vendasHoje || 0);
    const vendasTotal = parseFloat(Number(r.vendasTotal || 0));
    const ticketMedio =
      vendasHoje > 0 ? parseFloat((vendasTotal / vendasHoje).toFixed(2)) : 0;

    const out = {
      clientes,
      clientesMes,
      agendamentosHoje,
      vendasHoje,
      vendasTotal,
      ticketMedio,
    };
    cache.set(cacheKey, out, 15); // TTL 15s
    res.json(out);
  } catch (error) {
    return handleError(res, "Erro ao gerar resumo do dashboard", error);
  }
};

// Aniversariantes (Clientes e Pets) dos próximos 7 dias
exports.aniversariantes = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:aniversariantes:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const dataBrasil = getHojeBrasilStr();
    const hojeParts = dataBrasil.split("-");
    const hoje = new Date(parseInt(hojeParts[0]), parseInt(hojeParts[1]) - 1, parseInt(hojeParts[2]));

    // montar lista de MM-DD para os próximos 7 dias
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const mm = ("0" + (d.getMonth() + 1)).slice(-2);
      const dd = ("0" + d.getDate()).slice(-2);
      dias.push(`${mm}-${dd}`);
    }

    // Buscar apenas pets cujas datas batem com os próximos 7 dias (evitar carregar todos)
    const pets = await Pet.findAll({
      attributes: ["id", "nome", "data_nascimento", "cliente_id"],
      where: Object.assign(
        {
          [Op.and]: [
            { data_nascimento: { [Op.not]: null } },
            sequelize.where(
              sequelize.fn(
                "DATE_FORMAT",
                sequelize.col("data_nascimento"),
                "%m-%d",
              ),
              { [Op.in]: dias },
            ),
          ],
        },
        empresaId ? { empresa_id: empresaId } : {},
      ),
    });

    const clienteIds = Array.from(
      new Set(pets.map((p) => p.cliente_id).filter(Boolean)),
    );
    const clientesMap = new Map();
    if (clienteIds.length > 0) {
      const clientes = await Cliente.findAll({
        attributes: ["id", "nome"],
        where: { id: clienteIds },
      });
      clientes.forEach((c) => clientesMap.set(c.id, c.nome));
    }

    const petsAniversariantes = pets.map((pet) => ({
      id: pet.id,
      nome: pet.nome,
      dataNascimento: pet.data_nascimento,
      clienteNome: clientesMap.get(pet.cliente_id) || null,
    }));

    // Buscar clientes aniversariantes (somente colunas necessárias)
    const clientes = await Cliente.findAll({
      attributes: ["id", "nome", "data_nascimento"],
      where: Object.assign(
        {
          [Op.and]: [
            { data_nascimento: { [Op.not]: null } },
            sequelize.where(
              sequelize.fn(
                "DATE_FORMAT",
                sequelize.col("data_nascimento"),
                "%m-%d",
              ),
              { [Op.in]: dias },
            ),
          ],
        },
        empresaId ? { empresa_id: empresaId } : {},
      ),
    });

    const clientesAniversariantes = clientes.map((c) => ({
      id: c.id,
      nome: c.nome,
      dataNascimento: c.data_nascimento,
    }));

    const out = {
      pets: petsAniversariantes,
      clientes: clientesAniversariantes,
    };
    cache.set(cacheKey, out, 10);
    res.json(out);
  } catch (error) {
    return handleError(res, "Erro ao buscar aniversariantes", error);
  }
};

// Oportunidades de venda (produtos que clientes já devem estar precisando)
exports.oportunidadesVenda = async (req, res) => {
  try {
    // Buscar vendas dos últimos 90 dias para analisar padrões
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 90);
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:oportunidadesVenda:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const vendas = await Venda.findAll({
      attributes: ["id", "clienteId", "itens", "data"],
      where: Object.assign(
        { data: { [Op.gte]: dataLimite }, status: { [Op.ne]: "cancelado" } },
        empresaId ? { empresa_id: empresaId } : {},
      ),
      order: [["data", "DESC"]],
      limit: 100,
    });

    const oportunidadesMap = new Map();
    const clienteIds = new Set();

    vendas.forEach((venda) => {
      if (venda.clienteId) clienteIds.add(venda.clienteId);
      if (!venda.itens || !Array.isArray(venda.itens)) return;
      venda.itens.forEach((item) => {
        const key = `${venda.clienteId}-${item.nome || item.produto}`;
        if (!oportunidadesMap.has(key)) {
          const diasDesdeCompra = Math.floor(
            (new Date() - new Date(venda.data)) / (1000 * 60 * 60 * 24),
          );
          if (diasDesdeCompra >= 30) {
            oportunidadesMap.set(key, {
              clienteId: venda.clienteId,
              produtoNome:
                item.nome ||
                (item.produto && item.produto.nome) ||
                item.produto ||
                "Produto",
              ultimaCompra: venda.data,
              quantidade: item.quantidade || 1,
              diasDesdeCompra,
            });
          }
        }
      });
    });

    // Buscar nomes dos clientes em lote
    const clientesMap = new Map();
    if (clienteIds.size > 0) {
      const clientes = await Cliente.findAll({
        attributes: ["id", "nome"],
        where: { id: Array.from(clienteIds) },
      });
      clientes.forEach((c) => clientesMap.set(c.id, c.nome));
    }

    const oportunidades = Array.from(oportunidadesMap.values())
      .map((o) => ({
        clienteNome: clientesMap.get(o.clienteId) || "Cliente não identificado",
        produtoNome: o.produtoNome,
        ultimaCompra: o.ultimaCompra,
        quantidade: o.quantidade,
        diasDesdeCompra: o.diasDesdeCompra,
      }))
      .sort((a, b) => b.diasDesdeCompra - a.diasDesdeCompra)
      .slice(0, 20);

    cache.set(cacheKey, oportunidades, 10);
    res.json(oportunidades);
  } catch (error) {
    return handleError(res, "Erro ao buscar oportunidades de venda", error);
  }
};

// Taxi Dog (agendamentos com serviço de transporte para hoje)
exports.levaTraz = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:levaTraz:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const dataBrasil = getHojeBrasilStr();

    // Usar range com offset -03:00 (mesma estratégia do GET /api/agendamentos)
    // para evitar problemas de timezone quando o MySQL está em UTC.
    const start = new Date(`${dataBrasil}T00:00:00-03:00`);
    const next = new Date(start);
    next.setDate(start.getDate() + 1);

    // Buscar agendamentos do dia com atributos mínimos
    const agendamentos = await Agendamento.findAll({
      attributes: [
        "id",
        "horario",
        "status",
        "observacoes",
        "servicos",
        "dataAgendamento",
        "taxidog",
      ],
      where: Object.assign(
        {
          dataAgendamento: { [Op.gte]: start, [Op.lt]: next },
        },
        empresaId ? { empresa_id: empresaId } : {},
      ),
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["id", "nome", "cliente_id"],
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: [
                "id",
                "nome",
                "endereco",
                "numero",
                "complemento",
                "bairro",
                "cidade",
                "estado",
                "cep",
              ],
            },
          ],
        },
      ],
      order: [["horario", "ASC"]],
    });

    // Filtrar agendamentos com taxidog ativado OU que mencionam transporte nas observações
    const levaTrazList = agendamentos
      .filter((ag) => {
        if (ag.taxidog) return true;
        const obs = (ag.observacoes || "").toLowerCase();
        return (
          obs.includes("leva") ||
          obs.includes("traz") ||
          obs.includes("buscar") ||
          obs.includes("busca") ||
          obs.includes("transporte") ||
          obs.includes("entregar")
        );
      })
      .map((ag) => {
        const obs = (ag.observacoes || "").toLowerCase();
        let tipo = "buscar";
        if (obs.includes("entregar") || obs.includes("levar")) {
          tipo = "entregar";
        }

        // Formatador simples de endereço completo
        const cliente = ag.pet?.cliente || {};
        const partes = [];
        if (cliente.endereco) partes.push(cliente.endereco);
        if (cliente.numero) partes.push(String(cliente.numero));
        let complemento = cliente.complemento
          ? String(cliente.complemento).trim()
          : "";
        const bairro = cliente.bairro ? String(cliente.bairro).trim() : "";
        const cidade = cliente.cidade ? String(cliente.cidade).trim() : "";
        const estado = cliente.estado ? String(cliente.estado).trim() : "";
        if (complemento) partes.push(complemento);
        const enderecoRuaNum = partes.join(", ");
        const localidade = [
          bairro,
          cidade ? cidade + (estado ? "/" + estado : "") : null,
        ]
          .filter(Boolean)
          .join(" • ");
        const enderecoCompleto = [enderecoRuaNum, localidade]
          .filter(Boolean)
          .join(" — ");

        return {
          horario: ag.horario || "Horário não definido",
          petNome: ag.pet?.nome || "Pet não identificado",
          clienteNome: ag.pet?.cliente?.nome || "Cliente não identificado",
          endereco:
            enderecoCompleto ||
            ag.pet?.cliente?.endereco ||
            "Endereço não cadastrado",
          servicos: ag.servicos || ag.servico || "",
          status: ag.status || "agendado",
          tipo,
        };
      });

    res.json(levaTrazList);
  } catch (error) {
    return handleError(res, "Erro ao buscar Taxi Dog", error);
  }
};

// Produtos próximos do vencimento
exports.produtosVencimento = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    // Como o campo validade é STRING, vamos buscar todos os produtos que têm validade
    // e filtrar/ordenar no JavaScript
    const whereVenc = {
      validade: { [Op.not]: null },
      estoqueAtual: { [Op.gt]: 0 },
    };
    if (empresaId) whereVenc.empresa_id = empresaId;
    // Processar em batches para evitar carregar toda a tabela na memória
    const limitBatch = 2000;
    let offset = 0;
    const hoje = new Date();
    const candidatos = [];
    const maxCollect = 2000; // limite de segurança para não acumular milhões

    while (true) {
      const batch = await Produto.findAll({
        where: whereVenc,
        attributes: ["id", "nome", "validade", "estoqueAtual"],
        order: [["id", "ASC"]],
        limit: limitBatch,
        offset,
      });
      if (!batch || batch.length === 0) break;

      for (const produto of batch) {
        const validadeStr = produto.validade;
        let diasRestantes = null;
        if (validadeStr && validadeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          const dataValidade = new Date(validadeStr);
          if (!isNaN(dataValidade.getTime())) {
            diasRestantes = Math.floor(
              (dataValidade - hoje) / (1000 * 60 * 60 * 24),
            );
          }
        }
        if (
          diasRestantes !== null &&
          diasRestantes <= 90 &&
          diasRestantes >= 0
        ) {
          candidatos.push({ ...produto.toJSON(), diasRestantes });
        }
      }

      offset += batch.length;
      if (offset > 100000) break; // proteção adicional
      if (candidatos.length >= maxCollect) break; // já temos muitos candidatos
    }

    const produtosComValidade = candidatos
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 50);

    res.json(produtosComValidade);
  } catch (error) {
    return handleError(
      res,
      "Erro ao buscar produtos próximos do vencimento",
      error,
    );
  }
};

// Contagem de vendas realizadas hoje
exports.vendasHoje = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const dataBrasil = getHojeBrasilStr();

    if (empresaId) {
      const sql = `SELECT COUNT(*) AS count FROM vendas WHERE DATE(data) = :dataBrasil AND status <> 'cancelado' AND empresa_id = :empresaId`;
      const [rows] = await sequelize.query(sql, {
        replacements: { dataBrasil, empresaId },
        type: sequelize.QueryTypes.SELECT,
      });
      return res.json({ count: Number(rows?.count || 0) });
    }

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS count FROM vendas WHERE DATE(data) = :dataBrasil AND status <> 'cancelado'`,
      { replacements: { dataBrasil }, type: sequelize.QueryTypes.SELECT },
    );
    res.json({ count: Number(rows?.count || 0) });
  } catch (error) {
    return handleError(res, "Erro ao buscar contagem de vendas hoje", error);
  }
};

// Ticket médio das vendas do dia
exports.ticketMedio = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const dataBrasil = getHojeBrasilStr();
    const vendasTable = Venda.getTableName ? Venda.getTableName() : "vendas";

    const sql = `SELECT totais FROM ${vendasTable} WHERE DATE(data) = :dataBrasil AND status <> 'cancelado' ${empresaId ? "AND empresa_id = :empresaId" : ""}`;
    const replacements = { dataBrasil };
    if (empresaId) replacements.empresaId = empresaId;

    const vendas = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    if (!vendas || vendas.length === 0) {
      return res.json({ ticketMedio: 0 });
    }

    let soma = 0;
    let contador = 0;

    vendas.forEach((v) => {
      try {
        let total = 0;
        if (v.totais) {
          const totaisObj =
            typeof v.totais === "string" ? JSON.parse(v.totais) : v.totais;
          total =
            parseFloat(
              totaisObj.final || totaisObj.totalFinal || totaisObj.total || 0,
            ) || 0;
        }
        if (!isNaN(total)) {
          soma += total;
          contador++;
        }
      } catch (err) {
        // ignorar vendas com formato inválido
      }
    });

    const ticket = contador > 0 ? soma / contador : 0;

    res.json({ ticketMedio: parseFloat(ticket.toFixed(2)) });
  } catch (error) {
    return handleError(res, "Erro ao calcular ticket médio", error);
  }
};

// Periódicos: pets com vacinas/vermífugos/antiparasitários a renovar nos próximos 7 dias
exports.periodicos = async (req, res) => {
  try {
    const dataBrasil = getHojeBrasilStr();
    const hojeParts = dataBrasil.split("-");
    const hoje = new Date(parseInt(hojeParts[0]), parseInt(hojeParts[1]) - 1, parseInt(hojeParts[2]));
    const em7Dias = new Date(hoje);
    em7Dias.setDate(em7Dias.getDate() + 7);

    const empresaId = req.user?.empresaId;

    // Buscar agendamentos do último ano com servicos populados
    const desde = new Date();
    desde.setFullYear(desde.getFullYear() - 1);

    const [agendamentos, periodicidades] = await Promise.all([
      Agendamento.findAll({
        where: { dataAgendamento: { [Op.gte]: desde } },
        include: [
          {
            model: Pet,
            as: "pet",
            attributes: ["id", "nome", "empresa_id"],
            where: empresaId ? { empresa_id: empresaId } : {},
            required: true,
            include: [
              { model: Cliente, as: "cliente", attributes: ["id", "nome"] },
            ],
          },
        ],
        order: [["dataAgendamento", "DESC"]],
      }),
      Periodicidade.findAll(),
    ]);

    const periodicidadesMap = new Map(
      periodicidades.map((p) => [p.descricao.trim().toLowerCase(), p]),
    );

    function parseServicos(raw) {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      try {
        return JSON.parse(raw);
      } catch (_) {
        return [];
      }
    }

    function calcDataRenovacao(dataAplic, renovacaoLabel) {
      if (!renovacaoLabel) return null;
      const label = renovacaoLabel.trim();

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(label)) {
        const [d, m, y] = label.split("/").map(Number);
        return new Date(y, m - 1, d);
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        const [y, m, d] = label.split("-").map(Number);
        return new Date(y, m - 1, d);
      }

      if (!dataAplic) return null;
      const p = periodicidadesMap.get(label.toLowerCase());
      if (!p || !p.dias) return null;
      const dateStr =
        typeof dataAplic === "string"
          ? dataAplic.slice(0, 10)
          : new Date(dataAplic).toISOString().slice(0, 10);
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + Number(p.dias));
      return dt;
    }

    const resultMap = new Map();

    agendamentos.forEach((ag) => {
      if (!ag.pet) return;
      parseServicos(ag.servicos).forEach((s) => {
        const meta = s.meta || {};
        if (
          !["vacina", "vermifugo", "antiparasitario"].includes(
            meta.tipoEspecial,
          )
        )
          return;

        const dataAplic = meta.dataAplic || ag.dataAgendamento;
        const renovacaoLabel = meta.renovacao || meta.proximaDose || "";
        const dataRenovacao = calcDataRenovacao(dataAplic, renovacaoLabel);
        if (!dataRenovacao) return;

        if (dataRenovacao < hoje || dataRenovacao > em7Dias) return;

        const produtoNome = s.nome || meta.nome || meta.tipoEspecial;
        const key = `${ag.pet.id}-${meta.tipoEspecial}-${produtoNome}`;

        if (resultMap.has(key)) {
          const existing = resultMap.get(key);
          if (dataRenovacao > new Date(existing.dataRenovacao)) return;
        }

        resultMap.set(key, {
          petId: ag.pet.id,
          petNome: ag.pet.nome,
          clienteNome: ag.pet.cliente?.nome || "N/A",
          clienteId: ag.pet.cliente?.id || null,
          servico: produtoNome,
          tipoEspecial: meta.tipoEspecial,
          dataRenovacao: dataRenovacao.toISOString().split("T")[0],
        });
      });
    });

    const resultado = Array.from(resultMap.values()).sort(
      (a, b) => new Date(a.dataRenovacao) - new Date(b.dataRenovacao),
    );

    res.json(resultado);
  } catch (error) {
    return handleError(res, "Erro ao buscar periódicos", error);
  }
};

// Contas a pagar vencendo hoje
exports.contasAPagarHoje = async (req, res) => {
  try {
    const dataBrasil = getHojeBrasilStr();

    const empresaId = req.user?.empresaId;

    const whereEmpresa = empresaId
      ? { [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : {};

    const entradas = await Entrada.findAll({
      where: Object.assign(
        {
          situacao: { [Op.in]: ["pendente", "concluido"] },
          dataEntrada: dataBrasil,
        },
        whereEmpresa,
      ),
      order: [["valorTotal", "DESC"]],
      limit: 20,
    });

    const contas = entradas.map((e) => ({
      id: e.id,
      fornecedor: e.fornecedor || "Não informado",
      numero: e.numero || "",
      valorTotal: parseFloat(e.valorTotal || 0),
      dataEmissao: e.dataEmissao,
      dataEntrada: e.dataEntrada,
      situacao: e.situacao,
    }));

    res.json(contas);
  } catch (error) {
    return handleError(res, "Erro ao buscar contas a pagar", error);
  }
};

// Indicadores do atendimento (agendados, checkin, prontos)
// Pets no estabelecimento agrupados por status (mobile dashboard)
exports.petsNoEstabelecimento = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      return res.status(403).json({ erro: "Empresa não identificada" });
    }

    const cacheKey = `dashboard:petsNoEstab:${empresaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const dataBrasil = getHojeBrasilStr();

    // Usar range com offset -03:00 (mesma estratégia do GET /api/agendamentos)
    // para evitar problemas de timezone quando o MySQL está em UTC.
    const start = new Date(`${dataBrasil}T00:00:00-03:00`);
    const next = new Date(start);
    next.setDate(start.getDate() + 1);
    const startStr = start.toISOString().slice(0, 19).replace("T", " ");
    const nextStr = next.toISOString().slice(0, 19).replace("T", " ");

    const table =
      typeof Agendamento.getTableName === "function"
        ? Agendamento.getTableName()
        : "agendamentos";

    // Contagens por status
    const sql = `SELECT 
      SUM(CASE WHEN status='agendado'  THEN 1 ELSE 0 END) AS agendados,
      SUM(CASE WHEN status='checkin'   THEN 1 ELSE 0 END) AS checkin,
      SUM(CASE WHEN status='pronto'    THEN 1 ELSE 0 END) AS pronto,
      SUM(CASE WHEN status='concluido' THEN 1 ELSE 0 END) AS concluido
      FROM ${table}
      WHERE dataAgendamento >= :start
        AND dataAgendamento < :next
        AND empresa_id = :empresaId
        AND status NOT IN ('cancelado')`;

    const [rows] = await sequelize.query(sql, {
      replacements: { start: startStr, next: nextStr, empresaId },
      type: sequelize.QueryTypes.SELECT,
    });

    // Lista dos agendamentos ativos (checkin + pronto) com dados do pet
    const agendamentosAtivos = await Agendamento.findAll({
      where: {
        dataAgendamento: { [Op.gte]: start, [Op.lt]: next },
        empresa_id: empresaId,
        status: { [Op.in]: ["checkin", "pronto"] },
      },
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["id", "nome", "raca", "foto_url"],
          required: false,
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
      attributes: ["id", "horario", "status", "servico"],
      order: [["horario", "ASC"]],
      limit: 50,
    });

    const result = {
      agendados: Number(rows?.agendados || 0),
      checkin: Number(rows?.checkin || 0),
      pronto: Number(rows?.pronto || 0),
      concluido: Number(rows?.concluido || 0),
      lista: agendamentosAtivos.map((ag) => ({
        id: ag.id,
        horario: ag.horario,
        status: ag.status,
        servico: ag.servico,
        cliente: ag.pet?.cliente?.nome || null,
        pet: ag.pet
          ? {
              id: ag.pet.id,
              nome: ag.pet.nome,
              raca: ag.pet.raca,
              fotoUrl: ag.pet.foto_url,
            }
          : null,
      })),
    };

    cache.set(cacheKey, result, 8);
    res.json(result);
  } catch (error) {
    return handleError(res, "Erro ao buscar pets no estabelecimento", error);
  }
};

// Faturamento por períodos (dia, semana, mês) - usado pelo Mobile Dashboard
// Soma de vendas pagas + agendamentos concluídos (serviços de agendamento-detalhes)
exports.faturamentoPeriodos = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      return res.status(403).json({ erro: "Empresa não identificada" });
    }

    const dataBrasil = getHojeBrasilStr();
    const hojeParts = dataBrasil.split("-").map(Number);
    const ano = hojeParts[0];
    const mes = hojeParts[1];
    const dia = hojeParts[2];

    // Range do dia de hoje (offset -03:00)
    const hojeStart = new Date(`${dataBrasil}T00:00:00-03:00`);
    const hojeNext = new Date(hojeStart);
    hojeNext.setDate(hojeStart.getDate() + 1);

    // Range de ontem
    const ontemDate = new Date(hojeStart);
    ontemDate.setDate(hojeStart.getDate() - 1);
    const ontemNext = new Date(hojeStart); // mesmo que hojeStart

    // Range da semana (domingo a sábado)
    const diaSemana = hojeStart.getDay(); // 0=dom
    const semanaStart = new Date(hojeStart);
    semanaStart.setDate(hojeStart.getDate() - diaSemana);
    const semanaNext = new Date(semanaStart);
    semanaNext.setDate(semanaStart.getDate() + 7);

    // Range do mês
    const mesStart = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
    // Ajustar para -03:00 subtraindo 3h
    mesStart.setHours(mesStart.getHours() - 3);
    const mesNext = new Date(ano, mes, 1, 0, 0, 0, 0);
    mesNext.setHours(mesNext.getHours() - 3);

    const vendasTable = Venda.getTableName ? Venda.getTableName() : "vendas";
    const agendamentosTable = Agendamento.getTableName ? Agendamento.getTableName() : "agendamentos";

    // Função auxiliar para somar faturamento de vendas + agendamentos em um range
    // Usa JSON_EXTRACT do total dos totais em vez de totalPago (que pode estar zerado)
    async function somarFaturamento(inicio, fim) {
      // Somar vendas com status pago/parcial
      const sqlVendas = `SELECT COALESCE(SUM(COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.final')) AS DECIMAL(15,2)),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.totalFinal')) AS DECIMAL(15,2)),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.total')) AS DECIMAL(15,2)),
        0
      )),0) AS total FROM ${vendasTable}
      WHERE empresa_id = :empresaId
        AND data >= :inicio
        AND data < :fim
        AND status IN ('pago', 'parcial')`;

      // Somar agendamentos concluídos (usar totalPago como fallback, ou valor)
      const sqlAgendamentos = `SELECT COALESCE(SUM(COALESCE(totalPago, 0)),0) AS total FROM ${agendamentosTable}
      WHERE empresa_id = :empresaId
        AND dataAgendamento >= :inicio
        AND dataAgendamento < :fim
        AND status = 'concluido'`;

      const replacements = { empresaId, inicio: inicio.toISOString().slice(0, 19).replace("T", " "), fim: fim.toISOString().slice(0, 19).replace("T", " ") };

      const [vendasResult, agendamentosResult] = await Promise.all([
        sequelize.query(sqlVendas, { replacements, type: sequelize.QueryTypes.SELECT }),
        sequelize.query(sqlAgendamentos, { replacements, type: sequelize.QueryTypes.SELECT }),
      ]);

      const vendasTotal = parseFloat(vendasResult[0]?.total || 0);
      const agendamentosTotal = parseFloat(agendamentosResult[0]?.total || 0);
      return vendasTotal + agendamentosTotal;
    }

    // Range do ano (01/01 até hoje)
    const anoStart = new Date(ano, 0, 1, 0, 0, 0, 0);
    anoStart.setHours(anoStart.getHours() - 3);
    const anoEnd = new Date(hojeStart);
    anoEnd.setDate(anoEnd.getDate() + 1); // até o final do dia de hoje

    const [faturamentoHoje, faturamentoOntem, faturamentoSemana, faturamentoMes, faturamentoAno] =
      await Promise.all([
        somarFaturamento(hojeStart, hojeNext),
        somarFaturamento(ontemDate, ontemNext),
        somarFaturamento(semanaStart, semanaNext),
        somarFaturamento(mesStart, mesNext),
        somarFaturamento(anoStart, anoEnd),
      ]);

    // Buscar últimas 5 movimentações (vendas pagas) com cliente e valor
    const sqlUltimas = `SELECT id, cliente, totalPago, totais, data FROM ${vendasTable}
      WHERE empresa_id = :empresaId
        AND status = 'pago'
      ORDER BY data DESC
      LIMIT 5`;

    const ultimasRows = await sequelize.query(sqlUltimas, {
      replacements: { empresaId },
      type: sequelize.QueryTypes.SELECT,
    });

    const ultimasMovimentacoes = ultimasRows.map((v) => {
      let valor = parseFloat(v.totalPago || 0);
      if (!valor && v.totais) {
        try {
          const totaisObj = typeof v.totais === "string" ? JSON.parse(v.totais) : v.totais;
          valor = parseFloat(totaisObj.final || totaisObj.totalFinal || totaisObj.total || 0) || 0;
        } catch (_) {}
      }
      // Formatar data no padrão brasileiro
      let dataStr = "";
      if (v.data) {
        try {
          const d = new Date(v.data);
          dataStr = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        } catch (_) {
          dataStr = String(v.data).slice(0, 10);
        }
      }
      return {
        id: v.id,
        cliente: v.cliente || "Cliente",
        valor,
        data: dataStr,
      };
    });

    res.json({
      faturamentoHoje,
      faturamentoOntem,
      faturamentoSemana,
      faturamentoMes,
      faturamentoAno,
      ultimasMovimentacoes,
    });
  } catch (error) {
    return handleError(res, "Erro ao buscar faturamento por períodos", error);
  }
};

exports.indicadoresAtendimento = async (req, res) => {
  try {
    const dataBrasil = getHojeBrasilStr();

    const empresaFilter = req.user?.empresaId
      ? "AND empresa_id = :empresaId"
      : "";

    // Usar range com offset -03:00 (mesma estratégia do GET /api/agendamentos)
    // para evitar problemas de timezone quando o MySQL está em UTC.
    const start = new Date(`${dataBrasil}T00:00:00-03:00`);
    const next = new Date(start);
    next.setDate(start.getDate() + 1);

    const table =
      typeof Agendamento.getTableName === "function"
        ? Agendamento.getTableName()
        : "agendamentos";
    const sql = `SELECT 
      SUM(CASE WHEN status='agendado' THEN 1 ELSE 0 END) AS agendados,
      SUM(CASE WHEN status='checkin' THEN 1 ELSE 0 END) AS checkin,
      SUM(CASE WHEN status='pronto' THEN 1 ELSE 0 END) AS prontos
      FROM ${table}
      WHERE dataAgendamento >= :start
        AND dataAgendamento < :next
        AND status NOT IN ('cancelado')
        ${empresaFilter}`;

    const replacements = {
      start: start.toISOString().slice(0, 19).replace("T", " "),
      next: next.toISOString().slice(0, 19).replace("T", " "),
    };
    if (req.user?.empresaId) replacements.empresaId = req.user.empresaId;

    const [rows] = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    const agendados = Number(rows.agendados || 0);
    const checkin = Number(rows.checkin || 0);
    const prontos = Number(rows.prontos || 0);

    res.json({ agendados, checkin, prontos });
  } catch (error) {
    return handleError(res, "Erro ao buscar indicadores", error);
  }
};
