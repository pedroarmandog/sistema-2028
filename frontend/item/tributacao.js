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
});

// ========================================
// FUNCIONALIDADES DA PÁGINA TRIBUTAÇÃO
// ========================================

function inicializarTributacao() {
    console.log('🏢 Inicializando página de Tributação');
    
    // suportar múltiplos elementos com id (duplicados) e escolher o primeiro visível
    const allSelects = Array.from(document.querySelectorAll('#perfilTributacao'));
    let selectPerfil = allSelects.find(s => (s.offsetParent !== null) || (s.getBoundingClientRect().width > 0));
    if (!selectPerfil) selectPerfil = allSelects[0] || null;
    const optionsIcon = document.querySelector('.options-icon');
    
    if (selectPerfil) {
        // Substituir select por container estilizado e dropdown customizado
        try{
            const wrapper = selectPerfil.parentElement; // .select-wrapper
            // usar explicitamente a lista de perfis solicitada (ignorar opções pré-existentes)
            const perfilOptions = [
                'Não incidência ICMS',
                'Serviços - Aliquota ICMS Inválida',
                'Tributado 7%',
                'Tributado 25%',
                'Insento de ICMS',
                'Tributado ICMS Aliquota (x)',
                'Substituição Tributária ICMS',
                'Isento IPI',
                'Tributado IPI',
                'Suspensão ICMS',
                'Imune ICMS',
                'Revenda - ICMS Normal',
                'Serviço - ISS',
                'Ex-Tipi',
                'OutrosPerfis - Exemplo'
            ];

            // esconder o select original (mantemos no DOM para compatibilidade)
            try {
                // esconder todos os selects duplicados
                allSelects.forEach(s => {
                    try {
                        s.hidden = true;
                        s.style.display = 'none';
                        s.style.opacity = '0';
                        s.style.pointerEvents = 'none';
                        s.setAttribute('aria-hidden', 'true');
                    } catch(e){}
                });
            } catch(e){}

            // Substituir quaisquer opções pré-existentes no select original
            try {
                selectPerfil.innerHTML = '';
                perfilOptions.forEach(function(txt){
                    const opt = document.createElement('option');
                    opt.value = txt;
                    opt.text = txt;
                    selectPerfil.appendChild(opt);
                });
            } catch(e) { console.warn('Não foi possível repopular o select original:', e); }

            // criar container clicável no lugar do select
            const display = document.createElement('div');
            display.id = 'perfilTributacao_display';
            display.className = 'perfil-display';
            display.style.border = '1px solid #eee';
            display.style.padding = '8px 10px';
            display.style.borderRadius = '4px';
            display.style.cursor = 'text';
            display.style.display = 'flex';
            display.style.alignItems = 'center';
            display.style.justifyContent = 'space-between';
            display.innerHTML = '<span id="perfilTributacao_text" style="color:#888">Selecione um Perfil de Tributação</span><i class="fas fa-caret-down" style="margin-left:8px;color:#888"></i>';
            wrapper.insertBefore(display, selectPerfil);

            // criar dropdown flutuante
            const perfilDropdown = document.createElement('div');
            perfilDropdown.className = 'perfil-dropdown';
            perfilDropdown.style.position = 'absolute';
            perfilDropdown.style.display = 'none';
            perfilDropdown.style.zIndex = 140000;
            perfilDropdown.style.maxHeight = '300px';
            perfilDropdown.style.overflowY = 'auto';
            perfilDropdown.style.background = '#fff';
            perfilDropdown.style.border = '1px solid #e6e9eb';
            perfilDropdown.style.borderRadius = '6px';
            perfilDropdown.style.boxShadow = '0 6px 18px rgba(2,6,23,0.12)';
            document.body.appendChild(perfilDropdown);

            function positionDropdown(){
                const r = display.getBoundingClientRect();
                perfilDropdown.style.minWidth = Math.max(250, r.width) + 'px';
                perfilDropdown.style.left = Math.round(r.left + window.pageXOffset) + 'px';
                perfilDropdown.style.top = Math.round(r.bottom + window.pageYOffset + 6) + 'px';
            }

            function renderList(filter){
                perfilDropdown.innerHTML = '';
                const normalized = (filter||'').toLowerCase();
                const items = perfilOptions.filter(p=>p.toLowerCase().indexOf(normalized) !== -1);
                if(items.length === 0){ const empty = document.createElement('div'); empty.textContent='Nenhum resultado'; empty.style.padding='10px 12px'; perfilDropdown.appendChild(empty); return; }
                items.forEach(text=>{
                    const it = document.createElement('div'); it.className='grupo-dropdown-item'; it.style.padding='10px 12px'; it.style.cursor='pointer'; it.textContent = text;
                    it.addEventListener('click', function(e){ e.stopPropagation();
                        // atualizar label e o select original
                        const span = document.getElementById('perfilTributacao_text'); if(span){ span.textContent = text; span.style.color = '#222'; }
                        // tentar mapear para value do select se existir
                        let matched = Array.from(selectPerfil.options).find(o=>o.text===text);
                        if(matched) selectPerfil.value = matched.value; else selectPerfil.value = text;
                        perfilDropdown.style.display = 'none';
                        document.removeEventListener('click', outsideClick);
                        console.log('✅ Perfil de tributação selecionado: ' + text);
                    });
                    perfilDropdown.appendChild(it);
                });
            }

            function outsideClick(ev){ if(!perfilDropdown.contains(ev.target) && !display.contains(ev.target)) { perfilDropdown.style.display='none'; document.removeEventListener('click', outsideClick); } }

            display.addEventListener('click', function(e){
                e.stopPropagation();
                // criar input temporário para busca dentro o container (antes de posicionar o dropdown)
                let input = display.querySelector('input');
                if(!input){
                    input = document.createElement('input');
                    input.type='text';
                    input.placeholder='Pesquisar...';
                    input.style.flex='1';
                    input.style.border='none';
                    input.style.outline='none';
                    input.style.marginRight='8px';
                    display.insertBefore(input, display.firstChild);
                    input.addEventListener('input', function(){ renderList(this.value); requestAnimationFrame(positionDropdown); });
                    input.addEventListener('keydown', function(ev){ if(ev.key==='Escape'){ perfilDropdown.style.display='none'; document.removeEventListener('click', outsideClick); } });
                }

                // posicionar e mostrar após garantir o input está presente
                requestAnimationFrame(function(){
                    positionDropdown();
                    renderList('');
                    perfilDropdown.style.display='block';
                    input.focus();
                });

                setTimeout(()=>{ document.addEventListener('click', outsideClick); },50);
            });

            console.log('✅ Select de perfil de tributação customizado configurado');
        }catch(err){ console.error('Erro configurando dropdown custom perfilTributacao', err); }
    } else {
        console.error('❌ Select de perfil de tributação não encontrado');
    }
    
    if (optionsIcon) {
        // Evento de clique no ícone de opções
        optionsIcon.addEventListener('click', function() {
            abrirOpcoesPerfilTributacao();
        });
        
        console.log('✅ Ícone de opções configurado');
    } else {
        console.error('❌ Ícone de opções não encontrado');
    }
}

function abrirOpcoesPerfilTributacao() {
    console.log('⚙️ Abrindo opções de perfil de tributação');
    alert('Opções de Perfil de Tributação\n\n• Criar novo perfil\n• Editar perfis existentes\n• Gerenciar configurações fiscais');
    // Aqui você pode abrir um modal com opções mais elaboradas
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarTributacao);
} else {
    inicializarTributacao();
}
