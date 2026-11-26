"use strict";
const Q = require("../../frontend/components/quantidades");
const C = require("../../frontend/components/venda-calculos");
const { consultarItens } = require("./consultaItensCompativel");
const fail = (m, status = 400) => Object.assign(Error(m), { status });
function criar({ Produto, HistoricoEstoque, Venda }) {
  const sequelize = Produto.sequelize;
  async function produto(id, empresa, transaction) {
    const p = await consultarItens(Produto, "findOne", {
      where: { id: String(id), empresa_id: empresa },
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
    if (!p) throw fail("Produto não encontrado nesta empresa.", 404);
    return p;
  }
  async function mover(
    p,
    delta,
    { transaction, operacao, observacao, permitirNegativo = false },
  ) {
    const antes = Q.numero(p.estoqueAtual ?? 0),
      depois = Q.somar(antes, delta);
    if (delta < 0 && depois < 0 && !permitirNegativo)
      throw fail("Estoque insuficiente para " + p.nome + ".", 409);
    await p.update({ estoqueAtual: depois }, { transaction });
    await HistoricoEstoque.create(
      {
        produtoId: p.id,
        produtoNome: p.nome,
        dataMovimento: new Date(),
        operacao,
        estoqueAnterior: antes,
        quantidade: delta,
        novoEstoque: depois,
        observacao,
      },
      { transaction },
    );
    return p;
  }
  async function itens(raw, empresa, transaction) {
    const rows = [];
    for (const i of raw || []) {
      let p;
      if (i.produto?.id || i.produtoId)
        p = await produto(i.produto?.id || i.produtoId, empresa, transaction);
      else {
        p = await Produto.findOne({
          where: {
            nome: i.produto?.nome || i.nome || i.descricao,
            empresa_id: empresa,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!p) throw fail("Selecione um produto desta empresa.");
      }
      const quantidade = Q.validar(i.quantidade ?? i.qtd, p, {
        positivo: true,
      });
      const unitario = C.centavos(i.valorUnitario ?? i.preco ?? p.preco) / 100,
        desconto = Number(String(i.desconto ?? 0).replace(",", "."));
      if (
        unitario < 0 ||
        !Number.isFinite(desconto) ||
        desconto < 0 ||
        desconto > 100
      )
        throw fail("Preço ou desconto inválido.");
      rows.push({
        ...i,
        produto: {
          ...(i.produto || {}),
          id: p.id,
          nome: p.nome,
          tipo: p.tipo,
          unidade: Q.unidade(p),
          custoBase: p.custoBase,
        },
        unidade: Q.unidade(p),
        quantidade,
        valorUnitario: unitario,
        desconto,
        ...C.calcularItem(quantidade, unitario, desconto),
      });
    }
    return rows;
  }
  const final = (v) =>
    ["pago", "parcial"].includes(String(v.status).toLowerCase());
  function totais(rows, base = {}) {
    const bruto = rows.reduce((n, i) => n + C.centavos(i.totalBruto), 0),
      liquido = rows.reduce((n, i) => n + C.centavos(i.totalFinal), 0);
    const descontoItens = bruto - liquido;
    const geral =
      base.descontoGeral != null
        ? C.centavos(base.descontoGeral)
        : Math.max(0, C.centavos(base.desconto || 0) - descontoItens);
    const acrescimo = C.centavos(base.acrescimo || 0),
      arredondamento = C.centavos(base.arredondamento || 0);
    if (geral < 0 || acrescimo < 0)
      throw fail("Desconto ou acréscimo inválido.");
    return {
      ...base,
      versaoCalculo: 2,
      bruto: bruto / 100,
      descontoItens: descontoItens / 100,
      descontoGeral: geral / 100,
      desconto: (descontoItens + geral) / 100,
      acrescimo: acrescimo / 100,
      arredondamento: arredondamento / 100,
      final: Math.max(0, liquido - geral + acrescimo + arredondamento) / 100,
    };
  }
  function mapa(v) {
    const m = new Map();
    if (v && final(v))
      for (const i of v.itens || [])
        if (i.produto?.tipo === "produto")
          m.set(
            String(i.produto.id),
            Q.somar(m.get(String(i.produto.id)) || 0, i.quantidade),
          );
    return m;
  }
  async function reconciliar(antes, depois, empresa, transaction) {
    const old = antes?.estoqueProcessado ? mapa(antes) : new Map(),
      next = mapa(depois);
    for (const id of [...new Set([...old.keys(), ...next.keys()])].sort()) {
      const delta = Q.subtrair(old.get(id) || 0, next.get(id) || 0);
      if (!delta) continue;
      const p = await produto(id, empresa, transaction);
      const permite = [true, 1, "1", "sim", "true"].includes(
        p.permiteEstoqueNegativo,
      );
      await mover(p, delta, {
        transaction,
        operacao: delta < 0 ? "Venda" : "Estorno de venda",
        observacao: "Venda #" + depois.id,
        permitirNegativo: permite,
      });
    }
  }
  async function gravarVenda(body, empresa, id) {
    if (!Number.isSafeInteger(Number(empresa)) || Number(empresa) <= 0)
      throw fail("Empresa não identificada.", 403);
    return sequelize.transaction(async (transaction) => {
      let row = id
        ? await Venda.findOne({
            where: { id, empresa_id: empresa },
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : null;
      if (id && !row) throw fail("Venda não encontrada.", 404);
      const antes = row?.toJSON();
      const dados = { ...body };
      delete dados.id;
      delete dados.empresa_id;
      delete dados.estoqueProcessado;
      if (dados.itens) {
        dados.itens = await itens(dados.itens, empresa, transaction);
        dados.totais = totais(dados.itens, dados.totais || antes?.totais || {});
      }
      if (antes && final(antes) && !antes.estoqueProcessado) {
        if (dados.itens || (dados.status && dados.status !== antes.status))
          throw fail(
            "Venda anterior à atualização: confira o estoque antes de alterar ou estornar os itens.",
            409,
          );
        return row.update(dados, { transaction });
      }
      const merged = { ...antes, ...dados };
      if (!Array.isArray(merged.itens) || !merged.itens.length)
        throw fail("Adicione itens à venda.");
      if (!row)
        row = await Venda.create(
          { ...dados, empresa_id: empresa, estoqueProcessado: false },
          { transaction },
        );
      else await row.update(dados, { transaction });
      await reconciliar(antes, row.toJSON(), empresa, transaction);
      await row.update({ estoqueProcessado: true }, { transaction });
      return row;
    });
  }
  async function excluirVenda(id, empresa) {
    return sequelize.transaction(async (transaction) => {
      const row = await Venda.findOne({
        where: { id, empresa_id: empresa },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!row) throw fail("Venda não encontrada.", 404);
      const antes = row.toJSON();
      if (final(antes) && !antes.estoqueProcessado)
        throw fail(
          "Venda anterior à atualização: confira o estoque antes de excluir.",
          409,
        );
      await reconciliar(
        antes,
        { ...antes, status: "cancelado" },
        empresa,
        transaction,
      );
      await row.destroy({ transaction });
    });
  }
  return { produto, mover, itens, gravarVenda, excluirVenda };
}
module.exports = { criar, Q };
