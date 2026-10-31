// =============================================
// SISTEMA GLOBAL DE NOVO ATENDIMENTO
// Funciona em todas as páginas do sistema
// =============================================

// Guard: evita que o script seja executado duas vezes na mesma página
// (ex: quando o sidebar é injetado dinamicamente e também carrega este script).
// Sem este guard, a segunda execução lança:
//   Uncaught SyntaxError: Identifier 'calendarioCompactoAtual' has already been declared
if (window.__novoAtendimentoGlobalLoaded) {
  console.log("🌐 novo-atendimento-global.js já carregado — ignorando segunda execução");
} else {
  window.__novoAtendimentoGlobalLoaded = true;

console.log("🌐 Sistema Global de Novo Atendimento carregado!");

// Função simples de notificação (toast) para erros/sucesso
function showNotification(message, type = "error") {
  try {
    // remover existente
    const existing = document.querySelector(".notification-toast");
    if (existing) existing.remove();

    const colors = {
      error: {
        icon: "fa-exclamation-circle",
        iconColor: "#7b1f2d",
        textColor: "#661426",
        bg: "",
      },
      success: {
        icon: "fa-check-circle",
        iconColor: "#1e7e34",
        textColor: "#0b6435",
        bg: "",
      },
      warning: {
        icon: "fa-exclamation-triangle",
        iconColor: "#856404",
        textColor: "#533f03",
        bg: "background:#fff8e1;border:1px solid #ffe082;",
      },
    };
    const c = colors[type] || colors.error;

    const n = document.createElement("div");
    n.className = `notification-toast notification-${type}`;
    n.style.cssText = `position:fixed;right:18px;top:18px;z-index:1200010;min-width:220px;max-width:420px;padding:12px 16px;border-radius:8px;box-shadow:0 8px 24px rgba(2,16,26,0.12);font-weight:400;display:flex;align-items:center;gap:12px;opacity:0;transition:opacity .18s,transform .18s;${c.bg}`;
    n.innerHTML = `
            <div style="flex:0 0 28px;text-align:center;font-size:18px;color:${c.iconColor};">
                <i class="fas ${c.icon}"></i>
            </div>
            <div style="flex:1;color:${c.textColor};">${message}</div>
            <button style="background:transparent;border:none;color:#999;cursor:pointer;font-size:14px;" onclick="this.parentElement.remove()">✕</button>
        `;
    document.body.appendChild(n);
    requestAnimationFrame(() => {
      n.style.opacity = "1";
      n.style.transform = "none";
    });
    setTimeout(() => {
      try {
        n.remove();
      } catch (e) {}
    }, 5000);
  } catch (e) {
    console.warn("showNotification fail", e);
  }
}

// =============================================
// FUNÇÃO GLOBAL: Novo Atendimento
// =============================================
function novoAtendimento() {
  console.log(
    "🎯 Novo Atendimento chamado - Página atual:",
    window.location.pathname,
  );

  // Verificar se estamos na página de agendamentos
  const paginaAtual = window.location.pathname;
  const isAgendamentos =
    paginaAtual.includes("agendamentos-novo.html") ||
    paginaAtual.includes("agendamentos.html");

  if (isAgendamentos) {
    // Se já estamos na página de agendamentos, abrir o modal diretamente
    console.log("✅ Já na página de agendamentos - abrindo modal...");
    abrirNovoAgendamentoModal();
  } else {
    // Se estamos em outra página, redirecionar
    console.log("🔄 Redirecionando para página de agendamentos...");

    // Salvar flag para abrir modal após redirecionamento
    sessionStorage.setItem("abrirNovoAgendamento", "true");

    // Redirecionar para agendamentos
    window.location.href = "agendamentos-novo.html";
  }
}

// =============================================
// FUNÇÃO: Abrir Modal de Novo Agendamento
// =============================================
function abrirNovoAgendamentoModal() {
  console.log("🚀 Abrindo modal de Novo Agendamento...");

  // Limpar ID de edição (modo criação)
  window.agendamentoEmEdicaoId = null;

  // REMOVER MODAL ANTERIOR SE EXISTIR
  const modalAnterior = document.getElementById("novoSidebarFuncional");
  if (modalAnterior) {
    modalAnterior.remove();
  }

  const overlayAnterior = document.getElementById("novoOverlayFuncional");
  if (overlayAnterior) {
    overlayAnterior.remove();
  }

  // CRIAR OVERLAY NOVO
  const novoOverlay = document.createElement("div");
  novoOverlay.id = "novoOverlayFuncional";
  novoOverlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0) !important;
        z-index: 999998 !important;
        opacity: 0 !important;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    `;

  // CRIAR MODAL NOVO COMPLETAMENTE
  const novoModal = document.createElement("div");
  novoModal.id = "novoSidebarFuncional";
  novoModal.innerHTML = `
        <div style="background: #007bff; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 10px 10px 0 0;">
            <h3 style="margin: 0; font-size: 20px;">
                <i class="fas fa-calendar-plus"></i> Novo Agendamento
            </h3>
            <button id="fecharNovoModal" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 30px; max-height: 70vh; overflow-y: auto;">
            <form id="formNovoAgendamento" autocomplete="off">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; transition: color 0.2s ease;">Pet/Cliente *</label>
                    <input type="text" name="petClienteGlobal_input" autocomplete="off" id="petClienteGlobal" placeholder="Digite o nome do pet ou cliente..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;" 
                        onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0, 123, 255, 0.1)'; this.style.transform='translateY(-1px)'"
                        onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'" required>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; transition: color 0.2s ease;">Serviço/Produto *</label>
                    <div style="position: relative;">
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="servicoGlobal" autocomplete="off" placeholder="Digite o serviço ou produto..." style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;" 
                                onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0, 123, 255, 0.1)'; this.style.transform='translateY(-1px)'"
                                onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'" required>
                            <button type="button" id="btnAdicionarServico" style="padding: 12px 20px; border: none; border-radius: 8px; background: #007bff; color: white; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s ease;" 
                                onmouseover="this.style.background='#0056b3'; this.style.transform='scale(1.05)'" 
                                onmouseout="this.style.background='#007bff'; this.style.transform='scale(1)'">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        </div>
                        <!-- Container para resultados (será preenchido dinamicamente) -->
                        <div id="resultados-servico-global" style="position: absolute; left: 0; right: 0; top: calc(100% + 6px); background: white; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-height: 240px; overflow: auto; border-radius: 6px; display: none; z-index: 9999999;"></div>
                    </div>
                    
                    <!-- Lista de Serviços Adicionados -->
                    <div id="listaServicos" style="margin-top: 15px; display: none;">
                        <div style="background: #f8f9fa; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #007bff;">Serviços Selecionados:</h4>
                            <div id="servicosAdicionados"></div>
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #007bff; font-weight: bold; display: flex; justify-content: space-between;">
                                <span>TOTAL:</span>
                                <span id="valorTotal" style="color: #28a745; font-size: 16px;">R$ 0,00</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1; position: relative;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Data</label>
                        <input type="text" id="dataGlobal" placeholder="Selecione uma data" readonly style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none; background: white;" 
                            onclick="toggleCalendario()"
                            onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0, 123, 255, 0.1)'; this.style.transform='translateY(-1px)'"
                            onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                        <i class="fas fa-calendar-alt" style="position: absolute; right: 15px; top: 42px; color: #666; pointer-events: none;"></i>
                        
                        <!-- Calendário Flutuante -->
                        <div id="calendarioFlutuante" style="display: none; position: absolute; top: 100%; left: 0; z-index: 10000000; background: white; border: 2px solid #007bff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 12px; width: 280px; margin-top: 5px;">
                            <!-- Header do Calendário -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <button type="button" id="btnMesAnterior" style="background: none; border: none; font-size: 18px; color: #007bff; cursor: pointer; padding: 5px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <h4 id="mesAnoCalendario" style="margin: 0; color: #007bff; font-size: 16px; font-weight: 600;"></h4>
                                <button type="button" id="btnMesProximo" style="background: none; border: none; font-size: 18px; color: #007bff; cursor: pointer; padding: 5px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            
                            <!-- Dias da Semana -->
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 5px;">
                                <div style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 600; color: #666;">Dom</div>
                                <div style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 600; color: #666;">Seg</div>
                                <div style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 600; color: #666;">Ter</div>
                                <div style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 600; color: #666;">Qua</div>
                                <div style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 600; color: #666;">Qui</div>
                                <div style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 600; color: #666;">Sex</div>
                                <div style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 600; color: #666;">Sáb</div>
                            </div>
                            
                            <!-- Grid dos Dias -->
                            <div id="diasCalendario" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;"></div>
                            
                            <!-- Rodapé -->
                            <div style="margin-top: 8px; text-align: center; border-top: 1px solid #eee; padding-top: 6px;">
                                <button type="button" onclick="selecionarHoje()" style="background: #28a745; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                                    Hoje
                                </button>
                            </div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Hora</label>
                        <input type="time" id="horaGlobal" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;"
                            onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0, 123, 255, 0.1)'; this.style.transform='translateY(-1px)'"
                            onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Profissional</label>
                    <div style="position: relative;">
                        <input type="text" id="profissionalGlobalInput" class="filter-select" placeholder="Selecione um profissional" autocomplete="off" 
                            style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;"
                            onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 3px rgba(0, 123, 255, 0.1)'; this.style.transform='translateY(-1px)'"
                            onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'" />
                        <input type="hidden" id="profissionalGlobalId" value="" />
                        <div id="resultados-profissional-global" style="position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 1200000; background: white; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-height: 220px; overflow: auto; border-radius: 6px; display: none;">
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Observações</label>
                    <textarea id="observacoesGlobal" rows="4" placeholder="Observações sobre o agendamento..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <button type="button" id="cancelarNovoModal" style="padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #6c757d; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1);" 
                        onmouseover="this.style.transform='scale(1.05) translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(108, 117, 125, 0.3)'; this.style.background='#5a6268'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.background='#6c757d'">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="button" id="salvarAgendamento" style="padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #28a745; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1);"
                        onmouseover="this.style.transform='scale(1.05) translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(40, 167, 69, 0.3)'; this.style.background='#218838'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.background='#28a745'">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                    <button type="button" id="salvarEIr" style="padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #007bff; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1);"
                        onmouseover="this.style.transform='scale(1.05) translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0, 123, 255, 0.3)'; this.style.background='#0056b3'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.background='#007bff'">
                        <i class="fas fa-save"></i> <i class="fas fa-arrow-right"></i> Salvar e Ir
                    </button>
                </div>
            </form>
        </div>
    `;

  novoModal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -70%) scale(0.8) !important;
        width: 90% !important;
        max-width: 800px !important;
        max-height: 90vh !important;
        background: white !important;
        z-index: 999999 !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0) !important;
        border-radius: 15px !important;
        overflow: hidden !important;
        border: 3px solid #007bff !important;
        opacity: 0 !important;
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    `;

  // ADICIONAR AO DOM
  document.body.appendChild(novoOverlay);
  document.body.appendChild(novoModal);

  // Array para armazenar serviços adicionados
  window.servicosAdicionados = [];

  // Variável para armazenar ID do agendamento em edição (se houver)
  window.agendamentoEmEdicaoId = null;

  // Carregar profissionais para o dropdown
  try {
    carregarProfissionais();
  } catch (e) {
    console.warn("carregarProfissionais não disponível no escopo ainda");
  }
  document.body.style.overflow = "hidden";

  // ANIMAR ENTRADA DO MODAL (fluido e suave)
  requestAnimationFrame(() => {
    // Primeiro frame: preparar elementos
    novoOverlay.style.opacity = "0";
    novoModal.style.opacity = "0";
    novoModal.style.transform = "translate(-50%, -70%) scale(0.8)";

    setTimeout(() => {
      // Animar overlay (menos escuro)
      novoOverlay.style.background = "rgba(0,0,0,0.45)";
      novoOverlay.style.opacity = "1";

      // Animar modal com delay para efeito cascata
      setTimeout(() => {
        novoModal.style.opacity = "1";
        novoModal.style.transform = "translate(-50%, -50%) scale(1)";
        novoModal.style.boxShadow = "0 20px 60px rgba(0,0,0,0.3)";
      }, 150);
    }, 50);
  });

  // ADICIONAR EVENT LISTENERS
  function fecharModal() {
    // Limpar lista de serviços ao fechar
    window.servicosAdicionados = [];

    // Limpar ID de edição
    window.agendamentoEmEdicaoId = null;

    // Animar saída (mais rápida que entrada)
    novoModal.style.transition = "all 0.3s cubic-bezier(0.4, 0, 1, 1)";
    novoOverlay.style.transition = "all 0.3s cubic-bezier(0.4, 0, 1, 1)";

    // Animar modal saindo
    novoModal.style.opacity = "0";
    novoModal.style.transform = "translate(-50%, -30%) scale(0.9)";
    novoModal.style.boxShadow = "0 5px 20px rgba(0,0,0,0.1)";

    // Animar overlay saindo
    setTimeout(() => {
      novoOverlay.style.opacity = "0";
      novoOverlay.style.background = "rgba(0,0,0,0)";
    }, 100);

    // Remover elementos após animação
    setTimeout(() => {
      if (novoModal.parentNode) novoModal.remove();
      if (novoOverlay.parentNode) novoOverlay.remove();
      document.body.style.overflow = "";
      // Garantir que overlays residuais sejam removidos
      garantirRemoverOverlays();
    }, 350);
  }

  document.getElementById("fecharNovoModal").onclick = fecharModal;
  document.getElementById("cancelarNovoModal").onclick = fecharModal;
  novoOverlay.onclick = fecharModal;

  // Função: carregar lista de profissionais via API e popular o dropdown customizado
  let profissionaisLista = [];
  async function carregarProfissionais() {
    try {
      const resp = await fetch("/api/profissionais");
      if (!resp.ok) throw new Error("Resposta " + resp.status);
      const list = await resp.json();
      profissionaisLista = Array.isArray(list) ? list : [];
      // render inicial se o input já existir
      renderizarDropdownProfissionais("");
      setupProfissionalHandlers();
    } catch (e) {
      console.error("Erro ao carregar profissionais:", e);
      profissionaisLista = [];
      renderizarDropdownProfissionais("");
      setupProfissionalHandlers();
    }
  }

  // Renderiza opções filtradas no container
  function renderizarDropdownProfissionais(filter) {
    const container = document.getElementById("resultados-profissional-global");
    const input = document.getElementById("profissionalGlobalInput");
    if (!container || !input) return;
    const q = (filter || input.value || "").toLowerCase().trim();
    container.innerHTML = "";
    const lista = profissionaisLista.filter((p) => {
      const nome = (p.nome || "").toLowerCase();
      return !q || nome.includes(q);
    });
    if (!lista.length) {
      const li = document.createElement("div");
      li.style.cssText = "padding:10px;color:#666";
      li.textContent = profissionaisLista.length
        ? "Nenhum profissional encontrado"
        : "Nenhum profissional cadastrado";
      container.appendChild(li);
      return;
    }
    lista.forEach((p) => {
      const item = document.createElement("div");
      item.style.cssText =
        "padding:10px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9;";
      item.textContent = p.nome || "";
      item.addEventListener(
        "mouseenter",
        () => (item.style.background = "#f8fafc"),
      );
      item.addEventListener(
        "mouseleave",
        () => (item.style.background = "transparent"),
      );
      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const inputEl = document.getElementById("profissionalGlobalInput");
        const hidden = document.getElementById("profissionalGlobalId");
        if (inputEl) inputEl.value = p.nome || "";
        if (hidden) hidden.value = p.nome || "";
        container.style.display = "none";
      });
      container.appendChild(item);
    });
  }

  // Anexar handlers no input para abrir/filtrar dropdown
  function setupProfissionalHandlers() {
    const input = document.getElementById("profissionalGlobalInput");
    const container = document.getElementById("resultados-profissional-global");
    if (!input || !container) return;
    // evitar múltiplos binds
    if (input._profHandlersAdded) return;
    input._profHandlersAdded = true;

    input.addEventListener("focus", (e) => {
      renderizarDropdownProfissionais("");
      container.style.display = "block";
    });
    input.addEventListener("input", (e) => {
      renderizarDropdownProfissionais(e.target.value || "");
      container.style.display = "block";
    });
    // Clique fora para fechar
    document.addEventListener("click", function onDocClick(ev) {
      const target = ev.target;
      if (!target) return;
      if (target === input || container.contains(target)) return;
      container.style.display = "none";
    });
  }

  // Segurança: garantir remoção de outros overlays que possam permanecer
  function garantirRemoverOverlays() {
    // Remover elementos com classe comum 'modal-overlay'
    try {
      const extras = document.querySelectorAll(".modal-overlay");
      extras.forEach((el) => {
        if (el && el.parentNode) el.remove();
      });
    } catch (e) {
      /* ignore */
    }

    // Remover qualquer overlay com z-index muito alto que possa cobrir a tela
    try {
      const all = Array.from(document.body.children || []);
      all.forEach((el) => {
        try {
          const z = window.getComputedStyle(el).zIndex;
          if (z && Number(z) >= 10000) {
            if (el && el.parentNode) el.remove();
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  // Helper de notificação (usa showNotification se disponível)
  function notify(message, type = "success") {
    try {
      if (typeof showNotification === "function") {
        showNotification(message, type);
        return;
      }
    } catch (e) {
      console.debug("notify: showNotification falhou", e);
    }

    // Fallback mínimo: criar um toast simples no canto superior direito
    try {
      const n = document.createElement("div");
      n.className = "patch-toast patch-toast-" + (type || "info");
      n.innerHTML = `<span>${message}</span>`;
      const styleId = "patch-toast-styles";
      if (!document.getElementById(styleId)) {
        const s = document.createElement("style");
        s.id = styleId;
        s.textContent = `
                    .patch-toast{position:fixed;top:20px;right:20px;padding:12px 16px;border-radius:8px;color:#063;z-index:4000;box-shadow:0 6px 18px rgba(2,6,23,0.08);font-weight:600}
                    .patch-toast-success{background:#d1fae5;color:#064e3b}
                    .patch-toast-info{background:#dbeafe;color:#0f172a}
                `;
        document.head.appendChild(s);
      }
      document.body.appendChild(n);
      setTimeout(() => {
        n.style.opacity = "0";
        n.style.transition = "opacity 0.3s ease";
        setTimeout(() => n.remove(), 350);
      }, 3500);
    } catch (e) {
      try {
        console.log(message);
      } catch (_) {}
    }
  }

  // Event listeners para os botões de ação
  document.getElementById("salvarAgendamento").onclick = function () {
    console.log("💾 Salvando agendamento...");
    const dados = coletarDadosFormulario();
    if (validarFormulario(dados)) {
      (async () => {
        try {
          // preparar payload para API
          const petId =
            (document.getElementById("petClienteGlobal") || {}).getAttribute &&
            (document
              .getElementById("petClienteGlobal")
              .getAttribute("data-selected-pet-id") ||
              document.getElementById("petClienteGlobal").dataset
                .selectedPetId ||
              "");
          const servicoSelectedId =
            (document.getElementById("servicoGlobal") || {}).getAttribute &&
            (document
              .getElementById("servicoGlobal")
              .getAttribute("data-selected-id") ||
              document.getElementById("servicoGlobal").dataset.selectedId ||
              "");
          const objAg = criarObjetoAgendamento(dados);

          // converter data dd/mm/yyyy para YYYY-MM-DD
          function formatDateForAPI(br) {
            if (!br) return "";
            const parts = br.split("/");
            if (parts.length === 3)
              return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            return br; // assume já em formato ISO
          }

          const payload = {
            data: formatDateForAPI(dados.data),
            hora: dados.hora || "",
            petId: petId || dados.petId || "",
            servico: dados.servicosNomes || dados.servico || "", // String concatenada dos serviços
            servicos: dados.servicos || [], // Array estruturado de serviços
            observacoes: dados.observacoes || "",
            profissional: dados.profissional || "",
            valor: dados.valorTotal || objAg.valor || 0,
          };

          if (!payload.petId) {
            showNotification(
              "Selecione um Pet válido nas sugestões (clique no resultado).",
              "error",
            );
            return;
          }

          // Detectar se é edição ou criação
          const isEdicao = !!window.agendamentoEmEdicaoId;
          const metodo = isEdicao ? "PUT" : "POST";
          const url = isEdicao
            ? `/api/agendamentos/${window.agendamentoEmEdicaoId}`
            : "/api/agendamentos";

          console.log(
            `📡 ${isEdicao ? "Atualizando" : "Criando"} agendamento via ${metodo} ${url}`,
          );
          console.log("📦 Payload enviado:", JSON.stringify(payload, null, 2));

          // chamar API
          let resp;
          try {
            const origin = window.location.origin;
            resp = await fetch(origin + url, {
              method: metodo,
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } catch (e) {
            console.error(
              "[novo-atendimento-global] Erro ao chamar API /api/agendamentos",
              e,
            );
            showNotification(
              "Erro ao salvar agendamento (falha na conexão). Veja o console.",
              "error",
            );
            return;
          }

          if (!resp || !resp.ok) {
            const text = await (resp ? resp.text() : Promise.resolve(""));
            console.error(
              "API /api/agendamentos retornou erro:",
              resp && resp.status,
              text,
            );
            let j = null;
            try {
              j = text ? JSON.parse(text) : null;
            } catch (e) {
              j = null;
            }
            const msg =
              j && (j.error || j.message)
                ? j.error || j.message
                : text || (resp && resp.statusText) || "Erro desconhecido";
            showNotification("Erro ao salvar: " + msg, "error");
            return;
          }

          const created = await resp.json();
          console.log(
            `🔁 Agendamento ${isEdicao ? "atualizado" : "criado"} via API:`,
            created,
          );

          // A lista principal será recarregada do servidor para garantir consistência
          // com o AgendamentosManager. Primeiro, ajustar a data do manager para
          // corresponder à data do agendamento que foi criado.
          if (window.agendamentosManager) {
            try {
              // Extrair a data do agendamento criado (formato YYYY-MM-DD)
              const dataAgendamentoStr = created.dataAgendamento || formatDateForAPI(dados.data);
              let dataDoAgendamento = null;
              if (dataAgendamentoStr) {
                // Se veio como ISO string (ex: "2026-06-06T00:00:00.000Z")
                if (dataAgendamentoStr.includes("T") || dataAgendamentoStr.includes("-")) {
                  dataDoAgendamento = new Date(dataAgendamentoStr);
                }
                // Se veio como DD/MM/YYYY
                if (!dataDoAgendamento || isNaN(dataDoAgendamento.getTime())) {
                  const parts = dados.data ? dados.data.split("/") : [];
                  if (parts.length === 3) {
                    dataDoAgendamento = new Date(parts[2], parts[1] - 1, parts[0]);
                  }
                }
              }
              if (dataDoAgendamento && !isNaN(dataDoAgendamento.getTime())) {
                window.agendamentosManager.currentDate = dataDoAgendamento;
                // Se estava em 'today', trocar para 'day' para não resetar a data
                if (window.agendamentosManager.period === "today") {
                  window.agendamentosManager.period = "day";
                }
                window.agendamentosManager.handlePeriodChange("day");
              } else {
                // Fallback: se não conseguir extrair data, recarregar normalmente
                await window.agendamentosManager.loadAgendamentos();
              }
            } catch (e) {
              console.warn(
                "[novo-atendimento-global] Falha ao recarregar agendamentos:",
                e,
              );
            }
          }

          notify(
            `Agendamento ${isEdicao ? "atualizado" : "confirmado"} com sucesso!`,
            "success",
          );

          // Limpar ID de edição
          window.agendamentoEmEdicaoId = null;

          fecharModal();

          // Se for edição, recarregar a página para atualizar os dados
          if (isEdicao) {
            console.log("🔄 Recarregando página após edição...");
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        } catch (err) {
          console.error("Erro ao salvar agendamento via API:", err);
          showNotification(
            "Erro ao salvar agendamento. Veja o console para detalhes.",
            "error",
          );
        }
      })();
    }
  };

  document.getElementById("salvarEIr").onclick = async function () {
    console.log("💾➡️ Salvando e redirecionando...");
    const dados = coletarDadosFormulario();
    if (validarFormulario(dados)) {
      try {
        // Preparar payload para API
        const petInput = document.getElementById("petClienteGlobal");
        const petId =
          petInput?.getAttribute("data-selected-pet-id") ||
          petInput?.dataset?.selectedPetId ||
          "";
        // obter valor do serviço sem alterar a estrutura do fluxo
        const objAg = criarObjetoAgendamento(dados);

        if (!petId) {
          showNotification(
            "Por favor, selecione um Pet válido nas sugestões (clique no resultado).",
            "error",
          );
          return;
        }

        // Converter data DD/MM/YYYY para YYYY-MM-DD
        function formatDateForAPI(br) {
          if (!br) return "";
          const parts = br.split("/");
          if (parts.length === 3)
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          return br;
        }

        const payload = {
          data: formatDateForAPI(dados.data),
          hora: dados.hora || "",
          petId: petId,
          servico: dados.servicosNomes || dados.servico || "", // String concatenada dos serviços
          servicos: dados.servicos || [], // Array estruturado de serviços
          observacoes: dados.observacoes || "",
          profissional: dados.profissional || "",
          valor: dados.valorTotal || (objAg && objAg.valor) ? objAg.valor : 0,
        };

        // Detectar se é edição ou criação
        const isEdicao = !!window.agendamentoEmEdicaoId;
        const metodo = isEdicao ? "PUT" : "POST";
        const url = isEdicao
          ? `/api/agendamentos/${window.agendamentoEmEdicaoId}`
          : "/api/agendamentos";

        console.log(
          `📡 ${isEdicao ? "Atualizando" : "Criando"} agendamento (e redirecionando) via ${metodo} ${url}`,
        );
        console.log("📦 Payload enviado:", JSON.stringify(payload, null, 2));

        // Chamar API
        const response = await fetch(url, {
          method: metodo,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.status === 409) {
          const j = await response.json();
          showNotification(
            "Não foi possível salvar: " +
              (j?.error || j?.message || "Conflito de horário."),
            "error",
          );
          return;
        }

        if (!response.ok) {
          const j = await response.json();
          showNotification(
            "Erro ao salvar: " +
              (j?.error || j?.message || response.statusText),
            "error",
          );
          return;
        }

        const created = await response.json();
        console.log(
          `✅ Agendamento ${isEdicao ? "atualizado" : "salvo"} na API:`,
          created,
        );

        // Redirecionar para a página de detalhes do agendamento
        const agendamentoId = isEdicao
          ? window.agendamentoEmEdicaoId
          : (created &&
              (created.id ||
                created.ID ||
                created.agendamentoId ||
                created._id ||
                created.codigo)) ||
            null;

        // Limpar ID de edição
        window.agendamentoEmEdicaoId = null;

        if (agendamentoId) {
          window.location.href = `agendamento-detalhes.html?id=${agendamentoId}`;
          return;
        }

        // Fallback: recarregar do servidor e fechar modal caso não haja id
        if (
          window.agendamentosManager &&
          typeof window.agendamentosManager.loadAgendamentos === "function"
        ) {
          try {
            await window.agendamentosManager.loadAgendamentos();
          } catch (e) {
            console.warn(
              "[novo-atendimento-global] Falha ao recarregar agendamentos (fallback):",
              e,
            );
          }
        }

        notify(
          `Agendamento ${isEdicao ? "atualizado" : "confirmado"}`,
          "success",
        );
        fecharModal();
      } catch (err) {
        console.error("❌ Erro ao salvar:", err);
        showNotification(
          "Erro ao salvar agendamento. Veja o console para detalhes.",
          "error",
        );
      }
    }
  };

  // Focar no primeiro campo
  setTimeout(() => {
    document.getElementById("petClienteGlobal").focus();
  }, 100);

  console.log("✅ Modal de Novo Agendamento criado e exibido!");

  // Garantir que o botão "Salvar e Ir" esteja visível no modo criação
  setTimeout(() => {
    const btnSalvarEIr = document.getElementById("salvarEIr");
    if (btnSalvarEIr && !window.agendamentoEmEdicaoId) {
      btnSalvarEIr.style.display = "";
    }
  }, 50);

  // =============================================
  // FUNÇÕES PARA MÚLTIPLOS SERVIÇOS
  // =============================================

  function adicionarServicoALista(selectedObj) {
    try {
      console.debug(
        "[novo-atendimento-global] adicionarServicoALista called",
        !!selectedObj,
      );
    } catch (e) {}
    let servicoInput = document.getElementById("servicoGlobal");
    let servicoNome = "";
    let servicoId = "";
    let servicoValor = 0;
    if (selectedObj && typeof selectedObj === "object") {
      servicoId = String(selectedObj.id || selectedObj._id || "");
      servicoNome = String(
        selectedObj.nome ||
          selectedObj.titulo ||
          selectedObj.name ||
          selectedObj.label ||
          "",
      );
      servicoValor =
        Number(
          String(
            selectedObj.valor || selectedObj.preco || selectedObj.venda || 0,
          ).replace(",", "."),
        ) || 0;
      // set attributes so UI stays in sync
      try {
        if (servicoInput) {
          servicoInput.value = servicoNome;
          servicoInput.setAttribute("data-selected-id", servicoId);
          servicoInput.setAttribute(
            "data-selected-valor",
            String(servicoValor),
          );
        }
      } catch (e) {}
    } else {
      if (servicoInput) {
        servicoNome = (servicoInput.value || "").trim();
        try {
          servicoId = servicoInput.getAttribute("data-selected-id") || "";
        } catch (e) {}
        try {
          servicoValor =
            parseFloat(
              servicoInput.getAttribute("data-selected-valor") || "0",
            ) || 0;
        } catch (e) {}
      }
    }

    // Exigir que o serviço tenha sido selecionado a partir do dropdown (data-selected-id)
    if (!servicoId || String(servicoId).trim() === "") {
      showNotification("Por favor, selecione um serviço", "error");
      return;
    }
    if (!servicoNome) {
      showNotification("Por favor, selecione um serviço", "error");
      return;
    }

    // Verificar se já foi adicionado
    const jaExiste = window.servicosAdicionados.some((s) => s.id === servicoId);
    if (jaExiste) {
      showNotification("Este serviço já foi adicionado", "error");
      return;
    }

    // Adicionar à lista
    window.servicosAdicionados.push({
      id: servicoId,
      nome: servicoNome,
      valor: servicoValor,
      quantidade: 1,
      unitario: servicoValor,
      desconto: 0,
    });
    try {
      const last =
        window.servicosAdicionados[window.servicosAdicionados.length - 1];
      if (last) last.total = calcularValorServico(last);
    } catch (e) {}

    // Limpar campo
    servicoInput.value = "";
    servicoInput.removeAttribute("data-selected-id");
    servicoInput.removeAttribute("data-selected-valor");

    // Renderizar lista
    renderizarListaServicos();
  }

  function removerServico(servicoId) {
    window.servicosAdicionados = window.servicosAdicionados.filter(
      (s) => s.id !== servicoId,
    );
    renderizarListaServicos();
  }

  function renderizarListaServicos() {
    const listaContainer = document.getElementById("listaServicos");
    const servicosContainer = document.getElementById("servicosAdicionados");
    const valorTotalElement = document.getElementById("valorTotal");

    if (window.servicosAdicionados.length === 0) {
      listaContainer.style.display = "none";
      return;
    }

    listaContainer.style.display = "block";

    // Renderizar cada serviço com campos editáveis
    servicosContainer.innerHTML = window.servicosAdicionados
      .map((servico, index) => {
        const valorCalculado = calcularValorServico(servico);
        return `
            <div style="background: white; border-radius: 6px; margin-bottom: 12px; padding: 12px; border: 1px solid #e0e0e0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="flex: 1; color: #333; font-weight: 600;">${servico.nome}</span>
                    <button type="button" onclick="window.removerServicoGlobal('${servico.id}')" style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">
                    <div>
                        <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Qtd. *</label>
                        <input type="number" min="0.001" step="0.001" value="${servico.quantidade || 1}" 
                            onchange="window.atualizarServicoGlobal(${index}, 'quantidade', parseFloat(this.value) || 1)"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Unitário *</label>
                        <input type="number" min="0" step="0.01" value="${(servico.unitario || servico.valor || 0).toFixed(2)}" 
                            readonly
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;background:#f7f7f7;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Valor final *</label>
                        <input type="number" min="0" step="0.01" value="${(servico.valor || servico.unitario || 0).toFixed(2)}" 
                            onchange="window.atualizarServicoGlobal(${index}, 'valor', parseFloat(this.value) || 0)"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">% Desconto</label>
                        <input type="number" min="0" max="100" step="0.0001" value="${(servico.desconto || 0).toFixed(4)}" 
                            onchange="window.atualizarServicoGlobal(${index}, 'desconto', parseFloat(this.value) || 0)"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                    </div>
                </div>
                <div style="text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">
                    <span style="color: #666; font-size: 12px;">Subtotal: </span>
                    <span style="color: #28a745; font-weight: 600; font-size: 14px;">R$ ${valorCalculado.toFixed(2).replace(".", ",")}</span>
                </div>
            </div>
        `;
      })
      .join("");

    // Calcular e mostrar total
    const total = window.servicosAdicionados.reduce(
      (acc, s) => acc + calcularValorServico(s),
      0,
    );
    valorTotalElement.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
  }

  // Função para calcular valor do serviço (quantidade * valor final) e aplicar desconto% quando configurado
  function calcularValorServico(servico) {
    const qtd = parseFloat(servico.quantidade) || 1;
    // 'unitario' é o valor cadastrado (fixo). 'valor' é o unitário final (pode ser alterado pelo usuário).
    const finalUnit =
      servico.valor !== undefined && servico.valor !== null
        ? parseFloat(servico.valor)
        : parseFloat(servico.unitario || 0);
    const descontoPercent = parseFloat(servico.desconto) || 0;

    // O subtotal deve ser quantidade * valor final (valor editado pelo usuário).
    // O campo `desconto` é apenas informativo (mostra a diferença percentual
    // entre o `unitario` cadastrado e o `valor` final). Não aplicamos o desconto
    // novamente sobre o `valor` final — assim o subtotal fica exatamente o valor
    // que o usuário informou.
    const subtotal = qtd * finalUnit;
    return subtotal;
  }

  // Função para atualizar campo de um serviço
  window.atualizarServicoGlobal = function (index, campo, valor) {
    if (!window.servicosAdicionados[index]) return;
    const serv = window.servicosAdicionados[index];

    // tratar 'unitario' como edição do valor final quando chamada (compatibilidade com outras views)
    if (campo === "unitario") campo = "valor";

    if (campo === "quantidade") {
      serv.quantidade = valor;
    } else if (campo === "valor") {
      // valor = unitário final inserido pelo usuário
      serv.valor = valor;
      // recalcular % desconto (somente se houve redução)
      const unitCad = parseFloat(serv.unitario || 0) || 0;
      if (unitCad > 0 && valor < unitCad) {
        serv.desconto = ((unitCad - valor) / unitCad) * 100;
      } else {
        serv.desconto = 0;
      }
    } else if (campo === "desconto") {
      // desconto é percentual; aplicar sobre unitario cadastrado para definir valor final
      serv.desconto = Math.max(0, Math.min(100, valor));
      const unitCad = parseFloat(serv.unitario || 0) || 0;
      serv.valor = unitCad * (1 - serv.desconto / 100);
    } else {
      // campos inesperados: gravar direto
      serv[campo] = valor;
    }

    // Recalcular total do item (subtotal já considera quantidade e desconto percentual)
    serv.total = calcularValorServico(serv);

    renderizarListaServicos();
  };

  // Expor funções globalmente
  window.adicionarServicoGlobal = adicionarServicoALista;
  window.removerServicoGlobal = removerServico;
  window.renderizarListaServicosGlobal = renderizarListaServicos;
  window.calcularValorServicoGlobal = calcularValorServico;

  // Configurar botão adicionar serviço
  const btnAdicionarServico = document.getElementById("btnAdicionarServico");
  if (btnAdicionarServico) {
    btnAdicionarServico.addEventListener("click", adicionarServicoALista);
  }

  // Permitir adicionar com Enter
  const servicoInput = document.getElementById("servicoGlobal");
  if (servicoInput) {
    servicoInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        adicionarServicoALista();
      }
    });
  }

  // Configurar busca/auto-complete para o campo Pet/Cliente dentro deste modal
  try {
    setupPetClienteGlobalSearch();
  } catch (err) {
    console.log(
      "[novo-atendimento-global] setupPetClienteGlobalSearch falhou",
      err,
    );
  }
  // Fallback: garantir binding direto caso setupPetClienteGlobalSearch não anexe (debug + robustez)
  try {
    const inputFallback = document.getElementById("petClienteGlobal");
    if (inputFallback) {
      console.log(
        "[novo-atendimento-global] aplicando fallback de binding no input petClienteGlobal",
      );
      const evt = new InputEvent("input");
      // Debounced local handler
      let t = null;
      inputFallback.addEventListener("input", function (e) {
        clearTimeout(t);
        t = setTimeout(async () => {
          try {
            const q = (inputFallback.value || "").trim();
            if (!q) return;
            console.log("[novo-atendimento-global][fallback] buscando por", q);
            const { pets } = await searchPetsClientesGlobal(q);
            // create/find results container
            let resultsContainer = document.getElementById(
              "resultados-pet-cliente-global",
            );
            if (!resultsContainer) {
              resultsContainer = document.createElement("div");
              resultsContainer.id = "resultados-pet-cliente-global";
              resultsContainer.style.cssText =
                "position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 1200000; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 6px 18px rgba(15,23,42,0.12); max-height: 280px; overflow: auto; display: none;";
              const wrapper = inputFallback.parentElement || document.body;
              wrapper.style.position = wrapper.style.position || "relative";
              wrapper.appendChild(resultsContainer);
            }
            displaySearchResultsGlobal(pets, resultsContainer, inputFallback);
          } catch (e) {
            console.warn(
              "[novo-atendimento-global][fallback] erro na busca",
              e,
            );
          }
        }, 250);
      });
      // trigger initial input event to initialize
      inputFallback.dispatchEvent(evt);
    }
  } catch (e) {
    console.log("[novo-atendimento-global] fallback binding falhou", e);
  }
  try {
    setupServicoGlobalSearch();
  } catch (err) {
    console.debug(
      "[novo-atendimento-global] setupServicoGlobalSearch falhou",
      err,
    );
  }
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
// Garantir função global de cálculo para compatibilidade entre escopos
if (typeof window.calcularValorServico !== "function") {
  window.calcularValorServico = function (servico) {
    try {
      const qtd = parseFloat(servico.quantidade) || 1;
      const finalUnit =
        servico.valor !== undefined && servico.valor !== null
          ? parseFloat(servico.valor)
          : parseFloat(servico.unitario || 0);
      // Subtotal = quantidade * valor final. Desconto é informativo apenas.
      const subtotal = qtd * finalUnit;
      return subtotal;
    } catch (e) {
      return 0;
    }
  };
}
function coletarDadosFormulario() {
  // Calcular valor total dos serviços (usar função de cálculo para refletir desconto/valor final)
  const valorTotal = (window.servicosAdicionados || []).reduce(
    (acc, s) => acc + calcularValorServico(s),
    0,
  );

  const dados = {
    petCliente: document.getElementById("petClienteGlobal").value,
    servico: document.getElementById("servicoGlobal").value,
    servicos: window.servicosAdicionados || [], // Array de serviços
    servicosNomes: (window.servicosAdicionados || [])
      .map((s) => s.nome)
      .join(", "), // String concatenada
    data: document.getElementById("dataGlobal").value,
    hora: document.getElementById("horaGlobal").value,
    profissional:
      (document.getElementById("profissionalGlobalInput") &&
        document.getElementById("profissionalGlobalInput").value) ||
      (document.getElementById("profissionalGlobal") &&
        document.getElementById("profissionalGlobal").value) ||
      "",
    observacoes: document.getElementById("observacoesGlobal").value,
    valorTotal: valorTotal,
  };

  console.log("📋 Dados coletados:", dados);
  return dados;
}

function validarFormulario(dados) {
  if (!dados.petCliente) {
    showNotification(
      "Por favor, preencha o campo obrigatório: Pet/Cliente",
      "error",
    );
    return false;
  }

  if (!dados.servicos || dados.servicos.length === 0) {
    showNotification("Por favor, adicione pelo menos um serviço", "error");
    return false;
  }

  return true;
}

function criarObjetoAgendamento(dados) {
  // Extrair nome do pet e cliente do campo combinado
  const petClienteTexto = dados.petCliente || "";
  let petNome = "";
  let clienteNome = "";

  if (petClienteTexto.includes(" — ")) {
    const partes = petClienteTexto.split(" — ");
    petNome = partes[0] || "";
    clienteNome = partes[1] || "";
  } else if (petClienteTexto.includes(" - ")) {
    const partes = petClienteTexto.split(" - ");
    petNome = partes[0] || "";
    clienteNome = partes[1] || "";
  } else if (petClienteTexto.includes("(")) {
    petNome = petClienteTexto.split("(")[0].trim();
    clienteNome = petClienteTexto.split("(")[1]?.replace(")", "").trim() || "";
  } else {
    // Se não conseguir separar, assume que é só o pet
    petNome = petClienteTexto;
    clienteNome = "";
  }

  // Usar valor total dos serviços adicionados
  const valor = dados.valorTotal || 0;

  return {
    id: Date.now(),
    horario: dados.hora || "",
    petNome: petNome,
    clienteNome: clienteNome,
    servico: dados.servicosNomes || dados.servico || "", // Usa lista concatenada de serviços
    servicos: dados.servicos || [], // Array completo de serviços
    profissional: dados.profissional || "",
    valor: valor,
    status: "agendado",
    statusTexto: "Agendado",
  };
}

function adicionarAgendamentoAoDOM(agendamento) {
  const tableBody = document.getElementById("agendamentosTableBody");
  if (!tableBody) {
    console.log("❌ Elemento agendamentosTableBody não encontrado");
    return;
  }

  // Remover empty-state se existir
  const emptyState = tableBody.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  // Inserir diretamente no DOM com estrutura completa (mesma do renderAgendamentos)
  try {
    const status = agendamento.status || "agendado";
    const statusClassMap = {
      agendado: "agendado",
      checkin: "check-in",
      pronto: "pronto",
      concluido: "check-out",
      cancelado: "cancelado",
    };
    const statusClass = statusClassMap[status] || status;
    const statusTexto =
      agendamento.statusTexto || (status === "agendado" ? "Agendado" : status);

    const html = `
            <div class="agendamento-row" data-agendamento-id="${escapeHtmlUnsafe(agendamento.id || "")}" data-status="${escapeHtmlUnsafe(status)}">
                <div class="agendamento-controls">
                    <label class="checkbox-label">
                        <input type="checkbox" value="${escapeHtmlUnsafe(agendamento.id || "")}">
                        <span class="checkmark"></span>
                    </label>
                </div>
                <div class="agendamento-columns">
                    <div class="agendamento-horario">${escapeHtmlUnsafe(agendamento.horario || "")}</div>
                    <div class="agendamento-pet-cliente">
                        <strong>${escapeHtmlUnsafe(agendamento.petNome || "")}</strong><br>
                        <small>${escapeHtmlUnsafe(agendamento.clienteNome || "")}</small>
                    </div>
                    <div class="agendamento-detalhes">${escapeHtmlUnsafe(agendamento.servico || "")}</div>
                    <div class="agendamento-profissional">${escapeHtmlUnsafe(agendamento.profissional || "-")}</div>
                    <div class="agendamento-valor">${formatCurrencyBR(agendamento.valor || 0)}</div>
                    <div class="agendamento-situacao">
                        <span class="status-badge status-${statusClass}">
                            ${escapeHtmlUnsafe(statusTexto)}
                        </span>
                    </div>
                    <div class="agendamento-actions">
                        <button class="action-icon" title="Localização" onclick="if(window.agendamentosManager){agendamentosManager.showLocation(${agendamento.id})}">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                        <button class="action-icon" title="Compartilhar" onclick="if(window.agendamentosManager){agendamentosManager.shareAgendamento(${agendamento.id})}">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="action-icon" title="Mais opções" onclick="if(window.agendamentosManager){agendamentosManager.showMoreOptions(${agendamento.id}, event)}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    // inserir no topo
    tableBody.insertAdjacentHTML("afterbegin", html);
    console.log("✅ Agendamento inserido no DOM:", agendamento.id);

    // Configurar clique na row para navegação
    const row = tableBody.querySelector(
      `[data-agendamento-id="${agendamento.id}"]`,
    );
    if (row && window.agendamentosManager) {
      row.addEventListener("click", (e) => {
        if (e.target.type === "checkbox" || e.target.closest(".checkbox-label"))
          return;
        window.location.href = `agendamento-detalhes.html?id=${agendamento.id}`;
      });
      row.style.cursor = "pointer";
      row.addEventListener("mouseenter", () => {
        row.style.backgroundColor = "#f8f9fa";
      });
      row.addEventListener("mouseleave", () => {
        row.style.backgroundColor = "";
      });
    }
  } catch (e) {
    console.error("❌ Erro ao inserir agendamento no DOM:", e);
  }
}

function salvarAgendamentoTemporario(agendamento) {
  try {
    const agendamentos = JSON.parse(
      sessionStorage.getItem("agendamentos_temp") || "[]",
    );
    agendamentos.unshift(agendamento);
    sessionStorage.setItem("agendamentos_temp", JSON.stringify(agendamentos));
    console.log("✅ Agendamento salvo temporariamente");
  } catch (e) {
    console.error("❌ Erro ao salvar agendamento temporário:", e);
  }
}

function carregarAgendamentosTemporarios() {
  try {
    const agendamentos = JSON.parse(
      sessionStorage.getItem("agendamentos_temp") || "[]",
    );
    if (agendamentos.length > 0) {
      agendamentos.forEach((agendamento) => {
        adicionarAgendamentoAoDOM(agendamento);
      });
      // Limpar após carregar
      sessionStorage.removeItem("agendamentos_temp");
      console.log("✅ Agendamentos temporários carregados");
    }
  } catch (e) {
    console.error("❌ Erro ao carregar agendamentos temporários:", e);
  }
}

// TODO: Agendamentos devem ser salvos diretamente na API via ApiClient.criarAgendamento()
// Não usar localStorage para agendamentos_persistidos
// function salvarAgendamentoNoLocalStorage(agendamento) { ... }

// TODO: Carregar agendamentos da API via ApiClient.getAgendamentos()
// Esta função deve ser substituída por uma chamada à API
// localStorage não deve ser usado para agendamentos_persistidos
function carregarAgendamentosPersistidos() {
  console.warn(
    "⚠️ carregarAgendamentosPersistidos() DEPRECATED - usar ApiClient.getAgendamentos()",
  );
  return; // Função desabilitada

  /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        const tableBody = document.getElementById('agendamentosTableBody');
        if (!tableBody) return;

        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        if (agendamentos.length > 0) {
            // Ordenar agendamentos por horário (mais cedo primeiro)
            agendamentos.sort(function(a, b) {
                const horarioA = a.horario || '00:00';
                const horarioB = b.horario || '00:00';
                return horarioA.localeCompare(horarioB);
            });

            // Limpar mensagem de vazio se existir
            const emptyState = tableBody.querySelector('.empty-state');
            if (emptyState) {
                tableBody.innerHTML = '';
            }

            // Renderizar cada agendamento
            agendamentos.forEach(agendamento => {
                const status = agendamento.status || 'agendado';
                const statusTexto = agendamento.statusTexto || 'Agendado';
                
                const agendamentoHtml = `
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
                            <div class="agendamento-valor">${formatCurrencyBR(agendamento.valor)}</div>
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
                            </div>
                        </div>
                    </div>
                `;
                tableBody.insertAdjacentHTML('beforeend', agendamentoHtml);
            });
            console.log('✅ Agendamentos persistidos carregados:', agendamentos.length);
        }
    } catch (e) {
        console.error('❌ Erro ao carregar agendamentos persistidos:', e);
    }
    */
}

function excluirAgendamento(agendamentoId) {
  // TODO: Usar ApiClient.deletarAgendamento(agendamentoId) ao invés de localStorage
  console.warn(
    "⚠️ excluirAgendamento() DEPRECATED - usar ApiClient.deletarAgendamento()",
  );

  /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        // Remover do localStorage
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const agendamentosFiltrados = agendamentos.filter(ag => ag.id != agendamentoId);
        localStorage.setItem('agendamentos_persistidos', JSON.stringify(agendamentosFiltrados));

        // Remover do DOM
        const agendamentoElement = document.querySelector(`[data-agendamento-id="${agendamentoId}"]`);
        if (agendamentoElement) {
            agendamentoElement.remove();
        }

        // Verificar se lista ficou vazia
        const tableBody = document.getElementById('agendamentosTableBody');
        if (tableBody && tableBody.children.length === 0) {
            tableBody.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Não encontramos agendamentos, revise os filtros</h3>
                    <p>Tente ajustar os filtros ou criar um novo agendamento</p>
                    <button class="btn-primary" onclick="novoAtendimento()">
                        <i class="fas fa-plus"></i>
                        Novo Agendamento
                    </button>
                </div>
            `;
        }

        console.log('✅ Agendamento excluído');
    } catch (e) {
        console.error('❌ Erro ao excluir agendamento:', e);
    }
    */
}

async function excluirAgendamentosSelecionados() {
  try {
    const checkboxes = document.querySelectorAll(
      '#agendamentosTableBody input[type="checkbox"]:checked',
    );
    if (checkboxes.length === 0) {
      showNotification(
        "Selecione pelo menos um agendamento para excluir.",
        "error",
      );
      return;
    }

    if (
      await confirmar(
        `Tem certeza que deseja excluir ${checkboxes.length} agendamento(s) selecionado(s)?`,
      )
    ) {
      checkboxes.forEach((checkbox) => {
        excluirAgendamento(checkbox.value);
      });

      // Limpar seleção do checkbox principal
      const selectAll = document.getElementById("selectAll");
      if (selectAll) {
        selectAll.checked = false;
      }

      // Esconder botão de exclusão
      const btnExcluir = document.getElementById("excluirSelecionados");
      if (btnExcluir) {
        btnExcluir.style.display = "none";
      }
    }
  } catch (e) {
    console.error("❌ Erro ao excluir agendamentos selecionados:", e);
  }
}

function setupCheckboxHandlers() {
  // Handler para o checkbox "Selecionar Todos"
  const selectAll = document.getElementById("selectAll");
  if (selectAll) {
    selectAll.addEventListener("change", function () {
      const checkboxes = document.querySelectorAll(
        '#agendamentosTableBody input[type="checkbox"]',
      );
      checkboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;
      });
      toggleExcluirButton();
    });
  }

  // Observer para novos checkboxes adicionados dinamicamente
  const tableBody = document.getElementById("agendamentosTableBody");
  if (tableBody) {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1 && node.querySelector) {
              const checkbox = node.querySelector('input[type="checkbox"]');
              if (checkbox) {
                checkbox.addEventListener("change", toggleExcluirButton);
              }
            }
          });
        }
      });
    });

    observer.observe(tableBody, {
      childList: true,
      subtree: true,
    });
  }
}

