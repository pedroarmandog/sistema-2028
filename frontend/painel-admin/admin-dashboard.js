// ═══════════════════════════════════════
// ADMIN DASHBOARD JS - PetHub
// ═══════════════════════════════════════

// Usar sempre a URL da VPS (api-config.js define window.VPS_URL).
// Fallback para window.location.origin garante compatibilidade quando o painel
// é acessado diretamente pela mesma origem que o backend.
const API = (window.VPS_URL || window.location.origin) + "/api/admin";
let empresaSelecionada = null;

// ── Cookies ─────────────────────────
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0)
      return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// ── Auth ────────────────────────────
function getToken() {
  return getCookie("admin_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// Verificar autenticação
(function checkAuth() {
  if (!getToken()) {
    window.location.href = "/painel-admin/admin-login.html";
    return;
  }
  // Carregar nome do admin
  const nome = getCookie("admin_nome");
  if (nome) {
    document.getElementById("adminName").textContent = nome;
  }
  init();
})();

// ── Notificação ─────────────────────
function showNotification(message, type = "success") {
  const existing = document.querySelector(".notification-toast");
  if (existing) existing.remove();
  const iconMap = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
  };
  const el = document.createElement("div");
  el.className = `notification-toast notification-${type}`;
  el.innerHTML = `
        <div class="notif-icon"><i class="fas fa-${iconMap[type] || "info-circle"}"></i></div>
        <div class="notif-msg">${message}</div>
        <button class="notif-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// ── Formatar ────────────────────────
function formatarDinheiro(valor) {
  return parseFloat(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) return "-";
  const d = new Date(data + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatarCnpj(cnpj) {
  if (!cnpj) return "-";
  const c = cnpj.replace(/\D/g, "");
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

// ── Tabs ────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    this.classList.add("active");
    document.getElementById("tab-" + this.dataset.tab).classList.add("active");

    // Carregar dados da aba
    if (this.dataset.tab === "dashboard") carregarDashboard();
    if (this.dataset.tab === "empresas") carregarEmpresas();
    if (this.dataset.tab === "faturamento") carregarFaturamento();
    if (this.dataset.tab === "backup") carregarBackups();
    if (this.dataset.tab === "acessos") carregarAcessos();
  });
});

// ── Profile Dropdown ────────────────
document.getElementById("adminProfile").addEventListener("click", function (e) {
  e.stopPropagation();
  document.getElementById("profileDropdown").classList.toggle("show");
});
document.addEventListener("click", () => {
  document.getElementById("profileDropdown").classList.remove("show");
});
document.getElementById("btnLogout").addEventListener("click", function (e) {
  e.preventDefault();
  deleteCookie("admin_token");
  deleteCookie("admin_nome");
  deleteCookie("admin_id");
  window.location.href = "/painel-admin/admin-login.html";
});
document
  .getElementById("btnVerPerfil")
  .addEventListener("click", async function (e) {
    e.preventDefault();
    try {
      const resp = await fetch(`${API}/perfil`, { headers: authHeaders() });
      if (resp.status === 401) {
        logout();
        return;
      }
      const admin = await resp.json();
      showNotification(
        `${admin.nome} ${admin.sobrenome} — ${admin.email}`,
        "success",
      );
    } catch {
      showNotification("Erro ao carregar perfil", "error");
    }
  });

function logout() {
  deleteCookie("admin_token");
  deleteCookie("admin_nome");
  deleteCookie("admin_id");
  window.location.href = "/painel-admin/admin-login.html";
}

// ═══════ DASHBOARD ═══════
async function carregarDashboard() {
  try {
    const resp = await fetch(`${API}/dashboard`, { headers: authHeaders() });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();

    document.getElementById("totalEmpresas").textContent = data.total;
    document.getElementById("totalAtivas").textContent = data.ativas;
    document.getElementById("totalVencidas").textContent = data.vencidas;
    document.getElementById("totalBloqueadas").textContent = data.bloqueadas;
    document.getElementById("faturamentoMensal").textContent = formatarDinheiro(
      data.faturamento_mensal,
    );
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err);
  }

  // Tabela resumo
  try {
    const resp = await fetch(`${API}/empresas`, { headers: authHeaders() });
    if (resp.status === 401) return;
    const empresas = await resp.json();
    const tbody = document.getElementById("dashTableBody");
    tbody.innerHTML = "";

    if (!empresas.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:30px;">Nenhuma empresa cadastrada</td></tr>';
      return;
    }

    empresas.forEach((emp) => {
      const tr = document.createElement("tr");
      tr.addEventListener("click", () => abrirModalEmpresa(emp.id));
      tr.innerHTML = `
                <td><strong>${emp.nome_fantasia}</strong></td>
                <td>${formatarCnpj(emp.cnpj)}</td>
                <td><span class="status-badge status-${emp.status}">${emp.status}</span></td>
                <td>${formatarData(emp.data_vencimento)}</td>
                <td>${formatarDinheiro(emp.valor_mensalidade)}</td>
            `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar empresas resumo:", err);
  }
}

// ═══════ EMPRESAS ═══════
async function carregarEmpresas() {
  const busca = document.getElementById("buscaEmpresa").value.trim();
  const status = document.getElementById("filtroStatus").value;
  const ordenar = document.getElementById("filtroOrdem").value;

  const params = new URLSearchParams();
  if (busca) params.set("busca", busca);
  if (status) params.set("status", status);
  if (ordenar) params.set("ordenar", ordenar);

  try {
    const resp = await fetch(`${API}/empresas?${params}`, {
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const empresas = await resp.json();

    const tbody = document.getElementById("empresasTableBody");
    const empty = document.getElementById("empresasEmpty");
    tbody.innerHTML = "";

    if (!empresas.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    empresas.forEach((emp) => {
      const tr = document.createElement("tr");
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".btn-action")) return;
        abrirModalEmpresa(emp.id);
      });

      const hoje = new Date().toISOString().split("T")[0];
      const vencHoje =
        emp.data_vencimento === hoje
          ? ' <span style="color:#d97706;font-weight:600;">(Vence hoje!)</span>'
          : "";

      tr.innerHTML = `
                <td><strong>${emp.nome_fantasia}</strong></td>
                <td>${formatarCnpj(emp.cnpj)}</td>
                <td>${formatarData(emp.data_adesao)}</td>
                <td><span class="status-badge status-${emp.status}">${emp.status}</span></td>
                <td>${formatarData(emp.data_vencimento)}${vencHoje}</td>
                <td>${formatarDinheiro(emp.valor_mensalidade)}</td>
                <td>
                  <button class="btn-action impersonar" data-id="${emp.id}" data-nome="${emp.nome_fantasia}" title="Acessar como Admin"><i class="fas fa-user-shield"></i></button>
                  ${emp.status !== "ATIVO" ? `<button class="btn-action reativar" data-id="${emp.id}" title="Reativar"><i class="fas fa-play"></i></button>` : ""}
                  ${emp.status !== "BLOQUEADO" ? `<button class="btn-action bloquear" data-id="${emp.id}" title="Bloquear"><i class="fas fa-ban"></i></button>` : ""}
                  <button class="btn-action excluir" data-id="${emp.id}" title="Excluir"><i class="fas fa-times"></i></button>
                </td>
            `;
      tbody.appendChild(tr);
    });

    // Eventos dos botões de ação inline
    document.querySelectorAll(".btn-action.impersonar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalImpersonar(btn.dataset.id, btn.dataset.nome);
      });
    });
    document.querySelectorAll(".btn-action.reativar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        reativarEmpresa(btn.dataset.id);
      });
    });
    document.querySelectorAll(".btn-action.bloquear").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        bloquearEmpresa(btn.dataset.id);
      });
    });
    document.querySelectorAll(".btn-action.excluir").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalExcluirEmpresa(btn.dataset.id);
      });
    });
  } catch (err) {
    console.error("Erro ao carregar empresas:", err);
  }
}

// Filtros
document
  .getElementById("buscaEmpresa")
  .addEventListener("input", debounce(carregarEmpresas, 400));
document
  .getElementById("filtroStatus")
  .addEventListener("change", carregarEmpresas);
document
  .getElementById("filtroOrdem")
  .addEventListener("change", carregarEmpresas);

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ═══════ MODAL EMPRESA ═══════
async function abrirModalEmpresa(id) {
  try {
    const resp = await fetch(`${API}/empresas/${id}`, {
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const emp = await resp.json();
    empresaSelecionada = emp;

    document.getElementById("modalNome").textContent = emp.nome_fantasia;
    document.getElementById("modalCnpj").textContent = formatarCnpj(emp.cnpj);
    document.getElementById("modalCep").textContent = emp.cep || "-";
    document.getElementById("modalEndereco").textContent = emp.endereco || "-";
    document.getElementById("modalEmail").textContent = emp.email || "-";
    document.getElementById("modalTelefone").textContent = emp.telefone || "-";
    document.getElementById("modalAdesao").textContent = formatarData(
      emp.data_adesao,
    );
    document.getElementById("modalVencimento").textContent = formatarData(
      emp.data_vencimento,
    );
    document.getElementById("modalMensalidade").textContent = formatarDinheiro(
      emp.valor_mensalidade,
    );

    // Status
    const statusEl = document.getElementById("modalStatus");
    statusEl.textContent = emp.status;
    statusEl.className = `modal-status status-badge status-${emp.status}`;

    // Foto
    const fotoEl = document.getElementById("modalFoto");
    if (emp.foto) {
      fotoEl.innerHTML = `<img src="${emp.foto}" alt="${emp.nome_fantasia}">`;
    } else {
      fotoEl.innerHTML = '<i class="fas fa-building"></i>';
    }

    // Pagamentos
    const pagContainer = document.getElementById("modalPagamentosBody");
    if (emp.pagamentos && emp.pagamentos.length) {
      pagContainer.innerHTML = emp.pagamentos
        .map(
          (p) => `
                <div class="pag-item">
                    <span class="pag-data">${formatarData(p.data_pagamento)}</span>
                    <span>${p.observacao || "-"}</span>
                    <span class="pag-valor">${formatarDinheiro(p.valor)}</span>
                </div>
            `,
        )
        .join("");
    } else {
      pagContainer.innerHTML =
        '<p style="color:#aaa;font-size:13px;text-align:center;">Nenhum pagamento registrado</p>';
    }

    document.getElementById("modalEmpresa").classList.add("show");
  } catch (err) {
    showNotification("Erro ao carregar detalhes", "error");
  }
}

// Fechar modal
document.getElementById("modalClose").addEventListener("click", () => {
  document.getElementById("modalEmpresa").classList.remove("show");
});
document.getElementById("modalEmpresa").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("show");
});

// ═══════ MODAL EXCLUIR EMPRESA ═══════
function abrirModalExcluirEmpresa(id) {
  empresaSelecionada = { id: Number(id) };
  const modal = document.getElementById("modalExcluirEmpresa");
  const usuarioInput = document.getElementById("excluirUsuario");
  // preencher usuário com o nome do admin logado para conveniência
  const adminNome = getCookie("admin_nome") || "";
  usuarioInput.value = adminNome;
  document.getElementById("excluirSenha").value = "";
  modal.removeAttribute("inert");
  modal.classList.add("show");
  document.getElementById("excluirSenha").focus();
}

function fecharModalExcluirEmpresa() {
  const modal = document.getElementById("modalExcluirEmpresa");
  modal.classList.remove("show");
  modal.setAttribute("inert", "");
}

document.getElementById("btnCancelarExcluir").addEventListener("click", () => {
  fecharModalExcluirEmpresa();
});

document
  .getElementById("btnConfirmExcluir")
  .addEventListener("click", async () => {
    const modal = document.getElementById("modalExcluirEmpresa");
    const usuario = document.getElementById("excluirUsuario").value.trim();
    const senha = document.getElementById("excluirSenha").value;
    if (!senha) {
      showNotification("Digite a senha do admin para confirmar", "error");
      return;
    }
    try {
      const resp = await fetch(`${API}/empresas/${empresaSelecionada.id}`, {
        method: "DELETE",
        headers: Object.assign({}, authHeaders(), {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ usuario, senha }),
      });
      if (resp.status === 401) {
        logout();
        return;
      }
      const data = await resp.json();
      if (resp.ok) {
        showNotification(
          data.message || "Empresa excluída com sucesso",
          "success",
        );
        fecharModalExcluirEmpresa();
        refreshAll();
      } else {
        showNotification(data.error || "Erro ao excluir empresa", "error");
      }
    } catch (e) {
      showNotification("Erro de conexão", "error");
    }
  });

// ═══════ MODAL IMPERSONAR EMPRESA ═══════
function abrirModalImpersonar(id, nome) {
  empresaSelecionada = { id: Number(id) };
  const modal = document.getElementById("modalImpersonarEmpresa");
  const usuarioInput = document.getElementById("impersonarUsuario");
  const nomeEl = document.getElementById("impersonarEmpresaNome");
  nomeEl.textContent = nome || "";
  const adminNome = getCookie("admin_nome") || "";
  usuarioInput.value = adminNome;
  document.getElementById("impersonarSenha").value = "";
  modal.removeAttribute("inert");
  modal.classList.add("show");
  document.getElementById("impersonarSenha").focus();
}

function fecharModalImpersonar() {
  const modal = document.getElementById("modalImpersonarEmpresa");
  modal.classList.remove("show");
  modal.setAttribute("inert", "");
}

document
  .getElementById("btnCancelarImpersonar")
  .addEventListener("click", () => {
    fecharModalImpersonar();
  });
document
  .getElementById("modalImpersonarEmpresa")
  .addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fecharModalImpersonar();
  });

document
  .getElementById("btnConfirmImpersonar")
  .addEventListener("click", async () => {
    const modal = document.getElementById("modalImpersonarEmpresa");
    const usuario = document.getElementById("impersonarUsuario").value.trim();
    const senha = document.getElementById("impersonarSenha").value;
    const btn = document.getElementById("btnConfirmImpersonar");

    if (!senha) {
      showNotification("Digite a senha do admin para confirmar", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

    try {
      const resp = await fetch(
        `${API}/empresas/${empresaSelecionada.id}/impersonate`,
        {
          method: "POST",
          headers: Object.assign({}, authHeaders(), {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ usuario, senha }),
        },
      );
      if (resp.status === 401) {
        logout();
        return;
      }
      const data = await resp.json();
      if (resp.ok && data.impersonateUrl) {
        showNotification(`Acessando ${data.empresa}...`, "success");
        fecharModalImpersonar();
        // Abrir em nova aba com o token de uso único
        window.open(data.impersonateUrl, "_blank");
      } else {
        showNotification(data.error || "Erro ao acessar empresa", "error");
      }
    } catch (e) {
      showNotification("Erro de conexão", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Acessar Empresa';
    }
  });

// ===== Confirmação customizada (substitui confirm()) =====
function showConfirm(message, title = "Confirmação") {
  return new Promise((resolve) => {
    const modal = document.getElementById("modalConfirm");
    const msgEl = document.getElementById("confirmMessage");
    const titleEl = document.getElementById("confirmTitle");
    const okBtn = document.getElementById("confirmOk");
    const cancelBtn = document.getElementById("confirmCancel");

    if (!modal || !okBtn || !cancelBtn || !msgEl) return resolve(false);

    msgEl.textContent = message;
    titleEl.textContent = title;
    modal.removeAttribute("inert");
    modal.classList.add("show");

    function cleanup() {
      modal.classList.remove("show");
      modal.setAttribute("inert", "");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKey);
    }

    function onOk() {
      cleanup();
      resolve(true);
    }
    function onCancel() {
      cleanup();
      resolve(false);
    }
    function onKey(e) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onOk();
    }
    function onOverlayClick(e) {
      if (e.target === modal) onCancel();
    }

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);
    modal.addEventListener("click", onOverlayClick);

    // foco no botão OK para acessibilidade
    setTimeout(() => okBtn.focus(), 50);
  });
}

// Botões do modal
document.getElementById("btnReativar").addEventListener("click", async () => {
  if (!empresaSelecionada) return;
  await reativarEmpresa(empresaSelecionada.id);
  document.getElementById("modalEmpresa").classList.remove("show");
});

document.getElementById("btnBloquear").addEventListener("click", async () => {
  if (!empresaSelecionada) return;
  await bloquearEmpresa(empresaSelecionada.id);
  document.getElementById("modalEmpresa").classList.remove("show");
});

document.getElementById("btnPagamento").addEventListener("click", async () => {
  if (!empresaSelecionada) return;
  await registrarPagamento(empresaSelecionada.id);
  document.getElementById("modalEmpresa").classList.remove("show");
});

// ═══════ AÇÕES ═══════
async function reativarEmpresa(id) {
  const ok = await showConfirm(
    "Reativar esta empresa? Uma nova data de vencimento será definida (30 dias).",
  );
  if (!ok) return;
  try {
    const resp = await fetch(`${API}/empresas/${id}/reativar`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();
    if (resp.ok) {
      showNotification("Empresa reativada com sucesso!", "success");
      refreshAll();
    } else {
      showNotification(data.error || "Erro ao reativar", "error");
    }
  } catch {
    showNotification("Erro de conexão", "error");
  }
}

async function bloquearEmpresa(id) {
  const ok = await showConfirm(
    "Bloquear esta empresa? O sistema dela ficará inacessível.",
  );
  if (!ok) return;
  try {
    const resp = await fetch(`${API}/empresas/${id}/bloquear`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();
    if (resp.ok) {
      showNotification("Empresa bloqueada", "warning");
      refreshAll();
    } else {
      showNotification(data.error || "Erro ao bloquear", "error");
    }
  } catch {
    showNotification("Erro de conexão", "error");
  }
}

async function registrarPagamento(id) {
  const ok = await showConfirm("Registrar pagamento para esta empresa?");
  if (!ok) return;
  try {
    const resp = await fetch(`${API}/empresas/${id}/pagamento`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();
    if (resp.ok) {
      showNotification("Pagamento registrado com sucesso!", "success");
      refreshAll();
    } else {
      showNotification(data.error || "Erro ao registrar pagamento", "error");
    }
  } catch {
    showNotification("Erro de conexão", "error");
  }
}

// ═══════ ADICIONAR EMPRESA (COMPLETO) ═══════
document.getElementById("btnNovaEmpresa").addEventListener("click", () => {
  document.getElementById("formNovaEmpresa").reset();
  document.getElementById("logoPreview").style.display = "none";
  document.getElementById("uploadPlaceholder").style.display = "flex";
  // Data de início = hoje
  document.getElementById("novaDataInicio").value = new Date()
    .toISOString()
    .split("T")[0];
  calcularProximaCobranca();
  document.getElementById("modalNovaEmpresa").classList.add("show");
});
document.getElementById("modalNovaClose").addEventListener("click", () => {
  document.getElementById("modalNovaEmpresa").classList.remove("show");
});
document.getElementById("btnCancelarNova").addEventListener("click", () => {
  document.getElementById("modalNovaEmpresa").classList.remove("show");
});
document.getElementById("modalNovaEmpresa").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("show");
});

// Toggle senha
document
  .getElementById("toggleNovaSenha")
  .addEventListener("click", function () {
    const input = document.getElementById("novaUsuarioSenha");
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });

// Upload de logo
const uploadArea = document.getElementById("uploadArea");
const logoInput = document.getElementById("novaLogo");
const logoPreview = document.getElementById("logoPreview");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");

uploadArea.addEventListener("click", () => logoInput.click());
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});
uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("drag-over");
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  if (e.dataTransfer.files.length) {
    logoInput.files = e.dataTransfer.files;
    mostrarPreviewLogo(e.dataTransfer.files[0]);
  }
});
logoInput.addEventListener("change", (e) => {
  if (e.target.files.length) {
    mostrarPreviewLogo(e.target.files[0]);
  }
});

function mostrarPreviewLogo(file) {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    logoPreview.src = e.target.result;
    logoPreview.style.display = "block";
    uploadPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// Cálculo automático da próxima cobrança
function calcularProximaCobranca() {
  const dataInicio = document.getElementById("novaDataInicio").value;
  const intervalo = parseInt(
    document.getElementById("novaIntervaloDias").value,
    10,
  );
  if (dataInicio && intervalo > 0) {
    const d = new Date(dataInicio + "T00:00:00");
    d.setDate(d.getDate() + intervalo);
    document.getElementById("novaProximaCobranca").value =
      d.toLocaleDateString("pt-BR");
  } else {
    document.getElementById("novaProximaCobranca").value = "";
  }
  // Hint do intervalo
  const hint = document.getElementById("intervaloHint");
  if (intervalo === 1) hint.textContent = "Cobrança diária";
  else if (intervalo === 7) hint.textContent = "Cobrança semanal";
  else if (intervalo === 15) hint.textContent = "Cobrança quinzenal";
  else if (intervalo === 30)
    hint.textContent = "Cobrança mensal (a cada 30 dias)";
  else if (intervalo === 60) hint.textContent = "Cobrança bimestral";
  else if (intervalo === 90) hint.textContent = "Cobrança trimestral";
  else if (intervalo > 0)
    hint.textContent = `Cobrança a cada ${intervalo} dias`;
  else hint.textContent = "";
}

document
  .getElementById("novaDataInicio")
  .addEventListener("change", calcularProximaCobranca);
document
  .getElementById("novaIntervaloDias")
  .addEventListener("input", calcularProximaCobranca);

// Máscara CNPJ
document.getElementById("novaCnpj").addEventListener("input", function (e) {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 14) v = v.slice(0, 14);
  v = v.replace(/(\d{2})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1/$2");
  v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  e.target.value = v;
});

document.getElementById("novaCep").addEventListener("input", function (e) {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  v = v.replace(/(\d{5})(\d)/, "$1-$2");
  e.target.value = v;
});

document.getElementById("novaTelefone").addEventListener("input", function (e) {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  v = v.replace(/(\d{2})(\d)/, "($1) $2");
  v = v.replace(/(\d{5})(\d)/, "$1-$2");
  e.target.value = v;
});

// Submissão via FormData (suporte a upload)
document
  .getElementById("formNovaEmpresa")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = document.getElementById("btnSalvarEmpresa");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';

    const formData = new FormData();
    formData.append(
      "razao_social",
      document.getElementById("novaRazaoSocial").value.trim(),
    );
    formData.append(
      "nome_fantasia",
      document.getElementById("novaNome").value.trim(),
    );
    formData.append("cnpj", document.getElementById("novaCnpj").value.trim());
    formData.append("cep", document.getElementById("novaCep").value.trim());
    formData.append(
      "endereco",
      document.getElementById("novaEndereco").value.trim(),
    );
    formData.append("email", document.getElementById("novaEmail").value.trim());
    formData.append(
      "telefone",
      document.getElementById("novaTelefone").value.trim(),
    );
    formData.append(
      "valor_mensalidade",
      document.getElementById("novaValor").value,
    );
    formData.append(
      "data_inicio",
      document.getElementById("novaDataInicio").value,
    );
    formData.append(
      "intervalo_dias",
      document.getElementById("novaIntervaloDias").value,
    );
    formData.append(
      "usuario_nome",
      document.getElementById("novaUsuarioNome").value.trim(),
    );
    formData.append(
      "usuario_email",
      document.getElementById("novaUsuarioEmail").value.trim(),
    );
    formData.append(
      "usuario_senha",
      document.getElementById("novaUsuarioSenha").value,
    );

    const logoFile = document.getElementById("novaLogo").files[0];
    if (logoFile) {
      formData.append("logo", logoFile);
    }

    try {
      const resp = await fetch(`${API}/empresas/completa`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (resp.status === 401) {
        logout();
        return;
      }
      const data = await resp.json();

      if (resp.ok) {
        showNotification("Empresa e usuário criados com sucesso!", "success");
        document.getElementById("modalNovaEmpresa").classList.remove("show");
        refreshAll();
      } else {
        showNotification(data.error || "Erro ao criar empresa", "error");
      }
    } catch {
      showNotification("Erro de conexão", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Cadastrar Empresa';
    }
  });

// ═══════ FATURAMENTO ═══════
async function carregarFaturamento() {
  try {
    const resp = await fetch(`${API}/faturamento`, { headers: authHeaders() });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();

    document.getElementById("fatTotalMensal").textContent = formatarDinheiro(
      data.totalMensal,
    );

    // Tabela empresas
    const tbody = document.getElementById("fatEmpresasBody");
    tbody.innerHTML = "";
    if (data.empresas && data.empresas.length) {
      data.empresas.forEach((emp) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td><strong>${emp.nome_fantasia}</strong></td>
                    <td>${formatarCnpj(emp.cnpj)}</td>
                    <td>${formatarDinheiro(emp.valor_mensalidade)}</td>
                    <td>${formatarData(emp.data_vencimento)}</td>
                `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:30px;">Nenhuma empresa ativa</td></tr>';
    }

    // Histórico
    const histBody = document.getElementById("fatHistoricoBody");
    const histEmpty = document.getElementById("fatHistoricoEmpty");
    histBody.innerHTML = "";

    if (data.pagamentos && data.pagamentos.length) {
      histEmpty.style.display = "none";
      data.pagamentos.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${formatarData(p.data_pagamento)}</td>
                    <td>${p.empresa ? p.empresa.nome_fantasia : "-"}</td>
                    <td>${formatarDinheiro(p.valor)}</td>
                    <td><span class="status-badge status-ATIVO">${p.status}</span></td>
                    <td>${p.observacao || "-"}</td>
                `;
        histBody.appendChild(tr);
      });
    } else {
      histEmpty.style.display = "block";
    }
  } catch (err) {
    console.error("Erro ao carregar faturamento:", err);
  }
}

// ═══════ REFRESH ═══════
function refreshAll() {
  const activeTab = document.querySelector(".tab-btn.active");
  if (!activeTab) return;
  const tab = activeTab.dataset.tab;
  if (tab === "dashboard") carregarDashboard();
  if (tab === "empresas") carregarEmpresas();
  if (tab === "faturamento") carregarFaturamento();
  if (tab === "backup") carregarBackups();
  if (tab === "acessos") carregarAcessos();
}

// ═══════ BACKUP ═══════
let backupRestaurarEmpresa = null;
let backupRestaurarData = null;

async function carregarBackups() {
  try {
    const resp = await fetch(`${API}/backups`, { headers: authHeaders() });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();

    // Cards resumo
    const comBackup = data.filter((e) => e.total_backups > 0).length;
    document.getElementById("backupTotalEmpresas").textContent = comBackup;

    // Última data de backup
    let ultimaData = null;
    for (const emp of data) {
      if (emp.ultimo_backup) {
        if (!ultimaData || emp.ultimo_backup > ultimaData) {
          ultimaData = emp.ultimo_backup;
        }
      }
    }
    document.getElementById("backupUltimaData").textContent = ultimaData
      ? formatarData(ultimaData)
      : "Nenhum";

    // Tabela
    const tbody = document.getElementById("backupEmpresasBody");
    const empty = document.getElementById("backupEmpty");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    data.forEach((item) => {
      const tr = document.createElement("tr");

      // Montar opções do calendário (datas disponíveis)
      let selectHtml =
        '<select class="backup-date-select" data-empresa-id="' +
        item.empresa.id +
        '" data-empresa-nome="' +
        item.empresa.nome +
        '">';
      selectHtml += '<option value="">Selecionar data...</option>';
      if (item.backups && item.backups.length > 0) {
        item.backups.forEach((b) => {
          const dataFormatada = formatarData(b.data_referencia);
          const statusTag = b.status === "RESTAURADO" ? " (restaurado)" : "";
          selectHtml += `<option value="${b.data_referencia}">${dataFormatada}${statusTag} — ${b.registros_totais} reg.</option>`;
        });
      }
      selectHtml += "</select>";

      const btnRestaurar =
        item.backups && item.backups.length > 0
          ? `<button class="btn-restaurar-backup" data-empresa-id="${item.empresa.id}" data-empresa-nome="${item.empresa.nome}"><i class="fas fa-undo-alt"></i> Restaurar</button>`
          : '<span style="color:#aaa;font-size:12px;">Sem backups</span>';

      tr.innerHTML = `
        <td><strong>${item.empresa.nome}</strong></td>
        <td><span class="status-badge status-${item.empresa.status}">${item.empresa.status}</span></td>
        <td>${item.ultimo_backup ? formatarData(item.ultimo_backup) : '<span style="color:#aaa">—</span>'}</td>
        <td>${item.total_backups} backup${item.total_backups !== 1 ? "s" : ""}</td>
        <td>
          <div class="backup-restore-group">
            ${selectHtml}
            ${btnRestaurar}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Event listeners dos botões restaurar
    document.querySelectorAll(".btn-restaurar-backup").forEach((btn) => {
      btn.addEventListener("click", () => {
        const empresaId = btn.dataset.empresaId;
        const empresaNome = btn.dataset.empresaNome;
        const select = btn.closest("td").querySelector(".backup-date-select");
        const dataSelecionada = select ? select.value : "";

        if (!dataSelecionada) {
          showNotification("Selecione uma data de backup primeiro", "warning");
          return;
        }

        abrirModalRestaurar(empresaId, empresaNome, dataSelecionada);
      });
    });
  } catch (err) {
    console.error("Erro ao carregar backups:", err);
  }
}

