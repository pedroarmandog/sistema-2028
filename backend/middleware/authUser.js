const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET =
  process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";
const JWT_EXPIRES_IN = "30d"; // JWT de longa duração — a validade real é controlada por ultima_atividade no DB (30 dias de inatividade)

// Tempo máximo de inatividade de sessão — fonte única em acessosController
const { SESSAO_TIMEOUT_MS } = require("../controllers/acessosController");

// Cache simples em memória para usuários e status de empresa
const USER_CACHE = new Map(); // key: userId -> { user, expiresAt }
const USER_CACHE_TTL = Number(process.env.USER_CACHE_TTL_MS) || 10 * 1000; // 10s default (reduzido de 60s para garantir sincronização)

const EMPRESA_BLOCKED_CACHE = new Map(); // key: empresaId -> { blocked, expiresAt }
const EMPRESA_CACHE_TTL =
  Number(process.env.EMPRESA_CACHE_TTL_MS) || 10 * 1000; // 10s default (reduzido de 5min para garantir bloqueio/desbloqueio imediato)

/** Exportado para permitir invalidação externa (ex: ao bloquear/reativar pelo painel) */
function invalidateEmpresaCache(empresaId) {
  if (empresaId != null) {
    EMPRESA_BLOCKED_CACHE.delete(String(empresaId));
    console.log(`[authUser] Cache de empresa ${empresaId} invalidado manualmente`);
  }
}

/**
 * Verifica se a empresa do usuário está BLOQUEADA ou VENCIDA na tabela empresas_painel.
 * Retorna true se bloqueada/vencida, false caso contrário.
 * CORREÇÃO CRÍTICA: Se CNPJ não estiver cadastrado na tabela empresas_painel,
 * faz fallback para o campo `ativa` da tabela empresas (bloqueio manual pelo sistema).
 * Também verifica vencimento em tempo real (não depende apenas do cron).
 */
async function isEmpresaBloqueada(empresaId) {
  if (!empresaId) return false;
  try {
    const { Empresa, EmpresaPainel, sequelize } = require("../models");
    
    // Buscar empresa do sistema e seu CNPJ
    const empresa = await Empresa.findByPk(empresaId, { attributes: ["cnpj", "ativa", "ativo"] });
    if (!empresa) return false;

    // Se a empresa tem os campos ativa/ativo como false, já bloqueia direto
    if (empresa.ativa === false || empresa.ativo === false) {
      console.log(`[authUser] isEmpresaBloqueada: empresa ${empresaId} bloqueada via campos ativa/ativo`);
      return true;
    }

    // Verificar na tabela empresas_painel pelo CNPJ
    if (empresa.cnpj) {
      const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
      if (cnpjLimpo) {
        const painel = await EmpresaPainel.findOne({
          where: { cnpj: cnpjLimpo },
          attributes: ["status", "data_vencimento"],
        });
        
        if (painel) {
          // Verificação 1: Status explícito BLOQUEADO
          if (painel.status === "BLOQUEADO") return true;
          
          // Verificação 2: Vencimento em tempo real (independente do cron!)
          // Se a data de vencimento já passou e o status não é ATIVO (está VENCIDO)
          if (painel.data_vencimento) {
            const hoje = new Date().toISOString().split("T")[0];
            if (painel.data_vencimento < hoje && painel.status !== "ATIVO") {
              // Marcar como bloqueado em tempo real no banco
              await EmpresaPainel.update(
                { status: "BLOQUEADO" },
                { where: { id: painel.id, status: { [require("sequelize").Op.in]: ["VENCIDO", "ATIVO"] } } }
              );
              console.log(`[authUser] isEmpresaBloqueada: empresa ${empresaId} BLOQUEADA automaticamente por vencimento (${painel.data_vencimento})`);
              return true;
            }
          }
          
          // Status VENCIDO também bloqueia
          if (painel.status === "VENCIDO") return true;
          
          return false;
        }
      }
    }
    
    // Fallback: não encontrou na empresas_painel, verificar pelo nome/outros campos
    // Tenta buscar na empresas_painel pelo nome da empresa
    try {
      const empresaNome = await Empresa.findByPk(empresaId, { attributes: ["nome"] });
      if (empresaNome && empresaNome.nome) {
        const painelPorNome = await EmpresaPainel.findOne({
          where: { nome_fantasia: empresaNome.nome },
          attributes: ["status"],
        });
        if (painelPorNome && painelPorNome.status === "BLOQUEADO") return true;
      }
    } catch (nomeErr) {
      // silencioso
    }

    // Fallback final: campos ativa/ativo da tabela empresas
    if (empresa.ativa === false || empresa.ativo === false) return true;
    
    return false;
  } catch (e) {
    console.warn("[authUser] Erro ao verificar bloqueio:", e && e.message);
    return false;
  }
}

