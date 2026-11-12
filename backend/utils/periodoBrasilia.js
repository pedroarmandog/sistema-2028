const fuso='America/Sao_Paulo';
const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:fuso,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function partes(d){return Object.fromEntries(fmt.formatToParts(new Date(d)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));}
function inicioDia(civil){
  const alvo=Date.parse(civil+'T00:00:00Z');let valor=alvo;
  for(let i=0;i<4;i++){
    const p=partes(valor),local=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    const ajuste=alvo-local;valor+=ajuste;if(!ajuste)return new Date(valor);
  }
  throw new Error('Data de Brasília inválida.');
}
function periodoMes(agora=new Date()){
  const p=partes(agora),mes=Number(p.month),ano=Number(p.year);
  const civil=`${p.year}-${p.month}-01`,fim=`${mes===12?ano+1:ano}-${String(mes===12?1:mes+1).padStart(2,'0')}-01`;
  return {inicio:inicioDia(civil),fim:inicioDia(fim),hoje:`${p.year}-${p.month}-${p.day}`};
}
module.exports={periodoMes};
