"use strict";

const PlugNotasAdapter = require("./adapters/PlugNotasAdapter");
const FocusNFeAdapter = require("./adapters/FocusNFeAdapter");
const ENotasAdapter = require("./adapters/ENotasAdapter");
const TecnospeedAdapter = require("./adapters/TecnospeedAdapter");

/**
 * FiscalServiceFactory
 *
 * Seleciona e instancia o adapter correto baseado em ConfiguracaoFiscal.provedor_api.
 * É o único ponto do sistema que conhece os adapters concretos.
 *
 * USO:
 *   const config = await ConfiguracaoFiscal.findOne({ where: { empresa_id } });
 *   const service = FiscalServiceFactory.create(config);
 *   const payload = FiscalPayloadBuilder.buildNFe(venda, empresa, config, cliente);
 *   await service.transmitir(payload);
 *
 * ADICIONAR NOVO PROVEDOR:
 *   1. Criar backend/services/fiscal/adapters/NovoProvedorAdapter.js
 *   2. Adicionar case abaixo
 *   3. Adicionar valor ao ENUM em ConfiguracaoFiscal.provedor_api (e migration)
 */

class FiscalServiceFactory {
  /**
   * @param {object} config - Instância de ConfiguracaoFiscal
   * @returns {FiscalService} Adapter do provedor configurado
   * @throws {Error} Se provedor não estiver configurado ou não for reconhecido
   */
  static create(config) {
    if (!config) {
      throw new Error(
        "FiscalServiceFactory: configuração fiscal não encontrada para esta empresa. " +
          "Configure o módulo fiscal em Configurações → Fiscal.",
      );
    }

    if (!config.provedor_api) {
      throw new Error(
        "FiscalServiceFactory: nenhum provedor de emissão fiscal selecionado. " +
          "Acesse Configurações → Fiscal e selecione um provedor.",
      );
    }

    switch (config.provedor_api) {
      case "plugnotas":
        return new PlugNotasAdapter(config);

      case "focusnfe":
        return new FocusNFeAdapter(config);

      case "enotas":
        return new ENotasAdapter(config);

      case "tecnospeed":
        return new TecnospeedAdapter(config);

      default:
        throw new Error(
          `FiscalServiceFactory: provedor "${config.provedor_api}" não reconhecido. ` +
            "Provedores disponíveis: plugnotas, focusnfe, enotas, tecnospeed.",
        );
    }
  }

  /**
   * Lista os provedores suportados.
   * @returns {string[]}
   */
  static provedoresDisponiveis() {
    return ["plugnotas", "focusnfe", "enotas", "tecnospeed"];
  }
}

module.exports = FiscalServiceFactory;
