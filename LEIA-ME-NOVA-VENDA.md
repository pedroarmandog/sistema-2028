# PetHub — correção de seleção de cliente na Nova Venda

Aplicar sobre a versão com o pacote PetHub-Clientes-Inteligencia desta conversa. Este ZIP contém somente os arquivos novos/alterados desta correção; não substitui o projeto todo.

## Problemas encontrados no código

1. O filtro da Nova Venda executava `cliente.telefone.includes(...)` sem conferir se o telefone era nulo. Telefone é opcional no cadastro; uma linha sem telefone podia interromper a busca inteira, mesmo havendo um cliente correspondente mais adiante.
2. A tela carregava `/api/clientes` sem termo e filtrava no navegador. O endpoint devolvia por padrão somente os primeiros 100 cadastros; clientes antigos fora dessa página não apareciam.
3. Ao selecionar, a tela recarregava essa mesma primeira página e comparava IDs com igualdade estrita. Isso podia perder o resultado selecionado e falhar com ID texto/número.
4. Em caso de falha de API, havia clientes fictícios com IDs fixos como fallback. Esse fallback foi removido: falha de autenticação/API agora apresenta erro e não oferece nomes fictícios para uma venda real.
5. Respostas atrasadas podiam sobrescrever a pesquisa nova. Editar o texto também podia manter o ID de um cliente anteriormente selecionado.
6. A gravação da venda aceitava o ID de cliente sem conferir sua empresa. O fallback por nome podia escolher arbitrariamente o primeiro homônimo.

A captura fornecida mostra a mensagem genérica da busca; ela não contém o erro HTTP/stack de produção. Os defeitos acima foram identificados no código e os cenários foram reproduzidos/validados localmente.

## Correção

- Novo GET autenticado `/api/clientes/busca-venda?search=termo`, sempre limitado à empresa autenticada, com até 30 correspondências do banco. Pesquisa em todos os cadastros dessa empresa, não somente na primeira página.
- Pesquisa por nome (ignorando caixa/acentos portugueses comuns), e-mail, telefone, CPF ou ID do PetHub. Telefone/CPF podem ser digitados sem pontuação.
- Cadastro importado e cadastro feito no ERP usam a mesma busca. Não há filtro que restrinja a origem.
- Campos opcionais vazios são tratados; resultados são montados com `textContent`, sem inserir nome de cliente como HTML ou como código onclick.
- A seleção reutiliza o resultado exibido e guarda seu ID real. Respostas antigas são ignoradas; alterar o nome digitado desfaz a seleção anterior.
- Se houver texto sem um cliente selecionado, a tela pede para selecionar o resultado ou limpar o campo. Venda sem cliente continua permitida com o campo vazio.
- Na criação e atualização da venda, o backend confere se o ID pertence à empresa e usa o nome atual do cadastro. IDs de outra empresa são recusados antes de gravar.
- Compatibilidade com consumidores antigos que mandam somente nome: aceita associação quando há um único cadastro exato na empresa. Homônimos exigem seleção por ID; nome desconhecido não gera venda silenciosamente sem vínculo.

## Vínculo com a Análise de Vendas

O vínculo é `vendas.clienteId` + `vendas.empresa_id`, independentemente de o cliente ter sido importado. Não é uma funcionalidade exclusiva de Excel.

Ao finalizar uma venda e abrir/atualizar a Análise de Vendas do cliente selecionado, a transação entra nos indicadores conforme as regras já implementadas. Produto e serviço usam os itens da própria venda. Editar o mesmo registro não cria uma segunda venda para a análise. Cancelamentos são excluídos conforme a regra anterior.

Para cliente sem resumo histórico, as vendas do PetHub compõem diretamente total, quantidade e ticket. Para cliente com resumo importado, permanece a estratégia Separado ou Somar posteriores ao corte escolhida no pacote anterior; esta correção não muda nem soma o histórico novamente.

Não são atribuídas retroativamente vendas antigas sem ID a pessoas pelo nome: isso seria inseguro com homônimos. A correção vale para a seleção/gravação nova e para atualização explícita do cliente na venda.

