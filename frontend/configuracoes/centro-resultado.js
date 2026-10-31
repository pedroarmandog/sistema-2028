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
// FUNCIONALIDADES DA PÁGINA CENTRO DE RESULTADO
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarPaginaCentroResultado();
});

// Transformar select em dropdown customizado (estilo do sistema)
function transformSelectToCustomDropdown(selectId){
    try{
        var sel = document.getElementById(selectId);
        if(!sel) return;
        // criar wrapper
        var wrapper = document.createElement('div'); wrapper.className = 'custom-dropdown';
        // toggle
        var toggle = document.createElement('div'); toggle.className = 'custom-dropdown-toggle';
        var input = document.createElement('input'); input.className = 'custom-dropdown-toggle-input'; input.type='text'; input.readOnly=true;
        input.value = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
        toggle.appendChild(input);
        wrapper.appendChild(toggle);
        
        // menu - MONTAR NO BODY para evitar clipping do modal
        var menu = document.createElement('div'); menu.className = 'custom-dropdown-menu';
        var items = document.createElement('div'); items.className = 'custom-dropdown-items';
        Array.from(sel.options).forEach(function(o,idx){
            var item = document.createElement('div'); item.className = 'custom-dropdown-item'; item.tabIndex=0;
            item.textContent = o.text; item.dataset.value = o.value; item.dataset.index = idx;
            item.addEventListener('click', function(e){
                // set original select
                sel.value = this.dataset.value;
                // update display
                input.value = this.textContent;
                // close
                menu.classList.remove('open');
                wrapper.classList.remove('open');
                // trigger change event on select
                var ev = new Event('change',{ bubbles:true}); sel.dispatchEvent(ev);
            });
            items.appendChild(item);
        });
        menu.appendChild(items);
        
        // ANEXAR MENU AO BODY
        document.body.appendChild(menu);
        
        // replace select in DOM (keep select but hide it)
        sel.style.display='none'; sel.parentNode.insertBefore(wrapper, sel);

        // Função para posicionar o menu
        function positionMenu(){
            var rect = toggle.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.minWidth = rect.width + 'px';
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 4) + 'px';
        }

        // Função para fechar todos os menus
        function closeAllCustomMenus(){
            document.querySelectorAll('.custom-dropdown-menu.open').forEach(function(m){ m.classList.remove('open'); });
            document.querySelectorAll('.custom-dropdown.open').forEach(function(w){ w.classList.remove('open'); });
        }

        // toggle open/close
        toggle.addEventListener('click', function(e){
            e.stopPropagation();
            var isOpen = menu.classList.contains('open');
            closeAllCustomMenus();
            if(!isOpen){
                positionMenu();
                menu.classList.add('open');
                wrapper.classList.add('open');
            }
        });
        
        // close on outside
        document.addEventListener('click', function(e){ 
            if(!wrapper.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('open');
                wrapper.classList.remove('open');
            }
        });
        
        // Reposicionar ao rolar ou redimensionar
        window.addEventListener('resize', function(){
            if(menu.classList.contains('open')) positionMenu();
        });
        window.addEventListener('scroll', function(){
            if(menu.classList.contains('open')) positionMenu();
        }, true);
        
    }catch(e){ console.error('transformSelectToCustomDropdown error', e); }
}

function inicializarPaginaCentroResultado() {
    console.log('🏢 Inicializando página Centro de Resultado...');
    
    // Configurar botão adicionar (abre modal moderno)
    const btnAdicionar = document.querySelector('.btn-adicionar-centro');
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', abrirModalCentro);
    }
    
    // Configurar botão flutuante
    const btnFlutuar = document.querySelector('.btn-floating-add');
    if (btnFlutuar) {
        btnFlutuar.addEventListener('click', abrirModalCentro);
    }

    // Transformar select Unidade de Negócio em dropdown customizado
    transformSelectToCustomDropdown('inputUnidadeNegocio');
    
    // Configurar pesquisa
    const btnPesquisar = document.querySelector('.btn-pesquisar');
    const inputPesquisa = document.getElementById('searchCentroResultado');
    
    if (btnPesquisar && inputPesquisa) {
        btnPesquisar.addEventListener('click', realizarPesquisaCentro);
        inputPesquisa.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                realizarPesquisaCentro();
            }
        });

        // pesquisa em tempo real enquanto digita (debounce para evitar chamadas excessivas)
        (function(){
            var t = null;
            inputPesquisa.addEventListener('input', function(){
                clearTimeout(t);
                t = setTimeout(function(){ realizarPesquisaCentro(); }, 200);
            });
        })();
    }
    
    // Configurar select de itens por página
    const selectItens = document.querySelector('.items-per-page');
    if (selectItens) {
        selectItens.addEventListener('change', function() {
            console.log('📄 Itens por página alterado para:', this.value);
        });
    }
    
    console.log('✅ Página Centro de Resultado inicializada!');
    // Carregar centros persistidos no backend (se houver)
    carregarCentrosBackend();
}

