const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

test('Nova Venda: pesquisa completa, vínculo real e análise de produto/serviço',async t=>{
  const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio();
  const db=lab.db,M=lab.models,{DataTypes}=require('sequelize');
  await M.Venda.destroy({where:{}});
  const fonte=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
  const Cliente=vm.runInNewContext(fonte.slice(fonte.indexOf('const Cliente = sequelize.define('),fonte.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
  await Cliente.sync({force:true});M.Cliente=Cliente;require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente;
  M.Pet=require('../backend/models/Pet');Cliente.hasMany(M.Pet,{foreignKey:'cliente_id',as:'pets'});Cliente.hasMany(M.Venda,{foreignKey:'clienteId',as:'vendas'});await M.Pet.sync();
  const push=require('../backend/services/pushNotificationService');t.mock.method(push,'notificarEmpresa',async()=>{});
  lab.app.use('/api/clientes',require('../backend/routes/clienteRoutes'));lab.app.use('/api/vendas',require('../backend/routes/vendaRoutes'));
  const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await new Promise(r=>setImmediate(r));await db.close();});
  const base='http://127.0.0.1:'+server.address().port;
  async function api(path,{empresa=1,body,method,token=true}={}){
    const headers={};if(token)headers.Authorization='Bearer '+lab.token(empresa);if(body)headers['Content-Type']='application/json';
    const r=await lab.fetchLocal(base+path,{headers,method:method||(body?'POST':'GET'),body:body&&JSON.stringify(body)});
    return {status:r.status,data:await r.json()};
  }
  const karol=await Cliente.create({nome:'Karol',empresa_id:1,telefone:null,email:null});
  await Cliente.bulkCreate(Array.from({length:130},(_,i)=>({nome:'Outro '+i,empresa_id:1,createdAt:new Date(Date.now()+i*1000)})));
  const importado=await Cliente.create({nome:'José Importado',empresa_id:1,telefone:'(31) 99999-4321',email:'jose@teste.local',cpf:'123.456.789-01'});
  const alheio=await Cliente.create({nome:'Karol',empresa_id:2});
  await require('../backend/services/clienteInteligencia').salvar(db,1,importado.id,{id_legado:'IMPORTADO-1',vendas_desde_cadastro:'2000',data_referencia_historico:'2026-11-01',modo_conciliacao:'somar_posteriores'});
  await t.test('busca no servidor encontra cadastro antigo além dos primeiros 100 e telefone nulo',async()=>{
    const r=await api('/api/clientes/busca-venda?search=ka');assert.equal(r.status,200,JSON.stringify(r.data));
    assert.deepEqual(r.data.clientes.map(c=>c.id),[karol.id]);assert.equal(r.data.clientes[0].telefone,'');assert.equal(r.data.clientes[0].codigo,String(karol.id));
    const outro=await api('/api/clientes/busca-venda?search=ka',{empresa:2});assert.deepEqual(outro.data.clientes.map(c=>c.id),[alheio.id]);
    assert.equal((await api('/api/clientes/busca-venda?search=ka',{token:false})).status,401);
  });
  await t.test('nome sem acento/caixa, e-mail, telefone, CPF e ID; sem termo não baixa cadastro inteiro',async()=>{
    for(const termo of ['JOSE','jose@teste','31999994321','12345678901',String(importado.id)]){
      const r=await api('/api/clientes/busca-venda?search='+encodeURIComponent(termo));assert.ok(r.data.clientes.some(c=>c.id===importado.id),JSON.stringify(r));
    }
    assert.deepEqual((await api('/api/clientes/busca-venda')).data.clientes,[]);
    assert.deepEqual((await api('/api/clientes/busca-venda?id='+alheio.id)).data.clientes,[]);
    assert.deepEqual((await api('/api/clientes/busca-venda?search='+encodeURIComponent("' OR 1=1 --"))).data.clientes,[]);
  });
  const dados=(id,nome)=>({clienteId:id,cliente:nome,status:'pago',itens:[{produto:{tipo:'produto',nome:'Ração'},totalFinal:100},{produto:{tipo:'servico',nome:'Banho'},totalFinal:50}],totais:{final:150},pagamentos:[],totalPago:150});
  let vendaId;
  await t.test('venda feita pela API guarda o cliente existente e entra na análise com os dois tipos',async()=>{
    const r=await api('/api/vendas',{body:dados(karol.id,'Nome digitado incorreto')});assert.equal(r.status,201,JSON.stringify(r.data));vendaId=r.data.id;
    assert.equal(r.data.clienteId,karol.id);assert.equal(r.data.cliente,'Karol');
    const a=(await api(`/api/clientes/${karol.id}/analise-vendas`)).data;
    assert.equal(a.combinado.total,15000);assert.equal(a.combinado.quantidade,1);assert.equal(a.combinado.ticket,15000);
    assert.equal(a.pethub.tipos.produto,10000);assert.equal(a.pethub.tipos.servico,5000);
  });
  await t.test('venda nova de cliente importado também soma após o corte; atualizar não duplica',async()=>{
    const r=await api('/api/vendas',{body:dados(importado.id,'José Importado')});assert.equal(r.status,201,JSON.stringify(r.data));
    const u=await api('/api/vendas/'+r.data.id,{method:'PUT',body:{status:'parcial',clienteId:importado.id,cliente:'Nome antigo'}});assert.equal(u.status,200,JSON.stringify(u.data));
    const a=(await api(`/api/clientes/${importado.id}/analise-vendas`)).data;assert.equal(a.combinado.total,215000);assert.equal(a.pethub.quantidade,1);
  });
  await t.test('IDs de outra empresa e homônimos não vinculam venda arbitrariamente',async()=>{
    const antes=await M.Venda.count();
    assert.equal((await api('/api/vendas',{body:dados(alheio.id,'Karol')})).status,400);
    assert.equal((await api('/api/vendas/'+vendaId,{method:'PUT',body:{clienteId:alheio.id,cliente:'Karol'}})).status,400);
    assert.equal((await M.Venda.findByPk(vendaId)).clienteId,karol.id);
    await Cliente.create({nome:'Karol',empresa_id:1});
    assert.equal((await api('/api/vendas',{body:dados(null,'Karol')})).status,400);assert.equal(await M.Venda.count(),antes);
    assert.equal((await api('/api/vendas',{body:dados(null,'Não cadastrado')})).status,400);
    const avulsa=await api('/api/vendas',{body:dados(null,'')});assert.equal(avulsa.status,201,JSON.stringify(avulsa.data));assert.equal(avulsa.data.clienteId,null);
  });
  await t.test('cancelamento remove a venda da análise do cliente',async()=>{
    const r=await api('/api/vendas/'+vendaId,{method:'PUT',body:{status:'cancelado'}});assert.equal(r.status,200,JSON.stringify(r.data));
    assert.equal((await api(`/api/clientes/${karol.id}/analise-vendas`)).data.pethub.total,0);
  });
});

