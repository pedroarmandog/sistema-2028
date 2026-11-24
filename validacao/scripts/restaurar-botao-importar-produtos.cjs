// Executar na raiz do PetHub: node scripts/restaurar-botao-importar-produtos.cjs
const fs = require('node:fs');
const path = require('node:path');
function integrar(html) {
  if (!/class=["'][^"']*\baction-bar\b/.test(html) || !/<\/head\s*>/i.test(html) || !/<\/body\s*>/i.test(html))
    throw new Error('Estrutura de Meus Itens não reconhecida; nenhum arquivo foi alterado.');
  const script = /<script\b[^>]*\bsrc=["'][^"']*\bimportacao\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>\r?\n?/gi;
  const css = /<link\b[^>]*\bhref=["'][^"']*\bimportacao\.css(?:\?[^"']*)?["'][^>]*>\r?\n?/gi;
  html = html.replace(script, '').replace(css, '');
  return html.replace(/<\/head\s*>/i, '<link rel="stylesheet" href="../importacao.css?v=20261123-botao1">\n</head>')
    .replace(/<\/body\s*>/i, '<script src="../importacao.js?v=20261123-botao1" data-tipo="produtos" data-alvo=".action-bar"></script>\n</body>')
    .replace(/\n{3,}(?=<(?:link rel="stylesheet" href="\.\.\/importacao|script src="\.\.\/importacao))/g, '\n\n');
}
function aplicar(root = path.resolve(__dirname, '..')) {
  const pagina = path.join(root, 'frontend/item/meus-itens.html');
  const antes = fs.readFileSync(pagina, 'utf8');
  const depois = integrar(antes);
  const faltantes = ['importacao.js', 'importacao.css'].filter(nome => !fs.existsSync(path.join(root, 'frontend', nome)));
  for (const nome of faltantes) {
    if (!fs.existsSync(path.join(root, 'recuperacao-importacao/frontend', nome)))
      throw new Error('Recurso ausente: frontend/' + nome + '. Copie também a pasta recuperacao-importacao do pacote.');
  }
  // Preserva o importador instalado, inclusive versões mais novas e customizações.
  for (const nome of faltantes)
    fs.copyFileSync(path.join(root, 'recuperacao-importacao/frontend', nome), path.join(root, 'frontend', nome), fs.constants.COPYFILE_EXCL);
  if (antes !== depois) fs.writeFileSync(pagina, depois);
  return { pagina, recuperados: faltantes };
}
module.exports = { integrar, aplicar };
if (require.main === module) {
  try { console.log('Botão integrado a Meus Itens.', aplicar()); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
