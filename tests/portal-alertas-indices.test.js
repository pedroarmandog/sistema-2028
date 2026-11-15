'use strict';
process.env.NODE_ENV='production';
const {test}=require('node:test'),assert=require('node:assert/strict'),{Sequelize}=require('sequelize');
const AF=require('../backend/services/clientePortal/alertasModelos'),{fixture}=require('./helpers/cliente-portal-fixture');
const indexName='cp_alerta_silencio_emp_usr_sol_uq';
test('DDL MySQL dos índices do portal respeita limite de 64 caracteres sem mudar colunas ou unicidade',async()=>{
 const db=new Sequelize('teste','teste','nao-utilizada',{dialect:'mysql',logging:false});
 try{
  const modelos={...require('../backend/services/clientePortal/modelos').modelos(db),...AF.modelos(db)};
  const q=db.getQueryInterface().queryGenerator;
  assert.ok('cliente_portal_alertas_silencios_empresa_id_usuario_id_solicitacao_id'.length>64);
  for(const model of Object.values(modelos)){
   assert.ok(model.tableName.length<=64,model.tableName);
   for(const index of model.options.indexes){
    assert.ok(index.name.length<=64,index.name);
    const sql=q.addIndexQuery(model.tableName,{...index,fields:[...index.fields]});
    const match=/ADD (?:UNIQUE )?INDEX `([^`]+)`/.exec(sql);
    assert.ok(match,sql);assert.ok(match[1].length<=64,sql);
   }
  }
  const idx=modelos.Silencio.options.indexes.find(i=>i.name===indexName);
  assert.equal(idx.unique,true);assert.deepEqual(idx.fields,['empresa_id','usuario_id','solicitacao_id']);
 }finally{await db.close();}
});
test('preparação retoma tabela parcial sem índice e pode repetir sem apagar registros',async t=>{
 const f=await fixture(t),a=await f.ativar(),p=await f.p.pedidos.criar(a.tutor,{petId:1,servicoId:'banho',data:'2026-11-18',hora:'10:00',idempotencia:require('crypto').randomUUID()});
 await f.p.alertas.silenciar(1,9,p.id,{silenciado:true});
 const models=AF.modelos(f.db),qi=f.db.getQueryInterface();
 await qi.removeIndex(models.Silencio.tableName,indexName);
 assert.ok(!(await qi.showIndex(models.Silencio.tableName)).some(i=>i.name===indexName));
 await AF.preparar(f.db);await AF.preparar(f.db);
 const idx=(await qi.showIndex(models.Silencio.tableName)).filter(i=>i.name===indexName);
 assert.equal(idx.length,1);assert.equal(idx[0].unique,true);
 assert.equal(await f.ERP.Cliente.count(),3);assert.equal(await f.ERP.Pet.count(),3);
 const snapshot=await f.p.alertas.snapshot(1,9);assert.equal(snapshot.itens[0].id,p.id);assert.equal(snapshot.itens[0].silenciado,true);
 await assert.rejects(models.Silencio.create({id:'outro-id',empresa_id:1,usuario_id:9,solicitacao_id:p.id,silenciado:false}),e=>e.name==='SequelizeUniqueConstraintError'||/UNIQUE constraint failed/.test(e.message));
});
