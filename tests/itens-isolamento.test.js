const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Sequelize}=require('sequelize');
const express=require('express');
test('API de itens mantém empresas A, B e registros sem dono isolados',async t=>{
 const db=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false,dialectModule:require('../backend/scripts/lab-fiscal/sqlite')});
 function stub(nome,exports){const filename=require.resolve(nome);require.cache[filename]={filename,id:filename,loaded:true,exports};}
 stub('../backend/models/Cliente',{sequelize:db});
 stub('../backend/models',{Usuario:{findByPk:async()=>({permissoes:null})}});
 stub('../backend/middleware/authUser',{authUser(req,res,next){
   const id=req.get('x-teste-empresa');
   if(!id)return res.sendStatus(401);
   req.user={id:1,empresaId:id};next();
 }});
 const Produto=require('../backend/models/Produto');
 require('../backend/models/Fornecedor');
 const Historico=require('../backend/models/HistoricoEstoque');
 await db.sync();
 await Produto.bulkCreate([{id:'A',nome:'Exclusivo A',empresa_id:1,estoqueAtual:10},
 {id:'B',nome:'Exclusivo B',empresa_id:2,estoqueAtual:20},
 {id:'SEM',nome:'Legado sem dono',empresa_id:null}]);
 await Historico.create({produtoId:'B',dataMovimento:new Date(),operacao:'Entrada',estoqueAnterior:0,quantidade:20,novoEstoque:20});
 const app=express();app.use(express.json());app.use('/api/itens',require('../backend/routes/itemRoutes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await db.close()});
 const base='http://127.0.0.1:'+server.address().port+'/api/itens';
 async function call(path='',method='GET',body,empresa='1'){
  const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(empresa?{'x-teste-empresa':empresa}:{})},body:body&&JSON.stringify(body)});
  return {status:res.status,data:await res.json().catch(()=>null)};
 }
 assert.equal((await call('','GET',undefined,null)).status,401);
 assert.equal((await call('','GET',undefined,'0')).status,403);
 assert.deepEqual((await call()).data.map(p=>p.id),['A']);
 assert.deepEqual((await call('','GET',undefined,'2')).data.map(p=>p.id),['B']);
 assert.deepEqual((await call('?q=Exclusivo B')).data,[]);
 for(const path of ['/B','/SEM','/B/historico-estoque'])assert.equal((await call(path)).status,404);
 assert.equal((await call('/B','PUT',{nome:'invadido'})).status,404);
 assert.equal((await call('/B/estoque','PUT',{quantidade:2,operacao:'reduzir'})).status,404);
 assert.equal((await call('/B','DELETE')).status,404);
 await call('/permite-estoque-negativo','PUT',{permiteEstoqueNegativo:'sim'});
 assert.equal((await Produto.findByPk('B')).permiteEstoqueNegativo,'nao');
 const imp=await call('/import','POST',[{id:'B',nome:'invadido',empresa_id:1},{id:'NOVO',nome:'Novo',empresa_id:2}]);
 assert.equal(imp.data.imported,1);
 assert.equal((await Produto.findByPk('B')).nome,'Exclusivo B');
 assert.equal((await Produto.findByPk('NOVO')).empresa_id,1);
 const criado=await call('','POST',{id:'B',nome:'Mesmo nome em A',empresa_id:2});
 assert.equal(criado.status,201);
 assert.equal(criado.data.empresa_id,1);
 assert.notEqual(criado.data.id,'B');
 assert.equal((await call('/A','PUT',{nome:'A editado',empresa_id:2,id:'B'})).status,200);
 assert.equal((await Produto.findByPk('A')).empresa_id,1);
 assert.equal((await call('/validade-status')).status,200);
 assert.equal((await call('/last-saved')).status,200);
 assert.equal((await call('/A/estoque','PUT',{quantidade:2,operacao:'reduzir'})).status,200);
 assert.equal((await call('/A/historico-estoque')).data.length,1);
 assert.equal((await call('/A','DELETE')).status,200);
});
