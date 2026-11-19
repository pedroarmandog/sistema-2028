# Arquitetura e contrato inicial

## Limites do módulo

```
sistema-2028/
  backend/comunidade/     rotas, serviço, modelos, migração, instalação e pré-verificação
  comunidade/            frontend Vite independente e saída dist
  tests/comunidade/      serviços, HTTP, DOM, instalação e migração
  docs/comunidade/       documentação desta entrega
```

A API continua no Express existente. As rotas novas são montadas antes dos middlewares globais do ERP, com CORS, cookie, JSON, autorização e CSRF próprios. O frontend usa rotas hash para evitar dependência de fallback SPA. O build tem entradas separadas para o aplicativo e a administração.

O login comprova a conta no serviço de autenticação do PetHub Cliente, captura internamente a sessão temporária e a revoga após a prova. Depois emite um identificador opaco social aleatório de 256 bits. O banco guarda somente seu SHA-256. O cookie é HttpOnly, Secure em produção, Path `/api/comunidade`; expiração de 30 dias. O token do ERP não é reutilizado no frontend social.

Cada solicitação autenticada verifica sessão, estado da conta social e pelo menos um vínculo válido com empresa/portal/cliente ativos e conta liberada. Mudança da versão da senha invalida esse vínculo até um novo login. Se houver outro vínculo válido comprovado, a identidade social continua acessível por ele. Nenhuma relação com outra empresa é criada por comparação de dados pessoais.

As publicações são globais entre contas liberadas. A empresa de origem é usada para confirmar a posse do pet e para o armazenamento, não como filtro que separa o feed por pet shop. O perfil público só recebe campos escolhidos no onboarding/editor.

Curtidas e salvos pertencem à conta social e não são multiplicados quando ela alterna entre seus perfis. A ação de seguir é entre perfis. Comentários e novas publicações carregam explicitamente o perfil autor; as notificações de curtida também respeitam o perfil ativo informado.

## Tabelas adicionadas

Todas têm prefixo `community_`, PKs próprias e timestamps. IDs sociais são UUIDs; empresa/pet mantêm apenas referências escalares ao ERP. As chaves estrangeiras entre tabelas sociais usam RESTRICT e não apagam dados em cascata.

| Tabela | Finalidade e restrições principais |
|---|---|
| `community_migrations` | Versão de migração `001` |
| `community_users` | Identidade global, estado, papel, permissão de evento, consentimento |
| `community_companies` | Liberação por empresa; começa desativada |
| `community_links` | Liberação por conta do portal, identidade global e versão da senha |
| `community_sessions` | Hash do token e validade |
| `community_profiles` | Perfis públicos; @ único, tutor único por usuário, vínculo empresa/pet único |
| `community_media` | Proprietário, referência privada, MIME, dimensões e tamanho |
| `community_posts` | Autor, texto, audiência, expiração e chave de idempotência única por usuário |
| `community_postmedia` | Ordem das imagens e unicidade por publicação/mídia |
| `community_likes` | Uma curtida por conta/publicação |
| `community_saves` | Um salvo por conta/publicação |
| `community_comments` | Comentário/resposta, autor e estado |
| `community_commentlikes` | Reserva de esquema para evolução; curtida de comentário ainda não exposta |
| `community_follows` | Seguidor e seguido únicos por par de perfis |
| `community_views` | Registro único de visualização por conta/Momento |
| `community_notifications` | Caixa interna de notificações e leitura |
| `community_blocks` | Bloqueio por conta, aplicado nos dois sentidos para exibição |
| `community_reports` | Denúncia, motivo, destino e fila aberta/resolvida |
| `community_audit` | Autor da decisão, ação, destino e detalhes |
| `community_events` | Encontro, organizador, cidade, local público e estado |
| `community_rsvp` | Presença única por conta/evento |
| `community_privacy` | Solicitações de exclusão pendentes |

Campos de avatar/capa e destinos polimórficos de notificações/denúncias são validados no serviço; não possuem FK polimórfica. As referências a contas e pets antigos do ERP também são verificadas no serviço para evitar migração das tabelas operacionais.

A paginação usa `(createdAt DESC, id DESC)`, sem OFFSET. Há índices para perfil, feed, notificações, comentários, vínculos, denúncias, eventos e pares únicos. Os nomes explícitos são curtos para evitar o problema de identificador longo no TiDB/MySQL.

## Endpoints do aplicativo

Prefixo `/api/comunidade`. `GET` usa cookie; `POST`, `PUT` e `DELETE`, exceto login, também exigem `X-Community-CSRF` obtido em `/session`. Não use JWT do gestor nessas rotas.

