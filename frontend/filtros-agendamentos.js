// Filtros de Agendamentos - Sistema de Filtros
console.log('🔍 Sistema de Filtros carregado');

// Variáveis globais de filtro
let filtroAtual = {
    situacao: ['agendado'], // Filtro de situação ativo (array para múltipla seleção)
    periodo: 'day'        // Filtro de período ativo
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Inicializando sistema de filtros');
    
    // DESABILITADO: Sistema de filtros movido para agendamentos-novo.js
    // para evitar conflito de listeners duplicados
    
    // Configurar filtros de situação
    // configurarFiltrosSituacao();
    
    // Configurar filtros de período
    // configurarFiltrosPeriodo();
    
    // Configurar botão "Aplicar filtro"
    // configurarBotaoAplicar();
    
    // NÃO aplicar filtros automaticamente - deixar o sistema existente carregar
    // aplicarFiltros();
    
    console.log('✅ Sistema de filtros pronto (desabilitado - usando agendamentos-novo.js)');
});

function configurarFiltrosSituacao() {
    const statusTags = document.querySelectorAll('.status-tag');
    
    statusTags.forEach(tag => {
        tag.addEventListener('click', function() {
            // Toggle da tag (permite múltipla seleção)
            const isActive = this.classList.contains('active');
            const activeTags = document.querySelectorAll('.status-tag.active');
            
            // Não permitir desmarcar se é a única ativa
            if (isActive && activeTags.length === 1) {
                console.log('🚫 Não é possível desmarcar o último filtro ativo');
                return;
            }
            
            // Toggle da classe active
            this.classList.toggle('active');
            
            // Atualizar filtro atual com array de situações ativas
            const activeTagsUpdated = document.querySelectorAll('.status-tag.active');
            filtroAtual.situacao = Array.from(activeTagsUpdated).map(t => {
                if (t.classList.contains('status-agendado')) return 'agendado';
                if (t.classList.contains('status-checkin')) return 'checkin';
                if (t.classList.contains('status-pronto')) return 'pronto';
                if (t.classList.contains('status-checkout')) return 'checkout';
                if (t.classList.contains('status-cancelado')) return 'cancelado';
            }).filter(s => s);
            
            console.log('🏷️ Filtro de situação alterado para:', filtroAtual.situacao);
            
            // Aplicar filtros automaticamente quando situação muda
            aplicarFiltros();
        });
    });
}

function configurarFiltrosPeriodo() {
    const periodBtns = document.querySelectorAll('.view-period-btn');
    
    periodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover active de todos os botões
            periodBtns.forEach(b => b.classList.remove('active'));
            
            // Adicionar active no botão clicado
            this.classList.add('active');
            
            // Atualizar filtro atual
            const periodo = this.getAttribute('data-period');
            filtroAtual.periodo = periodo;
            
            console.log('📅 Filtro de período alterado para:', filtroAtual.periodo);
            
            // Aplicar filtros automaticamente quando período muda
            aplicarFiltros();
        });
    });
}

function configurarBotaoAplicar() {
    const btnFilter = document.querySelector('.btn-filter');
    
    if (btnFilter) {
        btnFilter.addEventListener('click', function() {
            console.log('🔍 Aplicando filtros...');
            aplicarFiltros();
        });
    }
}

