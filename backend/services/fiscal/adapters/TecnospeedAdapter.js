"use strict";

const { FiscalService } = require("../FiscalService");

/**
 * TecnospeedAdapter — Adapter para o provedor Tecnospeed / NF-e API
 *
 * Stub: assinatura dos métodos implementada.
 * Documentação do provedor: https://tecnospeed.com.br/nfe-api
 */

class TecnospeedAdapter extends FiscalService {
  constructor(config) {
    super(config);
    this.provedor = "tecnospeed";
    // this.baseUrl = "https://nfe.tecnospeedcloud.com.br"; // descomente ao implementar
    // this.token = config.token_api;
  }

  async transmitir(payload) {
    throw new Error(
      "TecnospeedAdapter.transmitir: não implementado. " +
        "Integração com Tecnospeed ainda não foi contratada/configurada.",
    );
  }

  async consultar(chaveOuRequisicao) {
    throw new Error("TecnospeedAdapter.consultar: não implementado.");
  }

  async cancelar(chaveAcesso, motivo) {
    throw new Error("TecnospeedAdapter.cancelar: não implementado.");
  }

  async inutilizar(serie, numeroInicial, numeroFinal, motivo) {
    throw new Error("TecnospeedAdapter.inutilizar: não implementado.");
  }

  async downloadDanfe(chaveAcesso) {
    throw new Error("TecnospeedAdapter.downloadDanfe: não implementado.");
  }

  async downloadXml(chaveAcesso) {
    throw new Error("TecnospeedAdapter.downloadXml: não implementado.");
  }
}

module.exports = TecnospeedAdapter;
