// Sistema de Cadastro de Pets
console.log("🐾 Sistema de cadastro de pets carregado");

// Variáveis globais
let clientes = [];
let petAtual = null;
let editingPetId = null;

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Inicializando sistema de cadastro de pets");

  // Carregar clientes
  carregarClientes();

  // Configurar eventos
  configurarEventos();

  // Verificar se há cliente pré-selecionado na URL
  verificarClienteUrl();
  // Verificar se estamos editando um pet
  verificarPetParaEdicao();

  // Configurar cálculo automático de idade
  configurarCalculoIdade();
});

// Verificar se há parâmetro de edição de pet na URL
function verificarPetParaEdicao() {
  const urlParams = new URLSearchParams(window.location.search);
  const petId =
    urlParams.get("pet_id") || urlParams.get("petId") || urlParams.get("id");
  if (petId) {
    console.log("✏️ Editando pet:", petId);
    carregarPetParaEdicao(petId);
  }
}

// Carregar pet para edição e preencher formulário
async function carregarPetParaEdicao(petId) {
  try {
    const API_BASE =
      (window.__API_BASE__ && window.__API_BASE__.toString()) ||
      window.location.origin;
    const response = await fetch(`${API_BASE}/api/pets/${petId}`);
    if (!response.ok) {
      throw new Error("Falha ao carregar pet");
    }
    const data = await response.json();
    const pet = data && (data.pet || data);
    if (!pet) return;

    editingPetId = pet.id;
    petAtual = pet;

    // Preencher campos do formulário com segurança
    const setIf = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value == null ? "" : value;
    };

    setIf("nome", pet.nome || "");
    setIf("cliente", pet.cliente_id || "");
    setIf("raca", pet.raca || "");
    setIf("genero", pet.genero || "");
    setIf("porte", pet.porte || "");
    setIf("pelagem", pet.pelagem || "");

    // data_nascimento vem como YYYY-MM-DD do servidor — converter para DD/MM/YYYY para o input
    if (pet.data_nascimento) {
      const d = new Date(pet.data_nascimento);
      if (!isNaN(d)) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        setIf("data_nascimento", `${day}/${month}/${year}`);
        const idadeEl = document.getElementById("idade");
        if (idadeEl) {
          // chamar a função inline que calcula a idade a partir do input (calcularIdade sem params)
          try {
            if (typeof calcularIdade === "function") {
              calcularIdade();
            }
          } catch (e) {
            idadeEl.value = "";
          }
        }
      } else {
        setIf("data_nascimento", pet.data_nascimento);
      }
    }

    setIf("chip", pet.chip || "");
    setIf("pedigree_rg", pet.pedigree_rg || "");
    setIf("alimentacao", pet.alimentacao || "");
    // Preencher tags no componente de tags
    try {
      if (pet.tags) {
        let tagsArr = [];
        if (typeof pet.tags === "string") {
          const t = pet.tags.trim();
          if (t.startsWith("[")) {
            try {
              tagsArr = JSON.parse(t);
            } catch (e) {
              tagsArr = t
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            }
          } else {
            tagsArr = t
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        } else if (Array.isArray(pet.tags)) {
          tagsArr = pet.tags;
        }
        // set global selectedTags and refresh display if function available
        if (Array.isArray(tagsArr) && tagsArr.length > 0) {
          try {
            // Tentar popular o array global `selectedTags` (declarado no script inline do HTML)
            if (typeof selectedTags !== "undefined") {
              selectedTags.length = 0;
              tagsArr.forEach((t) => selectedTags.push(t));
            } else {
              // fallback para window (em alguns contextos)
              window.selectedTags = tagsArr;
            }
            if (typeof updateSelectedTagsDisplay === "function")
              updateSelectedTagsDisplay();
          } catch (e) {
            console.warn("Não foi possível popular selectedTags:", e);
          }
        }
        setIf("tags", Array.isArray(tagsArr) ? tagsArr.join(", ") : pet.tags);
      } else {
        setIf("tags", "");
      }
    } catch (e) {
      setIf("tags", pet.tags || "");
    }
    setIf("alergias", pet.alergias || "");
    setIf("observacao", pet.observacao || "");

    // Ajustar UI: mudar texto do botão salvar
    const btnSalvar =
      document.querySelector(".btn-primary") ||
      document.querySelector('button[type="submit"]');
    if (btnSalvar) btnSalvar.textContent = "Atualizar Pet";

    // Exibir info do cliente relacionado
    if (pet.cliente_id) {
      const clienteSelect = document.getElementById("cliente");
      if (clienteSelect) {
        clienteSelect.value = pet.cliente_id;
        clienteSelect.dispatchEvent(new Event("change"));
      }
    }
  } catch (error) {
    console.error("❌ Erro ao carregar pet para edição:", error);
    mostrarErro("Erro ao carregar dados do pet para edição");
  }
}

