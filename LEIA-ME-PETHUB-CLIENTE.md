# PetHub Cliente — implantação e uso

Pacote incremental preparado sobre o projeto fornecido nesta conversa. Contém somente arquivos novos/alterados e esta documentação. Não é um backup completo do sistema. A aplicação continua no mesmo Node/Express e no mesmo banco do ERP; não há backend separado.

## O que está implementado

- PWA próprio em `/cliente-app/app.html`, com início personalizado, pets, solicitação de agendamento, histórico, perfil e central de avisos.
- Contas de tutor separadas dos usuários administrativos, ligadas ao ID do cliente e à empresa. O mesmo e-mail pode existir em empresas distintas.
- Convite seguro gerado no cadastro do cliente; definição de senha pelo próprio tutor; bloqueio, redefinição e revogação das sessões.
- Pets existentes reutilizados; novos pets entram no cadastro do ERP. Edição limitada aos campos autorizados, com controle de versão, sem acesso a observações clínicas internas.
- Fotos de perfil/galeria e comprovantes privados, usando o armazenamento permanente já integrado. O gestor pode compartilhar/ocultar fotos e conferir informações de vacina.
- Vacinas de atendimentos concluídos do ERP e registros complementares informados pelo tutor, com indicação de origem. Lembretes usam somente datas explícitas registradas, sem inventar periodicidades médicas.
- Pedidos separados da agenda oficial. Aprovação, recusa e negociação de horário, com aceitação da proposta pelo tutor e nova validação de disponibilidade.
- Área “Solicitações do App”, contador global no ERP e acesso correspondente no Mobile do gestor. Atualizações por SSE, consulta periódica e avisos persistentes; Web Push quando disponível.
- Manifest, ícones, cache e escopo próprios. O mascote foi reaproveitado dos arquivos existentes do PetHub.

Não foram alterados tokens Focus, certificados, numeração fiscal, rotinas de WhatsApp, vendas, pagamentos, saldo de clientes ou vínculos de pets. A integração com a agenda reaproveita a criação oficial e o agendador de lembretes existente.

## 1. Aplicar os arquivos

1. Faça o backup habitual do projeto e do banco.
2. Extraia as pastas `backend`, `frontend` e `tests` deste ZIP na raiz do seu `sistema-2028`, preservando os demais arquivos.
3. Confira `ARQUIVOS-PETHUB-CLIENTE.md`, que identifica exatamente os arquivos novos e os substituídos. Se você modificou esses mesmos arquivos depois da versão fornecida, faça o merge dessas mudanças.
4. Faça o commit e envie ao repositório que o Render utiliza.

Nenhuma dependência nova de produção foi adicionada. Mantenha o build `npm ci --omit=dev` e o start `npm start` existentes.

## 2. Configuração no Render

Em **Web Service → Environment**, acrescente:

```dotenv
JWT_CLIENTE_SECRET=<segredo exclusivo, aleatório, com pelo menos 32 bytes>
```

Para gerar um segredo no seu computador:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copie o resultado para a variável do Render. Não coloque o valor no código, no frontend ou no Git. Ele precisa ser diferente de `JWT_USER_SECRET` e `JWT_SECRET`. A ausência dele deixa o portal indisponível, sem substituir a autenticação do ERP. Alterar esse segredo exige novo login dos tutores.

Reutilize as variáveis existentes de banco/TLS e armazenamento:

| Variável | Uso |
| --- | --- |
| `MEDIA_S3_ENDPOINT` | Endpoint S3 do armazenamento permanente |
| `MEDIA_S3_REGION` | `auto` no R2, conforme a configuração atual |
| `MEDIA_S3_BUCKET` | Bucket utilizado pelo serviço de mídias |
| `MEDIA_S3_ACCESS_KEY_ID` | Credencial S3 somente no servidor |
| `MEDIA_S3_SECRET_ACCESS_KEY` | Segredo S3 somente no servidor |
| `VAPID_PRIVATE_KEY` | Chave Web Push já utilizada pelo PetHub |
| `VAPID_PUBLIC_KEY` | Se configurada, deve pertencer ao mesmo par da privada |
| `VAPID_SUBJECT` | Contato VAPID existente, quando configurado |

As fotos do portal são privadas. **O bucket não deve permitir acesso público direto aos objetos privados**: o campo `publico=false` no banco não torna privado um bucket exposto por `r2.dev` ou domínio público. As imagens são entregues pelas rotas autenticadas do PetHub; não é preciso publicar o bucket para este app. Confirme essa configuração antes de receber fotos e comprovantes reais.

