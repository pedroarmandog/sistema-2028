const normalizar = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const clientes = {
  nome: ["Nome", "Nome completo", "Nome do cliente", "Cliente", "Razão social"],
  cpf: ["CPF"],
  cnpj: ["CNPJ"],
  rg: ["RG"],
  sexo: ["Sexo"],
  data_nascimento: ["Data nascimento", "Data de nascimento", "Nascimento"],
  telefone: ["Telefone", "Celular", "Whatsapp", "Fone"],
  email: ["E-mail", "Email"],
  cep: ["CEP"],
  endereco: ["Endereço", "Rua", "Logradouro"],
  numero: ["Número"],
  complemento: ["Complemento"],
  bairro: ["Bairro"],
  cidade: ["Cidade", "Município"],
  estado: ["Estado", "UF"],
  grupo_cliente: ["Grupo cliente"],
  perfil_desconto: ["Perfil desconto"],
  como_nos_conheceu: ["Como nos conheceu"],
  observacoes: ["Observações"],
  proximidade: ["Proximidade"],
  ativo: ["Ativo"],
  limite_credito: ["Limite crédito"],
  tipo_pessoa: ["Tipo pessoa"],
  inscricao_estadual: ["Inscrição estadual"],
  indicador_ie: ["Indicador IE"],
  codigo_ibge_municipio: ["Código IBGE município"],
  pais: ["País"],
  codigo_pais: ["Código país"],
};
const produtos = {
  nome: [
    "Nome",
    "Produto",
    "Descrição",
    "Nome do produto",
    "Nome do item",
    "Item",
  ],
  custoBase: ["Custo", "Preço de compra", "Valor custo", "Valor de custo", "Custo base"],
  preco: ["Venda", "Preço final", "Preço de venda", "Preço", "Valor venda", "Valor de venda"],
  centroResultado: ["Centro de resultado", "Centro resultado"],
  estoqueAtual: ["Qtd", "Quantidade", "Estoque atual", "Estoque"],
  codigo: ["Código"],
  codigoBarras: ["Código de barras", "EAN"],
  sku: ["SKU"],
  gtin: ["GTIN"],
  categoria: ["Categoria"],
  marca: ["Marca"],
  unidade: ["Unidade"],
  agrupamento: ["Agrupamento"],
  finalidade: ["Finalidade"],
  estoqueMinimo: ["Estoque mínimo"],
  estoqueIdeal: ["Estoque ideal"],
  ncm: ["NCM"],
  cest: ["CEST"],
  origem: ["Origem"],
  cfop_padrao: ["CFOP"],
  csosn: ["CSOSN"],
  cst_icms: ["CST ICMS"],
  cst_pis: ["CST PIS"],
  cst_cofins: ["CST COFINS"],
  cst_ipi: ["CST IPI"],
  aliq_icms: ["Alíquota ICMS"],
  aliq_pis: ["Alíquota PIS"],
  aliq_cofins: ["Alíquota COFINS"],
  aliq_ipi: ["Alíquota IPI"],
  peso: ["Peso"],
  ativo: ["Ativo"],
  observacao: ["Observação"],
};
function campos(tipo) {
  return tipo === "clientes" ? clientes : produtos;
}
function sugerir(tipo, coluna) {
  const encontrados = Object.entries(campos(tipo)).filter(([chave, nomes]) =>
    [chave, ...nomes].some((n) => normalizar(n) === normalizar(coluna)),
  );
  return encontrados.length === 1 ? encontrados[0][0] : "";
}
function moeda(v) {
  let s = String(v ?? "")
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");
  if (s.includes(",")) {
    if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{1,2}$/.test(s))
      throw new Error("Valor monetário inválido");
    s = s.replace(/\./g, "").replace(",", ".");
  }
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(s))
    throw new Error("Valor monetário inválido");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 99999999.99)
    throw new Error(
      "Valor deve ser positivo ou zero, com até duas casas decimais",
    );
  return n;
}
const grupos = [
  {
    palavras: [
      "racao",
      "racoes",
      "alimento",
      "alimentos",
      "petisco",
      "petiscos",
    ],
    centros: ["racao", "racoes", "alimentacao", "alimento"],
  },
  {
    palavras: ["shampoo", "sabonete", "higiene", "condicionador"],
    centros: ["higiene", "limpeza"],
  },
  {
    palavras: ["coleira", "guia", "peitoral", "acessorio"],
    centros: ["acessorio"],
  },
  { palavras: ["brinquedo", "mordedor", "bolinha"], centros: ["brinquedo"] },
];
function classificar(nome, centros) {
  const palavras = String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  const gruposItem = grupos.filter((g) =>
    g.palavras.some((p) => palavras.includes(p)),
  );
  if (gruposItem.length !== 1) return null;
  const candidatos = centros.filter((c) =>
    gruposItem.some((g) =>
      g.centros.some((p) => normalizar(c.descricao).includes(p)),
    ),
  );
  return candidatos.length === 1 ? candidatos[0].descricao : null;
}
module.exports = { campos, sugerir, normalizar, moeda, classificar };
