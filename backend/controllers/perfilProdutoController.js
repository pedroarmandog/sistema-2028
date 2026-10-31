const PerfilProduto = require('../models/PerfilProduto');

// Listar todos os perfis de produto
exports.listarPerfisProduto = async (req, res) => {
    try {
        const perfis = await PerfilProduto.findAll({
            order: [['descricao', 'ASC']]
        });
        res.json(perfis);
    } catch (error) {
        console.error('Erro ao listar perfis de produto:', error);
        res.status(500).json({ erro: 'Erro ao listar perfis de produto' });
    }
};

// Buscar perfil de produto por ID
exports.buscarPerfilProduto = async (req, res) => {
    try {
        const perfil = await PerfilProduto.findByPk(req.params.id);
        if (!perfil) {
            return res.status(404).json({ erro: 'Perfil de produto não encontrado' });
        }
        res.json(perfil);
    } catch (error) {
        console.error('Erro ao buscar perfil de produto:', error);
        res.status(500).json({ erro: 'Erro ao buscar perfil de produto' });
    }
};

// Criar perfil de produto
exports.criarPerfilProduto = async (req, res) => {
    try {
        console.log('perfilProdutoController.criarPerfilProduto body:', req.body);
        const data = req.body || {};
        if (!data.descricao || String(data.descricao).trim() === '') {
            return res.status(400).json({ erro: 'Campo descricao é obrigatório' });
        }

        // Normalizar campos numéricos que podem vir como string do frontend
        try {
            ['fixo','maximo','gerente'].forEach(k => {
                if (data[k] === undefined || data[k] === null) return;
                const v = ('' + data[k]).toString().trim();
                if (v === '') { data[k] = null; return; }
                // aceitar vírgula decimal
                const n = parseFloat(v.replace(',', '.'));
                data[k] = isNaN(n) ? null : n;
            });
        } catch (normErr) {
            console.warn('Não foi possível normalizar campos numéricos do perfil:', normErr);
        }

        try {
            const perfil = await PerfilProduto.create(data);
            try {
                const total = await PerfilProduto.count();
                console.log(`PerfilProduto criado id=${perfil.id}; total perfis=${total}`);
            } catch(countErr) {
                console.warn('Não foi possível obter contagem após criação:', countErr && countErr.message);
            }
            return res.status(201).json(perfil);
        } catch (innerErr) {
            // tentar imprimir propriedades internas do erro para diagnóstico
            try {
                console.error('Erro interno ao criar PerfilProduto (DB) - message:', innerErr && innerErr.message);
                console.error('Erro interno ao criar PerfilProduto (DB) - code/errno:', innerErr && innerErr.code, innerErr && innerErr.errno);
                console.error('Erro interno ao criar PerfilProduto (DB) - full:', innerErr && JSON.stringify(innerErr, Object.getOwnPropertyNames(innerErr)));
            } catch (logErr) {
                console.error('Erro ao logar innerErr:', logErr, innerErr);
            }
            return res.status(500).json({ erro: 'Erro ao criar perfil de produto', detalhe: innerErr && innerErr.message });
        }
    } catch (error) {
        console.error('Erro inesperado em criarPerfilProduto:', error && error.stack ? error.stack : error);
        res.status(500).json({ erro: 'Erro ao criar perfil de produto', detalhe: error && error.message });
    }
};

// Atualizar perfil de produto
exports.atualizarPerfilProduto = async (req, res) => {
    try {
        const perfil = await PerfilProduto.findByPk(req.params.id);
        if (!perfil) {
            return res.status(404).json({ erro: 'Perfil de produto não encontrado' });
        }
        await perfil.update(req.body);
        res.json(perfil);
    } catch (error) {
        console.error('Erro ao atualizar perfil de produto:', error);
        res.status(500).json({ erro: 'Erro ao atualizar perfil de produto' });
    }
};

// Deletar perfil de produto
exports.deletarPerfilProduto = async (req, res) => {
    try {
        const perfil = await PerfilProduto.findByPk(req.params.id);
        if (!perfil) {
            return res.status(404).json({ erro: 'Perfil de produto não encontrado' });
        }
        await perfil.destroy();
        res.json({ mensagem: 'Perfil de produto deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar perfil de produto:', error);
        res.status(500).json({ erro: 'Erro ao deletar perfil de produto' });
    }
};

// Debug: retorna contagem e últimos N perfis (p/ verificar persistência)
exports.debugPerfis = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const total = await PerfilProduto.count();
        // permitir ?all=1 para retornar todos os registros (útil para debug)
        if (req.query.all === '1') {
            const all = await PerfilProduto.findAll({ order: [['createdAt','DESC']] });
            return res.json({ total, all });
        }
        const latest = await PerfilProduto.findAll({ order: [['createdAt','DESC']], limit });
        res.json({ total, latest });
    } catch (err) {
        console.error('Erro em debugPerfis:', err);
        res.status(500).json({ error: 'Erro debug' });
    }
};
