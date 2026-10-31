const PerfilCliente = require('../models/PerfilCliente');

// Listar todos os perfis de cliente
exports.listarPerfisCliente = async (req, res) => {
    try {
        const perfis = await PerfilCliente.findAll({
            order: [['descricao', 'ASC']]
        });
        res.json(perfis);
    } catch (error) {
        console.error('Erro ao listar perfis de cliente:', error);
        res.status(500).json({ erro: 'Erro ao listar perfis de cliente' });
    }
};

// Buscar perfil de cliente por ID
exports.buscarPerfilCliente = async (req, res) => {
    try {
        const perfil = await PerfilCliente.findByPk(req.params.id);
        if (!perfil) {
            return res.status(404).json({ erro: 'Perfil de cliente não encontrado' });
        }
        res.json(perfil);
    } catch (error) {
        console.error('Erro ao buscar perfil de cliente:', error);
        res.status(500).json({ erro: 'Erro ao buscar perfil de cliente' });
    }
};

// Criar perfil de cliente
exports.criarPerfilCliente = async (req, res) => {
    try {
        const perfil = await PerfilCliente.create(req.body);
        res.status(201).json(perfil);
    } catch (error) {
        console.error('Erro ao criar perfil de cliente:', error);
        res.status(500).json({ erro: 'Erro ao criar perfil de cliente' });
    }
};

// Atualizar perfil de cliente
exports.atualizarPerfilCliente = async (req, res) => {
    try {
        const perfil = await PerfilCliente.findByPk(req.params.id);
        if (!perfil) {
            return res.status(404).json({ erro: 'Perfil de cliente não encontrado' });
        }
        await perfil.update(req.body);
        res.json(perfil);
    } catch (error) {
        console.error('Erro ao atualizar perfil de cliente:', error);
        res.status(500).json({ erro: 'Erro ao atualizar perfil de cliente' });
    }
};

// Deletar perfil de cliente
exports.deletarPerfilCliente = async (req, res) => {
    try {
        const perfil = await PerfilCliente.findByPk(req.params.id);
        if (!perfil) {
            return res.status(404).json({ erro: 'Perfil de cliente não encontrado' });
        }
        await perfil.destroy();
        res.json({ mensagem: 'Perfil de cliente deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar perfil de cliente:', error);
        res.status(500).json({ erro: 'Erro ao deletar perfil de cliente' });
    }
};

// Debug: retorna contagem e últimos N perfis (p/ verificar persistência)
exports.debugPerfisCliente = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const total = await PerfilCliente.count();
        if (req.query.all === '1') {
            const all = await PerfilCliente.findAll({ order: [['createdAt','DESC']] });
            return res.json({ total, all });
        }
        const latest = await PerfilCliente.findAll({ order: [['createdAt','DESC']], limit });
        res.json({ total, latest });
    } catch (err) {
        console.error('Erro em debugPerfisCliente:', err);
        res.status(500).json({ error: 'Erro debug' });
    }
};
