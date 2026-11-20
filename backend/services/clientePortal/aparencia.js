"use strict";
const V = require("./validacao"),
  Tema = require("../../../frontend/cliente-app/tema"),
  Visual = require("../../../frontend/cliente-app/visual"),
  { serializar } = require("./agenda");
function dados(cfg) {
  return (V.json(cfg?.regras) || {}).aparencia || {};
}
function ler(cfg, { gestor = false } = {}) {
  const a = dados(cfg),
    versao = Number.isSafeInteger(a.versao) && a.versao >= 0 ? a.versao : 0,
    visuais = Visual.padrao();
  for (const k of Visual.CAMPOS) {
    const b = a.visuais?.[k];
    if (!b) continue;
    try {
      Object.assign(
        visuais[k],
        Visual.validarItem(
          Object.fromEntries(
            ["titulo", "texto", "modo", "ocultarTextos", "x", "y"].map((n) => [
              n,
              b[n],
            ]),
          ),
        ),
      );
      if (b.referencia) {
        visuais[k].imagem =
          (gestor
            ? "/api/cliente-portal/aparencia"
            : "/api/cliente-app/loja/" + cfg.slug) +
          "/visual/" +
          k +
          "?v=" +
          versao;
        visuais[k].personalizada = true;
      }
    } catch {}
  }
  return { versao, cores: Tema.normalizar(a.cores), visuais };
}
function preservar(regras, atuais) {
  const a = (V.json(atuais) || {}).aparencia;
  return a ? { ...(regras || {}), aparencia: a } : regras;
}
function criarAparencia(p) {
  async function obter(emp) {
    return ler(await p.config(emp), { gestor: true });
  }
  async function alterar(emp, autor, versao, mutacao, campos) {
    return serializar(p.ERP, emp, async (transaction) => {
      const cfg = await p.config(emp, { transaction }),
        a = dados(cfg);
      if (ler(cfg).versao !== V.inteiro(versao, 0))
        throw V.falha(
          "A aparência mudou em outro computador. Recarregue antes de salvar.",
          409,
        );
      const nova = await mutacao({
        ...a,
        cores: Tema.normalizar(a.cores),
        visuais: { ...(a.visuais || {}) },
      });
      nova.versao = ler(cfg).versao + 1;
      await cfg.update(
        { regras: { ...V.json(cfg.regras), aparencia: nova } },
        { transaction, logging: false },
      );
      await p.eventos.auditar(
        emp,
        { tipo: "gestor", id: autor },
        "aparencia_app",
        emp,
        campos,
        transaction,
      );
      await p.eventos.gestor(
        emp,
        null,
        "aparencia",
        "A aparência do aplicativo foi atualizada.",
        {},
        "aparencia:" + nova.versao,
        transaction,
      );
      return ler(cfg, { gestor: true });
    });
  }
  async function salvar(emp, autor, b) {
    V.chaves(b, ["versao", "cores", "restaurar", "visuais", "restaurarTudo"]);
    if (
      (b.restaurar !== undefined && typeof b.restaurar !== "boolean") ||
      (b.restaurarTudo !== undefined && typeof b.restaurarTudo !== "boolean")
    )
      throw V.falha("Restauração inválida.");
    if (b.restaurar === true && b.cores !== undefined)
      throw V.falha("Escolha restaurar ou enviar uma paleta.");
    if (b.restaurarTudo && (b.cores !== undefined || b.visuais !== undefined))
      throw V.falha("Restauração deve ser enviada separadamente.");
    let cores;
    if (b.cores !== undefined || b.restaurar === true)
      try {
        cores = b.restaurar ? { ...Tema.PADRAO } : Tema.validar(b.cores);
      } catch (e) {
        throw V.falha(e.message);
      }
    let visuais;
    if (b.visuais !== undefined) {
      if (
        !b.visuais ||
        typeof b.visuais !== "object" ||
        Array.isArray(b.visuais)
      )
        throw V.falha("Banners inválidos.");
      visuais = {};
      for (const [k, v] of Object.entries(b.visuais)) {
        if (!Visual.CAMPOS.includes(k)) throw V.falha("Área visual inválida.");
        try {
          visuais[k] = v === null ? null : Visual.validarItem(v);
        } catch (e) {
          throw V.falha(e.message);
        }
      }
    }
    if (!cores && !visuais && !b.restaurarTudo)
      throw V.falha("Informe a alteração de aparência.");
    return alterar(
      emp,
      autor,
      b.versao,
      (a) => {
        if (b.restaurarTudo) return { cores: { ...Tema.PADRAO }, visuais: {} };
        if (cores) a.cores = cores;
        if (visuais)
          for (const [k, v] of Object.entries(visuais)) {
            if (v === null) delete a.visuais[k];
            else
              a.visuais[k] = {
                ...v,
                ...(a.visuais[k]?.referencia
                  ? { referencia: a.visuais[k].referencia }
                  : {}),
              };
          }
        return a;
      },
      ["cores", "visuais"],
    );
  }
  async function upload(emp, autor, area, file, versao) {
    if (!Visual.CAMPOS.includes(area))
      throw V.falha("Área visual inválida.", 404);
    if (!file?.buffer?.length) throw V.falha("Selecione uma imagem.");
    if (file.buffer.length > 5 * 1024 * 1024)
      throw V.falha("Envie uma imagem de até 5 MB.", 413);
    let bytes;
    try {
      const sharp = require("sharp"),
        image = sharp(file.buffer, {
          limitInputPixels: 40000000,
          failOn: "warning",
        }),
        meta = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format) ||
        (meta.pages || 1) > 1
      )
        throw Error("formato");
      bytes = await image
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw V.falha(
        "Envie JPG, PNG ou WebP válido, sem animação e com até 40 megapixels.",
      );
    }
    // Validate concurrency before writing; the SQL lock protects the final reference.
    if ((await obter(emp)).versao !== V.inteiro(Number(versao), 0))
      throw V.falha("A aparência mudou. Recarregue antes de enviar.", 409);
    const r = await p
      .midias()
      .salvar(emp, bytes, "portal-banners", { imagem: true, publico: false });
    return alterar(
      emp,
      autor,
      Number(versao),
      (a) => {
        const prev = ler({ regras: { aparencia: a } }).visuais[area];
        a.visuais[area] = {
          ...Object.fromEntries(
            ["titulo", "texto", "modo", "ocultarTextos", "x", "y"].map((k) => [
              k,
              prev[k],
            ]),
          ),
          referencia: r.url,
        };
        return a;
      },
      ["imagem:" + area],
    );
  }
  async function arquivo(emp, area) {
    if (!Visual.CAMPOS.includes(area))
      throw V.falha("Imagem não encontrada.", 404);
    const ref = dados(await p.config(emp)).visuais?.[area]?.referencia;
    if (!ref) throw V.falha("Imagem não encontrada.", 404);
    return p.midias().ler(emp, ref);
  }
  return { obter, salvar, upload, arquivo };
}
module.exports = { ler, preservar, criarAparencia };
