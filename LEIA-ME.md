# PetHub — Pesquisa de produtos em entradas e saídas

## Instalação

1. Faça backup dos arquivos correspondentes e aplique as pastas `backend` e `frontend` deste pacote na raiz do projeto, mantendo os caminhos.
2. Inclua o novo `backend/services/buscaItens.js` junto da rota `itemRoutes.js`.
3. Faça deploy/reinicie a API e recarregue as telas de entradas/saídas. Os HTMLs apontam para JS com versão nova para evitar cache.

Não exige migração, variável ou dependência nova de produção. Os ajustes anteriores de caixa, clientes e comprovantes não são substituídos por este pacote.

Se seus arquivos tiverem alterações próprias mais recentes, revise/aplique `ALTERACOES.patch` para preservar essas mudanças.

## Causa e correções

A API pesquisava `nome LIKE '%texto%'` e `codigo LIKE '%texto%'` dependendo da collation do banco. Em comparação sensível à caixa, pesquisar `a` encontra “Banho”, mas não nomes inteiramente em maiúsculas. Isso corresponde ao comportamento mostrado na captura.

Agora a consulta normaliza os campos com LOWER, sem depender da collation. Nome, código, ID e código de barras são pesquisados. O filtro de empresa autenticada permanece e não existe filtro que exclua estoque zero. A mesma rota atende as outras telas que pesquisam produtos, inclusive a entrada manual em Compras.

Nos autocompletes de Outras Entradas e Outras Saídas:

- lista todos os resultados retornados, com saldo visível;
- preserva estoque `0` em vez de convertê-lo para nulo;
- impede duplicar listeners ao configurar o modal novamente;
- ignora respostas atrasadas de uma pesquisa anterior;
- informa falha da API sem confundi-la com catálogo vazio;
- exige selecionar um cadastro real, sem criar um ID fictício a partir do nome digitado.

**Entrada:** produto com estoque zero pode ser incluído normalmente.

**Saída:** produto com estoque zero aparece e pode ser identificado/selecionado, mas sua inclusão é bloqueada. A inclusão consulta o estoque atual e considera todas as linhas daquele produto já no rascunho; não permite exceder o saldo. Antes de finalizar, o formulário consulta novamente o saldo para impedir saída se o estoque tiver mudado. As consultas de produto por ID ficam restritas à empresa autenticada.

A regra de bloqueio nesta tela de saída não muda a configuração global de estoque negativo utilizada por outras operações do sistema.

## Validação

**5 testes passaram**, conforme `TESTES.txt`:

1. Consulta Sequelize real em SQLite com `case_sensitive_like=ON`: encontra maiúsculas/minúsculas, código, ID e código de barras, incluindo estoque zero, sem misturar empresa.
2. Autocomplete de entrada apresenta todos os produtos e mantém zero.
3. Autocomplete de saída apresenta todos os produtos e mantém zero.
4. Entrada com produto zerado permitida; saída zerada e quantidade acumulada superior ao saldo bloqueadas.
5. Rascunho de saída não é enviado como finalizado quando o estoque caiu para zero desde a inclusão.

Foram executados os scripts reais das telas em JSDOM com API simulada. Os arquivos alterados passaram pela verificação de sintaxe. Não foram acessados Render/TiDB nem feitos lançamentos reais no seu estoque.

Para repetir os testes de desenvolvimento com as dependências dos testes anteriores:

```sh
node --test --test-force-exit tests/estoque-busca.test.js
```

## Escopo

A correção atua na consulta e na inclusão/finalização pelos formulários existentes; não cria um novo mecanismo de estoque nem reescreve os endpoints manuais de movimentação em backend/app.js. Os controles do formulário não transformam a gravação legada em uma transação atômica entre vários terminais. A política de concorrência do servidor permanece na arquitetura existente.

A API mantém o limite atual de até 1.000 resultados por consulta; refine o nome/código em catálogos muito grandes. Após publicar, pesquise “a”, “HOT CAT”, “MAGNUS” e um código, e teste um produto zerado nas duas telas.
