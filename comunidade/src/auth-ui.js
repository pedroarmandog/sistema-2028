import { api, setCSRF } from "./api.js";
import { esc, icon, asset, modal, toast } from "./ui.js";
let pendingToken = "",
  email = "";
export function welcome(error = "", onDone = () => {}) {
  const app = document.getElementById("app"),
    hash = location.hash.replace(/^#\/?/, "").split("?"),
    route = hash[0],
    params = new URLSearchParams(hash[1]);
  if (params.get("token")) {
    pendingToken = params.get("token");
    window.history.replaceState(
      null,
      "",
      location.pathname + location.search + "#/" + route,
    );
  }
  const mode =
    {
      "criar-conta": "register",
      recuperar: "forgot",
      redefinir: "reset",
      confirmar: "verify",
      reenviar: "resend",
      "atualizar-conta": "upgrade",
    }[route] || "login";
  const headings = {
    login: ["Que bom ter você aqui.", "Entre com sua conta da Comunidade."],
    register: [
      "Toda amizade começa com um olá.",
      "Crie sua conta gratuita. Você não precisa de um pet shop nem de um pet para participar.",
    ],
    forgot: [
      "Vamos recuperar seu acesso.",
      "Enviaremos um link para redefinir sua senha.",
    ],
    reset: [
      "Um novo começo.",
      "Escolha sua nova senha. O link é válido por uma hora e só pode ser usado uma vez.",
    ],
    verify: [
      "Só falta confirmar seu e-mail.",
      "Confirme abaixo para começar novas conexões.",
    ],
    resend: [
      "Seu convite para novas amizades.",
      "Reenvie o link de confirmação para seu e-mail.",
    ],
    upgrade: [
      "Sua história continua aqui.",
      "Sua conta anterior será preservada. Defina o e-mail e a senha independentes da Comunidade.",
    ],
  };
  const field = (label, name, type = "text", extra = "") =>
    `<label>${label}<input name="${name}" type="${type}" required ${extra}></label>`;
  let fields = "";
  if (mode === "register")
    fields +=
      field("Seu nome", "name", "text", 'maxlength="80" autocomplete="name"') +
      field(
        "Seu @usuário",
        "handle",
        "text",
        'pattern="[a-z0-9_]{3,30}" maxlength="30" placeholder="ex.: ana_e_seus_pets"',
      );
  if (["login", "register", "forgot", "resend", "upgrade"].includes(mode))
    fields += field(
      "E-mail",
      "email",
      "email",
      `autocomplete="email" value="${esc(email)}"`,
    );
  if (["login", "register", "reset", "upgrade"].includes(mode))
    fields += field(
      "Senha",
      "senha",
      "password",
      `autocomplete="${mode === "login" ? "current-password" : "new-password"}" ${mode === "login" ? "" : 'minlength="10"'} maxlength="72"`,
    );
  if (["register", "reset", "upgrade"].includes(mode))
    fields += field(
      "Confirme a senha",
      "confirmacao",
      "password",
      'minlength="10" maxlength="72" autocomplete="new-password"',
    );
  if (["register", "upgrade"].includes(mode))
    fields +=
      '<label class="checkbox"><input type="checkbox" name="adult" required>Tenho 18 anos ou mais.</label><label class="checkbox"><input type="checkbox" name="terms" required>Li e aceito os termos e a política de privacidade da Comunidade.</label>';
  app.innerHTML = `<main class="welcome"><section class="welcome-art"><img src="${asset("welcome.webp")}" alt="Um cachorro e um gato juntos no jardim"><div class="art-label">Uma comunidade.<br>Infinitas histórias.</div><span class="art-chip">${icon("heart", 18)} Um mundo de novas conexões.</span></section><section class="welcome-copy"><a class="brand" href="#/entrar"><span class="brand-mark">${icon("lamp", 24)}</span><span>PetHub<small>COMUNIDADE</small></span></a><p class="eyebrow">GRATUITA · ABERTA A NOVAS AMIZADES</p><h1>Quem ama pets tem um lugar aqui<span>.</span></h1><nav class="auth-tabs"><a href="#/entrar" class="${mode === "login" ? "active" : ""}">Entrar</a><a href="#/criar-conta" class="${mode === "register" ? "active" : ""}">Criar conta</a></nav><form id="login"><h2>${headings[mode][0]}</h2><p>${headings[mode][1]}</p>${fields}<p class="form-error" role="alert">${esc(error)}</p><button class="primary">${{ login: "Entrar na Comunidade", register: "Criar minha conta", forgot: "Enviar recuperação", reset: "Salvar nova senha", verify: "Confirmar meu e-mail", resend: "Reenviar confirmação", upgrade: "Atualizar minha conta" }[mode]} ${icon("arrow")}</button><p class="auth-feedback" role="status"></p></form><div class="auth-links"><a href="#/recuperar">Esqueci minha senha</a><a href="#/reenviar">Reenviar confirmação</a></div><div class="welcome-foot">Sua conta é independente. Não há código de loja nem aprovação manual.<br><button class="text-button" id="principles">Termos, regras e privacidade</button></div></section></main>`;
  app.querySelector("#principles").onclick = async () => {
    let rules =
      "Respeite pessoas e animais. Compartilhe apenas conteúdo com autorização.";
    try {
      rules = (await api("/public-config")).rules;
    } catch {}
    modal(
      `<h2>Um espaço de confiança</h2><p>${esc(rules)}</p><p>Seus dados de login são privados. Os campos de perfil que você escolher publicar podem ser vistos por outros participantes. Você pode controlar a audiência de posts, bloquear contas, denunciar conteúdos, exportar dados e solicitar exclusão.</p><p>Os cadastros e pets da Comunidade são independentes do ERP. Acesso restrito a maiores de 18 anos. Consulte a política completa publicada pela plataforma para contato, retenção e atendimento de privacidade.</p>`,
    );
  };
  app.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target,
      b = f.querySelector("button");
    b.disabled = true;
    f.querySelector(".form-error").textContent = "";
    try {
      const body = Object.fromEntries(new FormData(f));
      if (body.email) email = body.email;
      body.terms = body.terms === "on";
      body.adult = body.adult === "on";
      if (["verify", "reset"].includes(mode)) body.token = pendingToken;
      if (mode === "upgrade") {
        const legacy = await api("/auth/legacy");
        setCSRF(legacy.csrf);
      }
      const result = await api(mode === "login" ? "/login" : "/auth/" + mode, {
        method: "POST",
        body,
      });
      if (mode === "login") {
        await onDone();
        return;
      }
      f.querySelector(".auth-feedback").textContent =
        result.message || "Solicitação concluída.";
      if (["register", "verify", "reset", "upgrade"].includes(mode)) {
        f.querySelectorAll("input").forEach((i) => (i.disabled = true));
        b.hidden = true;
        const a = document.createElement("a");
        a.className = "secondary";
        a.href =
          mode === "register" || mode === "upgrade" ? "#/reenviar" : "#/entrar";
        a.textContent =
          mode === "register" || mode === "upgrade"
            ? "Reenviar confirmação"
            : "Ir para o login";
        f.append(a);
      }
    } catch (err) {
      f.querySelector(".form-error").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}
