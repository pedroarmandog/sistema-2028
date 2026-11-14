# PetHub — importação de clientes em lotes e progresso persistente

## Instalação e Render

Este ZIP contém somente os arquivos novos/alterados desta melhoria, além deste guia e dos números medidos. Ele complementa a versão com as correções anteriores de clientes, importação Excel, inteligência comercial e WhatsApp. Não contém `.env`, dependências, planilhas reais, senhas nem dados de clientes.

1. Extraia o ZIP. Copie as pastas `backend`, `frontend` e `tests` para a raiz do `sistema-2028`, preservando os caminhos e substituindo os arquivos correspondentes. Não crie outra pasta `backend` dentro de `backend`.
2. No Render → serviço da API → Settings, mantenha:
   - Build Command: `npm ci --omit=dev`
   - **Pre-Deploy Command: `node backend/scripts/preparar-clientes-inteligencia.js`**
   - Start Command: `npm start`
3. O comando de Pre-Deploy já utilizado agora prepara também a estrutura desta melhoria. Ele precisa executar com o código novo antes de a nova versão atender requisições. Não é necessário editar manualmente o TiDB.
4. Não há dependência npm nova nem alteração do lockfile. Opcionalmente defina `IMPORTACAO_CLIENTES_LOTE=50`. Padrão 50; intervalo efetivo 10–200. Comece com 50. Lotes menores dão checkpoints mais frequentes, mas aumentam as consultas.
5. Faça commit/push dos arquivos substituídos e acompanhe o deploy. Após ele concluir, recarregue a página com Ctrl+Shift+R.

