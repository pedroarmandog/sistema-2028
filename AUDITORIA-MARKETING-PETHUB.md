# PetHub — auditoria e correção das automações de Marketing

## Resultado e alcance

A auditoria identificou defeitos nos cálculos de data, horários, persistência da desativação, atualização de pendências e deduplicação. As correções cobrem os oito tipos implementados no código recebido. A tela e os contratos de conexão/envio foram preservados; o cálculo de referências e a proteção dos disparos foram extraídos para funções compartilhadas e testáveis.

**Validação: 51 testes locais passaram, zero falhas. Nenhuma mensagem real foi enviada.** Não houve acesso ao TiDB ou ao Render de produção. Portanto, este relatório não afirma validação de entrega real nem funcionamento 100% em produção. Templates adicionais criados diretamente no banco não puderam ser inventariados sem acesso ao banco.

A versão usada como base é o projeto fornecido nesta conversa com as correções de importação, isolamento e reconexão persistente do WhatsApp. O ZIP contém apenas arquivos novos/modificados, com os caminhos originais.

## Auditoria por automação

| Automação / tipo | Referência preservada | Comportamento encontrado | Dias selecionados antes | Brasília antes | Persistência encontrada | Correção |
|---|---|---|---|---|---|---|
| Boas-vindas / `boas_vindas` | Cadastro do primeiro pet do tutor | O trigger verificava o primeiro pet e enfileirava imediatamente | A tela oferecia dias anteriores, mas o envio sem data ignorava essa seleção | É imediata; não dependia do horário escolhido | JSON persistia, mas a configuração exibida não representava o comportamento | Mantido envio imediato; modal passa a informar isso, sem permitir antecipação impossível; recibo diferencia evento/empresa/destinatário |
| Pet pronto / `pet_pronto` | Alteração de status para pronto | Envio imediato após o evento | Opções de dias/horas na interface não eram aplicáveis ao evento | É imediata | Conteúdo e ativação no banco | Mantido imediato; evento recebe identidade durável, reserva atômica e validação de empresa; nenhuma alteração no QR/auth |
| Pós-atendimento / `primeiro_banho` | Primeiro atendimento concluído do pet, conforme a regra já implementada | Trigger verificava se havia outro atendimento concluído | Opções anteriores não faziam sentido para um evento já ocorrido | É imediata | Conteúdo/ativação persistidos | Mantida a regra existente e o envio imediato; interface não promete dias anteriores. A regra existente conta atendimentos concluídos, não uma nova classificação de serviços de banho |
| Reposição / `produto_recorrente` | `data_proximo_disparo` e intervalo do lembrete por cliente/produto | Dois crons de produto, mais processamento no startup; execução forçava `diasAntes: 0` | Seleções anteriores eram ignoradas pelo caminho recorrente | Cron fixo dependia do fuso do servidor; horário do template não determinava quando o cron criava a mensagem | JSON persistia, mas o helper reativava automaticamente um template desativado | Um planejador usa os dias/horários salvos, respeita desativação e identifica cada ciclo. Mantidos o primeiro vencimento gravado e o intervalo; avanço usa a âncora do ciclo para evitar deriva |
| Aniversário do pet / `aniversario_pet` | Dia/mês de nascimento do pet e ano da ocorrência | Cron diário preparava aniversários; deduplicação considerava tutor antes de considerar pet/ciclo | Comparação de dias existia, mas dois pets do mesmo tutor e anos seguintes podiam ser bloqueados | Uso de getters locais e cron sem fuso explícito causava dependência do servidor e problemas nas viradas de dia | JSON sim; histórico não identificava o aniversário anual com segurança | Cada pet/ano/dia tem recibo próprio; calendário de Brasília explícito, sem depender do TZ do servidor |
| Aniversário do tutor / `aniversario_tutor` | Dia/mês de nascimento do cliente e ano da ocorrência | Cron diário; deduplicação sem ano | Dias eram lidos, mas anos seguintes podiam ser bloqueados pelo envio anterior | Campo do tutor é DATE, enquanto o do pet é DATEONLY; interpretar nascimento como instante deslocava o dia em alguns caminhos | JSON sim | Nascimento tratado como data civil; novo comprovante por ano/dia e horário de Brasília |
| Lembrete de serviço / `lembrete_agendamento` | Data/hora do agendamento persistido | Criava envios no cadastro; verificação ampla por agendamento bloqueava replanejamentos posteriores | Primeiro agendamento podia criar vários dias, mas alterações de configuração/data não substituíam corretamente os antigos; datas passadas eram convertidas para agora | Helper misturava getters do servidor com offset fixo | Configuração sim; pendências não acompanhavam edição/cancelamento | Dias independentes; edição/status/cancelamento invalidam pendências antigas e materializam as futuras corretas. Evento e destinatário revalidados antes de enviar |
| Produto a receber vencido / `vacinas_vencendo` | Aplicação do produto clínico + dias da periodicidade já cadastrada | Registro clínico e cron diário compartilhavam bloqueios por agendamento | Um produto/dia podia impedir outros produtos ou dias do mesmo atendimento | Getters locais/cron fixo sem fuso; tratamento de data de aplicação inconsistente | JSON sim; variável de startup podia sobrescrever conteúdo e configuração do usuário | Identidade inclui atendimento, item clínico, renovação e dia; datas civis e Brasília explícitos; atualização/cancelamento clínico replanejam; removida a sobrescrita no startup |

