const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const usuarioController = require("../controllers/usuarioController");
const rateLimit = require("../middleware/rateLimit");
const { authUser, JWT_SECRET } = require("../middleware/authUser");
const jwt = require("jsonwebtoken");
const {
  encerrarSessaoPorToken,
  atualizarAtividade,
  heartbeatSessao,
  SESSAO_TIMEOUT_MS,
} = require("../controllers/acessosController");

// Rota de login (limite por minuto, aplicada somente no login)
// Ajuste: windowMs=60000 (1 minuto), max=150 pedidos por minuto (configurável)
router.post(
  "/login",
  rateLimit({ windowMs: 60000, max: 150 }),
  usuarioController.login,
);

// Rota de heartbeat: chamada a cada 60s pelo frontend para manter a sessão viva.
// Atualiza ultima_atividade e verifica se a sessão não foi encerrada remotamente.
router.post("/heartbeat", async (req, res) => {
  const token =
    req.cookies?.pethub_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);
  const { device_id } = req.body || {};

  if (!token) {
    return res.json({ ativa: false, motivo: "sem_token" });
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.json({ ativa: false, motivo: "token_expirado" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await heartbeatSessao(device_id || null, tokenHash);
  return res.json(result);
});

// Rota legacy /sessao-ativa — mantida para compatibilidade com clientes antigos
router.get("/sessao-ativa", async (req, res) => {
  const token =
    req.cookies?.pethub_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    return res.json({ ativa: false, motivo: "sem_token" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const { SessaoAtiva } = require("../models");
    const INATIVIDADE_MAX_MS = SESSAO_TIMEOUT_MS;
    const registro = await SessaoAtiva.findOne({
      where: { token_hash: tokenHash },
      attributes: ["id", "ativo", "ultima_atividade"],
    });

    if (registro) {
      if (!registro.ativo) {
        return res.json({ ativa: false, motivo: "sessao_encerrada" });
      }
      // Verificar inatividade de 8h
      if (registro.ultima_atividade) {
        const inativoMs =
          Date.now() - new Date(registro.ultima_atividade).getTime();
        if (inativoMs > INATIVIDADE_MAX_MS) {
          try {
            await SessaoAtiva.update(
              { ativo: false },
              { where: { id: registro.id } },
            );
          } catch (e) {}
          return res.json({ ativa: false, motivo: "inatividade" });
        }
      }
      try {
        await atualizarAtividade(tokenHash);
      } catch (e) {}
      return res.json({ ativa: true });
    }

    // Nenhum registro no DB — pode ser sessão anterior ao rastreamento (JWT ainda válido)
    // Admin encerrar NUNCA apaga registros, só marca ativo=false — então ausência = sessão legítima
    try {
      jwt.verify(token, JWT_SECRET);
      return res.json({ ativa: true, motivo: "jwt_valid_no_db" });
    } catch (e) {
      return res.json({ ativa: false, motivo: "token_invalido" });
    }
  } catch (e) {
    return res.json({ ativa: true, motivo: "db_error" });
  }
});

// Rota de logout — limpa o cookie JWT e encerra a sessão do dispositivo
router.post("/logout", async (req, res) => {
  const token =
    req.cookies?.pethub_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);
  const { device_id } = req.body || {};

  if (token) {
    const { SessaoAtiva } = require("../models");

    // Encerrar sessão pelo device_id (identificador principal)
    if (device_id) {
      await SessaoAtiva.update(
        { ativo: false },
        { where: { device_id, ativo: true } },
      ).catch(() => {});
      console.log(
        `[logout] device_id=${device_id.substring(0, 8)} — sessão encerrada`,
      );
    } else {
      // Fallback: encerrar por userId (decode do JWT, não verificar assinatura)
      let userId = null;
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) userId = Number(decoded.id);
      } catch (_) {}

      if (userId) {
        const [qtd] = await SessaoAtiva.update(
          { ativo: false },
          { where: { usuario_id: userId, ativo: true } },
        ).catch(() => [0]);
        console.log(
          `[logout] usuario=${userId} — ${qtd} sessão(ões) encerrada(s)`,
        );
      } else {
        const tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");
        await encerrarSessaoPorToken(tokenHash);
      }
    }
  }

  const _logoutCookieDomain = process.env.COOKIE_DOMAIN || null;
  const _logoutCookieSecure = process.env.COOKIE_SECURE === "1";
  const _clearOpts = {
    path: "/",
    httpOnly: true,
    sameSite: process.env.COOKIE_SAMESITE || "Lax",
  };
  if (_logoutCookieDomain) _clearOpts.domain = _logoutCookieDomain;
  if (_logoutCookieSecure) _clearOpts.secure = true;
  res.clearCookie("pethub_token", _clearOpts);
  res.json({ mensagem: "Logout realizado com sucesso" });
});

// Rota de validação de senha
router.post("/validar-senha", usuarioController.validarSenha);

// Rotas de preferências do usuário autenticado
router.get("/preferencias", authUser, async (req, res) => {
  try {
    const { Usuario } = require("../models");
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: ["preferencias"],
    });
    return res.json(usuario?.preferencias || {});
  } catch (err) {
    console.error("[preferencias] Erro ao buscar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/preferencias", authUser, async (req, res) => {
  try {
    const { Usuario } = require("../models");
    await Usuario.update(
      { preferencias: req.body },
      { where: { id: req.user.id } },
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("[preferencias] Erro ao salvar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/usuarios/me — retorna dados do usuário autenticado (usado pelo PWA mobile)
router.get("/me", authUser, async (req, res) => {
  try {
    const { Usuario, Empresa } = require("../models");
    const u = await Usuario.findByPk(req.user.id, {
      attributes: ["id", "nome", "usuario", "grupoUsuario"],
    });
    if (!u) return res.status(404).json({ mensagem: "Usuário não encontrado" });

    let empresaNome = "";
    if (req.user.empresaId) {
      try {
        const emp = await Empresa.findByPk(req.user.empresaId, {
          attributes: ["nome"],
        });
        empresaNome = emp?.nome || "";
      } catch (_) {}
    }

    return res.json({
      id: u.id,
      nome: u.nome || u.usuario || "Usuário",
      empresaId: req.user.empresaId,
      grupoUsuario: req.user.grupoUsuario,
      empresaNome,
    });
  } catch (err) {
    console.error("[/me] Erro:", err.message);
    return res.status(500).json({ mensagem: "Erro interno" });
  }
});

// Rotas de usuários
router.get("/", authUser, usuarioController.listarUsuarios);
router.get("/:id", authUser, usuarioController.buscarUsuario);
router.post("/", usuarioController.criarUsuario);
router.put("/:id", usuarioController.atualizarUsuario);
router.delete("/:id", usuarioController.deletarUsuario);

module.exports = router;
