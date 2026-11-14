const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../backend/services/importacao/vinculoTutor');
test('vínculo seguro: acentos, telefone BR, homônimos, conflitos e CPF',()=>{
 const cs=[{id:1,nome:'MáRia  Silva',telefone:'(31) 99999-8888',cpf:'52998224725',codigo_legado:'A'},{id:2,nome:'Maria Silva',telefone:'31988887777',codigo_legado:'B'},{id:3,nome:'João',telefone:'31999998888',cpf:'52998224725'}],idx=V.indice(cs);
 assert.equal(V.telefone('+55 (31) 99999-8888'),'31999998888');assert.equal(V.telefone('(31) 8888-7777'),'31988887777');assert.equal(V.telefone('319999'),null);
 assert.equal(V.resolver({tutor_nome:'maria silva',tutor_telefone:'5531999998888'},idx).cliente.id,1);
 assert.equal(V.resolver({tutor_nome:'Maria Silva'},idx).situacao,'sem_vinculo');assert.equal(V.resolver({tutor_telefone:'31999998888'},idx).situacao,'sem_vinculo');
 assert.equal(V.resolver({tutor_cpf:'529.982.247-25'},idx).situacao,'revisar');assert.equal(V.resolver({tutor_codigo:'A',tutor_nome:'João'},idx).situacao,'revisar');
 assert.equal(V.resolver({tutor_codigo:'A',tutor_id_legado:'inexistente'},idx).situacao,'revisar');assert.equal(V.resolver({tutor_codigo:'A'},idx).cliente.id,1);
 assert.equal(V.resolver({tutor_cpf:'11111111111'},idx).situacao,'revisar');
 assert.equal(V.resolver({tutor_codigo:'A'},idx,{origem:'outro-crm'}).situacao,'sem_vinculo');
 assert.equal(V.resolver({tutor_codigo:'CODIGO-DE-OUTRA-FONTE',tutor_cpf:'52998224725'},V.indice([cs[0]]),{origem:'outro-crm'}).cliente.id,1);
});
test('importação de pets e auditoria de clientes integradas ao ERP',async t=>{
 const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio(),db=lab.db,M=lab.models,{DataTypes,Op}=require('sequelize');
 const src=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
 const Cliente=vm.runInNewContext(src.slice(src.indexOf('const Cliente = sequelize.define('),src.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});await Cliente.sync({force:true});M.Cliente=Cliente;require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente;
 const Pet=require('../backend/models/Pet');M.Pet=Pet;await Pet.sync({force:true});Cliente.hasMany(Pet,{as:'pets',foreignKey:'cliente_id'});Pet.belongsTo(Cliente,{as:'cliente',foreignKey:'cliente_id'});Cliente.hasMany(M.Venda,{as:'vendas',foreignKey:'clienteId'});M.Agendamento.belongsTo(Pet,{as:'pet',foreignKey:'petId'});
 const B=require('../backend/services/importacao/modelos'),I=require('../backend/services/clienteInteligencia'),O=require('../backend/services/importacao/operacoes'),P=require('../backend/services/importacao/pets'),L=require('../backend/services/listagemClientes');
 await B.preparar();await I.preparar(db);await O.prepararEstrutura(db);await P.prepararEstrutura(db);await P.prepararEstrutura(db);
 await M.Usuario.update({permissoes:['cliente.novo','cliente.editar','pet.novo','pet.editar']},{where:{id:1}});
 const c=await Cliente.create({nome:'MáRia Silva',telefone:'31999998888',cpf:'52998224725',empresa_id:1}),outra=await Cliente.create({nome:'Outra empresa',telefone:'31999998888',empresa_id:2});
 await I.salvar(db,1,c.id,{codigo_legado:'T-1',id_legado:'ID-1',cadastro_original:'2022-02-01'});await I.salvar(db,2,outra.id,{codigo_legado:'T-1'});
 const processor=O.criarProcessador({db,Cliente,Empresa:M.Empresa,Lote:B.Lote,Linha:B.Linha,tamanho:50,log:{info(){},warn(){}}});
 const preview=(rows,mapa=['codigo_legado','nome','tutor_codigo','especie','genero','data_nascimento'],empresa=1)=>P.analisar({linhas:rows},mapa,empresa,1,'legado');
 const finish=async(job,empresa=1,p=processor)=>{for(let i=0;i<200;i++){await p.executarUma();const s=await p.obter(empresa,job.id,'pets');if(!['pendente','processando'].includes(s.estado))return s;}throw Error('Não terminou.');};
 const iniciar=(pre,escolhas={},empresa=1)=>processor.iniciar(empresa,1,pre.token,escolhas,'pets');
 lab.app.use('/api/clientes',require('../backend/routes/clienteRoutes'));lab.app.use('/api/pets',require('../backend/routes/petRoutes'));lab.app.use('/api/agendamentos',require('../backend/routes/agendamentoRoutes'));
 const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const api=async(path,{empresa=1,body,token=true}={})=>{const r=await lab.fetchLocal(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+lab.token(empresa)}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body&&JSON.stringify(body)});return{status:r.status,data:await r.json()};};
 t.after(async()=>{await processor.parar();await O.instancia().parar();server.closeAllConnections();await new Promise(r=>server.close(r));await db.close();});
 await t.test('10/100/500/1100 pets: persistência real, progresso, relatório e reimportação',async()=>{
  for(const n of [10,100,500,1100]){
   const rows=Array.from({length:n},(_,i)=>['V'+n+'-'+i,'Pet '+n+' '+i,'T-1','Canina',i%2?'Macho':'Fêmea','2020-01-01']);const pre=await preview(rows);assert.equal(pre.resumo.vinculados,n);
   const inicio=performance.now(),job=await iniciar(pre),fim=await finish(job);assert.equal(fim.estado,'concluido');assert.equal(fim.criados,n);assert.equal(fim.vinculados,n);assert.equal(fim.percentual,100);assert.equal(fim.processados,fim.criados+fim.atualizados+fim.ignorados+fim.rejeitados);
   assert.equal(await Pet.count({where:{empresa_id:1,codigo_legado:{[Op.like]:'V'+n+'-%'}}}),n);assert.equal((await processor.relatorioFinal(1,job.id,'pets')).relatorio.length,n);
   const repetida=await preview(rows);assert.equal(repetida.linhas.filter(r=>r.repetida).length,n);const deNovo=await iniciar(repetida),final=await finish(deNovo);assert.equal(final.criados,0);assert.equal(final.ignorados,n);
   console.log(JSON.stringify({cenario:'pets',linhas:n,ms:+(performance.now()-inicio).toFixed(1),criados:n,reimportacaoDuplicados:0}));
  }
 });
 await t.test('CPF único, nome+telefone, adicionais e revisão manual de tutor',async()=>{
  const pre=await preview([['CpfPet','CPF pet','52998224725']],['codigo_legado','nome','tutor_cpf']);assert.equal(pre.linhas[0].cliente_id,c.id);assert.equal((await finish(await iniciar(pre))).criados,1);
  const nom=await preview([['NomePet','Nome pet','maria silva','+55 (31) 99999-8888']],['codigo_legado','nome','tutor_nome','tutor_telefone']);assert.equal(nom.linhas[0].cliente_id,c.id);assert.equal((await finish(await iniciar(nom))).criados,1);
  const pend=await preview([['PENDENTE','Sem vínculo','Tutor desconhecido']],['codigo_legado','nome','tutor_nome']);assert.equal(pend.resumo.pendentes,1);const s=await finish(await iniciar(pend,{'2':{acao:'criar',cliente_id:c.id}}));assert.equal(s.criados,1);
  const invalido=await preview([['INVA','Sem nome tutor','Nome apenas']],['codigo_legado','nome','tutor_nome']);const f=await finish(await iniciar(invalido));assert.equal(f.rejeitados,1);assert.equal(f.criados,0);
 });
 await t.test('nomes iguais não são sobrescritos e pet não muda de tutor na atualização',async()=>{
  const pet=await Pet.findOne({where:{codigo_legado:'V10-0',empresa_id:1}}),nome=pet.nome;const pre=await preview([['',''+nome,'T-1']]);assert.equal(pre.linhas[0].possivel_duplicado,true);
  let fim=await finish(await iniciar(pre));assert.equal(fim.rejeitados,1);
  const pre2=await preview([['',nome,'T-1']]);fim=await finish(await iniciar(pre2,{'2':{acao:'criar',distinto:true}}));assert.equal(fim.criados,1);
  const outro=await Cliente.create({nome:'Outro tutor',empresa_id:1});const update=await preview([['V10-0','Nome mudado','T-1']]);fim=await finish(await iniciar(update,{'2':{acao:'atualizar',cliente_id:outro.id}}));assert.equal(fim.rejeitados,1);await pet.reload();assert.equal(pet.nome,nome);assert.equal(pet.cliente_id,c.id);
  const correto=await preview([['V10-0','Nome corrigido','T-1']]);fim=await finish(await iniciar(correto,{'2':{acao:'atualizar'}}));assert.equal(fim.atualizados,1);await pet.reload();assert.equal(pet.nome,'Nome corrigido');assert.equal(pet.especie,'Canina');
 });
 await t.test('isolamento: código igual, tutor manual de outra empresa e progresso autenticado',async()=>{
  const pre=await preview([['EMP2','Pet empresa dois','T-1']],undefined,2);assert.equal(pre.linhas[0].cliente_id,outra.id);const job=await iniciar(pre,{},2);assert.equal((await finish(job,2)).criados,1);
  const roubo=await preview([['NAO-CRIAR','Não criar','T-1']]);const fim=await finish(await iniciar(roubo,{'2':{acao:'criar',cliente_id:outra.id}}));assert.equal(fim.rejeitados,1);
  assert.equal((await api('/api/pets/importacao/operacoes/'+job.id)).status,404);assert.equal((await api('/api/pets/importacao/operacoes/'+job.id,{empresa:2})).status,200);assert.equal((await api('/api/pets/importacao/operacoes/'+job.id,{token:false})).status,401);
  const pets=await api('/api/pets?cliente_id='+c.id);assert.equal(pets.status,200);assert.ok(pets.data.pets.length>1700);assert.ok(pets.data.pets.every(p=>p.cliente.id===c.id));
 });
 await t.test('detalhes do tutor mostram todos os pets importados e agendamento usa o vínculo existente',async()=>{
  const r=await api('/api/clientes/'+c.id);assert.equal(r.status,200,JSON.stringify(r.data));assert.ok(r.data.cliente.pets.length>1700);const pet=r.data.cliente.pets[0];
  const a=await api('/api/agendamentos',{body:{data:'2026-12-01',hora:'12:00',petId:pet.id,servico:'Banho',valor:50}});assert.equal(a.status,201,JSON.stringify(a.data));assert.equal(await M.Agendamento.count({where:{empresa_id:1,petId:pet.id}}),1);
 });
 await t.test('cadastro de tutor exige confirmação e recusa equivalentes',async()=>{
  const pre=await preview([['NOVOT','Novo pet','Tutor novo confirmado','31988881111']],['codigo_legado','nome','tutor_nome','tutor_telefone']);
  const r=await api('/api/pets/importacao/tutores',{body:{token:pre.token,linha:2}});assert.equal(r.status,201,JSON.stringify(r.data));assert.equal((await api('/api/pets/importacao/tutores',{body:{token:pre.token,linha:2}})).status,409);
  const job=await iniciar(pre,{'2':{acao:'criar',cliente_id:r.data.cliente.id}});assert.equal((await finish(job)).criados,1);
 });
 await t.test('CSV/XLS/XLSX reais no endpoint, confirmação 202 e permissão',async()=>{
  const XLSX=require('xlsx');for(const formato of ['csv','xls','xlsx']){
   const rows=[['codigo_legado','nome','tutor_codigo'],['FORMATO-'+formato,'Pet formato '+formato,'T-1']],wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Pets');
   const bytes=formato==='csv'?Buffer.from(rows.map(r=>r.join(';')).join('\r\n')):XLSX.write(wb,{type:'buffer',bookType:formato==='xls'?'biff8':'xlsx'});
   const form=new FormData();form.append('arquivo',new Blob([bytes]),'pets.'+formato);const resp=await lab.fetchLocal(base+'/api/pets/importacao/analisar',{method:'POST',headers:{Authorization:'Bearer '+lab.token(1)},body:form}),pre=await resp.json();assert.equal(resp.status,200,JSON.stringify(pre));assert.equal(pre.resumo.vinculados,1);
   const r=await api('/api/pets/importacao/operacoes',{body:{token:pre.token,empresa_id:2,escolhas:{}}});assert.equal(r.status,202);assert.equal(r.data.operacao.tipo,'pets');const repetida=await api('/api/pets/importacao/operacoes',{body:{token:pre.token,escolhas:{}}});assert.equal(repetida.data.operacao.id,r.data.operacao.id);assert.equal((await finish(r.data.operacao)).criados,1);
   assert.equal((await api('/api/pets/importacao/operacoes/'+r.data.operacao.id+'/relatorio')).status,200);
  }
  await M.Usuario.update({permissoes:['cliente.novo']},{where:{id:1}});assert.equal((await api('/api/pets/importacao/tutores?search=Maria')).status,403);await M.Usuario.update({permissoes:['cliente.novo','pet.novo']},{where:{id:1}});
 });
 await t.test('reinício e retomada de pets usam os mesmos checkpoints duráveis',async()=>{
  const pre=await preview(Array.from({length:20},(_,i)=>['RST-'+i,'Pet retomada '+i,'T-1']));let agora=Date.now();const config={db,Cliente,Empresa:M.Empresa,Lote:B.Lote,Linha:B.Linha,tamanho:10,agora:()=>agora,log:{info(){},warn(){}}};const um=O.criarProcessador(config),dois=O.criarProcessador(config);
  try{const job=await um.iniciar(1,1,pre.token,{},'pets');await um.executarUma();assert.equal((await um.obter(1,job.id,'pets')).criados,10);assert.equal(await dois.executarUma(),false);agora+=120001;await dois.executarUma();assert.equal((await dois.obter(1,job.id,'pets')).criados,20);assert.equal((await finish(job,1,dois)).estado,'concluido');assert.equal(await Pet.count({where:{empresa_id:1,codigo_legado:{[Op.like]:'RST-%'}}}),20);}finally{await um.parar();await dois.parar();}
 });
 await t.test('microchip é único por empresa e migração preenche apenas empresas ausentes',async()=>{
  const a=await Pet.create({nome:'Chip empresa 1',cliente_id:c.id,empresa_id:1,chip:'TESTE-CHIP'}),b=await Pet.create({nome:'Chip empresa 2',cliente_id:outra.id,empresa_id:2,chip:'TESTE-CHIP'});assert.notEqual(a.id,b.id);
  await assert.rejects(Pet.create({nome:'Duplicado',cliente_id:c.id,empresa_id:1,chip:'TESTE-CHIP'}),e=>/UNIQUE constraint failed/.test(e.original?.message||e.message));
  const legado=await Pet.create({nome:'Empresa ausente',cliente_id:c.id,empresa_id:null});await P.prepararEstrutura(db);await legado.reload();assert.equal(legado.empresa_id,1);assert.equal((await Pet.findByPk(b.id)).empresa_id,2);
 });
 await t.test('listagem pagina no banco, pesquisa fora da primeira página e distingue datas',async()=>{
  const rows=Array.from({length:495},(_,i)=>({empresa_id:1,nome:i===0?'Árvore Ultima Pesquisa':'Cliente paginado '+String(i).padStart(3,'0')}));await Cliente.bulkCreate(rows);const total=await Cliente.count({where:{empresa_id:1}});
  let visto=new Set();for(let offset=0;offset<total;offset+=25){const r=await L.listar(db,1,{limit:25,offset});assert.equal(r.paginacao.total,total);assert.ok(r.clientes.length<=25);for(const c of r.clientes)visto.add(c.id);}assert.equal(visto.size,total);
  const r=await api('/api/clientes?search=ARVORE&limit=25');assert.equal(r.status,200);assert.equal(r.data.paginacao.total,1);assert.equal(r.data.clientes[0].nome,'Árvore Ultima Pesquisa');
  const dados=await L.listar(db,1,{search:'MáRia'});assert.equal(dados.clientes[0].cadastro_original,'2022-02-01');assert.ok(dados.clientes[0].entrada_pethub);
  const audit=await L.auditoria(db,1);assert.equal(audit.total,total);assert.ok(audit.entradasPethubNoMes>audit.cadastradosNoMes);assert.equal((await L.listar(db,2,{})).paginacao.totalGeral,1);
 });
});
