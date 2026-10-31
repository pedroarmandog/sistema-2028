const { EmpresaPainel, SessaoAtiva, sequelize } = require("../models");
const { Op } = require("sequelize");

// Tempo máximo de inatividade: 30 dias por padrão — alinhado ao JWT de 30d
// e ao cookie de 30d. A sessão só é encerrada por logout explícito, derrubada
// administrativa/limite de acessos, ou após este período sem NENHUMA
// requisição autenticada. Configurável via env SESSAO_TIMEOUT_MS.
// Cada requisição via authUser middleware atualiza ultima_atividade
// automaticamente (não depende de heartbeat — o timeout é detectado na
// próxima tentativa de acesso).
const SESSAO_TIMEOUT_MS =
  Number(process.env.SESSAO_TIMEOUT_MS) || 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * Limpa sessões expiradas via Sequelize ORM (timezone-safe).
 *
 * POR QUÊ ORM e NÃO raw SQL:
 * O Sequelize usa timezone '+00:00' por padrão para serializar datas — grava
 * ultima_atividade em UTC. Se o MySQL estiver em timezone local (ex: UTC-3),
 * a função NOW() retornaria UTC-3 e a comparação com valores UTC nunca seria
 * verdadeira, impedindo o cleanup. Usando Op.lt com new Date(), Sequelize
 * serializa a data de corte com o mesmo timezone das datas gravadas, garantindo
 * consistência independente da configuração de timezone do servidor MySQL.
 */
async function limparSessoesExpiradas() {
  try {
    const cutoff = new Date(Date.now() - SESSAO_TIMEOUT_MS);
    const [count] = await SessaoAtiva.update(
      { ativo: false },
      {
        where: {
          ativo: true,
          ultima_atividade: { [Op.lt]: cutoff },
        },
      },
    );
    if (count > 0) {
      console.log(
        `[sessoes] ${count} sessão(es) expirada(s) marcada(s) como inativa(s) (cutoff=${cutoff.toISOString()})`,
      );
    }
  } catch (e) {
    console.error(
      "[sessoes] limparSessoesExpiradas ERRO:",
      e && e.message,
      e && e.sql ? `\nSQL: ${e.sql}` : "",
    );
  }
}

/**
 * Lista acessos de todas as empresas (admin)
 */
const listarAcessos = async (req, res) => {
  try {
    await limparSessoesExpiradas();

    const empresas = await EmpresaPainel.findAll({
      attributes: ["id", "nome_fantasia", "cnpj", "status", "limite_acessos"],
      order: [["nome_fantasia", "ASC"]],
      limit: 1000,
    });

    // Contar sessões ativas por empresa
    const sessoesCount = await SessaoAtiva.findAll({
      attributes: [
        "empresa_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "total_ativas"],
      ],
      where: { ativo: true },
      group: ["empresa_id"],
    });

    const sessoesMap = {};
    sessoesCount.forEach((s) => {
      sessoesMap[s.empresa_id] = parseInt(s.getDataValue("total_ativas"));
    });

    const resultado = empresas.map((emp) => ({
      id: emp.id,
      nome_fantasia: emp.nome_fantasia,
      cnpj: emp.cnpj,
      status: emp.status,
      limite_acessos: emp.limite_acessos,
      acessos_em_uso: sessoesMap[emp.id] || 0,
    }));

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar acessos:", error);
    res.status(500).json({ error: "Erro ao listar acessos" });
  }
};

/**
 * Detalhes de acessos de uma empresa
 */
