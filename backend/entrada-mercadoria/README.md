Entrada de Mercadoria - Backend (Prisma + TypeScript)

Este diretório contém a implementação proposta em TypeScript usando Prisma ORM (MySQL) e Express.

IMPORTANTE: este módulo é independente e precisa ser integrado ao servidor Express principal do projeto. As instruções abaixo explicam como configurar e ligar as rotas.

Passos rápidos (desenvolvedor):

1) Instalar dependências (no workspace raiz ou neste sub-projeto):

```powershell
# na raiz do projeto (recomendado) ou dentro de backend/entrada-mercadoria
npm install @prisma/client prisma express multer xml2js pdfkit body-parser
npm install -D typescript ts-node-dev @types/express @types/multer @types/node
```

2) Gerar Prisma Client (ajuste `DATABASE_URL` env):

```powershell
# definir env: $env:DATABASE_URL = 'mysql://user:pass@localhost:3306/petshop'
npx prisma generate --schema=./backend/entrada-mercadoria/prisma/schema.prisma
npx prisma migrate dev --name init_entrada --schema=./backend/entrada-mercadoria/prisma/schema.prisma

Opcional (Windows PowerShell): execute o script automatizado criado:

```powershell
./backend/entrada-mercadoria/setup-prisma.ps1
```
```

3) Build / rodar em dev:

```powershell
# rodar via ts-node-dev (no workspace raiz)
npx ts-node-dev --respawn --transpile-only backend/entrada-mercadoria/src/server.ts
```

4) Integrar com o servidor Express existente:

- Importar o arquivo `backend/entrada-mercadoria/src/entradaRouter.ts` e usar `app.use('/api/entrada', entradaRouter)` no `backend/app.js` (ou em TypeScript: app.ts).

Observações:
- O código assume que o frontend faz upload do XML via FormData no campo `file` (POST `/api/entrada/import-xml`).
- Os endpoints usam JSON; o front chama via Axios.
- Antes de rodar, ajuste `DATABASE_URL` e execute `prisma migrate`.
