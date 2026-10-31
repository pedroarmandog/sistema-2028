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
        inicializarConfiguracoes();
    }, 200);
});

/* ========================================
   FUNCIONALIDADES DAS CONFIGURAÇÕES GERAIS
   ======================================== */

function inicializarConfiguracoes() {
    console.log('⚙️ Inicializando Configurações Gerais...');
    
    // Configurar abas principais
    configurarAbasPrincipais();
    
    // Configurar sub-abas (apenas para aba GERAL)
    configurarSubAbas();
    
    // Configurar botão salvar
    configurarBotaoSalvar();
    
    console.log('✅ Configurações Gerais inicializadas!');
}

function configurarAbasPrincipais() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover classe active de todas as abas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Adicionar classe active na aba clicada
            this.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            console.log(`📂 Aba ${targetTab.toUpperCase()} ativada`);
        });
    });
}

function configurarSubAbas() {
    const subTabButtons = document.querySelectorAll('.sub-tab-button');
    const subTabContents = document.querySelectorAll('.sub-tab-content');
    
    subTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetSubTab = this.getAttribute('data-subtab');
            
            // Remover classe active de todas as sub-abas
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            subTabContents.forEach(content => content.classList.remove('active'));
            
            // Adicionar classe active na sub-aba clicada
            this.classList.add('active');
            const targetContent = document.getElementById(`subtab-${targetSubTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            console.log(`📋 Sub-aba ${targetSubTab} ativada`);
        });
    });
}

function configurarBotaoSalvar() {
    const btnSalvar = document.querySelector('.btn-salvar');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', function() {
            salvarConfiguracoes();
        });
    }
}

function salvarConfiguracoes() {
    console.log('💾 Salvando configurações...');
    
    // Coletar dados dos formulários
    const dadosGerais = coletarDadosGerais();
    const dadosTributacao = coletarDadosTributacao();
    const dadosNFe = coletarDadosNFe();
    
    console.log('📄 Dados coletados:', {
        geral: dadosGerais,
        tributacao: dadosTributacao,
        nfe: dadosNFe
    });
    
    // Simular salvamento
    showNotification('Configurações salvas com sucesso!', 'success');
}

function coletarDadosGerais() {
    const abaAtiva = document.querySelector('.sub-tab-button.active');
    const subAbaAtiva = abaAtiva ? abaAtiva.getAttribute('data-subtab') : 'financeiro';
    
    const dados = {
        subAbaAtiva: subAbaAtiva
    };
    
    // Dados da sub-aba Financeiro
    if (subAbaAtiva === 'financeiro') {
        dados.financeiro = {
            percentualJuros: document.getElementById('percentualJuros')?.value || '',
            percentualMulta: document.getElementById('percentualMulta')?.value || '',
            diasVencimentoJuros: document.getElementById('diasVencimentoJuros')?.value || '',
            percentualDesconto: document.getElementById('percentualDesconto')?.value || '',
            autorizacaoReceber: document.getElementById('autorizacaoReceber')?.value || '',
            autorizacaoPagar: document.getElementById('autorizacaoPagar')?.value || '',
            autorizacaoFaturamento: document.getElementById('autorizacaoFaturamento')?.value || '',
            sinalizacaoCredito: document.getElementById('sinalizacaoCredito')?.value || ''
        };
    }
    
    // Dados da sub-aba Compras
    if (subAbaAtiva === 'compras') {
        dados.compras = {
            tipoRecalculo: document.getElementById('tipoRecalculo')?.value || ''
        };
    }
    
    // Dados da sub-aba Atendimento
    if (subAbaAtiva === 'atendimento') {
        dados.atendimento = {
            intervaloDias: document.getElementById('intervaloDias')?.value || '',
            quantidadeDiasVencidos: document.getElementById('quantidadeDiasVencidos')?.value || '',
            percentualMaximo: document.getElementById('percentualMaximo')?.value || '',
            valorMaximo: document.getElementById('valorMaximo')?.value || '',
            tufalizaCaoPorVenda: document.getElementById('tufalizaCaoPorVenda')?.checked || false,
            tufalizaTemServico: document.getElementById('tufalizaTemServico')?.checked || false,
            ativaValorUnitario: document.getElementById('ativaValorUnitario')?.checked || false,
            ativaDescricaoItem: document.getElementById('ativaDescricaoItem')?.checked || false,
            permiteAuditorVenda: document.getElementById('permiteAuditorVenda')?.value || '',
            avisaVencaPrazo: document.getElementById('avisaVencaPrazo')?.value || '',
            tipoAtendimento: document.getElementById('tipoAtendimento')?.value || '',
            formularioGmt: document.getElementById('formularioGmt')?.value || '',
            perguntaDirectio: document.getElementById('perguntaDirectio')?.value || '',
            modalidadeCobranca: document.getElementById('modalidadeCobranca')?.value || '',
            tipoImpressaoEvita: document.getElementById('tipoImpressaoEvita')?.value || '',
            identificacaoVendedor: document.getElementById('identificacaoVendedor')?.value || '',
            modeloCalculo: document.getElementById('modeloCalculo')?.value || '',
            tipoFormula: document.getElementById('tipoFormula')?.value || '',
            layoutEtiqueta: document.getElementById('layoutEtiqueta')?.value || '',
            atualizacaoGerente: document.getElementById('atualizacaoGerente')?.value || '',
            diferencaTempoValores: document.getElementById('diferencaTempoValores')?.value || '',
            noCheckinSuperior: document.getElementById('noCheckinSuperior')?.value || '',
            controleStatusVendas: document.getElementById('controleStatusVendas')?.value || '',
            cpfObrigatorioCliente: document.getElementById('cpfObrigatorioCliente')?.value || '',
            comentariosQuotesValores: document.getElementById('comentariosQuotesValores')?.value || ''
        };
    }
    
    // Dados da sub-aba Estoque
    if (subAbaAtiva === 'estoque') {
        dados.estoque = {
            valorPadraoEstoqueNegativo: document.getElementById('valorPadraoEstoqueNegativo')?.value || '',
            precoTransferencia: document.getElementById('precoTransferencia')?.value || '',
            conferenciateTransferencia: document.getElementById('conferenciateTransferencia')?.value || '',
            mercadoriasRevenda: document.getElementById('mercadoriasRevenda')?.value || '',
            insumosBaixam: document.getElementById('insumosBaixam')?.value || '',
            classificacaoStatus: document.getElementById('classificacaoStatus')?.value || '',
            tipoTransferencia: document.getElementById('tipoTransferencia')?.value || '',
            pedidoVendaObedece: document.getElementById('pedidoVendaObedece')?.checked || false,
            metodoValidacao: document.getElementById('metodoValidacao')?.value || ''
        };
    }
    
    // Dados da sub-aba Impressão
    if (subAbaAtiva === 'impressao') {
        dados.impressao = {
            quantidadeViaOrcamento: document.getElementById('quantidadeViaOrcamento')?.value || '',
            quantidadeViaPedido: document.getElementById('quantidadeViaPedido')?.value || '',
            quantidadeViaVendaDinheiro: document.getElementById('quantidadeViaVendaDinheiro')?.value || '',
            quantidadeViaVendaCredito: document.getElementById('quantidadeViaVendaCredito')?.value || '',
            quantidadeViaVendaCheque: document.getElementById('quantidadeViaVendaCheque')?.value || '',
            quantidadeViaVendaCartao: document.getElementById('quantidadeViaVendaCartao')?.value || '',
            quantidadeViaVendaPix: document.getElementById('quantidadeViaVendaPix')?.value || '',
            imprimirRecibo: document.getElementById('imprimirRecibo')?.checked || false,
            quantidadeViaRecebimento: document.getElementById('quantidadeViaRecebimento')?.value || '',
            quantidadeViaDevolucaoDebito: document.getElementById('quantidadeViaDevolucaoDebito')?.value || '',
            quantidadeViaDevolucaoCheque: document.getElementById('quantidadeViaDevolucaoCheque')?.value || '',
            quantidadeViaDevolucaoCredito: document.getElementById('quantidadeViaDevolucaoCredito')?.value || '',
            imprimirNotaPromissoria: document.getElementById('imprimirNotaPromissoria')?.value || '',
            layoutImpressao: document.getElementById('layoutImpressao')?.value || '',
            mensagemRodape: document.getElementById('mensagemRodape')?.value || '',
            cidade: document.getElementById('cidade')?.value || '',
            alterarMargemReceita: document.getElementById('alterarMargemReceita')?.checked || false,
            margemSuperior: document.getElementById('margemSuperior')?.value || ''
        };
    }
    
    // Dados da sub-aba Internação
    if (subAbaAtiva === 'internacao') {
        dados.internacao = {
            tempoMinutos: document.getElementById('tempoMinutos')?.value || '',
            calculoFluidoterapia: document.getElementById('calculoFluidoterapia')?.value || '',
            permitirCheckout: document.getElementById('permitirCheckout')?.value || ''
        };
    }
    
    return dados;
}

function coletarDadosTributacao() {
    return {
        aliquotaCredito: document.getElementById('aliquotaCredito')?.value || '',
        situacaoTributariaPis: document.getElementById('situacaoTributariaPis')?.value || '',
        percentualPis: document.getElementById('percentualPis')?.value || '',
        situacaoTributariaCofins: document.getElementById('situacaoTributariaCofins')?.value || '',
        percentualCofins: document.getElementById('percentualCofins')?.value || ''
    };
}

function coletarDadosNFe() {
    return {
        ambienteSelecionado: document.getElementById('ambienteSelecionado')?.value || '',
        emitirNotaFiscal: document.getElementById('emitirNotaFiscal')?.value || ''
    };
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        transition: all 0.3s ease;
        animation: slideInRight 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#28a745';
    } else if (type === 'error') {
        notification.style.background = '#dc3545';
    } else {
        notification.style.background = '#007bff';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
