// ==========================================
// USER PROFILE DROPDOWN - COMPONENTE GLOBAL
// ==========================================

(function () {
  "use strict";

  console.log("🔧 User Profile Dropdown: Script carregado");

  // Evitar múltiplas inicializações
  if (window.__userProfileDropdownInitialized) {
    console.log("⚠️ User Profile Dropdown: Já inicializado");
    return;
  }
  window.__userProfileDropdownInitialized = true;

  // Injetar CSS do dropdown
  const style = document.createElement("style");
  style.id = "user-profile-dropdown-styles";
  style.textContent = `
        .user-menu {
            position: relative;
            cursor: pointer;
            user-select: none;
        }

        .user-profile-dropdown {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            min-width: 280px;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
        }

        .user-profile-dropdown.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .user-profile-dropdown::before {
            content: '';
            position: absolute;
            top: -6px;
            right: 20px;
            width: 12px;
            height: 12px;
            background: white;
            transform: rotate(45deg);
        }

        .user-profile-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            text-align: center;
        }

        .user-profile-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 600;
            margin: 0 auto 12px;
        }

        .user-profile-name {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }

        .user-profile-company {
            font-size: 13px;
            color: #6b7280;
        }

        .user-profile-section {
            padding: 8px 0;
        }

        .user-profile-section-title {
            padding: 8px 20px;
            font-size: 11px;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .user-profile-item {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            color: #374151;
            text-decoration: none;
            transition: background 0.15s ease;
            cursor: pointer;
        }

        .user-profile-item:hover {
            background: #f3f4f6;
        }

        .user-profile-item i {
            width: 20px;
            margin-right: 12px;
            color: #6b7280;
            font-size: 14px;
        }

        .user-profile-item span {
            font-size: 14px;
            font-weight: 500;
        }

        .user-profile-divider {
            height: 1px;
            background: #e5e7eb;
            margin: 8px 0;
        }

        .user-profile-item.logout {
            color: #dc2626;
        }

        .user-profile-item.logout i {
            color: #dc2626;
        }

        .user-profile-item.logout:hover {
            background: #fee2e2;
        }

        /* Modal de confirmação de logout */
        .logout-modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        }

        .logout-modal-overlay.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logout-modal {
            background: white;
            border-radius: 12px;
            padding: 0;
            width: 90%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            overflow: hidden;
        }

        .logout-modal-header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }

        .logout-modal-icon {
            width: 64px;
            height: 64px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
        }

        .logout-modal-icon i {
            font-size: 32px;
            color: white;
        }

        .logout-modal-header h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .logout-modal-body {
            padding: 32px 24px;
            text-align: center;
        }

        .logout-modal-body p {
            margin: 0;
            font-size: 16px;
            color: #64748b;
            line-height: 1.6;
        }

        .logout-modal-footer {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .logout-modal-btn {
            padding: 12px 32px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 120px;
        }

        .logout-modal-btn-cancel {
            background: white;
            color: #64748b;
            border: 2px solid #e2e8f0;
        }

        .logout-modal-btn-cancel:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            transform: translateY(-1px);
        }

        .logout-modal-btn-confirm {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .logout-modal-btn-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
  document.head.appendChild(style);

  // Criar HTML do dropdown
  function createDropdownHTML() {
    return `
            <div class="user-profile-dropdown" id="userProfileDropdown">
                <div class="user-profile-header">
                    <div class="user-profile-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-profile-name">Nenhuma empresa cadastrada</div>
                    <div class="user-profile-company">Pedro</div>
                </div>

                <div class="user-profile-section">
                    <a href="#" class="user-profile-item" data-action="switch-company">
                        <i class="fas fa-building"></i>
                        <span>Acessar outra empresa</span>
                    </a>
                </div>

                <div class="user-profile-divider"></div>

                <div class="user-profile-section">
                    <div class="user-profile-section-title">Configurações Pessoais</div>
                    <a href="#" class="user-profile-item" data-action="my-profile">
                        <i class="fas fa-user-circle"></i>
                        <span>Meu perfil</span>
                    </a>
                </div>

                <div class="user-profile-divider"></div>

                <div class="user-profile-section">
                    <div class="user-profile-section-title">Administração</div>
                    <a href="#" class="user-profile-item" data-action="billing">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <span>Cobrança</span>
                    </a>
                </div>

                <div class="user-profile-divider"></div>

                <div class="user-profile-section">
                    <a href="#" class="user-profile-item" data-action="about">
                        <i class="fas fa-info-circle"></i>
                        <span>Sobre</span>
                    </a>
                    <a href="#" class="user-profile-item logout" data-action="logout">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Sair</span>
                    </a>
                </div>
            </div>
        `;
  }

  // Inicializar dropdown
  function initUserProfileDropdown() {
    console.log("🚀 User Profile Dropdown: Inicializando...");

    // Encontrar todos os elementos .user-menu
    const userMenus = document.querySelectorAll(".user-menu");
    console.log(
      `📊 User Profile Dropdown: Encontrados ${userMenus.length} elementos .user-menu`,
    );

    userMenus.forEach((userMenu, index) => {
      console.log(`🎯 Processando user-menu ${index + 1}...`);

      // Verificar se já foi inicializado
      if (userMenu.hasAttribute("data-dropdown-initialized")) {
        console.log(`⏭️ User-menu ${index + 1} já inicializado`);
        return;
      }
      userMenu.setAttribute("data-dropdown-initialized", "true");

      // Adicionar dropdown HTML
      userMenu.insertAdjacentHTML("beforeend", createDropdownHTML());
      console.log(`✅ Dropdown HTML adicionado ao user-menu ${index + 1}`);

      const dropdown = userMenu.querySelector(".user-profile-dropdown");
      console.log(`🔍 Dropdown encontrado:`, !!dropdown);

      // Toggle dropdown ao clicar no user-menu
      userMenu.addEventListener("click", function (e) {
        console.log("👆 Clique no user-menu detectado!");
        e.stopPropagation();

        // Fechar outros dropdowns abertos
        document
          .querySelectorAll(".user-profile-dropdown.active")
          .forEach((d) => {
            if (d !== dropdown) d.classList.remove("active");
          });

        const isActive = dropdown.classList.toggle("active");
        console.log(`🎬 Dropdown ${isActive ? "ABERTO" : "FECHADO"}`);
      });

      // Ações do dropdown
      dropdown.addEventListener("click", function (e) {
        const item = e.target.closest(".user-profile-item");
        if (!item) return;

        e.preventDefault();
        e.stopPropagation();

        const action = item.getAttribute("data-action");
        handleDropdownAction(action);

        // Fechar dropdown após ação
        dropdown.classList.remove("active");
      });
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".user-menu")) {
        document
          .querySelectorAll(".user-profile-dropdown.active")
          .forEach((d) => {
            d.classList.remove("active");
          });
      }
    });
  }

  // Função para mostrar modal de logout
  function showLogoutModal() {
    // Criar modal se não existir
    let modal = document.getElementById("logoutModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "logoutModal";
      modal.className = "logout-modal-overlay";
      modal.innerHTML = `
                <div class="logout-modal">
                    <div class="logout-modal-header">
                        <div class="logout-modal-icon">
                            <i class="fas fa-sign-out-alt"></i>
                        </div>
                        <h3>Confirmar Saída</h3>
                    </div>
                    <div class="logout-modal-body">
                        <p>Tem certeza que deseja sair do sistema?</p>
                    </div>
                    <div class="logout-modal-footer">
                        <button class="logout-modal-btn logout-modal-btn-cancel" onclick="closeLogoutModal()">
                            Não
                        </button>
                        <button class="logout-modal-btn logout-modal-btn-confirm" onclick="confirmLogout()">
                            Sim, sair
                        </button>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);

      // Fechar ao clicar no overlay
      modal.addEventListener("click", function (e) {
        if (e.target === modal) {
          closeLogoutModal();
        }
      });

      // Fechar com ESC
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.classList.contains("active")) {
          closeLogoutModal();
        }
      });
    }

    // Mostrar modal
    modal.classList.add("active");
  }

  // Funções globais para os botões do modal
  window.closeLogoutModal = function () {
    const modal = document.getElementById("logoutModal");
    if (modal) {
      modal.classList.remove("active");
    }
  };

  window.confirmLogout = async function () {
    // Encerrar sessão no backend antes de redirecionar
    try {
      const _base = window.VPS_URL || window.API_URL || "";
      await fetch(_base + "/api/usuarios/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // Ignorar erro de rede — prosseguir com logout local
    }
    // Limpar cores personalizadas do cache local ao sair
    try { localStorage.removeItem("systemColors"); } catch (e) {}
    // Limpar cookies de sessão
    document.cookie =
      "usuarioLogadoId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    document.cookie =
      "usuarioLogadoNome=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    window.location.href = "/login/login.html";
  };

  // Manipular ações do dropdown
  function handleDropdownAction(action) {
    switch (action) {
      case "switch-company":
        console.log("Acessar outra empresa");
        alert('Funcionalidade "Acessar outra empresa" em desenvolvimento');
        break;

      case "my-profile":
        console.log("Meu perfil");
        alert('Funcionalidade "Meu perfil" em desenvolvimento');
        break;

      case "billing":
        console.log("Cobrança");
        alert('Funcionalidade "Cobrança" em desenvolvimento');
        break;

      case "about":
        console.log("Sobre");
        alert("Sistema PetHub - Versão 1.0.0");
        break;

      case "logout":
        console.log("Sair");
        showLogoutModal();
        break;
    }
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === "loading") {
    console.log("⏳ Aguardando DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", initUserProfileDropdown);
  } else {
    console.log("✅ DOM já carregado, inicializando imediatamente...");
    initUserProfileDropdown();
  }

  // Reinicializar após AJAX/mudanças dinâmicas (opcional)
  window.reinitUserProfileDropdown = initUserProfileDropdown;

  console.log("✅ User Profile Dropdown: Script configurado com sucesso");
})();
