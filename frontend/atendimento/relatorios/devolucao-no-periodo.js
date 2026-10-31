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
    
    // Inicializar funcionalidades do relatório de devolução
    inicializarRelatorioDevolucao();
});

// ========================================
// FUNCIONALIDADES DO RELATÓRIO DE DEVOLUÇÃO NO PERÍODO
// ========================================

function inicializarRelatorioDevolucao() {
    console.log('🚀 Inicializando funcionalidades do Relatório de Devolução no Período');
    
    // Configurar eventos dos botões
    configurarBotoesRelatorio();
    
    // Configurar calendário personalizado
    inicializarCalendarioPersonalizado();
    
    // Configurar data padrão
    configurarDataPadrao();
    
    // Configurar checkbox
    configurarCheckbox();
}

function configurarBotoesRelatorio() {
    const btnVisualizar = document.getElementById('btnVisualizar');
    const btnLimpar = document.getElementById('btnLimpar');
    
    if (btnVisualizar) {
        btnVisualizar.addEventListener('click', function() {
            console.log('📊 Botão Visualizar clicado');
            visualizarRelatorio();
        });
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            console.log('🧹 Botão Limpar clicado');
            limparFiltros();
        });
    }
}

function configurarCheckbox() {
    const listarProdutos = document.getElementById('listarProdutos');
    
    if (listarProdutos) {
        listarProdutos.addEventListener('change', function() {
            console.log('☑️ Checkbox Listar Produtos:', this.checked ? 'marcado' : 'desmarcado');
        });
    }
}

function configurarDataPadrao() {
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    
    if (dataInicio && dataFim) {
        const hoje = new Date();
        const dataFormatada = formatarData(hoje);
        dataInicio.value = dataFormatada;
        dataFim.value = dataFormatada;
    }
}

// ========================================
// CALENDÁRIO PERSONALIZADO (MESMO DO RELATÓRIO DE VENDAS)
// ========================================

let calendarioAtual = {
    mes: new Date().getMonth(),
    ano: new Date().getFullYear(),
    dataInicio: null,
    dataFim: null,
    selecionandoInicio: true
};

function inicializarCalendarioPersonalizado() {
    console.log('📅 Inicializando calendário personalizado');
    
    const periodoEmissao = document.getElementById('periodoEmissao');
    const calendarioPopup = document.getElementById('calendarioPopup');
    
    if (periodoEmissao && calendarioPopup) {
        // Abrir calendário ao clicar no período
        periodoEmissao.addEventListener('click', function(e) {
            e.stopPropagation();
            abrirCalendario();
        });
        
        // Fechar calendário ao clicar fora
        document.addEventListener('click', function(e) {
            if (!calendarioPopup.contains(e.target) && !periodoEmissao.contains(e.target)) {
                fecharCalendario();
            }
        });
        
        // Configurar navegação do calendário
        configurarNavegacaoCalendario();
        
        // Configurar botões do calendário
        configurarBotoesCalendario();
        
        // Gerar calendário inicial
        gerarCalendario();
    }
}

function configurarNavegacaoCalendario() {
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnProximoMes = document.getElementById('btnProximoMes');
    
    if (btnMesAnterior) {
        btnMesAnterior.addEventListener('click', function() {
            calendarioAtual.mes--;
            if (calendarioAtual.mes < 0) {
                calendarioAtual.mes = 11;
                calendarioAtual.ano--;
            }
            gerarCalendario();
        });
    }
    
    if (btnProximoMes) {
        btnProximoMes.addEventListener('click', function() {
            calendarioAtual.mes++;
            if (calendarioAtual.mes > 11) {
                calendarioAtual.mes = 0;
                calendarioAtual.ano++;
            }
            gerarCalendario();
        });
    }
}

function configurarBotoesCalendario() {
    const btnCancelar = document.getElementById('btnCalendarioCancelar');
    const btnAplicar = document.getElementById('btnCalendarioAplicar');
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            fecharCalendario();
        });
    }
    
    if (btnAplicar) {
        btnAplicar.addEventListener('click', function() {
            aplicarDatasCalendario();
        });
    }
}

