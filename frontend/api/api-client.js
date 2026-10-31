/**
 * API Client - Centralizador de chamadas HTTP para o backend
 * Backend: Node.js + MySQL (use `window.__API_BASE__` or same-origin)
 */

// URL base da API (produção). Use variável global `__API_BASE__` se definida,
// senão cair para rota relativa `/api` para suportar deployment em mesmo domínio.
const API_BASE_URL =
  (window.__API_BASE__ && window.__API_BASE__.toString()) || "/api";

console.log("[ApiClient] URL base configurada:", API_BASE_URL);

class ApiClient {
  /**
   * Requisição HTTP genérica
   */
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`[ApiClient] ${options.method || "GET"} ${url}`);

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const defaultConfig = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Enviar cookies (JWT em cookie) para autenticação
      credentials: "include",
    };

    const config = { ...defaultConfig, ...options };

    try {
      const response = await fetch(url, config);

      console.log(`[ApiClient] Response status: ${response.status}`);

      if (!response.ok) {
        // tentar extrair corpo JSON com detalhes do erro
        let errorBody = {};
        try {
          errorBody = await response.json();
        } catch (e) {
          /* não-JSON */
        }

        // Se empresa bloqueada (403 + flag), redirecionar imediatamente
        if (response.status === 403 && errorBody && errorBody.bloqueado) {
          window.location.href = "/painel-admin/sistema-bloqueado.html";
          return;
        }

        // Redirecionar para login APENAS quando o backend sinaliza explicitamente
        // que a sessão foi encerrada ou não existe. 401 genéricos (ex: permissão)
        // não devem derrubar o usuário no meio de uma operação.
        if (response.status === 401) {
          const _deveRedirecionar =
            !errorBody || // sem corpo = sem token
            errorBody.encerrado === true ||
            errorBody.expirado === true ||
            (typeof errorBody.mensagem === "string" &&
              errorBody.mensagem.toLowerCase().includes("autenticad"));
          if (_deveRedirecionar) {
            window.location.href = "/login/login.html";
            return;
          }
          // 401 sem indicador de sessão: lançar erro sem redirecionar
          throw new Error(
            errorBody && errorBody.mensagem
              ? errorBody.mensagem
              : "Não autorizado",
          );
        }

        // compor mensagem de erro a partir dos campos mais comuns
        const serverMsg =
          errorBody &&
          (errorBody.message ||
            errorBody.error ||
            errorBody.details ||
            (typeof errorBody === "string" ? errorBody : null));
        const composed = serverMsg
          ? `${serverMsg} (HTTP ${response.status})`
          : `Erro HTTP: ${response.status}`;

        console.error("[ApiClient] Server error body:", errorBody);
        throw new Error(composed);
      }

      const data = await response.json().catch(() => null);
      console.log(`[ApiClient] Response data:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiClient] ❌ Erro na requisição ${endpoint}:`, error);
      throw error;
    }
  }

  // ========================================
  // PRODUTOS / ITENS
  // ========================================

  /**
   * Listar todos os produtos
   */
  static async getProdutos(params = {}) {
    // params: optional object with query parameters, e.g. { excludeAgrupamento: 'MEDICAMENTOS' }
    try {
      let qs = "";
      if (
        params &&
        typeof params === "object" &&
        Object.keys(params).length > 0
      ) {
        const parts = [];
        for (const k of Object.keys(params)) {
          const v = params[k];
          if (v !== undefined && v !== null && String(v) !== "") {
            parts.push(
              encodeURIComponent(k) + "=" + encodeURIComponent(String(v)),
            );
          }
        }
        if (parts.length) qs = "?" + parts.join("&");
      }
      return await this.request(`/itens${qs}`);
    } catch (e) {
      // fallback para comportamento anterior
      return await this.request("/itens");
    }
  }

  /**
   * Buscar produto por ID
   */
  static async getProduto(id) {
    return await this.request(`/itens/${id}`);
  }

  /**
   * Criar novo produto
   */
  static async criarProduto(produto) {
    return await this.request("/itens", {
      method: "POST",
      body: JSON.stringify(produto),
    });
  }

  /**
   * Importar lista de produtos para o backend (migração)
   */
  static async importProdutos(lista) {
    return await this.request("/itens/import", {
      method: "POST",
      body: JSON.stringify(lista),
    });
  }

  /**
   * Atualizar produto existente
   */
  static async atualizarProduto(id, produto) {
    return await this.request(`/itens/${id}`, {
      method: "PUT",
      body: JSON.stringify(produto),
    });
  }

  /**
   * Atualiza a flag `permiteEstoqueNegativo` para todos os produtos
   * @param {string|boolean} value - 'sim'/'nao' ou boolean
   */
  static async updatePermiteEstoqueNegativoGlobal(value) {
    return await this.request("/itens/permite-estoque-negativo", {
      method: "PUT",
      body: JSON.stringify({ permiteEstoqueNegativo: value }),
    });
  }

  /**
   * Deletar produto
   */
  static async deletarProduto(id) {
    return await this.request(`/itens/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Atualizar estoque de produto
   * @param {string} id - ID do produto
   * @param {number} quantidade - Quantidade a adicionar ou reduzir
   * @param {string} operacao - 'adicionar' ou 'reduzir'
   * @param {string} dataAjuste - Data do ajuste (ISO string)
   */
  static async atualizarEstoque(id, quantidade, operacao, dataAjuste) {
    // Backend `itemRoutes` espera PUT em `/api/itens/:id/estoque`
    return await this.request(`/itens/${id}/estoque`, {
      method: "PUT",
      body: JSON.stringify({ quantidade, operacao, dataAjuste }),
      headers: { "Content-Type": "application/json" },
    });
  }

  static async getHistoricoEstoque(id) {
    return await this.request(`/itens/${id}/historico-estoque`);
  }

  // ========================================
  // CLIENTES
  // ========================================

  static async getClientes() {
    return await this.request("/clientes");
  }

  static async getCliente(id) {
    return await this.request(`/clientes/${id}`);
  }

  static async criarCliente(cliente) {
    return await this.request("/clientes", {
      method: "POST",
      body: JSON.stringify(cliente),
    });
  }

  static async atualizarCliente(id, cliente) {
    return await this.request(`/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(cliente),
    });
  }

  static async deletarCliente(id) {
    return await this.request(`/clientes/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // PETS
  // ========================================

  static async getPets() {
    return await this.request("/pets");
  }

  static async getPet(id) {
    return await this.request(`/pets/${id}`);
  }

  static async criarPet(pet) {
    return await this.request("/pets", {
      method: "POST",
      body: JSON.stringify(pet),
    });
  }

  static async atualizarPet(id, pet) {
    return await this.request(`/pets/${id}`, {
      method: "PUT",
      body: JSON.stringify(pet),
    });
  }

  static async deletarPet(id) {
    return await this.request(`/pets/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // AGENDAMENTOS
  // ========================================

  static async getAgendamentos() {
    return await this.request("/agendamentos");
  }

  static async getAgendamento(id) {
    return await this.request(`/agendamentos/${id}`);
  }

  static async criarAgendamento(agendamento) {
    return await this.request("/agendamentos", {
      method: "POST",
      body: JSON.stringify(agendamento),
    });
  }

  static async atualizarAgendamento(id, agendamento) {
    return await this.request(`/agendamentos/${id}`, {
      method: "PUT",
      body: JSON.stringify(agendamento),
    });
  }

  static async deletarAgendamento(id) {
    return await this.request(`/agendamentos/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // VENDAS
  // ========================================

  static async getVendas(dataInicio, dataFim) {
    let url = "/vendas?limit=5000";
    if (dataInicio && dataFim) {
      url += `&dataInicio=${dataInicio}&dataFim=${dataFim}`;
    }
    const data = await this.request(url);
    // API pode retornar um array diretamente ou um objeto { vendas: [...] }
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.vendas)) return data.vendas;
    // fallback seguro: retornar array vazio para evitar erros de chamadas posteriores
    return [];
  }

  static async getVenda(id) {
    return await this.request(`/vendas/${id}`);
  }

  static async criarVenda(venda) {
    return await this.request("/vendas", {
      method: "POST",
      body: JSON.stringify(venda),
    });
  }

  static async atualizarVenda(id, venda) {
    return await this.request(`/vendas/${id}`, {
      method: "PUT",
      body: JSON.stringify(venda),
    });
  }

  static async deletarVenda(id) {
    return await this.request(`/vendas/${id}`, {
      method: "DELETE",
    });
  }

  // CAIXA

  static async getCaixas() {
    return await this.request("/caixas");
  }

  static async getCaixa(id) {
    return await this.request(`/caixas/${id}`);
  }

  static async getCaixaAberto() {
    return await this.request("/caixas/aberto");
  }

  static async abrirCaixa(caixa) {
    return await this.request("/caixas/abrir", {
      method: "POST",
      body: JSON.stringify(caixa),
    });
  }

  static async fecharCaixa(id, saldoFinal) {
    return await this.request(`/caixas/${id}/fechar`, {
      method: "PUT",
      body: JSON.stringify({ saldoFinal }),
    });
  }

  // MOVIMENTOS DE CAIXA

  static async getMovimentosCaixa() {
    return await this.request("/movimentos-caixa");
  }

  static async getMovimentoCaixa(id) {
    return await this.request(`/movimentos-caixa/${id}`);
  }

  static async criarMovimentoCaixa(movimento) {
    return await this.request("/movimentos-caixa", {
      method: "POST",
      body: JSON.stringify(movimento),
    });
  }

  static async atualizarMovimentoCaixa(id, movimento) {
    return await this.request(`/movimentos-caixa/${id}`, {
      method: "PUT",
      body: JSON.stringify(movimento),
    });
  }

  static async deletarMovimentoCaixa(id) {
    return await this.request(`/movimentos-caixa/${id}`, {
      method: "DELETE",
    });
  }

  // PROFISSIONAIS

  static async getProfissionais() {
    return await this.request("/profissionais");
  }

  static async getProfissional(id) {
    return await this.request(`/profissionais/${id}`);
  }

  static async criarProfissional(profissional) {
    return await this.request("/profissionais", {
      method: "POST",
      body: JSON.stringify(profissional),
    });
  }

  static async atualizarProfissional(id, profissional) {
    return await this.request(`/profissionais/${id}`, {
      method: "PUT",
      body: JSON.stringify(profissional),
    });
  }

  static async deletarProfissional(id) {
    return await this.request(`/profissionais/${id}`, {
      method: "DELETE",
    });
  }

  // EMPRESAS

  static async getEmpresas() {
    return await this.request("/empresas");
  }

  static async getEmpresa(id) {
    return await this.request(`/empresas/${id}`);
  }

  static async criarEmpresa(empresa) {
    return await this.request("/empresas", {
      method: "POST",
      body: JSON.stringify(empresa),
    });
  }

  static async atualizarEmpresa(id, empresa) {
    return await this.request(`/empresas/${id}`, {
      method: "PUT",
      body: JSON.stringify(empresa),
    });
  }

  static async deletarEmpresa(id) {
    return await this.request(`/empresas/${id}`, {
      method: "DELETE",
    });
  }

  // PERFIS DE PRODUTO (Descontos)

  static async getPerfisProduto() {
    return await this.request("/perfis-produto");
  }

  static async getPerfilProduto(id) {
    return await this.request(`/perfis-produto/${id}`);
  }

  static async criarPerfilProduto(perfil) {
    return await this.request("/perfis-produto", {
      method: "POST",
      body: JSON.stringify(perfil),
    });
  }

  static async atualizarPerfilProduto(id, perfil) {
    return await this.request(`/perfis-produto/${id}`, {
      method: "PUT",
      body: JSON.stringify(perfil),
    });
  }

  static async deletarPerfilProduto(id) {
    return await this.request(`/perfis-produto/${id}`, {
      method: "DELETE",
    });
  }

  // PERFIS DE CLIENTE (Descontos)

  static async getPerfisCliente() {
    return await this.request("/perfis-cliente");
  }

  static async getPerfilCliente(id) {
    return await this.request(`/perfis-cliente/${id}`);
  }

  static async criarPerfilCliente(perfil) {
    return await this.request("/perfis-cliente", {
      method: "POST",
      body: JSON.stringify(perfil),
    });
  }

  static async atualizarPerfilCliente(id, perfil) {
    return await this.request(`/perfis-cliente/${id}`, {
      method: "PUT",
      body: JSON.stringify(perfil),
    });
  }

  static async deletarPerfilCliente(id) {
    return await this.request(`/perfis-cliente/${id}`, {
      method: "DELETE",
    });
  }

  // DESCONTOS RELAÇÕES

  static async getDescontosRelacoes() {
    return await this.request("/descontos-relacoes");
  }

  static async getDescontoRelacao(id) {
    return await this.request(`/descontos-relacoes/${id}`);
  }

  static async criarDescontoRelacao(relacao) {
    return await this.request("/descontos-relacoes", {
      method: "POST",
      body: JSON.stringify(relacao),
    });
  }

  static async atualizarDescontoRelacao(id, relacao) {
    return await this.request(`/descontos-relacoes/${id}`, {
      method: "PUT",
      body: JSON.stringify(relacao),
    });
  }

  static async deletarDescontoRelacao(id) {
    return await this.request(`/descontos-relacoes/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // AGRUPAMENTOS
  // ========================================

  static async getAgrupamentos() {
    return await this.request("/agrupamentos");
  }

  static async getAgrupamento(id) {
    return await this.request(`/agrupamentos/${id}`);
  }

  static async criarAgrupamento(agrupamento) {
    return await this.request("/agrupamentos", {
      method: "POST",
      body: JSON.stringify(agrupamento),
    });
  }

  static async atualizarAgrupamento(id, agrupamento) {
    return await this.request(`/agrupamentos/${id}`, {
      method: "PUT",
      body: JSON.stringify(agrupamento),
    });
  }

  static async deletarAgrupamento(id) {
    return await this.request(`/agrupamentos/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // PERFIS DE COMISSÃO
  // ========================================

  static async getPerfisComissao() {
    return await this.request("/perfis-comissao");
  }

  static async getPerfilComissao(id) {
    return await this.request(`/perfis-comissao/${id}`);
  }

  static async criarPerfilComissao(perfil) {
    return await this.request("/perfis-comissao", {
      method: "POST",
      body: JSON.stringify(perfil),
    });
  }

  static async atualizarPerfilComissao(id, perfil) {
    return await this.request(`/perfis-comissao/${id}`, {
      method: "PUT",
      body: JSON.stringify(perfil),
    });
  }

  static async deletarPerfilComissao(id) {
    return await this.request(`/perfis-comissao/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // COMISSÕES (Produto + Vendedor + Percentual)
  // ========================================

  static async getComissoes() {
    return await this.request("/comissoes");
  }

  static async getComissao(id) {
    return await this.request(`/comissoes/${id}`);
  }

  static async criarComissao(comissao) {
    return await this.request("/comissoes", {
      method: "POST",
      body: JSON.stringify(comissao),
    });
  }

  static async atualizarComissao(id, comissao) {
    return await this.request(`/comissoes/${id}`, {
      method: "PUT",
      body: JSON.stringify(comissao),
    });
  }

  static async deletarComissao(id) {
    return await this.request(`/comissoes/${id}`, {
      method: "DELETE",
    });
  }

  static async recalcularComissao({ inicio, fim }) {
    return await this.request("/relatorios/comissao/recalcular", {
      method: "POST",
      body: JSON.stringify({ inicio, fim }),
    });
  }

  // ========================================
  // PORTES
  // ========================================

  static async getPortes() {
    return await this.request("/portes");
  }

  static async getPorte(id) {
    return await this.request(`/portes/${id}`);
  }

  static async criarPorte(porte) {
    return await this.request("/portes", {
      method: "POST",
      body: JSON.stringify(porte),
    });
  }

  static async atualizarPorte(id, porte) {
    return await this.request(`/portes/${id}`, {
      method: "PUT",
      body: JSON.stringify(porte),
    });
  }

  static async deletarPorte(id) {
    return await this.request(`/portes/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // PELAGENS
  // ========================================

  static async getPelagens() {
    return await this.request("/pelagens");
  }

  static async getPelagem(id) {
    return await this.request(`/pelagens/${id}`);
  }

  static async criarPelagem(pelagem) {
    return await this.request("/pelagens", {
      method: "POST",
      body: JSON.stringify(pelagem),
    });
  }

  static async atualizarPelagem(id, pelagem) {
    return await this.request(`/pelagens/${id}`, {
      method: "PUT",
      body: JSON.stringify(pelagem),
    });
  }

  static async deletarPelagem(id) {
    return await this.request(`/pelagens/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // RAÇAS
  // ========================================

  static async getRacas() {
    return await this.request("/racas");
  }

  static async getRaca(id) {
    return await this.request(`/racas/${id}`);
  }

  static async criarRaca(raca) {
    return await this.request("/racas", {
      method: "POST",
      body: JSON.stringify(raca),
    });
  }

  static async atualizarRaca(id, raca) {
    return await this.request(`/racas/${id}`, {
      method: "PUT",
      body: JSON.stringify(raca),
    });
  }

  static async deletarRaca(id) {
    return await this.request(`/racas/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // BOXES
  // ========================================

  static async getBoxes() {
    return await this.request("/boxes");
  }

  static async getBox(id) {
    return await this.request(`/boxes/${id}`);
  }

  static async criarBox(box) {
    return await this.request("/boxes", {
      method: "POST",
      body: JSON.stringify(box),
    });
  }

  static async atualizarBox(id, box) {
    return await this.request(`/boxes/${id}`, {
      method: "PUT",
      body: JSON.stringify(box),
    });
  }

  static async deletarBox(id) {
    return await this.request(`/boxes/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // GRUPOS DE CLIENTES
  // ========================================

  static async getGruposClientes() {
    return await this.request("/grupos-clientes");
  }

  static async getGrupoCliente(id) {
    return await this.request(`/grupos-clientes/${id}`);
  }

  static async criarGrupoCliente(grupo) {
    return await this.request("/grupos-clientes", {
      method: "POST",
      body: JSON.stringify(grupo),
    });
  }

  static async atualizarGrupoCliente(id, grupo) {
    return await this.request(`/grupos-clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(grupo),
    });
  }

  static async deletarGrupoCliente(id) {
    return await this.request(`/grupos-clientes/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // MARCAS
  // ========================================

  static async getMarcas() {
    return await this.request("/marcas");
  }

  static async getMarca(id) {
    return await this.request(`/marcas/${id}`);
  }

  static async criarMarca(marca) {
    return await this.request("/marcas", {
      method: "POST",
      body: JSON.stringify(marca),
    });
  }

  static async atualizarMarca(id, marca) {
    return await this.request(`/marcas/${id}`, {
      method: "PUT",
      body: JSON.stringify(marca),
    });
  }

  static async deletarMarca(id) {
    return await this.request(`/marcas/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // FORNECEDORES
  // ========================================

  static async getFornecedores() {
    return await this.request("/fornecedores");
  }

  static async getFornecedor(id) {
    return await this.request(`/fornecedores/${id}`);
  }

  static async criarFornecedor(fornecedor) {
    return await this.request("/fornecedores", {
      method: "POST",
      body: JSON.stringify(fornecedor),
    });
  }

  static async atualizarFornecedor(id, fornecedor) {
    return await this.request(`/fornecedores/${id}`, {
      method: "PUT",
      body: JSON.stringify(fornecedor),
    });
  }

  static async deletarFornecedor(id) {
    return await this.request(`/fornecedores/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // AGRUPAMENTOS
  // ========================================

  static async getAgrupamentos() {
    return await this.request("/agrupamentos");
  }

  static async getAgrupamento(id) {
    return await this.request(`/agrupamentos/${id}`);
  }

  static async criarAgrupamento(agrupamento) {
    return await this.request("/agrupamentos", {
      method: "POST",
      body: JSON.stringify(agrupamento),
    });
  }

  static async atualizarAgrupamento(id, agrupamento) {
    return await this.request(`/agrupamentos/${id}`, {
      method: "PUT",
      body: JSON.stringify(agrupamento),
    });
  }

  static async deletarAgrupamento(id) {
    return await this.request(`/agrupamentos/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // CENTROS DE RESULTADO
  // ========================================

  static async getCentrosResultado() {
    return await this.request("/centros");
  }

  static async getCentroResultado(id) {
    return await this.request(`/centros/${id}`);
  }

  static async criarCentroResultado(centro) {
    return await this.request("/centros", {
      method: "POST",
      body: JSON.stringify(centro),
    });
  }

  static async atualizarCentroResultado(id, centro) {
    return await this.request(`/centros/${id}`, {
      method: "PUT",
      body: JSON.stringify(centro),
    });
  }

  static async deletarCentroResultado(id) {
    return await this.request(`/centros/${id}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // FISCAL — FLUXO E NOTAS (integração com o ciclo de venda)
  // ========================================

  /** Dados mínimos do fluxo fiscal (modo, tipos habilitados) — só auth */
  static async getFluxoFiscal() {
    return await this.request("/fiscal/fluxo");
  }

  /** Notas associadas a uma venda */
  static async listarNotasPorVenda(vendaId) {
    return await this.request(`/notas-fiscais/por-venda/${vendaId}`);
  }

  /** Registra a nota pendente de uma venda sem emitir (modos manual/lote/confirmação) */
  static async registrarNotaPendente(vendaId) {
    return await this.request("/notas-fiscais/pendente", {
      method: "POST",
      body: JSON.stringify({ venda_id: vendaId }),
    });
  }

  /** Emite a nota de uma venda (registra pendente se necessário) */
  static async emitirNotaPorVenda(vendaId) {
    return await this.request("/notas-fiscais/emitir", {
      method: "POST",
      body: JSON.stringify({ venda_id: vendaId }),
    });
  }

  /** Emite uma nota já cadastrada pelo id (Central Fiscal / retentativa) */
  static async emitirNotaPorId(notaId) {
    return await this.request(`/notas-fiscais/${notaId}/emitir`, {
      method: "POST",
    });
  }

  /** Emissão em lote — recebe array de ids de notas */
  static async emitirNotasEmLote(notasIds) {
    return await this.request("/notas-fiscais/lote-emitir", {
      method: "POST",
      body: JSON.stringify({ notas_ids: notasIds }),
    });
  }

  /** Resumo de status (Central Fiscal) */
  static async obterResumoFiscal() {
    return await this.request("/notas-fiscais/resumo");
  }
}

// Exportar para uso global
window.ApiClient = ApiClient;
// Alias em lowercase para compatibilidade com scripts antigos
window.apiClient = ApiClient;

// Global helper to close any open custom select dropdowns.
window.closeAllSelectDropdowns = function (exceptAncestor) {
  try {
    const els = Array.from(
      document.querySelectorAll(".select-dropdown, .multi-select-dropdown"),
    );
    els.forEach((el) => {
      try {
        if (exceptAncestor && el && exceptAncestor.contains(el)) return; // preserve dropdowns inside exceptAncestor
        if (el && el.parentElement) el.parentElement.removeChild(el);
      } catch (e) {
        /* ignore per-dropdown errors */
      }
    });
  } catch (e) {
    /* ignore */
  }
};

// Close other dropdowns before opening a new one. We listen to `mousedown` in
// the capture phase so we run before component handlers that open dropdowns.
document.addEventListener(
  "mousedown",
  function captureCloseBeforeOpen(e) {
    try {
      const wrapper =
        e.target && e.target.closest
          ? e.target.closest(".select-wrapper")
          : null;
      if (wrapper) {
        // preserve dropdowns that belong to this wrapper (if any), close others
        window.closeAllSelectDropdowns(wrapper);
      } else {
        // click outside any wrapper -> close all
        window.closeAllSelectDropdowns();
      }
    } catch (err) {
      /* ignore */
    }
  },
  true,
);
