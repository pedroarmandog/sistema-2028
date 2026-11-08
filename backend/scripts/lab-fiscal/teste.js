"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {criarLaboratorio} = require("./app");
test("Ciclo fiscal interno, sem TiDB e sem transmissão externa", async t=>{
  const lab=await criarLaboratorio();
  const server=lab.app.listen(0,"127.0.0.1"); await new Promise(r=>server.once("listening",r));
  t.after(async()=>{await new Promise(r=>server.close(r)); await lab.db.close();});
  const base="http://127.0.0.1:"+server.address().port;
  async function api(path,body,id=1,method) {
    const r = await lab.fetchLocal(base+path,{method:method || (body?"POST":"GET"),
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+lab.token(id)},body:body?JSON.stringify(body):undefined});
    return {code:r.status,data:r.headers.get("content-type")?.includes("json") ? await r.json() : await r.text()};
  }
  const config="/api/fiscal/configuracao", notas="/api/notas-fiscais";
  let nota;
  await t.test("páginas, autenticação e configuração sem dados salvos",async()=>{
    for(const p of ["/configuracoes/configuracao-fiscal.html","/fiscal/central-fiscal.html"]) assert.match((await api(p)).data,/LABORATÓRIO LOCAL/);
    assert.equal((await lab.fetchLocal(base+config)).status,401);
    assert.equal((await api(config)).data.configurado,false);
    assert.equal((await api(config,{ambiente:"producao"})).code,400);
    assert.equal((await api(config,{provedor_api:"plugnotas"})).code,400);
  });
  await t.test("salvar, mascarar e preservar credencial em nova gravação",async()=>{
    const r=await api(config,{provedor_api:"focusnfe",ambiente:"homologacao",emitir_nfce:true,token_api:"LAB",ativo:true});
    assert.equal(r.code,200,JSON.stringify(r.data));assert.equal(r.data.config.token_api,"***");
    assert.match((await lab.models.ConfiguracaoFiscal.findOne()).token_api,/^ph1:/);
    assert.equal((await api(config,{serie_nfce:"001"})).data.config.token_api,"***");
    assert.equal((await api(config,{serie_nfce:"001",proximo_numero_nfce:"xyz"})).code,400);
    assert.equal((await api("/api/fiscal/fluxo")).data.emitir_nfce,true);
  });
  await t.test("rascunho único por venda, busca, isolamento e proteção de status",async()=>{
    const r=await Promise.all([api(notas+"/pendente",{venda_id:1}),api(notas+"/pendente",{venda_id:1})]);
    assert.equal(r[0].code,201,JSON.stringify(r[0].data));nota=r[0].data.nota.id;assert.equal(nota,r[1].data.nota.id);
    assert.equal((await api(notas+"?status=pendente&busca=teste")).data.total,1);
    assert.equal((await api(notas+"/resumo")).data.contagens.pendente,1);
    assert.equal((await api(notas+"/"+nota,undefined,2)).code,404);
    assert.equal((await api(notas+"/"+nota,{status:"autorizada"},1,"PUT")).code,400);
    assert.equal((await api(notas+"/"+nota+"/danfe")).code,400);
  });
  await t.test("dois pedidos, um POST externo, PDV com desconto e itens alfanuméricos",async()=>{
    const rr=await Promise.all([api(notas+"/emitir",{venda_id:1}),api(notas+"/"+nota+"/emitir",{})]);
    assert.ok(rr.some(r=>r.data.status==="aguardando"),JSON.stringify(rr));
    assert.equal(lab.chamadas.filter(x=>x.method==="POST").length,1);
    const item=lab.registros.get("nfce/"+nota)?.body?.itens[0];
    assert.equal(item.codigo_ncm,"23091000");assert.equal(+item.valor_bruto,80);assert.equal(+item.valor_desconto,8);
  });
  await t.test("autorização confirmada, PDF e reemissão sem duplicar",async()=>{
    const r=await api(notas+"/"+nota+"/emitir",{});assert.equal(r.data.status,"autorizada",JSON.stringify(r.data));
    assert.equal((await api(notas+"/"+nota+"/danfe")).data.slice(0,4),"%PDF");
    assert.equal((await api(notas+"/emitir",{venda_id:1})).data.nota.id,nota);
    assert.equal(lab.chamadas.filter(x=>x.method==="POST").length,1);
    assert.notEqual((await lab.models.Venda.findByPk(1)).status_fiscal,"emitida");
  });
  await t.test("resposta desconhecida aguarda; rejeição não autoriza; lote",async()=>{
    const n=(await api(notas+"/pendente",{venda_id:2})).data.nota.id;
    assert.equal((await api(notas+"/lote-emitir",{notas_ids:[n,n]})).data.aguardando,1);
    lab.setCenario("status_desconhecido");assert.equal((await api(notas+"/"+n+"/emitir",{})).data.status,"aguardando");
    lab.setCenario("erro_autorizacao");assert.equal((await api(notas+"/"+n+"/emitir",{})).data.status,"erro");
  });
  await t.test("NFS-e bloqueada antes da rede e configuração desativada",async()=>{
    await api(config,{emitir_nfse:true});const n=(await api(notas+"/pendente",{venda_id:3})).data.nota;
    assert.equal(n.tipo,"nfse");const antes=lab.chamadas.length;
    assert.equal((await api(notas+"/"+n.id+"/emitir",{})).data.emitida,false);
    assert.equal(lab.chamadas.length,antes);
    await api(config,{ativo:false});assert.equal((await api(notas+"/pendente",{venda_id:4})).code,400);
  });
  await t.test("NF-e modelo 55 usa seu endpoint, cartão de débito e XML oficial do provedor simulado",async()=>{
    await api(config,{ativo:true,emitir_nfce:false,emitir_nfe:true});
    await lab.models.Venda.update({pagamentos:[{forma:"debito",valor:72}]},{where:{id:4}});
    lab.setCenario("autorizado");
    const r=await api(notas+"/emitir",{venda_id:4}); assert.equal(r.data.status,"aguardando",JSON.stringify(r.data));
    const id=r.data.nota.id, body=lab.registros.get("nfe/"+id).body;
    assert.equal(body.pagamentos[0].forma_pagamento,"04"); assert.match(body.data_emissao,/T.*-03:00$/);
    assert.equal((await api(notas+"/"+id+"/emitir",{})).data.emitida,true);
    assert.match((await api(notas+"/"+id+"/xml")).data,/SEM VALOR FISCAL/);
    assert.equal((await api(notas+"/"+id+"/xml",undefined,2)).code,404);
    assert.equal((await api(notas+"/"+id,{status:"cancelada"},1,"PUT")).code,409);
  });
  await t.test("denegação terminal, bloqueio de ambiente e de venda mista",async()=>{
    const venda=await lab.models.Venda.findByPk(4);
    const nova=await lab.models.Venda.create({empresa_id:1,clienteId:venda.clienteId,itens:venda.itens,
      totais:venda.totais,pagamentos:venda.pagamentos,totalPago:72});
    let r=await api(notas+"/emitir",{venda_id:nova.id}); const id=r.data.nota.id;
    await lab.models.ConfiguracaoFiscal.update({ambiente:"producao"},{where:{empresa_id:1}});
    const antes=lab.chamadas.length;
    r=await api(notas+"/"+id+"/emitir",{});assert.match(r.data.motivo,/ambiente/i);
    assert.equal(lab.chamadas.length,antes);
    await lab.models.ConfiguracaoFiscal.update({ambiente:"homologacao"},{where:{empresa_id:1}});
    lab.setCenario("denegado");r=await api(notas+"/"+id+"/emitir",{});assert.equal(r.data.status,"denegada");
    const cont=lab.chamadas.length; await api(notas+"/"+id+"/emitir",{});assert.equal(lab.chamadas.length,cont);
    const mista=await lab.models.Venda.create({empresa_id:1,itens:[...venda.itens,{tipo:"servico"}]});
    assert.equal((await api(notas+"/pendente",{venda_id:mista.id})).code,400);
  });
  await t.test("perda da resposta depois da transmissão mantém referência e não duplica envio",async()=>{
    const venda=await lab.models.Venda.findByPk(4);
    const nova=await lab.models.Venda.create({empresa_id:1,clienteId:venda.clienteId,itens:venda.itens,
      totais:venda.totais,pagamentos:venda.pagamentos,totalPago:72});
    lab.setCenario("autorizado"); lab.perderProximaResposta();
    const antes=lab.chamadas.filter(x=>x.method==="POST").length;
    const r=await api(notas+"/emitir",{venda_id:nova.id});
    assert.equal(r.data.status,"aguardando"); assert.ok(r.data.nota.numero_requisicao);
    assert.equal((await api(notas+"/"+r.data.nota.id+"/emitir",{})).data.status,"autorizada");
    assert.equal(lab.chamadas.filter(x=>x.method==="POST").length,antes+1);
  });
  await t.test("origem externa de download bloqueada, chave de criptografia vinculada à empresa",async()=>{
    const {proteger,abrir}=require("../../services/fiscal/credencial");
    const segredo=proteger("LAB",1);assert.equal(abrir(segredo,1),"LAB");assert.throws(()=>abrir(segredo,2));
    const F=require("../../services/fiscal/adapters/FocusNFeAdapter");
    const f=new F({empresa_id:1,ambiente:"homologacao",token_api:segredo});
    await assert.rejects(f._baixar("https://example.com/arquivo.pdf"),/Origem/);
  });
  await t.test("perfis com cálculo fiscal não suportado são bloqueados no adaptador", () => {
    const F = require("../../services/fiscal/adapters/FocusNFeAdapter");
    const item = {descricao:"Produto",ncm:"23091000",cfop:"5102",csosn:"102",cst_pis:"07",cst_cofins:"07"};
    for (const [alteracao, mensagem] of [[{csosn:"201"},/CSOSN 201/],[{aliq_pis:1.5},/PIS CST 07/],[{cst_pis:"01"},/PIS CST 01 requer alíquota/],[{cst_ipi:"50"},/IPI cadastrado/]]) {
      assert.throws(() => F.montarPayloadNFe({itens:[{...item,...alteracao}]}), mensagem);
    }
  });
  await t.test("corrigir tributação no cadastro e emitir a mesma venda sem duplicar a nota", async () => {
    lab.app.use("/api/itens", require("../../routes/itemRoutes"));
    assert.equal((await api(config,{ativo:true,emitir_nfce:true,emitir_nfe:false})).code,200);
    lab.setCenario("autorizado");
    const modelo = await lab.models.Produto.findByPk("RACAO-A");
    const produto = await lab.models.Produto.create({...modelo.toJSON(), id:"HOT-CAT", nome:"HOT CAT PEIXE 20KG", csosn:null});
    const origem = await lab.models.Venda.findByPk(1);
    const venda = await lab.models.Venda.create({empresa_id:1, clienteId:origem.clienteId,
      itens:[{...origem.itens[0],produto:{id:produto.id,nome:produto.nome}}],totais:origem.totais,pagamentos:origem.pagamentos});
    const existente = await api(notas+"/pendente",{venda_id:venda.id});
    const id = existente.data.nota.id, emitir = () => api(notas+"/"+id+"/emitir",{});
    const chamadas = lab.chamadas.length;
    const falha = await emitir();
    assert.equal(falha.data.status,"erro");
    assert.match(falha.data.motivo,/HOT CAT PEIXE 20KG.*HOT-CAT/);
    assert.equal(falha.data.nota.numero_requisicao,null);
    assert.equal(lab.chamadas.length,chamadas);
    const url="/api/itens/HOT-CAT";
    assert.equal((await api(url,{csosn:"102",cst_icms:"40"},1,"PUT")).code,400);
    assert.equal((await api(url,{csosn:"102"},2,"PUT")).code,404);
    assert.equal((await api(url,{csosn:"102",cst_icms:null},1,"PUT")).code,200);
    assert.equal((await api(url)).data.csosn,"102");
    assert.equal((await api(url,{cst_icms:"40"},1,"PUT")).code,400);
    assert.equal((await api(url,{csosn:null,cst_icms:"40"},1,"PUT")).code,200);
    assert.equal((await api(url)).data.cst_icms,"40");
    assert.equal((await emitir()).data.status,"aguardando");
    assert.equal(lab.registros.get("nfce/"+id).body.itens[0].icms_situacao_tributaria,"40");
    const fim=await emitir();
    assert.equal(fim.data.status,"autorizada");
    assert.equal(fim.data.nota.id,id);
    assert.equal(await lab.models.NotaFiscal.count({where:{venda_id:venda.id}}),1);
  });
  await t.test("revenda interna de R$ 189,75, desconto e bases percentuais por item", async () => {
    const venda = await lab.models.Venda.findByPk(1);
    const modelo = await lab.models.Produto.findByPk("RACAO-A");
    const produto = await lab.models.Produto.create({...modelo.toJSON(),id:"TRIB-TESTE",csosn:null,cst_icms:"000",
      cfop_padrao:"5102",aliq_icms:18,cst_pis:"01",aliq_pis:1.65,cst_cofins:"02",aliq_cofins:7.60});
    const nova = await lab.models.Venda.create({empresa_id:1,clienteId:venda.clienteId,itens:[{
      produto:{id:produto.id},quantidade:1,valorUnitario:200,totalBruto:200,totalFinal:189.75
    }],totais:{final:189.75},totalPago:189.75,pagamentos:[{forma:"pix",valor:189.75}]});
    const r=await api(notas+"/emitir",{venda_id:nova.id});
    assert.equal(r.data.status,"aguardando", r.data.motivo);
    const id=r.data.nota.id,item=lab.registros.get("nfce/"+id).body.itens[0];
    assert.equal(item.icms_situacao_tributaria,"00");
    assert.equal(item.icms_base_calculo,"189.75");
    assert.equal(item.icms_valor,"34.16");
    assert.equal(item.pis_base_calculo,"155.59");
    assert.equal(item.pis_valor,"2.57");
    assert.equal(item.cofins_base_calculo,"155.59");
    assert.equal(item.cofins_valor,"11.82");
    assert.equal((await api(notas+"/"+id+"/emitir",{})).data.status,"autorizada");
  });
  await t.test("consulta e configurações restritas à empresa e às permissões",async()=>{
    await lab.models.Usuario.update({permissoes:["vendas"]},{where:{id:1}});
    assert.equal((await api(config)).code,403);
    assert.equal((await api(notas)).code,403);
    assert.equal((await api(notas+"/resumo")).code,403);
  });
});
