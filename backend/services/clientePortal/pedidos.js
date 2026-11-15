'use strict';
const crypto = require('node:crypto'), V = require('./validacao'), { serializar } = require('./agenda');
function criarPedidos({ ERP, m, agenda, eventos, agora = () => new Date() }) {
    const dto = p => ({ id: p.id, petId: p.pet_id, servico: p.servico_nome, data: p.data, hora: p.hora, observacao: p.observacao, estado: p.estado, versao: p.versao, proposta: V.json(p.proposta, null), motivo: p.motivo, agendamentoId: p.agendamento_id, criadoEm: p.createdAt, expiraEm: p.expira_em });
    async function criar(t, b) {
        V.chaves(b, ['petId', 'servicoId', 'data', 'hora', 'observacao', 'idempotencia']);
        const values = { petId: V.inteiro(b.petId), servicoId: V.texto(String(b.servicoId), 64, true), data: V.data(b.data), hora: V.hora(b.hora), observacao: V.texto(b.observacao, 1000), idempotencia: V.uuid(b.idempotencia) };
        if (V.instante(values.data, values.hora) <= agora() || V.instante(values.data, values.hora) > new Date(+agora() + 365 * 86400000))
            throw V.falha('Selecione uma data futura.');
        return serializar(ERP, t.empresaId, async (transaction) => { const o = { transaction, logging: false }, cfg = await m.Config.findByPk(t.empresaId, o); if (!cfg?.ativo || !cfg.receber_pedidos)
            throw V.falha('O estabelecimento não está recebendo pedidos.', 409); const anterior = await m.Solic.findOne({ where: { conta_id: t.contaId, idempotencia: values.idempotencia }, ...o }); const digest = V.etag(values); if (anterior) {
            if (anterior.pedido_hash !== digest)
                throw V.falha('Esta solicitação já foi utilizada com outros dados.', 409);
            return dto(anterior);
        } const pet = await ERP.Pet.findOne({ where: { id: values.petId, cliente_id: t.clienteId }, ...o }); if (!pet || pet.ativo === false || pet.empresa_id && Number(pet.empresa_id) !== Number(t.empresaId))
            throw V.falha('Pet não encontrado.', 404); const s = await agenda.servico(cfg, values.servicoId, o); const p = await m.Solic.create({ id: crypto.randomUUID(), empresa_id: t.empresaId, cliente_id: t.clienteId, conta_id: t.contaId, pet_id: pet.id, servico_id: s.id, servico_nome: s.nome, data: values.data, hora: values.hora, observacao: values.observacao, estado: 'PENDENTE', expira_em: V.instante(values.data, values.hora), idempotencia: values.idempotencia, pedido_hash: digest }, o); await eventos.gestor(t.empresaId, t.clienteId, 'pedido', 'Nova solicitação de agendamento recebida.', { solicitacaoId: p.id }, 'pedido:' + p.id, transaction); await eventos.auditar(t.empresaId, { tipo: 'tutor', id: t.contaId }, 'pedido_criado', p.id, [], transaction); return dto(p); });
    }
    async function agir({ empresaId, contaId, autorId, tutor = false }, id, b) {
        V.chaves(b, ['acao', 'versao', 'data', 'hora', 'profissionalId', 'motivo', 'propostaId']);
        const acao = V.texto(b.acao, 30, true);
        const permitidas = tutor ? ['aceitar_proposta', 'recusar_proposta', 'cancelar'] : ['aceitar', 'recusar', 'propor'];
        if (!permitidas.includes(acao))
            throw V.falha('Ação não permitida.', 403);
        return serializar(ERP, empresaId, async (transaction) => {
            const o = { transaction, logging: false }, where = { id: V.uuid(id), empresa_id: empresaId, ...(tutor ? { conta_id: contaId } : {}) };
            const p = await m.Solic.findOne({ where, ...o, lock: transaction.LOCK.UPDATE });
            if (!p)
                throw V.falha('Solicitação não encontrada.', 404);
            if ((p.estado === 'CONFIRMADA' && ['aceitar', 'aceitar_proposta'].includes(acao)) || (p.estado === 'CANCELADA' && acao === 'cancelar') || (p.estado === 'RECUSADA' && acao === 'recusar'))
                return dto(p);
            if (['RECUSADA', 'CANCELADA', 'EXPIRADA', 'CONFIRMADA'].includes(p.estado))
                throw V.falha('A solicitação já foi encerrada.', 409);
            if (p.versao !== V.versao(b.versao))
                throw V.falha('A solicitação mudou. Atualize antes de continuar.', 409);
            const proposta = V.json(p.proposta, null), cfg = await m.Config.findByPk(empresaId, o);
            if (!cfg?.ativo)
                throw V.falha('Portal desativado.', 409);
            if (agora() >= new Date(p.estado === 'PROPOSTA' ? proposta.expiraEm : p.expira_em)) {
                await p.update({ estado: 'EXPIRADA', versao: p.versao + 1 }, o);
                await eventos.tutor(await m.Conta.findByPk(p.conta_id,o),'solicitacao','Solicitação expirada','O prazo terminou. Solicite uma nova data.',{solicitacaoId:p.id},'expirou:'+p.id,transaction);
                await eventos.gestor(empresaId,p.cliente_id,'solicitacao','Uma solicitação expirou.',{},'expirou:'+p.id,transaction);
                return dto(p);
            }
            let values = { versao: p.versao + 1 }, titulo = 'Solicitação atualizada', texto = 'Consulte a resposta do estabelecimento.';
            if (acao === 'aceitar') {
                if (p.estado !== 'PENDENTE')
                    throw V.falha('Este pedido aguarda negociação. Envie uma nova proposta.', 409);
                const ag = await agenda.confirmar(p, cfg, { data: p.data, hora: p.hora }, transaction);
                values = { ...values, estado: 'CONFIRMADA', agendamento_id: ag.id };
                titulo = 'Agendamento confirmado';
                texto = 'O estabelecimento confirmou seu agendamento.';
            }
            if (acao === 'recusar') {
                values = { ...values, estado: 'RECUSADA', motivo: V.texto(b.motivo, 500) };
                titulo = 'Solicitação não aprovada';
                texto = 'Confira o motivo e solicite outro horário.';
            }
            if (acao === 'propor') {
                const slot = { data: V.data(b.data), hora: V.hora(b.hora), profissionalId: b.profissionalId ? V.inteiro(b.profissionalId) : null };
                await agenda.validar(cfg, { petId: p.pet_id, servicoId: p.servico_id, ...slot }, o);
                const expiraEm = new Date(Math.min(+agora() + 24 * 3600000, +V.instante(slot.data, slot.hora))).toISOString();
                values = { ...values, estado: 'PROPOSTA', proposta: { ...slot, id: crypto.randomUUID(), expiraEm, observacao: V.texto(b.motivo, 500) } };
                titulo = 'Novo horário sugerido';
                texto = 'O pet shop enviou uma proposta. Sua aceitação é necessária.';
            }
            if (['aceitar_proposta', 'recusar_proposta'].includes(acao)) {
                if (p.estado !== 'PROPOSTA' || !proposta || proposta.id !== b.propostaId)
                    throw V.falha('A proposta não está mais disponível.', 409);
                if (acao === 'aceitar_proposta') {
                    const ag = await agenda.confirmar(p, cfg, proposta, transaction);
                    values = { ...values, estado: 'CONFIRMADA', agendamento_id: ag.id };
                    titulo = 'Agendamento confirmado';
                    texto = 'Sua proposta foi aceita e o horário foi confirmado.';
                }
                else
                    values = { ...values, estado: 'PROPOSTA_RECUSADA' };
            }
            if (acao === 'cancelar')
                values = { ...values, estado: 'CANCELADA' };
            await p.update(values, o);
            const chave = p.id + ':' + p.versao;
            await eventos.tutor(await m.Conta.findByPk(p.conta_id, o), 'solicitacao', titulo, texto, { solicitacaoId: p.id }, chave, transaction);
            await eventos.gestor(empresaId, p.cliente_id, 'solicitacao', 'Uma solicitação de agendamento foi atualizada.', { solicitacaoId: p.id }, chave, transaction);
            await eventos.auditar(empresaId, { tipo: tutor ? 'tutor' : 'gestor', id: tutor ? contaId : autorId }, acao, p.id, ['estado', 'versao'], transaction);
            return dto(p);
        });
    }
    return { criar, agir, dto };
}
module.exports = { criarPedidos };
