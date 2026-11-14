// Opcional: npm install --no-save --package-lock=false playwright
// npx playwright install chromium
// node tests/browser/pets-clientes.ui.cjs
const express=require('express'),{chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const app=express();app.use(express.json());let operacao=null,confirmacoes=0;
 const rows=[{linha:2,acao:'criar',dados:{nome:'Mel',tutor_nome:'Maria'},cliente_id:1,vinculo:{situacao:'automatico',cliente:{id:1,nome:'Maria'},candidatos:[{id:1,nome:'Maria'}]}},{linha:3,acao:'criar',dados:{nome:'Thor',tutor_nome:'Tutor desconhecido'},vinculo:{situacao:'sem_vinculo',motivo:'Tutor não encontrado.',candidatos:[]}}];
 app.get('/api/pets/importacao/campos',(req,res)=>res.json({campos:{nome:['Nome do pet'],tutor_nome:['Nome do tutor']},centros:[]}));
 app.get('/api/pets/importacao/operacoes/atual',(req,res)=>res.json({operacao}));
 app.get('/api/pets/importacao/operacoes/:id',(req,res)=>res.json({operacao}));
 app.get('/api/pets/importacao/tutores',(req,res)=>res.json({clientes:[{id:1,nome:'Maria',telefone:'31988887777'}]}));
 app.post('/api/pets/importacao/analisar',(req,res)=>res.json({token:'token-ficticio',linhas:rows,cabecalho:['nome','tutor_nome'],mapeamento:['nome','tutor_nome'],centros:[],resumo:{total:2,validos:2,erros:0,vinculados:1,pendentes:1}}));
 app.post('/api/pets/importacao/operacoes',(req,res)=>{confirmacoes++;assert.equal(req.body.escolhas['3'].cliente_id,1);operacao={id:'op-ficticia',tipo:'pets',estado:'processando',fase:'Conferindo e salvando lote',total:2,processados:0,percentual:0,criados:0,atualizados:0,ignorados:0,rejeitados:0,vinculados:0,decorridoSegundos:0};res.status(202).json({operacao});});
 app.get('/',(req,res)=>res.send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/importacao.css"><div id="acoes"></div><script src="/importacao.js" data-tipo="pets" data-alvo="#acoes"></script></html>'));
 app.use(express.static(path.resolve(__dirname,'../../frontend')));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PETHUB_TEST_CHROME?{executablePath:process.env.PETHUB_TEST_CHROME}:{}),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url);await page.getByRole('button',{name:'Importar Pets',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'pets.csv',mimeType:'text/csv',buffer:Buffer.from('nome;tutor_nome\nMel;Maria\nThor;Tutor desconhecido')});await page.getByRole('button',{name:'Analisar planilha',exact:true}).click();await page.getByRole('heading',{name:'Conferir vínculo dos pets'}).waitFor();
  await page.getByRole('button',{name:'Confirmar importação',exact:true}).click();assert.equal(confirmacoes,0);await page.getByText('Existem pets selecionados sem tutor confirmado.',{exact:false}).waitFor();
  await page.getByRole('searchbox',{name:'Pesquisar tutor da linha 3'}).fill('Maria');await page.getByRole('combobox',{name:'Escolher tutor da linha 3'}).selectOption('1');await page.getByRole('button',{name:'Confirmar importação',exact:true}).click();await page.locator('.ph-job').waitFor();assert.equal(confirmacoes,1);assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'0');
  await page.getByRole('button',{name:'Fechar acompanhamento',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Importar Pets',exact:true}).click();await page.locator('.ph-job').waitFor();
  await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  operacao={...operacao,estado:'concluido',fase:'Importação concluída',processados:2,percentual:100,criados:2,vinculados:2};await page.getByText('Importação concluída ✓',{exact:true}).waitFor();assert.deepEqual(errors,[]);console.log('UI pets: revisão obrigatória, seleção manual, confirmação única, progresso, recarga e 375px aprovados.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
