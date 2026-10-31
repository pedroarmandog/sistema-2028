const { Usuario, Empresa, sequelize } = require("../models");
const { Op, QueryTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  gerarTokenUsuario,
  isEmpresaBloqueada,
  extractEmpresaId,
} = require("../middleware/authUser");
const jwt = require("jsonwebtoken");
const {
  verificarLimiteAcessos,
  registrarSessao,
  atualizarAtividade,
} = require("./acessosController");

// Login de usuário
exports.login = async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const deviceId = req.body.device_id || null;

    console.log("🔐 Tentativa de login:", usuario);
    console.log("📦 Dados recebidos:", {
      usuario,
      senha: senha ? "***" : "vazio",
    });

    // Validar dados
    if (!usuario || !senha) {
      console.log("⚠️  Dados incompletos na tentativa de login");
      return res
        .status(400)
        .json({ mensagem: "Usuário/Email e senha são obrigatórios" });
    }

    // Verificar se é um email (contém @)
    const isEmail = usuario.includes("@");

    let usuarioEncontrado = null;
    let loginViaEmpresa = false;

    if (isEmail) {
      // Primeiro: buscar usuário diretamente pelo campo 'usuario' (email)
      console.log("👤 Tentando login direto via email do usuário:", usuario);
      usuarioEncontrado = await Usuario.findOne({
        where: { usuario: usuario },
      });

      // Fallback: buscar via email da empresa (fluxo legado)
      if (!usuarioEncontrado) {
        console.log(
          "🏢 Usuário não encontrado direto, tentando via email da empresa:",
          usuario,
        );
        const empresa = await Empresa.findOne({
          where: { email: usuario },
        });

        if (empresa) {
          console.log("✅ Empresa encontrada:", empresa.nome);
          // Encontrar usuário ativo vinculado especificamente a esta empresa (campo `empresas`)
          const usuariosAtivos = await Usuario.findAll({
            where: { ativo: true },
            attributes: ["id", "nome", "usuario", "empresas", "senha", "ativo"],
            order: [["id", "ASC"]],
            limit: 2000,
          });
          usuarioEncontrado = usuariosAtivos.find((u) => {
            const arr = Array.isArray(u.empresas) ? u.empresas : [];
            return arr.some((item) => {
              if (item == null) return false;
              if (typeof item === "number")
                return Number(item) === Number(empresa.id);
              if (typeof item === "string")
                return String(item) === String(empresa.id);
              if (typeof item === "object") {
                const raw = item.id !== undefined ? item.id : item.empresaId;
                return raw != null && Number(raw) === Number(empresa.id);
              }
              return false;
            });
          });

          if (usuarioEncontrado) {
            loginViaEmpresa = true;
            console.log(
              "✅ Usando usuário vinculado à empresa:",
              usuarioEncontrado.nome,
            );
          } else {
            console.log(
              "⚠️ Nenhum usuário vinculado à empresa encontrado (login via email da empresa)",
            );
          }
        } else {
          console.log(
            "⚠️  Nenhum usuário ou empresa encontrado com email:",
            usuario,
          );
        }
      } else {
        console.log(
          "✅ Usuário encontrado diretamente pelo email:",
          usuarioEncontrado.nome,
        );
      }
    } else {
      // Buscar usuário pelo nome de usuário
      console.log("👤 Tentando login via nome de usuário:", usuario);
      usuarioEncontrado = await Usuario.findOne({
        where: { usuario: usuario },
      });
    }

    if (!usuarioEncontrado) {
      console.log("⚠️  Usuário/Email não encontrado:", usuario);
      return res
        .status(401)
        .json({ mensagem: "Usuário/Email ou senha inválidos" });
    }

    // ===== SANITIZAÇÃO DO CAMPO permissoes =====
    // O campo 'permissoes' no MySQL pode vir como:
    // - NULL
    // - string JSON
    // - array vazio []
    // Esta normalização garante que nunca quebre o código
    {
      let rawPermissoes = usuarioEncontrado.permissoes;
      if (rawPermissoes == null) {
        rawPermissoes = [];
      } else if (typeof rawPermissoes === "string") {
        try {
          rawPermissoes = JSON.parse(rawPermissoes);
        } catch (e) {
          console.warn(
            "[login] Erro ao fazer JSON.parse do campo permissoes:",
            e && e.message,
          );
          rawPermissoes = [];
        }
      }
      if (!Array.isArray(rawPermissoes)) {
        rawPermissoes = [];
      }
      // Usar setDataValue para garantir que o Sequelize internalize o valor corrigido
      try {
        usuarioEncontrado.setDataValue("permissoes", rawPermissoes);
      } catch (_) {
        usuarioEncontrado.permissoes = rawPermissoes;
      }
    }
    // ===== FIM DA SANITIZAÇÃO =====

    // Verificar se usuário está ativo
    if (!usuarioEncontrado.ativo) {
      console.log("⚠️  Usuário inativo:", usuarioEncontrado.usuario);
      return res.status(401).json({
        mensagem: "Usuário inativo. Entre em contato com o administrador.",
      });
    }

    // Verificar senha
    let senhaValida = false;

    console.log(
      "🔍 Verificando senha para usuário:",
      usuarioEncontrado.usuario,
    );
    console.log(
      "🔍 Hash armazenado no banco:",
      usuarioEncontrado.senha
        ? usuarioEncontrado.senha.substring(0, 20) + "..."
        : "VAZIO",
    );

    // Comparar senha com hash do banco
    try {
      senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);
      console.log("🔑 Comparação de senha hash:", senhaValida);
    } catch (bcryptError) {
      console.error("❌ Erro ao comparar senha:", bcryptError);
      senhaValida = false;
    }

    if (!senhaValida) {
      console.log("⚠️  Senha inválida");
      return res
        .status(401)
        .json({ mensagem: "Usuário/Email ou senha inválidos" });
    }

    console.log("✅ Login bem-sucedido para usuário:", usuarioEncontrado.nome);

    // Verificar se empresa está bloqueada antes de completar o login
    const _empresas = Array.isArray(usuarioEncontrado.empresas)
      ? usuarioEncontrado.empresas
      : [];
    const _empresaId = extractEmpresaId(_empresas);
    if (_empresaId && (await isEmpresaBloqueada(_empresaId))) {
      console.log("🚫 Empresa bloqueada para usuário:", usuarioEncontrado.nome);
      return res.status(403).json({
        mensagem:
          "Sistema bloqueado por falta de pagamento. Entre em contato com o suporte.",
        bloqueado: true,
      });
    }

    // Verificar limite de acessos simultâneos
    const limiteCheck = await verificarLimiteAcessos(_empresaId);

    // Se há sessões para derrubar (limite excedido), derrubá-las antes de registrar a nova
    if (limiteCheck.sessoesDerrubar && limiteCheck.sessoesDerrubar.length > 0) {
      console.log(
        `⚡ Derrubando ${limiteCheck.sessoesDerrubar.length} sessão(ões) antiga(s) para empresa ${_empresaId}`,
      );
      const { SessaoAtiva } = require("../models");
      for (const sessao of limiteCheck.sessoesDerrubar) {
        await SessaoAtiva.update(
          { ativo: false },
          { where: { id: sessao.id, ativo: true } },
        );
      }
    }

    // Se não temos empresaId a partir de usuario.empresas, não há como buscar (coluna empresa_id não existe)
    // O sistema usa apenas o campo JSON 'empresas' para armazenar as empresas
    let empresaIdParaToken = _empresaId || null;
    if (!empresaIdParaToken) {
      console.log(
        `[login] empresaId não encontrado no array empresas para usuario=${usuarioEncontrado.id}`,
      );
    }

    // Gerar JWT com empresaId (se encontrado) e configurar cookie
    const payloadUsuario = { ...usuarioEncontrado.toJSON() };
    if (empresaIdParaToken) payloadUsuario.empresaId = empresaIdParaToken;
    const token = gerarTokenUsuario(payloadUsuario);

    // Registrar sessão ativa no banco
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.ip ||
      "";
    const userAgent = req.headers["user-agent"] || "";
    // Se derivamos um empresaId novo para o token, reavaliar limiteCheck
    let limiteCheckToUse = limiteCheck;
    if (empresaIdParaToken && empresaIdParaToken !== _empresaId) {
      try {
        limiteCheckToUse = await verificarLimiteAcessos(empresaIdParaToken);
      } catch (e) {
        console.warn(
          "[login] falha ao recalcular verificarLimiteAcessos:",
          e && e.message,
        );
      }
    }

    if (limiteCheckToUse && limiteCheckToUse.empresaPainelId) {
      await registrarSessao(
        usuarioEncontrado.id,
        limiteCheckToUse.empresaPainelId,
        tokenHash,
        typeof clientIp === "string" ? clientIp.split(",")[0].trim() : "",
        userAgent,
        deviceId,
      );
      console.log(
        `📝 Sessão registrada para usuário ${usuarioEncontrado.id} na empresa painel ${limiteCheckToUse.empresaPainelId}`,
      );
    } else {
      console.log(
        `[login] empresaPainelId ausente para empresaId=${_empresaId} (recalc:${empresaIdParaToken}); sessão NÃO registrada no DB`,
      );
    }

    // Cookie HttpOnly (seguro) — enviado automaticamente pelo navegador
    // ⚠️ Em localhost (desenvolvimento), NÃO usar Secure nem Domain específico
    // para que o cookie funcione corretamente em HTTP (não HTTPS).
    const _isLocalhost =
      req.headers.host?.includes("localhost") ||
      req.headers.host?.includes("127.0.0.1") ||
      req.headers.host?.includes("::1");
    // Se COOKIE_DOMAIN não estiver configurado no .env, deriva o domínio raiz
    // automaticamente (ex: "api.pethubflow.com.br" → ".pethubflow.com.br")
    // para que o cookie seja válido em todos os subdomínios.
    const _hostParts = (req.hostname || "").split(".");
    const _rootDomain =
      _hostParts.length >= 3 ? "." + _hostParts.slice(-2).join(".") : null;
    const _cookieDomain = !_isLocalhost
      ? process.env.COOKIE_DOMAIN || _rootDomain
      : null;
    const _cookieSecure = !_isLocalhost
      ? process.env.COOKIE_SECURE === "1"
      : false;
    // IMPORTANTE: o frontend (desktop e mobile) usa same-origin (window.VPS_URL = "").
    // Por isso, o cookie é SEMPRE first-party e SameSite=Lax é suficiente e mais
    // compatível com PWA/iOS onde SameSite=None causa problemas de envio de cookie.
    // SameSite=None só é necessário se a API for chamada de outra origem (cross-site),
    // o que não é o caso — api.pethubflow.com.br é mesmo registrable domain (same-site).
    const _jwtCookieOptions = {
      httpOnly: true,
      // Quando Secure=true (HTTPS), usar Lax (first-party). Se o .env definir
      // COOKIE_SAMESITE explicitamente (ex: "None"), respeitar.
      sameSite: process.env.COOKIE_SAMESITE || "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias — persistente (sobrevive ao fechar o navegador)
      path: "/",
    };
    if (_cookieDomain) _jwtCookieOptions.domain = _cookieDomain;
    if (_cookieSecure) _jwtCookieOptions.secure = true;
    
    // DEBUG: Log das opções do cookie
    console.log(`[login] 🍪 Definindo cookie pethub_token:`);
    console.log(`[login]   Domain: ${_jwtCookieOptions.domain || 'não definido'}`);
    console.log(`[login]   Secure: ${_jwtCookieOptions.secure || false}`);
    console.log(`[login]   SameSite: ${_jwtCookieOptions.sameSite}`);
    console.log(`[login]   Path: ${_jwtCookieOptions.path}`);
    console.log(`[login]   MaxAge: ${_jwtCookieOptions.maxAge}ms (${_jwtCookieOptions.maxAge / 1000 / 60 / 60 / 24} dias)`);
    
    res.cookie("pethub_token", token, _jwtCookieOptions);

    // Remover senha antes de retornar
    const usuarioData = usuarioEncontrado.toJSON();
    delete usuarioData.senha;

    console.log("📤 Enviando resposta:", {
      id: usuarioData.id,
      nome: usuarioData.nome,
    });

    // Retornar token também no body para clientes que usam Authorization header
    return res.status(200).json({ ...usuarioData, token });
  } catch (error) {
    console.error("ERRO LOGIN:", error);
    // Retornar mensagem e stack para facilitar diagnóstico (remover em produção se necessário)
    return res.status(500).json({
      mensagem: "Erro ao fazer login",
      erro: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : null,
    });
  }
};

