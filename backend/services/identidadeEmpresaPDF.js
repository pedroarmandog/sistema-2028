"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const raiz = path.resolve(__dirname, "../..");
const falha = (mensagem, status) =>
  Object.assign(new Error(mensagem), { status });
function criarServico({
  Empresa,
  lerMidia,
  diretorio = raiz,
  normalizar,
  log = console,
} = {}) {
  async function png(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length > 8 * 1024 * 1024)
      throw Error("Logo inválida ou acima de 8 MB.");
    if (normalizar) return normalizar(bytes);
    // PNG compatível com PDFKit e jsPDF. Proporção preservada dentro de uma caixa fixa.
    return require("sharp")(bytes, { limitInputPixels: 24 * 1024 * 1024 })
      .rotate()
      .resize(640, 400, { fit: "contain", background: "#ffffff00" })
      .png()
      .toBuffer();
  }
  async function lerLogo(empresa) {
    let ref = empresa.logo;
    if (ref && typeof ref === "object")
      ref = ref.url || ref.src || ref.dataUrl || ref.base64;
    if (typeof ref !== "string" || !ref.trim()) return null;
    ref = ref.trim();
    if (ref.startsWith("data:image/")) {
      if (ref.length > 12 * 1024 * 1024 || !ref.includes(";base64,"))
        throw Error("Data URL inválida.");
      return png(Buffer.from(ref.slice(ref.indexOf(",") + 1), "base64"));
    }
    if (ref.length > 200 && /^[A-Za-z0-9+/=\r\n]+$/.test(ref))
      return png(Buffer.from(ref, "base64"));
    // URLs de uploads são referências do armazenamento da própria empresa, não downloads arbitrários.
    if (/^https?:\/\//i.test(ref)) {
      const u = new URL(ref);
      if (!u.pathname.startsWith("/uploads/"))
        throw Error("URL de logo não gerenciada.");
      ref = u.pathname;
    }
    if (lerMidia) {
      try {
        const r = await lerMidia(empresa.id, ref);
        if (r?.bytes) return png(r.bytes);
      } catch (e) {
        if ([401, 403].includes(e.status)) throw e;
      }
    }
    // Compatibilidade com logos antigas no disco. Nunca usa basename para outra referência.
    let relativa = ref.replace(/^\/uploads\//, "").replace(/^uploads\//, "");
    if (
      relativa.includes("\\") ||
      relativa.startsWith("/") ||
      relativa.split("/").some((p) => p === ".." || p === ".")
    )
      throw Error("Caminho de logo inválido.");
    const base = path.join(diretorio, "uploads");
    for (const arquivo of [
      path.join(base, relativa),
      path.join(base, "logos-empresas", relativa),
    ]) {
      try {
        return await png(await fs.readFile(arquivo));
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    throw Error("Arquivo da logo cadastrada não foi encontrado.");
  }
  async function padrao() {
    for (const rel of [
      "frontend/fivecon/Design sem nome (17).png",
      "frontend/logos/Logo PetHub (2).svg",
    ]) {
      try {
        return await png(await fs.readFile(path.join(diretorio, rel)));
      } catch (_) {}
    }
    return null;
  }
  async function carregarIdentidade(req, { empresaId } = {}) {
    const id = Number(req.user?.empresaId);
    if (!Number.isSafeInteger(id) || id <= 0)
      throw falha("Empresa autenticada não identificada.", 401);
    if (empresaId != null && Number(empresaId) !== id)
      throw falha("Documento de outra empresa.", 403);
    const empresa = await Empresa.findByPk(id);
    if (!empresa) throw falha("Empresa não encontrada.", 404);
    let logoBuffer = null,
      origem = "padrao";
    if (empresa.logo) {
      try {
        logoBuffer = await lerLogo(empresa);
        if (logoBuffer) origem = "empresa";
      } catch (e) {
        log.warn(
          "[PDF] Não foi possível ler a logo cadastrada da empresa " +
            id +
            ": " +
            e.message,
        );
      }
    }
    if (!logoBuffer) logoBuffer = await padrao();
    return {
      empresa,
      logoBuffer,
      logoPath: logoBuffer,
      nomeEmpresa:
        empresa.nomeFantasia || empresa.razaoSocial || empresa.nome || "",
      origem,
    };
  }
  return { carregarIdentidade, lerLogo };
}
let servico;
async function carregarIdentidade(req, opcoes) {
  servico ||= criarServico({
    Empresa: require("../models").Empresa,
    lerMidia: (empresa, ref) =>
      require("./midias").instancia().ler(empresa, ref),
  });
  return servico.carregarIdentidade(req, opcoes);
}
function desenharLogo(doc, bytes, { x, y, largura = 90, altura = 65 }) {
  if (!bytes) return false;
  doc.image(bytes, x, y, {
    fit: [largura, altura],
    align: "center",
    valign: "center",
  });
  return true;
}
module.exports = { criarServico, carregarIdentidade, desenharLogo };
