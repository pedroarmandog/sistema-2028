const { Venda } = require("../models/Venda");
const { Op } = require("sequelize");
const Produto = require("../models/Produto");
const { Profissional } = require("../models/Profissional");
const { Cliente } = require("../models/Cliente");

// Listar todas as vendas
exports.listarVendas = async (req, res) => {
  try {
    const { caixaId, dataInicio, dataFim } = req.query;

    // Construir filtros dinâmicos
    const where = {};

    // Filtro obrigatório por empresa
    if (req.user?.empresaId) {
      where.empresa_id = req.user.empresaId;
    }

    // Filtro por data — usar DATE() do MySQL para ignorar timezone
    if (dataInicio && dataFim) {
      // As datas já vêm no formato YYYY-MM-DD do frontend.
      // Em vez de converter para Date objects (que são interpretados em UTC),
      // usamos literal com DATE() do MySQL para comparar apenas a data.
      const { literal } = require("sequelize");
      where[Op.and] = [
        literal(`DATE(data) >= '${dataInicio}'`),
        literal(`DATE(data) <= '${dataFim}'`),
      ];
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 500, 5000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const vendas = await Venda.findAll({
      attributes: [
        "id",
        "data",
        "totalPago",
        "cliente",
        "clienteId",
        "status",
        "empresa_id",
        "itens",
        "totais",
        "pagamentos",
      ],
      where,
      order: [["data", "DESC"]],
      limit,
      offset,
    });

    res.json({ vendas });
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    res.status(500).json({ erro: "Erro ao listar vendas" });
  }
};

// Buscar venda por ID
exports.buscarVenda = async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer consulta
    if (!req.user?.empresaId) {
      console.error(
        `[buscarVenda] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        erro: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const venda = await Venda.findByPk(req.params.id);
    if (!venda) {
      return res.status(404).json({ erro: "Venda não encontrada" });
    }

    // Isolamento multi-tenant: verificar que a venda pertence à empresa logada
    if (venda.empresa_id !== req.user.empresaId) {
      console.warn(
        `[buscarVenda] TENTATIVA DE ACESSO CRUZADO: ` +
        `usuario=${req.user.id} empresa=${req.user.empresaId} ` +
        `tentou acessar venda=${req.params.id} empresa=${venda.empresa_id}`
      );
      return res.status(403).json({ erro: "Acesso negado" });
    }

    res.json(venda);
  } catch (error) {
    console.error("Erro ao buscar venda:", error);
    res.status(500).json({ erro: "Erro ao buscar venda" });
  }
};

// Criar venda
exports.criarVenda = async (req, res) => {
  try {
    const dados = { ...req.body };

    // --- Enriquecer itens com produto.id e perfilComissao via nome ---
    if (Array.isArray(dados.itens) && dados.itens.length > 0) {
      // Coletar nomes sem id para fazer lookup em lote
      const nomesSemId = [
        ...new Set(
          dados.itens
            .filter((it) => !(it.produto && it.produto.id))
            .map((it) =>
              (
                (it.produto && it.produto.nome) ||
                it.nome ||
                it.descricao ||
                ""
              ).trim(),
            )
            .filter(Boolean),
        ),
      ];

      let mapaProdNome = {};
      if (nomesSemId.length > 0) {
        const prods = await Produto.findAll({
          where: { nome: { [Op.in]: nomesSemId } },
          attributes: ["id", "nome", "perfilComissao", "tipo"],
        }).catch(() => []);
        prods.forEach((p) => {
          // indexar por nome lowercase para busca case-insensitive
          mapaProdNome[p.nome.trim().toLowerCase()] = p;
        });
      }

      dados.itens = dados.itens.map((item) => {
        const prod = item.produto || {};
        if (prod.id) return item; // já tem id, não altera

        const nomeProd = (
          prod.nome ||
          item.nome ||
          item.descricao ||
          ""
        ).trim();
        const prodDB = mapaProdNome[nomeProd.toLowerCase()];
        if (!prodDB) return item;

        return {
          ...item,
          produto: {
            ...prod,
            id: prodDB.id,
            tipo: prod.tipo || prodDB.tipo || null,
            perfilComissao:
              prodDB.perfilComissao || prod.perfilComissao || null,
          },
          perfilComissao: prodDB.perfilComissao || item.perfilComissao || null,
        };
      });
    }

    // --- Resolver profissionalId pelo nome se não vier preenchido ---
    if (!dados.profissionalId && dados.profissional) {
      const prof = await Profissional.findOne({
        where: { nome: dados.profissional.trim() },
        attributes: ["id"],
      }).catch(() => null);
      if (prof) dados.profissionalId = prof.id;
    }

    // --- Resolver clienteId pelo nome se não vier preenchido ---
    if (!dados.clienteId && dados.cliente) {
      const cli = await Cliente.findOne({
        where: { nome: dados.cliente.trim() },
        attributes: ["id"],
      }).catch(() => null);
      if (cli) dados.clienteId = cli.id;
    }

    const venda = await Venda.create({
      ...dados,
      empresa_id: req.user?.empresaId || null,
    });

    // --- Processar pagamento via Haver (debitar saldo do cliente) ---
    try {
      const pagamentos = Array.isArray(dados.pagamentos)
        ? dados.pagamentos
        : [];
      const pagHaver = pagamentos.filter(
        (p) =>
          String(p.forma || p.tipo || "").toLowerCase() === "haver" &&
          parseFloat(p.valor) > 0,
      );

      if (pagHaver.length > 0 && dados.clienteId) {
        const MovimentoHaver = require("../models/MovimentoHaver");
        const clienteId = dados.clienteId;
        const empresaId = req.user?.empresaId;
        const usuarioId = req.user?.id;
        const usuarioNome = req.user?.nome || req.user?.email || null;

        const clienteRecord = await Cliente.findOne({
          where: {
            id: clienteId,
            ...(empresaId ? { empresa_id: empresaId } : {}),
          },
        }).catch(() => null);

        if (clienteRecord) {
          let saldoAtual = parseFloat(clienteRecord.saldo_haver) || 0;

          for (const pag of pagHaver) {
            const valorPag = parseFloat(pag.valor);
            if (valorPag <= 0) continue;
            const valorDebitado = Math.min(valorPag, saldoAtual);
            if (valorDebitado <= 0) continue;

            const novoSaldo = saldoAtual - valorDebitado;
            await clienteRecord.update({ saldo_haver: novoSaldo });
            saldoAtual = novoSaldo;

            await MovimentoHaver.create({
              clienteId: clienteRecord.id,
              clienteNome: clienteRecord.nome,
              tipo: "saida",
              operacao: `Utilizado em Venda #${venda.id}`,
              valor: valorDebitado,
              saldoApos: novoSaldo,
              observacao: null,
              usuarioId: usuarioId || null,
              usuarioNome: usuarioNome,
              vendaId: venda.id,
              empresa_id: empresaId || null,
              data: new Date(),
            });
          }
        }
      }
    } catch (haverErr) {
      console.warn(
        "[Venda] Erro ao processar haver:",
        haverErr && haverErr.message,
      );
    }

    // --- Processar pagamento via Crediário (registrar débito no crediário do cliente) ---
    try {
      const pagamentos = Array.isArray(dados.pagamentos)
        ? dados.pagamentos
        : [];
      const pagCrediario = pagamentos.filter(
        (p) =>
          String(p.forma || p.tipo || "").toLowerCase() === "crediario" &&
          parseFloat(p.valor) > 0,
      );

      if (pagCrediario.length > 0 && dados.clienteId) {
        const MovimentoCrediario = require("../models/MovimentoCrediario");
        const clienteId = dados.clienteId;
        const empresaId = req.user?.empresaId;
        const usuarioId = req.user?.id;
        const usuarioNome = req.user?.nome || req.user?.email || null;

        const clienteRecord = await Cliente.findOne({
          where: {
            id: clienteId,
            ...(empresaId ? { empresa_id: empresaId } : {}),
          },
        }).catch(() => null);

        if (clienteRecord) {
          let saldoAtual = parseFloat(clienteRecord.saldo_crediario) || 0;

          for (const pag of pagCrediario) {
            const valorPag = parseFloat(pag.valor);
            if (valorPag <= 0) continue;

            const novoSaldo = saldoAtual + valorPag;
            await clienteRecord.update({ saldo_crediario: novoSaldo });
            saldoAtual = novoSaldo;

            await MovimentoCrediario.create({
              clienteId: clienteRecord.id,
              clienteNome: clienteRecord.nome,
              tipo: "debito",
              operacao: `Venda #${venda.id} no crediário`,
              valor: valorPag,
              saldoApos: novoSaldo,
              observacao: null,
              usuarioId: usuarioId || null,
              usuarioNome: usuarioNome,
              vendaId: venda.id,
              empresa_id: empresaId || null,
              data: new Date(),
            });
          }
        }
      }
    } catch (crediarioErr) {
      console.warn(
        "[Venda] Erro ao processar crediário:",
        crediarioErr && crediarioErr.message,
      );
    }

    // Criar lembretes automáticos de produto recorrente (se cliente tiver ativado)
    try {
      const { criarLembretesDeVenda } = require("./produtoLembreteController");
      await criarLembretesDeVenda(
        venda.toJSON ? venda.toJSON() : venda,
        req.user?.empresaId || 1,
      );
    } catch (lembreteErr) {
      // Não bloquear a venda se o lembrete falhar
      console.warn(
        "[Venda] Erro ao criar lembretes de produto recorrente:",
        lembreteErr && lembreteErr.message,
      );
    }

    res.status(201).json(venda);

    // ── Push: pagamento_recebido ────────────────────────────────────
    setImmediate(async () => {
      try {
        const pushService = require("../services/pushNotificationService");
        const empresaId = venda.empresa_id || req.user?.empresaId;
        if (empresaId) {
          let valorTotal = 0;
          try {
            const totais = venda.totais
              ? typeof venda.totais === "string"
                ? JSON.parse(venda.totais)
                : venda.totais
              : null;
            valorTotal =
              totais?.final ||
              totais?.totalFinal ||
              totais?.total ||
              venda.valor ||
              0;
          } catch (_) {}
          await pushService.notificarEmpresa(empresaId, "pagamento_recebido", {
            valor: valorTotal,
          });
        }
      } catch (e) {
        console.warn(
          "[Push] Erro ao enviar push pagamento_recebido:",
          e.message,
        );
      }
    });

    // ── Push: nova_venda ──────────────────────────────────────────
    setImmediate(async () => {
      try {
        const pushService = require("../services/pushNotificationService");
        const empresaId = venda.empresa_id || req.user?.empresaId;
        if (empresaId) {
          const pagamentos = Array.isArray(venda.pagamentos) ? venda.pagamentos : [];
          const formaPag = pagamentos.length > 0
            ? pagamentos.map(p => p.forma || p.tipo || "").filter(Boolean).join(", ")
            : "—";
          const itens = Array.isArray(venda.itens) ? venda.itens : [];
          const qtdItens = itens.reduce((acc, i) => acc + (parseInt(i.quantidade) || 1), 0);
          let valorTotal = 0;
          try {
            const totais = venda.totais
              ? typeof venda.totais === "string" ? JSON.parse(venda.totais) : venda.totais
              : null;
            valorTotal = totais?.final || totais?.totalFinal || totais?.total || venda.valor || 0;
          } catch (_) {}
          const horario = venda.data
            ? pushService.formatarHorarioBrasilia(venda.data, false)
            : "";
          await pushService.notificarEmpresa(empresaId, "nova_venda", {
            clienteNome: venda.cliente || "",
            total: valorTotal,
            pagamento: formaPag,
            horario,
            itens: qtdItens,
          });
        }
      } catch (e) {
        console.warn("[Push] Erro ao enviar push nova_venda:", e.message);
      }
    });
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    res.status(500).json({ erro: "Erro ao criar venda" });
  }
};

