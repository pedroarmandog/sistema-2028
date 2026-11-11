# Correção: importação XLS no PetHub

Aplicar sobre o pacote de importação de clientes e produtos já instalado.

## Instalação

1. Faça uma cópia dos arquivos atuais.
2. Extraia este ZIP na raiz do projeto sistema-2028, mesclando backend, frontend e tests e substituindo os arquivos correspondentes. Não substitua seu .env.
3. No PowerShell, execute:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\tests\importacao.test.js .\tests\itens-isolamento.test.js .\tests\cliente-sexo.test.js
git add backend/routes/importacaoRoutes.js backend/services/importacao/arquivo-worker.js backend/services/importacao/campos.js frontend/importacao.js tests/importacao.test.js
git commit -m "Aceita XLS e tabelas tabuladas na importacao"
git push
```

Não há dependência ou variável de ambiente nova. Mantenha os comandos atuais de build e start no Render. Depois do deploy, atualize a página com Ctrl+F5.

## O que mudou

- Seletor, arrastar/soltar e backend aceitam CSV, XLS e XLSX.
- XLS pode ser uma planilha binária antiga ou uma tabela de texto tabulada, como Clientes (12).xls.
- Limite de 2.500 registros, mantendo 5 MB, 80 colunas, limites do worker e isolamento da empresa autenticada.
- Cabeçalhos mail e fone1 reconhecidos como email e telefone. fone2/fone3 não substituem o telefone principal automaticamente.
- Fórmulas e links detectados pelo leitor continuam recusados; macros detectadas também são recusadas.

## Como usar o arquivo enviado

Abra Clientes > Importar e selecione o XLS original, sem renomeá-lo. Clique em analisar. Revise as correspondências e escolha explicitamente Ignorar nas colunas sem destino, como códigos do sistema anterior e estatísticas históricas de vendas. Não associe códigos antigos ao ID interno nem à empresa do PetHub. Gere a prévia, confira avisos/erros/duplicados e só então confirme. Linhas com dados inválidos continuam sendo recusadas; esta correção não remove as validações dos cadastros.

## Validação realizada

- Arquivo real recebido: leitura de 1.914 registros e 26 colunas pelo worker, sem gravar dados na produção.
- 13 testes locais passaram: CSV/XLSX existentes; XLS binário; XLS tabulado com 1.914 registros; confirmação de importação binária; limite de 2.500 registros; arquivo binário inválido; validações, duplicados, transação/rollback, permissões e isolamento entre duas empresas; cadastro de sexo.
- Testes usam banco de laboratório em memória e HTTP local. Não foi executado deploy nem importação no TiDB de produção.

Este ZIP contém somente cinco arquivos de código alterados e este guia. Não inclui a planilha de clientes nem credenciais.