Não regenere chaves VAPID existentes apenas por causa deste pacote. Sem VAPID ou sem autorização do aparelho, a central interna de avisos continua funcionando.

Sirva o novo PWA pelo próprio backend, em HTTPS, por exemplo:

`https://pethub-api-wdna.onrender.com/cliente-app/app.html`

Isso mantém as APIs e o cookie do tutor na mesma origem. Não copie somente o frontend do novo PWA para um domínio independente.

## 3. Migração do banco

É necessária uma migração **aditiva**, criando 14 tabelas complementares. Não se usa `force`, `alter`, exclusão ou recriação de `Clientes`, `pets` ou `agendamentos`.

O script de pre-deploy que você já utiliza foi atualizado para incluir o portal. Mantenha:

```text
node backend/scripts/preparar-clientes-inteligencia.js
```

Alternativa, caso precise preparar apenas a estrutura do portal depois das migrações anteriores:

```text
node backend/scripts/preparar-cliente-portal.js
```

Execute no serviço/ambiente que possui as variáveis do banco. O usuário do MySQL/TiDB precisa das permissões para criar tabelas e índices. Os scripts são repetíveis e preservam os registros existentes. Não é necessário executar os dois para criar as mesmas tabelas.

| Tabela nova | Finalidade |
| --- | --- |
| `cliente_portal_config` | Disponibilização do portal e regras por empresa |
| `cliente_portal_contas` | Conta vinculada ao cliente do ERP |
| `cliente_portal_sessoes` | Sessões revogáveis |
| `cliente_portal_convites` | Hash, prazo e uso único de convites |
| `cliente_portal_solicitacoes` | Pedidos, propostas, versão e vínculo com a agenda |
| `cliente_portal_notificacoes` | Avisos ao tutor e outbox de push |
| `cliente_portal_eventos` | Atualizações para o gestor e revisão para SSE |
| `cliente_portal_pet_detalhes` | Informações complementares fornecidas pelo tutor |
| `cliente_portal_pet_fotos` | Galeria, origem e visibilidade |
| `cliente_portal_vacinas` | Registros complementares e conferência |
| `cliente_portal_push` | Dispositivos associados à sessão do tutor |
| `cliente_portal_comunicados` | Mensagem do atendimento destinada ao tutor |
| `cliente_portal_tentativas` | Limitação persistente de tentativas de login |
| `cliente_portal_auditoria` | Autor, operação, registro e nomes dos campos alterados |

A UF do perfil reutiliza `Clientes.estado`, já existente na base fornecida. Ela é opcional; nenhum cliente antigo é invalidado.

## 4. Ativar para um estabelecimento

Após o deploy e a migração, abra:

`/configuracoes/portal-cliente.html`

1. Selecione **Disponibilizar o PetHub Cliente**.
2. Defina os dias, início/fim de funcionamento, intervalo das opções, capacidade simultânea, antecedência e horizonte de agendamento.
3. Confira a **duração padrão para atendimentos legados**. A agenda antiga não possui duração confiável para todos os registros; essa configuração é utilizada na verificação dos intervalos.
4. Cadastre feriados e bloqueios, inclusive por profissional quando necessário.
5. Publique somente os serviços desejados, informando duração, exibição do preço e profissional fixo, se houver.
6. Habilite o recebimento de solicitações e salve.

As opções iniciais do formulário são sugestões que o gestor precisa conferir. O portal começa desativado no banco e não publica serviços automaticamente. A aprovação é sempre manual. Pausar o recebimento bloqueia novos pedidos; desativar o portal impede o acesso do tutor no backend.

Não foi encontrado um cadastro central confiável de expediente/feriados no projeto fornecido. Por isso essas regras ficam explícitas na configuração do portal. Os compromissos oficiais existentes são consultados durante a verificação. Horários exibidos continuam sujeitos à aprovação, pois uma proposta não reserva capacidade.

## 5. Ativar o acesso de um tutor

1. No ERP, abra **Clientes → detalhes do cliente → PetHub Cliente**.
2. Confira o e-mail e clique em **Ativar e gerar convite seguro**.
3. Copie o link e entregue diretamente ao tutor, após conferir o destinatário.
4. O convite expira em uma hora e só pode ser usado uma vez.
5. O tutor define sua senha com letras e números e entra com o e-mail e a nova senha.

O convite inclui o estabelecimento; não há vinculação por nome ou busca automática em outra empresa. O token fica no fragmento do link e é retirado da barra após a leitura pelo app. O banco guarda somente seu hash.

