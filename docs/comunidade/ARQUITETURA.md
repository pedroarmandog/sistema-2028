# Arquitetura 0.2

## Fronteiras e preservação

O módulo permanece em `backend/comunidade`, usa a conexão Sequelize existente e é montado por uma chamada no `backend/app.js`. O frontend Vite continua em `comunidade/`, com entradas `index.html` e `admin.html`. Não há outro servidor, ORM ou banco.

As contas públicas usam somente tabelas sociais. O serviço público recebe a conexão de banco e pode ser executado sem modelos Empresa, Cliente ou Pet — cenário exercitado pelos testes. O adaptador de armazenamento reaproveita a infraestrutura técnica do R2, com namespace próprio por usuário.

O cadastro administrativo existente da plataforma é reutilizado apenas para verificar as credenciais dos administradores explicitamente autorizados por ID. Ele não concede acesso automaticamente a empresas nem a usuários públicos. O aplicativo público não usa essa autenticação.

## Autenticação pública

- E-mail normalizado em minúsculas, único no banco; @ único entre perfis.
- Senhas com bcrypt, custo 12 em produção e limite de 72 bytes para evitar truncamento silencioso; mínimo de dez caracteres.
- Cadastro cria usuário e perfil de tutor na mesma transação. Aceite e versão da política são registrados.
- Verificação/recuperação com token aleatório de 256 bits; somente SHA-256 no banco. Validade de 24h/1h, respectivamente; consumo transacional com bloqueio de linha e uso único.
- Tokens ficam no fragmento dos links, são retirados da URL pelo frontend e só são consumidos por POST explícito. Nenhum token é retornado por APIs de cadastro/recuperação ou impresso em logs.
- Login exige conta ativa e e-mail confirmado. Usuários não verificados não aparecem na descoberta de terceiros.
- Sessão opaca de 256 bits; somente hash armazenado. Cookie `pethub_community`, HttpOnly, Secure em produção, Path `/api/comunidade`, 30 dias. CSRF separado nas escritas.
- Redefinição de senha incrementa a versão de autenticação, encerra sessões e invalida outros tokens de recuperação pendentes. Suspensão/bloqueio/exclusão também encerram sessões.
- As sessões e senhas do ERP/Cliente não são consultadas nem modificadas por esses fluxos.

A conta é criada automaticamente e fica pendente somente de confirmação do próprio e-mail. Não há aprovação administrativa.

## Administração

Cookie `pethub_community_admin`, HttpOnly, Secure em produção, Path `/api/comunidade-admin`, validade de 12h. O hash da sessão é armazenado em tabela própria. Logout é uma revogação no servidor. O browser mantém apenas CSRF/dados mínimos em memória, sem JWT ou token em localStorage.

Papéis vêm das variáveis `COMMUNITY_PLATFORM_ADMIN_IDS` e `COMMUNITY_PLATFORM_MODERATOR_IDS`, não do cadastro público nem do campo legado de papel social. A conta administrativa é revalidada como ativa a cada solicitação.

| Recurso | Administrador geral | Moderador |
|---|---|---|
| Visão geral agregada | Sim | Sim |
| Lista de e-mails/participantes e detalhes | Sim | Não |
| Estatísticas detalhadas e configurações | Sim | Não |
| Denúncias e conteúdo para análise | Sim | Sim |
| Ocultar/remover conteúdo | Sim | Sim |
| Restaurar conteúdo | Sim | Não |
| Advertir / suspender | Sim; suspensão até um ano | Via denúncia, até sete dias |
| Bloquear permanentemente / iniciar exclusão | Sim | Não |
| Reverter bloqueio anterior | Sim | Não |

As decisões pedem motivo e confirmação na interface. Sanções, invalidação de sessões, estado da denúncia e auditoria são persistidos transacionalmente. Denúncias já encerradas não reaplicam sanções por repetição da mesma decisão; podem ser reabertas explicitamente para análise. Não há endpoint para editar ou apagar a auditoria.

## Tabelas

A migração `002` adiciona campos e tabelas, sem apagar ou renomear registros anteriores.

