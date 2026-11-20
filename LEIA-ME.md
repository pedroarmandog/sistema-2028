# PetHub — Caixa Clássico e Caixa Rápido

## Instalação

1. Faça backup dos arquivos de venda atuais e aplique os arquivos das pastas `frontend` e `backend` na raiz do seu projeto, preservando os caminhos. O pacote contém apenas este ajuste; não substitua o projeto inteiro. `ALTERACOES.patch` oferece as mesmas alterações em formato de diff para revisão/aplicação em uma versão mais recente.
2. Prepare a tabela nova com as variáveis normais do banco já configuradas:

```sh
node backend/scripts/preparar-layout-caixa.js
```

Execute uma vez antes de iniciar a versão nova, ou acrescente ` && node backend/scripts/preparar-layout-caixa.js` ao final do comando de preparação/build que você JÁ usa. Preserve os comandos existentes de build da Comunidade e outras migrações. A preparação é idempotente: cria somente `preferencias_caixa`, não altera dados de clientes, vendas ou estoque. Não execute `sequelize.sync({ alter: true })` global.
3. Faça deploy/reinicie o serviço. Não há dependência nova de produção e não é necessário modificar `package.json`, `package-lock.json` ou `backend/app.js`.
4. Abra **Nova Venda → Alterar visual do caixa → Usar Caixa Rápido**. A escolha será salva para a empresa autenticada. Sem preferência salva, o padrão é Clássico.
5. Se o navegador ainda mostrar a versão antiga, atualize a página. Os dois scripts possuem uma versão nova na URL.

## O que foi implementado

- Seletor com miniaturas, descrição e indicação “Em uso”. A venda permanece aberta ao alternar: os campos existentes são movidos e restaurados, sem clone nem segundo carrinho.
- Preferência permanente em tabela própria, chave `empresa_id`, rotas GET/PUT `/api/vendas/preferencias/layout-caixa`. Empresa obtida exclusivamente da sessão autenticada; permissão `atendimento.vendas`, seguindo a política existente de usuários legados do ERP. Payload aceita somente `layout`.
- Caixa Rápido em três colunas, operador, relógio, status real do caixa, catálogo real, fotos quando disponíveis, pesquisa e códigos de barras. Releituras somam quantidades compatíveis. Há controles +/−, edição de quantidade, exclusão, destaque e navegação pelas setas na lista.
- F2 pesquisa, F3 quantidade da linha selecionada, F4 cliente, F6 desconto, F7 pagamento e F8 finalização. ESC fecha o pagamento ou pede confirmação para descartar itens. O diálogo de layout usa o fechamento nativo e mantém a venda.
- Dinheiro, Pix, crédito, débito e múltiplo abrem o MESMO pagamento atual. Dinheiro separa valor recebido/troco do valor efetivamente pago; pagamentos múltiplos no rápido exigem soma exata. Os campos específicos e validações de cada forma continuam existentes, inclusive chave Pix quando exigida pelo caixa atual.
- Profissional, observações, condições de pagamento, arredondamento, importação, lista de vendas e demais controles ficam em “Mais opções da venda”. Comprovantes e ações fiscais continuam no fluxo existente.
- Totais compartilhados recalculados a partir dos itens e condições, sem ler os valores exibidos na tela. Descontos/acréscimos/observações permanecem no payload real da venda.
- Validação adicional no servidor para as DUAS interfaces desta página: caixa aberto, produtos/cliente/profissional da empresa, quantidade/estoque acumulado, cálculos em centavos e soma dos pagamentos. A gravação continua nos controllers originais de vendas.
- Proteção contra abertura e finalização concorrentes, inclusive repetição de F8, sem criar uma segunda rotina de estoque/financeiro. O fluxo existente cria uma venda pendente e atualiza o MESMO ID na conclusão; a baixa de estoque continua na chamada existente após pagamento.
- Produtos fictícios de fallback foram removidos. Quando o catálogo falha, o caixa informa o erro e mantém a venda.

## Testes e validação

**9 testes automatizados passaram**, conforme `TESTES.txt`. Executados com Node 24, Sequelize/Express e JSDOM. A persistência da preferência e as validações usaram banco SQLite real em memória; o adaptador de teste está incluído. As interações de tela executaram os scripts reais com APIs simuladas, incluindo leitor consecutivo, estoque acumulado, frações, alternância, atalhos, pagamentos e repetição da finalização.

Para repetir localmente, use Node 22.13+ ou 24, com as dependências normais instaladas. JSDOM é somente uma dependência de testes:

```sh
npm install --save-dev jsdom
node --test --test-force-exit tests/caixa-layout.test.js tests/caixa-rapido.test.js
```

O CSS também foi analisado e os JavaScripts passaram pela verificação de sintaxe. Não foi possível executar inspeção visual em navegador real neste ambiente. Não foram acessados seu TiDB, caixa real, financeiro, emissão fiscal ou Render. O teste de baixa única verifica as chamadas do fluxo de tela; não constitui teste de transação ou concorrência entre dois terminais no banco de produção.

Após deploy, valide uma venda de teste em cada visual, com duas empresas diferentes, confira histórico, estoque e fechamento do caixa; teste também recarregar e acessar a mesma empresa em outro dispositivo. A preferência é lida novamente ao abrir/retomar a página. Uma janela já em uso é sincronizada ao receber foco, sem interromper pagamento aberto.

O catálogo utiliza `/api/itens`, com os filtros e limite já existentes no backend (até 1.000 itens nesta base). “Ver todos” mostra os itens retornados por essa API; não foi introduzida uma fonte de produtos paralela. Produtos rápidos são os primeiros itens reais do catálogo; não foi criado cadastro de favoritos.

Este pacote não reescreve o mecanismo original de gravação/baixa em uma nova transação. Eventuais políticas de concorrência e recuperação de falhas de rede entre persistir a venda e baixar o estoque seguem a arquitetura atual. Os arquivos entregues mantêm os endpoints de venda e estoque existentes.

## Reverter

Retorne os arquivos de Nova Venda e `vendaRoutes.js` ao backup anterior e retire os novos arquivos, se desejar. A tabela de preferências pode permanecer; não contém vendas nem interfere nos dados existentes.
