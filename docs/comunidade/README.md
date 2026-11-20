# PetHub Comunidade 0.2 — cadastro público e operação administrativa

Esta versão substitui a dependência de pet shops por contas públicas próprias e transforma o painel existente em uma central de operação. Mantém a mesma API Express, conexão Sequelize/TiDB, pasta `comunidade/` e endereço `/comunidade/admin.html`.

## Aplicativo público

- Cadastro gratuito por nome, @ único, e-mail único, senha e confirmação, termos e declaração de maioridade.
- E-mail com token aleatório, expiração, uso único e reenvio. A confirmação depende de ação POST explícita: um scanner de links não confirma contas por GET.
- Login somente com e-mail e senha da Comunidade, recuperação de senha e revogação de sessões após redefinição. Não há código de loja, convite de pet shop ou aprovação manual.
- Conta não verificada não acessa feed, upload, comentários ou outros recursos protegidos. Perfis de contas não verificadas não entram na descoberta de outros usuários.
- Onboarding opcional para foto, biografia, interesses e perfil; é possível continuar sem ter pet. Pets são cadastrados diretamente como perfis sociais, sem criar registros no ERP.
- Publicações, fotos, curtidas, comentários/respostas, seguidores, salvos, busca, bloqueios e Momentos de foto por 24h preservados.
- Comunidades temáticas públicas básicas: criar, buscar, participar/sair e publicar histórias no grupo. Criador permanece responsável. Posts de grupos ocultados deixam de ser servidos no feed.
- Eventos e presença preservados; usuários públicos verificados podem criar eventos, sujeitos aos limites e configurações da plataforma.
- Notificações internas e PWA preservados; sessões, worker e caches isolados dos outros aplicativos.

## Administração privada

Nove seções: Visão geral, Participantes, Publicações, Denúncias, Comunidades, Eventos, Moderação, Estatísticas e Configurações.

- Indicadores de cadastros, verificados/pendentes, ativos 7/30 dias, cadastros hoje/mês/semana, pets, posts, comentários de hoje, Momentos, grupos, eventos e sanções.
- Atividade definida por requisição autenticada aceita no aplicativo, registrada no máximo uma vez por conta/dia de Brasília. Última atividade é atualizada com intervalo mínimo de cinco minutos. Não há indicador fictício de pessoas online.
- Gráficos por 7/30/90/365 dias, com legendas interativas, pontos com valores e tabela acessível. Séries de cadastros, ativos, posts, curtidas, comentários, Momentos, seguidores e participações. Retorno observado em dois ou mais dias; não é retenção por coorte.
- Participantes com busca por nome/@/e-mail, filtros de status, verificação, atividade e datas, paginação e detalhes com perfis, posts públicos, denúncias e sanções.
- Denúncias com snapshot textual e referências das mídias, estados pendente/em análise/resolvida/rejeitada, revisão e decisão justificada. Advertência, suspensão temporária, bloqueio e ocultação ficam auditados.
- Suspensão/bloqueio/exclusão encerram as sessões da conta. Reativação permite um novo login. Suspensões temporárias vencidas são encerradas automaticamente quando a conta tenta autenticar.
- Administração de posts, Momentos, grupos e eventos com filtros, estado e motivo obrigatório; sem edição arbitrária de texto ou dados pessoais.
- Configurações de regras, mensagens, interesses, motivos de denúncia, limites de fotos/texto/publicações e pausa de criação de grupos/eventos. Segredos não são editáveis no painel.
- Sessão administrativa própria em cookie HttpOnly, validade de 12 horas e logout revogado no banco. Não usa a sessão pública nem exige guardar JWT no browser.
- Papéis explícitos por allowlist: administrador geral e moderador. Moderador não consulta a lista de e-mails, estatísticas detalhadas ou configurações; pode analisar denúncias e suspender por até sete dias, sem bloqueio permanente ou restauração de conteúdo.

## O que permanece pendente

Vídeos, chat privado, push social, menções/convites, destaques/reação em Momentos, mapas, perfis oficiais e análises avançadas continuam fora do estágio implementado anteriormente; não foram removidos de um módulo operacional nem apresentados como prontos. Grupos são públicos e básicos: não há aprovação de membros ou grupos privados.

MFA administrativo, detecção avançada de fraude, exportação completa de mídia/interações, limpeza física automática, política de retenção definitiva e fluxo de comprovação de idade não estão implementados. As regras e o aceite são funcionais, mas não substituem publicar a política completa e canais de atendimento da plataforma.

O envio real de e-mail exige configurar o provedor. Sem configuração, a conta permanece não verificada e a interface informa que a mensagem não foi enviada. O app nunca confirma automaticamente e-mails para contornar essa pendência.

## Instalar

Consulte `INSTALACAO.md`. A migração `002` é incremental e preserva a `001`, os registros sociais anteriores e as tabelas do ERP. Não utiliza reset ou `sync({alter:true})`.

A cópia local disponível continua sendo a versão reunida das entregas anteriores, não uma consulta à branch atual no GitHub. Não houve deploy ou acesso ao banco de produção. A pré-verificação identifica os arquivos técnicos compartilhados ausentes nessa cópia.
