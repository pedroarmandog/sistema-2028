const { UserFilter } = require('../models');

async function getFilters(req, res) {
    try {
        const pagina = req.query.pagina;
        const usuarioId = req.query.usuarioId ? Number(req.query.usuarioId) : null;
        if (!pagina) return res.status(400).json({ message: 'Parâmetro pagina é obrigatório' });

        const where = { pagina };
        if (usuarioId) where.usuarioId = usuarioId;

        // Priorizar filtro por usuário quando informado
        const filtro = await UserFilter.findOne({ where, order: [['updatedAt', 'DESC']] });
        if (!filtro) return res.status(200).json({ filtros: {} });
        return res.json({ filtros: filtro.filtros, usuarioId: filtro.usuarioId, pagina: filtro.pagina });
    } catch (e) {
        console.error('[userFilterController.getFilters] erro', e);
        return res.status(500).json({ message: 'Erro ao obter filtros salvos' });
    }
}

async function saveFilters(req, res) {
    try {
        const { usuarioId, pagina, filtros } = req.body;
        if (!pagina) return res.status(400).json({ message: 'Campo pagina é obrigatório' });
        if (!filtros) return res.status(400).json({ message: 'Campo filtros é obrigatório' });

        // Upsert: atualizar se existir combinação usuarioId+pagina
        const where = { pagina };
        if (usuarioId) where.usuarioId = usuarioId;

        const existente = await UserFilter.findOne({ where });
        if (existente) {
            existente.filtros = filtros;
            await existente.save();
            return res.json({ message: 'Filtros atualizados', filtros: existente.filtros });
        }

        const novo = await UserFilter.create({ usuarioId: usuarioId || null, pagina, filtros });
        return res.json({ message: 'Filtros salvos', filtros: novo.filtros });
    } catch (e) {
        console.error('[userFilterController.saveFilters] erro', e);
        return res.status(500).json({ message: 'Erro ao salvar filtros' });
    }
}

module.exports = { getFilters, saveFilters };
