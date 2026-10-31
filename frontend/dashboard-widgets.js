// ========================================
// DASHBOARD WIDGETS - GESTÃO INTELIGENTE
// ========================================

// Use path relativo para o backend (evita depender de host/porta hard-coded)
const API_BASE = '/api';

// ========================================
// PRODUTOS COM ESTOQUE BAIXO
// ========================================
async function carregarProdutosEstoqueBaixo() {
    const widget = document.querySelector('.widget-large');
    const loadingState = widget.querySelector('.loading-state');
    const tableContainer = widget.querySelector('.table-container');
    const tbody = widget.querySelector('tbody');

    try {
        const response = await fetch(`${API_BASE}/dashboard/produtos-estoque-baixo`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const produtos = await response.json();
        
        loadingState.style.display = 'none';
        
        if (produtos.length === 0) {
            tableContainer.innerHTML = '<div class="empty-state"><p>Todos os produtos estão com estoque adequado!</p></div>';
            tableContainer.style.display = 'block';
            return;
        }

        // Ajustar nomes de campos vindos do modelo Produto (backend):
        // nome, estoqueAtual, estoqueMinimo, estoqueIdeal
        tbody.innerHTML = produtos.map(p => {
            const estoque = p.estoqueAtual ?? p.estoque ?? 0;
            const estoqueMinimo = p.estoqueMinimo ?? 0;
            const estoqueIdeal = p.estoqueIdeal ?? estoqueMinimo ?? 0;
            const dangerClass = estoque === 0 ? 'text-danger' : (estoque < estoqueMinimo ? 'text-warning' : '');
            const descricao = p.nome || p.descricao || p.description || '';
            const sugestao = Math.max(0, (estoqueIdeal || estoqueMinimo || 0) - estoque);

            return `
                <tr>
                    <td>${p.id} - ${descricao}</td>
                    <td class="${dangerClass}">${estoque}</td>
                    <td>${estoqueMinimo}</td>
                    <td>${estoqueIdeal}</td>
                    <td>${sugestao}</td>
                </tr>
            `;
        }).join('');
        
        tableContainer.style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar produtos com estoque baixo:', error);
        loadingState.innerHTML = '<div class="error-state"><p>Erro ao carregar dados</p></div>';
    }
}

// ========================================
// ANIVERSARIANTES (CLIENTES E PETS)
// ========================================
async function carregarAniversariantes() {
    const widget = document.querySelectorAll('.widget')[3]; // 4º widget
    const content = widget.querySelector('.widget-content');
    const tabs = widget.querySelectorAll('.tab-btn');
    
    let aniversariantes = { pets: [], clientes: [] };
    
    try {
        const response = await fetch(`${API_BASE}/dashboard/aniversariantes`);
        if (!response.ok) throw new Error('Erro ao carregar aniversariantes');
        
        aniversariantes = await response.json();
        
        // Configurar tabs
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tipo = index === 0 ? 'pets' : 'clientes';
                renderAniversariantes(content, aniversariantes[tipo], tipo);
            });
        });
        
        // Renderizar pets inicialmente
        renderAniversariantes(content, aniversariantes.pets, 'pets');
        
    } catch (error) {
        console.error('Erro ao carregar aniversariantes:', error);
        content.innerHTML = '<div class="error-state"><p>Erro ao carregar dados</p></div>';
    }
}

