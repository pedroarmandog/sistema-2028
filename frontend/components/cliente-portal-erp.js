(function () {
    'use strict';
    if (window.PortalERP)
        return;
    const scriptOrigin = new URL(document.currentScript.src).origin;
    const base = () => window.API_URL || window.VPS_URL || scriptOrigin;
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const date = d => d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—';
    const day = d => d?.split('-').reverse().join('/') || '—';
    async function carregarImagens(target) { const token = window.MobileAuth?.getToken(); if (!token)
        return; for (const img of target.querySelectorAll('img')) {
        const u = new URL(img.src);
        if (u.origin !== new URL(base()).origin || !u.pathname.startsWith('/api/cliente-portal/'))
            continue;
        try {
            const r = await fetch(u, { credentials: 'include', cache: 'no-store', headers: { Authorization: 'Bearer ' + token } });
            if (!r.ok)
                continue;
            const objectURL = URL.createObjectURL(await r.blob());
            img.onload = () => URL.revokeObjectURL(objectURL);
            img.onerror = () => URL.revokeObjectURL(objectURL);
            img.src = objectURL;
        }
        catch { }
    } }
    async function api(path, { method = 'GET', body } = {}) { const headers = { 'X-PetHub-Cliente': '1' }, token = window.MobileAuth?.getToken(); if (token)
        headers.Authorization = 'Bearer ' + token; const multi = body instanceof FormData; if (body && !multi)
        headers['Content-Type'] = 'application/json'; const controller = new AbortController(), timer = setTimeout(() => controller.abort(), multi ? 65000 : 20000); try {
        const r = await fetch(base() + '/api/cliente-portal' + path, { method, credentials: 'include', cache: 'no-store', headers, signal: controller.signal, ...(body ? { body: multi ? body : JSON.stringify(body) } : {}) });
        const data = await r.json().catch(() => ({ erro: 'Resposta indisponível.' }));
        if (!r.ok)
            throw Object.assign(new Error(data.erro || 'Operação indisponível.'), { status: r.status });
        return data;
    }
    catch (e) {
        if (e.name === 'AbortError')
            throw new Error('A resposta demorou. Confira o resultado antes de tentar novamente.');
        throw e;
    }
    finally {
        clearTimeout(timer);
    } }
    function erro(target, e) { target.innerHTML = '<div class="pc-note pc-error" role="alert">' + esc(e.message) + '</div>'; }
    const input = (label, name, value, type = 'text', extra = '') => '<label>' + esc(label) + '<input name="' + name + '" type="' + type + '" value="' + esc(value) + '" ' + extra + '></label>';
    const check = (name, label, value) => '<label><input name="' + name + '" type="checkbox" ' + (value ? 'checked' : '') + '>' + esc(label) + '</label>';
    const options = (rows, v) => '<option value="">Sem profissional fixo</option>' + rows.map(p => '<option value="' + p.id + '" ' + (Number(p.id) === Number(v) ? 'selected' : '') + '>' + esc(p.nome) + '</option>').join('');
    const active = ['PENDENTE', 'PROPOSTA', 'PROPOSTA_RECUSADA'];
    let pedidosTarget = null, pedidosBusy = false, pedidoRows = [], configRows;
    async function renderPedidos(target, abertas = true) { pedidosTarget = target; target.classList.add('pc-root'); if (pedidosBusy)
        return; pedidosBusy = true; try {
        const rows = await api('/solicitacoes' + (abertas ? '?estado=abertas' : ''));
        const focoPedido=window.PortalPedidoFoco||new URL(location.href).searchParams.get('solicitacao');
        if(focoPedido&&!rows.some(p=>p.id===focoPedido)){try{rows.unshift(await api('/solicitacoes/'+encodeURIComponent(focoPedido)));}catch(e){if(e.status!==404)throw e;}}
        if (!target.isConnected)
            return;
        pedidoRows = rows;
        target.innerHTML = '<div class="pc-row" style="justify-content:space-between"><div><h1>Solicitações do App</h1><p class="pc-muted">Confirme, recuse ou negocie. A agenda oficial recebe somente pedidos confirmados.</p></div><a href="/configuracoes/portal-cliente.html" class="pc-btn pc-secondary">Configurar portal</a></div><div class="pc-row" style="margin-bottom:20px"><button data-pc-filter="abertas" class="' + (abertas ? 'pc-orange' : 'pc-secondary') + '">Em andamento</button><button data-pc-filter="todas" class="' + (!abertas ? 'pc-orange' : 'pc-secondary') + '">Recentes (até 200)</button><button data-pc-refresh class="pc-secondary">Atualizar</button></div><div id="pc-pedidos-status" role="status"></div>' + rows.map(p => '<article class="pc-card" data-pc-pedido="' + p.id + '"><div class="pc-row"><img class="pc-avatar" src="' + base() + p.foto + '" alt="Foto do pet" loading="lazy"><div><h3>' + esc(p.pet) + ' <small>· ' + esc(p.cliente) + '</small></h3><span class="pc-status">' + esc(p.estado.replaceAll('_', ' ')) + '</span></div></div><p><strong>' + esc(p.servico) + '</strong><br>Pretendido: ' + day(p.data) + ' às ' + esc(p.hora) + '<br>Contato: ' + esc(p.telefone || 'Não informado') + '</p>' + (p.observacao ? '<div class="pc-note">' + esc(p.observacao) + '</div>' : '') + '<small>Enviado em ' + date(p.criadoEm) + '</small>' + (p.proposta ? '<div class="pc-note pc-alert">Proposta: ' + day(p.proposta.data) + ' às ' + esc(p.proposta.hora) + '<br>' + esc(p.proposta.observacao || '') + '<br><small>Expira: ' + date(p.proposta.expiraEm) + '. Não reserva a vaga.</small></div>' : '') + (p.motivo ? '<p>' + esc(p.motivo) + '</p>' : '') + (active.includes(p.estado) ? '<div class="pc-row" style="margin-top:15px">' + (p.estado === 'PENDENTE' ? '<button data-pc-action="aceitar">Aceitar</button>' : '') + '<button data-pc-action="recusar" class="pc-danger">Recusar</button><button data-pc-action="propor" class="pc-orange">Propor outro horário</button></div><div class="pc-action-form"></div>' : '') + (p.agendamentoId ? '<div class="pc-row" style="margin-top:15px"><a href="/agendamento-detalhes.html?id=' + p.agendamentoId + '">Abrir atendimento #' + p.agendamentoId + '</a><button data-pc-message class="pc-secondary">Mensagem ao tutor</button></div><div class="pc-action-form"></div>' : '') + '<div style="margin-top:10px"><a href="/client-details.html?id=' + p.clienteId + '">Ver cadastro e acesso</a></div></article>').join('') + (rows.length ? '' : '<div class="pc-card"><h3>Nenhum pedido por aqui</h3><p class="pc-muted">Quando o tutor solicitar um agendamento pelo aplicativo, ele aparecerá nesta área.</p></div>');
        target.dataset.abertas = abertas ? '1' : '0';
        const foco=window.PortalPedidoFoco||new URL(location.href).searchParams.get('solicitacao');if(foco){const card=[...target.querySelectorAll('[data-pc-pedido]')].find(el=>el.dataset.pcPedido===foco);if(card){card.setAttribute('tabindex','-1');card.style.outline='3px solid #ffaa33';card.scrollIntoView({block:'center'});card.focus({preventScroll:true});}}
        void carregarImagens(target);
    }
    catch (e) {
        erro(target, e);
    }
    finally {
        pedidosBusy = false;
    } }
    async function conta(target, id) { try {
        const r = await api('/clientes/' + id);
        target.classList.add('pc-root');
        target.innerHTML = '<div class="pc-card"><h2>PetHub Cliente</h2><p>Convide o tutor para acompanhar pets, fotos, vacinas e solicitar agendamentos.</p><span class="pc-status">' + (r.conta?.ativo ? (r.conta.senhaDefinida ? 'Acesso ativo' : 'Aguardando definição da senha') : 'Acesso desativado') + '</span><p><small>Último acesso: ' + date(r.conta?.ultimoAcesso) + '</small></p>' + (!r.portalAtivo ? '<div class="pc-note pc-alert">O portal da empresa está desativado. Configure-o antes de orientar o tutor a entrar.</div>' : '') + '<form id="pc-conta-form" data-id="' + id + '">' + input('E-mail de acesso', 'email', r.conta?.email || r.emailCliente, 'email', 'required maxlength="254"') + '<div class="pc-row"><button type="submit">' + (r.conta ? 'Gerar novo convite / redefinir acesso' : 'Ativar e gerar convite seguro') + '</button>' + (r.conta?.ativo ? '<button type="button" class="pc-danger" data-pc-block="' + id + '">Bloquear e revogar sessões</button>' : '') + '</div></form><div id="pc-convite" aria-live="polite"></div><p class="pc-muted">Um novo convite invalida a senha anterior, os convites anteriores e todas as sessões. Senhas não são exibidas. Entregue o link somente ao tutor responsável.</p><a href="/configuracoes/portal-cliente.html">Configurações do PetHub Cliente</a></div><div class="pc-note">Recuperação assistida: quando o tutor solicitar recuperação no app, o aviso aparece em Solicitações do App. Confirme sua identidade e gere um novo convite aqui.</div>';
    }
    catch (e) {
        erro(target, e);
    } }
    async function configuracao(target) { try {
        const r = await api('/config');
        configRows = r;
        const cfg = r.config, v = typeof cfg.regras === 'string' ? JSON.parse(cfg.regras) : cfg.regras || {}, dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        target.classList.add('pc-root');
        target.innerHTML = '<h1>PetHub Cliente</h1><p class="pc-muted">O app do tutor, conectado ao seu pet shop. Aprovação manual em todos os pedidos.</p><form id="pc-config-form"><div class="pc-card"><h2>Acesso e comunicação</h2>' + check('ativo', 'Disponibilizar o PetHub Cliente para esta empresa', cfg.ativo) + check('receber_pedidos', 'Receber solicitações de agendamento', cfg.receber_pedidos) + check('notificar_gestor', 'Enviar notificações push de novas solicitações aos gestores', cfg.notificar_gestor) + check('push_tutor', 'Permitir notificações push aos tutores', cfg.push_tutor) + '<div class="pc-note">Link do estabelecimento: <a href="' + esc(base() + '/cliente-app/app.html?loja=' + cfg.slug) + '" target="_blank" rel="noopener">Abrir PetHub Cliente</a><br>O tutor só entra depois de receber um convite no cadastro de Clientes.</div></div><div class="pc-card"><h2>Disponibilidade para solicitações online</h2><p class="pc-muted">Regras utilizadas na aprovação. Agendamentos sem duração registrada usam a duração padrão abaixo. Propostas não reservam vagas.</p><div class="pc-row">' + dias.map((d, i) => check('dia' + i, d, (v.dias || [1, 2, 3, 4, 5]).includes(i))).join('') + '</div><div class="pc-grid">' + input('Início do expediente', 'inicio', v.inicio || '08:00', 'time', 'required') + input('Fim do expediente', 'fim', v.fim || '18:00', 'time', 'required') + input('Intervalo das opções (minutos)', 'intervalo', v.intervalo || 15, 'number', 'min="5" max="120" required') + input('Capacidade simultânea do estabelecimento', 'capacidade', v.capacidade || 1, 'number', 'min="1" max="100" required') + input('Duração de atendimentos legados (minutos)', 'duracaoPadrao', v.duracaoPadrao || 60, 'number', 'min="5" max="720" required') + input('Antecedência mínima (minutos)', 'antecedencia', v.antecedencia ?? 60, 'number', 'min="0" max="10080" required') + input('Dias máximos no futuro', 'horizonte', v.horizonte || 60, 'number', 'min="1" max="365" required') + '</div><label>Feriados e dias fechados (uma data AAAA-MM-DD por linha)<textarea name="feriados" placeholder="2026-12-25">' + esc((v.feriados || []).join('\n')) + '</textarea></label><h3>Bloqueios de agenda</h3><div id="pc-bloqueios">' + (v.bloqueios || []).map(b => bloqueio(b, r.profissionais)).join('') + '</div><button type="button" data-pc-addblock class="pc-secondary">Adicionar bloqueio</button></div><div class="pc-card"><h2>Serviços publicados</h2><p class="pc-muted">Somente os serviços selecionados poderão ser solicitados no app. Defina duração e profissional quando necessário.</p>' + r.servicos.map(s => { const p = v.servicos?.find(a => a.id === String(s.id)); return '<div class="pc-service" data-servico="' + esc(s.id) + '">' + check('publicado', s.nome, !!p) + input('Duração (min)', 'duracao', p?.duracao || 60, 'number', 'min="5" max="720"') + check('mostrarPreco', 'Exibir preço', p?.mostrarPreco) + '<label>Profissional<select name="profissional">' + options(r.profissionais, p?.profissional) + '</select></label></div>'; }).join('') + (r.servicos.length ? '' : '<div class="pc-note">Cadastre um serviço em Meus Itens para publicá-lo aqui.</div>') + '</div><div class="pc-note pc-alert">O portal não faz confirmação automática. Verifique capacidade, bloqueios e duração padrão com sua equipe antes de ativar.</div><div id="pc-config-status" role="status"></div><button type="submit">Salvar configurações</button></form>';
        document.dispatchEvent(new CustomEvent('pethub:config-portal',{detail:{target}}));
    }
    catch (e) {
        erro(target, e);
    } }
    function bloqueio(b, profissionais) { return '<div class="pc-card pc-block"><div class="pc-grid">' + input('Data', 'data', b.data || '', 'date', 'required') + input('Início', 'inicio', b.inicio || '08:00', 'time', 'required') + input('Fim', 'fim', b.fim || '09:00', 'time', 'required') + '<label>Profissional<select name="profissional">' + options(profissionais, b.profissional) + '</select></label></div><button type="button" data-pc-removeblock class="pc-danger">Remover bloqueio</button></div>'; }
    async function petGestor(target, id) { target.classList.add('pc-root'); try {
        const r = await api('/pets/' + id + '/detalhes'), p = r.pet;
        target.innerHTML = '<div class="pc-card"><h2>Dados do PetHub Cliente</h2><p class="pc-muted">Informações complementares fornecidas pelo tutor. Registros profissionais permanecem no prontuário.</p>' + [['Castrado', p.castrado === null ? 'Não informado' : p.castrado ? 'Sim' : 'Não'], ['Alergias informadas', p.alergiasInformadas], ['Restrições', p.restricoes], ['Saúde informada', p.saude], ['Preferências', p.preferencias], ['Observações do tutor', p.observacoesTutor]].filter(([, v]) => v).map(([k, v]) => '<div class="pc-note"><strong>' + k + '</strong><br>' + esc(v) + '</div>').join('') + '<h3>Compartilhar foto com o tutor</h3><form id="pc-photo-form" data-id="' + id + '"><label>Imagem até 8 MB<input type="file" name="arquivo" accept="image/png,image/jpeg,image/webp" required></label><button type="submit">Adicionar à galeria do app</button></form><div class="pc-photos">' + r.fotos.map(f => '<div><img src="' + base() + '/api/cliente-portal/pets/' + id + '/fotos/' + f.id + '/arquivo" alt="Foto compartilhada"><button data-pc-hidephoto="' + f.id + '" data-id="' + id + '" data-visible="' + (!f.visivel) + '" class="pc-secondary">' + (f.visivel ? 'Ocultar no app' : 'Compartilhar novamente') + '</button></div>').join('') + '</div><h3 style="margin-top:20px">Vacinas informadas pelo tutor</h3>' + r.vacinas.filter(v => v.origem !== 'estabelecimento').map(v => '<div class="pc-note"><strong>' + esc(v.nome) + '</strong><br>Aplicação: ' + day(v.data_aplicacao) + ' · Próxima dose: ' + day(v.proxima_dose) + '<br>Responsável informado: ' + esc(v.responsavel || '—') + '<p>' + esc(v.observacoes || '') + '</p>' + (v.comprovante ? '<a target="_blank" rel="noopener" href="' + base() + '/api/cliente-portal/pets/' + id + '/vacinas/' + v.id + '/comprovante">Ver comprovante</a><br>' : '') + (v.conferidaEm ? '<small>Conferido em ' + date(v.conferidaEm) + '</small>' : '<button data-pc-vacina="' + v.id + '" data-id="' + id + '" data-version="' + v.versao + '">Marcar informação como conferida</button>') + '</div>').join('') + '<div role="status" id="pc-pet-status"></div></div>';
        void carregarImagens(target);
    }
    catch (e) {
        erro(target, e);
    } }
    async function avisos(target) { try {
        const r = await api('/avisos');
        target.innerHTML = '<h2>Últimas atualizações do app</h2>' + r.filter(a => a.tipo === 'recuperacao' || a.tipo === 'vacina' || a.tipo === 'cadastro').slice(0, 15).map(a => '<div class="pc-note">' + esc(a.texto) + ' <small>' + date(a.createdAt) + '</small>' + (a.alvo?.clienteId ? '<br><a href="/client-details.html?id=' + a.alvo.clienteId + '">Gerenciar acesso</a>' : '') + (a.alvo?.petId ? '<br><a href="/pets/pet-details.html?id=' + a.alvo.petId + '">Abrir pet</a>' : '') + '</div>').join('');
    }
    catch { } }
    document.addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b || b.disabled)
            return;
        const root = b.closest('.pc-root');
        if (!root)
            return;
        try {
            if (b.hasAttribute('data-pc-filter'))
                await renderPedidos(pedidosTarget, b.dataset.pcFilter === 'abertas');
            if (b.hasAttribute('data-pc-refresh'))
                await renderPedidos(pedidosTarget, pedidosTarget.dataset.abertas === '1');
            if (b.dataset.pcAction) {
                const card = b.closest('[data-pc-pedido]'), p = pedidoRows.find(p => p.id === card.dataset.pcPedido), target = card.querySelector('.pc-action-form'), action = b.dataset.pcAction;
                if (action === 'aceitar') {
                    if (!await confirmar('Confirmar o agendamento solicitado? A disponibilidade será verificada novamente.'))
                        return;
                    b.disabled = true;
                    await api('/solicitacoes/' + p.id + '/acao', { method: 'POST', body: { acao: action, versao: p.versao } });
                    await renderPedidos(pedidosTarget);
                    window.dispatchEvent(new Event('pethub:portal-atualizado'));
                }
                else {
                    let profs = [];
                    if (action === 'propor') {
                        try {
                            profs = (await api('/profissionais')).profissionais;
                        }
                        catch { }
                    }
                    target.innerHTML = '<form class="pc-acao-form" data-id="' + p.id + '" data-action="' + action + '" style="margin-top:15px">' + (action === 'propor' ? '<div class="pc-grid">' + input('Nova data', 'data', p.data, 'date', 'required') + input('Novo horário', 'hora', p.hora, 'time', 'required') + '</div><label>Profissional<select name="profissionalId">' + options(profs) + '</select></label>' : '') + '<label>' + (action === 'propor' ? 'Observação ao tutor' : 'Motivo (opcional)') + '<textarea name="motivo" maxlength="500"></textarea></label><button type="submit">' + (action === 'propor' ? 'Enviar proposta' : 'Confirmar recusa') + '</button><div role="alert"></div></form>';
                }
            }
            if (b.hasAttribute('data-pc-message')) {
                const card = b.closest('[data-pc-pedido]'), p = pedidoRows.find(p => p.id === card.dataset.pcPedido);
                card.querySelector('.pc-action-form').innerHTML = '<form class="pc-message-form" data-ag="' + p.agendamentoId + '" style="margin-top:16px"><label>Mensagem visível ao tutor<textarea name="texto" maxlength="1000" required></textarea></label><button type="submit">Publicar ao tutor</button><div role="alert"></div></form>';
            }
            if (b.dataset.pcBlock) {
                if (!await confirmar('Bloquear o acesso e encerrar todas as sessões deste tutor?'))
                    return;
                b.disabled = true;
                await api('/clientes/' + b.dataset.pcBlock + '/bloquear', { method: 'POST', body: {} });
                await conta(root, b.dataset.pcBlock);
            }
            if (b.hasAttribute('data-pc-addblock'))
                $('#pc-bloqueios').insertAdjacentHTML('beforeend', bloqueio({}, configRows.profissionais));
            if (b.hasAttribute('data-pc-removeblock'))
                b.closest('.pc-block').remove();
            if (b.dataset.pcHidephoto) {
                await api('/pets/' + b.dataset.id + '/fotos/' + b.dataset.pcHidephoto + '/visibilidade', { method: 'POST', body: { visivel: b.dataset.visible === 'true' } });
                await petGestor(root, b.dataset.id);
            }
            if (b.dataset.pcVacina) {
                if (!await confirmar('Confirme que você conferiu os dados e o comprovante. Isso não declara imunidade nem altera o prontuário.'))
                    return;
                await api('/pets/' + b.dataset.id + '/vacinas/' + b.dataset.pcVacina + '/conferir', { method: 'POST', body: { versao: Number(b.dataset.version) } });
                await petGestor(root, b.dataset.id);
            }
        }
        catch (err) {
            const msg = root.querySelector('#pc-pedidos-status,#pc-convite,#pc-pet-status') || root;
            erro(msg, err);
        }
        finally {
            if (b.isConnected)
                b.disabled = false;
        }
    });
    const $ = s => document.querySelector(s);
    const confirmar = texto => window.confirmar ? window.confirmar(texto) : Promise.resolve(window.confirm(texto));
    document.addEventListener('submit', async (e) => {
        const f = e.target;
        if (!f.matches('#pc-conta-form,#pc-config-form,.pc-acao-form,#pc-photo-form,.pc-message-form'))
            return;
        e.preventDefault();
        if (f.dataset.busy)
            return;
        f.dataset.busy = '1';
        const btn = f.querySelector('[type=submit]');
        if (btn)
            btn.disabled = true;
        try {
            const b = Object.fromEntries(new FormData(f));
            if (f.id === 'pc-conta-form') {
                if (!await confirmar('Gerar um novo convite? Isso encerra sessões e substitui a senha anterior, se houver.'))
                    return;
                const r = await api('/clientes/' + f.dataset.id + '/convite', { method: 'POST', body: { email: b.email } });
                $('#pc-convite').innerHTML = '<div class="pc-note"><strong>Convite gerado</strong><p>' + esc(r.entrega) + '</p><label>Copie e compartilhe diretamente com o tutor<input readonly value="' + esc(base() + r.convite) + '" aria-label="Link do convite"></label><small>Expira em ' + date(r.expiraEm) + '. Não publique este link em grupos.</small></div>';
            }
            if (f.id === 'pc-config-form') {
                const data = new FormData(f), get = k => Number(data.get(k)), val = k => data.get(k), cfg = configRows.config;
                const rules = { dias: [0, 1, 2, 3, 4, 5, 6].filter(i => data.has('dia' + i)), inicio: val('inicio'), fim: val('fim'), intervalo: get('intervalo'), capacidade: get('capacidade'), duracaoPadrao: get('duracaoPadrao'), antecedencia: get('antecedencia'), horizonte: get('horizonte'), feriados: String(val('feriados') || '').split(/\s+/).filter(Boolean), bloqueios: [...f.querySelectorAll('.pc-block')].map(el => ({ data: el.querySelector('[name=data]').value, inicio: el.querySelector('[name=inicio]').value, fim: el.querySelector('[name=fim]').value, profissional: Number(el.querySelector('[name=profissional]').value) || null })), servicos: [...f.querySelectorAll('[data-servico]')].filter(el => el.querySelector('[name=publicado]').checked).map(el => ({ id: el.dataset.servico, duracao: Number(el.querySelector('[name=duracao]').value), mostrarPreco: el.querySelector('[name=mostrarPreco]').checked, profissional: Number(el.querySelector('[name=profissional]').value) || null })) };
                const savedConfig = await api('/config', { method: 'PUT', body: { ativo: data.has('ativo'), receber_pedidos: data.has('receber_pedidos'), notificar_gestor: data.has('notificar_gestor'), push_tutor: data.has('push_tutor'), regras: rules, revisao: cfg.revisao } });
                configRows.config = savedConfig;
                document.getElementById('pc-config-status').textContent = 'Acesso e agenda salvos.';
                document.dispatchEvent(new CustomEvent('pethub:config-salva', { detail: { form: f } }));
            }
            if (f.classList.contains('pc-acao-form')) {
                const p = pedidoRows.find(p => p.id === f.dataset.id);
                await api('/solicitacoes/' + p.id + '/acao', { method: 'POST', body: { acao: f.dataset.action, versao: p.versao, motivo: b.motivo, ...(f.dataset.action === 'propor' ? { data: b.data, hora: b.hora, profissionalId: b.profissionalId || null } : {}) } });
                await renderPedidos(pedidosTarget);
                window.dispatchEvent(new Event('pethub:portal-atualizado'));
            }
            if (f.id === 'pc-photo-form') {
                await api('/pets/' + f.dataset.id + '/fotos', { method: 'POST', body: new FormData(f) });
                await petGestor(f.closest('.pc-root'), f.dataset.id);
            }
            if (f.classList.contains('pc-message-form')) {
                await api('/agendamentos/' + f.dataset.ag + '/comunicado', { method: 'PUT', body: { texto: b.texto } });
                f.innerHTML = '<div class="pc-note">Mensagem publicada ao tutor.</div>';
            }
        }
        catch (err) {
            const node = f.querySelector('[role=alert]') || f.closest('.pc-root').querySelector('#pc-config-status,#pc-convite,#pc-pet-status') || f;
            erro(node, err);
        }
        finally {
            delete f.dataset.busy;
            if (btn?.isConnected)
                btn.disabled = false;
        }
    });
    window.PortalERP = { api, renderPedidos, conta, configuracao, petGestor, avisos };
    function init() { const id = new URL(location.href).searchParams.get('id'); if ($('#pethub-cliente-tab') && id)
        void conta($('#pethub-cliente-tab'), id); if ($('#pc-config'))
        void configuracao($('#pc-config')); if ($('#pc-pedidos')) {
        void renderPedidos($('#pc-pedidos'));
        void avisos($('#pc-avisos'));
    } if ($('#pc-pet-erp')) {
        const q = new URL(location.href).searchParams, petid = q.get('pet_id') || id;
        if (petid)
            void petGestor($('#pc-pet-erp'), petid);
    } }
    window.addEventListener('pethub:portal-atualizado', () => { if (pedidosTarget?.isConnected && !pedidosTarget.querySelector('form'))
        void renderPedidos(pedidosTarget, pedidosTarget.dataset.abertas === '1'); });
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init);
    else
        init();
})();
