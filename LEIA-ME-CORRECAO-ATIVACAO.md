# PetHub — Correção da ativação de som e compatibilidade dos arquivos

Atualização incremental de 15/11/2026, sobre o PetHub Cliente já integrado e os pacotes anteriores. Não exige banco, migração, dependência ou variável nova. Preserva os ajustes anteriores de paleta/menu, intervalo mínimo de 1 segundo, modal centralizado e notificações persistentes.

## Causa encontrada

Na leitura dos arquivos públicos servidos pelo Render, cliente-portal-widget.js continha a chamada enableDevice(), enquanto cliente-portal-audio.js ainda era o gerenciador anterior e não possuía essa função. Isso produz uma falha de JavaScript que o modal anterior convertia em “Não foi possível ativar o som”.

Os arquivos WAV padrão consultados responderam HTTP 200 com Content-Type audio/wav e cabeçalho RIFF/WAVE válido. A permissão “Notificações” já concedida na imagem não causa esse erro de função ausente.

## Correção

- Gerenciador e widget compartilham a versão explícita 20261115-ativacao2.
- O widget carrega dependências com identificador de versão e confere a função de ativação. Se houver um gerenciador antigo já carregado, o módulo atualizado encerra a instância antiga e a substitui, sem manter dois gerenciadores de som.
- Se a publicação continuar parcial e o servidor entregar o arquivo antigo, aparece uma mensagem específica de arquivos incompatíveis. A fila visual continua carregando; o componente antigo não é utilizado para o novo fluxo de ativação.
- O tratamento deixa de esconder todos os problemas sob um erro genérico. Diferencia arquivo indisponível, interrupção, bloqueio pelo navegador e carregamento.
- O clique de ativação inicia uma única reprodução, mesmo em cliques repetidos. O gesto de retomada automática não concorre com o próprio botão Ativar som.

## Quando o aviso aparece

Depois da autenticação, um navegador sem escolha salva verifica uma vez se consegue reproduzir o som realmente configurado. A tentativa é não silenciada, no volume escolhido, e termina assim que o navegador confirma o início; pode produzir um som muito breve. Não se utiliza áudio mudo para contornar autoplay.

Se a reprodução já for permitida, o PetHub registra a ativação local e não abre o modal. Se o navegador bloquear, o modal oferece Ativar som / Agora não. Clicar Ativar som executa um teste curto diretamente no gesto do usuário e só registra a escolha depois do sucesso.

Se a escolha já estiver salva neste navegador, o aviso inicial não se repete. Caso o navegador volte a bloquear autoplay, aparece o controle de reativação necessário. A reprodução periódica continua usando o som e o intervalo da empresa, e respeita silenciamentos e ausência de sobreposição.

A permissão nativa de notificações push é diferente da autorização de reprodução de áudio. Notification.permission não é usada como comprovação de que som funciona e a implementação não chama Notification.requestPermission() nem altera inscrições push. Quando a permissão nativa já está concedida mas o teste de som foi bloqueado, o modal explica que as notificações estão permitidas e que falta verificar o áudio.

Chrome e outros navegadores continuam controlando autoplay; a aplicação não pode garantir uma permissão permanente em toda nova página. Preferência local também depende de navegador/perfil/origem, dados do site preservados e armazenamento disponível.

## Aplicar no Render

1. Extraia na raiz do sistema-2028, preservando os caminhos. Publique TODOS os quatro arquivos de funcionamento:
   - frontend/components/cliente-portal-audio.js
   - frontend/components/cliente-portal-widget.js
   - frontend/components/cliente-portal-popup.css
   - frontend/mobile/service-worker.js
2. Faça commit/push de todos eles e confirme que o Render publicou o commit correto. Não substitua somente o widget: a correção principal está também no arquivo de áudio.
3. Mantenha os comandos atuais do Render, inclusive o pre-deploy já corrigido. Este ajuste não muda o banco de dados.
4. Se o frontend estiver hospedado separadamente, publique os mesmos arquivos no frontend. Reabra o ERP com Ctrl+F5. No Mobile do gestor, aguarde a atualização do service worker e reabra o app; o cache passa para pethub-mobile-v12-ativacao-compativel.
5. Não é necessário redefinir a permissão de notificações do Chrome, apagar clientes, remover tabelas ou reconfigurar a integração WhatsApp.

Conferência opcional no console do ERP, depois de carregar a página:
window.PortalAudioGlobal?.version

O resultado esperado é “20261115-ativacao2”. Se continuar undefined ou mostrar outra versão, confira se o arquivo cliente-portal-audio.js correto está no commit publicado.

## Testes realizados

Suíte completa:
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js

Resultado: 307 testes aprovados; zero falhas; zero ignorados; aproximadamente 58 segundos.

Os testes novos cobrem detecção real de autoplay permitido, bloqueio mesmo com notificações nativas permitidas, ativação repetida idempotente, erro de arquivo sem falso consentimento, atualização de singleton antigo e ausência de duplicação.

Integrações DOM adicionais passaram:
- portal-som-dispositivo.dom.cjs: ativação por clique, recuperação da preferência, adiamento, falha sem gravar consentimento e cenário em que áudio já permitido dispensa o modal.
- portal-audio-versoes.dom.cjs: scripts carregados por HTTP local reproduzem a presença de um gerenciador antigo. A versão atual o substitui; se o servidor continua entregando código antigo, o widget mostra diagnóstico específico e preserva o carregamento da fila visual.
- portal-alertas.dom.cjs: regressão de fila, silenciamento, navegação, SSE local, decisão única e configuração de sons/MP3.
- portal-aparencia.dom.cjs: regressão de paleta isolada e menu em Configurações.

As integrações usam jsdom e simulações de áudio/política de autoplay; a de versões e a de pedidos incluem HTTP local. Não houve reprodução física em Chrome/Firefox/Safari reais nesta entrega. A validação sonora no computador do pet shop deve ser feita após publicar. Não foram utilizados logins reais nem alterados dados de produção. Os únicos acessos ao serviço publicado foram leituras de arquivos estáticos públicos; nenhum deploy foi realizado por esta entrega.

## Conteúdo do pacote
- frontend/components/cliente-portal-audio.js
- frontend/components/cliente-portal-widget.js
- frontend/components/cliente-portal-popup.css
- frontend/mobile/service-worker.js
- tests/portal-audio-dispositivo.test.js
- tests/browser/portal-som-dispositivo.dom.cjs
- tests/browser/portal-aparencia.dom.cjs
- tests/browser/portal-audio-versoes.dom.cjs
