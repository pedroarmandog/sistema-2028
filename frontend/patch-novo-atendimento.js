// Patch para garantir que o botão 'Novo Agendamento' abra o modal global
(function(){
    function abrirNovoPadrao(){
        if(typeof abrirNovoAgendamentoModal === 'function'){
            try{ abrirNovoAgendamentoModal(); return; }catch(e){ console.debug('[patch-novo-atendimento] abrirNovoAgendamentoModal falhou', e); }
        }
        if(typeof abrirNovoAgendamento === 'function'){
            try{ abrirNovoAgendamento(); return; }catch(e){ console.debug('[patch-novo-atendimento] abrirNovoAgendamento falhou', e); }
        }
        // fallback: redirecionar para a página e abrir modal lá
        try{ sessionStorage.setItem('abrirNovoAgendamento','true'); window.location.href = 'agendamentos-novo.html'; }catch(e){ console.debug('[patch-novo-atendimento] fallback falhou', e); }
    }

    // Exporta para o escopo global
    try{ window.novoAtendimento = abrirNovoPadrao; }catch(e){ console.debug('[patch-novo-atendimento] não foi possível sobrescrever novoAtendimento', e); }
})();
