/* Credencial somente no cookie HttpOnly. CSRF permanece apenas na memória desta página. */
(function () {
    'use strict';
    let csrf = '';
    async function request(path, { method = 'GET', body, timeout = 20000 } = {}) { const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout); try {
        const headers = { 'X-PetHub-Cliente': '1' };
        if (csrf)
            headers['X-Cliente-CSRF'] = csrf;
        const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
        if (body && !multipart)
            headers['Content-Type'] = 'application/json';
        const r = await fetch('/api/cliente-app' + path, { method, credentials: 'same-origin', cache: 'no-store', headers, signal: controller.signal, ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
        const data = await r.json().catch(() => ({ erro: 'Resposta indisponível.' }));
        if (!r.ok)
            throw Object.assign(new Error(data.erro || 'Não foi possível concluir.'), { status: r.status });
        if (data.csrf)
            csrf = data.csrf;
        return data;
    }
    catch (e) {
        if (e.name === 'AbortError')
            throw new Error('A resposta demorou. Consulte o resultado antes de repetir a operação.');
        throw e;
    }
    finally {
        clearTimeout(timer);
    } }
    window.ClienteAPI = { request, limpar: () => { csrf = ''; } };
})();
