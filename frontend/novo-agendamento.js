// Script específico para Novo Agendamento Sidebar
console.log('Script de Novo Agendamento carregado!');

function abrirNovoAgendamento() {
    console.log('=== ABRINDO SIDEBAR ===');
    
    const sidebar = document.getElementById('novoAgendamentoSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    console.log('Sidebar encontrado:', !!sidebar, sidebar);
    console.log('Overlay encontrado:', !!overlay, overlay);
    
    if (sidebar) {
        sidebar.classList.add('open');
        console.log('Classe "open" adicionada ao sidebar');
        console.log('Classes do sidebar:', sidebar.className);
    }
    
    if (overlay) {
        overlay.classList.add('show');
        console.log('Classe "show" adicionada ao overlay');
        console.log('Classes do overlay:', overlay.className);
    }
    
    document.body.style.overflow = 'hidden';
    console.log('Body overflow = hidden');
    
    // Teste visual - aplicar estilo direto
    if (sidebar) {
        sidebar.style.right = '0px';
        sidebar.style.transition = 'right 0.3s ease';
        console.log('Estilo direto aplicado: right = 0px');
    }
    
    if (overlay) {
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        console.log('Overlay visível');
    }
}

function fecharNovoAgendamento() {
    console.log('=== FECHANDO SIDEBAR ===');
    
    const sidebar = document.getElementById('novoAgendamentoSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) {
        sidebar.classList.remove('open');
        sidebar.style.right = '-500px';
    }
    
    if (overlay) {
        overlay.classList.remove('show');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
    }
    
    document.body.style.overflow = 'auto';
}

function novoAtendimento() {
    console.log('=== FUNÇÃO NOVO ATENDIMENTO CHAMADA ===');
    abrirNovoAgendamento();
}

// Configurar quando DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado - configurando Novo Agendamento');
    
    // Verificar se elementos existem
    const elementos = {
        sidebar: document.getElementById('novoAgendamentoSidebar'),
        overlay: document.getElementById('sidebarOverlay'),
        btnPrincipal: document.getElementById('btnNovoAgendamento'),
        btnFechar: document.getElementById('btnCloseSidebar'),
        btnCancelar: document.getElementById('btnCancelarAgendamento')
    };
    
    console.log('=== VERIFICAÇÃO DE ELEMENTOS ===');
    for (const [nome, elemento] of Object.entries(elementos)) {
        console.log(`${nome}:`, !!elemento, elemento?.id || 'sem ID');
    }
    
    // Configurar events
    if (elementos.btnFechar) {
        elementos.btnFechar.onclick = fecharNovoAgendamento;
        console.log('Event onclick configurado para btnFechar');
    }
    
    if (elementos.btnCancelar) {
        elementos.btnCancelar.onclick = fecharNovoAgendamento;
        console.log('Event onclick configurado para btnCancelar');
    }
    
    if (elementos.overlay) {
        elementos.overlay.onclick = fecharNovoAgendamento;
        console.log('Event onclick configurado para overlay');
    }
    
    if (elementos.btnPrincipal) {
        elementos.btnPrincipal.onclick = abrirNovoAgendamento;
        console.log('Event onclick configurado para btnPrincipal');
    }
    
    console.log('=== CONFIGURAÇÃO CONCLUÍDA ===');
});

// Função para botão do estado vazio
function novoAtendimento() {
    console.log('Função novoAtendimento chamada!');
    abrirNovoAgendamento();
}