// Carregar lista de clientes
async function carregarClientes() {
  try {
    console.log("📡 Carregando lista de clientes...");

    const API_BASE =
      (window.__API_BASE__ && window.__API_BASE__.toString()) ||
      window.location.origin;
    const response = await fetch(`${API_BASE}/api/clientes`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    clientes = data.success ? data.clientes : data;

    console.log("✅ Clientes carregados:", clientes.length);

    // Preencher select de clientes
    preencherSelectClientes();
  } catch (error) {
    console.error("❌ Erro ao carregar clientes:", error);
    mostrarErro("Erro ao carregar lista de clientes");
  }
}

// Preencher select de clientes
function preencherSelectClientes() {
  const select = document.getElementById("cliente");
  if (!select) return;

  // Limpar opções existentes (exceto a primeira)
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }

  // Adicionar clientes ativos
  clientes
    .filter((cliente) => cliente.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach((cliente) => {
      const option = document.createElement("option");
      option.value = cliente.id;
      option.textContent = cliente.nome;
      select.appendChild(option);
    });

  console.log("✅ Select de clientes preenchido");
}

// Configurar eventos
function configurarEventos() {
  // Evento de mudança no select de cliente
  const clienteSelect = document.getElementById("cliente");
  if (clienteSelect) {
    clienteSelect.addEventListener("change", function () {
      const clienteId = this.value;
      if (clienteId) {
        mostrarInfoCliente(clienteId);
        document.getElementById("clienteId").value = clienteId;
      } else {
        ocultarInfoCliente();
        document.getElementById("clienteId").value = "";
      }
    });
  }

  // Evento de submit do formulário
  const form = document.getElementById("petForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      salvarPet();
    });
  }

  // Eventos de validação em tempo real
  configurarValidacaoTempoReal();
}

// Configurar validação em tempo real
function configurarValidacaoTempoReal() {
  // Validação do nome (obrigatório)
  const nomeInput = document.getElementById("nome");
  if (nomeInput) {
    nomeInput.addEventListener("blur", function () {
      validarCampoObrigatorio(this);
    });
  }

  // Validação do cliente (obrigatório)
  const clienteSelect = document.getElementById("cliente");
  if (clienteSelect) {
    clienteSelect.addEventListener("change", function () {
      validarCampoObrigatorio(this);
    });
  }
}

// Validar campo obrigatório
function validarCampoObrigatorio(campo) {
  const valor = campo.value.trim();
  const isValido = valor !== "";

  if (isValido) {
    campo.style.borderColor = "#28a745";
    campo.style.backgroundColor = "#f8fff9";
  } else {
    campo.style.borderColor = "#dc3545";
    campo.style.backgroundColor = "#fff5f5";
  }

  return isValido;
}

// Verificar se há cliente pré-selecionado na URL
function verificarClienteUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const clienteId = urlParams.get("cliente_id");

  if (clienteId) {
    console.log("🔗 Cliente pré-selecionado via URL:", clienteId);

    // Aguardar um pouco para garantir que o select foi preenchido
    setTimeout(() => {
      const clienteSelect = document.getElementById("cliente");
      if (clienteSelect) {
        clienteSelect.value = clienteId;
        clienteSelect.dispatchEvent(new Event("change"));
      }
    }, 500);
  }
}

// Mostrar informações do cliente selecionado
function mostrarInfoCliente(clienteId) {
  const cliente = clientes.find((c) => c.id == clienteId);
  if (!cliente) return;

  console.log("👤 Mostrando info do cliente:", cliente.nome);

  // Atualizar card de informações
  const clientInfo = document.getElementById("clientInfo");
  const clientName = document.getElementById("clientName");
  const clientDetails = document.getElementById("clientDetails");
  const clientAvatar = document.getElementById("clientAvatar");

  if (clientInfo && clientName && clientDetails && clientAvatar) {
    clientName.textContent = cliente.nome;
    clientDetails.textContent = `${cliente.email || "Sem email"} • ${cliente.telefone || "Sem telefone"}`;
    clientAvatar.textContent = cliente.nome.charAt(0).toUpperCase();

    clientInfo.style.display = "block";
  }
}

