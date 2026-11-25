# Configuração e implantação

## Preservação da instalação atual

Não trocar a biblioteca, variáveis, chaves, banco de autenticação ou rotinas de restauração do WhatsApp. O integrador mantém as dependências já existentes e acrescenta somente `openai@7.64.0` e `ajv@8.20.0`. Não substitua seu package.json/package-lock por arquivos antigos do projeto usado para desenvolvimento.

O integrador modifica os seguintes pontos:

| Arquivo existente | Alteração |
| --- | --- |
| backend/app.js | Instancia módulo isolado, monta webhook bruto antes do parser JSON, API autenticada e página protegida; injeta loader; registra parada apenas do worker IA; acrescenta cabeçalho CORS. |
| backend/services/whatsappService.js | Somente recebimento passivo `messages.upsert` e quinto argumento opcional de autorização/ID do envio IA. |
| frontend/painel-admin/admin-dashboard.js | Callback opcional após criação bem-sucedida de empresa; não bloqueia o fluxo existente. |
| frontend/novo-atendimento-global.js | Ícone de origem ao lado do nome do pet, baseado em metadado de agendamento. |
| backend/services/pushNotificationService.js | Novo tipo de notificação `pethub_ia`; payloads existentes preservados. |
| frontend/mobile/service-worker.js | Destino do novo tipo de notificação para a página responsiva de IA. |
| package.json | SDK e validador novos; dependências atuais mantidas. |

O Dashboard HTML/CSS original, autenticação do WhatsApp, filas de disparos, lembretes e mecanismos de reconexão não são modificados pelo integrador. O código da IA chama o sincronizador existente de lembretes após operações de agenda, sem editar esse sincronizador.

## Atualizar uma instalação da versão 1

Copie os arquivos novos/atualizados do pacote, mantendo o .env e a chave de cifragem existentes. Rode novamente o integrador (idempotente) e o script preparar-pethub-ia.js para acrescentar a tabela pethub_ia_faturas. Não há novas dependências npm nem variáveis de ambiente nesta revisão. Não troque a chave de cifragem durante a atualização. As duas flags permanecem desligadas até a homologação autorizada.

Nesta continuação, whatsappService.js permaneceu byte a byte igual à adaptação mínima já autorizada. O integrador foi reaplicado sem modificar nenhum arquivo existente.

## Preparar em homologação

1. Tenha backup do código e do banco. Rode o integrador antes da publicação; revise o diff e os backups gerados.
2. Na cópia de homologação, execute `npm install --ignore-scripts` para atualizar o lockfile com as duas novas dependências. Confira que não foi alterada a versão da biblioteca WhatsApp no lockfile; conserve as versões do ambiente atual. Inclua o lockfile revisado no seu processo normal de deploy.
3. Acrescente as variáveis de `.env.pethub-ia.example` ao ambiente existente. Não substitua o .env atual. Comece com as duas flags em `false`.
4. Gere a chave de cifragem uma vez, no servidor seguro, com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Guarde-a com o backup, sem colocá-la no repositório ou frontend. A troca sem migração torna o histórico cifrado ilegível.
5. Use o mesmo banco MySQL/TiDB configurado pelo ERP. Execute `NODE_ENV=production node backend/scripts/preparar-pethub-ia.js`. O script cria somente as tabelas do módulo com CREATE IF NOT EXISTS e sementes idempotentes; não usa alter/force e não modifica dados existentes do ERP.
6. Faça o deploy pelo procedimento atual do PetHub, preservando a configuração e a persistência do WhatsApp. Um deploy pode reiniciar o processo; esta entrega não autoriza encerrar ou apagar sessões existentes.

## Configuração administrativa antes de testar

- Defina `PETHUB_IA_ENABLED=true` somente na homologação para iniciar os workers. Mantenha `PETHUB_IA_ALLOW_LIVE=false`.
- Insira `OPENAI_API_KEY` no ambiente do servidor. Nenhum teste externo foi realizado com a chave de Pedro nesta entrega.
- No Admin → Gestão PetHub IA, cadastre o ID exato do modelo e os preços atuais de entrada, saída, cache e, se aplicável, áudio. Informe a fonte oficial. A validação consulta a disponibilidade do modelo para essa chave; não prova que todas as ferramentas funcionam com o modelo. Essa compatibilidade exige o teste real seguinte.
- Configure teto global mensal, tetos por empresa e franquias de tokens/áudio. Os planos iniciais têm somente mensalidade e respostas comerciais; modelos e tetos técnicos começam vazios/zero para impedir consumo automático.
- Libere uma empresa de homologação. O vínculo Admin/ERP é resolvido por CNPJ, pois os IDs das duas tabelas não são necessariamente iguais. Vínculo ausente ou ambíguo bloqueia a alteração.
- A empresa configura identidade, permissões, scripts, serviços publicados, duração, profissionais e horários. O canal para o piloto é a conexão atual do PetHub. A IA lê o status existente e não tenta conectar outro socket.
- Faça o teste real em “Testar recepcionista”. Esse teste consome orçamento/tokens autorizados, mas não envia WhatsApp nem grava cadastros/agendamentos reais. Só um teste concluído e associado à revisão atual permite ativação.

