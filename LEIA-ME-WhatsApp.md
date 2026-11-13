# PetHub — recuperação contínua do WhatsApp

Correção de 13/11/2026. Pacote incremental: contém somente 7 arquivos de código/testes alterados ou novos, mais este guia. Base: as correções anteriores de reconexão persistente e automações de Marketing desta conversa. Não substitui o projeto inteiro.

## O que foi identificado

O trecho de log disponibilizado registra a empresa 60003 desconectando com código 428 às 19:21:46 e voltando a ficar pronta para envio às 19:21:51. Esse episódio recuperou sozinho. O trecho não contém o encerramento prolongado relatado; portanto não permite afirmar a causa exata daquele episódio.

A revisão do código encontrou riscos concretos na recuperação anterior:

- A renovação da posse da sessão esperava na mesma fila das gravações de credenciais/chaves. Uma fila lenta podia expirar a posse. O próprio processo depois tratava expiração como transferência para outra API, abandonando seu estado em memória.
- Credenciais recebidas em uma rajada de eventos geravam uma gravação por evento; leituras repetidas das mesmas chaves voltavam ao banco.
- Certas recusas e um QR inesperado em sessão já pareada apagavam automaticamente o vínculo salvo, impedindo a tentativa seguinte de reutilizá-lo.
- O monitor percorria empresas em sequência. Uma consulta travada atrasava a recuperação das demais e a próxima execução do monitor.
- Não havia histórico operacional persistente por empresa para consultar depois.

Isso demonstra defeitos no código anterior, não prova que todos ocorreram no seu Render. O novo histórico permitirá identificar o próximo incidente real.

## Comportamento da correção

1. Credenciais e chaves continuam cifradas nas tabelas existentes `pethub_wa_auth` e `pethub_wa_signal`, separadas por empresa. A criptografia e a chave são compatíveis com os vínculos já gravados.
2. Renovação da posse sai da fila serial de gravações. Se o prazo venceu, o mesmo dono pode renovar; se outra API assumiu, a API antiga para. Mantém a proteção contra dois processos usando a mesma sessão.
3. Cache de chaves por sessão, limitado a 800 entradas e validade de cinco minutos. Gravações só são confirmadas depois do COMMIT. Falhas conservam um journal em memória para nova tentativa antes de abrir outro socket. Se o banco falhar e o processo morrer antes de gravar, esse journal em memória não sobrevive; a recuperação usa o último estado durável.
4. Eventos `creds.update` são agrupados, preservando o estado mais recente. O monitor é único e verifica empresas independentemente.
5. Quedas temporárias retomam o mesmo vínculo com espera progressiva de 1 a 60 segundos. `restartRequired` recria o socket com as mesmas credenciais/chaves. A página pode ser fechada ou atualizada sem encerrar a sessão.
6. Um QR inesperado em sessão pareada não apaga o vínculo nem é mostrado como se fosse uma conexão nova. Após três ocorrências, a sessão é preservada e o painel explica a necessidade de ação. Recusas 403/411/440 também preservam a autenticação e pausam tentativas; 500 repetido três vezes sem conseguir abrir é tratado como sessão recusada. É possível tentar Conectar novamente ou usar Desconectar para autorizar novo pareamento.
7. Desconexão manual e logout confirmado pelo WhatsApp (401) encerram a autenticação. Não é possível reutilizar uma sessão revogada pelo WhatsApp.
8. A tabela nova `pethub_wa_eventos` registra estado, motivo, tentativas e identificador da execução, sem número de telefone, QR, token ou material de autenticação. Guarda até 200 eventos por empresa; a consulta mostra os 100 mais recentes. Falha ao gravar diagnóstico não derruba a conexão.

O objetivo é recuperar automaticamente a disponibilidade sem outro QR enquanto a autenticação for válida. Não existe garantia verificável de socket físico ininterrupto por 365 dias: rede, banco, servidor e o próprio WhatsApp podem interrompê-lo. Esta entrega foi validada com eventos simulados, sem aparelho real ou acesso administrativo ao seu Render/TiDB.

## Arquivos deste pacote

