<#
Script PowerShell para gerar Prisma Client e rodar migrations para o módulo Entrada de Mercadoria.
Uso: execute na raiz do projeto (PowerShell)
#>

if (-not (Test-Path -Path ./backend/entrada-mercadoria/prisma/schema.prisma)) {
    Write-Error "schema.prisma não encontrado em backend/entrada-mercadoria/prisma"
    exit 1
}

if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL não definido. Defina antes, ex:" -ForegroundColor Yellow
    Write-Host "    $env:DATABASE_URL = 'mysql://user:pass@localhost:3306/petshop'" -ForegroundColor Cyan
    exit 1
}

Write-Host "Gerando Prisma Client..." -ForegroundColor Green
npx prisma generate --schema=./backend/entrada-mercadoria/prisma/schema.prisma

Write-Host "Executando migrate (cria/atualiza tabelas)..." -ForegroundColor Green
npx prisma migrate dev --name init_entrada --schema=./backend/entrada-mercadoria/prisma/schema.prisma

Write-Host "Prisma generate/migrate finalizados." -ForegroundColor Green
