# PetHub — correção da importação de Clientes (12).xlsx

Aplicar sobre os pacotes Inteligência de Clientes e correção de Nova Venda desta conversa. Entrega incremental, somente arquivos novos/alterados. A planilha original não foi modificada e seus dados pessoais não foram incluídos neste ZIP.

## Diagnóstico confirmado com o arquivo enviado

A planilha tem 499 linhas com algum conteúdo. Dessas, **495 têm nome**. As linhas 2, 3, 4 e 5 não possuem nome; não é possível criar um cliente identificável a partir delas, e a correção continua rejeitando essas quatro linhas. O intervalo Excel contém ainda linhas vazias/formatadas, que não são cadastros.

As datas de cadastro são números internos do Excel com formato personalizado `YYYY-MM-DDhh:mm:ss`. O texto exibido junta a data e a hora, por exemplo `2022-01-1317:43:27`, e o conversor anterior tentava validá-lo como uma data simples. Alterar apenas o formato padrão de datas do leitor não resolvia esse formato personalizado.

A coluna CPF também contém números, não somente texto. Na análise do arquivo, 184 CPFs podem recuperar zeros à esquerda e passam pela verificação dos dígitos. Outros 36 valores não são CPFs válidos. A validação anterior tratava a falta de dígitos como erro fatal da linha, impedindo o cadastro de pessoas cujo nome e demais dados eram utilizáveis.

Além disso, o resultado final agrupava erros e decisões de ignorar na mesma contagem. Era possível confirmar uma prévia inteiramente inválida e receber apenas “0 criados, 0 atualizados, 499 ignorados”, sem concluir nenhuma importação real.

## O que foi corrigido

1. Datas numéricas do Excel são lidas pelo valor interno e pelo formato da célula. São convertidas para data civil ISO antes da validação, incluindo formatos personalizados com horário e calendário Excel 1904. O dia não é deslocado pelo fuso do servidor. O campo de cadastro original continua guardando a data, conforme a estrutura já implantada.
2. A origem numérica dos documentos é preservada na leitura. Zeros à esquerda do CPF só são recuperados quando o resultado tem 11 dígitos e passa pela verificação dos dígitos verificadores. Texto curto não é preenchido por suposição.
3. CPF inválido não é usado para identificar/mesclar clientes nem gravado como CPF fiscal. O cliente com nome pode ser importado com aviso; o valor original fica nas Observações para conferência e o CPF existente válido não é apagado numa atualização. E-mail inválido e CNPJ com quantidade de dígitos inválida também geram aviso e preservação do original, sem derrubar o cadastro completo. Esta entrega não implementa uma nova validação completa de CNPJ.
4. Códigos/IDs legados identificam as fichas do sistema de origem. Duas fichas de códigos diferentes já conhecidos não são fundidas apenas por compartilharem CPF/e-mail. Conflitos ambíguos de identificadores continuam exigindo revisão. Nome parecido sozinho não autoriza sobrescrever outra pessoa.
5. A prévia mostra avisos de opcionais separadamente dos erros impeditivos. O relatório inclui os avisos dos registros importados/atualizados.
6. Confirmação é desabilitada quando não há linha válida pendente. A API de clientes também recusa um lote inteiramente inválido. Se todos os registros estão marcados Ignorar, a tela pede que o usuário selecione criar/atualizar, em vez de apresentar uma importação vazia como concluída.
7. Foi adicionado o botão **Atualizar os clientes identificados** para selecionar explicitamente a atualização dos cadastros encontrados. Não há sobrescrita automática: confira a prévia e confirme. Campos opcionais vazios continuam preservando os dados existentes.
8. Para indicadores históricos, a tela pode sugerir a referência pelas propriedades de criação/modificação do arquivo. É uma sugestão, não uma prova da data de referência comercial. A tela pede conferência e nova análise antes de habilitar a confirmação. Se não houver metadado confiável, a data deve ser preenchida manualmente.

## Resultado da reprodução com a sua planilha

Em banco isolado, vazio para a empresa de teste, usando o arquivo exato recebido e referência de teste 13/11/2026:

| Etapa | Resultado |
| --- | --- |
| Prévia | 499 linhas, 495 válidas, 4 sem nome |
| Confirmação | **495 criados, 0 atualizados, 4 ignorados** |
| Reanálise do mesmo arquivo | 495 linhas já importadas reconhecidas, sem criar duplicidades |

