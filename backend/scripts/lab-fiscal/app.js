"use strict";
const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const { Sequelize, DataTypes } = require("sequelize");
const express = require("express");
const PDFDocument = require("pdfkit");

const redeLocal = global.fetch.bind(global);
const empresa = { nome:"Pet Shop Laboratório", razaoSocial:"EMPRESA FICTÍCIA DE TESTES", cnpj:"00000000000000",
  endereco:{logradouro:"Rua de Teste",numero:"1",bairro:"Centro",cidade:"Belo Horizonte",uf:"MG",cep:"30000000"} };

function usarModulo(caminho, exports) {
  const id = require.resolve(caminho);
  require.cache[id] = { id, filename:id, loaded:true, exports };
}

async function criarLaboratorio() {
  // Sempre em processo próprio. Nunca importar app.js ou a conexão MySQL do ERP.
  if (require.cache[require.resolve("../../models/Cliente")]) throw new Error("Inicie o laboratório em um processo separado.");
  process.env.JWT_USER_SECRET = crypto.randomBytes(32).toString("hex");
  process.env.FISCAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  process.env.REQUIRE_AUTH_HEADER = "0";
  const db = new Sequelize({dialect:"sqlite", storage:":memory:", logging:false, dialectModule:require("./sqlite")});
  const Cliente = db.define("Cliente", {nome: DataTypes.STRING, cpf:DataTypes.STRING, cnpj:DataTypes.STRING,
    empresa_id:DataTypes.INTEGER, endereco:DataTypes.STRING, numero:DataTypes.STRING, bairro:DataTypes.STRING,
    cidade:DataTypes.STRING, estado:DataTypes.STRING, cep:DataTypes.STRING});
  usarModulo("../../models/Cliente", {Cliente,sequelize:db});
  const models = {sequelize:db, Cliente, Empresa:require("../../models/Empresa")(db),
    Produto:require("../../models/Produto"), Venda:require("../../models/Venda").Venda,
    Agendamento:require("../../models/Agendamento").Agendamento,
    ConfiguracaoFiscal:require("../../models/ConfiguracaoFiscal"), NotaFiscal:require("../../models/NotaFiscal"),
    Usuario:db.define("Usuario",{permissoes:DataTypes.JSON}), EmpresaPainel:require("../../models/EmpresaPainel")(db),
    SessaoAtiva:require("../../models/SessaoAtiva")(db)};
  usarModulo("../../models",models);
  await db.sync();
  await models.Empresa.create(empresa);
  await models.Empresa.create({...empresa,nome:"Outra empresa fictícia"});
  await models.Usuario.create({permissoes:["gerenciar_configuracao_fiscal","configuracoes.central-fiscal"]});
  const cliente = await Cliente.create({nome:"Consumidor de teste",cpf:"00000000000",empresa_id:1,
    endereco:"Rua de Teste",numero:"2",bairro:"Centro",cidade:"Belo Horizonte",estado:"MG",cep:"30000000"});
  const item = {produto:{id:"RACAO-A",nome:"Ração de teste",tipo:"produto"},quantidade:2,valorUnitario:40,totalBruto:80,totalFinal:72,desconto:10};
  await models.Produto.create({id:"RACAO-A",empresa_id:1,nome:item.produto.nome,tipo:"produto",ncm:"23091000",csosn:"102",cst_pis:"07",cst_cofins:"07"});
  for (const [n, tipo] of [[1,"produto"],[2,"produto"],[3,"servico"],[4,"produto"]]) {
    await models.Venda.create({id:n,empresa_id:1,clienteId:cliente.id,status:"pago",
      itens:tipo === "produto" ? [item] : [{produto:{nome:"Banho de teste",tipo},quantidade:1,valorUnitario:72,totalBruto:72,totalFinal:72}],
      totais:{bruto:80,final:72},totalPago:72,pagamentos:[{forma:"pix",valor:72}]});
  }

  const registros = new Map(), chamadas=[];
  let cenario = "autorizado";
  let perderResposta = false;
  // Intercepta TODAS as requisições fetch do código fiscal neste processo.
  global.fetch = async (input,options={}) => {
    const url = new URL(input);
    if (url.origin !== "https://homologacao.focusnfe.com.br") throw new Error("Acesso externo bloqueado no laboratório");
    const method = options.method || "GET";
    const [prefix,tipo,id] = url.pathname.slice(1).split("/");
    chamadas.push({method,path:url.pathname});
    if (prefix === "arquivos" && tipo.endsWith(".xml")) return new Response("<teste>SIMULACAO SEM VALOR FISCAL</teste>");
    if (prefix === "arquivos" && tipo.endsWith(".pdf")) {
      const pdf = new PDFDocument(); const chunks=[];
      const finished = new Promise(resolve=>pdf.on("end",resolve)); pdf.on("data",b=>chunks.push(b));
      pdf.text("SIMULACAO INTERNA - SEM VALOR FISCAL"); pdf.end(); await finished;
      return new Response(Buffer.concat(chunks));
    }
    if (prefix !== "v2" || !["nfce","nfe"].includes(tipo)) throw new Error("Endpoint não simulado");
    const ref = id || url.searchParams.get("ref");
    const key = tipo + "/" + ref;
    if (method === "POST") {
      registros.set(key,{body:JSON.parse(options.body)});
      if (perderResposta) { perderResposta=false; throw new Error("Resposta perdida após envio simulado"); }
      return Response.json({status:"processando_autorizacao",ref},{status:202});
    }
    if (!registros.has(key)) return Response.json({mensagem:"Sem registro"},{status:404});
    return Response.json({status:cenario,ref,numero:Number(ref),serie:"001",chave_nfe:String(ref).padStart(44,"0"),
      protocolo_sefaz:"000000000000001",caminho_danfe:"/arquivos/"+ref+".pdf",
      caminho_xml_nota_fiscal:"/arquivos/"+ref+".xml",mensagem:"SIMULAÇÃO LOCAL"});
  };

  const {gerarTokenUsuario} = require("../../middleware/authUser");
  const app=express();
  app.use((req,res,next)=>{
    res.setHeader("Content-Security-Policy", "connect-src 'self'; form-action 'self'; frame-ancestors 'none'");
    if(req.hostname !== "127.0.0.1" || (req.headers.origin && req.headers.origin !== "http://"+req.headers.host)) return res.sendStatus(403);
    next();
  });
  app.use(express.json()); app.use(require("cookie-parser")());
  app.use((req,res,next)=>{
    if(req.path==="/api/fiscal/configuracao" && req.method==="POST" && (req.body.ambiente==="producao" || req.body.certificado_digital ||
       req.body.senha_certificado_hash || (req.body.token_api && req.body.token_api!=="LAB"))) return res.status(400).json({erro:"Laboratório: apenas homologação e token fictício LAB."});
    next();
  });
  app.use("/api/fiscal",require("../../routes/configuracaoFiscalRoutes"));
  app.use("/api/notas-fiscais",require("../../routes/notaFiscalRoutes"));
  const root = path.resolve(__dirname,"../../../frontend");
  const paginas = ["/configuracoes/configuracao-fiscal.html","/fiscal/central-fiscal.html"];
  app.get(paginas,(req,res)=>{
    const html=fs.readFileSync(path.join(root,req.path),"utf8");
    res.send(html.replace(/<body([^>]*)>/i,'<body$1><div style="position:fixed;bottom:0;right:0;background:#632c00;color:white;padding:8px;z-index:999999">LABORATÓRIO LOCAL · SEM VALOR FISCAL · <a style="color:white" href="/">Início</a></div>'));
  });
  app.get("/",(req,res)=>{
    res.cookie("pethub_token",gerarTokenUsuario({id:1,empresa_id:1}),{httpOnly:true,sameSite:"strict"});
    res.send(`<!doctype html><meta charset=utf-8><title>Laboratório fiscal PetHub</title><main style="max-width:680px;margin:3rem auto;font:16px/1.55 system-ui">
    <h1>Laboratório fiscal PetHub</h1><p>Empresa fictícia. Banco em memória. Nenhuma transmissão fiscal externa.</p>
    <ol><li>Abra <a href="${paginas[0]}">Configuração Fiscal</a>. Selecione Focus NFe, homologação e modo manual. Informe o token fictício <b>LAB</b>. Habilite NFC-e e salve.</li>
    <li>Volte aqui. Gere um rascunho da venda de R$ 72,00.</li><li>Na <a href="${paginas[1]}">Central Fiscal</a>, clique em emitir. O primeiro retorno fica aguardando. Clique de novo para consultar o resultado simulado.</li></ol>
    <label>Venda fictícia <select id="venda"><option value="1">Produto 1</option><option value="2">Produto 2</option><option value="3">Serviço de banho</option><option value="4">Produto 4</option></select></label>
    <button id="criar">Gerar rascunho</button> <label>Resposta simulada <select id="cenario"><option>autorizado</option><option>erro_autorizacao</option><option>denegado</option><option>processando_autorizacao</option></select></label><p id="msg"></p>
    <script>criar.onclick=async()=>{const r=await fetch('/api/notas-fiscais/pendente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({venda_id:Number(venda.value)})});const d=await r.json();msg.textContent=d.erro||'Rascunho nº '+d.nota.id;};cenario.onchange=()=>fetch('/lab/cenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:cenario.value})});</script></main>`);
  });
  app.post("/lab/cenario",(req,res)=>{cenario=String(req.body.status);res.sendStatus(204);});
  app.use(express.static(root));
  return {app,db,models,chamadas,registros,token:empresaId=>gerarTokenUsuario({id:1,empresa_id:empresaId}),
    perderProximaResposta(){perderResposta=true;}, setCenario(valor){cenario=valor;},fetchLocal:redeLocal};
}

module.exports = {criarLaboratorio};
if (require.main===module) criarLaboratorio().then(({app})=>{
  const server=app.listen(0,"127.0.0.1",()=>console.log("Laboratório fiscal: http://127.0.0.1:"+server.address().port+" (Ctrl+C para sair)"));
}).catch(err=>{console.error(err);process.exitCode=1;});
