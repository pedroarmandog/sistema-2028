(function () {
    'use strict';
    if (window.__pcWidget || location.pathname.startsWith('/cliente-app/'))
        return;
    window.__pcWidget = true;
    const origin = new URL(document.currentScript.src).origin, mobile = location.pathname.startsWith('/mobile/');
    if (!document.querySelector('link[data-pc-style]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = origin + '/components/cliente-portal-erp.css';
        l.dataset.pcStyle = '1';
        document.head.append(l);
    }
    if (!window.PortalERP && !document.querySelector('script[data-pc-erp]')) {
        const s = document.createElement('script');
        s.src = origin + '/components/cliente-portal-erp.js';
        s.dataset.pcErp = '1';
        document.head.append(s);
    }
    let badge, revision = '', source, stopped = false, busy = false, pulseTimer;
    function widget() { if (badge)
        return badge; badge = document.createElement('a'); badge.id = 'pc-widget'; badge.className = mobile ? 'pc-mobile' : ''; badge.href = mobile ? '/mobile/app.html?page=solicitacoes' : '/atendimento/solicitacoes-app.html'; badge.setAttribute('aria-label', 'Solicitações do PetHub Cliente'); badge.innerHTML = '<span>Solicitações do App</span><span id="pc-widget-count">0</span>'; badge.hidden = true; badge.onclick = e => { if (mobile && window.MobileRouter) {
        e.preventDefault();
        window.MobileRouter.navigate('solicitacoes');
    } }; document.body.append(badge); const agenda = document.querySelector('.btn-refresh'); if (agenda && !document.getElementById('pc-agenda-link')) {
        const a = badge.cloneNode(true);
        a.id = 'pc-agenda-link';
        a.removeAttribute('hidden');
        a.style.cssText = 'display:inline-flex;padding:10px 14px;border-radius:8px;background:#fff2d8;color:#684008;font-size:13px;text-decoration:none;margin:8px';
        a.innerHTML = 'Solicitações do App';
        agenda.parentElement.append(a);
    } return badge; }
    function apply(r) { const b = widget(); b.hidden = false; document.getElementById('pc-widget-count').textContent = String(r.pendentes || 0); if (revision && r.revisao !== revision) {
        b.classList.remove('pc-pulse');
        void b.offsetWidth;
        b.classList.add('pc-pulse');
        clearTimeout(pulseTimer);
        pulseTimer = setTimeout(() => b.classList.remove('pc-pulse'), 4500);
        window.dispatchEvent(new Event('pethub:portal-atualizado'));
    } revision = r.revisao; }
    async function check() { if (stopped || busy || document.hidden || !window.PortalERP)
        return; if (mobile && !window.MobileAuth?.getToken()) {
        if (badge)
            badge.hidden = true;
        source?.close();
        return;
    } busy = true; try {
        const r = await window.PortalERP.api('/resumo');
        apply(r);
        if (!mobile && !source) {
            source = new EventSource((window.API_URL || window.VPS_URL || origin) + '/api/cliente-portal/eventos', { withCredentials: true });
            source.onmessage = e => { try {
                apply(JSON.parse(e.data));
            }
            catch { } };
        }
    }
    catch (e) {
        if ([401, 403].includes(e.status)) {
            if (badge)
                badge.hidden = true;
            source?.close();
            source = null;
            if (!mobile)
                stopped = true;
        }
    }
    finally {
        busy = false;
    } }
    setTimeout(() => { const menu = document.querySelector('.sidebar-nav'); if (menu && !document.getElementById('pc-menu-link')) {
        const a = document.createElement('a');
        a.id = 'pc-menu-link';
        a.href = '/configuracoes/portal-cliente.html';
        a.className = 'nav-item';
        a.textContent = 'PetHub Cliente';
        a.title = 'Configurar aplicativo dos tutores';
        menu.append(a);
    } void check(); }, 2500);
    const timer = setInterval(check, 15000);
    window.addEventListener('pagehide', () => { clearInterval(timer); source?.close(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden)
        void check(); });
})();
