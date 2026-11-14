const crypto=require('node:crypto'),{Op,DataTypes}=require('sequelize');
const I=require('../clienteInteligencia'),V=require('./vinculoTutor'),B=require('./modelos');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const campos={
 codigo_legado:['Código legado do pet','cod_pet','codigo_pet','id_pet'],nome:['Nome do pet','nome','pet'],especie:['Espécie','especie'],raca:['Raça','raca'],genero:['Sexo','genero'],data_nascimento:['Data de nascimento','nascimento'],idade_informada:['Idade','idade informada'],porte:['Porte'],cor:['Cor'],pelagem:['Pelagem'],chip:['Microchip','chip'],peso:['Peso'],observacao:['Observações','observacao'],ativo:['Ativo','status'],
 tutor_nome:['Nome do tutor','tutor','nome_cliente','cliente'],tutor_telefone:['Telefone do tutor','fone_tutor','telefone_cliente'],tutor_cpf:['CPF do tutor','cpf_cliente'],tutor_codigo:['Código legado do cliente','cod_cliente','codigo_cliente'],tutor_id_legado:['ID legado do cliente','id_legado_cliente'],tutor_email:['E-mail do tutor','email_cliente'],
};
const petCampos=['codigo_legado','nome','especie','raca','genero','data_nascimento','idade_informada','porte','cor','pelagem','chip','peso','observacao','ativo'];
async function prepararEstrutura(db){
 const Pet=db.models.Pet||require('../../models/Pet'),q=db.getQueryInterface(),table=Pet.getTableName(),cols=await q.describeTable(table);
 for(const k of ['codigo_legado','origem_importacao','importacao_ref','especie','cor','peso','idade_informada'])if(!cols[k])await q.addColumn(table,k,{type:Pet.rawAttributes[k].type,allowNull:true});
 // Pets antigos conservam o tutor; preencher somente a empresa ausente.
 const qt=q.queryGenerator.quoteTable.bind(q.queryGenerator),qi=q.queryGenerator.quoteIdentifier.bind(q.queryGenerator);
 const C=db.models.Cliente;
 await db.query(`UPDATE ${qt(table)} SET empresa_id=(SELECT c.empresa_id FROM ${qt(C.getTableName())} c WHERE c.id=${qt(table)}.cliente_id) WHERE empresa_id IS NULL AND EXISTS (SELECT 1 FROM ${qt(C.getTableName())} c WHERE c.id=${qt(table)}.cliente_id AND c.empresa_id IS NOT NULL)`);
 const indices=await q.showIndex(table);
 const adicionar=async(name,fields,unique)=>{if(!indices.some(i=>i.name===name))await q.addIndex(table,fields,{name,unique});};
 await adicionar('pets_empresa_chip',['empresa_id','chip'],true);
 await adicionar('pets_empresa_legado',['empresa_id','origem_importacao','codigo_legado'],true);
 await adicionar('pets_importacao_ref',['importacao_ref'],true);
 await adicionar('pets_empresa_tutor',['empresa_id','cliente_id'],false);
 // A unicidade passa a ser por empresa; nenhum pet é excluído ou alterado.
 for(const i of indices)if(i.unique&&i.fields?.length===1&&i.fields[0].attribute==='chip')await q.removeIndex(table,i.name);
}
function normalizar(raw){
 const d={};for(const k of Object.keys(campos)){if(raw[k]!=null&&String(raw[k]).trim()!=='')d[k]=String(raw[k]).trim();}
 if(!d.nome)throw I.erro('Nome do pet obrigatório.');if(d.nome.length>100)throw I.erro('Nome do pet excede 100 caracteres.');
 for(const k of Object.keys(d))if(d[k].length>(k==='observacao'?2000:k==='codigo_legado'?80:255))throw I.erro(`Campo ${k} muito longo.`);
 for(const k of ['especie','cor','idade_informada'])if(d[k]?.length>100)throw I.erro(`Campo ${k} excede 100 caracteres.`);
 if(d.genero){d.genero={m:'Macho',macho:'Macho',masculino:'Macho',f:'Fêmea',femea:'Fêmea',feminino:'Fêmea'}[V.texto(d.genero)];if(!d.genero)throw I.erro('Sexo do pet: informe Macho ou Fêmea.');}
 if(d.porte){d.porte={p:'Pequeno',pequeno:'Pequeno',m:'Médio',medio:'Médio',g:'Grande',grande:'Grande',gigante:'Gigante'}[V.texto(d.porte)];if(!d.porte)throw I.erro('Porte inválido.');}
 if(d.data_nascimento){let s=d.data_nascimento;if(/^\d{2}\/\d{2}\/\d{4}$/.test(s))s=s.split('/').reverse().join('-');const date=new Date(s+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==s||s>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}))throw I.erro('Nascimento do pet inválido ou futuro.');d.data_nascimento=s;}
 if(d.peso){const s=d.peso.replace(',','.');if(!/^\d+(\.\d{1,3})?$/.test(s)||Number(s)>9999999)throw I.erro('Peso inválido; use kg com até três casas decimais.');d.peso=Number(s);}
 if(d.ativo){const v=V.texto(d.ativo);if(!['sim','s','true','1','ativo','nao','n','false','0','inativo'].includes(v))throw I.erro('Status inválido; use Ativo ou Inativo.');d.ativo=['sim','s','true','1','ativo'].includes(v);}
 return d;
}
async function tutores(db,empresa,transaction){const C=db.models.Cliente;const cs=await C.findAll({where:{empresa_id:empresa},attributes:['id','nome','telefone','telefones_adicionais','cpf','email'],transaction});await I.enriquecer(db,empresa,cs,transaction);return cs;}
function colisaoNome(p,d,origem){return V.texto(p.nome)===V.texto(d.nome)&&!(d.codigo_legado&&p.codigo_legado&&p.origem_importacao===origem&&d.codigo_legado!==p.codigo_legado)&&!(d.chip&&p.chip&&d.chip!==p.chip);}
function correspondencia(pets,d,origem){return pets.filter(p=>(d.codigo_legado&&p.origem_importacao===origem&&p.codigo_legado===d.codigo_legado)||(d.chip&&p.chip===d.chip));}
async function analisar(arquivo,mapa,empresa,usuario,origem='legado'){
 const db=B.sequelize,Pet=db.models.Pet||require('../../models/Pet');await I.preparar(db);origem=String(origem??'legado').trim();
 if(!/^[\p{L}\p{N} _.-]{1,80}$/u.test(origem))throw I.erro('Informe uma origem com até 80 caracteres.');
 const usados=mapa.filter(k=>k&&k!=='ignorar');if(!usados.includes('nome')||new Set(usados).size!==usados.length||usados.some(k=>!campos[k]))throw I.erro('Mapeamento inválido: associe Nome do pet e não repita campos.');
 const clientes=await tutores(db,empresa),idx=V.indice(clientes);
 const pets=await Pet.findAll({where:{empresa_id:empresa},attributes:['id','nome','cliente_id','chip','codigo_legado','origem_importacao','updatedAt']});
 const feitas=new Set((await B.Linha.findAll({where:{empresa_id:empresa,tipo:'pets'},attributes:['hash']})).map(r=>r.hash));
 const rows=[],vistos=new Set();
 for(let i=0;i<arquivo.linhas.length;i++){
  const source=arquivo.linhas[i];if(!source.some(v=>String(v??'').trim()))continue;const row={linha:i+2,acao:'criar',originais:source};
  try{
   const raw={};mapa.forEach((k,n)=>{if(campos[k])raw[k]=source[n];});
   const cp=mapa.indexOf('tutor_cpf'),valor=arquivo.numericos?.[i]?.[cp];
   if(cp>=0&&valor!=null){const n=require('./normalizarCliente').preparar({cpf:raw.tutor_cpf},{cpf:valor});if(n.dados.cpf)raw.tutor_cpf=n.dados.cpf;row.avisos=n.avisos;}
   row.dados=normalizar(raw);row.dados.origem_importacao=origem;
   row.vinculo=V.resolver(row.dados,idx,{origem});row.cliente_id=row.vinculo.cliente?.id||null;
   row.hash=hash(['pets',origem,row.dados]);
   row.repetida=feitas.has(row.hash)||vistos.has(row.hash);vistos.add(row.hash);
   const matches=correspondencia(pets,row.dados,origem);
   if(matches.length>1)throw I.erro('Código e microchip apontam para pets diferentes. Confira os identificadores.');
   if(matches.length){const p=matches[0];row.existente=String(p.id);row.versao=p.updatedAt?.toISOString();row.acao='ignorar';row.aviso='Pet identificado; escolha Atualizar para alterar.';
    if(row.cliente_id&&Number(row.cliente_id)!==Number(p.cliente_id))row.vinculo={situacao:'revisar',motivo:'Pet existente pertence a outro tutor; a importação não transfere animais.',candidatos:[]};
   }else if(row.cliente_id&&pets.some(p=>Number(p.cliente_id)===Number(row.cliente_id)&&colisaoNome(p,row.dados,origem))){row.possivel_duplicado=true;row.aviso='Há pet com mesmo nome neste tutor. Confirme se é outro animal ou ignore.';}
   if(row.repetida){row.acao='ignorar';row.aviso='Esta linha já foi importada ou está repetida.';}
  }catch(e){if(!e.status)throw e;row.erro=e.message;row.acao='ignorar';}
  rows.push(row);
 }
 const id=crypto.randomUUID();await B.Lote.create({id,empresa_id:empresa,usuario_id:usuario,tipo:'pets',dados:JSON.stringify(rows),expira:new Date(Date.now()+3600000)});
 return {token:id,linhas:rows,centros:[],resumo:{total:rows.length,validos:rows.filter(r=>!r.erro).length,erros:rows.filter(r=>r.erro).length,duplicados:rows.filter(r=>r.aviso).length,avisos:rows.filter(r=>r.avisos?.length).length,vinculados:rows.filter(r=>!r.erro&&r.vinculo?.situacao==='automatico').length,pendentes:rows.filter(r=>!r.erro&&r.vinculo?.situacao!=='automatico').length}};
}
async function gravarLote({db,job,slice,escolhas,transaction,relatorio}){
 const Pet=db.models.Pet||require('../../models/Pet'),empresa=job.empresa_id,cont={criados:0,atualizados:0,ignorados:0,rejeitados:0},planos=[];
 const idx=V.indice(await tutores(db,empresa,transaction));
 const choices=slice.map(r=>escolhas[String(r.linha)]||{});
 const ids=[...new Set(slice.flatMap((r,i)=>[r.cliente_id,choices[i].cliente_id]).filter(Boolean).map(Number))];
 const clientes=await db.models.Cliente.findAll({where:{empresa_id:empresa,id:{[Op.in]:ids}},transaction,lock:transaction.LOCK.UPDATE});const cids=new Set(clientes.map(c=>Number(c.id)));
 const pets=await Pet.findAll({where:{empresa_id:empresa,[Op.or]:[{codigo_legado:{[Op.in]:slice.map(r=>r.dados?.codigo_legado).filter(Boolean)}},{chip:{[Op.in]:slice.map(r=>r.dados?.chip).filter(Boolean)}},{id:{[Op.in]:slice.map(r=>r.existente).filter(Boolean)}},{cliente_id:{[Op.in]:ids}}]},attributes:{exclude:['foto_url']},transaction,lock:transaction.LOCK.UPDATE});
 const feitas=new Set((await B.Linha.findAll({where:{empresa_id:empresa,tipo:'pets',hash:{[Op.in]:slice.map(r=>r.hash).filter(Boolean)}},attributes:['hash'],transaction})).map(r=>r.hash));const targets=new Set();
 for(const row of slice){
  const choice=escolhas[String(row.linha)]||{},acao=choice.acao||row.acao;
  if(row.erro){cont.rejeitados++;relatorio.push({linha:row.linha,acao:'rejeitado',motivo:row.erro});continue;}
  if(row.repetida||acao==='ignorar'||feitas.has(row.hash)){cont.ignorados++;relatorio.push({linha:row.linha,acao:'ignorado',motivo:row.aviso||'Ignorado.'});continue;}
  try{
   const manual=choice.cliente_id!=null,cid=Number(manual?choice.cliente_id:row.cliente_id);if(!cids.has(cid))throw I.erro('Tutor não encontrado nesta empresa.');
   if(!manual){const v=V.resolver(row.dados,idx,{origem:row.dados.origem_importacao});if(v.situacao!=='automatico'||Number(v.cliente.id)!==cid)throw I.erro('Vínculo alterado desde a prévia. Reanalise ou selecione o tutor.');}
   const d=normalizar(row.dados),matches=correspondencia(pets,d,row.dados.origem_importacao);if(matches.length>1)throw I.erro('Identificadores do pet conflitantes.');
   let old=matches[0];
   if(acao==='atualizar'){
    if(!old||String(old.id)!==row.existente||Number(old.cliente_id)!==cid||targets.has(old.id)||row.versao&&old.updatedAt.toISOString()!==row.versao)throw I.erro('Pet/tutor alterado desde a prévia. Reanalise; não foi transferido.');targets.add(old.id);
   }else if(old){cont.ignorados++;relatorio.push({linha:row.linha,acao:'ignorado',motivo:'Pet já cadastrado. Reanalise para atualizar.'});continue;}
   else if(!choice.distinto&&(row.possivel_duplicado||pets.some(p=>Number(p.cliente_id)===cid&&colisaoNome(p,d,row.dados.origem_importacao))))throw I.erro('Confirme se o pet com mesmo nome é outro animal.');
   const base=Object.fromEntries(Object.entries(d).filter(([k])=>petCampos.includes(k)));base.origem_importacao=row.dados.origem_importacao;
   if(old?.codigo_legado){
    if(d.codigo_legado&&(d.codigo_legado!==old.codigo_legado||row.dados.origem_importacao!==old.origem_importacao))throw I.erro('Pet já possui origem/código legado diferentes. Confira os identificadores antes de atualizar.');
    base.codigo_legado=old.codigo_legado;base.origem_importacao=old.origem_importacao;
   }
   const ref=hash([empresa,job.id,row.linha]);planos.push({row,old,base,cid,ref});feitas.add(row.hash);
   if(!old)pets.push({...base,id:'novo:'+row.linha,cliente_id:cid});
  }catch(e){if(!e.status)throw e;cont.rejeitados++;relatorio.push({linha:row.linha,acao:'rejeitado',motivo:e.message});}
 }
 const novos=planos.filter(p=>!p.old),updates=planos.filter(p=>p.old);
 if(novos.length)await Pet.bulkCreate(novos.map(p=>({...p.base,empresa_id:empresa,cliente_id:p.cid,importacao_ref:p.ref})),{transaction,validate:true});
 if(updates.length)await Pet.bulkCreate(updates.map(p=>({...p.old.get({plain:true}),...p.base})),{transaction,validate:true,updateOnDuplicate:[...new Set(updates.flatMap(p=>Object.keys(p.base))),'updatedAt'],conflictAttributes:['id']});
 const criados=novos.length?await Pet.findAll({where:{empresa_id:empresa,importacao_ref:{[Op.in]:novos.map(p=>p.ref)}},attributes:['id','importacao_ref'],transaction}):[];const mapa=new Map(criados.map(p=>[p.importacao_ref,p.id]));
 const marcas=[];for(const p of planos){const id=p.old?.id||mapa.get(p.ref);if(!id)throw Error('Pet sem confirmação de ID.');cont[p.old?'atualizados':'criados']++;marcas.push({empresa_id:empresa,tipo:'pets',hash:p.row.hash,registro:String(id)});relatorio.push({linha:p.row.linha,acao:p.old?'atualizar':'criar',registro:String(id),cliente_id:p.cid,motivo:p.old?'Pet atualizado; tutor preservado.':'Pet criado e vinculado ao tutor.'});}
 if(marcas.length)await B.Linha.bulkCreate(marcas,{transaction});return cont;
}
async function criarTutor(empresa,usuario,token,linha){
 const db=B.sequelize;return db.transaction(async transaction=>{
  await db.models.Empresa.findByPk(empresa,{transaction,lock:transaction.LOCK.UPDATE});
  const lote=await B.Lote.findOne({where:{id:token,empresa_id:empresa,usuario_id:usuario,tipo:'pets'},transaction,lock:transaction.LOCK.UPDATE});if(!lote||lote.resultado||+lote.expira<Date.now())throw I.erro('Prévia indisponível. Reanalise.');
  const row=JSON.parse(lote.dados).find(r=>r.linha===Number(linha));if(!row||row.erro)throw I.erro('Linha inválida.');const d=row.dados;
  if(!d.tutor_nome||!V.telefone(d.tutor_telefone))throw I.erro('Para cadastrar tutor, informe nome e telefone válidos.');
  const cs=await tutores(db,empresa,transaction),nome=V.texto(d.tutor_nome),tel=V.telefone(d.tutor_telefone);
  if(cs.some(c=>V.texto(c.nome)===nome||V.telefones(c).includes(tel)||(d.tutor_codigo&&V.texto(c.codigo_legado)===V.texto(d.tutor_codigo))||(d.tutor_id_legado&&V.texto(c.id_legado)===V.texto(d.tutor_id_legado))||(d.tutor_cpf&&V.digitos(c.cpf)===V.digitos(d.tutor_cpf))||(d.tutor_email&&V.texto(c.email)===V.texto(d.tutor_email))))throw I.erro('Há tutor com dados equivalentes. Pesquise o cadastro existente e confira o vínculo.',409);
  const normal=require('./normalizarCliente').preparar({cpf:d.tutor_cpf,email:d.tutor_email}).dados;
  if(d.tutor_cpf&&!normal.cpf||d.tutor_email&&!normal.email)throw I.erro('Confira o CPF/e-mail do tutor antes de cadastrar.');
  const c=await db.models.Cliente.create({nome:d.tutor_nome,telefone:tel,cpf:normal.cpf,email:normal.email,observacoes:d.origem_importacao!=='legado'?`[Origem ${d.origem_importacao}] Código do tutor: ${d.tutor_codigo||''}; ID legado: ${d.tutor_id_legado||''}`:null,empresa_id:empresa},{transaction});
  if(d.origem_importacao==='legado')await I.salvar(db,empresa,c.id,{codigo_legado:d.tutor_codigo,id_legado:d.tutor_id_legado},{transaction});return V.dto(c);
 });
}
module.exports={campos,prepararEstrutura,normalizar,analisar,gravarLote,criarTutor};
