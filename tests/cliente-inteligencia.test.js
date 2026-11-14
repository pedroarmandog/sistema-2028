// Integração real HTTP/Sequelize, JWT real, SQLite em memória e WhatsApp simulado.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const XLSX=require('xlsx');
test('inteligência de clientes: importação, análise, comunicação e isolamento',async t=>{
  const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio();
  const db=lab.db,M=lab.models,{DataTypes}=require('sequelize');
  const fonte=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
  const Cliente=vm.runInNewContext(fonte.slice(fonte.indexOf('const Cliente = sequelize.define('),fonte.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
  await M.Venda.destroy({where:{}});
  await Cliente.sync({force:true});M.Cliente=Cliente;require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente;
  M.Pet=require('../backend/models/Pet');Cliente.hasMany(M.Pet,{foreignKey:'cliente_id',as:'pets'});Cliente.hasMany(M.Venda,{foreignKey:'clienteId',as:'vendas'});await M.Pet.sync();
  for(const n of ['EnvioAgendado','LogEnvio','MensagemAutomatica','Campanha','Contato','WhatsappSession'])M[n]=require('../backend/models/'+n)(db);
  await db.sync();await M.Usuario.update({permissoes:['cliente.novo','cliente.editar']},{where:{id:1}});
  const transaction=db.transaction.bind(db);let fila=Promise.resolve();
  db.transaction=(...args)=>{if(args[0]?.transaction)return transaction(...args);const p=fila.then(()=>transaction(...args));fila=p.catch(()=>{});return p;};
  const I=require('../backend/services/clienteInteligencia'),C=require('../backend/services/clienteComunicacao');
  const push=require('../backend/services/pushNotificationService');t.mock.method(push,'notificarEmpresa',async()=>{});
  await I.preparar(db);const perfilModel=I.modelos(db).Perfil;
  lab.app.use('/api/clientes',require('../backend/routes/clienteRoutes'));
  const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-13T15:00:00Z')});
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));t.mock.timers.reset();await fila;await db.close();});
  async function api(path,{empresa=1,body,method,form}={}){
    const headers={Authorization:'Bearer '+lab.token(empresa)};if(body)headers['Content-Type']='application/json';
    const r=await lab.fetchLocal(base+path,{method:method||(body||form?'POST':'GET'),headers,body:form||body&&JSON.stringify(body)});
    return {status:r.status,data:await r.json()};
  }
  async function analisar(rows,{empresa=1,ref='2026-11-01',modo='separado',ext='xlsx'}={}){
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Clientes');
    const bytes=ext==='csv'?XLSX.utils.sheet_to_csv(wb.Sheets.Clientes,{FS:';'}):XLSX.write(wb,{bookType:ext, type:'buffer'});
    const f=new FormData();f.append('arquivo',new Blob([bytes]),'clientes.'+ext);if(ref)f.append('referenciaHistorico',ref);f.append('conciliacaoHistorico',modo);
    const r=await api('/api/clientes/importacao/analisar',{empresa,form:f});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;
  }
  const confirmar=(token,empresa=1,escolhas={})=>api('/api/clientes/importacao/confirmar',{empresa,body:{token,escolhas}});
  const headers=['cod_cliente','id_legado','nome','mail','fone1','fone2','fone3','instagram','data_cadastro','como_nos_conheceu','bloquear_envio_sms','bloquear_envio_whatsapp','cadastro_bloqueado','vendas desde o cadastro','ticket medio desde o cadastro','vendas no ultimo mes','vendas na ultima semana','data ultima venda'];
  const linha=['0012','LEG-5','Tutora Exemplo','exemplo@teste.local','31999990001','31999990002','31999990003','@exemplo','01/02/2022','Instagram','Sim','Não','Sim','5.000,00','200,00','500,00','150,00','31/10/2026'];
  let clienteId;
  await t.test('Excel com todos os campos, datas brasileiras e vínculos preservados',async()=>{
    const p=await analisar([headers,linha]);assert.equal(p.resumo.erros,0,JSON.stringify(p.linhas));
    const r=await confirmar(p.token);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.criados,1);
    const c=await Cliente.findOne({where:{nome:'Tutora Exemplo',empresa_id:1}});clienteId=c.id;
    assert.equal(c.como_nos_conheceu,'Instagram');assert.deepEqual(c.telefones_adicionais,['31999990002','31999990003']);
    const d=(await api(`/api/clientes/${clienteId}/inteligencia`)).data;
    assert.equal(d.perfil.codigo_legado,'0012');assert.equal(d.perfil.id_legado,'LEG-5');assert.equal(d.perfil.instagram,'@exemplo');
    assert.equal(d.perfil.cadastro_original,'2022-02-01');assert.ok(d.perfil.bloquear_sms);assert.ok(!d.perfil.bloquear_whatsapp);assert.ok(d.perfil.cadastro_bloqueado);
    assert.equal(Number(d.historicos[0].vendas_desde_cadastro),5000);
    assert.equal(d.historicos[0].data_referencia_historico,'2026-11-01');
    assert.equal(await M.Venda.count({where:{clienteId}}),0);
    await M.Pet.create({nome:'Pet preservado',cliente_id:clienteId,empresa_id:1});
  });
  await t.test('reimportação idempotente e reimportação alterada atualiza pelo código legado',async()=>{
    const p=await analisar([headers,linha]);assert.equal(p.linhas[0].repetida,true);const r=await confirmar(p.token);assert.equal(r.data.criados,0);
    const qtd=await Cliente.count({where:{empresa_id:1}});
    const alterada=[...linha];alterada[2]='Nome atualizado';alterada[3]='';alterada[7]='';alterada[9]='';
    const outra=await analisar([headers,alterada]);assert.equal(outra.linhas[0].existente,String(clienteId));
    const update=await confirmar(outra.token,1,{'2':'atualizar'});assert.equal(update.data.atualizados,1,JSON.stringify(update.data));
    assert.equal(await Cliente.count({where:{empresa_id:1}}),qtd);
    const c=await Cliente.findByPk(clienteId);assert.equal(c.email,'exemplo@teste.local');assert.equal(c.como_nos_conheceu,'Instagram');
    assert.equal((await I.obter(db,1,clienteId)).perfil.instagram,'@exemplo');assert.equal(await M.Pet.count({where:{cliente_id:clienteId}}),1);
    assert.equal((await I.obter(db,1,clienteId)).historicos.length,1);
  });
  await t.test('CSV/XLS básicos; novos campos opcionais; dados inválidos por linha',async()=>{
    for(const ext of ['csv','xls']){const p=await analisar([['nome'],['Básico '+ext]],{ext,ref:''});assert.equal(p.resumo.erros,0);assert.equal((await confirmar(p.token)).data.criados,1);}
    const p=await analisar([['nome','vendas desde o cadastro','data_cadastro'],['Valor inválido','abc','31/02/2022'],['Válido','10,00','01/01/2020']]);
    assert.equal(p.resumo.erros,1);assert.ok(p.linhas[0].erro);assert.equal((await confirmar(p.token)).data.criados,1);
    const excelData=await analisar([['nome','data_cadastro'],['Data nativa Excel',new Date('2022-02-01T12:00:00Z')]]);assert.equal(excelData.resumo.erros,0,JSON.stringify(excelData.linhas));assert.equal(excelData.linhas[0].dados.cadastro_original,'2022-02-01');
    const semRef=await analisar([['nome','vendas desde o cadastro'],['Sem referência','10']],{ref:''});assert.equal(semRef.resumo.erros,1);
  });
  await t.test('duas empresas com os mesmos IDs; APIs e edição rejeitam troca de empresa',async()=>{
    const p=await analisar([headers,linha],{empresa:2});assert.equal((await confirmar(p.token,2)).data.criados,1);
    assert.equal((await api(`/api/clientes/${clienteId}/inteligencia`,{empresa:2})).status,404);
    assert.equal((await api(`/api/clientes/${clienteId}/analise-vendas`,{empresa:2})).status,404);
    assert.equal((await api(`/api/clientes/${clienteId}/inteligencia`,{empresa:2,method:'PUT',body:{bloquear_whatsapp:true,empresa_id:1}})).status,404);
    assert.equal((await confirmar(p.token,1)).status,404);
    const dup=await Cliente.create({nome:'Outro cliente',empresa_id:1});
    assert.equal((await api(`/api/clientes/${dup.id}/inteligencia`,{method:'PUT',body:{codigo_legado:'0012'}})).status,409);
  });
  const venda=(extras={})=>M.Venda.create({empresa_id:1,clienteId,status:'pago',data:new Date('2026-11-13T14:00:00Z'),itens:[{produto:{tipo:'produto'},totalFinal:100},{produto:{tipo:'servico'},totalFinal:50}],totais:{totalFinal:150},...extras});
  let nova;
  await t.test('nova venda atualiza análise; cancelamento corrige; não soma atendimento/financeiro',async()=>{
    nova=await venda();let d=(await api(`/api/clientes/${clienteId}/analise-vendas`)).data;
    assert.equal(d.pethub.total,15000);assert.equal(d.pethub.ultimos7,15000);assert.equal(d.pethub.quantidade,1);assert.equal(d.combinado.total,null);
    assert.equal(d.combinado.ticket,null);assert.equal(d.pethub.ticket,15000);
    assert.equal(d.pethub.tipos.produto,10000);assert.equal(d.pethub.tipos.servico,5000);
    assert.equal(d.meses.reduce((s,m)=>s+m.centavos,0),15000);
    await nova.update({status:'cancelado'});d=(await api(`/api/clientes/${clienteId}/analise-vendas`)).data;assert.equal(d.pethub.total,0);
    await nova.update({status:'parcial'});assert.equal((await api(`/api/clientes/${clienteId}/analise-vendas`)).data.pethub.total,15000);
  });
  await t.test('cliente sem histórico calcula ticket e quantidade completos; itens inválidos não derrubam painel',async()=>{
    const c=await Cliente.create({nome:'Sem legado',empresa_id:1});
    await venda({clienteId:c.id,data:new Date(),totais:{final:125},itens:{formatoAntigo:true}});
    const d=(await api(`/api/clientes/${c.id}/analise-vendas`)).data;
    assert.equal(d.combinado.total,12500);assert.equal(d.combinado.ticket,12500);assert.equal(d.combinado.quantidade,1);
    assert.equal(d.semanas.reduce((a,s)=>a+s.centavos,0),12500);assert.equal(d.pethub.tipos.nao_classificado,12500);
  });
  await t.test('conciliação evita sobreposição, quantidade desconhecida não inventa ticket combinado',async()=>{
    await venda({data:new Date('2026-10-15T12:00:00Z'),totais:{final:100}});
    const r=await api(`/api/clientes/${clienteId}/inteligencia`,{method:'PUT',body:{vendas_desde_cadastro:'5.000,00',data_referencia_historico:'2026-11-01',modo_conciliacao:'somar_posteriores'}});assert.equal(r.status,200,JSON.stringify(r.data));
    let d=(await api(`/api/clientes/${clienteId}/analise-vendas`)).data;
    assert.equal(d.pethub.total,25000);assert.equal(d.combinado.total,515000);assert.equal(d.pethub.sobreposicao,1);assert.equal(d.combinado.ticket,null);
    assert.equal(d.pethub.ultimos7,15000);assert.equal(d.pethub.ultimos30,25000);
    assert.equal(d.historico.vendas_ultimo_mes,500); // resumo permanece na referência, não na janela móvel
    await api(`/api/clientes/${clienteId}/inteligencia`,{method:'PUT',body:{vendas_desde_cadastro:'5000',quantidade_vendas_historicas:'25',data_referencia_historico:'2026-11-01',modo_conciliacao:'somar_posteriores'}});
    d=(await api(`/api/clientes/${clienteId}/analise-vendas`)).data;assert.equal(d.combinado.quantidade,26);assert.equal(d.combinado.ticket,Math.round(515000/26));
  });
  await t.test('nova referência preserva snapshots; corte de hoje permite vendas novas no mesmo dia',async()=>{
    const h=await Cliente.create({nome:'Cliente do corte',empresa_id:1});
    await I.salvar(db,1,h.id,{vendas_desde_cadastro:2000,data_referencia_historico:'2026-11-13',modo_conciliacao:'somar_posteriores'});
    const corte=(await I.obter(db,1,h.id)).historicos[0].corte_em;
    await venda({clienteId:h.id,data:new Date('2026-11-13T15:01:00Z')});
    t.mock.timers.setTime(Date.parse('2026-11-13T15:02:00Z'));
    await I.salvar(db,1,h.id,{vendas_desde_cadastro:2000,data_referencia_historico:'2026-11-13',modo_conciliacao:'somar_posteriores'});
    assert.equal(+(new Date((await I.obter(db,1,h.id)).historicos[0].corte_em)),+new Date(corte));
    assert.equal((await api(`/api/clientes/${h.id}/analise-vendas`)).data.combinado.total,215000);
    await I.salvar(db,1,h.id,{vendas_desde_cadastro:1000,data_referencia_historico:'2026-10-01'});assert.equal((await I.obter(db,1,h.id)).historicos.length,2);
  });
  await t.test('Dashboard usa data original; total de clientes e Mobile permanecem integrais',async()=>{
    const p=require('../backend/utils/periodoBrasilia').periodoMes();
    const comOriginal=await perfilModel.count({where:{empresa_id:1,cadastro_original:{[require('sequelize').Op.ne]:null}}});
    const count=await I.clientesNoMes(db,1,p);
    assert.equal(count,await Cliente.count({where:{empresa_id:1}})-comOriginal);
    const mobile=fs.readFileSync(require.resolve('../frontend/mobile/pages/dashboard.js'),'utf8');assert.match(mobile,/const clientes = resumo\?\.clientes \?\?/);
  });
  await t.test('cadastro/edição manual guardam complementos atomicamente',async()=>{
    const r=await api('/api/clientes',{body:{nome:'Manual',sexo:'feminino',codigo_legado:'MANUAL-1',instagram:'@manual',bloquear_whatsapp:true}});
    assert.equal(r.status,201,JSON.stringify(r.data));const id=r.data.cliente.id;
    assert.ok((await I.obter(db,1,id)).perfil.bloquear_whatsapp);
    const u=await api('/api/clientes/'+id,{method:'PUT',body:{sexo:'outro',instagram:'@editado',empresa_id:2}});assert.equal(u.status,200,JSON.stringify(u.data));
    assert.equal((await I.obter(db,1,id)).perfil.instagram,'@editado');assert.equal((await Cliente.findByPk(id)).empresa_id,1);
    const antes=await Cliente.count();const invalido=await api('/api/clientes',{body:{nome:'Não deve criar',vendas_desde_cadastro:'100'}});assert.equal(invalido.status,400);assert.equal(await Cliente.count(),antes);
  });
  let service,sockets=[],falharPreferencias=false;
  await t.test('bloqueios independentes, telefones adicionais, isolamento e cadastro bloqueado informativo',async()=>{
    assert.equal((await C.verificar(1,'5531999990001',{db})).permitido,true);
    assert.equal((await C.verificar(1,'5531999990001',{db,canal:'sms'})).permitido,false);
    await I.salvar(db,1,clienteId,{bloquear_whatsapp:true});
    assert.equal((await C.verificar(1,'5531999990002',{db})).permitido,false);
    assert.equal((await C.verificar(2,'5531999990001',{db})).permitido,true);
    await I.salvar(db,1,clienteId,{bloquear_whatsapp:false});
    assert.equal((await C.verificar(1,'5531999990001',{db})).permitido,true);
  });
  await t.test('verificação central impede envio real e revalida mudança durante consulta do telefone',async()=>{
    const real=await import('@whiskeysockets/baileys');let bloquearDuranteConsulta=false;
    const lib={...real,default(config){const s={config,ev:new EventEmitter(),user:{id:'5531000000000@s.whatsapp.net'},enviados:[],end(){},
      async onWhatsApp(...jids){if(bloquearDuranteConsulta)await I.salvar(db,1,clienteId,{bloquear_whatsapp:true});return[{exists:true,jid:jids[0]}];},
      async sendMessage(jid,msg){s.enviados.push(msg);return{key:{id:'ack'}};}};sockets.push(s);return s;}};
    service=require('../backend/services/whatsappService').criarServico({carregar:async()=>lib,pausaEnvio:async()=>{},verificarPermissao:async(empresa,tel)=>{if(falharPreferencias)throw new Error("Banco indisponível");return C.verificar(empresa,tel,{db});}});
    await service.inicializarCliente(1);sockets[0].ev.emit('connection.update',{connection:'open'});
    await I.salvar(db,1,clienteId,{bloquear_whatsapp:true});
    assert.equal((await service.enviarMensagem(1,'31999990001','Bloqueada')).bloqueado,true);assert.equal(sockets[0].enviados.length,0);
    await I.salvar(db,1,clienteId,{bloquear_whatsapp:false});assert.equal((await service.enviarMensagem(1,'31999990001','Permitida')).sucesso,true);
    bloquearDuranteConsulta=true;assert.equal((await service.enviarMensagem(1,'31999990001','Mudou durante lookup')).bloqueado,true);assert.equal(sockets[0].enviados.length,1);
  });
  await t.test('falha ao consultar preferências preserva fila sem enviar mensagem',async()=>{
    falharPreferencias=true;
    const r=await service.enviarMensagem(1,'31999990001','Não liberar em erro');
    assert.equal(r.sucesso,false);assert.equal(r.temporario,true);assert.equal(sockets[0].enviados.length,1);
    falharPreferencias=false;
  });
  await t.test('mensagem já na fila é ignorada por bloqueio sem marcar enviada ou erro de conexão',async()=>{
    const w=require('../backend/services/whatsappService');t.mock.method(w,'isConectado',service.isConectado);t.mock.method(w,'enviarMensagem',service.enviarMensagem);
    const D=require('../backend/services/marketingDisparos');await D.preparar();
    const e=await M.EnvioAgendado.create({empresaId:1,telefoneDestino:'5531999990001',conteudoFinal:'Lembrete já agendado',status:'pendente',dataAgendada:new Date('2026-11-13T14:00:00Z'),tentativas:0});
    const r=await require('../backend/services/whatsappQueue').processarEnvio(e,M.LogEnvio);
    assert.equal(r.bloqueado,true);await e.reload();assert.equal(e.status,'cancelado');assert.equal(e.tentativas,0);assert.equal(e.dataEnvio,null);assert.equal(sockets[0].enviados.length,1);
    const log=await M.LogEnvio.findOne({where:{envioAgendadoId:e.id}});assert.equal(log.evento,'ignorado_bloqueio');
    assert.equal(service.isConectado(1),true);
  });
  await t.test('campanha em massa registra bloqueio como ignorado, sem erro ou envio',async()=>{
    const campanha=await M.Campanha.create({empresaId:1,nome:'Campanha de teste',mensagemTemplate:'Teste',status:'pausada',configuracao:{intervalo:0.001,delayInicial:0.001,delayRand:0}});
    const contato=await M.Contato.create({empresaId:1,campanhaId:campanha.id,nome:'Tutora',numero:'5531999990001',status:'pendente',meta:{origem:'preservar'}});
    const sessao=await M.WhatsappSession.create({empresaId:1,nome:'Teste',status:'conectado'});
    const e=await M.EnvioAgendado.create({empresaId:1,telefoneDestino:contato.numero,conteudoFinal:'Campanha bloqueada',status:'pendente',dataAgendada:new Date('2026-11-13T14:00:00Z'),contexto:{campanhaId:campanha.id,contatoId:contato.id},tentativas:0});
    const c=require('../backend/controllers/disparadorController');const res={status(n){this.code=n;return this;},json(d){this.data=d;return this;}};
    await c.iniciarCampanha({user:{empresaId:1},params:{id:campanha.id},body:{instanciaId:sessao.id}},res);assert.equal(res.data?.success,true,JSON.stringify(res.data));
    for(let i=0;i<500;i++){await new Promise(r=>setImmediate(r));await campanha.reload();if(campanha.status==='finalizada')break;}
    assert.equal(campanha.status,'finalizada');await e.reload();await contato.reload();assert.equal(e.status,'cancelado');assert.equal(contato.status,'pausado');
    assert.equal(contato.meta.ignoradoPorBloqueio,true);assert.equal(contato.meta.origem,'preservar');assert.equal(sockets[0].enviados.length,1);
    assert.equal((await M.LogEnvio.findOne({where:{envioAgendadoId:e.id}})).evento,'ignorado_bloqueio');
    await service.suspender();
  });
  await t.test('migração do ENUM acrescenta bloqueio sem remover valores existentes',async()=>{
    let tipo="ENUM('envio_sucesso','custom_existente')",alteracoes=0;
    const q={async describeTable(){return{evento:{type:tipo}};},async changeColumn(table,col,definition){
      assert.equal(table,'logs_envio');assert.equal(col,'evento');assert.deepEqual(definition.type.values,['envio_sucesso','custom_existente','ignorado_bloqueio']);
      alteracoes++;tipo="ENUM('envio_sucesso','custom_existente','ignorado_bloqueio')";
    }};
    await C.prepararAuditoria({getQueryInterface:()=>q});await C.prepararAuditoria({getQueryInterface:()=>q});assert.equal(alteracoes,1);
  });
  await t.test('migração repetida é aditiva e dados/relacionamentos permanecem intactos',async()=>{
    const antes=await Cliente.count();const pets=await M.Pet.count();const vendas=await M.Venda.count();
    await I.preparar(db);await I.modelos(db).Perfil.sync();await I.modelos(db).Historico.sync();
    assert.equal(await Cliente.count(),antes);assert.equal(await M.Pet.count(),pets);assert.equal(await M.Venda.count(),vendas);
  });
});
