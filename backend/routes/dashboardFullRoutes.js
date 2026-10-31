const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const agendamentoController = require("../controllers/agendamentoController");
const acessosController = require("../controllers/acessosController");
const { authUser, JWT_SECRET } = require("../middleware/authUser");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Proteger a rota com authUser (mesmo comportamento das rotas do dashboard)
router.use(authUser);

// Helper: chama um controller que escreve no res.json e captura o resultado
function callControllerJson(fn, req) {
  return new Promise((resolve) => {
    let resolved = false;
    let statusCode = 200;
    const fakeRes = {
      status(code) {
        statusCode = code;
        return fakeRes;
      },
      json(body) {
        if (!resolved) {
          resolved = true;
          resolve({ status: statusCode, body });
        }
      },
      send(body) {
        if (!resolved) {
          resolved = true;
          resolve({ status: statusCode, body });
        }
      },
      end() {
        if (!resolved) {
          resolved = true;
          resolve({ status: statusCode, body: null });
        }
      },
    };

    try {
      const result = fn(req, fakeRes);
      // Em caso de função async que não chamou res.json (defensivo), garantir resolução
      if (result && typeof result.then === "function") {
        result
          .then(() => {
            if (!resolved) resolve({ status: statusCode, body: null });
          })
          .catch((e) => {
            if (!resolved) resolve({ status: 500, body: { error: e.message } });
          });
      } else {
        // aguardar pequena defasagem para o controller invocar fakeRes
        setTimeout(() => {
          if (!resolved) resolve({ status: statusCode, body: null });
        }, 20);
      }
    } catch (e) {
      if (!resolved) resolve({ status: 500, body: { error: e.message } });
    }
  });
}

// GET / -> agregador que chama controllers existentes em paralelo
router.get("/", async (req, res) => {
  try {
    // Reutilizar req (inclui req.user, query, cookies)
    const vendasP = callControllerJson(dashboardController.vendasHoje, req);
    const agendamentosP = callControllerJson(
      agendamentoController.getAgendamentos,
      req,
    );

    // Sessão ativa: usar req.user populado pelo middleware authUser
    const sessaoP = (async () => {
      if (!req.user)
        return { status: 200, body: { ativa: false, motivo: "sem_usuario" } };
      
      // Extrair token do cookie para verificar sessão no banco
      const token = req.cookies?.pethub_token || null;
      if (!token)
        return { status: 200, body: { ativa: false, motivo: "sem_token" } };
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      try {
        const ativa = await acessosController.verificarSessaoAtiva(tokenHash);
        if (ativa) {
          try {
            await acessosController.atualizarAtividade(tokenHash);
          } catch (_) {}
          return { status: 200, body: { ativa: true, motivo: null } };
        }
        // se não encontrou sessão no DB, verificar JWT
        try {
          jwt.verify(token, JWT_SECRET);
          return {
            status: 200,
            body: { ativa: true, motivo: "jwt_valid_no_db" },
          };
        } catch (e) {
          return {
            status: 200,
            body: { ativa: false, motivo: "sessao_encerrada" },
          };
        }
      } catch (e) {
        return { status: 200, body: { ativa: false, motivo: "erro" } };
      }
    })();

    const [vendasRes, agendamentosRes, sessaoRes] = await Promise.all([
      vendasP,
      agendamentosP,
      sessaoP,
    ]);

    const out = {
      vendasHoje: vendasRes && vendasRes.body ? vendasRes.body : null,
      agendamentos:
        agendamentosRes && agendamentosRes.body ? agendamentosRes.body : null,
      sessao: sessaoRes && sessaoRes.body ? sessaoRes.body : null,
      outros: {},
    };

    res.json(out);
  } catch (err) {
    console.error(
      "[dashboard/full] erro ao agregar dados:",
      err && err.message,
    );
    res
      .status(500)
      .json({
        erro: "Erro ao agregar dashboard",
        mensagem: err && err.message,
      });
  }
});

module.exports = router;
