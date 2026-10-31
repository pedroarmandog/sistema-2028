"use strict";

const { FiscalService } = require("../FiscalService");

/**
 * PlugNotasAdapter — Adapter para o provedor PlugNotas
 *
 * Stub: assinatura dos métodos implementada.
 * A lógica real de integração (chamadas HTTP, formatação de payload)
 * deve ser adicionada aqui quando a integração for contratada.
 *
 * Documentação do provedor: https://plugnotas.com.br/docs
 *
 * Para implementar:
 *   1. Adicionar dependência HTTP (axios ou similar)
 *   2. Mapear FiscalPayloadBuilder → formato PlugNotas
 *   3. Implementar tratamento de erros e retentativas
 *   4. Implementar callback/webhook de retorno assíncrono
 */

class PlugNotasAdapter extends FiscalService {
  constructor(config) {
    super(config);
    this.provedor = "plugnotas";
    // this.baseUrl = "https://api.plugnotas.com.br"; // descomente ao implementar
    // this.apiKey = config.token_api; // token descriptografado pela camada de serviço
  }

  async transmitir(payload) {
    throw new Error(
      "PlugNotasAdapter.transmitir: não implementado. " +
        "Integração com PlugNotas ainda não foi contratada/configurada.",
    );
  }

  async consultar(chaveOuRequisicao) {
    throw new Error("PlugNotasAdapter.consultar: não implementado.");
  }

  async cancelar(chaveAcesso, motivo) {
    throw new Error("PlugNotasAdapter.cancelar: não implementado.");
  }

  async inutilizar(serie, numeroInicial, numeroFinal, motivo) {
    throw new Error("PlugNotasAdapter.inutilizar: não implementado.");
  }

  async downloadDanfe(chaveAcesso) {
    throw new Error("PlugNotasAdapter.downloadDanfe: não implementado.");
  }

  async downloadXml(chaveAcesso) {
    throw new Error("PlugNotasAdapter.downloadXml: não implementado.");
  }
}

module.exports = PlugNotasAdapter;
