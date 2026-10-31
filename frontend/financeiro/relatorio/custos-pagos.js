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

// ==========================================
// CUSTOS PAGOS - FUNCIONALIDADES
// ==========================================

// Configuração inicial do formulário
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Custos Pagos - Inicializando...');
    
    // Configurar data atual no período
    configurarPeriodoAtual();
    
    // Configurar tipo de impressão padrão
    configurarTipoImpressaoPadrao();
    
    // Configurar event listeners
    configurarEventListenersCustosPagos();
    
    console.log('✅ Custos Pagos - Inicializado com sucesso');
});

function configurarPeriodoAtual() {
    const campoPeriodo = document.getElementById('periodoAnalise');
    if (campoPeriodo) {
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR');
        campoPeriodo.value = `${dataFormatada} - ${dataFormatada}`;
    }
}

function configurarTipoImpressaoPadrao() {
    const selectTipoImpressao = document.getElementById('tipoImpressao');
    if (selectTipoImpressao) {
        selectTipoImpressao.value = 'resumido';
    }
}

function configurarEventListenersCustosPagos() {
    // Botão Visualizar
    const btnVisualizar = document.querySelector('.btn-visualizar');
    if (btnVisualizar) {
        btnVisualizar.addEventListener('click', function(e) {
            e.preventDefault();
            visualizarRelatorioCustosPagos();
        });
    }
    
    // Botão Limpar
    const btnLimpar = document.querySelector('.btn-limpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function(e) {
            e.preventDefault();
            limparFormularioCustosPagos();
        });
    }
    
    // Validação em tempo real dos campos
    const campos = ['tipoImpressao', 'tipoDocumento', 'profissionalFornecedor', 'centroResultado', 'categoria'];
    campos.forEach(fieldId => {
        const campo = document.getElementById(fieldId);
        if (campo) {
            campo.addEventListener('change', function() {
                validarCampoCustosPagos(this);
            });
        }
    });
}

function validarCampoCustosPagos(campo) {
    const grupo = campo.closest('.form-group');
    if (!grupo) return;
    
    // Remover classes de validação anteriores
    grupo.classList.remove('error', 'success');
    
    // Remover mensagens de erro anteriores
    const mensagemErro = grupo.querySelector('.error-message');
    if (mensagemErro) {
        mensagemErro.remove();
    }
    
    // Validar se necessário (campos opcionais, apenas "Todos" por padrão)
    if (campo.value && campo.value !== 'todos') {
        grupo.classList.add('success');
    }
}

function coletarDadosFormularioCustosPagos() {
    const dados = {
        periodoAnalise: document.getElementById('periodoAnalise')?.value || '',
        tipoImpressao: document.getElementById('tipoImpressao')?.value || 'resumido',
        tipoDocumento: document.getElementById('tipoDocumento')?.value || 'todos',
        profissionalFornecedor: document.getElementById('profissionalFornecedor')?.value || 'todos',
        centroResultado: document.getElementById('centroResultado')?.value || 'todos',
        categoria: document.getElementById('categoria')?.value || 'todos'
    };
    
    console.log('📊 Dados coletados do formulário de Custos Pagos:', dados);
    return dados;
}

function validarFormularioCustosPagos() {
    const dados = coletarDadosFormularioCustosPagos();
    const erros = [];
    
    // Validação do período (obrigatório)
    if (!dados.periodoAnalise.trim()) {
        erros.push('Período de análise é obrigatório');
        marcarCampoComErroCustosPagos('periodoAnalise', 'Período de análise é obrigatório');
    }
    
    // Outros campos são opcionais, apenas verificar se são válidos
    const camposSelect = ['tipoImpressao', 'tipoDocumento', 'profissionalFornecedor', 'centroResultado', 'categoria'];
    camposSelect.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento && !elemento.value) {
            if (campo === 'tipoImpressao') {
                elemento.value = 'resumido'; // Definir valor padrão
            } else {
                elemento.value = 'todos'; // Definir valor padrão
            }
        }
    });
    
    if (erros.length > 0) {
        console.error('❌ Erros de validação:', erros);
        return false;
    }
    
    console.log('✅ Formulário válido');
    return true;
}

