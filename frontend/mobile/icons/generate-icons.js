/**
 * Gerador de icones PWA para o PetHub Mobile
 * Usa pngjs (disponivel como dependencia transitiva no projeto).
 *
 * Execucao: node frontend/mobile/icons/generate-icons.js
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const ICONS_DIR = path.join(__dirname);

// Tamanhos necessarios para Android, iOS e Desktop
const TAMANHOS = [72, 96, 128, 144, 152, 180, 192, 256, 512];

// Paleta PetHub
const COR_BG = { r: 10, g: 22, b: 40, a: 255 }; // #0a1628
const COR_GREEN = { r: 0, g: 214, b: 143, a: 255 }; // #00d68f

// --- Funcoes de desenho ---

function setPixel(data, width, x, y, cor) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const idx = (y * width + x) * 4;
  data[idx] = cor.r;
  data[idx + 1] = cor.g;
  data[idx + 2] = cor.b;
  data[idx + 3] = cor.a;
}

function setPixelAA(data, width, x, y, cor, cobertura) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const idx = (y * width + x) * 4;
  const newAlpha = (cor.a / 255) * cobertura;
  const existAlpha = data[idx + 3] / 255;
  const outA = newAlpha + existAlpha * (1 - newAlpha);
  if (outA > 0) {
    data[idx] = Math.round(
      (cor.r * newAlpha + data[idx] * existAlpha * (1 - newAlpha)) / outA,
    );
    data[idx + 1] = Math.round(
      (cor.g * newAlpha + data[idx + 1] * existAlpha * (1 - newAlpha)) / outA,
    );
    data[idx + 2] = Math.round(
      (cor.b * newAlpha + data[idx + 2] * existAlpha * (1 - newAlpha)) / outA,
    );
    data[idx + 3] = Math.round(outA * 255);
  }
}

function fillCircle(data, size, cx, cy, r, cor) {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(size - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(size - 1, Math.ceil(cy + r + 1));

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (dist <= r - 0.5) {
        setPixel(data, size, px, py, cor);
      } else if (dist <= r + 0.5) {
        setPixelAA(data, size, px, py, cor, r + 0.5 - dist);
      }
    }
  }
}

function fillEllipse(data, size, cx, cy, rx, ry, rot, cor) {
  const cosA = Math.cos(-rot);
  const sinA = Math.sin(-rot);
  const margin = Math.max(rx, ry) + 1;
  const x0 = Math.max(0, Math.floor(cx - margin));
  const x1 = Math.min(size - 1, Math.ceil(cx + margin));
  const y0 = Math.max(0, Math.floor(cy - margin));
  const y1 = Math.min(size - 1, Math.ceil(cy + margin));

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const lx = dx * cosA - dy * sinA;
      const ly = dx * sinA + dy * cosA;
      const dist = (lx / rx) ** 2 + (ly / ry) ** 2;
      if (dist <= 0.9025) {
        setPixel(data, size, px, py, cor);
      } else if (dist <= 1.1025) {
        const cov = Math.max(0, Math.min(1, (1.1025 - dist) / 0.2));
        setPixelAA(data, size, px, py, cor, cov);
      }
    }
  }
}

function desenharIcone(data, size, maskable) {
  const cx = size / 2;
  const cy = size / 2;
  const ps = size * (maskable ? 0.6 : 0.8);
  const norm = ps / 200;

  fillCircle(data, size, cx, cy, size / 2, COR_BG);
  fillEllipse(
    data,
    size,
    cx,
    cy + 55 * norm,
    75 * norm,
    65 * norm,
    0,
    COR_GREEN,
  );
  fillEllipse(
    data,
    size,
    cx - 85 * norm,
    cy - 25 * norm,
    28 * norm,
    35 * norm,
    -0.35,
    COR_GREEN,
  );
  fillEllipse(
    data,
    size,
    cx - 35 * norm,
    cy - 55 * norm,
    26 * norm,
    33 * norm,
    -0.09,
    COR_GREEN,
  );
  fillEllipse(
    data,
    size,
    cx + 18 * norm,
    cy - 60 * norm,
    26 * norm,
    33 * norm,
    0.09,
    COR_GREEN,
  );
  fillEllipse(
    data,
    size,
    cx + 68 * norm,
    cy - 35 * norm,
    26 * norm,
    33 * norm,
    0.35,
    COR_GREEN,
  );
}

function desenharBadge(data, size) {
  fillCircle(data, size, size / 2, size / 2, size / 2, COR_GREEN);
}

function gerarPNG(size, drawFn, outPath) {
  const png = new PNG({ width: size, height: size, filterType: -1 });
  png.data.fill(0);
  drawFn(png.data, size);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outPath, buffer);
  const kb = Math.round(buffer.length / 1024);
  console.log(
    "  OK " +
      path.basename(outPath) +
      " (" +
      size +
      "x" +
      size +
      "px, " +
      kb +
      "KB)",
  );
}

// --- Executar geracao ---

console.log("\nGerando icones PWA do PetHub...\n");

for (const size of TAMANHOS) {
  gerarPNG(
    size,
    (data, s) => desenharIcone(data, s, false),
    path.join(ICONS_DIR, "icon-" + size + ".png"),
  );
}

gerarPNG(
  512,
  (data, s) => desenharIcone(data, s, true),
  path.join(ICONS_DIR, "icon-maskable.png"),
);
gerarPNG(
  72,
  (data, s) => desenharBadge(data, s),
  path.join(ICONS_DIR, "badge-72.png"),
);

console.log("\nTodos os icones gerados com sucesso!\n");
