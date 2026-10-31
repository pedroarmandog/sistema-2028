const Pelagem = require('../models/Pelagem');

// GET /api/pelagens - Listar todas as pelagens
exports.getAll = async (req, res) => {
    try {
        const pelagens = await Pelagem.findAll({
            order: [['nome', 'ASC'], ['tipo', 'ASC']]
        });
        res.json(pelagens);
    } catch (error) {
        console.error('Erro ao buscar pelagens:', error);
        res.status(500).json({ error: 'Erro ao buscar pelagens' });
    }
};

// GET /api/pelagens/:id - Buscar pelagem por ID
exports.getById = async (req, res) => {
    try {
        const pelagem = await Pelagem.findByPk(req.params.id);
        if (!pelagem) {
            return res.status(404).json({ error: 'Pelagem não encontrada' });
        }
        res.json(pelagem);
    } catch (error) {
        console.error('Erro ao buscar pelagem:', error);
        res.status(500).json({ error: 'Erro ao buscar pelagem' });
    }
};

// POST /api/pelagens - Criar nova pelagem
exports.create = async (req, res) => {
    try {
        const { nome, tipo } = req.body;
        const pelagem = await Pelagem.create({ nome, tipo });
        res.status(201).json(pelagem);
    } catch (error) {
        console.error('Erro ao criar pelagem:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe uma pelagem com este nome e tipo' });
        }
        res.status(500).json({ error: 'Erro ao criar pelagem' });
    }
};

// PUT /api/pelagens/:id - Atualizar pelagem
exports.update = async (req, res) => {
    try {
        const { nome, tipo } = req.body;
        const pelagem = await Pelagem.findByPk(req.params.id);
        
        if (!pelagem) {
            return res.status(404).json({ error: 'Pelagem não encontrada' });
        }
        
        await pelagem.update({ nome, tipo });
        res.json(pelagem);
    } catch (error) {
        console.error('Erro ao atualizar pelagem:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe uma pelagem com este nome e tipo' });
        }
        res.status(500).json({ error: 'Erro ao atualizar pelagem' });
    }
};

// DELETE /api/pelagens/:id - Deletar pelagem
exports.delete = async (req, res) => {
    try {
        const pelagem = await Pelagem.findByPk(req.params.id);
        
        if (!pelagem) {
            return res.status(404).json({ error: 'Pelagem não encontrada' });
        }
        
        await pelagem.destroy();
        res.json({ message: 'Pelagem deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar pelagem:', error);
        res.status(500).json({ error: 'Erro ao deletar pelagem' });
    }
};
