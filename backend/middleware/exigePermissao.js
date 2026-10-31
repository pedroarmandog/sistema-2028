"use strict";

/**
 * exigePermissao.js
 * Middleware de permissão baseado na estrutura existente do PetHub
 * (campo `usuarios.permissoes` — array JSON de chaves de permissão).
 *
 * REGRA DE COMPATIBILIDADE:
 *  - Usuários com `permissoes` nulo/vazio (legado — nunca passaram pela
 *    página de permissões) NÃO são bloqueados, mantendo o sistema estável.
 *  - Quando o usuário já possui permissões definidas (array não vazio),
 *    a rota exige que UMA das permissões informadas esteja presente.
 *    Usuário sem a permissão → HTTP 403.
 */
const { Usuario } = require("../models");

function exigePermissao(...permissoesNecessarias) {
  return async function (req, res, next) {
    try {
      let usuario = null;
      try {
        usuario = await Usuario.findByPk(req.user?.id, {
          attributes: ["id", "permissoes"],
        });
      } catch (e) {
        return res.status(500).json({ erro: "Erro ao verificar permissões" });
      }

      let perms = usuario?.permissoes;
      if (typeof perms === "string") {
        try {
          perms = JSON.parse(perms);
        } catch (_) {
          perms = [];
        }
      }
      if (!Array.isArray(perms)) perms = [];

      // Legado: sem permissões configuradas → acesso mantido
      if (perms.length === 0) return next();

      const permitido = permissoesNecessarias.some((p) => perms.includes(p));
      if (!permitido) {
        return res.status(403).json({
          erro: "Sem permissão para acessar esta configuração",
          permissao_necessaria: permissoesNecessarias[0],
        });
      }
      return next();
    } catch (err) {
      return res.status(500).json({ erro: "Erro ao verificar permissão" });
    }
  };
}

module.exports = { exigePermissao };