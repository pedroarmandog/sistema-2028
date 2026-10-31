// Script para limpar entradas duplicadas

async function limparDuplicadas() {
    try {
        const fetch = globalThis.fetch;
        // Buscar todas as entradas
        const res = await fetch('http://localhost:3000/api/entrada/manual');
        const entradas = await res.json();
        
        console.log(`📊 Total de entradas: ${entradas.length}`);
        
        // Agrupar por número + fornecedor
        const grupos = {};
        entradas.forEach(e => {
            const key = `${e.numero || 'SEM_NUM'}_${e.fornecedor || 'SEM_FORN'}`;
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(e);
        });
        
        // Encontrar duplicatas (grupos com mais de 1 entrada)
        const duplicadas = Object.entries(grupos).filter(([_, arr]) => arr.length > 1);
        
        console.log(`🔍 Grupos duplicados: ${duplicadas.length}`);
        
        for (const [key, arr] of duplicadas) {
            console.log(`\n📦 ${key}: ${arr.length} entradas duplicadas`);
            
            // Manter a mais recente, deletar as outras
            arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            const manter = arr[0];
            const deletar = arr.slice(1);
            
            console.log(`  ✅ Mantendo ID ${manter.id} (${manter.createdAt})`);
            
            for (const d of deletar) {
                console.log(`  🗑️  Deletando ID ${d.id} (${d.createdAt})`);
                try {
                    const delRes = await fetch(`http://localhost:3000/api/entrada/manual/${d.id}`, {
                        method: 'DELETE'
                    });
                    if (delRes.ok) {
                        console.log(`    ✅ Deletada`);
                    } else {
                        console.log(`    ❌ Falha ao deletar: ${delRes.status}`);
                    }
                } catch (err) {
                    console.log(`    ❌ Erro: ${err.message}`);
                }
            }
        }
        
        console.log('\n✅ Limpeza concluída!');
        
    } catch (err) {
        console.error('❌ Erro:', err);
        process.exit(1);
    }
}

limparDuplicadas();
