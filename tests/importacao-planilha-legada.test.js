// Somente clientes fictícios. Reprodução do formato da planilha enviada, sem dados pessoais dela.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');const XLSX=require('xlsx');
const {cpfValido,preparar}=require('../backend/services/importacao/normalizarCliente');
function cpf(prefixo){let v=prefixo;for(let n=9;n<11;n++){let soma=0;for(let i=0;i<n;i++)soma+=Number(v[i])*(n+1-i);const d=11-soma%11;v+=d>=10?'0':String(d);}return v;}
test('CPF numérico: restaura zeros somente com dígitos verificadores válidos e preserva inválido',()=>{
 const documento=cpf('012345678');assert.ok(cpfValido(documento));
 const a=preparar({cpf:String(Number(documento))},{cpf:Number(documento)});assert.equal(a.dados.cpf,documento);assert.equal(a.avisos.length,1);
 const b=preparar({cpf:'123',email:'inválido'});assert.equal(b.dados.cpf,undefined);assert.equal(b.preservados.cpf,'123');assert.equal(b.preservados.email,'inválido');
 const numericoInvalido=preparar({cpf:'1.23E+13'},{cpf:12345678901234});assert.equal(numericoInvalido.preservados.cpf,'12345678901234');
 const c=preparar({cpf:'00000000000'});assert.equal(c.dados.cpf,undefined);
 // Texto curto não é completado por suposição.
 const d=preparar({cpf:String(Number(documento))});assert.equal(d.dados.cpf,undefined);
});
test('planilha legada: 499 linhas, datas personalizadas, avisos e reimportação segura',async t=>{
 const lab=await require('../backend/scripts/lab-fiscal/app').criarLaboratorio();const {DataTypes}=require('sequelize');const db=lab.db;
 const src=fs.readFileSync(require.resolve('../backend/models/Cliente'),'utf8');
 const Cliente=vm.runInNewContext(src.slice(src.indexOf('const Cliente = sequelize.define('),src.indexOf('module.exports = { Cliente'))+'\nCliente;',{sequelize:db,DataTypes,require});
 await Cliente.sync({force:true});lab.models.Cliente=Cliente;require.cache[require.resolve('../backend/models/Cliente')].exports.Cliente=Cliente;
 await lab.models.Usuario.update({permissoes:['cliente.novo']},{where:{id:1}});
 lab.app.use('/api/clientes/importacao',require('../backend/routes/importacaoRoutes').criarRotas('clientes'));
 const server=lab.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await db.close();});
 const I=require('../backend/services/clienteInteligencia');
 const headers=['cod_cliente','nome','cpf','mail','data_cadastro','vendas desde o cadastro','ticket  medio desde o cadastro','data ultima venda'];
 const rows=Array.from({length:4},(_,i)=>[9000+i,'','','',44574.73850694444]);
 for(let i=0;i<495;i++)rows.push([String(i+1),'Cliente fictício '+i,i<184?Number(cpf('0'+String(i+1).padStart(8,'0'))):i===184?'CPF_INVALIDO':cpf(String(100000000+i)),i===185?'email-invalido':'',44574.73850694444,i<448?100:'',i<448?50:'',i<448?46239:'']);
 // Duas fichas distintas do sistema legado compartilham documento.
 rows[4+187][2]=rows[4+186][2];
 const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
 for(let r=1;r<=499;r++)if(ws['E'+(r+1)])ws['E'+(r+1)].z='YYYY\\-MM\\-DDhh:mm:ss';
 for(let r=1;r<=499;r++)if(ws['H'+(r+1)]?.t==='n')ws['H'+(r+1)].z='DD/MM/YYYY;@';
 ws['!ref']='A1:H1915';
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Plan1');wb.Props={ModifiedDate:new Date('2026-11-13T12:00:00Z')};
 const bytes=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
 async function analisar(bodyBytes=bytes,ref='2026-11-13',empresa=1){
  const form=new FormData();form.append('arquivo',new Blob([bodyBytes]),'ficticios.xlsx');if(ref)form.append('referenciaHistorico',ref);
  const r=await lab.fetchLocal(base+'/api/clientes/importacao/analisar',{method:'POST',headers:{Authorization:'Bearer '+lab.token(empresa)},body:form});return{status:r.status,data:await r.json()};
 }
 async function confirmar(token,escolhas={},empresa=1){const r=await lab.fetchLocal(base+'/api/clientes/importacao/confirmar',{method:'POST',headers:{Authorization:'Bearer '+lab.token(empresa),'Content-Type':'application/json'},body:JSON.stringify({token,escolhas})});return{status:r.status,data:await r.json()};}
 let preview;
 await t.test('prévia canoniza datas Excel com hora e não confunde erros de CPF opcional com nome ausente',async()=>{
  const r=await analisar();assert.equal(r.status,200,JSON.stringify(r.data));preview=r.data;
  assert.equal(preview.resumo.total,499);assert.equal(preview.resumo.validos,495);assert.equal(preview.resumo.erros,4);assert.equal(preview.referenciaSugerida,'2026-11-13');
  assert.deepEqual(preview.linhas.filter(r=>r.erro).map(r=>r.linha),[2,3,4,5]);
  assert.equal(preview.linhas[4].dados.cadastro_original,'2022-01-13');assert.equal(preview.linhas[4].dados.data_ultima_venda,'2026-08-05');
  assert.equal(preview.linhas[4].dados.cpf,cpf('000000001'));
  assert.ok(preview.linhas.some(r=>r.avisos?.some(a=>a.includes('compartilhado'))));
 });
 await t.test('confirma 495 clientes; rejeita só quatro sem nome e preserva original inválido em observações',async()=>{
  const r=await confirmar(preview.token);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.criados,495);assert.equal(r.data.ignorados,4);assert.equal(r.data.rejeitados,4);
  const c=await Cliente.findOne({where:{nome:'Cliente fictício 184',empresa_id:1}});assert.equal(c.cpf,null);assert.match(c.observacoes,/CPF_INVALIDO/);
  const e=await Cliente.findOne({where:{nome:'Cliente fictício 185',empresa_id:1}});assert.equal(e.email,null);assert.match(e.observacoes,/email-invalido/);
  assert.equal(await I.modelos(db).Perfil.count(),495);assert.equal(await I.modelos(db).Historico.count(),448);
 });
 await t.test('reimportar o mesmo arquivo não duplica nem funde os dois cadastros com CPF compartilhado',async()=>{
  const r=await analisar();assert.equal(r.data.linhas.filter(r=>r.repetida).length,495);
  const c=await confirmar(r.data.token);assert.equal(c.data.criados,0);assert.equal(c.data.ignorados,499);assert.equal(await Cliente.count(),495);
 });
 await t.test('atualização explícita pelo código preserva CPF válido existente quando a origem traz CPF inválido',async()=>{
  const ws=XLSX.utils.aoa_to_sheet([['cod_cliente','nome','cpf'],['1','Nome atualizado','INVALIDO']]);const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,ws,'Dados');
  const r=await analisar(XLSX.write(b,{type:'buffer',bookType:'xlsx'}),'');assert.ok(r.data.linhas[0].existente);
  const id=r.data.linhas[0].existente,antes=(await Cliente.findByPk(id)).cpf;
  const c=await confirmar(r.data.token,{'2':'atualizar'});assert.equal(c.data.atualizados,1);assert.equal((await Cliente.findByPk(id)).cpf,antes);assert.match((await Cliente.findByPk(id)).observacoes,/INVALIDO/);
 });
 await t.test('planilha inteiramente sem nome não confirma um lote como importação concluída',async()=>{
  const ws=XLSX.utils.aoa_to_sheet([['nome','cpf'],['','123']]);const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,ws,'Dados');
  const r=await analisar(XLSX.write(b,{type:'buffer',bookType:'xlsx'}),'');const c=await confirmar(r.data.token);assert.equal(c.status,400);assert.match(c.data.erro,/Nenhum registro válido/);
 });
 await t.test('mesmo código de outra empresa não é atualizado pela primeira',async()=>{
  const ws=XLSX.utils.aoa_to_sheet([['cod_cliente','nome'],['1','Cliente da outra empresa']]);const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,ws,'Dados');
  const r=await analisar(XLSX.write(b,{type:'buffer',bookType:'xlsx'}),'',2);assert.equal(r.data.linhas[0].existente,undefined);
  const c=await confirmar(r.data.token,{},2);assert.equal(c.data.criados,1);assert.equal(await Cliente.count({where:{empresa_id:1}}),495);
 });
});