No PowerShell, na raiz do projeto:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
$testes = Get-ChildItem .\tests\*.test.js | ForEach-Object { $_.FullName }
node --test $testes
```

Se quiser preparar a estrutura manualmente no banco configurado no `.env` (esse comando acessa o banco de verdade):

```powershell
node .\backend\scripts\preparar-clientes-inteligencia.js
```

Para enviar, confira primeiro o que será incluído:

```powershell
git status --short
git add backend/app.js backend/models/Cliente.js backend/controllers/clienteController.js backend/services/importacao/servico.js backend/services/importacao/operacoes.js backend/routes/importacaoRoutes.js backend/scripts/preparar-clientes-inteligencia.js backend/scripts/benchmark-importacao.js frontend/importacao.js frontend/importacao.css tests/importacao-progresso.test.js tests/browser/importacao-progresso.ui.cjs
git commit -m "Importacao de clientes em lotes com progresso persistente"
git push origin main
```

Não inclua `.env` no commit.

## Diagnóstico

A leitura CSV/XLS/XLSX já ocorria em worker separado, com limites de tamanho, fórmulas/macros bloqueadas e mapeamento/normalização antes da gravação. Esses mecanismos foram preservados.

O gargalo encontrado na confirmação era uma transação abrangendo toda a planilha, com gravações e buscas individuais sequenciais para cliente, perfil, histórico e comprovante de importação. No cenário com histórico, o fluxo síncrono preservado executou aproximadamente dez comandos SQL por novo cliente. Uma conexão remota soma latência a cada ida ao banco. Não tive acesso às métricas do Render/TiDB para atribuir os dez minutos exclusivamente à rede ou confirmar a região/pool em produção.

Agora há buscas agrupadas por lote, `bulkCreate`, atualizações por upsert e transações curtas. Os IDs dos clientes inseridos são consultados por uma referência técnica única: não há suposição de IDs consecutivos, particularmente importante no TiDB. A análise continua carregando os clientes da própria empresa para conferir duplicidades; não se tornou um índice global em memória nem um cruzamento entre empresas. O ganho medido abaixo é principalmente da confirmação/gravação.

## Funcionamento e recuperação

- Confirmar cria uma operação durável e devolve HTTP 202 com ID. Não espera gravar toda a planilha.
- O mesmo token de prévia devolve a mesma operação. Um bloqueio da empresa e um índice único impedem duplicação por duas abas/cliques. Uma empresa mantém uma operação ativa ou interrompida de cada vez.
- O monitor inicia com a API e processa um lote por vez neste processo Node, alternando operações pela atualização mais antiga. Não existe paralelismo ilimitado nem novo serviço externo.
- Dados normalizados, escolhas, cursor, contadores e relatório ficam no TiDB. Não dependem do arquivo temporário nem do disco do Render.
- Cliente, perfil, resumo histórico, comprovante e checkpoint são confirmados juntos. Se o lote falhar, seu progresso não é publicado como concluído. Lotes anteriores permanecem salvos.
- Após reinício, o monitor retoma o cursor persistido. Uma interrupção abrupta pode exigir até aproximadamente dois minutos para expirar a posse anterior. Desligamento normal libera a posse ao terminar o lote corrente.
- Se houver erro de gravação, a operação fica **Interrompida**, preserva os contadores confirmados e oferece **Retomar com segurança**. Não confirme a planilha novamente para contornar a interrupção.
- Uma resposta de COMMIT perdida é tratada relendo o checkpoint salvo; a retomada não reinicia da primeira linha.
- Ao terminar, o relatório final fica disponível. A cópia dos dados normalizados é removida da operação/prévia; contadores e relatório permanecem no banco.

### Interface

A segunda etapa do modal esconde o mapeamento e apresenta cachorro SVG leve, barra, percentual, etapa, quantidade, duração, estimativa e quatro contadores separados: criados, atualizados, ignorados e rejeitados. O relatório inclui ação/motivo para cada linha.

O navegador consulta o status a cada 1,5 segundo. O percentual vem exclusivamente do cursor confirmado no banco. A estimativa usa a média móvel do tempo dos lotes; inicialmente mostra “Calculando”. Sem checkpoint recente, informa espera e suspende a estimativa. A animação das patas não aumenta o percentual. O cachorro avança conforme o percentual recebido. CSS respeita movimento reduzido e telas pequenas.

Na leitura/análise inicial, o indicador é indeterminado, porque essa etapa não publica checkpoints por linha; não há porcentagem simulada. A etapa de finalização só passa a “Concluída” depois de persistir o resultado.

Fechar o modal ou atualizar a página não cancela a importação. Ao reabrir Importar Clientes, a operação ativa é recuperada do backend. Para ver uma já terminada, use **Ver última importação**.

## Banco, segurança e preservação

A preparação é aditiva e idempotente, sem `force`/`alter` geral:

- Cria `importacoes_operacoes`, com índices de empresa/lote único, recuperação e estado por empresa.
- Acrescenta `Clientes.importacao_ref`, nullable, com índice único `clientes_importacao_ref`.
- Acrescenta índice iniciando por `empresa_id` em Clientes se não existir um equivalente (`clientes_empresa_importacao`).
- Mantém os índices existentes de códigos/IDs legados por empresa e dos resumos por empresa/cliente/referência. CPF/e-mail normalizados na consulta podem usar funções SQL; não afirmo que seus índices simples acelerem essa comparação integralmente. O filtro da empresa continua obrigatório.

Todas as rotas usam autenticação, empresa do backend e a permissão existente `cliente.novo`. Status/relatórios de outra empresa retornam 404. O progresso não expõe o conjunto de dados bruto. Logs técnicos contêm ID da operação, empresa, checkpoint e código de erro, sem planilhas, tokens ou conteúdo dos clientes. A referência técnica é protegida contra edição pelo cadastro manual.

Opcionais vazios não apagam valores existentes. Continuam preservados: códigos legados, Instagram, telefones adicionais, bloqueios, data original do cadastro, resumo/ticket histórico e corte de conciliação. Resumo importado não cria vendas fictícias nem movimenta estoque/financeiro. O envio de WhatsApp, pets e vendas não foi reimplementado. A importação de produtos mantém seu contrato anterior e não foi convertida para jobs nesta entrega.

## Medições reais

Node v24.22.1; SQLite em memória; lote 50; processo novo por cenário; uma medição por combinação. Comparação entre confirmação síncrona preservada e nova operação em lotes. O tempo abaixo começa depois da prévia e inclui criação/finalização da operação e consultas de acompanhamento do benchmark. Não inclui upload, latência real Render/TiDB, intervalo do monitor nem espera do polling visual. A prévia foi medida separadamente no JSON.

| Clientes | Síncrono anterior | Em lotes | Comandos SQL antes → depois | Registros/s em lotes | Resposta inicial |
|---:|---:|---:|---:|---:|---:|
| 10 | 0.067 s | 0.053 s | 108 → 59 | 187.5 | 9 ms |
| 100 | 0.356 s | 0.144 s | 1.008 → 81 | 695.8 | 11.1 ms |
| 500 | 1.357 s | 0.260 s | 5.008 → 257 | 1922.5 | 8.1 ms |
| 1.000 | 2.611 s | 0.646 s | 10.008 → 477 | 1548.8 | 8.6 ms |
| 2.500 | 7.539 s | 1.528 s | 25.008 → 1.137 | 1636.6 | 11.5 ms |

Em cada volume foram confirmados exatamente N clientes novos, sem criação na outra empresa. Fora do tempo medido, os mesmos N clientes foram atualizados pelo novo fluxo: zero duplicados, N atualizados, histórico mantido e relatório com N linhas. Arquivo `benchmark-medido.json` contém todos os resultados. São medições locais, não uma promessa de duração em produção.

Para reproduzir em banco descartável em memória, sem TiDB nem transmissão externa:

```powershell
node .\backend\scripts\benchmark-importacao.js .\benchmark-importacao-local.json
```

## Validação realizada e limites

- **117 testes aprovados**, incluindo regressões existentes e novos testes do processamento assíncrono.
- Testados: checkpoint confirmado, total consistente, relatório, clique repetido, restauração por consulta autenticada, reinício simulado com novo processador, posse expirada, rollback, perda da resposta após COMMIT, IDs esparsos, atualização preservando opcionais/saldos/histórico, reimportação sem duplicação, duas empresas e ETA desatualizada.
- A planilha real enviada foi processada localmente pelo parser e pelo novo fluxo: **499 linhas, 495 criados, 4 rejeitados sem nome**, relatório de 499 linhas. Seus dados não fazem parte deste pacote.
- Benchmarks de 10/100/500/1.000/2.500 executados; os mesmos volumes foram atualizados e conferidos.
- Sintaxe dos JavaScripts alterados verificada. Não existe script de build neste projeto. Não executei inicialização da API contra suas credenciais de produção nem migração/deploy no seu TiDB/Render; os testes utilizam banco isolado.
- Teste de navegador preparado em `tests/browser/importacao-progresso.ui.cjs`: cobre progresso sem avanço por relógio, esconder mapeamento, fechar/reabrir, recarregar, 375px e movimento reduzido. **Não executado com sucesso aqui**: Chromium foi bloqueado pelo ambiente ao abrir seu socket. Portanto, aparência/interação final ainda precisam de conferência no seu navegador.

Opcional para executar esse teste visual em uma cópia local do projeto:

```powershell
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node .\tests\browser\importacao-progresso.ui.cjs
```

Playwright é apenas ferramenta de teste local. Não acrescente instalação de navegador ao Build Command do Render.

## Roteiro após deploy

1. Em uma empresa de teste, importe uma planilha com códigos legados e histórico, confira a referência e o mapeamento e confirme uma vez.
2. Observe contadores/percentual por lotes. Em TiDB muito rápido, vários checkpoints podem ser concluídos entre duas consultas da tela; isso não é avanço falso.
3. Feche o modal e reabra. Recarregue a página durante uma operação maior: a mesma operação deve reaparecer.
4. Aguarde Concluída; baixe o relatório. Confira criados + atualizados + ignorados + rejeitados = total.
5. Reimporte a mesma planilha e confira ausência de duplicados. Para alterar fichas, modifique a origem e selecione Atualizar explicitamente na prévia.
6. Confira no cadastro um telefone/Instagram/bloqueio e um histórico anterior. Na outra empresa, confirme que os clientes e o andamento não aparecem.
7. Para validar reinício em ambiente de teste, reinicie a API durante uma importação maior. Aguarde a recuperação da posse e confira retomada do cursor, sem recriar os lotes anteriores. Uma planilha pequena pode terminar antes do reinício.

## Arquivos de código novos/alterados

- `backend/app.js`
- `backend/models/Cliente.js`
- `backend/controllers/clienteController.js`
- `backend/services/importacao/servico.js`
- `backend/services/importacao/operacoes.js`
- `backend/routes/importacaoRoutes.js`
- `backend/scripts/preparar-clientes-inteligencia.js`
- `backend/scripts/benchmark-importacao.js`
- `frontend/importacao.js`
- `frontend/importacao.css`
- `tests/importacao-progresso.test.js`
- `tests/browser/importacao-progresso.ui.cjs`