“Lembrete de Reposição de Produto” e “produto recorrente” são a mesma automação no código (`produto_recorrente`), não dois mecanismos de envio independentes.

Não foram alterados os textos personalizados das mensagens. Também foi removida a regravação automática de títulos durante a listagem. Seeds só preenchem tipos ausentes, sob transação da empresa, sem reativar ou substituir configurações existentes.

## Regras de data e horário resultantes

- Dias permitidos: 0, 1, 2, 3, 5 e 7, independentes entre si.
- `[0,2]` significa somente no dia e dois dias antes, nunca um dia antes por inferência.
- Horários `HH:MM` representam o relógio de `America/Sao_Paulo`. A conversão usa `Intl` com o fuso explicitamente informado; não depende de `process.env.TZ`.
- A fila recebe um instante Date, que o Sequelize persiste como data/hora. Não foi alterado o fuso global da conexão MySQL, preservando os demais módulos do ERP.
- O horário do agendamento usado no texto vem do campo `horario`; datas de nascimento e aplicação clínica são datas de calendário, não horários a deslocar por UTC.
- Referência 20/11/2026, todas as opções: 13, 15, 17, 18, 19 e 20/11. Configurar apenas 0 e 2 gera somente 18 e 20/11.
- No caso de agendamento de serviço, um lembrete não é criado para depois do início do atendimento.
- Calendário diário é planejado a cada minuto e também após alterações relevantes. A fila passa de cinco minutos para um minuto; chamadas repetidas de inicialização não abrem outro cron ativo no mesmo módulo.

**Precisão e capacidade:** a data/hora programada é respeitada como instante de elegibilidade, sem antecipar. O envio físico pode ocorrer depois por indisponibilidade do WhatsApp, execução do banco, fila ou pelas pausas/limite de 10 mensagens por minuto já existentes. Não há promessa de entrega no segundo exato nem de entregas simultâneas para todos os clientes. O teste local não mediu entrega real pelo WhatsApp.

## Atrasos e pendências

- Offline antes de tentar: permanece pendente, não é marcado enviado e não consome tentativa.
- Falha definida antes de enviar: preservado o limite de três tentativas.
- Queda durante `sendMessage`, resposta sem identificação ou falha ao registrar uma confirmação no banco: resultado incerto; não há repetição automática cega.
- Um processo interrompido com registro `enviando` por mais de cinco minutos passa a erro com `RESULTADO_INCERTO`, em vez de voltar automaticamente a pendente.
- Sucesso é registrado após retorno confirmado do conector. A confirmação Baileys por ID não equivale a comprovante de leitura pelo destinatário.
- Durante o mesmo dia de Brasília, uma pendência de calendário pode ser processada após recuperação, desde que o evento continue válido e, para lembretes de serviço, ainda não tenha começado.
- Um dia de calendário que já passou não é convertido em um disparo imediato fora das opções selecionadas. Isso evita disparar juntos todos os lembretes antigos após reiniciar.
- Ciclos recorrentes vencidos avançam pelo intervalo original; dias passados não geram uma enxurrada de mensagens atrasadas. Os eventos imediatos já enfileirados mantêm a política de pendência, desde que o contexto ainda seja válido.
- Cancelamento manual da fila não é desfeito automaticamente pelo planejamento. Desativar uma automação cancela suas pendências, sem afetar as outras. Envios que já entraram em execução podem não ser interrompíveis.
- “Disparar individual” de produto continua sendo uma ação manual explícita, imediata; agora a resposta informa agendamento/pendência, sem alegar confirmação de entrega.

