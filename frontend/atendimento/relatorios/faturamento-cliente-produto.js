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
    
    // Inicializar funcionalidades do relatório
    inicializarRelatorioFaturamento();
});

// ========================================
// FUNCIONALIDADES DO RELATÓRIO DE FATURAMENTO CLIENTE/PRODUTO
// ========================================

function inicializarRelatorioFaturamento() {
    console.log('🚀 Inicializando funcionalidades do Relatório de Faturamento Cliente/Produto');
    
    // Configurar data padrão
    configurarDataPadraoFaturamento();
    
    // Configurar eventos dos botões
    configurarBotoesFaturamento();
    
    // Configurar calendário
    inicializarCalendarioFaturamento();
    
    // Configurar filtros e checkboxes
    configurarFiltrosFaturamento();
    
    // Configurar checkboxes de grupo
    configurarCheckboxesGrupo();
}

function configurarDataPadraoFaturamento() {
    const dataInicioEmissao = document.getElementById('dataInicioEmissao');
    const dataFimEmissao = document.getElementById('dataFimEmissao');
    
    if (dataInicioEmissao && dataFimEmissao) {
        const hoje = new Date();
        const dataFormatada = formatarDataFaturamento(hoje);
        dataInicioEmissao.value = dataFormatada;
        dataFimEmissao.value = dataFormatada;
    }
}

function configurarBotoesFaturamento() {
    const btnVisualizar = document.getElementById('btnVisualizarFaturamento');
    const btnLimpar = document.getElementById('btnLimparFaturamento');
    
    if (btnVisualizar) {
        btnVisualizar.addEventListener('click', function() {
            console.log('📊 Botão Visualizar Faturamento clicado');
            visualizarRelatorioFaturamento();
        });
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            console.log('🧹 Botão Limpar Faturamento clicado');
            limparFiltrosFaturamento();
        });
    }
}

function configurarFiltrosFaturamento() {
    // Configurar eventos de mudança nos filtros
    const filtros = ['filtroCliente', 'filtroProduto', 'agruparPor'];
    
    filtros.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.addEventListener('change', function() {
                console.log(`🔍 Filtro ${filtroId} alterado:`, this.value);
            });
        }
    });
    
    // Configurar autocomplete no campo produto
    const produtoInput = document.getElementById('filtroProduto');
    if (produtoInput) {
        produtoInput.addEventListener('input', function() {
            const valor = this.value;
            if (valor.length >= 2) {
                console.log('🔍 Pesquisando produtos com:', valor);
                // Aqui você pode implementar a busca de produtos
            }
        });
    }
}

function configurarCheckboxesGrupo() {
    // Configurar checkboxes "Todos" para Tipo do Item
    const tipoTodos = document.getElementById('tipoTodos');
    const tipoCheckboxes = ['tipoProduto', 'tipoServico', 'tipoPlano'];
    
    if (tipoTodos) {
        tipoTodos.addEventListener('change', function() {
            const marcado = this.checked;
            tipoCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = marcado;
                }
            });
            console.log('📋 Tipo "Todos" alterado:', marcado);
        });
    }
    
    // Configurar checkboxes individuais de tipo
    tipoCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                if (!this.checked && tipoTodos) {
                    tipoTodos.checked = false;
                }
                verificarTodosTipos();
            });
        }
    });
    
    // Configurar checkboxes "Todos" para Formas de Pagamento
    const pagamentoTodos = document.getElementById('pagamentoTodos');
    const pagamentoCheckboxes = ['pagamentoDinheiro', 'pagamentoCredito', 'pagamentoCrediario', 'pagamentoCheque', 'pagamentoHaver'];
    
    if (pagamentoTodos) {
        pagamentoTodos.addEventListener('change', function() {
            const marcado = this.checked;
            pagamentoCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = marcado;
                }
            });
            console.log('💳 Pagamento "Todos" alterado:', marcado);
        });
    }
    
    // Configurar checkboxes individuais de pagamento
    pagamentoCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                if (!this.checked && pagamentoTodos) {
                    pagamentoTodos.checked = false;
                }
                verificarTodosPagamentos();
            });
        }
    });
}