function aplicarFiltros() {
    console.log('🎯 Aplicando filtros:', filtroAtual);
    
    // TODO: Obter agendamentos da API via ApiClient.getAgendamentos() com filtros
    // Não usar localStorage agendamentos_persistidos
    console.warn('⚠️ aplicarFiltros() usa localStorage - migrar para ApiClient.getAgendamentos()');
    
    const agendamentosSalvos = []; // Temporariamente vazio até implementação da API
    
    /* CÓDIGO ANTIGO - REMOVER
    // Obter todos os agendamentos persistidos
    const agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
    console.log('📋 Agendamentos encontrados no localStorage:', agendamentosSalvos.length);
    
    if (agendamentosSalvos.length > 0) {
        console.log('🔍 Exemplo de agendamento:', agendamentosSalvos[0]);
    }
    */
    
    // Filtrar por situação (suporta array de situações)
    let agendamentosFiltrados = agendamentosSalvos.filter(agendamento => {
        const situacaoAgendamento = agendamento.status || agendamento.situacao || 'agendado';
        const match = Array.isArray(filtroAtual.situacao) 
            ? filtroAtual.situacao.includes(situacaoAgendamento)
            : situacaoAgendamento === filtroAtual.situacao;
        console.log(`🏷️ Agendamento ${agendamento.id}: status="${situacaoAgendamento}", filtro="${JSON.stringify(filtroAtual.situacao)}", match=${match}`);
        return match;
    });
    
    // Filtrar por período
    agendamentosFiltrados = filtrarPorPeriodo(agendamentosFiltrados, filtroAtual.periodo);
    
    console.log(`📊 Agendamentos após filtros: ${agendamentosFiltrados.length}`);
    
    // Recarregar a lista com os agendamentos filtrados
    recarregarListaFiltrada(agendamentosFiltrados);
}

function filtrarPorPeriodo(agendamentos, periodo) {
    console.log('🗓️ Filtrando por período:', periodo);
    console.log('📅 Agendamentos para filtrar por período:', agendamentos.length);
    
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('📅 Data de hoje:', dataHoje);
    
    const resultado = agendamentos.filter(agendamento => {
        const dataAgendamento = agendamento.data;
        console.log(`📅 Agendamento ${agendamento.id}: data="${dataAgendamento}"`);
        
        switch (periodo) {
            case 'today':
                const matchToday = dataAgendamento === dataHoje;
                console.log(`📅 [today] Comparando: "${dataAgendamento}" === "${dataHoje}" = ${matchToday}`);
                return matchToday;
                
            case 'day':
                const matchDay = dataAgendamento === dataHoje;
                console.log(`📅 [day] Comparando: "${dataAgendamento}" === "${dataHoje}" = ${matchDay}`);
                return matchDay;
                
            case 'week':
                const inicioSemana = new Date(hoje);
                inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                const fimSemana = new Date(inicioSemana);
                fimSemana.setDate(inicioSemana.getDate() + 6);
                
                const dataAgendamentoDate = new Date(dataAgendamento);
                const matchWeek = dataAgendamentoDate >= inicioSemana && dataAgendamentoDate <= fimSemana;
                console.log(`📅 [week] Match: ${matchWeek}`);
                return matchWeek;
                
            case 'month':
                const anoMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
                const matchMonth = dataAgendamento.startsWith(anoMesAtual);
                console.log(`📅 [month] Match: ${matchMonth}`);
                return matchMonth;
                
            default:
                console.log('📅 Período padrão - retornando true');
                return true;
        }
    });
    
    console.log(`📅 Resultado do filtro de período: ${resultado.length} agendamentos`);
    return resultado;
}

