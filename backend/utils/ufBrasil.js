const ESTADOS = Object.freeze({
 AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'
});
const chave=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
function normalizarUF(valor,{estrito=true}={}){
 if(valor==null||String(valor).trim()==='')return null;
 if(typeof valor!=='string'){if(!estrito)return null;throw Object.assign(new Error('Estado (UF) deve ser uma sigla válida, como MG ou SP.'),{status:400});}
 const s=chave(valor),uf=Object.keys(ESTADOS).find(u=>s===u||s===chave(ESTADOS[u])||s===chave(`${ESTADOS[u]} (${u})`));
 if(uf)return uf;
 if(!estrito)return null;
 throw Object.assign(new Error('Estado (UF) inválido. Selecione uma das 27 unidades federativas, por exemplo MG ou SP.'),{status:400});
}
module.exports={ESTADOS,normalizarUF};
