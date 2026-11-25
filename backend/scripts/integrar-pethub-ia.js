'use strict';
const fs=require('node:fs'),path=require('node:path');
function integrar(root=path.resolve(__dirname,'../..')){
 const files=['backend/app.js','frontend/painel-admin/admin-dashboard.js','frontend/novo-atendimento-global.js','package.json','backend/services/pushNotificationService.js','frontend/mobile/service-worker.js'];const texts=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]));
 let app=texts['backend/app.js'];
 if(!app.includes('/* PETHUB_IA_INTEGRACAO */')){
  const parser='app.use(bodyParser.json(';if(!app.includes(parser)||!app.includes('app.use(cookieParser());')||!app.includes('const tagsToInject = [];'))throw Error('app.js fora do formato reconhecido. Nenhum arquivo foi alterado.');
  app=app.replace(parser,`/* PETHUB_IA_INTEGRACAO */
const pethubIA=require('./services/pethubIA').instancia();
// Corpo bruto exclusivamente neste webhook; assinatura verificada antes de interpretar JSON.
app.use('/api/pethub-ia/webhook',require('./routes/pethubIARoutes').criarWebhook(pethubIA));
`+parser);
  app=app.replace('app.use(cookieParser());',`app.use(cookieParser());
app.use('/api/pethub-ia',require('./routes/pethubIARoutes').criarRotas(pethubIA,{authUser,authAdmin:require('./middleware/authAdmin').authAdmin}));
app.get('/configuracoes/pethub-ia.html',authUser,async(req,res)=>{try{await pethubIA.permitidoGestor(req);await pethubIA.assinaturas.estado(req.user.empresaId);res.sendFile(require('node:path').resolve(__dirname,'../frontend/configuracoes/pethub-ia.html'));}catch(e){res.status(e.status||503).type('text/plain').send(e.status===403?'PetHub IA não está liberado para esta empresa.':'PetHub IA indisponível.');}});
// Só o worker da IA é iniciado; não inicia ou substitui sessões WhatsApp.
pethubIA.iniciar();
process.once('SIGTERM',()=>pethubIA.parar());
`);
  app=app.replace('const tagsToInject = [];',`const tagsToInject = [];
    if ((req.path==='/painel-admin/admin-dashboard.html'||(!/^\\/(cliente-app|mobile|comunidade|painel-admin|login)\\//.test(req.path)))&&!html.includes('/components/pethub-ia/loader.js')) tagsToInject.push('<script defer src="/components/pethub-ia/loader.js?v=1"></script>');`);
  app=app.replace('allowedHeaders: [','allowedHeaders: [\n      "X-PetHub-IA",');
 }
 texts['backend/app.js']=app;
 let admin=texts['frontend/painel-admin/admin-dashboard.js'];if(!admin.includes('PetHubIAAdmin?.empresaCriada')){const needle='showNotification("Empresa e usuário criados com sucesso!", "success");';if(!admin.includes(needle))throw Error('Fluxo administrativo não reconhecido. Nenhum arquivo foi alterado.');admin=admin.replace(needle,'void window.PetHubIAAdmin?.empresaCriada(data);\n        '+needle);}admin=admin.replace('await window.PetHubIAAdmin?.empresaCriada(data);','void window.PetHubIAAdmin?.empresaCriada(data);');texts['frontend/painel-admin/admin-dashboard.js']=admin;
 let agenda=texts['frontend/novo-atendimento-global.js'];agenda=agenda.replaceAll('${window.taxidogIcone(agendamento)}</strong>','${window.taxidogIcone(agendamento)}${window.pethubIAIcone?.(agendamento)||""}</strong>');texts['frontend/novo-atendimento-global.js']=agenda;
 const pkg=JSON.parse(texts['package.json']);pkg.dependencies={...pkg.dependencies,openai:pkg.dependencies?.openai||'7.64.0',ajv:pkg.dependencies?.ajv||'8.20.0'};texts['package.json']=JSON.stringify(pkg,null,2)+'\n';
 // A revisão mínima do WhatsApp foi expressamente autorizada pelo proprietário.
 const waPath='backend/services/whatsappService.js';let wa=fs.readFileSync(path.join(root,waPath),'utf8');
 if(!wa.includes("socket.ev.on('messages.upsert'")){
  const anchor="      socket.ev.on('creds.update', dados => {";if(!wa.includes(anchor))throw Error('Conexão WhatsApp não reconhecida. Nenhum arquivo foi alterado.');
  wa=wa.replace(anchor,`      // Integração complementar: falhas da IA não propagam para a sessão.
      socket.ev.on('messages.upsert', evento => {
        if (!desteSocket() || evento.type !== 'notify' || process.env.PETHUB_IA_ALLOW_LIVE !== 'true') return;
        for (const mensagem of (evento.messages || []).slice(0, 20)) {
          Promise.resolve().then(() => require('./pethubIA').instancia().entradaBaileys(s.empresaId, s.id, mensagem, lib)).catch(() => {});
        }
      });
`+anchor);
 }
 if(!wa.includes('opcoesIA = {}')){
  const signature='async function enviarMensagem(id, telefone, texto, arquivo) {';const sender='      envioIniciado = true;\n      const resultado = await socket.sendMessage(destino, conteudo);';
  if(!wa.includes(signature)||!wa.includes(sender))throw Error('Envio WhatsApp não reconhecido. Nenhum arquivo foi alterado.');
  wa=wa.replace(signature,'async function enviarMensagem(id, telefone, texto, arquivo, opcoesIA = {}) {').replace(sender,`      // Parâmetro opcional apenas para IA. Disparos e lembretes usam o caminho original.
      if (typeof opcoesIA.autorizar === 'function') await opcoesIA.autorizar();
      envioIniciado = true;
      const resultado = opcoesIA.mensagemId
        ? await socket.sendMessage(destino, conteudo, { messageId: opcoesIA.mensagemId })
        : await socket.sendMessage(destino, conteudo);`);
 }
 const waHash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,waPath))).digest('hex');
 if(!['bed1a8948c89f5e3350f5e47f4d23bb79ef9c8aa7b41e2b0669fd9cff5a58912','d7b1d7ed853c6dc59bbc32357f97bee58e6e97802e96477b4e07a9b424713576'].includes(waHash))throw Error('whatsappService.js diverge da versão autorizada. Nenhum arquivo foi alterado. Revise os dois pontos da ponte antes de prosseguir.');
 texts[waPath]=wa;
 let push=texts['backend/services/pushNotificationService.js'];if(!push.includes('  pethub_ia:')){if(!push.includes('const PAYLOADS = {'))throw Error('Serviço de notificações não reconhecido. Nenhum arquivo foi alterado.');push=push.replace('const PAYLOADS = {',`const PAYLOADS = {
  pethub_ia: dados => ({title:'PetHub IA',body:dados.tipo==='franquia'?'Sua franquia atingiu '+dados.percentual+'%.':dados.tipo==='humano'?'Um atendimento aguarda a equipe.':dados.tipo==='erro'?'Uma integração da IA precisa de atenção.':'Há uma atualização da recepcionista.',tag:'pethub_ia-'+(dados.conversaId||dados.tipo),data:{page:'pethub-ia',url:'/configuracoes/pethub-ia.html'}}),`);}texts['backend/services/pushNotificationService.js']=push;
 let sw=texts['frontend/mobile/service-worker.js'];if(!sw.includes('targetPage === "pethub-ia"')){const old='const targetUrl = `/mobile/app.html?page=${targetPage}`;';if(!sw.includes(old))throw Error('Navegação mobile não reconhecida. Nenhum arquivo foi alterado.');sw=sw.replace(old,'const targetUrl = targetPage === "pethub-ia" ? "/configuracoes/pethub-ia.html" : `/mobile/app.html?page=${targetPage}`;');}texts['frontend/mobile/service-worker.js']=sw;
 const backup=path.join(root,'backups','pethub-ia-'+new Date().toISOString().replace(/[:.]/g,'-'));
 const changed=[];for(const[name,text]of Object.entries(texts)){const file=path.join(root,name);if(fs.readFileSync(file,'utf8')!==text){const saved=path.join(backup,name);fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(file,saved);fs.writeFileSync(file,text);changed.push(name);}}
 return changed;
}
module.exports={integrar};if(require.main===module){try{console.log('Integração aplicada:',integrar());console.log('Execute npm install e node backend/scripts/preparar-pethub-ia.js no ambiente de desenvolvimento/banco configurado.');}catch(e){console.error(e.message);process.exitCode=1;}}
