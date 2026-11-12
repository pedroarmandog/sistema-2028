// Referências de eventos: dados sempre reconsultados dentro da empresa dona.
const {Op}=require('sequelize');
const T=require('./marketingTempo');
const CALENDARIO=new Set(['aniversario_pet','aniversario_tutor','lembrete_agendamento','vacinas_vencendo','produto_recorrente']);
const json=v=>typeof v==='string'?JSON.parse(v):v;
async function todos(model,options={}) {
  const rows=[];
  for(let offset=0;;offset+=500) {
    const parte=await model.findAll({...options,order:[['id','ASC']],limit:500,offset});
    rows.push(...parte); if(parte.length<500)return rows;
  }
}
async function referencias(mensagem, agora=new Date()) {
  const M=require('../models'), emp=Number(mensagem.empresaId), tipo=mensagem.tipo;
  const clientes=await todos(M.Cliente,{attributes:['id','nome','telefone','data_nascimento','ativo','empresa_id'],where:{empresa_id:emp}});
  const porCliente=new Map(clientes.filter(c=>c.ativo!==false).map(c=>[Number(c.id),c]));
  const pets=porCliente.size ? await todos(M.Pet,{attributes:['id','nome','cliente_id','data_nascimento','empresa_id'],where:{cliente_id:{[Op.in]:[...porCliente.keys()]}}}) : [];
  const petsValidos=pets.filter(p=>!p.empresa_id || Number(p.empresa_id)===emp);
  const porPet=new Map(petsValidos.map(p=>[Number(p.id),p]));
  const hoje=T.civil(agora), refs=[];
  function add(data,chave,ctx,cli,pet,variaveis={},extra={}) {
    if(!cli?.telefone)return;
    refs.push({data:T.civil(data),chave,contexto:{clienteId:cli.id,...(pet?{petId:pet.id}:{}),...ctx},telefone:cli.telefone,
      variaveis:{nomeTutor:cli.nome,nomePet:pet?.nome||'seu pet',...variaveis},...extra});
  }
  if(['aniversario_pet','aniversario_tutor'].includes(tipo)) {
    const fontes=tipo==='aniversario_pet'?petsValidos:[...porCliente.values()];
    for(const fonte of fontes) {
      if(!fonte.data_nascimento)continue;
      let md;try{md=T.nascimento(fonte.data_nascimento).slice(5);}catch{continue;}
      for(const ano of [Number(hoje.slice(0,4)),Number(hoje.slice(0,4))+1]) {
        const data=`${ano}-${md}`;
        if(new Date(data+'T12:00:00Z').toISOString().slice(0,10)!==data)continue; // 29/02 só em ano bissexto.
        const cli=tipo==='aniversario_pet'?porCliente.get(Number(fonte.cliente_id)):fonte;
        const pet=tipo==='aniversario_pet'?fonte:petsValidos.find(p=>Number(p.cliente_id)===Number(cli.id));
        add(data,`${tipo}:${fonte.id}:${data}`,{},cli,pet);
      }
    }
  } else if(['lembrete_agendamento','vacinas_vencendo'].includes(tipo)) {
    const ags=await todos(M.Agendamento,{attributes:['id','empresa_id','petId','dataAgendamento','horario','servico','servicos','status'],where:{empresa_id:emp,status:tipo==='vacinas_vencendo'?'concluido':{[Op.in]:['agendado','checkin']}}});
    const periodos=tipo==='vacinas_vencendo'?await todos(M.Periodicidade):[];
    const dias=new Map(periodos.map(p=>[p.descricao.trim().toLowerCase(),Number(p.dias)]));
    for(const ag of ags) {
      const pet=porPet.get(Number(ag.petId)), cli=pet&&porCliente.get(Number(pet.cliente_id));
      if(!cli)continue;
      if(tipo==='lembrete_agendamento') {
        if(+new Date(ag.dataAgendamento)<=+agora)continue;
        const data=T.civil(ag.dataAgendamento);
        add(data,`${tipo}:${ag.id}:${new Date(ag.dataAgendamento).toISOString()}`,{agendamentoId:ag.id},cli,pet,
          {dataAgendamento:T.formatarData(data),horaAgendamento:ag.horario?.slice(0,5),servico:ag.servico}, {limite:new Date(ag.dataAgendamento)});
      } else {
        const itens=json(ag.servicos)||[];
        for(let indice=0;indice<itens.length;indice++) {
          const s=itens[indice],meta=s.meta||{};
          if(!['vacina','vermifugo','antiparasitario'].includes(meta.tipoEspecial))continue;
          const n=dias.get(String(meta.renovacao||meta.proximaDose||'').trim().toLowerCase());
          if(!Number.isInteger(n)||n<=0)continue;
          let data;try{data=T.somarDias(meta.dataAplic?T.nascimento(meta.dataAplic):ag.dataAgendamento,n);}catch{continue;}
          add(data,`${tipo}:${ag.id}:${indice}:${String(s.id??s.produtoId??s.nome??meta.nome??meta.tipoEspecial)}:${data}`,{agendamentoId:ag.id,servicoIndice:indice},cli,pet,
            {produto:s.nome||meta.nome||meta.tipoEspecial,dataRenovacao:T.formatarData(data)});
        }
      }
    }
  } else if(tipo==='produto_recorrente') {
    const lembretes=await todos(M.ProdutoLembreteRecorrente,{where:{empresa_id:emp,ativo:true,status:'ativo'}});
    for(const l of lembretes) {
      const cli=porCliente.get(Number(l.cliente_id)); if(!cli||!l.data_proximo_disparo)continue;
      const dias=Number(l.dias_lembrete); if(!Number.isInteger(dias)||dias<1)continue;
      let base;try{base=T.civil(l.data_proximo_disparo);}catch{continue;}
      // Avançar ciclos vencidos sem mudar a âncora da regra original.
      if(base<hoje) {
        const diff=Math.round((Date.parse(hoje+'T12:00Z')-Date.parse(base+'T12:00Z'))/86400000);
        base=T.somarDias(base,Math.ceil(diff/dias)*dias);
        await l.update({data_proximo_disparo:T.horario(base,'09:00')});
      }
      for(let data=base;data<=T.somarDias(hoje,7);data=T.somarDias(data,dias)) {
        const pet=petsValidos.find(p=>Number(p.cliente_id)===Number(cli.id));
        add(data,`${tipo}:${l.id}:${data}`,{lembreteId:l.id,cicloData:data},cli,pet,{produto_nome:l.produto_nome,produto:l.produto_nome});
      }
    }
  }
  return refs;
}
async function validarContexto(empresa, contexto={}) {
  const {Cliente,Pet,Agendamento,ProdutoLembreteRecorrente}=require('../models');
  const emp=Number(empresa); if(!Number.isSafeInteger(emp)||emp<1)return false;
  let clienteId=contexto.clienteId;
  if(contexto.agendamentoId) {
    const ag=await Agendamento.findOne({where:{id:contexto.agendamentoId,empresa_id:emp}});
    if(!ag||ag.status==='cancelado')return false;
    if(contexto.petId && Number(ag.petId)!==Number(contexto.petId))return false;
    contexto={...contexto,petId:ag.petId};
  }
  if(contexto.petId) {
    const p=await Pet.findByPk(contexto.petId);
    if(!p||(p.empresa_id && Number(p.empresa_id)!==emp))return false;
    if(clienteId && Number(p.cliente_id)!==Number(clienteId))return false;
    clienteId=p.cliente_id;
  }
  if(contexto.lembreteId) {
    const l=await ProdutoLembreteRecorrente.findOne({where:{id:contexto.lembreteId,empresa_id:emp,ativo:true,status:'ativo'}});
    if(!l || (clienteId && Number(l.cliente_id)!==Number(clienteId)))return false;
    clienteId=l.cliente_id;
  }
  if(clienteId) {
    const c=await Cliente.findOne({where:{id:clienteId,empresa_id:emp}});
    if(!c||c.ativo===false)return false;
    const normalizado={...contexto,clienteId:Number(clienteId)};
    for(const k of ['petId','agendamentoId','lembreteId'])if(normalizado[k]!=null)normalizado[k]=Number(normalizado[k]);
    return {cliente:c,contexto:normalizado};
  }
  return false; // Automação sem destinatário persistido não pode ser enviada.
}
async function validarEnvio(envio,agora=new Date()) {
  if(!envio.mensagemAutomaticaId)return {ok:true}; // Campanhas têm seu próprio processador.
  const {MensagemAutomatica}=require('../models');
  const m=await MensagemAutomatica.findOne({where:{id:envio.mensagemAutomaticaId,empresaId:envio.empresaId,ativo:true}});
  if(!m)return {ok:false,motivo:'Automação desativada ou ausente.'};
  const ctx=json(envio.contexto)||{}, dono=await validarContexto(envio.empresaId,ctx);
  if(!dono)return {ok:false,motivo:'Evento/destinatário não pertence à empresa ou foi cancelado.'};
  if(String(dono.cliente.telefone||'').replace(/\D/g,'')!==String(envio.telefoneDestino).replace(/\D/g,''))return {ok:false,motivo:'Telefone do destinatário alterado. Reagende o envio.'};
  if(ctx.manual || T.IMEDIATOS.has(m.tipo))return {ok:true};
  if(!CALENDARIO.has(m.tipo))return {ok:false,motivo:'Tipo de automação sem regra de referência.'};
  if(!ctx.eventoChave || !ctx.referenciaData)return {ok:false,motivo:'Agendamento legado sem referência verificável; substituído pelo planejamento atual.'};
  const c=T.config(m.configuracaoEnvio,m.tipo);
  if(!c.dias.includes(Number(ctx.diasAntes)))return {ok:false,motivo:'Dia removido da configuração.'};
  const data=T.somarDias(ctx.referenciaData,-Number(ctx.diasAntes));
  if(data<T.civil(agora))return {ok:false,motivo:'Data de disparo expirada ou alterada.'};
  const refs=await referencias(m,agora), ref=refs.find(r=>r.chave===ctx.eventoChave);
  if(!ref)return {ok:false,motivo:'Evento alterado, removido ou encerrado.'};
  const horario=T.horario(data,c.hora);
  if(+agora<+horario)return {ok:false,adiar:horario,motivo:'Aguardando o horário de Brasília configurado.'};
  if(ref.limite && +agora>=+ref.limite)return {ok:false,motivo:'Horário do evento já passou.'};
  return {ok:true};
}
module.exports={CALENDARIO,todos,referencias,validarContexto,validarEnvio};