## Arquivos

| Arquivo | Alteração |
| --- | --- |
| `frontend/atendimento/nova-venda.js` | Busca, seleção, tratamento de vazios/erros, respostas atrasadas e validação do cliente |
| `backend/routes/clienteRoutes.js` | Rota específica antes da rota dinâmica `/:id`; mantém as rotas do pacote Inteligência |
| `backend/services/buscaClientesVenda.js` | Novo serviço/endpoint de pesquisa por empresa |
| `backend/services/vendaCliente.js` | Novo vínculo/validação de cliente ao salvar venda |
| `backend/controllers/vendaController.js` | Aplica a validação na criação/edição, preservando o restante do fluxo de pagamento/fiscal |
| `tests/nova-venda-clientes.test.js` | Novos testes HTTP/JWT/Sequelize e lógica da interface |

Não há nova dependência, tabela, coluna, migração ou variável de ambiente. Não há alteração nos módulos de WhatsApp, importação ou no cálculo de análise do pacote anterior.

## Instalação

1. Extraia e mescle as pastas `backend`, `frontend` e `tests` na raiz do projeto. Substitua somente os arquivos recebidos; não apague as pastas inteiras.
2. No PowerShell:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\tests\nova-venda-clientes.test.js
```

Para repetir todos os testes disponíveis dos pacotes anteriores:

```powershell
node --test .\tests\*.test.js
```

3. Pelo VS Code, confira e faça commit dos seis arquivos recebidos, depois sincronize com o GitHub. Faça o deploy do backend e frontend juntos.
4. Mantenha o Pre-Deploy já configurado para `preparar-clientes-inteligencia.js`: ele continua pertencendo ao recurso anterior. Esta correção não acrescenta outro comando de banco.
5. Depois do deploy, abra Nova Venda e pressione Ctrl+F5. Não precisa reinstalar o banco ou reimportar clientes.

## Testes executados

Node 24.22.1, SQLite em memória e HTTP local com JWT real, sem conexão com o TiDB ou envio real de mensagens:

- Busca encontra cliente antigo além da primeira página de 100 cadastros.
- Cliente sem telefone/e-mail aparece e pode ser selecionado.
- Nome sem acento/caixa, e-mail, telefone, CPF e ID.
- Empresa diferente não recebe os clientes da primeira; requisição sem autenticação é rejeitada.
- Seleção grava o ID e o backend corrige o nome para o cadastro real.
- Venda pela API com produto e serviço aparece na análise do cliente já existente.
- Venda nova de cliente importado entra após o corte; atualizar a mesma venda não duplica quantidade/total.
- ID de outra empresa, nome desconhecido e homônimos sem seleção são recusados sem gravar venda indevida.
- Venda sem cliente continua possível; cancelamento corrige a análise.
- Lógica da interface: seleção sem uma segunda requisição, texto tratado como texto, resposta atrasada ignorada, limpeza invalida busca e falha de autenticação não oferece clientes fictícios.

Resultado: 9 testes neste arquivo aprovados; a suíte completa teve **99 testes aprovados, zero falhas**. Sintaxe dos arquivos JavaScript conferida. A lógica de interface foi exercitada em DOM simulado, não por inspeção visual em navegador. O teste no seu Render/TiDB permanece necessário.

## Roteiro no seu sistema

1. Entre com a empresa correta e abra Nova Venda.
2. Digite `Ka`, clique no cliente desejado e confira o cartão com nome e ID. Teste também um cliente antigo ou sem telefone.
3. Adicione um produto e um serviço e finalize a venda uma única vez.
4. Abra esse cliente → Análise de Vendas → Atualizar. Confira valor, quantidade e os tipos de item.
5. Repita com um cliente importado e um cadastrado manualmente. Ambos devem funcionar.
6. Se aparecer “Sessão indisponível”, saia e faça login novamente. Se houver erro HTTP depois do deploy, colete o erro da requisição `/api/clientes/busca-venda` e o log correspondente do backend.