// Listar usuários da empresa do usuário logado
exports.listarUsuarios = async (req, res) => {
  try {
    const empresaId = req.user && req.user.empresaId;
    if (!empresaId) {
      return res.status(400).json({ erro: "Empresa não identificada" });
    }

    // Suportar ambos os formatos: número [3] e objeto [{"id":"3",...}]
    const targetNum = JSON.stringify(empresaId);
    const targetStr = JSON.stringify(String(empresaId));
    const [usuarios] = await sequelize.query(
      `SELECT * FROM usuarios WHERE JSON_CONTAINS(empresas, ?) OR JSON_CONTAINS(empresas, JSON_OBJECT('id', ?)) ORDER BY nome ASC`,
      { replacements: [targetNum, targetStr] },
    );

    // Remover senha de cada usuário
    const resultado = usuarios.map((u) => {
      const { senha, ...rest } = u;
      return rest;
    });

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ erro: "Erro ao listar usuários" });
  }
};

// Buscar usuário por ID
exports.buscarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    // Remover senha antes de retornar
    const usuarioData = usuario.toJSON();
    delete usuarioData.senha;

    // Fallback: se Usuario.empresas estiver vazio, não há como buscar (coluna empresa_id não existe)
    // O sistema usa apenas o campo JSON 'empresas' para armazenar as empresas
    if (!usuarioData.empresas || usuarioData.empresas.length === 0) {
      usuarioData.empresas = [];
    }

    // Normalizar campo `empresas` garantindo formato consistente
    // Resultado final: usuarioData.empresas = [{ id, nomeFantasia?, razaoSocial?, ... }, ...]
    try {
      let raw = usuarioData.empresas;
      let arr = [];
      if (Array.isArray(raw)) {
        arr = raw.slice();
      } else if (typeof raw === "string" && raw.length > 0) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) arr = parsed;
        } catch (e) {
          // fallback: tentar split por vírgula de ids
          arr = raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      // Extrair ids numéricos possíveis
      const empresaIds = arr
        .map((item) => {
          if (item == null) return null;
          if (typeof item === "number") return Number(item);
          if (typeof item === "string") {
            const n = parseInt(item, 10);
            return isNaN(n) ? null : n;
          }
          if (typeof item === "object") {
            const rawId =
              item.id || item.ID || item.empresaId || item.companyId;
            const n = parseInt(String(rawId || ""), 10);
            return isNaN(n) ? null : n;
          }
          return null;
        })
        .filter((v) => v != null && !isNaN(v));

      // Se encontramos ids, buscar as empresas e sobrescrever o array com objetos ricos
      if (empresaIds.length > 0) {
        try {
          const empresasDoBanco = await Empresa.findAll({
            where: { id: empresaIds },
            attributes: ["id", "nome", "razaoSocial", "cnpj", "email"],
          });
          if (empresasDoBanco && empresasDoBanco.length > 0) {
            // Manter a ordem original de empresaIds
            const empresasMap = new Map();
            empresasDoBanco.forEach((e) => {
              const obj = e.toJSON();
              // mapear nome -> nomeFantasia para compatibilidade com frontend
              obj.nomeFantasia = obj.nome || obj.nomeFantasia || null;
              empresasMap.set(Number(e.id), obj);
            });
            usuarioData.empresas = empresaIds
              .map((id) => empresasMap.get(Number(id)) || { id })
              .filter(Boolean);
          } else {
            // Nenhuma empresa encontrada: transformar ids em objetos simples
            usuarioData.empresas = empresaIds.map((id) => ({ id }));
          }
        } catch (e) {
          // Em caso de erro ao buscar empresas, garantir formato mínimo
          usuarioData.empresas = empresaIds.map((id) => ({ id }));
        }
      } else {
        // Não havia ids: garantir que `empresas` seja array (vazio)
        usuarioData.empresas = Array.isArray(arr) ? arr : [];
      }
    } catch (e) {
      // Garantir estrutura de fallback
      usuarioData.empresas = usuarioData.empresas || [];
    }

    res.json(usuarioData);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ erro: "Erro ao buscar usuário" });
  }
};

