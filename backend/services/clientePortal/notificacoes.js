'use strict';
const { Op, Sequelize } = require('sequelize'), crypto = require('node:crypto'), V = require('./validacao');
const {serializar}=require('./agenda');
function validarSubscription(b) { V.chaves(b, ['endpoint', 'expirationTime', 'keys']); V.chaves(b.keys, ['p256dh', 'auth']); let u; try {
    u = new URL(b.endpoint);
}
catch {
    throw V.falha('Assinatura push inválida.');
} const hosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']; if (u.protocol !== 'https:' || u.username || u.password || u.port || !hosts.includes(u.hostname) || u.href.length > 2048 || !/^[A-Za-z0-9_-]{87}=?$/.test(b.keys.p256dh) || !/^[A-Za-z0-9_-]{22}(==)?$/.test(b.keys.auth))
    throw V.falha('Assinatura push não permitida.'); return { endpoint: u.href, keys: { p256dh: b.keys.p256dh, auth: b.keys.auth } }; }
function criarNotificacoes({ ERP, m, eventos, agora = () => new Date(), push = () => require('../pushNotificationService'), enviar = (sub, payload) => require('web-push').sendNotification(sub, payload, { TTL: 3600, timeout: 10000 }) }) {
    async function subscribe(t, b) { const sub = validarSubscription(b); if (!t.config.push_tutor || !push().getVapidPublicKey())
        throw V.falha('Notificações push indisponíveis; os avisos continuam no aplicativo.', 503); const hash = V.hash(sub.endpoint), r = await m.Push.findOne({ where: { endpoint_hash: hash }, logging: false }); if (r && r.conta_id !== t.contaId)
        throw V.falha('Este dispositivo está associado a outro acesso. Saia da outra conta antes.', 409); if (r)
        await r.update({ ativo: true, subscription: sub, sessao_id: t.sessao.id }, { logging: false });
    else {
        if (await m.Push.count({ where: { conta_id: t.contaId, ativo: true }, logging: false }) >= 10)
            throw V.falha('Limite de dispositivos atingido.');
        await m.Push.create({ id: crypto.randomUUID(), empresa_id: t.empresaId, conta_id: t.contaId, sessao_id: t.sessao.id, endpoint_hash: hash, subscription: sub }, { logging: false });
    } return { ok: true }; }
    async function resumoGestor(emp) { const [pendentes, ultimo] = await Promise.all([m.Solic.count({ where: { empresa_id: emp, estado: { [Op.in]: ['PENDENTE', 'PROPOSTA_RECUSADA'] } }, logging: false }), m.Evento.max('id', { where: { empresa_id: emp }, logging: false })]); return { pendentes, revisao: String(ultimo || 0) }; }
    async function resumoTutor(t) { const [n, e] = await Promise.all([m.Notificacao.max('id', { where: { conta_id: t.contaId }, logging: false }), m.Evento.max('id', { where: { empresa_id: t.empresaId, [Op.or]: [{ cliente_id: t.clienteId }, { cliente_id: null }] }, logging: false })]); return { revisao: String(n || 0) + ':' + String(e || 0) }; }
    // Compartilha a consulta por empresa/conta entre conexões SSE, inclusive depois de um deploy.
    const snapshots = new Map();
    async function snapshot(chave, fn) { let r = snapshots.get(chave); if (!r || r.expira < Date.now()) {
        r = { expira: Date.now() + 1800, promise: fn() };
        snapshots.set(chave, r);
        if (snapshots.size > 1000)
            snapshots.delete(snapshots.keys().next().value);
    } return r.promise; }
    function stream(req, res, fn, chave) { res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' }); res.flushHeaders?.(); let busy = false, fechou = false; res.write('retry: 5000\n\n'); async function tick() { if (busy || fechou)
        return; busy = true; try {
        res.write('data: ' + JSON.stringify(await snapshot(chave, fn)) + '\n\n');
    }
    catch {
        res.end();
    }
    finally {
        busy = false;
    } } tick(); const timer = setInterval(tick, 2000), fim = setTimeout(() => res.end(), 20000); const close = () => { fechou = true; clearInterval(timer); clearTimeout(fim); }; res.on('close', close); }
    async function expirar() { const rows = await m.Solic.findAll({ where: { estado: { [Op.in]: ['PENDENTE', 'PROPOSTA', 'PROPOSTA_RECUSADA'] } }, limit: 500, logging: false }); for (const p of rows) {
        const prazo = p.estado === 'PROPOSTA' ? V.json(p.proposta).expiraEm : p.expira_em;
        if (new Date(prazo) > agora())
            continue;
        await serializar(ERP,p.empresa_id,async (transaction) => { const [n] = await m.Solic.update({ estado: 'EXPIRADA', versao: p.versao + 1 }, { where: { id: p.id, estado: p.estado, versao: p.versao }, transaction, logging: false }); if (n) {
            if(p.estado==='PROPOSTA')await require('./alertasModelos').abrir(ERP.sequelize,p,transaction);
            const conta = await m.Conta.findByPk(p.conta_id, { transaction, logging: false });
            await eventos.tutor(conta, 'solicitacao', 'Solicitação expirada', 'O prazo terminou. Você pode solicitar uma nova data.', { solicitacaoId: p.id }, 'expirou:' + p.id, transaction);
            await eventos.gestor(p.empresa_id, p.cliente_id, 'solicitacao', 'Uma solicitação expirou.', {}, 'expirou:' + p.id, transaction);
        } });
    } }
    async function lembretes() { const hoje = V.hoje(agora()), rows = await m.Vacina.findAll({ where: { removida_em: null, proxima_dose: { [Op.gte]: hoje, [Op.lte]: V.hoje(new Date(+agora() + 7 * 86400000)) } }, limit: 500, logging: false }); for (const v of rows) {
        const dias = Math.round((new Date(v.proxima_dose + 'T12:00:00Z') - new Date(hoje + 'T12:00:00Z')) / 86400000);
        if (![0, 1, 7].includes(dias))
            continue;
        const pet = await ERP.Pet.findOne({ where: { id: v.pet_id, empresa_id: v.empresa_id }, logging: false });
        if (!pet)
            continue;
        const conta = await m.Conta.findOne({ where: { empresa_id: v.empresa_id, cliente_id: pet.cliente_id, ativo: true }, logging: false });
        if (conta)
            await eventos.tutor(conta, 'vacina', 'Lembrete de data registrada', 'Confira a próxima dose informada na carteira. Confirme a orientação com um profissional.', { petId: pet.id }, 'vacina:' + v.id + ':' + v.proxima_dose + ':' + dias);
    } }
    // Datas explícitas de vacinas concluídas no ERP. Não interpreta periodicidades médicas.
    async function lembretesERP() {
        const hoje = V.hoje(agora()), datas = [0, 1, 7].map(d => V.hoje(new Date(+agora() + d * 86400000))), configs = await m.Config.findAll({ where: { ativo: true }, attributes: ['empresa_id'], logging: false });
        for (const cfg of configs) {
            let cursor = 0;
            for (;;) {
                const rows = await ERP.Agendamento.findAll({ where: { empresa_id: cfg.empresa_id, status: 'concluido', id: { [Op.gt]: cursor }, [Op.or]: datas.map(d => Sequelize.where(Sequelize.cast(Sequelize.col('servicos'), 'CHAR'), { [Op.like]: '%' + d + '%' })) }, attributes: ['id', 'petId', 'servicos'], order: [['id', 'ASC']], limit: 200, logging: false });
                if (!rows.length)
                    break;
                for (const a of rows) {
                    const pet = await ERP.Pet.findByPk(a.petId, { logging: false });
                    if (!pet || pet.empresa_id && Number(pet.empresa_id) !== Number(cfg.empresa_id))
                        continue;
                    const conta = await m.Conta.findOne({ where: { empresa_id: cfg.empresa_id, cliente_id: pet.cliente_id, ativo: true }, logging: false });
                    if (!conta)
                        continue;
                    for (const [i, s] of V.json(a.servicos, []).entries()) {
                        if (s.meta?.tipoEspecial !== 'vacina')
                            continue;
                        let d;
                        try {
                            d = V.data(s.meta.proximaDose || s.meta.renovacao, true);
                        }
                        catch {
                            continue;
                        }
                        if (!datas.includes(d))
                            continue;
                        await eventos.tutor(conta, 'vacina', 'Lembrete de data registrada', 'Confira no histórico a data de reforço registrada pelo estabelecimento.', { petId: pet.id }, 'vacina-erp:' + a.id + ':' + i + ':' + d + ':' + hoje);
                    }
                }
                cursor = rows[rows.length - 1].id;
                if (rows.length < 200)
                    break;
            }
        }
    }
    async function entregar() { if (!push().getVapidPublicKey())
        return; const rows = await m.Notificacao.findAll({ where: { push_estado: 'PENDENTE', push_tentativas: { [Op.lt]: 8 }, [Op.or]: [{ push_lease: null }, { push_lease: { [Op.lt]: agora() } }] }, order: [['id', 'ASC']], limit: 30, logging: false }); for (const n of rows) {
        const [claim] = await m.Notificacao.update({ push_lease: new Date(+agora() + 120000), push_tentativas: n.push_tentativas + 1 }, { where: { id: n.id, push_estado: 'PENDENTE', push_tentativas: n.push_tentativas, [Op.or]: [{ push_lease: null }, { push_lease: { [Op.lt]: agora() } }] }, logging: false });
        if (!claim)
            continue;
        const cfg = await m.Config.findByPk(n.empresa_id, { logging: false }), conta = await m.Conta.findByPk(n.conta_id, { logging: false });
        let falhou = false;
        if (cfg?.ativo && cfg.push_tutor && conta?.ativo) {
            const subs = await m.Push.findAll({ where: { conta_id: n.conta_id, ativo: true }, logging: false });
            for (const s of subs) {
                const ses = await m.Sessao.findByPk(s.sessao_id, { logging: false });
                if (!ses || ses.revogada_em || ses.versao !== conta.versao || new Date(ses.expira_em) <= agora())
                    continue;
                try {
                    await enviar(V.json(s.subscription), JSON.stringify({ title: 'PetHub Cliente', body: 'Você tem uma atualização do seu estabelecimento.', tag: 'cliente-' + n.id, url: '/cliente-app/app.html' }));
                }
                catch (e) {
                    if ([404, 410].includes(e.statusCode))
                        await s.update({ ativo: false }, { logging: false });
                    else
                        falhou = true;
                }
            }
        }
        await n.update({ push_estado: falhou ? 'PENDENTE' : 'CONCLUIDO', push_lease: falhou ? new Date(+agora() + Math.min(3600000, 30000 * 2 ** n.push_tentativas)) : null }, { logging: false });
    } }
    let rodando = false, timer, ultimoLembrete = 0;
    async function ciclo() { if (rodando)
        return; rodando = true; try {
        await expirar();
        if (+agora() - ultimoLembrete >= 3600000) {
            await lembretes();
            await lembretesERP();
            ultimoLembrete = +agora();
        }
        await entregar();
    }
    catch {
        console.warn('[PetHub Cliente] Atualizações pendentes; nova tentativa no próximo ciclo.');
    }
    finally {
        rodando = false;
    } }
    function iniciar() { if (timer)
        return; timer = setInterval(ciclo, 60000); timer.unref(); ciclo(); }
    function parar() { clearInterval(timer); timer = null; }
    return { subscribe, resumoGestor, resumoTutor, stream, expirar, lembretes, lembretesERP, entregar, iniciar, parar };
}
module.exports = { criarNotificacoes, validarSubscription };
