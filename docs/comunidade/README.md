# PetHub Comunidade — primeira entrega funcional, 0.1.0

Esta entrega inicia a implementação por fases solicitada no documento. Inclui a fundação, o núcleo social, Momentos de foto e eventos básicos. Não representa a conclusão das cinco fases.

## O que já foi implementado

- Frontend independente em `comunidade/`, com Vite e JavaScript modular; CSS restrito ao novo aplicativo. Telas de boas-vindas, login, onboarding, feed, exploração, perfis, editor, eventos, configurações e administração.
- Layout mobile com navegação flutuante; desktop com barra lateral, feed central e coluna de descoberta. Manrope local, fotos grandes, paleta laranja/marinho, tema claro/escuro/automático e modais centralizados.
- Login pelas credenciais já existentes do PetHub Cliente, com sessão social própria em cookie HttpOnly. Nenhum token de autenticação vai ao localStorage.
- Liberação inicial fechada: a plataforma deve habilitar a empresa e a conta de tutor. Revogação, suspensão, desativação do portal e mudança de versão da senha são verificadas pelo backend.
- Perfil público do tutor e perfis opcionais dos seus pets existentes, com consentimento expresso e declaração de maioridade. Nenhum prontuário, documento, telefone ou endereço do ERP é publicado automaticamente.
- Rede global entre participantes liberados de diferentes empresas. Vínculo de outro estabelecimento mediante comprovação de credenciais; nunca há união automática por nome, telefone ou e-mail.
- Publicações de texto e até seis fotos; carrossel, ampliação, legenda, hashtag e visibilidade Comunidade/seguidores/só eu. Upload com progresso, validação dos bytes e reencodificação de imagem. Publicação com chave de idempotência para reenvio sem duplicar.
- Feed paginado com cursor e rolagem incremental, seguidores, curtidas, retirada de curtida, comentários/respostas, salvos e compartilhamento de link. Atualização otimista da curtida é revertida quando a API falha.
- Explorar com busca por nome, @, espécie, interesse, cidade e texto/hashtag; mais resultados por cursor. Os chips são termos de busca, não rankings editoriais ou recomendações por IA.
- Momentos de uma foto e legenda, com duração de 24 horas validada no servidor, visualizador, navegação anterior/próximo, pausa ao pressionar e registro de visualização. A faixa mostra perfis seguidos e os próprios.
- Eventos em locais públicos: criação mediante permissão da plataforma, edição, cancelamento, busca por cidade e confirmação/retirada de presença. Cancelamento notifica participantes e fica auditado.
- Notificações internas de curtidas, comentários, seguidores e atualização de eventos. Consulta no acesso às páginas e a cada 45 segundos quando o app está visível; sem modificar notificações do ERP.
- Denúncias, bloqueio bilateral, desbloqueio, suspensão, remoção administrativa e trilha de auditoria. Administração própria em `admin.html`, com allowlist de administradores da plataforma.
- Exportação inicial de perfis/publicações/comentários sociais e solicitação de exclusão. A solicitação encerra sessões e oculta o conteúdo imediatamente; a eliminação física de arquivos e backups permanece uma operação pendente da plataforma.
- PWA com manifest, ícones, escopo isolado e tela offline. O service worker não guarda respostas autenticadas, fotos de usuários ou escritas.

O feed e os perfis não têm participantes, contadores ou publicações fictícias. A fotografia de boas-vindas é ilustrativa e não entra no feed.

## Inspeção e integrações

A inspeção foi feita sobre os arquivos locais disponíveis do `sistema-2028`, reunidos das entregas anteriores. Não houve acesso ao estado atual da branch main no GitHub nem ao servidor ou banco de produção. Alguns arquivos auxiliares do armazenamento compartilhado não estão presentes nessa cópia local; não foram inventados ou substituídos. A pré-verificação identifica essas dependências no seu checkout real.

A base observada utiliza Node/Express, Sequelize e modelos ERP existentes, autenticação própria do PetHub Cliente e o serviço `services/midias` para armazenamento permanente. O módulo reaproveita essas interfaces. Não cria servidor adicional nem troca de ORM. O frontend é compilado separadamente e pode ser servido pelo Express existente ou em domínio próprio.

