const http = require('http');

function postSaida(payload){
  return new Promise((resolve,reject)=>{
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost', port: 3000, path: '/api/saida/manual', method: 'POST', headers: {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, res => {
      let body=''; res.setEncoding('utf8'); res.on('data',d=>body+=d); res.on('end',()=>resolve({status: res.statusCode, body}));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function getSaidas(){
  return new Promise((resolve,reject)=>{
    http.get('http://localhost:3000/api/saida/manual', res=>{
      let body=''; res.setEncoding('utf8'); res.on('data',d=>body+=d); res.on('end',()=>resolve({status: res.statusCode, body}));
    }).on('error', reject);
  });
}

(async ()=>{
  try{
    const payload = { tipoEntrada: 'TESTE_SAIDA', observacao: 'Teste automatizado', itens: [{ id: 'p-test', produto: 'Produto Teste', codigo: 'P001', quantidade: 3, custo: 10 }], situacao: 'Finalizado' };
    console.log('POST payload:', payload);
    const p = await postSaida(payload);
    console.log('POST status=', p.status, 'body=', p.body);
    const g = await getSaidas();
    console.log('GET status=', g.status, 'body=', g.body);
  }catch(e){ console.error('Erro teste:', e); process.exit(1);} 
})();
