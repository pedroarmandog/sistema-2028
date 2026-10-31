"use strict";

const { FiscalService } = require("../FiscalService");

/**
 * ENotasAdapter — Adapter para o provedor eNotas
 *
 * Stub: assinatura dos métodos implementada.
 * Documentação do provedor: https://enotas.com.br/docs
 */

class ENotasAdapter extends FiscalService {
  constructor(config) {
    super(config);
    this.provedor = "enotas";
    // this.baseUrl = "https://app.enotas.com.br/api"; // descomente ao implementar
    // this.apiKey = config.token_api;
  }

  async transmitir(payload) {
    throw new Error(
      "ENotasAdapter.transmitir: não implementado. " +
        "Integração com eNotas ainda não foi contratada/configurada.",
    );
  }

  async consultar(chaveOuRequisicao) {
    throw new Error("ENotasAdapter.consultar: não implementado.");
  }

  async cancelar(chaveAcesso, motivo) {
    throw new Error("ENotasAdapter.cancelar: não implementado.");
  }

  async inutilizar(serie, numeroInicial, numeroFinal, motivo) {
    throw new Error("ENotasAdapter.inutilizar: não implementado.");
  }

  async downloadDanfe(chaveAcesso) {
    throw new Error("ENotasAdapter.downloadDanfe: não implementado.");
  }

  async downloadXml(chaveAcesso) {
    throw new Error("ENotasAdapter.downloadXml: não implementado.");
  }
}

module.exports = ENotasAdapter;