| Parte existente | Integração |
|---|---|
| `backend/models` | Reutiliza a conexão Sequelize e consulta Empresa, Cliente e Pet |
| `services/clientePortal/auth` | Valida a senha, o vínculo e a conta; sessão de prova temporária é revogada sem encerrar as sessões anteriores do tutor |
| `services/midias` | Salva fotos no armazenamento privado existente e lê pelo servidor após autorização social |
| `middleware/authAdmin` | Valida o administrador da plataforma; allowlist extra obrigatória para este módulo |
| `backend/app.js` | Somente uma chamada `mount`, inserida pelo instalador antes do CORS e da injeção de scripts do ERP |

WhatsApp, fiscal, agenda e os estilos do ERP não foram alterados. Não houve teste integral desses módulos em produção; os testes desta entrega verificam as interfaces afetadas e preservação de dados ERP no laboratório.

## Instalação no repositório existente

1. Extraia o ZIP na raiz do seu `sistema-2028`, preservando as pastas. Ele contém apenas o módulo novo, o frontend, os testes e a documentação. Não substitui seu `backend/app.js` ou seu package.json da raiz por versões antigas.
2. Confira o guia `INSTALACAO.md`. Instale as dependências ausentes, execute a pré-verificação, a migração e o instalador.
3. Mantenha `COMMUNITY_ENABLED=false` até concluir a homologação. Depois habilite a flag e libere as primeiras contas no painel administrativo.

Os arquivos compilados em `comunidade/dist` acompanham o pacote para acesso em `/comunidade/`. Refaça o build se mudar o caminho base ou o endereço da API.

## Arquivos criados e alterações

Criados: `backend/comunidade/`, `comunidade/`, `tests/comunidade/`, `tests/helpers/community-fixture.js` e `docs/comunidade/`. O adaptador SQLite de laboratório é incluído em `tests/helpers/whatsappSqlite.js` para testes reproduzíveis.

Arquivos existentes do ERP que o instalador modifica: apenas `backend/app.js`, acrescentando a chamada de montagem e criando `backend/app.js.before-community`. Os demais modelos/controladores/rotas/serviços do ERP não são substituídos neste pacote. Dependências ausentes devem ser adicionadas ao package.json/lock atuais com npm, conforme o guia.

Não execute `force`, reset de banco nem migrações destrutivas para instalar esta entrega.

## Limites e próxima fase

- “Para você” e “Recentes” usam a mesma ordem cronológica inicial. Não há recomendação personalizada nem ranking de relevância.
- Momentos ainda não têm vídeo, stickers, áudio, destaques, reações ou lista visual de espectadores. Um Momento possui somente uma foto e legenda.
- Comunidades temáticas, chat, diário, conquistas, perfis oficiais de pet shops, menções com notificação, mapas, geolocalização, campanhas e push social ainda não estão implementados.
- A administração revisa denúncias e pode ocultar o conteúdo. Gestão de recursos, apelações, restauração, automação antispam, painel dedicado a moderadores e eliminação física de dados permanecem para evolução.
- Declaração de maioridade não é verificação documental de idade. A política exibida é inicial; a plataforma precisa publicar seus termos, política completa e processo de atendimento de privacidade antes de abrir o serviço ao público.
- Não há tarefa automática que apague arquivos de Momentos vencidos. Eles deixam de ser visíveis no servidor após 24 horas; retenção e limpeza física precisam de política própria, incluindo mídias compartilhadas e backups.
- Banco e storage reais, instalação em Android/iOS, cookies no domínio final, acessibilidade completa e desempenho sob carga precisam de homologação. O Chromium deste ambiente não iniciou; os testes de interface executados foram de DOM, sem validação visual por screenshot.

Detalhes de tabelas e endpoints: `ARQUITETURA.md`. Comandos e domínio: `INSTALACAO.md`. Evidências e limitações dos testes: `VALIDACAO.md`.
