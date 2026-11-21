/* A tela mantém seus botões e filtros; busca e paginação são feitas no banco. */
(()=>{'use strict';let controlador,sequencia=0,timer,ultimo='',concluida;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
 const dia=s=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('/'):s?new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
 function parametros(){const f=window.filtrosAtivos||{},q=new URLSearchParams({limit:String(Math.min(window.itemsPerPage||25,150)),offset:String(((window.currentPage||1)-1)*Math.min(window.itemsPerPage||25,150))});
  const busca=f.busca||document.getElementById('searchClients')?.value||document.getElementById('searchInput')?.value||'';if(busca)q.set('search',busca);
  for(const[k,v]of [['grupos',f.grupos],['status',f.status],['datas',f.dataCadastro],['aniversarios',f.aniversariantes],['dias',f.diasSemFaturamento]])if(v?.length)q.set(k,v.join(','));return q;
 }
 function desenhar(clientes){const body=document.getElementById('clientsTableBody');body.replaceChildren();
  if(!clientes.length){const tr=node('tr'),td=node('td','Nenhum cliente encontrado com estes filtros.');td.colSpan=6;tr.append(td);body.append(tr);return;}
  for(const c of clientes){const tr=node('tr');tr.className='client-row';tr.dataset.clienteId=c.id;tr.onclick=()=>window.viewClientDetails(c.id);tr.style.cursor='pointer';
   const nome=node('td'),linha=node('div'),avatar=node('span',String(c.nome||'?').slice(0,1).toUpperCase());linha.style.cssText='display:flex;gap:12px;align-items:center';avatar.style.cssText='background:#3498db;color:white;border-radius:50%;padding:12px;min-width:40px;text-align:center';
   if(c.imagem_perfil){const img=node('img');const url=String(c.imagem_perfil);img.src=/^https?:\/\//i.test(url)||url.startsWith('/uploads/')?url:'/uploads/'+encodeURIComponent(url);img.alt='';img.style.cssText='width:40px;height:40px;object-fit:cover;border-radius:50%';linha.append(img);}else linha.append(avatar);
   const desc=node('div');desc.append(node('strong',c.nome),node('div',c.ativo?'● Ativo':'● Inativo'));linha.append(desc);nome.append(linha);tr.append(nome,node('td',c.email||'—'),node('td',c.telefone||'—'),node('td',c.pets?.map(p=>p.nome).join(', ')||'Sem pets'));
   const data=node('td',dia(c.cadastro_original||c.createdAt));data.title='Cadastro original do estabelecimento, quando informado';if(c.cadastro_original){const small=node('small','Entrada PetHub: '+dia(c.entrada_pethub));small.style.cssText='display:block;color:#6b7f90;margin-top:4px';data.append(small);}tr.append(data);
   const actions=node('td');for(const[label,fn,ico]of [['Editar',()=>window.editClient(c.id),'✎'],['Excluir',()=>window.deleteClient(c.id),'🗑']]){const b=node('button',ico);b.type='button';b.title=label;b.setAttribute('aria-label',label+' '+c.nome);b.className='btn-action';b.onclick=e=>{e.stopPropagation();fn();};actions.append(b);}tr.append(actions);body.append(tr);
  }
 }
 async function carregar(forcar=false){const id=++sequencia;controlador?.abort();controlador=new AbortController();const q=parametros(),key=q.toString();carregar.pendente=true;
  try{const r=await fetch('/api/clientes?'+q,{credentials:'include',cache:'no-store',signal:controlador.signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao listar clientes.');if(id!==sequencia)return;
   const p=d.paginacao;if(p.offset>=p.total&&p.total>0){window.currentPage=p.paginas;return carregar(true);}window.totalClients=p.total;window.allClients=d.clientes;window.originalClients=d.clientes;window.todosClientes=d.clientes;
   desenhar(d.clientes);window.updatePaginationInfo();let info=document.getElementById('ph-total-clientes');if(!info){info=node('p');info.id='ph-total-clientes';info.style.cssText='color:#587084;font-size:13px;margin:12px 20px';document.querySelector('.pagination-container')?.before(info);}info.textContent=`Total da empresa: ${p.totalGeral} · Encontrados com os filtros: ${p.total} · Exibidos nesta página: ${d.clientes.length}`;ultimo=key;
  }catch(e){if(e.name!=='AbortError'&&id===sequencia){const b=document.getElementById('clientsTableBody');b.replaceChildren();const tr=node('tr'),td=node('td',e.message+' Use Atualizar para tentar novamente.');td.colSpan=6;tr.append(td);b.append(tr);}}
  finally{if(id===sequencia)carregar.pendente=false;}
 }
 function busca(termo){if(window.filtrosAtivos)window.filtrosAtivos.busca=termo;for(const id of ['searchClients','searchInput']){const n=document.getElementById(id);if(n&&n.value!==termo)n.value=termo;}window.currentPage=1;clearTimeout(timer);timer=setTimeout(()=>carregar(true),250);}
 function filtros(){window.currentPage=1;clearTimeout(timer);timer=setTimeout(()=>carregar(true),100);}
 window.PetHubClientesPagina={carregar,busca,filtros,parametros};
 document.addEventListener('pethub:importacao-concluida',e=>{if(e.detail.tipo==='clientes'&&concluida!==e.detail.id){concluida=e.detail.id;carregar(true);}});
 document.addEventListener('DOMContentLoaded',()=>{const opt=document.querySelector('#itemsPerPage option[value="999999"]');if(opt)opt.remove();});
})();