function verificarTodosTipos() {
    const tipoTodos = document.getElementById('tipoTodos');
    const tipoCheckboxes = ['tipoProduto', 'tipoServico', 'tipoPlano'];
    
    if (tipoTodos) {
        const todosMarcados = tipoCheckboxes.every(id => {
            const checkbox = document.getElementById(id);
            return checkbox && checkbox.checked;
        });
        tipoTodos.checked = todosMarcados;
    }
}

function verificarTodosPagamentos() {
    const pagamentoTodos = document.getElementById('pagamentoTodos');
    const pagamentoCheckboxes = ['pagamentoDinheiro', 'pagamentoCredito', 'pagamentoCrediario', 'pagamentoCheque', 'pagamentoHaver'];
    
    if (pagamentoTodos) {
        const todosMarcados = pagamentoCheckboxes.every(id => {
            const checkbox = document.getElementById(id);
            return checkbox && checkbox.checked;
        });
        pagamentoTodos.checked = todosMarcados;
    }
}

// ========================================
// CALENDÁRIO PERSONALIZADO PARA FATURAMENTO
// ========================================

let calendarioFaturamento = {
    mes: new Date().getMonth(),
    ano: new Date().getFullYear(),
    dataInicio: null,
    dataFim: null,
    selecionandoInicio: true
};

function inicializarCalendarioFaturamento() {
    console.log('📅 Inicializando calendário do faturamento');
    
    const periodoEmissao = document.getElementById('periodoEmissao');
    const calendarioPopup = document.getElementById('calendarioPopupFaturamento');
    
    if (periodoEmissao && calendarioPopup) {
        // Abrir calendário ao clicar no período
        periodoEmissao.addEventListener('click', function(e) {
            e.stopPropagation();
            abrirCalendarioFaturamento();
        });
        
        // Fechar calendário ao clicar fora
        document.addEventListener('click', function(e) {
            if (!calendarioPopup.contains(e.target) && !periodoEmissao.contains(e.target)) {
                fecharCalendarioFaturamento();
            }
        });
        
        // Configurar navegação do calendário
        configurarNavegacaoCalendarioFaturamento();
        
        // Configurar botões do calendário
        configurarBotoesCalendarioFaturamento();
        
        // Gerar calendário inicial
        gerarCalendarioFaturamento();
    }
}

function configurarNavegacaoCalendarioFaturamento() {
    const btnMesAnterior = document.getElementById('btnMesAnteriorFaturamento');
    const btnProximoMes = document.getElementById('btnProximoMesFaturamento');
    
    if (btnMesAnterior) {
        btnMesAnterior.addEventListener('click', function() {
            calendarioFaturamento.mes--;
            if (calendarioFaturamento.mes < 0) {
                calendarioFaturamento.mes = 11;
                calendarioFaturamento.ano--;
            }
            gerarCalendarioFaturamento();
        });
    }
    
    if (btnProximoMes) {
        btnProximoMes.addEventListener('click', function() {
            calendarioFaturamento.mes++;
            if (calendarioFaturamento.mes > 11) {
                calendarioFaturamento.mes = 0;
                calendarioFaturamento.ano++;
            }
            gerarCalendarioFaturamento();
        });
    }
}

function configurarBotoesCalendarioFaturamento() {
    const btnCancelar = document.getElementById('btnCalendarioCancelarFaturamento');
    const btnAplicar = document.getElementById('btnCalendarioAplicarFaturamento');
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            fecharCalendarioFaturamento();
        });
    }
    
    if (btnAplicar) {
        btnAplicar.addEventListener('click', function() {
            aplicarDatasCalendarioFaturamento();
        });
    }
}

function abrirCalendarioFaturamento() {
    const calendarioPopup = document.getElementById('calendarioPopupFaturamento');
    const dataInicio = document.getElementById('dataInicioEmissao');
    const dataFim = document.getElementById('dataFimEmissao');
    
    // Carregar datas atuais
    if (dataInicio.value) {
        calendarioFaturamento.dataInicio = parseDataFaturamento(dataInicio.value);
    }
    if (dataFim.value) {
        calendarioFaturamento.dataFim = parseDataFaturamento(dataFim.value);
    }
    
    calendarioFaturamento.selecionandoInicio = true;
    
    if (calendarioPopup) {
        calendarioPopup.classList.add('show');
        gerarCalendarioFaturamento();
    }
}