const detalhesAcessos = async (req, res) => {
  try {
    await limparSessoesExpiradas();

    const empresa = await EmpresaPainel.findByPk(req.params.id, {
      attributes: ["id", "nome_fantasia", "cnpj", "status", "limite_acessos"],
    });

    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const sessoes = await SessaoAtiva.findAll({
      where: { empresa_id: empresa.id, ativo: true },
      attributes: [
        "id",
        "usuario_id",
        "ip_address",
        "user_agent",
        "data_login",
        "ultima_atividade",
      ],
      order: [["data_login", "DESC"]],
      limit: 1000,
    });

    // Buscar nomes dos usuários
    const { Usuario } = require("../models");
    const usuarioIds = sessoes.map((s) => s.usuario_id);
    let usuarios = [];
    if (usuarioIds.length > 0) {
      usuarios = await Usuario.findAll({
        where: { id: { [Op.in]: usuarioIds } },
        attributes: ["id", "nome", "usuario"],
        limit: Math.max(1000, usuarioIds.length || 1000),
      });
    }
    const usrMap = {};
    usuarios.forEach((u) => {
      usrMap[u.id] = { nome: u.nome, usuario: u.usuario };
    });

    const sessoesDetalhadas = sessoes.map((s) => ({
      id: s.id,
      usuario_id: s.usuario_id,
      usuario_nome: usrMap[s.usuario_id]?.nome || "Desconhecido",
      usuario_login: usrMap[s.usuario_id]?.usuario || "-",
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      data_login: s.data_login,
      ultima_atividade: s.ultima_atividade,
    }));

    res.json({
      empresa: {
        id: empresa.id,
        nome_fantasia: empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        status: empresa.status,
        limite_acessos: empresa.limite_acessos,
      },
      acessos_em_uso: sessoesDetalhadas.length,
      sessoes: sessoesDetalhadas,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes de acessos:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
};

/**
 * Atualizar limite de acessos de uma empresa.
 * Ao reduzir o limite, encerra imediatamente as sessões excedentes (mais antigas).
 */
const atualizarLimite = async (req, res) => {
  try {
    const { limite_acessos } = req.body;

    if (!limite_acessos || limite_acessos < 1 || limite_acessos > 100) {
      return res.status(400).json({ error: "Limite deve ser entre 1 e 100" });
    }

    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const novoLimite = parseInt(limite_acessos);
    empresa.limite_acessos = novoLimite;
    await empresa.save();

    // Encerrar sessões excedentes imediatamente ao reduzir o limite
    let sessoesEncerradas = 0;
    try {
      // Limpar expiradas antes de contar
      await limparSessoesExpiradas();

      const sessoesAtivas = await SessaoAtiva.findAll({
        where: { empresa_id: empresa.id, ativo: true },
        attributes: ["id"],
        order: [["ultima_atividade", "ASC"]], // derruba as menos recentes primeiro
        limit: 2000,
      });

      if (sessoesAtivas.length > novoLimite) {
        const quantasRemover = sessoesAtivas.length - novoLimite;
        const idsRemover = sessoesAtivas
          .slice(0, quantasRemover)
          .map((s) => s.id);

        await SessaoAtiva.update(
          { ativo: false },
          { where: { id: { [Op.in]: idsRemover } } },
        );
        sessoesEncerradas = idsRemover.length;
        console.log(
          `[acessos/limite] empresa=${empresa.id} novo_limite=${novoLimite} encerradas=${sessoesEncerradas} sessões excedentes`,
        );
      }
    } catch (e) {
      console.warn(
        "[acessos/limite] falha ao encerrar sessões excedentes:",
        e && e.message,
      );
    }

    res.json({
      message: "Limite atualizado com sucesso",
      limite_acessos: empresa.limite_acessos,
      sessoes_encerradas: sessoesEncerradas,
    });
  } catch (error) {
    console.error("Erro ao atualizar limite:", error);
    res.status(500).json({ error: "Erro ao atualizar limite" });
  }
};

/**
 * Encerrar uma sessão específica (admin)
 */
const encerrarSessao = async (req, res) => {
  try {
    const sessao = await SessaoAtiva.findByPk(req.params.sessaoId);
    if (!sessao) {
      return res.status(404).json({ error: "Sessão não encontrada" });
    }

    const usuarioIdParaInvalidar = sessao.usuario_id;
    sessao.ativo = false;
    await sessao.save();

    // Invalidar cache de auth para forçar re-verificação imediata
    try {
      const { invalidateUserCache } = require("../middleware/authUser");
      invalidateUserCache(usuarioIdParaInvalidar);
    } catch (_) {}

    res.json({ message: "Sessão encerrada com sucesso" });
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
    res.status(500).json({ error: "Erro ao encerrar sessão" });
  }
};

/**
 * Encerrar todas as sessões de uma empresa (admin)
 */
const encerrarTodasSessoes = async (req, res) => {
  try {
    const { id } = req.params;

    // Coletar IDs dos usuários afetados antes de encerrar (para invalidar cache)
    const sessoesAtivas = await SessaoAtiva.findAll({
      where: { empresa_id: id, ativo: true },
      attributes: ["usuario_id"],
    });
    const usuarioIdsAfetados = [
      ...new Set(sessoesAtivas.map((s) => s.usuario_id)),
    ];

    await SessaoAtiva.update(
      { ativo: false },
      { where: { empresa_id: id, ativo: true } },
    );

    // Invalidar cache de auth para todos os usuários afetados
    try {
      const { invalidateUserCache } = require("../middleware/authUser");
      usuarioIdsAfetados.forEach((uid) => invalidateUserCache(uid));
      if (usuarioIdsAfetados.length > 0)
        console.log(
          `[acessos] cache invalidado para ${usuarioIdsAfetados.length} usuário(s)`,
        );
    } catch (_) {}

    res.json({ message: "Todas as sessões foram encerradas" });
  } catch (error) {
    console.error("Erro ao encerrar sessões:", error);
    res.status(500).json({ error: "Erro ao encerrar sessões" });
  }
};

/**
 * Verifica acessos da empresa e retorna info para o login.
 * Nunca bloqueia — se over limit, retorna IDs das sessões mais antigas para derrubar.
 */
async function verificarLimiteAcessos(empresaId) {
  if (!empresaId)
    return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };

  try {
    await limparSessoesExpiradas();

    // Buscar empresa no painel via CNPJ
    const { Empresa, Op: OpModel } = require("../models");
    const empresa = await Empresa.findByPk(empresaId, {
      attributes: ["cnpj"],
    });

    let empresaPainel = null;

    if (empresa && empresa.cnpj) {
      const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
      // SQL nativo que limpa pontuação dos dois lados para garantir o match
      // independente do formato armazenado (com ou sem pontuação)
      const rows = await sequelize.query(
        `SELECT id, limite_acessos FROM empresas_painel
         WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj,'.',''),'/',''),'-',''),' ','') = :cnpjLimpo
         LIMIT 1`,
        {
          replacements: { cnpjLimpo },
          type: sequelize.constructor.QueryTypes.SELECT,
        },
      );
      if (rows && rows.length > 0) {
        empresaPainel = rows[0];
      }
    }

    if (!empresaPainel) {
      console.log(
        `[acessos] verificarLimiteAcessos: EmpresaPainel não encontrada para empresaId=${empresaId} cnpj='${empresa?.cnpj || "?"}'`,
      );
      return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };
    }

    const sessoesAtivas = await SessaoAtiva.findAll({
      where: { empresa_id: empresaPainel.id, ativo: true },
      attributes: ["id", "token_hash", "data_login", "ultima_atividade"],
      order: [["ultima_atividade", "ASC"]], // derrubar as menos recentemente ativas
      limit: 2000,
    });

    const totalAtivas = sessoesAtivas.length;
    // Só pré-derrubar se JÁ estiver ACIMA do limite (não apenas no limite).
    // O caso de estar exatamente no limite (totalAtivas == limite) é tratado
    // pelo enforcement em registrarSessao após criar a nova sessão.
    let sessoesDerrubar = [];
    if (totalAtivas > empresaPainel.limite_acessos) {
      const quantasDerrubar = totalAtivas - empresaPainel.limite_acessos;
      sessoesDerrubar = sessoesAtivas.slice(0, quantasDerrubar).map((s) => ({
        id: s.id,
        token_hash: s.token_hash,
      }));
    }

    return {
      permitido: true, // sempre permite — derruba a mais antiga se necessário
      ativas: totalAtivas,
      limite: empresaPainel.limite_acessos,
      empresaPainelId: empresaPainel.id,
      sessoesDerrubar,
    };
  } catch (e) {
    console.warn("[acessos] Erro ao verificar limite:", e && e.message);
    return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };
  }
}

