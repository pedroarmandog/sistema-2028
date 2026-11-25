# Continuação — versão 2 de homologação

25/11/2026. Esta revisão conclui pendências locais e corrige lacunas da central, sem iniciar atendimento real.

- Busca no servidor por nome, telefone e conteúdo cifrado da própria empresa; lista e histórico paginados; filtros de atendimento humano, espera, finalização, agendamentos e erros.
- Detalhes com tutor, pets, trechos de contexto, mensagens por autor e tokens confirmados, sem custos internos para o gestor. Sandbox não fica acessível pela central geral, mesmo por identificador direto.
- Mensagens do cliente continuam registradas quando a equipe assume ou a automação está pausada/fora do horário. Isso não cria resposta automática nem chamada OpenAI.
- Registro de faturas OpenAI/WhatsApp por competência e escopo, somente para Admin. Conferência manual explícita, sem alterar consumo/limites e sem somar faturas globais/atribuídas sobrepostas.
- Métrica de atendimento fora do horário publicado, incluindo feriados e agrupamento de mensagens na passagem de horário. Dados históricos desconhecidos não são inventados.
- Boas-vindas do primeiro pet confirmado usam a automação já existente, com idempotência e registro de falha incerta. Controllers, biblioteca WhatsApp e filas existentes permanecem intactos.
- Remoção de conteúdo pessoal preserva valores de serviços agendados e tempos de entrega conhecidos; métricas não usam a data de edição como se fosse horário de resposta.

84 testes locais aprovados, zero falhas. O relatório completo está em resultado-testes.txt. Além da suíte nova, foram repetidas as regressões existentes de importação e instâncias WhatsApp.

Para atualizar a v1: copie os arquivos deste pacote, preserve o .env/chave de cifragem, rode novamente o integrador e o preparador de tabelas conforme DEPLOY.md. A única tabela adicional é pethub_ia_faturas. Nenhuma nova dependência ou variável de ambiente.

whatsappService.js permaneceu idêntico à revisão mínima autorizada; o integrador foi reaplicado e não alterou os arquivos existentes desta cópia. O pacote não contém versões completas de app.js, whatsappService.js ou package.json para sobreposição.

A IA continua desligada por padrão. Não houve publicação no Render, mudança em banco de produção, uso de chave OpenAI do usuário ou envio a clientes. Ainda são necessários os testes reais da matriz de TESTES.md. O canal oficial continua bloqueado para atendimento automático até sua homologação específica; o piloto utiliza a conexão atual do PetHub.
