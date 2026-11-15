// Opcional, para validação visual em ambiente com Chromium disponível.
// npm install --no-save --package-lock=false playwright
// npx playwright install chromium
// node tests/browser/central-ajuda.ui.cjs
const {chromium}=require('playwright'),express=require('express'),path=require('node:path'),assert=require('node:assert/strict'),os=require('node:os');
(async()=>{
 const app=express();app.use(express.static(path.resolve(__dirname,'../../frontend')));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PETHUB_TEST_CHROME?{executablePath:process.env.PETHUB_TEST_CHROME}:{})});
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+server.address().port+'/base-conhecimento/index.html';
  for(const width of [1440,900,375]){
   await page.setViewportSize({width,height:1000});await page.goto(url+'#inicio');await page.getByRole('heading',{name:/Como podemos ajudar/}).waitFor();
   await page.locator('.kb-hero-mascot img').evaluate(img=>img.complete?null:new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});}));
   assert.equal(await page.locator('.kb-hero-mascot img').evaluate(img=>img.naturalWidth>0),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Não deve haver overflow em '+width);
   await page.screenshot({path:path.join(os.tmpdir(),'pethub-ajuda-'+width+'.png'),fullPage:true});
  }
  await page.getByLabel('Pesquisar na Central de Ajuda',{exact:true}).fill('agendamento');await page.locator('#kbSearchResults a').first().waitFor();await page.locator('#kbSearchResults a').first().click();await page.locator('.kb-article-content').waitFor();assert.ok((await page.locator('.kb-article-content').innerText()).length>100);
  await page.goBack();await page.getByLabel('Pesquisar na Central de Ajuda',{exact:true}).fill('zzzzzzzzzzz');await page.getByText('Não encontramos esse termo.',{exact:true}).waitFor();await page.getByRole('button',{name:'Limpar pesquisa'}).click();
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('link',{name:'Tutoriais em Vídeo',exact:true}).click();await page.getByRole('heading',{name:'Tutoriais em vídeo',exact:true}).waitFor();assert.ok((await page.locator('#kbContent').innerText()).includes('ainda não estão disponíveis'));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url+'#inicio');await page.getByRole('heading',{name:/Como podemos ajudar/}).waitFor();assert.equal(await page.locator('.kb-hero-mascot figure').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.deepEqual(errors,[]);console.log('Central: desktop/tablet/mobile, imagens, pesquisa, artigos, menu e movimento reduzido aprovados. Capturas na pasta temporária do sistema.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
