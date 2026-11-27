# Relatório — Contas a pagar do PetHub

Data: 26/11/2026.

## Diagnóstico e grau de confirmação

**Falha reproduzida:** o model `Entrada` passou a declarar `estoqueProcessado` com a implementação de estoque fracionado. O endpoint antigo do Dashboard usava `Entrada.findAll()` sem selecionar atributos, incluindo essa coluna técnica no SQL. Em uma tabela anterior à preparação do granel, o SELECT falha por coluna inexistente, inclusive quando não há documentos. No teste, a consulta antiga falha e a corrigida retorna HTTP 200 no mesmo banco, sem adicionar a coluna.

**A exceção exata do ambiente publicado ainda depende do diagnóstico do Render.** Não havia acesso ao TiDB, ao log da requisição 500 ou ao histórico Git do checkout disponível. Portanto, não se afirma que a ausência dessa coluna já foi confirmada em produção ou que um commit específico foi o responsável. O script de diagnóstico informa o commit publicado, os campos presentes/ausentes e valida a consulta corrigida, somente por leitura.

A correção é no backend: consulta explícita dos campos financeiros existentes, validação dos campos indispensáveis, erro claro se a estrutura financeira realmente estiver incompleta e registro da exceção original nos logs. O frontend continua exibindo erros reais; não há retorno vazio artificial, mock de produção ou captura que esconda uma falha do banco.

## Arquitetura existente reaproveitada

O módulo não possui um model independente `ContaPagar`. Reutiliza `Entrada`, a tabela `entradas_mercadoria` e as rotas `/api/entrada/manual`. `dataEntrada` é o vencimento já utilizado pela tela financeira e pelo Dashboard. Essa convenção foi preservada.

Foi extraído um serviço financeiro único consumido pelo Dashboard, pelas rotas existentes e pelo Painel Financeiro. Não foram criados outra tabela, model ou endpoint concorrente. A query `financeiro=1` identifica o uso financeiro da rota existente. Requisições antigas sem itens, contendo os campos financeiros esperados, continuam reconhecidas; o fluxo físico de entrada/saída permanece no serviço de estoque.

## Problemas adicionais confirmados e correções

| Problema encontrado | Correção |
| --- | --- |
| Consulta do card também incluía registros com `empresa_id = NULL` | Isolamento estrito pelo identificador da empresa autenticada; empresa inválida é bloqueada. Registros sem proprietário não são atribuídos automaticamente. |
| Limite de 20 contas no card | Paginação interna em lotes de 500, sem truncar os documentos elegíveis. |
| Registros pendentes desapareciam quando existia alguma entrada concluída | A listagem financeira inclui todas as dívidas com saldo, respeitando exclusão e quitação. |
| Rota do granel rejeitava nova conta sem produtos | Cadastro financeiro separado da movimentação física, no mesmo endpoint. |
| Bloqueio de entrada finalizada impedia editar ou pagar a conta | Alteração financeira usa transação própria, sem reprocessar itens ou estoque. |
| Pagamento parcial era marcado como quitado | Baixas acumuladas, saldo remanescente e status parcial/quitado calculados em centavos. |
| Pagamento em lote repetia o valor total em cada documento | Rateio entre documentos e formas de pagamento, sem multiplicar o valor pago. |
| Repetir requisição após falha de rede podia duplicar a baixa | Identificador de lote estável, transação e bloqueio do documento; repetição idêntica é idempotente. Lote reutilizado com outro valor é rejeitado. |
| Tela informava sucesso mesmo com HTTP de erro | Respostas verificadas; falha mantém a tentativa de pagamento identificada e apresenta erro. |
| Excluir conta podia destruir a entrada e reverter estoque | Exclusão financeira lógica, preservando a linha e os itens. Contas com pagamento exigem conferência do estorno antes da exclusão. |
| Parcelas eram solicitadas no formulário, mas ignoradas ao salvar | Geração transacional de parcelas mensais, preservando o valor total em centavos e o dia de vencimento quando possível. |
| Resumo tratava vencimento DATEONLY como timestamp com offset | Comparação por dia civil; referência de hoje em `America/Sao_Paulo`. |
| Painel Financeiro só contava pagamentos totalmente quitados | Resumo usa saldo; calendário, gráfico, fluxo e pagamentos usam as baixas efetivas nas respectivas datas, inclusive parciais. |
| Previsão a pagar do gráfico usava `dataPagamento` | Usa o vencimento `dataEntrada`. |
| Fornecedor e número eram inseridos como HTML sem escape | Texto e atributos pertinentes escapados na apresentação financeira. |