// Criar usuário
exports.criarUsuario = async (req, res) => {
  try {
    const dados = req.body;

    console.log(
      "📝 Dados recebidos para criar usuário:",
      JSON.stringify(dados, null, 2),
    );

    // Verificar se usuário já existe
    const usuarioExistente = await Usuario.findOne({
      where: { usuario: dados.usuario },
    });

    if (usuarioExistente) {
      console.log("⚠️  Usuário já existe:", dados.usuario);
      return res.status(400).json({ erro: "Nome de usuário já existe" });
    }

    // Criar usuário
    console.log("➕ Criando novo usuário...");
    const novoUsuario = await Usuario.create(dados);
    console.log("✅ Usuário criado com sucesso:", novoUsuario.id);

    // Remover senha antes de retornar
    const usuarioData = novoUsuario.toJSON();
    delete usuarioData.senha;

    res.status(201).json(usuarioData);
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
    console.error("Stack trace:", error.stack);
    console.error("Mensagem de erro:", error.message);
    if (error.errors) {
      console.error(
        "Erros de validação:",
        error.errors.map((e) => ({ field: e.path, message: e.message })),
      );
    }
    res.status(500).json({
      erro: "Erro ao criar usuário",
      detalhes: error.message,
      validacao: error.errors
        ? error.errors.map((e) => ({ field: e.path, message: e.message }))
        : null,
    });
  }
};

