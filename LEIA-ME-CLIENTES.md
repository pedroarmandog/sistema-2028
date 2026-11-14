# PetHub — Inteligência de Clientes, histórico consolidado e bloqueios

Entrega: 13/11/2026. Pacote incremental, somente arquivos novos/alterados e este relatório. Implementação sobre `sistema-2028(6).zip` e os pacotes posteriores de cadastro/sexo, importação, XLS, automações, Dashboard/Push e recuperação contínua do WhatsApp disponíveis nesta conversa. Não contém .env, senhas, banco de clientes, node_modules ou dados do seu estabelecimento.

**Pré-requisito:** aplicar a última correção `PetHub-WhatsApp-recuperacao-continua.zip` antes deste pacote, se ainda não a aplicou. O serviço WhatsApp desta entrega parte dessa versão; os seus módulos de autenticação persistente/diagnóstico continuam sendo usados. Não sobreponha o serviço novo com versões antigas depois. Se você fez outras alterações locais nos mesmos arquivos após os pacotes desta conversa, compare-as no VS Code antes de substituir.

## 1. Arquivos modificados

| Arquivo | O que mudou |
| --- | --- |
| `backend/services/clienteInteligencia.js` | Novo armazenamento complementar e snapshots históricos por empresa/cliente; validações, referência, corte e consulta mensal de cadastros |
| `backend/services/clienteAnaliseVendas.js` | Novo cálculo em centavos, gráficos, janelas móveis, comparação e conciliação |
| `backend/services/clienteComunicacao.js` | Nova verificação de preferências por empresa/telefone, canais independentes e preparação do evento de auditoria |
| `backend/controllers/clienteInteligenciaController.js` | Novos endpoints com cliente/empresa autenticados e transação na edição |
| `backend/routes/clienteRoutes.js` | Rotas de dados complementares e análise; autenticação existente preservada |
| `backend/controllers/clienteController.js` | Cadastro/edição atômicos com complementos; limpeza dos complementos ao excluir cliente; datas internas de auditoria protegidas |
| `backend/services/importacao/campos.js` | Novos campos, nomes equivalentes e mapeamento automático |
| `backend/services/importacao/arquivo-worker.js` | Datas nativas Excel com formato brasileiro; preserva CSV/XLS/XLSX e limites existentes |
| `backend/services/importacao/servico.js` | Validação, importação, atualização por IDs legados, mesclagem de telefones e snapshots, sem apagar opcionais vazios |
| `backend/routes/importacaoRoutes.js` | Referência e opção de conciliação na prévia; autenticação/limites mantidos |
| `backend/controllers/dashboardController.js` | Clientes do mês considera a data original, quando informada |
| `backend/services/whatsappService.js` | Somente verificações de comunicação antes da consulta do número e imediatamente antes do envio; ciclo QR/autenticação/reconexão mantido |
| `backend/services/whatsappQueue.js` | Bloqueados ficam cancelados com motivo explícito, sem consumir tentativa nem serem contados como enviados/erro de conexão |
| `backend/controllers/disparadorController.js` | Campanhas respeitam o retorno bloqueado e registram ignorados; progresso distingue esses contatos |
| `backend/models/LogEnvio.js` | Adiciona `ignorado_bloqueio` ao enum de eventos de auditoria |
| `backend/scripts/preparar-clientes-inteligencia.js` | Preparação idempotente da estrutura e do evento de auditoria |
| `frontend/client-details.html` | Aba Análise de Vendas e carregamento dos componentes novos |
| `frontend/novo-cliente.html` | Carregamento dos complementos no cadastro/edição |
| `frontend/novo-cliente.js` | Envia complementos no mesmo formulário/cadastro |
| `frontend/cliente-inteligencia.js` | Novo formulário organizado em seções e painel com cards/gráficos; dados de cliente via textContent/value |
| `frontend/cliente-inteligencia.css` | Layout responsivo, estados vazios, cards e gráficos sem dependência externa |
| `frontend/importacao.js` | Referência/estratégia na importação, preservando a prévia e escolhas existentes |
| `frontend/marketing-disparador.js` | Contato bloqueado aparece como ignorado por bloqueio na atualização da lista |
| `tests/cliente-inteligencia.test.js` | Nova integração HTTP/JWT/Sequelize/importação e WhatsApp simulado |
| `tests/cliente-sexo.test.js` | Fixture atualizada para fornecer a conexão usada pelas novas transações; mantém os cenários anteriores |
| `tests/browser/cliente-inteligencia.ui.cjs` | Teste opcional de interface com API fictícia, para desktop/smartphone; preparado, não executado com sucesso neste ambiente |