function abrirModalRestaurar(empresaId, empresaNome, dataReferencia) {
  backupRestaurarEmpresa = { id: Number(empresaId), nome: empresaNome };
  backupRestaurarData = dataReferencia;

  const modal = document.getElementById("modalRestaurarBackup");
  document.getElementById("restaurarEmpresaNome").textContent = empresaNome;
  document.getElementById("restaurarDataInfo").textContent =
    "Restaurar para: " + formatarData(dataReferencia);
  const usuarioInput = document.getElementById("restaurarUsuario");
  const adminNome = getCookie("admin_nome") || "";
  usuarioInput.value = adminNome;
  document.getElementById("restaurarSenha").value = "";
  modal.removeAttribute("inert");
  modal.classList.add("show");
  document.getElementById("restaurarSenha").focus();
}

function fecharModalRestaurar() {
  const modal = document.getElementById("modalRestaurarBackup");
  modal.classList.remove("show");
  modal.setAttribute("inert", "");
}

document
  .getElementById("btnCancelarRestaurar")
  .addEventListener("click", () => {
    fecharModalRestaurar();
  });
document
  .getElementById("modalRestaurarBackup")
  .addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fecharModalRestaurar();
  });

document
  .getElementById("btnConfirmRestaurar")
  .addEventListener("click", async () => {
    const modal = document.getElementById("modalRestaurarBackup");
    const usuario = document.getElementById("restaurarUsuario").value.trim();
    const senha = document.getElementById("restaurarSenha").value;
    const btn = document.getElementById("btnConfirmRestaurar");

    if (!senha) {
      showNotification("Digite a senha do admin para confirmar", "error");
      return;
    }

    if (!backupRestaurarEmpresa || !backupRestaurarData) {
      showNotification("Dados inválidos para restauração", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restaurando...';

    try {
      const resp = await fetch(
        `${API}/backups/${backupRestaurarEmpresa.id}/restaurar`,
        {
          method: "POST",
          headers: Object.assign({}, authHeaders(), {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            usuario,
            senha,
            data_referencia: backupRestaurarData,
          }),
        },
      );
      if (resp.status === 401) {
        logout();
        return;
      }
      const data = await resp.json();
      if (resp.ok) {
        showNotification(
          data.message ||
            `Backup restaurado com sucesso para ${backupRestaurarEmpresa.nome}`,
          "success",
        );
        fecharModalRestaurar();
        carregarBackups();
      } else {
        showNotification(data.error || "Erro ao restaurar backup", "error");
      }
    } catch (e) {
      showNotification("Erro de conexão", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-undo-alt"></i> Restaurar Backup';
    }
  });

// Botão executar backup manual
document
  .getElementById("btnExecutarBackup")
  .addEventListener("click", async () => {
    const btn = document.getElementById("btnExecutarBackup");
    const ok = await showConfirm(
      "Executar backup de todas as empresas agora?",
      "Executar Backup",
    );
    if (!ok) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executando...';

    try {
      const resp = await fetch(`${API}/backups/executar`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (resp.status === 401) {
        logout();
        return;
      }
      const data = await resp.json();
      if (resp.ok) {
        showNotification(
          data.message || "Backup executado com sucesso!",
          "success",
        );
        carregarBackups();
      } else {
        showNotification(data.error || "Erro ao executar backup", "error");
      }
    } catch (e) {
      showNotification("Erro de conexão", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-play"></i> Executar Backup Agora';
    }
  });

// ═══════ INIT ═══════
async function init() {
  carregarDashboard();
}

// ═══════ ACESSOS SIMULTÂNEOS ═══════
let acessosEmpresaSelecionada = null;
let acessosLimiteTemp = 3;

// Auto-refresh da tabela principal de Acessos (a cada 15s quando a aba estiver ativa).
// Garante que a limpeza de sessões expiradas no backend reflita na tela sem intervenção manual.
setInterval(() => {
  const acessosTab = document.getElementById("tab-acessos");
  if (acessosTab && acessosTab.classList.contains("active")) {
    carregarAcessos();
  }
}, 15000);

async function carregarAcessos() {
  try {
    const resp = await fetch(`${API}/acessos`, { headers: authHeaders() });
    if (resp.status === 401) {
      logout();
      return;
    }
    const empresas = await resp.json();

    const tbody = document.getElementById("acessosTableBody");
    const empty = document.getElementById("acessosEmpty");
    tbody.innerHTML = "";

    // Cards resumo
    document.getElementById("acessosTotalEmpresas").textContent =
      empresas.length;
    const totalAtivos = empresas.reduce((s, e) => s + e.acessos_em_uso, 0);
    document.getElementById("acessosTotalAtivos").textContent = totalAtivos;
    const noLimite = empresas.filter(
      (e) => e.acessos_em_uso >= e.limite_acessos && e.acessos_em_uso > 0,
    ).length;
    document.getElementById("acessosNoLimite").textContent = noLimite;

    if (!empresas.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    empresas.forEach((emp) => {
      const tr = document.createElement("tr");
      const disponivel = Math.max(0, emp.limite_acessos - emp.acessos_em_uso);
      const percentual =
        emp.limite_acessos > 0
          ? (emp.acessos_em_uso / emp.limite_acessos) * 100
          : 0;
      let barClass = "acessos-bar-ok";
      if (percentual >= 100) barClass = "acessos-bar-full";
      else if (percentual >= 70) barClass = "acessos-bar-warn";

      tr.innerHTML = `
        <td><strong>${emp.nome_fantasia}</strong></td>
        <td>${formatarCnpj(emp.cnpj)}</td>
        <td><span class="status-badge status-${emp.status}">${emp.status}</span></td>
        <td><strong>${emp.limite_acessos}</strong></td>
        <td>
          <div class="acessos-mini-bar-wrapper">
            <span class="acessos-uso-num">${emp.acessos_em_uso}</span>
            <div class="acessos-mini-bar">
              <div class="acessos-mini-bar-fill ${barClass}" style="width: ${Math.min(percentual, 100)}%"></div>
            </div>
          </div>
        </td>
        <td><span class="acessos-disponivel-badge ${disponivel === 0 ? "acessos-sem-vaga" : ""}">${disponivel}</span></td>
        <td>
          <button class="btn-action btn-acessos-detalhe" data-id="${emp.id}" title="Gerenciar acessos">
            <i class="fas fa-cog"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Eventos
    document.querySelectorAll(".btn-acessos-detalhe").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalAcessos(btn.dataset.id);
      });
    });
  } catch (err) {
    console.error("Erro ao carregar acessos:", err);
  }
}

async function abrirModalAcessos(empresaId) {
  try {
    const resp = await fetch(`${API}/acessos/${empresaId}`, {
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();
    acessosEmpresaSelecionada = data;
    acessosLimiteTemp = data.empresa.limite_acessos;

    // Preencher modal
    document.getElementById("acessosModalNome").textContent =
      data.empresa.nome_fantasia;
    const statusEl = document.getElementById("acessosModalStatus");
    statusEl.textContent = data.empresa.status;
    statusEl.className = `modal-status status-badge status-${data.empresa.status}`;

    atualizarModalAcessos(data);
    document.getElementById("modalAcessos").classList.add("show");
    _iniciarPollingAcessos(empresaId); // atualiza sessões automaticamente a cada 8s
  } catch (err) {
    showNotification("Erro ao carregar detalhes de acessos", "error");
  }
}

function atualizarModalAcessos(data) {
  const limite = acessosLimiteTemp;
  const emUso = data.acessos_em_uso;
  const disponivel = Math.max(0, limite - emUso);
  const percentual = limite > 0 ? (emUso / limite) * 100 : 0;

  document.getElementById("acessosModalLimite").textContent = limite;
  document.getElementById("acessosModalEmUso").textContent = emUso;
  document.getElementById("acessosModalDisponivel").textContent = disponivel;

  // Barra de progresso
  const barFill = document.getElementById("acessosBarraFill");
  barFill.style.width = Math.min(percentual, 100) + "%";
  barFill.className = "acessos-barra-fill";
  if (percentual >= 100) barFill.classList.add("barra-full");
  else if (percentual >= 70) barFill.classList.add("barra-warn");
  document.getElementById("acessosBarraTexto").textContent =
    `${emUso} / ${limite} acessos`;

  // Sessões
  const container = document.getElementById("acessosSessoesBody");
  if (data.sessoes && data.sessoes.length > 0) {
    container.innerHTML = data.sessoes
      .map(
        (s) => `
      <div class="sessao-item">
        <div class="sessao-info">
          <div class="sessao-usuario"><i class="fas fa-user"></i> ${s.usuario_nome} <span class="sessao-login">(${s.usuario_login})</span></div>
          <div class="sessao-detalhes">
            <span><i class="fas fa-clock"></i> ${formatarDataHora(s.data_login)}</span>
            <span><i class="fas fa-wifi"></i> ${s.ip_address || "-"}</span>
          </div>
        </div>
        <button class="btn-danger btn-sm btn-encerrar-sessao" data-sessao-id="${s.id}" title="Encerrar sessão">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `,
      )
      .join("");

    container.querySelectorAll(".btn-encerrar-sessao").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await encerrarSessao(btn.dataset.sessaoId);
      });
    });
  } else {
    container.innerHTML =
      '<p style="color:#aaa;text-align:center;padding:20px;">Nenhuma sessão ativa</p>';
  }
}

function formatarDataHora(data) {
  if (!data) return "-";
  const d = new Date(data);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Ajuste de limite
document.getElementById("btnLimiteMenos").addEventListener("click", () => {
  if (acessosLimiteTemp > 1) {
    acessosLimiteTemp--;
    document.getElementById("acessosModalLimite").textContent =
      acessosLimiteTemp;
    if (acessosEmpresaSelecionada) {
      atualizarModalAcessos(acessosEmpresaSelecionada);
    }
  }
});

document.getElementById("btnLimiteMais").addEventListener("click", () => {
  if (acessosLimiteTemp < 100) {
    acessosLimiteTemp++;
    document.getElementById("acessosModalLimite").textContent =
      acessosLimiteTemp;
    if (acessosEmpresaSelecionada) {
      atualizarModalAcessos(acessosEmpresaSelecionada);
    }
  }
});

// Salvar limite
document
  .getElementById("btnSalvarLimite")
  .addEventListener("click", async () => {
    if (!acessosEmpresaSelecionada) return;
    const btn = document.getElementById("btnSalvarLimite");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
      const resp = await fetch(
        `${API}/acessos/${acessosEmpresaSelecionada.empresa.id}/limite`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ limite_acessos: acessosLimiteTemp }),
        },
      );
      if (resp.status === 401) {
        logout();
        return;
      }
      const data = await resp.json();
      if (resp.ok) {
        showNotification("Limite atualizado com sucesso!", "success");
        acessosEmpresaSelecionada.empresa.limite_acessos = acessosLimiteTemp;
        carregarAcessos();
      } else {
        showNotification(data.error || "Erro ao salvar limite", "error");
      }
    } catch {
      showNotification("Erro de conexão", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Salvar Limite';
    }
  });

// Encerrar sessão individual
async function encerrarSessao(sessaoId) {
  try {
    const resp = await fetch(`${API}/acessos/sessao/${sessaoId}/encerrar`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    if (resp.ok) {
      showNotification("Sessão encerrada", "success");
      // Recarregar modal
      if (acessosEmpresaSelecionada) {
        abrirModalAcessos(acessosEmpresaSelecionada.empresa.id);
      }
      carregarAcessos();
    } else {
      const data = await resp.json();
      showNotification(data.error || "Erro ao encerrar sessão", "error");
    }
  } catch {
    showNotification("Erro de conexão", "error");
  }
}

// Encerrar todas as sessões
document
  .getElementById("btnEncerrarTodas")
  .addEventListener("click", async () => {
    if (!acessosEmpresaSelecionada) return;
    const ok = await showConfirm(
      `Encerrar TODAS as sessões ativas de ${acessosEmpresaSelecionada.empresa.nome_fantasia}?`,
      "Encerrar Sessões",
    );
    if (!ok) return;

    try {
      const resp = await fetch(
        `${API}/acessos/${acessosEmpresaSelecionada.empresa.id}/encerrar-todas`,
        {
          method: "POST",
          headers: authHeaders(),
        },
      );
      if (resp.status === 401) {
        logout();
        return;
      }
      if (resp.ok) {
        showNotification("Todas as sessões foram encerradas", "success");
        abrirModalAcessos(acessosEmpresaSelecionada.empresa.id);
        carregarAcessos();
      } else {
        const data = await resp.json();
        showNotification(data.error || "Erro ao encerrar sessões", "error");
      }
    } catch {
      showNotification("Erro de conexão", "error");
    }
  });

// Fechar modal acessos
document.getElementById("modalAcessosClose").addEventListener("click", () => {
  document.getElementById("modalAcessos").classList.remove("show");
  _pararPollingAcessos();
});
document.getElementById("modalAcessos").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove("show");
    _pararPollingAcessos();
  }
});

// ── Polling automático do modal de acessos ──────────────────────────────────
// Recarrega os dados das sessões a cada 8s enquanto o modal estiver aberto.
// Isso garante que o admin veja sessões desaparecendo em tempo real após logout.
let _acessosPollingTimer = null;

function _iniciarPollingAcessos(empresaId) {
  _pararPollingAcessos(); // garantir que não há timer duplicado
  _acessosPollingTimer = setInterval(async () => {
    const modal = document.getElementById("modalAcessos");
    if (!modal || !modal.classList.contains("show")) {
      _pararPollingAcessos();
      return;
    }
    try {
      const resp = await fetch(`${API}/acessos/${empresaId}`, {
        headers: authHeaders(),
      });
      if (resp.ok) {
        const data = await resp.json();
        acessosEmpresaSelecionada = data;
        acessosLimiteTemp = data.empresa.limite_acessos;
        atualizarModalAcessos(data);
      }
    } catch (_) {}
  }, 3000);
}

function _pararPollingAcessos() {
  if (_acessosPollingTimer) {
    clearInterval(_acessosPollingTimer);
    _acessosPollingTimer = null;
  }
}
