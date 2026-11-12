const FUSO = 'America/Sao_Paulo';
const DIAS = [0, 1, 2, 3, 5, 7];
const IMEDIATOS = new Set(['boas_vindas', 'pet_pronto', 'primeiro_banho']);
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' });
const falhar = mensagem => { throw Object.assign(new Error(mensagem), {status:400}); };
function partes(valor) {
  const date = new Date(valor);
  if (!Number.isFinite(+date)) falhar('Data de referência inválida.');
  return Object.fromEntries(formatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
function civil(valor = new Date()) {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    if (new Date(valor+'T12:00:00Z').toISOString().slice(0,10)!==valor) falhar('Data inválida.');
    return valor;
  }
  const p=partes(valor); return `${p.year}-${p.month}-${p.day}`;
}
function somarDias(data, dias) {
  const d=new Date(civil(data)+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+Number(dias)); return d.toISOString().slice(0,10);
}
function horario(data, hora='09:00') {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) falhar('Horário inválido. Use HH:MM (Brasília).');
  const alvo=civil(data)+'T'+hora+':00Z', base=Date.parse(alvo);
  let valor=base;
  for(let i=0;i<4;i++) {
    const p=partes(valor);
    const parede=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    const ajuste=base-parede; valor+=ajuste; if(!ajuste)return new Date(valor);
  }
  falhar('Horário inexistente no fuso de Brasília.');
}
function config(valor, tipo, estrita=false) {
  let c;try{c=typeof valor==='string' ? JSON.parse(valor) : valor;}catch{falhar('Configuração de envio inválida.');}
  if(c!=null && (typeof c!=='object' || Array.isArray(c)))falhar('Configuração de envio inválida.');
  c ||= {};
  if(IMEDIATOS.has(tipo)) {
    if(estrita && ((c.dias && (!Array.isArray(c.dias) || c.dias.some(d=>Number(d)!==0))) || c.tipo==='dias_antes')) falhar('Esta mensagem é imediata: não pode ser enviada antes do evento.');
    return {tipo:'imediato', dias:[0]};
  }
  const dias=c.dias ?? (c.tipo==='dias_antes' ? [Number(c.valor ?? 1)] : [0]);
  if(!Array.isArray(dias) || !dias.length || dias.some(d=>!['number','string'].includes(typeof d)||!DIAS.includes(Number(d))))falhar('Selecione dias válidos: 0, 1, 2, 3, 5 ou 7.');
  const hora=c.hora ?? '09:00';
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))falhar('Horário inválido. Use HH:MM (Brasília).');
  return {hora,dias:[...new Set(dias.map(Number))].sort((a,b)=>a-b)};
}
const nascimento = d => civil(typeof d==='string'?d.slice(0,10):new Date(d).toISOString().slice(0,10));
const formatarData = d => civil(d).split('-').reverse().join('/');
module.exports={FUSO,DIAS,IMEDIATOS,nascimento,civil,somarDias,horario,config,formatarData};
