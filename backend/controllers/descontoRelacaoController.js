const { DescontoRelacao } = require('../models/DescontoRelacao');

// Listar todas as relações de desconto
exports.listarDescontoRelacoes = async (req, res) => {
    try {
        const relacoes = await DescontoRelacao.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(relacoes);
    } catch (error) {
        console.error('Erro ao listar relações de desconto:', error);
        res.status(500).json({ erro: 'Erro ao listar relações de desconto' });
    }
};

// Buscar relação de desconto por ID
exports.buscarDescontoRelacao = async (req, res) => {
    try {
        const relacao = await DescontoRelacao.findByPk(req.params.id);
        if (!relacao) {
            return res.status(404).json({ erro: 'Relação de desconto não encontrada' });
        }
        res.json(relacao);
    } catch (error) {
        console.error('Erro ao buscar relação de desconto:', error);
        res.status(500).json({ erro: 'Erro ao buscar relação de desconto' });
    }
};

// Criar relação de desconto
exports.criarDescontoRelacao = async (req, res) => {
    try {
        const relacao = await DescontoRelacao.create(req.body);
        res.status(201).json(relacao);
    } catch (error) {
        console.error('Erro ao criar relação de desconto:', error);
        res.status(500).json({ erro: 'Erro ao criar relação de desconto' });
    }
};

// Atualizar relação de desconto
exports.atualizarDescontoRelacao = async (req, res) => {
    try {
        const relacao = await DescontoRelacao.findByPk(req.params.id);
        if (!relacao) {
            return res.status(404).json({ erro: 'Relação de desconto não encontrada' });
        }
        await relacao.update(req.body);
        res.json(relacao);
    } catch (error) {
        console.error('Erro ao atualizar relação de desconto:', error);
        res.status(500).json({ erro: 'Erro ao atualizar relação de desconto' });
    }
};

// Deletar relação de desconto
exports.deletarDescontoRelacao = async (req, res) => {
    try {
        const relacao = await DescontoRelacao.findByPk(req.params.id);
        if (!relacao) {
            return res.status(404).json({ erro: 'Relação de desconto não encontrada' });
        }
        await relacao.destroy();
        res.json({ mensagem: 'Relação de desconto deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar relação de desconto:', error);
        res.status(500).json({ erro: 'Erro ao deletar relação de desconto' });
    }
};