## Piloto autorizado

Somente depois dos testes externos e da autorização de atendimento real: definir `PETHUB_IA_ALLOW_LIVE=true`, reiniciar pelo fluxo normal, manter a licença da empresa ativa e ativar a recepcionista no painel do gestor. Criar contrato não inicia atendimento sozinho.

A recepção é limitada a mensagens novas de contatos individuais. Grupos, status, histórico sincronizado e instâncias `disp_*` não viram conversas da IA. Há limite por contato e agrupamento de mensagens; após assumir por humano a IA para naquela conversa. Envio incerto exige revisão humana e não é reenviado automaticamente.

## Dependências e infraestrutura

Código validado com Node 24 neste ambiente; os testes com SQLite integrado precisam dessa versão. Produção continua usando Sequelize e MySQL/TiDB do ERP. Áudio exige ffprobe no PATH, a biblioteca Baileys que já está instalada, SDK OpenAI, modelo de transcrição autorizado e preços configurados. Avatar reaproveita o armazenamento de mídias existente; notificações reaproveitam VAPID e subscriptions existentes.

Verifique que `backend/services/marketingScheduler.js` da versão em produção exporta `sincronizarAgendamento(agendamento, empresaId)`. O portal já usa essa interface. Esse arquivo não estava presente na cópia local recebida; a IA registra `IA_LEMBRETE_PENDENTE` se a sincronização falhar, sem modificar ou interromper a fila existente. Essa integração precisa de teste no projeto efetivamente publicado.

Para operação contínua: processo que não entre em suspensão por inatividade, banco disponível, armazenamento persistente, acompanhamento de jobs incertos e reservas conservadoras. Não foi realizado ensaio de 24 horas no Render.

## Pausa e rollback

- Pausar por empresa: desligar o atendimento no gestor ou suspender o contrato no Admin. Não chamar Desconectar no WhatsApp.
- Pausar todo o módulo: `PETHUB_IA_ENABLED=false` e `PETHUB_IA_ALLOW_LIVE=false` pelo procedimento normal de reinício. O código do WhatsApp permanece utilizando o fluxo atual.
- Rollback de código: restaure os arquivos existentes a partir do backup do integrador ou do seu versionamento, retire os novos pontos de integração e preserve tabelas/histórico da IA. Não reverta arquivos não relacionados.
- Rollback de schema: `node backend/scripts/rollback-pethub-ia.js --confirmar-tabelas-sem-uso` recusa remoção se houver dados de utilização/contratos/configurações. Para instalação utilizada, preserve os dados e use a pausa; exclusão posterior exige procedimento de retenção e backup. Não apagar tabelas do WhatsApp.
- Chamadas já iniciadas podem ter custo mesmo após uma pausa. O orçamento reservado é liquidado conservadoramente se não houver confirmação de uso. Pausa bloqueia novas chamadas e envios posteriores, sem fingir estorno.

## Conferência financeira manual

Admin → Gestão PetHub IA → Faturas dos fornecedores permite registrar fornecedor, referência única, empresa/conta global, competência e valor em USD. O sistema persiste o registro imutável e compara faturas OpenAI à estimativa da mesma competência. Custos WhatsApp também podem ser registrados, sem fingir uma estimativa inexistente para o fornecedor. Não há consulta automática de fatura, cobrança de cartão, pagamento ou alteração do consumo/teto. Uma fatura global pode incluir outras despesas/projetos: faça a conferência do escopo e não a some a faturas atribuídas que representem os mesmos gastos.

## Busca e retenção

A busca examina até 500 conversas por requisição e devolve cursor para continuar. Não apresenta ausência definitiva enquanto houver páginas por examinar. Como mensagens estão cifradas, a busca de conteúdo é executada no servidor somente nas conversas da empresa autenticada. Há limite explícito de 20.000 mensagens examinadas por requisição e 10.000 por conversa; uma busca ampla que exceda esses limites pede refinamento, sem truncar silenciosamente os resultados. Histórico é paginado e a exportação completa de mensagens retidas tem limite explícito de 10.000 mensagens; inclui até 30 ações recentes, identificado no arquivo exportado.

O sandbox fica fora da central geral, inclusive por acesso direto a identificadores. A limpeza de conteúdo remove nomes, texto, contatos e saídas cifradas, preservando somente metadados não pessoais necessários às métricas de valores agendados e tempos conhecidos, além dos registros financeiros de consumo e faturas. Um tempo de entrega desconhecido não é estimado pela data de edição do registro.
