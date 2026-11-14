const {Op,fn,col,where,literal}=require('sequelize'),I=require('./clienteInteligencia');
const V=require('./importacao/vinculoTutor');
const {periodoMes}=require('../utils/periodoBrasilia');
const erro=m=>Object.assign(new Error(m),{status:400});
function normalSQL(c){let x=fn('LOWER',fn('COALESCE',col(c),''));for(const[a,b]of Object.entries({á:'a',à:'a',â:'a',ã:'a',ä:'a',é:'e',è:'e',ê:'e',ë:'e',í:'i',ó:'o',ô:'o',õ:'o',ú:'u',ü:'u',ç:'c'})){x=fn('REPLACE',x,a,b);x=fn('REPLACE',x,a.toUpperCase(),b);}return x;}
const lista=v=>String(v||'').split(',').filter(Boolean).slice(0,30);
function cadastroEntre(db,inicio,fim){
 const q=db.getQueryInterface().queryGenerator,c=q.quoteIdentifier('Cliente'),t=q.quoteTable(I.modelos(db).Perfil.getTableName());
 const base=`SELECT 1 FROM ${t} p WHERE p.cliente_id=${c}.id AND p.empresa_id=${c}.empresa_id AND p.cadastro_original IS NOT NULL`;
 return {[Op.or]:[
  {[Op.and]:literal(`EXISTS (${base} AND p.cadastro_original >= ${db.escape(inicio)} AND p.cadastro_original < ${db.escape(fim)})`)},
  {createdAt:{[Op.gte]:new Date(inicio+'T00:00:00-03:00'),[Op.lt]:new Date(fim+'T00:00:00-03:00')},[Op.and]:literal(`NOT EXISTS (${base})`)},
 ]};
}
const somar=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
async function listar(db,empresa,query={}){
 if(!Number.isSafeInteger(Number(empresa))||Number(empresa)<1)throw Object.assign(erro('Empresa não identificada.'),{status:403});
 const inteiro=(v,padrao,max)=>{if(v==null)return padrao;if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw erro('Paginação inválida.');return Math.min(Number(v),max);};
 const limit=Math.max(1,inteiro(query.limit,100,150)),offset=query.page!=null?Math.max(0,inteiro(query.page,1,1000000)-1)*limit:inteiro(query.offset,0,150000000);
 const C=db.models.Cliente,P=db.models.Pet,filters=[],termo=V.texto(query.search);await I.preparar(db);
 if(termo.length>100)throw erro('Pesquisa excede 100 caracteres.');
 if(termo){const like='%'+termo.replace(/[\\%_]/g,'\\$&')+'%',or=['nome','email'].map(k=>where(normalSQL(k),{[Op.like]:like}));const digits=V.digitos(termo);
  if(digits&&/^[\d\s()+.\-/]+$/.test(termo))for(const k of ['telefone','cpf']){let x=fn('COALESCE',col(k),'');for(const p of [' ','(',')','-','.','+'])x=fn('REPLACE',x,p,'');or.push(where(x,{[Op.like]:'%'+digits+'%'}));}
  filters.push({[Op.or]:or});
 }
 const status=lista(query.status);if(status.length===1){if(!['ativo','inativo'].includes(status[0]))throw erro('Status inválido.');filters.push({ativo:status[0]==='ativo'});}
 const grupos=lista(query.grupos).map(V.texto);if(grupos.length){let x=normalSQL('grupo_cliente');for(const[a,b]of [[' ','-'],['(',''],[')','']])x=fn('REPLACE',x,a,b);filters.push(where(x,{[Op.in]:grupos}));}
 const hoje=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),amanha=somar(hoje,1);
 const datas=lista(query.datas);if(datas.length){const ranges=datas.map(v=>{const inicio={hoje,ontem:somar(hoje,-1),'ultima-semana':somar(hoje,-7),'ultimo-mes':somar(hoje,-30)}[v];if(!inicio)throw erro('Período de cadastro inválido.');return cadastroEntre(db,inicio,v==='ontem'?hoje:amanha);});filters.push({[Op.or]:ranges});}
 const nivers=lista(query.aniversarios);if(nivers.length){const dias=new Set();for(const v of nivers){if(v==='hoje')dias.add(hoje.slice(5));else if(v==='esta-semana'){const dia=new Date(hoje+'T12:00Z').getUTCDay();for(let i=-dia;i<7-dia;i++)dias.add(somar(hoje,i).slice(5));}else if(v==='este-mes'){for(let i=1;i<=31;i++)dias.add(hoje.slice(5,7)+'-'+String(i).padStart(2,'0'));}else throw erro('Período de aniversário inválido.');}filters.push(where(fn('SUBSTR',col('data_nascimento'),6,5),{[Op.in]:[...dias]}));}
 const semFaturamento=lista(query.dias);if(semFaturamento.length){const dias=semFaturamento.map(Number);if(dias.some(n=>![7,15,30,60].includes(n)))throw erro('Filtro de faturamento inválido.');const q=db.getQueryInterface().queryGenerator,alias=q.quoteIdentifier('Cliente'),v=q.quoteTable(db.models.Venda.getTableName()),h=q.quoteTable(I.modelos(db).Historico.getTableName()),corte=somar(hoje,-Math.min(...dias));filters.push(literal(`NOT EXISTS (SELECT 1 FROM ${v} v WHERE v.empresa_id=${alias}.empresa_id AND v.clienteId=${alias}.id AND v.status <> 'cancelado' AND v.data >= ${db.escape(new Date(corte+'T00:00:00-03:00'))}) AND NOT EXISTS (SELECT 1 FROM ${h} h WHERE h.empresa_id=${alias}.empresa_id AND h.cliente_id=${alias}.id AND h.data_ultima_venda >= ${db.escape(corte)})`));}
 const filtro={empresa_id:empresa,...(filters.length?{[Op.and]:filters}:{})};
 const [totalGeral,total,rows]=await Promise.all([C.count({where:{empresa_id:empresa}}),C.count({where:filtro}),C.findAll({where:filtro,attributes:['id','nome','email','telefone','cpf','cidade','ativo','createdAt','grupo_cliente','imagem_perfil','data_nascimento'],order:[['createdAt','DESC'],['id','DESC']],limit,offset})]);
 const ids=rows.map(c=>c.id),{Perfil}=I.modelos(db);
 const [perfis,pets]=await Promise.all([Perfil.findAll({where:{empresa_id:empresa,cliente_id:{[Op.in]:ids}},attributes:['cliente_id','cadastro_original']}),P.findAll({where:{empresa_id:empresa,cliente_id:{[Op.in]:ids}},attributes:['id','cliente_id','nome'],order:[['nome','ASC'],['id','ASC']]})]);
 const datasMap=new Map(perfis.map(p=>[Number(p.cliente_id),p.cadastro_original])),petsMap=new Map();for(const p of pets){if(!petsMap.has(Number(p.cliente_id)))petsMap.set(Number(p.cliente_id),[]);petsMap.get(Number(p.cliente_id)).push({id:p.id,nome:p.nome});}
 return {success:true,clientes:rows.map(c=>({...c.get({plain:true}),cadastro_original:datasMap.get(Number(c.id))||null,entrada_pethub:c.createdAt,pets:petsMap.get(Number(c.id))||[]})),paginacao:{total,totalGeral,limit,offset,page:Math.floor(offset/limit)+1,paginas:Math.ceil(total/limit)}};
}
async function auditoria(db,empresa){
 await I.preparar(db);const periodo=periodoMes(),C=db.models.Cliente,{Job}=require('./importacao/operacoes').instancia();
 const [total,ativos,cadastradosNoMes,entradasPethubNoMes,ops]=await Promise.all([C.count({where:{empresa_id:empresa}}),C.count({where:{empresa_id:empresa,ativo:true}}),I.clientesNoMes(db,empresa,periodo),C.count({where:{empresa_id:empresa,createdAt:{[Op.gte]:periodo.inicio,[Op.lt]:periodo.fim}}}),Job.findAll({where:{empresa_id:empresa,tipo:'clientes'},attributes:['id','estado','total','cursor','criados','atualizados','ignorados','rejeitados','createdAt','concluidoEm'],order:[['createdAt','DESC']],limit:10})]);
 return {empresa_id:Number(empresa),total,ativos,inativos:total-ativos,cadastradosNoMes,entradasPethubNoMes,periodo:{inicio:periodo.inicio,fim:periodo.fim},operacoes:ops.map(o=>o.get({plain:true})),regra:'Mês: cadastro_original quando informado; caso contrário, createdAt. Entrada no PetHub é um indicador separado.'};
}
module.exports={listar,auditoria,cadastroEntre};
