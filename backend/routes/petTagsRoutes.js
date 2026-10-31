const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const TAGS_FILE = path.join(__dirname, "../../data/pet_tags.json");

const TAGS_PADRAO = [
  "Sociável",
  "Brincalhão",
  "Calmo",
  "Protetor",
  "Amigável",
  "Independente",
  "Dócil",
  "Ativo",
  "Carinhoso",
  "Alerta",
];

function lerTags() {
  try {
    if (fs.existsSync(TAGS_FILE)) {
      const conteudo = fs.readFileSync(TAGS_FILE, "utf8");
      const dados = JSON.parse(conteudo);
      // Mesclar padrão + customizadas, sem duplicatas
      const todas = [...new Set([...TAGS_PADRAO, ...(dados.custom || [])])];
      return { padrao: TAGS_PADRAO, custom: dados.custom || [], todas };
    }
  } catch (e) {
    console.error("Erro ao ler pet_tags.json:", e.message);
  }
  return { padrao: TAGS_PADRAO, custom: [], todas: [...TAGS_PADRAO] };
}

function salvarCustomTags(customTags) {
  try {
    fs.writeFileSync(
      TAGS_FILE,
      JSON.stringify({ custom: customTags }, null, 2),
      "utf8",
    );
  } catch (e) {
    console.error("Erro ao salvar pet_tags.json:", e.message);
  }
}

// GET /api/pet-tags — retorna todas as tags (padrão + customizadas)
router.get("/", (req, res) => {
  const { todas, padrao, custom } = lerTags();
  res.json({ success: true, tags: todas, padrao, custom });
});

// POST /api/pet-tags — adiciona uma nova tag customizada
router.post("/", (req, res) => {
  const { tag } = req.body;
  if (!tag || typeof tag !== "string" || !tag.trim()) {
    return res.status(400).json({ success: false, error: "Tag inválida" });
  }
  const nomeTag = tag.trim();
  const { custom, todas } = lerTags();

  // Verificar se já existe (case-insensitive)
  const jaExiste = todas.some((t) => t.toLowerCase() === nomeTag.toLowerCase());
  if (jaExiste) {
    return res.json({ success: true, tag: nomeTag, jaExistia: true });
  }

  custom.push(nomeTag);
  salvarCustomTags(custom);
  res.json({ success: true, tag: nomeTag, jaExistia: false });
});

// DELETE /api/pet-tags/:tag — remove uma tag customizada
router.delete("/:tag", (req, res) => {
  const nomeTag = decodeURIComponent(req.params.tag);
  const { custom } = lerTags();
  const novasCustom = custom.filter(
    (t) => t.toLowerCase() !== nomeTag.toLowerCase(),
  );
  salvarCustomTags(novasCustom);
  res.json({ success: true });
});

module.exports = router;
