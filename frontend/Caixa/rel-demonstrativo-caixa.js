// ============================================
// DEMONSTRATIVO DE FRENTE DE CAIXA
// ============================================

class DemonstrativoCaixa {
  constructor() {
    this.caixaSelecionado = null;
    this.dataInicio = null;
    this.dataFim = null;
    this.mesAtual1 = new Date(2025, 10, 1); // Novembro 2025
    this.mesAtual2 = new Date(2025, 11, 1); // Dezembro 2025
    this.dataSelecionadaInicio = null;
    this.dataSelecionadaFim = null;
    // URL base da API: use variável global `__API_BASE__` se definida, senão rota relativa
    this.apiBase =
      (window.__API_BASE__ && window.__API_BASE__.toString()) || "";
    console.log("API base definida como", this.apiBase || "mesma origem");

    this.init();
  }

  init() {
    this.setupEventListeners();
    // Garantir que todos os totais comecem zerados até o usuário selecionar um período
    this.zerarTotais();
    this.buscarCaixaAberto();
    this.adicionarEstilosNotificacao();
  }

  // Zera os valores exibidos nos cards e limpa footers
  zerarTotais() {
    const zero = (v) => (v ? v : "0,00");

    // Dinheiro
    const cardDinheiro = document.querySelector(".total-dinheiro");
    if (cardDinheiro) {
      cardDinheiro.querySelector(".total-value").textContent = `R$ 0,00`;
      const items = cardDinheiro.querySelectorAll(
        ".total-item span:last-child",
      );
      if (items.length >= 11) {
        for (let i = 0; i < 11; i++) items[i].textContent = "0.00";
      }
    }

    // Cartão
    const cardCartao = document.querySelector(".total-cartao");
    if (cardCartao) {
      cardCartao.querySelector(".total-value").textContent = "0,00";
      const items = cardCartao.querySelectorAll(".total-item span:last-child");
      if (items.length >= 4)
        for (let i = 0; i < 4; i++) items[i].textContent = "0.00";
      const footer = cardCartao.querySelector(".total-footer");
      if (footer) footer.innerHTML = "";
    }

    // Cheque
    const cardCheque = document.querySelector(".total-cheque");
    if (cardCheque) {
      cardCheque.querySelector(".total-value").textContent = "0,00";
      const items = cardCheque.querySelectorAll(".total-item span:last-child");
      if (items.length >= 7)
        for (let i = 0; i < 7; i++) items[i].textContent = "0.00";
      const footer = cardCheque.querySelector(".total-footer");
      if (footer) footer.innerHTML = "";
    }

    // Crediário
    const cardCrediario = document.querySelector(".total-crediario");
    if (cardCrediario) {
      cardCrediario.querySelector(".total-value").textContent = "0,00";
      const items = cardCrediario.querySelectorAll(
        ".total-item span:last-child",
      );
      if (items.length >= 2)
        for (let i = 0; i < 2; i++) items[i].textContent = "0.00";
      const footer = cardCrediario.querySelector(".total-footer");
      if (footer) footer.innerHTML = "";
    }

    // Pix
    const cardPix = document.querySelector(".total-pix");
    if (cardPix) {
      cardPix.querySelector(".total-value").textContent = `R$ 0,00`;
      const items = cardPix.querySelectorAll(".total-item span:last-child");
      if (items.length >= 4)
        for (let i = 0; i < 4; i++) items[i].textContent = "0.00";
      const footer = cardPix.querySelector(".total-footer");
      if (footer) footer.innerHTML = "";
    }

    // Remover gráfico se existir
    if (this._chart0) {
      try {
        this._chart0.destroy();
      } catch (e) {}
      this._chart0 = null;
    }
    const graficoContainer = document.getElementById("grafico-container");
    if (graficoContainer) graficoContainer.remove();
  }

