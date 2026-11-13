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
  const perdida = () => Object.assign(new Error('Outro processo assumiu a sessão.'), { code: 'WA_LEASE_LOST' });
  const expirada = () => Object.assign(new Error('A posse precisa ser renovada antes de usar as chaves.'), {code:'WA_LEASE_EXPIRED'});
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
      const validade=agora()+leaseMs;
      await row.update({ dono, validade }, { transaction });
      return {creds,validade};
    });
    if (!tomada) return null;
    let fila = Promise.resolve(), limiteLocal = tomada.validade;
    let filaChaves=Promise.resolve(), aoFalhar=()=>{};
    const cache=new Map(), pendentes=new Map();
    const serial=fn=>{const p=filaChaves.then(fn);filaChaves=p.catch(()=>{});return p;};
    const lembrar=(h,valor)=>{
      cache.delete(h);cache.set(h,{valor,vence:agora()+300000});
      while(cache.size>800)cache.delete(cache.keys().next().value);
    };
    function notificarFalha(e){try{aoFalhar(e);}catch{ /* Não trocar o erro do banco. */ }}
    function operacao(fn) {
      const p = fila.then(() => db.transaction(async transaction => {
        const row = await Sessao.findByPk(empresa, { transaction, lock: transaction.LOCK.UPDATE });
        if (!row || row.dono !== dono) throw perdida();
        if (Number(row.validade)<=agora()) throw expirada();
        return fn(row, transaction);
      }));
      fila = p.catch(() => {});
      return p;
    }
    async function gravarSinais(entradas){
      await operacao(async (_,transaction)=>{
        const excluir=entradas.filter(e=>e.valor===null).map(e=>e.hash);
        const incluir=entradas.filter(e=>e.valor!==null).map(({hash,valor})=>({empresa,hash,valor}));
        if(excluir.length)await Sinal.destroy({where:{empresa,hash:{[Op.in]:excluir}},transaction});
        if(incluir.length)await Sinal.bulkCreate(incluir,{updateOnDuplicate:['valor'],transaction});
      });
      for(const entrada of entradas){
        if(pendentes.get(entrada.hash)===entrada)pendentes.delete(entrada.hash);
        if(entrada.valor===null)cache.delete(entrada.hash);
        else lembrar(entrada.hash,ler(lib,empresa,entrada.hash,entrada.valor));
      }
    }
    const handle = {
      pareada: !!(tomada.creds.me || tomada.creds.registered),
      onFailure(fn){aoFalhar=fn;},
      temPendencias:()=>pendentes.size>0,
      auth: { creds: tomada.creds, keys: {
        get(tipo,ids){return serial(async()=>{
          if(agora()>=limiteLocal)throw expirada();
          if(pendentes.size)await gravarSinais([...pendentes.values()]);
          const out={},faltantes=[];
          for(const id of ids){
            const h=hash(tipo,id),item=cache.get(h);
            if(item&&item.vence>agora()){
              cache.delete(h);cache.set(h,item);out[id]=item.valor;
            }else {cache.delete(h);faltantes.push(id);}
          }
          if(faltantes.length)await operacao(async(_,transaction)=>{
            const hs=faltantes.map(id=>hash(tipo,id));
            const rows=await Sinal.findAll({where:{empresa,hash:{[Op.in]:hs}},transaction});
            const mapa=new Map(rows.map(row=>[row.hash,row.valor]));
            faltantes.forEach((id,i)=>{
              const bytes=mapa.get(hs[i]);if(!bytes)return;
              const valor=ler(lib,empresa,hs[i],bytes);lembrar(hs[i],valor);out[id]=valor;
            });
          });
          if(tipo==='app-state-sync-key')for(const id of Object.keys(out))out[id]=lib.proto.Message.AppStateSyncKeyData.fromObject(out[id]);
          return out;
        }).catch(e=>{notificarFalha(e);throw e;});},
        set(dados){
          const entradas=[];
          for(const [tipo,itens] of Object.entries(dados))for(const [id,valor] of Object.entries(itens)){
            const h=hash(tipo,id),entrada={hash:h,valor:valor==null?null:codificar(lib,empresa,h,valor)};
            entradas.push(entrada);
          }
          // O journal só é removido depois de COMMIT; set nunca confirma falha como sucesso.
          return serial(async()=>{
            for(const entrada of entradas)pendentes.set(entrada.hash,entrada);
            try {await gravarSinais(entradas);}catch(e){notificarFalha(e);throw e;}
          });
        },
      } },
      salvar() {
        const creds = codificar(lib, empresa, 'creds', handle.auth.creds);
        const restaurar = !!(handle.auth.creds.me || handle.auth.creds.registered);
        return operacao((row, transaction) => row.update({ creds, restaurar }, { transaction }));
      },
      async flush(){
        await filaChaves;await fila;
        if(pendentes.size)await serial(()=>gravarSinais([...pendentes.values()]));
      },
      async renovar() {
        // Não entrar na fila de chaves: uma sincronização grande não pode sufocar
        // o heartbeat. CAS por dono permite renovar posse expirada ainda nossa,
        // mas nunca tomar uma posse já transferida para outro processo.
        const validade=agora()+leaseMs;
        const [n]=await Sessao.update({validade},{where:{empresa,dono}});
        if(n!==1){
          // Alguns drivers contam só linhas alteradas: renovar no mesmo ms
          // pode retornar 0 mesmo que a posse continue sendo nossa.
          const row=await Sessao.findByPk(empresa,{attributes:['dono','validade']});
          if(!row||row.dono!==dono||Number(row.validade)<validade)throw perdida();
        }
        limiteLocal=validade;
      },
      vencida:()=>agora()>=limiteLocal-10000,
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