Resultados incertos aparecem como erro com o texto `RESULTADO_INCERTO` no histórico. Confira o aparelho/histórico antes de decidir por um envio manual. Não foi adicionado um botão de reenvio automático para esse estado.

## Deduplicação e alteração mínima necessária no banco

A única tabela nova desta entrega é **`marketing_disparos`**. Ela é criada automaticamente por `sync()` simples, sem `alter`, sem `force`, sem exclusão de tabelas existentes.

Ela mantém uma chave primária SHA-256 por disparo lógico: empresa, automação, telefone, evento/ocorrência, destinatários, ciclo e dia escolhido. O recibo e a entrada da fila são criados na mesma transação. A reserva para enviar usa UPDATE condicional; a leitura seguida de CREATE sem proteção foi removida.

A tabela nova é necessária para arbitrar concorrência e lembrar confirmações/resultados incertos após reinícios, sem alterar a estrutura de `envios_agendados`. O usuário do TiDB precisa ter permissão para criar essa tabela. Não há dependência nova, Redis, disco persistente ou serviço pago adicional.

Pendências legadas verificáveis do mesmo evento/dia podem ser adotadas. Calendários legados sem referência verificável são cancelados e substituídos pelo planejamento atual. Não há reatribuição automática de dados antigos a uma empresa.

## Isolamento entre empresas

- Contexto autenticado determina a empresa nas rotas; o planejador usa o dono persistido do template/evento.
- Destinatário e telefone são reconsultados no cadastro da empresa. IDs de pet, tutor, atendimento e lembrete são validados antes de criar/enviar.
- Fonte de aniversário é filtrada pelo tutor da empresa e pelo proprietário do pet quando preenchido.
- Atendimentos e lembretes precisam pertencer à empresa; referências cruzadas são recusadas.
- Rotas de mutação de atendimento passaram a incluir empresa no WHERE. Operações clínicas de pet validam o pet/tutor e o atendimento correspondente.
- Foram testados dois WhatsApps simulados, duas empresas e uma referência legada deliberadamente cruzada.
- A fila reserva lotes por empresa, para uma loja não consumir sozinha o lote de outra.

## Arquivos novos/modificados

| Arquivo | Motivo |
|---|---|
| `backend/app.js` | Retirar crons de Marketing duplicados/fixos e a sobrescrita opcional dos templates; manter os demais crons e monitor Baileys |
| `backend/controllers/marketingController.js` | Validar/persistir configuração, cancelar pendências ao desativar, replanejar ao ativar/editar configuração, seed seguro e preservar textos/títulos |
| `backend/controllers/produtoLembreteController.js` | Não reativar template desligado, usar o mesmo planejador, distinguir disparo manual, ciclo em Brasília, recalcular mudança do intervalo e cancelar somente o lembrete/empresa correspondente |
| `backend/routes/agendamentoRoutes.js` | Validar empresa em mutações e pet na criação/edição; sincronizar pendências após mudança de data/status/cancelamento; formatação de data em Brasília |
| `backend/routes/petRoutes.js` | Validar pet/tutor/atendimento da empresa; corrigir data de renovação e sincronizar alterações clínicas |
| `backend/routes/marketingRoutes.js` | Identificar cancelamento manual para impedir recriação automática da pendência |
| `backend/services/whatsappQueue.js` | Cron de um minuto, deduplicação persistida, reserva e revalidação, retentativas corretas e resultado incerto; corrigir instância Sequelize desatualizada após reserva |
| `backend/services/whatsappService.js` | Somente o envio recebe a indicação `incerto` quando a operação já começou e perdeu a confirmação |
| `backend/services/marketingTempo.js` — novo | Validação e cálculos de calendário/horários com fuso explícito |
| `backend/services/marketingEventos.js` — novo | Referências de cada tipo, propriedade de dados e revalidação antes do envio |
| `backend/services/marketingDisparos.js` — novo | Comprovantes SQL, chave única e estados confirmados/incertos |
| `backend/services/marketingScheduler.js` — novo | Planejamento comum e atualização de pendências após edições |
| `frontend/marketing.js` | Hidratar/salvar seleções exatas, diferenciar eventos imediatos e exibir validações |
| `frontend/marketing.html` | Identificar o horário de Brasília e a informação de envio imediato no modal existente |
| `tests/marketing-agendamento.test.js` — novo | Testes de datas, fontes reais em banco isolado, fila, isolamento, edição e modal |
| `AUDITORIA-MARKETING-PETHUB.md` — novo | Este relatório e roteiro de instalação |

