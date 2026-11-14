# PetHub — Importação de Pets e Auditoria de Clientes

Entrega de 14/11/2026. Somente arquivos novos/alterados desta tarefa. A base é o projeto fornecido mais as correções anteriores, incluindo **PetHub-Importacao-Clientes-Progresso.zip**. As dependências e o lockfile não mudaram. Não há `.env`, banco de produção nem planilhas de pessoas neste pacote.

## 1. O que causava a diferença

Foram reproduzidos dois pontos diferentes:

1. **Listagem limitada:** `GET /api/clientes` devolvia no máximo 100 registros por padrão. A tela recebia esse subconjunto e fazia paginação e pesquisa locais. Os demais clientes podiam existir no banco e ficar fora da navegação/busca.
2. **Indicador 37:** não representa o total geral. A regra já existente do Dashboard usa a data original quando informada; caso contrário, a criação no PetHub. A planilha fornecida resultou em 458 clientes com data original e 37 sem essa informação. Os 37 sem data original entraram no mês da importação.

Reprodução local efetivamente executada com `Clientes (12) (1).xlsx`, usando o parser e os serviços reais, em banco descartável:

| Indicador | Resultado |
|---|---:|
| Linhas de dados | 499 |
| Válidas / clientes criados e confirmados | 495 |
| Atualizados na primeira importação do banco vazio | 0 |
| Ignorados na primeira importação | 0 |
| Rejeitados, sem nome | 4 |
| Total confirmado no banco | 495 |
| IDs únicos percorridos pela paginação | 495 |
| Clientes com data original preservada | 458 |
| Clientes sem data original na origem | 37 |
| Indicador mensal nesse cenário | 37 |
| Entradas no PetHub nesse mês | 495 |

Esses números são da reprodução da planilha, **não uma consulta ao seu TiDB de produção**. Cadastros preexistentes podem mudar criados/atualizados/ignorados. Não foi necessário apagar ou refazer sua importação. As quatro linhas sem nome continuam rejeitadas com motivo explícito; não são criados nomes fictícios.

## 2. Correções da tela Clientes

- Paginação executada no banco, com `limit`/`offset` ou `page`, ordenação estável e total independente da página.
- Pesquisa percorre os clientes da empresa no banco, incluindo registros fora da primeira página. Nome ignora maiúsculas/minúsculas e acentos; telefone/CPF toleram formatação.
- Resposta acrescenta `paginacao.total`, `totalGeral`, `limit`, `offset`, `page` e `paginas`, preservando `success` e `clientes`.
- A tela mostra total da empresa, total encontrado com filtros e quantidade exibida. Foram mantidos filtros de grupo, status, datas, aniversário e dias sem faturamento no backend. A opção de exibir milhares de uma vez foi retirada; páginas têm até 150 registros.
- Pets da página são obtidos em consulta agrupada: não se faz uma chamada HTTP extra por cliente para preencher essa coluna.
- A listagem mostra **cadastro original** quando disponível e, abaixo, **Entrada PetHub**. Não se modifica `createdAt` para fingir que o registro já existia no sistema.
- A conclusão de importação atualiza a listagem. Exportação busca páginas no banco, respeitando os filtros.
- O indicador mensal foi preservado. Nenhum endpoint ou estatística do Mobile foi substituído pelo total mensal.

## 3. Importar Pets

Após o deploy, abra **Pets → Importar Pets**. Use **Baixar Modelo CSV** para obter os cabeçalhos e preencha os dados dos animais. A planilha de clientes fornecida não contém uma lista de pets; é preciso exportar a lista de animais do sistema anterior ou preencher o modelo.

Fluxo:

