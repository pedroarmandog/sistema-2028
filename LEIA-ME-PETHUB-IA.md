# PetHub IA — Recepcionista Inteligente

Versão 2 de homologação, 25/11/2026. Código implementado e testes locais realizados; **não publicado nem ativado em produção**. A validação externa e algumas funcionalidades avançadas estão pendentes. Não tratar esta entrega como liberação comercial concluída.

## O que está incluído

- Controle administrativo de planos, assinaturas, recursos, datas, tetos, créditos e auditoria por empresa.
- Coluna PetHub IA na tabela existente de empresas; opção desligada por padrão no cadastro de empresa; Gestão PetHub IA no Admin.
- Página de configurações com 12 abas, usando os menus copiados do Dashboard e seus estilos existentes.
- SDK oficial OpenAI, consultas ao ERP, ações com confirmação posterior, modos de consulta/aprovação/agendamento, contexto persistente, sandbox, transferência humana e fila persistente.
- Reservas financeiras antes de chamadas, consumo de tokens/cache/áudio e contagem comercial somente após envio confirmado.
- Central com busca no servidor por nome/telefone/conteúdo, paginação, filtros, histórico completo paginado, tutor/pets e consumo sem custos internos. Mensagens recebidas durante atendimento humano ou pausa operacional continuam registradas, sem chamar a IA.
- Relatórios de operações, valor agendado e atendimento fora do horário publicado; notificações pelo serviço existente do App do Gestor e identificação de origem na agenda.
- Registro manual de faturas de fornecedores e conferência por período, sem alterar consumo/limites ou somar escopos sobrepostos. Boas-vindas do primeiro pet delegadas à rotina existente com controle de idempotência.
- Duas adaptações autorizadas no WhatsApp: observador de mensagens recebidas e autorização opcional antes do envio da IA. A IA utiliza a sessão e o remetente existentes.

Veja [ALTERACOES-V2.md](docs/pethub-ia/ALTERACOES-V2.md) para as novidades e atualização da versão anterior.

## Instalação

Este pacote contém arquivos novos e um integrador para as alterações pontuais. **Não contém versões completas de app.js, whatsappService.js ou package.json para sobrepor sua versão atual.**

1. Copie os diretórios `backend/`, `frontend/`, `tests/`, `docs/`, o exemplo de ambiente e este documento para a raiz do projeto existente.
2. Execute `node backend/scripts/integrar-pethub-ia.js`. Ele valida os pontos de integração, confere o hash da versão autorizada do WhatsApp e salva os arquivos que vai modificar em `backups/pethub-ia-<data>/` antes de escrever. Se a sua versão divergir, ele recusa aplicar todas as alterações; revise o conflito, sem substituir o WhatsApp por outra versão.
3. Leia [DEPLOY.md](docs/pethub-ia/DEPLOY.md) antes de instalar dependências, preparar tabelas ou publicar.

O módulo fica desligado com `PETHUB_IA_ENABLED=false`; a instalação não conecta aparelhos, não gera QR, não faz chamadas OpenAI e não envia mensagens.

## Validação e pendências

Os testes utilizam SDK e sockets injetados, banco SQLite apenas em memória e identidades de autenticação de laboratório. Não são prova de funcionamento por 24 horas, nem de concorrência real no TiDB. Veja [TESTES.md](docs/pethub-ia/TESTES.md) e [LIMITACOES.md](docs/pethub-ia/LIMITACOES.md).

O canal oficial possui estrutura de webhook, verificação, mídia e envio, mas o atendimento automático por esse canal está bloqueado nesta versão enquanto a conciliação financeira e a homologação externa não forem concluídas. O piloto deve utilizar a conexão atual, conforme solicitado.

[FASES.md](docs/pethub-ia/FASES.md) discrimina arquivos, integrações reaproveitadas, migrations, variáveis e o que ainda falta.