function abrirCalendario() {
    const calendarioPopup = document.getElementById('calendarioPopup');
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    
    // Carregar datas atuais
    if (dataInicio.value) {
        calendarioAtual.dataInicio = parseData(dataInicio.value);
    }
    if (dataFim.value) {
        calendarioAtual.dataFim = parseData(dataFim.value);
    }
    
    calendarioAtual.selecionandoInicio = true;
    
    if (calendarioPopup) {
        calendarioPopup.classList.add('show');
        gerarCalendario();
    }
}

function fecharCalendario() {
    const calendarioPopup = document.getElementById('calendarioPopup');
    if (calendarioPopup) {
        calendarioPopup.classList.remove('show');
    }
}

function gerarCalendario() {
    const mesAnoElement = document.getElementById('mesAnoAtual');
    const diasCalendario = document.getElementById('diasCalendario');
    
    if (!mesAnoElement || !diasCalendario) return;
    
    // Atualizar header
    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    mesAnoElement.textContent = `${nomesMeses[calendarioAtual.mes]} ${calendarioAtual.ano}`;
    
    // Limpar dias
    diasCalendario.innerHTML = '';
    
    // Primeiro dia do mês
    const primeiroDia = new Date(calendarioAtual.ano, calendarioAtual.mes, 1);
    const ultimoDia = new Date(calendarioAtual.ano, calendarioAtual.mes + 1, 0);
    
    // Dias da semana anterior
    const diasAnterior = primeiroDia.getDay();
    const mesAnterior = new Date(calendarioAtual.ano, calendarioAtual.mes, 0);
    
    for (let i = diasAnterior - 1; i >= 0; i--) {
        const dia = mesAnterior.getDate() - i;
        criarDiaCalendario(dia, true, calendarioAtual.mes - 1, calendarioAtual.ano);
    }
    
    // Dias do mês atual
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        criarDiaCalendario(dia, false, calendarioAtual.mes, calendarioAtual.ano);
    }
    
    // Dias do próximo mês
    const diasRestantes = 42 - (diasAnterior + ultimoDia.getDate());
    for (let dia = 1; dia <= diasRestantes; dia++) {
        criarDiaCalendario(dia, true, calendarioAtual.mes + 1, calendarioAtual.ano);
    }
}

function criarDiaCalendario(numeroDia, outroMes, mes, ano) {
    const diasCalendario = document.getElementById('diasCalendario');
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
    if (calendarioAtual.dataInicio && datasSaoIguais(dataAtual, calendarioAtual.dataInicio)) {
        diaElement.classList.add('inicio-periodo');
    }
    
    if (calendarioAtual.dataFim && datasSaoIguais(dataAtual, calendarioAtual.dataFim)) {
        diaElement.classList.add('fim-periodo');
    }
    
    // Destacar período
    if (calendarioAtual.dataInicio && calendarioAtual.dataFim && 
        dataAtual > calendarioAtual.dataInicio && dataAtual < calendarioAtual.dataFim) {
        diaElement.classList.add('periodo-range');
    }
    
    // Evento de clique
    diaElement.addEventListener('click', function() {
        selecionarDataCalendario(dataAtual);
    });
    
    diasCalendario.appendChild(diaElement);
}

function selecionarDataCalendario(data) {
    if (calendarioAtual.selecionandoInicio) {
        calendarioAtual.dataInicio = new Date(data);
        calendarioAtual.dataFim = null;
        calendarioAtual.selecionandoInicio = false;
    } else {
        if (data < calendarioAtual.dataInicio) {
            // Se a data final for anterior à inicial, trocar
            calendarioAtual.dataFim = calendarioAtual.dataInicio;
            calendarioAtual.dataInicio = new Date(data);
        } else {
            calendarioAtual.dataFim = new Date(data);
        }
        calendarioAtual.selecionandoInicio = true;
    }
    
    gerarCalendario();
}

