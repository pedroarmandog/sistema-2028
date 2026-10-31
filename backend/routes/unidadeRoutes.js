const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'unidades.json');

function ensureDataFile(){
    try{
        if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true });
        if(!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([], null, 2), 'utf8');
    }catch(e){ console.error('Erro garantindo data file unidades:', e); }
}

function readUnidades(){
    try{
        ensureDataFile();
        const raw = fs.readFileSync(FILE, 'utf8');
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
    }catch(e){ console.error('Erro lendo unidades:', e); return []; }
}

function writeUnidades(arr){
    try{
        ensureDataFile();
        fs.writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8');
        return true;
    }catch(e){ console.error('Erro escrevendo unidades:', e); return false; }
}

function makeSlug(s){
    try{
        return (s||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    }catch(e){
        return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    }
}

// GET /api/unidades -> lista
router.get('/', (req,res)=>{
    const arr = readUnidades();
    res.json(arr);
});

// POST /api/unidades -> criar
router.post('/', (req,res)=>{
    try{
        const descricao = (req.body.descricao || '').toString().trim();
        const unidade = (req.body.unidade || '').toString().trim();
        const pesavel = !!req.body.pesavel;
        const ativo = (req.body.ativo === undefined) ? true : !!req.body.ativo;
        if(!descricao) return res.status(400).json({ error: 'descricao é obrigatória' });

        const arr = readUnidades();
        const id = Date.now().toString() + Math.floor(Math.random()*1000);
        const slug = makeSlug(descricao) + '-' + id;

        const novo = { id: id, descricao: descricao, unidade: unidade, pesavel: pesavel, ativo: ativo, slug: slug };
        arr.push(novo);
        if(!writeUnidades(arr)) return res.status(500).json({ error: 'falha ao salvar' });
        console.log('✅ Unidade criada:', novo.descricao);
        return res.status(201).json(novo);
    }catch(e){ console.error('POST /api/unidades erro', e); return res.status(500).json({ error: 'erro interno' }); }
});

// PUT /api/unidades/:idOrSlug -> atualizar
router.put('/:idOrSlug', (req,res)=>{
    try{
        const idOrSlug = (req.params.idOrSlug||'').toString().trim();
        if(!idOrSlug) return res.status(400).json({ error: 'id/slug obrigatório' });
        const arr = readUnidades();
        const idx = arr.findIndex(u => (u.id||'') === idOrSlug || (u.slug||'') === idOrSlug || makeSlug(u.descricao||'') === idOrSlug);
        if(idx === -1) return res.status(404).json({ error: 'unidade não encontrada' });

        const data = req.body || {};
        const descricao = (data.descricao !== undefined) ? String(data.descricao).trim() : arr[idx].descricao;
        const unidadeVal = (data.unidade !== undefined) ? String(data.unidade).trim() : arr[idx].unidade;
        const pesavel = (data.pesavel !== undefined) ? !!data.pesavel : !!arr[idx].pesavel;
        const ativo = (data.ativo !== undefined) ? !!data.ativo : !!arr[idx].ativo;

        arr[idx].descricao = descricao;
        arr[idx].unidade = unidadeVal;
        arr[idx].pesavel = pesavel;
        arr[idx].ativo = ativo;

        if(!writeUnidades(arr)) return res.status(500).json({ error: 'falha ao salvar' });
        console.log('✅ Unidade atualizada:', arr[idx].descricao);
        return res.json(arr[idx]);
    }catch(e){ console.error('PUT /api/unidades/:idOrSlug erro', e); return res.status(500).json({ error: 'erro interno' }); }
});

// DELETE /api/unidades/:idOrSlug -> remover
router.delete('/:idOrSlug', (req,res)=>{
    try{
        const idOrSlug = (req.params.idOrSlug||'').toString().trim();
        if(!idOrSlug) return res.status(400).json({ error: 'id/slug é obrigatório' });
        const arr = readUnidades();
        const idx = arr.findIndex(u => (u.id||'') === idOrSlug || (u.slug||'') === idOrSlug || makeSlug(u.descricao||'') === idOrSlug);
        if(idx === -1) return res.status(404).json({ error: 'unidade não encontrada' });
        const removed = arr.splice(idx,1)[0];
        if(!writeUnidades(arr)) return res.status(500).json({ error: 'falha ao salvar' });
        console.log('✅ Unidade removida:', removed.descricao);
        return res.json({ success: true, removed });
    }catch(e){ console.error('DELETE /api/unidades/:idOrSlug erro', e); return res.status(500).json({ error: 'erro interno' }); }
});

module.exports = router;
