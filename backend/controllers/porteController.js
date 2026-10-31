const Porte = require('../models/Porte');

// GET /api/portes - Listar todos os portes
exports.getAll = async (req, res) => {
    try {
        const portes = await Porte.findAll({
            order: [['nome', 'ASC']]
        });
        res.json(portes);
    } catch (error) {
        console.error('Erro ao buscar portes:', error);
        res.status(500).json({ error: 'Erro ao buscar portes' });
    }
};

// GET /api/portes/:id - Buscar porte por ID
exports.getById = async (req, res) => {
    try {
        const porte = await Porte.findByPk(req.params.id);
        if (!porte) {
            return res.status(404).json({ error: 'Porte não encontrado' });
        }
        res.json(porte);
    } catch (error) {
        console.error('Erro ao buscar porte:', error);
        res.status(500).json({ error: 'Erro ao buscar porte' });
    }
};

// POST /api/portes - Criar novo porte
exports.create = async (req, res) => {
    try {
        const { nome, descricao } = req.body;
        const porte = await Porte.create({ nome, descricao });
        res.status(201).json(porte);
    } catch (error) {
        console.error('Erro ao criar porte:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe um porte com este nome' });
        }
        res.status(500).json({ error: 'Erro ao criar porte' });
    }
};

// PUT /api/portes/:id - Atualizar porte
exports.update = async (req, res) => {
    try {
        const { nome, descricao } = req.body;
        const porte = await Porte.findByPk(req.params.id);
        
        if (!porte) {
            return res.status(404).json({ error: 'Porte não encontrado' });
        }
        
        await porte.update({ nome, descricao });
        res.json(porte);
    } catch (error) {
        console.error('Erro ao atualizar porte:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe um porte com este nome' });
        }
        res.status(500).json({ error: 'Erro ao atualizar porte' });
    }
};

// DELETE /api/portes/:id - Deletar porte
exports.delete = async (req, res) => {
    try {
        const porte = await Porte.findByPk(req.params.id);
        
        if (!porte) {
            return res.status(404).json({ error: 'Porte não encontrado' });
        }
        
        await porte.destroy();
        res.json({ message: 'Porte deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar porte:', error);
        res.status(500).json({ error: 'Erro ao deletar porte' });
    }
};