// Atualizar usuário
exports.atualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const dados = req.body;

    console.log("📦 Dados recebidos para atualização:", {
      ...dados,
      senha: dados.senha ? "***" : "não fornecida",
    });

    // A senha será criptografada automaticamente pelo hook beforeUpdate do model
    // Se não foi fornecida senha, remover do objeto para não atualizar
    if (!dados.senha || !dados.senha.trim()) {
      console.log("⚠️ Nenhuma senha fornecida, mantendo senha atual");
      delete dados.senha;
    } else {
      console.log("🔐 Nova senha será criptografada pelo model hook");
    }

    // Se o nome de usuário mudou, verificar se não existe outro com o mesmo nome
    if (dados.usuario && dados.usuario !== usuario.usuario) {
      const usuarioExistente = await Usuario.findOne({
        where: {
          usuario: dados.usuario,
          id: { [Op.ne]: req.params.id },
        },
      });

      if (usuarioExistente) {
        return res.status(400).json({ erro: "Nome de usuário já existe" });
      }
    }

    // Atualizar usuário
    await usuario.update(dados);

    // Remover senha antes de retornar
    const usuarioData = usuario.toJSON();
    delete usuarioData.senha;

    res.json(usuarioData);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ erro: "Erro ao atualizar usuário" });
  }
};

// Deletar usuário
exports.deletarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    await usuario.destroy();
    res.json({ mensagem: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({ erro: "Erro ao deletar usuário" });
  }
};

// Validar senha do usuário
exports.validarSenha = async (req, res) => {
  try {
    const { usuarioId, senha } = req.body;

    console.log("🔐 Validando senha para usuário ID:", usuarioId);

    if (!usuarioId || !senha) {
      return res.status(400).json({
        erro: "ID do usuário e senha são obrigatórios",
        valida: false,
      });
    }

    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      console.log("⚠️  Usuário não encontrado:", usuarioId);
      return res
        .status(404)
        .json({ erro: "Usuário não encontrado", valida: false });
    }

    // Comparar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    console.log("🔑 Senha válida:", senhaValida);

    return res.status(200).json({ valida: senhaValida });
  } catch (error) {
    console.error("❌ Erro ao validar senha:", error);
    return res
      .status(500)
      .json({ erro: "Erro ao validar senha", valida: false });
  }
};