  setupEventListeners() {
    // Botão para abrir modal de pesquisa
    const btnAbrirPesquisa = document.getElementById("btnAbrirPesquisa");
    if (btnAbrirPesquisa) {
      btnAbrirPesquisa.addEventListener("click", () =>
        this.abrirModalPesquisa(),
      );
    }

    // Botão para fechar modal
    const btnFecharPesquisa = document.getElementById("btnFecharPesquisa");
    if (btnFecharPesquisa) {
      btnFecharPesquisa.addEventListener("click", () =>
        this.fecharModalPesquisa(),
      );
    }

    // Fechar modal ao clicar fora
    const modalOverlay = document.getElementById("modalPesquisaCaixa");
    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
          this.fecharModalPesquisa();
        }
      });
    }

    // Campo de período - abre calendários ao clicar
    const periodoInput = document.getElementById("periodoDisplay");
    if (periodoInput) {
      periodoInput.addEventListener("click", () => this.abrirCalendarios());
    }

    // Botão pesquisar período
    const btnPesquisarPeriodo = document.getElementById("btnPesquisarPeriodo");
    if (btnPesquisarPeriodo) {
      btnPesquisarPeriodo.addEventListener("click", () =>
        this.abrirCalendarios(),
      );
    }

    // Navegação dos calendários
    document
      .getElementById("btnMesAnterior1")
      ?.addEventListener("click", () => this.navegarMes(1, -1));
    document
      .getElementById("btnMesSeguinte1")
      ?.addEventListener("click", () => this.navegarMes(1, 1));
    document
      .getElementById("btnMesAnterior2")
      ?.addEventListener("click", () => this.navegarMes(2, -1));
    document
      .getElementById("btnMesSeguinte2")
      ?.addEventListener("click", () => this.navegarMes(2, 1));

    // Botão confirmar período
    const btnConfirmarPeriodo = document.getElementById("btnConfirmarPeriodo");
    if (btnConfirmarPeriodo) {
      btnConfirmarPeriodo.addEventListener("click", () =>
        this.confirmarPeriodo(),
      );
    }
  }

  async buscarCaixaAberto() {
    try {
      const response = await fetch(`${this.apiBase}/api/caixas/aberto`);
      const data = await response.json();

      // A API pode retornar { caixa } ou o objeto caixa diretamente
      const caixaObj = data.caixa ? data.caixa : data.numero ? data : null;
      if (caixaObj) {
        const numeroCaixaInput = document.getElementById("numeroCaixa");
        if (numeroCaixaInput) {
          // Campo `numero` contém texto como "Caixa 01" — manter formato
          numeroCaixaInput.value = caixaObj.numero;
        }
      }
    } catch (error) {
      console.error("Erro ao buscar caixa aberto:", error);
    }
  }

  async abrirModalPesquisa() {
    const numeroCaixa = document.getElementById("numeroCaixa").value;

    if (!numeroCaixa) {
      this.mostrarNotificacao(
        "Por favor, informe o número do caixa",
        "warning",
      );
      return;
    }

    // Buscar informações do caixa
    try {
      // Garantir que o número esteja no formato correto (ex: "Caixa 01")
      const numeroFormatado = numeroCaixa.includes("Caixa")
        ? numeroCaixa
        : `Caixa ${numeroCaixa}`;
      console.log("Buscando caixa:", numeroFormatado);

      const response = await fetch(
        `${this.apiBase}/api/caixas/numero/${encodeURIComponent(numeroFormatado)}`,
      );
      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Dados recebidos:", data);

      if (!response.ok) {
        throw new Error(data.erro || "Caixa não encontrado");
      }

      if (data.caixa) {
        this.caixaSelecionado = data.caixa;

        // Preencher informações do caixa
        document.getElementById("dataAbertura").value = this.formatarDataHora(
          data.caixa.dataAbertura,
        );
        document.getElementById("dataFechamento").value = data.caixa
          .dataFechamento
          ? this.formatarDataHora(data.caixa.dataFechamento)
          : "Em aberto";
        document.getElementById("responsavel").value = data.caixa.usuario || "";

        // Abrir modal
        document.getElementById("modalPesquisaCaixa").style.display = "flex";
      } else {
        this.mostrarNotificacao("Caixa não encontrado", "error");
      }
    } catch (error) {
      console.error("Erro ao buscar caixa:", error);
      this.mostrarNotificacao("Caixa não encontrado", "error");
    }
  }

  fecharModalPesquisa() {
    document.getElementById("modalPesquisaCaixa").style.display = "none";
    document.getElementById("calendariosContainer").style.display = "none";
    document.getElementById("actionsButtons").style.display = "none";
  }

  abrirCalendarios() {
    const calendariosContainer = document.getElementById(
      "calendariosContainer",
    );
    const actionsButtons = document.getElementById("actionsButtons");

    if (calendariosContainer.style.display === "none") {
      calendariosContainer.style.display = "grid";
      actionsButtons.style.display = "flex";

      // Renderizar calendários
      this.renderizarCalendario(1);
      this.renderizarCalendario(2);
    } else {
      calendariosContainer.style.display = "none";
      actionsButtons.style.display = "none";
    }
  }

  navegarMes(calendario, direcao) {
    if (calendario === 1) {
      this.mesAtual1.setMonth(this.mesAtual1.getMonth() + direcao);
      this.renderizarCalendario(1);
    } else {
      this.mesAtual2.setMonth(this.mesAtual2.getMonth() + direcao);
      this.renderizarCalendario(2);
    }
  }

  renderizarCalendario(numCalendario) {
    const mesAtual = numCalendario === 1 ? this.mesAtual1 : this.mesAtual2;
    const calendarioEl = document.getElementById(`calendario${numCalendario}`);
    const mesAnoEl = document.getElementById(`mesAno${numCalendario}`);

    // Atualizar título
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
    mesAnoEl.textContent = `${meses[mesAtual.getMonth()]} ${mesAtual.getFullYear()}`;

    // Limpar calendário
    calendarioEl.innerHTML = "";

    // Dias da semana
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    diasSemana.forEach((dia) => {
      const diaEl = document.createElement("div");
      diaEl.className = "dia-semana";
      diaEl.textContent = dia;
      calendarioEl.appendChild(diaEl);
    });

    // Calcular dias do mês
    const primeiroDia = new Date(
      mesAtual.getFullYear(),
      mesAtual.getMonth(),
      1,
    );
    const ultimoDia = new Date(
      mesAtual.getFullYear(),
      mesAtual.getMonth() + 1,
      0,
    );
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();

    // Dias do mês anterior (em branco)
    for (let i = 0; i < diaSemanaInicio; i++) {
      const mesAnterior = new Date(
        mesAtual.getFullYear(),
        mesAtual.getMonth(),
        0,
      );
      const diaAnterior = mesAnterior.getDate() - (diaSemanaInicio - i - 1);

      const diaEl = document.createElement("div");
      diaEl.className = "dia-numero dia-outro-mes";
      diaEl.textContent = diaAnterior;
      calendarioEl.appendChild(diaEl);
    }

    // Dias do mês atual
    const hoje = new Date();
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataAtual = new Date(
        mesAtual.getFullYear(),
        mesAtual.getMonth(),
        dia,
      );
      const diaEl = document.createElement("div");
      diaEl.className = "dia-numero";
      diaEl.textContent = dia;

      // Marcar dia de hoje
      if (dataAtual.toDateString() === hoje.toDateString()) {
        diaEl.classList.add("dia-hoje");
      }

      // Marcar dias selecionados
      if (
        this.dataSelecionadaInicio &&
        dataAtual.toDateString() === this.dataSelecionadaInicio.toDateString()
      ) {
        diaEl.classList.add("dia-selecionado");
      }
      if (
        this.dataSelecionadaFim &&
        dataAtual.toDateString() === this.dataSelecionadaFim.toDateString()
      ) {
        diaEl.classList.add("dia-selecionado");
      }

      // Marcar range entre datas
      if (this.dataSelecionadaInicio && this.dataSelecionadaFim) {
        if (
          dataAtual > this.dataSelecionadaInicio &&
          dataAtual < this.dataSelecionadaFim
        ) {
          diaEl.classList.add("dia-range");
        }
      }

      // Evento de clique
      diaEl.addEventListener("click", () => this.selecionarData(dataAtual));

      calendarioEl.appendChild(diaEl);
    }

    // Completar grade com dias do próximo mês
    const diasRestantes = 42 - (diaSemanaInicio + diasNoMes);
    for (let i = 1; i <= diasRestantes; i++) {
      const diaEl = document.createElement("div");
      diaEl.className = "dia-numero dia-outro-mes";
      diaEl.textContent = i;
      calendarioEl.appendChild(diaEl);
    }
  }

  selecionarData(data) {
    if (
      !this.dataSelecionadaInicio ||
      (this.dataSelecionadaInicio && this.dataSelecionadaFim)
    ) {
      // Primeira seleção ou resetar
      this.dataSelecionadaInicio = data;
      this.dataSelecionadaFim = null;
    } else {
      // Segunda seleção
      if (data < this.dataSelecionadaInicio) {
        this.dataSelecionadaFim = this.dataSelecionadaInicio;
        this.dataSelecionadaInicio = data;
      } else {
        this.dataSelecionadaFim = data;
      }
    }

    // Atualizar exibição
    this.renderizarCalendario(1);
    this.renderizarCalendario(2);

    // Atualizar campo de período
    const periodoInput = document.getElementById("periodoDisplay");
    if (this.dataSelecionadaInicio && this.dataSelecionadaFim) {
      const dataInicioStr = this.formatarData(this.dataSelecionadaInicio);
      const dataFimStr = this.formatarData(this.dataSelecionadaFim);
      if (periodoInput) periodoInput.value = `${dataInicioStr} - ${dataFimStr}`;
    } else if (this.dataSelecionadaInicio && !this.dataSelecionadaFim) {
      // permitir selecionar apenas 1 data: mostrar apenas a data selecionada
      const dataInicioStr = this.formatarData(this.dataSelecionadaInicio);
      if (periodoInput) periodoInput.value = `${dataInicioStr}`;
    }
  }

  async confirmarPeriodo() {
    if (!this.dataSelecionadaInicio) {
      this.mostrarNotificacao("Selecione pelo menos uma data", "warning");
      return;
    }

    // Se o usuário selecionou apenas uma data, considerar período de um dia
    if (this.dataSelecionadaInicio && !this.dataSelecionadaFim) {
      this.dataSelecionadaFim = this.dataSelecionadaInicio;
    }

    this.dataInicio = this.dataSelecionadaInicio;
    this.dataFim = this.dataSelecionadaFim;

    // Fechar calendários
    document.getElementById("calendariosContainer").style.display = "none";
    document.getElementById("actionsButtons").style.display = "none";

    // Buscar dados do período
    await this.buscarDadosPeriodo();

    // Fechar modal
    this.fecharModalPesquisa();
  }

  async buscarDadosPeriodo() {
    try {
      // número do caixa (id do registro de abertura) ou tentar recuperar a partir do input
      let numeroCaixa = this.caixaSelecionado ? this.caixaSelecionado.id : null;
      if (!numeroCaixa) {
        const numeroInput = document.getElementById("numeroCaixa")?.value;
        if (numeroInput) {
          // tentar buscar o caixa pelo texto (ex: "Caixa 01")
          try {
            const respCaixa = await fetch(
              `${this.apiBase}/api/caixas/numero/${encodeURIComponent(numeroInput)}`,
            );
            if (respCaixa.ok) {
              const caixaData = await respCaixa.json();
              const caixaObj = caixaData.caixa
                ? caixaData.caixa
                : caixaData.numero
                  ? caixaData
                  : null;
              if (caixaObj) numeroCaixa = caixaObj.id;
            }
          } catch (e) {
            console.warn("Não foi possível resolver caixa pelo input:", e);
          }
        }
      }
      console.log(
        "buscarDadosPeriodo -> caixaId:",
        numeroCaixa,
        "dataInicio:",
        this.formatarDataISO(this.dataInicio),
        "dataFim:",
        this.formatarDataISO(this.dataFim),
      );
      const dataInicio = this.formatarDataISO(this.dataInicio);
      const dataFim = this.formatarDataISO(this.dataFim);

      // Buscar vendas do período
      const url =
        `${this.apiBase}/api/vendas?dataInicio=${dataInicio}&dataFim=${dataFim}` +
        (numeroCaixa ? `&caixaId=${numeroCaixa}` : "");
      console.log("Buscando URL:", url);
      const response = await fetch(url);
      console.log("Response vendas status:", response.status);
      const data = await response.json();
      console.log("Vendas recebidas:", data.vendas ? data.vendas.length : 0);

      if (data.vendas) {
        this.processarDadosVendas(data.vendas);
        this.mostrarNotificacao("Dados carregados com sucesso!", "success");
      } else {
        console.warn("Nenhuma venda retornada para o período");
        this.mostrarNotificacao(
          "Nenhuma venda encontrada para o período",
          "info",
        );
      }
    } catch (error) {
      console.error("Erro ao buscar dados do período:", error);
      this.mostrarNotificacao("Erro ao buscar dados do período", "error");
    }
  }

  processarDadosVendas(vendas) {
    // Inicializar totais (garantir tipos numéricos)
    const parseNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const totais = {
      dinheiro: {
        trocoInicial: parseNum(this.caixaSelecionado?.valorFundoTroco),
        vendas: 0,
        atendimentos: 0,
        recebimentos: 0,
        adiantamentos: 0,
        suprimentos: 0,
        entradaTroco: 0,
        sangrias: 0,
        devolucoes: 0,
        pagamentos: 0,
        saidaTroco: 0,
      },
      cartao: {
        vendas: 0,
        atendimentos: 0,
        recebimentos: 0,
        adiantamentos: 0,
        operadoras: {},
      },
      cheque: {
        vendas: 0,
        atendimentos: 0,
        recebimentos: 0,
        adiantamentos: 0,
        devolucoes: 0,
        pagamentos: 0,
        movimentoSaida: 0,
      },
      crediario: {
        vendas: 0,
        atendimentos: 0,
      },
      pix: {
        vendas: 0,
        atendimentos: 0,
        recebimentos: 0,
        adiantamentos: 0,
        contas: {},
      },
    };

    // Processar vendas
    vendas.forEach((venda) => {
      const valor = parseFloat(venda.valorTotal) || 0;

      if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
        venda.pagamentos.forEach((pagamento) => {
          const valorPagamento = parseFloat(pagamento.valor) || 0;

          const forma = (
            pagamento.formaPagamento ||
            pagamento.forma ||
            pagamento.forma_pagamento ||
            pagamento.tipo ||
            ""
          )
            .toString()
            .toLowerCase();
          switch (forma) {
            case "dinheiro":
              totais.dinheiro.vendas += valorPagamento;
              break;
            case "credito":
            case "debito":
            case "cartao":
              totais.cartao.vendas += valorPagamento;
              const operadora =
                pagamento.operadoraCartao || pagamento.operadora || "Outros";
              totais.cartao.operadoras[operadora] =
                (totais.cartao.operadoras[operadora] || 0) + valorPagamento;
              break;
            case "cheque":
              totais.cheque.vendas += valorPagamento;
              break;
            case "crediario":
              totais.crediario.vendas += valorPagamento;
              break;
            case "pix":
              totais.pix.vendas += valorPagamento;
              const conta =
                pagamento.conta ||
                pagamento.contaDestino ||
                pagamento.chavePix ||
                pagamento.chave ||
                "CAIXA COFRE";
              totais.pix.contas[conta] =
                (totais.pix.contas[conta] || 0) + valorPagamento;
              break;
          }
        });
      }
    });

    // Atualizar interface
    this.atualizarTotais(totais);
  }

  atualizarTotais(totais) {
    // Função auxiliar para garantir números
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // Calcular total dinheiro (usar números)
    const totalDinheiro =
      toNum(totais.dinheiro.trocoInicial) +
      toNum(totais.dinheiro.vendas) +
      toNum(totais.dinheiro.atendimentos) +
      toNum(totais.dinheiro.recebimentos) +
      toNum(totais.dinheiro.adiantamentos) +
      toNum(totais.dinheiro.suprimentos) +
      toNum(totais.dinheiro.entradaTroco) -
      toNum(totais.dinheiro.sangrias) -
      toNum(totais.dinheiro.devolucoes) -
      toNum(totais.dinheiro.pagamentos) -
      toNum(totais.dinheiro.saidaTroco);

    // Preparar valores agregados para gráfico e footer
    const valores = {
      dinheiro: parseFloat(totalDinheiro.toFixed(2)) || 0,
      cartao:
        parseFloat(
          (
            toNum(totais.cartao.vendas) +
            toNum(totais.cartao.atendimentos) +
            toNum(totais.cartao.recebimentos) +
            toNum(totais.cartao.adiantamentos)
          ).toFixed(2),
        ) || 0,
      pix:
        parseFloat(
          (
            toNum(totais.pix.vendas) +
            toNum(totais.pix.atendimentos) +
            toNum(totais.pix.recebimentos) +
            toNum(totais.pix.adiantamentos)
          ).toFixed(2),
        ) || 0,
      crediario:
        parseFloat(
          (
            toNum(totais.crediario.vendas) +
            toNum(totais.crediario.atendimentos)
          ).toFixed(2),
        ) || 0,
      cheque:
        parseFloat(
          (
            toNum(totais.cheque.vendas) +
            toNum(totais.cheque.atendimentos) +
            toNum(totais.cheque.recebimentos)
          ).toFixed(2),
        ) || 0,
    };

    // Atualizar card dinheiro
    const cardDinheiro = document.querySelector(".total-dinheiro");
    if (cardDinheiro) {
      cardDinheiro.querySelector(".total-value").textContent =
        `R$ ${totalDinheiro.toFixed(2)}`;

      const items = cardDinheiro.querySelectorAll(
        ".total-item span:last-child",
      );
      if (items.length >= 11) {
        items[0].textContent = `${toNum(totais.dinheiro.trocoInicial).toFixed(2)} (+)`;
        items[1].textContent = `${toNum(totais.dinheiro.vendas).toFixed(2)} (+)`;
        items[2].textContent = `${toNum(totais.dinheiro.atendimentos).toFixed(2)} (+)`;
        items[3].textContent = `${toNum(totais.dinheiro.recebimentos).toFixed(2)} (+)`;
        items[4].textContent = `${toNum(totais.dinheiro.adiantamentos).toFixed(2)} (+)`;
        items[5].textContent = `${toNum(totais.dinheiro.suprimentos).toFixed(2)} (+)`;
        items[6].textContent = `${toNum(totais.dinheiro.entradaTroco).toFixed(2)} (+)`;
        items[7].textContent = `${toNum(totais.dinheiro.sangrias).toFixed(2)} (-)`;
        items[8].textContent = `${toNum(totais.dinheiro.devolucoes).toFixed(2)} (-)`;
        items[9].textContent = `${toNum(totais.dinheiro.pagamentos).toFixed(2)} (-)`;
        items[10].textContent = `${toNum(totais.dinheiro.saidaTroco).toFixed(2)} (-)`;
      }
    }

    // Atualizar outros cards
    this.atualizarCardCartao(totais.cartao);
    this.atualizarCardCheque(totais.cheque);
    this.atualizarCardCrediario(totais.crediario);
    this.atualizarCardPix(totais.pix, valores);
    // Atualizar gráfico com os totais principais
    try {
      this.atualizarGrafico(valores);
    } catch (e) {
      console.warn("Erro ao atualizar gráfico:", e);
    }
  }

  async carregarChartJs() {
    if (window.Chart) return;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  async atualizarGrafico(valores) {
    // valores: { dinheiro, cartao, pix, crediario, cheque }
    try {
      await this.carregarChartJs();

      let container = document.getElementById("grafico-container");
      if (!container) {
        // inserir o container logo após a grade de totais
        const main = document.querySelector(".demonstrativo-container");
        container = document.createElement("div");
        container.id = "grafico-container";
        container.style.width = "100%";
        container.style.maxWidth = "900px";
        container.style.margin = "20px auto";
        container.innerHTML = `<canvas id="grafico0" height="120"></canvas>`;
        main.appendChild(container);
      }

      const ctx = document.getElementById("grafico0").getContext("2d");

      const labels = ["Dinheiro", "Cartão", "Pix", "Crediário", "Cheque"];
      const data = [
        valores.dinheiro,
        valores.cartao,
        valores.pix,
        valores.crediario,
        valores.cheque,
      ];

      if (this._chart0) {
        this._chart0.data.datasets[0].data = data;
        this._chart0.update();
      } else {
        this._chart0 = new Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Totais por forma de pagamento",
                data,
                backgroundColor: [
                  "#27ae60",
                  "#2980b9",
                  "#1abc9c",
                  "#e74c3c",
                  "#f39c12",
                ],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true },
            },
          },
        });
      }
    } catch (error) {
      console.warn("Falha ao renderizar gráfico:", error);
    }
  }

  atualizarCardCartao(totais) {
    const total =
      totais.vendas +
      totais.atendimentos +
      totais.recebimentos +
      totais.adiantamentos;
    const card = document.querySelector(".total-cartao");
    if (card) {
      card.querySelector(".total-value").textContent = total.toFixed(2);

      const items = card.querySelectorAll(".total-item span:last-child");
      if (items.length >= 4) {
        items[0].textContent = `${totais.vendas.toFixed(2)} (+)`;
        items[1].textContent = `${totais.atendimentos.toFixed(2)} (+)`;
        items[2].textContent = `${totais.recebimentos.toFixed(2)} (+)`;
        items[3].textContent = `${totais.adiantamentos.toFixed(2)} (+)`;
      }
    }
  }

  atualizarCardCheque(totais) {
    const total =
      totais.vendas +
      totais.atendimentos +
      totais.recebimentos +
      totais.adiantamentos -
      totais.devolucoes -
      totais.pagamentos -
      totais.movimentoSaida;
    const card = document.querySelector(".total-cheque");
    if (card) {
      card.querySelector(".total-value").textContent = total.toFixed(2);

      const items = card.querySelectorAll(".total-item span:last-child");
      if (items.length >= 7) {
        items[0].textContent = `${totais.vendas.toFixed(2)} (+)`;
        items[1].textContent = `${totais.atendimentos.toFixed(2)} (+)`;
        items[2].textContent = `${totais.recebimentos.toFixed(2)} (+)`;
        items[3].textContent = `${totais.adiantamentos.toFixed(2)} (+)`;
        items[4].textContent = `${totais.devolucoes.toFixed(2)} (-)`;
        items[5].textContent = `${totais.pagamentos.toFixed(2)} (-)`;
        items[6].textContent = `${totais.movimentoSaida.toFixed(2)} (-)`;
      }
    }
  }

  atualizarCardCrediario(totais) {
    const total = totais.vendas + totais.atendimentos;
    const card = document.querySelector(".total-crediario");
    if (card) {
      card.querySelector(".total-value").textContent = total.toFixed(2);

      const items = card.querySelectorAll(".total-item span:last-child");
      if (items.length >= 2) {
        items[0].textContent = `${totais.vendas.toFixed(2)} (+)`;
        items[1].textContent = `${totais.atendimentos.toFixed(2)} (+)`;
      }
    }
  }

  atualizarCardPix(totais, valores) {
    const total =
      totais.vendas +
      totais.atendimentos +
      totais.recebimentos +
      totais.adiantamentos;
    const card = document.querySelector(".total-pix");
    if (card) {
      card.querySelector(".total-value").textContent = `R$ ${total.toFixed(2)}`;

      const items = card.querySelectorAll(".total-item span:last-child");
      if (items.length >= 4) {
        items[0].textContent = `${totais.vendas.toFixed(2)} (+)`;
        items[1].textContent = `${totais.atendimentos.toFixed(2)} (+)`;
        items[2].textContent = `${totais.recebimentos.toFixed(2)} (+)`;
        items[3].textContent = `${totais.adiantamentos.toFixed(2)} (+)`;
      }

      // Atualizar contas: mostrar o total agregado (todos os métodos) e depois as contas PIX individuais
      const footer = card.querySelector(".total-footer");
      if (footer) {
        const contasEntries = Object.entries(totais.contas || {});
        // calcular total agregado entre todos os métodos, se valores foram fornecidos
        let totalAgregado = 0;
        if (valores) {
          totalAgregado =
            (Number(valores.dinheiro) || 0) +
            (Number(valores.cartao) || 0) +
            (Number(valores.pix) || 0) +
            (Number(valores.crediario) || 0) +
            (Number(valores.cheque) || 0);
        } else {
          // fallback: usar soma apenas do PIX
          totalAgregado = contasEntries.reduce(
            (s, [, v]) => s + (Number(v) || 0),
            0,
          );
        }

        if (contasEntries.length > 0) {
          footer.innerHTML = `<div class="total-item-footer"><span>Totais por conta</span><span>R$ ${totalAgregado.toFixed(2)}</span></div>`;

          contasEntries.forEach(([conta, valor]) => {
            footer.innerHTML += `
                            <div class="total-item-footer">
                                <span>${conta}</span>
                                <span>R$ ${Number(valor).toFixed(2)}</span>
                            </div>
                        `;
          });
        } else {
          // Se não houver contas, limpar o footer
          footer.innerHTML = "";
        }
      }
    }
  }

  formatarData(data) {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  formatarDataHora(dataStr) {
    if (!dataStr) return "";
    const data = new Date(dataStr);
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, "0");
    const min = String(data.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  formatarDataISO(data) {
    return data.toISOString().split("T")[0];
  }

  adicionarEstilosNotificacao() {
    if (document.getElementById("notificacao-styles")) return;

    const style = document.createElement("style");
    style.id = "notificacao-styles";
    style.textContent = `
            .notificacao-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .notificacao {
                background: white;
                padding: 14px 18px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 280px;
                max-width: 400px;
                animation: slideIn 0.3s ease;
                border-left: 4px solid;
            }
            
            .notificacao-success { border-left-color: #27ae60; }
            .notificacao-error { border-left-color: #e74c3c; }
            .notificacao-warning { border-left-color: #f39c12; }
            .notificacao-info { border-left-color: #3498db; }
            
            .notificacao-success i { color: #27ae60; }
            .notificacao-error i { color: #e74c3c; }
            .notificacao-warning i { color: #f39c12; }
            .notificacao-info i { color: #3498db; }
            
            .notificacao i {
                font-size: 20px;
            }
            
            .notificacao span {
                flex: 1;
                color: #333;
                font-size: 14px;
                font-weight: 500;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
    document.head.appendChild(style);
  }

  mostrarNotificacao(mensagem, tipo = "info") {
    // Criar container se não existir
    let container = document.querySelector(".notificacao-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "notificacao-container";
      document.body.appendChild(container);
    }

    // Criar notificação
    const notificacao = document.createElement("div");
    notificacao.className = `notificacao notificacao-${tipo}`;

    const icones = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    notificacao.innerHTML = `
            <i class="fas ${icones[tipo]}"></i>
            <span>${mensagem}</span>
        `;

    container.appendChild(notificacao);

    // Remover após 4 segundos
    setTimeout(() => {
      notificacao.style.opacity = "0";
      setTimeout(() => notificacao.remove(), 300);
    }, 4000);
  }
}

// Inicializar ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  window.demonstrativoCaixa = new DemonstrativoCaixa();
});
