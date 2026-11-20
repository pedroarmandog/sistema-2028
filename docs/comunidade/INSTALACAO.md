# Instalação — versão pública 0.2

## Aplicar o pacote

1. Extraia as pastas na raiz do seu `sistema-2028`, substituindo o módulo e o frontend anteriores. O pacote não contém um `backend/app.js` antigo nem substitui os serviços do ERP.
2. As dependências da API continuam Express, Sequelize, cookie-parser, multer, bcryptjs e sharp. Se sharp ainda não estiver em dependencies da raiz, execute `npm install sharp --save` e envie package.json/lock atualizados.
3. Para instalar o frontend, execute `npm ci --prefix comunidade`.
4. Rode `node backend/comunidade/preflight.js`. Confira as dependências no checkout completo.
5. Se a Comunidade ainda não estiver montada, execute `node backend/comunidade/install.js` e envie o app.js alterado. Quem já tem `/comunidade/` funcionando não precisa montar outra rota.

As fotos novas usam o adaptador técnico existente `backend/services/midias/armazenamento.js`, com chaves `community/users/UUID/...`. Não exigem empresa. Fotos antigas continuam com referência preservada e leitura compatível pelo serviço de mídia anterior. O marcador interno `empresa_id=0` nas novas referências serve apenas para compatibilidade com a coluna antiga NOT NULL; não representa, consulta ou cria uma empresa.

## Render: build, start e migração

Build Command:

```bash
npm ci --omit=dev && npm ci --prefix comunidade --include=dev && npm run build --prefix comunidade
```

Start Command: `npm start`.

Pre-Deploy Command: preserve seus preparadores atuais e execute `node backend/comunidade/migrate.js` ao final. Para a configuração anterior deste projeto:

```bash
node backend/scripts/preparar-clientes-inteligencia.js && node backend/comunidade/migrate.js
```

A migração adiciona colunas opcionais/defaults, tabelas de autenticação, atividade, grupos, sanções e administração. Registra `001` e `002`. Não apaga contas, perfis ou posts anteriores e não altera tabelas operacionais. Faça primeiro em homologação e com backup. Apenas um processo deve executar migrações por deploy.

Log esperado:

```text
Migrações da Comunidade concluídas (001/002, cadastro público).
```

`--down-empty` existe apenas para um laboratório completamente vazio; recusa qualquer dado social. Não é procedimento de rollback de produção. Para pausar o aplicativo, use a flag; preserve o esquema atualizado.

## Variáveis de ambiente da API

| Nome | Configuração |
|---|---|
| `NODE_ENV` | `production` |
| `COMMUNITY_ENABLED` | `true` para o aplicativo público; `false` pausa o público, preservando administração |
| `COMMUNITY_ORIGINS` | `https://pethub-api-wdna.onrender.com,https://comunidade.pethubflow.com.br`, sem barras finais; acrescente outras origens reais se necessário |
| `COMMUNITY_PUBLIC_URL` | URL pública do app, com caminho correto: inicialmente `https://pethub-api-wdna.onrender.com/comunidade/` |
| `COMMUNITY_RESEND_API_KEY` | Chave privada de envio do Resend; somente no backend |
| `COMMUNITY_MAIL_FROM` | Remetente de domínio verificado no Resend, por exemplo `PetHub Comunidade <contato@SEU-DOMINIO>` |
| `COMMUNITY_PLATFORM_ADMIN_IDS` | IDs das contas administrativas da plataforma autorizadas como administradores gerais |
| `COMMUNITY_PLATFORM_MODERATOR_IDS` | Opcional: IDs autorizados como moderadores; permissões reduzidas |
| `COMMUNITY_COOKIE_SAMESITE` | `lax` por padrão, recomendado com mesma origem/proxy |
| `COMMUNITY_PROXY_HOPS` | `1` somente quando o app está atrás de um gateway confiável que acrescenta o IP real ao final de X-Forwarded-For, como na implantação esperada no Render; sem essa configuração utiliza o endereço do socket |

Mantenha as variáveis existentes de banco/TLS e armazenamento permanente. E-mail e senha pública são próprios: a Comunidade não precisa de `JWT_CLIENTE_SECRET` ou de uma conta no PetHub Cliente. Não altere/remova os segredos que os outros apps ainda usam.