| Tabela/grupo | Conteúdo |
|---|---|
| `community_users` | E-mail, hash de senha, verificação, versão de autenticação, consentimento, onboarding, atividade e estado |
| `community_profiles` | Perfis públicos de tutores/pets; @ e tutor por conta únicos |
| `community_sessions` | Sessões públicas e versão da autenticação |
| `community_challenges` | Hash de token, finalidade, expiração e consumo |
| `community_authlimits` | Buckets de tentativas com identidade em hash e expiração |
| `community_mail` | Histórico técnico de envio aceito/falha, sem token ou corpo da mensagem |
| `community_activity` | Uma linha por usuário/dia de Brasília, para métricas |
| `community_adminsessions` | Sessões administrativas separadas |
| `community_groups`, `community_members` | Comunidades públicas, responsável e associação única por participante |
| `community_reports` | Denúncia, responsável, snapshot, prioridade, estado e decisão |
| `community_sanctions` | Advertência/suspensão/bloqueio/reativação/exclusão, motivo e administrador |
| `community_settings` | Regras e opções operacionais não secretas |
| `community_posts`, `community_postmedia`, `community_media` | Posts/Momentos, imagens ordenadas e referências privadas |
| `community_likes`, `community_saves`, `community_follows` | Interações idempotentes por par |
| `community_comments`, `community_views`, `community_notifications` | Comentários, visualizações e notificações internas |
| `community_events`, `community_rsvp` | Eventos e presenças únicas |
| `community_blocks`, `community_privacy`, `community_audit` | Bloqueio, solicitações de exclusão e auditoria |
| `community_migrations` | Versões 001/002 |

`community_companies`, `community_links`, referências antigas de pets e o campo `role` de usuários permanecem somente para preservar dados anteriores. Não participam da autorização pública. `community_commentlikes` é reserva da implementação anterior e não representa curtida de comentário já operacional.

O campo legado de empresa na mídia não é usado para os novos arquivos. Mantém-se o valor 0 como marcador técnico em tabelas antigas NOT NULL, sem criar ou consultar uma empresa fictícia. O proprietário e a autorização vêm de `user_id` e da audiência social.

As FKs existentes entre tabelas sociais são preservadas. Identificadores de denúncias e notificações são polimórficos e validados pelo serviço. Novos índices cobrem atividade, estado, datas, proprietários de mídia, consultas de denúncia e séries administrativas. Não há alteração de tabelas operacionais do ERP.

## APIs públicas não autenticadas

Prefixo `/api/comunidade`:

- `GET /public-config`: regras, categorias e opções públicas não secretas.
- `POST /auth/register`: nome, @, e-mail, senha/confirmação, termos e maioridade.
- `POST /auth/verify`, `/auth/resend`, `/auth/forgot`, `/auth/reset`.
- `POST /login`: e-mail e senha próprios da Comunidade.
- `GET /auth/legacy`, `POST /auth/upgrade`: migração de identidade quando ainda existe uma sessão social legada válida; upgrade exige CSRF dessa sessão.

## APIs públicas autenticadas

Preservadas: `/session`, `/logout`, `/profiles`, `/feed`, `/posts`, curtidas/salvos/comentários, `/explore`, `/notifications`, `/reports`, `/blocks`, `/media`, `/events`/presença e `/privacy`.

Adicionadas:

- `POST /onboarding/finish`.
- `GET/POST /groups`.
- `PUT/DELETE /groups/:id/membership`.
- `GET /feed?group=UUID`; publicação em grupo exige participação e `group_id`.

Não há `/accounts/link`, login por `loja` ou endpoint público de liberação. A criação de pet usa `kind=pet`, nome, @ e espécie, sem `pet_id`/empresa. Configurações da plataforma podem pausar a criação de grupos/eventos para todos; não é autorização manual de pessoas.

## APIs administrativas

Prefixo `/api/comunidade-admin`:

