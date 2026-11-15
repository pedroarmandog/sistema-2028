'use strict';
const V=require('./validacao'),Tema=require('../../../frontend/cliente-app/tema'),{serializar}=require('./agenda');
function ler(cfg){const a=(V.json(cfg?.regras)||{}).aparencia;return {versao:Number.isSafeInteger(a?.versao)&&a.versao>=0?a.versao:0,cores:Tema.normalizar(a?.cores)};}
function preservar(regras,atuais){const a=(V.json(atuais)||{}).aparencia;return a?{...(regras||{}),aparencia:a}:regras;}
function criarAparencia(p){async function obter(emp){return ler(await p.config(emp));}
 async function salvar(emp,autor,b){V.chaves(b,['versao','cores','restaurar']);const versao=V.inteiro(b.versao,0);if(b.restaurar!==undefined&&typeof b.restaurar!=='boolean')throw V.falha('Restauração inválida.');if(b.restaurar===true&&b.cores!==undefined)throw V.falha('Escolha restaurar ou enviar uma paleta.');let cores;try{cores=b.restaurar===true?{...Tema.PADRAO}:Tema.validar(b.cores);}catch(e){throw V.falha(e.message);}
  return serializar(p.ERP,emp,async transaction=>{const cfg=await p.config(emp,{transaction}),atual=ler(cfg);if(atual.versao!==versao)throw V.falha('A paleta mudou em outro computador. Recarregue antes de salvar.',409);const aparencia={versao:versao+1,cores};await cfg.update({regras:{...V.json(cfg.regras),aparencia}},{transaction,logging:false});await p.eventos.auditar(emp,{tipo:'gestor',id:autor},'aparencia_app',emp,['cores'],transaction);await p.eventos.gestor(emp,null,'aparencia','A aparência do aplicativo foi atualizada.',{},'aparencia:'+aparencia.versao,transaction);return aparencia;});}
 return {obter,salvar};}
module.exports={ler,preservar,criarAparencia};