function toggleExcluirButton() {
  const checkboxes = document.querySelectorAll(
    '#agendamentosTableBody input[type="checkbox"]:checked',
  );
  const btnExcluir = document.getElementById("excluirSelecionados");

  if (btnExcluir) {
    btnExcluir.style.display = checkboxes.length > 0 ? "inline-block" : "none";
  }
}

// Funções do Dropdown de Status
function toggleStatusDropdown(agendamentoId) {
  // Fechar outros dropdowns abertos
  document.querySelectorAll(".status-menu").forEach((menu) => {
    if (menu.id !== `statusMenu_${agendamentoId}`) {
      menu.style.display = "none";
    }
  });

  // Toggle do dropdown clicado
  const menu = document.getElementById(`statusMenu_${agendamentoId}`);
  if (menu) {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  }
}

function alterarStatus(agendamentoId, novoStatus, novoTexto) {
  // TODO: Usar ApiClient.atualizarAgendamento(agendamentoId, { status: novoStatus }) ao invés de localStorage
  console.warn(
    "⚠️ alterarStatus() usa localStorage - migrar para ApiClient.atualizarAgendamento()",
  );

  /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        // Atualizar no localStorage
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const agendamentoIndex = agendamentos.findIndex(ag => ag.id == agendamentoId);
        
        if (agendamentoIndex !== -1) {
            agendamentos[agendamentoIndex].status = novoStatus;
            agendamentos[agendamentoIndex].statusTexto = novoTexto;
            localStorage.setItem('agendamentos_persistidos', JSON.stringify(agendamentos));
        }

        // Atualizar no DOM
        const statusButton = document.querySelector(`[data-agendamento-id="${agendamentoId}"] .status-button`);
        if (statusButton) {
            // Remover classes de status antigas
            statusButton.className = 'status-button';
            // Adicionar nova classe de status
            statusButton.classList.add(`status-${novoStatus}`);
            // Atualizar texto
            statusButton.querySelector('.status-text').textContent = novoTexto;
        }

        // Fechar o dropdown
        const menu = document.getElementById(`statusMenu_${agendamentoId}`);
        if (menu) {
            menu.style.display = 'none';
        }

        console.log(`✅ Status alterado para: ${novoTexto}`);
    } catch (e) {
        console.error('❌ Erro ao alterar status:', e);
    }
    */
}

