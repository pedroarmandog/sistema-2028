process.env.NODE_ENV='production';process.env.JWT_USER_SECRET='segredo-pdf-identidade-teste';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const {carregarIdentidade,desenharLogo,cabecalhoFaturamento}=require('../backend/services/identidadeEmpresaPDF');
const req=id=>({user:{empresaId:id},body:{companyLogo:'nao-confiar'},query:{empresaId:2}});
const out=path.join(__dirname,'../tmp/pdfs/logos');fs.mkdirSync(out,{recursive:true});
const logo=(cor,w=240,h=100)=>sharp({create:{width:w,height:h,channels:3,background:cor}}).png().toBuffer();

test('identidade: somente empresa autenticada, leitura nova a cada chamada e sem fallback global',async()=>{
 let atual='primeira',reads=[];const deps={Empresa:{findByPk:async id=>({id,razaoSocial:'EMPRESA '+id,logo:atual})},lerImagem:async(id,ref)=>{reads.push([id,ref]);return Buffer.from(ref);}};
 await assert.rejects(carregarIdentidade({query:{empresaId:1}},deps),e=>e.status===403);
 const a=await carregarIdentidade(req(1),deps);atual='segunda';const b=await carregarIdentidade(req(1),deps),c=await carregarIdentidade(req(2),deps);
 assert.equal(a.logoBuffer.toString(),'primeira');assert.equal(b.logoBuffer.toString(),'segunda');assert.equal(c.nomeEmpresa,'EMPRESA 2');assert.deepEqual(reads,[[1,'primeira'],[1,'segunda'],[2,'segunda']]);
 const sem=await carregarIdentidade(req(1),{Empresa:{findByPk:async()=>({id:1,nome:'Sem logo',logo:null})},lerImagem:()=>{throw Error('Não carregar imagem padrão');}});assert.equal(sem.logoBuffer,null);
});
test('logo PDF: caixa limitada mantém proporção, centraliza e tolera PNG inválido',async()=>{
 const PDF=require('pdfkit'),doc=new PDF({size:'A4',margin:36});doc.resume();const b=await logo('#cc0000',100,600);const r=desenharLogo(doc,b,{y:25,width:110,maxHeight:70});assert.equal(r.height,70);assert.ok(Math.abs(r.width/70-100/600)<0.0001);assert.equal(r.fimY,95);assert.equal(desenharLogo(doc,Buffer.from('inválida')).desenhada,false);assert.equal(desenharLogo(doc,null).desenhada,false);doc.end();
});
test('HTTP/PDFs reais: logo oficial, troca, isolamento, ausência, paginação e térmica',async t=>{
 const models=require('../backend/models'),jwt=require('jsonwebtoken'),express=require('express'),cookie=require('cookie-parser');
 const a=await logo('#cc0000'),b=await logo('#0055cc'),alta=await logo('#00aa66',100,600);
 let referencia='a',quantos=3;const imagens={a,b,alta};const empresas={1:{id:1,nome:'Empresa A',razaoSocial:'EMPRESA A LTDA',logo:'a',ativo:true,ativa:true,telefone:'31999999999'},2:{id:2,nome:'Empresa B',razaoSocial:'EMPRESA B LTDA',logo:'b',ativo:true,ativa:true}};
 t.mock.method(models.Empresa,'findByPk',async id=>empresas[id]?{...empresas[id],logo:Number(id)===1?referencia:empresas[id].logo}:null);
 t.mock.method(require('../backend/services/midias/imagem'),'carregarImagem',async(id,ref)=>imagens[ref]||null);
 t.mock.method(models.SessaoAtiva,'findOne',async()=>null);t.mock.method(models.SessaoAtiva,'update',async()=>[0]);
 const itens=()=>Array.from({length:quantos},(_,i)=>({id:String(i+1),codigo:String(i+1),nome:'PRODUTO TESTE '+String(i+1).padStart(3,'0'),custoBase:10,preco:25,tipo:'produto'}));
 t.mock.method(models.Produto,'findAll',async()=>itens());
 t.mock.method(models.Venda,'findAll',async o=>{assert.equal(Number(o.where.empresa_id),1);return o.offset?[]:[{id:10,empresa_id:1,itens:itens().map(p=>({produtoId:p.id,nome:p.nome,codigo:p.codigo,preco:25,quantidade:2}))}];});
 const venda={id:10,empresa_id:1,clienteId:1,cliente:'Cliente A',data:new Date('2026-11-14T12:00:00Z'),itens:[{nome:'PRODUTO TESTE',quantidade:2,preco:25}],totais:{total:50,totalVenda:50,totalBruto:50},pagamentos:[]};
 t.mock.method(models.Venda,'findOne',async o=>Number(o.where.empresa_id)===1&&Number(o.where.id)===10?venda:null);
 t.mock.method(models.Cliente,'findOne',async o=>Number(o.where.empresa_id)===1&&Number(o.where.id)===1?{id:1,nome:'Cliente A'}:null);
 const orc={...venda};t.mock.method(models.Orcamento,'findByPk',async id=>Number(id)===10?orc:null);
 const ag={id:10,empresa_id:1,profissional:'Profissional',status:'concluido',dataAgendamento:'2026-11-14',horario:'09:00',pet:{nome:'Pet A',cliente:{nome:'Cliente A'}},servico:'Banho',valor:50,observacoes:'Teste',anamnese:'Teste'};
 t.mock.method(models.Agendamento,'findAll',async()=>[ag]);t.mock.method(models.Agendamento,'findOne',async o=>Number(o.where.id)===10&&Number(o.where.empresa_id)===1?ag:null);
 t.mock.method(models.Fornecedor,'findAll',async()=>[{id:1,nome:'Fornecedor',telefone:'31999999999',cnpj:'',ativo:true}]);
 t.mock.method(models.Entrada,'findOne',async o=>Number(o.where.id)===10&&Number(o.where.empresa_id)===1?{...venda,numero:10,fornecedorNome:'Fornecedor',valorTotal:50}:null);
 const {authUser}=require('../backend/middleware/authUser');const app=express();app.use(express.json(),cookie());app.use('/api/relatorios',require('../backend/routes/relatoriosRoutes'));app.use('/api/vendas',require('../backend/routes/vendaRoutes'));app.use('/api/orcamentos',require('../backend/routes/orcamentoRoutes'));app.use('/api/agendamentos',require('../backend/routes/agendamentoRoutes'));app.use('/api/entrada',authUser,require('../backend/entrada-mercadoria/dist/routes/entradaRouter'));app.get('/api/empresas/identidade-pdf',authUser,require('../backend/services/identidadeEmpresaPDF').endpoint);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});const base='http://127.0.0.1:'+server.address().port;
 const token=id=>jwt.sign({id,empresaId:id},process.env.JWT_USER_SECRET,{expiresIn:'5m'}),filtros={dataInicio:'01/11/2026',dataFim:'14/11/2026'};
 async function api(url,body,emp=1){return fetch(base+url,{headers:{...(emp?{Authorization:'Bearer '+token(emp)}:{}),'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})});}
 async function pdf(nome,url,body,emp=1,imagem=true){const r=await api(url,body,emp);assert.equal(r.status,200,await(!r.ok?r.text():Promise.resolve('')));assert.match(r.headers.get('content-type'),/application\/pdf/);const buffer=Buffer.from(await r.arrayBuffer());assert.equal(buffer.subarray(0,5).toString(),'%PDF-');if(imagem)assert.match(buffer.toString('latin1'),/\/Subtype \/Image/);else assert.ok(!buffer.toString('latin1').includes('/Subtype /Image'));fs.writeFileSync(path.join(out,nome+'.pdf'),buffer);return buffer;}
 await t.test('faturamento ignora logo e nome do payload e incorpora PNG da empresa',async()=>{await pdf('faturamento-a','/api/relatorios/faturamento/pdf',{...filtros,companyLogo:'data:image/png;base64,'+b.toString('base64'),companyRazao:'EMPRESA B FALSA'});const r=await api('/api/relatorios/faturamento',filtros);const d=await r.json();assert.equal(d.produtos.length,3);assert.equal(d.produtos[0].total_venda,50);assert.equal(d.produtos[0].total_custo,20);assert.equal(d.produtos[0].total_lucro,30);});
 await t.test('atualização, empresa B, sem logo e imagem indisponível',async()=>{referencia='b';await pdf('faturamento-atualizada','/api/relatorios/faturamento/pdf',filtros);await pdf('produtos-b','/api/relatorios/produtos/pdf',{produtos:itens()},2);referencia=null;await pdf('faturamento-sem-logo','/api/relatorios/faturamento/pdf',filtros,1,false);referencia='perdida';await pdf('faturamento-logo-perdida','/api/relatorios/faturamento/pdf',filtros,1,false);referencia='a';});
 await t.test('logo muito alta e relatório multipágina com totais preservados',async()=>{referencia='alta';await pdf('faturamento-alta','/api/relatorios/faturamento/pdf',filtros);referencia='a';quantos=110;await pdf('faturamento-multipagina','/api/relatorios/faturamento/pdf',filtros);quantos=3;});
 await t.test('venda no período, comissão, atendimentos, catálogo GET/POST, entradas, fornecedores, DRE',async()=>{
  for(const [nome,url,body]of [
   ['venda-periodo','/api/relatorios/venda-no-periodo/pdf?dataInicio=01/11/2026&dataFim=14/11/2026'],
   ['comissao','/api/relatorios/comissao/pdf',{linhas:[],totais:{},filtros}],
   ['atendimentos','/api/relatorios/atendimento-periodo/pdf',filtros],
   ['catalogo-get','/api/relatorios/produtos/pdf'],
   ['catalogo-post','/api/relatorios/produtos/pdf',{produtos:itens()}],
   ['entradas','/api/relatorios/entradas/pdf',{entradas:[]}],
   ['fornecedores','/api/relatorios/fornecedores/pdf',{}],
   ['dre','/api/relatorios/demonstrativo-resultados/pdf',filtros]])await pdf(nome,url,body);
 });
 await t.test('comprovantes de venda/orçamento/atendimento e prontuário',async()=>{for(const [nome,url]of [['venda-termica','/api/vendas/10/comprovante'],['orcamento-termico','/api/orcamentos/10/comprovante'],['atendimento-termico','/api/agendamentos/10/comprovante'],['prontuario','/api/agendamentos/10/prontuario/pdf?empresaId=2']])await pdf(nome,url);});
 await t.test('documento interno da entrada: POST/GET com identidade e sem acesso cruzado',async()=>{await pdf('entrada-interna','/api/entrada/generate-danfe',{numero:10,itens:[]});await pdf('entrada-interna-get','/api/entrada/10/danfe');assert.equal((await api('/api/entrada/10/danfe',undefined,2)).status,404);});
 await t.test('anônimo, venda de outra empresa, orçamento legado sem vínculo e identidade sem cache',async()=>{
  assert.equal((await api('/api/empresas/identidade-pdf',undefined,0)).status,401);
  const recurso=await api('/api/relatorios/recursos/stimulsoft/viewer.css');assert.equal(recurso.status,200);await recurso.text();assert.equal((await api('/api/relatorios/recursos/stimulsoft/package.json')).status,404);assert.equal((await api('/api/relatorios/faturamento/pdf',filtros,0)).status,401);assert.equal((await api('/api/vendas/10/comprovante',undefined,2)).status,404);assert.equal((await api('/api/orcamentos/10/comprovante',undefined,0)).status,401);assert.equal((await api('/api/orcamentos/10/comprovante',undefined,2)).status,409);
  let r=await api('/api/empresas/identidade-pdf?empresaId=2');assert.match(r.headers.get('cache-control'),/no-store/);let d=await r.json();assert.equal(d.id,1);assert.equal(d.razaoSocial,'EMPRESA A LTDA');assert.equal(d.logoDataUrl,'data:image/png;base64,'+a.toString('base64'));referencia='b';d=await(await api('/api/empresas/identidade-pdf')).json();assert.equal(d.logoDataUrl,'data:image/png;base64,'+b.toString('base64'));referencia='a';
  const jpeg=await(await api('/api/empresas/identidade-pdf?formato=jpeg')).json();assert.ok(jpeg.logoDataUrl.startsWith('data:image/jpeg;base64,'));assert.equal(Buffer.from(jpeg.logoDataUrl.split(',')[1],'base64').subarray(0,2).toString('hex'),'ffd8');
 });
});
test('Stimulsoft legado: template válido incorpora identidade e preserva soma/formatos',async()=>{
 const S=require('stimulsoft-reports-js'),report=new S.Report.StiReport();report.loadFile(path.join(__dirname,'../frontend/reports/templates/faturamento.mrt'));
 for(const nome of ['HeaderLogo','HeaderTitle','HeaderCompany','HeaderPeriod','TextCodigo','TextProduto','TextQtd','TextCusto','TextVenda','FooterTotal'])assert.ok(report.getComponentByName(nome),nome+' deve carregar');
 const jpg=await sharp(await logo('#cc0000')).jpeg().toBuffer();report.getComponentByName('HeaderLogo').image=S.System.Drawing.Image.fromBase64(jpg.toString('base64'));report.getComponentByName('HeaderCompany').text='EMPRESA A LTDA';report.getComponentByName('HeaderPeriod').text='Período: 01/11/2026 até 14/11/2026';
 const ds=new S.System.Data.DataSet('Data');ds.readJson({produtos:[{codigo:'1',produto:'Produto teste',qtd_vendida:2,custo:10,total_venda:50}]});report.regData('Data','Data',ds);report.render();const bytes=Buffer.from(report.exportDocument(S.Report.StiExportFormat.Pdf));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.match(bytes.toString('latin1'),/\/Subtype \/Image/);fs.writeFileSync(path.join(out,'stimulsoft.pdf'),bytes);
 assert.equal(report.getComponentByName('TextCusto').textFormat.symbol,'R$ ');assert.equal(report.getComponentByName('TextCusto').textFormat.useLocalSetting,false);
});