/**
 * Normaliza o campo `empresas` do usuário para retornar apenas o ID numérico.
 * Aceita dois formatos:
 *   - Array de números:  [3]
 *   - Array de objetos:  [{ id: "1", nome: "..." }]  (formato legado)
 *   - String JSON:       "[3]" ou "[{\"id\":\"1\"}]"  (caso Sequelize não auto-parse)
 */
function extractEmpresaId(empresas) {
  // Tolerância: se vier como string JSON, tentar parsear
  if (typeof empresas === "string") {
    try {
      empresas = JSON.parse(empresas);
    } catch (e) {
      return null;
    }
  }
  if (!Array.isArray(empresas) || empresas.length === 0) return null;
  const first = empresas[0];
  if (typeof first === "number") return first;
  if (typeof first === "string") return parseInt(first, 10) || null;
  if (typeof first === "object" && first !== null) {
    const raw = first.id !== undefined ? first.id : first.empresaId;
    return raw != null ? parseInt(raw, 10) || null : null;
  }
  return null;
}

/**
 * Middleware de autenticação para rotas de usuário (multi-tenant).
 * Lê o token JWT do cookie `pethub_token` ou do header Authorization.
 * Fallback: usa o cookie legado `usuarioLogadoId` consultando o banco.
 * Popula req.user = { id, empresaId, grupoUsuario }
 */
