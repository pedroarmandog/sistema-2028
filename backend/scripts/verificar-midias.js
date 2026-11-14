// Executar após configurar o bucket. Não registra segredos nem URLs assinadas.
require('dotenv').config({quiet:true});process.env.NODE_ENV='production';
(async()=>{const {sequelize}=require('../models/Cliente');try{
 const media=require('../services/midias').instancia();await media.preparar();
 let politicaConfirmada=false;
 try{
  const regras=await media.store.politica();
  if(regras.some(r=>r.Status==='Enabled'&&(r.Expiration||r.NoncurrentVersionExpiration))){throw Object.assign(Error('Existem regras de expiração no bucket. Remova as regras que possam alcançar empresas/ antes de usar.'),{expiracao:true});}
  politicaConfirmada=true;
 }catch(e){if(e.expiracao)throw e;console.warn('Política não consultável com estas credenciais. Confira Lifecycle Rules no painel R2; nenhuma regra pode expirar empresas/.');process.exitCode=2;}
 const empresa=Number(process.argv[2]);if(!Number.isSafeInteger(empresa)||empresa<1)throw Error('Informe o ID interno da empresa: node backend/scripts/verificar-midias.js 1');
 if(!await require('../models').Empresa.findByPk(empresa))throw Error('Empresa não encontrada.');
 const bytes=await require('sharp')({create:{width:2,height:2,channels:4,background:{r:0,g:180,b:80,alpha:1}}}).png().toBuffer();
 const salvo=await media.salvar(empresa,bytes,'diagnostico');const lido=await media.ler(empresa,salvo.url);if(!lido.bytes.length)throw Error('Leitura vazia.');
 console.log('PUT, HEAD, GET e banco: OK. Pequeno objeto de diagnóstico preservado.');
 console.log(politicaConfirmada?'Política sem expiração: confirmada pela API.':'Política: conferência manual pendente (saída 2).');
 }catch(e){console.error('Validação não concluída:',e.publica?e.message:e.message);process.exitCode=1;}finally{await sequelize.close();}})();
