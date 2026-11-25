'use strict';
const crypto = require('node:crypto');
const falha = (message, status = 400, code = 'IA_VALIDACAO') => Object.assign(new Error(message), { status, code });
function objeto(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw falha('Objeto inválido.');
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw falha('Campo não permitido: ' + key);
  return value;
}
function texto(value, max = 500, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw falha('Texto inválido.');
  return value.trim();
}
function inteiro(v, min = 0, max = 1000000000) { const n = Number(v); if (!Number.isSafeInteger(n) || n < min || n > max) throw falha('Número fora do intervalo permitido.'); return n; }
function lista(v, allowed, max = 100) {
  if (!Array.isArray(v) || v.length > max || v.some(x => typeof x !== 'string' || (allowed && !allowed.includes(x)))) throw falha('Lista inválida.');
  return [...new Set(v)];
}
function json(v, fallback = {}) { if (v == null) return fallback; if (typeof v === 'string') { try { return JSON.parse(v); } catch { throw falha('Dados persistidos inválidos.', 503); } } return v; }
function telefone(v) { const s = String(v || '').replace(/\D/g, ''); if (!/^\d{10,15}$/.test(s)) throw falha('Telefone inválido.'); return !s.startsWith('55') && s.length <= 11 ? '55' + s : s; }
const hash = v => crypto.createHash('sha256').update(String(v)).digest('hex');
function chave(env) { const k = Buffer.from(env.PETHUB_IA_ENCRYPTION_KEY || '', 'base64'); if (k.length !== 32) throw falha('Configure PETHUB_IA_ENCRYPTION_KEY no servidor.', 503, 'IA_CONFIG'); return k; }
function cifrar(value, env, aad) { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', chave(env), iv); cipher.setAAD(Buffer.from(String(aad))); return [iv.toString('base64'), Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]).toString('base64'), cipher.getAuthTag().toString('base64')].join('.'); }
function decifrar(value, env, aad) { const [iv, data, tag] = value.split('.'); const d = crypto.createDecipheriv('aes-256-gcm', chave(env), Buffer.from(iv, 'base64')); d.setAAD(Buffer.from(String(aad))); d.setAuthTag(Buffer.from(tag, 'base64')); return JSON.parse(Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString()); }
module.exports = { falha, objeto, texto, inteiro, lista, json, telefone, hash, cifrar, decifrar };