**Preservação de conexão:** a comparação exata do código anterior à função de envio confirmou que todo o fluxo de QR, autenticação, persistência de credenciais e reconexão do Baileys permaneceu idêntico ao pacote anterior. As alterações no serviço ficaram dentro de `enviarMensagem`, para informar resultado incerto.

## Testes e resultados

**51 testes reportados pelo Node passaram, zero falhas.** Foram executados 21 testes/agrupamentos de Marketing e 30 testes/agrupamentos anteriores de WhatsApp, persistência/reconexão, importação e isolamento/cadastro. A checagem de sintaxe passou nos 14 arquivos JavaScript novos/modificados.

Cobertura nova:

1. Cada opção individual, combinações e todas as seis opções, com datas exatas.
2. Servidor em UTC, Los Angeles e Tóquio: 09:00 de Brasília corresponde ao mesmo instante; viradas de dia/ano e nascimento sem deslocamento.
3. Planejamento repetido/concorrente sem criar duplicações; aniversário do ano seguinte não bloqueado.
4. Dois pets de um tutor não se bloqueiam; vínculo de pet com empresa divergente é recusado.
5. Duas empresas com horários diferentes enviam pelo conector e ao telefone corretos.
6. Offline preserva pendente e tentativas; confirmação impede reenvio nas execuções seguintes.
7. Ativar, salvar e recarregar JSON após recriar módulo; invalidação HTTP 400 e tentativa cruzada 403.
8. Horário/dias editados atualizam pendências; desativação impede envio.
9. Mudança/cancelamento de atendimento invalidam lembrete antigo; sincronização imediata cria as datas futuras corretas.
10. Produtos clínicos diferentes no mesmo atendimento e dias diferentes geram identidades independentes.
11. Produto recorrente respeita intervalo, dias e hora; template desligado não é reativado pelo processamento.
12. Disparo manual usa o dia de Brasília e não simula entrega confirmada.
13. Boas-vindas, pronto e pós-atendimento mantêm semântica imediata.
14. Três tentativas definidas; resultados incertos e perda de gravação após ACK não geram repetição cega.
15. Registro abandonado em enviando não é reenviado após recarregar módulo.
16. Cancelamento manual não é desfeito pelo próximo planejamento.
17. HTTP com JWT real: empresa B não altera atendimento nem registra vacina em pet da A. Operação de foto legítima da A continua funcionando no teste.
18. DOM simulado: salvar, fechar/reabrir, dias exatos, hora e modo imediato do modal.
19. Serviço de envio real com socket simulado diferencia falha antes de enviar e interrupção após iniciar `sendMessage`.

Ambiente: Node 24, SQLite em memória, envio simulado; nenhum acesso/transmissão real pelo WhatsApp. Transações do laboratório são serializadas porque o SQLite em memória tem uma única conexão. A proteção entre processos foi implementada com unicidade SQL/reserva condicional, mas não foi feito um teste com dois servidores reais concorrendo no TiDB. Recarregar módulos exercita recuperação de dados persistidos na mesma base de teste, não um restart real do Render.

