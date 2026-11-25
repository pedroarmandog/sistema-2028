'use strict';
const {Op}=require('sequelize'),V=require('./validacao');
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function criar({m,env}){
 function lerCursor(value,empresa,consulta){
  if(!value)return null;
  if(typeof value!=='string'||value.length>1200)throw V.falha('Cursor inválido.');
  let c;try{c=JSON.parse(Buffer.from(value,'base64url').toString());}catch{throw V.falha('Cursor inválido.');}
  if(c.empresa!==empresa||c.consulta!==consulta||typeof c.id!=='string'||!c.id||c.id.length>64||!Number.isFinite(+new Date(c.data)))throw V.falha('Cursor não pertence a esta consulta.');
  return c;
 }
 const cursor=(row,empresa,consulta)=>Buffer.from(JSON.stringify({empresa,consulta,id:row.id,data:row.updatedAt.toISOString()})).toString('base64url');
 async function listar(empresa,b={}){
  V.objeto(b,['estado','busca','limite','cursor']);
  const estado=b.estado||'',q=normal(V.texto(b.busca||'',120)),limite=V.inteiro(b.limite??25,1,50);
  if(!['','ia','humano','aguardando','finalizada','agendamentos','erros'].includes(estado))throw V.falha('Filtro de conversas inválido.');
  const hash=V.hash(JSON.stringify({estado,q}));let after=lerCursor(b.cursor,empresa,hash),last=null,examinadas=0,temMais=true;
  const itens=[];let mensagensExaminadas=0;
  while(itens.length<limite&&examinadas<500&&temMais){
   const where={empresa_id:empresa,provedor:{[Op.ne]:'teste'}};
   if(['ia','humano','finalizada'].includes(estado))where.estado=estado;
   if(estado==='aguardando'){where.estado='humano';where[Op.or]=[{dono:null},{dono:{[Op.like]:'ia:%'}},{dono:{[Op.in]:['falha','reinicializacao','audio_nao_contratado']}}];}
   if(after)where[Op.and]=[{[Op.or]:[{updatedAt:{[Op.lt]:new Date(after.data)}},{updatedAt:new Date(after.data),id:{[Op.lt]:after.id}}]}];
   const batch=await m.Conversa.findAll({where,order:[['updatedAt','DESC'],['id','DESC']],limit:51});
   const rows=batch.slice(0,50);temMais=batch.length>50;if(!rows.length)break;
   const ids=rows.map(c=>c.id),scoped={empresa_id:empresa,conversa_id:{[Op.in]:ids}};
   const [actions,jobs]=await Promise.all([
    m.Acao.findAll({where:{...scoped,...(estado==='agendamentos'?{tipo:'criarAgendamento',estado:'concluida'}:{estado:'aguardando_gestor'})},attributes:['conversa_id']}),
    m.Fila.findAll({where:{...scoped,teste:false,estado:{[Op.in]:['falha','incerto']}},attributes:['conversa_id']})
   ]);
   const withActions=new Set(actions.map(a=>a.conversa_id)),withErrors=new Set(jobs.map(j=>j.conversa_id));
   // A busca percorre apenas candidatos da própria empresa e nunca consulta texto em claro no banco.
   // Cada conversa é lida em blocos para não cortar o histórico silenciosamente.
   for(let i=0;i<rows.length;i++){
    const c=rows[i];last=c;after={data:c.updatedAt.toISOString(),id:c.id};examinadas++;
    if((estado==='agendamentos'&&!withActions.has(c.id))||(estado==='erros'&&!withErrors.has(c.id)))continue;
    const telefone=V.decifrar(c.contato_cifrado,env,'contato:'+empresa).telefone;
    let matched=!q||normal(c.nome).includes(q)||normal(telefone).includes(q)||normal(c.id).includes(q);
    if(!matched){let offset=0;
     do{const messages=await m.Mensagem.findAll({where:{empresa_id:empresa,conversa_id:c.id},attributes:['texto_cifrado'],order:[['createdAt','DESC'],['id','DESC']],limit:200,offset});
      mensagensExaminadas+=messages.length;if(mensagensExaminadas>20000)throw V.falha('Busca muito ampla. Refine o termo, use nome/telefone ou selecione uma situação.',422);
      matched=messages.some(msg=>normal(V.decifrar(msg.texto_cifrado,env,'msg:'+empresa).texto).includes(q));
      if(matched||messages.length<200)break;offset+=200;
      if(offset>=10000)throw V.falha('Uma conversa excedeu 10.000 mensagens. Abra seu histórico individual ou refine a busca pelo nome/telefone.',422);
     }while(!matched);
    }
    if(!matched)continue;
    const latest=await m.Mensagem.findOne({where:{empresa_id:empresa,conversa_id:c.id},order:[['createdAt','DESC'],['id','DESC']],attributes:['texto_cifrado','createdAt','papel','evento']});
    itens.push({id:c.id,nome:c.nome,telefone,estado:c.estado,dono:c.dono,provedor:c.provedor,ultima_entrada:c.ultima_entrada,ultimo_envio:c.ultimo_envio,ultimaMensagem:latest?(V.decifrar(latest.texto_cifrado,env,'msg:'+empresa).texto||'[Áudio]').slice(0,180):'',ultimaMensagemEm:latest?.createdAt||null,aguardandoAprovacao:withActions.has(c.id)&&estado!=='agendamentos',comErro:withErrors.has(c.id)});
    if(itens.length===limite){temMais=temMais||i<rows.length-1;break;}
   }
  }
  return{itens,temMais,proximoCursor:temMais&&last?cursor(last,empresa,hash):null,examinadas,buscaParcial:temMais&&examinadas>=500};
 }
 async function mensagens(empresa,id,b={}){
  V.objeto(b,['limite','antes']);const c=await m.Conversa.findOne({where:{empresa_id:empresa,id,provedor:{[Op.ne]:'teste'}}});if(!c)throw V.falha('Conversa não encontrada.',404);
  const limite=V.inteiro(b.limite??50,1,100),hash=V.hash('mensagens:'+id),after=lerCursor(b.antes,empresa,hash),where={empresa_id:empresa,conversa_id:id};
  if(after)where[Op.or]=[{createdAt:{[Op.lt]:new Date(after.data)}},{createdAt:new Date(after.data),id:{[Op.lt]:after.id}}];
  const rows=await m.Mensagem.findAll({where,order:[['createdAt','DESC'],['id','DESC']],limit:limite+1});const more=rows.length>limite,selected=rows.slice(0,limite),last=selected.at(-1);
  return{itens:selected.reverse().map(r=>({id:r.id,papel:r.papel,texto:V.decifrar(r.texto_cifrado,env,'msg:'+empresa).texto||'[Áudio]',data:r.createdAt,autor:V.json(r.evento).autor?'equipe':r.papel==='assistant'?'ia':'cliente'})),temMais:more,proximoCursor:more?cursor({id:last.id,updatedAt:last.createdAt},empresa,hash):null};
 }
 return{listar,mensagens};
}
module.exports={criar};