function carregarCentrosBackend(){
    // API base: use variável global se definida, senão use a origem atual
    var API_BASE = (window.__API_BASE__ && window.__API_BASE__.toString()) || window.location.origin;
    try{
        fetch(API_BASE + '/api/centros')
        .then(function(resp){ if(!resp.ok) return Promise.reject('fetch-failed'); return resp.json(); })
        .then(function(list){
            const tbody = document.querySelector('.centro-resultado-table tbody');
            if(!tbody) return;

            // renderizar lista retornada do backend (sem usar localStorage)
            if (!Array.isArray(list) || list.length === 0) return;
            tbody.innerHTML = '';
            list.forEach(function(c){
                const slug = c.slug || (c.descricao||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-');
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${c.descricao || ''}</td>
                    <td>${c.unidade || ''}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="handleEditCentro('${slug}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                    <td>
                        <button class="btn-action btn-delete" onclick="handleDeleteCentro('${slug}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            atualizarContador();
        })
        .catch(function(err){
            console.error('Erro ao carregar centros do backend', err);
            showNotification('Erro ao carregar centros do backend', 'error');
        });
    }catch(e){ console.error('carregarCentrosBackend erro', e); }
}

async async function adicionarCentroResultado() {
    // Compatibilidade: abrir modal moderno em vez de usar prompt
    if (typeof abrirModalCentro === 'function') {
        abrirModalCentro();
        return;
    }
    // Fallback: manter comportamento antigo caso modal não exista
    const descricao = await solicitar('Digite a descrição do Centro de Resultado:');
    if (descricao && descricao.trim()) {
        const unidadeNegocio = await solicitarsolicitar('Digite a Unidade de Negócio:');
        if (unidadeNegocio && unidadeNegocio.trim()) {
            console.log('📝 Adicionando Centro de Resultado:', {
                descricao: descricao.trim(),
                unidadeNegocio: unidadeNegocio.trim()
            });
            
            // Adicionar nova linha na tabela
            adicionarLinhaNaTabela(descricao.trim(), unidadeNegocio.trim());
            showNotification('Centro de Resultado adicionado com sucesso!', 'success');
        }
    }
}

function adicionarLinhaNaTabela(descricao, unidadeNegocio) {
    const tbody = document.querySelector('.centro-resultado-table tbody');
    if (tbody) {
        const novaLinha = document.createElement('tr');
        const id = 'novo-' + Date.now();
        
        novaLinha.innerHTML = `
            <td>${descricao}</td>
            <td>${unidadeNegocio}</td>
            <td>
                <button class="btn-action btn-edit" onclick="handleEditCentro('${id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
            <td>
                <button class="btn-action btn-delete" onclick="handleDeleteCentro('${id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(novaLinha);
        atualizarContador();
    }
}

function handleEditCentro(id) {
    console.log('✏️ Editando Centro de Resultado:', id);
    
    const botao = document.querySelector(`[onclick="handleEditCentro('${id}')"]`);
    if (!botao) return;
    const linha = botao.closest('tr');
    const descricaoAtual = linha.cells[0].textContent.trim();
    const unidadeAtual = linha.cells[1].textContent.trim();
    // abrir modal centralizado para edição (usar o modal existente)
    abrirModalCentro({ slug: id, descricao: descricaoAtual, unidade: unidadeAtual });
}

async function handleDeleteCentro(id) {
    console.log('🗑️ Excluindo Centro de Resultado:', id);
    const botao = document.querySelector(`[onclick="handleDeleteCentro('${id}')"]`);
    const linha = botao ? botao.closest('tr') : null;
    let descricao = id;
    if (linha && linha.cells[0]) descricao = linha.cells[0].textContent.trim();

    function doDelete(){
        const slug = descricao.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const API_BASE = (window.__API_BASE__ && window.__API_BASE__.toString()) || window.location.origin;
        fetch(`${API_BASE}/api/centros/${encodeURIComponent(slug)}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } })
        .then(response => {
            if (!response.ok) return response.json().then(err => { throw new Error(err.error || 'Erro ao excluir'); });
            return response.json();
        })
        .then(data => {
            if (linha) { linha.remove(); atualizarContador(); }
            showNotification('Centro de Resultado excluído com sucesso!', 'success');
        })
        .catch(error => { console.error('Erro ao excluir centro:', error); showNotification('Erro ao excluir: ' + error.message, 'error'); });
    }

    // usar openConfirm (modal estilizado) se disponível, senão fallback para confirmar()
    if (typeof openConfirm === 'function') {
        openConfirm(`Deseja realmente excluir "${descricao}"? Esta ação não poderá ser desfeita.`, doDelete);
    } else {
        if (await confirmaronfirmar('Tem certeza que deseja excluir este Centro de Resultado? Esta ação não poderá ser desfeita.')) doDelete();
    }
}

