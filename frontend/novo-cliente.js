class NovoClienteManager {
  constructor() {
    console.log("🏗️ Constructor NovoClienteManager executado");
    this.clienteIdParaEdicao = null;
    this.init();
  }

  init() {
    console.log("🔧 Método init() executado");
    this.verificarModoEdicao();
    this.setupCepSearch();
    this.setupContactManagement();
    this.setupEmailManagement();
    this.setupFormSubmission();
    this.setupFormValidation();
    this.setupDateCalculation();
    this.setupFieldFormatting();
    this.setupRealTimeValidation();
    this.setupLembreteAutomatico();
    console.log("✅ Inicialização completa");
  }

  // Verificar se estamos em modo de edição
  verificarModoEdicao() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");

    if (editId) {
      this.clienteIdParaEdicao = editId;
      this.carregarDadosParaEdicao(editId);
      document.querySelector("h1").textContent = "Editar Cliente";
      document.title = "PetHub";
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

    // Carregar config de lembrete separadamente via endpoint dedicado
    try {
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const resp = await fetch(
        `${API_BASE}/api/produto-lembrete/config-cliente/${clienteId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (resp.ok) {
        const cfg = await resp.json();
        if (cfg.success && cfg.config) {
          this._lembreteConfig = cfg.config;
          this._aplicarLembreteConfig(cfg.config);
        }
      }
    } catch (e) {
      console.warn("[Lembrete] Erro ao carregar config:", e.message);
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

    // Carregar telefones adicionais
    if (
      cliente.telefones_adicionais &&
      Array.isArray(cliente.telefones_adicionais)
    ) {
      this.carregarTelefonesAdicionais(cliente.telefones_adicionais);
    }

    // Carregar emails adicionais
    if (cliente.emails_adicionais && Array.isArray(cliente.emails_adicionais)) {
      this.carregarEmailsAdicionais(cliente.emails_adicionais);
    }

    // Definir grupo de cliente no seletor
    if (cliente.grupo_cliente && typeof grupoSelector !== "undefined") {
      setTimeout(() => {
        grupoSelector.definirGrupo(
          cliente.grupo_cliente,
          cliente.grupo_cliente_id,
        );
      }, 200); // Pequeno delay para garantir que o seletor foi inicializado
    }

    // Preencher campos de lembrete (será feito via _aplicarLembreteConfig após GET dedicado)
    // Mantido apenas como fallback quando dados vêm do cliente sem endpoint dedicado
    const toggleLembrete = document.getElementById("lembreteAutomaticoAtivo");
    const inputDias = document.getElementById("lembreteAutomaticoDias");
    if (toggleLembrete && cliente.lembrete_automatico_ativo !== undefined) {
      toggleLembrete.checked = !!cliente.lembrete_automatico_ativo;
      toggleLembrete.dispatchEvent(new Event("change"));
    }
    if (inputDias && cliente.lembrete_automatico_dias) {
      inputDias.value = cliente.lembrete_automatico_dias;
      inputDias.dispatchEvent(new Event("input"));
    }
  }

  // Carregar telefones adicionais para edição
  carregarTelefonesAdicionais(telefones) {
    const telefonesContainer = document.getElementById("telefones-adicionais");
    if (!telefonesContainer) return;

    telefones.forEach((telefone, index) => {
      const contactDiv = document.createElement("div");
      contactDiv.className = "form-group telefone-adicional";
      contactDiv.innerHTML = `
                <label>Telefone Adicional ${index + 1}</label>
                <div class="input-with-button">
                    <input type="text" class="form-control" name="telefone_adicional_${index + 1}" 
                           placeholder="(00) 00000-0000" value="${telefone}">
                    <button type="button" class="btn-remove-field" onclick="this.closest('.telefone-adicional').remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
      telefonesContainer.appendChild(contactDiv);
    });
  }

  // Carregar emails adicionais para edição
  carregarEmailsAdicionais(emails) {
    const emailsContainer = document.getElementById("emails-adicionais");
    if (!emailsContainer) return;

    emails.forEach((email, index) => {
      const emailDiv = document.createElement("div");
      emailDiv.className = "form-group email-adicional";
      emailDiv.innerHTML = `
                <label>Email Adicional ${index + 1}</label>
                <div class="input-with-button">
                    <input type="email" class="form-control" name="email_adicional_${index + 1}" 
                           placeholder="exemplo@email.com" value="${email}">
                    <button type="button" class="btn-remove-field" onclick="this.closest('.email-adicional').remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
      emailsContainer.appendChild(emailDiv);
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

  // Configurar formatação automática dos campos
  setupFieldFormatting() {
    console.log("📝 Configurando formatação de campos...");

    // Alternância de campos PF/PJ ao trocar Tipo Pessoa
    const tipoPessoaField = document.getElementById("tipoPessoa");
    if (tipoPessoaField) {
      const toggleCamposPJ = () => {
        const isPJ = tipoPessoaField.value === "juridica";
        const grupoCnpj = document.getElementById("grupo-cnpj");
        const grupoFiscalPJ = document.getElementById("grupo-fiscal-pj");
        const grupoCpf = document.getElementById("cpf");
        if (grupoCnpj) grupoCnpj.style.display = isPJ ? "" : "none";
        if (grupoFiscalPJ) grupoFiscalPJ.style.display = isPJ ? "" : "none";
        // CPF nunca é obrigatório — sempre opcional
        if (grupoCpf) grupoCpf.removeAttribute("required");
      };
      tipoPessoaField.addEventListener("change", toggleCamposPJ);
      toggleCamposPJ(); // inicializar ao carregar
    }

    // Formatação do CNPJ
    const cnpjField = document.getElementById("cnpj");
    if (cnpjField) {
      cnpjField.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "").slice(0, 14);
        if (value.length >= 13) {
          value = value.replace(
            /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
            "$1.$2.$3/$4-$5",
          );
        } else if (value.length >= 9) {
          value = value.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
        } else if (value.length >= 6) {
          value = value.replace(/(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
        }
        e.target.value = value;
      });
    }

    // Formatação do CPF
    const cpfField = document.getElementById("cpf");
    if (cpfField) {
      cpfField.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");

        // Limitar a 11 dígitos
        if (value.length > 11) {
          value = value.slice(0, 11);
        }

        // Formatação: XXX.XXX.XXX-XX
        if (value.length <= 11) {
          value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
          value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1})$/, "$1.$2.$3-$4");
          value = value.replace(/(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3");
          value = value.replace(/(\d{3})(\d{2})$/, "$1.$2");
        }

        e.target.value = value;
        this.validateCPF(e.target);
      });
    }

    // Formatação do telefone
    const telefoneField = document.getElementById("telefone");
    if (telefoneField) {
      telefoneField.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");

        // Limitar a 11 dígitos (2 dígitos DDD + 9 dígitos número)
        if (value.length > 11) {
          value = value.slice(0, 11);
        }

        // Formatação: (XX) XXXXX-XXXX
        if (value.length <= 11) {
          if (value.length >= 7) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
          } else if (value.length >= 3) {
            value = value.replace(/(\d{2})(\d+)/, "($1) $2");
          }
        }

        e.target.value = value;
        this.validateTelefone(e.target);
      });
    }
  }

  // Configurar validação em tempo real
  setupRealTimeValidation() {
    console.log("⚡ Configurando validação em tempo real...");

    // Validação do CPF em tempo real
    const cpfField = document.getElementById("cpf");
    if (cpfField) {
      cpfField.addEventListener("blur", () => this.validateCPF(cpfField));
      cpfField.addEventListener("input", () => this.validateCPF(cpfField));
    }

    // Validação do telefone em tempo real
    const telefoneField = document.getElementById("telefone");
    if (telefoneField) {
      telefoneField.addEventListener("blur", () =>
        this.validateTelefone(telefoneField),
      );
      telefoneField.addEventListener("input", () =>
        this.validateTelefone(telefoneField),
      );
    }
  }

  // ──────────────────────────────────────────────────────────
  // Lembrete Automático de Produto Recorrente
  // ──────────────────────────────────────────────────────────
  setupLembreteAutomatico() {
    const toggle = document.getElementById("lembreteAutomaticoAtivo");
    const configPanel = document.getElementById("lembreteConfig");
    const label = document.getElementById("lembreteToggleLabel");
    const diasInput = document.getElementById("lembreteAutomaticoDias");
    const previewDia = document.getElementById("lembretePreviewDia");
    const btnSalvar = document.getElementById("lembreteBtnSalvar");
    const removerBtn = document.getElementById("lembreteProdutoRemover");

    if (!toggle) return;

    // ── Toggle show/hide ───────────────────────────────────
    const atualizarToggle = () => {
      const ativo = toggle.checked;
      if (configPanel) configPanel.style.display = ativo ? "block" : "none";
      if (label) {
        label.textContent = ativo ? "Ativado" : "Desativado";
        label.classList.toggle("active", ativo);
      }
    };

    toggle.addEventListener("change", atualizarToggle);
    atualizarToggle();

    // ── Preview de dias ────────────────────────────────────
    const atualizarPreview = () => {
      if (!previewDia || !diasInput) return;
      const dias = parseInt(diasInput.value, 10) || 30;
      previewDia.textContent = Math.max(1, dias - 1);
      // Atualizar card se já há produto selecionado
      const cardDias = document.getElementById("lembreteProdutoCardDias");
      if (cardDias && document.getElementById("lembreteProdutoId").value) {
        cardDias.textContent = `A cada ${dias} dias`;
      }
    };

    if (diasInput) {
      diasInput.addEventListener("input", atualizarPreview);
      atualizarPreview();
    }

    // ── Autocomplete de produto ────────────────────────────
    const searchInput = document.getElementById("lembreteProdutoSearch");
    const dropdown = document.getElementById("lembreteProdutoDropdown");
    const hiddenId = document.getElementById("lembreteProdutoId");
    const hiddenNome = document.getElementById("lembreteProdutoNome");
    const card = document.getElementById("lembreteProdutoCard");
    const cardNome = document.getElementById("lembreteProdutoCardNome");
    const cardDias = document.getElementById("lembreteProdutoCardDias");

    let debounceTimer = null;

    const fecharDropdown = () => {
      if (dropdown) dropdown.innerHTML = "";
      if (dropdown) dropdown.style.display = "none";
    };

    const mostrarProdutoCard = (id, nome) => {
      if (hiddenId) hiddenId.value = id;
      if (hiddenNome) hiddenNome.value = nome;
      if (searchInput) searchInput.value = nome;
      if (cardNome) cardNome.textContent = nome;
      const dias = parseInt(diasInput?.value, 10) || 30;
      if (cardDias) cardDias.textContent = `A cada ${dias} dias`;
      if (card) card.style.display = "flex";
      fecharDropdown();
    };

    this.limparProduto = () => {
      if (hiddenId) hiddenId.value = "";
      if (hiddenNome) hiddenNome.value = "";
      if (searchInput) searchInput.value = "";
      if (card) card.style.display = "none";
      fecharDropdown();
    };

    if (removerBtn) {
      removerBtn.addEventListener("click", () => this.limparProduto());
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const q = searchInput.value.trim();

        if (q.length < 2) {
          fecharDropdown();
          return;
        }

        debounceTimer = setTimeout(async () => {
          try {
            const API_BASE =
              (window.__API_BASE__ && window.__API_BASE__.toString()) ||
              window.location.origin;
            const token =
              localStorage.getItem("token") || sessionStorage.getItem("token");
            const resp = await fetch(
              `${API_BASE}/api/itens?q=${encodeURIComponent(q)}&tipo=produto&limit=10`,
              { headers: token ? { Authorization: `Bearer ${token}` } : {} },
            );
            if (!resp.ok) return fecharDropdown();
            const itens = await resp.json();
            const lista = Array.isArray(itens)
              ? itens
              : itens.items || itens.data || [];

            if (!lista.length) {
              dropdown.innerHTML = `<div class="lembrete-produto-dropdown-empty">Nenhum produto encontrado para "${q}"</div>`;
              dropdown.style.display = "block";
              return;
            }

            dropdown.innerHTML = lista
              .slice(0, 10)
              .map((item) => {
                const nome = item.nome || item.descricao || item.name || "";
                const id = item.id;
                return `<div class="lembrete-produto-dropdown-item" data-id="${id}" data-nome="${nome}">
                  <i class="fas fa-box lembrete-dropdown-icon"></i>
                  <span>${nome}</span>
                </div>`;
              })
              .join("");
            dropdown.style.display = "block";

            dropdown
              .querySelectorAll(".lembrete-produto-dropdown-item")
              .forEach((el) => {
                el.addEventListener("click", () => {
                  mostrarProdutoCard(el.dataset.id, el.dataset.nome);
                });
              });
          } catch (e) {
            console.warn("[Lembrete] Erro ao buscar produto:", e.message);
            fecharDropdown();
          }
        }, 300);
      });

      // Fechar dropdown ao clicar fora
      document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          fecharDropdown();
        }
      });
    }

    // ── Botão Salvar Lembrete ──────────────────────────────
    if (btnSalvar) {
      btnSalvar.addEventListener("click", async () => {
        const clienteId =
          this.clienteId ||
          new URLSearchParams(window.location.search).get("id");
        if (!clienteId) {
          this.mostrarNotificacao(
            "Salve o cliente primeiro antes de configurar o lembrete",
            "warning",
          );
          return;
        }
        await this.salvarLembreteConfig(clienteId);
      });
    }
  }

  // Aplicar config carregada do servidor nos campos do lembrete
  _aplicarLembreteConfig(config) {
    const toggle = document.getElementById("lembreteAutomaticoAtivo");
    const diasInput = document.getElementById("lembreteAutomaticoDias");
    const searchInput = document.getElementById("lembreteProdutoSearch");
    const hiddenId = document.getElementById("lembreteProdutoId");
    const hiddenNome = document.getElementById("lembreteProdutoNome");
    const card = document.getElementById("lembreteProdutoCard");
    const cardNome = document.getElementById("lembreteProdutoCardNome");
    const cardDias = document.getElementById("lembreteProdutoCardDias");
    const configPanel = document.getElementById("lembreteConfig");
    const label = document.getElementById("lembreteToggleLabel");

    if (toggle) {
      toggle.checked = !!config.ativo;
      if (configPanel)
        configPanel.style.display = config.ativo ? "block" : "none";
      if (label) {
        label.textContent = config.ativo ? "Ativado" : "Desativado";
        label.classList.toggle("active", !!config.ativo);
      }
    }

    if (diasInput) diasInput.value = config.dias || 30;

    const previewDia = document.getElementById("lembretePreviewDia");
    if (previewDia)
      previewDia.textContent = Math.max(1, (config.dias || 30) - 1);

    if (config.produto_id && config.produto_nome) {
      if (hiddenId) hiddenId.value = config.produto_id;
      if (hiddenNome) hiddenNome.value = config.produto_nome;
      if (searchInput) searchInput.value = config.produto_nome;
      if (cardNome) cardNome.textContent = config.produto_nome;
      if (cardDias) cardDias.textContent = `A cada ${config.dias || 30} dias`;
      if (card) card.style.display = "flex";
    } else {
      if (card) card.style.display = "none";
    }
  }

  // Salvar config de lembrete via endpoint dedicado (JSON, sem FormData)
  async salvarLembreteConfig(clienteId) {
    const toggle = document.getElementById("lembreteAutomaticoAtivo");
    const diasInput = document.getElementById("lembreteAutomaticoDias");
    const hiddenId = document.getElementById("lembreteProdutoId");
    const hiddenNome = document.getElementById("lembreteProdutoNome");
    const saveStatus = document.getElementById("lembreteSaveStatus");
    const btnSalvar = document.getElementById("lembreteBtnSalvar");

    const ativo = toggle?.checked ?? false;
    const dias = parseInt(diasInput?.value, 10) || 30;
    const produto_id = hiddenId?.value ? parseInt(hiddenId.value, 10) : null;
    const produto_nome = hiddenNome?.value || null;

    if (saveStatus) {
      saveStatus.textContent = "Salvando...";
      saveStatus.className = "lembrete-save-status saving";
    }
    if (btnSalvar) btnSalvar.disabled = true;

    try {
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      const resp = await fetch(
        `${API_BASE}/api/produto-lembrete/config-cliente/${clienteId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ativo, dias, produto_id, produto_nome }),
        },
      );

      const data = await resp.json();

      if (data.success) {
        if (saveStatus) {
          saveStatus.textContent = "✓ Salvo!";
          saveStatus.className = "lembrete-save-status success";
          setTimeout(() => {
            saveStatus.textContent = "";
            saveStatus.className = "lembrete-save-status";
          }, 3000);
        }
        console.log("[Lembrete] Config salva com sucesso:", {
          ativo,
          dias,
          produto_id,
          produto_nome,
        });
      } else {
        throw new Error(data.error || "Erro ao salvar");
      }
    } catch (e) {
      console.error("[Lembrete] Erro ao salvar config:", e.message);
      if (saveStatus) {
        saveStatus.textContent = "✗ Erro ao salvar";
        saveStatus.className = "lembrete-save-status error";
      }
      this.mostrarNotificacao(
        "Erro ao salvar configuração de lembrete",
        "error",
      );
    } finally {
      if (btnSalvar) btnSalvar.disabled = false;
    }
  }

  // Validar CPF
  validateCPF(field) {
    const cpfValue = field.value.replace(/\D/g, "");
    const errorElement = document.getElementById("cpf-error");

    // Se o campo estiver vazio, não mostrar erro (campo não é obrigatório)
    if (!cpfValue) {
      this.clearFieldError(field, errorElement);
      return true;
    }

    // Verificar se tem exatamente 11 dígitos
    if (cpfValue.length !== 11) {
      this.showFieldError(
        field,
        errorElement,
        "CPF deve ter exatamente 11 dígitos",
      );
      return false;
    }

    // Verificar se não são todos dígitos iguais
    if (/^(\d)\1{10}$/.test(cpfValue)) {
      this.showFieldError(field, errorElement, "CPF inválido");
      return false;
    }

    // Validar dígitos verificadores
    if (!this.isValidCPF(cpfValue)) {
      this.showFieldError(field, errorElement, "CPF inválido");
      return false;
    }

    this.clearFieldError(field, errorElement);
    return true;
  }

  // Validar telefone
  validateTelefone(field) {
    const telefoneValue = field.value.replace(/\D/g, "");
    const errorElement = document.getElementById("telefone-error");

    // Se o campo estiver vazio, não mostrar erro (campo é opcional)
    if (!telefoneValue) {
      this.clearFieldError(field, errorElement);
      return true;
    }

    // Verificar se tem 10 ou 11 dígitos (com DDD)
    if (telefoneValue.length < 10 || telefoneValue.length > 11) {
      this.showFieldError(
        field,
        errorElement,
        "Telefone deve ter 10 ou 11 dígitos",
      );
      return false;
    }

    // Se tem 11 dígitos, o terceiro dígito deve ser 9 (celular)
    if (telefoneValue.length === 11 && telefoneValue[2] !== "9") {
      this.showFieldError(
        field,
        errorElement,
        "Para celular, o terceiro dígito deve ser 9",
      );
      return false;
    }

    this.clearFieldError(field, errorElement);
    return true;
  }

  // Validação de CPF (algoritmo oficial)
  isValidCPF(cpf) {
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    let digit1 = remainder >= 10 ? 0 : remainder;

    if (digit1 !== parseInt(cpf[9])) return false;

    // Calcular segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    let digit2 = remainder >= 10 ? 0 : remainder;

    return digit2 === parseInt(cpf[10]);
  }

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
          alert("CEP deve conter 8 dígitos");
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
    // Validar CEP
    if (!this.isValidCep(cep)) {
      this.showMessage("CEP inválido. Digite um CEP com 8 dígitos.", "error");
      return;
    }

    try {
      // Mostrar loading no botão
      const btnSearchCep = document.querySelector(".btn-search-cep");
      const originalContent = btnSearchCep.innerHTML;
      btnSearchCep.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btnSearchCep.disabled = true;

      const apiBase = (window.VPS_URL || "") + "/api";
      const response = await fetch(`${apiBase}/cep/${cep}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro na requisição");
      }

      const data = await response.json();

      if (!data.erro) {
        // Preencher campos com os dados retornados da API
        const enderecoField = document.getElementById("endereco");
        const bairroField = document.getElementById("bairro");
        const cidadeField = document.getElementById("cidade");

        if (enderecoField) enderecoField.value = data.logradouro || "";
        if (bairroField) bairroField.value = data.bairro || "";
        if (cidadeField) cidadeField.value = data.localidade || "";

        // Verificar se existe campo UF (estado)
        const ufField =
          document.getElementById("uf") || document.getElementById("estado");
        if (ufField) ufField.value = data.uf || "";

        // Focus no campo número após preenchimento automático
        const numeroField = document.getElementById("numero");
        if (numeroField) {
          setTimeout(() => numeroField.focus(), 100);
        }

        // Mostrar mensagem de sucesso
        this.showMessage(
          "✅ Endereço encontrado e preenchido automaticamente!",
          "success",
        );
      } else {
        this.showMessage(
          "❌ CEP não encontrado. Verifique o número digitado.",
          "error",
        );
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      this.showMessage(
        "❌ Erro ao buscar CEP. Verifique sua conexão e tente novamente.",
        "error",
      );
    } finally {
      // Restaurar botão
      const btnSearchCep = document.querySelector(".btn-search-cep");
      btnSearchCep.innerHTML = '<i class="fas fa-search"></i>';
      btnSearchCep.disabled = false;
    }
  }

  isValidCep(cep) {
    // Remove caracteres não numéricos e verifica se tem 8 dígitos
    const cleanCep = cep.replace(/\D/g, "");
    return cleanCep.length === 8 && /^\d{8}$/.test(cleanCep);
  }

  showMessage(message, type = "info") {
    // Remover mensagem anterior se existir
    const existingMessage = document.querySelector(".cep-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    // Criar nova mensagem
    const messageDiv = document.createElement("div");
    messageDiv.className = `cep-message alert alert-${type}`;
    messageDiv.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
            animation: fadeIn 0.3s ease;
        `;

    if (type === "success") {
      messageDiv.style.backgroundColor = "var(--color-success-light)";
      messageDiv.style.color = "var(--color-success-text)";
      messageDiv.style.border = "1px solid var(--color-success)";
    } else if (type === "error") {
      messageDiv.style.backgroundColor = "var(--color-danger-light)";
      messageDiv.style.color = "var(--color-danger-text)";
      messageDiv.style.border = "1px solid var(--color-danger)";
    }

    messageDiv.textContent = message;

    // Inserir após o campo CEP
    const cepGroup = document.querySelector(".cep-group");
    if (cepGroup) {
      cepGroup.appendChild(messageDiv);

      // Remover mensagem após 3 segundos
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.style.animation = "fadeOut 0.3s ease";
          setTimeout(() => messageDiv.remove(), 300);
        }
      }, 3000);
    }
  }

  setupContactManagement() {
    console.log("🔧 Configurando gerenciamento de contatos...");

    // Aguardar um pouco para garantir que o DOM esteja carregado
    setTimeout(() => {
      const btnAddContact = document.querySelector(".btn-add-contact");
      const telefonesContainer = document.getElementById(
        "telefones-adicionais",
      );

      console.log("Botão encontrado:", btnAddContact);
      console.log("Container encontrado:", telefonesContainer);

      if (btnAddContact) {
        console.log("✅ Adicionando event listener ao botão de telefone");

        btnAddContact.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          console.log("🖱️ Botão de adicionar telefone clicado!");

          if (!telefonesContainer) {
            console.error("❌ Container não encontrado no momento do clique");
            return;
          }

          const contactCounter = telefonesContainer.children.length + 1;

          const contactDiv = document.createElement("div");
          contactDiv.className = "form-group telefone-adicional";
          contactDiv.innerHTML = `
                        <label>Telefone Adicional ${contactCounter}</label>
                        <div class="input-with-button">
                            <input type="text" class="form-control" name="telefone_adicional_${contactCounter}" 
                                   placeholder="(00) 00000-0000">
                            <button type="button" class="btn-remove-field" onclick="this.closest('.telefone-adicional').remove()">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;

          telefonesContainer.appendChild(contactDiv);
          console.log(`📱 Telefone adicional ${contactCounter} criado`);

          // Focar no novo campo
          const newInput = contactDiv.querySelector("input");
          if (newInput) newInput.focus();
        });
      } else {
        console.error("❌ Botão .btn-add-contact não encontrado");
      }
    }, 100);
  }

  setupEmailManagement() {
    console.log("📧 Configurando gerenciamento de emails...");

    // Aguardar um pouco para garantir que o DOM esteja carregado
    setTimeout(() => {
      const btnAddEmail = document.querySelector(".btn-add-email");
      const emailsContainer = document.getElementById("emails-adicionais");

      console.log("Botão email encontrado:", btnAddEmail);
      console.log("Container email encontrado:", emailsContainer);

      if (btnAddEmail) {
        console.log("✅ Adicionando event listener ao botão de email");

        btnAddEmail.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          console.log("🖱️ Botão de adicionar email clicado!");

          if (!emailsContainer) {
            console.error(
              "❌ Container de email não encontrado no momento do clique",
            );
            return;
          }

          const emailCounter = emailsContainer.children.length + 1;

          const emailDiv = document.createElement("div");
          emailDiv.className = "form-group email-adicional";
          emailDiv.innerHTML = `
                        <label>Email Adicional ${emailCounter}</label>
                        <div class="input-with-button">
                            <input type="email" class="form-control" name="email_adicional_${emailCounter}" 
                                   placeholder="exemplo@email.com">
                            <button type="button" class="btn-remove-field" onclick="this.closest('.email-adicional').remove()">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;

          emailsContainer.appendChild(emailDiv);
          console.log(`📧 Email adicional ${emailCounter} criado`);

          // Focar no novo campo
          const newInput = emailDiv.querySelector("input");
          if (newInput) newInput.focus();
        });
      } else {
        console.error("❌ Botão .btn-add-email não encontrado");
      }
    }, 100);
  }

  setupFormValidation() {
    const form = document.getElementById("novoClienteForm");
    if (form) {
      const inputs = form.querySelectorAll("input[required], select[required]");
      inputs.forEach((input) => {
        // Validação ao perder o foco
        input.addEventListener("blur", () => {
          this.validateField(input);
        });

        // Limpar erro ao começar a digitar
        input.addEventListener("input", () => {
          if (input.classList.contains("error")) {
            input.classList.remove("error");

            // Esconder mensagem de erro correspondente
            const errorElement = document.getElementById(`${input.id}-error`);
            if (errorElement) {
              errorElement.classList.remove("show");
            }
          }
        });
      });
    }
  }

  validateField(field) {
    if (field.hasAttribute("required") && !field.value.trim()) {
      field.style.borderColor = "#dc3545";
      return false;
    } else {
      field.style.borderColor = "#dee2e6";
      return true;
    }
  }

  setupFormSubmission() {
    const form = document.getElementById("novoClienteForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitForm();
      });
    }
  }

  // Validar campos obrigatórios
  validateRequiredFields() {
    let isValid = true;

    // Limpar erros anteriores
    this.clearFieldErrors();

    // Validar nome (único campo obrigatório)
    const nomeField = document.getElementById("nome");
    const nomeError = document.getElementById("nome-error");
    if (!nomeField.value.trim()) {
      this.showFieldError(nomeField, nomeError);
      isValid = false;
    }

    return isValid;
  }

  // Mostrar erro em um campo específico
  showFieldError(field, errorElement, message = "") {
    field.classList.add("error");
    if (errorElement) {
      if (message) {
        errorElement.textContent = message;
      }
      errorElement.classList.add("show");
    }

    // Focar no primeiro campo com erro
    field.focus();
  }

  // Limpar erro de um campo específico
  clearFieldError(field, errorElement) {
    field.classList.remove("error");
    if (errorElement) {
      errorElement.classList.remove("show");
      errorElement.textContent = "";
    }
  }

  // Limpar todos os erros de campo
  clearFieldErrors() {
    // Remover classe de erro de todos os campos
    const errorFields = document.querySelectorAll(".form-control.error");
    errorFields.forEach((field) => {
      field.classList.remove("error");
    });

    // Esconder todas as mensagens de erro
    const errorMessages = document.querySelectorAll(
      ".field-error-message.show",
    );
    errorMessages.forEach((message) => {
      message.classList.remove("show");
    });
  }

  async submitForm() {
    const form = document.getElementById("novoClienteForm");
    if (!form) return;

    // Validar campos obrigatórios antes de enviar
    if (!this.validateRequiredFields()) {
      this.mostrarNotificacao("Erro: preencha os dados obrigatórios", "error");
      return;
    }

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
        // Campos fiscais
        tipo_pessoa: "tipoPessoa",
        cnpj: "cnpj",
        inscricao_estadual: "inscricao_estadual",
        indicador_ie: "indicador_ie",
        codigo_ibge_municipio: "codigo_ibge_municipio",
        pais: "pais",
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

      // Adicionar ID do grupo selecionado (se houver)
      const grupoClienteId = document.getElementById("grupoClienteId");
      if (grupoClienteId && grupoClienteId.value) {
        formData.append("grupo_cliente_id", grupoClienteId.value);
        console.log("💼 Grupo selecionado ID:", grupoClienteId.value);
      }

      // Coletar telefones adicionais
      const telefonesAdicionais = [];
      const camposTelefone = document.querySelectorAll(
        'input[name^="telefone_adicional_"]',
      );
      camposTelefone.forEach((campo) => {
        if (campo.value.trim()) {
          telefonesAdicionais.push(campo.value.trim());
        }
      });
      if (telefonesAdicionais.length > 0) {
        formData.append(
          "telefones_adicionais",
          JSON.stringify(telefonesAdicionais),
        );
      }

      // Coletar emails adicionais
      const emailsAdicionais = [];
      const camposEmail = document.querySelectorAll(
        'input[name^="email_adicional_"]',
      );
      camposEmail.forEach((campo) => {
        if (campo.value.trim()) {
          emailsAdicionais.push(campo.value.trim());
        }
      });
      if (emailsAdicionais.length > 0) {
        formData.append("emails_adicionais", JSON.stringify(emailsAdicionais));
      }

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
        const clienteId = this.clienteIdParaEdicao || data.cliente?.id;

        // Salvar config de lembrete via endpoint dedicado (JSON, separado do FormData)
        if (clienteId) {
          await this.salvarLembreteConfig(clienteId).catch((e) =>
            console.warn("[Lembrete] Erro ao salvar após submit:", e.message),
          );
        }

        const mensagem = this.clienteIdParaEdicao
          ? "Cliente atualizado com sucesso!"
          : "Cliente cadastrado com sucesso!";

        this.mostrarNotificacao(mensagem, "success");

        // Redirecionar para a página de detalhes após 2 segundos
        setTimeout(() => {
          window.location.href = `client-details.html?id=${clienteId}`;
        }, 2000);
      } else {
        // Incluir details (mensagem técnica) quando disponível para diagnóstico
        const msgErro = data.error || "Erro ao salvar cliente";
        const detalhe = data.details ? ` (${data.details})` : "";
        throw new Error(msgErro + detalhe);
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

// Salvar página anterior ANTES de qualquer pushState
const _paginaAnterior = document.referrer || "";

// Variável para controlar se o formulário foi modificado
let formularioModificado = false;
let salvandoFormulario = false;
let modalExitAtivo = false;

// Função para marcar o formulário como modificado
function marcarFormularioModificado() {
  formularioModificado = true;
}

// Função para limpar o estado de modificação (quando salvar com sucesso)
function limparEstadoModificacao() {
  formularioModificado = false;
  salvandoFormulario = false;
}

// Criar modal customizado de confirmação
function criarModalConfirmacao() {
  const modalHTML = `
        <div id="exitConfirmModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                position: relative;
            ">
                <div style="
                    width: 60px;
                    height: 60px;
                    background: #ff6b6b;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 24px;
                ">
                    ⚠
                </div>
                
                <h3 style="
                    margin: 0 0 10px;
                    font-size: 20px;
                    font-weight: 600;
                    color: #333;
                ">Tem certeza que deseja sair?</h3>
                
                <p style="
                    margin: 0 0 25px;
                    color: #666;
                    font-size: 14px;
                    line-height: 1.4;
                ">Os dados preenchidos no formulário serão perdidos.</p>
                
                <div style="
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                ">
                    <button id="cancelarSaida" style="
                        background: #f8f9fa;
                        color: #6c757d;
                        border: 1px solid #dee2e6;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                        min-width: 80px;
                    " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                        Cancelar
                    </button>
                    
                    <button id="confirmarSaida" style="
                        background: #ff6b6b;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                        min-width: 80px;
                    " onmouseover="this.style.background='#ff5252'" onmouseout="this.style.background='#ff6b6b'">
                        Sair
                    </button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Event listeners para os botões
  document
    .getElementById("cancelarSaida")
    .addEventListener("click", function () {
      fecharModalConfirmacao();
    });

  document
    .getElementById("confirmarSaida")
    .addEventListener("click", function () {
      confirmarSaida();
    });
}

// Mostrar modal de confirmação
function mostrarModalConfirmacao() {
  const modal = document.getElementById("exitConfirmModal");
  if (modal) {
    modalExitAtivo = true;
    modal.style.display = "flex";
    // Focar no botão cancelar por padrão
    document.getElementById("cancelarSaida").focus();
  }
}

// Fechar modal de confirmação
function fecharModalConfirmacao() {
  const modal = document.getElementById("exitConfirmModal");
  if (modal) {
    modalExitAtivo = false;
    modal.style.display = "none";
  }
}

// Confirmar saída
function confirmarSaida() {
  formularioModificado = false; // Desabilitar proteção
  modalExitAtivo = false;
  fecharModalConfirmacao();
  // Usar replace() para navegar à página anterior sem deixar rastro no histórico
  window.location.replace(_paginaAnterior || "/clientes.html");
}

// Antes: havia um handler 'beforeunload' que disparava o alerta nativo do navegador.
// Removemos esse comportamento para usar exclusivamente o modal customizado de confirmação
// (o 'popstate' e o modal já cuidam da prevenção de navegação no botão voltar).

// Interceptar o botão voltar do navegador especificamente
window.addEventListener("popstate", function (e) {
  if (formularioModificado && !salvandoFormulario && !modalExitAtivo) {
    // Re-empilhar para manter o usuário na página
    history.pushState(null, null, window.location.href);
    // Mostrar modal customizado
    mostrarModalConfirmacao();
  }
});

// Adicionar state inicial para interceptar o primeiro clique no botão voltar
history.pushState(null, null, window.location.href);

// Quando a página é restaurada pelo bfcache (seta do navegador), recarregar para garantir formulário limpo
window.addEventListener("pageshow", function (e) {
  if (e.persisted) {
    window.location.reload();
  }
});

// Inicializar quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Inicializando NovoClienteManager...");
  // Instanciar e expor globalmente para permitir chamadas de fallback/diagnóstico
  const manager = new NovoClienteManager();
  try {
    window.novoClienteManager = manager;
  } catch (e) {
    console.warn("Não foi possível expor manager globalmente", e);
  }
  console.log("✅ NovoClienteManager inicializado!");

  // Criar modal de confirmação
  criarModalConfirmacao();

  // Monitorar mudanças nos campos do formulário
  const formulario = document.querySelector("form");
  if (formulario) {
    // Adicionar listeners para todos os campos
    const campos = formulario.querySelectorAll("input, select, textarea");

    campos.forEach((campo) => {
      // Eventos para diferentes tipos de campo
      campo.addEventListener("input", marcarFormularioModificado);
      campo.addEventListener("change", marcarFormularioModificado);
      campo.addEventListener("keyup", marcarFormularioModificado);
    });

    // Interceptar submissão do formulário
    formulario.addEventListener("submit", function (e) {
      salvandoFormulario = true;
      console.log("📤 Formulário sendo enviado - desabilitando aviso de saída");
    });

    // Fallback: garantir que o formulário não seja enviado via GET caso
    // a inicialização do manager falhe por algum motivo. Este listener
    // previne o comportamento padrão e dispara o submit via AJAX.
    formulario.addEventListener("submit", function (e) {
      // se já foi prevenido por outro handler, não duplicar
      if (e.defaultPrevented) return;
      e.preventDefault();
      console.log(
        "🛡️ Fallback: prevenindo submit padrão e chamando novoClienteManager.submitForm()",
      );
      try {
        if (
          window.novoClienteManager &&
          typeof window.novoClienteManager.submitForm === "function"
        ) {
          window.novoClienteManager.submitForm();
        } else if (
          typeof manager !== "undefined" &&
          manager &&
          typeof manager.submitForm === "function"
        ) {
          manager.submitForm();
        } else {
          console.warn("Fallback: nenhum submitForm disponível");
        }
      } catch (err) {
        console.error("Erro no fallback de submit:", err);
      }
    });
  }

  console.log("🔒 Sistema de proteção contra perda de dados ativado");
});

// ===== SISTEMA DE GRUPOS DE CLIENTES =====

class GrupoClienteSelector {
  constructor() {
    this.grupos = [];
    this.grupoSelecionado = null;
    this.init();
  }

  async init() {
    console.log("🏷️ Inicializando seletor de grupos de clientes");
    this.setupEventListeners();
    await this.carregarGrupos();
  }

  setupEventListeners() {
    const input = document.getElementById("grupoCliente");
    const dropdown = document.getElementById("grupoDropdown");

    if (!input || !dropdown) {
      console.warn("⚠️ Elementos do seletor de grupo não encontrados");
      return;
    }

    // Mostrar dropdown ao focar
    input.addEventListener("focus", () => {
      this.mostrarDropdown();
    });

    // Filtrar ao digitar
    input.addEventListener("input", (e) => {
      this.filtrarGrupos(e.target.value);
    });

    // Esconder dropdown ao clicar fora
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".grupo-cliente-container")) {
        this.esconderDropdown();
      }
    });

    // Navegação por teclado
    input.addEventListener("keydown", (e) => {
      this.handleKeyNavigation(e);
    });

    // Recarregar grupos quando a página ganha foco (volta da aba de gerenciamento)
    window.addEventListener("focus", () => {
      console.log("🔄 Página ganhou foco, recarregando grupos...");
      this.carregarGrupos();
    });

    // Detectar mudanças no localStorage de outras abas
    window.addEventListener("storage", (e) => {
      if (e.key === "gruposClientes") {
        console.log("🔄 Grupos atualizados em outra aba, recarregando...");
        this.carregarGrupos();
      }
    });
  }

  async carregarGrupos() {
    console.log("📥 Carregando grupos de clientes...");

    try {
      // Primeiro, tentar carregar do localStorage
      const gruposLocais = this.carregarGruposDoLocalStorage();

      // Tentar carregar da API
      const response = await fetch("/api/grupos-clientes");
      if (response.ok) {
        this.grupos = await response.json();
        console.log("✅ Grupos carregados da API:", this.grupos.length);
      } else {
        console.log("⚠️ API não disponível, tentando localStorage...");

        if (gruposLocais && gruposLocais.length > 0) {
          this.grupos = gruposLocais;
          console.log(
            "📦 Grupos carregados do localStorage:",
            this.grupos.length,
          );
        } else {
          // Carregar grupos de exemplo se API não disponível e sem localStorage
          this.grupos = [
            {
              id: 1,
              nome: "VIPs",
              descricao: "Clientes com alto volume de compras",
              cor: "#FFD700",
            },
            {
              id: 2,
              nome: "Novos Clientes",
              descricao: "Clientes cadastrados nos últimos 30 dias",
              cor: "#32CD32",
            },
            {
              id: 3,
              nome: "Inativos",
              descricao: "Clientes sem compras há mais de 6 meses",
              cor: "#FF6347",
            },
          ];
          console.log("📋 Usando grupos de exemplo");
        }
      }
    } catch (error) {
      console.error("❌ Erro ao carregar grupos:", error);

      // Em caso de erro, tentar localStorage
      const gruposLocais = this.carregarGruposDoLocalStorage();
      if (gruposLocais && gruposLocais.length > 0) {
        this.grupos = gruposLocais;
        console.log("🔄 Grupos carregados do localStorage após erro");
      } else {
        this.grupos = [];
      }
    }

    this.renderizarDropdown();
  }

  // TODO: Substituir por ApiClient.getGruposClientes()
  // Não usar localStorage para gruposClientes
  carregarGruposDoLocalStorage() {
    console.warn(
      "⚠️ carregarGruposDoLocalStorage() DEPRECATED - usar ApiClient.getGruposClientes()",
    );
    return []; // Retorna vazio até implementação da API

    /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO
        try {
            const gruposJson = localStorage.getItem('gruposClientes');
            if (gruposJson) {
                return JSON.parse(gruposJson);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar grupos do localStorage:', error);
        }
        return [];
        */
  }

  mostrarDropdown() {
    const dropdown = document.getElementById("grupoDropdown");
    if (dropdown) {
      dropdown.style.display = "block";
      this.renderizarDropdown();
    }
  }

  esconderDropdown() {
    const dropdown = document.getElementById("grupoDropdown");
    if (dropdown) {
      dropdown.style.display = "none";
    }
  }

  filtrarGrupos(termo) {
    this.mostrarDropdown();

    if (!termo.trim()) {
      this.renderizarDropdown();
      return;
    }

    const termoLower = termo.toLowerCase();
    const gruposFiltrados = this.grupos.filter(
      (grupo) =>
        grupo.nome.toLowerCase().includes(termoLower) ||
        grupo.descricao.toLowerCase().includes(termoLower),
    );

    this.renderizarDropdown(gruposFiltrados);
  }

  renderizarDropdown(gruposFiltrados = null) {
    const dropdown = document.getElementById("grupoDropdown");
    if (!dropdown) return;

    const grupos = gruposFiltrados || this.grupos;

    if (grupos.length === 0) {
      dropdown.innerHTML = `
                <div class="dropdown-empty">
                    <i class="fas fa-search"></i>
                    Nenhum grupo encontrado
                </div>
            `;
      return;
    }

    const html = grupos
      .map(
        (grupo) => `
            <div class="grupo-dropdown-item" data-grupo-id="${grupo.id}" onclick="grupoSelector.selecionarGrupo(${grupo.id})">
                <div class="grupo-color-indicator" style="background-color: ${grupo.cor}"></div>
                <div class="grupo-item-info">
                    <div class="grupo-item-name">${grupo.nome}</div>
                    <div class="grupo-item-desc">${grupo.descricao}</div>
                </div>
            </div>
        `,
      )
      .join("");

    dropdown.innerHTML = html;
  }

  selecionarGrupo(grupoId) {
    const grupo = this.grupos.find((g) => g.id === grupoId);
    if (!grupo) return;

    this.grupoSelecionado = grupo;

    const input = document.getElementById("grupoCliente");
    const hiddenInput = document.getElementById("grupoClienteId");

    if (input) input.value = grupo.nome;
    if (hiddenInput) hiddenInput.value = grupo.id;

    this.esconderDropdown();

    console.log("✅ Grupo selecionado:", grupo);

    // Marcar formulário como modificado
    if (typeof marcarFormularioModificado === "function") {
      marcarFormularioModificado();
    }
  }

  handleKeyNavigation(e) {
    const dropdown = document.getElementById("grupoDropdown");
    if (!dropdown || dropdown.style.display === "none") return;

    const items = dropdown.querySelectorAll(".grupo-dropdown-item");
    const currentActive = dropdown.querySelector(
      ".grupo-dropdown-item.selected",
    );
    let newActiveIndex = -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (currentActive) {
        newActiveIndex = Array.from(items).indexOf(currentActive) + 1;
      } else {
        newActiveIndex = 0;
      }
      newActiveIndex = Math.min(newActiveIndex, items.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentActive) {
        newActiveIndex = Array.from(items).indexOf(currentActive) - 1;
      } else {
        newActiveIndex = items.length - 1;
      }
      newActiveIndex = Math.max(newActiveIndex, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentActive) {
        const grupoId = parseInt(currentActive.dataset.grupoId);
        this.selecionarGrupo(grupoId);
      }
      return;
    } else if (e.key === "Escape") {
      this.esconderDropdown();
      return;
    }

    // Remover seleção anterior e aplicar nova
    items.forEach((item) => item.classList.remove("selected"));
    if (newActiveIndex >= 0 && items[newActiveIndex]) {
      items[newActiveIndex].classList.add("selected");
    }
  }

  // Método público para definir valor (usado ao carregar dados do cliente)
  definirGrupo(nomeGrupo, grupoId = null) {
    const input = document.getElementById("grupoCliente");
    const hiddenInput = document.getElementById("grupoClienteId");

    if (input) input.value = nomeGrupo || "";
    if (hiddenInput) hiddenInput.value = grupoId || "";

    // Encontrar o grupo correspondente
    if (nomeGrupo) {
      const grupo = this.grupos.find(
        (g) =>
          g.nome.toLowerCase() === nomeGrupo.toLowerCase() || g.id == grupoId,
      );
      if (grupo) {
        this.grupoSelecionado = grupo;
      }
    }
  }
}

// Função global para abrir gerenciador de grupos
function abrirGerenciadorGrupos() {
  const janela = window.open("grupos-clientes.html", "_blank");

  // Verificar quando a janela for fechada para atualizar os grupos
  const verificarJanela = setInterval(() => {
    if (janela.closed) {
      clearInterval(verificarJanela);
      console.log("🔄 Janela de grupos fechada, atualizando lista...");
      if (grupoSelector) {
        grupoSelector.carregarGrupos();
      }
    }
  }, 1000);
}

// Instanciar seletor quando DOM estiver pronto
let grupoSelector;
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    grupoSelector = new GrupoClienteSelector();
  }, 100); // Pequeno delay para garantir que outros scripts foram carregados
});
