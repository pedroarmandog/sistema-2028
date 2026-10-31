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

// ==================== PERFIL DO FORNECEDOR ====================

// Dados dos fornecedores (mesma estrutura da lista)
let fornecedoresData = [
    { 
        id: 5, 
        codigo: 5, 
        nome: 'Banco', 
        telefone: '', 
        cnpj: '',
        razaoSocial: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cep: '',
        cidade: '',
        proximidade: '',
        ativo: true 
    },
    { 
        id: 4, 
        codigo: 4, 
        nome: 'Companhia de Água e Esgoto', 
        telefone: '', 
        cnpj: '',
        razaoSocial: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cep: '',
        cidade: '',
        proximidade: '',
        ativo: true 
    },
    { 
        id: 3, 
        codigo: 3, 
        nome: 'Concessionária Energia', 
        telefone: '', 
        cnpj: '',
        razaoSocial: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cep: '',
        cidade: '',
        proximidade: '',
        ativo: true 
    },
    { 
        id: 2, 
        codigo: 2, 
        nome: 'Operadora de Cartão modelo', 
        telefone: '', 
        cnpj: '',
        razaoSocial: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cep: '',
        cidade: '',
        proximidade: '',
        ativo: true 
    }
];

// Estado atual do fornecedor carregado
let currentFornecedor = null;
let currentFornecedorIsCliente = false;
let currentFornecedorIsProfissional = false;

// Função para obter ID do fornecedor da URL
function obterIdFornecedorDaUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    return id ? parseInt(id) : null;
}

// Função para carregar dados do fornecedor
function carregarDadosFornecedor() {
    const fornecedorId = obterIdFornecedorDaUrl();
    
    if (!fornecedorId) {
        if (typeof window.localShowToast === 'function') window.localShowToast('ID do fornecedor não encontrado.', 'error');
        window.location.href = 'fornecedor.html';
        return;
    }
    // Tentar carregar do backend via ApiClient
    if (typeof ApiClient === 'undefined' || typeof ApiClient.getFornecedor !== 'function') {
        // fallback para dados locais
        const fornecedor = fornecedoresData.find(f => f.id === fornecedorId);
        if (!fornecedor) {
            if (typeof window.localShowToast === 'function') window.localShowToast('Fornecedor não encontrado.', 'error');
            window.location.href = 'fornecedor.html';
            return;
        }
        preencherCamposPerfil(fornecedor);
        return;
    }

    ApiClient.getFornecedor(fornecedorId).then(fornecedor => {
        if (!fornecedor || !fornecedor.id) {
            if (typeof window.localShowToast === 'function') window.localShowToast('Fornecedor não encontrado.', 'error');
            window.location.href = 'fornecedor.html';
            return;
        }
        preencherCamposPerfil(fornecedor);
        // checar se já existe como cliente/profissional
        verificarSeJaSalvo(fornecedor).catch(()=>{});
    }).catch(err => {
        console.error('Erro ao buscar fornecedor:', err);
        if (typeof window.localShowToast === 'function') window.localShowToast('Erro ao carregar fornecedor.', 'error');
        // tentar fallback local
        const fornecedor = fornecedoresData.find(f => f.id === fornecedorId);
        if (fornecedor) {
            preencherCamposPerfil(fornecedor);
            verificarSeJaSalvo(fornecedor).catch(()=>{});
        } else {
            window.location.href = 'fornecedor.html';
        }
    });
}

function preencherCamposPerfil(fornecedor) {
    // armazenar para outras operações (salvar como cliente/profissional)
    currentFornecedor = fornecedor || null;
    // resetar flags temporárias (serão atualizadas por verificação assíncrona)
    currentFornecedorIsCliente = false;
    currentFornecedorIsProfissional = false;

    document.getElementById('fornecedorNome').textContent = fornecedor.nome || '-';
    document.getElementById('fornecedorCodigo').textContent = fornecedor.codigo || fornecedor.id || '-';
    document.getElementById('fornecedorCnpj').textContent = fornecedor.cnpj || '-';
    document.getElementById('fornecedorRazaoSocial').textContent = fornecedor.razaoSocial || fornecedor.razao_social || '-';
    document.getElementById('fornecedorEndereco').textContent = fornecedor.endereco || '-';
    document.getElementById('fornecedorNumero').textContent = fornecedor.numero || '-';
    document.getElementById('fornecedorComplemento').textContent = fornecedor.complemento || '-';
    document.getElementById('fornecedorBairro').textContent = fornecedor.bairro || '-';
    document.getElementById('fornecedorCep').textContent = fornecedor.cep ? formatarCEP(fornecedor.cep) : (fornecedor.cep || '-');
    document.getElementById('fornecedorCidade').textContent = fornecedor.cidade || '-';
    document.getElementById('fornecedorProximidade').textContent = fornecedor.proximidade || '-';
    document.getElementById('fornecedorAtivo').textContent = fornecedor.ativo ? 'Sim' : 'Não';

    // Atualizar botão Ativo visual
    const btnAtivo = document.getElementById('btnAtivoPerfil');
    if (btnAtivo) {
        if (fornecedor.ativo) {
            btnAtivo.style.backgroundColor = '#4CAF50';
            btnAtivo.innerHTML = '<i class="fas fa-check"></i> Ativo <i class="fas fa-chevron-down"></i>';
        } else {
            btnAtivo.style.backgroundColor = '#f44336';
            btnAtivo.innerHTML = '<i class="fas fa-times"></i> Inativo <i class="fas fa-chevron-down"></i>';
        }
    }

    // outros campos extras (se existirem)
    try { document.getElementById('fornecedorTelefone').textContent = fornecedor.telefone || '-'; } catch(e){}
    try { document.getElementById('fornecedorEmail').textContent = fornecedor.email || '-'; } catch(e){}
}

