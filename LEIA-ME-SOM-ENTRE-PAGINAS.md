# PetHub — Continuidade do som entre páginas e abas

Atualização incremental de 15/11/2026 sobre os pacotes anteriores. Não há migração, nova dependência de produção nem variável de ambiente.

## Primeiro: a autorização que falta no Firefox

O botão “Reativar som neste navegador” indica que a escolha está salva no PetHub, mas play() foi bloqueado pelo navegador na página atual. Cada módulo do ERP abre uma página completa; o elemento de áudio da página anterior é destruído. Lembrar a preferência em localStorage não concede uma permissão permanente de autoplay ao Firefox.

Para permitir o som do PetHub em todas as páginas e abas deste perfil do Firefox, faça uma única vez, com o PetHub aberto:

1. Pressione Ctrl+I para abrir Informações da página.
2. Entre em Permissões (Permissions).
3. Em Reprodução automática (Autoplay), desmarque Usar padrão (Use Default).
4. Selecione Permitir áudio e vídeo (Allow Audio and Video).
5. Feche o painel e atualize as abas do PetHub.

Alternativamente, abra o ícone de bloqueio de reprodução automática na barra de endereço e altere a permissão para esse site. A opção Notificações é separada.

Orientação oficial da Mozilla:
https://support.mozilla.org/pt-BR/kb/permita-ou-bloqueie-reproducao-automatica-de-midia

Aplique a exceção apenas ao site do PetHub; não é necessário liberar todos os sites. Navegador, perfil e origem diferentes possuem permissões independentes. O site não consegue alterar automaticamente essa configuração nativa. Se a opção continuar bloqueada por configuração corporativa, limpeza dos dados do site ou política do aparelho, o JavaScript não pode sobrepor essa decisão.

## O que este pacote corrige

- Uma aba que recebe NotAllowedError agora libera imediatamente o Web Lock do áudio e deixa de renovar a reserva alternativa. Ela não impede outra aba autorizada de emitir o alerta.
- A escolha de ativação continua salva e é compartilhada pelo navegador, como antes.
- As abas do mesmo gestor/empresa trocam apenas um sinal de disponibilidade pelo BroadcastChannel da mesma origem. Não são enviados tokens, dados de clientes, arquivos, decisões ou filas por esse canal.
- Enquanto outra aba autorizada estiver cuidando dos avisos, aparece “Som ativo em outra aba do PetHub” em lugar de pedir reativação desnecessária naquela página.
- Se a aba responsável sair, outra aba elegível tenta assumir o áudio. Se uma aba desaparecer sem avisar, o sinal expira após sete segundos. O ciclo de coordenação ocorre a cada dois segundos, sujeito às limitações de agendamento do navegador.
- Quando o Firefox continuar bloqueando a página e não houver outra aba responsável, o botão “Permitir som em todas as páginas” explica a configuração nativa e permite verificar novamente. A tela de ajuda não resolve, silencia nem remove pedidos.
- Widget e gerenciador são publicados com a mesma versão explícita: 20261115-continuidade3. A verificação de compatibilidade da correção anterior permanece.

O gerenciador mantém uma reprodução periódica por grupo empresa/gestor, evitando áudios sobrepostos de várias abas. Outros gestores/empresas permanecem separados. Web Locks faz a exclusão principal; navegadores sem essa API conservam a concessão curta por armazenamento local, que não oferece a mesma garantia de exclusão sob todas as condições de concorrência. Sem BroadcastChannel, o áudio ainda depende do gerenciador local e a indicação de outra aba não fica disponível.

## Limites e comportamento na navegação

Com a permissão de autoplay do site concedida, a próxima página retoma automaticamente os avisos dos pedidos pendentes, sem precisar clicar no botão de som. Uma aba autorizada mantida aberta também pode continuar tocando enquanto você navega nas outras.

O ERP continua com navegação completa entre documentos. Se você usar somente uma aba, a reprodução pode pausar durante o descarregamento/carregamento e ser retomada pelo módulo seguinte. Este ajuste não transforma todo o ERP em uma aplicação de página única e não promete áudio ininterrupto enquanto o navegador destrói a página. Navegador fechado, suspensão do computador, página suspensa, timers limitados em segundo plano e saída de áudio desativada também afetam a reprodução.

A configuração nativa acima é necessária quando o navegador bloquear cada documento novo. Este pacote melhora coordenação e recuperação; não simula cliques, não usa áudio mudo para burlar autoplay e não oculta bloqueios reais.

## Publicar

1. Extraia na raiz do projeto e substitua TODOS os quatro arquivos frontend:
   - frontend/components/cliente-portal-audio.js
   - frontend/components/cliente-portal-widget.js
   - frontend/components/cliente-portal-popup.css
   - frontend/mobile/service-worker.js
2. Faça commit/push e deploy. Mantenha os comandos atuais do Render, inclusive o pre-deploy já corrigido.
3. Se o frontend for hospedado separadamente, publique também os arquivos nesse serviço.
4. Feche/reabra ou atualize TODAS as abas antigas do PetHub. Uma aba aberta antes do deploy ainda pode estar executando o gerenciador anterior e mantendo sua reserva de som.
5. Atualize com Ctrl+F5. No Mobile do gestor, aguarde o service worker atualizado e reabra; o cache passa para pethub-mobile-v13-som-entre-abas.
6. No Firefox, faça a configuração nativa do site descrita no início. Em seguida, teste navegar Dashboard → Itens → Marketing com uma solicitação pendente, e abra uma segunda aba. Silenciar tudo deve interromper o som; aceitar/recusar/propor continua dependendo da confirmação do backend.

Nenhum banco, credencial, certificado, token, WhatsApp ou cadastro precisa ser alterado. Paleta por empresa, intervalo a partir de 1 segundo, modais centralizados e fluxo da agenda são preservados.

## Validação executada

node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js

Resultado: 311 testes aprovados, 0 falhas, 0 ignorados, aproximadamente 56 segundos.

Quatro testes novos simulam Web Locks, BroadcastChannel e política de áudio para verificar: liberação da reserva de uma aba bloqueada; passagem para outra aba autorizada; preferência preservada em nova página quando o site permite autoplay; isolamento por empresa e expiração de sinal de uma aba encerrada sem aviso.

Integrações DOM locais também passaram:
- aviso/ativação, indicação de som ativo em outra aba, ausência do botão de reativação redundante e ajuda de permissão do Firefox sem remover a solicitação;
- compatibilidade entre versões carregadas por HTTP local;
- fila, mute, navegação, SSE local entre dois contextos, decisão única e configuração de sons/MP3.

Esses cenários usam jsdom e simulações de navegador/áudio. Não houve reprodução física nem configuração do Firefox do usuário nesta entrega. A conferência no aparelho real, após liberar autoplay para o site, continua necessária. Nenhum deploy ou dado de produção foi alterado.

## Arquivos
- frontend/components/cliente-portal-audio.js
- frontend/components/cliente-portal-widget.js
- frontend/components/cliente-portal-popup.css
- frontend/mobile/service-worker.js
- tests/portal-audio-abas.test.js
- tests/browser/portal-som-dispositivo.dom.cjs
- tests/browser/portal-aparencia.dom.cjs
- tests/browser/portal-audio-versoes.dom.cjs
