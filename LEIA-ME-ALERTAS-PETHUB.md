# PetHub — Popups persistentes e sons de agendamentos

Pacote incremental de 15/11/2026. Aplicar sobre a versão com PetHub Cliente integrado e os ajustes anteriores de login/convite e mídias permanentes. Contém somente os arquivos relacionados a esta implementação; não contém banco, credenciais, .env, node_modules ou dados reais.

## Instalação no Render / TiDB

1. Guarde uma cópia do código atual e um backup do banco antes do deploy.
2. Extraia as pastas backend, frontend e tests na raiz do projeto, preservando os caminhos e substituindo os arquivos correspondentes. Se houver alterações locais nos mesmos arquivos, compare antes de substituir. Confira também os dez WAV em frontend/assets/portal-sons.
3. Faça o commit dos arquivos. Nenhuma dependência de produção foi acrescentada; package.json e package-lock.json permanecem iguais.
4. No serviço da API no Render mantenha:
   - Build Command: `npm ci --omit=dev`
   - Pre-Deploy Command: `node backend/scripts/preparar-clientes-inteligencia.js`
   - Start Command: `npm start`
5. O pre-deploy já chama a preparação do PetHub Cliente e passa a criar três tabelas complementares: `cliente_portal_alertas_fila`, `cliente_portal_alertas_som` e `cliente_portal_alertas_silencios`. Usa criação idempotente via Sequelize, sem force, alter, DROP, TRUNCATE ou recriação de tabelas existentes. Recupera solicitações anteriores ainda PENDENTE ou PROPOSTA_RECUSADA, sem reabrir decisões já registradas. Nenhum cadastro ou vínculo cliente–pet é modificado.
6. O usuário do TiDB precisa das permissões de criação das tabelas/índices e leitura/escrita já utilizadas pelo pre-deploy. Foi exercitado com SQLite isolado; a migração NÃO foi executada no TiDB real nesta entrega. Aguarde o pre-deploy concluir antes de iniciar o novo código.
7. Sons padrão funcionam com os arquivos distribuídos. Para MP3 personalizado mantenha as variáveis JÁ usadas pelas mídias do PetHub: `MEDIA_S3_BUCKET`, `MEDIA_S3_ENDPOINT`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_S3_REGION` (R2: auto). Use o bucket e endpoint S3 reais já configurados, sem copiar segredos para o frontend. Não é necessário tornar o bucket público. Ausência/falha do armazenamento impede salvar um novo MP3, preservando a configuração anterior.
8. Após o deploy, atualize a página e permita ao PetHub Mobile atualizar seu service worker. Se o frontend for hospedado separadamente, publique também todos os arquivos frontend deste pacote. Não apague caches de APIs privadas para tentar corrigir a fila: ela vem do banco.
9. Faça o roteiro de conferência manual abaixo antes de liberar o recurso para a equipe. Nenhum deploy em produção foi feito nesta entrega.

Para reverter o código, restaure os arquivos anteriores. As três tabelas complementares podem permanecer; não as exclua, pois guardam preferências e decisões.

## Fluxo dos popups e decisões

O componente global existente foi atualizado. O indicador flutuante antigo foi substituído por cards fixos no canto superior direito em páginas autenticadas que já recebem esse componente: Dashboard, Atendimento, Clientes, Pets, Financeiro, Marketing, Compras e Configurações. A lista respeita a altura da tela, limita a cinco cards visíveis e oferece +N com lista expandida, carregada em blocos de 50 até todos os pendentes. Há foto real, fallback, tutor, pet, serviço, data, horário e recebimento.

O corpo e Ver detalhes abrem a solicitação exata, inclusive se antiga ou fora do filtro Em andamento. Mute e botões de decisão não navegam. Aceitar usa a confirmação/disponibilidade da agenda existente. Recusar permite motivo. Reagendar abre data, horário, profissional e observação e utiliza a contraproposta existente. As notificações do tutor continuam no fluxo existente; não se criou um novo disparador de WhatsApp.

A decisão e o encerramento do alerta são gravados na mesma transação. O frontend exige confirmação explícita do backend antes de retirar o card. Erros de disponibilidade, rede, concorrência ou validação mantêm a pendência. Cliques duplicados são bloqueados e a confirmação concorrente não duplica o agendamento.

O registro da fila não depende de localStorage. Navegar, recarregar, silenciar, ouvir uma prévia e mudar volume/som não encerra a fila. Logout limpa os dados privados da tela; novo login autorizado restaura o que estiver pendente no banco. Com o navegador fechado o card não fica visível, mas continua registrado e volta ao entrar.

Pedidos cancelados pelo tutor e horários expirados permanecem para conferência, com indicação explícita. Não podem ser confirmados indevidamente: cancelado permite Encerrar o alerta; expirado permite recusar/encerrar ou propor uma data futura. Encerrar um alerta cancelado não desfaz o cancelamento nem recria o agendamento. Recusa ou expiração de contraproposta devolve a solicitação à fila de atenção.

## Sons padrão e gerenciador global

Exatamente dez sons originais foram sintetizados localmente, sem samples de terceiros e sem serviço pago. São WAV mono PCM 16 bits/22.050 Hz, com melodias/timbres distintos, aproximadamente 1–2 segundos. O catálogo é a fonte única dos nomes e identificadores; LICENCA.txt declara CC0 e o gerador Python está incluído.

- PetHub Clássico
- PetHub Suave
- Novo Pedido
- Sino Digital
- Toque Alegre
- Notificação Moderna
- Alerta Duplo
- Toque Cristalino
- Campainha
- Alerta Premium

Um único elemento de áudio por página atende alertas e prévias. A configuração inicial é 45% de volume, com repetição a cada 25 segundos; ajustes permitem 0–100% e 15–120 segundos. Uma reprodução em andamento não recebe outra por cima; várias pendências compartilham o mesmo alerta. Prévia suspende o ciclo enquanto toca e não decide nenhum pedido.

Se o navegador bloquear autoplay, o card continua visível e oferece Ativar som neste navegador. Não há tentativa de burlar a política. O MP3 indisponível ou com erro de reprodução retorna ao som padrão. Web Locks coordena a reprodução automática entre abas do mesmo navegador/gestor/empresa; há fallback com uma concessão curta em localStorage somente para coordenação, nunca para armazenar a fila oficial. No fallback legado, exclusão entre abas não é uma garantia absoluta. Computadores diferentes podem alertar cada um no seu navegador.

Áudio contínuo depende de página aberta, permissão do navegador, saída de áudio ativa e sistema operacional sem suspensão. Abas em segundo plano podem ter timers limitados. A implementação preserva e restaura a fila; não pode garantir som com navegador fechado ou computador suspenso.

## Configurações e MP3 por empresa

Em Configurações → PetHub Cliente, a seção Sons de Notificação oferece os dez cards, Ouvir, seleção, Testar som atual, volume, intervalo e Salvar. Adicionar meu próprio som permite prévia local, Salvar e utilizar, substituir, selecionar novamente ou remover o MP3. Voltar a um som padrão não apaga o MP3 personalizado já enviado.

O backend valida extensão, tamanho máximo de 2 MB, duração máxima de 15 segundos e a cadeia completa de frames MPEG Layer III. Descarta tags ID3 e rejeita arquivos truncados, cabeçalhos inválidos e conteúdo extra. Não executa conversores ou binários enviados. Arquivos fora desse perfil devem ser exportados como MP3 convencional curto antes do envio; nenhuma normalização de volume automático é feita.

MP3 é salvo pelo serviço de mídias persistentes já existente, em módulo privado portal-sons e segregado pela empresa autenticada. A referência fica no banco, não no disco efêmero do Render. Reprodução usa endpoint autenticado com no-store; URL e conteúdo de outra empresa não são expostos. Remover/substituir desassocia o arquivo ativo; não apaga fisicamente objetos antigos, evitando interferir em referências ou reproduções concorrentes. Eventual limpeza de órfãos deve seguir a política de retenção do armazenamento.

Configuração sonora usa versão para rejeitar gravação concorrente sem sobrescrever silenciosamente. Alterações geram o evento da empresa; os outros computadores carregam a configuração nova. Uma tela de configurações já aberta pode manter sua seleção antiga até ser recarregada; uma tentativa de salvar a versão antiga recebe aviso de conflito.

## Silenciamento individual e sincronização

O silenciamento fica no banco por empresa, usuário gestor e solicitação. Silenciar mantém card e botões ativos. Reativar retoma o alerta; se todas as pendências estiverem silenciadas o ciclo para. Novo pedido não herda o mute dos anteriores. Outro gestor tem preferência independente; o mesmo gestor em outro computador recupera sua preferência.

A atualização usa o SSE já existente e a revisão de eventos no banco, mais consulta de recuperação a cada 15 segundos. Após reconexão a situação oficial é recarregada. Falhas transitórias preservam o último estado visual; mudança de conta ou perda de autorização limpa os dados privados. Respostas antigas não podem reinserir card já decidido ou alterar a preferência do usuário que entrou depois.

## APIs e permissões

Todas as rotas abaixo ficam sob `/api/cliente-portal`, com autenticação ERP e empresa obtida do usuário validado. Operações de escrita também exigem o cabeçalho já adotado `X-PetHub-Cliente: 1`.

| Método e caminho | Finalidade | Permissão |
| --- | --- | --- |
| GET /alertas | Fila, mute do gestor e som atual | atendimento.agenda |
| PUT /alertas/:id/silencio | Silenciar/reativar somente para o gestor atual | atendimento.agenda |
| GET /som | Configuração e catálogo | atendimento.agenda ou configuracoes.empresa |
| PUT /som | Salvar preferências/seleção/remover personalizado | configuracoes.empresa |
| POST /som/mp3 | Multipart arquivo + versao | configuracoes.empresa |
| GET /som/arquivo | MP3 privado atual | atendimento.agenda ou configuracoes.empresa |
| GET /solicitacoes/:id | Detalhe exato e isolado | atendimento.agenda |

As decisões reutilizam POST /solicitacoes/:id/acao. Os endpoints públicos do tutor não recebem acesso à configuração administrativa. Usuários sem permissão de agenda não recebem popups com dados de solicitações.

## Testes realmente executados

Resultado final: **284 testes aprovados, 0 falhas, 0 ignorados**, aproximadamente 50 segundos:

```sh
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js
```

São 259 testes já existentes e 25 novos de backend, HTTP e gerenciadores frontend. Exercitam banco isolado, migração repetível e preservação de vínculos; recuperação da fila; decisões, expiração e cancelamento; concorrência com um único agendamento; permissões e isolamento; exatamente dez WAV distintos; seleção/persistência; MP3 válido/inválido/truncado/grande/longo; persistência com nova instância do serviço de mídias e S3 simulado; erro de armazenamento; áudio recorrente sem sobreposição; autoplay bloqueado; fallback; resposta antiga após logout e erro tardio de áudio. Os testes fiscais existentes usam mocks: nenhuma nota real foi transmitida.

**Integração DOM/HTTP adicional: passou.** Executa os arquivos frontend reais em jsdom contra Express, SQLite, autenticação de teste e SSE reais locais. Valida Dashboard → Marketing, recuperação de mute, pilha/+N, dois contextos sincronizados, confirmação única, dez opções, chamada de prévia e upload MP3 pelo formulário. HTMLAudio e APIs de janela são simulados: esse teste NÃO comprova renderização visual nem som físico. Para repetir, instale jsdom apenas no ambiente de desenvolvimento/testes (não como dependência de produção) e execute `node tests/browser/portal-alertas.dom.cjs`.

**Chromium/Playwright: tentativa executada, bloqueada antes de abrir a página**, por restrição do ambiente ao criar socket AF_UNIX (Operation not permitted). O roteiro `tests/browser/portal-alertas.ui.cjs` acompanha o pacote para execução em ambiente com navegador. Não houve validação visual real, reprodução física de sons, testes em smartphone real, R2 real ou TiDB real. As simulações de S3, relógio e áudio não substituem essas conferências.

Nenhum serviço de produção foi chamado. Nenhuma credencial real foi utilizada. Não foram emitidas notas, enviadas mensagens WhatsApp reais ou alterados cadastros de produção. A aprovação da suíte demonstra os cenários exercitados, não uma garantia de regressão zero em todo o ERP.

## Roteiro de conferência após deploy

1. Entre com gestor autorizado em dois computadores e crie um pedido de teste com tutor/pet de teste. Verifique foto, dados e card nos dois.
2. Troque entre Dashboard, Marketing, Financeiro, Clientes e Atendimento, atualize, saia e entre novamente. A pendência deve retornar. Verifique também o Mobile do gestor.
3. Clique Ativar som se solicitado pelo navegador; aguarde dois ciclos. Silencie e reative; a pendência deve continuar. Mute de uma solicitação não deve afetar um pedido novo.
4. Teste cada prévia, salve um padrão e atualize. Envie um MP3 curto válido, confira a reprodução e tente um arquivo inválido. Reinicie o serviço e confirme que o MP3 permanece acessível.
5. Confira mudança do som no segundo computador, mais pedidos do que cabem na tela, +N e ações na lista expandida. Use smartphone para conferir largura e controles.
6. Aceite, recuse e proponha novo horário em pedidos distintos. Confira a agenda e a caixa de notificações do tutor. Aceitação simultânea deve criar somente um atendimento.
7. Simule falha de rede, confirme que o card permanece e confira recuperação. Cancele pelo tutor e confira Encerrar sem reativar o pedido.
8. Entre em outra empresa e confirme que fila, mute e MP3 são exclusivos daquela empresa.

## Arquivos deste pacote

- `backend/routes/clientePortalRoutes.js` — alterado.
- `backend/scripts/gerar-sons-portal.py` — novo.
- `backend/services/clientePortal/alertas.js` — novo.
- `backend/services/clientePortal/alertasModelos.js` — novo.
- `backend/services/clientePortal/index.js` — alterado.
- `backend/services/clientePortal/modelos.js` — alterado.
- `backend/services/clientePortal/notificacoes.js` — alterado.
- `backend/services/clientePortal/pedidos.js` — alterado.
- `backend/services/midias/audio.js` — novo.
- `backend/services/midias/index.js` — alterado.
- `frontend/assets/portal-sons/LICENCA.txt` — novo.
- `frontend/assets/portal-sons/alegre.wav` — novo.
- `frontend/assets/portal-sons/campainha.wav` — novo.
- `frontend/assets/portal-sons/catalogo.json` — novo.
- `frontend/assets/portal-sons/classico.wav` — novo.
- `frontend/assets/portal-sons/cristal.wav` — novo.
- `frontend/assets/portal-sons/duplo.wav` — novo.
- `frontend/assets/portal-sons/moderno.wav` — novo.
- `frontend/assets/portal-sons/pedido.wav` — novo.
- `frontend/assets/portal-sons/premium.wav` — novo.
- `frontend/assets/portal-sons/sino.wav` — novo.
- `frontend/assets/portal-sons/suave.wav` — novo.
- `frontend/components/cliente-portal-alertas-core.js` — novo.
- `frontend/components/cliente-portal-audio.js` — novo.
- `frontend/components/cliente-portal-erp.js` — alterado.
- `frontend/components/cliente-portal-popup.css` — novo.
- `frontend/components/cliente-portal-som-config.js` — novo.
- `frontend/components/cliente-portal-widget.js` — alterado.
- `frontend/mobile/service-worker.js` — alterado.
- `tests/browser/portal-alertas.dom.cjs` — novo.
- `tests/browser/portal-alertas.ui.cjs` — novo.
- `tests/fixtures/portal-alerta.mp3` — novo.
- `tests/portal-alertas-backend.test.js` — novo.
- `tests/portal-alertas-front.test.js` — novo.
- `tests/portal-alertas-http.test.js` — novo.

`MANIFESTO-SHA256.json` lista tamanho e SHA-256 dos 35 arquivos de implementação/testes. Este guia e o manifesto são documentos adicionais do pacote. Os novos gerenciadores, CSS, catálogo e WAV devem ser publicados juntos; atualizar apenas o widget deixará dependências ausentes.
