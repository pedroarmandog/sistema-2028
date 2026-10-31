// ========================================
// LOGIN JS - PET CRIA
// ========================================

// Função para exibir notificação
function showNotification(message, type = "error") {
  // Remover notificações existentes
  const existing = document.querySelector(".notification-toast");
  if (existing) {
    existing.remove();
  }

  // Criar notificação
  const notification = document.createElement("div");
  notification.className = `notification-toast notification-${type}`;
  notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${type === "error" ? "exclamation-circle" : "check-circle"}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  document.body.appendChild(notification);

  // Animação de entrada
  setTimeout(() => notification.classList.add("show"), 10);

  // Remover após 5 segundos
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Função para definir cookie
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

// Função para obter cookie
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Função para validar formulário
function validarFormulario() {
  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!usuario) {
    showNotification(
      "Por favor, preencha o nome de usuário ou e-mail.",
      "error",
    );
    return false;
  }

  if (!senha) {
    showNotification("Por favor, preencha a senha.", "error");
    return false;
  }

  return true;
}

// Função para fazer login
async function realizarLogin(usuario, senha) {
  try {
    console.log("Enviando requisição de login:", { usuario, senha: "***" });

    // Obter ou gerar identificador persistente do dispositivo
    let deviceId = null;
    try {
      deviceId = localStorage.getItem("pethub_device_id");
      if (!deviceId) {
        deviceId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36);
        localStorage.setItem("pethub_device_id", deviceId);
      }
    } catch (e) {}

    const _base = window.VPS_URL || window.API_URL || "";
    const response = await fetch(_base + "/api/usuarios/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // necessário para receber e enviar cookie JWT
      body: JSON.stringify({
        usuario: usuario,
        senha: senha,
        device_id: deviceId,
      }),
    });

    console.log("Resposta recebida:", response.status, response.statusText);

    // Verificar se a resposta tem conteúdo
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Resposta do servidor não é JSON");
    }

    const data = await response.json();
    console.log("Dados recebidos:", data);

    // Se empresa bloqueada, retornar com flag para o handler redirecionar
    if (data.bloqueado) {
      return data;
    }

    if (!response.ok) {
      throw new Error(data.mensagem || "Erro ao fazer login");
    }

    return data;
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
}

// Event listener do formulário
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value.trim();

    // Desabilitar botão durante o processo
    const btnLogin = document.querySelector(".btn-login");
    const textoOriginal = btnLogin.textContent;
    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    try {
      const resultado = await realizarLogin(usuario, senha);

      // Verificar se empresa está bloqueada
      if (resultado.bloqueado) {
        try {
          sessionStorage.setItem("empresa_bloqueada", "1");
        } catch (e) {}
        window.location.href = "/painel-admin/sistema-bloqueado.html";
        return;
      }

      // Login ok — limpar flag de bloqueio e cores antigas de outro usuário
      try {
        sessionStorage.removeItem("empresa_bloqueada");
      } catch (e) {}
      // Remover cores do localStorage para garantir que o novo login carregue do servidor
      try {
        localStorage.removeItem("systemColors");
      } catch (e) {}

      // Salvar informações nos cookies (não no localStorage)
      setCookie("usuarioLogadoId", resultado.id, 30);
      setCookie("usuarioLogadoNome", resultado.nome, 30);

      // Redirecionar para o dashboard (caminho público servido pelo backend)
      window.location.href = "/dashboard.html";
    } catch (error) {
      // Verificar se o erro é de empresa bloqueada (403)
      if (error.message && error.message.includes("bloqueado")) {
        window.location.href = "/painel-admin/sistema-bloqueado.html";
        return;
      }
      showNotification(
        error.message || "Erro ao fazer login. Verifique suas credenciais.",
        "error",
      );
      btnLogin.disabled = false;
      btnLogin.textContent = textoOriginal;
    }
  });

// Prevenir ataques XSS nos inputs
document.querySelectorAll(".form-input").forEach((input) => {
  input.addEventListener("input", function () {
    // Remove caracteres potencialmente perigosos
    this.value = this.value.replace(/[<>]/g, "");
  });
});
