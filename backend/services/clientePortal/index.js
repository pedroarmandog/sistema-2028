'use strict';
const crypto = require('node:crypto'), V = require('./validacao'), { modelos } = require('./modelos'), { criarEventos } = require('./eventos'), { criarAutenticacao } = require('./auth'), { criarAgenda, validarRegras, serializar } = require('./agenda'), { criarPedidos } = require('./pedidos'), { criarCadastros } = require('./cadastros'), { criarNotificacoes } = require('./notificacoes');
function criarPortal({ ERP, env = process.env, agora = () => new Date(), midias = () => require('../midias').instancia(), aposConfirmar = (ag, emp) => require('../marketingScheduler').sincronizarAgendamento(ag, emp), custoHash = 12, push, enviar } = {}) {
    const db = ERP.sequelize;
    try {
        V.segredo(env);
        db.__clientePortalDisponivel = true;
    }
    catch {
        db.__clientePortalDisponivel = false;
    }
    const m = modelos(db), eventos = criarEventos({ m, aposGestor: async (ev) => { if (!['pedido', 'recuperacao'].includes(ev.tipo))
            return; const cfg = await m.Config.findByPk(ev.empresa_id, { logging: false }); if (cfg?.ativo && cfg.notificar_gestor)
            await (push ? push() : require('../pushNotificationService')).notificarEmpresa(ev.empresa_id, 'solicitacao_app', { eventoId: ev.id }); } }), auth = criarAutenticacao({ db, ERP, env, agora, custoHash, eventos }), agenda = criarAgenda({ ERP, m, agora, aposConfirmar }), pedidos = criarPedidos({ ERP, m, agenda, eventos, agora }), cadastros = criarCadastros({ ERP, m, eventos, midias, agora }), notificacoes = criarNotificacoes({ ERP, m, eventos, agora, push, enviar });
    async function config(emp, o = {}) { const [c] = await m.Config.findOrCreate({ where: { empresa_id: emp }, defaults: { slug: crypto.randomUUID() }, ...o, logging: false }); return c; }
    async function salvarConfig(emp, b, autor) { V.chaves(b, ['ativo', 'receber_pedidos', 'notificar_gestor', 'push_tutor', 'regras', 'revisao']); for (const k of ['ativo', 'receber_pedidos', 'notificar_gestor', 'push_tutor'])
        if (typeof b[k] !== 'boolean')
            throw V.falha('Configuração inválida.'); if (b.ativo)
        V.segredo(env); const regras = b.regras ? validarRegras(b.regras) : null; if (b.receber_pedidos && !regras?.servicos.length)
        throw V.falha('Configure a agenda e publique pelo menos um serviço.'); return serializar(ERP, emp, async (transaction) => { const c = await config(emp, { transaction }); if (c.revisao !== Number(b.revisao))
        throw V.falha('As configurações mudaram. Atualize a página.', 409); for (const s of regras?.servicos || [])
        await agenda.servico({ empresa_id: emp, regras }, s.id, { transaction }); await c.update({ ativo: b.ativo, receber_pedidos: b.receber_pedidos, notificar_gestor: b.notificar_gestor, push_tutor: b.push_tutor, regras: require('./aparencia').preservar(regras,c.regras), revisao: c.revisao + 1 }, { transaction, logging: false }); await eventos.auditar(emp, { tipo: 'gestor', id: autor }, 'configuracao', emp, ['ativo', 'regras'], transaction); await eventos.gestor(emp, null, 'configuracao', 'Configuração do aplicativo atualizada.', {}, 'config:' + c.revisao, transaction); return c; }); }
    // Registra somente dados públicos ao tutor, após o commit da alteração oficial.
    let avisou = false;
    async function publicarAgendamento(a) { try {
        const cfg = await m.Config.findByPk(a.empresa_id, { logging: false });
        if (!cfg?.ativo)
            return;
        const pet = await ERP.Pet.findByPk(a.petId, { logging: false });
        if (!pet)
            return;
        const conta = await m.Conta.findOne({ where: { empresa_id: a.empresa_id, cliente_id: pet.cliente_id, ativo: true }, logging: false });
        if (!conta)
            return;
        const textos = { agendado: 'Seu agendamento foi atualizado.', checkin: 'Seu pet chegou ao estabelecimento.', pronto: 'Seu pet está pronto para retirada.', concluido: 'Atendimento concluído. Obrigado pela visita!', cancelado: 'Seu agendamento foi cancelado pelo estabelecimento.' };
        await eventos.tutor(conta, 'atendimento', 'Atualização do atendimento', textos[a.status] || 'Há uma atualização no atendimento.', { agendamentoId: a.id }, 'agenda:' + a.id + ':' + V.etag([a.status, a.dataAgendamento, a.horario, a.servico, a.updatedAt]));
        await eventos.gestor(a.empresa_id, pet.cliente_id, 'atendimento', 'Atendimento atualizado.', { agendamentoId: a.id }, 'agenda:' + a.id + ':' + V.etag([a.status, a.updatedAt]));
    }
    catch {
        if (!avisou) {
            avisou = true;
            console.warn('[PetHub Cliente] Notificações indisponíveis; confira a migração do portal.');
        }
    } }
    function hooks() { if (ERP.Agendamento.__portalHooks)
        return; ERP.Agendamento.__portalHooks = true; const registrar = (a, o = {}) => { const work = () => publicarAgendamento(a); if (o.transaction)
        o.transaction.afterCommit(() => { void work(); });
    else
        void work(); }; ERP.Agendamento.addHook('afterCreate', 'portalCliente', registrar); ERP.Agendamento.addHook('afterUpdate', 'portalCliente', (a, o) => { if (['status', 'horario', 'dataAgendamento', 'servico'].some(k => a.changed(k)))
        registrar(a, o); }); ERP.Pet.addHook('afterUpdate', 'portalCliente', (p, o = {}) => { const work = async () => { try {
        const c = await ERP.Cliente.findByPk(p.cliente_id, { logging: false });
        if (c)
            await eventos.gestor(c.empresa_id, c.id, 'cadastro', 'Cadastro do pet atualizado.', { petId: p.id }, 'pet-erp:' + p.id + ':' + V.etag(p.updatedAt));
    }
    catch { } }; if (o.transaction)
        o.transaction.afterCommit(() => { void work(); });
    else
        void work(); }); }
    const portal={ ERP, env, m, midias, eventos, auth, agenda, pedidos, cadastros, notificacoes, config, salvarConfig, hooks };
    portal.alertas=require('./alertas').criarAlertas(portal);
    portal.aparencia=require('./aparencia').criarAparencia(portal);
    return portal;
}
let singleton;
function instancia() { return singleton ??= criarPortal({ ERP: require('../../models') }); }
module.exports = { criarPortal, instancia };