| Endpoint | Uso |
|---|---|
| `POST /login`, `GET /session`, `POST /logout` | Sessão administrativa própria |
| `GET /overview` | Indicadores agregados reais |
| `GET /stats?days=7/30/90/365` | Crescimento, atividade, interações e retorno |
| `GET /participants`, `GET /participants/:id` | Todos os usuários sociais, filtros e detalhes |
| `POST /participants/:id/action` | Ação justificada sobre a conta |
| `GET /reports`, `GET /reports/:id` | Fila, conteúdo, snapshot e histórico |
| `POST /reports/:id/decision` | Analisar, rejeitar, resolver, ocultar, remover, advertir, suspender ou bloquear |
| `GET /contents/post/group/event` | Consulta paginada de conteúdos |
| `GET /contents/post/:id/comments` | Comentários para análise administrativa |
| `POST /moderate` | Mudança de estado com motivo, sem editar texto arbitrariamente |
| `GET /media/:id` | Mídia para revisão, protegida pela sessão administrativa |
| `GET /moderation`, `GET /audit` | Sanções, pressão de autenticação, falhas de e-mail e auditoria |
| `GET/PUT /settings` | Configurações operacionais, somente administrador geral |

Os antigos endpoints de liberação de empresa/conta não compõem mais o painel. A administração pública não é feita por APIs do ERP.

## Métricas e desempenho

Dia operacional e séries: Brasília. O ORM inspecionado usa UTC para persistência; agregações MySQL/TiDB convertem para dias em UTC−3. Isso precisa ser conferido caso sua implantação tenha alterado o timezone do ORM.

Ativo: conta verificada que acessou um recurso autenticado aceito no aplicativo naquele dia. Apenas registrar, confirmar e-mail ou navegar no painel administrativo não conta como uso social. A primeira atividade do dia gera um registro único; a última atividade é atualizada no máximo a cada cinco minutos.

A dashboard usa cache curto de 15 segundos por processo, invalidado por alterações relevantes. Consultas de séries agrupam no banco e retornam no máximo 365 dias. Listas usam cursor composto por data e ID, até 30 registros por página. Índices foram adicionados para os filtros de data/atividade.

Retorno significa uso em dois ou mais dias no período. Não é análise de coorte. Contagens históricas de curtidas/seguidores/presenças usam registros ainda existentes; retiradas anteriores não têm um log separado de eventos. Publicações populares são classificadas por curtidas, com comentários apresentados à parte.

Antes de tráfego nacional elevado, é necessário testar carga no TiDB/Render e evoluir agregações, busca textual e limites distribuídos. Não existe presença online em tempo real nem números simulados.

## Mídia e privacidade

As imagens novas são reencodificadas em WebP, até 1800×1800, com limite de pixels e até 8 MB de entrada. O bucket permanece privado. O browser recebe URLs de leitura autorizada da API, não a chave do objeto nem credenciais.

Arquivos anteriores continuam legíveis após autorização social usando a referência antiga. Não é necessário reimportar ou publicar imagens privadas do ERP.

Denúncias guardam snapshot e referências para análise, e remoção é lógica. Exclusão de conta gera solicitação, oculta o conteúdo e revoga acesso. Eliminação física de objetos, expiração de backups, limpeza de Momentos vencidos e atendimento completo de portabilidade dependem da política/processo de retenção ainda não automatizados.

## Limites operacionais

- Até 240 requisições/minuto por IP por router neste processo; não é um limite global distribuído.
- Limites de cadastro/login/recuperação por hash de identidade e janela de 15 minutos no banco.
- Cadastro, reenvio e recuperação por e-mail com limites específicos; rotas públicas também limitam IP.
- Até cinco comunidades por conta, dez eventos ativos e 20 denúncias por hora.
- Limites configuráveis para posts/fotos/texto; até 100 comentários e 50 uploads por conta/hora.
- Até dois uploads simultâneos neste processo, sem ocupar indefinidamente a API com arquivos grandes.

Pressão de autenticação é exibida como buckets com várias tentativas, não como prova de ataque. Expirados são limpos periodicamente. MFA, análise antifraude, filas de e-mail e indicadores avançados de retenção permanecem pendentes.
