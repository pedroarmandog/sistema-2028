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

/* ========================================
   FUNCIONALIDADES ESPECÍFICAS DO RELATÓRIO DEMONSTRATIVO
   ======================================== */

// Estado do calendário
const calendarioState = {
    currentDate: new Date(),
    selectedDate: null,
    targetInput: null,
    dataInicio: null,
    dataFim: null
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Relatório Demonstrativo de Resultados inicializado');
    
    // Definir data padrão (hoje)
    const hoje = new Date();
    calendarioState.dataInicio = new Date(hoje);
    calendarioState.dataFim = new Date(hoje);
    
    // Formatar e exibir datas
    atualizarCamposPeriodo();
    
    // Configurar eventos
    setupEventos();
});

function setupEventos() {
    // Abrir calendário ao clicar no grupo de período
    const periodoGroup = document.getElementById('periodoAnaliseDemo');
    if (periodoGroup) {
        periodoGroup.addEventListener('click', function() {
            calendarioState.targetInput = 'periodo';
            mostrarCalendario();
        });
    }
    
    // Navegação do calendário
    const btnMesAnterior = document.getElementById('btnMesAnteriorDemo');
    const btnProximoMes = document.getElementById('btnProximoMesDemo');
    
    if (btnMesAnterior) {
        btnMesAnterior.addEventListener('click', function() {
            calendarioState.currentDate.setMonth(calendarioState.currentDate.getMonth() - 1);
            renderizarCalendario();
        });
    }
    
    if (btnProximoMes) {
        btnProximoMes.addEventListener('click', function() {
            calendarioState.currentDate.setMonth(calendarioState.currentDate.getMonth() + 1);
            renderizarCalendario();
        });
    }
    
    // Ações do calendário
    const btnCancelar = document.getElementById('btnCalendarioCancelarDemo');
    const btnAplicar = document.getElementById('btnCalendarioAplicarDemo');
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', fecharCalendario);
    }
    
    if (btnAplicar) {
        btnAplicar.addEventListener('click', aplicarSelecaoCalendario);
    }
    
    // Botão Visualizar
    const btnVisualizar = document.getElementById('btnVisualizarDemo');
    if (btnVisualizar) {
        btnVisualizar.addEventListener('click', visualizarRelatorio);
    }
    
    // Botão Limpar
    const btnLimpar = document.getElementById('btnLimparDemo');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparFormulario);
    }
    
    // Fechar calendário ao clicar fora
    document.addEventListener('click', function(e) {
        const calendarioPopup = document.getElementById('calendarioPopupDemo');
        const periodoGroup = document.getElementById('periodoAnaliseDemo');
        
        if (calendarioPopup && calendarioPopup.classList.contains('active')) {
            if (!calendarioPopup.contains(e.target) && !periodoGroup.contains(e.target)) {
                fecharCalendario();
            }
        }
    });
}

function mostrarCalendario() {
    const calendarioPopup = document.getElementById('calendarioPopupDemo');
    if (calendarioPopup) {
        calendarioState.currentDate = new Date();
        renderizarCalendario();
        calendarioPopup.classList.add('active');
    }
}

function fecharCalendario() {
    const calendarioPopup = document.getElementById('calendarioPopupDemo');
    if (calendarioPopup) {
        calendarioPopup.classList.remove('active');
    }
}

function renderizarCalendario() {
    const mesAnoElement = document.getElementById('mesAnoAtualDemo');
    const diasContainer = document.getElementById('diasCalendarioDemo');
    
    if (!mesAnoElement || !diasContainer) return;
    
    const ano = calendarioState.currentDate.getFullYear();
    const mes = calendarioState.currentDate.getMonth();
    
    // Atualizar cabeçalho
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    mesAnoElement.textContent = `${meses[mes]} ${ano}`;
    
    // Limpar dias
    diasContainer.innerHTML = '';
    
    // Primeiro dia do mês
    const primeiroDia = new Date(ano, mes, 1);
    const diaSemana = primeiroDia.getDay();
    
    // Último dia do mês
    const ultimoDia = new Date(ano, mes + 1, 0);
    const totalDias = ultimoDia.getDate();
    
    // Dias do mês anterior
    const mesAnterior = new Date(ano, mes, 0);
    const diasMesAnterior = mesAnterior.getDate();
    
    for (let i = diaSemana - 1; i >= 0; i--) {
        const dia = diasMesAnterior - i;
        const diaElement = criarElementoDia(dia, true);
        diasContainer.appendChild(diaElement);
    }
    
    // Dias do mês atual
    const hoje = new Date();
    for (let dia = 1; dia <= totalDias; dia++) {
        const diaAtual = new Date(ano, mes, dia);
        const diaElement = criarElementoDia(dia, false);
        
        // Marcar hoje
        if (diaAtual.toDateString() === hoje.toDateString()) {
            diaElement.classList.add('hoje');
        }
        
        // Marcar selecionado
        if (calendarioState.selectedDate && 
            diaAtual.toDateString() === calendarioState.selectedDate.toDateString()) {
            diaElement.classList.add('selected');
        }
        
        diaElement.addEventListener('click', function() {
            // Remover seleção anterior
            diasContainer.querySelectorAll('.calendario-day').forEach(d => {
                d.classList.remove('selected');
            });
            
            // Adicionar nova seleção
            diaElement.classList.add('selected');
            calendarioState.selectedDate = new Date(ano, mes, dia);
        });
        
        diasContainer.appendChild(diaElement);
    }
    
    // Dias do próximo mês
    const diasRestantes = 42 - diasContainer.children.length;
    for (let dia = 1; dia <= diasRestantes; dia++) {
        const diaElement = criarElementoDia(dia, true);
        diasContainer.appendChild(diaElement);
    }
}

