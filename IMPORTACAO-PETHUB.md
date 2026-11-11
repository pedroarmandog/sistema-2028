# Importação de clientes e produtos do PetHub

## Instalação

Este pacote foi preparado com sistema-2028(6).zip e incorpora as correções já entregues de isolamento de itens e cadastro de sexo do cliente nos arquivos necessários à integração. Compare eventuais edições locais feitas depois desse projeto antes de substituir.

Salve um commit e um backup do banco. Extraia o ZIP na raiz do sistema-2028, preservando backend, frontend e tests. Faça commit e push para o Render. As dependências existentes são suficientes. XLSX, Multer e Sequelize já constam no package-lock.

No Shell do serviço da API no Render, execute:

```bash
node backend/scripts/preparar-importacao.js
node backend/scripts/migrar-sexo-clientes.js
```

O primeiro comando cria três tabelas novas e não altera os registros das tabelas antigas. O usuário do TiDB precisa ter permissão de CREATE TABLE. O segundo garante que a opção Outro seja aceita em clientes.sexo. Ele preserva as opções anteriores. As rotas também preparam as tabelas ao primeiro uso, mas os comandos permitem verificar erros antes de usar o modal.

Atualize as páginas com Ctrl+F5 depois do deploy.

## Usar

Em Clientes, clique em Importar Clientes ao lado dos botões superiores. Em Meus Itens, clique em Importar Produtos junto das ferramentas de produtos.

Baixe um modelo vazio CSV ou selecione CSV/XLSX existente. Clique em Analisar planilha. Confirme a associação das colunas. Colunas desconhecidas exigem uma escolha explícita, inclusive para ignorar. Arquivos Excel com várias abas permitem escolher qual aba importar. A primeira linha da aba deve conter os cabeçalhos.

Confira o resumo e as linhas. A prévia tem páginas de 50 registros. Linhas com erro ficam ignoradas, permitindo confirmar as válidas. Para corrigir os dados das células, edite a planilha original e analise novamente. Você pode alterar o mapeamento no modal e repetir a análise.

Confirme a importação. Aguarde o resultado e clique em Atualizar lista. Use Baixar relatório para obter linhas ignoradas ou com erro, seus motivos e os dados da linha.

Limites por arquivo — 5 MB, 1.000 linhas de dados, 80 colunas e 2.000 caracteres por célula. CSV UTF-8 e Windows-1252 são aceitos. Fórmulas e links ativos em Excel são recusados. A leitura de planilhas ocorre em worker separado, com limite de memória e tempo. O servidor limita a duas análises simultâneas. Arquivos maiores devem ser divididos.

## Campos

Clientes exigem Nome. Telefone, e-mail, documento, endereço e demais campos do modelo são opcionais. Sexo aceita Masculino, Feminino, Outro e vazio. Datas devem usar dd/mm/aaaa ou aaaa-mm-dd. CPF/CNPJ são normalizados para dígitos, com verificação de comprimento. Essa verificação não confirma a situação cadastral na Receita.

Produtos exigem Nome, Custo e Venda. Formatos como R$ 120,00, 120,00 e 120.00 são aceitos. Os novos itens são cadastrados como produto. Estoque, código de barras e campos fiscais podem ficar vazios. Para colunas sem correspondência na lista de campos, o usuário deve decidir explicitamente como tratar a informação.

Os modelos incluem campos escalares admitidos no cadastro. IDs internos, empresa_id, saldos financeiros, relacionamentos com pets/vendas e listas estruturadas de fornecedores/composições não são atribuídos pelo arquivo. Colunas desse tipo ficam sem mapeamento e exigem revisão. Dados financeiros, registros clínicos, fornecedores e composições precisam de um fluxo específico de migração.

A importação não dispara notificações e mensagens de boas-vindas para toda a base histórica. O cadastro manual continua usando seus controladores habituais.

## Reconhecimento e centros

O reconhecimento compara aliases de cabeçalhos depois de remover acentos, espaços e diferenças entre maiúsculas e minúsculas. Quando existe uma única correspondência, ela é sugerida. A ordem das colunas é livre.

A classificação usa palavras conhecidas do nome e nomes dos centros da empresa, para alimentação, higiene, acessórios e brinquedos. Só atribui automaticamente quando existe um candidato claro. Caso contrário, o usuário seleciona o centro padrão da própria loja antes de confirmar. Um centro válido informado no arquivo tem prioridade.

Os centros anteriormente ficavam em backend/data/centros.json, um arquivo global. Agora estão em centros_resultado_empresa. Nomes de centros que já aparecem nos produtos da empresa são recuperados para essa loja. Centros do arquivo global sem vínculo comprovável precisam ser cadastrados em Configurações → Centro de Resultado. Não há distribuição automática de centros sem proprietário entre todas as lojas.

## Duplicados e retomada

Clientes são comparados por CPF, CNPJ e e-mail. Produtos usam código de barras, SKU e GTIN. A comparação sempre considera somente a empresa autenticada.

