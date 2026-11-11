const { test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const XLSX = require("xlsx");
test("Importação CSV, XLS e XLSX com JWT real, banco isolado e duas empresas", async (t) => {
  const lab =
    await require("../backend/scripts/lab-fiscal/app").criarLaboratorio();
  const { DataTypes } = require("sequelize");
  const fonte = fs.readFileSync(
    require.resolve("../backend/models/Cliente"),
    "utf8",
  );
  const Cliente = vm.runInNewContext(
    fonte.slice(
      fonte.indexOf("const Cliente = sequelize.define("),
      fonte.indexOf("module.exports = { Cliente"),
    ) + "\nCliente;",
    { sequelize: lab.db, DataTypes, require },
  );
  await Cliente.sync({ force: true });
  require.cache[require.resolve("../backend/models/Cliente")].exports.Cliente =
    Cliente;
  lab.models.Cliente = Cliente;
  await lab.models.Usuario.update(
    { permissoes: ["cliente.novo", "item.novo.produto"] },
    { where: { id: 1 } },
  );
  lab.models.Pet = require("../backend/models/Pet");
  Cliente.hasMany(lab.models.Pet, { foreignKey: "cliente_id", as: "pets" });
  Cliente.hasMany(lab.models.Venda, { foreignKey: "clienteId", as: "vendas" });
  await lab.models.Pet.sync();
  const router = require("../backend/routes/importacaoRoutes");
  lab.app.use("/api/clientes", require("../backend/routes/clienteRoutes"));
  lab.app.use("/api/itens", require("../backend/routes/itemRoutes"));
  lab.app.use("/api/centros", require("../backend/routes/centroRoutes"));
  const server = lab.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await lab.db.close();
  });
  const base = "http://127.0.0.1:" + server.address().port;
  async function api(path, { empresa = 1, body, method, arquivo } = {}) {
    const headers = { Authorization: "Bearer " + lab.token(empresa) };
    if (body && !arquivo) headers["Content-Type"] = "application/json";
    const r = await lab.fetchLocal(base + path, {
      method: method || (body || arquivo ? "POST" : "GET"),
      headers,
      body: arquivo || (body && JSON.stringify(body)),
    });
    return { status: r.status, data: await r.json().catch(() => null) };
  }
  async function previa(tipo, csv, empresa = 1, extra = {}) {
    const f = new FormData();
    f.append("arquivo", new Blob([csv]), "arquivo.csv");
    for (const [k, v] of Object.entries(extra))
      f.append(k, typeof v === "string" ? v : JSON.stringify(v));
    return api("/api/" + tipo + "/importacao/analisar", {
      empresa,
      arquivo: f,
    });
  }
  async function confirmar(tipo, token, empresa = 1, escolhas = {}) {
    return api("/api/" + tipo + "/importacao/confirmar", {
      empresa,
      body: { token, escolhas },
    });
  }
  let token, produtoId;
  await t.test(
    "Somente nome, cabeçalhos invertidos, acentos, linhas vazias e sexo",
    async () => {
      const r = await previa("clientes", "NOME COMPLETO\nAna\n\nJosé");
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.resumo.validos, 2);
      token = r.data.token;
      assert.equal((await confirmar("clientes", token)).data.criados, 2);
      assert.equal((await confirmar("clientes", token)).data.criados, 2);
      assert.equal(await Cliente.count(), 2);
      const outra = await previa("clientes", "NOME COMPLETO\nAna\n\nJosé");
      assert.equal(outra.data.linhas[0].repetida, true);
      const pessoa = await previa(
        "clientes",
        "Celular;Cliente;Sexo;Email\n31999999999;Maria;feminino;maria@example.com",
      );
      assert.equal(pessoa.data.linhas[0].dados.sexo, "Feminino");
      assert.equal(
        (await confirmar("clientes", pessoa.data.token)).data.criados,
        1,
      );
    },
  );
  await t.test(
    "Duplicados da mesma empresa, atualização explícita e CPF de outra empresa",
    async () => {
      const r = await previa(
        "clientes",
        "Nome;E-mail\nMaria atualizada;maria@example.com",
      );
      assert.ok(r.data.linhas[0].existente);
      assert.equal(
        (await confirmar("clientes", r.data.token, 1, { 2: "atualizar" })).data
          .atualizados,
        1,
      );
      const b = await previa(
        "clientes",
        "Nome;E-mail\nOutra empresa;maria@example.com",
        2,
      );
      assert.equal(b.data.linhas[0].existente, undefined);
      assert.equal(
        (await confirmar("clientes", b.data.token, 2)).data.criados,
        1,
      );
      assert.equal((await confirmar("clientes", token, 2)).status, 404);
    },
  );
  await t.test(
    "Campos desconhecidos pedem confirmação e campos de empresa não são aceitos",
    async () => {
      const r = await previa("clientes", "Nome;empresa_id\nInválido;2");
      assert.equal(r.data.precisaMapear, true);
      const s = await previa("clientes", "Nome;empresa_id\nSeguro;2", 1, {
        mapeamento: ["nome", "ignorar"],
      });
      await confirmar("clientes", s.data.token);
      assert.equal(
        (await Cliente.findOne({ where: { nome: "Seguro" } })).empresa_id,
        1,
      );
      assert.equal(
        (
          await previa("clientes", "Nome;Outra\nInválido;2", 1, {
            mapeamento: ["nome", "empresa_id"],
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "Centros por empresa, classificação e dinheiro brasileiro",
    async () => {
      assert.equal(
        (await api("/api/centros", { body: { descricao: "Alimentação" } }))
          .status,
        201,
      );
      assert.equal(
        (
          await api("/api/centros", {
            empresa: 2,
            body: { descricao: "Higiene" },
          })
        ).status,
        201,
      );
      assert.equal(
        (await api("/api/centros", { empresa: 2 })).data.some(
          (c) => c.descricao === "Alimentação",
        ),
        false,
      );
      const r = await previa(
        "itens",
        'Venda;Produto;Custo\n"R$ 159,90";Ração Golden;"120,00"',
      );
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.linhas[0].dados.preco, 159.9);
      assert.equal(r.data.linhas[0].dados.centroResultado, "Alimentação");
      assert.equal((await confirmar("itens", r.data.token)).data.criados, 1);
      produtoId = (
        await lab.models.Produto.findOne({ where: { nome: "Ração Golden" } })
      ).id;
      const b = await previa(
        "itens",
        "Nome;Custo;Venda;Centro Resultado\nRação;1;2;Alimentação",
        2,
      );
      assert.match(b.data.linhas[0].erro, /Centro informado/);
      const vazio = await previa(
        "itens",
        "Produto;Custo;Venda\nColeira;10.00;20.00",
        2,
      );
      assert.match(vazio.data.linhas[0].erro, /centro padrão/);
    },
  );
  await t.test(
    "Produto B não aparece na empresa A e acesso por ID é bloqueado",
    async () => {
      const r = await previa("itens", "Produto;Custo;Venda\nShampoo B;1;2", 2);
      assert.equal((await confirmar("itens", r.data.token, 2)).data.criados, 1);
      assert.equal(
        (await api("/api/itens/" + produtoId, { empresa: 2 })).status,
        404,
      );
      assert.equal(
        (
          await api("/api/itens/" + produtoId, {
            empresa: 2,
            method: "PUT",
            body: { nome: "Ataque" },
          })
        ).status,
        404,
      );
      const list = await api("/api/itens?q=Shampoo&limit=1", { empresa: 1 });
      assert.equal(list.data.length, 0);
      const clientes = await api("/api/clientes?search=Outra&limit=1", {
        empresa: 1,
      });
      assert.equal(clientes.data.clientes.length, 0);
      const clienteA = await Cliente.findOne({ where: { empresa_id: 1 } });
      assert.equal(
        (await api("/api/clientes/" + clienteA.id, { empresa: 2 })).status,
        404,
      );
      assert.equal(
        (
          await api("/api/clientes/" + clienteA.id, {
            empresa: 2,
            method: "DELETE",
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await api("/api/clientes/" + clienteA.id, {
            empresa: 2,
            method: "PUT",
            body: { nome: "Ataque", empresa_id: 1 },
          })
        ).status,
        404,
      );
    },
  );
  await t.test("Excel, fórmulas, formato e valores ausentes", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["Nome"], ["Excel"]]),
      "Clientes",
    );
    const f = new FormData();
    f.append(
      "arquivo",
      new Blob([XLSX.write(wb, { type: "buffer", bookType: "xlsx" })]),
      "teste.xlsx",
    );
    const r = await api("/api/clientes/importacao/analisar", { arquivo: f });
    assert.equal(r.data.resumo.validos, 1, JSON.stringify(r.data));
    const sheet = wb.Sheets.Clientes;
    sheet.A2 = { t: "n", f: "1+1", v: 2 };
    const g = new FormData();
    g.append(
      "arquivo",
      new Blob([XLSX.write(wb, { type: "buffer", bookType: "xlsx" })]),
      "formula.xlsx",
    );
    assert.equal(
      (await api("/api/clientes/importacao/analisar", { arquivo: g })).status,
      400,
    );
    const erros = await previa(
      "itens",
      "Nome;Custo;Venda\nSem custo;;2\nValor ruim;abc;10\nNegativo;-10;20",
    );
    assert.equal(erros.data.resumo.erros, 3);
    assert.equal((await confirmar("itens", erros.data.token)).data.criados, 0);
  });
  await t.test("XLS binário e exportação tabulada com mais de mil clientes", async () => {
    for (const formato of ["biff8", "txt"]) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ["nome", "mail", "fone1"],
        ...Array.from({ length: formato === "txt" ? 1914 : 2 }, (_, i) =>
          ["Cliente XLS " + i, "", "31999999999"]),
      ]), "Clientes");
      const bytes = formato === "txt"
        ? Buffer.from(XLSX.utils.sheet_to_csv(wb.Sheets.Clientes, { FS: "\t" }))
        : XLSX.write(wb, { type: "buffer", bookType: formato });
      const f = new FormData();
      f.append("arquivo", new Blob([bytes]), "clientes.XLS");
      const r = await api("/api/clientes/importacao/analisar", { arquivo: f });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.resumo.validos, formato === "txt" ? 1914 : 2);
      assert.equal(r.data.linhas[0].dados.telefone, "31999999999");
      if (formato === "biff8") {
        assert.equal((await confirmar("clientes", r.data.token)).data.criados, 2);
      }
    }
    const f = new FormData();
    f.append("arquivo", new Blob([Buffer.from([0, 1, 2, 3])]), "invalido.xls");
    assert.equal((await api("/api/clientes/importacao/analisar", { arquivo: f })).status, 400);
  });
  await t.test(
    "Limites, plano com nomes iguais e registros válidos entre linhas com erro",
    async () => {
      const grande = await previa(
        "clientes",
        "Nome\n" +
          Array.from({ length: 2501 }, (_, i) => "Pessoa " + i).join("\n"),
      );
      assert.equal(grande.status, 400);
      const mistura = await previa(
        "clientes",
        "Nome;Email\nVálido;misto@example.com\nSem email correto;errado\nVálido;",
      );
      assert.equal(mistura.data.resumo.validos, 2);
      const fim = await confirmar("clientes", mistura.data.token);
      assert.equal(fim.data.criados, 2);
      assert.equal(fim.data.relatorio.length, 1);
      assert.equal(await Cliente.count({ where: { nome: "Válido" } }), 2);
    },
  );
  await t.test(
    "Falha durante confirmação reverte a transação e permite tentar novamente",
    async () => {
      const antes = await Cliente.count();
      const r = await previa("clientes", "Nome\nTransação um\nTransação dois");
      const original = Cliente.create;
      let n = 0;
      Cliente.create = function (...args) {
        if (++n === 2) throw new Error("Falha simulada");
        return original.apply(this, args);
      };
      try {
        assert.equal((await confirmar("clientes", r.data.token)).status, 500);
      } finally {
        Cliente.create = original;
      }
      assert.equal(await Cliente.count(), antes);
      assert.equal((await confirmar("clientes", r.data.token)).data.criados, 2);
    },
  );
  await t.test("Permissão de funcionário e autenticação", async () => {
    await lab.models.Usuario.update(
      { permissoes: ["agenda"] },
      { where: { id: 1 } },
    );
    assert.equal((await api("/api/clientes/importacao/campos")).status, 403);
    assert.equal(
      (await lab.fetchLocal(base + "/api/itens/importacao/campos")).status,
      401,
    );
  });
});