// Ocultar informações do cliente
function ocultarInfoCliente() {
  const clientInfo = document.getElementById("clientInfo");
  if (clientInfo) {
    clientInfo.style.display = "none";
  }
}

// Configurar cálculo automático de idade
function configurarCalculoIdade() {
  const dataNascimentoInput = document.getElementById("data_nascimento");
  const idadeInput = document.getElementById("idade");

  if (dataNascimentoInput && idadeInput) {
    // Interpreta data no formato DD/MM/YYYY
    dataNascimentoInput.addEventListener("change", function () {
      const raw = this.value;
      const parts = raw ? raw.split("/") : [];
      let parsedDate = null;

      if (parts.length === 3) {
        const dia = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10) - 1; // meses 0-11
        const ano = parseInt(parts[2], 10);
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
          parsedDate = new Date(ano, mes, dia);
        }
      }

      if (parsedDate && !isNaN(parsedDate)) {
        const idade = calcularIdadeFromDate(parsedDate);
        idadeInput.value = idade;
        console.log("📅 Idade calculada:", idade);
      } else {
        idadeInput.value = "";
      }
    });

    // Ao pressionar Enter dentro do campo de data: prevenir submit, calcular idade e preencher silenciosamente
    dataNascimentoInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();

        const raw = this.value;
        const parts = raw ? raw.split("/") : [];
        let parsedDate = null;

        if (parts.length === 3) {
          const dia = parseInt(parts[0], 10);
          const mes = parseInt(parts[1], 10) - 1;
          const ano = parseInt(parts[2], 10);
          if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
            parsedDate = new Date(ano, mes, dia);
          }
        }

        if (parsedDate && !isNaN(parsedDate)) {
          const idade = calcularIdadeFromDate(parsedDate);
          idadeInput.value = idade;
          console.log("📅 Idade calculada (Enter):", idade);
        } else {
          idadeInput.value = "";
        }
      }
    });
  }
}

// Calcular idade do pet (função local que recebe Date)
function calcularIdadeFromDate(dataNascimento) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);

  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  let dias = hoje.getDate() - nascimento.getDate();

  // Ajustar dias e meses quando necessário
  if (dias < 0) {
    // pegar o último dia do mês anterior
    const ultimoDiaMesAnterior = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      0,
    ).getDate();
    dias += ultimoDiaMesAnterior;
    meses--;
  }

  if (meses < 0) {
    anos--;
    meses += 12;
  }

  // Formatação da idade (anos, meses e dias)
  let partes = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mês" : "meses"}`);
  if (dias > 0 || partes.length === 0)
    partes.push(`${dias} ${dias === 1 ? "dia" : "dias"}`);

  let idadeStr = "";
  if (partes.length === 1) {
    idadeStr = partes[0];
  } else if (partes.length === 2) {
    idadeStr = partes[0] + " e " + partes[1];
  } else if (partes.length === 3) {
    idadeStr = partes[0] + ", " + partes[1] + " e " + partes[2];
  }

  // Se não houver anos, meses e dias, mostrar 'Recém-nascido'
  if (anos === 0 && meses === 0 && dias === 0) return "Recém-nascido";

  return idadeStr;
}

