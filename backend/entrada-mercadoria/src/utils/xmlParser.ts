import { parseStringPromise } from 'xml2js';

export type NotaParsed = {
  chave?: string;
  numero?: string;
  dataEmissao?: string;
  valorTotal?: number;
  fornecedor?: { cnpj?: string; nome?: string };
  itens?: Array<{ codigo?: string; descricao?: string; quantidade?: number; unidade?: string; valorUnitario?: number; total?: number }>;
};

export async function parseNFeXml(xml: string): Promise<NotaParsed> {
  const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });

  // Navegar estruturas comuns de NFe (varia por versão). Fazer extração defensiva.
  const nfeProc = parsed['nfeProc'] || parsed['NFe'] || parsed;
  const infNFe = (nfeProc && (nfeProc['NFe']?.infNFe || nfeProc['infNFe'])) || nfeProc['infNFe'] || nfeProc;

  const ide = infNFe?.ide || {};
  const emit = infNFe?.emit || {};
  const total = infNFe?.total || {};
  const det = infNFe?.det || [];

  const chave = nfeProc?.protNFe?.infProt?.chNFe || infNFe?.['@_Id'] || undefined;
  const numero = ide?.nNF || ide?.nNF || undefined;
  const dataEmissao = ide?.dhEmi || ide?.dEmi || undefined;
  const valorTotal = Number(total?.ICMSTot?.vNF || total?.vNF || 0);

  const fornecedor = {
    cnpj: emit?.CNPJ || emit?.cnpj || undefined,
    nome: emit?.xNome || emit?.xnome || undefined,
  };

  const itens = [] as NotaParsed['itens'];
  if (Array.isArray(det)) {
    for (const d of det) {
      const prod = d?.prod || {};
      itens.push({
        codigo: prod?.cProd || prod?.cProd || undefined,
        descricao: prod?.xProd || prod?.xProd || undefined,
        quantidade: prod?.qCom ? Number(prod.qCom) : prod?.qCom ? Number(prod.qCom) : undefined,
        unidade: prod?.uCom || undefined,
        valorUnitario: prod?.vUnCom ? Number(prod.vUnCom) : undefined,
        total: prod?.vProd ? Number(prod.vProd) : undefined,
      });
    }
  } else if (det && typeof det === 'object') {
    const prod = det?.prod || {};
    itens.push({
      codigo: prod?.cProd || undefined,
      descricao: prod?.xProd || undefined,
      quantidade: prod?.qCom ? Number(prod.qCom) : undefined,
      unidade: prod?.uCom || undefined,
      valorUnitario: prod?.vUnCom ? Number(prod.vUnCom) : undefined,
      total: prod?.vProd ? Number(prod.vProd) : undefined,
    });
  }

  return {
    chave,
    numero,
    dataEmissao,
    valorTotal,
    fornecedor,
    itens,
  };
}
