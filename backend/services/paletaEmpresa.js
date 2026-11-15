'use strict';
const {DataTypes}=require('sequelize'),S=require('../../frontend/tema-esquema');
const erro=(m,status=400)=>Object.assign(new Error(m),{status});
async function preparar(db){const q=db.getQueryInterface(),t=db.models.Empresa?.getTableName()||'empresas',cols=await q.describeTable(t);
 for(const [k,def]of Object.entries({paleta_cores:{type:DataTypes.JSON,allowNull:true},paleta_cores_versao:{type:DataTypes.INTEGER,allowNull:false,defaultValue:0}}))if(!cols[k])try{await q.addColumn(t,k,def);}catch(e){if(!(await q.describeTable(t))[k])throw e;}
}
function criarServico({db,Empresa=db.models.Empresa,intervalo=2000,agendar=setInterval,cancelar=clearInterval}={}){
 const grupos=new Map();
 const empresa=id=>{const n=Number(id);if(!Number.isSafeInteger(n)||n<1)throw erro('Empresa não identificada.',403);return n;};
 function dto(row){let cores=S.montar(),personalizada=false;if(row.paleta_cores!=null){let v=row.paleta_cores;if(typeof v==='string')v=JSON.parse(v);cores=S.normalizar(v);personalizada=true;}
 return {systemColors:cores,tema:{empresaId:Number(row.id),versao:Number(row.paleta_cores_versao)||0,personalizada}};}
 async function ler(id,{transaction,lock}={}){const row=await Empresa.findByPk(empresa(id),{attributes:['id','paleta_cores','paleta_cores_versao'],transaction,lock});if(!row)throw erro('Empresa não encontrada.',404);return dto(row);}
 function publicar(id,atual){const g=grupos.get(String(id));if(!g||g.versao>=atual.tema.versao)return;g.versao=atual.tema.versao;for(const fn of g.ouvintes)try{fn(atual);}catch{}}
 async function alterar(id,body,{transaction}={}){
  id=empresa(id);if(['restaurarCores','patchCores','systemColors'].filter(k=>Object.hasOwn(body,k)).length!==1)throw erro('Escolha uma única operação de paleta.');if(Object.hasOwn(body,'restaurarCores')&&body.restaurarCores!==true)throw erro('Restauração inválida.');if(!Number.isSafeInteger(body.versaoBase)||body.versaoBase<0)throw erro('Atualize a página para salvar a paleta com segurança.',409);
  const reset=body.restaurarCores===true;let patch;if(!reset)patch=body.patchCores?S.patches(body.patchCores):S.valores(S.normalizar(body.systemColors));
  const work=async t=>{const row=await Empresa.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!row)throw erro('Empresa não encontrada.',404);const antes=dto(row);
   if(antes.tema.versao!==body.versaoBase)throw Object.assign(erro('A paleta foi atualizada por outra sessão. Confira as cores atuais e tente novamente.',409),{atual:antes});
   const atual=reset?null:S.montar({...S.valores(antes.systemColors),...patch});
   await row.update({paleta_cores:atual,paleta_cores_versao:antes.tema.versao+1},{transaction:t});const novo=dto(row);t.afterCommit(()=>publicar(id,novo));return novo;};
  return transaction?work(transaction):db.transaction(work);
 }
 async function assinar(id,fn){id=empresa(id);const key=String(id);let g=grupos.get(key);if(!g){g={ouvintes:new Set(),versao:-1,consultando:false};grupos.set(key,g);g.timer=agendar(async()=>{if(g.consultando)return;g.consultando=true;try{publicar(id,await ler(id));}catch{/* A reconexão consulta novamente; não publicar padrões em erro de banco. */}finally{g.consultando=false;}},intervalo);g.timer?.unref?.();}
  g.ouvintes.add(fn);try{const atual=await ler(id);if(g.ouvintes.has(fn)){g.versao=Math.max(g.versao,atual.tema.versao);fn(atual);}}catch(e){remover();throw e;}
  function remover(){g.ouvintes.delete(fn);if(!g.ouvintes.size){cancelar(g.timer);if(grupos.get(key)===g)grupos.delete(key);}}
  return remover;
 }
 function fechar(){for(const g of grupos.values())cancelar(g.timer);grupos.clear();}
 return {ler,alterar,assinar,fechar,grupos};
}
let singleton;function instancia(){const db=require('../models/Cliente').sequelize;return singleton??=criarServico({db});}
module.exports={preparar,criarServico,instancia};
