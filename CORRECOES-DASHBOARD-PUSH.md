# PetHub — quatro correções pontuais de Dashboard e Push

## Resultado

62 testes locais aprovados, zero falhas: 11 testes/agrupamentos novos e 51 de regressão de Marketing, WhatsApp, importação, cadastro e isolamento. Banco SQLite em memória, transporte Web Push simulado, HTTP com JWT de laboratório. Nenhum push real nem mensagem WhatsApp foi enviado. Não houve acesso ao TiDB/Render de produção.

O pacote é incremental, baseado no projeto desta conversa com as correções anteriores de Marketing/WhatsApp/importação. Contém nove arquivos de código novos/modificados e este guia. Compare antes de substituir se fez outras edições nos mesmos arquivos depois da versão fornecida.

## Causas e correções

### 1. Clientes cadastrados no mês

O backend já tinha uma contagem parcial por mês, mas o frontend usava `data.clientesMes || data.clientes || 0`. Quando `clientesMes` era zero, JavaScript escolhia o total histórico. Esse era o defeito que fazia a contagem aparentar não zerar na virada.

Correção: Desktop usa exclusivamente `clientesMes`, preservando zero. O backend calcula `[início do mês, início do próximo mês)` com `America/Sao_Paulo`, filtrando `Cliente.createdAt` e a empresa autenticada. A contagem mensal é consultada em cada requisição do resumo, inclusive quando o restante do resumo é servido pelo cache. A chave do cache inclui o dia para não atravessar viradas com dados antigos.

Nada é apagado ou reiniciado. Nenhuma data de cadastro é modificada. O campo `clientes` e seu critério histórico foram preservados. O Mobile continua usando esse campo, e não `clientesMes`. Nenhum arquivo do Mobile foi alterado. Também não se alterou o critério histórico existente para passar a filtrar `ativo` ou para limitar por mês.

### 2. Serviços no estoque baixo

A consulta verificava somente quantidade, sem restringir o tipo. Além disso, o OR da condição de estoque precisava de agrupamento completo para se combinar corretamente com os demais filtros.

Correção na origem SQL: somente itens classificados como produto entram; `servico`, `plano` e demais classificações explícitas não entram. Como o catálogo existente trata tipo nulo/vazio como produto legado, esse comportamento foi preservado. Não foi inferido o tipo pelo nome.

O critério da tabela permanece estoque zero ou abaixo do mínimo. Mínimo, ideal e fórmulas de sugestão não foram alterados; `estoqueIdeal` passa a ser retornado com o valor gravado, em vez de ficar ausente na resposta. Produtos/serviços existentes não são reclassificados, excluídos ou editados por esta correção.

### 3. Push de cancelamento

Havia disparo manual de push em dois caminhos, mas nenhum no DELETE que também representa cancelamento. Repetições do status podiam publicar novamente, e o payload não utilizava serviço e horário de forma consistente.

Correção: um evento do modelo identifica a transição para cancelado, cobrindo DELETE, PATCH de status, edição que muda o status e POST com credenciais. A notificação usa nome do pet, serviço e horário gravados quando disponíveis. O envio ocorre após gravação bem-sucedida; em transação, somente após commit. As chamadas manuais antigas foram removidas para evitar duplicação.

Foi corrigido também um defeito localizado no POST de cancelamento: `Op` era importado de `models`, onde não é exportado, e a busca de administrador tentava consultar a coluna `usuario`, ausente no modelo Admin recebido. Agora usa o operador já importado do Sequelize e os campos realmente disponíveis. A validação de senha e a exigência de autenticação existentes foram mantidas. A linha que imprimia o corpo com senha no log foi removida.

### 4. Push de estoque baixo

Existia o tipo de payload/preferência `estoque_baixo`, mas nenhum gatilho nas gravações de estoque. Assim, cadastrar um produto baixo ou reduzir sua quantidade não gerava o evento.

Correção: hooks de criação/atualização de Produto acionam o evento após persistir. Atualizações em lote só ativam hooks individuais quando alteram campos relacionados a estoque/classificação/empresa. Isso cobre o cadastro, edição manual, endpoint de baixa usado pelo PDV e atualizações existentes via instância/modelo. Os caminhos atuais examinados usam essas operações Sequelize.