Os testes anteriores continuam cobrindo o ciclo de QR/515/open e uma simulação de relógio de 24 horas. Isso não representa um teste real de estabilidade por 24 horas.

## Instalação no PowerShell e Render

1. Faça backup dos arquivos atuais e do banco. Extraia o ZIP **na raiz de `sistema-2028`**, mesclando `backend`, `frontend` e `tests`. Não crie outra pasta do projeto dentro da atual.
2. Os arquivos completos são baseados no projeto disponível nesta conversa. Caso tenha feito mudanças adicionais neles, compare antes de substituir.
3. Não substitua `.env` nem gere novas chaves JWT/WhatsApp/fiscais para esta correção.

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\tests\marketing-agendamento.test.js .\tests\whatsapp.test.js .\tests\whatsapp-persistencia.test.js .\tests\importacao.test.js .\tests\itens-isolamento.test.js .\tests\cliente-sexo.test.js
```

Requer Node 22.13+ ou 24 e as dependências já instaladas. O teste utiliza o adaptador existente `backend/scripts/lab-fiscal/sqlite.js`. Avisos de SQLite experimental/TEXT do laboratório são esperados; o resultado deve terminar com `fail 0`. Não execute o laboratório conectado ao banco de produção.

```powershell
git add backend/app.js backend/controllers/marketingController.js backend/controllers/produtoLembreteController.js backend/routes/agendamentoRoutes.js backend/routes/petRoutes.js backend/routes/marketingRoutes.js backend/services/whatsappQueue.js backend/services/whatsappService.js backend/services/marketingTempo.js backend/services/marketingEventos.js backend/services/marketingDisparos.js backend/services/marketingScheduler.js frontend/marketing.js frontend/marketing.html tests/marketing-agendamento.test.js AUDITORIA-MARKETING-PETHUB.md
git commit -m "Corrige dias horarios isolamento e duplicidade das automacoes"
git push
```

No Render:

- Mantenha build `npm ci --omit=dev` e start `npm start`. O projeto não possui build separado e não houve alteração em dependências/lockfile.
- Mantenha as configurações de banco/TLS, JWT e WhatsApp já usadas. Não há variável nova obrigatória.
- `RUN_STARTUP_MESSAGE_UPDATE` deixa de ser utilizado: pode removê-lo para não sugerir uma atualização que foi retirada justamente por sobrescrever configurações e textos personalizados.
- Permita criação da tabela `marketing_disparos` com o usuário atual do banco. Não há SQL manual de alteração das tabelas existentes.
- Após deploy, atualize a página com Ctrl+F5 para carregar o HTML e JavaScript do modal juntos.

## Validação prática controlada

Use uma empresa de testes do PetHub com apenas seus números de telefone; não teste ativando envios para toda a carteira real.

1. Cadastre um pet/tutor de teste com aniversário em uma data próxima. Ative apenas os dias desejados e coloque horário de Brasília alguns minutos à frente. Reabra a edição e confirme os valores salvos.
2. Faça duas mensagens com horários diferentes. Confira os horários em Marketing e no histórico de envios, sem confundir data agendada com confirmação.
3. Para serviço, crie atendimento futuro para seu pet de teste e escolha os dias de lembrete. Altere a data: as pendências antigas devem ser canceladas e as novas refletir a edição.
4. Desative uma mensagem antes do horário e confirme que não dispara. Reative e confira que só os dias atuais selecionados ficam elegíveis.
5. Desconecte o WhatsApp antes do horário de um teste, mantenha o teste no mesmo dia e reconecte. O registro não deve aparecer enviado durante a indisponibilidade; confirme o recebimento após retomar.
6. Reinicie o serviço e confirme que a configuração permanece. Um envio já confirmado não deve reaparecer como novo disparo.
7. Se houver `RESULTADO_INCERTO`, confira o celular/histórico antes de usar um envio manual. Não interprete essa marcação como certeza de falha nem como certeza de entrega.

Referências técnicas consultadas: documentação de opções de agendamento do node-cron (https://www.nodecron.com/scheduling-options.html) e definição explícita de `timeZone` da ECMA-402 (https://402.ecma-international.org/13.0/). A implementação e os testes usam as dependências já existentes no projeto.
