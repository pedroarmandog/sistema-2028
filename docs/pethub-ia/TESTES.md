# Evidências de testes

Resultado final do conjunto executado: **96 testes passaram, zero falhas**, com Node 24. Registro em `docs/pethub-ia/resultado-testes.txt`.

## Ambiente e alcance

- Node test runner, Sequelize 6 e SQLite integrado em memória com adaptador de laboratório.
- SDK OpenAI e socket Baileys injetados. Não houve autenticação real, consumo de conta OpenAI, leitura de QR, chamada à Meta ou envio a clientes.
- Transações de escrita são serializadas no laboratório para reproduzir a política de travas; isso não comprova concorrência entre processos no TiDB.
- UI verificada por JSDOM: estrutura e eventos, não screenshots ou ensaio em celular.
- Os arquivos de testes não entram no processamento de produção. Dados de exemplo existem somente nas fixtures.

## Conjunto do módulo entregue

| Arquivo | Cobertura |
| --- | --- |
| tests/pethub-ia.test.cjs | Schema, contratos/empresas, permissões, catálogo, posse, propostas/agenda, confirmação, sandbox, reservas e cobrança, suspensão, fila, HMAC/cifragem, APIs, worker, falhas, memória, créditos, relatório, backoff, módulo desligado e distinção entre lembrete e intervenção humana; busca/paginação, faturas, boas-vindas, retenção, horários e privacidade do sandbox. |
| tests/pethub-ia-whatsapp.test.cjs | Mesmo socket; envio legado com chamada original; autorização opcional; ID estável; falha da ponte sem logout/desconexão; flag desligada e histórico ignorado. |
| tests/pethub-ia-ui.test.cjs | Menus copiados, caminhos, IDs, 12 abas, texto seguro, menu condicionado, pesquisa/paginação no servidor, registro manual de fatura e instalador com backup/idempotência/recusa de base divergente. |
| tests/pethub-ia-audio.test.cjs | Limites de bytes/duração, arredondamento conservador, execução de ffprobe e indisponibilidade. |

Para reproduzir a suíte nova, com as dependências do projeto e jsdom 26.1.0 disponíveis no ambiente de desenvolvimento:

```bash
node --test --test-force-exit tests/pethub-ia*.cjs
```

Os testes novos usam Node 24 e `tests/helpers/sqlite-caixa.js`. `jsdom` é uma dependência de testes, não do módulo em produção.

## Regressões existentes também executadas

- tests/instancias-baileys.test.js: QR/SSE, isolamento das instâncias e disparador, permissões, mídia e remetente selecionado.
- tests/importacao-api-produtos.test.cjs, tests/importacao-botao.test.cjs e tests/importacao-modos.test.cjs: rotas/botão de produtos, modo clientes separado e compatibilidade da importação.

Essas suítes já existiam no projeto utilizado e não são copiadas de volta pelo pacote IA. O total de 96 inclui essas regressões. O pacote inclui as cinco suítes do módulo e o adaptador em memória necessário a elas.

O integrador também foi aplicado à cópia exata do WhatsApp anterior à adaptação: a saída correspondeu byte a byte à versão autorizada revisada; reaplicá-lo não mudou mais nenhum arquivo. O diff dos dois pontos está em `docs/pethub-ia/whatsapp-autorizado.diff`.

## Matriz externa pendente

| Cenário | Validar antes de piloto comercial |
| --- | --- |
| Empresa sem IA | Menu ausente, acesso negado; QR, conexão, disparos, lembretes e automações sem alterações. |
| Empresa liberada | Configuração isolada, modelos/recursos de contrato e modo operacional independente da licença. |
| Sandbox OpenAI | Modelo real chama ferramentas estritas, uso/rate/custo registrados, nenhum WhatsApp ou cadastro real. |
| WhatsApp atual | Recebe novo texto/áudio, não cria segundo socket e usa a mesma sessão para responder. |
| Intervenção humana | Mensagem manual assume conversa; eco de automação identificada não assume; devolver reativa só a conversa escolhida. |
| Cadastro/agenda | Confirmação posterior obrigatória; posse, empresa, preço, duração, capacidade e feriado revalidados; sem duplicidade. |
| Modo aprovação | Solicitação chega à equipe, só grava após aprovação e mantém status coerente. |
| Lembretes | Criar/reagendar/cancelar pela IA sincroniza a fila existente e respeita preferências, sem duplicar disparos. |
| Franquia e orçamento | Duas instâncias simultâneas, teto baixo, limite de tokens/áudio, virada de ciclo e pausa no meio de chamada. |
| Falha/reinício | Jobs persistidos recuperados; envio incerto não repetido; custo sem confirmação tratado conservadoramente. |
| Segurança | Empresas A/B sem acesso cruzado, alteração de plano só por Admin, prompt injection sem ampliação de permissão. |
| Mídia e push | Avatar privado por empresa, áudio real de até dois minutos, aviso em dispositivo inscrito e navegação correta. |
| UI | Desktop/celular, menu, busca, dropdowns, contraste, redução de movimento e respostas da API lentas. |
| Operação contínua | Pelo menos 24 horas em infraestrutura sem suspensão, com banco e sessão persistentes. |

Não marcar esta matriz como aprovada apenas porque a suíte local passou.

## Validações adicionais da versão 2

- Busca por nome com/sem acento, telefone, conteúdo cifrado e tratamento literal de termos de consulta.
- Cursor vinculado à consulta e empresa, paginação sem perda/duplicação em dados estáveis, histórico além de 100 mensagens e bloqueio de sandbox pela central geral.
- Filtros derivados de ações/jobs e isolamento multiempresa. Mensagens durante intervenção humana, pausa operacional e fora do horário da IA preservadas sem chamadas ao SDK.
- Fatura imutável/idempotente, diferença por competência, acesso somente Admin, nenhuma alteração em orçamento/consumo e ausência de soma automática de escopos sobrepostos.
- Integração de boas-vindas do primeiro pet confirmada uma vez, segundo pet sem novo evento e falha sem desfazer o cadastro ou repetir envio incerto.
- Horário de Brasília/feriado/agrupamento na passagem do expediente; histórico sem horários desconhecidos não é classificado por suposição.
- Retenção em lotes preserva valores e tempos conhecidos, limpa dados pessoais e deixa reservas abertas para reconciliação.
- Interfaces exercitadas por DOM para paginação/pesquisa e envio de valores em USD convertidos corretamente para micros.

Continuam sendo testes locais com fornecedores injetados; não representam homologação do aparelho, OpenAI ou TiDB reais.

## Correção da coluna administrativa — v3

A suíte tests/pethub-ia-admin-coluna.test.cjs verifica as duas tabelas e as importações no HTML, usa os renderizadores originais do Admin, testa ativação/desativação individual, primeira configuração, atualização dos dois locais, preservação do clique de detalhes e erros de publicação. Verifica também ausência de duplicação ao refiltrar e independência do componente financeiro opcional.

Um teste adicional no backend conecta a interface ao Express/rotas reais do módulo com SQLite em memória: desativar e reativar por botões diferentes persiste o estado correto sem alterar a outra empresa, chamar a OpenAI ou enviar WhatsApp. Teste de plano arquivado confirma que isso não impede a desativação de um contrato existente. Nenhum desses testes foi executado no banco ou conta de produção do usuário.
