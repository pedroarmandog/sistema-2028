import { Request, Response } from 'express';
import * as service from '../services/entradaService';
import { generateDanfeBuffer } from '../utils/danfeGenerator';
import prisma from '../prismaClient';

export async function importXml(req: Request, res: Response) {
  try {
    // arquivo no field 'file' ou raw XML no body.xml
    const file = (req as any).file;
    let xmlText: string | undefined = undefined;
    if (file && file.buffer) xmlText = file.buffer.toString('utf8');
    else if (req.body && req.body.xml) xmlText = req.body.xml;

    if (!xmlText) return res.status(400).json({ success: false, error: 'XML não enviado' });

    const result = await service.importXmlAndCreateNota(xmlText);
    res.status(201).json({ success: true, id: result.id });
  } catch (err: any) {
    console.error('Erro importXml:', err);
    res.status(500).json({ success: false, error: 'Erro ao importar XML', details: err.message });
  }
}

export async function listNotas(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const perPage = parseInt((req.query.perPage as string) || '20', 10);
    const data = await service.listNotas({ status, q, page, perPage });
    res.json({ success: true, ...data });
  } catch (err: any) {
    console.error('Erro listNotas:', err);
    res.status(500).json({ success: false, error: 'Erro ao listar notas', details: err.message });
  }
}

export async function getNota(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const nota = await service.getNotaById(id);
    if (!nota) return res.status(404).json({ success: false, error: 'Nota não encontrada' });
    res.json({ success: true, nota });
  } catch (err: any) {
    console.error('Erro getNota:', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar nota', details: err.message });
  }
}

export async function downloadXml(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const nota = await prisma.notaEntrada.findUnique({ where: { id } });
    if (!nota || !nota.xmlContent) return res.status(404).send('XML não encontrado');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=nota-${id}.xml`);
    res.send(nota.xmlContent);
  } catch (err: any) {
    console.error('Erro downloadXml:', err);
    res.status(500).json({ success: false, error: 'Erro ao baixar XML', details: err.message });
  }
}

export async function espelhoNota(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const nota = await prisma.notaEntrada.findUnique({ where: { id } });
    if (!nota) return res.status(404).json({ success: false, error: 'Nota não encontrada' });
    res.json({ success: true, parsed: nota.parsedData, nota });
  } catch (err: any) {
    console.error('Erro espelhoNota:', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar espelho', details: err.message });
  }
}

export async function ignoreNota(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const nota = await service.ignoreNota(id);
    res.json({ success: true, nota });
  } catch (err: any) {
    console.error('Erro ignoreNota:', err);
    res.status(500).json({ success: false, error: 'Erro ao ignorar nota', details: err.message });
  }
}

export async function danfe(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const nota = await service.getNotaById(id);
    if (!nota) return res.status(404).json({ success: false, error: 'Nota não encontrada' });

    const buffer = await generateDanfeBuffer(nota);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=danfe-${id}.pdf`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Erro danfe:', err);
    res.status(500).json({ success: false, error: 'Erro ao gerar DANFE', details: err.message });
  }
}

export async function listItens(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const itens = await service.listItensNota(id);
    res.json({ success: true, itens });
  } catch (err: any) {
    console.error('Erro listItens:', err);
    res.status(500).json({ success: false, error: 'Erro ao listar itens', details: err.message });
  }
}

export async function linkItem(req: Request, res: Response) {
  try {
    const notaId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { produtoSistemaId } = req.body;
    if (!produtoSistemaId) return res.status(400).json({ success: false, error: 'produtoSistemaId é obrigatório' });
    await service.linkItemToProduto(notaId, itemId, Number(produtoSistemaId));
    res.json({ success: true });
  } catch (err: any) {
    console.error('Erro linkItem:', err);
    res.status(500).json({ success: false, error: 'Erro ao vincular item', details: err.message });
  }
}

export async function finalizar(req: Request, res: Response) {
  try {
    const notaId = Number(req.params.id);
    await service.finalizarNota(notaId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Erro finalizar:', err);
    res.status(500).json({ success: false, error: 'Erro ao finalizar nota', details: err.message });
  }
}
