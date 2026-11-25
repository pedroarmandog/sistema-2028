# Implementação por fase

Status: implementação para homologação. As fases possuem código executável; a validação de produção e as complementações listadas em LIMITACOES.md ainda não estão concluídas. Não houve alteração no banco, no Render ou nos aparelhos do usuário.

## Fase 1 — Administração, assinatura e acesso

Arquivos novos: `backend/services/pethubIA/modelos.js`, `assinaturas.js`, `validacao.js`; `backend/routes/pethubIARoutes.js`; `frontend/components/pethub-ia/admin.js`, `loader.js`, `ui.js`; scripts `preparar-pethub-ia.js`, `rollback-pethub-ia.js`, `integrar-pethub-ia.js` em `backend/scripts/`.

Implementado: três planos iniciais (Essencial R$199,90/3.000 respostas; Profissional R$349,90/8.000; Personalizado), planos adicionais/versionamento, contrato individual com fotografia dos recursos, licença separada de pausa operacional, ativação opcional durante cadastro, coluna e gerenciamento no Admin, validação de permissões e acesso direto protegido. O vínculo empresa administrativa/ERP usa CNPJ com unicidade e rejeita IDs não correspondentes.

Integrações existentes: `authAdmin`, `authUser`, modelos `EmpresaPainel`, `Empresa`, `Usuario`, tabela e formulário originais do Admin. Reaproveitados sem criar outro login ou cadastro de empresas.

Alterações existentes: pontos de API/página/loader em app.js; callback não bloqueante na criação de empresa. Migrations: as 15 tabelas abaixo. Variáveis: chave de cifragem para conteúdo, flags de módulo e atendimento real. Testes: acesso, assinatura, vínculo, planos, contrato individual, suspensão e permissões.

## Fase 2 — Configurações e experiência

Arquivos novos: `configuracao.js`, `frontend/configuracoes/pethub-ia.html`, `frontend/components/pethub-ia/gestor.js`, `estilos.css` e componentes compartilhados da fase 1.

Implementado: 12 abas, identidade/avatar, idiomas, personalidade/formalidade/emojis, instruções e scripts CRUD, FAQ, permissões por contrato, serviço/profissional publicado, dias/horários/capacidade/duração, feriados/bloqueios, modo de agendamento, retenção, limites por interação, testes e ativação condicionada à revisão testada. Alterar configuração pausa e invalida trabalhos antigos; ações posteriores precisam de confirmação novamente.

Integrações existentes: menus copiados de dashboard.html com caminhos raiz; dashboard.css preservado; armazenamento de mídias por empresa; catálogo de produtos e profissionais; regras da agenda do portal. Sem alteração no Dashboard original.

Testes: DOM das 12 abas, cópia dos menus, caminhos de recursos, IDs únicos, texto seguro e menu oculto para não contratante. Pendente: ensaio visual em navegadores e celular reais, refinamentos da central e cobertura completa de idiomas/estilos com o modelo externo escolhido.

## Fase 3 — Motor e OpenAI

Arquivos novos: `openai.js`, `motor.js`, `ferramentas.js`, `consumo.js`, `index.js`, `relatorios.js` em `backend/services/pethubIA/`.

Implementado: SDK oficial, Responses com store:false, ferramentas com schemas estritos/AJV, permissões efetivas no backend, contexto cifrado, janela de mensagens recentes, resumo compacto de trechos, propostas persistidas/expiráveis, confirmação posterior do remetente, sandbox que não grava ERP nem envia WhatsApp, fila SQL, deduplicação, ordenação por conversa, leases, concorrência limitada, timeout e recuperação de jobs interrompidos.

