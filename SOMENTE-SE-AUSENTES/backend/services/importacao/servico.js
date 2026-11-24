const crypto = require("node:crypto");
const { Op } = require("sequelize");
const { Cliente } = require("../../models/Cliente");
const Produto = require("../../models/Produto");
const { Empresa } = require("../../models");
const banco = require("./modelos");
const { campos, normalizar, moeda, classificar } = require("./campos");
const { normalizarSexo } = require("../../utils/sexoCliente");
const documento = (v) => String(v ?? "").replace(/\D/g, "");
const falhar = (mensagem) => {
  throw Object.assign(new Error(mensagem), { status: 400 });
};
const modelos = { clientes: Cliente, produtos: Produto };
const fortes = {
  clientes: ["cpf", "cnpj", "email"],
  produtos: ["codigoBarras", "sku", "gtin"],
};
function valorIdentidade(k, v) {
  return ["cpf", "cnpj", "codigoBarras", "gtin"].includes(k)
    ? documento(v)
    : String(v ?? "")
        .trim()
        .toLowerCase();
}
async function centrosDaEmpresa(empresa, transaction) {
  await banco.preparar();
  // Centros antigos eram um JSON global. Só os nomes já associados a produtos
  // desta empresa permitem uma migração com autoria verificável.
  const itens = await Produto.findAll({
    where: { empresa_id: empresa, centroResultado: { [Op.ne]: null } },
    attributes: ["centroResultado"],
    transaction,
  });
  for (const nome of new Set(
    itens.map((p) => p.centroResultado).filter(Boolean),
  )) {
    const slug = crypto
      .createHash("sha256")
      .update(normalizar(nome))
      .digest("hex")
      .slice(0, 32);
    await banco.Centro.findOrCreate({
      where: { empresa_id: empresa, slug },
      defaults: { descricao: nome },
      transaction,
    });
  }
  return banco.Centro.findAll({
    where: { empresa_id: empresa },
    order: [["descricao", "ASC"]],
    transaction,
  });
}
function converter(tipo, raw) {
  const dados = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!Object.hasOwn(campos(tipo), k)) continue;
    const s = String(v ?? "").trim();
    if (s === "") continue;
    const attr = modelos[tipo].rawAttributes[k];
    if (!attr) continue;
    if (attr.type.options?.length && s.length > attr.type.options.length)
      falhar(
        "Campo " + k + " excede " + attr.type.options.length + " caracteres.",
      );
    dados[k] = s;
  }
  if (!dados.nome) falhar("Nome obrigatório.");
  if (tipo === "produtos") {
    for (const k of ["custoBase", "preco"]) {
      if (!Object.hasOwn(dados, k))
        falhar("Informe " + (k === "custoBase" ? "custo" : "venda") + ".");
      dados[k] = moeda(dados[k]);
    }
  }
  for (const k of [
    "aliq_icms",
    "aliq_pis",
    "aliq_cofins",
    "aliq_ipi",
    "peso",
    "limite_credito",
  ]) {
    if (dados[k] != null) dados[k] = moeda(dados[k]);
    if (k.startsWith("aliq_") && dados[k] > 100)
      falhar("Alíquota deve estar entre 0 e 100.");
  }
  for (const k of [
    "estoqueAtual",
    "estoqueMinimo",
    "estoqueIdeal",
    "origem",
    "indicador_ie",
  ]) {
    if (dados[k] != null) {
      if (!/^\d+$/.test(dados[k]))
        falhar(k + " deve ser inteiro positivo ou zero.");
      dados[k] = Number(dados[k]);
      if (!Number.isSafeInteger(dados[k]) || dados[k] > 2147483647)
        falhar(k + " fora do limite.");
    }
  }
  if (dados.sexo) dados.sexo = normalizarSexo(dados.sexo);
  if (dados.tipo_pessoa) {
    const v = normalizar(dados.tipo_pessoa);
    dados.tipo_pessoa = { f: "F", fisica: "F", j: "J", juridica: "J" }[v];
    if (!dados.tipo_pessoa) falhar("Tipo de pessoa inválido.");
  }
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email))
    falhar("E-mail inválido.");
  for (const k of ["cpf", "cnpj"]) {
    if (dados[k]) {
      dados[k] = documento(dados[k]);
      if (dados[k].length !== (k === "cpf" ? 11 : 14))
        falhar(
          k.toUpperCase() +
            " deve ter " +
            (k === "cpf" ? 11 : 14) +
            " dígitos.",
        );
    }
  }
  if (dados.data_nascimento) {
    let s = dados.data_nascimento;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, a] = s.split("/");
      s = a + "-" + m + "-" + d;
    }
    const d = new Date(s + "T00:00:00Z");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
      !Number.isFinite(+d) ||
      d.toISOString().slice(0, 10) !== s
    )
      falhar("Data de nascimento inválida. Use dd/mm/aaaa.");
    dados.data_nascimento = s;
  }
  if (dados.ativo) {
    const v = normalizar(dados.ativo),
      b = ["sim", "true", "1", "ativo"].includes(v);
    if (!b && !["nao", "false", "0", "inativo"].includes(v))
      falhar("Ativo deve ser Sim ou Não.");
    dados.ativo = tipo === "clientes" ? b : b ? "sim" : "nao";
  }
  if (dados.csosn && dados.cst_icms)
    falhar("Preencha apenas CST ICMS ou CSOSN.");
  return dados;
}
async function analisar(
  tipo,
  arquivo,
  mapeamento,
  empresa,
  centroPadrao,
  usuario,
) {
  const modelo = modelos[tipo],
    permitidos = campos(tipo);
  const usados = mapeamento.filter((v) => v && v !== "ignorar");
  if (usados.some((v) => !Object.hasOwn(permitidos, v)))
    falhar("Mapeamento inválido.");
  if (new Set(usados).size !== usados.length)
    falhar("Duas colunas foram associadas ao mesmo campo.");
  if (!usados.includes("nome")) falhar("Associe uma coluna ao Nome.");
  const existentes = await modelo.findAll({ where: { empresa_id: empresa } });
  const centros = tipo === "produtos" ? await centrosDaEmpresa(empresa) : [];
  if (centroPadrao && !centros.some((c) => c.descricao === centroPadrao))
    falhar("Centro padrão não pertence à empresa.");
  const anteriores = await banco.Linha.findAll({
    where: { empresa_id: empresa, tipo },
    attributes: ["hash"],
  });
  const hashes = new Set(anteriores.map((r) => r.hash));
  const nomesVistos = new Set();
  const vistos = new Set(),
    linhas = [];
  for (let idx = 0; idx < arquivo.linhas.length; idx++) {
    const celulas = arquivo.linhas[idx];
    if (!celulas.some((v) => String(v).trim())) continue;
    const raw = {};
    mapeamento.forEach((k, i) => {
      if (k && k !== "ignorar") raw[k] = celulas[i] ?? "";
    });
    const linha = { linha: idx + 2, acao: "criar", originais: celulas };
    try {
      const dados = converter(tipo, raw);
      if (tipo === "produtos") {
        const declarado = dados.centroResultado;
        if (declarado) {
          const c = centros.filter(
            (c) => normalizar(c.descricao) === normalizar(declarado),
          );
          if (c.length !== 1)
            falhar("Centro informado não encontrado nesta empresa.");
          dados.centroResultado = c[0].descricao;
          linha.classificacao = "Planilha";
        } else {
          dados.centroResultado =
            classificar(dados.nome, centros) || centroPadrao;
          if (!dados.centroResultado)
            falhar("Selecione um centro padrão para este produto.");
          linha.classificacao = classificar(dados.nome, centros)
            ? "Palavras-chave"
            : "Centro padrão selecionado";
        }
      }
      linha.dados = dados;
      linha.hash = crypto
        .createHash("sha256")
        .update(
          JSON.stringify([
            tipo,
            idx,
            Object.keys(dados)
              .sort()
              .map((k) => [k, dados[k]]),
          ]),
        )
        .digest("hex");
      const matches = existentes.filter((r) =>
        fortes[tipo].some(
          (k) =>
            dados[k] &&
            r[k] &&
            valorIdentidade(k, dados[k]) === valorIdentidade(k, r[k]),
        ),
      );
      const ids = [...new Set(matches.map((r) => String(r.id)))];
      if (ids.length > 1)
        falhar(
          "Identificadores apontam para registros diferentes. Revise a planilha.",
        );
      if (ids.length === 1) {
        linha.existente = ids[0];
        linha.versao = matches[0].updatedAt?.toISOString();
        linha.aviso = "Identificador já cadastrado nesta empresa.";
        linha.acao = "ignorar";
      } else if (
        existentes.some((r) => normalizar(r.nome) === normalizar(dados.nome))
      )
        linha.aviso = "Nome semelhante já existe. Confira antes de criar.";
      if (!linha.existente && nomesVistos.has(normalizar(dados.nome)))
        linha.aviso = "Nome repetido no arquivo. Confira antes de criar.";
      nomesVistos.add(normalizar(dados.nome));
      const identidades = fortes[tipo]
        .filter((k) => dados[k])
        .map((k) => k + ":" + valorIdentidade(k, dados[k]));
      if (identidades.some((k) => vistos.has(k)))
        falhar("Identificador repetido dentro do arquivo.");
      identidades.forEach((k) => vistos.add(k));
      if (hashes.has(linha.hash)) {
        linha.repetida = true;
        linha.acao = "ignorar";
        linha.aviso = "Esta linha já foi importada anteriormente.";
      }
    } catch (e) {
      linha.erro = e.message;
      linha.acao = "ignorar";
    }
    linhas.push(linha);
  }
  const id = crypto.randomUUID();
  await banco.Lote.create({
    id,
    empresa_id: empresa,
    usuario_id: usuario,
    tipo,
    dados: JSON.stringify(linhas),
    expira: new Date(Date.now() + 3600000),
  });
  return {
    token: id,
    linhas,
    centros: centros.map((c) => c.descricao),
    resumo: {
      total: linhas.length,
      validos: linhas.filter((l) => !l.erro).length,
      erros: linhas.filter((l) => l.erro).length,
      duplicados: linhas.filter((l) => l.aviso).length,
    },
  };
}
async function confirmar(tipo, empresa, usuario, token, escolhas) {
  return banco.sequelize.transaction(async (transaction) => {
    // Serializa importações da empresa, incluindo prévias de arquivos distintos.
    const empresaRow = await Empresa.findByPk(empresa, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!empresaRow) falhar("Empresa indisponível.");
    const lote = await banco.Lote.findOne({
      where: { id: token, empresa_id: empresa, usuario_id: usuario, tipo },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lote)
      throw Object.assign(new Error("Importação não encontrada."), {
        status: 404,
      });
    if (lote.resultado) return JSON.parse(lote.resultado);
    if (+new Date(lote.expira) < Date.now())
      falhar("Prévia expirada. Analise o arquivo novamente.");
    const centros =
      tipo === "produtos"
        ? await banco.Centro.findAll({
            where: { empresa_id: empresa },
            transaction,
          })
        : [];
    const modelo = modelos[tipo],
      rows = JSON.parse(lote.dados);
    let criados = 0,
      atualizados = 0,
      ignorados = 0;
    const relatorio = [];
    const atuais = await modelo.findAll({
      where: { empresa_id: empresa },
      transaction,
    });
    for (const row of rows) {
      const acao = escolhas[String(row.linha)] || row.acao;
      if (!["criar", "ignorar", "atualizar"].includes(acao))
        falhar("Ação de duplicidade inválida.");
      if (row.erro || row.repetida || acao === "ignorar") {
        ignorados++;
        relatorio.push({
          linha: row.linha,
          motivo: row.erro || row.aviso || "Ignorado pelo usuário",
          registro: JSON.stringify(row.dados || row.originais),
        });
        continue;
      }
      const feita = await banco.Linha.findOne({
        where: { empresa_id: empresa, tipo, hash: row.hash },
        transaction,
      });
      if (feita) {
        ignorados++;
        relatorio.push({ linha: row.linha, motivo: "Já importado." });
        continue;
      }
      const dados = { ...row.dados, empresa_id: empresa };
      if (
        tipo === "produtos" &&
        !centros.some((c) => c.descricao === dados.centroResultado)
      )
        falhar("Centro alterado ou removido. Analise novamente.");
      // Revalida identificadores no banco após adquirir o bloqueio da empresa.
      const matches = atuais.filter((r) =>
        fortes[tipo].some(
          (k) =>
            dados[k] &&
            r[k] &&
            valorIdentidade(k, dados[k]) === valorIdentidade(k, r[k]),
        ),
      );
      if (matches.length > 1)
        falhar(
          "Duplicidade ambígua na linha " + row.linha + ". Refaça a análise.",
        );
      let registro;
      if (acao === "atualizar") {
        if (
          !row.existente ||
          matches.length !== 1 ||
          String(matches[0].id) !== row.existente
        )
          falhar("Registro alterado desde a prévia. Refaça a análise.");
        registro = matches[0];
        if (row.versao && registro.updatedAt?.toISOString() !== row.versao)
          falhar(
            "Cadastro atualizado após a prévia. Analise o arquivo novamente.",
          );
        await registro.update(dados, { transaction });
        atualizados++;
      } else {
        if (matches.length) {
          ignorados++;
          relatorio.push({
            linha: row.linha,
            motivo:
              "Identificador já cadastrado. Refaça a análise para atualizar.",
          });
          continue;
        }
        if (tipo === "produtos")
          Object.assign(dados, { id: crypto.randomUUID(), tipo: "produto" });
        registro = await modelo.create(dados, { transaction });
        atuais.push(registro);
        criados++;
      }
      await banco.Linha.create(
        {
          empresa_id: empresa,
          tipo,
          hash: row.hash,
          registro: String(registro.id),
        },
        { transaction },
      );
    }
    const resultado = { criados, atualizados, ignorados, relatorio };
    await lote.update(
      { resultado: JSON.stringify(resultado), dados: "[]" },
      { transaction },
    );
    return resultado;
  });
}
module.exports = { analisar, confirmar, centrosDaEmpresa };
