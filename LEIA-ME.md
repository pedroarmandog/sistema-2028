# PetHub — Modal centralizado e carregamento inicial

## Aplicação

Este pacote atualiza o Caixa Rápido já instalado, preservando as melhorias anteriores de teclado e imagens.

1. Faça backup e substitua os **três arquivos** de `frontend/atendimento`, mantendo os caminhos.
2. Faça o deploy normal e recarregue Nova Venda. As URLs do JS e CSS estão versionadas com `20261120-loading3` para evitar o cache anterior.
3. Não é necessário executar migração, alterar banco, variáveis ou dependências.

A alteração de HTML é necessária: esconder o caixa apenas depois que o JavaScript carregar não impediria o flash inicial. Se seu HTML tiver alterações adicionais próprias, use `ALTERACOES.patch` para preservar essas mudanças, incluindo o estilo crítico no início do head, a classe inicial `qr-booting`, o carregador e os atributos do container.

## Correções

- Seletor de visual fixado no centro horizontal e vertical da viewport. Margem zerada explicitamente para não depender da margem automática afetada pelo reset global. Altura máxima e rolagem interna para telas menores; backdrop e comportamento nativo do dialog mantidos.
- HTML já inicia com a área de venda oculta e não interativa. Enquanto o backend informa a preferência, aparece uma bolinha de carregamento no centro da área útil do caixa; cabeçalho e menu continuam visíveis.
- A área só é liberada depois que os controles estão no layout correto, seja Clássico ou Rápido. Não há escolha antecipada via localStorage nem atraso visual artificial.
- No Rápido, a busca recebe foco depois da liberação do conteúdo.
- Falha/timeout ao consultar a preferência mantém os caixas ocultos e oferece “Tentar novamente”, em vez de mostrar o Clássico por engano. A consulta possui cancelamento após 20 segundos; uma nova tentativa pode ser feita sem recarregar.
- A preferência por empresa, carrinho, pagamentos, imagens e atalhos existentes foram preservados.

## Validação

**17 testes automatizados passaram**, incluindo preferência por empresa, carregamento com resposta atrasada, conteúdo inicialmente inerte/oculto, liberação do visual certo, erro e nova tentativa, além da regressão de teclado, imagens, carrinho e pagamento. Resultado em `TESTES.txt`.

Os testes executam os scripts reais em JSDOM com APIs de tela simuladas; os testes anteriores de backend usam SQLite em memória. O CSS é analisado sintaticamente. Não houve inspeção visual em navegador real nem acesso ao Render/TiDB/R2 nesta execução. Após o deploy, confirme o alinhamento visual do seletor e o carregamento com F5 na página publicada.

O teste atualizado está em `tests/caixa-rapido.test.js`; para repetir com o ambiente de testes do pacote anterior:

```sh
node --test --test-force-exit tests/caixa-layout.test.js tests/caixa-rapido.test.js
```
