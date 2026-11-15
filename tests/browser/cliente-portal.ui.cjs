// Teste de UI local, somente banco em memória. Requer Playwright/Chromium no ambiente de teste.
// PETHUB_TEST_CHROME=/caminho/chromium node tests/browser/cliente-portal.ui.cjs
process.env.NODE_ENV = 'production';
const { fixture } = require('../helpers/cliente-portal-fixture'), express = require('express'), cookieParser = require('cookie-parser'), path = require('node:path'), assert = require('node:assert/strict'), { chromium } = require('playwright');
(async () => {
    const clean = [], f = await fixture({ after: fn => clean.push(fn) });
    let browser, server;
    try {
        const a = await f.ativar();
        f.p.hooks();
        const app = express();
        app.use(express.json());
        app.use(cookieParser());
        const r = require('../../backend/routes/clientePortalRoutes').criarRotas(f.p, { authERP: (req, res, next) => res.sendStatus(401), permissao: () => () => { } });
        app.use('/api/cliente-app', r.tutor);
        app.use(express.static(path.resolve(__dirname, '../../frontend')));
        server = app.listen(0, '127.0.0.1');
        await new Promise(r => server.once('listening', r));
        const base = 'http://127.0.0.1:' + server.address().port;
        browser = await chromium.launch({ headless: true, ...(process.env.PETHUB_TEST_CHROME ? { executablePath: process.env.PETHUB_TEST_CHROME } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        await context.addInitScript(() => { const OriginalDate = Date; class Clock extends OriginalDate {
            constructor(...args) { super(...(args.length ? args : ['2026-11-16T10:00:00Z'])); }
            static now() { return +new OriginalDate('2026-11-16T10:00:00Z'); }
        } window.Date = Clock; });
        await page.goto(base + '/cliente-app/app.html?loja=' + a.tutor.config.slug);
        await page.getByLabel('E-mail de acesso', { exact: true }).fill('ana@example.com');
        await page.getByLabel('Sua senha', { exact: true }).fill('SenhaNova1234');
        await page.getByRole('button', { name: 'Entrar no meu espaço' }).click();
        await page.getByRole('heading', { name: 'Olá, Ana!' }).waitFor();
        await page.locator('#navegacao').getByRole('button', { name: 'Meus Pets' }).click();
        await page.getByRole('button', { name: /Bobby/ }).click();
        await page.getByRole('button', { name: 'Editar perfil' }).click();
        await page.getByLabel('Nome', { exact: true }).fill('Bobby do App');
        await page.getByRole('button', { name: 'Salvar perfil do pet' }).click();
        await page.locator('#modal').waitFor({ state: 'hidden' });
        assert.equal((await f.ERP.Pet.findByPk(1)).nome, 'Bobby do App');
        await page.locator('#navegacao').getByRole('button', { name: 'Agendar' }).click();
        await page.getByLabel('Data desejada').fill('2026-11-18');
        await page.getByLabel('Horário solicitado').fill('10:00');
        await page.getByRole('button', { name: 'Revisar solicitação' }).click();
        await page.getByRole('button', { name: 'Enviar solicitação' }).click();
        await page.getByText('Em análise', { exact: true }).waitFor();
        assert.equal(await f.ERP.Agendamento.count(), 0);
        const pedido = await f.p.m.Solic.findOne();
        await f.p.pedidos.agir({ empresaId: 1, autorId: 9 }, pedido.id, { acao: 'aceitar', versao: 1 });
        await page.getByText('Confirmada', { exact: true }).waitFor({ timeout: 15000 });
        assert.equal(await f.ERP.Agendamento.count(), 1);
        await page.locator('#navegacao').getByRole('button', { name: 'Histórico' }).click();
        await page.getByText('Banho', { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
        console.log('UI OK: login, edição compartilhada, pedido pendente, aprovação e histórico em viewport 390 × 844.');
    }
    finally {
        await browser?.close();
        if (server)
            await new Promise(r => { server.closeAllConnections(); server.close(r); });
        for (const fn of clean.reverse())
            await fn();
    }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
