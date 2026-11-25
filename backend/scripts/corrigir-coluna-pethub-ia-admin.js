'use strict';
const fs=require('node:fs'),path=require('node:path');
function preparar({html,js}){
 const eol=js.includes('\r\n')?'\r\n':'\n';let code=js.replace(/\r\n/g,'\n');
 for(const id of['dashTable','empresasTable']){
  const re=new RegExp('<table\\b[^>]*\\bid=["\\\']'+id+'["\\\'][^>]*>[\\s\\S]*?<\\/table>','i');
  if(!re.test(html))throw Error('Tabela '+id+' não reconhecida. Nenhum arquivo foi alterado.');
  html=html.replace(re,table=>{
   if(/data-ia-column/.test(table))return table;
   if(!/<thead\b[\s\S]*?<\/thead>/.test(table))throw Error('Cabeçalho de '+id+' não reconhecido.');
   return table.replace(/<thead\b[\s\S]*?<\/thead>/i,head=>{
    const th='<th data-ia-column="1">PetHub IA</th>';
    return id==='empresasTable'&&/<th\b[^>]*>\s*Ações\s*<\/th>/i.test(head)?head.replace(/<th\b[^>]*>\s*Ações\s*<\/th>/i,th+'\n                $&'):head.replace(/<\/tr>/i,'  '+th+'\n                </tr>');
   });
  });
 }
 const slices=[['async function carregarDashboard()','async function carregarEmpresas()',true],['async function carregarEmpresas()','\n// Filtros',false]];
 for(const[startText,endText,dashboard]of slices){
  const start=code.indexOf(startText),end=code.indexOf(endText,start+startText.length);if(start<0||end<0)throw Error('Renderização do painel não reconhecida. Nenhum arquivo foi alterado.');
  let part=code.slice(start,end);const anchor='const tr = document.createElement("tr");';if(!part.includes(anchor))throw Error('Linhas de empresas não reconhecidas.');
  if(!part.includes('tr.dataset.iaPainel'))part=part.replace(anchor,anchor+'\n      tr.dataset.iaPainel = String(emp.id);');
  if(!part.includes('class="ia-admin-cell"')){
   const money='<td>${formatarDinheiro(emp.valor_mensalidade)}</td>';if(!part.includes(money))throw Error('Colunas financeiras do painel não reconhecidas.');
   part=part.replace(money,money+'\n                <td class="ia-admin-cell" data-ia-company-id="${emp.id}"><span>Módulo IA não carregado</span></td>');
  }
  if(dashboard){part=part.replace('tr.addEventListener("click", () => abrirModalEmpresa(emp.id));','tr.addEventListener("click", (e) => {\n        if (e.target.closest(".ia-admin-cell")) return;\n        abrirModalEmpresa(emp.id);\n      });').replace('colspan="5"','colspan="6"');}
  else part=part.replace('e.target.closest(".btn-action")','e.target.closest(".btn-action, .ia-admin-cell")');
  code=code.slice(0,start)+part+code.slice(end);
 }
 html=html.replace(/src=["']admin-dashboard\.js(?:\?[^"']*)?["']/,'src="admin-dashboard.js?v=20261125-ia-coluna3"');
 if(!html.includes('/components/pethub-ia/estilos.css'))html=html.replace('</head>','<link rel="stylesheet" href="/components/pethub-ia/estilos.css?v=3" data-ia-css="1">\n  </head>');
 if(!html.includes('/components/pethub-ia/loader.js'))html=html.replace('</body>','<script defer src="/components/pethub-ia/loader.js?v=3" data-pethub-ia-admin="1"></script>\n  </body>');
 return{html,js:eol==='\r\n'?code.replace(/\n/g,'\r\n'):code};
}
function aplicar(root=path.resolve(__dirname,'../..')){
 const names=['frontend/painel-admin/admin-dashboard.html','frontend/painel-admin/admin-dashboard.js'];const old=names.map(f=>fs.readFileSync(path.join(root,f),'utf8'));const result=preparar({html:old[0],js:old[1]}),texts=[result.html,result.js],backup=path.join(root,'backups','coluna-pethub-ia-'+new Date().toISOString().replace(/[:.]/g,'-')),changed=[];
 for(let i=0;i<names.length;i++)if(old[i]!==texts[i]){const saved=path.join(backup,names[i]);fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(path.join(root,names[i]),saved);fs.writeFileSync(path.join(root,names[i]),texts[i]);changed.push(names[i]);}
 return changed;
}
module.exports={preparar,aplicar};if(require.main===module){try{console.log('Correção da coluna PetHub IA:',aplicar());console.log('Publique os arquivos frontend atualizados e os componentes PetHub IA. Este script não altera WhatsApp, banco ou backend.');}catch(e){console.error(e.message);process.exitCode=1;}}