function fecharCalendarioFaturamento() {
    const calendarioPopup = document.getElementById('calendarioPopupFaturamento');
    if (calendarioPopup) {
        calendarioPopup.classList.remove('show');
    }
}

function gerarCalendarioFaturamento() {
    const mesAnoElement = document.getElementById('mesAnoAtualFaturamento');
    const diasCalendario = document.getElementById('diasCalendarioFaturamento');
    
    if (!mesAnoElement || !diasCalendario) return;
    
    // Atualizar header
    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    mesAnoElement.textContent = `${nomesMeses[calendarioFaturamento.mes]} ${calendarioFaturamento.ano}`;
    
    // Limpar dias
    diasCalendario.innerHTML = '';
    
    // Primeiro dia do mês
    const primeiroDia = new Date(calendarioFaturamento.ano, calendarioFaturamento.mes, 1);
    const ultimoDia = new Date(calendarioFaturamento.ano, calendarioFaturamento.mes + 1, 0);
    
    // Dias da semana anterior
    const diasAnterior = primeiroDia.getDay();
    const mesAnterior = new Date(calendarioFaturamento.ano, calendarioFaturamento.mes, 0);
    
    for (let i = diasAnterior - 1; i >= 0; i--) {
        const dia = mesAnterior.getDate() - i;
        criarDiaCalendarioFaturamento(dia, true, calendarioFaturamento.mes - 1, calendarioFaturamento.ano);
    }
    
    // Dias do mês atual
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        criarDiaCalendarioFaturamento(dia, false, calendarioFaturamento.mes, calendarioFaturamento.ano);
    }
    
    // Dias do próximo mês
    const diasRestantes = 42 - (diasAnterior + ultimoDia.getDate());
    for (let dia = 1; dia <= diasRestantes; dia++) {
        criarDiaCalendarioFaturamento(dia, true, calendarioFaturamento.mes + 1, calendarioFaturamento.ano);
    }
}

function criarDiaCalendarioFaturamento(numeroDia, outroMes, mes, ano) {
    const diasCalendario = document.getElementById('diasCalendarioFaturamento');
    const diaElement = document.createElement('div');
    diaElement.className = 'dia';
    diaElement.textContent = numeroDia;
    
    // Ajustar ano se necessário
    let anoAjustado = ano;
    if (mes < 0) {
        mes = 11;
        anoAjustado--;
    } else if (mes > 11) {
        mes = 0;
        anoAjustado++;
    }
    
    const dataAtual = new Date(anoAjustado, mes, numeroDia);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (outroMes) {
        diaElement.classList.add('outros-mes');
    }
    
    // Destacar hoje
    if (dataAtual.getTime() === hoje.getTime() && !outroMes) {
        diaElement.classList.add('hoje');
    }
    
    // Destacar datas selecionadas
    if (calendarioFaturamento.dataInicio && datasSaoIguaisFaturamento(dataAtual, calendarioFaturamento.dataInicio)) {
        diaElement.classList.add('inicio-periodo');
    }
    
    if (calendarioFaturamento.dataFim && datasSaoIguaisFaturamento(dataAtual, calendarioFaturamento.dataFim)) {
        diaElement.classList.add('fim-periodo');
    }
    
    // Destacar período
    if (calendarioFaturamento.dataInicio && calendarioFaturamento.dataFim && 
        dataAtual > calendarioFaturamento.dataInicio && dataAtual < calendarioFaturamento.dataFim) {
        diaElement.classList.add('periodo-range');
    }
    
    // Evento de clique
    diaElement.addEventListener('click', function() {
        selecionarDataCalendarioFaturamento(dataAtual);
    });
    
    diasCalendario.appendChild(diaElement);
}

