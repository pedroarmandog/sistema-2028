// Script para deletar agrupamentos especificamente por nome (Node.js)
// Uso:
//  node delete-agrupamentos-nomes.js --dry   <-- lista o que seria deletado (recomendado)
//  node delete-agrupamentos-nomes.js        <-- executa a deleção
//  node delete-agrupamentos-nomes.js --api http://localhost:3000

(async function(){
  try {
    const argv = require('process').argv.slice(2);
    const args = {};
    for (let i=0;i<argv.length;i++) {
      if (argv[i] === '--dry') args.dry = true;
      else if (argv[i] === '--api' && argv[i+1]) { args.api = argv[i+1]; i++; }
    }

    const API_BASE = args.api || process.env.API_BASE || 'http://localhost:3000';
    const fetch = global.fetch || (await import('node-fetch')).default;

    // Nomes exatamente como aparecem na sua tela (adapte se necessário)
    const nomes = [
      'Assinatura Centro de Estética',
      'CONSULTÓRIO',
      'LOJA'
    ];

    function normalize(s){
      if (!s && s !== 0) return '';
      try { return s.toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); } catch(e){ return s.toString().trim().toLowerCase(); }
    }
    function slugify(s){ return normalize(s).replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

    console.log('API base:', API_BASE);
    console.log('Dry run:', !!args.dry);

    // 1) buscar todos agrupamentos
    const res = await fetch(`${API_BASE}/api/agrupamentos`, { method: 'GET' });
    if (!res.ok) throw new Error(`GET /api/agrupamentos retornou ${res.status}`);
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('Resposta não é array');

    // 2) encontrar correspondências por nome/slug (case-insensitive, remove acentos)
    const toDelete = [];
    arr.forEach(item => {
      const n = normalize(item.name || '');
      const s = slugify(item.name || '');
      for (const nome of nomes) {
        const targetN = normalize(nome);
        const targetS = slugify(nome);
        if (n === targetN || s === targetS || n.includes(targetN) || targetN.includes(n)) {
          toDelete.push({ id: item.id, name: item.name });
          break;
        }
      }
    });

    if (!toDelete.length) {
      console.log('Nenhum agrupamento correspondente encontrado entre os resultados da API. Nada a fazer.');
      process.exit(0);
    }

    console.log('\nEncontrados para deleção:');
    toDelete.forEach(i => console.log(` - id=${i.id}  name="${i.name}"`));

    if (args.dry) {
      console.log('\nDry run habilitado — nenhum DELETE será feito.');
      process.exit(0);
    }

    // 3) deletar cada um
    for (const it of toDelete) {
      console.log(`Deletando id=${it.id} name="${it.name}" ...`);
      const r = await fetch(`${API_BASE}/api/agrupamentos/${it.id}`, { method: 'DELETE' });
      if (!r.ok) {
        console.error(`Falha ao deletar id=${it.id} (status ${r.status})`);
      } else {
        console.log(`OK deletado id=${it.id}`);
      }
    }

    // 4) reconsultar e informar
    const res2 = await fetch(`${API_BASE}/api/agrupamentos`, { method: 'GET' });
    const arr2 = await res2.json();
    console.log('\nAgora a API retorna:', Array.isArray(arr2) ? `${arr2.length} agrupamentos` : arr2);
    if (Array.isArray(arr2)) {
      const leftovers = arr2.filter(x => nomes.some(nm => normalize(x.name||'').includes(normalize(nm)) || slugify(x.name||'') === slugify(nm)));
      if (leftovers.length) {
        console.log('\nATENÇÃO: ainda foram encontrados itens correspondentes após tentativas de deleção:');
        leftovers.forEach(x => console.log(` - id=${x.id} name="${x.name}"`));
      } else {
        console.log('\nConfirmação: nenhum agrupamento com esses nomes foi retornado pela API.');
      }
    }

    console.log('\nPronto.');
  } catch (e) {
    console.error('Erro no script:', e);
    process.exit(1);
  }
})();
