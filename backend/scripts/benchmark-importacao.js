// Benchmark isolado: banco SQLite em memória e clientes fictícios. Nunca usa o TiDB.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function medir(modo,total){
 const lab=await require('./lab-fiscal/app').criarLaboratorio(),db=lab.db,{DataTypes}=require('sequelize');
 try{
  const src=fs.readFileSync(require.resolve('../models/Cliente'),'utf8');
  const Cliente=vm.runInNewContext(src.slice(src.indexOf('const Cliente = sequelize.define('),src.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
  await Cliente.sync({force:true});lab.models.Cliente=Cliente;require.cache[require.resolve('../models/Cliente')].exports.Cliente=Cliente;
  const S=require('../services/importacao/servico'),I=require('../services/clienteInteligencia'),B=require('../services/importacao/modelos'),O=require('../services/importacao/operacoes');
  await B.preparar();await I.preparar(db);await O.prepararEstrutura(db);
  const rows=Array.from({length:total},(_,i)=>['BENCH-'+i,'Cliente fictício '+i,100,50,'2026-11-01']);
  const inicioPreview=performance.now();
  const preview=await S.analisar('clientes',{linhas:rows},['codigo_legado','nome','vendas_desde_cadastro','ticket_medio_desde_cadastro','data_referencia_historico'],1,'',1,{});
  const previaMs=performance.now()-inicioPreview;
  let consultas=0;db.options.logging=()=>consultas++;
  const inicio=performance.now();let resultado,checkpoints=0,respostaMs;
  if(modo==='anterior')resultado=await S.confirmar('clientes',1,1,preview.token,{});
  else{
   const p=O.criarProcessador({db,Cliente,Empresa:lab.models.Empresa,Lote:B.Lote,Linha:B.Linha,tamanho:50,log:{info(){},warn(){}}});
   const job=await p.iniciar(1,1,preview.token,{});respostaMs=performance.now()-inicio;
   for(let i=0;i<Math.ceil(total/50)+3;i++){
    await p.executarUma();const r=await p.obter(1,job.id);checkpoints++;
    assert.equal(r.percentual,Math.floor(r.processados/total*100));
    assert.equal(r.processados,r.criados+r.atualizados+r.ignorados+r.rejeitados);
    if(r.estado==='interrompido')throw new Error(r.erro);
    if(r.estado==='concluido'){resultado=await p.relatorioFinal(1,job.id);break;}
   }
   await p.parar();
  }
  const duracaoMs=performance.now()-inicio,qtdConsultas=consultas;db.options.logging=false;
  assert.equal(resultado.criados,total);assert.equal(await Cliente.count({where:{empresa_id:1}}),total);assert.equal(await Cliente.count({where:{empresa_id:2}}),0);
  assert.equal(await I.modelos(db).Historico.count(),total);assert.equal(resultado.atualizados,0);assert.equal(resultado.rejeitados||0,0);
  let validacaoAtualizacao=null;
  if(modo==='lotes'){
   // Fora do tempo medido: atualizar todos e conferir que a história anterior não foi apagada.
   const alteradas=rows.map((r,i)=>[r[0],'Cliente atualizado '+i,150,'','2026-11-01']);
   const previa=await S.analisar('clientes',{linhas:alteradas},['codigo_legado','nome','vendas_desde_cadastro','ticket_medio_desde_cadastro','data_referencia_historico'],1,'',1,{});
   const p=O.criarProcessador({db,Cliente,Empresa:lab.models.Empresa,Lote:B.Lote,Linha:B.Linha,tamanho:50,log:{info(){},warn(){}}});
   const job=await p.iniciar(1,1,previa.token,Object.fromEntries(previa.linhas.map(r=>[String(r.linha),'atualizar'])));let fim;
   for(let i=0;i<Math.ceil(total/50)+3;i++){await p.executarUma();fim=await p.obter(1,job.id);if(!['pendente','processando'].includes(fim.estado))break;}
   assert.equal(fim.estado,'concluido');assert.equal(fim.atualizados,total);assert.equal(fim.criados,0);assert.equal(await Cliente.count(),total);
   assert.equal(await I.modelos(db).Historico.count(),total);
   const historicos=await I.modelos(db).Historico.findAll();assert.ok(historicos.every(h=>Number(h.ticket_medio_desde_cadastro)===50&&Number(h.vendas_desde_cadastro)===150));
   assert.equal((await p.relatorioFinal(1,job.id)).relatorio.length,total);await p.parar();
   validacaoAtualizacao={atualizados:fim.atualizados,criados:fim.criados,historicosPreservados:historicos.length};
  }
  return {modo,total,previaMs:+previaMs.toFixed(1),duracaoMs:+duracaoMs.toFixed(1),registrosPorSegundo:+(total/duracaoMs*1000).toFixed(1),consultas:qtdConsultas,respostaMs:respostaMs===undefined?null:+respostaMs.toFixed(1),checkpoints,criados:resultado.criados,atualizados:resultado.atualizados,validacaoAtualizacao};
 }finally{await db.close();}
}
if(process.argv[2]==='--cenario')medir(process.argv[3],Number(process.argv[4])).then(r=>console.log('BENCH_RESULT '+JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
else{
 const resultados=[];
 for(const total of [10,100,500,1000,2500])for(const modo of ['anterior','lotes']){
  const r=spawnSync(process.execPath,[__filename,'--cenario',modo,String(total)],{encoding:'utf8',timeout:300000,maxBuffer:10*1024*1024});
  if(r.status!==0){process.stderr.write(r.stderr+r.stdout);process.exit(1);}
  const linha=r.stdout.split('\n').find(s=>s.startsWith('BENCH_RESULT '));if(!linha)throw new Error('Resultado ausente.');
  const medida=JSON.parse(linha.slice(13));resultados.push(medida);console.log(JSON.stringify(medida));
 }
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({ambiente:{node:process.version,banco:'SQLite em memória, sem latência Render/TiDB',lote:50,medicoesPorCenario:1},resultados},null,2)+'\n');
}