1. Importe os clientes primeiro e aguarde a conclusão. Seus códigos/IDs legados permanecem disponíveis.
2. Em Pets, selecione CSV, XLS ou XLSX. Analise e confira o mapeamento. Espécie, raça, sexo, nascimento, idade informada, porte, cor, pelagem, microchip, peso, observações, status e identificadores são reconhecidos.
3. Confira a etapa **Conferir vínculo dos pets**. Ela mostra o pet, tutor da planilha, cliente encontrado, motivo e ação.
4. O vínculo automático usa código/ID legado, CPF válido único ou nome normalizado junto de telefone válido e único. Telefones principais/adicionais e formatos brasileiros com `55` e nono dígito são tratados. CPF numérico com zero inicial só é restaurado se seus verificadores forem válidos.
5. Nome isolado, telefone isolado, homônimos, CPF compartilhado e identificadores conflitantes exigem revisão. Pesquise e selecione o tutor manualmente ou ignore a linha.
6. Se não existir tutor e houver nome/telefone suficientes, **Cadastrar tutor da planilha** exige sua confirmação e permissão `cliente.novo`; o backend recusa dados equivalentes para evitar duplicação. Não cadastra tutores automaticamente.
7. Confirme as ações. Pets existentes só são atualizados por escolha explícita. A importação não transfere um pet existente para outro tutor. Opcionais vazios preservam os valores anteriores.
8. Acompanhe o progresso real por lotes, contadores, vínculos confirmados, pendências, tempo e estimativa. Fechar/recarregar não cancela a operação. Baixe o relatório final.

### Origem e prevenção de duplicidade

Use a mesma **Origem** ao reimportar os pets do mesmo sistema. Padrão `legado`. Código do pet considera empresa + origem; microchip considera a empresa. Um mesmo nome não é chave única.

O cadastro atual de clientes tem um único namespace de códigos legados por empresa, tratado como `legado`. Se você indicar outra origem para os pets, o backend não confia nesses códigos de tutor sem comprovação: tenta CPF/nome+telefone ou exige seleção manual. Para tutor novo confirmado de outra origem, os identificadores são preservados em observações, sem sobrescrever o namespace legado existente.

Dois animais de mesmo nome com códigos confiáveis distintos podem coexistir. Sem identificadores suficientes, a tela pede confirmação de que se trata de outro animal. A reimportação da mesma linha utiliza comprovantes persistidos e não recria o pet. Identificadores/origens conflitantes não são sobrescritos silenciosamente.

**Pets sem tutor não são gravados**, pois o modelo existente exige `cliente_id`. Ignore-os e reanalise depois de cadastrar/escolher o tutor. Linhas ignoradas sem gravação não recebem comprovante de importação.

Não se criam vendas ou histórico financeiro fictício. A importação em lote não dispara boas-vindas em massa. Os relacionamentos existentes de cliente/pet/agendamento são mantidos.

## 4. Banco e migração

Execute a versão atualizada de:

```text
node backend/scripts/preparar-clientes-inteligencia.js
```

O script é idempotente e compatível com a estrutura MySQL/TiDB do projeto. Sem `force`, exclusão ou recriação das tabelas:

- Acrescenta em `pets`: `codigo_legado`, `origem_importacao`, `importacao_ref`, `especie`, `cor`, `peso` e `idade_informada`.
- Usa os campos já existentes `cliente_id`, `genero`, `chip`, `pelagem`, `data_nascimento`, `observacao`, `ativo` e `empresa_id`.
- Preenche apenas `pets.empresa_id` ausentes a partir do tutor existente. Não troca tutores nem reassocia registros a outra empresa.
- Acrescenta índices de empresa/tutor, referência de importação única, empresa/origem/código e empresa/microchip. O índice global antigo de chip é substituído pelo índice por empresa, preservando os dados.
- Acrescenta `tipo` e `vinculos_pendentes` em `importacoes_operacoes`. Operações antigas recebem tipo `clientes`.
- Reutiliza as tabelas de prévias/comprovantes/operações existentes e os checkpoints da importação de clientes. Não cria uma segunda fila nem uma nova tabela de tutores.

Se houver inconsistência que impeça criar um índice, o script falha em vez de apagar ou fundir registros para forçar a migração. Sua saída informa o erro.

## 5. Aplicação no VS Code / Render

