# =================================================================
# Aliases AVGESTAO para PowerShell
# =================================================================
# Cole este conteudo no seu $PROFILE (PowerShell profile)
#
# Para abrir:
#   notepad $PROFILE
#
# Se nao existir, crie:
#   New-Item -ItemType File -Path $PROFILE -Force
#
# Depois reinicie o PowerShell ou rode: . $PROFILE
# =================================================================

$AvgestaoRemote = "C:\projetos\saas-gestão\scripts\remote.ps1"

# Status
function gs  { & $AvgestaoRemote status }
Set-Alias -Name status -Value gs -Scope Global -Force

# Deploy (CI/CD push ou remoto)
function gd  { & $AvgestaoRemote deploy }
Set-Alias -Name deploy -Value gd -Scope Global -Force

# Backup / Restore
function gb  { & $AvgestaoRemote backup }
function gbr { param($f) & $AvgestaoRemote restore $f }
Set-Alias -Name backup  -Value gb  -Scope Global -Force
Set-Alias -Name restore -Value gbr -Scope Global -Force

# Logs (com argumento opcional: app, postgres, caddy)
function gl  { & $AvgestaoRemote logs @args }
Set-Alias -Name logs -Value gl -Scope Global -Force

# Restart
function gr  { & $AvgestaoRemote restart @args }
Set-Alias -Name restart -Value gr -Scope Global -Force

# Smoke test
function gsm { & $AvgestaoRemote smoke }
Set-Alias -Name smoke -Value gsm -Scope Global -Force

# Shell interativo
function gsh { & $AvgestaoRemote ssh }
Set-Alias -Name shell -Value gsh -Scope Global -Force

# Exec
function gex { & $AvgestaoRemote exec @args }
Set-Alias -Name rexec -Value gex -Scope Global -Force

# Setup inicial
function gsetup { & $AvgestaoRemote setup }
Set-Alias -Name vps-setup -Value gsetup -Scope Global -Force

# Mostrar ajuda
function ghelp {
    Write-Host ""
    Write-Host "  Aliases AVGESTAO:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    gs / status       " -NoNewline; Write-Host "-> ver status dos containers"
    Write-Host "    gd / deploy       " -NoNewline; Write-Host "-> fazer deploy"
    Write-Host "    gb / backup       " -NoNewline; Write-Host "-> backup do banco"
    Write-Host "    gbr <arq>         " -NoNewline; Write-Host "-> restore de backup"
    Write-Host "    gl <svc>          " -NoNewline; Write-Host "-> tail logs (padrao: app)"
    Write-Host "    gr <svc>          " -NoNewline; Write-Host "-> restart servico (padrao: app)"
    Write-Host "    gsm / smoke       " -NoNewline; Write-Host "-> smoke test"
    Write-Host "    gsh / shell       " -NoNewline; Write-Host "-> shell interativo na VPS"
    Write-Host "    gex <cmd>         " -NoNewline; Write-Host "-> executar comando na VPS"
    Write-Host "    gsetup / vps-setup" -NoNewline; Write-Host "-> setup inicial das automacoes"
    Write-Host ""
    Write-Host "  Workflow do dia-a-dia:" -ForegroundColor Green
    Write-Host "    1. Edite codigo" -ForegroundColor Gray
    Write-Host "    2. git push" -ForegroundColor Gray
    Write-Host "    3. (CI/CD faz tudo, Watchtower atualiza)" -ForegroundColor Gray
    Write-Host "    4. gsm (smoke test opcional)" -ForegroundColor Gray
    Write-Host ""
}
Set-Alias -Name avgestao -Value ghelp -Scope Global -Force

Write-Host "AVGESTAO aliases carregados. Digite 'avgestao' para ajuda." -ForegroundColor Green
