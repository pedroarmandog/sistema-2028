class GruposClientesManager {
    constructor() {
        this.grupos = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredGrupos = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showContentLoading();
        this.loadGrupos();
        this.setupModal();
    }
    
    showContentLoading() {
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.classList.add('content-loading');
        }
    }
    
    hideContentLoading() {
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.classList.remove('content-loading');
        }
    }

    setupEventListeners() {
        // Busca
        const searchInput = document.getElementById('searchInput');
        // also support the in-page search input and button
        const pageSearchInput = document.querySelector('.search-input');
        const btnSearch = document.querySelector('.btn-search');

        // debounce helper to avoid too many renders while typing
        const debounce = (fn, wait = 220) => {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), wait);
            };
        };

        const onSearchChange = (value) => {
            // sync both inputs
            if (searchInput && document.activeElement !== searchInput) searchInput.value = value;
            if (pageSearchInput && document.activeElement !== pageSearchInput) pageSearchInput.value = value;
            this.filterGrupos(value);
        };

        if (searchInput) {
            searchInput.addEventListener('input', (e) => debounce(onSearchChange)(e.target.value));
        }

        if (pageSearchInput) {
            pageSearchInput.addEventListener('input', (e) => debounce(onSearchChange)(e.target.value));
        }

        if (btnSearch) {
            btnSearch.addEventListener('click', () => {
                const v = (searchInput && searchInput.value) || (pageSearchInput && pageSearchInput.value) || '';
                this.filterGrupos(v);
            });
        }

        // Novo grupo
        const btnNovoGrupo = document.getElementById('btnNovoGrupo');
        if (btnNovoGrupo) {
            btnNovoGrupo.addEventListener('click', () => {
                this.openModal();
            });
        }

        // Paginação
        const itemsPerPageSelect = document.getElementById('itemsPerPage');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderTable();
            });
        }

        // Botões de paginação
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('pagination-btn')) {
                const action = e.target.dataset.action;
                this.handlePagination(action);
            }
        });
    }

    setupModal() {
        // Botão fechar modal
        const btnCloseModal = document.getElementById('btnCloseModal');
        const btnCancelModal = document.getElementById('btnCancelModal');
        
        if (btnCloseModal) {
            btnCloseModal.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (btnCancelModal) {
            btnCancelModal.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Formulário do modal
        const modalForm = document.getElementById('modalForm');
        if (modalForm) {
            modalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveGrupo();
            });
        }

        // Fechar modal clicando fora
        const modal = document.getElementById('grupoModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    async loadGrupos() {
        console.log('📥 Carregando grupos de clientes...');
        
        try {
            // Carregar da API
            const grupos = await ApiClient.getGruposClientes();
            this.grupos = grupos;
            console.log('✅ Grupos carregados da API:', this.grupos.length);
            
            this.filteredGrupos = [...this.grupos];
            
            // Contar clientes por grupo
            await this.contarClientesPorGrupo();
            
            this.renderTable();
            this.hideContentLoading();
        } catch (error) {
            console.error('❌ Erro ao carregar grupos:', error);
            
            // Em caso de erro, mostrar mensagem
            this.grupos = [];
            this.filteredGrupos = [];
            this.renderTable();
            this.hideContentLoading();
            
            alert('Erro ao carregar grupos de clientes. Verifique a conexão com o servidor.');
        }
    }

    // Contar quantos clientes existem em cada grupo
    async contarClientesPorGrupo() {
        try {
            // Buscar dados dos clientes da API
            const data = await ApiClient.getClientes();
            const clientes = data.clientes || [];
            
            // Contar clientes por grupo
            this.grupos.forEach(grupo => {
                const clientesDoGrupo = clientes.filter(cliente => 
                    cliente.grupo_cliente === grupo.nome
                );
                grupo.quantidadeClientes = clientesDoGrupo.length;
            });
            
            console.log('📊 Contagem de clientes por grupo atualizada');
        } catch (error) {
            console.error('❌ Erro ao contar clientes por grupo:', error);
            // Manter valores padrão ou zerar
            this.grupos.forEach(grupo => {
                if (!grupo.quantidadeClientes) {
                    grupo.quantidadeClientes = 0;
                }
            });
        }
    }

    loadSampleData() {
        this.grupos = [
            {
                id: 1,
                nome: 'Banho (QUENTE)',
                descricao: 'Clientes que preferem banho com água quente',
                cor: '#FF6B6B',
                quantidadeClientes: 15,
                dataCriacao: '2024-01-15'
            },
            {
                id: 2,
                nome: 'Banho (FRIO)',
                descricao: 'Clientes que preferem banho com água fria',
                cor: '#4ECDC4',
                quantidadeClientes: 12,
                dataCriacao: '2024-02-01'
            },
            {
                id: 3,
                nome: 'Banho (MORNO)',
                descricao: 'Clientes que preferem banho com água morna',
                cor: '#FFD700',
                quantidadeClientes: 18,
                dataCriacao: '2024-01-10'
            },
            {
                id: 4,
                nome: 'Assinantes',
                descricao: 'Clientes com planos de assinatura mensais',
                cor: '#FFD700',
                quantidadeClientes: 8,
                dataCriacao: '2024-01-20'
            }
        ];
        this.filteredGrupos = [...this.grupos];
        this.renderTable();
        this.hideContentLoading();
    }

    filterGrupos(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredGrupos = [...this.grupos];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredGrupos = this.grupos.filter(grupo => 
                grupo.nome.toLowerCase().includes(term) ||
                grupo.descricao.toLowerCase().includes(term)
            );
        }
        
        this.currentPage = 1;
        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('gruposTableBody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentItems = this.filteredGrupos.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        if (currentItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center" style="padding: 40px;">
                        <i class="fas fa-search" style="font-size: 48px; color: #dee2e6; margin-bottom: 10px;"></i>
                        <p style="color: #6c757d; margin: 0;">Nenhum grupo encontrado</p>
                    </td>
                </tr>
            `;
            this.updatePagination();
            return;
        }

        currentItems.forEach(grupo => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 20px; height: 20px; background: ${grupo.cor}; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #dee2e6;"></div>
                        <div>
                            <strong>${grupo.nome}</strong>
                            <br>
                            <small style="color: #666;">${grupo.descricao}</small>
                        </div>
                    </div>
                </td>
                <td class="text-center" style="font-weight: bold; color: #007bff;">${grupo.quantidadeClientes || 0}</td>
                <td class="text-center">
                    <div class="actions-container">
                        <button class="btn-action btn-edit" onclick="gruposManager.editGrupo(${grupo.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="gruposManager.deleteGrupo(${grupo.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredGrupos.length / this.itemsPerPage);
        const paginationInfo = document.getElementById('paginationInfo');
        const paginationControls = document.getElementById('paginationControls');

        if (paginationInfo) {
            const startItem = this.filteredGrupos.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredGrupos.length);
            
            paginationInfo.innerHTML = `
                Mostrando ${startItem}-${endItem} de ${this.filteredGrupos.length} grupos
            `;
        }

        if (paginationControls) {
            paginationControls.innerHTML = `
                <button class="pagination-btn" data-action="first" ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="pagination-btn" data-action="prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-angle-left"></i>
                </button>
                <span style="padding: 8px 16px; color: #6c757d;">
                    ${this.currentPage} de ${totalPages || 1}
                </span>
                <button class="pagination-btn" data-action="next" ${this.currentPage >= totalPages ? 'disabled' : ''}>
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="pagination-btn" data-action="last" ${this.currentPage >= totalPages ? 'disabled' : ''}>
                    <i class="fas fa-angle-double-right"></i>
                </button>
            `;
        }
    }

    handlePagination(action) {
        const totalPages = Math.ceil(this.filteredGrupos.length / this.itemsPerPage);
        
        switch (action) {
            case 'first':
                this.currentPage = 1;
                break;
            case 'prev':
                if (this.currentPage > 1) this.currentPage--;
                break;
            case 'next':
                if (this.currentPage < totalPages) this.currentPage++;
                break;
            case 'last':
                this.currentPage = totalPages;
                break;
        }
        
        this.renderTable();
    }

    openModal(grupo = null) {
        const modal = document.getElementById('grupoModal');
        const modalTitle = document.getElementById('grupoModalTitle'); // Corrigido o ID
        const form = document.getElementById('grupoForm');
        
        if (!modal) {
            console.error('❌ Modal não encontrado');
            return;
        }

        console.log('🔓 Abrindo modal de grupo', grupo ? 'para edição' : 'para criação');

        if (grupo) {
            if (modalTitle) modalTitle.textContent = 'Editar Grupo';
            document.getElementById('grupoId').value = grupo.id;
            document.getElementById('grupoNome').value = grupo.nome;
            document.getElementById('grupoDescricao').value = grupo.descricao || '';
            document.getElementById('grupoCor').value = grupo.cor;
        } else {
            if (modalTitle) modalTitle.textContent = 'Novo Grupo';
            if (form) form.reset();
            const grupoId = document.getElementById('grupoId');
            if (grupoId) grupoId.value = '';
            
            // Resetar cor para padrão
            const colorInput = document.getElementById('grupoCor');
            const colorPreview = document.querySelector('.color-preview');
            if (colorInput && colorPreview) {
                colorInput.value = '#007bff';
                colorPreview.style.background = '#007bff';
            }
        }

        // Mostrar modal com animação
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Trigger animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Focar no primeiro campo
        const firstInput = modal.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 300);
        }
    }

    closeModal() {
        const modal = document.getElementById('grupoModal');
        if (!modal) return;

        console.log('🔒 Fechando modal de grupo');
        
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Aguardar animação terminar antes de esconder
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    async saveGrupo() {
        console.log('🔄 Método saveGrupo() iniciado');

        const form = document.getElementById('grupoForm');
        if (!form) {
            console.error('❌ Formulário não encontrado');
            return;
        }

        const formData = new FormData(form);
        const grupoData = {
            nome: formData.get('nome'),
            descricao: formData.get('descricao'),
            cor: formData.get('cor') || '#007bff'
        };

        // Validação
        if (!grupoData.nome || grupoData.nome.trim() === '') {
            alert('Por favor, informe o nome do grupo');
            return;
        }

        const grupoId = formData.get('id');
        this.showContentLoading();

        try {
            let result;
            if (grupoId) {
                result = await ApiClient.atualizarGrupoCliente(grupoId, grupoData);
                console.log('✅ Grupo atualizado na API:', result);
            } else {
                result = await ApiClient.criarGrupoCliente(grupoData);
                console.log('✅ Grupo criado na API:', result);
            }

            // Recarregar grupos da API (já faz renderTable + hideContentLoading)
            await this.loadGrupos();

            this.closeModal();
            this.hideContentLoading();

            // Persistir localmente se função existir
            try { if (typeof this.salvarGruposNoLocalStorage === 'function') this.salvarGruposNoLocalStorage(); } catch(e){}

            showNotification(`Grupo "${grupoData.nome}" ${grupoId ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        } catch (error) {
            console.error('❌ Erro ao salvar grupo:', error);
            this.hideContentLoading();
            alert('Erro ao salvar grupo: ' + (error.message || 'Erro desconhecido'));
        }
        }

    editGrupo(id) {
        const grupo = this.grupos.find(g => g.id === id);
        if (grupo) {
            this.openModal(grupo);
        }
    }

    async deleteGrupo(id) {
        const grupo = this.grupos.find(g => g.id === id);
        if (!grupo) return;

        // Usar modal personalizado
        showCustomAlert(
            'Tem certeza que deseja excluir esse grupo?',
            'Essa ação não poderá ser desfeita',
            () => {
                this.executeDelete(grupo);
            }
        );
    }

    showDeleteConfirmation(grupo) {
        console.log('🗑️ Mostrando confirmação de exclusão para:', grupo.nome);
        
        // Armazenar referência do grupo a ser excluído
        this.grupoParaExcluir = grupo;
        
        // Abrir modal de confirmação
        const modal = document.getElementById('confirmDeleteModal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Configurar o botão de confirmação
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            if (confirmBtn) {
                confirmBtn.onclick = () => this.executeDelete();
            }
        }
    }

    async executeDelete(grupo) {
        if (!grupo) return;

        console.log('✅ Executando exclusão do grupo:', grupo.nome);

        // Mostrar loading durante a operação
        this.showContentLoading();

        try {
            await ApiClient.deletarGrupoCliente(grupo.id);
            showNotification('Grupo excluído com sucesso!', 'success');
            await this.loadGrupos(); // Isso já vai esconder o loading
        } catch (error) {
            console.error('Erro ao excluir grupo:', error);
            this.hideContentLoading();
            showNotification('Erro ao excluir grupo: ' + (error.message || 'Erro desconhecido'), 'error');
        }

        this.grupoParaExcluir = null;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }
}

