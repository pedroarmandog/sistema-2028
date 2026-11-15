'use strict';

// Sempre consultar o cadastro atual: sem cache global, arquivo temporário ou logo do payload.
async function carregarIdentidade(req, dependencias = {}) {
  const empresaId = Number(req.user?.empresaId);
  if (!Number.isSafeInteger(empresaId) || empresaId < 1) {
    throw Object.assign(new Error('Empresa não identificada.'), { status: 403 });
  }
  const Empresa = dependencias.Empresa || require('../models').Empresa;
  const empresa = await Empresa.findByPk(empresaId);
  if (!empresa) throw Object.assign(new Error('Empresa não encontrada.'), { status: 404 });
  const lerImagem = dependencias.lerImagem || require('./midias/imagem').carregarImagem;
  const logoBuffer = empresa.logo ? await lerImagem(empresaId, empresa.logo) : null;
  return {
    empresa,
    nomeEmpresa: String(empresa.razaoSocial || empresa.nome || empresa.nomeFantasia || ''),
    logoBuffer,
    // Compatibilidade com os geradores existentes: este campo contém bytes, não um caminho.
    logoPath: logoBuffer,
  };
}

function desenharLogo(doc, buffer, { x, y = 25, width = 90, maxHeight = 75 } = {}) {
  if (!buffer) return { desenhada: false, fimY: y, width: 0, height: 0 };
  try {
    const imagem = doc.openImage(buffer);
    const escala = Math.min(width / imagem.width, maxHeight / imagem.height);
    const w = imagem.width * escala, h = imagem.height * escala;
    const centroX = x == null ? doc.page.width / 2 : x + width / 2;
    doc.image(buffer, centroX - w / 2, y, { width: w, height: h });
    return { desenhada: true, fimY: y + h, width: w, height: h };
  } catch {
    return { desenhada: false, fimY: y, width: 0, height: 0 };
  }
}

function cabecalhoFaturamento(doc, identidade) {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const logo = desenharLogo(doc, identidade.logoBuffer, { y: 25, width: 110, maxHeight: 70 });
  let y = logo.desenhada ? logo.fimY + 12 : 36;
  if (identidade.nomeEmpresa) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
    doc.text(identidade.nomeEmpresa, left, y, { width, align: 'center' });
    y = doc.y + 10;
  }
  return y;
}

async function endpoint(req, res) {
  try {
    const d = await carregarIdentidade(req);
    const jpeg = req.query?.formato === 'jpeg';
    const bytes = d.logoBuffer && jpeg ? await require('sharp')(d.logoBuffer).flatten({background:'#ffffff'}).jpeg({quality:95}).toBuffer() : d.logoBuffer;
    res.set('Cache-Control', 'private, no-store');
    res.json({ id: Number(d.empresa.id), nome: d.empresa.nome || '', razaoSocial: d.empresa.razaoSocial || '',
      endereco: d.empresa.endereco, numero: d.empresa.numero, cidade: d.empresa.cidade, estado: d.empresa.estado, cep: d.empresa.cep, telefone: d.empresa.telefone, email: d.empresa.email, cnpj: d.empresa.cnpj,
      nomeEmpresa: d.nomeEmpresa, logoDataUrl: bytes ? 'data:image/' + (jpeg?'jpeg':'png') + ';base64,' + bytes.toString('base64') : null });
  } catch (e) {
    res.status(e.status || 503).json({ erro: e.status ? e.message : 'Não foi possível carregar a identidade da empresa.' });
  }
}
module.exports = { carregarIdentidade, desenharLogo, cabecalhoFaturamento, endpoint };
