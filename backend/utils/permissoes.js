"use strict";

/**
 * Catálogo de Permissões do PetHub
 *
 * Permissões são armazenadas como array JSON no campo `usuario.permissoes`.
 * Este arquivo serve como documentação central e fonte de verdade para
 * todos os identificadores de permissão utilizados no sistema.
 *
 * COMO USAR:
 *   const { PERMISSOES } = require('../utils/permissoes');
 *   if (req.user.permissoes.includes(PERMISSOES.FISCAL.CONFIGURAR)) { ... }
 *
 * IMPORTANTE:
 *   As permissões são armazenadas mas não há middleware de enforcement atualmente.
 *   Ao implementar o módulo fiscal de emissão, criar middleware que valide
 *   req.user.permissoes antes de chamar FiscalServiceFactory.create().
 */

const PERMISSOES = {
  // ──────────────────────────────────────────────────────────────────────────
  // Módulo Fiscal — adicionado em 2026-08-01
  // Nenhuma dessas permissões quebra funcionalidades existentes.
  // São preparatórias para quando a emissão for implementada.
  // ──────────────────────────────────────────────────────────────────────────
  FISCAL: {
    /** Habilita o botão/ação de emitir NF-e */
    EMITIR_NFE: "fiscal:emitir_nfe",
    /** Habilita o botão/ação de emitir NFC-e */
    EMITIR_NFCE: "fiscal:emitir_nfce",
    /** Habilita o botão/ação de emitir NFS-e */
    EMITIR_NFSE: "fiscal:emitir_nfse",
    /** Habilita cancelamento de nota fiscal */
    CANCELAR: "fiscal:cancelar",
    /** Habilita inutilização de numeração */
    INUTILIZAR: "fiscal:inutilizar",
    /** Habilita consulta de status na SEFAZ/provedor */
    CONSULTAR: "fiscal:consultar",
    /** Habilita download do XML da nota */
    DOWNLOAD_XML: "fiscal:download_xml",
    /** Habilita download do DANFE/PDF da nota */
    DOWNLOAD_DANFE: "fiscal:download_danfe",
    /** Habilita acesso à tela de Configuração Fiscal */
    CONFIGURAR: "fiscal:configurar",
    /** Habilita acesso à Central Fiscal (listagem de todas as notas) */
    CENTRAL_FISCAL: "fiscal:central_fiscal",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Permissões existentes documentadas (não alterar identificadores)
  // ──────────────────────────────────────────────────────────────────────────
  VENDAS: {
    VER: "vendas:ver",
    CRIAR: "vendas:criar",
    EDITAR: "vendas:editar",
    CANCELAR: "vendas:cancelar",
  },
  CAIXA: {
    ABRIR: "caixa:abrir",
    FECHAR: "caixa:fechar",
    VER: "caixa:ver",
  },
  CLIENTES: {
    VER: "clientes:ver",
    CRIAR: "clientes:criar",
    EDITAR: "clientes:editar",
    DELETAR: "clientes:deletar",
  },
  PRODUTOS: {
    VER: "produtos:ver",
    CRIAR: "produtos:criar",
    EDITAR: "produtos:editar",
    DELETAR: "produtos:deletar",
  },
  RELATORIOS: {
    VER: "relatorios:ver",
  },
  CONFIGURACOES: {
    VER: "configuracoes:ver",
    EDITAR: "configuracoes:editar",
  },
  USUARIOS: {
    VER: "usuarios:ver",
    CRIAR: "usuarios:criar",
    EDITAR: "usuarios:editar",
    DELETAR: "usuarios:deletar",
  },
};

/**
 * Lista flat de todas as permissões fiscais para popular interface de configuração
 */
const PERMISSOES_FISCAIS_LISTA = Object.values(PERMISSOES.FISCAL);

/**
 * Helper: verifica se um usuário tem uma permissão específica.
 * Aceita tanto array quanto string JSON.
 *
 * @param {string[]|string} permissoes - permissoes do usuário
 * @param {string} permissao - permissão a verificar
 * @returns {boolean}
 */
function temPermissao(permissoes, permissao) {
  try {
    const arr = Array.isArray(permissoes)
      ? permissoes
      : JSON.parse(permissoes || "[]");
    return arr.includes(permissao);
  } catch {
    return false;
  }
}

module.exports = {
  PERMISSOES,
  PERMISSOES_FISCAIS_LISTA,
  temPermissao,
};
