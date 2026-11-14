// Sem --aplicar: diagnóstico somente leitura. Não registra segredos/URLs de imagens.
require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),valor=key=>{const i=args.indexOf(key);return i<0?null:args[i+1];};
(async()=>{const db=require('../models').sequelize;let saida;
 try{
  const destino=path.resolve(valor('--relatorio')||'relatorio-midias.jsonl');saida=fs.createWriteStream(destino,{flags:'wx',mode:0o600});await new Promise((ok,no)=>{saida.once('open',ok);saida.once('error',no);});
  const media=require('../services/midias').instancia(),raiz=valor('--raiz');
  const totais=await require('../services/midias/migrar').migrar({db,media,aplicar:args.includes('--aplicar'),empresa:valor('--empresa')||undefined,raizes:raiz?[path.resolve(raiz),...require('../services/midias/legados').raizesPadrao()]:undefined,baseAntiga:valor('--base-antiga')||process.env.MEDIA_LEGACY_BASE_URL||undefined,hosts:(process.env.MEDIA_MIGRATION_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean),receber:async r=>{if(!saida.write(JSON.stringify(r)+'\n'))await new Promise(resolve=>saida.once('drain',resolve));}});
  saida.end(JSON.stringify({modo:args.includes('--aplicar')?'aplicar':'diagnostico',totais})+'\n');await new Promise(resolve=>saida.once('finish',resolve));console.log('Relatório criado:',destino);console.log(totais);if(totais.erros||totais.tabelas_indisponiveis)process.exitCode=1;
 }catch(e){console.error('Migração interrompida:',e.publica?e.message:e.code||e.name);process.exitCode=1;saida?.end();}finally{await db.close();}
})();
