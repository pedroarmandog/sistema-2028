"use strict";
const {consultarItens,SEM_VARIANTES}=require("./consultaItensCompativel");
const crypto = require("node:crypto");
const falha = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const lerJson = (v) => {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v;
};
function criarServico({
  Produto,
  midias,
  sharp = require("sharp"),
  concorrencia = 2,
} = {}) {
  const fila = [],
    pendentes = new Map();
  let ativos = 0;
  function drenar() {
    while (ativos < concorrencia && fila.length) {
      ativos++;
      fila.shift()();
    }
  }
  async function executar(fn) {
    await new Promise((resolve) => {
      fila.push(resolve);
      drenar();
    });
    try {
      return await fn();
    } finally {
      ativos--;
      drenar();
    }
  }
  async function decodificar(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length > 16 * 1024 * 1024)
      throw falha("A imagem deve ter até 16 MB.", 413);
    try {
      const m = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
      if (
        !["jpeg", "png", "webp", "avif", "heif"].includes(m.format) ||
        !m.width ||
        !m.height ||
        (m.pages || 1) > 1
      )
        throw Error("Formato não suportado");
      return m;
    } catch (e) {
      throw falha(
        "Imagem inválida ou formato não suportado neste servidor. Use JPG, PNG ou WebP.",
        415,
      );
    }
  }
  function base64(ref) {
    if (typeof ref !== "string" || ref.length > 24 * 1024 * 1024)
      throw falha("Imagem acima do limite.", 413);
    const m = /^data:[^;,]+;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(ref);
    if (!m) throw falha("Envio de imagem inválido.");
    return Buffer.from(m[1], "base64");
  }
  async function ler(emp, ref) {
    if (ref.startsWith("data:")) return base64(ref);
    let v = ref;
    if (/^https?:\/\//i.test(v)) {
      const u = new URL(v);
      if (u.pathname.startsWith("/uploads/")) v = u.pathname;
      else v = await midias.importar(emp, v, "produtos");
    }
    return (await midias.ler(emp, v)).bytes;
  }
  async function gerar(emp, bytes, original) {
    await decodificar(bytes);
    const specs = [
        ["ampliada", 1200, 200 * 1024],
        ["media", 480, 80 * 1024],
        ["miniatura", 160, 20 * 1024],
      ],
      out = {},
      medidas = {};
    for (const [tipo, tamanho, meta] of specs) {
      let data;
      try {
        for (const quality of [80, 70, 60, 50]) {
          data = await sharp(bytes, { limitInputPixels: 40000000 })
            .rotate()
            .resize({
              width: tamanho,
              height: tamanho,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality, effort: 4 })
            .toBuffer();
          if (data.length <= meta) break;
        }
        // Detalhes com ruído podem precisar de menos pixels para manter boa qualidade e arquivo leve.
        if (data.length > meta * 1.1) {
          for (
            let lado = Math.floor(tamanho * 0.85);
            lado >= tamanho * 0.5;
            lado = Math.floor(lado * 0.85)
          ) {
            data = await sharp(bytes, { limitInputPixels: 40000000 })
              .rotate()
              .resize({
                width: lado,
                height: lado,
                fit: "inside",
                withoutEnlargement: true,
              })
              .webp({ quality: 65, effort: 4 })
              .toBuffer();
            if (data.length <= meta) break;
          }
        }
      } catch (e) {
        throw falha(
          "Não foi possível converter esta imagem. Use JPG, PNG ou WebP.",
          415,
        );
      }
      const media = await midias.salvar(emp, data, "produtos", {
        imagem: true,
        otimizar: false,
      });
      const saved = await midias.ler(emp, media.url);
      if (!saved?.bytes || sha(saved.bytes) !== sha(data))
        throw falha(
          "Não foi possível confirmar a imagem no armazenamento permanente. Tente novamente.",
          503,
        );
      out[tipo] = media.url;
      medidas[tipo] = { bytes: data.length, max: tamanho };
    }
    return {
      imagem: out.ampliada,
      imagemVersoes: {
        versao: 1,
        origem: out.ampliada,
        original: original && !original.startsWith("data:") ? original : null,
        ...out,
        medidas,
        sha256: sha(bytes),
      },
    };
  }
  async function preparar(emp, ref) {
    if (
      typeof ref === "string" &&
      ref.startsWith("data:") &&
      ref.length > Math.ceil((8 * 1024 * 1024 * 4) / 3) + 100
    )
      throw falha("Envie uma imagem de até 8 MB.", 413);
    if (ref === null || ref === "")
      return { imagem: null, imagemVersoes: null };
    if (typeof ref !== "string") throw falha("Referência de imagem inválida.");
    if (!ref.startsWith('data:')) {
      const existente=await Produto.findOne({where:{empresa_id:emp,imagem:ref}}),v=lerJson(existente?.imagemVersoes);
      if(v?.versao===1&&v.origem===ref){try{for(const k of ['miniatura','media','ampliada'])await midias.ler(emp,v[k]);return {imagem:ref,imagemVersoes:v};}catch(_){}}
    }
    return executar(async () => gerar(emp, await ler(emp, ref), ref));
  }
  async function otimizarRegistro(produto) {
    const p = produto.get ? produto.get({ plain: true }) : produto;
    if (!p.imagem) return { status: "sem-imagem" };
    const key = p.empresa_id + ":" + p.id + ":" + sha(Buffer.from(p.imagem));
    if (pendentes.has(key)) return pendentes.get(key);
    const work = executar(async () => {
      const v = lerJson(p.imagemVersoes);
      if (v?.versao === 1 && v.origem === p.imagem) {
        try {
          for (const k of ["miniatura", "media", "ampliada"])
            await midias.ler(p.empresa_id, v[k]);
          return {
            status: "ja-otimizada",
            dados: { imagem: p.imagem, imagemVersoes: v },
          };
        } catch (_) {}
      }
      let bytes;
      try {
        bytes = await ler(p.empresa_id, p.imagem);
      } catch (e) {
        if (v?.original) bytes = await ler(p.empresa_id, v.original);
        else throw e;
      }
      const dados = await gerar(p.empresa_id, bytes, p.imagem);
      const [n] = await Produto.update(dados, {
        where: { id: p.id, empresa_id: p.empresa_id, imagem: p.imagem },
      });
      return n
        ? { status: "otimizada", dados }
        : { status: "alterada-durante-processamento" };
    });
    pendentes.set(key, work);
    try {
      return await work;
    } finally {
      pendentes.delete(key);
    }
  }
  async function imagem(emp, id, versao = "miniatura") {
    if (!["miniatura", "media", "ampliada"].includes(versao))
      throw falha("Versão de imagem inválida.");
    let p = await consultarItens(Produto,"findOne",{ where: { id, empresa_id: emp } });
    if (!p?.imagem) throw falha("Imagem não encontrada.", 404);
    if(p[SEM_VARIANTES]){
      // Fotos legadas continuam legíveis enquanto a otimização opcional não foi preparada.
      const bytes=await ler(emp,p.imagem);await decodificar(bytes);
      const max={miniatura:160,media:480,ampliada:1200}[versao];
      return {bytes:await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toBuffer(),tipo:'image/webp'};
    }
    let v = lerJson(p.imagemVersoes);
    if (v?.versao !== 1 || v.origem !== p.imagem) {
      await otimizarRegistro(p);
      p = await Produto.findOne({ where: { id, empresa_id: emp } });
      v = lerJson(p?.imagemVersoes);
    }
    if (!v?.[versao]) throw falha("Imagem não disponível.", 404);
    try {
      return await midias.ler(emp, v[versao]);
    } catch (e) {
      if (e.status !== 404 && e.code !== "ENOENT") throw e;
      await otimizarRegistro(p);
      p = await Produto.findOne({ where: { id, empresa_id: emp } });
      v = lerJson(p?.imagemVersoes);
      return midias.ler(emp, v[versao]);
    }
  }
  return { preparar, otimizarRegistro, imagem, decodificar };
}
let unico;
function instancia() {
  return (unico ??= criarServico({
    Produto: require("../models/Produto"),
    midias: require("./midias").instancia(),
  }));
}
module.exports = { criarServico, instancia };