Dependências novas: openai 7.64.0 e ajv 8.20.0. Variáveis: OPENAI_API_KEY, OPENAI_REQUEST_TIMEOUT, PETHUB_IA_ENCRYPTION_KEY, PETHUB_IA_CONCURRENCY, flags. Testes: SDK injetado, orçamento, limite de ferramentas, histórico, job duplicado, memória sem mensagens futuras, falhas e reinício. Pendente: chave real, modelo e preços reais, ensaio do SDK externo/compatibilidade, infraestrutura contínua e concorrência no TiDB.

## Fase 4 — Operações e WhatsApp atual

Arquivos novos: `whatsapp.js` e as ferramentas da fase 3. Arquivo existente modificado sob autorização: `backend/services/whatsappService.js`, somente nos dois pontos registrados em DEPLOY.md e no diff de revisão.

Implementado: recepção passiva no socket atual, exclusão de grupos/status/histórico/disp_*, envio pelo remetente existente, checagem opcional imediatamente antes de enviar, ID estável, transferência humana e console da equipe. Consulta de produtos/estoque/preços atuais; identificação por telefone do remetente; consultas e cadastro de cliente/pet; agendamento, cancelamento, reagendamento e Táxi Dog do próprio atendimento. Escritas exigem confirmação posterior, posse e empresa corretas e revalidação transacional. A origem fica em `servicos[].meta.pethubIA`, sem nova agenda paralela.

Integrações existentes: modelos Cliente/Pet/Produto/Profissional/Agendamento; serialização, payload, disponibilidade e proteção de reservas do portal; sincronizador existente de lembretes após agenda. Solicitações que aguardam equipe ficam como ação IA ligada à conversa, pois uma conta do aplicativo do tutor não pode ser inventada para inserir uma solicitação do WhatsApp. Os hooks atuais do portal continuam observando as gravações no mesmo modelo de agenda.

A fila `EnvioAgendado` é consultada, sem alterações, para distinguir um eco de lembrete de uma mensagem humana. Mensagens sem vínculo identificável são tratadas conservadoramente como intervenção humana. Não há bloqueio do envio do lembrete existente. Testes cobrem isolamento desse reconhecimento e falha da IA sem desconexão do socket.

Boas-vindas após o primeiro pet confirmado são delegadas ao método existente dispararMensagemAutomatica, com registro idempotente no módulo; não modifica as filas ou templates. Pendente: integração de lembretes/boas-vindas na versão publicada, fluxos reais com aparelho e eventual preço específico por porte/raça. Canal oficial permanece em homologação, com atendimento automático bloqueado.

## Fase 5 — Gestão comercial

Arquivos: assinaturas.js, consumo.js, modelos.js, rotas e painel Admin.

Implementado: reservas globais e por ciclo antes da chamada, teto/token/áudio, fotografia de preços por chamada, cache, uso confirmado versus conservador, consumo comercial somente após confirmação do envio, crédito idempotente, renovação de ciclo sem apagar histórico e alertas de franquia. Ajuste individual preserva uso acumulado e créditos; alterar o plano padrão não reescreve contratos. Modelos fora do contrato são negados; não há fallback caro automático.

Painel: contratantes, status, mensalidade contratada, consumo, estimativa OpenAI, filtros por empresa/plano/status/período, comparativos por empresa e gráficos. Custos internos só para Admin; gestor vê plano/franquia e histórico próprio.

Testes: reservas concorrentes no laboratório, orçamento, timeout conservador, idempotência, créditos, mudança individual de contrato, virada mensal e suspensão. A versão 2 registra faturas manuais de OpenAI/WhatsApp por referência, empresa e competência; compara a estimativa sem sobrescrever orçamento/consumo e sem somar escopos sobrepostos. Pendente: conciliação automática com APIs e controles da alternativa oficial. O painel não representa lucro líquido nem cobrança/recebimento de mensalidades.

## Fase 6 — Conversas, relatórios, push e áudio

Arquivos: relatorios.js, audio.js, gestor.js; novo tipo em pushNotificationService.js e destino específico em mobile/service-worker.js. Sem substituição das notificações atuais.

