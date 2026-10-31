const jwt = require("jsonwebtoken");

// Chave secreta para JWT — via variável de ambiente (com fallback para não crashar o servidor)
const JWT_SECRET = process.env.JWT_SECRET || "pethub_admin_secret_2026_!@#$%";
if (!process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET não definido no .env — usando valor padrão (definir em produção!)");
}
const JWT_EXPIRES_IN = "24h";

// Token para acesso à página de cadastro de admin
const CADASTRO_TOKEN = process.env.CADASTRO_TOKEN;

// Middleware de autenticação para rotas do painel admin
async function authAdmin(req, res, next) {
  // Exigir envio do token via Authorization Bearer quando CONFIG ativada.
  // Por compatibilidade, ainda aceitamos cookie `admin_token` quando
  // REQUIRE_AUTH_HEADER !== "1".
  // Tornar obrigatório por padrão; para manter compatibilidade, setar REQUIRE_AUTH_HEADER=0
  const REQUIRE_HEADER = process.env.REQUIRE_AUTH_HEADER !== "0";
  const authHeader = req.headers.authorization;
  let token = null;
  let tokenSource = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
    tokenSource = "header";
  } else if (!REQUIRE_HEADER && req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
    tokenSource = "cookie";
  }

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verificar se o admin existe e está ativo no banco
    try {
      const { Admin } = require("../models");
      const adminRec = await Admin.findByPk(decoded.id, {
        attributes: ["id", "ativo", "email"],
      });
      if (!adminRec || !adminRec.ativo) {
        return res.status(401).json({ error: "Admin inválido ou desativado" });
      }
      req.adminId = adminRec.id;
      req.adminEmail = adminRec.email || decoded.email;
    } catch (e) {
      // Em caso de erro ao acessar DB, falhar a autenticação
      console.error("[authAdmin] erro ao validar admin no DB:", e && e.message);
      return res.status(401).json({ error: "Erro na validação do token" });
    }

    try {
      console.log(
        `[authAdmin] token validado via ${tokenSource || "header"} adminId=${req.adminId}`,
      );
    } catch (_) {}

    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// Middleware para validar token de cadastro
function validarTokenCadastro(req, res, next) {
  const token = req.query.token || req.body.token;
  if (!token || token !== CADASTRO_TOKEN) {
    return res
      .status(403)
      .json({ error: "Acesso negado. Token de cadastro inválido." });
  }
  next();
}

// Gerar token JWT
function gerarToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, nome: admin.nome },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

module.exports = {
  authAdmin,
  validarTokenCadastro,
  gerarToken,
  JWT_SECRET,
  CADASTRO_TOKEN,
};
