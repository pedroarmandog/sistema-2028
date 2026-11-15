'use strict';
const { hash } = require('./validacao');
function criarEventos({ m, aposGestor }) {
    async function tutor(conta, tipo, titulo, texto, alvo, chave, transaction) {
        const [n] = await m.Notificacao.findOrCreate({ where: { dedupe: hash('tutor:' + conta.empresa_id + ':' + conta.id + ':' + chave) }, defaults: { empresa_id: conta.empresa_id, conta_id: conta.id, tipo, titulo, texto, alvo }, transaction, logging: false });
        return n;
    }
    async function gestor(empresa_id, cliente_id, tipo, texto, alvo, chave, transaction) { const [n, criado] = await m.Evento.findOrCreate({ where: { dedupe: hash('gestor:' + empresa_id + ':' + chave) }, defaults: { empresa_id, cliente_id, tipo, texto, alvo }, transaction, logging: false }); if (criado && aposGestor) {
        const fn = () => { Promise.resolve(aposGestor(n)).catch(() => { }); };
        if (transaction)
            transaction.afterCommit(fn);
        else
            fn();
    } return n; }
    async function auditar(empresa_id, ator, acao, alvo, campos = [], transaction) { return m.Auditoria.create({ empresa_id, ator_tipo: ator.tipo, ator_id: String(ator.id), acao, alvo: String(alvo), campos }, { transaction, logging: false }); }
    return { tutor, gestor, auditar };
}
module.exports = { criarEventos };
