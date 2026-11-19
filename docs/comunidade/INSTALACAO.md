# Instalação e publicação

## Dependências e pré-verificação

Use Node 24 no ambiente de desenvolvimento e produção. Os testes com SQLite integrado requerem Node 22.13 ou superior.

Na raiz do seu repositório atual:

```bash
npm install
npm install sharp --save
npm ci --prefix comunidade
node backend/comunidade/preflight.js
```

Express, Sequelize, cookie-parser, multer, bcryptjs e jsonwebtoken já aparecem no package.json inspecionado. O pré-verificador aponta os que faltarem na sua versão. `sharp` deve estar em **dependencies da raiz**, pois o upload precisa dele com `npm ci --omit=dev`. Não substitua seu package.json/lock pela cópia de outra entrega; confirme os arquivos atualizados pelo npm no GitHub Desktop.

A pré-verificação é somente leitura: não acessa o banco nem imprime credenciais. Resolva qualquer arquivo/dependência ausente antes de continuar. O serviço compartilhado de mídia permanente e a migração do PetHub Cliente devem estar instalados no checkout real; esta entrega não substitui esses serviços.

## Variáveis de ambiente

Adicione às variáveis já usadas pela sua API:

| Variável | Valor/uso |
|---|---|
| `COMMUNITY_ENABLED` | `false` inicialmente; `true` para abrir a API social |
| `COMMUNITY_ORIGINS` | Origens HTTPS exatas separadas por vírgula; exemplo `https://comunidade.pethubflow.com.br` |
| `COMMUNITY_PLATFORM_ADMIN_IDS` | IDs dos administradores da **plataforma** que podem gerenciar a Comunidade, separados por vírgula |
| `COMMUNITY_COOKIE_SAMESITE` | `lax` por padrão; prefira mesma origem ou o proxy abaixo |
| `NODE_ENV` | `production` em produção para cookies Secure |
| `JWT_SECRET` | Segredo administrativo já existente; precisa estar definido, sem valor padrão |
| `JWT_CLIENTE_SECRET` | Segredo do PetHub Cliente já existente; não crie uma senha diferente para o mesmo usuário |

Mantenha as variáveis de banco/TLS e do storage R2 já usadas no ERP. Nunca coloque Access Key, Secret Access Key, token Cloudflare ou segredos JWT no frontend, no ZIP ou em variáveis `VITE_*`.

Variáveis **de build do frontend**, somente quando necessário:

| Variável | Uso |
|---|---|
| `COMMUNITY_BASE_PATH` | `/comunidade/` no Express; `/` em domínio exclusivo |
| `VITE_COMMUNITY_API_URL` | Vazio para API na mesma origem/proxy; caso contrário, URL pública da API, sem `/api` |
| `COMMUNITY_DEV_API` | Proxy do Vite local, padrão `http://127.0.0.1:3000` |

Para uso por proxy do Cloudflare Pages, existe ainda `COMMUNITY_API_ORIGIN`, configurada no ambiente das Functions, com a origem HTTPS da API atual.

## Migração e integração

Faça backup do banco e use primeiro uma cópia de homologação.

```bash
node backend/comunidade/migrate.js
node backend/comunidade/install.js
npm run build --prefix comunidade
npm start
```

A migração adiciona somente tabelas `community_*`, com registro `001`. Não altera ou apaga tabelas do ERP. É idempotente e deve rodar com apenas um processo de migração por deploy. FKs são internas ao esquema social; vínculos com registros antigos do ERP são conferidos pelo serviço.

O instalador altera uma única linha de integração no `app.js` atual e cria um backup. Se o ponto de integração esperado não existir, ele recusa a alteração. A montagem fica imediatamente após `const models = require("./models");`, antes dos middlewares globais. Isso evita que o frontend social receba scripts de cores, notificações ou autenticação do ERP.

Acesse:

- Aplicativo: `/comunidade/`
- Administração: `/comunidade/admin.html`

O acesso administrativo usa o login de administrador já existente em `/api/admin/login`. O ID também precisa estar em `COMMUNITY_PLATFORM_ADMIN_IDS`. Uma conta gestora de pet shop não ganha privilégios de plataforma.

