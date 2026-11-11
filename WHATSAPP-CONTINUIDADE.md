# PetHub — correção de continuidade do WhatsApp / Baileys

## Problemas encontrados no código recebido

1. Credenciais e chaves Signal existiam somente na memória do Node. Um reinício perdia o vínculo no servidor, embora o celular ainda exibisse o aparelho vinculado.
2. A inicialização consultava apenas status=conectado em whatsapp_sessions e criava uma autenticação vazia. Status salvo não é uma sessão Baileys: esse caminho solicitava um novo QR após reinício.
3. A leitura do QR não limpava a imagem/estado anterior de forma consistente. O código também encerrava a sessão em falhas de criação do socket.
4. O resumo usava upsert sem unicidade por empresa. A correção atualiza linhas existentes, sem gerar novas linhas a cada reconexão.

Esses defeitos foram confirmados no código. Sem os logs do instante da queda, não é possível afirmar qual deles provocou cada ocorrência no Render.

## Comportamento corrigido

- Credenciais e todas as categorias de chaves Signal persistidas com AES-256-GCM por empresa no banco já usado pelo ERP.
- Tabelas próprias pethub_wa_auth e pethub_wa_signal, criadas automaticamente com sync simples, sem alter/force e sem apagar tabelas existentes. O usuário do banco precisa poder criar essas duas tabelas. Nenhum disco persistente é necessário.
- Lease de 90 segundos, renovado pelo monitor de 20 segundos, impede duas APIs de usar a mesma sessão durante troca de deploy.
- Quedas temporárias tentam novamente continuamente com espera de 1 a 60 segundos, preservando credenciais e chaves. Falha ao abrir um socket não cria autenticação vazia.
- restartRequired (515) refaz o socket da empresa com a mesma autenticação; o QR lido some enquanto conclui o vínculo. Eventos atrasados são ignorados.
- Marketing mostra Reconectando durante recuperação; só mostra conectado após connection=open. Um QR atrasado não substitui uma conexão aberta.
- SIGTERM/SIGINT param os sockets sem fazer logout e liberam a posse para o próximo processo. Em morte abrupta, outro processo pode assumir depois de expirar o lease, em aproximadamente 90 a 110 segundos.
- Logout, sessão revogada/inválida e desconexão manual encerram o vínculo. Conexão substituída por outro dispositivo/API pausa a restauração para evitar disputa.
- Fila e lembretes mantêm seus contratos. Envio indisponível continua temporário e a fila preserva pendentes; sucesso só ocorre quando sendMessage retorna ID.
- QR, credenciais, chaves e tokens não são registrados nos logs adicionados.

A documentação de autenticação e restartRequired foi conferida e o código instalado do Baileys 7.0.0-rc14 foi inspecionado. Não foi necessário trocar dependências nem lockfile. Referência: https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/connecting.md

## Arquivos do pacote

- backend/app.js — monitor de restauração e desligamento sem logout.
- backend/services/whatsappService.js — ciclo de vida e reconexão.
- backend/services/whatsappAuthStore.js — novo repositório cifrado por empresa.
- frontend/marketing.js — exibição de Reconectando.
- tests/whatsapp.test.js — atualização das expectativas de recuperação contínua.
- tests/whatsapp-persistencia.test.js — testes novos.
- WHATSAPP-CONTINUIDADE.md — este guia.

Este ZIP é incremental: substitua os arquivos nos caminhos indicados na raiz do sistema-2028. backend/app.js é o arquivo completo alterado, baseado na versão mais recente do projeto fornecida nesta conversa. Se você fez outras edições nesse arquivo depois, compare antes de substituí-lo. Não inclui .env, credenciais, planilhas ou node_modules.

## Configuração no Render

Mantenha seu serviço pago e uma instância/processo Node. Mantenha build npm ci --omit=dev e start npm start, sem Chrome/Puppeteer.

A criptografia usa WHATSAPP_AUTH_KEY, se definida; caso contrário usa FISCAL_ENCRYPTION_KEY. Como você já configurou uma FISCAL_ENCRYPTION_KEY válida, não precisa gerar outra para começar. O valor precisa ter exatamente 64 caracteres hexadecimais. Não altere a chave usada depois de salvar o vínculo. Uma troca torna as credenciais anteriores ilegíveis. Não use JWT nem token Focus como chave.

Opcionalmente, antes de usar esta persistência pela primeira vez, crie uma chave exclusiva:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado para WHATSAPP_AUTH_KEY no Environment do serviço da API e mantenha-o fixo. Não publique o valor no Git. Se definir essa variável localmente, coloque-a apenas no seu .env local. O pacote não modifica sua configuração fiscal.

Para conferir apenas o formato no Shell do Render, sem mostrar a chave:

