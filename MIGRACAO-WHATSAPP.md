# WhatsApp do PetHub no Render

Versão baseada em `sistema-2028(3).zip`. O ERP continua em CommonJS. A primeira conexão carrega por importação dinâmica o pacote ESM `@whiskeysockets/baileys@7.0.0-rc14`, fixado no lockfile. Use Node 24 (testado com 24.22.1).

## Atualizar o repositório que já está conectado ao Render

Extraia o ZIP em uma pasta separada. Faça um commit das suas alterações locais atuais antes de substituir os arquivos. Copie para o repositório os arquivos alterados ou adicionados listados abaixo, mantendo os mesmos caminhos. Remova os quatro arquivos obsoletos indicados. Preserve o seu `.env`, `uploads`, backups e a pasta `.git`. O ZIP contém o código do ERP, inclusive o módulo já compilado de entrada de mercadoria e os uploads do projeto enviado. Ficam fora as dependências instaláveis, credenciais de ambiente, configuração local privada, backups, sessões e caches antigos.

### Arquivos alterados ou adicionados

| Caminhos | Mudança |
|---|---|
| `package.json`, `package-lock.json`, `.env.example` | Dependências, teste, ambiente e build sem navegador |
| `backend/services/whatsappService.js` | Socket, autenticação e chaves em memória, estado, SSE e envio |
| `backend/services/whatsappQueue.js` | Reserva condicional por empresa, consumo da fila apenas quando conectado |
| `backend/controllers/marketingController.js`, `backend/routes/marketingRoutes.js` | Estado, SSE autenticado, envio manual, operações da fila |
| `backend/controllers/instanciaController.js`, `backend/controllers/disparadorController.js` | Compatibilidade dos cadastros de instância com uma sessão por empresa |
| `backend/controllers/produtoLembreteController.js` | Isolamento da empresa nas ações manuais e nos lembretes |
| `backend/middleware/authUser.js`, `backend/controllers/usuarioController.js`, `frontend/login/login.js` | JWT nas rotas de WhatsApp, cookie do ERP no host Render e remoção de logs sensíveis |
| `backend/app.js` | Retirada do startup de Chrome, restauração antiga e bypass de autenticação do SSE |
| `frontend/marketing.html`, `frontend/marketing.js`, `frontend/marketing-disparador.js` | QR atual, estado intermediário, envio de mensagem e restauração visual por SSE/polling |
| `backend/patches/libsignal+6.0.0.patch` | Remove da dependência transitiva as impressões de objetos contendo chaves de sessão. Aplicado pelo postinstall |
| `tests/whatsapp.test.js` | Regressões de sessão, envio, fila e isolamento |
| `frontend/base-conhecimento/artigos/marketing/conectar-whatsapp.md`, `MIGRACAO-WHATSAPP.md` | Instruções de uso e publicação |

Arquivos antigos removidos da integração:

- `backend/services/puppeteerLauncher.js`
- `backend/scripts/install_chrome_ubuntu.sh`
- `backend/scripts/test_qr.js`
- `patches/whatsapp-web.js+1.34.7.patch`

O patch anterior de diagnóstico `pethub-whatsapp.patch` também foi omitido da distribuição. O novo postinstall usa somente `backend/patches`.

## Testar no PowerShell

Na pasta do repositório atualizado, com o seu .env habitual:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --version
npm ci
npm test
npm start
```

O ERP serve HTML/JS diretamente. Não existe um script separado de build do frontend. No teste local, entre no site servido pela API da mesma origem, com um usuário da empresa. Se sua página de login usa `frontend/api-config.js` fixado no Render, use o domínio publicado para o teste completo ou configure a URL local no seu ambiente de desenvolvimento. Não é necessário recriar o banco.

## Publicar

1. Faça commit e push do código atualizado na branch usada pelo serviço `pethub-api`.
2. No Render, em Settings, troque o **Build Command** antigo inteiro por `npm ci --omit=dev`. Use **Start Command** `npm start`. Deixe scripts npm habilitados para aplicar a correção de logs do libsignal.
3. Em Environment, preserve as variáveis de banco, TLS e JWT do PetHub. Remova as opções antigas exclusivas do navegador, caso existam: `CHROME_PATH`, `PUPPETEER_EXECUTABLE_PATH`, `PUPPETEER_CACHE_DIR`, `PUPPETEER_HEADLESS`, `PUPPETEER_SKIP_DOWNLOAD`, `ALLOW_PUPPETEER_CACHE`, `AUTO_INSTALL_CHROME` e `AUTO_INSTALL_CHROME_ON_FAILURE`. Não é necessário criar variável para o Baileys nem anexar disco. Se usa exclusivamente o domínio onrender.com, deixe `COOKIE_DOMAIN` sem configurar e faça login novamente para receber o JWT.
4. Faça um deploy com o novo comando e confira o commit publicado. Para testar, rode só uma instância da API responsável pelo número. A sessão pertence ao processo e não é replicada entre servidores.

## Validar com dois celulares ou dois números

1. Entre no ERP como usuário de uma empresa. Abra Marketing → WhatsApp → Iniciar Conexão. Escaneie uma vez com o telefone da empresa.
2. Depois da leitura, aguarde **Conectado**. O código 515 (restartRequired) reabre o socket com as chaves da mesma sessão. O log esperado termina com “conexão aberta para envio”.
3. No modal, preencha **Telefone com DDD** com outro número seu ou de alguém que aceitou o teste. Envie “Teste PetHub 1” e confirme no aparelho destinatário. A indicação “Mensagem enviada” confirma a operação no conector. Entrega e leitura são verificadas no destinatário.
4. Atualize a página, reabra o modal, aguarde alguns minutos com a API ativa e envie “Teste PetHub 2”. A conexão deve continuar aberta e o destinatário deve receber a segunda mensagem sem novo QR.
5. Reinicie a API no Render e atualize a página. O esperado é **Desconectado**. Clique para conectar, escaneie o novo QR e confira novamente o envio. Se o celular atingiu o limite de aparelhos vinculados, remova o vínculo antigo no próprio telefone.
6. Para testar agendamentos, gere um lembrete com o conector desconectado. Ele permanece pendente. Conecte e aguarde o ciclo da fila (a cada 5 minutos) ou use a ação de processar pendentes. Os registros antigos do disparador são compatíveis com a mesma sessão da empresa.

## Limites e validação realizada

A conexão e as chaves ficam somente na RAM. Quedas transitórias do socket são tratadas com espera progressiva e até cinco tentativas. Logout ou sessão inválida descartam as chaves. Reinício, deploy ou suspensão do processo exigem novo QR.

Instalação normal e de produção, importação da biblioteca real e sete testes automatizados executados com Node 24 em Linux. O teste do ciclo de conexão usa eventos simulados e as estruturas de autenticação reais do pacote. O QR dos testes é uma imagem PNG gerada a partir de uma sequência de teste. A UI também foi exercitada em DOM com respostas simuladas para QR, conclusão do vínculo, envio e recarga.

A API iniciou e serviu Marketing por HTTP. Rotas protegidas rejeitaram acesso anônimo e cookie legado sem JWT. O smoke test não usou credenciais do TiDB. A tentativa de abrir o WebSocket real neste ambiente falhou na resolução de web.whatsapp.com (EAI_AGAIN). Pareamento, recebimento no telefone e funcionamento após reiniciar o Render devem ser confirmados pelo roteiro acima.