| Métodos e caminho | Função |
|---|---|
| `POST /login`, `POST /logout`, `GET /session` | Sessão social e perfis próprios |
| `POST /accounts/link` | Provar e vincular outra conta liberada |
| `POST /profiles`, `PUT /profiles/:id`, `GET /profiles/:id` | Criar, editar e consultar perfil público |
| `PUT/DELETE /profiles/:id/follow` | Seguir ou retirar perfil seguidor informado |
| `PUT/DELETE /profiles/:id/block`, `GET /blocks` | Bloquear, desbloquear e gerenciar bloqueios |
| `GET /feed` | Cursor `after`, `limit` até 30, `profile`, `saved=1`, `q`, `filter=seguindo`, `kind=momento` |
| `POST /posts`, `GET/DELETE /posts/:id` | Publicar, consultar e remover conteúdo |
| `PUT/DELETE /posts/:id/like` | Curtir/retirar curtida |
| `PUT/DELETE /posts/:id/save` | Salvar/retirar salvo |
| `GET/POST /posts/:id/comments`, `DELETE /comments/:id` | Comentários e respostas |
| `PUT /posts/:id/view` | Registrar visualização de conteúdo autorizado |
| `GET /explore` | Busca paginada de perfis |
| `GET /notifications`, `PUT /notifications/read` | Caixa interna e leitura |
| `POST /reports` | Enviar denúncia |
| `POST /media`, `GET /media/:id` | Upload multipart de uma foto e leitura autorizada |
| `GET/POST /events`, `PUT/DELETE /events/:id` | Listar, criar, editar e cancelar encontro |
| `PUT/DELETE /events/:id/rsvp` | Confirmar/retirar presença |
| `GET /privacy/export`, `POST /privacy/delete` | Exportação inicial e pedido de exclusão |

## Endpoints administrativos

Prefixo `/api/comunidade-admin`. Exigem autenticação `authAdmin` existente e ID em `COMMUNITY_PLATFORM_ADMIN_IDS`. O frontend administrativo mantém esse token apenas em memória e exige novo login após fechar/recarregar a página.

| Métodos e caminho | Função |
|---|---|
| `GET /companies`, `PUT /companies/:id` | Listar e liberar empresas |
| `GET /accounts/:company`, `PUT /accounts/:id` | Liberar contas do tutor |
| `GET /users`, `PUT /users/:id` | Suspensão, papel e permissão de eventos |
| `GET /reports`, `GET /reports/:id/content` | Fila e revisão do conteúdo denunciado |
| `GET /media/:id` | Foto para revisão administrativa; também autenticada |
| `POST /moderate` | Ocultar conteúdo com motivo e auditoria |
| `GET /audit` | Últimas 100 decisões |

As listas administrativas têm limites iniciais (200 empresas/contas; 100 usuários/denúncias/decisões). Paginação e filtros avançados desse painel ficam para a próxima evolução.

## Upload e persistência

Aceita JPEG, PNG e WebP estáticos, até 8 MB por requisição e seis imagens por publicação. O MIME informado pelo navegador não é considerado prova: `sharp` decodifica o arquivo, recusa outros formatos/animações, limita a 25 milhões de pixels, remove metadados na reencodificação e reduz a até 1800×1800. Há no máximo dois uploads em processamento simultâneo neste processo da API. O armazenamento é feito pelo serviço existente no módulo `community`, privado.

O cliente recebe apenas `/api/comunidade/media/UUID`, nunca chave do bucket ou credenciais. A leitura confere proprietário, perfil público ou publicação visível. Conteúdo expirado, removido, privado ou bloqueado não autoriza leitura para terceiros. O administrador autorizado possui rota própria para revisão.

Não há disco local como armazenamento definitivo do módulo novo. A permanência após deploy depende de o serviço de mídia permanente compartilhado estar instalado e configurado no ambiente real. Não foi realizado teste contra o bucket de produção nesta entrega.

## Segurança, carga e operação

- CORS com origens exatas, CSRF nas escritas, cookies separados, respostas privadas sem cache, conteúdo textual escapado na interface e verificação de propriedade no backend.
- Limitador inicial de 120 requisições/minuto por IP/base de rota, em memória; a autenticação reaproveita também a proteção de tentativas do portal existente. Em múltiplos processos, o limitador deverá evoluir para uma camada distribuída.
- Paginação limitada, consultas agrupadas de interações do feed, imagens lazy, importação de telas por demanda e apenas uma consulta periódica leve de notificações enquanto visível.
- A relação social não adiciona conexões Sequelize próprias: usa o pool existente. Busca textual inicial usa LIKE e precisa evoluir para indexação específica antes de grande volume.
- Exportação inclui inicialmente perfis, posts e comentários; arquivo de mídias, interações e portabilidade completa ainda precisam ser estendidos.
- A conta excluída é desativada/ocultada e gera solicitação pendente. Limpeza física, retenção e atendimento das solicitações são responsabilidades operacionais ainda não automatizadas.

A flag permite interromper o acesso social. Não substitui monitoramento, backup, política completa de privacidade, revisão de segurança independente ou teste de carga.