// Verifica se o fornecedor já existe como Cliente ou Profissional no banco
async function verificarSeJaSalvo(fornecedor) {
    if (!fornecedor || typeof ApiClient === 'undefined') return;
    try {
        // buscar clientes e profissionais e comparar por cnpj/cpf/email/nome
        let [clientesResp, profsResp] = await Promise.all([ApiClient.getClientes().catch(()=>[]), ApiClient.getProfissionais().catch(()=>[])]);

        // Normalizar formatos: alguns endpoints retornam { success: true, clientes: [...] }
        let clientes = [];
        if (!clientesResp) clientes = [];
        else if (Array.isArray(clientesResp)) clientes = clientesResp;
        else if (clientesResp.clientes && Array.isArray(clientesResp.clientes)) clientes = clientesResp.clientes;
        else if (clientesResp.data && Array.isArray(clientesResp.data)) clientes = clientesResp.data;
        else clientes = [];

        let profs = [];
        if (!profsResp) profs = [];
        else if (Array.isArray(profsResp)) profs = profsResp;
        else if (profsResp.profissionais && Array.isArray(profsResp.profissionais)) profs = profsResp.profissionais;
        else if (profsResp.data && Array.isArray(profsResp.data)) profs = profsResp.data;
        else profs = [];

        const matchesCliente = (clientes || []).some(c => {
            if (!c) return false;
            if (fornecedor.cnpj && c.cnpj && String(c.cnpj).trim() === String(fornecedor.cnpj).trim()) return true;
            if (fornecedor.cpf && c.cpf && String(c.cpf).trim() === String(fornecedor.cpf).trim()) return true;
            if (fornecedor.email && c.email && String(c.email).trim().toLowerCase() === String(fornecedor.email).trim().toLowerCase()) return true;
            if (fornecedor.nome && c.nome && String(c.nome).trim().toLowerCase() === String(fornecedor.nome).trim().toLowerCase()) return true;
            return false;
        });

        const matchesProf = (profs || []).some(p => {
            if (!p) return false;
            if (fornecedor.cpf && p.cpf && String(p.cpf).trim() === String(fornecedor.cpf).trim()) return true;
            if (fornecedor.cnpj && p.cnpj && String(p.cnpj).trim() === String(fornecedor.cnpj).trim()) return true;
            if (fornecedor.email && p.email && String(p.email).trim().toLowerCase() === String(fornecedor.email).trim().toLowerCase()) return true;
            if (fornecedor.nome && p.nome && String(p.nome).trim().toLowerCase() === String(fornecedor.nome).trim().toLowerCase()) return true;
            return false;
        });

        currentFornecedorIsCliente = !!matchesCliente;
        currentFornecedorIsProfissional = !!matchesProf;
    } catch (e) {
        console.warn('Erro ao verificar se fornecedor já existe como cliente/profissional', e);
    }
}