- Produto novo com estoque igual/abaixo do mínimo ou sem estoque: gera o evento após salvar.
- Produto acima do mínimo que passa a igual/abaixo: gera novo evento.
- Já estava baixo e continua baixo: não repete.
- Reabasteceu e depois baixou de novo: permite outro alerta.
- Serviços e planos não geram alerta.
- Ler ou atualizar o Dashboard não gera push.
- Falha/rollback de gravação não publica o evento.

Para o push, a igualdade ao mínimo é incluída, conforme o cenário solicitado. A tabela do Dashboard mantém seu critério anterior de zero/abaixo do mínimo; não foi ampliada para mudar regras de listagem fora do pedido.

## Duplicidade e tabela nova

A única tabela nova é **`push_estados_evento`**, criada automaticamente com `sync()` simples, sem `alter`, sem `force` e sem modificar colunas das tabelas existentes.

Ela guarda estado e revisão por empresa/tipo de evento/registro, usando uma chave primária de identificação. A transição é arbitrada em transação com bloqueio de linha. Isso evita alertas repetidos por duas gravações concorrentes e mantém o estado após reiniciar. Reposição ou reabertura de atendimento rearmam uma nova ocorrência legítima. Cada dispositivo autorizado pode receber uma cópia do mesmo evento; isso não é duplicação de ocorrência.

Não há varredura retroativa para notificar todos os produtos já baixos ao instalar. Um item antigo que já estava baixo não passa a avisar em cada edição/consulta. A próxima reposição e nova queda voltam a permitir o alerta.

## O que foi preservado no Push

VAPID, subscriptions, autorização do navegador, preferências e service worker permanecem existentes. As preferências continuam respeitadas por usuário/dispositivo e empresa. `estoque_baixo` vem desabilitado por padrão no projeto recebido; habilite essa opção no PetHub Mobile se quiser recebê-la. A correção não força adesão a uma preferência desligada.

Os payloads dos dois eventos foram enriquecidos e ganharam tags por ocorrência para produtos/agendamentos diferentes não substituírem uns aos outros. Somente esses dois eventos passam a usar TTL de 3.600 segundos e timeout de rede de 5 segundos. O TTL anterior zero podia descartar a notificação se o dispositivo estivesse temporariamente inacessível. Os outros eventos mantêm as opções e payloads anteriores.

A entrega continua usando o mecanismo existente: a aceitação pelo serviço Web Push não comprova exibição no aparelho. Falhas são registradas; não foi introduzida uma fila de reenvios ou uma reconstrução do sistema Push. Se o processo morrer entre o evento e o envio, ou o provedor falhar, não há garantia de entrega. A proteção de estado evita tentativas cegas e repetição de alertas pela mesma condição.

Referências consultadas: https://sequelize.org/docs/v6/other-topics/hooks/ ; https://sequelize.org/docs/v6/other-topics/transactions/ ; https://github.com/web-push-libs/web-push/blob/master/README.md .

## Arquivos do ZIP

| Arquivo | Alteração |
|---|---|
| `frontend/dashboard.js` | Preservar zero no contador mensal, sem fallback para total |
| `backend/controllers/dashboardController.js` | Período mensal por empresa, consulta fresca do contador, filtro de tipo e agrupamento SQL no estoque, retorno do ideal |
| `backend/utils/periodoBrasilia.js` — novo | Limites do mês no fuso explícito de Brasília |
| `backend/models/Produto.js` | Registrar eventos após criação/atualização e updates de estoque em lote |
| `backend/models/Agendamento.js` | Registrar evento após alteração efetiva do status |
| `backend/services/pushEventoService.js` — novo | Pós-commit, validação de empresa/contexto e proteção persistida por ocorrência |
| `backend/services/pushNotificationService.js` | Dados reais nos dois payloads, tags por ocorrência e TTL/timeout somente desses eventos |
| `backend/routes/agendamentoRoutes.js` | Retirar disparos duplicados manuais e corrigir a consulta de credenciais do cancelamento |
| `tests/dashboard-push.test.js` — novo | Cenários novos com banco isolado e push simulado |
| `CORRECOES-DASHBOARD-PUSH.md` — novo | Este guia |

Não há CSS, redesenho, alteração de menus/cores/botões, mudança de WhatsApp nem de funcionalidades fiscais. Não há alteração de dependências ou lockfile.

## Testes executados