Identificador existente oferece Ignorar duplicado ou Atualizar campos preenchidos. A atualização exige decisão do usuário e preserva campos ausentes. Quando os identificadores apontam para registros diferentes, a linha é recusada.

Nomes semelhantes geram aviso e mantêm a opção de importar ou ignorar. Nomes iguais não são automaticamente considerados a mesma pessoa ou produto.

A confirmação usa uma prévia salva no servidor, válida por uma hora e vinculada ao usuário e empresa. Repetir a confirmação retorna seu resultado anterior. Reimportar a mesma linha já confirmada é ignorado com base no conteúdo e posição no arquivo. Arquivos reorganizados ou alterados sem identificadores fortes exigem atenção aos avisos por nome.

A transação de confirmação bloqueia a linha da empresa e salva registros, comprovantes de importação e resultado juntos. Uma falha inesperada reverte toda essa confirmação. O usuário pode tentar novamente. Cadastros manuais simultâneos que usem outros fluxos podem exigir nova análise quando houver conflito de identificadores.

## Isolamento e permissões

As rotas obtêm a empresa do contexto autenticado. O importador recusa mapear empresa_id e não usa IDs de empresa enviados pelo arquivo. Prévia, confirmação, duplicidades, centros e comprovantes são filtrados por empresa e usuário quando aplicável.

A entrega inclui as correções de itens anteriormente enviadas. O detalhe do cliente passou a consultar por ID e empresa antes de retornar relações. A edição não aceita transferência de id ou empresa_id no corpo.

Funcionários com permissões configuradas precisam de cliente.novo para clientes e item.novo.produto ou item.novo para produtos. A regra legada do sistema, que admite usuários sem lista de permissões configurada, foi preservada. Objetos com permissões explicitamente falsas não liberam a importação.

Dados anteriores que já foram gravados com uma empresa errada continuam exigindo revisão individual. A entrega não reatribui automaticamente registros históricos.

## Testes executados

Com dependências instaladas e Node 22.13 ou superior:

```powershell
node --test .\tests\importacao.test.js .\tests\itens-isolamento.test.js .\tests\cliente-sexo.test.js
```

Foram aprovados 12 resultados, contando os testes principais e subtestes. O ambiente usa os modelos Sequelize e banco SQLite em memória. Os testes de importação usam o middleware JWT real, dois contextos de empresa e requisições HTTP.

Cobertura executada — CSV e XLSX, só nome, cabeçalhos e mapeamento, valores brasileiros, classificação, centro cruzado, leitura/edição/exclusão por ID entre empresas, busca e limite, fraude no identificador de empresa, duplicados, atualização autorizada, repetição de confirmação, linhas inválidas, limite de linhas, fórmulas, permissões e rollback após falha simulada na segunda gravação.

Os botões, mapeamento, análise e confirmação nos dois HTMLs foram exercitados no DOM com jsdom e a API local, gravando um cliente e um produto de teste. A inspeção visual em Chromium ficou pendente porque o navegador não iniciou neste ambiente. O script DOM usou ferramenta de teste temporária e não requer instalar jsdom no PetHub.

A suíte npm test de WhatsApp manteve as duas falhas já identificadas no projeto original. O conector WhatsApp não foi editado nesta entrega. Inicialização completa no Render, migração em TiDB real e teste com arquivos reais dos seus clientes precisam ser validados após aplicar o pacote.

## Tabelas novas

- centros_resultado_empresa — centros pertencentes à empresa.
- importacoes_lotes — prévias com expiração e resultado da confirmação.
- importacoes_linhas — comprovantes para reconhecer linhas já importadas.

Prévia expirada e ainda não confirmada é limpa quando a empresa analisa outro arquivo. Depois de confirmar, o conteúdo detalhado da prévia é limpo. O resultado e os comprovantes são preservados para idempotência e relatórios.

## Arquivos entregues

- backend/models/Cliente.js
- backend/utils/sexoCliente.js
- backend/controllers/clienteController.js
- backend/routes/clienteRoutes.js
- backend/routes/itemRoutes.js
- backend/routes/centroRoutes.js
- backend/routes/importacaoRoutes.js
- backend/middleware/authUser.js
- backend/middleware/exigePermissao.js
- backend/scripts/preparar-importacao.js
- backend/scripts/migrar-sexo-clientes.js
- frontend/clientes.html
- frontend/item/meus-itens.html
- frontend/item/meus-itens.js
- frontend/novo-cliente.js
- frontend/novo-cliente-manager.js
- frontend/importacao.js
- frontend/importacao.css
- tests/importacao.test.js
- tests/itens-isolamento.test.js
- tests/cliente-sexo.test.js
- backend/services/importacao/arquivo-worker.js
- backend/services/importacao/campos.js
- backend/services/importacao/modelos.js
- backend/services/importacao/servico.js
- IMPORTACAO-PETHUB.md
