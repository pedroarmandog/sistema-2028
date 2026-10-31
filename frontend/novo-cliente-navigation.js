// Navigation script específico para novo-cliente.html
console.log('🚀 novo-cliente-navigation.js carregado');

// Variável para controlar se o formulário foi modificado
let formModified = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOMContentLoaded disparado em novo-cliente-navigation.js');
    
    // Inicializar navegação dos submenus
    initializeSubmenuNavigation();
    
    // Configurar detectores de mudança no formulário
    setupFormChangeDetection();
    
    // Configurar confirmação antes de sair
    setupNavigationConfirmation();
    
    // Configurar menu toggle
    setupMenuToggle();
});

// Função para inicializar a navegação dos submenus
function initializeSubmenuNavigation() {
    console.log('🔧 Inicializando navegação dos submenus...');
    
    // Configurar cada submenu
    const submenus = [
        { menuId: 'clienteMenuItem', submenuId: 'clienteSubmenu' },
        { menuId: 'petMenuItem', submenuId: 'petSubmenu' },
        { menuId: 'atendimentoMenuItem', submenuId: 'atendimentoSubmenu' },
        { menuId: 'comprasMenuItem', submenuId: 'comprasSubmenu' },
        { menuId: 'financeiroMenuItem', submenuId: 'financeiroSubmenu' },
        { menuId: 'configuracaoMenuItem', submenuId: 'configuracaoSubmenu' }
    ];
    
    submenus.forEach(({ menuId, submenuId }) => {
        setupSubmenu(menuId, submenuId);
    });
}

// Função para configurar um submenu específico
function setupSubmenu(menuId, submenuId) {
    const menuItem = document.getElementById(menuId);
    const submenu = document.getElementById(submenuId);
    const menuContainer = menuItem?.parentElement;
    
    if (menuItem && submenu && menuContainer) {
        // Adicionar event listener para o item do menu principal
        menuItem.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`🖱️ Clique detectado no menu: ${menuId}`);
            
            // Verificar se o clique foi em um submenu-item
            if (e.target.closest('.submenu-item')) {
                return;
            }
            
            // Fechar outros submenus
            closeOtherSubmenus(menuContainer);
            
            // Toggle do submenu atual
            const isOpen = menuContainer.classList.contains('open');
            menuContainer.classList.toggle('open');
            submenu.classList.toggle('open');
            
            console.log(`📂 Submenu ${submenuId} ${isOpen ? 'fechado' : 'aberto'}`);
        });
        
        // Configurar itens do submenu para confirmação de navegação
        const submenuItems = submenu.querySelectorAll('.submenu-item[href]');
        submenuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Se href é vazio ou # ou javascript:void(0), não fazer nada
                if (!href || href === '#' || href === 'javascript:void(0)') {
                    e.preventDefault();
                    return;
                }
                
                // Se o formulário foi modificado, mostrar confirmação
                if (formModified) {
                    e.preventDefault();
                    showNavigationConfirmation(() => {
                        window.location.href = href;
                    });
                } else {
                    // Permitir navegação normal
                    console.log(`🔗 Navegando para: ${href}`);
                }
            });
        });
        
        console.log(`✅ Submenu configurado: ${menuId} -> ${submenuId}`);
    } else {
        console.warn(`⚠️ Elementos não encontrados para submenu: ${menuId} / ${submenuId}`);
    }
}

// Função para fechar outros submenus
function closeOtherSubmenus(currentContainer) {
    const allSubmenuContainers = document.querySelectorAll('.nav-item-with-submenu');
    
    allSubmenuContainers.forEach(container => {
        if (container !== currentContainer && container.classList.contains('open')) {
            const submenu = container.querySelector('.submenu');
            container.classList.remove('open');
            if (submenu) {
                submenu.classList.remove('open');
            }
        }
    });
}

// Função para detectar mudanças no formulário
function setupFormChangeDetection() {
    console.log('🔍 Configurando detecção de mudanças no formulário...');
    
    const form = document.getElementById('novoClienteForm');
    if (!form) {
        console.warn('⚠️ Formulário não encontrado!');
        return;
    }
    
    // Marcar como não modificado inicialmente
    formModified = false;
    
    // Detectar mudanças em campos de input
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            formModified = true;
            console.log('📝 Formulário modificado detectado');
        });
        
        input.addEventListener('change', () => {
            formModified = true;
            console.log('📝 Formulário modificado detectado (change)');
        });
    });
    
    // Resetar flag quando o formulário for submetido
    form.addEventListener('submit', () => {
        formModified = false;
        console.log('💾 Formulário submetido - flag resetada');
    });
    
    console.log(`✅ Detecção configurada para ${inputs.length} campos`);
}

