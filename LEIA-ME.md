# PetHub — Cliente na Nova Venda / Caixa

## Aplicar

1. Faça backup e substitua **nova-venda.js e nova-venda.html** dentro de `frontend/atendimento`, mantendo os caminhos.
2. Faça deploy e recarregue Nova Venda. O HTML usa `nova-venda.js?v=20261120-clientes4` para evitar cache da versão anterior.
3. Não há alteração de backend, migração, dependência ou variável nova.

Se sua página HTML tiver mudanças adicionais próprias, preserve-as e atualize somente a versão do script. `ALTERACOES.patch` mostra as alterações em relação à versão anterior.

## O que foi corrigido

A busca acessava diretamente `cliente.nome.toLowerCase()` e `cliente.telefone.includes()`. Um telefone nulo/ausente (ou nome ausente) interrompia o filtro da lista inteira, mostrando “Erro ao carregar clientes”.

- Campos opcionais são normalizados sem exceção; códigos ausentes usam o ID do cadastro.
- Seleção compara IDs normalizados e preserva o ID real no payload da venda.
- Busca consulta a API autenticada com `search` e `limit`, em vez de tentar encontrar tudo somente nos primeiros 100 clientes. Mantém o isolamento por empresa já aplicado no backend.
- Aceita tanto `{success:true,clientes:[...]}` quanto um array de clientes da API. Respostas fora de ordem são ignoradas.
- A seleção reaproveita o cadastro encontrado na busca, sem refazer uma listagem e perder o cliente selecionado. Quando necessário, consulta o cadastro pelo ID.
- Removidos os nomes fictícios que eram usados como fallback quando a API falhava.
- Resultados usam texto seguro, sem HTML/onclick montado com o nome ou o ID do cliente. Pode selecionar com clique ou setas/Enter; ESC fecha a busca de cliente sem descartar a venda.
- Digitar outro nome invalida o vínculo anterior; limpar/remover cliente continua permitido. Cliente permanece opcional no fluxo original.
- Carrinho, preferências de layout, carregador inicial, imagens, modais e demais melhorias anteriores preservados nos dois visuais.

## Testes

**20 testes automatizados passaram**. Incluem busca/seleção de cliente sem telefone nos dois visuais, ID em texto, cliente mantido no pedido enviado, resposta em array, descarte de resposta atrasada, falha da API sem inserir clientes fictícios e regressões anteriores de caixa.

Resultado em `TESTES.txt`. Os scripts reais foram executados em JSDOM com API simulada; os testes anteriores de backend usam SQLite em memória. Não foi acessado o Render ou seu banco de produção. Após deploy, busque Karol, selecione e confirme que o cliente aparece na venda.

O teste atualizado está incluído para seu ambiente de desenvolvimento:

```sh
node --test --test-force-exit tests/caixa-layout.test.js tests/caixa-rapido.test.js
```