function selecionarDataCalendarioFaturamento(data) {
    if (calendarioFaturamento.selecionandoInicio) {
        calendarioFaturamento.dataInicio = new Date(data);
        calendarioFaturamento.dataFim = null;
        calendarioFaturamento.selecionandoInicio = false;
    } else {
        if (data < calendarioFaturamento.dataInicio) {
            // Se a data final for anterior à inicial, trocar
            calendarioFaturamento.dataFim = calendarioFaturamento.dataInicio;
            calendarioFaturamento.dataInicio = new Date(data);
        } else {
            calendarioFaturamento.dataFim = new Date(data);
        }
        calendarioFaturamento.selecionandoInicio = true;
    }
    
    gerarCalendarioFaturamento();
}

function aplicarDatasCalendarioFaturamento() {
    const dataInicio = document.getElementById('dataInicioEmissao');
    const dataFim = document.getElementById('dataFimEmissao');
    
    if (calendarioFaturamento.dataInicio && dataInicio) {
        dataInicio.value = formatarDataFaturamento(calendarioFaturamento.dataInicio);
    }
    
    if (calendarioFaturamento.dataFim && dataFim) {
        dataFim.value = formatarDataFaturamento(calendarioFaturamento.dataFim);
    } else if (calendarioFaturamento.dataInicio && dataFim) {
        // Se só uma data foi selecionada, usar como início e fim
        dataFim.value = formatarDataFaturamento(calendarioFaturamento.dataInicio);
    }
    
    fecharCalendarioFaturamento();
    mostrarNotificacaoFaturamento('Período selecionado com sucesso!', 'success');
}

function visualizarRelatorioFaturamento() {
    // Coletar dados dos filtros
    const filtros = coletarFiltrosFaturamento();
    
    console.log('📊 Gerando relatório de faturamento cliente/produto com filtros:', filtros);
    
    // Validar período
    if (!filtros.dataInicioEmissao || !filtros.dataFimEmissao) {
        mostrarNotificacaoFaturamento('Por favor, selecione o período de emissão.', 'warning');
        return;
    }
    
    // Converter datas para comparação
    const dataInicioObj = parseDataFaturamento(filtros.dataInicioEmissao);
    const dataFimObj = parseDataFaturamento(filtros.dataFimEmissao);
    
    if (dataInicioObj > dataFimObj) {
        mostrarNotificacaoFaturamento('A data de início não pode ser maior que a data final.', 'error');
        return;
    }
    
    // Simular processamento
    mostrarNotificacaoFaturamento('Gerando relatório de faturamento...', 'info');
    
    setTimeout(() => {
        mostrarNotificacaoFaturamento('Relatório de faturamento gerado com sucesso!', 'success');
        processarRelatorioFaturamento(filtros);
    }, 1500);
}

function coletarFiltrosFaturamento() {
    // Coletar checkboxes de tipo
    const tiposItem = [];
    const checkboxesTipo = ['tipoProduto', 'tipoServico', 'tipoPlano'];
    checkboxesTipo.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            tiposItem.push(id.replace('tipo', '').toLowerCase());
        }
    });
    
    // Coletar checkboxes de pagamento
    const formasPagamento = [];
    const checkboxesPagamento = ['pagamentoDinheiro', 'pagamentoCredito', 'pagamentoCrediario', 'pagamentoCheque', 'pagamentoHaver'];
    checkboxesPagamento.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            formasPagamento.push(id.replace('pagamento', '').toLowerCase());
        }
    });
    
    return {
        dataInicioEmissao: document.getElementById('dataInicioEmissao')?.value,
        dataFimEmissao: document.getElementById('dataFimEmissao')?.value,
        agruparPor: document.getElementById('agruparPor')?.value,
        detalharDados: document.getElementById('detalharDados')?.checked,
        filtroCliente: document.getElementById('filtroCliente')?.value,
        filtroProduto: document.getElementById('filtroProduto')?.value,
        tiposItem: tiposItem,
        formasPagamento: formasPagamento
    };
}

