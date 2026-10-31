const GrupoCliente = require('../models/GrupoCliente');

// GET /api/grupos-clientes - Listar todos os grupos
exports.getAll = async (req, res) => {
    try {
        const grupos = await GrupoCliente.findAll({
            order: [['nome', 'ASC']]
        });
        res.json(grupos);
    } catch (error) {
        console.error('Erro ao buscar grupos de clientes:', error);
        res.status(500).json({ error: 'Erro ao buscar grupos de clientes' });
    }
};

// GET /api/grupos-clientes/:id - Buscar grupo por ID
exports.getById = async (req, res) => {
    try {
        const grupo = await GrupoCliente.findByPk(req.params.id);
        if (!grupo) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }
        res.json(grupo);
    } catch (error) {
        console.error('Erro ao buscar grupo:', error);
        res.status(500).json({ error: 'Erro ao buscar grupo' });
    }
};

// POST /api/grupos-clientes - Criar novo grupo
exports.create = async (req, res) => {
    try {
        const { nome, descricao, cor } = req.body;
        const grupo = await GrupoCliente.create({ nome, descricao, cor });
        res.status(201).json(grupo);
    } catch (error) {
        console.error('Erro ao criar grupo:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe um grupo com este nome' });
        }
        res.status(500).json({ error: 'Erro ao criar grupo' });
    }
};

// PUT /api/grupos-clientes/:id - Atualizar grupo
exports.update = async (req, res) => {
    try {
        const { nome, descricao, cor } = req.body;
        const grupo = await GrupoCliente.findByPk(req.params.id);
        
        if (!grupo) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }
        
        await grupo.update({ nome, descricao, cor });
        res.json(grupo);
    } catch (error) {
        console.error('Erro ao atualizar grupo:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Já existe um grupo com este nome' });
        }
        res.status(500).json({ error: 'Erro ao atualizar grupo' });
    }
};

// DELETE /api/grupos-clientes/:id - Deletar grupo
exports.delete = async (req, res) => {
    try {
        const grupo = await GrupoCliente.findByPk(req.params.id);
        
        if (!grupo) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }
        
        await grupo.destroy();
        res.json({ message: 'Grupo deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar grupo:', error);
        res.status(500).json({ error: 'Erro ao deletar grupo' });
    }
};
