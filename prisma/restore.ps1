# Restore do banco de dados a partir do dump SQL
# Uso: .\prisma\restore.ps1 [arquivo.sql]
#
# Se nao especificar arquivo, usa o backup mais recente em prisma/backups/

param (
    [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"

# Descobrir arquivo de backup
if (-not $BackupFile) {
    $backups = Get-ChildItem -Path "prisma/backups" -Filter "*.sql" | Sort-Object LastWriteTime -Descending
    if (-not $backups) {
        Write-Error "Nenhum backup encontrado em prisma/backups/"
        exit 1
    }
    $BackupFile = $backups[0].FullName
}

Write-Host "=== Restore do Banco ===" -ForegroundColor Cyan
Write-Host "Arquivo: $BackupFile" -ForegroundColor Yellow

# Verificar se o container do PostgreSQL está rodando
$containerRunning = docker ps --filter "name=gestor_postgres" --format "{{.Names}}" 2>$null
if (-not $containerRunning) {
    Write-Error "Container gestor_postgres nao esta rodando. Execute 'docker compose up -d' primeiro."
    exit 1
}

Write-Host "Copiando backup para o container..." -ForegroundColor Yellow
docker cp "$BackupFile" gestor_postgres:/tmp/restore.sql 2>$null

Write-Host "Limpando banco atual..." -ForegroundColor Yellow
docker exec gestor_postgres psql -U gestor -d gestor_local -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>$null

Write-Host "Aplicando migrations (estrutura das tabelas)..." -ForegroundColor Yellow
npx prisma migrate deploy

Write-Host "Restaurando dados..." -ForegroundColor Yellow
docker exec gestor_postgres psql -U gestor -d gestor_local -f /tmp/restore.sql 2>$null

Write-Host ""
Write-Host "=== Restore concluido! ===" -ForegroundColor Green
