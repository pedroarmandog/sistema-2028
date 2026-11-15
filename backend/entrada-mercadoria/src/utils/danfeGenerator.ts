import PDFDocument from 'pdfkit';

export async function generateDanfeBuffer(notaData: any, req: any): Promise<Buffer> {
  const {carregarIdentidade,desenharLogo} = require('../../../services/identidadeEmpresaPDF');
  const identidade = await carregarIdentidade(req);
  return new Promise<Buffer>((resolve, reject) => {
    try {
      // Gera um DANFE simplificado em PDF usando PDFKit
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];
      doc.on('data', (d) => buffers.push(d));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const logo = desenharLogo(doc, identidade.logoBuffer, {y:25,width:100,maxHeight:65});
      doc.fontSize(11).font('Helvetica-Bold').text(identidade.nomeEmpresa,40,logo.desenhada?logo.fimY+10:40,{width:doc.page.width-80,align:'center'});
      doc.moveDown(0.6);
      doc.font('Helvetica');
      doc.fontSize(16).text('DANFE (Simplificado)', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Fornecedor: ${notaData.fornecedorNome || notaData.fornecedor?.nome || '-'} (${notaData.fornecedorCnpj || notaData.fornecedor?.cnpj || '-'})`);
      doc.text(`Número: ${notaData.numero || '-'}`);
      doc.text(`Chave: ${notaData.chave || '-'}`);
      doc.text(`Emissão: ${notaData.dataEmissao || '-'}`);
      doc.text(`Valor total: ${notaData.valorTotal ?? '-'}`);
      doc.moveDown();
      doc.text('Itens:');
      doc.moveDown(0.5);
      const itens = notaData.itens || notaData.parsedData?.itens || [];
      itens.forEach((it: any, idx: number) => {
        doc.text(`${idx + 1}. ${it.descricao || it.xProd || '-'} — qtd: ${it.quantidade ?? '-'} — valor: ${it.valorTotal ?? it.vProd ?? '-'}`);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
