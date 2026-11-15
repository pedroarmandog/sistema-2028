'use strict';
const crypto = require('node:crypto'), jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs');
const V = require('./validacao'), { modelos } = require('./modelos'), { criarEventos } = require('./eventos');
const {serializar}=require('./agenda');
const COOKIE = 'pethub_cliente', PATH = '/api/cliente-app', ISSUER = 'pethub-cliente', AUDIENCE = 'pethub-cliente';
function criarAutenticacao({ db, ERP, env = process.env, agora = () => new Date(), custoHash = 12, eventos: eventosCompartilhados }) {
    const m = modelos(db), eventos = eventosCompartilhados || criarEventos({ m }), dummy = bcrypt.hashSync('credencial-inexistente-49387', custoHash);
    const csrf = id => crypto.createHmac('sha256', V.segredo(env)).update('csrf:' + id).digest('hex');
    const cookie = (res, token) => res.cookie(COOKIE, token, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: PATH, maxAge: 30 * 86400000 });
    const limpar = res => res.clearCookie(COOKIE, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: PATH });
    async function verificarPortal(config, o = {}, { gestor = false } = {}) {
        if (!config) throw V.falha('Estabelecimento não encontrado. Abra o link mais recente enviado pelo pet shop.', 404);
        if (!config.ativo) throw V.falha(gestor
            ? 'Ative o PetHub Cliente em Configurações > PetHub Cliente antes de gerar o convite.'
            : 'O PetHub Cliente deste estabelecimento está desativado. Solicite a ativação à equipe do pet shop.', gestor ? 409 : 403);
        const empresa = await ERP.Empresa.findByPk(config.empresa_id, { ...o, logging: false });
        if (!empresa || empresa.ativo === false || empresa.ativa === false)
            throw V.falha('O estabelecimento está indisponível. Entre em contato com a equipe do pet shop.', 403);
        return empresa;
    }
    async function estabelecimento(slug, o = {}) {
        slug = V.uuid(V.texto(slug, 36, true)).toLowerCase();
        const config = await m.Config.findOne({ where: { slug }, ...o, logging: false });
        const empresa = await verificarPortal(config, o);
        return { config, empresa };
    }
    async function contexto(token) {
        let d;
        try {
            d = jwt.verify(token, V.segredo(env), { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
            if (d.token_use !== 'tutor' || typeof d.sid !== 'string')
                throw Error();
        }
        catch (e) {
            if (e.status === 503)
                throw e;
            throw V.falha('Entre novamente para continuar.', 401);
        }
        const sessao = await m.Sessao.findByPk(d.sid, { logging: false });
        if (!sessao || sessao.revogada_em || new Date(sessao.expira_em) <= agora())
            throw V.falha('Sessão encerrada. Entre novamente.', 401);
        const conta = await m.Conta.findByPk(sessao.conta_id, { logging: false });
        if (!conta || !conta.ativo || conta.versao !== sessao.versao || conta.versao !== d.ver)
            throw V.falha('Acesso revogado. Fale com o estabelecimento.', 401);
        const empresa = await ERP.Empresa.findByPk(conta.empresa_id, { logging: false });
        if (!empresa || empresa.ativo === false || empresa.ativa === false)
            throw V.falha('Estabelecimento indisponível.', 403);
        const config = await m.Config.findByPk(conta.empresa_id, { logging: false });
        if (!config?.ativo)
            throw V.falha('O portal deste estabelecimento está desativado.', 403);
        const cliente = await ERP.Cliente.findOne({ where: { id: conta.cliente_id, empresa_id: conta.empresa_id }, logging: false });
        if (!cliente || cliente.ativo === false)
            throw V.falha('Acesso indisponível. Fale com o estabelecimento.', 401);
        return { conta, sessao, config, cliente, empresaId: conta.empresa_id, clienteId: conta.cliente_id, contaId: conta.id };
    }
    async function auth(req, res, next) { try {
        const token = req.cookies?.[COOKIE];
        if (!token)
            throw V.falha('Entre para continuar.', 401);
        req.tutor = await contexto(token);
        res.set('Cache-Control', 'private, no-store');
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            const enviado = req.get('X-Cliente-CSRF') || '', esperado = csrf(req.tutor.sessao.id);
            if (!/^[a-f0-9]{64}$/.test(enviado) || enviado.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(esperado)))
                throw V.falha('Reabra o aplicativo para confirmar sua sessão.', 403);
        }
        next();
    }
    catch (e) {
        res.status(e.status || 503).json({ erro: e.status ? e.message : 'Não foi possível verificar o acesso agora.' });
    } }
    async function consumir(loja, mail) { const key = V.hash(loja + ':' + mail); await db.transaction(async (transaction) => { const opts = { transaction, logging: false }; await m.Tentativa.findOrCreate({ where: { id: key }, defaults: { janela: agora(), erros: 0 }, ...opts }); const r = await m.Tentativa.findByPk(key, { ...opts, lock: transaction.LOCK.UPDATE }); if (agora() - new Date(r.janela) > 15 * 60000)
        await r.update({ janela: agora(), erros: 0 }, opts); if (r.erros >= 8)
        throw V.falha('Muitas tentativas. Aguarde 15 minutos para tentar novamente.', 429); await r.increment('erros', opts); }); return key; }
    async function login({ loja, email, senha }, res) {
        V.segredo(env);
        let mail;
        try {
            mail = V.email(email);
        }
        catch {
            mail = V.texto(String(email || ''), 254).toLowerCase();
        }
        loja = V.uuid(V.texto(loja, 36, true)).toLowerCase();
        if (typeof senha !== 'string' || Buffer.byteLength(senha) > 72)
            senha = '';
        const key = await consumir(loja, mail);
        const { config } = await estabelecimento(loja);
        const c = await m.Conta.findOne({ where: { empresa_id: config.empresa_id, email: mail }, logging: false });
        const ok = await bcrypt.compare(senha, c?.senha_hash || dummy);
        if (!ok || !c?.ativo || !c.senha_hash)
            throw V.falha('E-mail, senha ou estabelecimento inválidos.', 401);
        const cliente = await ERP.Cliente.findOne({ where: { id: c.cliente_id, empresa_id: c.empresa_id }, logging: false });
        if (!cliente || cliente.ativo === false)
            throw V.falha('E-mail, senha ou estabelecimento inválidos.', 401);
        const sessao = await m.Sessao.create({ id: crypto.randomUUID(), conta_id: c.id, versao: c.versao, expira_em: new Date(+agora() + 30 * 86400000), ultimo_acesso: agora() }, { logging: false });
        await c.update({ ultimo_acesso: agora() }, { logging: false });
        await m.Tentativa.update({ erros: 0 }, { where: { id: key }, logging: false });
        const token = jwt.sign({ sid: sessao.id, ver: c.versao, token_use: 'tutor' }, V.segredo(env), { issuer: ISSUER, audience: AUDIENCE, expiresIn: '30d', algorithm: 'HS256' });
        cookie(res, token);
        return { ok: true, csrf: csrf(sessao.id) };
    }
    async function convite(empresaId, clienteId, email, autorId) {
        V.segredo(env);
        email = V.email(email);
        const token = crypto.randomBytes(32).toString('base64url');
        const r = await serializar(ERP,empresaId,async (transaction) => {
            const o = { transaction, logging: false };
            const emp = await ERP.Empresa.findByPk(empresaId, { ...o, lock: transaction.LOCK.UPDATE });
            if (!emp)
                throw V.falha('Empresa não encontrada.', 404);
            const cliente = await ERP.Cliente.findOne({ where: { id: clienteId, empresa_id: empresaId }, ...o });
            if (!cliente)
                throw V.falha('Cliente não encontrado.', 404);
            let cfg = await m.Config.findByPk(empresaId, o);
            if (!cfg)
                cfg = await m.Config.create({ empresa_id: empresaId, slug: crypto.randomUUID() }, o);
            await verificarPortal(cfg, o, { gestor: true });
            let conta = await m.Conta.findOne({ where: { empresa_id: empresaId, cliente_id: clienteId }, ...o, lock: transaction.LOCK.UPDATE });
            const outro = await m.Conta.findOne({ where: { empresa_id: empresaId, email }, ...o });
            if (outro && outro.id !== conta?.id)
                throw V.falha('Este e-mail já está vinculado a outro cliente desta empresa.', 409);
            if (conta)
                await conta.update({ email, ativo: true, senha_hash: null, versao: conta.versao + 1 }, o);
            else
                conta = await m.Conta.create({ id: crypto.randomUUID(), empresa_id: empresaId, cliente_id: clienteId, email, ativo: true }, o);
            await m.Sessao.update({ revogada_em: agora() }, { where: { conta_id: conta.id, revogada_em: null }, ...o });
            await m.Push.update({ ativo: false }, { where: { conta_id: conta.id }, ...o });
            await m.Convite.update({ usado_em: agora() }, { where: { conta_id: conta.id, usado_em: null }, ...o });
            const expira_em = new Date(+agora() + 60 * 60000);
            await m.Convite.create({ id: crypto.randomUUID(), conta_id: conta.id, token_hash: V.hash(token), expira_em, autor_id: autorId }, o);
            await eventos.auditar(empresaId, { tipo: 'gestor', id: autorId }, 'convite', conta.id, ['email', 'versao'], transaction);
            return { cfg, expira_em };
        });
        return { convite: '/cliente-app/app.html?loja=' + r.cfg.slug + '#convite=' + token, expiraEm: r.expira_em, entrega: 'Compartilhe este convite diretamente com o tutor. Ele expira em uma hora e só pode ser utilizado uma vez.' };
    }
    async function aceitarConvite({ token, senha }) {
        V.segredo(env);
        V.senha(senha);
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
            throw V.falha('Convite inválido ou expirado.', 400);
        const preliminar = await m.Convite.findOne({ where: { token_hash: V.hash(token) }, logging: false });
        if (!preliminar || preliminar.usado_em || new Date(preliminar.expira_em) <= agora())
            throw V.falha('Convite inválido ou expirado.', 400);
        const alvo=await m.Conta.findByPk(preliminar.conta_id,{logging:false});
        if(!alvo)throw V.falha('Convite inválido ou expirado.',400);
        await verificarPortal(await m.Config.findByPk(alvo.empresa_id, { logging: false }));
        const senha_hash = await bcrypt.hash(senha, custoHash);
        return serializar(ERP, alvo.empresa_id, async transaction => {
            const o = { transaction, logging: false };
            const conta = await m.Conta.findByPk(preliminar.conta_id, { ...o, lock: transaction.LOCK.UPDATE });
            const c = await m.Convite.findByPk(preliminar.id, { ...o, lock: transaction.LOCK.UPDATE });
            if (!c || c.usado_em || new Date(c.expira_em) <= agora() || !conta?.ativo)
                throw V.falha('Convite inválido ou expirado.', 400);
            const cfg = await m.Config.findByPk(conta.empresa_id, o);
            await verificarPortal(cfg, o);
            const cliente = await ERP.Cliente.findOne({ where: { id: conta.cliente_id, empresa_id: conta.empresa_id }, ...o });
            if (!cliente || cliente.ativo === false) throw V.falha('Acesso indisponível. Fale com o estabelecimento.', 403);
            await conta.update({ senha_hash, versao: conta.versao + 1 }, o);
            await c.update({ usado_em: agora() }, o);
            await m.Tentativa.destroy({ where: { id: V.hash(cfg.slug + ':' + conta.email) }, ...o });
            await m.Sessao.update({ revogada_em: agora() }, { where: { conta_id: conta.id, revogada_em: null }, ...o });
            await eventos.auditar(conta.empresa_id, { tipo: 'tutor', id: conta.id }, 'senha_definida', conta.id, ['senha_hash'], transaction);
            return { ok: true, loja: cfg.slug, email: conta.email };
        });
    }

    async function bloquear(emp, clienteId, autor) { return serializar(ERP,emp,async (transaction) => { const o = { transaction, logging: false }, c = await m.Conta.findOne({ where: { empresa_id: emp, cliente_id: clienteId }, ...o, lock: transaction.LOCK.UPDATE }); if (!c)
        throw V.falha('Acesso não encontrado.', 404); await c.update({ ativo: false, versao: c.versao + 1 }, o); await m.Sessao.update({ revogada_em: agora() }, { where: { conta_id: c.id, revogada_em: null }, ...o }); await m.Push.update({ ativo: false }, { where: { conta_id: c.id }, ...o }); await m.Convite.update({ usado_em: agora() }, { where: { conta_id: c.id, usado_em: null }, ...o }); await eventos.auditar(emp, { tipo: 'gestor', id: autor }, 'acesso_revogado', c.id, [], transaction); return { ok: true }; }); }
    async function recuperar({ loja, email }) { let mail; try {
        mail = V.email(email);
    }
    catch {
        return { ok: true };
    } const cfg = await m.Config.findOne({ where: { slug: V.texto(loja, 36) }, logging: false }); if (cfg?.ativo) {
        const c = await m.Conta.findOne({ where: { empresa_id: cfg.empresa_id, email: mail, ativo: true }, logging: false });
        if (c)
            await eventos.gestor(c.empresa_id, c.cliente_id, 'recuperacao', 'Um tutor solicitou a redefinição de acesso.', { clienteId: c.cliente_id }, 'recuperar:' + c.id + ':' + V.hoje(agora()));
    } return { ok: true }; }
    async function logout(req, res) { const token = req.cookies?.[COOKIE]; if (token)
        try {
            const d = jwt.verify(token, V.segredo(env), { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
            if (d.token_use === 'tutor') {
                await m.Sessao.update({ revogada_em: agora() }, { where: { id: d.sid }, logging: false });
                await m.Push.destroy({ where: { sessao_id: d.sid }, logging: false });
            }
        }
        catch { } limpar(res); return { ok: true }; }
    return { auth, contexto, estabelecimento, login, convite, aceitarConvite, bloquear, recuperar, logout, csrf, m };
}
module.exports = { criarAutenticacao, COOKIE, PATH };