// Fechar dropdowns ao clicar fora
document.addEventListener("click", function (event) {
  if (!event.target.closest(".status-dropdown")) {
    document.querySelectorAll(".status-menu").forEach((menu) => {
      menu.style.display = "none";
    });
  }
});

// Função para navegar para detalhes do agendamento
function verDetalhesAgendamento(agendamentoId) {
  // TODO: Buscar agendamento da API via ApiClient.getAgendamento(agendamentoId)
  // localStorage.setItem('agendamento_atual') é aceitável para navegação temporária (UI state)
  console.warn(
    "⚠️ verDetalhesAgendamento() usa localStorage para busca - migrar para API",
  );

  /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        // Buscar dados do agendamento no localStorage
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const agendamento = agendamentos.find(ag => ag.id == agendamentoId);
        
        if (agendamento) {
            // Salvar dados do agendamento atual para a página de detalhes
            localStorage.setItem('agendamento_atual', JSON.stringify(agendamento));
            
            // Redirecionar para página de detalhes
            window.location.href = 'agendamento-detalhes.html';
            
            console.log('✅ Redirecionando para detalhes do agendamento:', agendamentoId);
        } else {
            console.error('❌ Agendamento não encontrado:', agendamentoId);
            showNotification('Agendamento não encontrado!', 'error');
        }
    } catch (e) {
        console.error('❌ Erro ao carregar detalhes do agendamento:', e);
        showNotification('Erro ao carregar detalhes do agendamento!', 'error');
    }
    */
}