function recarregarListaFiltrada(agendamentosFiltrados) {
    const container = document.getElementById('agendamentosTableBody');
    if (!container) {
        console.log('❌ Container de agendamentos não encontrado');
        return;
    }
    
    // Limpar container
    container.innerHTML = '';
    
    if (agendamentosFiltrados.length === 0) {
        // Mostrar mensagem de nenhum agendamento encontrado
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
                <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3>Nenhum agendamento encontrado</h3>
                <p>Não há agendamentos com o status "${filtroAtual.situacao}" no período selecionado.</p>
            </div>
        `;
        return;
    }
    
    // Ordernar por horário
    agendamentosFiltrados.sort((a, b) => {
        return a.horario.localeCompare(b.horario);
    });
    
    // Renderizar agendamentos filtrados
    agendamentosFiltrados.forEach(agendamento => {
        const agendamentoHTML = criarHTMLAgendamentoTabela(agendamento);
        container.insertAdjacentHTML('beforeend', agendamentoHTML);
    });
    
    console.log(`✅ Lista recarregada com ${agendamentosFiltrados.length} agendamentos`);
}

function criarHTMLAgendamentoTabela(agendamento) {
    const status = agendamento.status || agendamento.situacao || 'agendado';
    const statusTexto = agendamento.statusTexto || agendamento.situacao?.charAt(0).toUpperCase() + agendamento.situacao?.slice(1) || 'Agendado';
    
    return `
        <div class="agendamento-row" data-agendamento-id="${agendamento.id}">
            <div class="agendamento-controls">
                <label class="checkbox-label">
                    <input type="checkbox" value="${agendamento.id}">
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="agendamento-columns">
                <div class="agendamento-horario">${agendamento.horario}</div>
                <div class="agendamento-pet-cliente">
                    <strong>${agendamento.petNome}</strong><br>
                    <small>${agendamento.clienteNome}</small>
                </div>
                <div class="agendamento-detalhes">${agendamento.servico}</div>
                <div class="agendamento-profissional">${agendamento.profissional || '-'}</div>
                <div class="agendamento-valor">R$ ${(agendamento.valor || 0).toFixed(2).replace('.', ',')}</div>
                <div class="agendamento-situacao">
                    <div class="status-dropdown" data-agendamento-id="${agendamento.id}">
                        <button class="status-button status-${status}" onclick="toggleStatusDropdown('${agendamento.id}')">
                            <span class="status-dot"></span>
                            <span class="status-text">${statusTexto}</span>
                            <i class="fas fa-chevron-down status-arrow"></i>
                        </button>
                        <div class="status-menu" id="statusMenu_${agendamento.id}">
                            <div class="status-option status-agendado" onclick="alterarStatus('${agendamento.id}', 'agendado', 'Agendado')">
                                <span class="status-dot"></span>
                                <span>Agendado</span>
                            </div>
                            <div class="status-option status-checkin" onclick="alterarStatus('${agendamento.id}', 'checkin', 'Check-in')">
                                <span class="status-dot"></span>
                                <span>Check-in</span>
                            </div>
                            <div class="status-option status-pronto" onclick="alterarStatus('${agendamento.id}', 'pronto', 'Pronto')">
                                <span class="status-dot"></span>
                                <span>Pronto</span>
                            </div>
                            <div class="status-option status-checkout" onclick="alterarStatus('${agendamento.id}', 'checkout', 'Check-out')">
                                <span class="status-dot"></span>
                                <span>Check-out</span>
                            </div>
                            <div class="status-option status-cancelado" onclick="alterarStatus('${agendamento.id}', 'cancelado', 'Cancelado')">
                                <span class="status-dot"></span>
                                <span>Cancelado</span>
                            </div>
                        </div>
                    </div>

                    <div class="agendamento-actions">
                        <button class="action-btn action-location" title="Localização" onclick="abrirLocalizacao('${agendamento.id}')">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                        <button class="action-btn action-export" title="Exportar" onclick="exportarAgendamento('${agendamento.id}')">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="action-btn action-menu" title="Mais opções" onclick="abrirMenuLinha('${agendamento.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function criarHTMLAgendamento(agendamento) {
    // Reutilizar a função que já existe no novo-atendimento-global.js
    if (typeof window.criarHTMLAgendamento === 'function') {
        return window.criarHTMLAgendamento(agendamento);
    }
    
    // Usar a versão da tabela como fallback
    return criarHTMLAgendamentoTabela(agendamento);
}

// Função para ser chamada quando um agendamento é adicionado/editado
function atualizarFiltrosAposAlteracao() {
    console.log('🔄 Atualizando filtros após alteração');
    setTimeout(() => {
        aplicarFiltros();
    }, 100);
}

// Exportar funções para uso global
window.filtrosAgendamentos = {
    aplicarFiltros,
    atualizarFiltrosAposAlteracao,
    filtroAtual
};

// Small fallback handlers for the new action buttons
window.abrirLocalizacao = function(agendamentoId){
    try{ console.log('[abrirLocalizacao]', agendamentoId); alert('Abrir localização do agendamento ' + agendamentoId); }catch(e){}
};

window.exportarAgendamento = function(agendamentoId){
    try{ console.log('[exportarAgendamento]', agendamentoId); alert('Exportar agendamento ' + agendamentoId); }catch(e){}
};

window.abrirMenuLinha = function(agendamentoId){
    try{ console.log('[abrirMenuLinha]', agendamentoId); alert('Mais opções para ' + agendamentoId); }catch(e){}
};