function limparFiltrosFaturamento() {
    console.log('🧹 Limpando todos os filtros do relatório de faturamento');
    
    // Limpar campo de produto
    const filtroProduto = document.getElementById('filtroProduto');
    if (filtroProduto) filtroProduto.value = '';
    
    // Resetar selects para primeira opção
    const selects = ['filtroCliente', 'agruparPor'];
    selects.forEach(select => {
        const elemento = document.getElementById(select);
        if (elemento) elemento.selectedIndex = 0;
    });
    
    // Desmarcar checkbox de detalhar dados
    const detalharDados = document.getElementById('detalharDados');
    if (detalharDados) detalharDados.checked = false;
    
    // Marcar "Todos" nos grupos de checkbox
    const tipoTodos = document.getElementById('tipoTodos');
    if (tipoTodos) tipoTodos.checked = true;
    
    const pagamentoTodos = document.getElementById('pagamentoTodos');
    if (pagamentoTodos) pagamentoTodos.checked = true;
    
    // Desmarcar checkboxes individuais
    const todosCheckboxes = [
        'tipoProduto', 'tipoServico', 'tipoPlano',
        'pagamentoDinheiro', 'pagamentoCredito', 'pagamentoCrediario', 'pagamentoCheque', 'pagamentoHaver'
    ];
    
    todosCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
    
    // Manter data atual
    configurarDataPadraoFaturamento();
    
    mostrarNotificacaoFaturamento('Filtros limpos com sucesso!', 'success');
}

function processarRelatorioFaturamento(filtros) {
    // Aqui você faria a integração com o backend
    console.log('🔄 Processando relatório de faturamento no backend...', filtros);
    
    // Simulação de dados de exemplo
    const dadosRelatorio = {
        periodo: `${filtros.dataInicioEmissao} à ${filtros.dataFimEmissao}`,
        agrupadoPor: filtros.agruparPor,
        totalFaturamento: 25750.00,
        totalItens: 156,
        ticketMedio: 165.06,
        faturamento: [
            { 
                data: '06/11/2025',
                cliente: 'João Silva', 
                produto: 'Consulta Veterinária',
                quantidade: 1,
                valorUnitario: 120.00,
                valorTotal: 120.00,
                formaPagamento: 'Dinheiro'
            },
            { 
                data: '06/11/2025',
                cliente: 'Maria Santos', 
                produto: 'Vacina V10',
                quantidade: 2,
                valorUnitario: 85.00,
                valorTotal: 170.00,
                formaPagamento: 'Cartão de Crédito'
            }
        ]
    };
    
    console.log('📈 Dados do relatório de faturamento:', dadosRelatorio);
}

// Funções utilitárias específicas do faturamento
function formatarDataFaturamento(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function parseDataFaturamento(dataString) {
    const partes = dataString.split('/');
    if (partes.length === 3) {
        return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    }
    return new Date();
}

function datasSaoIguaisFaturamento(data1, data2) {
    return data1.getDate() === data2.getDate() &&
           data1.getMonth() === data2.getMonth() &&
           data1.getFullYear() === data2.getFullYear();
}

function mostrarNotificacaoFaturamento(mensagem, tipo = 'info') {
    // Remove notificação existente se houver
    const existente = document.querySelector('.notification-faturamento');
    if (existente) {
        existente.remove();
    }
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = 'notification-faturamento';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transform: translateX(100px);
        animation: slideInRight 0.3s ease forwards, slideOutRight 0.3s ease 3.7s forwards;
    `;
    
    // Definir cor baseada no tipo
    const cores = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.background = cores[tipo] || cores.info;
    
    // Adicionar ícone baseado no tipo
    const icones = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <span style="font-size: 16px;">${icones[tipo] || icones.info}</span>
        <span>${mensagem}</span>
    `;
    
    // Adicionar estilos de animação se não existirem
    if (!document.querySelector('#notification-styles-faturamento')) {
        const style = document.createElement('style');
        style.id = 'notification-styles-faturamento';
        style.textContent = `
            @keyframes slideInRight {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOutRight {
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remover após 4 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

console.log('✅ Funcionalidades do Relatório de Faturamento Cliente/Produto carregadas');