// Salvar pet
async function salvarPet() {
  try {
    console.log("💾 Iniciando salvamento do pet...");

    // Validar formulário
    if (!validarFormulario()) {
      return;
    }

    // Mostrar loading
    mostrarLoading(true);

    // Coletar dados do formulário
    const formData = coletarDadosFormulario();

    console.log("📋 Dados coletados:", formData);

    // Enviar para API: se estivermos editando, usar PUT em /api/pets/:id
    let response;
    if (editingPetId) {
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      response = await fetch(`${API_BASE}/api/pets/${editingPetId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    } else {
      const API_BASE =
        (window.__API_BASE__ && window.__API_BASE__.toString()) ||
        window.location.origin;
      response = await fetch(`${API_BASE}/api/pets`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      const detalhe = errorData.error ? ` (${errorData.error})` : "";
      throw new Error(
        (errorData.message || `Erro HTTP: ${response.status}`) + detalhe,
      );
    }

    const resultado = await response.json();
    console.log("✅ Pet salvo com sucesso:", resultado);

    // Mostrar sucesso
    mostrarSucesso();

    // Redirecionar após sucesso
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      // Priorizar cliente_id do formulário (formData) ou do resultado do servidor
      const formClienteId =
        typeof formData === "object" && formData.cliente_id
          ? formData.cliente_id
          : null;
      const resultClienteId =
        resultado && resultado.pet && resultado.pet.cliente_id
          ? resultado.pet.cliente_id
          : null;
      const clienteId =
        formClienteId || resultClienteId || urlParams.get("cliente_id");

      if (clienteId) {
        // Voltar para detalhes do cliente (cache-bust para garantir reload)
        const isInPetsFolder =
          window.location.pathname.indexOf("/pets/") !== -1;
        const clientDetailsPath = isInPetsFolder
          ? "../client-details.html"
          : "/client-details.html";
        window.location.href =
          clientDetailsPath + `?id=${clienteId}&_=${Date.now()}`;
      } else {
        // Se não veio de um cliente específico, ir para lista de pets
        const isInPetsFolder =
          window.location.pathname.indexOf("/pets/") !== -1;
        const listaPath = isInPetsFolder
          ? "lista-pets.html"
          : "/pets/lista-pets.html";
        // Usar origin somente quando o path for absoluto
        window.location.href = isInPetsFolder
          ? listaPath + "?_=" + Date.now()
          : window.location.origin + listaPath + "?_=" + Date.now();
      }
    }, 1200);
  } catch (error) {
    console.error("❌ Erro ao salvar pet:", error);
    mostrarErro(error.message || "Erro ao salvar pet");
  } finally {
    mostrarLoading(false);
  }
}

// Validar formulário
function validarFormulario() {
  let isValido = true;
  const camposObrigatorios = ["nome", "cliente"];

  camposObrigatorios.forEach((campo) => {
    const elemento = document.getElementById(campo);
    if (elemento && !validarCampoObrigatorio(elemento)) {
      isValido = false;
    }
  });

  if (!isValido) {
    mostrarErro("Preencha todos os campos obrigatórios");

    // Focar no primeiro campo inválido
    const primeiroInvalido = document.querySelector(
      'input[style*="border-color: rgb(220, 53, 69)"], select[style*="border-color: rgb(220, 53, 69)"]',
    );
    if (primeiroInvalido) {
      primeiroInvalido.focus();
    }
  }

  return isValido;
}

// Coletar dados do formulário
function coletarDadosFormulario() {
  // Buscar cada elemento com checagem para evitar leitura de .value em null
  const nomeEl = document.getElementById("nome");
  const clienteEl = document.getElementById("cliente");
  const racaEl = document.getElementById("raca");
  const generoEl = document.getElementById("genero");
  const porteEl = document.getElementById("porte");
  const pelagemEl = document.getElementById("pelagem");
  const dataNascimentoEl = document.getElementById("data_nascimento");
  const chipEl = document.getElementById("chip");
  const pedigreeEl = document.getElementById("pedigree_rg");
  const alimentacaoEl = document.getElementById("alimentacao");
  const tagsEl = document.getElementById("tags");
  const alergiasEl = document.getElementById("alergias");
  const observacaoEl = document.getElementById("observacao");

  const formData = {
    nome: nomeEl && nomeEl.value ? nomeEl.value.trim() : "",
    cliente_id: clienteEl && clienteEl.value ? parseInt(clienteEl.value) : null,
    raca: racaEl && racaEl.value ? racaEl.value.trim() : null,
    genero: generoEl && generoEl.value ? generoEl.value : null,
    porte: porteEl && porteEl.value ? porteEl.value : null,
    pelagem: pelagemEl && pelagemEl.value ? pelagemEl.value.trim() : null,
    data_nascimento:
      dataNascimentoEl && dataNascimentoEl.value
        ? dataNascimentoEl.value
        : null,
    chip: chipEl && chipEl.value ? chipEl.value.trim() : null,
    pedigree_rg:
      pedigreeEl && pedigreeEl.value ? pedigreeEl.value.trim() : null,
    alimentacao:
      alimentacaoEl && alimentacaoEl.value ? alimentacaoEl.value.trim() : null,
    // Preferir tags selecionadas pelo componente (selectedTags) quando disponível;
    // caso contrário, usar o valor do input #tags (texto livre)
    tags:
      typeof selectedTags !== "undefined" &&
      Array.isArray(selectedTags) &&
      selectedTags.length > 0
        ? JSON.stringify(selectedTags)
        : window.selectedTags &&
            Array.isArray(window.selectedTags) &&
            window.selectedTags.length > 0
          ? JSON.stringify(window.selectedTags)
          : tagsEl && tagsEl.value
            ? tagsEl.value.trim()
            : null,
    alergias: alergiasEl && alergiasEl.value ? alergiasEl.value.trim() : null,
    observacao:
      observacaoEl && observacaoEl.value ? observacaoEl.value.trim() : null,
  };

  // Remover campos vazios/null
  Object.keys(formData).forEach((key) => {
    if (formData[key] === null || formData[key] === "") {
      delete formData[key];
    }
  });

  return formData;
}

// Mostrar loading
function mostrarLoading(mostrar) {
  const loading = document.getElementById("loading");
  const form = document.getElementById("petForm");

  if (loading && form) {
    if (mostrar) {
      loading.style.display = "block";
      form.style.opacity = "0.5";
      form.style.pointerEvents = "none";
    } else {
      loading.style.display = "none";
      form.style.opacity = "1";
      form.style.pointerEvents = "auto";
    }
  }
}

// Mostrar mensagem de sucesso
function mostrarSucesso(mensagem = "Pet cadastrado com sucesso!") {
  const successMessage = document.getElementById("successMessage");
  if (successMessage) {
    successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${mensagem}`;
    successMessage.style.display = "block";

    // Ocultar outras mensagens
    ocultarErro();

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Ocultar após 5 segundos
    setTimeout(() => {
      successMessage.style.display = "none";
    }, 5000);
  }
}

// Mostrar mensagem de erro
function mostrarErro(mensagem) {
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  if (errorMessage && errorText) {
    errorText.textContent = mensagem;
    errorMessage.style.display = "block";

    // Ocultar outras mensagens
    ocultarSucesso();

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Ocultar após 10 segundos
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 10000);
  }
}

// Ocultar mensagem de sucesso
function ocultarSucesso() {
  const successMessage = document.getElementById("successMessage");
  if (successMessage) {
    successMessage.style.display = "none";
  }
}

// Ocultar mensagem de erro
function ocultarErro() {
  const errorMessage = document.getElementById("errorMessage");
  if (errorMessage) {
    errorMessage.style.display = "none";
  }
}

// Limpar formulário
function limparFormulario() {
  console.log("🧹 Limpando formulário...");

  const form = document.getElementById("petForm");
  if (form) {
    form.reset();

    // Limpar campos específicos
    document.getElementById("clienteId").value = "";
    document.getElementById("idade").value = "";

    // Ocultar info do cliente
    ocultarInfoCliente();

    // Resetar estilos de validação
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.style.borderColor = "#e9ecef";
      input.style.backgroundColor = "#fff";
    });

    // Focar no primeiro campo
    const nomeInput = document.getElementById("nome");
    if (nomeInput) {
      nomeInput.focus();
    }

    // Ocultar mensagens
    ocultarSucesso();
    ocultarErro();
  }
}