Implementado: mensagens por autor, assumir/devolver/finalizar, mensagem manual da equipe, detalhes de contato e ações, exportação e exclusão autorizada de conteúdo com preservação financeira. Relatórios com operações, consultas, demanda por hora, produtos/serviços, conversão, tempo médio e valor agendado separado de faturamento. Estimativa de tempo economizado identifica a premissa. Filtros de período. Áudios com limite 5 MB/120 s, verificação real de duração por ffprobe, tarifa/reserva e SDK de transcrição. Notificações usam subscriptions e VAPID existentes, com preferências próprias do módulo.

Variáveis: OPENAI_TRANSCRIPTION_MODEL, PETHUB_IA_FFPROBE; VAPID existente. Testes: validação de áudio, duração/limites, relatório real por empresa e ausência de envio no sandbox. A versão 2 conclui busca no servidor, paginação da lista/histórico, filtros de espera/erro/agendamento, tutor/pets/contexto e tokens confirmados. Mantém mensagens sob atendimento humano e pausa sem responder automaticamente. Dados financeiros e tempos conhecidos são preservados após remoção de conteúdo pessoal. Pendente: áudio no aparelho, OpenAI transcrição real, push no App do Gestor e validação de desempenho/visual real.

## Fase 7 — Produção

Ainda pendente de homologação externa. O pacote não altera flags de produção, não instala no Render, não utiliza credenciais do usuário e não inicia conversas reais. Matriz de testes externos em TESTES.md. A operação de 24 horas e as complementações de LIMITACOES.md não foram atestadas.

## Migrations aditivas

O script preparar-pethub-ia.js cria somente:

| Tabela | Finalidade |
| --- | --- |
| pethub_ia_global | Chave e orçamento globais; metadados administrativos. |
| pethub_ia_planos | Planos e versões. |
| pethub_ia_assinaturas | Contrato/licença por empresa. |
| pethub_ia_configuracoes | Configuração operacional por empresa/revisão. |
| pethub_ia_ciclos | Franquia/consumo por ciclo. |
| pethub_ia_creditos | Acréscimos idempotentes ao ciclo. |
| pethub_ia_conversas | Estado, responsável, contexto e lease. |
| pethub_ia_mensagens | Histórico cifrado e IDs de origem. |
| pethub_ia_fila | Trabalho persistente e estado de entrega. |
| pethub_ia_consumo | Reservas, uso e fotografia de tarifa. |
| pethub_ia_acoes | Propostas, confirmações e resultados. |
| pethub_ia_auditoria | Eventos administrativos/operacionais. |
| pethub_ia_precos | Tarifas de modelos autorizadas. |
| pethub_ia_notificacoes | Outbox de avisos do módulo. |
| pethub_ia_faturas | Faturas informadas pelo Admin e conferência por fornecedor/competência. |

Nenhuma coluna é acrescentada às tabelas de WhatsApp, cliente, pet, item ou agendamento. A coluna visual de IA no Admin consulta as tabelas novas. As consultas do catálogo usam atributos explícitos e não dependem da coluna opcional imagemVersoes.

## Arquivos adicionais/alterados nesta continuação

Novos serviços: backend/services/pethubIA/conversas.js, financeiro.js e privacidade.js. Novas interfaces: frontend/components/pethub-ia/conversas-ui.js e financeiro-ui.js.

Atualizados somente arquivos do novo módulo: serviços index.js, modelos.js, motor.js, ferramentas.js e relatorios.js; backend/routes/pethubIARoutes.js; frontend/configuracoes/pethub-ia.html; componentes admin.js, gestor.js, loader.js e estilos.css; testes e documentação. Nenhuma nova alteração no arquivo de conexão WhatsApp, em seus controllers, filas ou cron.

Migrations: preparar-pethub-ia.js passa a criar pethub_ia_faturas quando ausente. Nenhuma nova coluna nas tabelas existentes. Nenhuma nova variável ou dependência externa.