function criarElementoDia(dia, outroMes) {
    const diaElement = document.createElement('div');
    diaElement.className = 'calendario-day';
    if (outroMes) {
        diaElement.classList.add('other-month');
    }
    diaElement.textContent = dia;
    return diaElement;
}

function aplicarSelecaoCalendario() {
    if (calendarioState.selectedDate) {
        if (calendarioState.targetInput === 'periodo') {
            // Para período, aplicar a mesma data para início e fim
            calendarioState.dataInicio = new Date(calendarioState.selectedDate);
            calendarioState.dataFim = new Date(calendarioState.selectedDate);
            atualizarCamposPeriodo();
        }
    }
    fecharCalendario();
}

function atualizarCamposPeriodo() {
    const dataInicioInput = document.getElementById('dataInicioDemo');
    const dataFimInput = document.getElementById('dataFimDemo');
    
    if (dataInicioInput && calendarioState.dataInicio) {
        dataInicioInput.value = formatarData(calendarioState.dataInicio);
    }
    
    if (dataFimInput && calendarioState.dataFim) {
        dataFimInput.value = formatarData(calendarioState.dataFim);
    }
}

function formatarData(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function visualizarRelatorio() {
    // Coletar dados do formulário
    const apuracaoCusto = document.getElementById('apuracaoCustoDemo').value;
    const detalharGrupo = document.getElementById('detalharGrupo').checked;
    const detalharCentro = document.getElementById('detalharCentro').checked;
    const considerarCusto = document.getElementById('considerarCustoDemo').checked;
    
    const filtros = {
        dataInicio: calendarioState.dataInicio,
        dataFim: calendarioState.dataFim,
        apuracaoCusto: apuracaoCusto,
        detalharGrupo: detalharGrupo,
        detalharCentro: detalharCentro,
        considerarCusto: considerarCusto
    };
    
    console.log('📊 Visualizando relatório com filtros:', filtros);
    
    // Aqui você integraria com o Stimulsoft Reports
    // Não mostrar notificações/toasts ao clicar em Visualizar (apenas log)
    console.log('Gerando relatório (sem toast)...');

    // Simular carregamento do relatório
    setTimeout(() => {
        // Se o report-viewer estiver disponível, abrir
        if (window.reportViewer) {
            window.reportViewer.open('demonstrativo-resultados', filtros);
        } else {
            console.log('Relatório gerado (sem toast)');
        }
    }, 500);
}

function limparFormulario() {
    // Resetar para data de hoje
    const hoje = new Date();
    calendarioState.dataInicio = new Date(hoje);
    calendarioState.dataFim = new Date(hoje);
    atualizarCamposPeriodo();
    
    // Resetar select
    document.getElementById('apuracaoCustoDemo').value = 'cadastro';
    
    // Desmarcar checkboxes (exceto o último que vem marcado por padrão)
    document.getElementById('detalharGrupo').checked = false;
    document.getElementById('detalharCentro').checked = false;
    document.getElementById('considerarCustoDemo').checked = true;
    
    console.log('🧹 Formulário limpo');
    mostrarNotificacao('Formulário limpo', 'info');
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = 'notification';
    
    // Definir ícone e cor baseado no tipo
    let icone = 'fa-info-circle';
    let cor = 'var(--primary-color)';
    
    if (tipo === 'success') {
        icone = 'fa-check-circle';
        cor = 'var(--turquoise)';
    } else if (tipo === 'error') {
        icone = 'fa-exclamation-circle';
        cor = 'var(--red)';
    } else if (tipo === 'warning') {
        icone = 'fa-exclamation-triangle';
        cor = 'var(--orange)';
    }
    
    notificacao.innerHTML = `
        <i class="fas ${icone}" style="color: ${cor}; font-size: 20px;"></i>
        <span>${mensagem}</span>
    `;
    
    notificacao.style.backgroundColor = 'var(--bg-card)';
    notificacao.style.color = 'var(--text-primary)';
    notificacao.style.border = `1px solid ${cor}`;
    
    document.body.appendChild(notificacao);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notificacao.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notificacao);
        }, 300);
    }, 3000);
}

// Animação de saída para notificação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