function renderAniversariantes(container, lista, tipo) {
    if (lista.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Não há aniversariantes pelos próximos 7 dias!</p></div>';
        return;
    }
    
    const html = lista.map(item => {
        const dataAniv = new Date(item.dataNascimento);
        const hoje = new Date();
        const diasAte = Math.floor((dataAniv - hoje) / (1000 * 60 * 60 * 24));
        const isHoje = diasAte === 0;
        
        return `
            <div class="aniversariante-item ${isHoje ? 'today' : ''}">
                <div class="aniv-icon">
                    <i class="fas fa-${tipo === 'pets' ? 'paw' : 'user'}"></i>
                </div>
                <div class="aniv-info">
                    <div class="aniv-name">${item.nome}</div>
                    <div class="aniv-date">${isHoje ? 'Hoje!' : `Em ${diasAte} dias`}</div>
                </div>
                ${isHoje ? '<div class="aniv-badge">🎉</div>' : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="aniversariantes-list">${html}</div>`;
}

// ========================================
// OPORTUNIDADE DE VENDA
// ========================================
async function carregarOportunidadesVenda() {
    const widget = document.querySelectorAll('.widget')[4]; // 5º widget
    const content = widget.querySelector('.widget-content');
    
    try {
        const response = await fetch(`${API_BASE}/dashboard/oportunidades-venda`);
        if (!response.ok) throw new Error('Erro ao carregar oportunidades');
        
        const oportunidades = await response.json();
        
        if (oportunidades.length === 0) {
            content.innerHTML = '<div class="empty-state"><p>Nenhuma oportunidade encontrada</p></div>';
            return;
        }
        
        const html = oportunidades.map(op => `
            <div class="oportunidade-item">
                <div class="op-cliente">
                    <strong>${op.clienteNome}</strong>
                </div>
                <div class="op-produto">${op.produtoNome}</div>
                <div class="op-info">
                    <span class="op-badge">Última compra: ${formatarData(op.ultimaCompra)}</span>
                    <span class="op-badge">Quantidade: ${op.quantidade}</span>
                </div>
            </div>
        `).join('');
        
        content.innerHTML = `<div class="oportunidades-list">${html}</div>`;
        
    } catch (error) {
        console.error('Erro ao carregar oportunidades de venda:', error);
        content.innerHTML = '<div class="error-state"><p>Erro ao carregar dados</p></div>';
    }
}

// ========================================
// TAXI DOG
// ========================================
async function carregarLevaTraz() {
    const widget = document.querySelectorAll('.widget')[5]; // 6º widget
    const content = widget.querySelector('.widget-content');
    
    try {
        const response = await fetch(`${API_BASE}/dashboard/leva-traz`);
        if (!response.ok) throw new Error('Erro ao carregar Taxi Dog');
        
        const agendamentos = await response.json();
        
        if (agendamentos.length === 0) {
            content.innerHTML = '<div class="empty-state"><p>Nenhum pet agendado para hoje</p></div>';
            return;
        }
        
        const html = agendamentos.map(ag => `
            <div class="levatraz-item">
                <div class="lt-time">${ag.horario}</div>
                <div class="lt-info">
                    <div class="lt-pet"><i class="fas fa-paw"></i> ${ag.petNome}</div>
                    <div class="lt-cliente">${ag.clienteNome}</div>
                    <div class="lt-endereco"><i class="fas fa-map-marker-alt"></i> ${ag.endereco}</div>
                </div>
                <div class="lt-status ${ag.tipo}">
                    <i class="fas fa-${ag.tipo === 'buscar' ? 'arrow-right' : 'arrow-left'}"></i>
                    ${ag.tipo === 'buscar' ? 'Buscar' : 'Entregar'}
                </div>
            </div>
        `).join('');
        
        content.innerHTML = `<div class="levatraz-list">${html}</div>`;
        
    } catch (error) {
        console.error('Erro ao carregar Taxi Dog:', error);
        content.innerHTML = '<div class="error-state"><p>Erro ao carregar dados</p></div>';
    }
}

// ========================================
// CONTROLE DE VALIDADE
// ========================================
async function carregarControleValidade() {
    const widget = document.querySelectorAll('.widget')[6]; // 7º widget
    const content = widget.querySelector('.widget-content');
    
    try {
        const response = await fetch(`${API_BASE}/dashboard/produtos-vencimento`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const produtos = await response.json();
        
        if (produtos.length === 0) {
            content.innerHTML = '<div class="empty-state"><p>Nenhum produto próximo do vencimento</p></div>';
            return;
        }
        
        const html = produtos.map(p => {
            const diasVencimento = Math.floor((new Date(p.dataValidade) - new Date()) / (1000 * 60 * 60 * 24));
            const statusClass = diasVencimento <= 7 ? 'critico' : diasVencimento <= 30 ? 'alerta' : 'atencao';
            
            return `
                <div class="validade-item ${statusClass}">
                    <div class="val-produto">
                        <strong>${p.descricao}</strong>
                        <span class="val-lote">Lote: ${p.lote || 'N/A'}</span>
                    </div>
                    <div class="val-info">
                        <div class="val-data">${formatarData(p.dataValidade)}</div>
                        <div class="val-dias">${diasVencimento} dias</div>
                    </div>
                    <div class="val-estoque">Estoque: ${p.estoque}</div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = `<div class="validade-list">${html}</div>`;
        
    } catch (error) {
        console.error('Erro ao carregar controle de validade:', error);
        content.innerHTML = '<div class="error-state"><p>Erro ao carregar dados</p></div>';
    }
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================
function formatarData(data) {
    if (!data) return 'N/A';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Carregando widgets do dashboard...');
    
    carregarProdutosEstoqueBaixo();
    carregarAniversariantes();
    carregarOportunidadesVenda();
    carregarLevaTraz();
    carregarControleValidade();
    
    // Atualizar a cada 5 minutos
    setInterval(() => {
        carregarProdutosEstoqueBaixo();
        carregarOportunidadesVenda();
        carregarLevaTraz();
    }, 5 * 60 * 1000);
});