**Recuperação de acesso é assistida pela equipe**: o app retorna uma resposta genérica e registra uma solicitação para o gestor quando existe uma conta correspondente. O gestor confirma a identidade e gera um novo convite no cadastro. Não foi adicionado envio automático de e-mail e o sistema não afirma ter enviado e-mail. Não há confirmação automática de propriedade do e-mail por SMTP nesta versão.

Gerar um novo convite invalida a senha anterior, os convites anteriores e todas as sessões. Bloquear o acesso também revoga sessões e push. O gestor nunca recupera ou visualiza a senha original.

## 6. Fluxo de agendamento

O tutor seleciona pet, serviço, data, horário, observação e revisa o resumo. O envio cria somente uma solicitação **PENDENTE**.

No ERP: **Atendimento → Solicitações do App**, disponível pelo indicador global e em:

`/atendimento/solicitacoes-app.html`

- **Aceitar:** verifica novamente disponibilidade e cria o atendimento oficial.
- **Recusar:** encerra o pedido com motivo opcional, sem criar atendimento.
- **Propor outro horário:** envia proposta ao tutor, sem reservar a vaga. A proposta expira em até 24 horas, ou antes, no horário proposto.
- **Tutor aceita a proposta:** verifica novamente a agenda antes da confirmação.
- **Tutor recusa:** não cria atendimento; a equipe pode propor novamente enquanto o pedido estiver válido.

Pedidos pendentes expiram no horário originalmente solicitado. Ações usam versões para recusar respostas antigas. A criação usa chave de idempotência; aprovações usam transação, trava SQL na empresa e fila local. Confirmações repetidas do mesmo pedido retornam o atendimento já criado.

As rotas operacionais da agenda cooperam com a mesma trava, inclusive para impedir que uma gravação concorrente do ERP ocupe uma reserva confirmada pelo app. Escritas diretas no banco ou novas integrações que contornem essas rotas também precisam cooperar com essa regra.

Depois da confirmação, o atendimento segue os estados existentes: agendado, check-in, pronto, concluído e cancelado. A solicitação e o atendimento mantêm estados distintos. Cancelamento de atendimento confirmado é feito pela equipe no fluxo normal do ERP; o tutor pode cancelar solicitações ainda não confirmadas.

O agendador de marketing existente é chamado depois da confirmação. Não se cria um segundo cron de WhatsApp para o mesmo atendimento.

## 7. Dados, saúde e notificações

O tutor pode editar seus dados pessoais autorizados, endereço/UF e campos de perfil dos seus pets. CPF, limites, saldos, descontos, observações internas e prontuário não são expostos para edição.

Os formulários mantêm a versão lida ao abrir. Quando houver atualização mais recente, o backend retorna conflito em vez de substituir silenciosamente o cadastro.

No detalhe do pet do ERP há uma seção complementar com informações do app, compartilhamento/ocultação de fotos e conferência de vacinas informadas pelo tutor. Ocultar uma foto também a retira do perfil caso fosse a principal. Arquivos deduplicados não são apagados fisicamente ao remover uma foto da galeria.

A carteira reutiliza vacinas dos atendimentos concluídos. Datas explícitas de próxima dose são aceitas; textos como “12 meses” não são transformados em calendário médico pelo portal. A rotina de avisos verifica datas de hoje, um dia e sete dias à frente. A conferência de um registro não declara imunidade.

A equipe pode publicar uma mensagem ao tutor no pedido confirmado. Essa mensagem aparece no histórico; as observações administrativas antigas continuam privadas.

SSE informa revisões mínimas, com reautenticação periódica. Há fallback de consulta de 15 segundos no gestor e 30 segundos no tutor. Os avisos são persistentes. Push é complementar: depende do provedor, da autorização, do aparelho e da conectividade; não é uma garantia de entrega instantânea. O outbox do tutor tem controle de tentativa/lease; as notificações push do gestor reutilizam o serviço existente.

## 8. Instalação e cache

- **Android:** Chrome → menu → Instalar aplicativo/Adicionar à tela inicial.
- **iPhone/iPad:** Safari → Compartilhar → Adicionar à Tela de Início.
- No iPhone, Web Push requer o app adicionado à tela inicial e iOS 16.4 ou posterior, com autorização. Referência oficial: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

O novo manifest tem ID/escopo `/cliente-app/` e cache `pethub-cliente-static-*`. O gestor mantém `/mobile/`. O cache contém somente o shell estático; APIs, fotos privadas, comprovantes e dados autenticados não são gravados no cache do novo app. O worker do gestor também foi ajustado para não interceptar essas APIs com cache/timeout.

