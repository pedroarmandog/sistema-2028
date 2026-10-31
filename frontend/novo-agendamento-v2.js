// =============================================
// NOVO AGENDAMENTO - PET CRIA
// Script para gerenciar o painel lateral de novo agendamento
// =============================================

console.log('📅 Script de Novo Agendamento carregado!');

// =============================================
// FUNÇÃO PRINCIPAL: Abrir Novo Agendamento
// =============================================
function abrirNovoAgendamento() {
    console.log('🚀 Abrindo painel de Novo Agendamento...');
    
    const sidebar = document.getElementById('novoAgendamentoSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    console.log('🔍 Sidebar element:', sidebar);
    console.log('🔍 Overlay element:', overlay);
    
    if (sidebar && overlay) {
        console.log('✅ Elementos encontrados, criando novo sidebar...');
        
        // REMOVER SIDEBAR ANTIGO SE EXISTIR
        const sidebarAntigo = document.getElementById('novoSidebarFuncional');
        if (sidebarAntigo) {
            sidebarAntigo.remove();
        }
        
        // CRIAR OVERLAY NOVO
        const novoOverlay = document.createElement('div');
        novoOverlay.id = 'novoOverlayFuncional';
        novoOverlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.7) !important;
            z-index: 999998 !important;
        `;
        
        // CRIAR SIDEBAR NOVO COMPLETAMENTE
        const novoSidebar = document.createElement('div');
        novoSidebar.id = 'novoSidebarFuncional';
        novoSidebar.innerHTML = `
            <div style="background: #2c5aa0; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 20px;">
                    <i class="fas fa-calendar-plus"></i> Novo Agendamento
                </h3>
                <button id="fecharNovoSidebar" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 30px;">
                <form>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Pet/Cliente *</label>
                        <input type="text" placeholder="Digite o nome do pet ou cliente..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Serviço *</label>
                        <input type="text" placeholder="Digite o serviço ou produto..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Data</label>
                        <input type="date" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Hora</label>
                        <input type="time" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Observações</label>
                        <textarea rows="4" placeholder="Observações sobre o agendamento..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                    </div>
                    <div style="display: flex; gap: 15px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <button type="button" id="cancelarNovoSidebar" style="padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; background: #6c757d; color: white;">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="button" style="padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; background: #28a745; color: white;">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button type="button" style="padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; background: #2c5aa0; color: white;">
                            <i class="fas fa-save"></i> Salvar e Ir
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        novoSidebar.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 800px !important;
            max-height: 90vh !important;
            background: white !important;
            z-index: 999999 !important;
            box-shadow: 0 0 30px rgba(0,0,0,0.8) !important;
            border-radius: 10px !important;
            overflow-y: auto !important;
            border: 3px solid #2c5aa0 !important;
        `;
        
        // ADICIONAR AO DOM
        document.body.appendChild(novoOverlay);
        document.body.appendChild(novoSidebar);
        
        // ADICIONAR EVENT LISTENERS
        document.getElementById('fecharNovoSidebar').onclick = () => {
            novoSidebar.remove();
            novoOverlay.remove();
            document.body.style.overflow = '';
        };
        
        document.getElementById('cancelarNovoSidebar').onclick = () => {
            novoSidebar.remove();
            novoOverlay.remove();
            document.body.style.overflow = '';
        };
        
        novoOverlay.onclick = () => {
            novoSidebar.remove();
            novoOverlay.remove();
            document.body.style.overflow = '';
        };
        
        // Aplicar classes também
        sidebar.classList.add('open');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        console.log('📋 Classes aplicadas:');
        console.log('- Sidebar classes:', sidebar.className);
        console.log('- Overlay classes:', overlay.className);
        console.log('- Sidebar z-index:', sidebar.style.zIndex);
        console.log('- Sidebar right:', sidebar.style.right);
        
        // Focar no primeiro campo
        setTimeout(() => {
            const petClienteInput = document.getElementById('petCliente');
            if (petClienteInput) {
                petClienteInput.focus();
                console.log('🎯 Foco aplicado no campo Pet/Cliente');
            }
        }, 300);
        
        console.log('✅ Painel aberto com sucesso');
    } else {
        console.error('❌ Elementos do sidebar não encontrados');
        console.error('- Sidebar:', sidebar);
        console.error('- Overlay:', overlay);
    }
}

// =============================================
// FUNÇÃO: Fechar Novo Agendamento
// =============================================
function fecharNovoAgendamento() {
    console.log('🔒 Fechando painel de Novo Agendamento...');
    
    const sidebar = document.getElementById('novoAgendamentoSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
        
        // Recolher campos extras se estiverem expandidos
        const camposExtras = document.getElementById('camposExtras');
        const btnVerMais = document.getElementById('btnVerMais');
        if (camposExtras && btnVerMais) {
            camposExtras.classList.remove('show');
            btnVerMais.classList.remove('expanded');
            btnVerMais.innerHTML = '<i class="fas fa-chevron-down"></i> VER MAIS';
        }
        
        console.log('✅ Painel fechado com sucesso');
    }
}

// =============================================
// FUNÇÃO: Limpar Formulário
// =============================================
function limparFormulario() {
    const form = document.getElementById('novoAgendamentoForm');
    if (form) {
        form.reset();
        
        // Limpar campos hidden e divs de resultados
        const selectedPetId = document.getElementById('selectedPetId');
        const selectedItemId = document.getElementById('selectedItemId');
        const selectedPetInfo = document.getElementById('selectedPetInfo');
        const petClienteResults = document.getElementById('resultados-pet-cliente');
        const itemResults = document.getElementById('resultados-item');
        
        if (selectedPetId) selectedPetId.value = '';
        if (selectedItemId) selectedItemId.value = '';
        if (selectedPetInfo) selectedPetInfo.innerHTML = '';
        if (petClienteResults) petClienteResults.innerHTML = '';
        if (itemResults) itemResults.innerHTML = '';
        
        console.log('🧹 Formulário limpo');
    }
}

// =============================================
// FUNÇÃO: Toggle "VER MAIS"
// =============================================
function toggleVerMais() {
    const camposExtras = document.getElementById('camposExtras');
    const btnVerMais = document.getElementById('btnVerMais');
    
    if (camposExtras && btnVerMais) {
        const isExpanded = camposExtras.classList.contains('show');
        
        if (isExpanded) {
            // Recolher
            camposExtras.classList.remove('show');
            btnVerMais.classList.remove('expanded');
            btnVerMais.innerHTML = '<i class="fas fa-chevron-down"></i> VER MAIS';
        } else {
            // Expandir
            camposExtras.classList.add('show');
            btnVerMais.classList.add('expanded');
            btnVerMais.innerHTML = '<i class="fas fa-chevron-up"></i> VER MENOS';
        }
        
        console.log(isExpanded ? '📤 Campos recolhidos' : '📥 Campos expandidos');
    }
}

// =============================================
// FUNÇÃO: Buscar Pet/Cliente
// =============================================
function buscarPetCliente(query) {
    console.log('🔍 Buscando Pet/Cliente:', query);
    
    // Dados simulados - substitua pela sua API real
    const dados = [
        { id: 1, tipo: 'pet', nome: 'Rex', cliente: 'João Silva', raca: 'Golden Retriever' },
        { id: 2, tipo: 'pet', nome: 'Mia', cliente: 'Maria Santos', raca: 'Poodle' },
        { id: 3, tipo: 'cliente', nome: 'Ana Costa', telefone: '(11) 99999-9999' },
        { id: 4, tipo: 'pet', nome: 'Thor', cliente: 'Pedro Lima', raca: 'Labrador' },
        { id: 5, tipo: 'cliente', nome: 'Carlos Oliveira', telefone: '(11) 88888-8888' }
    ];
    
    const resultados = dados.filter(item => 
        item.nome.toLowerCase().includes(query.toLowerCase()) ||
        (item.cliente && item.cliente.toLowerCase().includes(query.toLowerCase()))
    );
    
    exibirResultadosPetCliente(resultados);
}

// =============================================
// FUNÇÃO: Exibir Resultados Pet/Cliente
// =============================================
function exibirResultadosPetCliente(resultados) {
    const container = document.getElementById('resultados-pet-cliente');
    
    if (!container) return;
    
    if (resultados.length === 0) {
        container.innerHTML = '<div class="search-no-results">Nenhum resultado encontrado</div>';
        container.style.display = 'block';
        return;
    }
    
    const html = resultados.map(item => `
        <div class="search-result-item" onclick="selecionarPetCliente(${item.id}, '${item.nome}', '${item.tipo}', '${item.cliente || ''}', '${item.raca || ''}', '${item.telefone || ''}')">
            <div class="result-main">
                <strong>${item.nome}</strong>
                <span class="result-type">${item.tipo === 'pet' ? 'Pet' : 'Cliente'}</span>
            </div>
            <div class="result-details">
                ${item.tipo === 'pet' ? 
                    `Cliente: ${item.cliente} • ${item.raca}` : 
                    `Telefone: ${item.telefone}`
                }
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// =============================================
// FUNÇÃO: Selecionar Pet/Cliente
// =============================================
function selecionarPetCliente(id, nome, tipo, cliente, raca, telefone) {
    const petClienteInput = document.getElementById('petCliente');
    const selectedPetId = document.getElementById('selectedPetId');
    const petClienteResults = document.getElementById('resultados-pet-cliente');
    const selectedPetInfo = document.getElementById('selectedPetInfo');
    
    if (petClienteInput) petClienteInput.value = nome;
    if (selectedPetId) selectedPetId.value = id;
    if (petClienteResults) petClienteResults.style.display = 'none';
    
    // Exibir informações selecionadas
    const info = tipo === 'pet' ? 
        `<div class="selected-item"><i class="fas fa-paw"></i> ${nome} (${cliente})</div>` :
        `<div class="selected-item"><i class="fas fa-user"></i> ${nome}</div>`;
    
    if (selectedPetInfo) selectedPetInfo.innerHTML = info;
    
    console.log('✅ Pet/Cliente selecionado:', { id, nome, tipo });
}

// =============================================
// FUNÇÃO: Buscar Item
// =============================================
function buscarItem(query) {
    console.log('🔍 Buscando Item:', query);
    
    // Dados simulados - substitua pela sua API real
    const itens = [
        { id: 1, nome: 'Banho e Tosa', categoria: 'Serviços', valor: 50.00 },
        { id: 2, nome: 'Consulta Veterinária', categoria: 'Consultas', valor: 80.00 },
        { id: 3, nome: 'Vacinação', categoria: 'Procedimentos', valor: 120.00 },
        { id: 4, nome: 'Hidratação', categoria: 'Serviços', valor: 35.00 },
        { id: 5, nome: 'Corte de Unhas', categoria: 'Serviços', valor: 20.00 }
    ];
    
    const resultados = itens.filter(item => 
        item.nome.toLowerCase().includes(query.toLowerCase()) ||
        item.categoria.toLowerCase().includes(query.toLowerCase())
    );
    
    exibirResultadosItem(resultados);
}

// =============================================
// FUNÇÃO: Exibir Resultados Item
// =============================================
function exibirResultadosItem(resultados) {
    const container = document.getElementById('resultados-item');
    
    if (!container) return;
    
    if (resultados.length === 0) {
        container.innerHTML = '<div class="search-no-results">Nenhum item encontrado</div>';
        container.style.display = 'block';
        return;
    }
    
    const html = resultados.map(item => `
        <div class="search-result-item" onclick="selecionarItem(${item.id}, '${item.nome}', '${item.categoria}', ${item.valor})">
            <div class="result-main">
                <strong>${item.nome}</strong>
                <span class="result-price">R$ ${item.valor.toFixed(2)}</span>
            </div>
            <div class="result-details">
                Categoria: ${item.categoria}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// =============================================
// FUNÇÃO: Selecionar Item
// =============================================
function selecionarItem(id, nome, categoria, valor) {
    const itemInput = document.getElementById('item');
    const selectedItemId = document.getElementById('selectedItemId');
    const itemResults = document.getElementById('resultados-item');
    
    if (itemInput) itemInput.value = nome;
    if (selectedItemId) selectedItemId.value = id;
    if (itemResults) itemResults.style.display = 'none';
    
    // Preencher valor unitário se o campo existir
    const valorUnitarioInput = document.getElementById('valorUnitario');
    if (valorUnitarioInput) {
        valorUnitarioInput.value = valor.toFixed(2);
        calcularValorFinal();
    }
    
    console.log('✅ Item selecionado:', { id, nome, categoria, valor });
}

// =============================================
// FUNÇÃO: Calcular Valor Final
// =============================================
function calcularValorFinal() {
    const valorUnitario = parseFloat(document.getElementById('valorUnitario')?.value || 0);
    const quantidade = parseInt(document.getElementById('quantidade')?.value || 1);
    const desconto = parseFloat(document.getElementById('desconto')?.value || 0);
    
    const subtotal = valorUnitario * quantidade;
    const valorDesconto = subtotal * (desconto / 100);
    const valorFinal = subtotal - valorDesconto;
    
    const valorFinalInput = document.getElementById('valorFinal');
    if (valorFinalInput) {
        valorFinalInput.value = valorFinal.toFixed(2);
    }
}

// =============================================
// FUNÇÕES DOS BOTÕES
// =============================================

function salvarAgendamento() {
    console.log('💾 Salvando agendamento...');
    
    const petCliente = document.getElementById('petCliente')?.value;
    const item = document.getElementById('item')?.value;
    
    if (!petCliente || !item) {
        alert('Por favor, preencha os campos obrigatórios: Pet/Cliente e Item');
        return;
    }
    
    // Aqui você implementaria a lógica de salvamento
    console.log('✅ Agendamento salvo com sucesso!');
    alert('Agendamento salvo com sucesso!');
    
    fecharNovoAgendamento();
}

function salvarEIr() {
    console.log('💾➡️ Salvando e redirecionando...');
    
    const petCliente = document.getElementById('petCliente')?.value;
    const item = document.getElementById('item')?.value;
    
    if (!petCliente || !item) {
        alert('Por favor, preencha os campos obrigatórios: Pet/Cliente e Item');
        return;
    }
    
    // Aqui você implementaria a lógica de salvamento
    console.log('✅ Agendamento salvo! Redirecionando...');
    alert('Agendamento salvo! Redirecionando...');
    
    // Depois redirecionar (exemplo)
    // window.location.href = 'pagina-destino.html';
    fecharNovoAgendamento();
}

function salvarEAdicionar() {
    console.log('💾➕ Salvando e adicionando outro...');
    
    const petCliente = document.getElementById('petCliente')?.value;
    const item = document.getElementById('item')?.value;
    
    if (!petCliente || !item) {
        alert('Por favor, preencha os campos obrigatórios: Pet/Cliente e Item');
        return;
    }
    
    // Aqui você implementaria a lógica de salvamento
    console.log('✅ Agendamento salvo! Preparando para novo...');
    alert('Agendamento salvo! Você pode adicionar outro.');
    
    // Limpar apenas os campos necessários, mantendo o painel aberto
    limparFormulario();
}

// =============================================
// INICIALIZAÇÃO E EVENT LISTENERS
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 Inicializando Novo Agendamento...');
    
    // Event listeners para fechar o sidebar
    const btnClose = document.getElementById('btnCloseSidebar');
    const btnCancelar = document.getElementById('btnCancelar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (btnClose) {
        btnClose.addEventListener('click', fecharNovoAgendamento);
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', fecharNovoAgendamento);
    }
    
    if (overlay) {
        overlay.addEventListener('click', fecharNovoAgendamento);
    }
    
    // Event listener para "VER MAIS"
    const btnVerMais = document.getElementById('btnVerMais');
    if (btnVerMais) {
        btnVerMais.addEventListener('click', toggleVerMais);
    }
    
    // Event listeners para os botões de ação
    const btnSalvar = document.getElementById('btnSalvar');
    const btnSalvarIr = document.getElementById('btnSalvarIr');
    const linkSalvarAdicionar = document.getElementById('salvarAdicionarOutro');
    
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarAgendamento);
    }
    
    if (btnSalvarIr) {
        btnSalvarIr.addEventListener('click', salvarEIr);
    }
    
    if (linkSalvarAdicionar) {
        linkSalvarAdicionar.addEventListener('click', function(e) {
            e.preventDefault();
            salvarEAdicionar();
        });
    }
    
    // Event listeners para busca
    const petClienteInput = document.getElementById('petCliente');
    const itemInput = document.getElementById('item');
    
    if (petClienteInput) {
        petClienteInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                buscarPetCliente(query);
            } else {
                const results = document.getElementById('resultados-pet-cliente');
                if (results) results.style.display = 'none';
            }
        });
    }
    
    if (itemInput) {
        itemInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                buscarItem(query);
            } else {
                const results = document.getElementById('resultados-item');
                if (results) results.style.display = 'none';
            }
        });
    }
    
    // Event listeners para cálculo de valor
    const quantidade = document.getElementById('quantidade');
    const desconto = document.getElementById('desconto');
    
    if (quantidade) {
        quantidade.addEventListener('input', calcularValorFinal);
    }
    
    if (desconto) {
        desconto.addEventListener('input', calcularValorFinal);
    }
    
    console.log('✅ Novo Agendamento inicializado com sucesso!');
});

// =============================================
// FUNÇÃO GLOBAL: Para ser chamada pelo botão "Novo Atendimento"
// =============================================
function novoAtendimento() {
    console.log('🎯 Função novoAtendimento() chamada!');
    abrirNovoAgendamento();
}

// Exportar para escopo global
window.abrirNovoAgendamento = abrirNovoAgendamento;
window.fecharNovoAgendamento = fecharNovoAgendamento;
window.novoAtendimento = novoAtendimento;

console.log('🌟 Novo Agendamento script carregado e funções exportadas para window!');