Na administração: libere a empresa, abra “Contas de tutor” e libere a conta desejada. O tutor precisa já ter aceitado o convite e definido sua senha no PetHub Cliente. Depois ele entra na Comunidade usando o código `loja` do link do pet shop, e-mail e senha. Um link com `?loja=CODIGO` preenche esse campo automaticamente.

Para permitir criação de eventos, marque a permissão correspondente em Participantes. O acesso de todas as empresas e tutores começa fechado.

## Render

Mantenha o start atual: `npm start`. Se usar os arquivos `dist` incluídos, o build atual da API pode continuar `npm ci --omit=dev`.

Para recompilar o frontend no deploy, o build pode ser:

```bash
npm ci --omit=dev
npm ci --prefix comunidade --include=dev
npm run build --prefix comunidade
```

No pre-deploy, **preserve os comandos que você já utiliza** e acrescente a migração social depois deles. Exemplo para o comando mostrado nas entregas anteriores:

```bash
node backend/scripts/preparar-clientes-inteligencia.js && node backend/comunidade/migrate.js
```

Execute o instalador localmente e envie o `app.js` alterado ao repositório antes do deploy. Não há necessidade de rodar o instalador a cada inicialização.

Para suspender somente o recurso, defina `COMMUNITY_ENABLED=false`. Para remover a montagem, restaure o backup do app ou remova a chamada `mount`; mantenha as tabelas e os arquivos até decidir sobre retenção. O comando `node backend/comunidade/migrate.js --down-empty` só desfaz um esquema completamente vazio; recusa se houver qualquer registro social.

## Domínio exclusivo com Cloudflare Pages

É possível publicar o mesmo frontend em `comunidade.pethubflow.com.br` sem um segundo backend.

Configuração recomendada: Pages serve o frontend e encaminha somente os caminhos de API necessários para sua API existente. Isso mantém os cookies no próprio domínio da Comunidade e evita depender de cookies de terceiros em `onrender.com`.

1. Build: `npm ci --prefix comunidade && npm run build --prefix comunidade`.
2. Configure `COMMUNITY_BASE_PATH=/` no build; mantenha `VITE_COMMUNITY_API_URL` vazio.
3. Saída do build: `comunidade/dist`.
4. Copie `comunidade/deploy/cloudflare/functions` para uma pasta `functions` na raiz configurada do projeto Pages. As Functions não são copiadas para `dist`.
5. Configure `COMMUNITY_API_ORIGIN=https://SUA-API-ATUAL` no ambiente das Functions.
6. Configure na API `COMMUNITY_ORIGINS=https://comunidade.pethubflow.com.br` e `COMMUNITY_COOKIE_SAMESITE=lax`.
7. Cadastre o domínio no projeto Pages e aplique os registros DNS indicados pelo próprio painel. Os destinos DNS e IDs dependem da sua conta e não foram inventados nesta entrega.

O proxy incluso só aceita `/api/comunidade`, `/api/comunidade-admin` e `/api/admin/login`. O destino vem de uma variável da implantação, nunca de parâmetros do visitante.

Alternativa: API em `api.pethubflow.com.br` e frontend no subdomínio da Comunidade, com CORS e `credentials` configurados. Se apontar o frontend diretamente para `onrender.com`, o acesso passa a ser entre sites diferentes e pode sofrer bloqueio de cookies; prefira o proxy em vez de depender dessa combinação.

O build ajusta automaticamente `id`, `start_url` e `scope` do manifest ao caminho base. O service worker atua somente no seu escopo e não interfere no PWA do Cliente ou do Gestor. Na primeira visita sem conexão ainda não há instalação/cache; a tela offline fica disponível depois da primeira carga online e ativação do worker.

## Desenvolvimento e testes

API: mantenha `npm run dev` ou `npm start` da raiz, com o módulo montado e as variáveis locais.

Frontend:

```bash
npm run dev --prefix comunidade
```

Abra o endereço do Vite, caminho `/comunidade/`. Libere essa origem local em `COMMUNITY_ORIGINS`. Não utilize `NODE_ENV=production` para acesso local HTTP, pois o cookie Secure exige HTTPS.

Testes, com as dependências da raiz e do frontend instaladas:

```bash
npm test --prefix comunidade
```

Eles usam SQLite em memória e adaptadores de armazenamento para laboratório; não conectam ao TiDB/R2 de produção. Os testes DOM usam respostas controladas para exercitar a interface. Leia as limitações em `VALIDACAO.md`.
