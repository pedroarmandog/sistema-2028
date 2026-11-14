const { parentPort, workerData } = require("node:worker_threads");
try {
  const XLSX = require("xlsx"),
    bytes = Buffer.from(workerData.bytes);
  const xlsx = workerData.ext === "xlsx";
  // XLS exports may contain BIFF/OLE or tab-delimited text. Parse by content.
  const ole = bytes.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
  const biff = bytes[0] === 0x09 && [0x00, 0x02, 0x04, 0x08].includes(bytes[1]);
  const excel = xlsx || (workerData.ext === "xls" && (ole || biff));
  if (xlsx && (bytes[0] !== 0x50 || bytes[1] !== 0x4b))
    throw new Error("O arquivo não é XLSX.");
  if (!excel && bytes.includes(0))
    throw new Error("O arquivo deve conter uma planilha ou tabela de texto válida.");
  let entrada = bytes;
  if (!excel) {
    try {
      entrada = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      entrada = new TextDecoder("windows-1252").decode(bytes);
    }
  }
  const wb = XLSX.read(entrada, {
    type: excel ? "buffer" : "string",
    raw: true,
    cellFormula: true,
    cellHTML: false,
    sheetRows: 2502,
    bookVBA: true,
    cellDates: false,
    dateNF: "dd/mm/yyyy",
  });
  if (wb.vbaraw) throw new Error("Remova macros antes de importar.");
  const nomes = wb.SheetNames;
  const aba = workerData.aba || nomes[0];
  if (!nomes.includes(aba)) throw new Error("Selecione uma aba válida.");
  const sheet = wb.Sheets[aba],
    ref = XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"] || "A1");
  if (ref.e.r > 2500 || ref.e.c > 79)
    throw new Error(
      "Limite de 2.500 linhas de dados e 80 colunas por arquivo.",
    );
  for (const [k, cell] of Object.entries(sheet)) {
    if (!k.startsWith("!") && (cell.f || cell.l))
      throw new Error("Remova fórmulas e links ativos antes de importar.");
    if (cell?.v != null && String(cell.v).length > 2000)
      throw new Error("Célula maior que 2.000 caracteres.");
  }
  const linhas = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    dateNF: "dd/mm/yyyy",
    defval: "",
    blankrows: true,
  });
  if (!linhas.length) throw new Error("Arquivo vazio.");
  const cabecalho = linhas.shift().map(String);
  if (!cabecalho.length) throw new Error("Cabeçalho ausente.");
  parentPort.postMessage({ cabecalho, linhas, abas: nomes, aba });
} catch (e) {
  parentPort.postMessage({ erro: e.message });
}
