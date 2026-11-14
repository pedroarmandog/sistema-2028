const {cpfValido}=require('./normalizarCliente');
const texto=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const digitos=v=>String(v??'').replace(/\D/g,'');
function telefone(v){
 let s=digitos(v);if(s.startsWith('0055'))s=s.slice(4);else if(s.length>11&&s.startsWith('55'))s=s.slice(2);
 if(s.startsWith('0')&&[11,12].includes(s.length))s=s.slice(1);
 if(!/^[1-9]\d[2-9]\d{7,8}$/.test(s))return null;
 // Nono dígito apenas para números móveis de oito dígitos (6–9).
 if(s.length===10&&/[6-9]/.test(s[2]))s=s.slice(0,2)+'9'+s.slice(2);
 return s;
}
function telefones(c){let extras=c.telefones_adicionais;try{if(typeof extras==='string')extras=JSON.parse(extras);}catch{extras=[];}
 return [c.telefone,...(Array.isArray(extras)?extras:[])].map(x=>telefone(x&&typeof x==='object'?x.numero||x.telefone:x)).filter(Boolean);
}
function indice(clientes){
 const mapas={codigo:new Map(),legado:new Map(),cpf:new Map(),nomeTelefone:new Map()};
 const add=(m,k,c)=>{if(k){if(!m.has(k))m.set(k,[]);m.get(k).push(c);}};
 for(const c of clientes){add(mapas.codigo,texto(c.codigo_legado),c);add(mapas.legado,texto(c.id_legado),c);const cpf=digitos(c.cpf);if(cpfValido(cpf))add(mapas.cpf,cpf,c);
  for(const tel of new Set(telefones(c)))add(mapas.nomeTelefone,texto(c.nome)+'|'+tel,c);
 }return mapas;
}
function resolver(dados,mapas,{origem='legado'}={}){
 // O cadastro atual tem um único namespace legado por empresa. Códigos de
 // outra origem não comprovada precisam de CPF/nome+telefone ou revisão.
 if(origem!=='legado'&&(dados.tutor_codigo||dados.tutor_id_legado)){
  const independentes={...dados};delete independentes.tutor_codigo;delete independentes.tutor_id_legado;
  const r=resolver(independentes,mapas);
  if(r.situacao!=='automatico')r.motivo='Origem do código do tutor não comprovada. Confira por CPF/nome+telefone ou selecione manualmente.';
  return r;
 }
 const niveis=[];
 if(dados.tutor_codigo)niveis.push({nome:'Código legado',ids:mapas.codigo.get(texto(dados.tutor_codigo))||[]});
 if(dados.tutor_id_legado)niveis.push({nome:'ID legado',ids:mapas.legado.get(texto(dados.tutor_id_legado))||[]});
 if(dados.tutor_cpf){const cpf=digitos(dados.tutor_cpf);if(!cpfValido(cpf))return {situacao:'revisar',motivo:'CPF do tutor inválido; confira ou selecione manualmente.',candidatos:[]};niveis.push({nome:'CPF',ids:mapas.cpf.get(cpf)||[]});}
 if(dados.tutor_nome&&telefone(dados.tutor_telefone))niveis.push({nome:'Nome e telefone',ids:mapas.nomeTelefone.get(texto(dados.tutor_nome)+'|'+telefone(dados.tutor_telefone))||[]});
 if(!niveis.length)return {situacao:'sem_vinculo',motivo:'Dados insuficientes. Pesquise e selecione o tutor.',candidatos:[]};
 // Identificador forte desconhecido não é substituído silenciosamente por um fraco.
 const principal=niveis[0],todos=[...new Map(niveis.flatMap(n=>n.ids).map(c=>[Number(c.id),c])).values()];
 if(principal.ids.length!==1)return {situacao:principal.ids.length?'revisar':'sem_vinculo',motivo:principal.ids.length?'Identificador compartilhado por mais de um tutor.':'Identificador do tutor não encontrado nesta empresa.',candidatos:todos.slice(0,10).map(dto)};
 const c=principal.ids[0];
 if(niveis.slice(1).some(n=>n.ids.length!==1||Number(n.ids[0].id)!==Number(c.id)))return {situacao:'revisar',motivo:'Identificadores do tutor conflitantes ou ambíguos. Confira o vínculo.',candidatos:todos.slice(0,10).map(dto)};
 // Se um identificador forte resolveu, nome/telefone extras não podem apontar para outra pessoa.
 if(dados.tutor_nome&&texto(dados.tutor_nome)!==texto(c.nome))return {situacao:'revisar',motivo:'Nome do tutor diverge do identificador encontrado.',candidatos:[dto(c)]};
 if(dados.tutor_telefone&&(!telefone(dados.tutor_telefone)||!telefones(c).includes(telefone(dados.tutor_telefone))))return {situacao:'revisar',motivo:'Telefone do tutor diverge do cadastro encontrado.',candidatos:[dto(c)]};
 return {situacao:'automatico',motivo:principal.nome,cliente: dto(c),candidatos:[dto(c)]};
}
function dto(c){return{id:c.id,nome:c.nome,telefone:c.telefone||'',codigo_legado:c.codigo_legado||''};}
module.exports={texto,digitos,telefone,telefones,indice,resolver,dto};
