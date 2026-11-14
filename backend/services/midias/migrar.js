const {inventariar,arquivoLocal,substituir}=require('./legados'),{localizar}=require('./index'),{base64,validar}=require('./validar');
const crypto=require('node:crypto');
function modulo(r){const n=r.M.name.toLowerCase();if(/empresa/.test(n))return 'logos';if(/produto/.test(n))return 'produtos';if(/cliente/.test(n))return 'clientes';if(/profissional/.test(n))return 'assinaturas';if(/pet/.test(n))return 'pets';if(/agendamento/.test(n))return 'prontuario';return 'marketing';}
function obter(v,path){for(const k of path)v=k==='$json'?JSON.parse(v):v[k];return v;}
async function migrar({db,media,aplicar=false,empresa,raizes,hosts=[],baseAntiga,receber=()=>{}}){
 const totais={referencias:0,recuperaveis:0,migradas:0,ja_migradas:0,nao_localizadas:0,sem_empresa:0,erros:0,conflitos:0,tabelas_indisponiveis:0};
 if(aplicar)await media.preparar();const existe=await db.getQueryInterface().tableExists(media.Media.getTableName());
 await inventariar(db,{empresa,erro:async e=>{totais.tabelas_indisponiveis++;await receber({status:'tabela_indisponivel',...e});},receber:async r=>{
  totais.referencias++;const item={modelo:r.M.name,id:r.id,campo:r.campo,empresa:r.empresa,origemId:crypto.createHash('sha256').update(r.referencia).digest('hex').slice(0,16)};
  if(!r.empresa){totais.sem_empresa++;return receber({...item,status:'sem_empresa'});}
  try{
   const ref=localizar(r.referencia);const atual=existe&&ref?await media.Media.findOne({where:{empresa_id:r.empresa,caminho:ref}}):null;
   if(atual){if(aplicar)await media.store.ler(atual.chave);totais.ja_migradas++;return receber({...item,status:'ja_migrada'});}
   let origem;
   if(r.referencia.startsWith('data:image/'))origem={bytes:base64(r.referencia),origem:'base64-no-banco'};
   else if(/^https?:\/\//i.test(r.referencia)){
    // Tentar primeiro o mesmo caminho dentro de um backup. Nenhuma URL é buscada sem allowlist.
    const u=new URL(r.referencia);origem=await arquivoLocal(u.pathname,raizes);
    if(!origem&&hosts.includes(u.hostname))origem=await require('./remoto').lerRemoto(r.referencia,{hosts});
   }else origem=await arquivoLocal(r.referencia,raizes);
   if(!origem&&baseAntiga&&ref){
    const url=new URL('/uploads/'+ref.split('/').map(encodeURIComponent).join('/'),baseAntiga);
    origem=await require('./remoto').lerRemoto(url.href,{hosts});
   }
   if(!origem){totais.nao_localizadas++;return receber({...item,status:'nao_localizada'});}
   await validar(origem.bytes,{imagem:false,otimizar:false});totais.recuperaveis++;
   if(!aplicar)return receber({...item,status:'recuperavel',fonte:origem.origem});
   const mod=modulo(r),salvo=await media.salvar(r.empresa,origem.bytes,mod,{imagem:false,publico:mod==='logos',alias:ref||(/^https?:/.test(r.referencia)?new URL(r.referencia).pathname:undefined)});
   const bytes=await media.store.ler(salvo.chave);if(!bytes.length)throw Error('Confirmação de leitura vazia');
   const novo=r.M.name==='Produto'||r.M.name==='Cliente'||r.M.name==='Empresa'?salvo.caminho:salvo.url;
   const mudou=await db.transaction(async transaction=>{
    const row=await r.M.findByPk(r.id,{transaction,lock:transaction.LOCK.UPDATE});
    if(!row||obter(row[r.campo],r.caminho)!==r.referencia)return false;
    await row.update({[r.campo]:substituir(row[r.campo],r.caminho,novo)},{transaction});return true;
   });
   if(mudou){totais.migradas++;await receber({...item,status:'migrada',fonte:origem.origem});}
   else{totais.conflitos++;await receber({...item,status:'alterado_durante_migracao'});}
  }catch(e){totais.erros++;await receber({...item,status:'erro',mensagem:e.publica?e.message:'Falha ao migrar; referência anterior preservada.'});}
 }});return totais;
}
module.exports={migrar};
