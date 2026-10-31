// =============================================
// NOVO CLIENTE MANAGER - PET CRIA
// =============================================

class NovoClienteManager {
  constructor() {
    this.clienteIdParaEdicao = null;
    this.init();
  }

  init() {
    this.verificarModoEdicao();
    this.setupCepSearch();
    this.setupFormSubmission();
    this.setupFormValidation();
    this.setupDateCalculation();
  }

  // Verificar se estamos em modo de edição
  verificarModoEdicao() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");

    if (editId) {
      this.clienteIdParaEdicao = editId;
      this.carregarDadosParaEdicao(editId);
      document.querySelector("h1").textContent = "Editar Cliente";
      document.title = "Pet Cria - Editar Cliente";
    }
  }

  // Carregar dados do cliente para edição
  async carregarDadosParaEdicao(clienteId) {
    try {
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      const response = await fetch(`${API_BASE}/api/clientes/${clienteId}`);
      const data = await response.json();

      if (data.success) {
        this.preencherFormulario(data.cliente);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
      this.mostrarNotificacao("Erro ao carregar dados do cliente", "error");
    }
  }

  // Preencher formulário com dados do cliente
  preencherFormulario(cliente) {
    const campos = {
      nome: cliente.nome,
      cpf: cliente.cpf,
      rg: cliente.rg,
      dataNascimento: cliente.data_nascimento
        ? cliente.data_nascimento.split("T")[0]
        : "",
      sexo: cliente.sexo,
      telefone: cliente.telefone,
      email: cliente.email,
      cep: cliente.cep,
      endereco: cliente.endereco,
      numero: cliente.numero,
      complemento: cliente.complemento,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      estado: cliente.estado,
      limiteCredito: cliente.limite_credito,
      grupoCliente: cliente.grupo_cliente,
      perfilDesconto: cliente.perfil_desconto,
      comoConheceu: cliente.como_nos_conheceu,
      observacao: cliente.observacoes,
      proximidade: cliente.proximidade,
      ativo: cliente.ativo,
    };

    Object.keys(campos).forEach((campo) => {
      const elemento = document.getElementById(campo);
      if (elemento) {
        if (elemento.type === "checkbox") {
          elemento.checked = campos[campo];
        } else {
          elemento.value = campos[campo] || "";
        }
      }
    });
  }

  // Configurar cálculo automático da idade
  setupDateCalculation() {
    const dataNascimento = document.getElementById("dataNascimento");
    if (dataNascimento) {
      dataNascimento.addEventListener("change", this.calcularIdade.bind(this));
    }
  }

  calcularIdade() {
    const dataNascimento = document.getElementById("dataNascimento").value;
    const idadeDisplay = document.getElementById("idadeDisplay");

    if (dataNascimento && idadeDisplay) {
      const hoje = new Date();
      const nascimento = new Date(dataNascimento);
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();

      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }

      idadeDisplay.textContent = `${idade} anos`;
    }
  }

  // Configurar busca de CEP
  setupCepSearch() {
    const btnSearchCep = document.querySelector(".btn-search-cep");
    const cepInput = document.getElementById("cep");

    if (btnSearchCep && cepInput) {
      // Evento do botão de busca
      btnSearchCep.addEventListener("click", () => {
        const cep = cepInput.value.replace(/\D/g, "");
        if (cep.length === 8) {
          this.searchCep(cep);
        } else {
          this.mostrarNotificacao("CEP deve conter 8 dígitos", "error");
        }
      });

      // Evento ao sair do campo CEP (blur)
      cepInput.addEventListener("blur", () => {
        const cep = cepInput.value.replace(/\D/g, "");
        if (cep.length === 8) {
          this.searchCep(cep);
        }
      });

      // Formatação automática do CEP
      cepInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length <= 8) {
          value = value.replace(/^(\d{5})(\d)/, "$1-$2");
          e.target.value = value;
        }
      });

      // Busca automática ao completar 8 dígitos
      cepInput.addEventListener("keyup", (e) => {
        const cep = e.target.value.replace(/\D/g, "");
        if (cep.length === 8) {
          this.searchCep(cep);
        }
      });
    }
  }

  async searchCep(cep) {
    try {
      const apiBase = (window.VPS_URL || "") + "/api";
      const response = await fetch(`${apiBase}/cep/${cep}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.erro) {
        this.mostrarNotificacao("CEP não encontrado", "error");
        return;
      }

      // Preencher campos automaticamente
      this.preencherEndereco(data);
      this.mostrarNotificacao(
        "Endereço preenchido automaticamente!",
        "success",
      );
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      this.mostrarNotificacao("Erro ao buscar CEP", "error");
    }
  }

  preencherEndereco(data) {
    const campos = {
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    };

    Object.keys(campos).forEach((campo) => {
      const elemento = document.getElementById(campo);
      if (elemento && campos[campo]) {
        elemento.value = campos[campo];
      }
    });
  }

  // Configurar submissão do formulário
  setupFormSubmission() {
    const form = document.getElementById("novoClienteForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitForm();
      });
    }
  }

  async submitForm() {
    const form = document.getElementById("novoClienteForm");
    if (!form) return;

    // Mostrar loading
    this.mostrarCarregamento();

    try {
      // Coletar dados do formulário
      const formData = new FormData();

      // Dados básicos
      const campos = {
        nome: "nome",
        cpf: "cpf",
        rg: "rg",
        data_nascimento: "dataNascimento",
        sexo: "sexo",
        telefone: "telefone",
        email: "email",
        cep: "cep",
        endereco: "endereco",
        numero: "numero",
        complemento: "complemento",
        bairro: "bairro",
        cidade: "cidade",
        estado: "estado",
        limite_credito: "limiteCredito",
        grupo_cliente: "grupoCliente",
        perfil_desconto: "perfilDesconto",
        como_nos_conheceu: "comoConheceu",
        observacoes: "observacao",
        proximidade: "proximidade",
        ativo: "ativo",
      };

      // Adicionar campos ao FormData
      Object.keys(campos).forEach((backendField) => {
        const frontendField = campos[backendField];
        const elemento = document.getElementById(frontendField);

        if (elemento) {
          if (elemento.type === "checkbox") {
            formData.append(backendField, elemento.checked);
          } else if (elemento.value) {
            formData.append(backendField, elemento.value);
          }
        }
      });

      // Arquivo de imagem (se houver)
      const imagemInput = document.getElementById("imagemPerfil");
      if (imagemInput && imagemInput.files[0]) {
        formData.append("imagem_perfil", imagemInput.files[0]);
      }

      // Definir URL e método baseado no modo
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      const url = this.clienteIdParaEdicao
        ? `${API_BASE}/api/clientes/${this.clienteIdParaEdicao}`
        : `${API_BASE}/api/clientes`;

      const method = this.clienteIdParaEdicao ? "PUT" : "POST";

      // Enviar dados
      const response = await fetch(url, {
        method: method,
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const mensagem = this.clienteIdParaEdicao
          ? "Cliente atualizado com sucesso!"
          : "Cliente cadastrado com sucesso!";

        this.mostrarNotificacao(mensagem, "success");

        // Redirecionar para a página de detalhes após 2 segundos
        setTimeout(() => {
          const clienteId = this.clienteIdParaEdicao || data.cliente.id;
          window.location.href = `client-details.html?id=${clienteId}`;
        }, 2000);
      } else {
        throw new Error(data.error || "Erro ao salvar cliente");
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      this.mostrarNotificacao(
        `Erro ao ${this.clienteIdParaEdicao ? "atualizar" : "cadastrar"} cliente: ${error.message}`,
        "error",
      );
    } finally {
      this.esconderCarregamento();
    }
  }

  // Configurar validação do formulário
  setupFormValidation() {
    const form = document.getElementById("novoClienteForm");
    if (!form) return;

    const inputs = form.querySelectorAll("input[required]");
    inputs.forEach((input) => {
      input.addEventListener("blur", () => {
        this.validateField(input);
      });
    });
  }

  validateField(field) {
    const isValid = field.checkValidity();
    field.style.borderColor = isValid ? "" : "#dc3545";
    return isValid;
  }

  // Mostrar indicador de carregamento
  mostrarCarregamento() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }
  }

  // Esconder indicador de carregamento
  esconderCarregamento() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = this.clienteIdParaEdicao
        ? '<i class="fas fa-save"></i> Atualizar Cliente'
        : '<i class="fas fa-save"></i> Salvar Cliente';
    }
  }

  // Sistema de notificações
  mostrarNotificacao(mensagem, tipo = "info") {
    // Remover notificação anterior
    const notificacaoAnterior = document.querySelector(".notification");
    if (notificacaoAnterior) {
      notificacaoAnterior.remove();
    }

    // Criar nova notificação
    const notificacao = document.createElement("div");
    notificacao.className = `notification notification-${tipo}`;

    let icone;
    switch (tipo) {
      case "success":
        icone = "fas fa-check-circle";
        break;
      case "error":
        icone = "fas fa-exclamation-circle";
        break;
      default:
        icone = "fas fa-info-circle";
    }

    notificacao.innerHTML = `
            <i class="${icone}"></i>
            <span>${mensagem}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

    document.body.appendChild(notificacao);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      if (notificacao.parentElement) {
        notificacao.remove();
      }
    }, 5000);
  }
}

// Inicializar quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  new NovoClienteManager();
  console.log("📝 Novo Cliente Manager carregado!");
});