// Funções auxiliares de formatação (duplicadas localmente para evitar dependência de outros scripts)
function formatarCEP(cep) {
    if (!cep) return '';
    const cleaned = ('' + cep).replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

function formatarTelefone(telefone) {
    if (!telefone) return '';
    const cleaned = ('' + telefone).replace(/\D/g, '');
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return telefone;
}

// Função para configurar event listeners do perfil
function configurarEventListenersPerfil() {
    // Botão Editar
    const btnEditar = document.getElementById('btnEditarPerfil');
    if (btnEditar) {
        btnEditar.addEventListener('click', function() {
            const id = obterIdFornecedorDaUrl();
            if (id) {
                window.location.href = `adicionar-fornecedor.html?id=${id}`;
            } else {
                if (typeof window.localShowToast === 'function') window.localShowToast('ID do fornecedor inválido.', 'error');
            }
        });
    }

    // Botão Ativo - abre popover com opção de Inativar/Ativar
    const btnAtivo = document.getElementById('btnAtivoPerfil');
    if (btnAtivo) {
        btnAtivo.addEventListener('click', function(e) {
            e.stopPropagation();
            // fechar qualquer popover existente
            const existing = document.querySelector('.ativo-popover');
            if (existing) { existing.remove(); }

            const fornecedorId = obterIdFornecedorDaUrl();
            if (!fornecedorId) return;

            // criar popover
            const pop = document.createElement('div');
            pop.className = 'ativo-popover';

            // determinar texto/ação conforme atual status
            const isAtivo = document.getElementById('fornecedorAtivo')?.textContent.trim() === 'Sim';
            const actionText = isAtivo ? 'Inativar' : 'Ativar';
            pop.innerHTML = `
                <div class="ativo-popover-item" data-action="toggle">
                    <i class="fas ${isAtivo ? 'fa-times text-danger' : 'fa-check text-success'}"></i>
                    <span>${actionText}</span>
                </div>
            `;

            document.body.appendChild(pop);

            // posicionar abaixo do botão
            try {
                const rect = btnAtivo.getBoundingClientRect();
                pop.style.position = 'absolute';
                pop.style.left = (rect.left + window.pageXOffset) + 'px';
                pop.style.top = (rect.bottom + window.pageYOffset + 6) + 'px';
                pop.style.zIndex = 12060;
            } catch (err) { /* silencioso */ }

            // clique na opção
            pop.querySelector('[data-action="toggle"]').addEventListener('click', async function(ev){
                ev.stopPropagation();
                // chamar API para alternar
                try {
                    const novoStatus = !isAtivo;
                    if (typeof ApiClient !== 'undefined' && typeof ApiClient.atualizarFornecedor === 'function') {
                        await ApiClient.atualizarFornecedor(fornecedorId, { ativo: novoStatus });
                    }

                    // atualizar UI local
                    document.getElementById('fornecedorAtivo').textContent = novoStatus ? 'Sim' : 'Não';
                    if (novoStatus) {
                        btnAtivo.style.backgroundColor = '#4CAF50';
                        btnAtivo.innerHTML = '<i class="fas fa-check"></i> Ativo <i class="fas fa-chevron-down"></i>';
                    } else {
                        btnAtivo.style.backgroundColor = '#f44336';
                        btnAtivo.innerHTML = '<i class="fas fa-times"></i> Inativo <i class="fas fa-chevron-down"></i>';
                    }

                    if (typeof window.localShowToast === 'function') {
                        window.localShowToast(`Fornecedor ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`, 'success');
                    }

                    // notificar outras páginas abertas (como lista) sobre a mudança
                    try {
                        const evt = new CustomEvent('fornecedorStatusChanged', { detail: { id: fornecedorId, ativo: novoStatus } });
                        window.dispatchEvent(evt);
                    } catch (e) { /* silencioso */ }

                } catch (err) {
                    console.error('Erro ao alterar status do fornecedor:', err);
                    if (typeof window.localShowToast === 'function') window.localShowToast('Erro ao alterar status.', 'error');
                } finally {
                    pop.remove();
                }
            });

            // fechar ao clicar fora
            setTimeout(()=>{
                const outHandler = function(ev){
                    if (!pop.contains(ev.target) && ev.target !== btnAtivo) { pop.remove(); document.removeEventListener('click', outHandler); }
                };
                document.addEventListener('click', outHandler);
            }, 10);
        });
    }

    // Botão Mais (...)
    const btnMais = document.getElementById('btnMaisPerfil');
    if (btnMais) {
        btnMais.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Se o menu já existe, remove (toggle)
            const existing = document.querySelector('.ctx-menu-perfil');
            if (existing) {
                existing.remove();
                return;
            }
            
            // Criar menu contextual dinamicamente (ocultar opções já salvas)
            const menu = document.createElement('div');
            menu.className = 'ctx-menu-perfil';

            // helper para construir itens
            function criarItem(action, iconClass, label) {
                return `<div class="ctx-item" data-action="${action}">` +
                       `<i class="fas ${iconClass}"></i><span>${label}</span></div>`;
            }

            // sempre: emitir e excluir (excluir pode ser removido conforme permissões)
            let html = '';
            html += criarItem('emitir','fa-file-invoice','Emitir Recibo');
            html += `<div class="ctx-item ctx-item-excluir" data-action="excluir"><i class="fas fa-trash"></i><span>Excluir</span></div>`;

            html += '<div class="ctx-divider"></div>';
            html += '<div class="ctx-label">Salvar como:</div>';

            // construir opções "Salvar como" dependendo se já existem
            const opcClienteDisponivel = !currentFornecedorIsCliente;
            const opcProfDisponivel = !currentFornecedorIsProfissional;

            if (opcClienteDisponivel) html += criarItem('salvar-cliente','fa-user','Cliente');
            if (opcProfDisponivel) html += criarItem('salvar-profissional','fa-id-badge','Profissional');
            // opção para salvar nos dois, apenas se pelo menos uma estiver disponível
            if (opcClienteDisponivel || opcProfDisponivel) html += criarItem('salvar-ambos','fa-users','Salvar em ambos');

            // se nenhuma opção disponível, mostrar texto
            if (!opcClienteDisponivel && !opcProfDisponivel) {
                html += `<div class="ctx-note" style="padding:8px 12px;color:#666">Já cadastrado como Cliente e Profissional</div>`;
            }

            menu.innerHTML = html;
            
            document.body.appendChild(menu);
            
            // Posicionar abaixo do botão
            const rect = btnMais.getBoundingClientRect();
            menu.style.position = 'absolute';
            menu.style.left = (rect.left + window.pageXOffset) + 'px';
            menu.style.top = (rect.bottom + window.pageYOffset + 4) + 'px';
            
            // Handlers das opções
            menu.querySelectorAll('.ctx-item').forEach(function(item) {
                item.addEventListener('click', async function(ev) {
                    ev.stopPropagation();
                    const action = item.getAttribute('data-action');
                    const fornecedorId = obterIdFornecedorDaUrl();
                    
                    if (!fornecedorId) {
                        if (typeof window.localShowToast === 'function') {
                            window.localShowToast('ID do fornecedor inválido.', 'error');
                        }
                        menu.remove();
                        return;
                    }
                    
                    if (action === 'emitir') {
                        // abrir modal de emissão de recibo
                        const fornecedorNome = (document.getElementById('fornecedorNome')||{}).textContent || '';
                        showReciboModal(fornecedorNome);
                    } else if (action === 'excluir') {
                        const confirmMessage = 'Deseja realmente excluir este fornecedor? Esta ação não pode ser desfeita.';

                        const doDelete = async () => {
                            try {
                                if (typeof ApiClient !== 'undefined' && typeof ApiClient.deletarFornecedor === 'function') {
                                    await ApiClient.deletarFornecedor(fornecedorId);
                                    if (typeof window.localShowToast === 'function') {
                                        window.localShowToast('Fornecedor excluído com sucesso.', 'success');
                                    }
                                    window.location.href = 'fornecedor.html';
                                    return;
                                } else {
                                    if (typeof window.localShowToast === 'function') {
                                        window.localShowToast('Função de exclusão não disponível.', 'error');
                                    }
                                }
                            } catch (err) {
                                console.error('Erro ao excluir fornecedor:', err);
                                if (typeof window.localShowToast === 'function') {
                                    window.localShowToast('Erro ao excluir fornecedor.', 'error');
                                }
                            }
                        };

                        // fechar menu antes de abrir modal
                        menu.remove();

                        if (typeof showSystemConfirm === 'function') {
                            showSystemConfirm(confirmMessage, doDelete);
                        } else {
                            // fallback modal estilizado
                            const existing = document.querySelector('.sys-confirm-overlay'); if (existing) existing.remove();
                            const overlay = document.createElement('div');
                            overlay.className = 'sys-confirm-overlay';
                            overlay.style.position = 'fixed'; overlay.style.inset = '0'; overlay.style.background = 'rgba(0,0,0,0.36)'; overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = '16000';

                            const modal = document.createElement('div');
                            modal.className = 'sys-confirm-modal';
                            modal.style.background = '#fff'; modal.style.padding = '18px 20px'; modal.style.borderRadius = '10px'; modal.style.boxShadow = '0 10px 30px rgba(2,16,26,0.18)'; modal.style.maxWidth = '520px'; modal.style.width = '100%';

                            const title = document.createElement('div');
                            title.textContent = 'Confirmar exclusão';
                            title.style.fontWeight = '600'; title.style.marginBottom = '8px'; title.style.fontSize = '16px';

                            const msg = document.createElement('div');
                            msg.textContent = confirmMessage; msg.style.marginBottom = '16px'; msg.style.color = '#222'; msg.style.fontSize = '14px';

                            const actions = document.createElement('div');
                            actions.style.display = 'flex'; actions.style.justifyContent = 'flex-end'; actions.style.gap = '10px';

                            const btnCancel = document.createElement('button');
                            btnCancel.textContent = 'Cancelar';
                            btnCancel.style.padding = '8px 14px'; btnCancel.style.borderRadius = '8px'; btnCancel.style.border = '1px solid #e5e7eb'; btnCancel.style.background = '#fff'; btnCancel.style.color = '#111'; btnCancel.style.cursor = 'pointer';
                            btnCancel.addEventListener('click', function(){ overlay.remove(); });

                            const btnOk = document.createElement('button');
                            btnOk.textContent = 'Sim';
                            btnOk.style.padding = '8px 14px'; btnOk.style.borderRadius = '8px'; btnOk.style.border = 'none'; btnOk.style.background = '#8b2d3a'; btnOk.style.color = '#fff'; btnOk.style.cursor = 'pointer';
                            btnOk.addEventListener('click', function(){ try{ doDelete(); } finally { overlay.remove(); } });

                            actions.appendChild(btnCancel); actions.appendChild(btnOk);
                            modal.appendChild(title); modal.appendChild(msg); modal.appendChild(actions); overlay.appendChild(modal);
                            document.body.appendChild(overlay);
                            setTimeout(()=>{ btnOk.focus(); }, 60);
                        }
                        return;
                    } else if (action === 'salvar-cliente' || action === 'salvar-profissional' || action === 'salvar-ambos') {
                        // construir payload básico mapeando campos comuns
                        function payloadFromFornecedor(f) {
                            if (!f) return {};
                            return {
                                nome: f.nome || '',
                                telefone: f.telefone || '',
                                email: f.email && String(f.email).trim() ? f.email : null,
                                cnpj: f.cnpj && String(f.cnpj).trim() ? f.cnpj : null,
                                cpf: f.cpf && String(f.cpf).trim() ? f.cpf : null,
                                razaoSocial: f.razaoSocial || f.razao_social || '',
                                endereco: f.endereco || '',
                                numero: f.numero || '',
                                complemento: f.complemento || '',
                                bairro: f.bairro || '',
                                cep: f.cep || '',
                                cidade: f.cidade || ''
                            };
                        }

                        const fornecedorObj = currentFornecedor || (await (ApiClient.getFornecedor ? ApiClient.getFornecedor(fornecedorId).catch(()=>null) : Promise.resolve(null)));
                        if (!fornecedorObj) {
                            if (typeof window.localShowToast === 'function') window.localShowToast('Dados do fornecedor indisponíveis.', 'error');
                            menu.remove();
                            return;
                        }

                        // garantir um código único obrigatório para profissionais
                        const payload = payloadFromFornecedor(fornecedorObj);
                        if (!payload.codigo) payload.codigo = String(Date.now());

                        const doSaveCliente = async () => {
                            if (!ApiClient || typeof ApiClient.criarCliente !== 'function') throw new Error('ApiClient.criarCliente indisponível');
                            return await ApiClient.criarCliente(payload);
                        };

                        const doSaveProf = async () => {
                            if (!ApiClient || typeof ApiClient.criarProfissional !== 'function') throw new Error('ApiClient.criarProfissional indisponível');
                            return await ApiClient.criarProfissional(payload);
                        };

                        try {
                            if (action === 'salvar-cliente') {
                                const res = await doSaveCliente();
                                // marcar imediatamente e depois validar com backend
                                currentFornecedorIsCliente = true;
                                await verificarSeJaSalvo(fornecedorObj).catch(()=>{});
                                if (typeof window.localShowToast === 'function') window.localShowToast('Fornecedor salvo como Cliente.', 'success');
                            } else if (action === 'salvar-profissional') {
                                const res = await doSaveProf();
                                currentFornecedorIsProfissional = true;
                                await verificarSeJaSalvo(fornecedorObj).catch(()=>{});
                                if (typeof window.localShowToast === 'function') window.localShowToast('Fornecedor salvo como Profissional.', 'success');
                            } else if (action === 'salvar-ambos') {
                                // salvar ambos (executar em paralelo)
                                await Promise.all([doSaveCliente().catch(e=>{throw e}), doSaveProf().catch(e=>{throw e})]);
                                currentFornecedorIsCliente = true;
                                currentFornecedorIsProfissional = true;
                                await verificarSeJaSalvo(fornecedorObj).catch(()=>{});
                                if (typeof window.localShowToast === 'function') window.localShowToast('Fornecedor salvo como Cliente e Profissional.', 'success');
                            }

                            // notificar outras partes do sistema (caso listas precisem atualizar)
                            try { window.dispatchEvent(new CustomEvent('fornecedorTransformado', { detail: { id: fornecedorId } })); } catch(e){}
                        } catch (err) {
                            console.error('Erro ao salvar como cliente/profissional', err);
                            const msg = (err && err.message) ? err.message : 'Erro ao salvar no banco.';
                            if (typeof window.localShowToast === 'function') window.localShowToast(msg, 'error');
                        }
                    }
                    
                    menu.remove();
                });
            });
            
            // Fechar ao clicar fora
            setTimeout(function() {
                const clickOutside = function(ev) {
                    if (!menu.contains(ev.target) && ev.target !== btnMais) {
                        menu.remove();
                        document.removeEventListener('click', clickOutside);
                    }
                };
                document.addEventListener('click', clickOutside);
            }, 10);
        });
    }

    // Botão Voltar
    const btnVoltar = document.getElementById('btnVoltarLista');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function() {
            window.location.href = 'fornecedor.html';
        });
    }
}

    // Mostrar modal de emissão de recibo
    function showReciboModal(fornecedorNome){
        // criar overlay
        const overlay = document.createElement('div');
        overlay.className = 'recibo-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'recibo-modal';
        modal.innerHTML = `
            <div class="recibo-header">
                <div class="recibo-title">Emissão de Recibo de Pagamento</div>
                <button class="recibo-close">Fechar</button>
            </div>
            <div class="recibo-body">
                <div class="recibo-field">
                    <label>Fornecedor</label>
                    <div class="recibo-readonly" id="reciboFornecedor">${fornecedorNome}</div>
                </div>
                <div class="recibo-field">
                    <label>Valor <span style="color:#d32f2f">*</span></label>
                    <input type="number" id="reciboValor" step="0.01" placeholder="0.00" />
                </div>
                <div class="recibo-field">
                    <label>Referente <span style="color:#d32f2f">*</span></label>
                    <textarea id="reciboReferente">à prestação de serviços ou venda de produtos</textarea>
                </div>
            </div>
            <div class="recibo-footer">
                <button class="btn-recibo-fechar">Fechar</button>
                <button class="btn-recibo-visualizar">Visualizar</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // handlers
        const closeButtons = overlay.querySelectorAll('.recibo-close, .btn-recibo-fechar');
        closeButtons.forEach(btn=>btn.addEventListener('click', ()=>{ overlay.remove(); }));

        overlay.addEventListener('click', function(ev){ if (ev.target === overlay) overlay.remove(); });

        const btnVisualizar = overlay.querySelector('.btn-recibo-visualizar');
        btnVisualizar.addEventListener('click', function(){
            const valorEl = document.getElementById('reciboValor');
            const referenteEl = document.getElementById('reciboReferente');
            const valor = valorEl && valorEl.value ? valorEl.value.trim() : '';
            const referente = referenteEl && referenteEl.value ? referenteEl.value.trim() : '';
            if (!valor || !referente) {
                if (typeof window.localShowToast === 'function') window.localShowToast('Preencha Valor e Referente', 'error');
                return;
            }
            // fechar o modal de entrada antes de gerar/abrir o PDF para evitar sobreposição
            try { overlay.remove(); } catch(e){}
            // gerar PDF do recibo e abrir no visualizador interno
            generateAndOpenReciboPdf({ fornecedorNome, valor, referente }).catch(err => {
                console.error('Erro ao gerar recibo PDF', err);
                if (typeof window.localShowToast === 'function') window.localShowToast('Erro ao gerar PDF', 'error');
            });
        });
    }

// Inicializar perfil do fornecedor
function inicializarPerfilFornecedor() {
    carregarDadosFornecedor();
    configurarEventListenersPerfil();
}

// helper: carregar script externo (promise)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Erro ao carregar ' + src));
        document.head.appendChild(s);
    });
}

// converter número para palavras (simples, até centenas de milhares)
function numeroPorExtensoBR(n) {
    const unidades = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
    const dezenas = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
    const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];

    n = Math.floor(Number(n));
    if (isNaN(n)) return '';
    if (n < 20) return unidades[n];
    if (n < 100) {
        const d = Math.floor(n/10);
        const r = n%10;
        return dezenas[d] + (r ? ' e ' + unidades[r] : '');
    }
    if (n === 100) return 'cem';
    if (n < 1000) {
        const c = Math.floor(n/100);
        const r = n%100;
        return centenas[c] + (r ? ' e ' + numeroPorExtensoBR(r) : '');
    }
    if (n < 1000000) {
        const milhares = Math.floor(n/1000);
        const resto = n%1000;
        const milharesTxt = (milhares === 1) ? 'mil' : numeroPorExtensoBR(milhares) + ' mil';
        return milharesTxt + (resto ? (resto < 100 ? ' e ' : ', ') + numeroPorExtensoBR(resto) : '');
    }
    return String(n);
}

// Gera o PDF do recibo e abre em nova aba
async function generateAndOpenReciboPdf({ fornecedorNome, valor, referente }){
    // carregar jsPDF se necessário
    if (!window.jspdf || !window.jspdf.jsPDF) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }
    const { jsPDF } = window.jspdf;

    // obter dados da empresa (usar primeira empresa cadastrada)
    let empresa = null;
    try { const empresas = await ApiClient.getEmpresas(); empresa = Array.isArray(empresas) ? empresas[0] : empresas; } catch(e){ console.warn('Não foi possível obter dados da empresa', e); }

    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // margem e caixa do recibo
    const margin = 28;
    const boxW = pageW - margin*2;
    // aumentar altura do box para dar mais espaço ao texto e à assinatura
    const boxH = 220;
    doc.setLineWidth(1);
    doc.rect(margin, 40, boxW, boxH);

    // topo: título central e data no canto
    doc.setFontSize(20); doc.setFont('helvetica','bold');
    doc.text('RECIBO', pageW/2, 72, { align: 'center' });
    doc.setFontSize(14); doc.setFont('helvetica','normal');
    const razao = empresa?.razaoSocial || (empresa?.nome || '');
    // deixar um padding maior entre a razão social e o texto principal
    doc.text(razao, pageW/2, 96, { align: 'center' });
    // data canto direito
    const nowStr = new Date().toLocaleString();
    const sideGutter = 16; // distância da margem para conteúdo à esquerda
    const rightGutter = 12; // distância do conteúdo até a borda direita da caixa
    doc.setFontSize(10); doc.text('Data: ' + nowStr, margin + boxW - rightGutter, 54, { align: 'right' });

    // preparar logo (aceita dataURL, caminho relativo ou objeto com base64)
    async function blobToDataURL(blob) {
        return await new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            } catch (e) { reject(e); }
        });
    }

    let logoDataUrl = null;
    if (empresa && empresa.logo) {
        try {
            if (typeof empresa.logo === 'string') {
                if (empresa.logo.indexOf('data:') === 0) {
                    logoDataUrl = empresa.logo;
                } else if (/^[A-Za-z0-9+/=\s]+$/.test(empresa.logo)) {
                    // base64 puro
                    logoDataUrl = 'data:image/png;base64,' + empresa.logo.replace(/\s+/g, '');
                } else {
                    // tentar buscar como caminho relativo/absoluto ou URL completa
                    try {
                        let pathCandidate = empresa.logo;
                        // se for apenas nome de arquivo, presumir diretório /uploads/
                        if (!pathCandidate.startsWith('http') && !pathCandidate.startsWith('/') && pathCandidate.indexOf('/') === -1) {
                            pathCandidate = '/uploads/' + pathCandidate;
                        }
                        const fullUrl = pathCandidate.startsWith('http') ? pathCandidate : new URL(pathCandidate, window.location.origin).href;
                        const resp = await fetch(fullUrl);
                        if (resp.ok) {
                            const blob = await resp.blob();
                            logoDataUrl = await blobToDataURL(blob);
                        }
                    } catch(e) { /* falha ao buscar remoto */ }
                }
            } else if (typeof empresa.logo === 'object') {
                // tentativas anteriores podem ter convertido alguns campos
                if (empresa.logo.dataUrl) logoDataUrl = empresa.logo.dataUrl;
                else if (empresa.logo.src) logoDataUrl = empresa.logo.src;
                else if (empresa.logo.base64) logoDataUrl = 'data:image/png;base64,' + String(empresa.logo.base64).replace(/\s+/g, '');
            }
        } catch(e) { console.warn('Erro ao resolver logo da empresa:', e); }
    }

    // logo à esquerda (se disponível) - desenhar preservando proporção
    let logoDrawHeight = 70;
    let logoDrawWidth = 70;
    if (logoDataUrl) {
        try {
            const img = new Image();
            const imgLoaded = await new Promise((resolve, reject) => {
                img.onload = () => resolve(true);
                img.onerror = () => reject(new Error('Erro ao carregar imagem da logo'));
                img.src = logoDataUrl;
            });
            const nw = img.naturalWidth || img.width || 70;
            const nh = img.naturalHeight || img.height || 70;
            const maxW = 60; // reduzir um pouco para evitar alongamento
            const maxH = 60;
            const scale = Math.min(maxW / nw, maxH / nh, 1);
            logoDrawWidth = Math.round(nw * scale);
            logoDrawHeight = Math.round(nh * scale);
            doc.addImage(logoDataUrl, 'PNG', margin + sideGutter, 60, logoDrawWidth, logoDrawHeight);
        } catch(e){
            console.warn('Erro ao inserir logo no PDF', e);
        }
    }

    // informações da empresa na coluna esquerda (endereço, CNPJ/CPF, telefone)
    try {
        const infoX = margin + sideGutter;
        const logoY = 60;
        const paddingLogoInfo = 16; // espaço entre logo e informações
        const afterLogoY = logoY + (logoDrawHeight || 70) + paddingLogoInfo; // espaço abaixo da logo ajustado pela altura real

        function toStringField(v) {
            if (v == null) return '';
            if (typeof v === 'string') return v.trim();
            if (typeof v === 'number') return String(v);
            if (Array.isArray(v)) return v.map(s => toStringField(s)).filter(Boolean).join(' • ');
            if (typeof v === 'object') {
                // tentar campos comuns
                return [v.rua, v.logradouro, v.endereco, v.text, v.value, v.numero, v.numeroEndereco, v.descricao]
                    .map(toStringField).filter(Boolean).join(' ');
            }
            return String(v);
        }

        // tentar resolver logo quando for objeto
        if (empresa && empresa.logo && typeof empresa.logo === 'object') {
            const obj = empresa.logo;
            const candidate = obj.dataUrl || obj.dataURL || obj.src || obj.url || obj.base64 || obj.content || obj.value;
            if (candidate) {
                if (candidate.indexOf && candidate.indexOf('data:') === 0) {
                    empresa.logo = candidate;
                } else if (/^[A-Za-z0-9+/=\n]+$/.test(candidate)) {
                    // base64 puro
                    empresa.logo = 'data:image/png;base64,' + candidate.replace(/\s+/g, '');
                } else if (candidate.startsWith('/')) {
                    empresa.logo = candidate; // relative path
                }
            }
        }

        const enderecoRaw = toStringField(empresa?.endereco || empresa?.rua || empresa?.logradouro || '');
        const numero = toStringField(empresa?.numero || empresa?.numeroEndereco || '');
        const complemento = toStringField(empresa?.complemento || '');
        const bairro = toStringField(empresa?.bairro || '');
        const cidade = toStringField(empresa?.cidade || '');
        const cep = toStringField(empresa?.cep || '');

        const enderecoParts = [enderecoRaw, numero, complemento, bairro].filter(Boolean);
        const cidadeParts = [cidade, cep].filter(Boolean);
        const enderecoLinha = enderecoParts.join(' ').trim() + (cidadeParts.length ? (' • ' + cidadeParts.join(' ')) : '');

        const cnpj = toStringField(empresa?.cnpj || empresa?.cpf || empresa?.cnpjCpf || '');
        const telefoneEmpresa = toStringField(empresa?.telefone || empresa?.telefone1 || empresa?.telefones || '');

        doc.setFontSize(10);
        const infoMaxW = 140;
        let curY = afterLogoY;
        if (enderecoLinha) {
            const lines = doc.splitTextToSize(enderecoLinha, infoMaxW);
            doc.text(lines, infoX, curY);
            curY += (lines.length * 14);
        }
        if (cnpj) {
            doc.text(String(cnpj), infoX, curY + 8);
            curY += 16;
        }
        if (telefoneEmpresa) {
            doc.text(formatarTelefone(String(telefoneEmpresa)), infoX, curY + 8);
            curY += 16;
        }
    } catch(e) {
        console.warn('Erro ao desenhar informações da empresa no recibo:', e);
    }

    // texto principal (centro)
    const valorNum = Number(valor);
    const valorFmt = valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const inteiro = Math.floor(valorNum);
    const porExtenso = numeroPorExtensoBR(inteiro);
    const texto = `Efetuamos o pagamento a(o) ${fornecedorNome} a quantia de ${valorFmt} ( ${porExtenso} reais ) referente a ${referente}`;

    doc.setFontSize(12);
    // calcular largura da coluna esquerda (logo + informações) para evitar sobreposição
    const leftColWidth = Math.max((logoDrawWidth || 70) + 24, 160); // garantir espaço mínimo
    const textX = margin + leftColWidth;
    // subir o texto um pouco para dar mais separação (usar maior Y que razão)
    const textY = 120;
    const maxW = boxW - leftColWidth - 40;
    doc.text(doc.splitTextToSize(texto, maxW), textX, textY);

    // assinatura à direita
    // posicionar assinatura mais abaixo para afastar do parágrafo (baseado na altura da caixa)
    const signatureOffsetFromBottom = 36; // px acima da borda inferior da caixa
    const assinY = 40 + boxH - signatureOffsetFromBottom;
    const assinX = margin + boxW - 220;
    doc.setLineWidth(0.5);
    doc.line(assinX, assinY, assinX + 180, assinY);
    doc.setFontSize(11); doc.text('Assinatura', assinX + 70, assinY + 16);

    // gerar blob e abrir
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    openPdfModalInPlace(url, 'Recibo de Pagamento');
    return true;
}

// Abre modal com visualizador PDF (mesmo estilo usado em relatórios)
function openPdfModalInPlace(blobUrl, title) {
    const existing = document.getElementById('pdfModalOverlayPerfil');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pdfModalOverlayPerfil';
    overlay.style.position = 'fixed';
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = 12060;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const modal = document.createElement('div');
    modal.style.width = '90%';
    modal.style.height = '90%';
    modal.style.maxWidth = '1100px';
    modal.style.background = '#fff';
    modal.style.borderRadius = '6px';
    modal.style.overflow = 'hidden';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';

    const header = document.createElement('div');
    header.style.padding = '10px 12px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.background = '#f6f6f6';

    const titleEl = document.createElement('div');
    titleEl.textContent = title || 'Relatório';
    titleEl.style.fontWeight = '600';

    const actions = document.createElement('div');

    const openNewBtn = document.createElement('button');
    openNewBtn.className = 'btn';
    openNewBtn.textContent = 'Ver em uma nova aba';
    openNewBtn.addEventListener('click', function(){ window.open(blobUrl, '_blank'); });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Fechar';
    closeBtn.addEventListener('click', function(){ overlay.remove(); URL.revokeObjectURL(blobUrl); });

    actions.appendChild(openNewBtn);
    actions.appendChild(closeBtn);

    header.appendChild(titleEl);
    header.appendChild(actions);

    const obj = document.createElement('object');
    obj.type = 'application/pdf';
    obj.data = blobUrl;
    obj.style.width = '100%';
    obj.style.height = '100%';
    obj.style.border = 'none';

    modal.appendChild(header);
    modal.appendChild(obj);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// Aguardar o carregamento da página
window.addEventListener('DOMContentLoaded', function() {
    inicializarPerfilFornecedor();
});
