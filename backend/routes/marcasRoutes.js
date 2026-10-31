const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_FILE = path.join(__dirname, '..', 'data', 'marcas.json');

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const arr = JSON.parse(raw || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        console.warn('[marcasRoutes] falha ao ler arquivo:', e && e.message);
        return [];
    }
}

function writeData(arr) {
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[marcasRoutes] falha ao gravar arquivo:', e && e.message);
        return false;
    }
}

// Listar marcas (retorna array de strings)
router.get('/', (req, res) => {
    const data = readData();
    return res.json(data);
});

// Criar nova marca - aceita { nome: '...' } ou string no body
router.post('/', (req, res) => {
    let nome = req.body;
    if (typeof nome === 'object' && nome !== null) nome = nome.nome || nome.name || '';
    if (typeof nome !== 'string') nome = String(nome || '');
    nome = nome.trim();
    if (!nome) return res.status(400).json({ message: 'Nome inválido' });

    const arr = readData();
    if (arr.includes(nome)) return res.status(409).json({ message: 'Marca já existe' });
    arr.push(nome);
    arr.sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' }));
    if (!writeData(arr)) return res.status(500).json({ message: 'Não foi possível salvar' });
    return res.status(201).json({ message: 'Marca criada', nome });
});

// Atualizar marca: usar nome antigo na URL (url-encoded) e body { nome: 'novo' }
router.put('/:old', (req, res) => {
    const old = decodeURIComponent(req.params.old || '');
    const novo = (req.body && (req.body.nome || req.body.name)) || req.body || '';
    const novoStr = (typeof novo === 'string' ? novo : String(novo || '')).trim();
    if (!old) return res.status(400).json({ message: 'Marca antiga inválida' });
    if (!novoStr) return res.status(400).json({ message: 'Novo nome inválido' });

    const arr = readData();
    const idx = arr.indexOf(old);
    if (idx === -1) return res.status(404).json({ message: 'Marca não encontrada' });
    if (arr.includes(novoStr) && novoStr !== old) return res.status(409).json({ message: 'Marca já existe' });

    arr[idx] = novoStr;
    arr.sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' }));
    if (!writeData(arr)) return res.status(500).json({ message: 'Não foi possível salvar' });
    return res.json({ message: 'Marca atualizada', novo: novoStr });
});

// Deletar marca por nome (url-encoded)
router.delete('/:name', (req, res) => {
    const name = decodeURIComponent(req.params.name || '');
    if (!name) return res.status(400).json({ message: 'Nome inválido' });
    const arr = readData();
    const idx = arr.indexOf(name);
    if (idx === -1) return res.status(404).json({ message: 'Marca não encontrada' });
    arr.splice(idx, 1);
    if (!writeData(arr)) return res.status(500).json({ message: 'Não foi possível salvar' });
    return res.json({ message: 'Marca excluída', nome: name });
});

module.exports = router;
