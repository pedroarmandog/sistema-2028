// ================================================================
//  BASE DE CONHECIMENTO PETHUB — LÓGICA PRINCIPAL (DESIGN PREMIUM)
// ================================================================
(function () {
  "use strict";

  const KB = {
    CONFIG: {
      artigosPath: "/base-conhecimento/data/artigos.json",
      artigosDir: "/base-conhecimento/artigos/",
      debounceMs: 250,
    },

    state: {
      artigos: [],
      categorias: {},
      currentPage: "home",
      currentCategory: null,
      currentArticle: null,
    },

    categoriasMeta: {
      dashboard: { icon: "📊", name: "Dashboard", desc: "Visão geral do sistema, widgets e métricas do seu negócio." },
      agenda: { icon: "📅", name: "Agenda", desc: "Gerencie agendamentos, check-in, check-out e muito mais." },
      clientes: { icon: "👥", name: "Clientes", desc: "Cadastro e gestão completa de clientes." },
      pets: { icon: "🐶", name: "Pets", desc: "Cadastro e gestão de pets, raças, pelagens e boxes." },
      produtos: { icon: "📦", name: "Produtos", desc: "Cadastro de produtos, serviços, planos e comissões." },
      estoque: { icon: "📋", name: "Estoque", desc: "Controle de entrada, saída, transferência e validade." },
      clinica: { icon: "💊", name: "Clínica", desc: "Medicamentos, vacinas e periodicidade." },
      vendas: { icon: "🛒", name: "Vendas", desc: "Nova venda, consulta, devolução e orçamentos." },
      caixa: { icon: "💰", name: "Caixa", desc: "Abertura, fechamento, suprimento e sangria de caixa." },
      compras: { icon: "📥", name: "Compras", desc: "Entrada de mercadoria e cadastro de fornecedores." },
      financeiro: { icon: "📈", name: "Financeiro", desc: "Contas a receber/pagar, cartão, haver e crediário." },
      marketing: { icon: "📢", name: "Marketing", desc: "WhatsApp, disparo de mensagens e automações." },
      relatorios: { icon: "📊", name: "Relatórios", desc: "Relatórios de venda, atendimento, comissão e mais." },
      configuracoes: { icon: "⚙", name: "Configurações", desc: "Configure empresa, usuários, PDV, feriados e mais." },
      mobile: { icon: "📱", name: "App do Gestor", desc: "Aplicativo mobile para acompanhamento do dia a dia." },
      notificacoes: { icon: "🔔", name: "Notificações", desc: "Push notifications e lembretes automáticos." },
      "painel-admin": { icon: "🛡️", name: "Painel Admin", desc: "Administração de empresas e controle do sistema." },
    },

    dicas: [
      { icon: "💡", text: "Use os atalhos de teclado para agilizar o atendimento no balcão." },
      { icon: "⭐", text: "Clientes frequentes podem ser marcados com grupo de cliente para descontos especiais." },
      { icon: "🔔", text: "Ative as notificações push para não perder nenhum agendamento." },
      { icon: "📱", text: "Baixe o App do Gestor para acompanhar o movimento do seu pet shop de qualquer lugar." },
    ],

    novidades: [
      { icon: "🎉", title: "App do Gestor", desc: "A versão mobile do PetHub já está disponível.", date: "Jul/2026" },
      { icon: "🤖", title: "Automação de Marketing", desc: "Dispare mensagens automáticas para clientes.", date: "Jun/2026" },
      { icon: "📊", title: "Painel Financeiro", desc: "Acompanhe suas finanças em tempo real.", date: "Mai/2026" },
      { icon: "📱", title: "Push Notifications", desc: "Receba notificações no celular sobre agendamentos.", date: "Abr/2026" },
    ],

    heroSuggestions: [
      { text: "Agendamento", category: "agenda" },
      { text: "WhatsApp", category: "marketing" },
      { text: "Financeiro", category: "financeiro" },
      { text: "Produtos", category: "produtos" },
      { text: "Relatórios", category: "relatorios" },
    ],

    async init() {
      try {
        await this.carregarArtigos();
        this.setupNavigation();this.setupNavbar();this.setupMobileMenu();
        window.addEventListener('hashchange',()=>{if(location.hash==='#kbContent'){document.getElementById('kbContent')?.focus();return;}this.rota();});
        document.addEventListener('error',e=>{if(e.target.matches?.('[data-mascot] img'))e.target.closest('[data-mascot]').classList.add('is-missing');},true);
        await this.rota();
      } catch(e) {this.showError('Não foi possível carregar a base. Tente atualizar a página.');}
    },
    async carregarArtigos() {
      const r=await fetch(this.CONFIG.artigosPath);if(!r.ok)throw Error('Falha na base');const d=await r.json();
      let arquivos=null;try{const disponibilidade=await fetch('/base-conhecimento/data/disponibilidade.json');if(disponibilidade.ok){const m=await disponibilidade.json();if(Array.isArray(m.arquivos))arquivos=new Set(m.arquivos);}}catch(_){}
      this._disponibilidadeConfirmada=!!arquivos;
      this.state.artigos=(d.artigos||[]).map(a=>({...a,disponivel:arquivos?arquivos.has(a.category+'/'+a.slug):true}));this.state.categorias={};this.videos=Array.isArray(d.videos)?d.videos:[];
      for(const art of this.state.artigos)(this.state.categorias[art.category||'outros']??=[]).push(art);
    },
    M(){return window.PetHubMascotes||{imagem:()=>'',dica:t=>'<aside class="kb-mascot-tip"><p>'+this.esc(t)+'</p></aside>',introducao:(c,t,p)=>'<aside class="kb-mascot-intro"><div><strong>'+this.esc(t)+'</strong><p>'+this.esc(p)+'</p></div></aside>',vazio:(t,p)=>'<div class="kb-guide-empty"><div><strong>'+this.esc(t)+'</strong><p>'+this.esc(p)+'</p></div></div>'};},
    esc(str){return String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
    normalizar(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();},
    buscar(q){const termo=this.normalizar(q.trim());return this.state.artigos.filter(a=>this.normalizar([a.title,a.description,a.category,...a.tags||[]].join(' ')).includes(termo)).slice(0,8);},
    linkArt(a,classe='kb-reading-link'){return `<a class="${classe}" href="#artigo/${encodeURIComponent(a.category)}/${encodeURIComponent(a.slug)}" data-article="${this.esc(a.slug)}" data-category="${this.esc(a.category)}"><span>${a.icon||'↗'}</span><div><strong>${this.esc(a.title)}</strong><small>${a.disponivel===false?'Arquivo não incluído nesta cópia · Verificar conteúdo':this.esc(a.readingTime||'Artigo')+' · '+this.esc(this.categoriasMeta[a.category]?.name||a.category)}</small></div><span class="kb-arrow" aria-hidden="true">↗</span></a>`;},
    navigate(hash){if(location.hash===hash)this.rota();else location.hash=hash;},
    async rota(){
      this._artigoAbort?.abort();const partes=location.hash.replace(/^#/,'').split('/').map(x=>{try{return decodeURIComponent(x);}catch{return '';}});
      if(partes[0]==='artigo')await this.renderArtigo(partes[1],partes[2]);
      else if(partes[0]==='categoria')this.renderCategoria(partes[1]);
      else if(['videos','novidades','status'].includes(partes[0]))this.renderSecao(partes[0]);
      else this.renderHome();
      document.querySelectorAll('[data-section]').forEach(a=>a.classList.toggle('active',a.dataset.section===(['home','category','article'].includes(this.state.currentPage)?'home':this.state.currentPage)));
      this.closeMenu?.();
      const content=document.getElementById('kbContent');if(content){content.setAttribute('tabindex','-1');if(this._navegou)content.focus({preventScroll:true});}this._navegou=true;
      window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    },
    renderHome(){
      this.state.currentPage='home';this.updateBreadcrumb();const total=this.state.artigos.filter(a=>a.disponivel!==false).length,modulos=Object.keys(this.state.categorias).length;
      const primeiros=['cadastrar-empresa','cadastrar-cliente','cadastrar-pet','criar-agendamento','conectar-whatsapp'].map(slug=>this.state.artigos.find(a=>a.slug===slug)).filter(a=>a&&a.disponivel!==false);
      const recomendados=this.state.artigos.filter(a=>a.disponivel!==false).slice(0,4);
      document.getElementById('kbContent').innerHTML=`
        <section class="kb-hero kb-premium-hero" aria-labelledby="kbHeroTitle">
          <div class="kb-hero-orbit" aria-hidden="true"></div><span class="kb-spark kb-spark-one" aria-hidden="true">✦</span><span class="kb-spark kb-spark-two" aria-hidden="true">✧</span>
          <div class="kb-hero-content"><span class="kb-eyebrow"><span class="kb-live-dot"></span> SEU PRÓXIMO PASSO COMEÇA AQUI</span>
            <h1 id="kbHeroTitle" class="kb-hero-title">Como podemos ajudar<br>você <em>hoje?</em></h1>
            <p class="kb-hero-subtitle">Do primeiro agendamento à próxima campanha. Encontre o caminho e aprenda no seu ritmo.</p>
            <form class="kb-hero-search-wrapper" id="kbSearchForm" role="search"><label class="kb-sr-only" for="kbSearchInput">Pesquisar na Central de Ajuda</label><span class="kb-hero-search-icon" aria-hidden="true">⌕</span><input class="kb-hero-search-input" id="kbSearchInput" placeholder="O que você quer aprender?" autocomplete="off" aria-controls="kbSearchResults" aria-expanded="false"><button type="button" class="kb-hero-search-clear" id="kbSearchClear" aria-label="Limpar pesquisa">×</button><kbd aria-hidden="true">/</kbd><div class="kb-search-results" id="kbSearchResults" aria-live="polite"></div></form>
            <div class="kb-hero-suggestions"><span>Sugestões</span>${this.heroSuggestions.map(s=>`<a class="kb-hero-tag" href="#categoria/${s.category}" data-category="${s.category}">${this.esc(s.text)} ↗</a>`).join('')}</div>
            <div class="kb-hero-proof"><span><strong>${total}</strong> ${this._disponibilidadeConfirmada?'guias disponíveis':'artigos no índice'}</span><i aria-hidden="true"></i><span><strong>${modulos}</strong> módulos para explorar</span></div>
          </div>
          <div class="kb-hero-mascot"><div class="kb-mascot-halo" aria-hidden="true"></div>${this.M().imagem('home',{prioridade:true})}<span class="kb-mascot-note"><span aria-hidden="true">✦</span> Vamos aprender juntos?</span></div>
        </section>
        <section class="kb-start-section" aria-labelledby="kbStartTitle"><div class="kb-section-heading"><div><span class="kb-overline">BEM-VINDO AO PETHUB</span><h2 id="kbStartTitle">Pequenos passos. Uma rotina mais leve.</h2><p>Começando agora? Estes artigos são um bom ponto de partida.</p></div><span class="kb-heading-tag">Primeiros passos</span></div><div class="kb-start-grid">${primeiros.slice(0,4).map((a,i)=>`<a href="#artigo/${a.category}/${a.slug}" data-article="${a.slug}" data-category="${a.category}" class="kb-start-card"><span class="kb-step">0${i+1}</span><strong>${this.esc(a.title)}</strong><span class="kb-start-footer">${this.esc(a.readingTime||'Artigo')} <span aria-hidden="true">↗</span></span></a>`).join('')}</div></section>
        <div class="kb-layout"><main class="kb-layout-main"><div class="kb-section-heading"><div><span class="kb-overline">EXPLORE A CENTRAL</span><h2>Um lugar para cada dúvida.</h2></div><span class="kb-count-label">${modulos} módulos</span></div><div class="kb-categories-grid">${this.renderCategorias()}</div></main>
          <aside class="kb-layout-sidebar"><div class="kb-sidebar-panel"><span class="kb-overline">PARA CONTINUAR APRENDENDO</span><h3>Leituras recomendadas</h3>${recomendados.map(a=>this.linkArt(a)).join('')}</div><div class="kb-support-card"><span class="kb-support-icon" aria-hidden="true">☏</span><h3>Prefere conversar?</h3><p>Conte para a gente o que você precisa.</p><a class="kb-support-link" href="${this.suporteURL()}" target="_blank" rel="noopener noreferrer">Falar com o suporte ↗</a></div></aside></div>
        <section class="kb-feature-section" aria-labelledby="kbFeatureTitle"><div class="kb-section-heading"><div><span class="kb-overline">DO APRENDIZADO À PRÁTICA</span><h2 id="kbFeatureTitle">Seu negócio pode ir mais longe.</h2></div></div><div class="kb-feature-grid">${this.destaque('marketing','Vamos trazer seus clientes de volta?','Explore os guias de WhatsApp, lembretes e automações.','Ver guias de marketing','kb-feature-marketing')}${this.destaque('financeiro','Tudo organizado. Mais tranquilidade.','Encontre os artigos de contas, receitas e rotina financeira.','Explorar o financeiro','kb-feature-finance')}</div></section>
        <section class="kb-video-banner"><div><span class="kb-overline">CADA PESSOA TEM SEU JEITO DE APRENDER</span><h2>Prefere aprender assistindo?</h2><p>${this.videos.length?'Conheça os vídeos disponíveis na Central.':'Enquanto os vídeos não chegam, nossos guias acompanham você em cada etapa.'}</p><a href="#videos" data-section="videos" class="kb-btn kb-btn-primary">${this.videos.length?'Explorar vídeos':'Explorar tutoriais'} <span aria-hidden="true">↗</span></a></div>${this.M().imagem('videos')}</section>
        ${this.M().dica('Explore um módulo por vez. Os artigos relacionados ajudam você a continuar de onde parou.','boasVindas')}
        <footer class="kb-page-footer"><strong>PetHub <span>· Central de Ajuda</span></strong><p>Tecnologia mais próxima. Uma rotina mais simples.</p><a href="/dashboard.html">Voltar ao sistema ↗</a></footer>`;
      this.setupSearch();
    },
    suporteURL(){const c=window.HELP_CENTER_CONFIG||{},n=String(c.whatsappNumber||'').replace(/\D/g,'');return n?'https://wa.me/'+n+'?text='+encodeURIComponent(c.whatsappMessage||'Olá! Preciso de ajuda com o PetHub.'):'/dashboard.html';},
    destaque(cat,titulo,texto,link,classe){if(!this.state.categorias[cat]?.length)return '';return `<article class="kb-feature-card ${classe}"><div class="kb-feature-copy"><span class="kb-overline">${this.esc(this.categoriasMeta[cat].name)}</span><h3>${titulo}</h3><p>${texto}</p><a href="#categoria/${cat}" data-category="${cat}">${link} ↗</a></div>${this.M().imagem(cat)}</article>`;},
    contagemCategoria(cat){const todos=this.state.categorias[cat]||[],n=todos.filter(a=>a.disponivel!==false).length,pendentes=todos.length-n;return n+' guia'+(n===1?'':'s')+(pendentes?' · '+pendentes+' sem arquivo':'');},
    renderCategorias(){return Object.entries(this.categoriasMeta).filter(([cat])=>this.state.categorias[cat]?.length).map(([cat,m])=>`<a class="kb-category-card" href="#categoria/${cat}" data-category="${cat}"><span class="kb-cat-icon-wrap">${m.icon}</span><div class="kb-cat-info"><h3 class="kb-cat-name">${this.esc(m.name)}</h3><p class="kb-cat-desc">${this.esc(m.desc)}</p><span class="kb-cat-count">${this.contagemCategoria(cat)}</span></div><span class="kb-cat-arrow" aria-hidden="true">↗</span></a>`).join('');},
    renderCategoria(category){const artigos=this.state.categorias[category];if(!artigos?.length)return this.showError('Este módulo não foi encontrado.');const m=this.categoriasMeta[category]||{name:category,desc:''};this.state.currentPage='category';this.state.currentCategory=category;this.updateBreadcrumb(category);document.getElementById('kbContent').innerHTML=`<section class="kb-category-cover"><div><span class="kb-overline">EXPLORE O MÓDULO</span><h1>${this.esc(m.name)}</h1><p>${this.esc(m.desc)}</p><span class="kb-heading-tag">${this.contagemCategoria(category)}</span></div>${this.M().imagem(category)}</section><div class="kb-category-article-grid">${artigos.map(a=>this.linkArt(a,'kb-article-list-item')).join('')}</div>${this.M().dica('Escolha um artigo para acompanhar as orientações. Você pode voltar a esta lista a qualquer momento.',category)}`;},
    prepararMarkdown(md,category,slug){
      return md.replace(/\]\(([^)]+\.md)(#[^)]*)?\)/g,(todo,href)=>{
        try { const url=new URL(href,'https://pethub.invalid'+this.CONFIG.artigosDir+category+'/'+slug+'.md');
          const m=url.pathname.match(/\/artigos\/([^/]+)\/([^/]+)\.md$/);
          if(url.hostname==='pethub.invalid'&&m&&this.state.artigos.some(a=>a.category===decodeURIComponent(m[1])&&a.slug===decodeURIComponent(m[2])))return '](#artigo/'+m[1]+'/'+m[2]+')';
        } catch(_) {} return todo;
      });
    },
    async renderArtigo(category,slug){const artigos=this.state.categorias[category]||[],a=artigos.find(x=>x.slug===slug);if(!a)return this.showError('Este artigo não foi encontrado.');const c=document.getElementById('kbContent'),controller=new AbortController();this._artigoAbort=controller;c.innerHTML='<div class="kb-loading" role="status"><div class="kb-loading-spinner"></div><p>Preparando seu guia…</p></div>';
      try{const r=await fetch(this.CONFIG.artigosDir+encodeURIComponent(category)+'/'+encodeURIComponent(slug)+'.md',{signal:controller.signal});if(!r.ok)throw Error('Falha no artigo');const md=this.prepararMarkdown((await r.text()).replace(/^---[\s\S]*?---\s*/m,''),category,slug);if(controller.signal.aborted)return;
        this.state.currentPage='article';this.state.currentCategory=category;this.state.currentArticle=slug;this.updateBreadcrumb(category,a.title);const html=window.marked?.parse?window.marked.parse(md,{breaks:true,gfm:true}):'<pre>'+this.esc(md)+'</pre>';
        const related=artigos.filter(x=>x.slug!==slug&&x.disponivel!==false).slice(0,4);c.innerHTML=`<article class="kb-article-page"><header class="kb-article-header"><span class="kb-overline">${this.esc(this.categoriasMeta[category]?.name||category)}</span><h1>${this.esc(a.title)}</h1><p class="kb-article-desc">${this.esc(a.description)}</p><div class="kb-article-meta-bar"><span>${this.esc(a.readingTime||'Artigo')}</span><span>${this.esc(a.level||'Guia')}</span><a href="#categoria/${category}" data-category="${category}">Todos os artigos do módulo ↗</a></div></header>${this.M().introducao(category,'Vamos por partes?','Acompanhe o guia abaixo e consulte as etapas sempre que precisar.')}<div class="kb-article-content">${html}</div>${md.length>2200?this.M().dica('Prontinho! Você chegou ao fim deste guia. Se surgir outra dúvida, continue pelos artigos relacionados.', 'conclusao'):''}${related.length?`<section class="kb-related-articles"><span class="kb-overline">SEU PRÓXIMO PASSO</span><h2>Continue explorando</h2><div class="kb-related-grid">${related.map(x=>this.linkArt(x)).join('')}</div></section>`:''}</article>`;this.setupFaqAccordion();
      }catch(e){if(!controller.signal.aborted)this.showError('Não foi possível abrir este artigo. Tente novamente.');}
    },
    renderSecao(secao){this.state.currentPage=secao;this.updateBreadcrumb(null,secao);const c=document.getElementById('kbContent');if(secao==='videos'){const valid=this.videos.filter(v=>v.title&&/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(v.url||''));c.innerHTML=`<section class="kb-category-cover"><div><span class="kb-overline">APRENDA NO SEU RITMO</span><h1>Tutoriais em vídeo</h1><p>${valid.length?'Escolha um vídeo para continuar aprendendo.':'Os vídeos ainda não estão disponíveis nesta base. Você pode continuar pelos guias escritos.'}</p></div>${this.M().imagem('videos')}</section>${valid.length?`<div class="kb-category-article-grid">${valid.map(v=>`<a class="kb-reading-link" href="${this.esc(v.url)}" target="_blank" rel="noopener noreferrer"><span>▶</span><strong>${this.esc(v.title)}</strong></a>`).join('')}</div>`:`<div class="kb-sidebar-panel"><h2>Enquanto isso, explore os guias</h2>${this.state.artigos.filter(a=>a.disponivel!==false).slice(0,4).map(a=>this.linkArt(a)).join('')}</div>`}`;}
      else if(secao==='novidades')c.innerHTML=`<section class="kb-category-cover"><div><span class="kb-overline">ACOMPANHE O PETHUB</span><h1>Novidades da Central</h1><p>Conheça as atualizações já publicadas nesta base.</p></div>${this.M().imagem('novidades')}</section><div class="kb-news-grid">${this.novidades.map(n=>`<article class="kb-sidebar-panel"><span class="kb-overline">${this.esc(n.date)}</span><h2>${n.icon} ${this.esc(n.title)}</h2><p>${this.esc(n.desc)}</p></article>`).join('')}</div>`;
      else c.innerHTML=`<section class="kb-sidebar-panel kb-status-panel"><span class="kb-overline">STATUS DO SISTEMA</span><h1>Precisa verificar um serviço?</h1><p>Esta Central não possui um monitor de disponibilidade em tempo real. Consulte o suporte para confirmar uma ocorrência.</p><a class="kb-btn kb-btn-primary" href="${this.suporteURL()}" target="_blank" rel="noopener noreferrer">Falar com o suporte ↗</a></section>`;
    },
    setupNavigation(){if(this._delegado)return;this._delegado=true;document.addEventListener('click',e=>{const link=e.target.closest?.('.kb-wrapper a');if(!link||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button>0)return;let hash;if(link.dataset.article)hash='#artigo/'+encodeURIComponent(link.dataset.category)+'/'+encodeURIComponent(link.dataset.article);else if(link.dataset.category)hash='#categoria/'+encodeURIComponent(link.dataset.category);else if(link.dataset.section)hash=link.dataset.section==='home'?'#inicio':'#'+link.dataset.section;else if(link.id==='kbBreadcrumbHome')hash='#inicio';if(hash){e.preventDefault();this.navigate(hash);}});document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')&&!document.activeElement?.isContentEditable){const input=document.getElementById('kbSearchInput');if(input){e.preventDefault();input.focus();}}});},
    setupSearch(){const input=document.getElementById('kbSearchInput'),results=document.getElementById('kbSearchResults'),clear=document.getElementById('kbSearchClear');if(!input)return;let timer;const search=()=>{const q=input.value.trim();clear.classList.toggle('visible',q.length>0);if(q.length<2){results.classList.remove('visible');input.setAttribute('aria-expanded','false');return;}const found=this.buscar(q);results.innerHTML=found.length?found.map(a=>this.linkArt(a,'kb-search-result-item')).join(''):this.M().vazio('Não encontramos esse termo.','Tente outra palavra ou explore os módulos abaixo.');results.classList.add('visible');input.setAttribute('aria-expanded','true');};input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,this.CONFIG.debounceMs);});document.getElementById('kbSearchForm').addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);search();});input.addEventListener('keydown',e=>{if(e.key==='Escape'){results.classList.remove('visible');input.setAttribute('aria-expanded','false');}if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('a')?.focus();}});clear.addEventListener('click',()=>{input.value='';search();input.focus();});this._fecharBusca||(document.addEventListener('click',e=>{if(!e.target.closest?.('.kb-hero-search-wrapper')){document.getElementById('kbSearchResults')?.classList.remove('visible');document.getElementById('kbSearchInput')?.setAttribute('aria-expanded','false');}}),this._fecharBusca=true);},
    setupFaqAccordion(){document.querySelectorAll('.kb-faq-question').forEach(q=>{q.setAttribute('role','button');q.tabIndex=0;q.setAttribute('aria-expanded','false');const toggle=()=>{const a=q.nextElementSibling;if(!a)return;const open=!a.classList.contains('open');document.querySelectorAll('.kb-faq-answer.open').forEach(x=>{x.classList.remove('open');x.previousElementSibling?.classList.remove('open');x.previousElementSibling?.setAttribute('aria-expanded','false');});a.classList.toggle('open',open);q.classList.toggle('open',open);q.setAttribute('aria-expanded',String(open));};q.addEventListener('click',toggle);q.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});});},
    updateBreadcrumb(category,title){const m=this.categoriasMeta[category],el=document.getElementById('kbBreadcrumb');el.innerHTML='<a href="#inicio" id="kbBreadcrumbHome">Início</a>'+(m?`<span aria-hidden="true">/</span><a href="#categoria/${category}" data-category="${category}">${this.esc(m.name)}</a>`:'')+(title?`<span aria-hidden="true">/</span><span aria-current="page">${this.esc({videos:'Tutoriais em vídeo',novidades:'Novidades',status:'Status do sistema'}[title]||title)}</span>`:'');},
    setupNavbar(){const nav=document.getElementById('kbNavbar');window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>20),{passive:true});},
    setupMobileMenu(){const toggle=document.getElementById('kbNavToggle'),menu=document.querySelector('.kb-navbar-center'),overlay=document.getElementById('kbMobileOverlay');if(!toggle||!menu)return;toggle.setAttribute('aria-expanded','false');this.closeMenu=()=>{menu.classList.remove('open');toggle.classList.remove('open');toggle.setAttribute('aria-expanded','false');overlay?.classList.remove('open');};toggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');toggle.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));overlay?.classList.toggle('open',open);});overlay?.addEventListener('click',this.closeMenu);document.addEventListener('keydown',e=>{if(e.key==='Escape'){this.closeMenu();const resultados=document.getElementById('kbSearchResults');if(resultados?.classList.contains('visible')){resultados.classList.remove('visible');const input=document.getElementById('kbSearchInput');input?.setAttribute('aria-expanded','false');input?.focus();}}});},
    hideLoading(){document.getElementById('kbLoading')?.remove();},
    showError(msg){document.getElementById('kbContent').innerHTML=this.M().vazio('Vamos tentar de novo?',msg)+'<a class="kb-btn kb-btn-primary" href="#inicio" id="kbBreadcrumbHome">Voltar à Central ↗</a>';},
  };
  window.KB=KB;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>KB.init());else KB.init();
})();
