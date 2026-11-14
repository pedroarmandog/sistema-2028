const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {Sequelize,DataTypes}=require('sequelize');
test('Cadastro e edição aceitam os valores do formulário e preservam empresa',async t=>{
 const sequelize=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false,dialectModule:require('../backend/scripts/lab-fiscal/sqlite')});
 // Carrega a definição real do modelo sem abrir a conexão TiDB do projeto.
 const fonte=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
 const Cliente=vm.runInNewContext(fonte.slice(fonte.indexOf('const Cliente = sequelize.define('),fonte.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize,DataTypes,require});
 await sequelize.sync();t.after(()=>sequelize.close());
 const id=require.resolve('../backend/models');require.cache[id]={id,filename:id,loaded:true,exports:{Cliente,sequelize}};
 const push=require.resolve('../backend/services/pushNotificationService');require.cache[push]={id:push,filename:push,loaded:true,exports:{notificarEmpresa:async()=>{}}};
 const c=require('../backend/controllers/clienteController');
 async function executar(fn,body,params={}){
   const res={code:200,status(code){this.code=code;return this},json(data){this.data=data;return this}};
   await fn({body,user:{empresaId:1},params},res);return res;
 }
 for(const [valor,esperado] of [['masculino','Masculino'],['feminino','Feminino'],['outro','Outro'],[' Feminino ','Feminino'],['',null],[null,null]]){
   const r=await executar(c.createCliente,{nome:'Teste',sexo:valor,data_nascimento:'',ativo:true});
   assert.equal(r.code,201,JSON.stringify(r.data));assert.equal(r.data.cliente.sexo,esperado);
   const id=r.data.cliente.id;
   assert.equal((await executar(c.updateCliente,{sexo:'outro',empresa_id:2},{id})).code,200);
   const salvo=await Cliente.findByPk(id);assert.equal(salvo.sexo,'Outro');assert.equal(salvo.empresa_id,1);
   assert.equal((await executar(c.updateCliente,{sexo:''},{id})).code,200);assert.equal((await Cliente.findByPk(id)).sexo,null);
 }
 const antes=await Cliente.count();
 assert.equal((await executar(c.createCliente,{nome:'Inválido',sexo:'qualquer'})).code,400);
 assert.equal(await Cliente.count(),antes);
 const item=await Cliente.findOne();
 assert.equal((await executar(c.updateCliente,{sexo:'qualquer'},{id:item.id})).code,400);
});