// Cancelar cadastro
function cancelarCadastro() {
  const urlParams = new URLSearchParams(window.location.search);
  const clienteId = urlParams.get("cliente_id");

  if (clienteId) {
    const isInPetsFolder = window.location.pathname.indexOf("/pets/") !== -1;
    const clientDetailsPath = isInPetsFolder
      ? "../client-details.html"
      : "/client-details.html";
    window.location.href = clientDetailsPath + `?id=${clienteId}`;
  } else {
    const isInPetsFolder = window.location.pathname.indexOf("/pets/") !== -1;
    const listaPath = isInPetsFolder
      ? "lista-pets.html"
      : "/pets/lista-pets.html";
    window.location.href = isInPetsFolder
      ? listaPath
      : window.location.origin + listaPath;
  }
}

// Funções de utilidade
function formatarTelefone(telefone) {
  if (!telefone) return "";
  const apenasNumeros = telefone.replace(/\D/g, "");
  if (apenasNumeros.length === 11) {
    return `(${apenasNumeros.substring(0, 2)}) ${apenasNumeros.substring(2, 7)}-${apenasNumeros.substring(7)}`;
  } else if (apenasNumeros.length === 10) {
    return `(${apenasNumeros.substring(0, 2)}) ${apenasNumeros.substring(2, 6)}-${apenasNumeros.substring(6)}`;
  }
  return telefone;
}

