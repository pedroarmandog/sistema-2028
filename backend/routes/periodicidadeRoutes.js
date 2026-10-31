const express = require('express');
const router = express.Router();

const { Periodicidade } = require('../models');

// Listar todas as periodicidades
router.get('/', async (req, res) => {
    try {
        const rows = await Periodicidade.findAll({ order: [['id','ASC']] });
        return res.json(rows.map(r => r.toJSON()));
    } catch (err) {
        console.error('Erro GET /api/periodicidades', err);
        return res.status(500).json({ error: 'Erro ao listar periodicidades' });
    }
});

// Buscar por id
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const row = await Periodicidade.findByPk(id);
        if (!row) return res.status(404).json({ error: 'Periodicidade não encontrada' });
        return res.json(row.toJSON());
    } catch (err) {
        console.error('Erro GET /api/periodicidades/:id', err);
        return res.status(500).json({ error: 'Erro ao buscar periodicidade' });
    }
});

// Criar
router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const descricao = (body.descricao || '').trim();
        const dias = parseInt(body.dias, 10);
        const ativo = body.ativo === undefined ? true : !!body.ativo;

        if (!descricao) return res.status(400).json({ error: 'descricao é obrigatório' });
        if (!Number.isInteger(dias) || dias <= 0) return res.status(400).json({ error: 'dias inválido' });

        const created = await Periodicidade.create({ descricao, dias, ativo });
        return res.status(201).json(created.toJSON());
    } catch (err) {
        console.error('Erro POST /api/periodicidades', err);
        return res.status(500).json({ error: 'Erro ao criar periodicidade' });
    }
});

// Atualizar
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body || {};
        const descricao = body.descricao !== undefined ? String(body.descricao).trim() : undefined;
        const dias = body.dias !== undefined ? parseInt(body.dias, 10) : undefined;
        const ativo = body.ativo !== undefined ? !!body.ativo : undefined;

        const existing = await Periodicidade.findByPk(id);
        if (!existing) return res.status(404).json({ error: 'Periodicidade não encontrada' });

        const updateData = {};
        if (descricao !== undefined) updateData.descricao = descricao;
        if (dias !== undefined) {
            if (!Number.isInteger(dias) || dias <= 0) return res.status(400).json({ error: 'dias inválido' });
            updateData.dias = dias;
        }
        if (ativo !== undefined) updateData.ativo = ativo;

        await existing.update(updateData);
        return res.json(existing.toJSON());
    } catch (err) {
        console.error('Erro PUT /api/periodicidades/:id', err);
        return res.status(500).json({ error: 'Erro ao atualizar periodicidade' });
    }
});

// Deletar
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await Periodicidade.destroy({ where: { id } });
        if (deleted > 0) return res.json({ success: true });
        return res.status(404).json({ error: 'Periodicidade não encontrada' });
    } catch (err) {
        console.error('Erro DELETE /api/periodicidades/:id', err);
        return res.status(500).json({ error: 'Erro ao deletar periodicidade' });
    }
});

module.exports = router;
