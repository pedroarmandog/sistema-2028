'use strict';
const { Op } = require('sequelize'), crypto = require('node:crypto'), V = require('./validacao');
// A mesma trava de empresa é usada pelas escritas da agenda do ERP e do portal.
async function serializar(ERP, empresaId, work) {
    const db = ERP.sequelize;
    const filas = db.__portalFilas || (db.__portalFilas = new Map());
    const chave = String(empresaId);
    const anterior = filas.get(chave) || Promise.resolve();
    // A fila local reduz contenção. A trava SQL também protege entre instâncias.
    const atual = anterior.catch(() => {}).then(() => db.transaction(async transaction => {
        const emp = await ERP.Empresa.findByPk(empresaId, {
            transaction, lock: transaction.LOCK.UPDATE, logging: false
        });
        if (!emp) throw V.falha('Empresa não encontrada.', 404);
        return work(transaction);
    }));
    filas.set(chave, atual);
    try { return await atual; }
    finally { if (filas.get(chave) === atual) filas.delete(chave); }
}
function payload({ empresaId, petId, data, hora, servico, servicos, observacoes = '', profissional = '', valor = 0, taxidog = false }) { return { empresa_id: empresaId, petId, dataAgendamento: V.instante(data, hora), horario: hora, taxidog: require('../taxidog').normalizarTaxidog(taxidog), servico, servicos: Array.isArray(servicos) ? servicos : [{ nome: servico, valor }], observacoes, profissional, valor, status: 'agendado' }; }
function validarRegras(r) {
    V.chaves(r, ['dias', 'inicio', 'fim', 'intervalo', 'capacidade', 'duracaoPadrao', 'antecedencia', 'horizonte', 'feriados', 'bloqueios', 'servicos']);
    const inicio = V.hora(r.inicio), fim = V.hora(r.fim);
    if (inicio >= fim)
        throw V.falha('O fim do expediente precisa ser posterior ao início.');
    if (!Array.isArray(r.dias) || !r.dias.length)
        throw V.falha('Selecione os dias de atendimento.');
    const dias = [...new Set(r.dias.map(d => V.inteiro(d, 0, 6)))];
    const feriados = (r.feriados || []).map(d => V.data(d));
    if (feriados.length > 400)
        throw V.falha('Limite de feriados excedido.');
    if (!Array.isArray(r.bloqueios || []) || (r.bloqueios || []).length > 400)
        throw V.falha('Bloqueios inválidos.');
    const bloqueios = (r.bloqueios || []).map(b => { V.chaves(b, ['data', 'inicio', 'fim', 'profissional']); const v = { data: V.data(b.data), inicio: V.hora(b.inicio), fim: V.hora(b.fim), profissional: b.profissional ? V.inteiro(b.profissional) : null }; if (v.inicio >= v.fim)
        throw V.falha('Intervalo de bloqueio inválido.'); return v; });
    if (!Array.isArray(r.servicos) || r.servicos.length > 150)
        throw V.falha('Selecione os serviços publicados.');
    const servicos = r.servicos.map(s => { V.chaves(s, ['id', 'duracao', 'mostrarPreco', 'profissional']); return { id: V.texto(String(s.id), 64, true), duracao: V.inteiro(s.duracao, 5, 720), mostrarPreco: s.mostrarPreco === true, profissional: s.profissional ? V.inteiro(s.profissional) : null }; });
    if (new Set(servicos.map(s => s.id)).size !== servicos.length)
        throw V.falha('Serviço duplicado.');
    return { dias, inicio, fim, intervalo: V.inteiro(r.intervalo, 5, 120), capacidade: V.inteiro(r.capacidade, 1, 100), duracaoPadrao: V.inteiro(r.duracaoPadrao, 5, 720), antecedencia: V.inteiro(r.antecedencia, 0, 10080), horizonte: V.inteiro(r.horizonte, 1, 365), feriados, bloqueios, servicos };
}
function criarAgenda({ ERP, m, agora = () => new Date(), aposConfirmar = async () => { } }) {
    async function servico(cfg, id, o = {}) { const r = V.json(cfg.regras), s = r.servicos?.find(s => s.id === String(id)); if (!s)
        throw V.falha('Serviço não disponível no aplicativo.', 409); const p = await ERP.Produto.findOne({ ...o, where: { id: String(id), empresa_id: cfg.empresa_id }, attributes: ['id', 'nome', 'tipo', 'preco'], logging: false }); if (!p || !/^servi[cç]o$/i.test(p.tipo || ''))
        throw V.falha('Serviço indisponível.', 409); let profissional = ''; if (s.profissional) {
        const pr = await ERP.Profissional.findOne({ where: { id: s.profissional, empresa_id: cfg.empresa_id, status: 'ativo' }, ...o, logging: false });
        if (!pr)
            throw V.falha('Profissional indisponível.', 409);
        profissional = pr.nome;
    } return { ...s, nome: V.texto(p.nome, 200, true), preco: s.mostrarPreco ? Number(p.preco) : null, valor: Number(p.preco) || 0, profissionalNome: profissional }; }
    async function validar(cfg, { petId, data, hora, servicoId, profissionalId }, o = {}) {
        if (!cfg.ativo)
            throw V.falha('O estabelecimento não está recebendo solicitações.', 409);
        const r = V.json(cfg.regras);
        if (!r.dias?.length || !r.duracaoPadrao)
            throw V.falha('O estabelecimento precisa configurar a disponibilidade antes de confirmar.', 409);
        V.data(data);
        V.hora(hora);
        const s = o.portalServico || await servico(cfg, servicoId, o);
        let profissional = s.profissionalNome, profId = s.profissional;
        if (profissionalId) {
            const p = await ERP.Profissional.findOne({ where: { id: V.inteiro(profissionalId), empresa_id: cfg.empresa_id, status: 'ativo' }, ...o, logging: false });
            if (!p)
                throw V.falha('Profissional indisponível.', 409);
            profissional = p.nome;
            profId = p.id;
        }
        const dt = V.instante(data, hora), min = V.minHora(hora), fim = min + s.duracao, dia = new Date(data + 'T12:00:00Z').getUTCDay();
        if (dt < new Date(+agora() + r.antecedencia * 60000) || dt > new Date(+agora() + r.horizonte * 86400000) || !r.dias.includes(dia) || r.feriados.includes(data) || min < V.minHora(r.inicio) || fim > V.minHora(r.fim))
            throw V.falha('Este horário não está disponível. Escolha outra opção.', 409);
        if (r.bloqueios.some(b => b.data === data && (!b.profissional || b.profissional === profId) && min < V.minHora(b.fim) && fim > V.minHora(b.inicio)))
            throw V.falha('Este horário possui um bloqueio.', 409);
        const start = V.instante(data, '00:00'), next = new Date(+start + 86400000);
        const ags = o.portalAgenda || await ERP.Agendamento.findAll({ where: { empresa_id: cfg.empresa_id, status: { [Op.ne]: 'cancelado' }, dataAgendamento: { [Op.gte]: start, [Op.lt]: next } }, ...o, logging: false });
        const pontos = [[min, 1], [fim, -1]];
        for (const a of ags) {
            const itens = V.json(a.servicos, []);
            const duracoes = itens.map(i => Number(i.meta?.portalDuracao)).filter(n => n > 0 && n <= 720);
            const dur = duracoes.length ? duracoes.reduce((a, b) => a + b, 0) : r.duracaoPadrao;
            const ini = V.minHora(String(a.horario).slice(0, 5)), end = ini + dur;
            if (min < end && fim > ini) {
                if (Number(a.petId) === Number(petId) || profissional && a.profissional === profissional)
                    throw V.falha('Pet ou profissional já possui atendimento neste intervalo.', 409);
                pontos.push([Math.max(min, ini), 1], [Math.min(fim, end), -1]);
            }
        }
        let n = 0;
        for (const [, dif] of pontos.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
            n += dif;
            if (n > r.capacidade)
                throw V.falha('Capacidade de atendimento atingida neste intervalo.', 409);
        }
        return { ...s, profissionalNome: profissional };
    }
    async function horarios(cfg, petId, servicoId, data) { V.data(data); const r = V.json(cfg.regras), s = await servico(cfg, servicoId); if (!r.dias?.length)
        return { garantido: false, horarios: [], mensagem: 'Informe uma preferência de horário. O estabelecimento precisará avaliar.' }; if (!Number.isFinite(r.intervalo) || r.intervalo < 5)
        throw V.falha('Disponibilidade ainda não configurada.', 409); const start = V.instante(data, '00:00'), ags = await ERP.Agendamento.findAll({ where: { empresa_id: cfg.empresa_id, status: { [Op.ne]: 'cancelado' }, dataAgendamento: { [Op.gte]: start, [Op.lt]: new Date(+start + 86400000) } }, logging: false }); const result = []; for (let n = V.minHora(r.inicio); n + s.duracao <= V.minHora(r.fim); n += r.intervalo) {
        const h = String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
        try {
            await validar(cfg, { petId, data, hora: h, servicoId }, { portalServico: s, portalAgenda: ags });
            result.push(h);
        }
        catch (e) {
            if (e.status !== 409)
                throw e;
        }
    } return { garantido: false, horarios: result, mensagem: 'Horários sujeitos à aprovação e nova verificação de disponibilidade.' }; }
    async function confirmar(p, cfg, slot, transaction) {
        const o = { transaction, logging: false };
        const pet = await ERP.Pet.findOne({ where: { id: p.pet_id, cliente_id: p.cliente_id }, ...o });
        const cli = await ERP.Cliente.findOne({ where: { id: p.cliente_id, empresa_id: p.empresa_id }, ...o });
        const conta = await m.Conta.findByPk(p.conta_id, o);
        if (!pet || pet.ativo === false || pet.empresa_id && Number(pet.empresa_id) !== Number(p.empresa_id) || !cli || cli.ativo === false || !conta?.ativo)
            throw V.falha('Cadastro ou acesso não está ativo.', 409);
        const s = await validar(cfg, { petId: p.pet_id, servicoId: p.servico_id, ...slot }, o);
        const ag = await ERP.Agendamento.create(payload({ empresaId: p.empresa_id, petId: p.pet_id, data: slot.data, hora: slot.hora, servico: s.nome, servicos: [{ id: s.id, nome: s.nome, valor: s.valor, quantidade: 1, meta: { portalDuracao: s.duracao, portalSolicitacao: p.id } }], observacoes: p.observacao, profissional: s.profissionalNome, valor: s.valor }), o);
        transaction.afterCommit(() => { Promise.resolve(aposConfirmar(ag, p.empresa_id)).catch(() => console.warn('[PetHub Cliente] Replanejamento de lembrete pendente.')); });
        return ag;
    }
    return { servico, validar, horarios, confirmar };
}
// Uma escrita concorrente no ERP não pode ocupar uma reserva confirmada pelo app.
// Escritas clínicas concluídas não ocupam capacidade futura.
async function protegerReserva(ERP, values, ignorarId, transaction) {
    if (['cancelado', 'concluido'].includes(values.status) || !values.dataAgendamento || !values.horario)
        return;
    const Model = ERP.sequelize.models.ClientePortalConfig;
    if (!Model || ERP.sequelize.__clientePortalDisponivel === false)
        return;
    let cfg;
    try {
        cfg = await Model.findByPk(values.empresa_id, { transaction, logging: false });
    }
    catch (e) {
        if (e.original?.code === 'ER_NO_SUCH_TABLE' || /no such table/i.test(e.original?.message || ''))
            return;
        throw e;
    }
    const r = V.json(cfg?.regras);
    if (!cfg?.ativo || !r.duracaoPadrao)
        return;
    const dia = V.hoje(new Date(values.dataAgendamento)), start = V.instante(dia, '00:00');
    const duracao = v => { const ds = V.json(v.servicos, []).map(i => Number(i.meta?.portalDuracao)).filter(n => n > 0 && n <= 720); return ds.length ? ds.reduce((a, b) => a + b, 0) : r.duracaoPadrao; };
    const ini = V.minHora(String(values.horario).slice(0, 5)), fim = ini + duracao(values);
    const rows = await ERP.Agendamento.findAll({ where: { empresa_id: values.empresa_id, status: { [Op.ne]: 'cancelado' }, dataAgendamento: { [Op.gte]: start, [Op.lt]: new Date(+start + 86400000) }, ...(ignorarId ? { id: { [Op.ne]: ignorarId } } : {}) }, transaction, logging: false });
    const sobrepostos = rows.filter(a => { const i = V.minHora(String(a.horario).slice(0, 5)); return ini < i + duracao(a) && fim > i; });
    const reservas = sobrepostos.filter(a => V.json(a.servicos, []).some(s => s.meta?.portalSolicitacao));
    if (!reservas.length)
        return;
    if (reservas.some(a => Number(a.petId) === Number(values.petId) || values.profissional && a.profissional === values.profissional))
        throw V.falha('Este intervalo já foi confirmado no PetHub Cliente para o pet ou profissional.', 409);
    const pontos = [[ini, 1], [fim, -1]];
    for (const a of sobrepostos) {
        const i = V.minHora(String(a.horario).slice(0, 5));
        pontos.push([Math.max(ini, i), 1], [Math.min(fim, i + duracao(a)), -1]);
    }
    let n = 0;
    for (const [, d] of pontos.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
        n += d;
        if (n > r.capacidade)
            throw V.falha('Este intervalo atinge a capacidade e contém uma reserva confirmada pelo app.', 409);
    }
}
async function criarOficial(ERP, values) { return serializar(ERP, values.empresa_id, async (transaction) => { await protegerReserva(ERP, values, null, transaction); return ERP.Agendamento.create(values, { transaction }); }); }
async function atualizarOficial(ERP, registro, values) { return serializar(ERP, registro.empresa_id, async (transaction) => { await registro.reload({ transaction, lock: transaction.LOCK.UPDATE }); await protegerReserva(ERP, { ...registro.get({ plain: true }), ...values }, registro.id, transaction); return registro.update(values, { transaction }); }); }
module.exports = { serializar, payload, validarRegras, criarAgenda, criarOficial, atualizarOficial, protegerReserva };
