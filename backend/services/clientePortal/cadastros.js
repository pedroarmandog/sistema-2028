'use strict';
const { Op } = require('sequelize'), crypto = require('node:crypto'), V = require('./validacao'), { serializar } = require('./agenda');
const CAMPOS = ['nome', 'especie', 'raca', 'genero', 'data_nascimento', 'peso', 'porte', 'cor', 'pelagem'];
const EXTRAS = ['castrado', 'alergiasInformadas', 'restricoes', 'saude', 'preferencias', 'observacoesTutor'];
const PERFIL = ['nome', 'telefone', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
const extrair = (r, keys) => Object.fromEntries(keys.map(k => [k, r[k] ?? null]));
function validarPet(b) {
    V.chaves(b, [...CAMPOS, ...EXTRAS, 'etag']);
    const v = {};
    for (const k of CAMPOS) {
        if (b[k] === undefined)
            continue;
        if (k === 'data_nascimento') {
            v[k] = V.data(b[k], true);
            if (v[k] && v[k] > V.hoje())
                throw V.falha('Nascimento não pode estar no futuro.');
        }
        else if (k === 'peso') {
            v[k] = b[k] === '' || b[k] == null ? null : Number(b[k]);
            if (v[k] !== null && (!Number.isFinite(v[k]) || v[k] <= 0 || v[k] > 1500))
                throw V.falha('Peso inválido.');
        }
        else
            v[k] = V.texto(b[k], k === 'nome' ? 100 : 120, k === 'nome') || null;
    }
    if (v.genero && !['Macho', 'Fêmea'].includes(v.genero))
        throw V.falha('Sexo inválido.');
    if (v.porte && !['Pequeno', 'Médio', 'Grande', 'Gigante'].includes(v.porte))
        throw V.falha('Porte inválido.');
    const extras = {};
    for (const k of EXTRAS)
        if (b[k] !== undefined) {
            if (k === 'castrado') {
                if (b[k] !== null && typeof b[k] !== 'boolean')
                    throw V.falha('Informação de castração inválida.');
                extras[k] = b[k];
            }
            else
                extras[k] = V.texto(b[k], 1000);
        }
    return { v, extras };
}
function criarCadastros({ ERP, m, eventos, midias, agora = () => new Date() }) {
    async function pet(t, id, o = {}) { const p = await ERP.Pet.findOne({ where: { id: V.inteiro(id), cliente_id: t.clienteId }, ...o, logging: false }); if (!p || p.empresa_id && Number(p.empresa_id) !== Number(t.empresaId))
        throw V.falha('Pet não encontrado.', 404); return p; }
    async function dto(t, p, o = {}) { const d = await m.Detalhe.findOne({ where: { pet_id: p.id, empresa_id: t.empresaId }, ...o, logging: false }), extras = extrair(V.json(d?.dados), EXTRAS), campos = extrair(p, CAMPOS); return { id: p.id, criadoEm: p.createdAt, ...campos, ...extras, ativo: p.ativo !== false, foto: p.foto_url ? '/api/cliente-app/pets/' + p.id + '/foto' : null, etag: V.etag({ campos, extras, foto: p.foto_url || null }) }; }
    async function pets(t) { const rows = await ERP.Pet.findAll({ where: { cliente_id: t.clienteId, [Op.or]: [{ empresa_id: t.empresaId }, { empresa_id: null }] }, order: [['nome', 'ASC']], logging: false }); return Promise.all(rows.map(p => dto(t, p))); }
    async function salvarPet(t, id, b) {
        const { v, extras } = validarPet(b);
        return serializar(ERP, t.empresaId, async (transaction) => {
            const o = { transaction, logging: false };
            let p;
            if (id) {
                p = await pet(t, id, { ...o, lock: transaction.LOCK.UPDATE });
                if ((await dto(t, p, o)).etag !== b.etag)
                    throw V.falha('Este pet foi atualizado. Reabra o perfil antes de salvar.', 409);
                await p.update(v, o);
            }
            else {
                if (!v.nome || !v.especie)
                    throw V.falha('Preencha nome e espécie.');
                const total = await ERP.Pet.count({ where: { cliente_id: t.clienteId }, ...o });
                if (total >= 50)
                    throw V.falha('Limite de pets atingido. Fale com o estabelecimento.');
                p = await ERP.Pet.create({ ...v, cliente_id: t.clienteId, empresa_id: t.empresaId, ativo: true }, o);
            }
            const [d] = await m.Detalhe.findOrCreate({ where: { pet_id: p.id }, defaults: { empresa_id: t.empresaId, dados: {} }, ...o });
            await d.update({ dados: { ...V.json(d.dados), ...extras }, versao: d.versao + 1 }, o);
            await eventos.auditar(t.empresaId, { tipo: 'tutor', id: t.contaId }, id ? 'pet_editado' : 'pet_criado', p.id, Object.keys(b).filter(k => k !== 'etag'), transaction);
            await eventos.gestor(t.empresaId, t.clienteId, 'cadastro', 'Um tutor atualizou o cadastro de um pet.', { petId: p.id }, 'pet:' + p.id + ':' + crypto.randomUUID(), transaction);
            return dto(t, p, o);
        });
    }
    function perfil(t) { const campos = extrair(t.cliente, PERFIL); return { ...campos, emailAcesso: t.conta.email, etag: V.etag(campos) }; }
    async function salvarPerfil(t, b) { V.chaves(b, [...PERFIL, 'etag']); return serializar(ERP, t.empresaId, async (transaction) => { const o = { transaction, logging: false }; const c = await ERP.Cliente.findOne({ where: { id: t.clienteId, empresa_id: t.empresaId }, ...o, lock: transaction.LOCK.UPDATE }); if (!c || V.etag(extrair(c, PERFIL)) !== b.etag)
        throw V.falha('Seu cadastro foi atualizado. Reabra o perfil.', 409); const values = {}; for (const k of PERFIL)
        if (b[k] !== undefined)
            values[k] = V.texto(b[k], k === 'telefone' ? 30 : 200, k === 'nome'); if(values.estado!==undefined){values.estado=values.estado.toUpperCase();if(values.estado&&!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(values.estado))throw V.falha('Selecione uma UF válida.');}
        await c.update(values, o); await eventos.auditar(t.empresaId, { tipo: 'tutor', id: t.contaId }, 'perfil_editado', c.id, Object.keys(values), transaction); return perfil({ ...t, cliente: c }); }); }
    async function agendamentos(t) { const ids = (await ERP.Pet.findAll({ where: { cliente_id: t.clienteId, [Op.or]: [{ empresa_id: t.empresaId }, { empresa_id: null }] }, attributes: ['id'], logging: false })).map(p => p.id); if (!ids.length)
        return []; const rows = await ERP.Agendamento.findAll({ where: { empresa_id: t.empresaId, petId: { [Op.in]: ids } }, attributes:['id','petId','dataAgendamento','horario','servico','status','profissional'],order: [['dataAgendamento', 'DESC']], logging: false }); const comunicados = await m.Comunicado.findAll({ where: { empresa_id: t.empresaId, agendamento_id: { [Op.in]: rows.map(a => a.id) } }, logging: false }); return rows.map(a => ({ comunicado: comunicados.find(c => c.agendamento_id === a.id)?.texto || null, id: a.id, petId: a.petId, data: V.hoje(new Date(a.dataAgendamento)), hora: String(a.horario).slice(0, 5), servico: a.servico, status: a.status, profissional: a.profissional || null })); }
    async function galeria(t, id) { await pet(t, id); const rows = await m.Foto.findAll({ where: { empresa_id: t.empresaId, pet_id: id, visivel: true, removida_em: null }, order: [['createdAt', 'DESC']], limit: 100, logging: false }); return rows.map(f => ({ id: f.id, origem: f.origem, minha: f.conta_id === t.contaId, arquivo: '/api/cliente-app/pets/' + id + '/fotos/' + f.id + '/arquivo', criadoEm: f.createdAt })); }
    async function adicionarFoto(t, id, bytes, origem = 'tutor') { await pet(t, id); if (await m.Foto.count({ where: { pet_id: id, removida_em: null }, logging: false }) >= 100)
        throw V.falha('A galeria atingiu 100 fotos.'); const r = await midias().salvar(t.empresaId, bytes, 'portal-pets', { imagem: true, publico: false }); const f = await m.Foto.create({ id: crypto.randomUUID(), empresa_id: t.empresaId, cliente_id: t.clienteId, pet_id: id, conta_id: origem === 'tutor' ? t.contaId : null, referencia: r.url, origem, visivel: true }, { logging: false }); await eventos.auditar(t.empresaId, { tipo: origem, id: t.contaId || 'gestor' }, 'foto_adicionada', f.id, []); return { id: f.id }; }
    async function foto(t, id, fid) { const p = await pet(t, id); let ref = p.foto_url; if (fid) {
        const f = await m.Foto.findOne({ where: { id: V.uuid(fid), pet_id: id, empresa_id: t.empresaId, visivel: true, removida_em: null }, logging: false });
        if (!f)
            throw V.falha('Foto não encontrada.', 404);
        ref = f.referencia;
    } if (!ref)
        throw V.falha('Foto não encontrada.', 404); return midias().ler(t.empresaId, ref); }
    async function alterarFoto(t, id, fid, acao) { return serializar(ERP, t.empresaId, async (transaction) => { const o = { transaction, logging: false }, p = await pet(t, id, o), f = await m.Foto.findOne({ where: { id: V.uuid(fid), empresa_id: t.empresaId, pet_id: id, visivel: true, removida_em: null }, ...o, lock: transaction.LOCK.UPDATE }); if (!f)
        throw V.falha('Foto não encontrada.', 404); if (acao === 'remover') {
        if (f.conta_id !== t.contaId)
            throw V.falha('Você só pode remover fotos enviadas por você.', 403);
        await f.update({ removida_em: new Date() }, o);
        if (p.foto_url === f.referencia)
            await p.update({ foto_url: null }, o);
    }
    else if (acao === 'principal')
        await p.update({ foto_url: f.referencia }, o);
    else
        throw V.falha('Ação inválida.'); await eventos.auditar(t.empresaId, { tipo: 'tutor', id: t.contaId }, 'foto_' + acao, f.id, ['foto_url'], transaction); return { ok: true }; }); }
    async function vacinas(t, id) {
        await pet(t, id);
        const regs = await ERP.Agendamento.findAll({ where: { empresa_id: t.empresaId, petId: id, status: 'concluido' }, attributes:['id','servicos','dataAgendamento','profissional'],order: [['dataAgendamento', 'DESC']], logging: false });
        const oficiais = [];
        for (const a of regs)
            for (const [i, s] of V.json(a.servicos, []).entries()) {
                const meta = s.meta || {};
                if (meta.tipoEspecial !== 'vacina')
                    continue;
                const date = x => { try {
                    return V.data(x, true);
                }
                catch {
                    return null;
                } };
                oficiais.push({ id: 'erp-' + a.id + '-' + i, nome: s.nome || 'Vacina', data_aplicacao: date(meta.dataAplic) || V.hoje(new Date(a.dataAgendamento)), proxima_dose: date(meta.proximaDose) || date(meta.renovacao), validade: null, responsavel: a.profissional || null, origem: 'estabelecimento', observacoes: null, comprovante: false });
            }
        const rows = await m.Vacina.findAll({ where: { empresa_id: t.empresaId, pet_id: id, removida_em: null }, order: [['data_aplicacao', 'DESC']], logging: false });
        return [...oficiais, ...rows.map(r => ({ id: r.id, nome: r.nome, data_aplicacao: r.data_aplicacao, proxima_dose: r.proxima_dose, validade: r.validade, responsavel: r.responsavel, observacoes: r.observacoes, origem: r.origem, conferidaEm: r.conferida_em, comprovante: !!r.comprovante_ref, versao: r.versao, minha: r.conta_id === t.contaId }))];
    }
    async function salvarVacina(t, id, b) { await pet(t, id); V.chaves(b, ['nome', 'data_aplicacao', 'proxima_dose', 'validade', 'responsavel', 'observacoes']); const values = { nome: V.texto(b.nome, 120, true), data_aplicacao: V.data(b.data_aplicacao, true), proxima_dose: V.data(b.proxima_dose, true), validade: V.data(b.validade, true), responsavel: V.texto(b.responsavel, 120), observacoes: V.texto(b.observacoes, 1000) }; if (values.data_aplicacao && values.data_aplicacao > V.hoje(agora()))
        throw V.falha('Aplicação não pode estar no futuro.'); if (await m.Vacina.count({ where: { pet_id: id, removida_em: null }, logging: false }) >= 300)
        throw V.falha('Limite de registros atingido.'); const r = await m.Vacina.create({ ...values, id: crypto.randomUUID(), empresa_id: t.empresaId, pet_id: id, conta_id: t.contaId, origem: 'tutor' }, { logging: false }); await eventos.gestor(t.empresaId, t.clienteId, 'vacina', 'Um tutor registrou uma vacina para conferência.', { petId: id, vacinaId: r.id }, 'vacina:' + r.id); return { id: r.id }; }
    async function comprovante(t, id, vid, bytes) { await pet(t, id); const v = await m.Vacina.findOne({ where: { id: V.uuid(vid), empresa_id: t.empresaId, pet_id: id, removida_em: null }, logging: false }); if (!v)
        throw V.falha('Vacina não encontrada.', 404); if (bytes) {
        const tipo = await import('file-type').then(m => m.fileTypeFromBuffer(bytes));
        if (!tipo || !['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(tipo.mime))
            throw V.falha('Envie uma imagem ou PDF válido.');
        if (v.conta_id !== t.contaId || v.conferida_em)
            throw V.falha('Registro indisponível para alteração.', 403);
        const r = await midias().salvar(t.empresaId, bytes, 'portal-vacinas', { imagem: false, publico: false });
        await v.update({ comprovante_ref: r.url, versao: v.versao + 1 }, { logging: false });
        return { ok: true };
    } if (!v.comprovante_ref)
        throw V.falha('Comprovante não encontrado.', 404); return midias().ler(t.empresaId, v.comprovante_ref); }
    return { pet, pets, dto, salvarPet, perfil, salvarPerfil, agendamentos, galeria, adicionarFoto, foto, alterarFoto, vacinas, salvarVacina, comprovante };
}
module.exports = { criarCadastros, CAMPOS, EXTRAS };
