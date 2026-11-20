(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PortalTema = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const PADRAO = Object.freeze({
      principal: "#FFAA33",
      secundaria: "#142A40",
      fundo: "#F7F8FB",
      superficie: "#FFFFFF",
      texto: "#203449",
    }),
    CAMPOS = Object.keys(PADRAO);
  function validar(cores) {
    if (
      !cores ||
      typeof cores !== "object" ||
      Array.isArray(cores) ||
      Object.keys(cores).length !== CAMPOS.length ||
      Object.keys(cores).some((k) => !CAMPOS.includes(k))
    )
      throw Error("Informe as cinco cores da paleta.");
    const r = {};
    for (const k of CAMPOS) {
      if (typeof cores[k] !== "string" || !/^#[0-9a-f]{6}$/i.test(cores[k]))
        throw Error("Use cores no formato #RRGGBB.");
      r[k] = cores[k].toUpperCase();
    }
    return r;
  }
  function normalizar(cores) {
    try {
      return validar(cores);
    } catch {
      return { ...PADRAO };
    }
  }
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  function luminosidade(c) {
    return rgb(c)
      .map((n) => {
        const x = n / 255;
        return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      })
      .reduce((s, n, i) => s + n * [0.2126, 0.7152, 0.0722][i], 0);
  }
  function contraste(a, b) {
    const x = luminosidade(a),
      y = luminosidade(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function legivel(c, f) {
    if (contraste(c, f) >= 4.5) return c;
    return contraste("#FFFFFF", f) > contraste("#000000", f)
      ? "#FFFFFF"
      : "#000000";
  }
  function misturar(a, b, p) {
    const x = rgb(a),
      y = rgb(b);
    return (
      "#" +
      x
        .map((v, i) =>
          Math.round(v * p + y[i] * (1 - p))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
        .toUpperCase()
    );
  }
  function tokens(cores) {
    const c = normalizar(cores),
      soft = misturar(c.principal, c.superficie, 0.14),
      texto = legivel(c.texto, c.fundo),
      card = legivel(c.texto, c.superficie);
    return {
      "--orange": c.principal,
      "--navy": c.secundaria,
      "--bg": c.fundo,
      "--surface": c.superficie,
      "--text": texto,
      "--card-text": card,
      "--card-muted": legivel(misturar(card, c.superficie, 0.7), c.superficie),
      "--muted": legivel(misturar(texto, c.fundo, 0.7), c.fundo),
      "--line": misturar(card, c.superficie, 0.18),
      "--primary-soft": soft,
      "--hero-text": legivel(c.texto, soft),
      "--primary-text": legivel("#14283E", c.principal),
      "--secondary-text": legivel("#FFFFFF", c.secundaria),
      "--accent-text": legivel(c.principal, c.superficie),
      "--soft-text": legivel(c.principal, soft),
      "--secondary-soft": misturar(c.secundaria, c.superficie, 0.08),
    };
  }
  function aplicar(target, paleta) {
    const el = target.documentElement || target,
      c = normalizar(paleta?.cores || paleta);
    for (const [k, v] of Object.entries(tokens(c))) el.style.setProperty(k, v);
    if (target.documentElement) {
      const meta = target.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = c.secundaria;
    }
    return c;
  }
  return { PADRAO, CAMPOS, validar, normalizar, tokens, contraste, aplicar };
});