function marcarCampoComErroCustosPagos(fieldId, mensagem) {
    const campo = document.getElementById(fieldId);
    if (!campo) return;
    
    const grupo = campo.closest('.form-group');
    if (!grupo) return;
    
    grupo.classList.add('error');
    
    // Remover mensagem de erro anterior
    const mensagemExistente = grupo.querySelector('.error-message');
    if (mensagemExistente) {
        mensagemExistente.remove();
    }
    
    // Adicionar nova mensagem de erro
    const mensagemErro = document.createElement('div');
    mensagemErro.className = 'error-message';
    mensagemErro.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensagem}`;
    grupo.appendChild(mensagemErro);
}

function limparFormularioCustosPagos() {
    console.log('🧹 Limpando formulário de Custos Pagos...');
    
    // Limpar campos select (voltar para "Todos")
    const camposSelect = ['tipoDocumento', 'profissionalFornecedor', 'centroResultado', 'categoria'];
    camposSelect.forEach(fieldId => {
        const campo = document.getElementById(fieldId);
        if (campo) {
            campo.value = 'todos';
        }
    });
    
    // Resetar tipo de impressão para "Resumido"
    const tipoImpressao = document.getElementById('tipoImpressao');
    if (tipoImpressao) {
        tipoImpressao.value = 'resumido';
    }
    
    // Manter período atual (não limpar)
    configurarPeriodoAtual();
    
    // Limpar estados de validação
    limparEstadosValidacaoCustosPagos();
    
    console.log('✅ Formulário limpo com sucesso');
    
    // Mostrar notificação
    mostrarNotificacaoCustosPagos('Formulário limpo com sucesso', 'success');
}

function limparEstadosValidacaoCustosPagos() {
    const grupos = document.querySelectorAll('.form-group');
    grupos.forEach(grupo => {
        grupo.classList.remove('error', 'success');
        const mensagemErro = grupo.querySelector('.error-message');
        if (mensagemErro) {
            mensagemErro.remove();
        }
    });
}

function visualizarRelatorioCustosPagos() {
    console.log('📊 Gerando relatório de custos pagos...');
    
    // Validar formulário
    if (!validarFormularioCustosPagos()) {
        mostrarNotificacaoCustosPagos('Por favor, corrija os erros no formulário', 'error');
        return;
    }
    
    // Coletar dados
    const dados = coletarDadosFormularioCustosPagos();
    
    // Mostrar loading
    const btnVisualizar = document.querySelector('.btn-visualizar');
    const iconOriginal = btnVisualizar.innerHTML;
    
    btnVisualizar.classList.add('loading');
    btnVisualizar.innerHTML = '<i class="fas fa-spinner"></i> Gerando...';
    btnVisualizar.disabled = true;
    
    // Simular processamento
    setTimeout(() => {
        console.log('📈 Relatório gerado com os dados:', dados);
        
        // Resetar botão
        btnVisualizar.classList.remove('loading');
        btnVisualizar.innerHTML = iconOriginal;
        btnVisualizar.disabled = false;
        
        // Mostrar resultado
        mostrarResultadoRelatorioCustosPagos(dados);
        
        // Mostrar notificação de sucesso
        mostrarNotificacaoCustosPagos('Relatório gerado com sucesso!', 'success');
        
    }, 2000);
}

function mostrarResultadoRelatorioCustosPagos(dados) {
    // Aqui você implementaria a exibição do relatório
    // Por exemplo, abrir modal, navegar para página de resultados, etc.
    
    console.log('📊 Exibindo relatório de Custos Pagos:');
    console.log('- Período de Análise:', dados.periodoAnalise);
    console.log('- Tipo de Impressão:', dados.tipoImpressao);
    console.log('- Tipo de Documento:', dados.tipoDocumento);
    console.log('- Profissional/Fornecedor:', dados.profissionalFornecedor);
    console.log('- Centro de Resultado:', dados.centroResultado);
    console.log('- Categoria:', dados.categoria);
    
    // Exemplo de implementação futura:
    // window.open(`/relatorios/custos-pagos?${new URLSearchParams(dados).toString()}`, '_blank');
}

function mostrarNotificacaoCustosPagos(mensagem, tipo = 'info') {
    // Remover notificações existentes
    const notificacoesExistentes = document.querySelectorAll('.notification');
    notificacoesExistentes.forEach(n => n.remove());
    
    // Criar nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notification ${tipo}`;
    
    const icon = tipo === 'success' ? 'check-circle' : 
                 tipo === 'error' ? 'exclamation-circle' : 
                 tipo === 'warning' ? 'exclamation-triangle' : 'info-circle';
                 
    const cor = tipo === 'success' ? '#27ae60' : 
                tipo === 'error' ? '#e74c3c' : 
                tipo === 'warning' ? '#f39c12' : '#3498db';
    
    notificacao.style.background = cor;
    notificacao.style.color = 'white';
    
    notificacao.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${mensagem}</span>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(notificacao);
    
    // Auto-remover após 4 segundos
    setTimeout(() => {
        if (notificacao.parentNode) {
            notificacao.remove();
        }
    }, 4000);
}

// ==========================================
// UTILITÁRIOS AUXILIARES CUSTOS PAGOS
// ==========================================

function formatarDataCustosPagos(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function obterDataAtualCustosPagos() {
    return new Date().toLocaleDateString('pt-BR');
}

function validarPeriodoCustosPagos(periodo) {
    if (!periodo) return false;
    
    // Verificar formato básico "dd/mm/aaaa - dd/mm/aaaa"
    const regex = /^\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(periodo);
}

// Log de inicialização
console.log('✅ Custos Pagos - Script carregado com sucesso');
