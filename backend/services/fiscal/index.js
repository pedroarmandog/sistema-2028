"use strict";

/**
 * Ponto de entrada da camada de integração fiscal
 *
 * Exporta os componentes principais da arquitetura Adapter/Service:
 *
 *   FiscalService        — Contrato/interface que os adapters devem implementar
 *   FiscalPayloadBuilder — Monta payload normalizado (provider-agnostic) a partir dos dados do sistema
 *   FiscalServiceFactory — Seleciona e instancia o adapter correto pelo provedor configurado
 *
 * USO:
 *   const { FiscalPayloadBuilder, FiscalServiceFactory } = require('../services/fiscal');
 *
 *   const config = await ConfiguracaoFiscal.findOne({ where: { empresa_id } });
 *   const payload = FiscalPayloadBuilder.buildNFe(venda, empresa, config, cliente);
 *   const service = FiscalServiceFactory.create(config);
 *   // await service.transmitir(payload); // não implementado ainda — aguarda integração
 */

const { FiscalService, NotImplementedError } = require("./FiscalService");
const FiscalPayloadBuilder = require("./FiscalPayloadBuilder");
const FiscalServiceFactory = require("./FiscalServiceFactory");

module.exports = {
  FiscalService,
  NotImplementedError,
  FiscalPayloadBuilder,
  FiscalServiceFactory,
};
