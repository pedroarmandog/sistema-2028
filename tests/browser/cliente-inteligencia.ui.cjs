// Opcional: npm install --no-save --package-lock=false playwright
// npx playwright install chromium
// node tests/browser/cliente-inteligencia.ui.cjs
const express=require('express');
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{
 let perfil={instagram:'@exemplo',bloquear_sms:true,bloquear_whatsapp:false,cadastro_original:'2022-02-01'},salvos=[];
 const historicos=[{data_referencia_historico:'2026-11-01',vendas_desde_cadastro:'2000.00',ticket_medio_desde_cadastro:'100.00',quantidade_vendas_historicas:null,vendas_ultimo_mes:'300.00',vendas_ultima_semana:'100.00',data_ultima_venda:'2026-10-31',modo_conciliacao:'somar_posteriores',origem_historico:'Planilha de teste',corte_em:'2026-11-02T02:59:59.999Z'}];
 let vazio=false;
 const analise=()=>({perfil,historicos,historico:historicos[0],avisos:['Quantidade histórica desconhecida: ticket combinado indisponível.'],pethub:{total:15000,quantidade:1,ticket:15000,ultimos30:15000,ultimos7:15000,anteriores30:0,tipos:{produto:10000,servico:5000,nao_classificado:0}},combinado:{total:215000,quantidade:null,ticket:null,ultimaVenda:'2026-11-13T14:00:00Z'},meses:Array.from({length:12},(_,i)=>({periodo:'2026-'+String(i+1).padStart(2,'0'),centavos:!vazio&&i===10?15000:0})),semanas:Array.from({length:8},(_,i)=>({periodo:'2026-10-'+String(i+1).padStart(2,'0'),centavos:!vazio&&i===7?15000:0}))});
 const app=express();app.use(express.json());
 app.get('/api/clientes/:id/inteligencia',(req,res)=>req.params.id==='404'?res.status(404).json({erro:'Cliente não encontrado.'}):res.json({perfil,historicos}));
 app.put('/api/clientes/:id/inteligencia',(req,res)=>{salvos.push(req.body);perfil={...perfil,...req.body};res.json({perfil,historicos});});
 app.get('/api/clientes/:id/analise-vendas',(req,res)=>res.json(analise()));
 const shell=novo=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/cliente-inteligencia.css"><style>*{box-sizing:border-box}body{font:14px Arial;background:#f4f7fa;color:#263c50;margin:0;padding:20px}.tabs-navigation{display:flex;gap:10px;background:white;padding:12px;border-radius:10px}.tab-btn{border:0;border-radius:6px;background:#fff;padding:12px;color:#32495b}.active{background:#e6f5ea}.tab-content{display:none}.tab-content.active{display:block;background:transparent}main{max-width:1280px;margin:auto}@media(max-width:500px){body{padding:12px}}</style><main>${novo?'<form><h1>Novo Cliente · Teste</h1><div class="form-actions"><button type="button">Salvar cadastro</button></div></form>':'<h1>Cliente de teste</h1><nav class="tabs-navigation"><button class="tab-btn active" data-tab="detalhes">Detalhes</button><button class="tab-btn" data-tab="historico">Histórico</button><button class="tab-btn" data-tab="analise-vendas">Análise de Vendas</button></nav><div id="detalhes-tab" class="tab-content active"></div><div id="historico-tab" class="tab-content"></div><div id="analise-vendas-tab" class="tab-content"></div>'}</main><script>document.querySelectorAll('.tab-btn').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab-btn,.tab-content').forEach(n=>n.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.tab+'-tab').classList.add('active')})</script><script src="/cliente-inteligencia.js"></script></html>`;
 app.get('/client-details.html',(req,res)=>res.send(shell(false)));app.get('/novo-cliente.html',(req,res)=>res.send(shell(true)));app.use(express.static(path.resolve(__dirname,'../../frontend')));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
 browser=await chromium.launch({headless:true,...(process.env.PETHUB_TEST_CHROME?{executablePath:process.env.PETHUB_TEST_CHROME}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/client-details.html?id=1');await page.locator('.ci-message').filter({hasText:'disponíveis'}).waitFor();
 await page.getByRole('button',{name:'Análise de Vendas',exact:true}).click();await page.locator('.ci-cards').waitFor();
 assert.equal(await page.locator('.ci-cards .ci-card').count(),6);assert.equal(await page.locator('.ci-bar').count(),20);assert.ok((await page.locator('.ci-cards').innerText()).includes('2.150,00'));
 await page.screenshot({path:path.join(require('node:os').tmpdir(),'pethub-clientes-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Detalhes',exact:true}).click();await page.getByLabel('Bloquear envio de WhatsApp',{exact:true}).check();
 await page.getByRole('button',{name:'Salvar dados e preferências'}).click();await page.locator('.ci-message').filter({hasText:'Dados salvos'}).waitFor();assert.equal(salvos.at(-1).bloquear_whatsapp,true);
 await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'Análise de Vendas',exact:true}).click();await page.locator('.ci-cards').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(require('node:os').tmpdir(),'pethub-clientes-mobile.png'),fullPage:true});
 vazio=true;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByText('Nenhuma venda elegível neste período.').first().waitFor();
 await page.goto(base+'/novo-cliente.html');await page.locator('.ci-message').filter({hasText:'disponíveis'}).waitFor();
 await page.getByLabel('Código do cliente no sistema anterior',{exact:true}).fill('NOVO-1');
 const serializado=await page.evaluate(()=>{const f=new FormData();window.PetHubClienteExtras.anexar(f);return Object.fromEntries(f.entries());});assert.equal(serializado.codigo_legado,'NOVO-1');assert.equal(serializado.bloquear_whatsapp,'false');
 await page.goto(base+'/novo-cliente.html?edit=404');await page.getByText('Cliente não encontrado.',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Bloquear envio de WhatsApp',{exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('UI: desktop 1440px, mobile 375px, gráficos/estado vazio, salvar preferências, criação e falha de carregamento: aprovados.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
