(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PortalVisual = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const ASSET = "/cliente-app/assets/boas-vindas.webp";
  const AREAS = Object.freeze({
    boasVindas: {
      nome: "Boas-vindas",
      resolucao: "1080 × 1350 px",
      titulo: "Seu cuidado começa aqui",
      texto: "Agende serviços, acompanhe o histórico e cuide de quem você ama.",
    },
    inicio: {
      nome: "Início",
      resolucao: "1200 × 600 px",
      titulo: "Olá, {nome_cliente}!",
      texto: "Um espaço só seu, para cuidar de {nome_pet} com todo o carinho.",
    },
    agendamento: {
      nome: "Agendamento",
      resolucao: "1200 × 500 px",
      titulo: "Vamos marcar?",
      texto:
        "Escolha os detalhes do cuidado do seu pet e envie sua solicitação.",
    },
    historico: {
      nome: "Histórico",
      resolucao: "1200 × 500 px",
      titulo: "Uma história de carinho",
      texto: "Cada encontro e cada cuidado, registrados em {nome_empresa}.",
    },
    pet: {
      nome: "Perfil do pet",
      resolucao: "800 × 800 px",
      titulo: "{nome_pet}",
      texto: "Uma história de cuidado e companhia.",
    },
    solicitacoes: {
      nome: "Solicitações",
      resolucao: "1200 × 500 px",
      titulo: "Meus pedidos",
      texto: "Acompanhe suas solicitações e as respostas da equipe.",
    },
  });
  const CAMPOS = Object.keys(AREAS);
  const padrao = () =>
    Object.fromEntries(
      CAMPOS.map((k) => [
        k,
        {
          titulo: AREAS[k].titulo,
          texto: AREAS[k].texto,
          modo: "ilustracao",
          ocultarTextos: false,
          x: 50,
          y: 50,
          imagem: ASSET,
          personalizada: false,
        },
      ]),
    );
  function validarItem(b) {
    if (
      !b ||
      typeof b !== "object" ||
      Array.isArray(b) ||
      Object.keys(b).some(
        (k) =>
          !["titulo", "texto", "modo", "ocultarTextos", "x", "y"].includes(k),
      )
    )
      throw Error("Configuração visual inválida.");
    const r = {};
    for (const [k, max] of [
      ["titulo", 120],
      ["texto", 350],
    ]) {
      if (
        typeof b[k] !== "string" ||
        b[k].length > max ||
        /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(b[k])
      )
        throw Error("Confira o " + k + " do banner.");
      for (const token of b[k].matchAll(/\{([^{}]+)\}/g))
        if (!["nome_cliente", "nome_empresa", "nome_pet"].includes(token[1]))
          throw Error("Variável desconhecida: " + token[0]);
      r[k] = b[k].trim();
    }
    if (
      !["ilustracao", "banner"].includes(b.modo) ||
      typeof b.ocultarTextos !== "boolean"
    )
      throw Error("Modo do banner inválido.");
    r.modo = b.modo;
    r.ocultarTextos = b.ocultarTextos;
    for (const k of ["x", "y"]) {
      if (
        typeof b[k] !== "number" ||
        !Number.isFinite(b[k]) ||
        b[k] < 0 ||
        b[k] > 100
      )
        throw Error("Enquadramento inválido.");
      r[k] = Math.round(b[k]);
    }
    return r;
  }
  function interpolar(texto, values = {}) {
    return String(texto || "")
      .replace(/\bpet[\s_-]+cria\b/gi, () => String(values.nome_empresa || "seu pet shop"))
      .replace(
      /\{(nome_cliente|nome_empresa|nome_pet)\}/g,
      (_, k) =>
        String(
          values[k] ||
            {
              nome_cliente: "tutor",
              nome_empresa: "seu pet shop",
              nome_pet: "seu pet",
            }[k],
        ),
    );
  }
  function normalizar(dados) {
    const r = padrao();
    for (const k of CAMPOS) {
      const b = dados?.[k];
      if (!b) continue;
      try {
        const item = validarItem(
          Object.fromEntries(
            ["titulo", "texto", "modo", "ocultarTextos", "x", "y"].map((n) => [
              n,
              b[n],
            ]),
          ),
        );
        Object.assign(r[k], item);
        if (
          typeof b.imagem === "string" &&
          /^\/api\/cliente-(?:app\/loja\/[a-f0-9-]{36}|portal\/aparencia)\/visual\/[a-zA-Z]+(?:\?v=\d+)?$/.test(
            b.imagem,
          )
        ) {
          r[k].imagem = b.imagem;
          r[k].personalizada = true;
        }
      } catch {}
    }
    return r;
  }
  return { ASSET, AREAS, CAMPOS, padrao, validarItem, interpolar, normalizar };
});