- Mês atual/anterior, limite inicial de Brasília, virada do mês e do ano e resposta zero.
- Cliente novo é contado mesmo com cache do restante do resumo.
- Total histórico da mesma resposta preservado; Desktop não usa total quando mensal é zero; Mobile continua usando o campo histórico existente.
- Serviço/plano sem estoque excluídos; produto físico baixo incluído e ideal preservado; outra empresa não aparece.
- Cadastro baixo, atingir exatamente o mínimo, permanecer baixo, reposição e nova queda.
- Preferência desativada respeitada e subscriptions de outra empresa não recebem o evento.
- Atualização por instância e update do modelo, cobrindo os caminhos atuais de estoque.
- Commit publica depois; rollback de produto e de cancelamento não publica.
- Duas gravações concorrentes da mesma queda não duplicam o alerta no laboratório.
- Cancelamento repetido não duplica; reabrir e cancelar permite nova ocorrência.
- HTTP com JWT real de laboratório: POST de item com empresa manipulada mantém a empresa autenticada; baixa de estoque gera evento; DELETE, PATCH e POST de cancelamento funcionam e geram uma ocorrência; empresa B não cancela atendimento de A.
- Evento de nova venda mantém payload/opções/preferências existentes.
- 51 testes anteriores passaram: automações de Marketing, pareamento/reconexão Baileys, importação, cadastro e isolamento.
- Sintaxe validada nos nove arquivos JavaScript novos/modificados.

Os testes de concorrência usam SQLite com transações serializadas no laboratório de uma conexão. Não foi feito teste com dois processos reais no TiDB. A contagem/histórico do Mobile foi verificada pelo contrato da API e pelo código consumidor, não por navegação em um celular real. Não houve teste real de push em segundo plano/PWA fechado; isso depende das permissões, subscription, navegador, rede e sistema operacional.

## Aplicação e comandos

Extraia na raiz de `sistema-2028`, mesclando as pastas, substituindo somente os arquivos correspondentes. Não substitua `.env`. A tabela nova exige permissão CREATE no usuário do banco; não há migração manual destrutiva, SQL para apagar dados ou variável nova obrigatória.

Mantenha as chaves VAPID atuais se os outros pushes já funcionam. Não precisa trocar JWT, chaves fiscais ou credenciais WhatsApp.

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\tests\dashboard-push.test.js .\tests\marketing-agendamento.test.js .\tests\whatsapp.test.js .\tests\whatsapp-persistencia.test.js .\tests\importacao.test.js .\tests\itens-isolamento.test.js .\tests\cliente-sexo.test.js
```

Requer as dependências já instaladas e Node 22.13+ ou 24, por causa do laboratório SQLite existente. Avisos experimentais/TEXT do SQLite não equivalem a falha; confira `fail 0` no resultado.

```powershell
git add frontend/dashboard.js backend/controllers/dashboardController.js backend/utils/periodoBrasilia.js backend/models/Produto.js backend/models/Agendamento.js backend/services/pushEventoService.js backend/services/pushNotificationService.js backend/routes/agendamentoRoutes.js tests/dashboard-push.test.js CORRECOES-DASHBOARD-PUSH.md
git commit -m "Corrige contador mensal estoque e eventos push"
git push
```

No Render, mantenha build `npm ci --omit=dev` e start `npm start`. Não existe build separado no projeto. Após deploy, atualize o Desktop com Ctrl+F5.

## Validação no seu celular

1. No Mobile, confirme permissão de notificações e habilite Cancelamento/Estoque baixo nas preferências existentes. Não altere as preferências de outros eventos para este teste.
2. Cadastre um produto de teste com estoque 2 e mínimo 5; espere um alerta com esses valores. Crie um serviço com estoque zero e confirme que não avisa nem aparece no Dashboard.
3. Atualize várias vezes o Dashboard: não deve repetir o push do produto.
4. Reponha o produto para 10 e reduza para 5 pelo fluxo normal; deve ocorrer um novo alerta.
5. Crie um agendamento de teste e cancele uma vez. Confira nome, serviço e horário. Repetir a operação não deve repetir a ocorrência.
6. Com o PWA em segundo plano e depois fechado, repita com outro produto/agendamento de teste, mantendo rede/permissões. Confirme o recebimento real no aparelho.
7. Confira uma segunda empresa: não deve ver os dados nem receber os alertas da primeira.
8. Confira outra notificação já usada, como nova venda, para validar seu dispositivo após o deploy.

Os itens de teste devem ser da empresa de testes e dos seus dispositivos; não é necessário movimentar cadastros reais para esta validação.
