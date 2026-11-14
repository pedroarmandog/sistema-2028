// Opcional: npm install --no-save --package-lock=false playwright
// npx playwright install chromium
// node tests/browser/importacao-progresso.ui.cjs
// API simulada; a persistência real é exercitada em importacao-progresso.test.js.
const express=require('express'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 let estado={id:'operacao-ficticia',estado:'processando',fase:'Conferindo e salvando lote',total:100,processados:0,percentual:0,criados:0,atualizados:0,ignorados:0,rejeitados:0,decorridoSegundos:0,restanteSegundos:null};
 const app=express();app.use(express.json());let mutacoes=0;
 app.use((req,res,next)=>{if(req.method!=='GET')mutacoes++;next();});
 app.get('/api/clientes/importacao/campos',(req,res)=>res.json({campos:{nome:['Nome']},centros:[]}));
 app.get('/api/clientes/importacao/operacoes/atual',(req,res)=>res.json({operacao:estado}));
 app.get('/api/clientes/importacao/operacoes/:id',(req,res)=>res.json({operacao:estado}));
 app.get('/',(req,res)=>res.send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/importacao.css"><style>body{font:14px Arial;background:#f5f7fa}</style><div id="acoes"></div><script src="/importacao.js" data-tipo="clientes" data-alvo="#acoes"></script></html>'));
 app.use(express.static(path.resolve(__dirname,'../../frontend')));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PETHUB_TEST_CHROME?{executablePath:process.env.PETHUB_TEST_CHROME}:{}),args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url);await page.getByRole('button',{name:'Importar Clientes',exact:true}).click();
  await page.locator('.ph-job-percent').getByText('0%',{exact:true}).waitFor();
  assert.equal(await page.locator('.mapping').isVisible(),false);
  assert.equal(await page.getByRole('button',{name:'Baixar relatório'}).isDisabled(),true);
  estado={...estado,processados:50,percentual:50,criados:45,ignorados:3,rejeitados:2,decorridoSegundos:20,restanteSegundos:20};
  await page.locator('.ph-job-percent').getByText('50%',{exact:true}).waitFor();
  await page.waitForTimeout(1800);assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'50');
  assert.equal(await page.locator('.ph-job-pet').evaluate(n=>n.parentElement.parentElement.style.getPropertyValue('--job-progresso')),'50%');
  await page.getByRole('button',{name:'Fechar acompanhamento'}).click();assert.equal(await page.locator('.ph-job').count(),0);assert.equal(mutacoes,0);
  await page.reload();await page.getByRole('button',{name:'Importar Clientes',exact:true}).click();await page.locator('.ph-job-percent').getByText('50%',{exact:true}).waitFor();
  await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.ph-job-leg').first().evaluate(n=>getComputedStyle(n).animationName),'none');
  estado={...estado,estado:'concluido',fase:'Importação concluída',processados:100,percentual:100,criados:95,decorridoSegundos:40};
  await page.getByText('Importação concluída ✓',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Baixar relatório'}).isEnabled(),true);assert.deepEqual(errors,[]);
  console.log('UI aprovada: progresso confirmado, sem avanço por relógio, fechar/reabrir, recarga, mobile e movimento reduzido.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