A autenticação administrativa reaproveita a verificação de senha do cadastro administrativo existente (`Admin`), porém somente os IDs explicitamente autorizados nas variáveis acima podem obter a sessão da Comunidade. Nenhuma conta de empresa ou conta pública vira administradora automaticamente. Não há senha padrão.

## Configurar e-mail real

A integração incluída usa a API HTTP do Resend, sem acrescentar biblioteca SMTP. No provedor, verifique seu domínio de envio e use um remetente permitido. Configure a chave e o remetente no Render. Configure `COMMUNITY_PUBLIC_URL` com o endereço que o usuário realmente abrirá.

A API envia links por fragmento:

- `#/confirmar?token=...`: confirmação, validade de 24 horas.
- `#/redefinir?token=...`: recuperação, validade de uma hora.

O frontend retira o token da URL após lê-lo e só o envia por POST quando a pessoa confirma. Tokens são aleatórios, armazenados em hash e usados uma vez. Cada mensagem recebe chave de idempotência; o banco registra envio aceito/falha. Aceitação pelo provedor não é garantia de entrega na caixa de entrada, e não existe webhook de entrega nesta versão.

Se o envio não estiver configurado ou falhar, o cadastro continua pendente. Depois de corrigir a configuração, use “Reenviar confirmação”. Não existe link secreto de debug nem retorno do token no JSON público ou no Console.

Fonte técnica utilizada para o contrato do adaptador: https://resend.com/docs/api-reference/emails/send-email e repositório oficial https://github.com/resend/resend-openapi .

## Entrar no novo fluxo

Aplicativo público:

https://pethub-api-wdna.onrender.com/comunidade/

Escolha Criar conta, preencha os dados, confirme o e-mail recebido e entre com e-mail/senha. Não informe código da loja. Não é necessário abrir o painel para liberar ninguém.

Administração:

https://pethub-api-wdna.onrender.com/comunidade/admin.html

Use sua conta administrativa autorizada. O cookie administrativo é independente do login público; fechar/reabrir a página mantém a sessão até expirar, e “Sair” a revoga no servidor.

## Contas sociais da versão anterior

Usuários/perfis/posts antigos não são apagados e não são vinculados automaticamente a e-mails do ERP. Isso evitaria associar dados de pessoas por coincidência de nomes ou e-mails.

Quem ainda tem uma sessão social anterior válida é direcionado para `#/atualizar-conta`: define e-mail/senha independentes, aceita os termos e confirma o e-mail. O ID social e os posts são preservados; as sessões antigas são encerradas.

Se essa sessão já expirou, não há recuperação automática por credencial do ERP. É necessário um processo de suporte de comprovação de titularidade antes de qualquer associação. Este pacote não inclui um comando que tome posse de perfis antigos por e-mail, nem apaga as contas para contornar a situação.

## Domínio próprio e PWA

O domínio pretendido continua sendo `comunidade.pethubflow.com.br`. O deploy padrão incluído funciona em `/comunidade/` na API existente.

Para Cloudflare Pages em domínio exclusivo:

1. Build do frontend com `COMMUNITY_BASE_PATH=/` e `VITE_COMMUNITY_API_URL` vazio.
2. Publique a saída `comunidade/dist`.
3. Copie `comunidade/deploy/cloudflare/functions` para a pasta Functions na raiz configurada do projeto Pages.
4. Configure nas Functions `COMMUNITY_API_ORIGIN` com a origem HTTPS da API existente.
5. Configure a origem pública em `COMMUNITY_ORIGINS` na API e atualize `COMMUNITY_PUBLIC_URL` para o domínio definitivo.

O proxy mantém cookies/API na mesma origem. Os caminhos de Comunidade pública e administrativa são aceitos; as APIs gerais do ERP não são encaminhadas por esse proxy. O manifest acompanha o caminho base e o worker não intercepta APIs, escritas ou fotos autenticadas. Não cacheia o feed.

DNS, certificado, cookies no domínio real e instalação Android/iOS precisam ser conferidos após publicar; não foram alterados na sua conta por esta entrega.

## Desenvolvimento e testes

API: use os comandos existentes da raiz. Frontend: `npm run dev --prefix comunidade`; o proxy local aponta a `http://127.0.0.1:3000`, alterável por `COMMUNITY_DEV_API`. Libere a origem de desenvolvimento em CORS e use ambiente não production para HTTP local.

Testes: `npm test --prefix comunidade`. Eles usam banco e adaptadores de laboratório, sem enviar e-mails reais nem acessar TiDB/R2 de produção.
