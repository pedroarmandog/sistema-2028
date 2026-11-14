// Tolerância apenas na importação: opcionais inválidos são preservados para
// conferência, nunca convertidos em uma identificação fiscal inventada.
function cpfValido(s){
  if(!/^\d{11}$/.test(s)||/^(\d)\1{10}$/.test(s))return false;
  for(let n=9;n<=10;n++){
    let soma=0;for(let i=0;i<n;i++)soma+=Number(s[i])*(n+1-i);
    let d=11-soma%11;if(d>=10)d=0;if(Number(s[n])!==d)return false;
  }
  return true;
}
function preparar(raw,numericos={}){
  const dados={...raw},avisos=[],preservados={};
  const preservar=(campo,motivo)=>{
    preservados[campo]=Object.hasOwn(numericos,campo)?String(numericos[campo]):String(raw[campo]??'');delete dados[campo];avisos.push(`${campo}: ${motivo} Original preservado para conferência.`);
  };
  if(String(dados.cpf??'').trim()){
    let cpf=String(dados.cpf).replace(/\D/g,'');
    if(Object.hasOwn(numericos,'cpf')&&Number.isSafeInteger(numericos.cpf)&&numericos.cpf>=0){
      const original=String(numericos.cpf),restaurado=original.padStart(11,'0');
      if(original.length<11&&cpfValido(restaurado)){
        cpf=restaurado;avisos.push('CPF: zeros à esquerda recuperados de célula numérica; dígitos verificadores conferidos.');
      }else cpf=original;
    }
    if(!cpfValido(cpf))preservar('cpf','Valor não é um CPF válido e não foi usado para identificar/mesclar clientes.');
    else dados.cpf=cpf;
  }
  if(String(dados.cnpj??'').trim()){
    const cnpj=String(dados.cnpj).replace(/\D/g,'');
    if(cnpj.length!==14)preservar('cnpj','Quantidade de dígitos inválida.');else dados.cnpj=cnpj;
  }
  if(String(dados.estado??'').trim()){try{dados.estado=require('../../utils/ufBrasil').normalizarUF(dados.estado);}catch{preservar('estado','UF inválida; selecione uma UF no cadastro antes de emitir NF-e.');}}
  if(String(dados.email??'').trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dados.email).trim()))preservar('email','E-mail inválido.');
  // Datas opcionais continuam sendo validadas pelo conversor. Não presumir uma
  // referência de faturamento nem corrigir uma data civil impossível.
  return {dados,avisos,preservados};
}
module.exports={preparar,cpfValido};
