// ===================================
// FORMULÁRIO ADICIONAR FORNECEDOR
// ===================================

document.addEventListener("DOMContentLoaded", () => {
  initializeForm();
});

// ===================================
// INICIALIZAÇÃO
// ===================================

function initializeForm() {
  setupTipoPessoaToggle();
  setupParceiroToggle();
  setupIssRetidoToggle();
  setupCEPLookup();
  setupContatoManagement();
  setupFormSubmission();
  setupMasks();
  loadFornecedorIfEditing();
}

// Snapshot do estado inicial do formulário (stringified)
let initialFormState = null;

// ===================================
// TOGGLE TIPO PESSOA
// ===================================

function setupTipoPessoaToggle() {
  const juridicaBtn = document.getElementById("btn-juridica");
  const fisicaBtn = document.getElementById("btn-fisica");
  const cnpjField = document.getElementById("cnpj-field");
  const cpfField = document.getElementById("cpf-field");

  juridicaBtn.addEventListener("click", () => {
    juridicaBtn.classList.add("active");
    fisicaBtn.classList.remove("active");
    cnpjField.classList.add("show");
    cpfField.classList.remove("show");
    document.getElementById("cnpj").required = true;
    document.getElementById("cpf").required = false;
  });

  fisicaBtn.addEventListener("click", () => {
    fisicaBtn.classList.add("active");
    juridicaBtn.classList.remove("active");
    cpfField.classList.add("show");
    cnpjField.classList.remove("show");
    document.getElementById("cpf").required = true;
    document.getElementById("cnpj").required = false;
  });
}

// ===================================
// TOGGLE PARCEIRO DE INDICAÇÃO
// ===================================

function setupParceiroToggle() {
  const parceiroCheckbox = document.getElementById("parceiro-indicacao");
  const perfilWrapper = document.getElementById("perfil-comissao-wrapper");

  if (parceiroCheckbox && perfilWrapper) {
    parceiroCheckbox.addEventListener("change", () => {
      if (parceiroCheckbox.checked) {
        perfilWrapper.style.display = "flex";
      } else {
        perfilWrapper.style.display = "none";
      }
    });
  }
}

// ===================================
// TOGGLE ISS RETIDO
// ===================================

function setupIssRetidoToggle() {
  const issCheckbox = document.getElementById("iss-retido");
  const inscMunicipalWrapper = document.getElementById(
    "insc-municipal-wrapper",
  );

  if (issCheckbox && inscMunicipalWrapper) {
    issCheckbox.addEventListener("change", () => {
      if (issCheckbox.checked) {
        inscMunicipalWrapper.style.display = "flex";
      } else {
        inscMunicipalWrapper.style.display = "none";
      }
    });
  }
}

// ===================================
// MÁSCARAS DE INPUT
// ===================================

function setupMasks() {
  // Máscara CNPJ: 00.000.000/0000-00
  const cnpjInput = document.getElementById("cnpj");
  if (cnpjInput) {
    cnpjInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 14) value = value.slice(0, 14);

      if (value.length > 12) {
        value = value.replace(
          /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
          "$1.$2.$3/$4-$5",
        );
      } else if (value.length > 8) {
        value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, "$1.$2.$3/$4");
      } else if (value.length > 5) {
        value = value.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
      } else if (value.length > 2) {
        value = value.replace(/(\d{2})(\d{3})/, "$1.$2");
      }

      e.target.value = value;
    });
  }

  // Máscara CPF: 000.000.000-00
  const cpfInput = document.getElementById("cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);

      if (value.length > 9) {
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      } else if (value.length > 6) {
        value = value.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
      } else if (value.length > 3) {
        value = value.replace(/(\d{3})(\d{3})/, "$1.$2");
      }

      e.target.value = value;
    });
  }

  // Máscara CEP: 00000-000
  const cepInput = document.getElementById("cep");
  if (cepInput) {
    cepInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 8) value = value.slice(0, 8);

      if (value.length > 5) {
        value = value.replace(/(\d{5})(\d{3})/, "$1-$2");
      }

      e.target.value = value;
    });
  }

  // Máscara Telefone: (00) 00000-0000
  const telefoneInput = document.getElementById("telefone");
  if (telefoneInput) {
    telefoneInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);

      if (value.length > 10) {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      } else if (value.length > 6) {
        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
      } else if (value.length > 2) {
        value = value.replace(/(\d{2})(\d{0,5})/, "($1) $2");
      }

      e.target.value = value;
    });
  }
}

