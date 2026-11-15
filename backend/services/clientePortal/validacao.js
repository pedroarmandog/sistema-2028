'use strict';
const crypto = require('node:crypto');
const falha = (mensagem, status = 400) => Object.assign(new Error(mensagem), { status });
const hash = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const json = (v, padrao = {}) => { if (v == null)
    return padrao; if (typeof v === 'string')
    try {
        return JSON.parse(v);
    }
    catch {
        return padrao;
    } return v; };
function texto(v, n = 500, obrigatorio = false) { if (v == null || v === '') {
    if (obrigatorio)
        throw falha('Preencha os campos obrigatórios.');
    return '';
} if (typeof v !== 'string' || v.length > n || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))
    throw falha('Texto inválido ou muito longo.'); const r = v.trim(); if (obrigatorio && !r)
    throw falha('Preencha os campos obrigatórios.'); return r; }
function email(v) { const e = texto(v, 254, true).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    throw falha('Informe um e-mail válido.'); return e; }
function inteiro(v, min = 1, max = 2147483647) { const n = Number(v); if (!Number.isSafeInteger(n) || n < min || n > max)
    throw falha('Número inválido.'); return n; }
function data(v, opcional = false) { if ((v == null || v === '') && opcional)
    return null; if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || (!Number.isFinite(new Date(v + 'T12:00:00Z').getTime()) || new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) !== v))
    throw falha('Informe uma data válida.'); return v; }
function hora(v) { if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
    throw falha('Informe um horário válido.'); return v; }
function instante(d, h) { return new Date(data(d) + 'T' + hora(h) + ':00-03:00'); }
function hoje(agora = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora); }
const minHora = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
function segredo(env = process.env) { const s = env.JWT_CLIENTE_SECRET; if (typeof s !== 'string' || Buffer.byteLength(s) < 32 || [env.JWT_SECRET, env.JWT_USER_SECRET, env.JWT_ADMIN_SECRET, env.ADMIN_JWT_SECRET, 'pethub_user_secret_2026_!@#$%', 'pethub_admin_secret_2026_!@#$%'].includes(s))
    throw falha('PetHub Cliente ainda não configurado no servidor.', 503); return s; }
function senha(s) { if (typeof s !== 'string' || s.length < 10 || Buffer.byteLength(s) > 72 || !/[A-Za-zÀ-ÿ]/.test(s) || !/[0-9]/.test(s))
    throw falha('Use de 10 a 72 bytes, com letras e números, na sua senha.'); return s; }
function chaves(obj, permitidas) { if (!obj || typeof obj !== 'object' || Array.isArray(obj) || Object.keys(obj).some(k => !permitidas.includes(k)))
    throw falha('Campos não permitidos nesta operação.'); return obj; }
function versao(v) { return inteiro(v, 1); }
function uuid(v) { if (typeof v !== 'string' || !/^[a-f0-9-]{36}$/i.test(v))
    throw falha('Identificador inválido.'); return v; }
function etag(obj) { return hash(JSON.stringify(obj)); }
module.exports = { falha, hash, json, texto, email, inteiro, data, hora, instante, hoje, minHora, segredo, senha, chaves, versao, uuid, etag };
