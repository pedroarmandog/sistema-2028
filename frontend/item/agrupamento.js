// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log('🚀 menu.js carregado (snippet do dashboard)');

function detectarIDsDuplicados() {
    const idsParaVerificar = [
        'clienteMenuItem', 'clienteSubmenu',
        'itemMenuItem', 'itemSubmenu',
        'petMenuItem', 'petSubmenu', 
        'atendimentoMenuItem', 'atendimentoSubmenu',
        'financeiroMenuItem', 'financeiroSubmenu',
        'configuracaoMenuItem', 'configuracaoSubmenu',
        'painelMenuItem', 'painelSubmenu',
        'comprasMenuItem', 'comprasSubmenu'
    ];
    
    let problemas = [];
    idsParaVerificar.forEach(id => {
        const elementos = document.querySelectorAll(`#${id}`);
        if (elementos.length > 1) {
            problemas.push(`ID '${id}' duplicado ${elementos.length} vezes`);
            console.warn(`⚠️  ID DUPLICADO: ${id} (${elementos.length} elementos)`);
        }
    });
    
    if (problemas.length > 0) {
        console.error('🚨 PROBLEMAS DE IDs DUPLICADOS DETECTADOS:');
        problemas.forEach(p => console.error(`   - ${p}`));
        return false;
    }
    
    console.log('✅ Verificação de IDs: Nenhum duplicado encontrado');
    return true;
}

function configurarDropdownInicioRapido() {
    if (window.dropdownConfigurado) return;
    const dropdownBtn = document.getElementById('inicioRapidoBtn');
    const dropdown = document.querySelector('.dropdown');
    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const wasOpen = dropdown.classList.contains('open');
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                if (dropdown.classList.contains('open')) dropdown.classList.remove('open');
            }
        });

        window.dropdownConfigurado = true;
    }
}

function salvarEstadoSubmenu(submenuId, isOpen) {
    try {
        const estadoSubmenus = JSON.parse(localStorage.getItem('estadoSubmenus') || '{}');
        estadoSubmenus[submenuId] = isOpen;
        localStorage.setItem('estadoSubmenus', JSON.stringify(estadoSubmenus));
    } catch (error) { console.error(error); }
}

function obterEstadoSubmenu(submenuId) {
    try { return JSON.parse(localStorage.getItem('estadoSubmenus') || '{}')[submenuId] || false; } catch (e) { return false; }
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
    const menuItems = document.querySelectorAll(`#${menuItemId}`);
    const submenus = document.querySelectorAll(`#${submenuId}`);
    if (menuItems.length > 1) {
        for (let i = 1; i < menuItems.length; i++) {
            const duplicateElement = menuItems[i].closest('.nav-item-with-submenu');
            if (duplicateElement) duplicateElement.remove();
        }
    }
    if (submenus.length > 1) { for (let i = 1; i < submenus.length; i++) submenus[i].remove(); }

    const menuItem = document.getElementById(menuItemId);
    const submenu = document.getElementById(submenuId);
    const menuContainer = menuItem?.parentElement;
    if (menuItem && submenu && menuContainer) {
        if (menuItem.getAttribute('data-listener-added')) return;
        menuItem.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            if (e.target.closest('.submenu-item')) return;
            fecharOutrosSubmenus(submenuName);
            const isNowOpen = !menuContainer.classList.contains('open');
            menuContainer.classList.toggle('open');
            submenu.classList.toggle('open');
            salvarEstadoSubmenu(submenuName, isNowOpen);
        });

        const submenuItems = submenu.querySelectorAll('.submenu-item[href]');
        submenuItems.forEach(item => item.addEventListener('click', function(e) { e.stopPropagation(); setTimeout(()=>{ menuContainer.classList.remove('open'); submenu.classList.remove('open'); salvarEstadoSubmenu(submenuName, false); }, 150); }));
        const submenuItemsSemHref = submenu.querySelectorAll('.submenu-item:not([href])');
        submenuItemsSemHref.forEach(item => item.addEventListener('click', function(e) { e.stopPropagation(); menuContainer.classList.remove('open'); submenu.classList.remove('open'); salvarEstadoSubmenu(submenuName, false); }));

        menuItem.setAttribute('data-listener-added', 'true');
    }
}

function fecharOutrosSubmenus(submenuAtual) {
    const todosSubmenus = [
        { container: 'clienteMenuItem', submenu: 'clienteSubmenu', id: 'cliente' },
        { container: 'itemMenuItem', submenu: 'itemSubmenu', id: 'item' },
        { container: 'petMenuItem', submenu: 'petSubmenu', id: 'pet' },
        { container: 'atendimentoMenuItem', submenu: 'atendimentoSubmenu', id: 'atendimento' },
        { container: 'financeiroMenuItem', submenu: 'financeiroSubmenu', id: 'financeiro' },
        { container: 'configuracaoMenuItem', submenu: 'configuracaoSubmenu', id: 'configuracao' },
        { container: 'painelMenuItem', submenu: 'painelSubmenu', id: 'painel' },
        { container: 'comprasMenuItem', submenu: 'comprasSubmenu', id: 'compras' }
    ];
    todosSubmenus.forEach(({ container, submenu, id }) => {
        if (id !== submenuAtual) {
            const containerElement = document.getElementById(container)?.parentElement;
            const submenuElement = document.getElementById(submenu);
            if (containerElement && submenuElement) {
                if (containerElement.classList.contains('open')) { containerElement.classList.remove('open'); submenuElement.classList.remove('open'); salvarEstadoSubmenu(id, false); }
            }
        }
    });
}

function limparEstadoSubmenus() { try { localStorage.removeItem('estadoSubmenus'); } catch(e){} }

function destacarSecaoAtiva() {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    const mapeamentoPaginas = {
        'clientes.html': 'clienteMenuItem', 'novo-cliente.html': 'clienteMenuItem', 'grupos-clientes.html': 'clienteMenuItem', 'meus-clientes.html': 'clienteMenuItem',
        'meus-itens.html': 'itemMenuItem', 'novo-item.html': 'itemMenuItem', 'agrupamento.html': 'itemMenuItem', 'marca.html': 'itemMenuItem', 'unidade.html': 'itemMenuItem', 'descontos-item.html': 'itemMenuItem', 'comissao.html': 'itemMenuItem', 'etiquetas.html': 'itemMenuItem', 'tributacao.html': 'itemMenuItem', 'estoque.html': 'itemMenuItem', 'clinica.html': 'itemMenuItem', 'manutencao-produtos.html': 'itemMenuItem', 'controle-validade.html': 'itemMenuItem',
        'agendamentos-novo.html': 'atendimentoMenuItem', 'agendamentos.html': 'atendimentoMenuItem', 'minha-agenda.html': 'atendimentoMenuItem',
        'meus-pets.html': 'petMenuItem', 'novo-pet.html': 'petMenuItem', 'dashboard.html': 'dashboard'
    };
    const itemParaDestacar = mapeamentoPaginas[paginaAtual];
    if (itemParaDestacar && itemParaDestacar !== 'dashboard') {
        const menuItem = document.getElementById(itemParaDestacar);
        if (menuItem) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            menuItem.classList.add('active');
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    detectarIDsDuplicados();
    limparEstadoSubmenus();

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (menuToggle && sidebar && mainContent) {
        if (!menuToggle.hasAttribute('data-toggle-configured')) {
            menuToggle.setAttribute('data-toggle-configured', 'true');
            menuToggle.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); sidebar.classList.toggle('collapsed'); mainContent.classList.toggle('sidebar-collapsed'); });
        }
    }

    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (sidebar && mainContent && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.add('collapsed'); mainContent.classList.add('sidebar-collapsed');
            }
        }
    });

    configurarDropdownInicioRapido();
    configurarPersistenciaSubmenu('clienteMenuItem', 'clienteSubmenu', 'cliente');
    configurarPersistenciaSubmenu('itemMenuItem', 'itemSubmenu', 'item');
    configurarPersistenciaSubmenu('painelMenuItem', 'painelSubmenu', 'painel');
    configurarPersistenciaSubmenu('petMenuItem', 'petSubmenu', 'pet');
    configurarPersistenciaSubmenu('atendimentoMenuItem', 'atendimentoSubmenu', 'atendimento');
    configurarPersistenciaSubmenu('financeiroMenuItem', 'financeiroSubmenu', 'financeiro');
    configurarPersistenciaSubmenu('configuracaoMenuItem', 'configuracaoSubmenu', 'configuracao');
    configurarPersistenciaSubmenu('comprasMenuItem', 'comprasSubmenu', 'compras');
    destacarSecaoAtiva();
});

// Funções de navegação rápida (shims)
function novoAtendimento(){ window.location.href = '/agendamentos-novo.html'; closeDropdown(); }
function novoPet(){ window.location.href = '/pets/cadastro-pet.html'; closeDropdown(); }
function novoCliente(){ window.location.href = '/clientes.html'; closeDropdown(); }
function novoContrato(){ window.location.href = '/contrato-novo.html'; closeDropdown(); }
function novaVenda(){ window.location.href = '/venda-nova.html'; closeDropdown(); }
function novaContaPagar(){ window.location.href = '/contas-pagar-nova.html'; closeDropdown(); }
function closeDropdown(){ const dropdown = document.querySelector('.dropdown'); if (dropdown) dropdown.classList.remove('open'); }