O parcelamento trata o valor informado como **valor total do documento**, dividido em até 120 parcelas mensais. Exemplo: R$ 100 em três parcelas = R$ 33,34 + R$ 33,33 + R$ 33,33. Um vencimento em 31/01 gera 28/02 e depois 31/03. O formulário foi esclarecido como “Valor total”; o layout e os estilos foram preservados.

Não foi encontrada implementação de recorrência automática nessa tela. Não foi criado um agendador novo. Também não foi criado um fluxo novo de estorno de pagamentos. A restrição a excluir dívida já paga evita perda de histórico sem um estorno conciliado.

Pagamentos planejados de uma compra não são confundidos com baixas efetuadas. Documentos antigos já marcados como pagos continuam reconhecidos como quitados, mesmo sem os novos metadados das baixas. Não há reparação automática de valores históricos ou reatribuição de empresas, pois isso exigiria conciliação dos registros reais.

## Arquivos modificados

| Arquivo | Alteração |
| --- | --- |
| `backend/controllers/dashboardController.js` | Endpoint do card usa o serviço financeiro; resposta sem stack interno e sem dados desnecessários; cache privado desativado. |
| `backend/routes/movimentacoesEstoqueRoutes.js` | Encaminha operações financeiras antes da lógica física de estoque; preserva autenticação e rotas. |
| `backend/routes/painelFinanceiroRoutes.js` | Compartilha saldos e baixas; corrige datas da parte a pagar. Regras de contas a receber não foram reimplementadas. |
| `frontend/dashboard.js` | Descrição, vencimento e saldo; mensagem de ausência de contas; escape de texto. Mesma estrutura e classes do card. |
| `frontend/dashboard.html` | Versão da URL do JavaScript para atualização do cache. |
| `frontend/financeiro/contas-a-receber/contas-a-pagar/pagamento-fornecedor.js` | CRUD financeiro, exibição de saldo, rateio, pagamentos parciais, tratamento de erros e datas. |
| `frontend/financeiro/contas-a-receber/contas-a-pagar/pagamento-fornecedor.html` | Importações dos cálculos e utilitários financeiros, sem alterar o CSS. |

Novos arquivos:

- `backend/services/contasPagar.js`: regras compartilhadas, compatibilidade do SELECT, saldos, parcelas e transações.
- `backend/scripts/diagnosticar-contas-pagar.js`: diagnóstico de leitura, sem iniciar o servidor ou WhatsApp.
- `frontend/components/contas-pagar.js`: apresentação, rateio em centavos e verificação de respostas.
- `tests/contas-pagar.test.cjs`: testes novos de SQL, HTTP, isolamento e interface.

Esta entrega contém os arquivos completos nas pastas originais do projeto, testes e documentação. A atualização é feita por cópia e substituição dos arquivos, conforme COMO-ATUALIZAR.txt. Não modifica `backend/app.js`, modelos Sequelize, `package.json`, lockfile, credenciais ou arquivos de conexão/autenticação WhatsApp. O hash de `whatsappService.js` permaneceu o mesmo antes e depois da correção.

## Tabelas e migration

**Nenhuma alteração estrutural de tabela e nenhuma migration nova.** O módulo continua gravando `entradas_mercadoria`, em campos já existentes:

- Cadastro/edição: fornecedor, número, datas, observação, classificações, valor e empresa.
- Baixas: `pagamentos` JSON, `dataPagamento`, `situacao`.
- Exclusão financeira: `situacao = excluido`, sem DELETE físico.
- Parcelamento: novas linhas da mesma tabela, na mesma transação e empresa.