/**
 * Verifica se uma sessão (por token_hash) ainda está ativa.
 * Usado pelo frontend para detectar desconexão.
 */
async function verificarSessaoAtiva(tokenHash) {
  try {
    const sessao = await SessaoAtiva.findOne({
      where: { token_hash: tokenHash, ativo: true },
    });
    const ativa = !!sessao;
    console.log(
      `[acessos] verificarSessaoAtiva token=${tokenHash?.substring(0, 10)} ativa=${ativa}`,
    );
    return ativa;
  } catch (e) {
    return true; // em caso de erro, não desconectar
  }
}

/**
 * Registra ou atualiza sessão após login.
 * Ordem de lookup:
 *   1. device_id (identificador único do navegador/dispositivo) — prioritário
 *   2. token_hash (mesmo cookie)
 *   3. usuario_id + empresa_id + IP (mesmo usuário, mesmo IP)
 *   4. usuario_id + empresa_id (qualquer sessão ativa do usuário)
 *   5. Cria nova linha
 * Ao encontrar a sessão da nova login, encerra todas as outras do mesmo usuário.
 * Garante: 1 sessão ativa por usuário, independente de guia anônima ou navegador.
 */
async function registrarSessao(
  usuarioId,
  empresaPainelId,
  tokenHash,
  ip,
  userAgent,
  deviceId,
) {
  try {
    const ipLimpo = ip ? ip.split(",")[0].trim() : null;
    let minhaSessaoId = null;

    // 1. Buscar por device_id (dispositivo já conhecido)
    if (deviceId) {
      try {
        const porDevice = await SessaoAtiva.findOne({
          where: { device_id: deviceId },
        });
        if (porDevice) {
          await porDevice.update({
            token_hash: tokenHash,
            usuario_id: usuarioId,
            empresa_id: empresaPainelId || porDevice.empresa_id,
            ip_address: ipLimpo || porDevice.ip_address,
            user_agent: userAgent
              ? userAgent.substring(0, 500)
              : porDevice.user_agent,
            ultima_atividade: new Date(),
            ativo: true,
          });
          minhaSessaoId = porDevice.id;
          console.log(
            `[acessos] sessão reutilizada por device_id=${deviceId.substring(0, 8)} id=${minhaSessaoId}`,
          );
        }
      } catch (deviceErr) {
        console.warn(
          "[acessos] lookup por device_id falhou:",
          deviceErr.message,
        );
        deviceId = null;
      }
    }

    if (!minhaSessaoId) {
      // 2. Buscar por token_hash exato
      const porToken = await SessaoAtiva.findOne({
        where: { token_hash: tokenHash },
      });
      if (porToken) {
        const updateData = {
          usuario_id: usuarioId,
          empresa_id: empresaPainelId || porToken.empresa_id,
          ip_address: ipLimpo || porToken.ip_address,
          user_agent: userAgent
            ? userAgent.substring(0, 500)
            : porToken.user_agent,
          ultima_atividade: new Date(),
          ativo: true,
        };
        if (deviceId) updateData.device_id = deviceId;
        await porToken.update(updateData);
        minhaSessaoId = porToken.id;
        console.log(
          `[acessos] sessão reutilizada por token_hash id=${minhaSessaoId}`,
        );
      }
    }

    if (!minhaSessaoId) {
      // 3. Mesmo usuário + mesmo IP (cobre guia anônima no mesmo dispositivo)
      const porIp =
        ipLimpo && empresaPainelId
          ? await SessaoAtiva.findOne({
              where: {
                usuario_id: usuarioId,
                empresa_id: empresaPainelId,
                ip_address: ipLimpo,
                ativo: true,
              },
              order: [["ultima_atividade", "DESC"]],
            }).catch(() => null)
          : null;
      if (porIp) {
        const updateIp = {
          token_hash: tokenHash,
          ip_address: ipLimpo,
          user_agent: userAgent
            ? userAgent.substring(0, 500)
            : porIp.user_agent,
          ultima_atividade: new Date(),
          ativo: true,
        };
        if (deviceId) updateIp.device_id = deviceId;
        await porIp.update(updateIp);
        minhaSessaoId = porIp.id;
        console.log(
          `[acessos] sessão reutilizada por IP=${ipLimpo} id=${minhaSessaoId}`,
        );
      }
    }

    if (!minhaSessaoId) {
      // 4. Qualquer sessão ativa do usuário nesta empresa
      const porUsuario = empresaPainelId
        ? await SessaoAtiva.findOne({
            where: {
              usuario_id: usuarioId,
              empresa_id: empresaPainelId,
              ativo: true,
            },
            order: [["ultima_atividade", "DESC"]],
          })
        : null;
      if (porUsuario) {
        const updateData = {
          token_hash: tokenHash,
          ip_address: ipLimpo || porUsuario.ip_address,
          user_agent: userAgent
            ? userAgent.substring(0, 500)
            : porUsuario.user_agent,
          ultima_atividade: new Date(),
          ativo: true,
        };
        if (deviceId) updateData.device_id = deviceId;
        await porUsuario.update(updateData);
        minhaSessaoId = porUsuario.id;
        console.log(`[acessos] sessão legada atualizada id=${minhaSessaoId}`);
      }
    }

    if (!minhaSessaoId) {
      // 5. Criar nova sessão
      const createData = {
        usuario_id: usuarioId,
        empresa_id: empresaPainelId,
        token_hash: tokenHash,
        ip_address: ipLimpo || null,
        user_agent: userAgent ? userAgent.substring(0, 500) : null,
        data_login: new Date(),
        ultima_atividade: new Date(),
        ativo: true,
      };
      if (deviceId) createData.device_id = deviceId;
      const nova = await SessaoAtiva.create(createData);
      minhaSessaoId = nova.id;
      console.log(
        `[acessos] nova sessão criada id=${minhaSessaoId} device=${deviceId ? deviceId.substring(0, 8) : "none"} ip=${ipLimpo}`,
      );
    }

    // Encerrar todas as outras sessões ativas do mesmo usuário (inclui guia anônima)
    if (empresaPainelId && minhaSessaoId) {
      try {
        const [encerradas] = await SessaoAtiva.update(
          { ativo: false },
          {
            where: {
              usuario_id: usuarioId,
              empresa_id: empresaPainelId,
              ativo: true,
              id: { [Op.ne]: minhaSessaoId },
            },
          },
        );
        if (encerradas > 0) {
          console.log(
            `[acessos] ${encerradas} sessão(es) anterior(es) encerrada(s) para usuario=${usuarioId}`,
          );
        }
      } catch (limiteErr) {
        console.warn(
          "[acessos] falha ao encerrar sessões anteriores:",
          limiteErr && limiteErr.message,
        );
      }
    }
  } catch (e) {
    console.warn("[acessos] Erro ao registrar sessão:", e && e.message);
  }
}