// Configurar submenu lateral para Caixa
function configurarSubmenuLateralCaixa() {
    console.log('🔍 Iniciando configuração do submenu lateral Caixa...');
    
    const caixaSubmenuItem = document.getElementById('caixaSubmenuItem');
    const caixaLateralSubmenu = document.getElementById('caixaLateralSubmenu');
    const submenuItemWithLateral = document.querySelector('.submenu-item-with-lateral');
    
    console.log('🔍 Elementos encontrados:');
    console.log('- caixaSubmenuItem:', caixaSubmenuItem);
    console.log('- caixaLateralSubmenu:', caixaLateralSubmenu);
    console.log('- submenuItemWithLateral:', submenuItemWithLateral);
    
    if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
        console.log('✅ Configurando submenu lateral do Caixa...');
        
        let isSubmenuVisible = false;
        
        // Função para mostrar submenu
        const showSubmenu = () => {
            console.log('📤 Mostrando submenu lateral');
            caixaLateralSubmenu.style.opacity = '1';
            caixaLateralSubmenu.style.visibility = 'visible';
            caixaLateralSubmenu.style.transform = 'translateX(0)';
            isSubmenuVisible = true;
        };
        
        // Função para esconder submenu
        const hideSubmenu = () => {
            console.log('📥 Escondendo submenu lateral');
            caixaLateralSubmenu.style.opacity = '0';
            caixaLateralSubmenu.style.visibility = 'hidden';
            caixaLateralSubmenu.style.transform = 'translateX(-10px)';
            isSubmenuVisible = false;
        };
        
        // Configurar hover no container principal
        submenuItemWithLateral.addEventListener('mouseenter', function() {
            console.log('🎯 Mouse entrou no container do Caixa');
            showSubmenu();
        });
        
        submenuItemWithLateral.addEventListener('mouseleave', function() {
            console.log('🎯 Mouse saiu do container do Caixa');
            setTimeout(hideSubmenu, 100);
        });
        
        // Configurar hover no submenu lateral
        caixaLateralSubmenu.addEventListener('mouseenter', function() {
            console.log('🎯 Mouse entrou no submenu lateral');
            showSubmenu();
        });
        
        caixaLateralSubmenu.addEventListener('mouseleave', function() {
            console.log('🎯 Mouse saiu do submenu lateral');
            hideSubmenu();
        });
        
        // Adicionar event listeners para os itens do submenu lateral
        const lateralItems = caixaLateralSubmenu.querySelectorAll('.lateral-submenu-item');
        console.log(`🔍 Encontrados ${lateralItems.length} itens no submenu lateral`);
        
        lateralItems.forEach((item, index) => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const texto = this.textContent.trim();
                console.log(`🚀 Clique em: ${texto}`);
                
                // Aqui você pode adicionar navegação específica para cada item
                switch(texto) {
                    case 'Abertura/Fechamento':
                        alert('Navegando para Abertura/Fechamento de Caixa');
                        // window.location.href = '/caixa/abertura-fechamento.html';
                        break;
                    case 'Suprimento/Sangria':
                        alert('Navegando para Suprimento/Sangria');
                        // window.location.href = '/caixa/suprimento-sangria.html';
                        break;
                    case 'Rel. Demonstrativo de caixa':
                        alert('Navegando para Relatório Demonstrativo de Caixa');
                        // window.location.href = '/caixa/relatorio-demonstrativo.html';
                        break;
                }
                
                hideSubmenu();
            });
            
            console.log(`✅ Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`);
        });
        
        console.log('✅ Submenu lateral do Caixa configurado com sucesso!');
    } else {
        console.error('❌ Elementos do submenu lateral Caixa não encontrados');
        console.log('- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML');
        console.log('- Verifique se a classe .submenu-item-with-lateral existe no HTML');
    }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que outros elementos carregaram
    setTimeout(() => {
        configurarSubmenuLateralCaixa();
    }, 200);
    
    // Inicializar funcionalidades da página de Agrupamento
    inicializarAgrupamento();
});

// ========================================
// AGRUPAMENTO DE PRODUTOS - FUNCIONALIDADES
// ========================================

function inicializarAgrupamento() {
    console.log('🔧 Inicializando funcionalidades de Agrupamento...');
    // garantir que o cache local não contenha dados antigos que possam recriar agrupamentos
    try { window._localAgrupamentosCache = []; } catch(e) { console.debug('não foi possível limpar cache local on init', e); }
    
    // Configurar expansão/recolhimento de grupos
    configurarChevrons();
    
    // Configurar botão Adicionar Agrupamento
    configurarBotaoAdicionar();
    
    // Configurar botões de Editar e Excluir
    configurarBotoesAcao();
    // Configurar listener delegado como fallback para quaisquer botões dinâmicos/estáticos
    configurarDelegacaoBotoes();

    // Adicionar listener global em capture para garantir que cliques em .btn-excluir sejam capturados
    // mesmo que alguma sobreposição/CSS esteja interferindo. Reutiliza a lógica de remoção.
    try {
        if (!window.__agrup_delete_listener_installed) {
            document.addEventListener('click', function(ev){
                try {
                    const target = ev.target || ev.srcElement;
                    const btn = (target && target.closest) ? target.closest('.btn-excluir') : null;
                    if (!btn) return;
                    // interceptar e delegar para a lógica padrão
                    ev.preventDefault(); ev.stopPropagation();
                    const tr = btn.closest('tr'); if (!tr) return;
                    const nomeEl = tr.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
                    const descricao = nomeEl ? nomeEl.textContent.trim() : '';
                    const agrupId = tr.getAttribute('data-agrup-id');
                    openConfirm(`Deseja realmente excluir "${descricao}"? Esta ação não poderá ser desfeita.`, async function(){
                        try{
                            await removeAgrupamentoAPI(agrupId || descricao);
                            // atualizar DOM: remover linhas correspondentes
                            try { tr.remove(); } catch(e){}
                            // forçar re-render e limpar cache
                            try { window._localAgrupamentosCache = []; await renderAgrupamentosAPI(); } catch(e){}
                            showToast(`"${descricao}" foi excluído!`, 'success');
                        }catch(err){ console.error(err); showToast('Erro ao excluir agrupamento', 'warning'); }
                    });
                } catch(e) { console.debug('global delete listener error', e); }
            }, true);
            window.__agrup_delete_listener_installed = true;
        }
    } catch(e) { console.debug('não foi possível instalar listener global de delete', e); }
    
    // Configurar pesquisa
    configurarPesquisa();
    
    // Configurar paginação
    configurarPaginacao();
    
    // Carregar agrupamentos da API
    try { renderAgrupamentosAPI(); } catch(e) { console.error('Erro ao carregar agrupamentos da API', e); }

    console.log('✅ Funcionalidades de Agrupamento inicializadas!');
}

// Listener delegado no tbody para capturar cliques em botões Editar/Excluir (fallback)
function configurarDelegacaoBotoes(){
    try{
        const tbody = document.getElementById('agrupamentosTableBody');
        if (!tbody) return;
        if (tbody.getAttribute('data-delegate') === '1') return; // já registrado

        tbody.addEventListener('click', function(ev){
            const target = ev.target || ev.srcElement;
            // subir até encontrar botão
            let btn = target.closest ? target.closest('button') : null;
            if (!btn && target.nodeName === 'BUTTON') btn = target;
            if (!btn) return;
            if (btn.classList.contains('btn-editar')){
                ev.stopPropagation();
                try{ console.debug('[delegate] editar clicado', btn); }catch(e){}
                // localizar a linha pai
                const tr = btn.closest('tr'); if (!tr) return;
                const nomeEl = tr.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
                const descricao = nomeEl ? nomeEl.textContent.trim() : '';
                const agrupId = tr.getAttribute('data-agrup-id');
                // reutilizar lógica existente: abrir modal de edição
                (async function(){
                    try{
                        const agrupamentos = await getAgrupamentosAPI();
                        const found = agrupamentos.find(x => x.id == agrupId || (x.name||'').trim() === descricao);
                        if (found) {
                            openAdicionarAgrupamentoModal({ id: found.id, name: found.name, subgrupos: found.subgrupos || [], originalName: found.name });
                        } else {
                            // fallback: coletar subgrupos do DOM estático usando o data-grupo do tr
                            try {
                                const chevron = tr.querySelector('.chevron-icon');
                                const groupId = chevron ? chevron.dataset.grupo : null;
                                let subs = [];
                                if (groupId) {
                                    subs = Array.from(document.querySelectorAll(`.grupo-${groupId}`)).map(r => {
                                        const el = r.querySelector('.subgrupo-nome, .item-nome');
                                        return el ? el.textContent.trim() : null;
                                    }).filter(Boolean);
                                }
                                openAdicionarAgrupamentoModal({ name: descricao, subgrupos: subs, originalName: descricao, originalGroupId: groupId });
                            } catch(e) {
                                openAdicionarAgrupamentoModal({ name: descricao, subgrupos: [], originalName: descricao });
                            }
                        }
                    }catch(e){ console.error(e); openAdicionarAgrupamentoModal(descricao); }
                })();
                return;
            }
            if (btn.classList.contains('btn-excluir')){
                ev.stopPropagation();
                try{ console.debug('[delegate] excluir clicado', btn); }catch(e){}
                const tr = btn.closest('tr'); if (!tr) return;
                const nomeEl = tr.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
                const descricao = nomeEl ? nomeEl.textContent.trim() : '';
                const agrupId = tr.getAttribute('data-agrup-id');
                openConfirm(`Deseja realmente excluir \"${descricao}\"? Esta ação não poderá ser desfeita.`, async function(){
                    try{
                        await removeAgrupamentoAPI(agrupId || descricao);
                        showToast(`\"${descricao}\" foi excluído!`, 'success');
                    }catch(e){ console.error(e); showToast('Erro ao excluir agrupamento', 'warning'); }
                });
                return;
            }
        });

        tbody.setAttribute('data-delegate','1');
        console.debug('[configurarDelegacaoBotoes] listener delegado registrado no tbody');
    }catch(e){ console.debug('Erro ao configurar delegacao de botoes', e); }
}