function aplicarDatasCalendario() {
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    
    if (calendarioAtual.dataInicio && dataInicio) {
        dataInicio.value = formatarData(calendarioAtual.dataInicio);
    }
    
    if (calendarioAtual.dataFim && dataFim) {
        dataFim.value = formatarData(calendarioAtual.dataFim);
    } else if (calendarioAtual.dataInicio && dataFim) {
        // Se só uma data foi selecionada, usar como início e fim
        dataFim.value = formatarData(calendarioAtual.dataInicio);
    }
    
    fecharCalendario();
    mostrarNotificacao('Período selecionado com sucesso!', 'success');
}

function visualizarRelatorio() {
    // Coletar dados dos filtros
    const filtros = coletarFiltros();
    
    console.log('📊 Gerando relatório de devolução com filtros:', filtros);
    
    // Validar período
    if (!filtros.dataInicio || !filtros.dataFim) {
        mostrarNotificacao('Por favor, selecione o período de emissão.', 'warning');
        return;
    }
    
    // Converter datas para comparação
    const dataInicioObj = parseData(filtros.dataInicio);
    const dataFimObj = parseData(filtros.dataFim);
    
    if (dataInicioObj > dataFimObj) {
        mostrarNotificacao('A data de início não pode ser maior que a data final.', 'error');
        return;
    }
    
    // Simular processamento
    mostrarNotificacao('Gerando relatório de devolução...', 'info');
    
    setTimeout(() => {
        mostrarNotificacao('Relatório de devolução gerado com sucesso!', 'success');
        processarRelatorioDevolucao(filtros);
    }, 1500);
}

function coletarFiltros() {
    return {
        dataInicio: document.getElementById('dataInicio')?.value,
        dataFim: document.getElementById('dataFim')?.value,
        numeroCaixa: document.getElementById('numeroCaixa')?.value,
        listarProdutos: document.getElementById('listarProdutos')?.checked
    };
}

function limparFiltros() {
    console.log('🧹 Limpando todos os filtros do relatório de devolução');
    
    // Limpar campos de texto
    const numeroCaixa = document.getElementById('numeroCaixa');
    if (numeroCaixa) numeroCaixa.value = '';
    
    // Desmarcar checkbox
    const listarProdutos = document.getElementById('listarProdutos');
    if (listarProdutos) listarProdutos.checked = false;
    
    // Manter data atual
    configurarDataPadrao();
    
    mostrarNotificacao('Filtros limpos com sucesso!', 'success');
}

function processarRelatorioDevolucao(filtros) {
    // Aqui você faria a integração com o backend
    console.log('🔄 Processando relatório de devolução no backend...', filtros);
    
    // Simulação de dados de exemplo
    const dadosRelatorio = {
        periodo: `${filtros.dataInicio} à ${filtros.dataFim}`,
        totalDevolucoes: 3,
        valorTotal: -850.90,
        itens: [
            { produto: 'Ração Premium', quantidade: -2, valor: -180.00, motivo: 'Produto vencido' },
            { produto: 'Shampoo Pet', quantidade: -1, valor: -29.90, motivo: 'Defeito de fabricação' },
            { produto: 'Brinquedo', quantidade: -5, valor: -641.00, motivo: 'Insatisfação do cliente' }
        ]
    };
    
    console.log('📈 Dados do relatório de devolução:', dadosRelatorio);
}

// Funções utilitárias (iguais ao relatório de vendas)
function formatarData(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function parseData(dataString) {
    const partes = dataString.split('/');
    if (partes.length === 3) {
        return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    }
    return new Date();
}

function datasSaoIguais(data1, data2) {
    return data1.getDate() === data2.getDate() &&
           data1.getMonth() === data2.getMonth() &&
           data1.getFullYear() === data2.getFullYear();
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remove notificação existente se houver
    const existente = document.querySelector('.notification');
    if (existente) {
        existente.remove();
    }
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // Definir cor baseada no tipo
    const cores = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.background = cores[tipo] || cores.info;
    notification.style.color = 'white';
    
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
    
    document.body.appendChild(notification);
    
    // Remover após 4 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

console.log('✅ Funcionalidades do Relatório de Devolução no Período carregadas');