// Log de inicialização
console.log("✅ Sistema de cadastro de pets pronto!");

// ==========================
// Confirmação ao sair/alternar página (quando o formulário foi modificado)
// ==========================
let petFormModified = false;
// Guardar referrer antes de qualquer pushState
const _petPaginaAnterior = document.referrer;

function setupPetNavigationConfirmation() {
  try {
    const form = document.getElementById("petForm");
    if (!form) return;

    petFormModified = false;

    // Marcar modificado em input/change
    const fields = form.querySelectorAll("input, select, textarea");
    fields.forEach((f) => {
      f.addEventListener("input", () => {
        petFormModified = true;
      });
      f.addEventListener("change", () => {
        petFormModified = true;
      });
    });

    // Resetar flag quando o formulário for submetido com sucesso
    form.addEventListener("submit", () => {
      petFormModified = false;
    });

    // Empurrar estado no histórico para interceptar o botão "voltar"
    history.pushState({ petCadastro: true }, "");

    window.addEventListener("popstate", function onPopState(e) {
      if (!petFormModified) return; // se não modificou, sai normalmente
      // Repor o estado para manter o usuário na página
      history.pushState({ petCadastro: true }, "");
      showPetNavigationConfirmation(() => {
        petFormModified = false;
        window.removeEventListener("popstate", onPopState);
        _petSair();
      });
    });

    // Interceptar cliques em links (menu, submenus, botões de navegação)
    document.addEventListener(
      "click",
      function (e) {
        const link = e.target.closest("a[href]");
        if (!link) return;
        const href = link.getAttribute("href");
        if (!href) return;
        // ignorar âncoras internas
        if (
          href === "#" ||
          href.startsWith("javascript:") ||
          href.startsWith("#")
        )
          return;

        if (petFormModified) {
          e.preventDefault();
          showPetNavigationConfirmation(() => {
            // permitir navegação
            window.location.href = href;
          });
        }
      },
      true,
    );
  } catch (err) {
    console.error("Erro ao configurar confirmação de navegação (pet):", err);
  }
}

function _petSair() {
  // Redirecionar para a página anterior (referrer) ou fallback para meus-pets
  const destino = _petPaginaAnterior || "/pets/meus-pets.html";
  window.location.replace(destino);
}

function showPetNavigationConfirmation(onConfirm) {
  let modal = document.getElementById("petNavigationConfirmModal");
  if (!modal) modal = createPetNavigationModal();

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  const confirmBtn = modal.querySelector(".confirm-btn");
  const cancelBtn = modal.querySelector(".cancel-btn");

  // substituir listeners antigos
  const newConfirm = confirmBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  newConfirm.addEventListener("click", () => {
    hidePetNavigationModal();
    petFormModified = false;
    if (typeof onConfirm === "function") onConfirm();
  });

  newCancel.addEventListener("click", () => {
    hidePetNavigationModal();
  });
}

function hidePetNavigationModal() {
  const modal = document.getElementById("petNavigationConfirmModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
}

function createPetNavigationModal() {
  const modal = document.createElement("div");
  modal.id = "petNavigationConfirmModal";
  modal.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:99999;";

  modal.innerHTML = `
        <div style="background:white;padding:32px 28px 24px;border-radius:12px;max-width:440px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.22);text-align:center;">
            <div style="width:70px;height:70px;background:#ff6b6b;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                <i class="fas fa-exclamation-triangle" style="color:white;font-size:28px;"></i>
            </div>
            <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#222;">Deseja realmente sair?</h3>
            <p style="margin:0 0 6px;color:#555;font-size:14px;">Você deseja sair desta página?</p>
            <p style="margin:0 0 24px;color:#555;font-size:13px;font-weight:600;">Os dados preenchidos no formulário serão perdidos.</p>
            <div style="display:flex;gap:10px;justify-content:center;">
                <button class="cancel-btn" style="padding:10px 22px;border:2px solid #ddd;background:white;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">Cancelar</button>
                <button class="confirm-btn" style="padding:10px 22px;border:none;background:#ff6b6b;color:white;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Sair</button>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
  return modal;
}

// Registrar a configuração ao carregar o DOM
document.addEventListener("DOMContentLoaded", function () {
  try {
    setupPetNavigationConfirmation();
  } catch (e) {
    console.warn("setupPetNavigationConfirmation falhou:", e);
  }
});
