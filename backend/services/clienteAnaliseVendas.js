const {Op}=require('sequelize');
const I=require('./clienteInteligencia');
const DIA=86400000;
const civil=d=>new Date(d).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
function json(v,fallback){try{return typeof v==='string'?JSON.parse(v):v||fallback;}catch{return fallback;}}
function centavos(v){
  if(v==null||String(v).trim()==='')return null;
  const s=String(v).replace(/^R\$\s*/,'').trim();
  const n=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);
  return Number.isFinite(n)&&n>=0&&n<1e12?Math.round(n*100):null;
}
function valor(v){const t=json(v.totais,{});return centavos(t.final??t.totalFinal??t.total??t.valorTotal);}
const ELEGIVEIS=new Set(['pendente','parcial','pago','finalizado','finalizada','concluido','concluida']);
async function analisar(db,empresa,cliente,{agora=new Date()}={}){
  const Venda=db.models.Venda;
  const extra=await I.obter(db,empresa,cliente),hist=extra.historicos[0]||null;
  const meses=Array.from({length:12},(_,i)=>{const base=new Date(civil(agora).slice(0,7)+'-01T12:00:00-03:00');base.setUTCMonth(base.getUTCMonth()-11+i);return {periodo:civil(base).slice(0,7),centavos:0};});
  const inicioSemanas=+agora-56*DIA;
  const semanas=Array.from({length:8},(_,i)=>({periodo:civil(inicioSemanas+i*7*DIA),centavos:0}));
  const a={total:0,quantidade:0,ultimos30:0,ultimos7:0,anteriores30:0,ultimaVenda:null,posteriores:0,quantidadePosterior:0,sobreposicao:0,semValor:0,
    tipos:{produto:0,servico:0,nao_classificado:0}};
  let ultimoId=0;
  for(;;){
    const rows=await Venda.findAll({where:{empresa_id:empresa,clienteId:cliente,id:{[Op.gt]:ultimoId}},attributes:['id','data','status','totais','itens'],order:[['id','ASC']],limit:500,raw:true});
    if(!rows.length)break;
    for(const v of rows){
      ultimoId=v.id;
      const status=String(v.status||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if(!ELEGIVEIS.has(status))continue;
      const data=+new Date(v.data),n=valor(v);
      if(!Number.isFinite(data)||data>+agora||n==null){a.semValor++;continue;}
      a.total+=n;a.quantidade++;
      if(!a.ultimaVenda||data>+new Date(a.ultimaVenda))a.ultimaVenda=new Date(data).toISOString();
      if(data>=+agora-30*DIA)a.ultimos30+=n;else if(data>=+agora-60*DIA)a.anteriores30+=n;
      if(data>=+agora-7*DIA)a.ultimos7+=n;
      if(!hist||data>+new Date(hist.corte_em)){a.posteriores+=n;a.quantidadePosterior++;}else a.sobreposicao++;
      const mes=meses.find(m=>m.periodo===civil(data).slice(0,7));if(mes)mes.centavos+=n;
      const semana=Math.min(7,Math.floor((data-inicioSemanas)/(7*DIA)));if(semana>=0&&semana<8)semanas[semana].centavos+=n;
      // Ratear o total efetivo por tipo somente quando os itens trazem valor.
      const pesos={produto:0,servico:0,nao_classificado:0};
      const itens=json(v.itens,[]);
      for(const it of Array.isArray(itens)?itens:[]){
        if(!it||typeof it!=="object")continue;
        let p=centavos(it.total??it.valorTotal??it.totalFinal);
        if(p==null){const preco=centavos(it.valorUnitario??it.preco??it.produto?.preco),q=Number(it.quantidade??it.qtd??1);if(preco!=null&&q>0&&Number.isFinite(q))p=Math.round(preco*q);}
        if(p==null)continue;
        const tipo=String(it.tipo||it.produto?.tipo||'').toLowerCase();
        pesos[tipo==='produto'?'produto':['servico','serviço'].includes(tipo)?'servico':'nao_classificado']+=p;
      }
      const soma=Object.values(pesos).reduce((x,y)=>x+y,0);
      let alocado=0;for(const tipo of ['produto','servico']){const parcela=soma?Math.floor(n*pesos[tipo]/soma):0;a.tipos[tipo]+=parcela;alocado+=parcela;}
      a.tipos.nao_classificado+=n-alocado;
    }
    if(rows.length<500)break;
  }
  const legado=hist&&centavos(hist.vendas_desde_cadastro),qLegado=hist?.quantidade_vendas_historicas;
  const concilia=hist?.modo_conciliacao==='somar_posteriores'&&legado!=null;
  const totalCombinado=!hist?a.total:concilia?legado+a.posteriores:null;
  const quantidadeCombinada=!hist?a.quantidade:concilia&&qLegado!=null?Number(qLegado)+a.quantidadePosterior:null;
  const ultimaHistorica=hist?.data_ultima_venda?hist.data_ultima_venda:null;
  const ultimaVenda=ultimaHistorica&&(!a.ultimaVenda||ultimaHistorica>civil(a.ultimaVenda))?ultimaHistorica:a.ultimaVenda;
  return {perfil:extra.perfil,historicos:extra.historicos,historico:hist,calculadoEm:agora.toISOString(),
    pethub:{...a,ticket:a.quantidade?Math.round(a.total/a.quantidade):null},
    combinado:{total:totalCombinado,quantidade:quantidadeCombinada,ticket:quantidadeCombinada?Math.round(totalCombinado/quantidadeCombinada):null,ultimaVenda},
    meses,semanas,avisos:[
      ...(hist&&hist.modo_conciliacao!=='somar_posteriores'?['Resumo histórico separado: selecione a conciliação apenas após conferir o corte.']:[]),
      ...(hist&&a.sobreposicao?[`${a.sobreposicao} venda(s) do PetHub até o corte. Não foram somadas novamente ao histórico conciliado.`]:[]),
      ...(hist&&qLegado==null?['Quantidade histórica desconhecida: não é possível calcular ticket médio ou quantidade combinados.']:[]),
      ...(a.semValor?[`${a.semValor} registro(s) sem valor final ou data elegível não entraram nos indicadores.`]:[]),
    ]};
}
module.exports={analisar,centavos,valor,ELEGIVEIS};