Não foram alterados package.json, lockfile, variáveis de ambiente, autenticação, cadastro de produtos, módulo fiscal ou páginas do PetHub Mobile.

## 2. Banco de dados e ordem da migração

O script usa a conexão/TLS já configurada no ERP. A ordem executada é:

1. Criar, se não existirem, as duas tabelas complementares abaixo e seus índices.
2. Acrescentar `ignorado_bloqueio` ao final do ENUM existente em `logs_envio.evento`, se o banco realmente usar ENUM e ainda não tiver esse valor. Os valores existentes, inclusive eventuais valores personalizados, são mantidos na mesma ordem. Null/default existentes são preservados. Se for VARCHAR, não é necessário alterar a coluna.
3. Criar o índice de consulta `vendas_empresa_cliente_data` em `vendas(empresa_id, clienteId, data)`, se não existir esse nome ou um índice com esse prefixo.

### `cliente_perfis`

Chave composta: `empresa_id`, `cliente_id`.

Campos: `codigo_legado`, `id_legado`, `instagram`, `cadastro_original` (DATE), `bloquear_sms`, `bloquear_whatsapp`, `cadastro_bloqueado`, `createdAt`, `updatedAt`.

Há unicidade por empresa para código legado e ID legado. Campos ausentes não são interpretados como zero nem como bloqueio. Códigos iguais podem existir em empresas diferentes. `cadastro_bloqueado` é informativo e não muda `ativo`, crédito, permissões ou preferências de mensagens.

### `cliente_resumos_historicos`

Campos: `id` determinístico, `empresa_id`, `cliente_id`, `vendas_desde_cadastro`, `ticket_medio_desde_cadastro`, `vendas_ultimo_mes`, `vendas_ultima_semana`, `data_ultima_venda`, `quantidade_vendas_historicas`, `data_referencia_historico`, `modo_conciliacao`, `origem_historico`, `corte_em`, `lote_origem`, `createdAt`, `updatedAt`.

Valores monetários: DECIMAL(18,2). Uma referência por cliente/empresa; uma nova data cria outro snapshot e preserva os anteriores. Reimportar a mesma referência atualiza campos preenchidos e não soma seu valor ao snapshot antigo. A análise usa o snapshot com referência mais recente.

Nenhuma coluna da tabela Clientes foi removida/adicionada. Não há atualização em massa de clientes/vendas/pets. Não são geradas transações artificiais, pagamentos, notas fiscais, haver, crediário ou movimentos de estoque. A estrutura de importações existente continua registrando lotes e linhas.

A preparação usa CREATE/ALTER/índice; não é uma transação DDL única. Se uma etapa falhar, as etapas já concluídas permanecem e a execução pode ser repetida após corrigir a causa. Não rode DROP nem `sync({force:true})` no banco real. Faça backup antes da preparação em produção.

## 3. Importação de Excel

Em Clientes → Importar, os campos novos aparecem no mapeamento atual. Exemplos de reconhecimento:

| Coluna da planilha | Destino |
| --- | --- |
| `cod_cliente` | Código legado |
| `id_legado` | ID legado |
| `instagram` | Instagram |
| `data_cadastro` | Data original do cadastro |
| `como_nos_conheceu` | Como nos conheceu (campo existente) |
| `fone1`, `fone2`, `fone3` | Telefone principal e adicionais |
| `cadastro_bloqueado` | Cadastro bloqueado, informativo |
| `bloquear_envio_sms` | Bloqueio SMS |
| `bloquear_envio_whatsapp` | Bloqueio WhatsApp |
| `vendas desde o cadastro` | Total histórico |
| `ticket medio desde o cadastro` | Ticket histórico |
| `vendas no ultimo mes` | Valor no mês da referência |
| `vendas na ultima semana` | Valor na semana da referência |
| `data ultima venda` | Data da última venda histórica |
| `quantidade histórica de vendas` | Quantidade, somente quando conhecida |

O reconhecimento ignora acentos, espaços, diferenças de caixa e sublinhados. O usuário pode corrigir o destino ou ignorar uma coluna. A coluna de referência também pode ser mapeada por linha; na ausência dela, é usada a referência preenchida no modal.

**Ao importar indicadores, informe a data de referência da planilha.** Não é atribuída uma referência silenciosamente. Campos básicos não exigem essa data. Valores brasileiros como `R$ 5.000,00`, datas dd/mm/aaaa, ISO YYYY-MM-DD e células de data Excel são tratados. Valores/data inválidos são mostrados na prévia por linha; datas históricas futuras e quantidade zero incompatível com total positivo são rejeitadas. Quantidade desconhecida deve ficar vazia.

