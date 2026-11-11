// Persistência cifrada por empresa; lease impede dois processos no mesmo vínculo.
const crypto = require('node:crypto');
const { DataTypes, Op } = require('sequelize');
function chaveDoServidor() {
  const hex = process.env.WHATSAPP_AUTH_KEY || process.env.FISCAL_ENCRYPTION_KEY || '';
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw Object.assign(new Error('Configure WHATSAPP_AUTH_KEY com 64 caracteres hexadecimais.'), { code: 'WA_AUTH_CONFIG' });
  }
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(hex, 'hex'), Buffer.from('PetHub'), Buffer.from('WhatsApp/auth/v1'), 32));
}
function criarRepositorio(db, chave = chaveDoServidor(), { agora = Date.now, leaseMs = 90000 } = {}) {
  const Sessao = db.models.PetHubWaAuth || db.define('PetHubWaAuth', {
    empresa: { type: DataTypes.STRING(32), primaryKey: true },
    dono: DataTypes.STRING(36), validade: DataTypes.BIGINT,
    restaurar: { type: DataTypes.BOOLEAN, defaultValue: false },
    creds: DataTypes.BLOB('long'),
  }, { tableName: 'pethub_wa_auth', timestamps: false });
  const Sinal = db.models.PetHubWaSignal || db.define('PetHubWaSignal', {
    empresa: { type: DataTypes.STRING(32), primaryKey: true },
    hash: { type: DataTypes.STRING(64), primaryKey: true }, valor: DataTypes.BLOB('long'),
  }, { tableName: 'pethub_wa_signal', timestamps: false });
  let pronto;
  const preparar = () => pronto ??= Sessao.sync().then(() => Sinal.sync()).catch(e => { pronto = null; throw e; });
  const hash = (tipo, id) => crypto.createHash('sha256').update(JSON.stringify([tipo, id])).digest('hex');
  const perdida = () => Object.assign(new Error('Posse da sessão transferida ou expirada.'), { code: 'WA_LEASE_LOST' });
  function codificar(lib, empresa, campo, valor) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', chave, iv);
    cipher.setAAD(Buffer.from(JSON.stringify([empresa, campo])));
    const bytes = Buffer.from(JSON.stringify(valor, lib.BufferJSON.replacer));
    const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]);
  }
  function ler(lib, empresa, campo, valor) {
    try {
      const bytes = Buffer.from(valor), decipher = crypto.createDecipheriv('aes-256-gcm', chave, bytes.subarray(0, 12));
      decipher.setAAD(Buffer.from(JSON.stringify([empresa, campo])));
      decipher.setAuthTag(bytes.subarray(12, 28));
      return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString(), lib.BufferJSON.reviver);
    } catch {
      throw Object.assign(new Error('Não foi possível recuperar o vínculo. Verifique a chave de criptografia do servidor.'), { code: 'WA_AUTH_UNREADABLE' });
    }
  }
  async function adquirir(empresa, lib, manual) {
    empresa = String(empresa);
    await preparar();
    if (manual) await Sessao.findOrCreate({ where: { empresa }, defaults: { validade: 0 } });
    const dono = crypto.randomUUID();
    const tomada = await db.transaction(async transaction => {
      const row = await Sessao.findByPk(empresa, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row || (!manual && !row.restaurar) || (row.dono && Number(row.validade) > agora())) return null;
      const creds = row.creds ? ler(lib, empresa, 'creds', row.creds) : lib.initAuthCreds();
      await row.update({ dono, validade: agora() + leaseMs }, { transaction });
      return creds;
    });
    if (!tomada) return null;
    let fila = Promise.resolve(), ultimaRenovacao = agora();
    function operacao(fn) {
      const p = fila.then(() => db.transaction(async transaction => {
        const row = await Sessao.findByPk(empresa, { transaction, lock: transaction.LOCK.UPDATE });
        if (!row || row.dono !== dono || Number(row.validade) <= agora()) throw perdida();
        return fn(row, transaction);
      }));
      fila = p.catch(() => {});
      return p;
    }
    const handle = {
      pareada: !!(tomada.me || tomada.registered),
      auth: { creds: tomada, keys: {
        async get(tipo, ids) {
          if (!ids.length) return {};
          return operacao(async (_, transaction) => {
            const hashes = ids.map(id => hash(tipo, id));
            const rows = await Sinal.findAll({ where: { empresa, hash: { [Op.in]: hashes } }, transaction });
            const mapa = new Map(rows.map(row => [row.hash, row.valor])), out = {};
            ids.forEach((id, i) => {
              const bytes = mapa.get(hashes[i]);
              if (!bytes) return;
              const valor = ler(lib, empresa, hashes[i], bytes);
              out[id] = tipo === 'app-state-sync-key' ? lib.proto.Message.AppStateSyncKeyData.fromObject(valor) : valor;
            });
            return out;
          });
        },
        async set(dados) {
          const incluir = [], excluir = [];
          for (const [tipo, itens] of Object.entries(dados)) for (const [id, valor] of Object.entries(itens)) {
            const h = hash(tipo, id);
            if (valor == null) excluir.push(h);
            else incluir.push({ empresa, hash: h, valor: codificar(lib, empresa, h, valor) });
          }
          return operacao(async (_, transaction) => {
            if (excluir.length) await Sinal.destroy({ where: { empresa, hash: { [Op.in]: excluir } }, transaction });
            if (incluir.length) await Sinal.bulkCreate(incluir, { updateOnDuplicate: ['valor'], transaction });
          });
        },
      } },
      salvar() {
        const creds = codificar(lib, empresa, 'creds', handle.auth.creds);
        const restaurar = !!(handle.auth.creds.me || handle.auth.creds.registered);
        return operacao((row, transaction) => row.update({ creds, restaurar }, { transaction }));
      },
      flush: () => fila,
      async renovar() {
        await operacao((row, transaction) => row.update({ validade: agora() + leaseMs }, { transaction }));
        ultimaRenovacao = agora();
      },
      vencida: () => agora() - ultimaRenovacao >= leaseMs - 10000,
      liberar: () => operacao((row, transaction) => row.update({ dono: null, validade: 0 }, { transaction })),
      pausar: () => operacao((row, transaction) => row.update({ restaurar: false, dono: null, validade: 0 }, { transaction })),
      remover: () => operacao(async (row, transaction) => {
        await Sinal.destroy({ where: { empresa }, transaction });
        await row.destroy({ transaction });
      }),
    };
    return handle;
  }
  return { adquirir,
    async candidatas() {
      await preparar();
      const rows = await Sessao.findAll({ where: { restaurar: true, validade: { [Op.lte]: agora() } }, attributes: ['empresa'] });
      return rows.map(row => row.empresa);
    },
    async removerSemSocket(empresa) {
      await preparar();
      await db.transaction(async transaction => {
        const row = await Sessao.findByPk(String(empresa), { transaction, lock: transaction.LOCK.UPDATE });
        if (!row) return;
        if (row.dono && Number(row.validade) > agora()) throw perdida();
        await Sinal.destroy({ where: { empresa: String(empresa) }, transaction });
        await row.destroy({ transaction });
      });
    },
  };
}
module.exports = { criarRepositorio };
