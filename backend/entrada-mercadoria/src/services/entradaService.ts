import prisma from '../prismaClient';
import { parseNFeXml, NotaParsed } from '../utils/xmlParser';

export type CreateNotaResult = { id: number };

export async function importXmlAndCreateNota(xmlText: string): Promise<CreateNotaResult> {
  const parsed: NotaParsed = await parseNFeXml(xmlText).catch(() => ({} as NotaParsed));

  const nota = await prisma.notaEntrada.create({
    data: {
      chave: parsed.chave || null,
      numero: parsed.numero || null,
      fornecedorCnpj: parsed.fornecedor?.cnpj || null,
      fornecedorNome: parsed.fornecedor?.nome || null,
      dataEmissao: parsed.dataEmissao ? new Date(parsed.dataEmissao) : null,
      valorTotal: parsed.valorTotal ?? null,
      status: 'PENDENTE',
      xmlContent: xmlText,
      parsedData: parsed as any,
    },
  });

  // criar itens
  if (Array.isArray(parsed.itens) && parsed.itens.length) {
    for (const it of parsed.itens) {
      await prisma.notaItem.create({
        data: {
          notaId: nota.id,
          codigoFornecedor: it.codigo || null,
          descricao: it.descricao || null,
          quantidade: it.quantidade ?? null,
          unidade: it.unidade || null,
          valorUnitario: it.valorUnitario ?? null,
          valorTotal: it.total ?? null,
        },
      });
    }
  }

  return { id: nota.id };
}

export async function listNotas({ status, q, page = 1, perPage = 20 }: { status?: string | null; q?: string | null; page?: number; perPage?: number }) {
  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { fornecedorNome: { contains: q, mode: 'insensitive' } },
      { numero: { contains: q, mode: 'insensitive' } },
      { chave: { contains: q, mode: 'insensitive' } },
    ];
  }

  const total = await prisma.notaEntrada.count({ where });
  const notas = await prisma.notaEntrada.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage });
  return { total, page, perPage, notas };
}

export async function getNotaById(id: number) {
  const nota = await prisma.notaEntrada.findUnique({ where: { id }, include: { itens: true } });
  return nota;
}

export async function ignoreNota(id: number) {
  const nota = await prisma.notaEntrada.update({ where: { id }, data: { status: 'IGNORADA' } });
  return nota;
}

export async function listItensNota(id: number) {
  return await prisma.notaItem.findMany({ where: { notaId: id } });
}

export async function linkItemToProduto(notaId: number, itemId: number, produtoSistemaId: number) {
  await prisma.notaItem.update({ where: { id: itemId }, data: { produtoSistemaId } });

  // verificar se todos vinculados
  const remaining = await prisma.notaItem.count({ where: { notaId, produtoSistemaId: null } });
  if (remaining === 0) {
    await prisma.notaEntrada.update({ where: { id: notaId }, data: { produtosRelacionados: true } });
  }
}

export async function finalizarNota(notaId: number) {
  const itens = await prisma.notaItem.findMany({ where: { notaId } });

  // incrementar estoque dos produtos vinculados
  for (const it of itens) {
    if (!it.produtoSistemaId) throw new Error('Nem todos os itens estão vinculados');
    const qty = Number(it.quantidade || 0);
    await prisma.produtoSistema.update({ where: { id: it.produtoSistemaId }, data: { estoque: { increment: qty } } });
  }

  await prisma.notaEntrada.update({ where: { id: notaId }, data: { status: 'FINALIZADA' } });
}
