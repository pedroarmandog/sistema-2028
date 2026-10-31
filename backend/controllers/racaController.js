const Raca = require('../models/Raca');

// GET /api/racas - Listar todas as raças
exports.getAll = async (req, res) => {
    try {
        const racas = await Raca.findAll({
            order: [['tipo', 'ASC'], ['nome', 'ASC']]
        });
        res.json(racas);
    } catch (error) {
        console.error('Erro ao buscar raças:', error);
        res.status(500).json({ error: 'Erro ao buscar raças' });
    }
};

// GET /api/racas/:id - Buscar raça por ID
exports.getById = async (req, res) => {
    try {
        const raca = await Raca.findByPk(req.params.id);
        if (!raca) {
            return res.status(404).json({ error: 'Raça não encontrada' });
        }
        res.json(raca);
    } catch (error) {
        console.error('Erro ao buscar raça:', error);
        res.status(500).json({ error: 'Erro ao buscar raça' });
    }
};

// POST /api/racas - Criar nova raça
exports.create = async (req, res) => {
    try {
        const { nome, tipo } = req.body;
        const raca = await Raca.create({ nome, tipo });
        res.status(201).json(raca);
    } catch (error) {
        console.error('Erro ao criar raça:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe uma raça com este nome e tipo' });
        }
        res.status(500).json({ error: 'Erro ao criar raça' });
    }
};

// PUT /api/racas/:id - Atualizar raça
exports.update = async (req, res) => {
    try {
        const { nome, tipo } = req.body;
        const raca = await Raca.findByPk(req.params.id);
        
        if (!raca) {
            return res.status(404).json({ error: 'Raça não encontrada' });
        }
        
        await raca.update({ nome, tipo });
        res.json(raca);
    } catch (error) {
        console.error('Erro ao atualizar raça:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe uma raça com este nome e tipo' });
        }
        res.status(500).json({ error: 'Erro ao atualizar raça' });
    }
};

// DELETE /api/racas/:id - Deletar raça
exports.delete = async (req, res) => {
    try {
        const raca = await Raca.findByPk(req.params.id);
        
        if (!raca) {
            return res.status(404).json({ error: 'Raça não encontrada' });
        }
        
        await raca.destroy();
        res.json({ message: 'Raça deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar raça:', error);
        res.status(500).json({ error: 'Erro ao deletar raça' });
    }
};