// Função para configurar confirmação de navegação
function setupNavigationConfirmation() {
    console.log('🛡️ Configurando confirmação de navegação...');
    
    // Interceptar navegação por links externos (fora dos submenus)
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        
        if (link && !link.closest('.submenu') && formModified) {
            const href = link.getAttribute('href');
            
            // Ignorar links internos ou vazios
            if (!href || href === '#' || href === 'javascript:void(0)' || href.startsWith('#')) {
                return;
            }
            
            e.preventDefault();
            showNavigationConfirmation(() => {
                window.location.href = href;
            });
        }
    });
    
    // Antes havia um handler 'beforeunload' que mostrava o alerta nativo do navegador.
    // Mantemos apenas o modal customizado para confirmação de navegação (showNavigationConfirmation).
}

// Função para mostrar modal de confirmação
function showNavigationConfirmation(onConfirm) {
    console.log('⚠️ Mostrando confirmação de navegação');
    
    // Criar modal se não existir
    let modal = document.getElementById('navigationConfirmModal');
    if (!modal) {
        modal = createNavigationModal();
    }
    
    // Mostrar modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Configurar botões
    const confirmBtn = modal.querySelector('.confirm-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    
    // Limpar event listeners anteriores
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Adicionar novos event listeners
    newConfirmBtn.addEventListener('click', () => {
        console.log('✅ Navegação confirmada');
        hideNavigationModal();
        formModified = false; // Resetar flag
        if (onConfirm) onConfirm();
    });
    
    newCancelBtn.addEventListener('click', () => {
        console.log('❌ Navegação cancelada');
        hideNavigationModal();
    });
    
    // Fechar com ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            console.log('❌ Modal fechado com ESC');
            hideNavigationModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Fechar clicando fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('❌ Modal fechado clicando fora');
            hideNavigationModal();
        }
    });
}

// Função para criar o modal de confirmação
function createNavigationModal() {
    console.log('🏗️ Criando modal de confirmação...');
    
    const modal = document.createElement('div');
    modal.id = 'navigationConfirmModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 90%;
            text-align: center;
            position: relative;
        ">
            <div style="
                width: 60px;
                height: 60px;
                background: #ff6b6b;
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
            ">
                ⚠️
            </div>
            
            <h3 style="
                margin: 0 0 10px 0;
                color: #333;
                font-size: 20px;
                font-weight: 600;
            ">Tem certeza que deseja sair?</h3>
            
            <p style="
                margin: 0 0 25px 0;
                color: #666;
                font-size: 14px;
                line-height: 1.5;
            ">Os dados preenchidos no formulário serão perdidos.</p>
            
            <div style="
                display: flex;
                gap: 12px;
                justify-content: center;
            ">
                <button class="cancel-btn" style="
                    padding: 12px 24px;
                    border: 2px solid #ddd;
                    background: white;
                    color: #666;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-width: 80px;
                ">Cancelar</button>
                
                <button class="confirm-btn" style="
                    padding: 12px 24px;
                    border: none;
                    background: #ff6b6b;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-width: 80px;
                ">Sair</button>
            </div>
        </div>
    `;
    
    // Adicionar estilos de hover
    const style = document.createElement('style');
    style.textContent = `
        #navigationConfirmModal .cancel-btn:hover {
            border-color: #999 !important;
            color: #333 !important;
        }
        #navigationConfirmModal .confirm-btn:hover {
            background: #ff5252 !important;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    console.log('✅ Modal criado e adicionado ao DOM');
    
    return modal;
}

// Função para esconder o modal
function hideNavigationModal() {
    const modal = document.getElementById('navigationConfirmModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Função para configurar o menu toggle
function setupMenuToggle() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (menuToggle && sidebar && mainContent) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🍔 Menu toggle clicado!');
            
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
        });
        
        console.log('✅ Menu toggle configurado');
    }
}

// Função utilitária para resetar flag de modificação (pode ser chamada externamente)
window.resetFormModified = function() {
    formModified = false;
    console.log('🔄 Flag de formulário modificado resetada manualmente');
};

// Função utilitária para verificar se o formulário foi modificado
window.isFormModified = function() {
    return formModified;
};