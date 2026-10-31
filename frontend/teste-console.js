// Teste direto dos filtros - adicione este código no console da página
(function testFilters() {
    console.log('🧪 Testando filtros diretamente...');
    
    // Verificar se elementos existem
    const statusTags = document.querySelectorAll('.status-tag');
    const tableBody = document.getElementById('agendamentosTableBody');
    
    console.log('📋 Elementos encontrados:');
    console.log('- Status tags:', statusTags.length);
    console.log('- Table body:', !!tableBody);
    
    if (statusTags.length === 0) {
        console.log('❌ PROBLEMA: Nenhuma tag de status encontrada!');
        return;
    }
    
    if (!tableBody) {
        console.log('❌ PROBLEMA: agendamentosTableBody não encontrado!');
        return;
    }
    
    // Testar API diretamente
    fetch('/api/agendamentos')
        .then(response => response.json())
        .then(data => {
            console.log('📊 Dados da API:', data.length, 'agendamentos');
            data.forEach(ag => console.log(`  - ${ag.id}: ${ag.status} - ${ag.petNome}`));
            
            // Testar filtro manual
            const agendados = data.filter(ag => ag.status === 'agendado');
            console.log('🎯 Agendamentos com status "agendado":', agendados.length);
            
            if (agendados.length > 0) {
                console.log('✅ Existem agendamentos com status "agendado" - o problema está no JavaScript!');
                
                // Renderizar manualmente no table body
                const html = agendados.map(ag => `
                    <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0;">
                        <strong>${ag.horario}</strong> - ${ag.petNome} - ${ag.servico} - ${ag.status}
                    </div>
                `).join('');
                
                tableBody.innerHTML = html;
                console.log('📝 Renderizado manualmente:', agendados.length, 'agendamentos');
            } else {
                console.log('❌ NÃO há agendamentos com status "agendado"');
            }
        })
        .catch(error => {
            console.error('💥 Erro na API:', error);
        });
})();