/**
 * Heartbeat: atualiza ultima_atividade e verifica se a sessão ainda está ativa.
 * Chamado a cada 60s pelo frontend.
 * Retorna { ativa: true } ou { ativa: false, motivo: string }.
 */
async function heartbeatSessao(deviceId, tokenHash) {
  try {
    // Buscar por device_id (principal identificador)
    if (deviceId) {
      const sessao = await SessaoAtiva.findOne({
        where: { device_id: deviceId },
      });
      if (sessao) {
        if (!sessao.ativo) {
          // Sessão encerrada (logout manual ou timeout) — não reativar
          return { ativa: false, motivo: "sessao_encerrada" };
        }
        // Sessão ativa: atualizar ultima_atividade
        const updates = { ultima_atividade: new Date() };
        if (tokenHash && sessao.token_hash !== tokenHash) {
          updates.token_hash = tokenHash;
        }
        await sessao.update(updates);
        return { ativa: true };
      }
    }

    // Fallback: buscar por token_hash
    if (tokenHash) {
      const sessaoPorToken = await SessaoAtiva.findOne({
        where: { token_hash: tokenHash },
      });
      if (sessaoPorToken) {
        if (!sessaoPorToken.ativo) {
          return { ativa: false, motivo: "sessao_encerrada" };
        }
        const updates = { ultima_atividade: new Date() };
        if (deviceId && !sessaoPorToken.device_id) {
          updates.device_id = deviceId;
        }
        await sessaoPorToken.update(updates);
        return { ativa: true };
      }
    }

    // Nenhum registro — JWT válido mas sessão não registrada (migração/deploy)
    return { ativa: true, motivo: "no_record" };
  } catch (e) {
    console.warn("[acessos] heartbeatSessao erro:", e && e.message);
    return { ativa: true, motivo: "db_error" }; // fail open
  }
}