Sem conexão, é possível abrir o shell e ver o aviso de indisponibilidade. Não há gravações enfileiradas offline. Nenhuma mensagem de sucesso é mostrada antes da resposta do servidor.

## 9. Endpoints e autorização

| Prefixo/rotas | Uso e proteção |
| --- | --- |
| `/api/cliente-app/loja/:slug` | Contexto público mínimo do estabelecimento ativo |
| `/api/cliente-app/login`, `/convite`, `/recuperar`, `/logout` | Autenticação própria e recuperação assistida |
| `/api/cliente-app/sessao` | Cookie HttpOnly, sessão no banco, empresa/cliente ativos e CSRF |
| `/api/cliente-app/perfil`, `/pets` | Dados autorizados do próprio tutor |
| `/api/cliente-app/pets/:id/foto`, `/fotos`, `/vacinas` | Recursos privados com validação do vínculo |
| `/api/cliente-app/servicos`, `/horarios`, `/solicitacoes` | Serviços publicados, preferências e negociação |
| `/api/cliente-app/agendamentos`, `/notificacoes`, `/eventos`, `/push` | Histórico real, avisos, SSE e dispositivos |
| `/api/cliente-portal/config` | Autenticação ERP + permissão `configuracoes.empresa` |
| `/api/cliente-portal/clientes/:id` e ações | ERP + permissão de clientes, sempre com empresa atual |
| `/api/cliente-portal/solicitacoes`, `/resumo`, `/eventos` | ERP + permissão `atendimento.agenda` |
| `/api/cliente-portal/pets/:id/*` | Gestão de dados complementares, fotos e conferência |
| `/api/cliente-portal/agendamentos/:id/comunicado` | Publicação explícita de mensagem visível ao tutor |

As permissões reaproveitam o middleware existente, inclusive sua compatibilidade com contas antigas sem lista de permissões configurada. A autorização é feita no servidor. Tokens de tutor são rejeitados pelo middleware do ERP. As operações autenticadas do tutor exigem CSRF; convites e demais ações exigem o cabeçalho próprio do app.

## 10. Testes e validação real

Comando executado:

```text
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js
```

Resultado: **245 testes aprovados, zero falhas**. Inclui a base anterior de 215 testes e 30 testes do portal. Após o último ajuste de aviso de expiração, os 30 testes do portal foram executados novamente e passaram.

Foram exercitados banco SQLite real em memória e rotas HTTP locais, com armazenamento/push/integrações externos simulados. Cobertura inclui convite de uso único/expiração, hashes, sessões, revogação, limitação de tentativas, CSRF, isolamento entre tutores/empresas, permissões, pets compartilhados, edição com conflito, galerias, vacinas, notificações, recusa/propostas, agenda, rollback, idempotência, aprovações simultâneas na aplicação e disputa de dois pedidos pelo mesmo intervalo.

Não houve transmissão Focus/SEFAZ, envio real de WhatsApp, alteração de banco de produção ou teste com credenciais reais.

**Limites de validação:** não foi executado teste em TiDB/MySQL real nem contenção entre dois processos nesse banco. A suíte usa a fila local e transações do SQLite; o código utiliza `FOR UPDATE` para a coordenação entre instâncias no MySQL/TiDB. Instalação, renderização visual, câmera/galeria e Web Push em Android/iPhone reais ainda precisam ser conferidos na homologação.

O teste Playwright foi tentado, mas o Chromium abortou antes de abrir a página por `socket() failed: Operation not permitted`. Isso é uma restrição do ambiente de execução, não um resultado de aprovação da interface. O roteiro executável está em `tests/browser/cliente-portal.ui.cjs`.

Para executá-lo em um computador de testes com navegador disponível:

```text
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser/cliente-portal.ui.cjs
```

Ele usa somente banco em memória e bloqueia requisições externas.

## 11. Conferência antes de liberar aos clientes

Em homologação, ative uma empresa de teste, publique um serviço, gere um convite e confira no celular: definição de senha, pets existentes, edição, upload, pedido pendente, aceitação e contraproposta. Atualize o atendimento para “pronto” no ERP e confira o aviso. Entre com um segundo tutor/empresa para confirmar que os registros permanecem separados.

Depois, libere o portal para os estabelecimentos desejados. Para interromper o acesso, desative o portal na configuração; os dados complementares permanecem guardados. Não apague as tabelas em um rollback de código.