São preservados os limites anteriores: CSV/XLS/XLSX, 5 MB, 2.500 linhas, processamento em worker, bloqueio de macros/fórmulas/links ativos. Telefones adicionais são mesclados na atualização, e opcionais vazios não apagam dados. Os telefones adicionais são preservados como contatos, sem transformar um contato em um novo cliente.

Códigos/IDs legados, CPF, CNPJ e e-mail participam da identificação, sempre dentro da empresa. Identificadores que apontem para pessoas diferentes geram erro para revisão. Homônimos sem identificador forte continuam exigindo conferência, pois não é seguro mesclar pessoas só pelo nome.

A prévia permite criar, atualizar campos preenchidos ou ignorar; erros/duplicidades podem ser baixados no relatório por linha. Repetir o mesmo arquivo/linhas não cria vendas nem soma resumos novamente. Pets e vendas existentes não são substituídos pela planilha.

## 4. Análise de Vendas

Abra um cliente e clique em **Análise de Vendas**, após Histórico. Há cards, evolução mensal (12 meses), oito semanas, comparação dos últimos 30 dias com os 30 anteriores, valores por produto/serviço e snapshots importados.

Fonte de cálculo: somente `vendas`, filtrada por empresa autenticada e `clienteId`. A consulta é paginada internamente para limitar a memória. Não são somados novamente atendimento, agendamento, financeiro, haver ou crediário. Um pagamento parcial não diminui o faturamento da venda; pagamento e faturamento são conceitos distintos.

Estados elegíveis desta base: pendente, parcial, pago, finalizado/finalizada e concluído/concluída. Cancelado e estados não elegíveis são excluídos. A fonte atual não contém um modelo de devolução parcial separado nem uma regra de conciliação de devoluções externas: esta entrega não inventa abatimentos desses outros sistemas. Devoluções precisam estar refletidas no valor/estado da venda elegível para afetarem esta análise.

O valor final é lido das chaves já usadas pelo sistema em `totais` (`final`, `totalFinal`, `total` ou `valorTotal`). Registro sem data/valor final válido é sinalizado, em vez de usar pagamento recebido como faturamento. Itens antigos sem tipo/valor ficam sem classificação; não são inventados produtos/serviços. Descontos/acréscimos do total final são rateados pelos valores dos itens, quando disponíveis.

**Duas estratégias explícitas:**

- **Separado (padrão):** total/ticket/quantidade do PetHub são apresentados separadamente do resumo legado. É a opção inicial segura quando não se conhece a sobreposição.
- **Somar posteriores:** total legado + vendas do PetHub com data posterior ao corte. As vendas anteriores ao corte continuam consultáveis nos gráficos/totais do PetHub, mas não são somadas novamente ao histórico conciliado. O painel informa a sobreposição.

O corte é o fim do dia da referência em Brasília, limitado ao instante da primeira importação se a referência for hoje. Assim, uma nova venda feita depois da importação no mesmo dia pode entrar na soma. A reimportação da mesma referência não desloca esse corte.

Selecione Somar posteriores somente se o resumo realmente cobrir as operações até esse corte. O sistema não tem como inferir, a partir de um único valor consolidado, quais transações do estabelecimento já estão nele. Se a origem/ref estiver incorreta, corrija-a antes de conciliar.

Quando o total histórico é R$ 2.000 e as vendas posteriores somam R$ 150, o total conciliado é R$ 2.150. Se a quantidade histórica for desconhecida, não é calculado um ticket combinado: aparecem o ticket PetHub e o ticket legado separadamente. Quantidade também não é estimada dividindo total por ticket. Quando a quantidade é conhecida, o ticket combinado usa total conciliado/quantidade conciliada.

Últimos 7/30 dias são janelas móveis reais do PetHub. Os valores semana/mês da planilha permanecem no snapshot com referência, sem entrarem permanentemente nessas janelas nem gerarem pontos nos gráficos. Última venda compara a data histórica com as transações conhecidas.

Os indicadores são recalculados ao abrir/atualizar a aba; novas vendas/cancelamentos não precisam de um novo lote ou de cron de contagem.

## 5. Bloqueio de mensagens

Nos Detalhes e no cadastro/edição há a seção Preferências de Comunicação. Os dois controles são independentes.

O singleton de produção do `whatsappService` chama a política central de comunicação após a pausa de envio e novamente imediatamente antes de `socket.sendMessage`. Isso cobre fila, lembretes, mensagens manuais e disparador em massa que usam o conector. Há teste específico em que o bloqueio muda durante a consulta do número e ainda impede o envio.