function realizarPesquisaCentro() {
    const termo = document.getElementById('searchCentroResultado').value.toLowerCase();
    console.log('🔍 Pesquisando por:', termo);
    
    const linhas = document.querySelectorAll('.centro-resultado-table tbody tr');
    let encontrados = 0;
    
    linhas.forEach(linha => {
        const descricao = linha.cells[0].textContent.toLowerCase();
        const unidade = linha.cells[1].textContent.toLowerCase();
        
        if (descricao.includes(termo) || unidade.includes(termo)) {
            linha.style.display = '';
            encontrados++;
        } else {
            linha.style.display = 'none';
        }
    });
    
    console.log(`📊 Encontrados ${encontrados} resultados`);
    atualizarContador(encontrados);
}

function atualizarContador(totalExibidos = null) {
    const contador = document.querySelector('.page-info');
    if (contador) {
        const linhasVisiveis = totalExibidos !== null ? 
            totalExibidos : 
            document.querySelectorAll('.centro-resultado-table tbody tr:not([style*="display: none"])').length;
        
        contador.textContent = `1 - ${linhasVisiveis} de ${linhasVisiveis}`;
    }
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Definir cor de fundo baseado no tipo
    let bgColor = '#007bff';
    if (type === 'success') {
        bgColor = '#46e779ff';
    } else if (type === 'error') {
        bgColor = '#eb3e4fff';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: ${bgColor};
        color: #ffffff !important;
        font-weight: 600;
        z-index: 9999;
        transition: all 0.3s ease;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Se não existir uma versão global de openConfirm, criar aqui (modal estilizado)
if (typeof window.openConfirm !== 'function') {
    window.openConfirm = async function(message, onConfirm) {
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
                    <button class="qc-cancel" style="padding:8px 12px;border-radius:6px;border:1px solid #e6e9eb;background:#fff;cursor:pointer">Cancelar</button>
                    <button class="qc-confirm" style="padding:8px 12px;border-radius:6px;border:none;background:#dc3545;color:#fff;cursor:pointer">Excluir</button>
                </div>
            `;

            overlay.appendChild(modal); document.body.appendChild(overlay);
            const btnCancel = modal.querySelector('.qc-cancel');
            const btnConfirm = modal.querySelector('.qc-confirm');
            function close(){ overlay.remove(); }
            btnCancel.addEventListener('click', function(e){ e.preventDefault(); close(); });
            btnConfirm.addEventListener('click', function(e){ e.preventDefault(); try{ if (typeof onConfirm === 'function') onConfirm(); } catch(err){ console.debug(err); } close(); });
            overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
        } catch(e) { console.debug('openConfirm shim failed', e); if (typeof onConfirm === 'function' && (await confirmar(message))) onConfirm(); }
    };
}

// Funções do Modal de Adicionar Centro de Resultado
function abrirModalCentro() {
    // aceitar prefill opcional: abrirModalCentro({ slug, descricao, unidade })
    const prefill = arguments && arguments[0] ? arguments[0] : null;
    const modal = document.getElementById('modalAdicionarCentro');
    if (!modal) return;
    modal.style.display = 'flex';
    // Limpar por padrão
    const inputDesc = document.getElementById('inputDescricao');
    const inputUni = document.getElementById('inputUnidadeNegocio');
    if (!inputDesc || !inputUni) return;
    if (prefill && typeof prefill === 'object') {
        // modo edição
        window.__editingCentroSlug = prefill.slug || null;
        inputDesc.value = prefill.descricao || '';
        inputUni.value = prefill.unidade || '';
        // atualizar label do botão salvar se existir
        const btn = document.getElementById('btnSalvarCentro'); if (btn) btn.textContent = 'Atualizar';
    } else {
        window.__editingCentroSlug = null;
        inputDesc.value = '';
        inputUni.value = '';
        const btn = document.getElementById('btnSalvarCentro'); if (btn) btn.textContent = 'Salvar';
    }
    // Focar no primeiro campo
    setTimeout(() => inputDesc.focus(), 100);
}

function fecharModalCentro() {
    const modal = document.getElementById('modalAdicionarCentro');
    if (modal) {
        modal.style.display = 'none';
    }
}

function salvarCentro() {
    const descricao = document.getElementById('inputDescricao').value.trim();
    const unidadeNegocio = document.getElementById('inputUnidadeNegocio').value.trim();

    // Validação
    if (!descricao) {
        showNotification('Por favor, preencha a descrição', 'error');
        document.getElementById('inputDescricao').focus();
        return;
    }

    if (!unidadeNegocio) {
        showNotification('Por favor, preencha a unidade de negócio', 'error');
        document.getElementById('inputUnidadeNegocio').focus();
        return;
    }

    const tbody = document.querySelector('.centro-resultado-table tbody');
    var API_BASE = (window.__API_BASE__ && window.__API_BASE__.toString()) || window.location.origin;

    // if editing, perform PUT to update
    const editing = window.__editingCentroSlug || null;
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? (API_BASE + '/api/centros/' + encodeURIComponent(editing)) : (API_BASE + '/api/centros');

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: descricao, unidade: unidadeNegocio })
    }).then(function(resp){
        if (resp.ok) return resp.json();
        return resp.json().then(function(j){ throw new Error(j.error || 'erro'); });
    }).then(function(result){
        try{
            // atualizar DOM: se editing, procurar a linha com onclick que contém o slug; senão adicionar nova linha
            if (tbody) {
                if (editing) {
                    const btn = document.querySelector(`[onclick="handleEditCentro('${editing}')"]`);
                    const linha = btn ? btn.closest('tr') : null;
                    if (linha) {
                        linha.cells[0].textContent = result.descricao || descricao;
                        linha.cells[1].textContent = result.unidade || unidadeNegocio;
                    }
                } else {
                    const novaLinha = document.createElement('tr');
                    const slug = result.slug || (descricao.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    novaLinha.innerHTML = `
                        <td>${result.descricao || descricao}</td>
                        <td>${result.unidade || unidadeNegocio}</td>
                        <td>
                            <button class="btn-action btn-edit" onclick="handleEditCentro('${slug}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                        <td>
                            <button class="btn-action btn-delete" onclick="handleDeleteCentro('${slug}')" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(novaLinha);
                }
            }

            fecharModalCentro();
            showNotification(editing ? 'Centro de Resultado atualizado com sucesso!' : 'Centro de Resultado adicionado com sucesso!', 'success');
            window.__editingCentroSlug = null;
            atualizarContador();
        }catch(e){ console.error(e); showNotification('Erro ao aplicar alterações locais', 'error'); }
    }).catch(function(err){
        console.error('Salvar no backend falhou:', err);
        showNotification('Erro ao salvar: ' + (err.message || 'Erro'), 'error');
    });
}



// Event listener para o botão de adicionar
document.addEventListener('DOMContentLoaded', function() {
    const btnAdicionar = document.querySelector('.btn-adicionar-centro');
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', abrirModalCentro);
    }
    
    // Fechar modal ao clicar fora, mas não quando o usuário está selecionando/arrastando texto
    const modal = document.getElementById('modalAdicionarCentro');
    if (modal) {
        modal.__lastMouseDownTarget = null;
        modal.addEventListener('mousedown', function(e){ modal.__lastMouseDownTarget = e.target; });
        modal.addEventListener('click', function(e) {
            // fechar somente se o click ocorreu no próprio overlay/modal e o mousedown também começou nele
            if (e.target === modal && modal.__lastMouseDownTarget === modal) {
                fecharModalCentro();
            }
            modal.__lastMouseDownTarget = null;
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            fecharModalCentro();
        }
    });
});

