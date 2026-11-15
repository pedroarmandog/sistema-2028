'use strict';
process.env.NODE_ENV='production';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('./helpers/cliente-portal-fixture');
const Audio=require('../frontend/components/cliente-portal-audio');
test('intervalos de 1 a 120 segundos são salvos por empresa e recuperados por nova instância',async t=>{
 const f=await fixture(t);let c=await f.p.alertas.obterSom(1);
 for(const intervalo of [1,2,5,10,14,15,120]){c=await f.p.alertas.alterarSom(1,9,{versao:c.versao,intervalo});assert.equal(c.intervalo,intervalo);const nova=require('../backend/services/clientePortal/alertas').criarAlertas(f.p);assert.equal((await nova.obterSom(1)).intervalo,intervalo);}
 assert.equal((await f.p.alertas.obterSom(2)).intervalo,25);
});
test('intervalo zero, negativo, fracionado ou acima do limite é rejeitado sem apagar valor salvo',async t=>{
 const f=await fixture(t);const c=await f.p.alertas.alterarSom(1,9,{versao:0,intervalo:3});
 for(const intervalo of [0,-1,1.5,121]){await assert.rejects(f.p.alertas.alterarSom(1,9,{versao:c.versao,intervalo}),e=>e.status===400);assert.equal((await f.p.alertas.obterSom(1)).intervalo,3);}
});
test('formulário permite segundos inteiros a partir de um',()=>{
 const js=fs.readFileSync(require.resolve('../frontend/components/cliente-portal-som-config.js'),'utf8');assert.match(js,/name="intervalo" type="number" min="1" max="120" step="1"/);
});
test('ciclo de um segundo usa temporizador correto e não sobrepõe um áudio mais longo',async()=>{
 const timers=new Map();let id=0;const a={paused:true,plays:0,pause(){this.paused=true;},async play(){this.paused=false;this.plays++;},addEventListener(){}};
 const host={addEventListener(){},URL:{revokeObjectURL(){}},navigator:{}};
 const manager=Audio.criar({host,audio:a,isLeader:()=>true,setInterval:(fn,ms)=>{const i=++id;timers.set(i,{fn,ms});return i;},clearInterval:i=>timers.delete(i),setTimeout:()=>++id,clearTimeout(){}});
 try{await manager.configure({tipo:'padrao',versao:1,url:'/classico.wav',volume:45,intervalo:1,opcoes:[{url:'/classico.wav'}]},'1:9');manager.setPending(true,'1:9');await new Promise(r=>setImmediate(r));const ciclo=[...timers.values()].find(t=>t.ms===1000);assert.ok(ciclo);assert.equal(a.plays,1);await ciclo.fn();assert.equal(a.plays,1);a.paused=true;await ciclo.fn();assert.equal(a.plays,2);manager.setPending(false,'1:9');assert.equal(a.paused,true);assert.ok(![...timers.values()].some(t=>t.ms===1000));}finally{manager.dispose();}
});