```sh
node -e 'const k=process.env.WHATSAPP_AUTH_KEY||process.env.FISCAL_ENCRYPTION_KEY||""; console.log({tamanho:k.length,valida:/^[0-9a-f]{64}$/i.test(k)})'
```

Resultado esperado: tamanho 64 e valida true.

## PowerShell / instalação e deploy

Faça backup dos arquivos atuais. Extraia o ZIP na raiz do projeto mesclando backend, frontend e tests. Não crie uma segunda pasta sistema-2028 dentro do projeto.

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --check .\backend\app.js
node --check .\backend\services\whatsappService.js
node --check .\backend\services\whatsappAuthStore.js
node --check .\frontend\marketing.js
node --test .\tests\whatsapp.test.js .\tests\whatsapp-persistencia.test.js
```

Os testes precisam do Node 22.13+ ou 24, das dependências já instaladas e do adaptador do laboratório fiscal em backend/scripts/lab-fiscal/sqlite.js, presente no projeto recebido. Os avisos do SQLite experimental/TEXT no laboratório não significam falha; confirme fail 0. Não executam envios reais.

```powershell
git add backend/app.js backend/services/whatsappService.js backend/services/whatsappAuthStore.js frontend/marketing.js tests/whatsapp.test.js tests/whatsapp-persistencia.test.js WHATSAPP-CONTINUIDADE.md
git commit -m "Preserva vinculo WhatsApp e recupera conexao automaticamente"
git push
```

Depois do deploy, atualize Marketing com Ctrl+F5. Neste primeiro deploy provavelmente será necessário escanear novamente: a versão antiga não tinha salvo as credenciais completas. Uma sessão antiga que já se perdeu não pode ser recuperada só pelo número/status.

## O que foi testado

30 testes locais passaram, incluindo as verificações anteriores de importação, cadastro de cliente e isolamento de itens. Desses, 17 verificam WhatsApp:

- QR -> leitura -> 515 -> novo socket -> open, preservando credenciais e chaves.
- Conversões assíncronas e QR/eventos atrasados não regridem open.
- Duplo clique, SSE fechado/recarga, duas empresas e desconexão manual.
- Trinta quedas consecutivas com a mesma autenticação e backoff máximo de 60 segundos.
- Envio de texto/anexos, confirmação por ID e fila pendente durante indisponibilidade.
- Persistência cifrada e recuperação após recriação do serviço sem novo QR.
- Segunda API não assume lease ainda válido; posse expirada é recuperada.
- Chave de servidor incorreta não apaga credenciais nem emite outro QR.
- Monitor recupera socket fechado sem evento e conexão travada antes do open.
- Desconexão durante aquisição impede criação tardia de socket.
- Erro transitório ao recriar socket preserva auth e tenta novamente.
- Logout remove apenas o vínculo da empresa afetada.
- Teste da função de renderização do Marketing com DOM simulado.
- Relógio simulado por 24 horas com renovação do lease, um só socket e envio ao final.

Também passaram a validação de sintaxe dos quatro arquivos de execução e o carregamento do módulo sem iniciar conexões de rede. O package.json não possui script de build separado. A inicialização completa com seu TiDB/Render e um WhatsApp real não foi executada aqui. Os testes usam eventos simulados e SQLite em memória, não uma corrida real entre dois servidores TiDB. A simulação de 24 horas não é um teste de duração real nem mede estabilidade da rede ou do WhatsApp.

## Teste no celular

1. Após o deploy, abra Marketing e leia o QR uma vez. Aguarde Conectado.
2. Envie uma mensagem de teste pelo fluxo normal do PetHub a um número que você controla e confirme o recebimento.
3. Atualize/feche a página. Volte alguns minutos depois, confirme Conectado e receba uma segunda mensagem sem novo QR.
4. Deixe um lembrete agendado para um número de teste e confirme o recebimento no horário e no ciclo da fila já existente.
5. Reinicie o serviço no Render. Aguarde a restauração automática: deve passar de Reconectando para Conectado sem leitura. Em encerramento abrupto, aguarde até aproximadamente dois minutos para expirar a posse antiga.
6. Use por 24 horas reais e confirme novos envios. Para localizar uma eventual queda nos logs do Render, filtre por [WhatsApp][empresa:ID]; as linhas agora indicam código de encerramento, preservação do vínculo e reconexão.
7. Teste Desconectar: deve permanecer desconectado, inclusive após reiniciar. Novo Conectar deve oferecer um QR novo.

Não é possível garantir ausência absoluta de interrupções ou que o próprio WhatsApp nunca revogue a sessão. Esta correção preserva e recupera vínculos válidos automaticamente; uma revogação real, saída no celular ou sessão inválida continuará exigindo novo pareamento.