// Configurar cliques nos agendamentos para navegação
function configurarCliqueAgendamentos() {
  document.addEventListener("click", function (event) {
    // Verificar se o clique foi em um agendamento (mas não em checkbox, botão de status, etc.)
    const agendamentoRow = event.target.closest(".agendamento-row");

    if (
      agendamentoRow &&
      !event.target.closest(".agendamento-controls") &&
      !event.target.closest(".status-dropdown") &&
      !event.target.closest("button")
    ) {
      const agendamentoId = agendamentoRow.dataset.agendamentoId;
      if (agendamentoId) {
        verDetalhesAgendamento(agendamentoId);
      }
    }
  });
}

// ================================
// LIVE SEARCH: Pet/Cliente (global modal)
// ================================
function escapeHtmlUnsafe(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeClienteValue(v) {
  try {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (typeof v === "object") {
      return (
        v.nome ||
        v.name ||
        v.nome_cliente ||
        v.clienteNome ||
        v.fullName ||
        (v.firstName && v.lastName ? v.firstName + " " + v.lastName : "") ||
        JSON.stringify(v)
      );
    }
    return String(v);
  } catch (e) {
    return String(v || "");
  }
}

function debounce(fn, wait) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// tenta várias URLs base para contornar execução via live-server (:5500) vs backend em outra porta
async function tryFetchAny(path) {
  const origin = window.location.origin;
  const API_BASE =
    (window.__API_BASE__ && window.__API_BASE__.toString()) || origin;
  const baseCandidates = ["", origin, API_BASE];
  let lastErr = null;
  for (const base of baseCandidates) {
    // montar URL absoluta: se base é '' e path absolute (startsWith '/'), use origin + path
    let url = path;
    try {
      if (base === "") {
        url = path.startsWith("/") ? origin + path : path;
      } else {
        // se base já contém origin, concatenar
        url = base.endsWith("/") ? base.slice(0, -1) + path : base + path;
      }
      const resp = await fetch(url, { credentials: "include" });
      if (resp && resp.ok) return resp;
      lastErr = new Error(`HTTP ${resp.status} from ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function setupPetClienteGlobalSearch() {
  const input = document.getElementById("petClienteGlobal");
  console.log(
    "[novo-atendimento-global] setupPetClienteGlobalSearch init, input?",
    !!input,
  );
  if (!input) return;

  // iniciar prefetch dos dados do sistema (cache global) — não bloqueante
  try {
    initGlobalPetsCache();
  } catch (e) {
    console.log("[novo-atendimento-global] initGlobalPetsCache erro", e);
  }

  // container para resultados
  let resultsContainer = document.getElementById(
    "resultados-pet-cliente-global",
  );
  if (!resultsContainer) {
    resultsContainer = document.createElement("div");
    resultsContainer.id = "resultados-pet-cliente-global";
    resultsContainer.style.cssText =
      "position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 1200000; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 6px 18px rgba(15,23,42,0.12); max-height: 280px; overflow: auto; display: none;";
    // colocar dentro do container do input
    const wrapper = input.parentElement || document.body;
    wrapper.style.position = wrapper.style.position || "relative";
    wrapper.appendChild(resultsContainer);
  }

  // ensure browser-autocomplete is off
  try {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
  } catch (e) {}

  const doSearch = debounce(async function () {
    const q = (input.value || "").toString().trim();
    console.log("[novo-atendimento-global] input event, value=", q);
    if (q.length < 1) {
      resultsContainer.style.display = "none";
      resultsContainer.innerHTML = "";
      return;
    }
    console.log("[novo-atendimento-global] procurando por", q);
    try {
      const { pets } = await searchPetsClientesGlobal(q);
      console.log(
        "[novo-atendimento-global] search returned",
        (pets && pets.length) || 0,
      );
      displaySearchResultsGlobal(pets, resultsContainer, input);
    } catch (err) {
      console.warn("[novo-atendimento-global] erro na busca global", err);
    }
  }, 250);

  input.addEventListener("input", doSearch);

  // esconder ao clicar fora
  document.addEventListener("click", function (ev) {
    if (!resultsContainer) return;
    if (!resultsContainer.contains(ev.target) && ev.target !== input) {
      resultsContainer.style.display = "none";
    }
  });
}

async function searchPetsClientesGlobal(query) {
  const q = query.toLowerCase();
  console.log(
    "[novo-atendimento-global] searchPetsClientesGlobal called with",
    q,
  );
  // 0) usar cache global se já pré-carregado
  try {
    if (
      window.__globalPetsCache &&
      Array.isArray(window.__globalPetsCache) &&
      window.__globalPetsCache.length > 0
    ) {
      console.log(
        "[novo-atendimento-global] usando cache global, items=",
        window.__globalPetsCache.length,
      );
      const pets = window.__globalPetsCache.filter((p) => {
        const nome = String(p.nome || "").toLowerCase();
        const cliente = String(
          normalizeClienteValue(p.cliente) || "",
        ).toLowerCase();
        return nome.includes(q) || cliente.includes(q);
      });
      return { pets };
    }
  } catch (e) {
    /* ignore */
  }

  // 1) tentar usar dados carregados em _meusPetsData (quando disponível)
  try {
    if (
      typeof _meusPetsData !== "undefined" &&
      Array.isArray(_meusPetsData) &&
      _meusPetsData.length > 0
    ) {
      console.log(
        "[novo-atendimento-global] usando _meusPetsData local, itens=",
        _meusPetsData.length,
      );
      const pets = _meusPetsData
        .filter((p) => {
          const nome = String(
            p.nome || p.pet || p.nome_pet || "",
          ).toLowerCase();
          const cliente = String(
            normalizeClienteValue(
              p.cliente || p.nome_cliente || p.owner || p.clienteNome || "",
            ),
          ).toLowerCase();
          return nome.includes(q) || cliente.includes(q);
        })
        .map((p) => ({
          id: p.id || p.codigo || p.pet_id || p._id || "",
          nome: p.nome || p.pet || p.nome_pet || "",
          cliente: normalizeClienteValue(
            p.cliente || p.nome_cliente || p.owner || p.clienteNome || "",
          ),
          clienteId:
            p.clienteId || p.cliente_id || p.codigo_cliente || p.codigo || "",
        }));
      return { pets };
    }
  } catch (e) {
    console.log("[novo-atendimento-global] _meusPetsData check falhou", e);
  }
  // 2) tentar API backend e popular cache global para buscas subsequentes
  try {
    // tentar carregar pets e clientes para montar uma lista completa
    const [petsResp, clientsResp] = await Promise.allSettled([
      tryFetchAny("/api/pets"),
      tryFetchAny("/api/clientes"),
    ]);

    let petsArr = [];
    let clientsArr = [];

    if (
      petsResp.status === "fulfilled" &&
      petsResp.value &&
      petsResp.value.ok
    ) {
      const json = await petsResp.value.json();
      petsArr = Array.isArray(json) ? json : json.pets || json.data || [];
    }
    if (
      clientsResp.status === "fulfilled" &&
      clientsResp.value &&
      clientsResp.value.ok
    ) {
      const json = await clientsResp.value.json();
      clientsArr = Array.isArray(json)
        ? json
        : json.clientes || json.data || [];
    }

    // montar mapa de clientes por id (tentando várias chaves)
    const clientsMap = {};
    (clientsArr || []).forEach((c) => {
      const id = c.id || c.codigo || c.cliente_id || c._id;
      if (id !== undefined) clientsMap[String(id)] = c;
    });

    const mapped = (petsArr || []).map((p) => {
      const clienteId =
        p.cliente_id ||
        p.cliente ||
        p.clienteId ||
        p.tutor_id ||
        p.codigo_cliente ||
        "";
      const cli = clientsMap[String(clienteId)] || {};
      const rawCliente =
        p.cliente ||
        p.nome_cliente ||
        cli.nome ||
        cli.nome_cliente ||
        cli ||
        "";
      return {
        id: p.id || p.codigo || p.pet_id || p._id || "",
        nome: p.nome || p.pet || p.nome_pet || "",
        cliente: normalizeClienteValue(rawCliente),
        clienteId: clienteId || cli.id || cli.codigo || "",
      };
    });

    // salvar em cache global para futuras buscas
    if (Array.isArray(mapped) && mapped.length > 0) {
      try {
        window.__globalPetsCache = mapped;
      } catch (e) {}
      const pets = mapped.filter((p) => {
        const nome = String(p.nome || "").toLowerCase();
        const cliente = String(p.cliente || "").toLowerCase();
        return nome.includes(q) || cliente.includes(q);
      });
      return { pets };
    }
  } catch (e) {
    console.log(
      "[novo-atendimento-global] fetch /api endpoints falhou",
      e && e.message,
    );
  }

  // 3) fallback: se não houver dados reais, retornar lista vazia (não mostrar sugestões amostrais)
  return { pets: [] };
}
// ================================
// LIVE SEARCH: Serviço/Produto (global modal)
// TODO: Usar ApiClient.getItens() ao invés de localStorage
// ================================
// Carrega meus itens (serviços/produtos) da API e mantém cache em window.__meusItensCache
function getMeusItensFromStorage() {
  // Retornar cache se disponível (sincrono). Em background garantimos carregar a partir da API.
  try {
    ensureMeusItensLoaded();
  } catch (e) {
    /* ignora */
  }
  return Array.isArray(window.__meusItensCache) ? window.__meusItensCache : [];
}

async function ensureMeusItensLoaded() {
  try {
    if (
      Array.isArray(window.__meusItensCache) &&
      window.__meusItensCache.length > 0
    )
      return window.__meusItensCache;
    if (window.__meusItensCacheLoading) return window.__meusItensCacheLoading;

    // iniciar carregamento e guardar promise para evitar chamadas duplicadas
    const p = (async () => {
      try {
        // Preferir função global existente (frontend/item/novo-produto.js exporta `getMeusItensFromAPI`)
        if (typeof window.getMeusItensFromAPI === "function") {
          const r = await window.getMeusItensFromAPI();
          window.__meusItensCache = Array.isArray(r) ? r : [];
          return window.__meusItensCache;
        }

        // Tentar ApiClient se disponível
        if (
          typeof ApiClient !== "undefined" &&
          typeof ApiClient.getProdutos === "function"
        ) {
          try {
            const produtos = await ApiClient.getProdutos();
            window.__meusItensCache = Array.isArray(produtos) ? produtos : [];
            return window.__meusItensCache;
          } catch (e) {
            /* continua para fallback */
          }
        }

        // Fallback: tentar endpoints REST comuns
        const candidates = [
          "/api/produtos",
          "/api/itens",
          "/api/produtos/meus",
          "/api/meus-itens",
          "/api/items",
          "/api/items/produtos",
        ];
        for (const url of candidates) {
          try {
            const resp = await tryFetchAny(url);
            if (resp && resp.ok) {
              const j = await resp.json();
              const arr = Array.isArray(j)
                ? j
                : j.produtos ||
                  j.itens ||
                  j.data ||
                  j.items ||
                  j.produtos_lista ||
                  [];
              window.__meusItensCache = Array.isArray(arr) ? arr : [];
              return window.__meusItensCache;
            }
          } catch (e) {
            /* next */
          }
        }

        // último recurso: cache vazio
        window.__meusItensCache = [];
        return window.__meusItensCache;
      } finally {
        try {
          delete window.__meusItensFromAPI_loading;
        } catch (e) {}
      }
    })();

    window.__meusItensCacheLoading = p;
    const res = await p;
    try {
      delete window.__meusItensCacheLoading;
    } catch (e) {}
    return res;
  } catch (e) {
    console.debug("[novo-atendimento-global] ensureMeusItensLoaded falhou", e);
    window.__meusItensCache = [];
    return window.__meusItensCache;
  }
}

function formatCurrencyBR(val) {
  const n = Number(val);
  if (isNaN(n)) return String(val || "");
  return (
    "R$ " +
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function setupServicoGlobalSearch() {
  const input = document.getElementById("servicoGlobal");
  const container = document.getElementById("resultados-servico-global");
  if (!input || !container) return;

  // garantir wrapper relative (já definido no HTML, mas reforçar)
  try {
    input.parentNode.style.position =
      input.parentNode.style.position || "relative";
  } catch (e) {}

  function getPriceFromObj(o) {
    if (!o) return "";
    // prioridade: campo 'preco' se definido
    if (o.preco !== undefined && o.preco !== null && o.preco !== "") {
      const n = Number(String(o.preco).toString().replace(",", "."));
      if (!isNaN(n)) return formatCurrencyBR(n);
    }
    const candidates = [
      "venda",
      "preço",
      "price",
      "valor",
      "valor_venda",
      "sale_price",
      "price_venda",
      "venda_preco",
      "valorUnitario",
      "valor_unitario",
      "price_value",
    ];
    for (const k of candidates) {
      if (o[k] !== undefined && o[k] !== null && o[k] !== "") {
        const n = Number(String(o[k]).replace(",", "."));
        if (!isNaN(n)) return formatCurrencyBR(n);
        return String(o[k]);
      }
    }
    // checar possíveis campos gerados por forms: 'venda' dentro de objetos aninhados
    if (o.precos && Array.isArray(o.precos) && o.precos.length > 0) {
      const p = o.precos[0];
      const n = Number(String(p).replace(",", "."));
      if (!isNaN(n)) return formatCurrencyBR(n);
    }
    return "";
  }

  function renderResults(items) {
    if (!items || items.length === 0) {
      container.innerHTML =
        '<div style="padding:12px;color:#666">Nenhum serviço encontrado</div>';
      container.style.display = "block";
      return;
    }

    const html = items
      .map((obj) => {
        const nome = escapeHtmlUnsafe(obj.nome || obj.titulo || "");
        const venda = getPriceFromObj(obj);
        const tipo = escapeHtmlUnsafe(String(obj.tipo || ""));
        return `
                    <div class="resultado-servico-item" data-id="${escapeHtmlUnsafe(obj.id)}" style="padding:12px 14px; border-bottom:1px solid #f6f6f6; cursor:pointer;">
                        <div style="font-weight:700; color:#222; margin-bottom:4px;">${nome}</div>
                        <div style="font-size:13px; color:#2c8a5a;">Preço: R$ ${venda} <span style="color:#999;margin-left:8px">| ${tipo}</span></div>
                    </div>`;
      })
      .join("");

    container.innerHTML = html;
    container.style.display = "block";

    // attach click handlers
    Array.from(container.querySelectorAll(".resultado-servico-item")).forEach(
      (el) => {
        el.onclick = async function (ev) {
          try {
            ev.stopPropagation();
            ev.preventDefault();
          } catch (e) {}
          console.log("[novo-atendimento-global] resultado item clicado");
          const id = this.getAttribute("data-id");
          try {
            await ensureMeusItensLoaded();
          } catch (e) {}
          const all = Array.isArray(window.__meusItensCache)
            ? window.__meusItensCache
            : [];
          const obj = all.find((x) => String(x.id) === String(id));
          if (obj) {
            input.value = obj.nome || obj.titulo || obj.name || "";
            input.setAttribute("data-selected-id", String(obj.id));

            // Armazenar o valor do serviço para uso posterior
            const preco = obj.preco || obj.venda || obj.valor || 0;
            const valor = Number(String(preco).replace(",", ".")) || 0;
            input.setAttribute("data-selected-valor", String(valor));
          } else {
            // fallback: set visible text
            input.value = this.textContent.trim();
            input.removeAttribute("data-selected-id");
            input.removeAttribute("data-selected-valor");
          }
          // esconder e evitar reabrir imediatamente por causa do focus handler
          container.style.display = "none";
          container.innerHTML = "";
          try {
            input.dataset.skipOpen = "1";
          } catch (e) {}
          // adicionar automaticamente o serviço selecionado (passar o objeto para evitar leituras race)
          try {
            console.log(
              "[novo-atendimento-global] clique item, chamando window.adicionarServicoGlobal com obj id=",
              obj && obj.id,
            );
            try {
              if (
                window &&
                typeof window.adicionarServicoGlobal === "function"
              ) {
                window.adicionarServicoGlobal(obj);
              } else {
                console.warn(
                  "[novo-atendimento-global] window.adicionarServicoGlobal não disponível",
                );
              }
            } catch (e) {
              console.warn(
                "[novo-atendimento-global] erro ao chamar adicionarServicoGlobal",
                e,
              );
            }
          } catch (e) {
            console.warn(
              "[novo-atendimento-global] falha ao adicionar automaticamente",
              e,
            );
          }
          // manter foco no input mas evitar que o evento focus reabra o dropdown
          try {
            input.focus();
          } catch (e) {}
          setTimeout(() => {
            try {
              delete input.dataset.skipOpen;
            } catch (e) {}
          }, 400);
        };
      },
    );
  }

  const doSearch = debounce(async function (query) {
    const q = (query || "").trim();
    if (!q) {
      container.style.display = "none";
      return;
    }
    // garantir que os itens estejam carregados (pode ser carregamento em background)
    try {
      await ensureMeusItensLoaded();
    } catch (e) {
      /* ignore */
    }
    const all = Array.isArray(window.__meusItensCache)
      ? window.__meusItensCache
      : [];
    const qq = q.toLowerCase();
    // buscar em nome/titulo apenas; limitar resultados
    const filtered = (all || [])
      .filter((it) => {
        const nome = String(
          it.nome || it.titulo || it.name || "",
        ).toLowerCase();
        const tipo = String(
          it.tipo || it.category || it.categoria || "",
        ).toLowerCase();
        // aceitar itens que sejam serviços (tipo/categoria contém 'serv')
        const isService =
          tipo.indexOf("serv") !== -1 ||
          (String(it.categoria || "") || "").toLowerCase().indexOf("serv") !==
            -1 ||
          String(it.tipo || "")
            .toLowerCase()
            .indexOf("serv") !== -1;
        return nome.includes(qq) && isService;
      })
      .slice(0, 40);
    renderResults(filtered);
  }, 250);

  input.addEventListener("input", function (e) {
    const v = e.target.value || "";
    doSearch(v);
  });

  // Garantir pré-carregamento dos meus itens e reexecutar a busca quando o carregamento finalizar
  try {
    ensureMeusItensLoaded()
      .then(() => {
        try {
          const v = (input.value || "").trim();
          if (v.length > 0) doSearch(v);
        } catch (e) {}
      })
      .catch(() => {});
  } catch (e) {
    /* ignore */
  }

  input.addEventListener("focus", function (e) {
    // se acabamos de selecionar, não reabrir o dropdown imediatamente
    if (input.dataset && input.dataset.skipOpen) {
      return;
    }
    if (e.target.value && e.target.value.trim().length > 0) {
      doSearch(e.target.value.trim());
    }
  });

  // fechar ao perder foco (com pequeno delay para clique funcionar)
  input.addEventListener("blur", function () {
    setTimeout(() => {
      try {
        container.style.display = "none";
      } catch (e) {}
    }, 180);
  });
}

// Inicializa (em background) cache global de pets/clientes a ser usada nas buscas
async function initGlobalPetsCache() {
  try {
    if (
      window.__globalPetsCache &&
      Array.isArray(window.__globalPetsCache) &&
      window.__globalPetsCache.length > 0
    )
      return window.__globalPetsCache;
    // tentar carregar dos endpoints
    const [petsResp, clientsResp] = await Promise.allSettled([
      tryFetchAny("/api/pets"),
      tryFetchAny("/api/clientes"),
    ]);
    let petsArr = [];
    let clientsArr = [];
    if (
      petsResp.status === "fulfilled" &&
      petsResp.value &&
      petsResp.value.ok
    ) {
      const json = await petsResp.value.json();
      petsArr = Array.isArray(json) ? json : json.pets || json.data || [];
    }
    if (
      clientsResp.status === "fulfilled" &&
      clientsResp.value &&
      clientsResp.value.ok
    ) {
      const json = await clientsResp.value.json();
      clientsArr = Array.isArray(json)
        ? json
        : json.clientes || json.data || [];
    }

    const clientsMap = {};
    (clientsArr || []).forEach((c) => {
      const id = c.id || c.codigo || c.cliente_id || c._id;
      if (id !== undefined) clientsMap[String(id)] = c;
    });

    const mapped = (petsArr || []).map((p) => {
      const clienteId =
        p.cliente_id ||
        p.cliente ||
        p.clienteId ||
        p.tutor_id ||
        p.codigo_cliente ||
        "";
      const cli = clientsMap[String(clienteId)] || {};
      const rawCliente =
        p.cliente ||
        p.nome_cliente ||
        cli.nome ||
        cli.nome_cliente ||
        cli ||
        "";
      return {
        id: p.id || p.codigo || p.pet_id || p._id || "",
        nome: p.nome || p.pet || p.nome_pet || "",
        cliente: normalizeClienteValue(rawCliente),
        clienteId: clienteId || cli.id || cli.codigo || "",
      };
    });

    if (Array.isArray(mapped) && mapped.length > 0) {
      try {
        window.__globalPetsCache = mapped;
      } catch (e) {}
      console.debug(
        "[novo-atendimento-global] initGlobalPetsCache carregou",
        mapped.length,
      );
      return mapped;
    }
  } catch (e) {
    console.debug(
      "[novo-atendimento-global] initGlobalPetsCache falhou",
      e && e.message,
    );
  }
  return [];
}

function displaySearchResultsGlobal(pets, container, input) {
  container.innerHTML = "";
  if (!pets || pets.length === 0) {
    container.style.display = "none";
    return;
  }
  pets.slice(0, 8).forEach((p) => {
    const item = document.createElement("div");
    item.className = "search-result-item-global";
    item.style.cssText =
      "padding:10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer;";
    const top = document.createElement("div");
    top.style.fontWeight = "700";
    top.style.color = "#0f172a";
    top.innerHTML = escapeHtmlUnsafe(p.nome || "—");
    const bottom = document.createElement("div");
    bottom.style.fontSize = "12px";
    bottom.style.color = "#475569";
    const clienteName = normalizeClienteValue(p.cliente);
    bottom.innerHTML = escapeHtmlUnsafe(
      (clienteName ? clienteName : "") +
        (p.clienteId ? " • Código: " + p.clienteId : ""),
    );
    item.appendChild(top);
    item.appendChild(bottom);
    item.addEventListener("click", function () {
      const clienteName = normalizeClienteValue(p.cliente);
      input.value = (p.nome || "") + (clienteName ? " — " + clienteName : "");
      // opcional: armazenar id em atributo para envio posterior
      input.setAttribute("data-selected-pet-id", p.id || "");
      container.style.display = "none";
    });
    container.appendChild(item);
  });
  container.style.display = "block";
}

// =============================================
// AUTO-EXECUÇÃO: Verificar se deve abrir modal
// =============================================
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 Página carregada - verificando flags...");

  // Carregar agendamentos temporários se estivermos na página de agendamentos
  const tableBody = document.getElementById("agendamentosTableBody");
  if (tableBody) {
    console.log(
      "📋 Página de agendamentos detectada - carregando temporários...",
    );
    carregarAgendamentosTemporarios();
  }

  // Verificar se deve abrir o modal automaticamente
  if (sessionStorage.getItem("abrirNovoAgendamento") === "true") {
    console.log("🔔 Flag encontrada - abrindo modal automaticamente...");
    sessionStorage.removeItem("abrirNovoAgendamento");

    // Aguardar um pouco para garantir que a página carregou
    setTimeout(() => {
      abrirNovoAgendamentoModal();
    }, 500);
  }
});

// =============================================
// COMPATIBILIDADE: Sobrescrever função antiga
// =============================================
if (typeof window.abrirNovoAgendamento !== "undefined") {
  window.abrirNovoAgendamento = abrirNovoAgendamentoModal;
}

// Exportar para escopo global
window.novoAtendimento = novoAtendimento;
window.abrirNovoAgendamentoModal = abrirNovoAgendamentoModal;

// =============================================
// SISTEMA DE CALENDÁRIO BRASILEIRO (encapsulado)
// =============================================

(function () {
  // Variáveis do calendário, isoladas no closure para evitar conflitos globais
  let calendarioAtual = new Date();
  let dataSelecionada = null;

  // Função para toggle do calendário (exposta globalmente)
  window.toggleCalendario = function () {
    const calendario = document.getElementById("calendarioFlutuante");
    if (!calendario) return;
    if (calendario.style.display === "none" || !calendario.style.display) {
      mostrarCalendario();
    } else {
      esconderCalendario();
    }
  };

  // Função para mostrar calendário
  function mostrarCalendario() {
    const calendario = document.getElementById("calendarioFlutuante");
    if (!calendario) return;
    calendario.style.display = "block";
    calendario.style.opacity = "0";
    calendario.style.transform = "translateY(-10px)";

    // Configurar calendário para o mês atual (Brasília)
    const agora = new Date();
    const brasilia = new Date(
      agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );
    calendarioAtual = new Date(brasilia.getFullYear(), brasilia.getMonth(), 1);

    renderizarCalendario();

    // Animação de entrada
    setTimeout(() => {
      calendario.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      calendario.style.opacity = "1";
      calendario.style.transform = "translateY(0)";
    }, 10);

    // Fechar calendário ao clicar fora
    setTimeout(() => {
      document.addEventListener("click", fecharCalendarioFora);
    }, 100);
  }

  // Função para esconder calendário
  function esconderCalendario() {
    const calendario = document.getElementById("calendarioFlutuante");
    if (!calendario) return;
    calendario.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    calendario.style.opacity = "0";
    calendario.style.transform = "translateY(-10px)";

    setTimeout(() => {
      calendario.style.display = "none";
    }, 200);

    document.removeEventListener("click", fecharCalendarioFora);
  }

  // Fechar calendário ao clicar fora
  function fecharCalendarioFora(e) {
    const calendario = document.getElementById("calendarioFlutuante");
    const inputData = document.getElementById("dataGlobal");
    if (!calendario || !inputData) return;
    if (!calendario.contains(e.target) && e.target !== inputData) {
      esconderCalendario();
    }
  }

  // Função para renderizar o calendário
  function renderizarCalendario() {
    const mesAno = document.getElementById("mesAnoCalendario");
    const diasGrid = document.getElementById("diasCalendario");
    if (!mesAno || !diasGrid) return;

    // Meses em português
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    // Atualizar header
    mesAno.textContent = `${meses[calendarioAtual.getMonth()]} ${calendarioAtual.getFullYear()}`;

    // Limpar grid
    diasGrid.innerHTML = "";

    // Primeiro dia do mês e último dia
    const primeiroDia = new Date(
      calendarioAtual.getFullYear(),
      calendarioAtual.getMonth(),
      1,
    );
    const ultimoDia = new Date(
      calendarioAtual.getFullYear(),
      calendarioAtual.getMonth() + 1,
      0,
    );

    // Dia da semana que começa o mês (0 = domingo)
    const inicioDaSemana = primeiroDia.getDay();

    // Data atual para highlight
    const hoje = new Date();
    const hojeBrasilia = new Date(
      hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );

    // Adicionar dias vazios no início
    for (let i = 0; i < inicioDaSemana; i++) {
      const diaVazio = document.createElement("div");
      diaVazio.style.cssText = "height: 28px;";
      diasGrid.appendChild(diaVazio);
    }

    // Adicionar todos os dias do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const diaElemento = document.createElement("div");
      diaElemento.textContent = dia;
      diaElemento.style.cssText = `
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 6px;
                font-size: 13px;
                transition: all 0.2s ease;
                user-select: none;
            `;

      // Verificar se é hoje
      const dataAtual = new Date(
        calendarioAtual.getFullYear(),
        calendarioAtual.getMonth(),
        dia,
      );
      const ehHoje = dataAtual.toDateString() === hojeBrasilia.toDateString();

      if (ehHoje) {
        diaElemento.style.background = "#007bff";
        diaElemento.style.color = "white";
        diaElemento.style.fontWeight = "600";
      } else {
        diaElemento.style.color = "#333";
      }

      // Verificar se está selecionado
      if (
        dataSelecionada &&
        dataAtual.toDateString() === dataSelecionada.toDateString()
      ) {
        diaElemento.style.background = "#28a745";
        diaElemento.style.color = "white";
        diaElemento.style.fontWeight = "600";
      }

      // Hover effect
      diaElemento.addEventListener("mouseenter", function () {
        if (
          !ehHoje &&
          (!dataSelecionada ||
            dataAtual.toDateString() !== dataSelecionada.toDateString())
        ) {
          this.style.background = "#f0f8ff";
          this.style.color = "#007bff";
        }
      });

      diaElemento.addEventListener("mouseleave", function () {
        if (
          !ehHoje &&
          (!dataSelecionada ||
            dataAtual.toDateString() !== dataSelecionada.toDateString())
        ) {
          this.style.background = "transparent";
          this.style.color = "#333";
        }
      });

      // Click event
      diaElemento.addEventListener("click", function () {
        selecionarData(dataAtual);
      });

      diasGrid.appendChild(diaElemento);
    }

    // Event listeners para navegação
    const btnAnt = document.getElementById("btnMesAnterior");
    const btnProx = document.getElementById("btnMesProximo");
    if (btnAnt)
      btnAnt.onclick = function () {
        calendarioAtual.setMonth(calendarioAtual.getMonth() - 1);
        renderizarCalendario();
      };
    if (btnProx)
      btnProx.onclick = function () {
        calendarioAtual.setMonth(calendarioAtual.getMonth() + 1);
        renderizarCalendario();
      };
  }

  // Função para selecionar uma data
  function selecionarData(data) {
    dataSelecionada = new Date(data);

    // Formatar data para brasileiro
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();

    const input = document.getElementById("dataGlobal");
    if (input) input.value = `${dia}/${mes}/${ano}`;

    esconderCalendario();
    renderizarCalendario(); // Re-renderizar para mostrar seleção
  }

  // Função para selecionar hoje (exposta globalmente)
  window.selecionarHoje = function () {
    const hoje = new Date();
    const hojeBrasilia = new Date(
      hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );
    selecionarData(hojeBrasilia);
  };
})();

// =============================================
// CALENDÁRIO SIDEBAR (WIDGET INDEPENDENTE)
// =============================================

// Função para abrir calendário sidebar
window.abrirCalendarioSidebar = function () {
  console.log("📅 Abrindo calendário sidebar...");

  // Remover sidebar anterior se existir
  const sidebarAnterior = document.getElementById("calendarioSidebarWidget");
  if (sidebarAnterior) {
    sidebarAnterior.remove();
  }

  const overlayAnterior = document.getElementById("calendarioOverlayWidget");
  if (overlayAnterior) {
    overlayAnterior.remove();
  }

  // Criar overlay
  const overlay = document.createElement("div");
  overlay.id = "calendarioOverlayWidget";
  overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999998;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

  // Criar sidebar do calendário
  const sidebar = document.createElement("div");
  sidebar.id = "calendarioSidebarWidget";
  sidebar.style.cssText = `
        position: fixed;
        top: 0;
        right: -400px;
        width: 400px;
        height: 100vh;
        background: white;
        z-index: 999999;
        box-shadow: -5px 0 20px rgba(0,0,0,0.1);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
    `;

  // HTML da sidebar
  sidebar.innerHTML = `
        <div style="padding: 25px; border-bottom: 1px solid #eee; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 600;">
                    <i class="fas fa-calendar-alt" style="margin-right: 10px;"></i>
                    Calendário
                </h3>
                <button onclick="fecharCalendarioSidebar()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="font-size: 14px; opacity: 0.9;">
                Selecione uma data para navegar
            </div>
        </div>
        
        <div style="flex: 1; padding: 30px; overflow-y: auto;">
            <!-- Data Selecionada -->
            <div id="dataSelecionadaWidget" style="background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Data Selecionada</div>
                <div id="dataExibicaoWidget" style="font-size: 24px; font-weight: 600; color: #007bff;">Nenhuma data selecionada</div>
            </div>
            
            <!-- Calendário -->
            <div style="background: white; border: 2px solid #007bff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <!-- Header do Calendário -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <button type="button" id="btnMesAnteriorWidget" style="background: none; border: none; font-size: 18px; color: #007bff; cursor: pointer; padding: 8px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h4 id="mesAnoCalendarioWidget" style="margin: 0; color: #007bff; font-size: 16px; font-weight: 600;"></h4>
                    <button type="button" id="btnMesProximoWidget" style="background: none; border: none; font-size: 18px; color: #007bff; cursor: pointer; padding: 8px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <!-- Dias da Semana -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 10px;">
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Dom</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Seg</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Ter</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Qua</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Qui</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Sex</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Sáb</div>
                </div>
                
                <!-- Grid dos Dias -->
                <div id="diasCalendarioWidget" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;"></div>
                
                <!-- Botões de Ação -->
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button type="button" onclick="selecionarHojeWidget()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                        <i class="fas fa-calendar-day"></i> Hoje
                    </button>
                    <button type="button" onclick="limparSelecaoWidget()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                        <i class="fas fa-eraser"></i> Limpar
                    </button>
                </div>
            </div>
            
            <!-- Ações Rápidas -->
            <div style="margin-top: 25px;">
                <h4 style="margin-bottom: 15px; color: #007bff; font-size: 16px;">
                    <i class="fas fa-bolt"></i> Ações Rápidas
                </h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="novoAtendimento()" style="background: #007bff; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#0056b3'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='#007bff'; this.style.transform='translateY(0)'">
                        <i class="fas fa-calendar-plus"></i>
                        Novo Atendimento
                    </button>
                    <button onclick="window.location.href='agendamentos-novo.html'" style="background: #17a2b8; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#138496'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='#17a2b8'; this.style.transform='translateY(0)'">
                        <i class="fas fa-calendar-alt"></i>
                        Ver Agenda
                    </button>
                </div>
            </div>
        </div>
    `;

  // Adicionar ao DOM
  document.body.appendChild(overlay);
  document.body.appendChild(sidebar);

  // Animação de entrada
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    sidebar.style.right = "0px";
  });

  // Inicializar calendário widget
  inicializarCalendarioWidget();

  // Fechar ao clicar no overlay
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      fecharCalendarioSidebar();
    }
  });
};

// Variáveis para o calendário widget (definir de forma idempotente para evitar erro se o script for carregado duas vezes)
window.calendarioWidgetAtual = window.calendarioWidgetAtual || new Date();
var calendarioWidgetAtual = window.calendarioWidgetAtual;
var dataSelecionadaWidget = null;

// Função para fechar calendário sidebar
window.fecharCalendarioSidebar = function () {
  const sidebar = document.getElementById("calendarioSidebarWidget");
  const overlay = document.getElementById("calendarioOverlayWidget");

  if (sidebar && overlay) {
    sidebar.style.right = "-400px";
    overlay.style.opacity = "0";

    setTimeout(() => {
      sidebar.remove();
      overlay.remove();
    }, 400);
  }
};

// Função para inicializar calendário widget
function inicializarCalendarioWidget() {
  const agora = new Date();
  const brasilia = new Date(
    agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  calendarioWidgetAtual = new Date(
    brasilia.getFullYear(),
    brasilia.getMonth(),
    1,
  );

  renderizarCalendarioWidget();
}

// Função para renderizar calendário widget
function renderizarCalendarioWidget() {
  const mesAno = document.getElementById("mesAnoCalendarioWidget");
  const diasGrid = document.getElementById("diasCalendarioWidget");

  if (!mesAno || !diasGrid) return;

  // Meses em português
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Atualizar header
  mesAno.textContent = `${meses[calendarioWidgetAtual.getMonth()]} ${calendarioWidgetAtual.getFullYear()}`;

  // Limpar grid
  diasGrid.innerHTML = "";

  // Primeiro dia do mês e último dia
  const primeiroDia = new Date(
    calendarioWidgetAtual.getFullYear(),
    calendarioWidgetAtual.getMonth(),
    1,
  );
  const ultimoDia = new Date(
    calendarioWidgetAtual.getFullYear(),
    calendarioWidgetAtual.getMonth() + 1,
    0,
  );

  // Dia da semana que começa o mês (0 = domingo)
  const inicioDaSemana = primeiroDia.getDay();

  // Data atual para highlight
  const hoje = new Date();
  const hojeBrasilia = new Date(
    hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );

  // Adicionar dias vazios no início
  for (let i = 0; i < inicioDaSemana; i++) {
    const diaVazio = document.createElement("div");
    diaVazio.style.cssText = "height: 40px;";
    diasGrid.appendChild(diaVazio);
  }

  // Adicionar todos os dias do mês
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const diaElemento = document.createElement("div");
    diaElemento.textContent = dia;
    diaElemento.style.cssText = `
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            user-select: none;
        `;

    // Verificar se é hoje
    const dataAtual = new Date(
      calendarioWidgetAtual.getFullYear(),
      calendarioWidgetAtual.getMonth(),
      dia,
    );
    const ehHoje = dataAtual.toDateString() === hojeBrasilia.toDateString();

    if (ehHoje) {
      diaElemento.style.background = "#007bff";
      diaElemento.style.color = "white";
      diaElemento.style.fontWeight = "600";
    } else {
      diaElemento.style.color = "#333";
    }

    // Verificar se está selecionado
    if (
      dataSelecionadaWidget &&
      dataAtual.toDateString() === dataSelecionadaWidget.toDateString()
    ) {
      diaElemento.style.background = "#28a745";
      diaElemento.style.color = "white";
      diaElemento.style.fontWeight = "600";
    }

    // Hover effect
    diaElemento.addEventListener("mouseenter", function () {
      if (
        !ehHoje &&
        (!dataSelecionadaWidget ||
          dataAtual.toDateString() !== dataSelecionadaWidget.toDateString())
      ) {
        this.style.background = "#e3f2fd";
        this.style.color = "#007bff";
        this.style.transform = "scale(1.1)";
      }
    });

    diaElemento.addEventListener("mouseleave", function () {
      if (
        !ehHoje &&
        (!dataSelecionadaWidget ||
          dataAtual.toDateString() !== dataSelecionadaWidget.toDateString())
      ) {
        this.style.background = "transparent";
        this.style.color = "#333";
        this.style.transform = "scale(1)";
      }
    });

    // Click event
    diaElemento.addEventListener("click", function () {
      selecionarDataWidget(dataAtual);
    });

    diasGrid.appendChild(diaElemento);
  }

  // Event listeners para navegação
  document.getElementById("btnMesAnteriorWidget").onclick = function () {
    calendarioWidgetAtual.setMonth(calendarioWidgetAtual.getMonth() - 1);
    renderizarCalendarioWidget();
  };

  document.getElementById("btnMesProximoWidget").onclick = function () {
    calendarioWidgetAtual.setMonth(calendarioWidgetAtual.getMonth() + 1);
    renderizarCalendarioWidget();
  };
}

// Função para selecionar data no widget
function selecionarDataWidget(data) {
  dataSelecionadaWidget = new Date(data);

  // Formatar data para exibição
  const diasSemana = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const diaSemana = diasSemana[data.getDay()];
  const dia = data.getDate();
  const mes = meses[data.getMonth()];
  const ano = data.getFullYear();

  const dataFormatada = `${diaSemana}, ${dia} de ${mes} de ${ano}`;

  document.getElementById("dataExibicaoWidget").textContent = dataFormatada;
  document.getElementById("dataSelecionadaWidget").style.border =
    "2px solid #28a745";
  document.getElementById("dataSelecionadaWidget").style.background = "#f8fff9";

  renderizarCalendarioWidget(); // Re-renderizar para mostrar seleção
}

// Função para selecionar hoje no widget
window.selecionarHojeWidget = function () {
  const hoje = new Date();
  const hojeBrasilia = new Date(
    hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  selecionarDataWidget(hojeBrasilia);
};

// Função para limpar seleção no widget
window.limparSelecaoWidget = function () {
  dataSelecionadaWidget = null;
  document.getElementById("dataExibicaoWidget").textContent =
    "Nenhuma data selecionada";
  document.getElementById("dataSelecionadaWidget").style.border =
    "2px solid #e9ecef";
  document.getElementById("dataSelecionadaWidget").style.background = "#f8f9fa";
  renderizarCalendarioWidget();
};

// =============================================
// CALENDÁRIO COMPACTO (PARA AGENDAMENTOS)
// =============================================

// Função para abrir calendário compacto
window.abrirCalendarioCompacto = function () {
  console.log("📅 Abrindo calendário compacto...");

  // Remover calendário anterior se existir
  const calendarioAnterior = document.getElementById(
    "calendarioCompactoWidget",
  );
  if (calendarioAnterior) {
    calendarioAnterior.remove();
  }

  // Obter posição do botão calendário
  const botaoCalendario = document.querySelector("#calendarioWidget");
  const rect = botaoCalendario.getBoundingClientRect();

  // Criar calendário compacto
  const calendario = document.createElement("div");
  calendario.id = "calendarioCompactoWidget";
  calendario.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 10}px;
        left: ${rect.left}px;
        width: 280px;
        background: white;
        border: 2px solid #007bff;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 999999;
        padding: 15px;
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

  // HTML do calendário compacto
  calendario.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #007bff; font-size: 14px; font-weight: 600;">
                <i class="fas fa-calendar-alt" style="margin-right: 5px;"></i>
                Calendário
            </h4>
            <button onclick="fecharCalendarioCompacto()" style="background: none; border: none; color: #666; font-size: 16px; cursor: pointer; padding: 2px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <!-- Header do Calendário -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 8px 12px; background: #28a745; border-radius: 8px;">
            <button type="button" id="btnMesAnteriorCompacto" style="background: none; border: none; font-size: 14px; color: white; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='none'">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div style="display: flex; justify-content: space-between; align-items: center; flex: 1; padding: 0 10px;">
                <h5 id="mesCalendarioCompacto" style="margin: 0; color: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="mostrarSeletorMeses()"></h5>
                <h5 id="anoCalendarioCompacto" style="margin: 0; color: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="mostrarSeletorAnos()"></h5>
            </div>
            <button type="button" id="btnMesProximoCompacto" style="background: none; border: none; font-size: 14px; color: white; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='none'">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        
        <!-- Container para visualizações (dias/meses/anos) -->
        <div id="calendarioConteudoCompacto">
            <!-- Dias da Semana -->
            <div id="diasSemanaCompacto" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 5px;">
                <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">D</div>
                <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
                <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">T</div>
                <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">Q</div>
                <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">Q</div>
                <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
                <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
            </div>
            
            <!-- Grid dos Dias -->
            <div id="diasCalendarioCompacto" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 10px;"></div>
        </div>
        
        <!-- Botões -->
        <div style="display: flex; gap: 5px; justify-content: center;">
            <button type="button" onclick="selecionarHojeCompacto()" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                Hoje
            </button>
            <button type="button" onclick="fecharCalendarioCompacto()" style="background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                Fechar
            </button>
        </div>
    `;

  // Adicionar ao DOM
  document.body.appendChild(calendario);

  // Verificar se o calendário sai da tela e ajustar posição
  const calendarioRect = calendario.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Ajustar horizontalmente se sair da tela
  if (calendarioRect.right > viewportWidth) {
    const newLeft = rect.right - 280; // Alinha pela direita do botão
    calendario.style.left = `${Math.max(10, newLeft)}px`;
  }

  // Ajustar verticalmente se sair da tela
  if (calendarioRect.bottom > viewportHeight) {
    const newTop = rect.top - calendarioRect.height - 10; // Abre acima do botão
    calendario.style.top = `${Math.max(10, newTop)}px`;
  }

  // Animação de entrada
  requestAnimationFrame(() => {
    calendario.style.opacity = "1";
    calendario.style.transform = "scale(1) translateY(0)";
  });

  // Inicializar calendário compacto
  inicializarCalendarioCompacto();

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener("click", fecharCalendarioCompactoFora);
  }, 100);
};

// Variáveis para o calendário compacto
let calendarioCompactoAtual = new Date();
let dataSelecionadaCompacto = null;

// Função para fechar calendário compacto
window.fecharCalendarioCompacto = function () {
  const calendario = document.getElementById("calendarioCompactoWidget");

  if (calendario) {
    calendario.style.opacity = "0";
    calendario.style.transform = "scale(0.9) translateY(-10px)";

    setTimeout(() => {
      calendario.remove();
    }, 300);
  }

  document.removeEventListener("click", fecharCalendarioCompactoFora);
};

// Fechar calendário compacto ao clicar fora
function fecharCalendarioCompactoFora(e) {
  const calendario = document.getElementById("calendarioCompactoWidget");
  const botaoCalendario = document.querySelector("#calendarioWidget");

  if (
    calendario &&
    !calendario.contains(e.target) &&
    e.target !== botaoCalendario &&
    !botaoCalendario.contains(e.target)
  ) {
    fecharCalendarioCompacto();
  }
}

// Função para inicializar calendário compacto
function inicializarCalendarioCompacto() {
  const agora = new Date();
  const brasilia = new Date(
    agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  calendarioCompactoAtual = new Date(
    brasilia.getFullYear(),
    brasilia.getMonth(),
    1,
  );

  renderizarCalendarioCompacto();
}

// Função para renderizar calendário compacto
function renderizarCalendarioCompacto() {
  const mesElemento = document.getElementById("mesCalendarioCompacto");
  const anoElemento = document.getElementById("anoCalendarioCompacto");
  const diasGrid = document.getElementById("diasCalendarioCompacto");
  const conteudo = document.getElementById("calendarioConteudoCompacto");

  if (!mesElemento || !anoElemento || !conteudo) return;

  // Resetar para modo dias
  modoCalendarioCompacto = "dias";

  // Meses em português
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Atualizar header - mês e ano separados
  mesElemento.textContent = meses[calendarioCompactoAtual.getMonth()];
  anoElemento.textContent = calendarioCompactoAtual.getFullYear();

  // Restaurar conteúdo de dias
  conteudo.innerHTML = `
        <!-- Dias da Semana -->
        <div id="diasSemanaCompacto" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 5px;">
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">D</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">T</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">Q</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">Q</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
        </div>
        
        <!-- Grid dos Dias -->
        <div id="diasCalendarioCompacto" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 10px;"></div>
    `;

  const diasGridNovo = document.getElementById("diasCalendarioCompacto");
  if (!diasGridNovo) return;

  // Primeiro dia do mês e último dia
  const primeiroDia = new Date(
    calendarioCompactoAtual.getFullYear(),
    calendarioCompactoAtual.getMonth(),
    1,
  );
  const ultimoDia = new Date(
    calendarioCompactoAtual.getFullYear(),
    calendarioCompactoAtual.getMonth() + 1,
    0,
  );

  // Dia da semana que começa o mês (0 = domingo)
  const inicioDaSemana = primeiroDia.getDay();

  // Data atual para highlight
  const hoje = new Date();
  const hojeBrasilia = new Date(
    hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );

  // Adicionar dias vazios no início
  for (let i = 0; i < inicioDaSemana; i++) {
    const diaVazio = document.createElement("div");
    diaVazio.style.cssText = "height: 22px;";
    diasGridNovo.appendChild(diaVazio);
  }

  // Adicionar todos os dias do mês
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const diaElemento = document.createElement("div");
    diaElemento.textContent = dia;
    diaElemento.style.cssText = `
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
            user-select: none;
        `;

    // Verificar se é hoje
    const dataAtual = new Date(
      calendarioCompactoAtual.getFullYear(),
      calendarioCompactoAtual.getMonth(),
      dia,
    );
    const ehHoje = dataAtual.toDateString() === hojeBrasilia.toDateString();

    if (ehHoje) {
      diaElemento.style.background = "#007bff";
      diaElemento.style.color = "white";
      diaElemento.style.fontWeight = "600";
    } else {
      diaElemento.style.color = "#333";
    }

    // Verificar se está selecionado
    if (
      dataSelecionadaCompacto &&
      dataAtual.toDateString() === dataSelecionadaCompacto.toDateString()
    ) {
      diaElemento.style.background = "#28a745";
      diaElemento.style.color = "white";
      diaElemento.style.fontWeight = "600";
    }

    // Hover effect
    diaElemento.addEventListener("mouseenter", function () {
      if (
        !ehHoje &&
        (!dataSelecionadaCompacto ||
          dataAtual.toDateString() !== dataSelecionadaCompacto.toDateString())
      ) {
        this.style.background = "#e3f2fd";
        this.style.color = "#2c5aa0";
        this.style.transform = "scale(1.1)";
      }
    });

    diaElemento.addEventListener("mouseleave", function () {
      if (
        !ehHoje &&
        (!dataSelecionadaCompacto ||
          dataAtual.toDateString() !== dataSelecionadaCompacto.toDateString())
      ) {
        this.style.background = "transparent";
        this.style.color = "#333";
        this.style.transform = "scale(1)";
      }
    });

    // Click event
    diaElemento.addEventListener("click", function () {
      selecionarDataCompacto(dataAtual);
    });

    diasGridNovo.appendChild(diaElemento);
  }

  // Event listeners para navegação
  document.getElementById("btnMesAnteriorCompacto").onclick = function () {
    if (modoCalendarioCompacto === "anos") {
      calendarioCompactoAtual.setFullYear(
        calendarioCompactoAtual.getFullYear() - 16,
      );
      mostrarSeletorAnos();
    } else if (modoCalendarioCompacto === "meses") {
      calendarioCompactoAtual.setFullYear(
        calendarioCompactoAtual.getFullYear() - 1,
      );
      mostrarSeletorMeses();
    } else {
      calendarioCompactoAtual.setMonth(calendarioCompactoAtual.getMonth() - 1);
      renderizarCalendarioCompacto();
    }
  };

  document.getElementById("btnMesProximoCompacto").onclick = function () {
    if (modoCalendarioCompacto === "anos") {
      calendarioCompactoAtual.setFullYear(
        calendarioCompactoAtual.getFullYear() + 16,
      );
      mostrarSeletorAnos();
    } else if (modoCalendarioCompacto === "meses") {
      calendarioCompactoAtual.setFullYear(
        calendarioCompactoAtual.getFullYear() + 1,
      );
      mostrarSeletorMeses();
    } else {
      calendarioCompactoAtual.setMonth(calendarioCompactoAtual.getMonth() + 1);
      renderizarCalendarioCompacto();
    }
  };
}

// Função para selecionar data no calendário compacto
function selecionarDataCompacto(data) {
  dataSelecionadaCompacto = new Date(data);

  // Formatar data para brasileiro
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();

  console.log(`📅 Data selecionada: ${dia}/${mes}/${ano}`);

  // Atualizar data no AgendamentosManager se existir
  if (window.agendamentosManager) {
    window.agendamentosManager.currentDate = new Date(data);

    // Se estava em "Hoje", mudar para "Dia"
    if (window.agendamentosManager.period === "today") {
      window.agendamentosManager.period = "day";

      // Atualizar botões visuais
      document.querySelectorAll(".view-period-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.period === "day") {
          btn.classList.add("active");
        }
      });

      console.log('📅 Mudando de "Hoje" para "Dia"');
    }

    window.agendamentosManager.updateDateDisplay();
    window.agendamentosManager.handlePeriodChange(
      window.agendamentosManager.period,
    );
    window.agendamentosManager.saveCurrentDate();
    window.agendamentosManager.savePeriod();
  }

  // Fechar calendário após seleção
  setTimeout(() => {
    fecharCalendarioCompacto();
  }, 300);

  renderizarCalendarioCompacto(); // Re-renderizar para mostrar seleção
}

