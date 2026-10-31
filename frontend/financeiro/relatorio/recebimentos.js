// JavaScript do menu (copiado do padrão do sistema)

// Detectar IDs duplicados e remover
function detectarIDsDuplicados() {
    const elementos = document.querySelectorAll('[id]');
    const ids = {};
    const duplicados = [];

    elementos.forEach(elemento => {
        const id = elemento.id;
        if (ids[id]) {
            duplicados.push(id);
        } else {
            ids[id] = true;
        }
    });

    if (duplicados.length > 0) {
        console.warn('IDs duplicados encontrados:', duplicados);
        duplicados.forEach(id => {
            const elementosDuplicados = document.querySelectorAll(`#${id}`);
            for (let i = 1; i < elementosDuplicados.length; i++) {
                elementosDuplicados[i].removeAttribute('id');
            }
        });
    }
}

function configurarDropdownInicioRapido() {
    if (window.dropdownConfigurado) return;

    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdown = document.querySelector('.dropdown');

    if (dropdownToggle && dropdown) {
        dropdownToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
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
            console.log(`📋 Item ${index + 1}:`, item.textContent.trim());
            
            item.addEventListener('click', function(e) {
                console.log(`🎯 Clique no item do submenu lateral: ${this.textContent.trim()}`);
                hideSubmenu();
                
                // Fechar submenu principal após clique
                setTimeout(() => {
                    const financeiroContainer = document.getElementById('financeiroMenuItem')?.parentElement;
                    const financeiroSubmenu = document.getElementById('financeiroSubmenu');
                    
                    if (financeiroContainer && financeiroSubmenu) {
                        financeiroContainer.classList.remove('open');
                        financeiroSubmenu.classList.remove('open');
                        salvarEstadoSubmenu('financeiro', false);
                    }
                }, 150);
            });
        });
        
        console.log('✅ Submenu lateral do Caixa configurado com sucesso!');
    } else {
        console.log('❌ Elementos do submenu lateral não encontrados');
    }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que outros elementos carregaram
    setTimeout(() => {
        configurarSubmenuLateralCaixa();
    }, 200);
});

// ==================== RECEBIMENTOS ==================== 

// Configurações padrão do formulário
const configuracoesPadrao = {
    periodoRecebimento: '07/11/2025 - 07/11/2025',
    agrupamento: 'porData',
    tipoImpressao: 'completo',
    detalharFormasPagamento: false,
    tipoDocumento: 'todos',
    cliente: 'todos',
    profissional: 'todos',
    tag: 'todas'
};

// Função para inicializar o formulário
function inicializarFormulario() {
    // Configurar campo de período (readonly com data atual)
    const periodoRecebimento = document.getElementById('periodoRecebimento');
    if (periodoRecebimento) {
        const hoje = new Date().toLocaleDateString('pt-BR');
        periodoRecebimento.value = `${hoje} - ${hoje}`;
    }

    // Configurar selects com valores padrão
    const agrupamento = document.getElementById('agrupamento');
    if (agrupamento) {
        agrupamento.value = 'porData';
    }

    const tipoImpressao = document.getElementById('tipoImpressao');
    if (tipoImpressao) {
        tipoImpressao.value = 'completo';
    }

    // Configurar event listeners
    configurarEventListeners();
}

// Função para configurar event listeners
function configurarEventListeners() {
    // Botão Visualizar
    const btnVisualizar = document.getElementById('btnVisualizar');
    if (btnVisualizar) {
        btnVisualizar.addEventListener('click', visualizarRelatorio);
    }

    // Botão Limpar
    const btnLimpar = document.getElementById('btnLimpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparFormulario);
    }

    // Checkbox detalhar formas de pagamento
    const detalharCheckbox = document.getElementById('detalharFormasPagamento');
    if (detalharCheckbox) {
        detalharCheckbox.addEventListener('change', function() {
            console.log('Detalhar formas de pagamento:', this.checked);
        });
    }
}

// Função para coletar dados do formulário
function coletarDadosFormulario() {
    const dados = {};
    
    // Campos de texto e select
    const campos = [
        'periodoRecebimento', 'agrupamento', 'tipoImpressao',
        'tipoDocumento', 'cliente', 'profissional', 'tag'
    ];
    
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            dados[campo] = elemento.value;
        }
    });
    
    // Checkbox
    const detalharCheckbox = document.getElementById('detalharFormasPagamento');
    dados.detalharFormasPagamento = detalharCheckbox ? detalharCheckbox.checked : false;
    
    return dados;
}

// Função para visualizar relatório
function visualizarRelatorio() {
    const dados = coletarDadosFormulario();
    
    console.log('Dados do relatório de Recebimentos:', dados);
    
    // Validar período obrigatório
    if (!dados.periodoRecebimento) {
        alert('Por favor, selecione o período de recebimento.');
        return;
    }
    
    // Mostrar loading
    const btnVisualizar = document.getElementById('btnVisualizar');
    const textoOriginal = btnVisualizar.innerHTML;
    
    btnVisualizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    btnVisualizar.disabled = true;
    
    // Simular processamento
    setTimeout(() => {
        alert('Relatório de Recebimentos gerado com sucesso!\n\nFuncionalidade de geração de relatório será implementada em breve.');
        
        // Restaurar botão
        btnVisualizar.innerHTML = textoOriginal;
        btnVisualizar.disabled = false;
    }, 2000);
}

// Função para limpar formulário
function limparFormulario() {
    // Resetar período para data atual
    const periodoRecebimento = document.getElementById('periodoRecebimento');
    if (periodoRecebimento) {
        const hoje = new Date().toLocaleDateString('pt-BR');
        periodoRecebimento.value = `${hoje} - ${hoje}`;
    }
    
    // Resetar selects para valores padrão
    const selects = {
        'agrupamento': 'porData',
        'tipoImpressao': 'completo',
        'tipoDocumento': 'todos',
        'cliente': 'todos',
        'profissional': 'todos',
        'tag': 'todas'
    };
    
    Object.keys(selects).forEach(selectId => {
        const elemento = document.getElementById(selectId);
        if (elemento) {
            elemento.value = selects[selectId];
        }
    });
    
    // Resetar checkbox
    const detalharCheckbox = document.getElementById('detalharFormasPagamento');
    if (detalharCheckbox) {
        detalharCheckbox.checked = false;
    }
    
    console.log('Formulário de Recebimentos limpo');
}

// Função para validar formulário
function validarFormulario() {
    const dados = coletarDadosFormulario();
    const erros = [];
    
    // Validar período obrigatório
    if (!dados.periodoRecebimento) {
        erros.push('Período de recebimento é obrigatório.');
    }
    
    return {
        valido: erros.length === 0,
        erros: erros
    };
}

// Inicializar página quando carregada
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        inicializarFormulario();
    }, 300);
});