// Atualizar venda
exports.atualizarVenda = async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer operação
    if (!req.user?.empresaId) {
      console.error(
        `[atualizarVenda] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        erro: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const venda = await Venda.findByPk(req.params.id);
    if (!venda) {
      return res.status(404).json({ erro: "Venda não encontrada" });
    }

    // Isolamento multi-tenant: verificar que a venda pertence à empresa logada
    if (venda.empresa_id !== req.user.empresaId) {
      console.warn(
        `[atualizarVenda] TENTATIVA DE ACESSO CRUZADO: ` +
        `usuario=${req.user.id} empresa=${req.user.empresaId} ` +
        `tentou editar venda=${req.params.id} empresa=${venda.empresa_id}`
      );
      return res.status(403).json({ erro: "Acesso negado" });
    }

    await venda.update(req.body);

    // Recarregar venda com dados atualizados para o push
    const vendaAtualizada = await Venda.findByPk(req.params.id);
    
    // ── Push: notificar após atualizar venda (finalização com pagamento) ──
    setImmediate(async () => {
      try {
        const pushService = require("../services/pushNotificationService");
        const empresaId = vendaAtualizada.empresa_id || req.user?.empresaId;
        if (empresaId) {
          // Enviar push de nova_venda
          const pagamentos = Array.isArray(vendaAtualizada.pagamentos) ? vendaAtualizada.pagamentos : [];
          const formaPag = pagamentos.length > 0
            ? pagamentos.map(p => p.forma || p.tipo || "").filter(Boolean).join(", ")
            : "—";
          const itens = Array.isArray(vendaAtualizada.itens) ? vendaAtualizada.itens : [];
          const qtdItens = itens.reduce((acc, i) => acc + (parseInt(i.quantidade) || 1), 0);
          let valorTotal = 0;
          try {
            const totais = vendaAtualizada.totais
              ? typeof vendaAtualizada.totais === "string" ? JSON.parse(vendaAtualizada.totais) : vendaAtualizada.totais
              : null;
            valorTotal = totais?.final || totais?.totalFinal || totais?.total || vendaAtualizada.valor || 0;
          } catch (_) {}
          const horario = vendaAtualizada.data
            ? pushService.formatarHorarioBrasilia(vendaAtualizada.data, false)
            : "";
          await pushService.notificarEmpresa(empresaId, "nova_venda", {
            clienteNome: vendaAtualizada.cliente || "",
            total: valorTotal,
            pagamento: formaPag,
            horario,
            itens: qtdItens,
          });

          // Enviar push de pagamento_recebido
          await pushService.notificarEmpresa(empresaId, "pagamento_recebido", {
            valor: valorTotal,
          });
        }
      } catch (e) {
        console.warn("[Push] Erro ao enviar push ao atualizar venda:", e.message);
      }
    });

    res.json(vendaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar venda:", error);
    res.status(500).json({ erro: "Erro ao atualizar venda" });
  }
};

// Deletar venda
exports.deletarVenda = async (req, res) => {
  try {
    // CRÍTICO: Verificar empresaId antes de qualquer operação
    if (!req.user?.empresaId) {
      console.error(
        `[deletarVenda] BLOQUEIO: empresaId ausente no req.user.`
      );
      return res.status(403).json({
        erro: "Acesso negado: empresa não identificada.",
        semEmpresa: true,
      });
    }

    const venda = await Venda.findByPk(req.params.id);
    if (!venda) {
      return res.status(404).json({ erro: "Venda não encontrada" });
    }

    // Isolamento multi-tenant: verificar que a venda pertence à empresa logada
    if (venda.empresa_id !== req.user.empresaId) {
      console.warn(
        `[deletarVenda] TENTATIVA DE ACESSO CRUZADO: ` +
        `usuario=${req.user.id} empresa=${req.user.empresaId} ` +
        `tentou deletar venda=${req.params.id} empresa=${venda.empresa_id}`
      );
      return res.status(403).json({ erro: "Acesso negado" });
    }

    await venda.destroy();
    res.json({ mensagem: "Venda deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar venda:", error);
    res.status(500).json({ erro: "Erro ao deletar venda" });
  }
};