O bloqueio é verificado pelo telefone principal/adicionais de clientes da empresa remetente, incluindo variação brasileira com/sem o nono dígito. Se dois cadastros da mesma empresa compartilham o número e um deles bloqueia o canal, esse número não recebe mensagens da empresa; isso evita contornar a preferência escolhendo um cadastro duplicado. O bloqueio não passa para outra empresa que tenha o mesmo telefone.

Fila bloqueada: `status=cancelado`, motivo `IGNORADO_POR_BLOQUEIO`, tentativas preservadas, sem `dataEnvio`, auditoria `ignorado_bloqueio`. No disparador, o contato usa o estado compatível `pausado`, com `meta.ignoradoPorBloqueio=true`, aparece como ignorado por bloqueio e não entra no total de erros/enviados. Desbloquear depois não reenvia automaticamente uma mensagem cancelada: é preciso agendar outra.

Se a consulta das preferências falhar, o envio fica temporariamente indisponível/pendente; erro do banco não libera mensagens. A verificação cobre alterações confirmadas no banco até a última consulta; uma mensagem já transmitida ao WhatsApp não pode ser retirada por essa preferência.

Não foi identificada uma integração SMS ativa nos arquivos auditados. O campo é armazenado e a mesma política aceita `canal:'sms'` para futura integração; não foi implementado nem alegado envio de SMS. Não foi encontrada uma camada prévia específica de opt-out no código consultado. Os campos já existentes foram preservados; não houve migração que limpe preferências.

O ciclo de QR, credenciais cifradas, sessão por empresa, SSE, polling e reconexão do último pacote WhatsApp foi mantido; só o caminho de envio ganhou as duas consultas.

## 6. Compatibilidade e limites

- Desktop: Clientes cadastrados no mês usa data original quando presente; sem ela, usa createdAt, respeitando o mês de Brasília. A data de criação/importação continua guardada separadamente.
- Mobile: o total geral `clientes` e a lógica de clientes ativos continuam usando a fonte anterior. A página Mobile não foi modificada para usar clientesMes.
- Relacionamentos Cliente ↔ Pet ↔ Venda não foram reescritos. O perfil/snapshots são complementares; leitura/edição sempre confirma que o cliente pertence à empresa autenticada.
- `empresa_id` arbitrário do corpo não escolhe a empresa. Dados de outra empresa retornam 404 e não podem ser atualizados pelas rotas novas.
- A alteração de enum preserva os valores anteriores; o cadastro básico passa a salvar junto com os complementos em transação.
- Não houve mudança nas dependências de produção ou necessidade de navegador no Render.

A aplicação real em TiDB e a permanência do WhatsApp no seu servidor ainda exigem validação no ambiente de destino. Não se trata de garantia de ausência de regressões em código local que não tenha sido disponibilizado nesta conversa.

## 7. Testes executados e pendências

Executado com Node 24.22.1, bibliotecas instaladas do projeto, SQLite em memória, HTTP local e JWT real, sem ler .env nem usar TiDB/WhatsApp reais:

```text
node --test tests/*.test.js
90 testes aprovados, 0 falhas, 0 ignorados.
```

A suíte anterior de importação, sexo, isolamento de itens, Dashboard/Push, automações e WhatsApp passou. A nova suíte cobre:

- XLSX com todos os campos; CSV e XLS básicos; moeda/data brasileiras e data nativa Excel;
- prévia, erros por linha, data obrigatória quando há indicadores e arquivo básico sem histórico;
- reimportação idempotente e atualização por código legado, preservando vazios e pets;
- duas empresas com os mesmos IDs; leitura/edição/lote de outra empresa rejeitados;
- venda nova, cancelamento, pagamento parcial e classificação de produtos/serviços;
- cliente sem histórico com ticket/quantidade corretos e item antigo inválido sem derrubar o painel;
- histórico separado/conciliado, sobreposição, quantidade desconhecida/conhecida e corte no mesmo dia;
- snapshots anteriores preservados e corte imutável na reimportação;
- Dashboard com data original e total Mobile preservado;
- criação/edição manual transacional, rollback de dados históricos inválidos;
- SMS independente, bloqueio WhatsApp nos adicionais, isolamento por empresa;
- verificação final do envio e alteração de preferência durante consulta do número;
- erro do banco não libera envio;
- fila já agendada cancelada por bloqueio e campanha em massa auditada como ignorada;
- preparação idempotente e teste simulado da ampliação de ENUM, preservando um valor personalizado.

