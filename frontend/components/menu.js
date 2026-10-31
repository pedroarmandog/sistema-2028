// menu.js - comportamento do menu lateral (extraído de dashboard.js)
(function(){
    'use strict';

    function detectarIDsDuplicados(){
        const ids = ['clienteMenuItem','clienteSubmenu','itemMenuItem','itemSubmenu','petMenuItem','petSubmenu','atendimentoMenuItem','atendimentoSubmenu','financeiroMenuItem','financeiroSubmenu','configuracaoMenuItem','configuracaoSubmenu','painelMenuItem','painelSubmenu','comprasMenuItem','comprasSubmenu'];
        let ok = true;
        ids.forEach(id=>{ const els = document.querySelectorAll('#'+id); if(els.length>1){ console.warn('ID duplicado:',id,els.length); ok=false; }});
        return ok;
    }

    function moveSubmenuToBody(submenu){
        if(!submenu) return; if(submenu.dataset.moved==='true') return;
        const sidebarEl = document.querySelector('.sidebar');
        const sbRect = sidebarEl ? sidebarEl.getBoundingClientRect() : {right:140};
        document.body.appendChild(submenu);
        submenu.classList.add('submenu-fixed');
        // usar setProperty com 'important' para garantir override mesmo quando
        // o CSS da página define 'left: ... !important'
        submenu.style.setProperty('left', Math.round(sbRect.right) + 'px', 'important');
        submenu.style.zIndex = '99999';
        submenu.style.display = 'flex';
        submenu.style.visibility = 'visible';
        submenu.style.pointerEvents = 'auto';
        submenu.dataset.moved = 'true';
        try{
            if(!submenu.querySelector('.submenu-fixed-header')){
                const id = submenu.id||'';
                const menuItemId = id.replace('Submenu','MenuItem');
                const menuItem = document.getElementById(menuItemId);
                let titleText = '';
                if(menuItem){ const span = menuItem.querySelector('span'); titleText = (span && span.textContent)?span.textContent.trim():menuItem.textContent.trim(); }
                if(!titleText) titleText = id.replace(/Submenu$/i,'');
                const header = document.createElement('div'); header.className = 'submenu-fixed-header'; header.innerHTML = '<div class="submenu-fixed-header-title">'+escapeHtml(titleText)+'</div>';
                submenu.insertBefore(header, submenu.firstChild);
            }
        }catch(e){ console.warn('Erro header submenu',e); }
    }

    function restoreSubmenu(submenu){
        if(!submenu) return; if(submenu.dataset.moved!=='true') return;
        const id = submenu.id||''; const menuItemId = id.replace('Submenu','MenuItem'); const menuItem = document.getElementById(menuItemId); const menuContainer = menuItem?menuItem.parentElement:null;
        if(menuContainer){ menuContainer.appendChild(submenu); } else { const sidebar = document.querySelector('.sidebar'); if(sidebar) sidebar.appendChild(submenu); }
        submenu.classList.remove('submenu-fixed'); submenu.style.removeProperty('left'); submenu.style.top=''; submenu.style.zIndex=''; submenu.style.display=''; submenu.style.visibility=''; submenu.style.pointerEvents=''; submenu.dataset.moved='false'; try{ const hdr = submenu.querySelector('.submenu-fixed-header'); if(hdr) hdr.remove(); }catch(e){}
    }

    function escapeHtml(text){ if(!text) return ''; return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

    function setupSubmenuClickHandlers(){
        const containers = document.querySelectorAll('.nav-item-with-submenu');
        if(!containers || containers.length===0) return;
        containers.forEach(container=>{
            const menuItem = container.querySelector('.nav-item');
            const submenu = container.querySelector('.submenu');
            if(!menuItem || !submenu) return;
            if(menuItem.getAttribute('data-submenu-listener')==='true') return;
            menuItem.setAttribute('data-submenu-listener','true');
            menuItem.addEventListener('click', function(e){
                e.preventDefault(); e.stopPropagation();
                if(e.target.closest('.submenu')) return;
                document.querySelectorAll('.nav-item-with-submenu .submenu.open').forEach(s=>{ if(s!==submenu){ s.classList.remove('open'); try{ restoreSubmenu(s); }catch(e){} } });
                const isOpen = submenu.classList.contains('open');
                if(isOpen){ submenu.classList.remove('open'); try{ restoreSubmenu(submenu); }catch(e){} } else { try{ moveSubmenuToBody(submenu); }catch(e){} submenu.classList.add('open'); }
            });
        });
        document.addEventListener('click', function(ev){ if(!ev.target.closest('.submenu') && !ev.target.closest('.nav-item')){ document.querySelectorAll('.nav-item-with-submenu .submenu.open').forEach(s=>{ s.classList.remove('open'); try{ restoreSubmenu(s); }catch(e){} }); } });
    }

    function setupNestedToggles(){
        // left submenus (item)
        [['leftBtnNovo','leftSubNovo','leftCaretNovo'],['leftBtnEstoque','leftSubEstoque','leftCaretEstoque'],['leftBtnClinica','leftSubClinica','leftCaretClinica'],['attBtnVendas','attSubVendas','attCaretVendas'],['attBtnCaixa','attSubCaixa','attCaretCaixa'],['attBtnRelatorios','attSubRelatorios','attCaretRel'],['compBtnRelatorios','compSubRelatorios','compCaretRel'],['finBtnReceber','finSubReceber','finCaretReceber'],['finBtnPagar','finSubPagar','finCaretPagar'],['finBtnConta','finSubConta','finCaretConta'],['finBtnCartao','finSubCartao','finCaretCartao'],['finBtnRelatorios','finSubRelatorios','finCaretRel']].forEach(ids=>{
            try{
                const btn = document.getElementById(ids[0]); const sub = document.getElementById(ids[1]); const caret = document.getElementById(ids[2]);
                if(btn && sub){ btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); const open = sub.style.display==='block' || sub.style.display==='flex'; sub.style.display = open ? 'none' : 'block'; if(caret) caret.innerText = open ? '▼' : '▲'; }); }
            }catch(e){ }
        });
    }

    function configurarDropdownInicioRapido(){ if(window.dropdownConfigurado) return; const dropdownBtn = document.getElementById('inicioRapidoBtn'); const dropdown = document.querySelector('.dropdown'); if(dropdownBtn && dropdown){ dropdownBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); dropdown.classList.toggle('open'); }); document.addEventListener('click', function(e){ if(!dropdown.contains(e.target)){ if(dropdown.classList.contains('open')) dropdown.classList.remove('open'); } }); window.dropdownConfigurado = true; } }

    function initMenu(){ detectarIDsDuplicados(); setupSubmenuClickHandlers(); setupNestedToggles(); configurarDropdownInicioRapido();
        // fechar quando clicar fora (igual comportamento do dashboard)
        document.addEventListener('click', function(ev){ setTimeout(function(){ if(ev.target.closest('.sidebar') || ev.target.closest('.submenu') || ev.target.closest('.panel')) return; document.querySelectorAll('.submenu').forEach(s=>{ try{ s.classList.remove('open'); restoreSubmenu(s); }catch(e){} s.style.display='none'; }); document.querySelectorAll('.nav-item-with-submenu.open').forEach(c=>c.classList.remove('open')); },20); });
    }

    // Ajusta margin-left do main-content para 'grudar' ao sidebar atual
    function adjustMainContent(){
        try{
            var sidebar = document.querySelector('.sidebar');
            if(!sidebar) return;
            var w = sidebar.getBoundingClientRect().width;
            // aplicar inline style às main-content existentes
            document.querySelectorAll('.main-content').forEach(function(mc){
                // guardar valor original para possível restauração
                if(mc.dataset._origMargin === undefined) mc.dataset._origMargin = mc.style.marginLeft || '';
                if(mc.dataset._origWidth === undefined) mc.dataset._origWidth = mc.style.width || '';
                mc.style.marginLeft = w + 'px';
                mc.style.width = 'calc(100% - ' + w + 'px)';
            });
        }catch(e){ console.warn('adjustMainContent error', e); }
    }

    function resetMainContent(){
        try{
            document.querySelectorAll('.main-content').forEach(function(mc){
                if(mc.dataset._origMargin !== undefined) mc.style.marginLeft = mc.dataset._origMargin;
                if(mc.dataset._origWidth !== undefined) mc.style.width = mc.dataset._origWidth;
            });
        }catch(e){ }
    }

    // Sincroniza comportamento de abrir/fechar sidebar com o main-content
    function setupMenuToggleSync(){
        var menuToggle = document.querySelector('.menu-toggle');
        var sidebar = document.querySelector('.sidebar');
        if(!menuToggle || !sidebar) return;
        if(menuToggle.getAttribute('data-menu-toggle-configured')==='true') return;
        menuToggle.setAttribute('data-menu-toggle-configured','true');
        menuToggle.addEventListener('click', function(e){
            try{
                e.preventDefault(); e.stopPropagation();
                sidebar.classList.toggle('collapsed');
                var collapsed = sidebar.classList.contains('collapsed');
                document.querySelectorAll('.main-content').forEach(function(mc){
                    if(collapsed){
                        // usar inline style com prioridade !important para sobrepor regras em folhas de estilo
                        mc.style.setProperty('margin-left', '0', 'important');
                        mc.style.setProperty('width', '100%', 'important');
                    }
                    else {
                        var w = sidebar.getBoundingClientRect().width;
                        mc.style.setProperty('margin-left', w + 'px', 'important');
                        mc.style.setProperty('width', 'calc(100% - ' + w + 'px)', 'important');
                    }
                });
            }catch(err){ console.warn('menuToggle click error', err); }
        });
    }

    // expor init para quando o menu for injetado dinamicamente
    window.__menuComponent = { init: function(){ initMenu(); adjustMainContent(); setupMenuToggleSync(); } };

    // se o menu já estiver presente no DOM no carregamento, inicializa imediatamente
    document.addEventListener('DOMContentLoaded', function(){ if(document.querySelector('.sidebar')){ try{ initMenu(); adjustMainContent(); setupMenuToggleSync(); }catch(e){ console.warn('initMenu error',e); } } });

    // ajustar quando a janela for redimensionada (por exemplo, alterações de largura do sidebar)
    window.addEventListener('resize', function(){ adjustMainContent(); });

})();
