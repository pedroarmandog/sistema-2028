const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_FILE = path.join(__dirname, '..', 'data', 'tipo_entradas.json');

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const arr = JSON.parse(raw || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        console.warn('[tipoEntradasRoutes] falha ao ler arquivo:', e && e.message);
        return [];
    }
}

function writeData(arr) {
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
        try{ console.log('[tipoEntradas] arquivo gravado, total:', Array.isArray(arr)?arr.length:0); }catch(e){}
        return true;
    } catch (e) {
        console.error('[tipoEntradasRoutes] falha ao gravar arquivo:', e && e.message);
        return false;
    }
}

// GET / - listar tipos
router.get('/', (req, res) => {
    const data = readData();
    try{
        console.log('[tipoEntradas] GET / - retornando', Array.isArray(data) ? data.length : 0, 'itens');
    }catch(e){}
    return res.json(data);
});

// POST / - criar novo tipo { descricao, ativo }
router.post('/', (req, res) => {
    try {
        const body = req.body || {};
        console.log('[tipoEntradas] POST payload:', body);
        const descricao = (body.descricao || body.name || '').toString().trim();
        const ativo = body.ativo === undefined ? true : !!body.ativo;
        if (!descricao) return res.status(400).json({ message: 'Descrição inválida' });

        const arr = readData();
        // gerar id simples
        const id = Date.now();
        const item = { id, descricao, ativo };
        arr.push(item);
        if (!writeData(arr)) return res.status(500).json({ message: 'Não foi possível salvar' });
        console.log('[tipoEntradas] criado', item, 'total now', arr.length);
        return res.status(201).json(item);
    } catch (e) {
        console.error('POST /api/tipo-entradas error', e);
        return res.status(500).json({ message: 'Erro interno' });
    }
});

// PUT /:id - atualizar
router.put('/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        console.log('[tipoEntradas] PUT id:', req.params.id, 'payload:', req.body);
        if (!id) return res.status(400).json({ message: 'ID inválido' });
        const body = req.body || {};
        const descricao = (body.descricao || '').toString().trim();
        const ativo = body.ativo === undefined ? true : !!body.ativo;

        const arr = readData();
        const idx = arr.findIndex(x => Number(x.id) === id);
        if (idx === -1) return res.status(404).json({ message: 'Tipo não encontrado' });
        arr[idx].descricao = descricao || arr[idx].descricao;
        arr[idx].ativo = ativo;
        if (!writeData(arr)) return res.status(500).json({ message: 'Não foi possível salvar' });
        console.log('[tipoEntradas] atualizado', arr[idx], 'total now', arr.length);
        return res.json(arr[idx]);
    } catch (e) {
        console.error('PUT /api/tipo-entradas/:id error', e);
        return res.status(500).json({ message: 'Erro interno' });
    }
});

// DELETE /:id
router.delete('/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        console.log('[tipoEntradas] DELETE id:', req.params.id);
        if (!id) return res.status(400).json({ message: 'ID inválido' });
        const arr = readData();
        const idx = arr.findIndex(x => Number(x.id) === id);
        if (idx === -1) return res.status(404).json({ message: 'Tipo não encontrado' });
        const removed = arr.splice(idx, 1)[0];
        if (!writeData(arr)) return res.status(500).json({ message: 'Não foi possível salvar' });
        console.log('[tipoEntradas] removido', removed, 'total now', arr.length);
        return res.json({ message: 'Removido', removed });
    } catch (e) {
        console.error('DELETE /api/tipo-entradas/:id error', e);
        return res.status(500).json({ message: 'Erro interno' });
    }
});

module.exports = router;
