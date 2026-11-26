"use strict";
const express = require("express");
const crypto = require("node:crypto");
const Q = require("../../frontend/components/quantidades");
const C = require("../../frontend/components/venda-calculos");
const { consultarItens } = require("../services/consultaItensCompativel");
const erro = (m, status = 400) => Object.assign(Error(m), { status });
const concluido = (s) => /final|conclu/i.test(s || "");
function criarRotas(models) {
  const { Entrada, Saida, Produto, HistoricoEstoque } = models,
    db = Produto.sequelize;
  const stock = require("../services/estoqueFracionado").criar({
    Produto,
    HistoricoEstoque,
  });
  const r = express.Router();
  const handle = (fn) => async (req, res) => {
    try {
      if (!req.user?.empresaId) throw erro("Empresa não identificada.", 403);
      await fn(req, res);
    } catch (e) {
      console.error("[Movimentação estoque]", e.message);
      res
        .status(e.status || 500)
        .json({
          error: e.status
            ? e.message
            : "Não foi possível concluir a movimentação.",
          erro: e.status
            ? e.message
            : "Não foi possível concluir a movimentação.",
        });
    }
  };
  for (const [name, Model, sinal] of [
    ["entrada", Entrada, 1],
    ["saida", Saida, -1],
  ]) {
    const base = "/" + name + "/manual";
    r.get(
      base,
      handle(async (req, res) =>
        res.json(
          await Model.findAll({
            where: { empresa_id: req.user.empresaId },
            order: [["id", "DESC"]],
          }),
        ),
      ),
    );
    r.get(
      base + "/:id",
      handle(async (req, res) => {
        const row = await Model.findOne({
          where: { id: req.params.id, empresa_id: req.user.empresaId },
        });
        if (!row) throw erro("Movimentação não encontrada.", 404);
        res.json(row);
      }),
    );
    async function gravar(req, res) {
      const emp = req.user.empresaId;
      const saved = await db.transaction(async (transaction) => {
        let row = req.params.id
          ? await Model.findOne({
              where: { id: req.params.id, empresa_id: emp },
              transaction,
              lock: transaction.LOCK.UPDATE,
            })
          : null;
        if (req.params.id && !row)
          throw erro("Movimentação não encontrada.", 404);
        if (row && concluido(row.situacao)) {
          if (!row.estoqueProcessado)
            throw erro(
              "Movimentação anterior à atualização: confira o estoque antes de alterar.",
              409,
            );
          const assinatura = (it) =>
            JSON.stringify([
              String(
                it.matchedId ||
                  it.produtoId ||
                  it.id ||
                  it.produto?.id ||
                  it.codigo,
              ),
              Q.numero(it.quantidade ?? it.qty ?? it.qtd),
              Q.numero(it.fator ?? 1),
              it.unitario == null && it.custo == null
                ? null
                : C.centavos(it.unitario ?? it.custo),
            ]);
          const iguais =
            !req.body.itens ||
            JSON.stringify(req.body.itens.map(assinatura)) ===
              JSON.stringify((row.itens || []).map(assinatura));
          if (
            req.method === "PUT" &&
            iguais &&
            concluido(req.body.situacao || req.body.status)
          )
            return {
              ...row.toJSON(),
              estoqueProcessado: true,
              updatedProducts: [],
            };
          throw erro(
            "Movimentação finalizada. Estorne antes de lançar outra.",
            409,
          );
        }
        const data = { ...(row?.toJSON() || {}), ...req.body };
        delete data.id;
        delete data.empresa_id;
        delete data.estoqueProcessado;
        data.empresa_id = emp;
        data.situacao = data.situacao || data.status || "pendente";
        data.observacao = data.observacao || data.observacoes || null;
        data.categoriaFinanceira =
          data.categoriaFinanceira ||
          data.tipoEntrada ||
          data.tipoSaida ||
          null;
        data.dataEmissao = data.dataEmissao || data.data || null;
        data.itens = data.itens || data.items || [];
        if (!Array.isArray(data.itens) || data.itens.length > 1000)
          throw erro("Itens inválidos.");
        if (concluido(data.situacao) && !data.itens.length)
          throw erro("Adicione itens à movimentação.");
        const updated = [],
          converted = [];
        if (concluido(data.situacao))
          for (const it of data.itens) {
            let p;
            const id = it.matchedId || it.produtoId || it.id || it.produto?.id;
            if (id)
              p = await consultarItens(Produto, "findOne", {
                where: { id: String(id), empresa_id: emp },
                transaction,
                lock: transaction.LOCK.UPDATE,
              });
            if (!p && it.codigo)
              p = await consultarItens(Produto, "findOne", {
                where: { codigo: String(it.codigo), empresa_id: emp },
                transaction,
                lock: transaction.LOCK.UPDATE,
              });
            if (
              !p &&
              id &&
              !(name === "entrada" && !it.matchedId && !it.produtoId)
            )
              throw erro("Produto não encontrado nesta empresa.", 404);
            const qtd = Q.numero(it.quantidade ?? it.qty ?? it.qtd, {
                positivo: true,
              }),
              fator = Q.numero(it.fator ?? 1, { positivo: true });
            const entrada = Q.embalagem(
              qtd,
              fator,
              it.unitario ?? it.custo ?? null,
            );
            const peso = name === "entrada" ? entrada.quantidade : qtd;
            if (
              name === "entrada" &&
              it.entEstoque != null &&
              it.entEstoque !== "" &&
              Q.numero(it.entEstoque) !== peso
            )
              throw erro(
                "Entrada em estoque deve corresponder à quantidade × fator.",
              );
            if (!p) {
              if (name !== "entrada")
                throw erro("Produto não encontrado.", 404);
              const nome = String(
                it.descricao || it.nome || it.xProd || "",
              ).trim();
              if (!nome) throw erro("Nome do produto obrigatório.");
              const unidade = Q.unidade(it.unidade || it.un || "UN");
              p = await Produto.create(
                {
                  id: crypto.randomUUID(),
                  nome,
                  codigo: it.codigo || null,
                  empresa_id: emp,
                  tipo: "produto",
                  finalidade: "revenda",
                  unidade,
                  custoBase: entrada.custoKg,
                  preco:
                    it.precoVenda != null
                      ? C.centavos(it.precoVenda) / 100
                      : unidade === "KG"
                        ? null
                        : C.centavos(it.preco ?? it.unitario ?? it.custo ?? 0) /
                          100,
                  estoqueAtual: 0,
                  ncm: it.ncm || null,
                },
                { transaction },
              );
            }
            if (p.tipo !== "produto")
              throw erro("Somente produtos físicos movimentam estoque.");
            await stock.mover(p, sinal * peso, {
              transaction,
              operacao: name === "entrada" ? "Entrada" : "Saída",
              observacao: "Movimentação " + name + " #" + (row?.id || "nova"),
            });
            if (name === "entrada") {
              const patch = { fatorCompra: String(fator) };
              if (entrada.custoKg != null) patch.custoBase = entrada.custoKg;
              await p.update(patch, { transaction });
            }
            converted.push({
              ...it,
              matchedId: p.id,
              produtoId: p.id,
              unidade: Q.unidade(p),
              quantidade: qtd,
              fator,
              entEstoque: peso,
              custoPorKg: entrada.custoKg,
            });
            updated.push(p.toJSON());
          }
        if (converted.length) data.itens = converted;
        if (!row)
          row = await Model.create(
            { ...data, estoqueProcessado: concluido(data.situacao) },
            { transaction },
          );
        else
          await row.update(
            { ...data, estoqueProcessado: concluido(data.situacao) },
            { transaction },
          );
        return {
          ...row.toJSON(),
          updatedProducts: updated,
          estoqueProcessado: !!row.estoqueProcessado,
        };
      });
      res.status(req.params.id ? 200 : 201).json(saved);
    }
    r.post(base, handle(gravar));
    r.put(base + "/:id", handle(gravar));
    r.delete(
      base + "/:id",
      handle(async (req, res) => {
        await db.transaction(async (transaction) => {
          const row = await Model.findOne({
            where: { id: req.params.id, empresa_id: req.user.empresaId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!row) throw erro("Movimentação não encontrada.", 404);
          if (concluido(row.situacao) && !row.estoqueProcessado)
            throw erro(
              "Movimentação anterior à atualização: confira o estoque antes de excluir.",
              409,
            );
          if (row.estoqueProcessado)
            for (const it of row.itens || []) {
              const p = await stock.produto(
                it.produtoId || it.matchedId,
                req.user.empresaId,
                transaction,
              );
              await stock.mover(
                p,
                -sinal *
                  Q.numero(it.entEstoque ?? it.quantidade, { positivo: true }),
                {
                  transaction,
                  operacao: "Estorno de " + name,
                  observacao: "Movimentação #" + row.id,
                },
              );
            }
          await row.destroy({ transaction });
        });
        res.json({ success: true, estoqueProcessado: true });
      }),
    );
  }
  return r;
}
module.exports = { criarRotas };