async function authUser(req, res, next) {
  // 1. Tentar JWT (novo fluxo)
  // Por compatibilidade com o frontend, o header não é obrigatório por padrão.
  // Para forçar header, setar REQUIRE_AUTH_HEADER=1 no .env
  const REQUIRE_HEADER = process.env.REQUIRE_AUTH_HEADER === "1";
  const tokenFromHeader =
    req.headers &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
  const tokenFromCookie = req.cookies?.pethub_token || null;

  // DEBUG: Log detalhado de cookies recebidos
  console.log(`[authUser] 🔍 Auth check: ${req.method} ${req.path}`);
  console.log(`[authUser]   Origin: ${req.headers.origin || 'none'}`);
  console.log(`[authUser]   Cookies recebidos: ${Object.keys(req.cookies || {}).join(', ') || 'NENHUM'}`);
  console.log(`[authUser]   tokenFromCookie: ${tokenFromCookie ? 'SIM (' + tokenFromCookie.substring(0, 20) + '...)' : 'NÃO'}`);
  console.log(`[authUser]   tokenFromHeader: ${tokenFromHeader ? 'SIM' : 'NÃO'}`);

  if (REQUIRE_HEADER && !tokenFromHeader) {
    return res
      .status(401)
      .json({ mensagem: "Token (Authorization Bearer) obrigatório" });
  }

  const token = tokenFromHeader || tokenFromCookie;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      const userId = decoded && decoded.id ? Number(decoded.id) : null;
      console.log(`[authUser] Token decodificado: userId=${userId}, empresaId=${decoded.empresaId}, grupoUsuario=${decoded.grupoUsuario}`);
      if (!userId) {
        if (REQUIRE_HEADER)
          return res.status(401).json({ mensagem: "Token inválido" });
        // continuar para fallback
      } else {
        // Construir usuário baseado no token
        let resolvedEmpresaId = decoded.empresaId || null;
        
        const now = Date.now();
        // Checar cache de usuário (incluir empresaId na chave para evitar retornar dados antigos)
        const cacheKey = `${userId}:${resolvedEmpresaId || "null"}`;
        const cached = USER_CACHE.get(cacheKey);
        if (cached && cached.expiresAt > now) {
          req.user = cached.user;
          // Atualizar atividade em background
          try {
            const tokenHash = crypto
              .createHash("sha256")
              .update(token)
              .digest("hex");
            const {
              atualizarAtividade,
            } = require("../controllers/acessosController");
            atualizarAtividade(tokenHash);
          } catch (_) {}
          return next();
        }

        // Se empresaId ausente no JWT (token antigo ou usuário sem empresa no array),
        // buscar direto no DB uma vez — resultado é cacheado por 60s
        if (!resolvedEmpresaId) {
          try {
            const { Usuario } = require("../models");
            const u = await Usuario.findByPk(userId, {
              attributes: ["empresas", "empresa_id"],
            });
            if (u) {
              resolvedEmpresaId =
                (u.empresa_id ? Number(u.empresa_id) : null) ||
                extractEmpresaId(Array.isArray(u.empresas) ? u.empresas : []);
            }
          } catch (dbErr) {
            console.warn(
              `[authUser] falha ao buscar empresaId do usuario=${userId}:`,
              dbErr && dbErr.message,
            );
          }
        }

        // CRÍTICO: Garantir que empresaId sempre esteja presente para isolamento multi-tenant
        if (!resolvedEmpresaId) {
          console.error(
            `[authUser] BLOQUEIO: usuario=${userId} sem empresa_id associada. ` +
            `Isolamento multi-tenant não é possível sem empresa_id. ` +
            `Token pode estar corrompido ou usuário não pertence a nenhuma empresa.`
          );
          console.error(`[authUser] Decoded completo do token:`, JSON.stringify(decoded));
          return res.status(403).json({
            mensagem: "Usuário não associado a uma empresa. Contate o suporte.",
            semEmpresa: true,
          });
        }

        const userFromToken = {
          id: userId,
          empresaId: resolvedEmpresaId,
          grupoUsuario: decoded.grupoUsuario || null,
        };

        // Verificação crítica: empresa bloqueada (usar cache para reduzir queries)
        const empresaId = userFromToken.empresaId;
        
        // CRÍTICO: Verificação obrigatória de empresa (não pode ser null/undefined)
        if (!empresaId) {
          console.error(
            `[authUser] ERRO CRÍTICO: empresaId é null/undefined para usuario=${userId}. ` +
            `Isolamento multi-tenant violado.`
          );
          return res.status(403).json({
            mensagem: "Acesso negado: empresa não identificada.",
            semEmpresa: true,
          });
        }
        
        if (empresaId) {
          const eb = EMPRESA_BLOCKED_CACHE.get(String(empresaId));
          if (eb && eb.expiresAt > now) {
            if (eb.blocked) {
              return res
                .status(403)
                .json({ mensagem: "Sistema bloqueado.", bloqueado: true });
            }
          } else {
            try {
              const blocked = await isEmpresaBloqueada(empresaId);
              EMPRESA_BLOCKED_CACHE.set(String(empresaId), {
                blocked,
                expiresAt: now + EMPRESA_CACHE_TTL,
              });
              if (blocked)
                return res
                  .status(403)
                  .json({ mensagem: "Sistema bloqueado.", bloqueado: true });
            } catch (e) {
              // Em caso de erro ao verificar bloqueio, logar e permitir (evitar negar serviço por falha de DB)
              console.warn(
                `[authUser] falha ao verificar bloqueio da empresa ${empresaId}: ${e && e.message}`,
              );
            }
          }
        }

        // Verificar inatividade (30 dias): se ultima_atividade ultrapassou o limite, sessão expirada.
        // Executado apenas no cache miss (máximo 1x a cada 60s por usuário).
        const _INATIVIDADE_MAX_MS = SESSAO_TIMEOUT_MS;
        try {
          const _tHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
          const { SessaoAtiva } = require("../models");
          // Buscar sessão pelo token — ativo ou não — para distinguir os casos
          const _sessaoCheck = await SessaoAtiva.findOne({
            where: { token_hash: _tHash },
            attributes: ["id", "ativo", "ultima_atividade"],
          });
          if (_sessaoCheck) {
            if (!_sessaoCheck.ativo) {
              // Admin encerrou explicitamente (ativo=false) → forçar novo login
              USER_CACHE.delete(userId);
              return res.status(401).json({
                mensagem: "Sessão encerrada.",
                encerrado: true,
              });
            }
            // Sessão ativa — verificar inatividade de 8h
            if (_sessaoCheck.ultima_atividade) {
              const _inativoMs =
                Date.now() - new Date(_sessaoCheck.ultima_atividade).getTime();
              if (_inativoMs > _INATIVIDADE_MAX_MS) {
                await SessaoAtiva.update(
                  { ativo: false },
                  { where: { id: _sessaoCheck.id } },
                );
                USER_CACHE.delete(userId);
                return res.status(401).json({
                  mensagem: "Sessão expirada por inatividade.",
                  expirado: true,
                });
              }
            }
          }
          // Sem registro no DB = sessão anterior ao rastreamento — JWT válido, deixar passar
        } catch (_inativErr) {
          // Não bloquear em caso de falha na verificação de inatividade
        }

        // Cachear resultado e seguir (usar empresaId na chave)
        const finalCacheKey = `${userId}:${resolvedEmpresaId || "null"}`;
        USER_CACHE.set(finalCacheKey, {
          user: userFromToken,
          expiresAt: now + USER_CACHE_TTL,
        });
        req.user = userFromToken;
        try {
          const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
          const {
            atualizarAtividade,
          } = require("../controllers/acessosController");
          atualizarAtividade(tokenHash);
        } catch (_) {}
        return next();
      }
    } catch (err) {
      if (REQUIRE_HEADER) {
        return res.status(401).json({ mensagem: "Token inválido ou expirado" });
      }
      // token inválido/expirado — continua para fallback quando header não for obrigatório
    }
  }

  // 2. Fallback: cookie legado usuarioLogadoId (sessão anterior ao JWT)
  const usuarioLegadoId = req.cookies?.usuarioLogadoId;
  if (usuarioLegadoId) {
    // cookie legado presente; proceder com busca direta
    try {
      const { sequelize: seq } = require("../models");
      const { QueryTypes } = require("sequelize");
      // Query raw: buscar dados do usuário (não inclui empresa_id pois não existe na tabela)
      const rows = await seq.query(
        "SELECT id, grupoUsuario, empresas, ativo FROM usuarios WHERE id = :id LIMIT 1",
        {
          replacements: { id: parseInt(usuarioLegadoId) },
          type: QueryTypes.SELECT,
        },
      );
      const usuario = rows && rows[0];
      if (usuario && usuario.ativo) {
        let empresas = [];
        try {
          empresas =
            typeof usuario.empresas === "string"
              ? JSON.parse(usuario.empresas)
              : Array.isArray(usuario.empresas)
                ? usuario.empresas
                : [];
        } catch (_) {}
        const empresaId =
          (usuario.empresa_id ? Number(usuario.empresa_id) : null) ||
          extractEmpresaId(empresas);
        
        // CRÍTICO: Garantir que empresaId sempre esteja presente
        if (!empresaId) {
          console.error(
            `[authUser] BLOQUEIO (fallback): usuario=${usuario.id} sem empresa_id.`
          );
          return res.status(403).json({
            mensagem: "Usuário não associado a uma empresa. Contate o suporte.",
            semEmpresa: true,
          });
        }
        
        // Verificar se empresa está bloqueada
        if (await isEmpresaBloqueada(empresaId)) {
          console.warn(`[authUser] empresa ${empresaId} bloqueada (fallback)`);
          return res.status(403).json({
            mensagem: "Sistema bloqueado. Entre em contato com o suporte.",
            bloqueado: true,
          });
        }
        req.user = {
          id: usuario.id,
          empresaId,
          grupoUsuario: usuario.grupoUsuario,
        };
        return next();
      }
    } catch (e) {
      console.warn(
        `[authUser] fallback usuarioLegado falhou: ${e && e.message}`,
      );
      // fallback falhou, retornar 401
    }
  } else {
    // cookie legado ausente
  }

  return res.status(401).json({ mensagem: "Não autenticado. Faça login." });
}

/**
 * Gera um JWT para o usuário autenticado.
 */
function gerarTokenUsuario(usuario) {
  // Preferir campo `empresa_id` quando disponível (compatibilidade com migração)
  let empresaId = null;
  if (usuario && (usuario.empresa_id || usuario.empresaId)) {
    empresaId = Number(usuario.empresa_id || usuario.empresaId) || null;
  }
  if (!empresaId) {
    empresaId = extractEmpresaId(
      Array.isArray(usuario.empresas) ? usuario.empresas : [],
    );
  }

  return jwt.sign(
    {
      id: usuario.id,
      empresaId,
      grupoUsuario: usuario.grupoUsuario,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

/**
 * Remove um usuário do cache de autenticação.
 * Chamar ao encerrar sessões externamente (admin) para forçar re-verificação imediata.
 */
function invalidateUserCache(userId) {
  if (userId) USER_CACHE.delete(Number(userId));
}

module.exports = {
  authUser,
  gerarTokenUsuario,
  isEmpresaBloqueada,
  extractEmpresaId,
  invalidateUserCache,
  invalidateEmpresaCache,
  JWT_SECRET,
};