// Variável global para acesso aos métodos
let gruposManager;

// Funções globais para acesso via HTML
function adicionarGrupo() {
    console.log('🆕 Abrindo modal para adicionar novo grupo');
    if (gruposManager) {
        gruposManager.openModal();
    } else {
        console.error('❌ GruposManager não inicializado');
    }
}

function closeGrupoModal() {
    console.log('❌ Fechando modal de grupo');
    if (gruposManager) {
        gruposManager.closeModal();
    } else {
        // Fallback caso o manager não esteja disponível
        const modal = document.getElementById('grupoModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

// Funções para modal de confirmação de exclusão
let grupoParaExcluir = null;

function excluirGrupo(grupoNome) {
    console.log('🗑️ Solicitação para excluir grupo:', grupoNome);
    
    // Se temos o manager disponível, usar ele
    if (gruposManager) {
        const grupo = gruposManager.grupos.find(g => g.nome === grupoNome);
        if (grupo) {
            gruposManager.showDeleteConfirmation(grupo);
            return;
        }
    }
    
    // Fallback para função global
    grupoParaExcluir = grupoNome;
    
    // Abrir modal de confirmação
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Configurar o botão de confirmação
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.onclick = confirmarExclusao;
        }
    }
}

function closeConfirmDeleteModal() {
    console.log('❌ Fechando modal de confirmação');
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    grupoParaExcluir = null;
    
    // Limpar também no manager se disponível
    if (gruposManager) {
        gruposManager.grupoParaExcluir = null;
    }
}

async function confirmarExclusao() {
    if (!grupoParaExcluir) return;
    
    console.log('✅ Confirmada exclusão do grupo:', grupoParaExcluir);
    
    // Fechar modal
    closeConfirmDeleteModal();
    
    // Executar a exclusão
    try {
        // Se tiver o manager disponível, usar ele
        if (gruposManager) {
            const grupo = gruposManager.grupos.find(g => g.nome === grupoParaExcluir);
            if (grupo) {
                gruposManager.deleteGrupo(grupo.id);
            }
        } else {
            // Fallback: usar API diretamente
            const grupos = await ApiClient.getGruposClientes();
            const grupoParaRemover = grupos.find(g => g.nome === grupoParaExcluir);
            if (grupoParaRemover) {
                await ApiClient.deletarGrupoCliente(grupoParaRemover.id);
            }
            
            // Recarregar página ou atualizar interface
            showNotification('Grupo excluído com sucesso!', 'success');
            setTimeout(() => {
                location.reload();
            }, 1500);
        }
    } catch (error) {
        console.error('❌ Erro ao excluir grupo:', error);
        showNotification('Erro ao excluir grupo', 'error');
    }
}

function salvarGrupo(event) {
    event.preventDefault();
    console.log('💾 Salvando novo grupo');
    
    const form = document.getElementById('grupoForm');
    if (!form) {
        console.error('❌ Formulário não encontrado');
        return;
    }
    
    const formData = new FormData(form);
    
    const grupoData = {
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        cor: formData.get('cor') || '#007bff'
    };
    
    console.log('📝 Dados do grupo:', grupoData);
    
    // Validação
    if (!grupoData.nome || grupoData.nome.trim() === '') {
        alert('Por favor, informe o nome do grupo');
        return;
    }
    
    // Chamar método do manager
    if (gruposManager) {
        console.log('🔄 Chamando saveGrupo do manager...');
        gruposManager.saveGrupo();
    } else {
        console.error('❌ GruposManager não inicializado');
    }
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    // Remover notificação anterior se existir
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 350px;
    `;
    
    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: auto; opacity: 0.8;">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => notification.style.transform = 'translateX(0)', 10);
    
    // Auto remover após 4 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema de grupos...');
    
    gruposManager = new GruposClientesManager();
    console.log('✅ GruposManager criado:', gruposManager);
    
    // Verificar elementos importantes
    const modal = document.getElementById('grupoModal');
    const form = document.getElementById('grupoForm');
    const button = document.querySelector('button[onclick="adicionarGrupo()"]');
    
    console.log('🔍 Elementos encontrados:');
    console.log('  Modal:', modal ? '✅' : '❌');
    console.log('  Form:', form ? '✅' : '❌');
    console.log('  Button:', button ? '✅' : '❌');
    
    // Configurar formulário
    if (form) {
        form.addEventListener('submit', salvarGrupo);
        console.log('✅ Event listener do formulário configurado');
    }
    
    // Configurar preview de cor
    const colorInput = document.getElementById('grupoCor');
    const colorPreview = document.querySelector('.color-preview');
    
    if (colorInput && colorPreview) {
        colorInput.addEventListener('input', function() {
            colorPreview.style.background = this.value;
        });
        
        // Definir cor inicial
        colorPreview.style.background = colorInput.value;
        console.log('✅ Preview de cor configurado');
    }
    
    // Removido handler 'beforeunload' que acionava o alerta nativo do navegador.
    // Usamos modais customizados para confirmar ações e impedir navegação acidental.

    // Fechar modais com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const confirmModal = document.getElementById('confirmDeleteModal');
            const grupoModal = document.getElementById('grupoModal');
            
            if (confirmModal && confirmModal.classList.contains('show')) {
                closeConfirmDeleteModal();
            } else if (grupoModal && grupoModal.classList.contains('show')) {
                closeGrupoModal();
            }
        }
    });

    // Fechar modais clicando fora
    window.addEventListener('click', function(e) {
        const confirmModal = document.getElementById('confirmDeleteModal');
        const grupoModal = document.getElementById('grupoModal');
        
        if (e.target === confirmModal) {
            closeConfirmDeleteModal();
        } else if (e.target === grupoModal) {
            closeGrupoModal();
        }
    });
    
    console.log('✅ Sistema de grupos inicializado completamente');
});

// Modal de confirmação personalizado
function showCustomAlert(title, message, onConfirm) {
    // Remover modal existente se houver
    const existingModal = document.querySelector('.custom-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="modal-title">${title}</h3>
                <p class="modal-message">${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel">Cancelar</button>
                    <button class="btn-confirm">Excluir</button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(modal);
    
    // Adicionar event listeners
    const btnCancel = modal.querySelector('.btn-cancel');
    const btnConfirm = modal.querySelector('.btn-confirm');
    const overlay = modal.querySelector('.modal-overlay');
    
    btnCancel.addEventListener('click', () => {
        modal.remove();
    });
    
    btnConfirm.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            modal.remove();
        }
    });
    
    // Mostrar modal com animação
    setTimeout(() => modal.classList.add('show'), 10);
}