A sintaxe dos arquivos JavaScript alterados também foi verificada. O projeto não define script `build`; o frontend é servido como HTML/CSS/JS.

**Interface:** preparado `tests/browser/cliente-inteligencia.ui.cjs` com fixtures, para 1440 px e 375 px, cards/gráficos, tela vazia, edição de preferências, serialização do cadastro e falha de carregamento. O Chromium não iniciou neste ambiente; portanto não foi concluída inspeção visual real de desktop/smartphone. O script não usa o seu banco nem envia WhatsApp.

Para executar esse teste opcional somente na máquina de desenvolvimento, sem salvar dependência no projeto:

```powershell
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node .\tests\browser\cliente-inteligencia.ui.cjs
```

As capturas de teste são gravadas na pasta temporária do sistema. Não adicione Playwright/Chrome ao build do Render. A validação no layout completo do ERP e em um celular real continua recomendada; o teste opcional usa uma página de teste do componente e API fictícia. Não foi validada uma impressão/nota fiscal ou transmissão SMS nesta entrega.

## 8. Aplicação e deploy

1. Faça backup do banco e mantenha um commit da versão atual para comparação.
2. Extraia o ZIP e mescle `backend`, `frontend` e `tests` na raiz de `sistema-2028`. Substitua os arquivos listados, sem apagar as pastas inteiras.
3. Valide localmente:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\tests\*.test.js
```

Se as dependências locais não estiverem instaladas, execute `npm ci` primeiro. Não há nova dependência de produção a instalar.

4. **Antes de fazer o push**, no serviço pago do Render, configure em Settings → Build & Deploy → **Pre-Deploy Command**:

```bash
node backend/scripts/preparar-clientes-inteligencia.js
```

Mantenha Build Command `npm ci --omit=dev` e Start Command `npm start`. O Render executará a preparação usando o código novo após o build e antes de colocar a versão nova no ar. O comando pode continuar configurado: é idempotente. Se você já tem um Pre-Deploy para outra migração, preserve-o e execute também o comando novo, em vez de apagá-lo.

Não há nova variável obrigatória. Preserve conexão/TLS TiDB, JWT, VAPID e a chave de autenticação WhatsApp atuais. Não gere/troque a chave WhatsApp para instalar este recurso.

Também é possível executar a preparação no PowerShell com o .env do banco de destino corretamente configurado, antes de disponibilizar o código novo:

```powershell
node .\backend\scripts\preparar-clientes-inteligencia.js
```

Esse comando modifica o banco apontado pelo .env; os testes `node --test` não. O usuário do banco precisa de CREATE TABLE, ALTER e criação de índice para a preparação. A migração não foi executada no seu TiDB nesta entrega.

5. Faça commit dos arquivos recebidos e push para main. `ARQUIVOS-ALTERADOS.txt` contém os caminhos do pacote para revisão. Pelo VS Code, selecione esses arquivos em Controle do Código-Fonte, faça o commit e sincronize. Não inclua .env ou arquivos de credenciais.
6. Confira que o Pre-Deploy concluiu com `Tabelas complementares de clientes e índice de vendas preparados.`. Depois do deploy, use Ctrl+F5.

### Roteiro de aceite no seu ERP

- Importe primeiro uma cópia pequena da planilha (2–3 clientes), com referência conferida e modo Separado. Confira os campos e o relatório.
- Abra o cliente: dados complementares em Detalhes; indicadores e resumos na aba Análise de Vendas.
- Após conferir o que o resumo cobre, selecione Somar posteriores se adequado. Faça uma venda de teste e confira o incremento; cancele a venda e confira a correção.
- Reimporte a mesma planilha: não deve criar clientes/vendas ou somar o resumo novamente.
- Com mensagem de teste na fila para um número seu, bloqueie WhatsApp antes do disparo: deve ficar cancelada por bloqueio, sem recebimento nem registro de envio. Desbloqueie e agende outra para confirmar o fluxo normal.
- Confira dois logins de empresas diferentes; código legado pode ser igual, mas cliente/indicadores/preferências não podem aparecer no outro login.
- Confira o indicador mensal no desktop e o total geral no Mobile. Valide os novos campos/gráficos no computador e celular.
- Confirme que o WhatsApp continua conectado e que um cliente não bloqueado recebe um lembrete de teste.

Referências de deploy consultadas: https://render.com/docs/deploys . Referências de DDL/tipos TiDB: https://docs.pingcap.com/tidb/stable/sql-statement-modify-column/ e https://docs.pingcap.com/tidb/stable/data-type-string/ . A validação do seu cluster específico permanece pendente.
