(function () {
    'use strict';
    const $ = s => document.querySelector(s), api = window.ClienteAPI.request, main = $('#conteudo'), modal = $('#modal');
    const paths = { home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z', pets: 'M8 14c-2 1-4 4-2 6s4 0 6 0 4 2 6 0 0-5-2-6c-2-3-6-3-8 0ZM5 7v2m5-5v3m4-3v3m5 0v2', calendar: 'M5 5h14v16H5ZM8 3v4m8-4v4M5 10h14m-10 4h2m3 0h2m-7 3h2', history: 'M3 11a9 9 0 1 1 3 8M3 5v6h6m3-4v5l4 2', user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2', bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14m-6-6 6 6-6 6', heart: 'M12 21 3 12C-2 4 7 0 12 7c5-7 14-3 9 5Z', photo: 'M3 6h5l2-3h4l2 3h5v15H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', check: 'm5 12 4 4L19 6', shield: 'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7Z', logout: 'M10 4H4v16h6m4-12 4 4-4 4m-5-4h9' };
    const icon = (k) => '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="' + (paths[k] || paths.pets) + '"/></svg>';
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const date = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d.split('-').reverse().join('/') : 'Não informada';
    const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const when = (d, h) => date(d) + (h ? ' · ' + h : '');
    const time = d => d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '';
    const money = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const states = { PENDENTE: 'Em análise', PROPOSTA: 'Novo horário sugerido', PROPOSTA_RECUSADA: 'Proposta recusada', CONFIRMADA: 'Confirmada', RECUSADA: 'Não aprovada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada', agendado: 'Confirmado', checkin: 'No estabelecimento', pronto: 'Pronto para retirada', concluido: 'Concluído', cancelado: 'Cancelado' };
    const pill = s => '<span class="pill ' + (['CONFIRMADA', 'agendado', 'pronto', 'concluido'].includes(s) ? 'ok' : ['PENDENTE', 'PROPOSTA', 'checkin'].includes(s) ? 'wait' : ['RECUSADA', 'CANCELADA', 'cancelado', 'EXPIRADA'].includes(s) ? 'bad' : '') + '">' + esc(states[s] || s) + '</span>';
    let session = null, pets = [], appointments = [], requests = [], services = [], notifications = { itens: [], naoLidas: 0 }, tab = 'home', eventsource, poll, refreshing = false, revision = '', installPrompt, registration, bookingKey, authBusy = false;
    let loja = new URL(location.href).searchParams.get('loja') || '';
    try {
        loja = loja || localStorage.getItem('pethub-cliente-loja') || '';
    }
    catch { }
    let invite = new URLSearchParams(location.hash.slice(1)).get('convite');
    if (invite)
        history.replaceState(null, '', location.pathname + (loja ? '?loja=' + encodeURIComponent(loja) : ''));
    function toast(text) { $('#aviso').textContent = text; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#aviso').textContent = '', 6500); }
    function empty(text, k = 'pets') { return '<div class="empty">' + icon(k) + esc(text) + '</div>'; }
    function field(label, name, value = '', type = 'text', extra = '') { return '<label>' + esc(label) + '<input name="' + name + '" type="' + type + '" value="' + esc(value) + '" ' + extra + '></label>'; }
    function select(label, name, options, value = '', extra = '') { return '<label>' + esc(label) + '<select name="' + name + '" ' + extra + '>' + options.map(o => '<option value="' + esc(o.value) + '" ' + (String(o.value) === String(value) ? 'selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select></label>'; }
    function textArea(label, name, value = '', max = 1000) { return '<label>' + esc(label) + '<textarea name="' + name + '" maxlength="' + max + '">' + esc(value) + '</textarea></label>'; }
    function errorIn(form, e) { let node = form.querySelector('[role=alert]'); if (!node) {
        node = document.createElement('p');
        node.className = 'inline-error';
        node.setAttribute('role', 'alert');
        form.append(node);
    } node.textContent = e.message || 'Não foi possível concluir.'; }
    async function submitting(form, work) { if (form.dataset.busy)
        return; form.dataset.busy = '1'; const btn = form.querySelector('[type=submit]'); if (btn)
        btn.disabled = true; try {
        await work();
    }
    catch (e) {
        errorIn(form, e);
    }
    finally {
        delete form.dataset.busy;
        if (btn)
            btn.disabled = false;
    } }
    function open(title, html) { $('#modal-titulo').textContent = title; $('#modal-corpo').innerHTML = html; if (!modal.open)
        modal.showModal(); }
    $('#fechar-modal').onclick = () => modal.close();
    modal.addEventListener('click', e => { if (e.target === modal) {
        const r = modal.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
            modal.close();
    } });
    function avatar(p, large = false) { return p.foto ? '<img class="avatar ' + (large ? 'large' : '') + '" src="' + esc(p.foto) + '" alt="Foto de ' + esc(p.nome) + '" loading="lazy">' : '<span class="avatar ' + (large ? 'large' : '') + '">' + icon('pets') + '</span>'; }
    function idade(d) { if (!d)
        return 'Idade não informada'; const fim = today().split('-').map(Number), n = d.split('-').map(Number); let meses = (fim[0] - n[0]) * 12 + fim[1] - n[1] - (fim[2] < n[2] ? 1 : 0); if (meses < 0)
        return 'Recém-nascido'; if (meses < 12)
        return meses + ' mês(es)'; return Math.floor(meses / 12) + ' ano(s)' + (meses % 12 ? ' e ' + meses % 12 + ' mês(es)' : ''); }
    function petName(id) { return pets.find(p => p.id === Number(id))?.nome || 'Pet'; }
    function nav() { const tabs = [['home', 'Início'], ['pets', 'Meus Pets'], ['booking', 'Agendar'], ['history', 'Histórico'], ['profile', 'Perfil']]; $('#navegacao').innerHTML = tabs.map(([id, label]) => '<button data-tab="' + id + '" class="' + (tab === id ? 'active' : '') + '" ' + (tab === id ? 'aria-current="page"' : '') + '>' + icon(id === 'booking' ? 'calendar' : id === 'profile' ? 'user' : id) + label + '</button>').join(''); $('#navegacao').hidden = false; $('#sino').hidden = false; $('#sino').innerHTML = icon('bell') + (notifications.naoLidas ? '<span class="badge-count">' + Math.min(notifications.naoLidas, 99) + '</span>' : ''); }
    function petCards() { return pets.length ? '<div class="grid pets">' + pets.map(p => '<button class="card pet" data-pet="' + p.id + '">' + avatar(p) + '<div class="pet-meta"><h3>' + esc(p.nome) + '</h3><small>' + esc(p.raca || p.especie || 'Meu companheiro') + '</small>' + (p.ativo ? '' : '<br><small>Cadastro inativo</small>') + '</div></button>').join('') + '</div>' : empty('Seu novo companheiro pode começar por aqui. Cadastre seu primeiro pet.'); }
    function appointmentCard(a) { return '<article class="card"><div class="row between"><div><h3>' + esc(petName(a.petId)) + '</h3><small>' + when(a.data, a.hora) + '</small></div>' + pill(a.status) + '</div><p>' + esc(a.servico) + '</p>' + (a.profissional ? '<small>Profissional: ' + esc(a.profissional) + '</small>' : '') + (a.comunicado ? '<div class="note">' + esc(a.comunicado) + '</div>' : '') + '<span class="hint">' + esc(session.loja.nome) + '</span></article>'; }
    function requestCards() { return requests.length ? requests.map(p => '<article class="card"><div class="row between"><h3>' + esc(petName(p.petId)) + '</h3>' + pill(p.estado) + '</div><p>' + esc(p.servico) + '<br><small>Solicitado: ' + when(p.data, p.hora) + '</small></p>' + (p.motivo ? '<div class="note">' + esc(p.motivo) + '</div>' : '') + (p.estado === 'PROPOSTA' && p.proposta ? '<div class="note warning"><strong>Proposta do pet shop</strong><br>' + when(p.proposta.data, p.proposta.hora) + '<br>' + esc(p.proposta.observacao || '') + '<span class="hint">Válida até ' + time(p.proposta.expiraEm) + '. O horário será verificado novamente ao aceitar.</span></div><div class="actions"><button class="btn small" data-request="' + p.id + '" data-action="aceitar_proposta">Aceitar novo horário</button><button class="btn secondary small" data-request="' + p.id + '" data-action="recusar_proposta">Recusar proposta</button></div>' : '') + (['PENDENTE', 'PROPOSTA', 'PROPOSTA_RECUSADA'].includes(p.estado) ? '<button class="link-btn" data-request="' + p.id + '" data-action="cancelar">Cancelar solicitação</button>' : '') + (p.estado === 'CONFIRMADA' ? '<div class="hint">Acompanhe o atendimento no Histórico. Para alterar ou cancelar, contate o estabelecimento.</div>' : '') + '</article>').join('') : empty('Nenhuma solicitação por aqui ainda.', 'calendar'); }
    function home() { const future = appointments.filter(a => ['agendado', 'checkin', 'pronto'].includes(a.status) && a.data >= today()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)); return '<section class="hero"><div class="hero-copy"><span class="eyebrow">' + esc(session.loja.nome) + '</span><h1>Olá, ' + esc(session.perfil.nome.split(' ')[0]) + '!</h1><p>Um espaço só seu.<br>E de quem deixa sua vida mais feliz.</p><button class="btn dark" data-tab="booking">Agendar cuidado ' + icon('arrow') + '</button></div><img src="/cliente-app/assets/boas-vindas.webp" alt="Mascote PetHub dando boas-vindas"></section><div class="section-heading"><h2>O próximo encontro</h2>' + icon('calendar') + '</div>' + (future[0] ? '<div class="next card"><div class="row">' + avatar(pets.find(p => p.id === future[0].petId) || { nome: 'Pet' }) + '<div><h3>' + esc(petName(future[0].petId)) + '</h3>' + esc(future[0].servico) + '<br><small>' + when(future[0].data, future[0].hora) + '</small><br>' + pill(future[0].status) + '</div></div></div>' : '<div class="card">' + empty('Que tal reservar um momento de cuidado? Solicite um horário para seu pet.', 'calendar') + '<button class="btn wide" data-tab="booking">Solicitar agendamento</button></div>') + '<div class="grid three"><button class="quick" data-tab="requests">' + icon('calendar') + 'Meus pedidos</button><button class="quick" data-tab="pets">' + icon('heart') + 'Saúde e vacinas</button><button class="quick" data-tab="history">' + icon('history') + 'Atendimentos</button></div><div class="section-heading"><h2>Meus companheiros</h2><button class="link-btn" data-newpet>Adicionar</button></div>' + petCards() + '<div class="section-heading"><h2>Novidades para você</h2><button class="link-btn" data-tab="notifications">Ver todas</button></div>' + notificationCards(notifications.itens.slice(0, 3)); }
    function notificationCards(rows) { return rows.length ? rows.map(n => '<article class="card ' + (!n.lida ? 'unread' : '') + '"><h3>' + esc(n.titulo) + '</h3><p>' + esc(n.texto) + '</p><small>' + time(n.criadoEm) + '</small></article>').join('') : empty('Quando houver uma atualização, ela aparecerá aqui.', 'bell'); }
    function history() { return '<span class="eyebrow">Cada cuidado conta</span><h1>Uma história de carinho</h1><p class="muted">Atendimentos reais registrados no ' + esc(session.loja.nome) + '.</p><div class="chips"><button class="chip" data-tab="requests">Solicitações do app</button></div>' + select('Filtrar por pet', 'history-pet', [{ value: '', label: 'Todos os pets' }, ...pets.map(p => ({ value: p.id, label: p.nome }))]) + '<div class="timeline" id="history-list" style="margin-top:20px">' + (appointments.length ? appointments.map(appointmentCard).join('') : empty('O primeiro atendimento registrado aparecerá aqui.', 'history')) + '</div>'; }
    function profile() { const p = session.perfil; return '<span class="eyebrow">Do seu jeito</span><h1>Meu perfil</h1><form id="profile-form" data-etag="' + esc(p.etag) + '" class="card form">' + field('Nome', 'nome', p.nome, 'text', 'required maxlength="200" autocomplete="name"') + field('Telefone', 'telefone', p.telefone, 'tel', 'maxlength="30" autocomplete="tel"') + '<div class="form-grid">' + field('CEP', 'cep', p.cep, 'text', 'maxlength="10" inputmode="numeric" autocomplete="postal-code"') + field('Cidade', 'cidade', p.cidade, 'text', 'maxlength="200"') + select('Estado (UF)','estado',[{value:'',label:'Não informado'},...'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO'.split('|').map(value=>({value,label:value}))],p.estado||'') + '</div>' + field('Endereço', 'endereco', p.endereco, 'text', 'maxlength="200" autocomplete="street-address"') + '<div class="form-grid">' + field('Número', 'numero', p.numero, 'text', 'maxlength="30"') + field('Complemento', 'complemento', p.complemento, 'text', 'maxlength="100"') + '</div>' + field('Bairro', 'bairro', p.bairro, 'text', 'maxlength="100"') + '<small>E-mail de acesso: ' + esc(p.emailAcesso) + '. Para alterá-lo, fale com o estabelecimento.</small><button type="submit" class="btn">Salvar meus dados</button></form><div class="card"><h2>Seu pet shop</h2>' + (session.loja.logo ? '<img class="avatar" src="/api/cliente-app/loja/logo" alt="Logo do estabelecimento">' : '') + '<h3>' + esc(session.loja.nome) + '</h3><p>' + esc(session.loja.endereco || '') + '</p>' + (session.loja.telefone ? '<a class="btn secondary" href="tel:' + esc(session.loja.telefone.replace(/[^+0-9]/g, '')) + '">Ligar para o estabelecimento</a>' : '') + '<p class="muted">' + esc(session.loja.expediente || 'Horários sujeitos à confirmação do estabelecimento.') + '</p></div><div class="card"><h2>PetHub sempre com você</h2><p class="muted">Instale este aplicativo na sua tela inicial.</p><button class="btn secondary" data-install>Como instalar</button><div class="divider"></div><h3>Fique por dentro</h3><p class="muted">Os avisos ficam salvos no app. Ative também as notificações do aparelho.</p><div class="actions"><button class="btn secondary" data-push>Ativar notificações</button><button class="link-btn" data-unpush>Desativar neste aparelho</button></div></div><button class="btn danger wide" data-logout>' + icon('logout') + ' Sair da minha conta</button><p class="hint">Seus registros continuam seguros no estabelecimento. Ao sair, o push deste dispositivo é desativado.</p>'; }
    function booking() { if (!session.loja.receberPedidos)
        return '<h1>Novos cuidados</h1><div class="card">' + empty('O estabelecimento não está recebendo solicitações pelo app no momento. Entre em contato.', 'calendar') + '</div><button class="btn secondary" data-tab="profile">Ver contato</button>'; if (!pets.some(p => p.ativo))
        return '<h1>Vamos agendar?</h1>' + empty('Cadastre um pet para solicitar um horário.') + '<button class="btn" data-newpet>Adicionar meu pet</button>'; if (!services.length)
        return '<h1>Vamos agendar?</h1>' + empty('O estabelecimento ainda não publicou serviços para agendamento.', 'calendar'); return '<span class="eyebrow">Um cuidado especial</span><h1>Vamos marcar?</h1><p class="muted">Envie sua preferência. A equipe confirma o atendimento.</p><form id="booking-form" class="card form"><div class="step">01 · Quem vem nos visitar?</div>' + select('Seu pet', 'petId', pets.filter(p => p.ativo).map(p => ({ value: p.id, label: p.nome }))) + '<div class="step">02 · Qual cuidado?</div>' + select('Serviço', 'servicoId', services.map(s => ({ value: s.id, label: s.nome }))) + '<div id="service-info" class="hint"></div><div class="step">03 · Melhor dia e horário</div>' + field('Data desejada', 'data', '', 'date', 'required min="' + today() + '"') + '<div id="slots" aria-live="polite" class="hint">Escolha uma data para consultar os horários.</div>' + field('Horário solicitado', 'hora', '', 'time', 'required') + '<div class="step">04 · Algo que precisamos saber?</div>' + textArea('Observação opcional', 'observacao', '', '1000') + '<div class="note warning">O pedido só entra na agenda após a aprovação. Preço e duração são estimados. Se a equipe propuser outro horário, você precisará aceitar.</div><button type="submit" class="btn wide">Revisar solicitação ' + icon('arrow') + '</button></form>'; }
    function render() { if (!session)
        return; nav(); if (tab === 'home')
        main.innerHTML = home();
    else if (tab === 'pets')
        main.innerHTML = '<span class="eyebrow">Seu pequeno universo</span><div class="row between"><h1>Meus Pets</h1><button class="btn small" data-newpet>' + icon('plus') + ' Novo pet</button></div><p class="muted">Perfis, fotos e uma história de cuidado.</p>' + petCards();
    else if (tab === 'booking') {
        main.innerHTML = booking();
        serviceInfo();
    }
    else if (tab === 'history')
        main.innerHTML = history();
    else if (tab === 'profile')
        main.innerHTML = profile();
    else if (tab === 'requests')
        main.innerHTML = '<span class="eyebrow">Você e o pet shop, em sintonia</span><h1>Meus pedidos</h1><button class="btn small" data-tab="booking">' + icon('plus') + ' Nova solicitação</button><p class="muted">Acompanhe respostas e aceite novos horários.</p>' + requestCards();
    else if (tab === 'notifications')
        main.innerHTML = '<div class="row between"><h1>Suas novidades</h1><button class="link-btn" data-read>Marcar como lidas</button></div>' + notificationCards(notifications.itens); }
    async function refresh({ redraw = true } = {}) { if (refreshing || !session || !navigator.onLine)
        return; refreshing = true; try {
        const [p, a, r, s, n, sess] = await Promise.all([api('/pets'), api('/agendamentos'), api('/solicitacoes'), api('/servicos'), api('/notificacoes'), api('/sessao')]);
        session = sess;
        pets = p;
        appointments = a;
        requests = r;
        services = s;
        notifications = n;
        nav();
        if (redraw && !modal.open && !main.contains(document.activeElement.closest?.('form')))
            render();
    }
    catch (e) {
        if (e.status === 401 || e.status === 403)
            loggedOut();
        else
            toast('Não foi possível atualizar. Seus dados não foram alterados.');
    }
    finally {
        refreshing = false;
    } }
    function live() { eventsource?.close(); clearInterval(poll); eventsource = new EventSource('/api/cliente-app/eventos'); eventsource.onmessage = e => { try {
        const d = JSON.parse(e.data);
        if (revision && revision !== d.revisao)
            void refresh();
        revision = d.revisao;
    }
    catch { } }; poll = setInterval(() => { if (!document.hidden)
        void refresh(); }, 30000); }
    async function startSession() { try {
        session = await api('/sessao');
        loja = session.loja.slug;
        try {
            localStorage.setItem('pethub-cliente-loja', loja);
        }
        catch { }
        await refresh({ redraw: false });
        render();
        live();
    }
    catch {
        showAuth();
    } }
    function loggedOut() { session = null; pets = []; appointments = []; requests = []; notifications = { itens: [], naoLidas: 0 }; window.ClienteAPI.limpar(); eventsource?.close(); clearInterval(poll); modal.close(); showAuth(); }
    async function showAuth(mode = invite ? 'invite' : 'login') { if (authBusy)
        return; $('#navegacao').hidden = true; $('#sino').hidden = true; let nome = 'Seu pet shop, mais perto de você'; if (loja && /^[a-f0-9-]{36}$/i.test(loja))
        try {
            nome = (await api('/loja/' + loja)).nome;
        }
        catch { } const isInvite = mode === 'invite', isRecovery = mode === 'recovery'; main.innerHTML = '<section class="auth"><div class="hero"><div class="hero-copy"><span class="eyebrow">PetHub Cliente</span><h1>Cuidado que conecta.</h1><small>' + esc(nome) + '</small></div><img src="/cliente-app/assets/boas-vindas.webp" alt="Mascote PetHub"></div><div class="card"><h2>' + (isInvite ? 'Bem-vindo ao seu espaço' : isRecovery ? 'Recuperar meu acesso' : 'Bom ter você por aqui') + '</h2><p class="muted">' + (isInvite ? 'Defina sua senha pessoal para começar.' : isRecovery ? 'A recuperação é feita com a equipe do seu pet shop.' : 'Acesse os cuidados de quem é parte da sua família.') + '</p><form id="auth-form" data-mode="' + mode + '" class="form">' + (isInvite ? '' : (!loja ? field('Código do estabelecimento (no convite)', 'loja', '', 'text', 'required maxlength="36"') : '') + field('E-mail de acesso', 'email', '', 'email', 'required maxlength="254" autocomplete="username"')) + (isRecovery ? '' : field(isInvite ? 'Crie uma senha com letras e números' : 'Sua senha', 'senha', '', 'password', 'required ' + (isInvite ? 'minlength="10" autocomplete="new-password"' : 'autocomplete="current-password"'))) + (isInvite ? field('Repita sua senha', 'confirmar', '', 'password', 'required minlength="10" autocomplete="new-password"') + '<small>Mínimo de 10 caracteres com letras e números. Máximo de 72 bytes.</small>' : '') + '<button class="btn wide" type="submit">' + (isInvite ? 'Ativar meu acesso' : isRecovery ? 'Solicitar recuperação' : 'Entrar no meu espaço') + '</button></form><button class="link-btn" data-auth="' + (isRecovery ? 'login' : 'recovery') + '">' + (isRecovery ? 'Voltar ao acesso' : 'Esqueci minha senha') + '</button></div><p class="hint">Ainda não tem acesso? Peça ao estabelecimento um convite para o PetHub Cliente.</p><button class="link-btn" data-install>Como instalar no meu celular</button></section>'; }
    function petForm(p = {}) { const opts = (arr) => [{ value: '', label: 'Não informado' }, ...arr.map(v => ({ value: v, label: v }))]; return '<form id="pet-form" data-id="' + (p.id || '') + '" data-etag="' + esc(p.etag || '') + '" class="form">' + field('Nome', 'nome', p.nome, 'text', 'required maxlength="100"') + '<div class="form-grid">' + field('Espécie', 'especie', p.especie, 'text', 'required maxlength="120" placeholder="Ex.: Cão"') + field('Raça', 'raca', p.raca, 'text', 'maxlength="120"') + select('Sexo', 'genero', opts(['Macho', 'Fêmea']), p.genero) + field('Nascimento', 'data_nascimento', p.data_nascimento, 'date', 'max="' + today() + '"') + field('Peso (kg)', 'peso', p.peso, 'number', 'min="0.01" max="1500" step="0.01"') + select('Porte', 'porte', opts(['Pequeno', 'Médio', 'Grande', 'Gigante']), p.porte) + field('Cor', 'cor', p.cor, 'text', 'maxlength="120"') + field('Pelagem', 'pelagem', p.pelagem, 'text', 'maxlength="120"') + '</div>' + select('Castrado', 'castrado', [{ value: '', label: 'Não informado' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }], p.castrado === true ? 'sim' : p.castrado === false ? 'nao' : '') + '<div class="note">As informações abaixo são identificadas como fornecidas por você. Não alteram observações profissionais do estabelecimento.</div>' + textArea('Alergias informadas', 'alergiasInformadas', p.alergiasInformadas) + textArea('Restrições', 'restricoes', p.restricoes) + textArea('Informações de saúde', 'saude', p.saude) + textArea('Preferências de atendimento', 'preferencias', p.preferencias) + textArea('Observações do tutor', 'observacoesTutor', p.observacoesTutor) + '<button class="btn" type="submit">Salvar perfil do pet</button></form>'; }
    async function petDetail(id, area = 'profile') {
        const p = pets.find(p => p.id === Number(id));
        if (!p)
            return;
        open(p.nome, '<div class="row">' + avatar(p, true) + '<div><h2>' + esc(p.nome) + '</h2><small>' + esc(p.raca || p.especie) + '</small></div></div><div class="chips">' + [['profile', 'Perfil'], ['photos', 'Galeria'], ['health', 'Saúde e vacinas'], ['journey', 'Jornada']].map(([a, l]) => '<button class="chip ' + (area === a ? 'selected' : '') + '" data-pet-area="' + a + '" data-id="' + p.id + '">' + l + '</button>').join('') + '</div><div id="pet-area"></div>');
        const target = $('#pet-area');
        if (area === 'profile') {
            target.innerHTML = '<div class="statline"><span>' + esc(p.genero || 'Sexo não informado') + '</span><span>' + esc(p.porte || 'Porte não informado') + '</span><span>' + esc(p.peso ? Number(p.peso) + ' kg' : 'Peso não informado') + '</span><span>' + esc(p.data_nascimento ? 'Nascimento: ' + date(p.data_nascimento) + ' · ' + idade(p.data_nascimento) : 'Nascimento não informado') + '</span></div>' + [['Alergias informadas', p.alergiasInformadas], ['Restrições', p.restricoes], ['Saúde informada', p.saude], ['Preferências', p.preferencias], ['Observações do tutor', p.observacoesTutor]].filter(([, v]) => v).map(([l, v]) => '<div class="note"><strong>' + l + '</strong><p>' + esc(v) + '</p></div>').join('') + '<button class="btn secondary" data-editpet="' + p.id + '">Editar perfil</button>';
            return;
        }
        try {
            if (area === 'photos') {
                const rows = await api('/pets/' + id + '/fotos');
                if (!target.isConnected)
                    return;
                target.innerHTML = '<form id="photo-form" data-id="' + id + '" class="form card"><label>Uma nova lembrança<input name="arquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required></label><small>Até 8 MB. A imagem será otimizada e armazenada com acesso privado.</small><button class="btn small" type="submit">Adicionar à galeria</button></form><div class="photos">' + rows.map(f => '<div class="photo-wrap"><button data-fullphoto="' + esc(f.arquivo) + '"><img src="' + esc(f.arquivo) + '" alt="Foto de ' + esc(p.nome) + '" loading="lazy"></button><small>' + esc(f.origem === 'tutor' ? 'Enviada por você' : 'Compartilhada pelo pet shop') + '</small><div class="actions"><button class="link-btn" data-foto="' + f.id + '" data-petid="' + id + '" data-action="principal">Usar no perfil</button>' + (f.minha ? '<button class="link-btn" data-foto="' + f.id + '" data-petid="' + id + '" data-action="remover">Remover</button>' : '') + '</div></div>').join('') + '</div>' + (rows.length ? '' : empty('As fotos da galeria vão aparecer aqui.', 'photo'));
            }
            if (area === 'health') {
                const rows = await api('/pets/' + id + '/vacinas');
                if (!target.isConnected)
                    return;
                target.innerHTML = '<div class="note warning">Esta carteira organiza informações. Ela não confirma proteção clínica. Consulte um veterinário para validar aplicações e reforços.</div><button class="btn small" data-newvacina="' + id + '">' + icon('plus') + ' Informar vacina</button><div style="margin-top:20px">' + rows.map(v => { const status = !v.data_aplicacao ? 'Informação incompleta' : v.proxima_dose ? (v.proxima_dose < today() ? 'Data de reforço ultrapassada' : 'Próxima dose: ' + date(v.proxima_dose)) : 'Próxima dose não informada'; return '<article class="card"><h3>' + esc(v.nome) + '</h3><span class="pill">' + esc(v.origem === 'estabelecimento' ? 'Registro do estabelecimento' : v.origem === 'tutor_conferida' ? 'Informado pelo tutor · conferido' : 'Informado pelo tutor · não verificado') + '</span><p>Aplicação: ' + date(v.data_aplicacao) + '<br>Responsável: ' + esc(v.responsavel || 'Não informado') + '</p><div class="note ' + (v.proxima_dose && v.proxima_dose < today() ? 'warning' : '') + '">' + esc(status) + '</div>' + (v.observacoes ? '<p>' + esc(v.observacoes) + '</p>' : '') + (v.comprovante ? '<a target="_blank" rel="noopener" href="/api/cliente-app/pets/' + id + '/vacinas/' + v.id + '/comprovante">Ver comprovante</a>' : '') + (v.minha && !v.conferidaEm ? '<form class="proof-form form" data-id="' + id + '" data-vid="' + v.id + '"><label>Comprovante (imagem ou PDF)<input name="arquivo" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><button class="btn secondary small" type="submit">Enviar comprovante</button></form>' : '') + '</article>'; }).join('') + (rows.length ? '' : empty('Nenhum registro de vacina encontrado.', 'heart')) + '</div>';
            }
            if (area === 'journey') {
                const [f, v] = await Promise.all([api('/pets/' + id + '/fotos'), api('/pets/' + id + '/vacinas')]);
                if (!target.isConnected)
                    return;
                const events = [...(p.criadoEm ? [{ date: p.criadoEm.slice(0, 10), label: 'Cadastro do pet', detail: 'Início da jornada no estabelecimento' }] : []), ...appointments.filter(a => a.petId === Number(id)).map(a => ({ date: a.data, label: a.servico, detail: states[a.status] })), ...f.map(f => ({ date: f.criadoEm.slice(0, 10), label: 'Foto adicionada', detail: f.origem === 'tutor' ? 'Por você' : 'Pelo estabelecimento' })), ...v.filter(v => v.data_aplicacao).map(v => ({ date: v.data_aplicacao, label: v.nome, detail: v.origem === 'estabelecimento' ? 'Registro profissional' : 'Informação fornecida pelo tutor' }))].sort((a, b) => b.date.localeCompare(a.date));
                target.innerHTML = '<h3>A jornada de ' + esc(p.nome) + '</h3><div class="timeline">' + events.map(e => '<article class="card"><small>' + date(e.date) + '</small><h3>' + esc(e.label) + '</h3><small>' + esc(e.detail) + '</small></article>').join('') + '</div>' + (events.length ? '' : empty('A jornada será construída com os registros de ' + p.nome + '.', 'history'));
            }
        }
        catch (e) {
            target.textContent = e.message;
        }
    }
    function vaccineForm(id) { return '<form id="vaccine-form" data-id="' + id + '" class="form"><div class="note">Registro informado por você. O estabelecimento poderá conferir o comprovante.</div>' + field('Nome da vacina', 'nome', '', 'text', 'required maxlength="120"') + field('Data da aplicação', 'data_aplicacao', '', 'date', 'max="' + today() + '"') + '<div class="form-grid">' + field('Próxima dose registrada', 'proxima_dose', '', 'date') + field('Validade informada', 'validade', '', 'date') + '</div>' + field('Clínica ou profissional responsável', 'responsavel', '', 'text', 'maxlength="120"') + textArea('Observações', 'observacoes') + '<small>Informe somente as datas orientadas pelo profissional. O app não calcula calendário veterinário.</small><button class="btn" type="submit">Salvar registro</button></form>'; }
    let slotsVersion = 0;
    async function loadSlots() { const form = $('#booking-form'); if (!form)
        return; const b = Object.fromEntries(new FormData(form)), target = $('#slots'), my = ++slotsVersion; if (!b.data)
        return; target.textContent = 'Consultando horários…'; try {
        const r = await api('/horarios?' + new URLSearchParams({ petId: b.petId, servicoId: b.servicoId, data: b.data }));
        if (my !== slotsVersion || !target.isConnected)
            return;
        target.innerHTML = '<p>' + esc(r.mensagem) + '</p><div class="chips">' + r.horarios.map(h => '<button type="button" class="chip" data-hour="' + h + '">' + h + '</button>').join('') + '</div>' + (r.horarios.length ? '' : '<p>Nenhuma opção disponível. Você pode enviar uma preferência para avaliação ou escolher outra data.</p>');
    }
    catch (e) {
        if (my === slotsVersion && target.isConnected)
            target.textContent = e.message;
    } }
    function serviceInfo() { const f = $('#booking-form'); if (!f)
        return; const s = services.find(s => s.id === f.elements.servicoId.value); $('#service-info').textContent = s ? (s.duracao + ' min estimados' + (s.preco !== null ? ' · ' + money(s.preco) : '')) : ''; }
    async function push() { if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
        throw new Error('Este navegador não oferece push. Use a central de avisos do app. No iPhone, instale o app na tela inicial.'); const permission = await Notification.requestPermission(); if (permission !== 'granted')
        throw new Error('Notificações não autorizadas. Seus avisos continuam disponíveis no aplicativo.'); const { publicKey } = await api('/push/chave'), reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription(); if (!sub) {
        const base = publicKey.replace(/-/g, '+').replace(/_/g, '/'), bytes = Uint8Array.from(atob(base + '='.repeat((4 - base.length % 4) % 4)), c => c.charCodeAt(0));
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
    } await api('/push', { method: 'POST', body: sub.toJSON() }); toast('Notificações ativadas neste aparelho.'); }
    function installing() { if (installPrompt) {
        installPrompt.prompt();
        installPrompt.userChoice.finally(() => installPrompt = null);
        return;
    } open('Leve o PetHub com você', '<div class="note"><strong>Android</strong><p>No Chrome, abra o menu ⋮ e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.</p></div><div class="note"><strong>iPhone / iPad</strong><p>No Safari, toque em Compartilhar e em “Adicionar à Tela de Início”. Abra o app pelo novo ícone.</p></div><small>O PetHub Cliente é separado do app do gestor. Para push no iPhone, use o app instalado na tela inicial, com iOS 16.4 ou posterior, e autorize as notificações.</small>'); }
    // Eventos delegados mantêm as telas independentes de bibliotecas do ERP.
    document.addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b || b.disabled)
        return; try {
        if (b.dataset.tab) {
            tab = b.dataset.tab;
            render();
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
        else if (b.hasAttribute('data-auth'))
            await showAuth(b.dataset.auth);
        else if (b.hasAttribute('data-newpet'))
            open('Um novo companheiro', petForm());
        else if (b.dataset.pet)
            await petDetail(b.dataset.pet);
        else if (b.dataset.petArea)
            await petDetail(b.dataset.id, b.dataset.petArea);
        else if (b.dataset.editpet) {
            const p = pets.find(p => p.id === Number(b.dataset.editpet));
            open('Editar ' + p.nome, petForm(p));
        }
        else if (b.dataset.newvacina)
            open('Informar vacina', vaccineForm(b.dataset.newvacina));
        else if (b.dataset.fullphoto)
            open('Uma boa lembrança', '<img class="full-photo" src="' + esc(b.dataset.fullphoto) + '" alt="Foto do pet">');
        else if (b.dataset.hour) {
            const f = $('#booking-form');
            f.elements.hora.value = b.dataset.hour;
            $('#slots').querySelectorAll('button').forEach(x => x.classList.toggle('selected', x === b));
        }
        else if (b.dataset.foto) {
            if (b.dataset.action === 'remover' && !confirm('Remover esta foto da galeria?'))
                return;
            b.disabled = true;
            await api('/pets/' + b.dataset.petid + '/fotos/' + b.dataset.foto + '/acao', { method: 'POST', body: { acao: b.dataset.action } });
            await refresh({ redraw: false });
            await petDetail(b.dataset.petid, 'photos');
            toast('Foto atualizada.');
        }
        else if (b.dataset.request) {
            const p = requests.find(p => p.id === b.dataset.request);
            if (!p)
                return;
            if (!confirm(b.dataset.action === 'aceitar_proposta' ? 'Confirmar o novo horário sugerido?' : b.dataset.action === 'cancelar' ? 'Cancelar esta solicitação?' : 'Recusar a proposta de horário?'))
                return;
            b.disabled = true;
            await api('/solicitacoes/' + p.id + '/acao', { method: 'POST', body: { acao: b.dataset.action, versao: p.versao, propostaId: p.proposta?.id } });
            await refresh();
            render();
            toast('Solicitação atualizada.');
        }
        else if (b.hasAttribute('data-read')) {
            await api('/notificacoes/ler', { method: 'POST', body: {} });
            await refresh();
            render();
        }
        else if (b.hasAttribute('data-install'))
            installing();
        else if (b.hasAttribute('data-push')) {
            b.disabled = true;
            await push();
        }
        else if (b.hasAttribute('data-unpush')) {
            await api('/push', { method: 'DELETE' });
            const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
            if (sub)
                await sub.unsubscribe();
            toast('Notificações desativadas neste aparelho.');
        }
        else if (b.hasAttribute('data-logout')) {
            await api('/logout', { method: 'POST', body: {} });
            loggedOut();
        }
    }
    catch (err) {
        toast(err.message);
        if (err.status === 401)
            loggedOut();
    }
    finally {
        if (b.isConnected)
            b.disabled = false;
    } });
    document.addEventListener('error', e => { if (e.target.tagName === 'IMG' && e.target.classList.contains('avatar')) {
        const span = document.createElement('span');
        span.className = e.target.className;
        span.innerHTML = icon('pets');
        e.target.replaceWith(span);
    } }, true);
    $('#sino').onclick = () => { tab = 'notifications'; render(); };
    document.addEventListener('change', e => { if (e.target.closest('#booking-form') && ['petId', 'servicoId', 'data'].includes(e.target.name)) {
        serviceInfo();
        void loadSlots();
    } if (e.target.name === 'history-pet') {
        const rows = appointments.filter(a => !e.target.value || a.petId === Number(e.target.value));
        $('#history-list').innerHTML = rows.length ? rows.map(appointmentCard).join('') : empty('Nenhum atendimento para este pet.', 'history');
    } });
    document.addEventListener('submit', async (e) => {
        const f = e.target;
        if (!f.matches('#auth-form,#pet-form,#vaccine-form,#profile-form,#booking-form,#confirm-booking,#photo-form,.proof-form'))
            return;
        e.preventDefault();
        await submitting(f, async () => {
            const b = Object.fromEntries(new FormData(f));
            if (f.id === 'auth-form') {
                const mode = f.dataset.mode;
                if (mode === 'invite') {
                    if (b.senha !== b.confirmar)
                        throw new Error('As senhas precisam ser iguais.');
                    const r = await api('/convite', { method: 'POST', body: { token: invite, senha: b.senha } });
                    loja = r.loja;
                    invite = null;
                    toast('Senha definida. Entre com seu e-mail e sua nova senha.');
                    await showAuth('login');
                }
                else if (mode === 'recovery') {
                    await api('/recuperar', { method: 'POST', body: { loja: b.loja || loja, email: b.email } });
                    open('Recuperação de acesso', '<div class="note">Se houver um acesso com esses dados, a equipe receberá sua solicitação. Entre em contato com o pet shop para receber um novo convite seguro.</div>');
                }
                else {
                    await api('/login', { method: 'POST', body: { loja: b.loja || loja, email: b.email, senha: b.senha } });
                    await startSession();
                }
                return;
            }
            if (f.id === 'pet-form') {
                const id = f.dataset.id, p = pets.find(p => p.id === Number(id));
                b.castrado = b.castrado === 'sim' ? true : b.castrado === 'nao' ? false : null;
                if (p)
                    b.etag = f.dataset.etag;
                await api('/pets' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: b });
                modal.close();
                await refresh();
                render();
                toast('Perfil do pet salvo.');
            }
            if (f.id === 'profile-form') {
                const r = await api('/perfil', { method: 'PUT', body: { ...b, etag: f.dataset.etag } });
                session.perfil = r;
                render();
                toast('Seus dados foram atualizados.');
            }
            if (f.id === 'vaccine-form') {
                await api('/pets/' + f.dataset.id + '/vacinas', { method: 'POST', body: b });
                await petDetail(f.dataset.id, 'health');
                toast('Registro salvo como informado pelo tutor.');
            }
            if (f.id === 'photo-form' || f.classList.contains('proof-form')) {
                const path = '/pets/' + f.dataset.id + (f.id === 'photo-form' ? '/fotos' : '/vacinas/' + f.dataset.vid + '/comprovante');
                await api(path, { method: 'POST', body: new FormData(f), timeout: 65000 });
                await refresh({ redraw: false });
                await petDetail(f.dataset.id, f.id === 'photo-form' ? 'photos' : 'health');
                toast('Arquivo salvo com sucesso.');
            }
            if (f.id === 'booking-form') {
                const s = services.find(s => s.id === b.servicoId);
                bookingKey = crypto.randomUUID();
                open('Confira seu pedido', '<div class="card"><h3>' + esc(petName(b.petId)) + '</h3><p>' + esc(s.nome) + '<br>' + when(b.data, b.hora) + '</p><p>' + esc(b.observacao || 'Sem observações adicionais.') + '</p></div><div class="note warning">Esta é uma solicitação. Aguarde a confirmação do estabelecimento.</div><form id="confirm-booking"><button class="btn wide" type="submit">Enviar solicitação</button></form>');
                $('#confirm-booking').pedido = b;
            }
            if (f.id === 'confirm-booking') {
                const r = await api('/solicitacoes', { method: 'POST', body: { ...f.pedido, idempotencia: bookingKey } });
                modal.close();
                tab = 'requests';
                await refresh();
                render();
                toast(r.estado === 'PENDENTE' ? 'Solicitação enviada! A equipe analisará seu pedido.' : 'Solicitação já registrada.');
            }
        });
    });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
    window.addEventListener('offline', () => { $('#conexao').hidden = false; });
    window.addEventListener('online', () => { $('#conexao').hidden = true; if (session)
        void refresh();
    else
        void startSession(); });
    $('#conexao').hidden = navigator.onLine;
    document.addEventListener('visibilitychange', () => { if (!document.hidden && session)
        void refresh(); });
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/cliente-app/service-worker.js', { scope: '/cliente-app/' }).then(r => { registration = r; r.addEventListener('updatefound', () => { const w = r.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Nova versão disponível. Feche e reabra o app para atualizar.');
        } }); }); }).catch(() => { });
        navigator.serviceWorker.addEventListener('message', e => { if (e.data === 'ATUALIZAR_DADOS')
            void refresh(); });
    }
    if (invite)
        void showAuth('invite');
    else
        void startSession();
})();
