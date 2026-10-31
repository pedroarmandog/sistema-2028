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
// FUNCIONALIDADES DA PÁGINA CONTAGEM DE ESTOQUE
// ========================================

function inicializarContagemEstoque() {
    console.log('📦 Inicializando página de Contagem de Estoque');
    
    // Definir data atual no input
    const dataInput = document.getElementById('dataInicioContagem');
    if (dataInput) {
        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0];
        dataInput.value = dataFormatada;
    }
    
    // Configurar event listeners
    configurarEventListenersContagem();

    // Toasts customizados para feedback (canto superior direito)
    (function criarContainerToasts(){
        try{
            if(document.getElementById('__contagem_toast_container')) return;
            const container = document.createElement('div');
            container.id = '__contagem_toast_container';
            container.style.position = 'fixed';
            container.style.top = '16px';
            container.style.right = '16px';
            container.style.zIndex = '99999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            container.setAttribute('aria-live','polite');
            document.body.appendChild(container);
        }catch(e){ console.warn('Erro criando container de toasts', e); }
    })();
    
    console.log('✅ Página de Contagem de Estoque inicializada');
}

// Função utilitária para mostrar toasts no canto superior direito
function showContagemToast(message, type){
    try{
        let container = document.getElementById('__contagem_toast_container');
        if(!container){
            container = document.createElement('div');
            container.id = '__contagem_toast_container';
            container.style.position = 'fixed';
            container.style.top = '16px';
            container.style.right = '16px';
            container.style.zIndex = '99999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'contagem-toast';
        toast.style.minWidth = '240px';
        toast.style.maxWidth = '420px';
        toast.style.padding = '12px 16px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
        toast.style.fontSize = '14px';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.justifyContent = 'space-between';
        toast.style.gap = '12px';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 220ms ease, transform 220ms ease';
        toast.style.transform = 'translateY(-6px)';

        // cores: sucesso verde claro semelhante ao sistema
        if(type === 'success'){
            toast.style.background = '#eaf6ee';
            toast.style.border = '1px solid #c6e9cf';
            toast.style.color = '#0b6a3a';
        } else if(type === 'error'){
            toast.style.background = '#fdecea';
            toast.style.border = '1px solid #f4c2bf';
            toast.style.color = '#6b1b17';
        } else {
            toast.style.background = '#ffffff';
            toast.style.border = '1px solid rgba(0,0,0,0.06)';
            toast.style.color = '#222';
        }

        const txt = document.createElement('div');
        txt.textContent = message;
        txt.style.flex = '1';
        txt.style.paddingRight = '8px';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'OK';
        btn.style.background = 'transparent';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '600';
        btn.style.color = (type === 'success') ? '#0b6a3a' : (type === 'error' ? '#6b1b17' : '#333');

        btn.addEventListener('click', function(){
            try{ if(toast && toast.remove) toast.remove(); }catch(e){}
        });

        toast.appendChild(txt);
        toast.appendChild(btn);
        container.appendChild(toast);

        // animar entrada
        requestAnimationFrame(()=>{ toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });

        // remover automaticamente após 4s
        setTimeout(()=>{ try{ toast.style.opacity = '0'; toast.style.transform = 'translateY(-6px)'; setTimeout(()=>{ try{ toast.remove(); }catch(e){} },220); }catch(e){} }, 4000);
    }catch(e){ console.warn('Erro mostrando toast', e); }
}

// Busca a última data de movimento no histórico de estoque do produto
async function fetchUltimaDataContagem(produtoId){
    try{
        if(!produtoId) return null;
        const resp = await fetch('/api/itens/' + encodeURIComponent(produtoId) + '/historico-estoque');
        if(!resp.ok) return null;
        const hist = await resp.json();
        if(!Array.isArray(hist) || hist.length === 0) return null;
        // o endpoint já retorna em ordem DESC por data; pegar primeiro
        const primeiro = hist[0];
        const d = primeiro.dataMovimento || primeiro.data || primeiro.createdAt || null;
        if(!d) return null;
        const dt = new Date(d);
        if(isNaN(dt.getTime())) return null;
        return dt.toLocaleDateString('pt-BR');
    }catch(e){ console.warn('Erro buscando historico-estoque:', e); return null; }
}

function configurarEventListenersContagem() {
    const btnIniciar = document.getElementById('btnIniciarContagem');
    
    if (btnIniciar) {
        btnIniciar.addEventListener('click', iniciarContagem);
    }
    
    console.log('✅ Event listeners configurados');
}

function iniciarContagem() {
    const dataInput = document.getElementById('dataInicioContagem');
    
    if (!dataInput || !dataInput.value) {
        alert('Por favor, informe a data de início da contagem!');
        return;
    }
    
    const dataFormatada = new Date(dataInput.value + 'T00:00:00').toLocaleDateString('pt-BR');
    
    console.log('📊 Iniciando contagem de estoque para:', dataFormatada);
    console.log('📊 Iniciando contagem de estoque para:', dataFormatada);

    // Exibir a data selecionada dentro do header verde da contagem
    try{
        const contagemHeader = document.querySelector('.contagem-header-verde');
        if(contagemHeader){
            let badge = document.getElementById('__contagem_data_badge');
            if(!badge){
                badge = document.createElement('div');
                badge.id = '__contagem_data_badge';
                // estilo: texto branco, sem fundo extra, alinhado à direita dentro do header verde
                badge.style.color = '#ffffff';
                badge.style.background = 'transparent';
                badge.style.padding = '6px 10px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '13px';
                badge.style.float = 'right';
                badge.style.marginTop = '-20px';
                badge.style.marginRight = '16px';
                badge.style.fontWeight = '600';
                contagemHeader.appendChild(badge);
            }
            badge.textContent = `Contagem: ${dataFormatada}`;
        }
    }catch(e){ console.warn('Erro exibindo badge de data', e); }

    // Renderizar os campos Código de barras e Quantidade na área de contagem
    try{
        const area = document.querySelector('.contagem-info-area');
        if(area){
            area.innerHTML = '';
            const form = document.createElement('div');
            form.style.display = 'flex';
            form.style.alignItems = 'flex-start';
            form.style.gap = '18px';

            const col1 = document.createElement('div');
            col1.style.flex = '1 1 320px';
            const lblCodigo = document.createElement('label'); lblCodigo.textContent = 'Código de barras'; lblCodigo.style.display='block'; lblCodigo.style.marginBottom='8px';
            const inpCodigo = document.createElement('input'); inpCodigo.type='text'; inpCodigo.id='contagemCodigo'; inpCodigo.className='form-input-contagem'; inpCodigo.style.width='100%'; inpCodigo.style.padding='10px'; inpCodigo.style.border='1px solid #ccc'; inpCodigo.style.borderRadius='4px';
            col1.appendChild(lblCodigo); col1.appendChild(inpCodigo);

            // aviso inline quando item já foi contado nesta sessão (mensagem + última data)
            const avisoInline = document.createElement('div');
            avisoInline.id = '__contagem_item_aviso';
            avisoInline.style.marginTop = '10px';
            avisoInline.style.display = 'none';
            const avisoMsg = document.createElement('div');
            avisoMsg.style.color = '#e05a5a';
            avisoMsg.style.fontWeight = '700';
            avisoMsg.style.marginBottom = '6px';
            const avisoDate = document.createElement('div');
            avisoDate.style.color = '#a94442';
            avisoDate.style.fontWeight = '400';
            avisoDate.style.fontSize = '13px';
            avisoInline.appendChild(avisoMsg);
            avisoInline.appendChild(avisoDate);
            col1.appendChild(avisoInline);

            const col2 = document.createElement('div');
            col2.style.width = '160px';
            const lblQtd = document.createElement('label'); lblQtd.textContent = 'Quantidade'; lblQtd.style.display='block'; lblQtd.style.marginBottom='8px';
            const inpQtd = document.createElement('input'); inpQtd.type='number'; inpQtd.id='contagemQuantidade'; inpQtd.className='form-input-contagem'; inpQtd.style.width='100%'; inpQtd.style.padding='10px'; inpQtd.style.border='1px solid #ccc'; inpQtd.style.borderRadius='4px'; inpQtd.min='0';
            col2.appendChild(lblQtd); col2.appendChild(inpQtd);

            const col3 = document.createElement('div'); col3.style.alignSelf='flex-end';
            const btnSalvar = document.createElement('button'); btnSalvar.id='btnSalvarContagem'; btnSalvar.className='btn-iniciar'; btnSalvar.textContent='Salvar'; btnSalvar.style.padding='10px 14px';
            col3.appendChild(btnSalvar);

            form.appendChild(col1); form.appendChild(col2); form.appendChild(col3);
            area.appendChild(form);

            // comportamento do botão salvar: atualizar estoque no backend (NADA em localStorage)
            // manter Set local dos itens contados durante a sessão de contagem
            try{ if(!window.__contagem_contados) window.__contagem_contados = new Set(); }catch(e){ window.__contagem_contados = new Set(); }

            // limpar aviso quando o usuário alterar o código
            inpCodigo.addEventListener('input', function(){ try{ avisoMsg.textContent = ''; avisoDate.textContent = ''; avisoInline.style.display = 'none'; }catch(e){} });

            btnSalvar.addEventListener('click', async function(ev){
                ev.preventDefault();
                const codigo = document.getElementById('contagemCodigo').value.trim();
                const quantidadeRaw = document.getElementById('contagemQuantidade').value;
                const quantidade = Number(quantidadeRaw);
                if(!codigo){ showContagemToast('Informe o código de barras.', 'error'); return; }
                if(isNaN(quantidade) || quantidade < 0){ showContagemToast('Informe uma quantidade válida (0 ou maior).', 'error'); return; }

                try{
                    // Buscar produto pelo código via endpoint de itens (busca por nome ou código)
                    const q = encodeURIComponent(codigo);
                    const resp = await fetch('/api/itens?q=' + q);
                    if(!resp.ok) throw new Error('Falha ao buscar produto');
                    const itens = await resp.json();
                    let produto = null;
                    if(Array.isArray(itens)){
                        produto = itens.find(p => String(p.codigo) === String(codigo)) || itens[0];
                    } else if(itens && (itens.codigo || itens.id)){
                        produto = itens;
                    }
                    if(!produto){ showContagemToast('Produto não encontrado para o código informado.', 'error'); return; }

                    const produtoId = produto.id || produto.ID || produto.Id || String(codigo);
                    // mostrar aviso inline se o item já foi contado nesta sessão e tentar mostrar última data do histórico
                    try{
                        const chave = String(produtoId);
                        if(window.__contagem_contados && window.__contagem_contados.has(chave)){
                            avisoMsg.textContent = 'Item já contado anteriormente!';
                            avisoInline.style.display = 'block';
                            try{
                                const ultima = await fetchUltimaDataContagem(chave);
                                if(ultima){ avisoDate.textContent = 'Última contagem: ' + ultima; } else { avisoDate.textContent = ''; }
                            }catch(e){ avisoDate.textContent = ''; }
                        } else {
                            avisoMsg.textContent = '';
                            avisoDate.textContent = '';
                            avisoInline.style.display = 'none';
                        }
                    }catch(e){}

                    const id = produto.id || produto.ID || produto.Id;
                    const atual = Number(produto.estoqueAtual) || 0;
                    const diff = quantidade - atual;
                    if(diff === 0){
                        showContagemToast('Quantidade igual ao estoque atual. Nenhuma alteração necessária.', 'success');
                        document.getElementById('contagemCodigo').value=''; document.getElementById('contagemQuantidade').value='';
                        document.getElementById('contagemCodigo').focus();
                        return;
                    }

                    const operacao = diff > 0 ? 'adicionar' : 'reduzir';
                    const body = { quantidade: Math.abs(diff), operacao, dataAjuste: (dataInput && dataInput.value) ? dataInput.value : new Date().toISOString() };

                    const updateResp = await fetch('/api/itens/' + encodeURIComponent(id) + '/estoque', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if(!updateResp.ok){
                        const err = await updateResp.json().catch(()=>({ error: 'erro desconhecido' }));
                        throw new Error(err && err.error ? err.error : 'Falha ao atualizar estoque');
                    }

                    const result = await updateResp.json();
                    try{ console.log('Atualização de estoque result:', result); }catch(e){}
                    showContagemToast('Estoque atualizado com sucesso. Novo estoque: ' + (result.novoEstoque !== undefined ? result.novoEstoque : (atual + (diff>0?Math.abs(diff):-Math.abs(diff)))), 'success');

                    // marcar como contado nesta sessão (permite novo aviso se contado novamente) e atualizar última data
                    try{
                        window.__contagem_contados.add(String(id || codigo));
                        avisoMsg.textContent = 'Item já contado anteriormente!';
                        avisoInline.style.display = 'block';
                        try{ const ultima = await fetchUltimaDataContagem(id || codigo); if(ultima) avisoDate.textContent = 'Última contagem: ' + ultima; }catch(e){ avisoDate.textContent = ''; }
                    }catch(e){}

                    // limpar campos para próximo registro
                    document.getElementById('contagemCodigo').value=''; document.getElementById('contagemQuantidade').value='';
                    document.getElementById('contagemCodigo').focus();
                }catch(err){
                    console.error('Erro ao salvar contagem:', err);
                    showContagemToast('Erro ao atualizar estoque: ' + (err && err.message ? err.message : err), 'error');
                }
            });
        }
    }catch(e){ console.warn('Erro montando área de contagem', e); }

    // desabilitar input e botão de iniciar para evitar reiniciar sem recarregar
    try{ dataInput.disabled = true; const btn = document.getElementById('btnIniciarContagem'); if(btn) btn.disabled = true; }catch(e){}

    // Criar botão 'Limpar data' abaixo do formulário de início (apenas uma vez)
    try{
        const contagemForm = document.querySelector('.contagem-form-container');
        if(contagemForm && !document.getElementById('btnLimparContagem')){
            const btnLimpar = document.createElement('button');
            btnLimpar.id = 'btnLimparContagem';
            btnLimpar.textContent = 'Limpar data';
            // usar mesma classe do botão Iniciar para garantir mesmo tamanho/espessura
            btnLimpar.className = 'btn-iniciar';
            // sobrescrever cor para vermelho mantendo tamanho/aparência
            btnLimpar.style.backgroundColor = '#d9534f';
            btnLimpar.style.borderColor = 'rgba(0,0,0,0.05)';
            btnLimpar.style.color = '#fff';
            btnLimpar.style.marginTop = '12px';
            // inserir logo abaixo do botão Iniciar
            contagemForm.appendChild(document.createElement('br'));
            contagemForm.appendChild(btnLimpar);

            btnLimpar.addEventListener('click', function(ev){
                try{
                    ev.preventDefault(); ev.stopPropagation();
                    // limpar input de data
                    if(dataInput){ dataInput.value = ''; dataInput.disabled = false; }
                    // reabilitar botão iniciar
                    const btn = document.getElementById('btnIniciarContagem'); if(btn) btn.disabled = false;
                    // limpar área de contagem
                    const area = document.querySelector('.contagem-info-area'); if(area) area.innerHTML = '';
                    // remover badge de data
                    const badge = document.getElementById('__contagem_data_badge'); if(badge) badge.remove();
                    // limpar registros em memória e contagem temporária
                    try{ delete window.__contagem_registros; }catch(e){ window.__contagem_registros = []; }
                    try{ delete window.__contagem_contados; }catch(e){ window.__contagem_contados = new Set(); }
                    // foco no input de data
                    try{ dataInput.focus(); }catch(e){}
                }catch(e){ console.warn('Erro ao limpar contagem', e); }
            });
        }
    }catch(e){ console.warn('Erro criando botão Limpar data', e); }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarContagemEstoque);
} else {
    inicializarContagemEstoque();
}
