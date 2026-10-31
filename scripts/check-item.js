const http = require('http');
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;
const idToFind = process.argv[2];
if (!idToFind) {
  console.error('Uso: node scripts/check-item.js <id>');
  process.exit(1);
}
const url = `http://${host}:${port}/api/itens`;

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const items = JSON.parse(data);
      const found = items.find(it => String(it.id) === String(idToFind) || String(it.codigo) === String(idToFind));
      if (found) {
        console.log('OK: item encontrado:');
        console.log(JSON.stringify(found, null, 2));
        process.exit(0);
      } else {
        console.log('NÃO ENCONTRADO: nenhum item com id/codigo =', idToFind);
        process.exit(2);
      }
    } catch (err) {
      console.error('Erro ao parsear resposta:', err.message);
      process.exit(3);
    }
  });
}).on('error', (err) => {
  console.error('Erro ao conectar na API:', err.message);
  process.exit(4);
});