/**
 * Encerra sessão de um dispositivo específico via soft-close.
 * Chamado quando a última aba do dispositivo é fechada (sendBeacon).
 * Usa soft-close (ativo=false + encerrado_em) em vez de DELETE para
 * suportar o período de graça de 30s que cobre navegações entre páginas.
 */
async function encerrarDispositivo(deviceId) {
  if (!deviceId) return 0;
  try {
    const [count] = await SessaoAtiva.update(
      { ativo: false, encerrado_em: new Date(), ultima_atividade: new Date() },
      { where: { device_id: deviceId, ativo: true } },
    );
    console.log(
      `[acessos] encerrarDispositivo device=${deviceId.substring(0, 8)} rows=${count}`,
    );
    return count;
  } catch (e) {
    console.warn("[acessos] encerrarDispositivo erro:", e && e.message);
    return 0;
  }
}

/**
 * Encerra sessão ativa pelo hash do token (chamado no logout)
 */
async function encerrarSessaoPorToken(tokenHash) {
  try {
    console.log(
      `[acessos] encerrando sessão token=${tokenHash?.substring(0, 10)}`,
    );
    const [count] = await SessaoAtiva.update(
      { ativo: false },
      { where: { token_hash: tokenHash, ativo: true } },
    );
    console.log(
      `[acessos] encerradas ${count || 0} sessão(ões) para token=${tokenHash?.substring(0, 10)}`,
    );
  } catch (e) {
    console.warn("[acessos] Erro ao encerrar sessão:", e && e.message);
  }
}

/**
 * Atualiza última atividade de uma sessão (chamado pelo middleware)
 */
async function atualizarAtividade(tokenHash) {
  try {
    await SessaoAtiva.update(
      { ultima_atividade: new Date() },
      { where: { token_hash: tokenHash, ativo: true } },
    );
  } catch (e) {
    // Silencioso - não deve bloquear a requisição
  }
}

module.exports = {
  listarAcessos,
  detalhesAcessos,
  atualizarLimite,
  encerrarSessao,
  encerrarTodasSessoes,
  verificarLimiteAcessos,
  registrarSessao,
  encerrarSessaoPorToken,
  encerrarDispositivo,
  atualizarAtividade,
  limparSessoesExpiradas,
  verificarSessaoAtiva,
  heartbeatSessao,
  SESSAO_TIMEOUT_MS,
};