Cada baixa nova no JSON contém valor, forma, data, marca de baixa efetiva e identificador de lote. Produtos, histórico de estoque e caixas não são movimentados por esse serviço. A integração do painel continua somando separadamente os movimentos de caixa que já existiam.

A ausência de uma coluna técnica de estoque não bloqueia mais o card. A ausência de campos financeiros essenciais, porém, gera diagnóstico explícito e HTTP 503; não se fabrica saldo zero. Não execute `sync({ alter: true })` ou `force` para aplicar este pacote.

## Testes e evidências

**63 testes do sistema aprovados:** 20 financeiros novos e 43 de regressão de granel/login. O aplicador da entrega anterior teve dois testes adicionais aprovados, mas não faz parte deste pacote de arquivos completos. A saída está em `RESULTADOS-TESTES.txt`.

Os testes financeiros usam Sequelize real, banco SQLite em memória e requisições HTTP reais ao Express local. A interface existente foi executada com JSDOM. Os módulos de receitas/caixa foram isolados no teste dos cinco endpoints do Painel Financeiro, enquanto a parte de contas a pagar executou SQL real. Essa separação é apenas da suíte de testes, não do código de produção.

| Cenário solicitado | Resultado local |
| --- | --- |
| Empresa sem contas hoje | HTTP 200, JSON `[]` e mensagem informativa. |
| Uma conta ou várias contas hoje | Exibição com descrição, data e saldo; teste com 25 documentos, superior ao limite anterior. |
| Vencimento futuro | Não aparece no card do dia. |
| Conta quitada ou excluída | Não aparece como pendência. |
| Criar conta vencendo hoje | Persiste sem itens e aparece no endpoint. |
| Editar valor, fornecedor e vencimento | Atualiza o documento, sem tocar o estoque. Datas/valores inválidos são rejeitados. |
| Baixa parcial e quitação posterior | Saldo e situação corretos, com histórico e datas de cada baixa. |
| Pagamento em lote com duas formas | Rateio exato; o valor não é repetido em cada conta. |
| Falha no segundo pagamento e nova tentativa | Erro visível; repetir não duplica a primeira baixa. |
| Tentativas concorrentes/excesso | Transação rejeita valor acima do saldo. O adaptador SQLite serializa as transações de teste; concorrência física no TiDB depende da homologação nesse ambiente. |
| Parcelamento e virada de mês | Soma de centavos e vencimentos corretos. |
| Recarga da página | Dados retornam pelo HTTP a partir do banco de teste; saldo parcial permanece. |
| Empresas distintas e empresa nula | Leitura, edição e exclusão cruzadas bloqueadas; empresa nula não é exposta. |
| Schema sem `estoqueProcessado` | SELECT antigo falha; consulta e operações financeiras corrigidas funcionam. |
| Schema sem campo financeiro necessário | HTTP 503 informativo, sem lista vazia fictícia ou stack exposto. |
| Compra finalizada com itens | Baixa/edição financeira preservam itens e marcador de estoque. |
| Resumo/calendário/gráfico/fluxo/pagamentos | HTTP 200 com os saldos e as baixas esperados, sem incluir outra empresa. |
| Login, estoque fracionado, importação e comprovantes cobertos pela suíte de granel | 43 testes de regressão aprovados. |


Também foi verificada a sintaxe dos arquivos JavaScript afetados. Não houve alteração de CSS ou de dimensões/classes do card; o teste de DOM confirma a estrutura, mas não substitui comparação visual no navegador de produção.

## Limites e homologação no Render/TiDB

Não foi possível executar vendas/pagamentos no banco de produção, obter seus logs ou comprovar o resultado publicado. O pacote **não foi publicado automaticamente**. A compatibilidade usa os mesmos models, Sequelize, DATEONLY, transações, JSON e queries parametrizadas da aplicação, sem SQL específico de SQLite no runtime. Ainda é necessário publicar o commit, executar o diagnóstico somente leitura e conferir os documentos reais no Render/TiDB.

Antes da substituição manual, faça backup dos arquivos atuais e confira alterações próprias posteriores nos mesmos arquivos. Nenhuma alteração de conexão, autenticação, sessão ou reconexão do WhatsApp é necessária. As regras e os disparos existentes não são modificados.
