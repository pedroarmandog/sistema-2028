"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^rel\.?\s*/, "");
const labels = {
  "demonstrativo de resultados": "relatorioDRE",
  "recebiveis por produtos": "relatorioRecebiveisProdutos",
  "recebiveis por produto": "relatorioRecebiveisProdutos",
  "demonstrativo de caixa": "relatorioDemonstrativoCaixa",
  "devolucao de venda": "devolucaoVenda",
  "sugestao de compra": "sugestaoCompra",
  "entrada no periodo": "entradaPeriodo",
  "entrada por produto": "entradaProduto",
};
function integrar(root) {
  let count = 0;
  function walk(dir) {
    for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git"].includes(file.name)) continue;
      const f = path.join(dir, file.name);
      if (file.isDirectory()) {
        walk(f);
        continue;
      }
      if (!f.endsWith(".html")) continue;
      const original = fs.readFileSync(f, "utf8");
      let s = original;
      if (!/sidebar|dashboard\.css|inject-sidebar/.test(s)) continue;
      if (/<head\b/i.test(s))
        s = s.replace(
          /<head\b[^>]*>/i,
          (tag) =>
            tag +
            (!s.includes("components/feature-flags.js")
              ? '\n<script src="/components/feature-flags.js?v=20261121-midia1"></script>'
              : "") +
            (!s.includes("components/produto-imagens.js")
              ? '\n<script src="/components/produto-imagens.js?v=20261121-midia1"></script>'
              : ""),
        );
      s = s.replace(
        /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi,
        (all, tag, attrs, body) => {
          if (/data-pethub-feature/.test(attrs)) return all;
          const key = labels[norm(body.replace(/<[^>]*>/g, ""))];
          return key
            ? all.replace(
                /^<(a|button)\b/i,
                '<$1 data-pethub-feature="' + key + '"',
              )
            : all;
        },
      );
      if (
        /(?:novo|editar)-produto\.html$/.test(f) &&
        !s.includes("produtoFotoArquivo")
      )
        s = s.replace(
          /<form\b[^>]*class="cadastro-form"[^>]*>/i,
          (tag) =>
            tag +
            '\n<div class="form-group" style="padding:12px 0"><label for="produtoFotoArquivo">Foto do produto</label><input type="file" id="produtoFotoArquivo" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"><small>Até 8 MB. A imagem será otimizada automaticamente.</small></div>',
        );
      s = s.replace(
        /(src="[^\"]*\/(?:meus-itens|pagina-produto|novo-produto|editar-produto|caixa-rapido)\.js)(?:\?[^\"]*)?"/g,
        '$1?v=20261121-midia1"',
      );
      if (s !== original) {
        fs.writeFileSync(f, s);
        count++;
      }
    }
  }
  walk(root);
  return count;
}
module.exports = { integrar };
if (require.main === module)
  console.log(
    "HTMLs integrados:",
    integrar(path.resolve(__dirname, "../../frontend")),
  );