function frontend(){
  const fonte=fs.readFileSync(require.resolve('../frontend/atendimento/nova-venda.js'),'utf8');
  const elementos=new Map();
  const elemento=()=>({style:{},children:[],value:'',textContent:'',append(...n){this.children.push(...n);},replaceChildren(...n){this.children=n;},querySelector(sel){this.selectors??=new Map();if(!this.selectors.has(sel))this.selectors.set(sel,elemento());return this.selectors.get(sel);}});
  const document={createElement:elemento,getElementById(id){if(!elementos.has(id))elementos.set(id,elemento());return elementos.get(id);}};
  let fetchImpl=async()=>{throw new Error('não configurado');};let requests=0;
  const ctx=vm.createContext({document,URLSearchParams,fetchWithTimeout:async(...args)=>{requests++;return fetchImpl(...args);},mostrarNotificacao:()=>{}});
  vm.runInContext('let clienteSelecionado=null;'+fonte.slice(fonte.indexOf('const clientesBuscaVenda ='),fonte.indexOf('// Função para carregar profissionais do sistema via API real')),ctx);
  vm.runInContext(fonte.slice(fonte.indexOf('async function buscarClientes(termo)'),fonte.indexOf('// Função para filtrar e exibir profissionais')),ctx);
  vm.runInContext(fonte.slice(fonte.indexOf('async function selecionarCliente(clienteId)'),fonte.indexOf('// Função para selecionar um profissional')),ctx);
  vm.runInContext(fonte.slice(fonte.indexOf('function validarClienteDaVenda()'),fonte.indexOf('async function finalizarVendaComDados()')),ctx);
  return {ctx,document,setFetch:f=>fetchImpl=f,requests:()=>requests};
}
test('frontend: dados opcionais nulos, texto seguro, seleção com ID e sem nova requisição',async()=>{
  const f=frontend();f.setFetch(async()=>({ok:true,json:async()=>({success:true,clientes:[{id:150012,nome:'<img src=x onerror=alert(1)>',telefone:null,email:null}]})}));
  await f.ctx.buscarClientes('ka');const item=f.document.getElementById('clientesDropdown').children[0];
  assert.equal(item.children[0].textContent,'<img src=x onerror=alert(1)>');assert.match(item.children[1].textContent,/Sem telefone/);
  await item.onclick();assert.equal(f.requests(),1);assert.equal(vm.runInContext('clienteSelecionado.id',f.ctx),150012);assert.equal(f.ctx.validarClienteDaVenda(),true);
  vm.runInContext('clienteSelecionado=null',f.ctx);f.document.getElementById('pesquisarCliente').value='Karol';assert.equal(f.ctx.validarClienteDaVenda(),false);
  f.document.getElementById('pesquisarCliente').value='';assert.equal(f.ctx.validarClienteDaVenda(),true);
});
test('frontend: resposta atrasada/limpeza não repõe resultados; erro não oferece dados fictícios',async()=>{
  const f=frontend(),pendentes=[];f.setFetch(()=>new Promise(resolve=>pendentes.push(resolve)));
  const a=f.ctx.buscarClientes('ka'),b=f.ctx.buscarClientes('jo');
  pendentes[1]({ok:true,json:async()=>({success:true,clientes:[{id:2,nome:'José'}]})});await b;
  pendentes[0]({ok:true,json:async()=>({success:true,clientes:[{id:1,nome:'Karol'}]})});await a;
  assert.equal(f.document.getElementById('clientesDropdown').children[0].children[0].textContent,'José');
  const c=f.ctx.buscarClientes('ka');await f.ctx.buscarClientes('');pendentes[2]({ok:true,json:async()=>({success:true,clientes:[{id:1,nome:'Karol'}]})});await c;assert.equal(f.document.getElementById('clientesDropdown').style.display,'none');
  f.setFetch(async()=>({ok:false,status:401}));await f.ctx.buscarClientes('ka');assert.match(f.document.getElementById('clientesDropdown').children[0].textContent,/Entre novamente/);
  assert.equal(vm.runInContext('clienteSelecionado',f.ctx),null);
});