| Arquivo | Alteração |
| --- | --- |
| `backend/services/whatsappService.js` | Recuperação, monitor, preservação de autenticação e eventos operacionais |
| `backend/services/whatsappAuthStore.js` | Posse, cache, agrupamento de I/O e recuperação de chaves pendentes |
| `backend/services/whatsappDiagnostico.js` | Novo histórico por empresa no banco |
| `backend/scripts/diagnostico-whatsapp.js` | Nova consulta do histórico pelo Shell |
| `frontend/marketing.js` | Aviso e botão Desconectar quando a sessão precisa de ação |
| `tests/whatsapp-persistencia.test.js` | Testes ampliados de persistência e recuperação |
| `tests/helpers/whatsappSqlite.js` | Adaptador SQLite exclusivo dos testes, compatível com booleanos |

Rotas, formatos de envio, anexos, filas e contratos do restante do ERP foram preservados. Não há alteração de dependências, package.json, lockfile, migrações fiscais, telas fiscais ou banco de clientes/produtos.

## Aplicar no Windows / VS Code

1. Extraia o ZIP em uma pasta temporária.
2. Copie as pastas `backend`, `frontend`, `tests` e este guia para a raiz de `sistema-2028`. Confirme a substituição dos arquivos existentes. **Mescle as pastas; não apague as pastas inteiras do projeto.**
3. No PowerShell, execute:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --version
node --test .\tests\whatsapp.test.js .\tests\whatsapp-persistencia.test.js
```

Use Node 24 para repetir a versão testada. O SQLite nativo também está disponível no Node 22.14 usado anteriormente; mensagens sobre SQLite experimental são avisos, não aprovação/falha do teste. O resultado esperado é 27 testes aprovados e zero falhas, considerando o `whatsapp.test.js` da correção anterior.

As dependências são as mesmas. Caso estejam ausentes na sua máquina, rode `npm ci` antes dos testes. Não execute simultaneamente `npm start` local e o Render com a mesma sessão de empresa. O script de teste usa sockets simulados e banco em memória, não inicia pareamento real.

Depois dos testes:

```powershell
git status --short
git add backend/services/whatsappService.js backend/services/whatsappAuthStore.js backend/services/whatsappDiagnostico.js backend/scripts/diagnostico-whatsapp.js frontend/marketing.js tests/whatsapp-persistencia.test.js tests/helpers/whatsappSqlite.js LEIA-ME-WhatsApp.md
git commit -m "Corrige recuperacao continua das sessoes WhatsApp"
git push origin main
```

## Configuração do Render

- Continue com o serviço pago e **uma instância da API**. Não crie um segundo worker ou outra implantação para usar o mesmo vínculo.
- Build: `npm ci --omit=dev`. Start: `npm start`. Nenhum Chrome, Puppeteer ou disco persistente é necessário para esta correção.
- **Mantenha o valor atual de `WHATSAPP_AUTH_KEY`.** Se a instalação usa `FISCAL_ENCRYPTION_KEY` como fallback, mantenha esse mesmo valor e não introduza outra chave diferente. Trocar a chave impede ler os vínculos já cifrados. Não é preciso gerar novo segredo para instalar este pacote.
- Preserve as variáveis atuais de conexão TiDB/TLS. O mesmo banco/schema deve ser usado após deploy/reinício.
- A integração anterior já inicializa `whatsappService.iniciarMonitor()` no `backend/app.js`; este pacote preserva essa chamada. A tabela nova de diagnóstico é criada automaticamente; o usuário do banco precisa permitir criar essa tabela. Não é necessário executar DROP ou limpar sessões.
- Após o deploy, recarregue Marketing com `Ctrl+F5`. Vínculo salvo e válido será restaurado pelo monitor. Se já foi apagado pela versão anterior, será necessária uma leitura de QR inicial.

## Consultar uma desconexão sem procurar nos logs

No **Shell do serviço no Render**:

```bash
node backend/scripts/diagnostico-whatsapp.js 60003
```

`60003` é a empresa encontrada no trecho de log enviado. Substitua pelo ID da empresa que está apresentando o problema. O comando lê o histórico, não abre outro socket e não solicita QR. O resultado contém horários, código do encerramento, tentativa, espera e identificação da execução. O histórico começa após instalar esta versão; não recupera eventos anteriores.

- `socket_fechado` seguido de `reconexao_agendada` e `conectado`: queda recuperada.
- `renovacao_posse_falhou`: erro de banco ou outra API assumiu a posse.
- `falha_chaves` / `credenciais_pendentes`: material de autenticação aguardando banco.
- `qr_inesperado_credenciais_preservadas`: solicitação de pareamento recebida apesar do vínculo salvo.
- `vinculo_preservado_pausado`: recusa que precisa de verificação/ação do usuário.
- `restauracao_solicitada` com outro `inicioProcesso`: restauração por uma nova execução da API.
- `desconexao_manual`: solicitação explícita de desconexão recebida no backend.

## Validação com seu celular

1. Após o deploy, confirme o status conectado. Se não houver mais sessão válida salva, conecte lendo um QR uma vez.
2. Dispare pelo PetHub uma mensagem/lembrete de teste para um número seu e confirme o recebimento no celular.
3. Feche a aba, abra Marketing novamente e envie outro teste alguns minutos depois, sem QR.
4. Confira na manhã seguinte e após 24 horas; faça outro envio. Este é o teste real de permanência que a simulação não substitui.
5. Reinicie deliberadamente o serviço uma vez no Render. Aguarde a restauração e confirme um envio sem QR, desde que o WhatsApp ainda aceite a autenticação salva.
6. Clique em Desconectar, confirme que parou, aguarde o monitor e verifique que não reconecta sozinho. Clique em Conectar e faça novo pareamento.
7. Caso haja nova interrupção prolongada, consulte o comando acima. Não use reset/desconectar antes de coletar o histórico; isso acrescenta uma desconexão manual ao diagnóstico.

## Validação executada nesta entrega

Node 24.22.1, Baileys 7.0.0-rc14, Sequelize 6, SQLite em memória. Comando:

```text
node --test tests/whatsapp.test.js tests/whatsapp-persistencia.test.js
```

27 testes aprovados, zero falhas:

- QR → leitura → 515 → novo socket → open, mesmas credenciais/chaves, sem segunda leitura;
- eventos atrasados do socket antigo ignorados; rotação de QR;
- duas abas, polling, recarga e empresas separadas;
- envio de texto, imagens, documentos e retorno de confirmação;
- fila pendente quando offline e marcação de envio somente após confirmação;
- SSE rejeita seleção de outra empresa;
- persistência cifrada e restauração após suspensão/reinício simulados;
- exclusão e atualização de chaves; logout manual e 401;
- transferência de posse entre APIs; chave criptográfica incorreta sem apagar os dados;
- socket silenciosamente fechado e abertura travada recuperados;
- desconectar durante aquisição não cria socket tardio;
- falha ao recriar socket preserva autenticação;
- estados de Marketing, aviso de ação e botão Desconectar;
- 24 horas de relógio simulado, mesmo socket e envio ao final;
- quedas 428/408/503 e um 500 isolado, recuperação e novo envio;
- QR inesperado e 403 preservam vínculo; 500 repetido pausa com aviso;
- posse expirada ainda nossa renovada; renovação sem alteração de timestamp;
- cache evita consultas repetidas; falha transacional não confirma `set`; journal recupera atualização/exclusão;
- renovação despachada fora da fila de chaves e rajada de credenciais agrupada;
- um único monitor; banco lento de uma empresa não bloqueia as outras;
- histórico persistente, retenção, isolamento e exclusão de dados sensíveis.

Verificações adicionais: sintaxe dos sete arquivos JavaScript do pacote e carregamento do módulo do serviço, sem abrir sockets. Não foi executada a API completa com o banco de produção, nem transmissão real WhatsApp, teste contínuo real de 24 horas ou concorrência real de locks no TiDB. O teste SQLite comprova o despacho independente da renovação, não o tempo de resposta do TiDB.

Referências técnicas consultadas: documentação de autenticação/armazenamento de chaves do Baileys e código de autenticação da versão instalada. https://github.com/WhiskeySockets/docs/blob/main/authentication/session-management.mdx e https://github.com/WhiskeySockets/Baileys