Tenha um backup atualizado antes da migração. Extraia o ZIP e copie **backend**, **frontend** e **tests** para a raiz do projeto, preservando os caminhos e substituindo os arquivos correspondentes. Não coloque uma pasta `backend` dentro de outra.

Render:

| Campo | Valor |
|---|---|
| Build Command | `npm ci --omit=dev` |
| Pre-Deploy Command | `node backend/scripts/preparar-clientes-inteligencia.js` |
| Start Command | `npm start` |

O Pre-Deploy precisa executar com os arquivos novos antes de a nova versão atender requisições. Se já usa esse comando, mantenha-o: o conteúdo do script foi atualizado.

Variáveis opcionais:

- `IMPORTACAO_CLIENTES_LOTE=50`: tamanho do lote compartilhado por clientes e pets; intervalo efetivo 10–200. Recomendo manter 50 inicialmente.
- `IMPORTACAO_MAX_LINHAS=2500`: máximo de linhas por arquivo; pode ser configurado até 10.000. O padrão continua 2.500 para preservar os limites de CPU/RAM do serviço. Permanecem 5 MB, 80 colunas e limite do worker. Isso limita cada arquivo, não a quantidade total de clientes/pets da empresa. Divida volumes maiores em arquivos.

Não é necessário configurar token novo, Chrome, disco persistente ou outro serviço pago.