// ===================================
// BUSCA CEP VIA VIACEP
// ===================================

function setupCEPLookup() {
  const cepIcon = document.getElementById("cep-icon");
  const cepInput = document.getElementById("cep");

  if (cepIcon && cepInput) {
    cepIcon.addEventListener("click", () => buscarCEP());
    cepInput.addEventListener("blur", () => {
      const cep = cepInput.value.replace(/\D/g, "");
      if (cep.length === 8) {
        buscarCEP();
      }
    });
  }
}

async function buscarCEP() {
  const cepInput = document.getElementById("cep");
  const cep = cepInput.value.replace(/\D/g, "");

  if (cep.length !== 8) {
    localShowToast("CEP inválido. Digite um CEP com 8 dígitos.", "error");
    return;
  }

  try {
    localShowToast("Buscando CEP...", "info");
    const apiBase = (window.VPS_URL || "") + "/api";
    const response = await fetch(`${apiBase}/cep/${cep}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.erro) {
      localShowToast("CEP não encontrado.", "error");
      return;
    }

    // Preenche os campos
    document.getElementById("endereco").value = data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("proximidade").value = data.complemento || "";

    localShowToast("CEP encontrado com sucesso!", "success");

    // Foca no campo número
    document.getElementById("numero").focus();
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    localShowToast("Erro ao buscar CEP. Tente novamente.", "error");
  }
}

// ===================================
// GERENCIAMENTO DE CONTATOS (TAGS)
// ===================================

let emailTags = [];

function setupContatoManagement() {
  const addEmailBtn = document.getElementById("add-email-btn");
  const emailInput = document.getElementById("email-contato");

  if (addEmailBtn && emailInput) {
    addEmailBtn.addEventListener("click", () => addEmailTag());
    emailInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addEmailTag();
      }
    });
  }
}

function addEmailTag() {
  const emailInput = document.getElementById("email-contato");
  const email = emailInput.value.trim();

  if (!email) {
    localShowToast("Digite um email válido.", "error");
    return;
  }

  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    localShowToast("Email inválido.", "error");
    return;
  }

  // Verifica se já existe
  if (emailTags.includes(email)) {
    localShowToast("Este email já foi adicionado.", "error");
    return;
  }

  emailTags.push(email);
  renderEmailTags();
  emailInput.value = "";
  emailInput.focus();
}

function removeEmailTag(email) {
  emailTags = emailTags.filter((e) => e !== email);
  renderEmailTags();
}

function renderEmailTags() {
  const container = document.getElementById("email-tags-container");
  container.innerHTML = "";

  emailTags.forEach((email) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.innerHTML = `
            ${email}
            <span class="tag-remove" onclick="removeEmailTag('${email}')">&times;</span>
        `;
    container.appendChild(tag);
  });
}

// Torna a função global para uso no onclick
window.removeEmailTag = removeEmailTag;

// ===================================
// SUBMISSÃO DO FORMULÁRIO
// ===================================

function setupFormSubmission() {
  const form = document.getElementById("fornecedor-form");
  const btnSalvar = document.getElementById("btn-salvar");
  const btnNovo = document.getElementById("btn-novo");
  const btnCancelar = document.getElementById("btn-cancelar");

  if (btnSalvar) {
    btnSalvar.addEventListener("click", (e) => {
      e.preventDefault();
      salvarFornecedor();
    });
  }

  if (btnNovo) {
    btnNovo.addEventListener("click", (e) => {
      e.preventDefault();
      limparFormulario();
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        const current = JSON.stringify(coletarDadosFormulario());
        if (!initialFormState || initialFormState === current) {
          // sem alterações: navegar direto
          window.location.href = "fornecedor.html";
          return;
        }

        // com alterações: mostrar modal sistêmico
        showSystemConfirm(
          "Deseja cancelar? Todas as alterações serão perdidas.",
          function () {
            window.location.href = "fornecedor.html";
          },
        );
      } catch (err) {
        // fallback
        confirmar("Deseja cancelar? Todas as alterações serão perdidas.").then(
          function (r) {
            if (r) window.location.href = "fornecedor.html";
          },
        );
      }
    });
  }
}

async function salvarFornecedor() {
  if (!validarFormulario()) {
    return;
  }

  const btnSalvar = document.getElementById("btn-salvar");
  btnSalvar.classList.add("loading");
  btnSalvar.disabled = true;

  try {
    const fornecedorData = coletarDadosFormulario();
    const fornecedorId = getUrlParameter("id");

    let response;
    if (fornecedorId) {
      // Atualizar fornecedor existente
      response = await ApiClient.atualizarFornecedor(
        fornecedorId,
        fornecedorData,
      );
      localShowToast("Fornecedor atualizado com sucesso!", "success");
    } else {
      // Criar novo fornecedor
      response = await ApiClient.criarFornecedor(fornecedorData);
      localShowToast("Fornecedor cadastrado com sucesso!", "success");
    }

    setTimeout(() => {
      window.location.href = "fornecedor.html";
    }, 1500);
  } catch (error) {
    console.error("Erro ao salvar fornecedor:", error);
    localShowToast("Erro ao salvar fornecedor. Tente novamente.", "error");
  } finally {
    btnSalvar.classList.remove("loading");
    btnSalvar.disabled = false;
  }
}

function coletarDadosFormulario() {
  const tipoPessoa = document
    .getElementById("btn-juridica")
    .classList.contains("active")
    ? "juridica"
    : "fisica";

  return {
    nome: document.getElementById("nome").value.trim(),
    cnpj:
      tipoPessoa === "juridica"
        ? document.getElementById("cnpj").value.replace(/\D/g, "")
        : null,
    cpf:
      tipoPessoa === "fisica"
        ? document.getElementById("cpf").value.replace(/\D/g, "")
        : null,
    contribuinte: document.getElementById("contribuinte").value,
    consFinal: document.getElementById("cons-final").checked,
    issRetido: document.getElementById("iss-retido").checked,
    inscMunicipal: document.getElementById("insc-municipal").value.trim(),
    razaoSocial: document.getElementById("razao-social").value.trim(),
    inscEstadual: document.getElementById("insc-estadual").value.trim(),
    cep: document.getElementById("cep").value.replace(/\D/g, ""),
    endereco: document.getElementById("endereco").value.trim(),
    numero: document.getElementById("numero").value.trim(),
    complemento: document.getElementById("complemento").value.trim(),
    bairro: document.getElementById("bairro").value.trim(),
    cidade: document.getElementById("cidade").value.trim(),
    proximidade: document.getElementById("proximidade").value.trim(),
    telefone: document.getElementById("telefone").value.replace(/\D/g, ""),
    email: emailTags.length > 0 ? emailTags[0] : "", // Email principal
    tags: emailTags.join(", "), // Todos os emails como tags
    parceiroIndicacao: document.getElementById("parceiro-indicacao").checked,
    perfilComissao: document.getElementById("perfil-comissao").value.trim(),
    observacao: document.getElementById("observacao").value.trim(),
    ativo: true,
  };
}

function validarFormulario() {
  let isValid = true;
  const errors = [];

  // Nome obrigatório
  const nome = document.getElementById("nome").value.trim();
  if (!nome) {
    errors.push("Nome é obrigatório.");
    markFieldAsError("nome");
    isValid = false;
  }

  // CNPJ ou CPF obrigatório
  const tipoPessoa = document
    .getElementById("btn-juridica")
    .classList.contains("active")
    ? "juridica"
    : "fisica";

  if (tipoPessoa === "juridica") {
    const cnpj = document.getElementById("cnpj").value.replace(/\D/g, "");
    if (!cnpj || cnpj.length !== 14) {
      errors.push("CNPJ inválido.");
      markFieldAsError("cnpj");
      isValid = false;
    }
  } else {
    const cpf = document.getElementById("cpf").value.replace(/\D/g, "");
    if (!cpf || cpf.length !== 11) {
      errors.push("CPF inválido.");
      markFieldAsError("cpf");
      isValid = false;
    }
  }

  if (!isValid) {
    localShowToast(errors.join(" "), "error");
  }

  return isValid;
}

function markFieldAsError(fieldId) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.add("error");
    setTimeout(() => field.classList.remove("error"), 3000);
  }
}

function limparFormulario() {
  document.getElementById("fornecedor-form").reset();
  emailTags = [];
  renderEmailTags();

  // Reset tipo pessoa para Jurídica
  document.getElementById("btn-juridica").click();

  localShowToast("Formulário limpo. Pronto para novo cadastro.", "info");
}

// ===================================
// CARREGAR FORNECEDOR PARA EDIÇÃO
// ===================================

async function loadFornecedorIfEditing() {
  const fornecedorId = getUrlParameter("id");
  if (!fornecedorId) return;

  try {
    const fornecedor = await ApiClient.getFornecedor(fornecedorId);

    // Preenche o formulário
    document.getElementById("nome").value = fornecedor.nome || "";

    // Define tipo pessoa
    if (fornecedor.cnpj) {
      document.getElementById("btn-juridica").click();
      document.getElementById("cnpj").value = formatarCNPJ(fornecedor.cnpj);
    } else if (fornecedor.cpf) {
      document.getElementById("btn-fisica").click();
      document.getElementById("cpf").value = formatarCPF(fornecedor.cpf);
    }

    document.getElementById("contribuinte").value =
      fornecedor.contribuinte || "";
    document.getElementById("cons-final").checked =
      fornecedor.consFinal || false;
    document.getElementById("iss-retido").checked =
      fornecedor.issRetido || false;

    // Mostrar campo de Insc. Municipal se ISS Retido estiver ativo
    if (fornecedor.issRetido) {
      const inscMunicipalWrapper = document.getElementById(
        "insc-municipal-wrapper",
      );
      if (inscMunicipalWrapper) {
        inscMunicipalWrapper.style.display = "flex";
      }
      document.getElementById("insc-municipal").value =
        fornecedor.inscMunicipal || "";
    }

    document.getElementById("razao-social").value =
      fornecedor.razaoSocial || "";
    document.getElementById("insc-estadual").value =
      fornecedor.inscEstadual || "";
    document.getElementById("cep").value = formatarCEP(fornecedor.cep);
    document.getElementById("endereco").value = fornecedor.endereco || "";
    document.getElementById("numero").value = fornecedor.numero || "";
    document.getElementById("complemento").value = fornecedor.complemento || "";
    document.getElementById("bairro").value = fornecedor.bairro || "";
    document.getElementById("cidade").value = fornecedor.cidade || "";
    document.getElementById("proximidade").value = fornecedor.proximidade || "";
    document.getElementById("telefone").value = formatarTelefone(
      fornecedor.telefone,
    );

    // Emails/Tags
    if (fornecedor.tags) {
      emailTags = fornecedor.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      renderEmailTags();
    }

    document.getElementById("parceiro-indicacao").checked =
      fornecedor.parceiroIndicacao || false;

    // Mostrar campo de perfil se parceiro estiver ativo
    if (fornecedor.parceiroIndicacao) {
      const perfilWrapper = document.getElementById("perfil-comissao-wrapper");
      if (perfilWrapper) {
        perfilWrapper.style.display = "flex";
      }
      document.getElementById("perfil-comissao").value =
        fornecedor.perfilComissao || "";
    }

    document.getElementById("observacao").value = fornecedor.observacao || "";

    localShowToast("Fornecedor carregado para edição.", "info");
    // snapshot do estado inicial após carregar os dados
    try {
      initialFormState = JSON.stringify(coletarDadosFormulario());
    } catch (e) {
      initialFormState = null;
    }
  } catch (error) {
    console.error("Erro ao carregar fornecedor:", error);
    localShowToast("Erro ao carregar fornecedor.", "error");
  }
}

// Se o formulário for novo (sem id), captura estado inicial ao iniciar
setTimeout(function () {
  try {
    const hasId = getUrlParameter("id");
    if (!hasId) initialFormState = JSON.stringify(coletarDadosFormulario());
  } catch (e) {
    /* silencioso */
  }
}, 150);

// Modal sistêmico centralizado (usado para confirmação de cancelar)
function showSystemConfirm(message, onConfirm) {
  // remover modal existente
  const existing = document.querySelector(".sys-confirm-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "sys-confirm-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.36)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "16000";

  const modal = document.createElement("div");
  modal.className = "sys-confirm-modal";
  modal.style.background = "#fff";
  modal.style.padding = "20px 22px";
  modal.style.borderRadius = "10px";
  modal.style.boxShadow = "0 10px 30px rgba(2,16,26,0.18)";
  modal.style.maxWidth = "520px";
  modal.style.width = "100%";

  const title = document.createElement("h3");
  title.textContent = "Confirmar";
  title.style.margin = "0 0 8px 0";
  title.style.fontSize = "18px";
  title.style.color = "#111";

  const msg = document.createElement("div");
  msg.textContent = message;
  msg.style.marginBottom = "18px";
  msg.style.color = "#222";
  msg.style.fontSize = "15px";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "10px";

  const btnCancel = document.createElement("button");
  btnCancel.textContent = "Cancelar";
  btnCancel.style.padding = "8px 14px";
  btnCancel.style.borderRadius = "8px";
  btnCancel.style.border = "none";
  btnCancel.style.background = "#f3f4f6";
  btnCancel.style.color = "#333";
  btnCancel.style.cursor = "pointer";
  btnCancel.addEventListener("click", function () {
    overlay.remove();
  });

  const btnOk = document.createElement("button");
  btnOk.textContent = "OK";
  btnOk.style.padding = "8px 14px";
  btnOk.style.borderRadius = "8px";
  btnOk.style.border = "none";
  btnOk.style.background = "#d32f2f";
  btnOk.style.color = "#fff";
  btnOk.style.cursor = "pointer";
  btnOk.addEventListener("click", function () {
    try {
      onConfirm && onConfirm();
    } finally {
      overlay.remove();
    }
  });

  actions.appendChild(btnCancel);
  actions.appendChild(btnOk);
  modal.appendChild(title);
  modal.appendChild(msg);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => {
    btnOk.focus();
  }, 60);
}

// ===================================
// FUNÇÕES DE FORMATAÇÃO
// ===================================

function formatarCNPJ(cnpj) {
  if (!cnpj) return "";
  const cleaned = cnpj.replace(/\D/g, "");
  return cleaned.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5",
  );
}

function formatarCPF(cpf) {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarCEP(cep) {
  if (!cep) return "";
  const cleaned = cep.replace(/\D/g, "");
  return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2");
}

function formatarTelefone(telefone) {
  if (!telefone) return "";
  const cleaned = telefone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return telefone;
}

// ===================================
// UTILITÁRIOS
// ===================================

function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function localShowToast(message, type = "info") {
  // Se existir um toast externo registrado (por outros scripts), usa ele
  if (typeof window._externalShowToast === "function") {
    try {
      window._externalShowToast(message, type);
      return;
    } catch (e) {
      console.error("Erro ao chamar _externalShowToast:", e);
    }
  }
  // Caso contrário, renderiza um toast não-bloqueante na página
  try {
    // criar container se necessário
    let container = document.querySelector(".local-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "local-toast-container";
      container.style.position = "fixed";
      container.style.top = "18px";
      container.style.right = "18px";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";
      container.style.zIndex = "14000";
      container.style.pointerEvents = "none";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "local-toast";
    toast.style.pointerEvents = "auto";
    toast.style.minWidth = "180px";
    toast.style.maxWidth = "380px";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 8px 24px rgba(2,16,26,0.12)";
    toast.style.color = "#082032";
    toast.style.fontSize = "14px";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px) scale(0.98)";
    toast.style.transition = "opacity .18s, transform .18s";

    if (type === "error") {
      toast.style.background = "linear-gradient(180deg,#ffeaea,#ffdede)";
      toast.style.border = "1px solid rgba(220,53,69,0.12)";
    } else if (type === "success") {
      toast.style.background = "linear-gradient(180deg,#e8f8ef,#dff6ec)";
      toast.style.border = "1px solid rgba(6,150,100,0.08)";
    } else {
      toast.style.background = "linear-gradient(180deg,#eef6ff,#e3efff)";
      toast.style.border = "1px solid rgba(2,37,102,0.06)";
    }

    toast.textContent = message;
    container.appendChild(toast);

    // animar entrada
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "none";
    });

    // remover após 4s
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px) scale(0.98)";
      setTimeout(() => {
        try {
          toast.remove();
        } catch (e) {}
      }, 220);
    }, 4000);
  } catch (e) {
    try {
      console.error("Erro ao mostrar toast local:", e);
    } catch (ex) {}
  }
}

// Expor para outros scripts que queiram reutilizar esta função local
window.localShowToast = localShowToast;
