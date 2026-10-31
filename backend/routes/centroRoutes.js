const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'centros.json');

function ensureDataFile(){
    try{
        if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true });
        if(!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2), 'utf8');
    }catch(e){ console.error('Erro garantindo data file centros:', e); }
}

function readCentros(){
    try{
        ensureDataFile();
        const raw = fs.readFileSync(FILE, 'utf8');
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
    }catch(e){ console.error('Erro lendo centros:', e); return []; }
}

function writeCentros(arr){
    try{
        ensureDataFile();
        fs.writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8');
        return true;
    }catch(e){ console.error('Erro escrevendo centros:', e); return false; }
}

function makeSlug(s){
    try{
        return (s||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    }catch(e){
        return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    }
}

// GET /api/centros  -> lista
router.get('/', (req,res)=>{
    const arr = readCentros();
    res.json(arr);
});

// POST /api/centros -> { descricao, unidade }
router.post('/', (req,res)=>{
    try{
        const descricao = (req.body.descricao || req.body.display || '').toString().trim();
        const unidade = (req.body.unidade || req.body.unidadeNegocio || '').toString().trim();
        if(!descricao) return res.status(400).json({ error: 'descricao é obrigatória' });

        const arr = readCentros();
        const slug = makeSlug(descricao);
        if(arr.find(c=> (c.descricao||c.display||'').toString().trim().toLowerCase() === descricao.toLowerCase() || (c.slug||'') === slug)){
            return res.status(409).json({ error: 'centro já existe' });
        }

        const novo = { descricao: descricao, unidade: unidade, slug: slug };
        arr.push(novo);
        if(!writeCentros(arr)) return res.status(500).json({ error: 'falha ao salvar' });
        return res.status(201).json(novo);
    }catch(e){ console.error('POST /api/centros erro', e); return res.status(500).json({ error: 'erro interno' }); }
});

// DELETE /api/centros/:slug -> remove centro
router.delete('/:slug', (req,res)=>{
    try{
        const slug = (req.params.slug||'').toString().trim();
        if(!slug) return res.status(400).json({ error: 'slug é obrigatório' });
        
        const arr = readCentros();
        const idx = arr.findIndex(c => (c.slug||'') === slug || makeSlug(c.descricao||c.display||'') === slug);
        
        if(idx === -1) return res.status(404).json({ error: 'centro não encontrado' });
        
        const removed = arr.splice(idx, 1)[0];
        if(!writeCentros(arr)) return res.status(500).json({ error: 'falha ao salvar' });
        
        console.log('🗑️ Centro removido:', removed.descricao, '(slug:', slug, ')');
        return res.json({ success: true, removed: removed });
    }catch(e){ 
        console.error('DELETE /api/centros/:slug erro', e); 
        return res.status(500).json({ error: 'erro interno' }); 
    }
});

module.exports = router;