PowerShell, após copiar os arquivos:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
$testes = Get-ChildItem .\tests\*.test.js | ForEach-Object { $_.FullName }
node --test $testes
git status --short
```

Confira as alterações, faça commit/push pelo VS Code e acompanhe o deploy. Não envie `.env`. Após o deploy, use Ctrl+Shift+R para carregar os JavaScripts novos.

### Alternativa: patch Git

Use o patch **em vez de substituir os mesmos arquivos manualmente**. Coloque `pethub-pets-clientes.patch` na raiz do projeto:

```powershell
Test-Path .\pethub-pets-clientes.patch
git apply --check .\pethub-pets-clientes.patch
git apply .\pethub-pets-clientes.patch
```

O patch foi aplicado em uma cópia da base e os 25 arquivos resultantes foram comparados byte a byte com os arquivos entregues. Se a checagem falhar, sua base difere da utilizada; não force uma aplicação parcial.

## 6. Auditoria no TiDB real

Depois da migração, no Shell do Render, informe o ID da empresa que deseja verificar:

```text
node backend/scripts/auditar-clientes-importacao.js 1
```

Troque `1` pelo ID correto. O script executa **somente SELECT**. Mostra total, ativos, entradas no PetHub no mês, cadastro original/mensal, clientes com comprovantes e as dez operações mais recentes com seus contadores. Não lista dados pessoais de clientes.

Também há `GET /api/clientes/auditoria-importacao`, autenticado e com permissão `cliente.novo`. A empresa vem do usuário autenticado. A contagem total da página vem de consulta separada do limite da página. Operações têm seus próprios totais de criados, atualizados, ignorados e rejeitados; não devem ser somadas como se todos fossem cadastros novos.

## 7. O que foi testado

**130 testes de regressão passaram** com Node 24.22.1, usando banco isolado em memória. Mais uma execução do teste de auditoria utilizou a planilha real fornecida; o resumo está em `VALIDACAO-MEDIDA.json`.

Cobertura executada:

- Planilha de 499 linhas, 495 confirmados e quatro rejeitados sem nome.
- Total consultado no banco, vinte páginas percorridas sem perder IDs, busca pelo cliente do final da planilha, datas originais e indicador mensal 37.
- Pets em volumes de 10, 100, 500 e 1.100; reimportação sem duplicados e relatório com uma entrada por linha.
- Upload CSV/XLS/XLSX nos endpoints reais; HTTP 202, reenvio da confirmação e recuperação do status.
- Vínculos por código, CPF e nome/telefone, homônimos/conflitos, falta de tutor e seleção manual.
- Múltiplos pets por tutor, nomes iguais, atualização preservando opcionais e impedimento de transferência automática de tutor.
- Permissões, empresa adulterada no corpo da requisição, acesso a progresso de outra empresa e microchip por empresa.
- Reinício simulado com novo processador e retomada a partir do checkpoint.
- Pets presentes nos detalhes do cliente e criação efetiva de agendamento usando um pet importado.
- Regressões existentes de cadastro/edição, sexo do cliente, clientes, vendas, estoque/isolamento, marketing, WhatsApp, progresso e regras de Dashboard/Mobile.

Tempos locais medidos para **criação + segunda análise/reimportação**, com uma execução por volume e lote 50, sem latência Render/TiDB:

| Pets | Tempo local | Criados na primeira | Duplicados na segunda |
|---:|---:|---:|---:|
| 10 | 0.073 s | 10 | 0 |
| 100 | 0.118 s | 100 | 0 |
| 500 | 0.863 s | 500 | 0 |
| 1100 | 3.498 s | 1100 | 0 |

Esses números não são promessa de duração em produção. Não houve acesso às suas credenciais, migração no TiDB, deploy no Render ou envio real de mensagens/notificações. O teste de agendamento validou gravação/relacionamento; entrega por WhatsApp/push depende da configuração e dos serviços reais.

O teste visual `tests/browser/pets-clientes.ui.cjs` foi preparado para seleção/revisão, confirmação única, progresso, recarga e largura 375px. A execução aqui foi bloqueada pelo socket do Chromium, portanto **não foi aprovada visualmente**. Para executar localmente, opcionalmente:

```powershell
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node .\tests\browser\pets-clientes.ui.cjs
```

Esses comandos de navegador são apenas para teste local, não para o Build Command do Render. O projeto não possui comando de build além da instalação/start; a sintaxe dos JavaScripts alterados foi verificada.

## 8. Validação após deploy

1. Na empresa correta, abra Clientes. Confira o total geral no rodapé, navegue até a última página e pesquise um nome que não aparece na primeira.
2. Compare a data original com Entrada PetHub. Compare o indicador mensal com a auditoria, não com o total geral.
3. Em uma empresa de teste, importe poucos pets pelo modelo. Confirme os vínculos antes de gravar. Confira os animais na aba Pets e nos detalhes dos tutores.
4. Teste um tutor ambíguo: a confirmação deve exigir seleção manual ou Ignorar. Não deve associar pelo nome isolado.
5. Reimporte a mesma planilha e confira ausência de duplicados. Agende um pet importado e confirme o tutor exibido.
6. Com uma planilha maior, feche/reabra e recarregue o acompanhamento. Em ambiente de teste, reinicie a API durante a operação e confira a retomada após expirar a posse anterior (até aproximadamente dois minutos em parada abrupta).
7. Entre em outra empresa e confira isolamento de clientes, pets, candidatos e progresso.

## 9. Arquivos novos ou modificados

- `backend/controllers/clienteController.js`
- `backend/controllers/petController.js`
- `backend/models/Pet.js`
- `backend/routes/clienteRoutes.js`
- `backend/routes/importacaoRoutes.js`
- `backend/routes/petRoutes.js`
- `backend/scripts/auditar-clientes-importacao.js`
- `backend/scripts/preparar-clientes-inteligencia.js`
- `backend/services/importacao/arquivo-worker.js`
- `backend/services/importacao/campos.js`
- `backend/services/importacao/operacoes.js`
- `backend/services/importacao/pets.js`
- `backend/services/importacao/vinculoTutor.js`
- `backend/services/listagemClientes.js`
- `frontend/client-details.js`
- `frontend/clientes-novo.js`
- `frontend/clientes-paginacao.js`
- `frontend/clientes.html`
- `frontend/filtros-simples.js`
- `frontend/importacao.js`
- `frontend/pets/meus-pets.html`
- `tests/browser/pets-clientes.ui.cjs`
- `tests/cliente-sexo.test.js`
- `tests/clientes-planilha-auditoria.test.js`
- `tests/importacao-pets.test.js`
