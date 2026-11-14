'use strict';
const AVISO='Este teste verifica apenas a comunicação com a API. A emissão de notas fiscais ainda depende da habilitação da empresa e de suas configurações fiscais.';
const MENSAGENS={TOKEN_AUSENTE:'O Token Master da Focus NFe ainda não está configurado no servidor.',AUTENTICACAO:'Não foi possível autenticar na Focus NFe. Verifique a configuração e as permissões do Token Master.',VALIDACAO:'Não foi possível concluir a consulta. Verifique o CNPJ informado e os parâmetros enviados.',NAO_ENCONTRADO:'A consulta não encontrou o recurso solicitado. Verifique o CNPJ e o endpoint utilizado.',COMUNICACAO:'Não foi possível estabelecer comunicação com a Focus NFe. Verifique a conectividade e tente novamente.',SUCESSO:'Conexão com a Focus NFe realizada com sucesso! A autenticação e a comunicação com a API estão funcionando.'};
function cnpjValido(valor){
 if(typeof valor!=='string')return null;const n=valor.replace(/[.\-/\s]/g,'');
 if(!/^\d{14}$/.test(n)||/^(\d)\1{13}$/.test(n))return null;
 for(let len=12;len<=13;len++){let soma=0,peso=len-7;for(let i=0;i<len;i++){soma+=Number(n[i])*peso;if(--peso<2)peso=9;}const d=soma%11<2?0:11-soma%11;if(Number(n[len])!==d)return null;}return n;
}
function criarDiagnostico({env=process.env,fetch:consultar=global.fetch,agora=Date.now,timeout=10000}={}){
 return async function testar(cnpj){
  const inicio=agora(),base={servico:'Focus NFe',operacao:'Consulta de CNPJ',ambienteConsultado:'Produção — API cadastral (somente leitura)',executadoEm:new Date(inicio).toISOString(),tempoRespostaMs:null,aviso:AVISO};
  const resultado=(codigo,httpFocus=null)=>({status:codigo==='SUCESSO'?200:codigo==='TOKEN_AUSENTE'?503:codigo==='VALIDACAO'?400:codigo==='TIMEOUT'?504:502,dados:{...base,sucesso:codigo==='SUCESSO',codigo,mensagem:MENSAGENS[codigo]||MENSAGENS.COMUNICACAO,httpFocus,verificacoes:{autenticacao:codigo==='SUCESSO'?'Funcionando':codigo==='AUTENTICACAO'?'Falhou':'Não confirmada',comunicacao:httpFocus?'Funcionando':'Não confirmada',consultaCnpj:codigo==='SUCESSO'?'Funcionando':'Não concluída',emissaoNFe:'Não testada',certificadoA1:'Não verificado'}}});
  const numero=cnpjValido(cnpj);if(!numero)return resultado('VALIDACAO');
  const token=typeof env.FOCUS_NFE_MASTER_TOKEN==='string'?env.FOCUS_NFE_MASTER_TOKEN.trim():'';
  if(!token)return resultado('TOKEN_AUSENTE');
  const controller=new AbortController();let timer;
  try{
   const response=await Promise.race([consultar('https://api.focusnfe.com.br/v2/cnpjs/'+numero,{method:'GET',redirect:'error',signal:controller.signal,headers:{Accept:'application/json',Authorization:'Basic '+Buffer.from(token+':').toString('base64')}}),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('timeout'),{timeout:true}));},timeout);})]);
   base.tempoRespostaMs=Math.max(0,Math.round(agora()-inicio));
   // Não ler, armazenar ou devolver o cadastro completo nem mensagens do provedor.
   try{response.body?.cancel?.()?.catch(()=>{});}catch{}
   const http=response.status;
   if(http===200)return resultado('SUCESSO',http);
   if([401,403].includes(http))return resultado('AUTENTICACAO',http);
   if(http===400)return resultado('VALIDACAO',http);
   if(http===404)return resultado('NAO_ENCONTRADO',http);
   return resultado('COMUNICACAO',http);
  }catch(e){base.tempoRespostaMs=Math.max(0,Math.round(agora()-inicio));return resultado(e?.timeout||controller.signal.aborted?'TIMEOUT':'COMUNICACAO');}
  finally{clearTimeout(timer);}
 };
}
module.exports={criarDiagnostico,cnpjValido,AVISO};