// Configurar expansão/recolhimento de grupos
function configurarChevrons() {
    const chevrons = document.querySelectorAll('.chevron-icon');
    
    chevrons.forEach(chevron => {
        chevron.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const isGrupo = this.dataset.grupo;
            const isSubgrupo = this.dataset.subgrupo;
            
            // Toggle rotação do chevron
            this.classList.toggle('rotated');
            
            if (isGrupo) {
                // Expandir/recolher subgrupos do grupo
                const subgrupos = document.querySelectorAll(`.grupo-${isGrupo}`);
                subgrupos.forEach(sub => {
                    if (sub.style.display === 'none' || sub.style.display === '') {
                        sub.style.display = 'table-row';
                    } else {
                        sub.style.display = 'none';
                        
                        // Se recolhendo, também recolher sub-subgrupos
                        const chevronSubgrupo = sub.querySelector('.chevron-icon');
                        if (chevronSubgrupo && chevronSubgrupo.classList.contains('rotated')) {
                            chevronSubgrupo.classList.remove('rotated');
                            const subSubgrupoClass = chevronSubgrupo.dataset.subgrupo;
                            if (subSubgrupoClass) {
                                document.querySelectorAll(`.subgrupo-${subSubgrupoClass}`).forEach(s => {
                                    s.style.display = 'none';
                                });
                            }
                        }
                    }
                });
            } else if (isSubgrupo) {
                // Expandir/recolher itens do subgrupo
                const itens = document.querySelectorAll(`.subgrupo-${isSubgrupo}`);
                itens.forEach(item => {
                    if (item.style.display === 'none' || item.style.display === '') {
                        item.style.display = 'table-row';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
    
    console.log(`✅ ${chevrons.length} chevrons configurados`);
}

// Configurar botão Adicionar Agrupamento
function configurarBotaoAdicionar() {
    const btnAdicionar = document.getElementById('btnAdicionarAgrupamento');
    
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', function() {
            // Abrir modal completo no estilo dos modais maiores (header + body + footer)
            openAdicionarAgrupamentoModal();
        });
        
        console.log('✅ Botão Adicionar Agrupamento configurado');
    }
}

// Modal estilizado para Adicionar Agrupamento (aparência similar ao modal de Comissão)
function openAdicionarAgrupamentoModal(prefill) {
    try {
        // remover overlays anteriores
        document.querySelectorAll('.qc-overlay, .modal-overlay').forEach(e => e.remove());

        const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
        overlay.style.position = 'fixed'; overlay.style.left = '0'; overlay.style.top = '0'; overlay.style.width = '100%'; overlay.style.height = '100%'; overlay.style.background = 'rgba(0,0,0,0.45)'; overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = '10000';

        const modal = document.createElement('div'); modal.className = 'modal-box modal-centered';
        modal.style.position = 'fixed'; modal.style.left = '50%'; modal.style.top = '50%'; modal.style.transform = 'translate(-50%, -50%)';
        modal.style.width = '520px'; modal.style.maxWidth = 'calc(100% - 40px)'; modal.style.background = '#fff'; modal.style.borderRadius = '6px'; modal.style.boxShadow = '0 8px 24px rgba(19,24,28,0.12)'; modal.style.overflow = 'hidden'; modal.style.display = 'flex'; modal.style.flexDirection = 'column'; modal.style.zIndex = '10001';

        const initialName = (typeof prefill === 'object' && prefill.name) ? prefill.name : (typeof prefill === 'string' ? prefill : '');
        let initialSubgrupos = [];
        try {
            if (typeof prefill === 'object' && prefill.subgrupos !== undefined && prefill.subgrupos !== null) {
                if (Array.isArray(prefill.subgrupos)) initialSubgrupos = prefill.subgrupos;
                else if (typeof prefill.subgrupos === 'string') {
                    // tentar parse JSON
                    try { initialSubgrupos = JSON.parse(prefill.subgrupos); }
                    catch(e){
                        // fallback: split por vírgula
                        initialSubgrupos = prefill.subgrupos.split(',').map(s=>s.trim()).filter(Boolean);
                    }
                } else if (typeof prefill.subgrupos === 'object') {
                    // objeto inesperado: tentar extrair propriedades em array
                    if (Array.isArray(prefill.subgrupos.items)) initialSubgrupos = prefill.subgrupos.items;
                } else {
                    // valor único
                    initialSubgrupos = [String(prefill.subgrupos)];
                }
            }
        } catch(e) { console.debug('normalize initialSubgrupos failed', e); initialSubgrupos = []; }
        const originalName = (typeof prefill === 'object' && (prefill.originalName || prefill.name)) ? (prefill.originalName || prefill.name) : null;
        const originalGroupId = (typeof prefill === 'object' && prefill.originalGroupId) ? prefill.originalGroupId : null;

        modal.innerHTML = `
            <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eef0f2;background:#fff">
                <h3 style="margin:0;font-size:18px;color:#1f3a45">Adicionar Agrupamento</h3>
                <button type="button" class="btn btn-secondary btn-close-modal" style="background:#fff;border:1px solid #e6e9eb;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:#1f3a45">Fechar</button>
            </div>
            <div class="modal-body" style="padding:18px 22px;max-height:60vh;overflow:auto">
                <div style="margin-bottom:14px">
                    <label style="display:block;margin-bottom:6px;color:#495057;font-weight:600">Descrição: <span style=\"color:#c0392b\">*</span></label>
                    <input id="qc-agrupamento-descricao" type="text" placeholder="Nome do agrupamento" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:6px" value="${escapeHtml(initialName)}" />
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                    <div style="flex:1">
                        <label style="display:block;margin-bottom:6px;color:#495057;font-weight:600">Subgrupo: <span style=\"color:#c0392b\">*</span></label>
                        <input id="qc-agrupamento-subgrupo" type="text" placeholder="Subgrupo" style="width:100%;padding:10px;border:1px solid #e6e9eb;border-radius:6px" />
                    </div>
                    <div style="width:120px;margin-top:24px">
                        <button id="qc-add-subgrupo" style="width:100%;background:#6c757d;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer">Adicionar</button>
                    </div>
                </div>
                <div id="qc-subgrupos-list" style="margin-top:6px;display:flex;flex-direction:column;gap:6px"></div>
            </div>
            <div style="padding:14px 22px;border-top:1px solid #eef0f2;display:flex;justify-content:flex-end;gap:10px;background:#fff">
                <button class="modal-save" style="background:#28a745;color:#fff;border:none;padding:10px 14px;border-radius:6px;cursor:pointer">Salvar</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Se vier com prefill.id e subgrupos, assegurar que as linhas de subgrupo existam no DOM (inserção temporária/estática)
        try {
            if (prefill && typeof prefill === 'object' && Array.isArray(initialSubgrupos) && initialSubgrupos.length) {
                // tentativa 1: encontrar por data-agrup-id
                let groupRow = prefill.id ? document.querySelector(`tr[data-agrup-id="${prefill.id}"]`) : null;
                // tentativa 2: procurar por nome normalizado
                if (!groupRow && initialName) {
                    const norm = (s => s.toString().trim().toLowerCase().normalize ? s.toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'') : s.toString().trim().toLowerCase())(initialName);
                    groupRow = Array.from(document.querySelectorAll('tr.grupo-principal')).find(r => {
                        const n = r.querySelector('.grupo-nome');
                        if (!n) return false;
                        const t = n.textContent.trim().toLowerCase().normalize ? n.textContent.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'') : n.textContent.trim().toLowerCase();
                        return t === norm;
                    }) || null;
                }
                // tentativa 3: procurar por slug derivado
                let grupoSlug = null;
                if (!groupRow && initialName) {
                    const slug = (initialName||'').toString().toLowerCase().normalize ? initialName.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') : initialName.toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
                    const chevron = document.querySelector(`.chevron-icon[data-grupo="${slug}"]`);
                    if (chevron) groupRow = chevron.closest('tr');
                    grupoSlug = slug;
                }

                // fallback: tbody (append at end)
                const tbody = document.getElementById('agrupamentosTableBody');
                if (!groupRow && !tbody) return;
                let insertAfter = groupRow || (tbody ? tbody.lastElementChild : null);

                // if we still don't have a slug, try to derive from group's chevron or name
                if (!grupoSlug && groupRow) {
                    const ch = groupRow.querySelector('.chevron-icon'); grupoSlug = ch && ch.dataset ? ch.dataset.grupo : null;
                }
                if (!grupoSlug && initialName) {
                    grupoSlug = (initialName||'').toString().toLowerCase().normalize ? initialName.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') : initialName.toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
                }

                initialSubgrupos.forEach(s => {
                    try {
                        // evitar duplicatas
                        const exists = Array.from(document.querySelectorAll(`.grupo-${grupoSlug}`)).some(r => {
                            const el = r.querySelector('.subgrupo-nome, .item-nome'); return el && el.textContent.trim() === (s||'').toString().trim();
                        });
                        if (exists) return;

                        const subTr = document.createElement('tr'); subTr.className = `subgrupo-row grupo-${escapeHtml(grupoSlug||'')}`; if (prefill.id) subTr.setAttribute('data-agrup-id', prefill.id);
                        subTr.style.display = 'table-row';
                        subTr.innerHTML = `
                            <td class="descricao-cell" style="padding-left:28px">
                                <div class="subgrupo-info">
                                    <i class="fas fa-chevron-right chevron-icon" data-subgrupo="${escapeHtml(s)}" style="visibility:hidden"></i>
                                    <span class="subgrupo-nome">${escapeHtml(s)}</span>
                                </div>
                            </td>
                            <td class="editar-cell"></td>
                            <td class="excluir-cell">
                                <button class="btn-icon btn-excluir" title="Excluir"><i class="fas fa-trash"></i></button>
                            </td>
                        `;

                        if (insertAfter && insertAfter.parentNode) insertAfter.parentNode.insertBefore(subTr, insertAfter.nextSibling);
                        else if (tbody) tbody.appendChild(subTr);
                        insertAfter = subTr;

                        // adicionar listeners aos botões da nova linha
                        const editBtn = subTr.querySelector('.btn-editar');
                        const delBtn = subTr.querySelector('.btn-excluir');
                        if (editBtn) {
                            editBtn.addEventListener('click', function(ev){
                                ev.stopPropagation();
                                const old = subTr.querySelector('.subgrupo-nome, .item-nome');
                                const oldText = old ? old.textContent.trim() : '';
                                openQuickInputModal('Editar Subgrupo', oldText, function(novo){
                                    if (!novo || !novo.trim()) { showToast('Nome vazio, nada alterado', 'warning'); return; }
                                    const v = novo.trim(); if (old) old.textContent = v; showToast('Subgrupo atualizado', 'success');
                                });
                            });
                        }
                        if (delBtn) {
                            delBtn.addEventListener('click', function(ev){ ev.stopPropagation(); try { subTr.remove(); } catch(e){}; showToast('Subgrupo removido', 'success'); });
                        }
                    } catch(e){ console.debug('insert subrow failed', e); }
                });
            }
        } catch(e) { console.debug('ensure subrows failed', e); }

        // Se vier com originalGroupId/originalName, expandir os subgrupos na tabela para permitir edição direta
        try {
            (function attemptExpand(attempt){
                try {
                    function normalizeText(s){
                        if (!s) return '';
                        try { return s.toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' '); } catch(e){ return s.toString().trim().toLowerCase(); }
                    }

                    let expanded = false;

                    if (originalGroupId) {
                        // tentar por id numérico
                        if (/^\d+$/.test(String(originalGroupId))) {
                            const tr = document.querySelector(`tr[data-agrup-id="${originalGroupId}"]`);
                            console.debug('[expand] trying by numeric id', { originalGroupId, trExists: !!tr });
                            if (tr) {
                                const ch = tr.querySelector('.chevron-icon');
                                console.debug('[expand] chevron found?', !!ch, ch && ch.dataset ? ch.dataset.grupo : null);
                                if (ch && typeof ch.click === 'function') { ch.click(); expanded = true; console.debug('[expand] clicked chevron by id'); }
                                else if (ch) { ch.classList.add('rotated'); const gid = ch.dataset.grupo; if (gid) document.querySelectorAll(`.grupo-${gid}`).forEach(r=>r.style.display='table-row'); expanded = true; console.debug('[expand] rotated chevron by id and revealed rows', gid); }
                                else { console.debug('[expand] no chevron in tr for id'); }
                            }
                        }

                        // tentar por dataset.grupo (slug)
                        if (!expanded) {
                            const chevron = document.querySelector(`.chevron-icon[data-grupo="${originalGroupId}"]`);
                            console.debug('[expand] trying by dataset.grupo', { originalGroupId, chevronExists: !!chevron });
                            if (chevron) { if (typeof chevron.click === 'function') { chevron.click(); console.debug('[expand] clicked chevron by dataset'); } else { chevron.classList.add('rotated'); document.querySelectorAll(`.grupo-${originalGroupId}`).forEach(r=>r.style.display='table-row'); console.debug('[expand] rotated chevron by dataset'); } expanded = true; }
                        }
                    }

                    if (!expanded && originalName) {
                        const rows = Array.from(document.querySelectorAll('tr.grupo-principal'));
                        const targetNorm = normalizeText(originalName);
                        for (const r of rows) {
                            const n = r.querySelector('.grupo-nome');
                            const text = n ? normalizeText(n.textContent) : '';
                            console.debug('[expand] checking row', { text, targetNorm });
                            if (text && text === targetNorm) {
                                const ch = r.querySelector('.chevron-icon');
                                console.debug('[expand] match found, chevron?', !!ch, ch && ch.dataset ? ch.dataset.grupo : null);
                                if (ch && typeof ch.click === 'function') { ch.click(); console.debug('[expand] clicked chevron by name'); }
                                else if (ch) { ch.classList.add('rotated'); const gid = ch.dataset.grupo; if (gid) document.querySelectorAll(`.grupo-${gid}`).forEach(rr=>rr.style.display='table-row'); console.debug('[expand] rotated chevron by name'); }
                                else {
                                    // fallback: try to derive slug from normalized text and reveal
                                    const slug = text.replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
                                    document.querySelectorAll(`.grupo-${slug}`).forEach(rr=>{ rr.style.display='table-row'; });
                                    console.debug('[expand] fallback show by slug', slug);
                                }
                                expanded = true; break;
                            }
                        }
                    }

                    // Se ainda não encontrou, tentar novamente algumas vezes (caso a renderização esteja em andamento)
                    if (!expanded && attempt < 3) {
                        setTimeout(() => attemptExpand(attempt+1), 160);
                    }
                } catch(e) { console.debug('attemptExpand failed', e); }
            })(0);
        } catch(e) { console.debug('expandGroup outer failed', e); }

        // handlers
        const btnClose = modal.querySelector('.btn-close-modal');
        const btnSave = modal.querySelector('.modal-save');
        const btnAddSub = modal.querySelector('#qc-add-subgrupo');
        const inputDesc = modal.querySelector('#qc-agrupamento-descricao');
        const inputSub = modal.querySelector('#qc-agrupamento-subgrupo');
        const listSub = modal.querySelector('#qc-subgrupos-list');

        function close() { try { commitAllInlineEdits(); } catch(e){} overlay.remove(); }
        // Commit all inline edits currently open
        function commitAllInlineEdits() {
            try {
                Array.from(listSub.querySelectorAll('input.qc-inline-edit')).forEach(inp => {
                    try { inp.blur(); } catch(e){}
                });
            } catch(e){ console.debug('commitAllInlineEdits failed', e); }
        }

        // Start inline edit for a given subgrupo item (div)
        function startInlineEdit(item) {
            try {
                if (!item) return;
                const span = item.querySelector('span');
                if (!span) return;
                // if already editing, focus
                const existing = item.querySelector('input.qc-inline-edit');
                if (existing) { existing.focus(); return; }

                const old = (span.textContent||'').trim();
                // create input
                const inp = document.createElement('input');
                inp.className = 'qc-inline-edit';
                inp.type = 'text';
                inp.value = old;
                inp.style.border = '0';
                inp.style.borderBottom = '1px dashed #6c757d';
                inp.style.padding = '4px 6px';
                inp.style.minWidth = '160px';
                inp.style.background = 'transparent';
                inp.style.fontSize = '13px';

                // insert before span and hide span
                span.style.display = 'none';
                span.parentNode.insertBefore(inp, span);
                inp.focus(); inp.select();

                let committed = false;
                async function commit() {
                    if (committed) return; committed = true;
                    const novo = (inp.value||'').trim();
                    if (!novo) { showToast('Nome vazio, nada alterado', 'warning'); cleanup(); return; }
                    span.textContent = novo;
                    cleanup();

                    // if modal opened for existing agrupamento, persist immediately
                    if (prefill && typeof prefill === 'object' && prefill.id) {
                        try {
                            const subs = Array.from(listSub.children).map(div => {
                                const s = div.querySelector('span'); return s ? s.textContent.trim() : null;
                            }).filter(Boolean);
                            const nome = (inputDesc.value||'').trim() || (prefill.name || '');
                            await saveAgrupamentoAPI({ id: prefill.id, name: nome, subgrupos: subs });
                            showToast('Subgrupo salvo', 'success');
                        } catch(e) { console.error('Erro ao salvar subgrupo inline', e); showToast('Erro ao salvar subgrupo', 'warning'); }
                    }
                }

                function cleanup() {
                    try { inp.remove(); } catch(e){}
                    span.style.display = '';
                }

                inp.addEventListener('blur', function(){ commit(); });
                inp.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); } else if (ev.key === 'Escape') { cleanup(); } });
            } catch(e) { console.debug('startInlineEdit failed', e); }
        }
        if (btnClose) btnClose.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); close(); });
        // Evita fechar o modal quando o usuário está selecionando/arrastando texto
        // Somente fecha se o mousedown iniciou no próprio overlay e o click também for no overlay
        overlay.__lastMouseDownTarget = null;
        overlay.addEventListener('mousedown', function(e){ overlay.__lastMouseDownTarget = e.target; });
        overlay.addEventListener('click', function(e){
            if (e.target === overlay && overlay.__lastMouseDownTarget === overlay) {
                e.stopPropagation();
                close();
            }
            // reset flag
            overlay.__lastMouseDownTarget = null;
        });

        btnAddSub.addEventListener('click', function(e){
            e.preventDefault(); const v = (inputSub.value||'').trim(); if (!v) { showToast('Subgrupo vazio', 'warning'); return; }
            const item = document.createElement('div');
            item.style.display='flex'; item.style.justifyContent='space-between'; item.style.alignItems='center'; item.style.padding='8px'; item.style.border='1px solid #eef0f2'; item.style.borderRadius='6px';
            item.innerHTML = `
                <span style="color:#495057">${escapeHtml(v)}</span>
                <div style="display:flex;gap:8px">
                    <button class="qc-edit-sub" style="background:#fff;border:1px solid #e6e9eb;padding:6px;border-radius:6px;cursor:pointer">Editar</button>
                    <button class="qc-remove-sub" style="background:#e9ecef;border:none;padding:6px;border-radius:6px;cursor:pointer">Remover</button>
                </div>
            `;
            listSub.appendChild(item);
            inputSub.value='';
            const rem = item.querySelector('.qc-remove-sub'); rem.addEventListener('click', function(){ item.remove(); });
            const edt = item.querySelector('.qc-edit-sub'); if (edt) edt.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); startInlineEdit(item); });
        });

        // preencher subgrupos iniciais (modo edição)
        if (initialSubgrupos && initialSubgrupos.length) {
            initialSubgrupos.forEach(s => {
                const item = document.createElement('div');
                item.style.display='flex'; item.style.justifyContent='space-between'; item.style.alignItems='center'; item.style.padding='8px'; item.style.border='1px solid #eef0f2'; item.style.borderRadius='6px';
                item.innerHTML = `
                    <span style="color:#495057">${escapeHtml(s)}</span>
                    <div style="display:flex;gap:8px">
                        <button class="qc-edit-sub" style="background:#fff;border:1px solid #e6e9eb;padding:6px;border-radius:6px;cursor:pointer">Editar</button>
                        <button class="qc-remove-sub" style="background:#e9ecef;border:none;padding:6px;border-radius:6px;cursor:pointer">Remover</button>
                    </div>
                `;
                listSub.appendChild(item);
                const rem = item.querySelector('.qc-remove-sub'); rem.addEventListener('click', function(){ item.remove(); });
                const edt = item.querySelector('.qc-edit-sub'); if (edt) edt.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); startInlineEdit(item); });
            });
        }

        btnSave.addEventListener('click', async function(e){
            e.preventDefault();
            const nome = (inputDesc.value||'').trim();
            if (!nome) { showToast('Descrição vazia', 'warning'); return; }
            // coletar subgrupos do modal
            const subgrupos = [];
            Array.from(listSub.children).forEach(div => {
                const span = div.querySelector('span');
                if (span) {
                    const v = (span.textContent||'').trim(); if (v) subgrupos.push(v);
                }
            });
            
            // atualizar se for edição (com id), caso contrário adicionar
            try {
                const agrupamento = { name: nome, subgrupos: subgrupos };

                if (prefill && typeof prefill === 'object' && prefill.id) {
                    // Modo edição - atualizar existente
                    agrupamento.id = prefill.id;
                    await saveAgrupamentoAPI(agrupamento);
                } else {
                    // Modo criação - novo agrupamento
                    await saveAgrupamentoAPI(agrupamento);
                }

                // Se esse modal veio de um grupo estático (originalGroupId), atualizar o DOM desse grupo localmente
                try {
                    if (originalGroupId) {
                        // remover sublinhas antigas
                        const rows = Array.from(document.querySelectorAll(`.grupo-${originalGroupId}`));
                        rows.forEach(r => r.remove());
                        // localizar a linha do grupo principal
                        const chevron = document.querySelector(`.chevron-icon[data-grupo="${originalGroupId}"]`);
                        const groupRow = chevron ? chevron.closest('tr') : null;
                        if (groupRow) {
                            // inserir novas linhas de subgrupo logo após groupRow
                            let insertAfter = groupRow;
                            subgrupos.forEach(s => {
                                const subTr = document.createElement('tr');
                                subTr.className = `subgrupo-row grupo-${originalGroupId}`;
                                subTr.style.display = 'none';
                                subTr.innerHTML = `
                                    <td class="descricao-cell" style="padding-left:28px">
                                        <div class="subgrupo-info">
                                            <i class="fas fa-chevron-right chevron-icon" data-subgrupo="${escapeHtml(s)}" style="visibility:hidden"></i>
                                            <span class="subgrupo-nome">${escapeHtml(s)}</span>
                                        </div>
                                    </td>
                                    <td class="editar-cell"></td>
                                    <td class="excluir-cell">
                                        <button class="btn-icon btn-excluir" title="Excluir"><i class="fas fa-trash"></i></button>
                                    </td>
                                `;
                                insertAfter.parentNode.insertBefore(subTr, insertAfter.nextSibling);
                                insertAfter = subTr;

                                // adicionar listeners aos botões da nova linha
                                const editBtn = subTr.querySelector('.btn-editar');
                                const delBtn = subTr.querySelector('.btn-excluir');
                                if (editBtn) {
                                    editBtn.addEventListener('click', function(ev){
                                        ev.stopPropagation();
                                        // abrir modal rápido para editar apenas o nome do subgrupo
                                        const old = subTr.querySelector('.subgrupo-nome, .item-nome');
                                        const oldText = old ? old.textContent.trim() : '';
                                        openQuickInputModal('Editar Subgrupo', oldText, function(novo){
                                            if (!novo || !novo.trim()) { showToast('Nome vazio, nada alterado', 'warning'); return; }
                                            const v = novo.trim();
                                            if (old) old.textContent = v;
                                            // se existe um agrupamento local correspondente, atualizar também lá
                                            try {
                                                const arr = getLocalAgrupamentos();
                                                const gidx = arr.findIndex(x => (x && (x.name||'').trim()) === (nome||'').trim());
                                                if (gidx !== -1) {
                                                    const si = arr[gidx].subgrupos.findIndex(x => (x||'').trim() === (oldText||'').trim());
                                                    if (si !== -1) { arr[gidx].subgrupos[si] = v; saveLocalAgrupamentos(arr); }
                                                }
                                            } catch(e){ console.debug(e); }
                                            showToast('Subgrupo atualizado', 'success');
                                        });
                                    });
                                }
                                if (delBtn) {
                                    delBtn.addEventListener('click', function(ev){
                                        ev.stopPropagation();
                                        openConfirm(`Deseja excluir o subgrupo "${s}"? Esta ação não poderá ser desfeita.`, function(){
                                            try { subTr.remove(); } catch(e){ console.debug(e); }
                                            // remover do storage local se aplicável
                                            try {
                                                const arr = getLocalAgrupamentos();
                                                const gidx = arr.findIndex(x => (x && (x.name||'').trim()) === (nome||'').trim());
                                                if (gidx !== -1) {
                                                    arr[gidx].subgrupos = arr[gidx].subgrupos.filter(x => (x||'').trim() !== (s||'').trim()); saveLocalAgrupamentos(arr);
                                                }
                                            } catch(e){ console.debug(e); }
                                            showToast('Subgrupo removido', 'success');
                                        });
                                    });
                                }
                            });
                        }
                    }
                } catch(e) { console.debug('Erro ao atualizar DOM de subgrupos estáticos', e); }

                await renderAgrupamentosAPI();
                // limpar cache local para evitar reuso de dados antigos e forçar reconsulta
                try { window._localAgrupamentosCache = []; } catch(e){ console.debug('erro ao limpar cache apos save', e); }
                await renderAgrupamentosAPI();
                showToast('Agrupamento salvo com sucesso!', 'success');
                close();
            } catch(err) { 
                console.error('Erro ao salvar agrupamento:', err); 
                showToast('Erro ao salvar agrupamento', 'warning');
            }
        });

        // foco inicial
        setTimeout(()=>{ inputDesc.focus(); },50);
    } catch(err) { console.error('Erro ao abrir modal de Adicionar Agrupamento', err); }
}

// Configurar botões de Editar e Excluir
function configurarBotoesAcao() {
    // Botões de Editar
    const botoesEditar = document.querySelectorAll('.btn-editar');
    botoesEditar.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const linha = this.closest('tr');
            // se for uma linha de subgrupo estática ou dinâmica, editar o próprio subgrupo
            if (linha && (linha.classList.contains('subgrupo-row') || linha.className.indexOf('subgrupo-nivel') !== -1)) {
                const nameEl = linha.querySelector('.subgrupo-nome, .item-nome');
                const oldText = nameEl ? nameEl.textContent.trim() : '';
                openQuickInputModal('Editar Subgrupo', oldText, function(novo){
                    if (!novo || !novo.trim()) { showToast('Nome vazio, nada alterado', 'warning'); return; }
                    const v = novo.trim();
                    if (nameEl) nameEl.textContent = v;
                    // atualizar storage local se existir entrada correspondente
                    try {
                        const arr = getLocalAgrupamentos();
                        // tentar encontrar agrupamento pai passando para cima até encontrar grupo-principal
                        let parent = linha.previousElementSibling;
                        let parentName = null;
                        while(parent) {
                            const p = parent.querySelector('.grupo-nome');
                            if (p) { parentName = p.textContent.trim(); break; }
                            parent = parent.previousElementSibling;
                        }
                        if (parentName) {
                            const gidx = arr.findIndex(x => (x && (x.name||'').trim()) === (parentName||'').trim());
                            if (gidx !== -1) {
                                const si = arr[gidx].subgrupos.findIndex(x => (x||'').trim() === (oldText||'').trim());
                                if (si !== -1) { arr[gidx].subgrupos[si] = v; saveLocalAgrupamentos(arr); }
                            }
                        }
                    } catch(e){ console.debug(e); }
                    showToast('Subgrupo atualizado', 'success');
                });
                return;
            }

            const nomeEl = linha.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
            const descricao = nomeEl ? nomeEl.textContent.trim() : '';
            console.log(`✏️ Editar: ${descricao}`);
            // tentar obter subgrupos salvos localmente (se a função existir); caso contrário, usar fallback DOM
            (async function(){
                let handled = false;
                if (typeof getLocalAgrupamentos === 'function') {
                    try {
                        const arr = getLocalAgrupamentos();
                        const found = arr.find(x => (x && (x.name||'').trim()) === (descricao||'').trim());
                        if (found) {
                            openAdicionarAgrupamentoModal({ name: found.name, subgrupos: found.subgrupos || [], originalName: found.name });
                            handled = true;
                        }
                    } catch(e) { console.debug('getLocalAgrupamentos falhou', e); }
                }

                if (!handled) {
                    try {
                        const chevron = linha.querySelector('.chevron-icon');
                        const groupId = chevron ? chevron.dataset.grupo : null;
                        let subs = [];
                        if (groupId) {
                            subs = Array.from(document.querySelectorAll(`.grupo-${groupId}`)).map(r => {
                                const el = r.querySelector('.subgrupo-nome, .item-nome');
                                return el ? el.textContent.trim() : null;
                            }).filter(Boolean);
                        }
                        openAdicionarAgrupamentoModal({ name: descricao, subgrupos: subs, originalName: descricao, originalGroupId: groupId });
                    } catch(e) {
                        console.debug('Fallback DOM falhou', e);
                        openAdicionarAgrupamentoModal({ name: descricao, subgrupos: [], originalName: descricao });
                    }
                }
            })();
        });
    });

    // Botões de Excluir
    const botoesExcluir = document.querySelectorAll('.btn-excluir');
    botoesExcluir.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const linha = this.closest('tr');
            const nomeEl = linha.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
            const descricao = nomeEl ? nomeEl.textContent.trim() : '';
            openConfirm(`Deseja realmente excluir "${descricao}"? Esta ação não poderá ser desfeita.`, function(){
                try {
                    // Se for um subgrupo, atualizar apenas a lista de subgrupos do agrupamento pai
                    if (linha && (linha.classList.contains('subgrupo-row') || linha.className.indexOf('subgrupo-nivel') !== -1)) {
                        // encontrar pai (linha do grupo principal acima)
                        let parent = linha.previousElementSibling;
                        let parentName = null;
                        while(parent) {
                            const p = parent.querySelector('.grupo-nome');
                            if (p) { parentName = p.textContent.trim(); break; }
                            parent = parent.previousElementSibling;
                        }
                        // remover a linha atual do DOM
                        linha.remove();
                        // atualizar storage: se existir agrupamento local, remover subgrupo; senão criar override sem esse subgrupo
                        try {
                            const arr = getLocalAgrupamentos();
                            const gidx = arr.findIndex(x => (x && (x.name||'').trim()) === (parentName||'').trim());
                            if (gidx !== -1) {
                                arr[gidx].subgrupos = arr[gidx].subgrupos.filter(x => (x||'').trim() !== (descricao||'').trim());
                                saveLocalAgrupamentos(arr);
                                renderLocalAgrupamentos();
                            } else {
                                // criar override: coletar demais subgrupos atualmente no DOM para esse pai (excluindo o removido)
                                // coletar usando classes do pai (buscar o chevron pelo nome)
                                const chevs = Array.from(document.querySelectorAll('.chevron-icon'));
                                let foundId = null;
                                for (let c of chevs) {
                                    const row = c.closest('tr');
                                    const gname = row ? (row.querySelector('.grupo-nome') ? row.querySelector('.grupo-nome').textContent.trim() : null) : null;
                                    if (gname === parentName) { foundId = c.dataset.grupo; break; }
                                }
                                let remaining = [];
                                if (foundId) {
                                    remaining = Array.from(document.querySelectorAll(`.grupo-${foundId}`)).map(r => {
                                        const el = r.querySelector('.subgrupo-nome, .item-nome');
                                        return el ? el.textContent.trim() : null;
                                    }).filter(Boolean).filter(x => x !== descricao);
                                }
                                appendLocalAgrupamento({ name: parentName, subgrupos: remaining });
                            }
                        } catch(e){ console.debug(e); }
                        showToast(`"${descricao}" foi excluído!`, 'success');
                        return;
                    }

                    // caso padrão: excluir agrupamento completo (grupo principal)
                    try { removeFromLocalAgrupamentos(descricao); } catch(e){ console.debug(e); }
                    // remover qualquer linha DOM que contenha esse nome
                    document.querySelectorAll('#agrupamentosTableBody tr').forEach(tr => {
                        const n = tr.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
                        if (n && n.textContent.trim() === descricao) tr.remove();
                    });
                    showToast(`"${descricao}" foi excluído!`, 'success');
                } catch(err) { console.debug(err); }
            });
        });
    });

    console.log(`✅ ${botoesEditar.length} botões Editar e ${botoesExcluir.length} botões Excluir configurados`);
}

// ==========================
// API helpers (substituindo localStorage)
// ==========================
async function getAgrupamentosAPI() {
    try {
        const agrupamentos = await ApiClient.getAgrupamentos();
        return Array.isArray(agrupamentos) ? agrupamentos : [];
    } catch(e) {
        console.error('Erro ao buscar agrupamentos da API:', e);
        return [];
    }
}

async function saveAgrupamentoAPI(agrupamento) {
    try {
        if (agrupamento.id) {
            // Atualizar existente
            return await ApiClient.atualizarAgrupamento(agrupamento.id, agrupamento);
        } else {
            // Criar novo
            return await ApiClient.criarAgrupamento(agrupamento);
        }
    } catch(e) {
        console.error('Erro ao salvar agrupamento na API:', e);
        throw e;
    }
}

async function appendAgrupamentoAPI(name) {
    // name can be string or object {name, subgrupos}
    if (!name) return;
    const obj = (typeof name === 'string') ? { name: name, subgrupos: [] } : { name: name.name || '', subgrupos: Array.isArray(name.subgrupos) ? name.subgrupos : [] };
    if (!obj.name) return;
    
    try {
        const agrupamentos = await getAgrupamentosAPI();
        const exists = agrupamentos.find(x => (x.name||'').trim().toLowerCase() === (obj.name||'').trim().toLowerCase());
        
        if (!exists) {
            await saveAgrupamentoAPI(obj);
            await renderAgrupamentosAPI();
        }
    } catch(e) {
        console.error('Erro ao adicionar agrupamento:', e);
    }
}

// ===== Wrappers de compatibilidade (substituem localStorage)
// Mantemos um cache em memória para compatibilidade com chamadas síncronas existentes
window._localAgrupamentosCache = window._localAgrupamentosCache || [];

function initializeLocalAgrupamentosCache() {
    try {
        getAgrupamentosAPI().then(arr => { window._localAgrupamentosCache = Array.isArray(arr) ? arr : []; }).catch(()=>{});
    } catch(e) { console.debug('init cache failed', e); }
}

function getLocalAgrupamentos() {
    return Array.isArray(window._localAgrupamentosCache) ? window._localAgrupamentosCache : [];
}

function saveLocalAgrupamentos(arr) {
    try {
        window._localAgrupamentosCache = Array.isArray(arr) ? arr : [];
        // sincronizar em background com a API (não bloquear a UI)
        (async function(){
            try {
                const toSync = Array.isArray(arr) ? arr : [];
                for (const item of toSync) {
                    try {
                        // Somente sincronizar itens que já possuem `id` (existentes no servidor).
                        // Evita que entradas de cache sem id recriem agrupamentos deletados anteriormente.
                        if (item && item.id) await saveAgrupamentoAPI(item);
                        else {
                            // pular criação automática de itens sem id
                            console.debug('[saveLocalAgrupamentos] pulando sync para item sem id', item && item.name);
                        }
                    } catch(e){ console.debug('sync item failed', e); }
                }
                // atualizar cache com fonte de verdade
                const fresh = await getAgrupamentosAPI();
                window._localAgrupamentosCache = Array.isArray(fresh) ? fresh : window._localAgrupamentosCache;
            } catch(e){ console.debug('saveLocalAgrupamentos sync failed', e); }
        })();
    } catch(e) { console.debug('saveLocalAgrupamentos error', e); }
}

function appendLocalAgrupamento(obj) {
    try {
        // inserir no cache local e tentar criar via API
        const item = (typeof obj === 'string') ? { name: obj, subgrupos: [] } : obj || { name: '', subgrupos: [] };
        if (!item.name) return;
        const cache = getLocalAgrupamentos();
        const exists = cache.find(x => (x.name||'').trim().toLowerCase() === (item.name||'').trim().toLowerCase());
        if (!exists) cache.push(item);
        window._localAgrupamentosCache = cache;
        // criar na API em background
        appendAgrupamentoAPI(item).then(()=> getAgrupamentosAPI().then(f => { window._localAgrupamentosCache = Array.isArray(f) ? f : window._localAgrupamentosCache; })).catch(e=>console.debug(e));
    } catch(e) { console.debug('appendLocalAgrupamento error', e); }
}

function removeFromLocalAgrupamentos(nameOrId) {
    try {
        // remover do cache e chamar API em background
        const cache = getLocalAgrupamentos();
        const maybeId = (typeof nameOrId === 'string' && /^\d+$/.test(nameOrId.trim())) ? Number(nameOrId.trim()) : nameOrId;
        const idx = cache.findIndex(x => {
            if (!x) return false;
            if (maybeId !== undefined && maybeId !== null && x.id == maybeId) return true;
            return ((x.name||'').toString().trim().toLowerCase() === (nameOrId||'').toString().trim().toLowerCase());
        });
        if (idx !== -1) cache.splice(idx,1);
        window._localAgrupamentosCache = cache;
        // tentar remover da API (não bloquear)
        (async function(){ try { await removeAgrupamentoAPI(nameOrId); const fresh = await getAgrupamentosAPI(); window._localAgrupamentosCache = Array.isArray(fresh) ? fresh : window._localAgrupamentosCache; } catch(e){ console.debug('removeFromLocalAgrupamentos API failed', e); } })();
    } catch(e) { console.debug('removeFromLocalAgrupamentos error', e); }
}

// iniciar cache
initializeLocalAgrupamentosCache();


async function removeAgrupamentoAPI(nameOrId) {
    try {
        const agrupamentos = await getAgrupamentosAPI();
        // normalizar possível id em string para número
        const maybeId = (typeof nameOrId === 'string' && /^\d+$/.test(nameOrId.trim())) ? Number(nameOrId.trim()) : nameOrId;

        function normalizeText(s){
            if (!s && s !== 0) return '';
            try { return s.toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); } catch(e){ return s.toString().trim().toLowerCase(); }
        }
        function slugify(s){ try { return normalizeText(s).replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); } catch(e){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); } }

        const needleNorm = normalizeText(nameOrId || '');
        const needleSlug = slugify(nameOrId || '');

        const agrup = agrupamentos.find(x => {
            if (!x) return false;
            // comparar por id (numérico)
            if (maybeId !== undefined && maybeId !== null && x.id == maybeId) return true;

            const nameNorm = normalizeText(x.name || '');
            const nameSlug = slugify(x.name || '');

            // comparar por nome normalizado exato
            if (nameNorm && needleNorm && nameNorm === needleNorm) return true;
            // comparar por slug (remove espaços/caracteres especiais)
            if (nameSlug && needleSlug && nameSlug === needleSlug) return true;
            // comparar por inclusão (fuzzy fallback)
            if (needleNorm && nameNorm && (nameNorm.indexOf(needleNorm) !== -1 || needleNorm.indexOf(nameNorm) !== -1)) return true;
            return false;
        });

        if (agrup && agrup.id) {
            await ApiClient.deletarAgrupamento(agrup.id);
            await renderAgrupamentosAPI();
            // atualizar/limpar cache local para evitar ressuscitar dados antigos
            try { window._localAgrupamentosCache = Array.isArray(await getAgrupamentosAPI()) ? await getAgrupamentosAPI() : []; } catch(e){ console.debug('Erro ao atualizar cache pós-delete', e); window._localAgrupamentosCache = []; }
        } else {
            // se não encontrou correspondência, tentar log para diagnóstico
            console.debug('[removeAgrupamentoAPI] agrupamento não encontrado para', nameOrId);
        }
    } catch(e) {
        console.error('Erro ao remover agrupamento:', e);
    }
}

async function updateAgrupamentoAPI(oldName, newData) {
    try {
        const agrupamentos = await getAgrupamentosAPI();
        const agrup = agrupamentos.find(x => (x.name||'').trim().toLowerCase() === (oldName||'').trim().toLowerCase());
        
        if (agrup && agrup.id) {
            const updated = { ...agrup, ...newData };
            await ApiClient.atualizarAgrupamento(agrup.id, updated);
            await renderAgrupamentosAPI();
        }
    } catch(e) {
        console.error('Erro ao atualizar agrupamento:', e);
    }
}

// Renderar agrupamentos da API na tabela
async function renderAgrupamentosAPI() {
    try {
        // mostrar loader e esconder tabela imediatamente
        try {
            const tbodyEl = document.getElementById('agrupamentosTableBody');
            const loaderRow = document.querySelector('#agrupamentos-loading-row');
            if (tbodyEl) tbodyEl.style.visibility = 'hidden';
            if (loaderRow) loaderRow.style.display = '';
        } catch(e) { console.debug('Erro ao mostrar loader', e); }

        const agrupamentos = await getAgrupamentosAPI();
        const tbody = document.getElementById('agrupamentosTableBody');
        if (!tbody) return;
        // Normalizadores para comparação (remoção de acentos e slug)
        function normalizeText(s){ if (!s && s !== 0) return ''; try { return s.toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); } catch(e){ return s.toString().trim().toLowerCase(); } }
        function slugify(s){ try { return normalizeText(s).replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); } catch(e){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); } }

        // Se API não retornou nada, remover apenas linhas dinâmicas e sair
        if (!agrupamentos || !agrupamentos.length) {
            Array.from(tbody.querySelectorAll('tr[data-api="1"]')).forEach(r => r.remove());
            return;
        }

        // Construir conjuntos de nomes/slug da API para comparar com linhas estáticas
        const apiNameSet = new Set(agrupamentos.map(a => normalizeText(a.name || '')));
        const apiSlugSet = new Set(agrupamentos.map(a => slugify(a.name || '')));

        // Remover linhas estáticas de grupos que NÃO existem mais na API
        Array.from(tbody.querySelectorAll('tr.grupo-principal')).forEach(tr => {
            // pular linhas que já são geradas pela API
            if (tr.getAttribute('data-api') === '1') return;
            const nameEl = tr.querySelector('.grupo-nome');
            if (!nameEl) return;
            const txt = nameEl.textContent.trim();
            const norm = normalizeText(txt);
            const slug = slugify(txt);
            if (!apiNameSet.has(norm) && !apiSlugSet.has(slug)) {
                // remover a linha do grupo e também quaisquer sublinhas correspondentes (por slug)
                try {
                    // remover sublinhas que usam a classe grupo-<slug>
                    if (slug) {
                        Array.from(tbody.querySelectorAll(`.grupo-${slug}`)).forEach(r => r.remove());
                    }
                } catch(e) { console.debug('Erro ao remover sublinhas estáticas', e); }
                try { tr.remove(); } catch(e) { console.debug('Erro ao remover linha static', e); }
            }
        });

        // Limpar linhas dinâmicas anteriores
        Array.from(tbody.querySelectorAll('tr[data-api="1"]')).forEach(r => r.remove());

        // Adicionar (ou re-adicionar) linhas a partir da API
        agrupamentos.forEach(obj => { addRowForAgrupamento(obj); });

        // esconder loader e mostrar tabela
        try {
            const tbodyEl = document.getElementById('agrupamentosTableBody');
            const loaderRow = document.querySelector('#agrupamentos-loading-row');
            if (loaderRow) loaderRow.style.display = 'none';
            if (tbodyEl) tbodyEl.style.visibility = '';
        } catch(e) { console.debug('Erro ao esconder loader', e); }
        
        console.log(`✅ ${agrupamentos.length} agrupamentos carregados da API`);
    } catch(e) {
        console.error('Erro ao renderizar agrupamentos:', e);
    }
}

function addRowForAgrupamento(obj) {
    try {
        // obj deve ter {id, name, subgrupos}
        const tbody = document.getElementById('agrupamentosTableBody');
        if (!tbody) return;

        // Evitar duplicatas
        const exists = Array.from(tbody.querySelectorAll('tr')).some(tr => {
            const n = tr.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
            return n && n.textContent.trim() === (obj.name||'').trim();
        });
        if (exists) return;

        // gerar id seguro para classes (sem espaços/acentos)
        function slugify(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
        const grupoId = slugify(obj.name) || ('g' + Date.now());

        const tr = document.createElement('tr'); tr.className = 'grupo-principal'; tr.setAttribute('data-api','1'); tr.setAttribute('data-agrup-id', obj.id);
        tr.innerHTML = `
            <td class="descricao-cell">
                <div class="grupo-info">
                    <i class="fas fa-chevron-down chevron-icon" data-grupo="${escapeHtml(grupoId)}"></i>
                    <span class="grupo-nome">${escapeHtml(obj.name)}</span>
                </div>
            </td>
            <td class="editar-cell">
                <button class="btn-icon btn-editar" title="Editar"><i class="fas fa-pen"></i></button>
            </td>
            <td class="excluir-cell">
                <button class="btn-icon btn-excluir" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);

        // debug: log id/nome para diagnosticar casos que não apagam
        try { console.debug('[addRowForAgrupamento] adicionou row:', { id: obj.id, name: obj.name, grupoId: grupoId }); } catch(e){}

        // Adicionar linhas de subgrupos (inicialmente escondidas)
        if (obj.subgrupos && obj.subgrupos.length) {
                obj.subgrupos.forEach((s) => {
                const str = (s||'').toString();
                const subTr = document.createElement('tr'); subTr.className = `subgrupo-row grupo-${escapeHtml(grupoId)}`; subTr.setAttribute('data-api','1'); subTr.setAttribute('data-agrup-id', obj.id);
                subTr.style.display = 'none';
                subTr.innerHTML = `
                    <td class="descricao-cell" style="padding-left:28px">
                        <div class="subgrupo-info">
                            <i class="fas fa-chevron-right chevron-icon" data-subgrupo="${escapeHtml(str)}" style="visibility:hidden"></i>
                            <span class="subgrupo-nome">${escapeHtml(str)}</span>
                        </div>
                    </td>
                    <td class="editar-cell"></td>
                    <td class="excluir-cell">
                        <button class="btn-icon btn-excluir" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(subTr);
            });
        }

        // Adicionar listeners individuais
        const chevron = tr.querySelector('.chevron-icon');
        if (chevron) {
            chevron.addEventListener('click', function(e){ e.stopPropagation(); this.classList.toggle('rotated');
                const isGrupo = this.dataset.grupo; if (isGrupo) {
                    const subgrupos = document.querySelectorAll(`.grupo-${isGrupo}`);
                    subgrupos.forEach(sub => {
                        if (sub.style.display === 'none' || sub.style.display === '') sub.style.display = 'table-row'; else sub.style.display = 'none';
                    });
                }
            });
        }

        const btnEdit = tr.querySelector('.btn-editar');
        if (btnEdit) {
            btnEdit.addEventListener('click', async function(e){
                e.stopPropagation();
                const nomeEl = tr.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
                const oldName = nomeEl ? nomeEl.textContent.trim() : '';
                const agrupId = tr.getAttribute('data-agrup-id');
                // abrir modal de edição com os dados da API
                try {
                    const agrupamentos = await getAgrupamentosAPI();
                    const found = agrupamentos.find(x => x.id == agrupId || (x.name||'').trim() === oldName);
                    if (found) openAdicionarAgrupamentoModal({ id: found.id, name: found.name, subgrupos: found.subgrupos || [], originalName: found.name });
                    else openAdicionarAgrupamentoModal({ name: oldName, subgrupos: [], originalName: oldName });
                } catch(er) { console.error(er); openAdicionarAgrupamentoModal(oldName); }
            });
        }
        const btnDel = tr.querySelector('.btn-excluir');
        if (btnDel) {
            btnDel.addEventListener('click', function(e){
                e.stopPropagation();
                const nomeEl = tr.querySelector('.grupo-nome, .subgrupo-nome, .item-nome');
                const descricao = nomeEl ? nomeEl.textContent.trim() : '';
                const agrupId = tr.getAttribute('data-agrup-id');
                try { console.debug('[addRowForAgrupamento] btnDel clicked', { descricao: descricao, agrupId: agrupId }); } catch(e){}
                openConfirm(`Deseja realmente excluir "${descricao}"? Esta ação não poderá ser desfeita.`, async function(){
                    try { 
                        await removeAgrupamentoAPI(agrupId || descricao); 
                        showToast(`"${descricao}" foi excluído!`, 'success');
                    } catch(e){ 
                        console.error(e); 
                        showToast('Erro ao excluir agrupamento', 'warning');
                    }
                });
            });
        }
    } catch(e) { console.error('Erro ao adicionar linha de agrupamento local', e); }
}

function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ==========================
// Small modal + toast helpers (self-contained)
// ==========================
function openQuickInputModal(title, placeholder, onSave) {
    try {
        const overlay = document.createElement('div'); overlay.className = 'qc-overlay';
        const modal = document.createElement('div'); modal.className = 'qc-modal';
        modal.innerHTML = `
            <div style="font-weight:600;margin-bottom:8px">${escapeHtml(title)}</div>
            <input type="text" class="qc-input" placeholder="${escapeHtml(placeholder || '')}" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #ccc;border-radius:4px" />
            <div style="text-align:right"><button class="qc-cancel" style="margin-right:8px">Cancelar</button><button class="qc-save">Salvar</button></div>
        `;
        overlay.style.position = 'fixed'; overlay.style.left = '0'; overlay.style.top = '0'; overlay.style.right = '0'; overlay.style.bottom = '0'; overlay.style.background = 'rgba(0,0,0,0.3)'; overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = '9999';
        modal.style.background = '#fff'; modal.style.padding = '16px'; modal.style.borderRadius = '8px'; modal.style.minWidth = '320px'; modal.style.maxWidth = '90%';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        const input = modal.querySelector('.qc-input');
        const btnSave = modal.querySelector('.qc-save');
        const btnCancel = modal.querySelector('.qc-cancel');
        setTimeout(()=>{ if(input) input.focus(); },50);
        function close(){ overlay.remove(); }
        btnCancel.addEventListener('click', function(e){ e.preventDefault(); close(); });
        btnSave.addEventListener('click', function(e){ e.preventDefault(); const v = input.value; close(); try{ onSave(v); }catch(er){ console.error(er); } });
        overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    } catch(e) { console.error('openQuickInputModal failed', e); }
}

function showToast(text, type) {
    try {
        let container = document.querySelector('.qc-toast-container');
        if (!container) {
            container = document.createElement('div'); container.className = 'qc-toast-container';
            container.style.position = 'fixed'; container.style.top = '16px'; container.style.right = '16px'; container.style.zIndex = '10000'; container.style.display = 'flex'; container.style.flexDirection = 'column'; container.style.gap = '8px';
            document.body.appendChild(container);
        }
        const el = document.createElement('div'); el.className = 'qc-toast'; el.textContent = text;
        el.style.padding = '10px 12px'; el.style.borderRadius = '6px'; el.style.color = '#222'; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        if (type === 'warning') { el.style.background = '#FFF3CD'; el.style.border = '1px solid #FFE69B'; }
        else if (type === 'success') { el.style.background = '#D4EDDA'; el.style.border = '1px solid #A8E5B9'; }
        else { el.style.background = '#F8F9FA'; el.style.border = '1px solid #E2E3E5'; }
        container.appendChild(el);
        setTimeout(()=>{ el.style.transition = 'opacity 0.3s'; el.style.opacity = '0'; setTimeout(()=>{ el.remove(); },300); }, 3000);
    } catch(e) { console.debug('showToast error', e); }
}

// Modal de confirmação reutilizável
function openConfirm(message, onConfirm) {
    try {
        document.querySelectorAll('.qc-overlay, .modal-overlay').forEach(e => e.remove());
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
        overlay.style.position = 'fixed'; overlay.style.left = '0'; overlay.style.top = '0'; overlay.style.width = '100%'; overlay.style.height = '100%'; overlay.style.background = 'rgba(0,0,0,0.45)'; overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = '10000';

        const modal = document.createElement('div'); modal.className = 'modal-box modal-centered';
        modal.style.background = '#fff'; modal.style.borderRadius = '6px'; modal.style.boxShadow = '0 8px 24px rgba(19,24,28,0.12)'; modal.style.padding = '18px'; modal.style.maxWidth = '520px'; modal.style.width = 'calc(100% - 40px)';

        modal.innerHTML = `
            <div style="font-weight:600;margin-bottom:10px">Confirmação</div>
            <div style="margin-bottom:18px">${escapeHtml(message)}</div>
            <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end">
                <button class="qc-cancel" style="padding:8px 12px;border-radius:6px;border:1px solid #e6e9eb;background:#fff">Cancelar</button>
                <button class="qc-confirm" style="padding:8px 12px;border-radius:6px;border:none;background:#dc3545;color:#fff">Excluir</button>
            </div>
        `;

        overlay.appendChild(modal); document.body.appendChild(overlay);
        const btnCancel = modal.querySelector('.qc-cancel');
        const btnConfirm = modal.querySelector('.qc-confirm');
        function close(){ overlay.remove(); }
        btnCancel.addEventListener('click', function(e){ e.preventDefault(); close(); });
        btnConfirm.addEventListener('click', function(e){ e.preventDefault(); try{ if (typeof onConfirm === 'function') onConfirm(); } catch(err){ console.debug(err); } close(); });
        overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    } catch(e) { console.debug('openConfirm error', e); }
}

// Configurar pesquisa
function configurarPesquisa() {
    const inputPesquisa = document.getElementById('inputPesquisaAgrupamento');
    const btnPesquisar = document.getElementById('btnPesquisar');
    // debounce helper para evitar chamadas excessivas durante digitação
    function debounce(fn, wait) {
        let t = null;
        return function(...args) {
            const ctx = this;
            clearTimeout(t);
            t = setTimeout(() => fn.apply(ctx, args), wait);
        };
    }
    function realizarPesquisa() {
        const termo = inputPesquisa.value.toLowerCase().trim();
        console.log(`🔍 Pesquisando: "${termo}"`);
        const tbody = document.querySelector('.agrupamentos-table tbody');
        if (!tbody) return;

        const groupRows = Array.from(tbody.querySelectorAll('tr.grupo-principal'));
        let encontrados = 0;

        // comportamento padrão: quando termo vazio, mostrar grupos e manter subgrupos fechados
        groupRows.forEach(groupRow => {
            const chevron = groupRow.querySelector('.chevron-icon');
            const groupId = chevron ? chevron.dataset.grupo : null;
            const groupText = (groupRow.textContent || '').toLowerCase();

            const childSelector = groupId ? `.grupo-${groupId}` : null;
            const childRows = childSelector ? Array.from(tbody.querySelectorAll(childSelector)) : [];

            if (!termo) {
                groupRow.style.display = 'table-row';
                // fechar subgrupos
                childRows.forEach(r => r.style.display = 'none');
                if (chevron) chevron.classList.remove('rotated');
                encontrados++;
                return;
            }

            // verificar correspondência no grupo e em seus filhos
            const groupMatches = groupText.includes(termo);
            let anyChildMatches = false;
            childRows.forEach(r => {
                const txt = (r.textContent || '').toLowerCase();
                if (txt.includes(termo)) { r.style.display = 'table-row'; anyChildMatches = true; encontrados++; }
                else { r.style.display = 'none'; }
            });

            if (groupMatches) {
                groupRow.style.display = 'table-row';
                // manter subgrupos fechados a não ser que combinem
                if (!anyChildMatches) childRows.forEach(r => r.style.display = 'none');
                if (chevron) {
                    if (anyChildMatches) chevron.classList.add('rotated'); else chevron.classList.remove('rotated');
                }
                encontrados++;
            } else if (anyChildMatches) {
                // mostrar o grupo pai quando algum filho combina
                groupRow.style.display = 'table-row';
                if (chevron) chevron.classList.add('rotated');
                encontrados++;
            } else {
                groupRow.style.display = 'none';
                if (chevron) chevron.classList.remove('rotated');
            }
        });

        console.log(`✅ ${encontrados} itens encontrados`);
    }
    
    if (btnPesquisar) {
        btnPesquisar.addEventListener('click', realizarPesquisa);
    }
    
    if (inputPesquisa) {
        // pesquisa em tempo real enquanto digita (com debounce)
        inputPesquisa.addEventListener('input', debounce(function() { realizarPesquisa(); }, 160));
        inputPesquisa.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                realizarPesquisa();
            }
        });
    }
    
    console.log('✅ Pesquisa configurada');
}

// Configurar paginação
function configurarPaginacao() {
    const selectItensPorPagina = document.getElementById('itensPorPagina');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    if (selectItensPorPagina) {
        selectItensPorPagina.addEventListener('change', function() {
            const valor = this.value;
            console.log(`📄 Itens por página alterado para: ${valor}`);
            // TODO: Implementar paginação real
        });
    }
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', function() {
            console.log('⬅️ Página anterior');
            // TODO: Implementar navegação
        });
    }
    
    if (btnNextPage) {
        btnNextPage.addEventListener('click', function() {
            console.log('➡️ Próxima página');
            // TODO: Implementar navegação
        });
    }
    
    console.log('✅ Paginação configurada');
}