// Função para selecionar hoje no calendário compacto
window.selecionarHojeCompacto = function () {
  const hoje = new Date();
  const hojeBrasilia = new Date(
    hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  selecionarDataCompacto(hojeBrasilia);
};

// Variável para controlar o modo do calendário (dias, meses, anos)
let modoCalendarioCompacto = "dias";

// Função para mostrar seletor de meses
window.mostrarSeletorMeses = function () {
  modoCalendarioCompacto = "meses";
  const conteudo = document.getElementById("calendarioConteudoCompacto");

  if (!conteudo) return;

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  conteudo.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px;">
            ${meses
              .map(
                (mes, index) => `
                <div onclick="event.stopPropagation(); selecionarMesCompacto(${index})" style="
                    padding: 12px;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #666;
                    transition: all 0.2s;
                    background: ${calendarioCompactoAtual.getMonth() === index ? "#28a745" : "#f8f9fa"};
                    color: ${calendarioCompactoAtual.getMonth() === index ? "white" : "#666"};
                " onmouseover="if(${calendarioCompactoAtual.getMonth() !== index}) this.style.background='#e9ecef'" onmouseout="if(${calendarioCompactoAtual.getMonth() !== index}) this.style.background='#f8f9fa'">
                    ${mes}
                </div>
            `,
              )
              .join("")}
        </div>
    `;

  // Atualizar header
  document.getElementById("mesCalendarioCompacto").textContent =
    "Selecione o Mês";
  document.getElementById("anoCalendarioCompacto").textContent =
    calendarioCompactoAtual.getFullYear();
};

// Função para mostrar seletor de anos
window.mostrarSeletorAnos = function () {
  modoCalendarioCompacto = "anos";
  const conteudo = document.getElementById("calendarioConteudoCompacto");

  if (!conteudo) return;

  const anoAtual = calendarioCompactoAtual.getFullYear();
  const anoInicio = anoAtual - 8;
  const anos = [];

  for (let i = 0; i < 16; i++) {
    anos.push(anoInicio + i);
  }

  conteudo.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px;">
            ${anos
              .map(
                (ano) => `
                <div onclick="event.stopPropagation(); selecionarAnoCompacto(${ano})" style="
                    padding: 12px;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                    background: ${calendarioCompactoAtual.getFullYear() === ano ? "#28a745" : "#f8f9fa"};
                    color: ${calendarioCompactoAtual.getFullYear() === ano ? "white" : "#666"};
                " onmouseover="if(${calendarioCompactoAtual.getFullYear() !== ano}) this.style.background='#e9ecef'" onmouseout="if(${calendarioCompactoAtual.getFullYear() !== ano}) this.style.background='#f8f9fa'">
                    ${ano}
                </div>
            `,
              )
              .join("")}
        </div>
    `;

  // Atualizar header para mostrar intervalo de anos
  const anoFim = anoInicio + 15;
  document.getElementById("mesCalendarioCompacto").textContent =
    "Selecione o Ano";
  document.getElementById("anoCalendarioCompacto").textContent =
    `${anoInicio} - ${anoFim}`;
};

// Função para selecionar mês
window.selecionarMesCompacto = function (mes) {
  console.log("📅 Mês selecionado:", mes);
  calendarioCompactoAtual.setMonth(mes);
  modoCalendarioCompacto = "dias";
  renderizarCalendarioCompacto();
};

// Função para selecionar ano
window.selecionarAnoCompacto = function (ano) {
  console.log("📅 Ano selecionado:", ano);
  calendarioCompactoAtual.setFullYear(ano);
  // Após selecionar ano, mostrar seletor de meses
  mostrarSeletorMeses();
};

// ==============================================================
// FLUXO DE CANCELAMENTO DE AGENDAMENTO COM AUTENTICAÇÃO GERENTE
// ==============================================================
// Disponível globalmente para agendamentos-novo e agendamento-detalhes
window.iniciarFluxoCancelamento = function (agendamentoId, onSuccess) {
  // ---- ESTILOS COMPARTILHADOS ----
  const estiloOverlay = {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,0.50)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "20000",
  };
  const estiloModal = {
    width: "460px",
    maxWidth: "94%",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 16px 48px rgba(2,6,23,0.40)",
    padding: "28px 28px 22px",
    fontFamily: "inherit",
  };
  const estiloTitulo = {
    fontSize: "17px",
    fontWeight: "700",
    marginBottom: "10px",
    color: "#1a1a2e",
  };
  const estiloMensagem = {
    fontSize: "14px",
    color: "#444",
    marginBottom: "22px",
    lineHeight: "1.55",
  };
  const estiloBtn = (bg, color) => ({
    background: bg,
    color: color || "#fff",
    border: "none",
    padding: "9px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  });
  function aplicarEstilo(el, obj) {
    Object.assign(el.style, obj);
  }

  // ---- MODAL 1: CONFIRMAÇÃO ----
  const ov1 = document.createElement("div");
  aplicarEstilo(ov1, estiloOverlay);

  const m1 = document.createElement("div");
  aplicarEstilo(m1, estiloModal);

  const titulo1 = document.createElement("div");
  aplicarEstilo(titulo1, estiloTitulo);
  titulo1.innerHTML =
    '<span style="color:#c12b2b">&#9888;</span> Cancelar Agendamento';

  const msg1 = document.createElement("div");
  aplicarEstilo(msg1, estiloMensagem);
  msg1.textContent =
    "Tem certeza que deseja cancelar este agendamento? Esta ação não poderá ser desfeita e o registro será removido permanentemente.";

  const sep1 = document.createElement("hr");
  sep1.style.cssText =
    "border:none;border-top:1px solid #e5e7eb;margin:0 0 18px";

  const acoes1 = document.createElement("div");
  acoes1.style.cssText = "display:flex;justify-content:flex-end;gap:10px";

  const btnNao = document.createElement("button");
  aplicarEstilo(btnNao, estiloBtn("#6c757d"));
  btnNao.textContent = "Não, voltar";

  const btnSim = document.createElement("button");
  aplicarEstilo(btnSim, estiloBtn("#c12b2b"));
  btnSim.textContent = "Sim, cancelar";

  acoes1.appendChild(btnNao);
  acoes1.appendChild(btnSim);
  m1.appendChild(titulo1);
  m1.appendChild(msg1);
  m1.appendChild(sep1);
  m1.appendChild(acoes1);
  ov1.appendChild(m1);
  document.body.appendChild(ov1);

  btnNao.addEventListener("click", () => ov1.remove());
  ov1.addEventListener("click", (e) => {
    if (e.target === ov1) ov1.remove();
  });

  btnSim.addEventListener("click", () => {
    ov1.remove();

    // ---- MODAL 2: CREDENCIAIS DO GERENTE ----
    const ov2 = document.createElement("div");
    aplicarEstilo(ov2, estiloOverlay);

    const m2 = document.createElement("div");
    aplicarEstilo(m2, estiloModal);

    const titulo2 = document.createElement("div");
    aplicarEstilo(titulo2, estiloTitulo);
    titulo2.textContent = "Autorização do Gerente";

    const msg2 = document.createElement("div");
    aplicarEstilo(msg2, estiloMensagem);
    msg2.textContent =
      "Para confirmar o cancelamento, insira as credenciais do gerente principal ou do LOGIN INICIAL.";

    const estiloLabel =
      "display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:4px";
    const estiloInput =
      "width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:9px 11px;font-size:14px;margin-bottom:14px;outline:none";

    const lblUsuario = document.createElement("label");
    lblUsuario.style.cssText = estiloLabel;
    lblUsuario.textContent = "Usuário";
    const inputUsuario = document.createElement("input");
    inputUsuario.type = "text";
    inputUsuario.placeholder = "Login do gerente";
    inputUsuario.style.cssText = estiloInput;
    inputUsuario.autocomplete = "off";

    const lblSenha = document.createElement("label");
    lblSenha.style.cssText = estiloLabel;
    lblSenha.textContent = "Senha";
    const inputSenha = document.createElement("input");
    inputSenha.type = "password";
    inputSenha.placeholder = "Senha do gerente";
    inputSenha.style.cssText = estiloInput;

    const msgErro = document.createElement("div");
    msgErro.style.cssText =
      "color:#c12b2b;font-size:13px;margin-bottom:12px;display:none";

    const sep2 = document.createElement("hr");
    sep2.style.cssText =
      "border:none;border-top:1px solid #e5e7eb;margin:4px 0 18px";

    const acoes2 = document.createElement("div");
    acoes2.style.cssText = "display:flex;justify-content:flex-end;gap:10px";

    const btnCancelar2 = document.createElement("button");
    aplicarEstilo(btnCancelar2, estiloBtn("#6c757d"));
    btnCancelar2.textContent = "Cancelar";

    const btnConfirmar = document.createElement("button");
    aplicarEstilo(btnConfirmar, estiloBtn("#c12b2b"));
    btnConfirmar.textContent = "Confirmar cancelamento";

    acoes2.appendChild(btnCancelar2);
    acoes2.appendChild(btnConfirmar);

    m2.appendChild(titulo2);
    m2.appendChild(msg2);
    m2.appendChild(lblUsuario);
    m2.appendChild(inputUsuario);
    m2.appendChild(lblSenha);
    m2.appendChild(inputSenha);
    m2.appendChild(msgErro);
    m2.appendChild(sep2);
    m2.appendChild(acoes2);
    ov2.appendChild(m2);
    document.body.appendChild(ov2);

    setTimeout(() => inputUsuario.focus(), 80);

    btnCancelar2.addEventListener("click", () => ov2.remove());

    async function submeter() {
      const usuario = inputUsuario.value.trim();
      const senha = inputSenha.value;
      if (!usuario || !senha) {
        msgErro.textContent = "Preencha o usuário e a senha.";
        msgErro.style.display = "block";
        return;
      }
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = "Aguarde...";
      msgErro.style.display = "none";
      try {
        const res = await fetch(`/api/agendamentos/${agendamentoId}/cancelar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ usuario, senha }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          ov2.remove();
          try {
            if (typeof showNotification === "function")
              showNotification(
                'Agendamento cancelado. Ele aparecerá no filtro "Cancelado".',
                "success",
              );
          } catch (e) {}
          if (typeof onSuccess === "function") onSuccess();
        } else {
          msgErro.textContent =
            data.error || "Credenciais inválidas ou sem permissão.";
          msgErro.style.display = "block";
          btnConfirmar.disabled = false;
          btnConfirmar.textContent = "Confirmar cancelamento";
        }
      } catch (e) {
        msgErro.textContent = "Erro de conexão. Tente novamente.";
        msgErro.style.display = "block";
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar cancelamento";
      }
    }

    btnConfirmar.addEventListener("click", submeter);
    // submeter com Enter
    [inputUsuario, inputSenha].forEach((inp) => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submeter();
      });
    });
  });
};

console.log("🌟 Sistema Global de Novo Atendimento configurado!");

} // fim do guard (else) — fecha o bloco iniciado no topo do arquivo
