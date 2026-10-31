"use strict";

/**
 * FiscalService — Contrato/Interface da camada de integração fiscal
 *
 * Define o contrato que todos os adapters de provedores devem implementar.
 * Nenhuma lógica real de emissão reside aqui — apenas assinaturas de métodos
 * e uma classe base que lança NotImplementedError para métodos não sobrescritos.
 *
 * ARQUITETURA:
 *   FiscalService (este arquivo — interface)
 *       ↑ extends
 *   PlugNotasAdapter / FocusNFeAdapter / ENotasAdapter / TecnospeedAdapter
 *       ↑ instanciado por
 *   FiscalServiceFactory (seleciona adapter via ConfiguracaoFiscal.provedor_api)
 *
 * DESACOPLAMENTO:
 *   A lógica de negócio (vendaController, agendamentoController, etc.) nunca
 *   importa um adapter diretamente. Sempre usa FiscalServiceFactory.
 *   Trocar o provedor = alterar apenas ConfiguracaoFiscal.provedor_api.
 *
 * CICLO DE VIDA DE UMA NOTA:
 *   1. FiscalPayloadBuilder.buildNFe(venda, empresa, config) → payload normalizado
 *   2. FiscalServiceFactory.create(config) → adapter correto
 *   3. adapter.transmitir(payload) → NotaFiscal registrada
 *   4. (assíncrono) adapter.consultar(chave) → atualiza status
 *   5. (se necessário) adapter.cancelar(chave, motivo) → atualiza status
 */

class NotImplementedError extends Error {
  constructor(method) {
    super(
      `FiscalService: método "${method}" não implementado neste adapter. ` +
        "Implemente o adapter do provedor selecionado em backend/services/fiscal/adapters/",
    );
    this.name = "NotImplementedError";
    this.code = "FISCAL_NOT_IMPLEMENTED";
  }
}

class FiscalService {
  /**
   * @param {object} config - Instância de ConfiguracaoFiscal para esta empresa
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Transmite uma nota fiscal para o provedor.
   *
   * @param {object} payload - Payload normalizado gerado por FiscalPayloadBuilder
   * @returns {Promise<{ success: boolean, numeroRequisicao: string, resposta: object }>}
   */
  async transmitir(payload) {
    throw new NotImplementedError("transmitir");
  }

  /**
   * Consulta o status de uma nota fiscal no provedor.
   *
   * @param {string} chaveOuRequisicao - Chave de acesso (44 dígitos) ou ID de requisição
   * @returns {Promise<{ status: string, protocolo: string, xml: string, resposta: object }>}
   */
  async consultar(chaveOuRequisicao) {
    throw new NotImplementedError("consultar");
  }

  /**
   * Cancela uma nota fiscal autorizada.
   *
   * @param {string} chaveAcesso - Chave de acesso da nota (44 dígitos)
   * @param {string} motivo - Motivo do cancelamento (mín. 15 caracteres conforme SEFAZ)
   * @returns {Promise<{ success: boolean, protocolo: string, xml: string }>}
   */
  async cancelar(chaveAcesso, motivo) {
    throw new NotImplementedError("cancelar");
  }

  /**
   * Inutiliza uma faixa de numeração de NF-e.
   *
   * @param {string} serie - Série a inutilizar
   * @param {number} numeroInicial - Número inicial da faixa
   * @param {number} numeroFinal - Número final da faixa
   * @param {string} motivo - Motivo da inutilização
   * @returns {Promise<{ success: boolean, protocolo: string }>}
   */
  async inutilizar(serie, numeroInicial, numeroFinal, motivo) {
    throw new NotImplementedError("inutilizar");
  }

  /**
   * Baixa o PDF/DANFE de uma nota fiscal.
   *
   * @param {string} chaveAcesso - Chave de acesso da nota (44 dígitos)
   * @returns {Promise<Buffer>} - Buffer do PDF
   */
  async downloadDanfe(chaveAcesso) {
    throw new NotImplementedError("downloadDanfe");
  }

  /**
   * Baixa o XML de uma nota fiscal.
   *
   * @param {string} chaveAcesso - Chave de acesso da nota (44 dígitos)
   * @returns {Promise<string>} - String XML
   */
  async downloadXml(chaveAcesso) {
    throw new NotImplementedError("downloadXml");
  }
}

module.exports = { FiscalService, NotImplementedError };