Os avisos de documentos não foram escondidos para atingir essa contagem: os valores problemáticos ficam preservados para revisão. Os quatro registros sem nome não viraram clientes fictícios.

Esse teste não importou nada no seu Render/TiDB. Se sua empresa já tiver clientes identificados, parte do resultado será Atualizados/Ignorados conforme as ações que você escolher; não é correto prometer 495 clientes novos em um banco já preenchido.

## Como aplicar e importar

1. Extraia o ZIP e mescle as pastas `backend`, `frontend` e `tests` na raiz de `sistema-2028`. Substitua somente os arquivos recebidos. Não apague as pastas inteiras do projeto.
2. No PowerShell:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\tests\*.test.js
```

3. Faça commit dos arquivos recebidos no VS Code e sincronize com o GitHub. Faça o deploy do backend e frontend juntos.
4. Mantenha o Pre-Deploy já configurado para `node backend/scripts/preparar-clientes-inteligencia.js`. Esta correção não adiciona migração, tabela, variável de ambiente ou dependência.
5. Após o deploy, atualize a página com Ctrl+F5, abra Importar Clientes novamente e selecione o arquivo original. Não reutilize o token/prévia da tentativa anterior; analise novamente.
6. Confira os mapeamentos e a **Data de referência dos indicadores**, acima do mapeamento. Neste arquivo as propriedades sugerem **13/11/2026**. Use essa data apenas se corresponder à exportação/resumo; caso contrário, informe a referência correta. Clique de novo em Analisar planilha após conferir a sugestão.
7. Confira a prévia: as quatro linhas sem nome podem continuar com erro; os 495 clientes com nome devem ser utilizáveis, salvo conflitos reais com os cadastros já presentes no seu banco.
8. Se o sistema encontrar clientes existentes e você quiser completar/atualizar seus dados, clique em **Atualizar os clientes identificados**, confira as ações e confirme. Clientes que só tenham nome semelhante, sem identificador confiável, precisam de revisão manual; não force uma mesclagem pelo nome.
9. Confirme e baixe o relatório. Confira as Observações dos cadastros com documento/e-mail de origem para corrigir antes de usá-los numa operação fiscal.

Não é necessário editar a planilha para apagar datas, completar CPFs indiscriminadamente ou cadastrar nomes fictícios nas quatro linhas vazias. Não são geradas vendas individuais a partir dos totais históricos; as regras de análise/conciliacão anteriores permanecem.

## Arquivos entregues

| Arquivo | Alteração |
| --- | --- |
| `backend/services/importacao/arquivo-worker.js` | Datas reais Excel, metadados numéricos e sugestão de referência |
| `backend/services/importacao/normalizarCliente.js` | Novo tratamento de CPF e opcionais, com avisos/preservação do original |
| `backend/services/importacao/servico.js` | Integração das normalizações, preservação em observações, identificação segura por legado e rejeição de lote totalmente inválido |
| `backend/routes/importacaoRoutes.js` | Devolve a sugestão de referência para a tela |
| `frontend/importacao.js` | Avisos visíveis, conferência da referência, atualização explícita em lote e bloqueio de confirmação vazia |
| `tests/importacao-planilha-legada.test.js` | Reprodução anonimizada do formato e dos casos problemáticos |
| `tests/importacao.test.js` | Ajusta a expectativa do teste anterior para opcionais inválidos com aviso/preservação |

## Validação

- **107 testes aprovados, zero falhas** na suíte completa do projeto local.
- Oito testes no novo arquivo cobrem CPF numérico com zeros, CPF/e-mail inválido preservado, 499 linhas com quatro sem nome, datas personalizadas com hora, 495 criações, snapshots, reimportação, CPF compartilhado por fichas legadas distintas, atualização sem apagar CPF válido, lote inválido e isolamento entre empresas.
- Reprodução adicional com o arquivo real enviado: 495 criados e quatro ignorados no banco de teste, seguida de reanálise sem duplicação.
- Sintaxe dos arquivos JavaScript alterados conferida.
- Não houve acesso ao banco de produção, envio de WhatsApp/SMS ou alteração no módulo fiscal.
- A inspeção visual no navegador e a confirmação no Render/TiDB continuam pendentes; a reprodução foi feita pela API/worker real com HTTP/JWT/SQLite em memória. A planilha real não é distribuída junto aos testes, que usam clientes fictícios.
