# =================================================================
# scripts/remote.ps1 - Wrapper local para acessar a VPS
# =================================================================
# Le credenciais (host/user/senha/chave) do .env local (gitignored).
# NUNCA commita senha no repositorio.
#
# Requisitos (UM destes):
#   - plink.exe (PuTTY)  -> https://putty.org
#   - ssh.exe  (OpenSSH nativo do Windows 10/11)
#
# Uso:
#   .\scripts\remote.ps1 deploy              # roda ./scripts/deploy.sh na VPS
#   .\scripts\remote.ps1 backup              # roda ./scripts/backup.sh na VPS
#   .\scripts\remote.ps1 restore <arquivo>   # roda ./scripts/restore.sh
#   .\scripts\remote.ps1 smoke               # roda ./scripts/smoke-test.sh
#   .\scripts\remote.ps1 status              # docker compose ps
#   .\scripts\remote.ps1 logs [servico]      # tail logs (padrao: app)
#   .\scripts\remote.ps1 restart [servico]   # restart servico (padrao: app)
#   .\scripts\remote.ps1 exec "<cmd>"        # executa comando arbitrario
#   .\scripts\remote.ps1 ssh                 # abre shell interativo
#   .\scripts\remote.ps1 env                 # imprime config (sem senha)
#
# Configuracao no .env local:
#   VPS_HOST=86.48.24.70
#   VPS_USER=root
#   VPS_PORT=22                    # opcional, default 22
#   VPS_PASSWORD=...               # OU
#   VPS_KEY=C:\Users\...\id_rsa    # caminho para chave privada
#   APP_DIR=/opt/gestor-local      # opcional, default /opt/gestor-local
# =================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("deploy","backup","restore","smoke","exec","ssh","status","logs","restart","setup","env","help")]
    [string]$Command,

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$Arg
)

$ErrorActionPreference = "Stop"

# Resolve raiz do projeto (sobe um nivel a partir de scripts/)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env"

# ---- Helpers ----

function Write-Log($msg)  { Write-Host "[remote] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[remote] AVISO: $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[remote] ERRO: $msg" -ForegroundColor Red }

function Read-EnvFile {
    if (-not (Test-Path $EnvFile)) {
        Write-Err ".env nao encontrado em $EnvFile"
        Write-Err "Crie o .env ou copie de .env.example. Precisa de VPS_SERVER e VPS_USER."
        exit 1
    }

    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }

        # Suporta 'export KEY=VAL' e 'KEY=VAL'
        # Nao captura variaveis automaticas do PowerShell (Host, PID, PWD, etc)
        if ($line -match '^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
            $key = $matches[1]
            $value = $matches[2].Trim()

            # Pula vars que conflitam com builtins do PowerShell
            $reserved = @("Host","PID","PWD","HOME","PSVersionTable","PROFILE","LASTEXITCODE")
            if ($reserved -contains $key) { return }

            # Remove aspas
            if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") { $value = $matches[1] }

            # Nao sobrescreve vars ja definidas no shell
            if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($key))) {
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
}

function Show-Env {
    $fields = @("VPS_SERVER","VPS_USER","VPS_PORT","VPS_KEY","APP_DIR")
    foreach ($f in $fields) {
        $v = [Environment]::GetEnvironmentVariable($f)
        if ($v) { Write-Host "  $f = $v" }
        else    { Write-Host "  $f = (nao definido)" -ForegroundColor DarkGray }
    }
    if ([Environment]::GetEnvironmentVariable("VPS_PASSWORD")) {
        Write-Host "  VPS_PASSWORD = ********** (definida, nao exibida)" -ForegroundColor Green
    } else {
        Write-Host "  VPS_PASSWORD = (nao definida)" -ForegroundColor DarkGray
    }
}

function Get-SshClient {
    # Procura plink.exe: 1) PATH, 2) caminho padrao do PuTTY
    $plinkCmd = Get-Command plink.exe -ErrorAction SilentlyContinue
    $puttyDefault = "C:\Program Files\PuTTY\plink.exe"
    $plinkPath = $null
    if ($plinkCmd) { $plinkPath = $plinkCmd.Source }
    elseif (Test-Path $puttyDefault) {
        Write-Warn "plink.exe encontrado em $puttyDefault (nao esta no PATH) - usando este"
        $plinkPath = $puttyDefault
    }

    $sshCmd = Get-Command ssh.exe -ErrorAction SilentlyContinue

    # Se o usuario definiu senha, plink e necessario (ssh nativo nao suporta)
    $usingPassword = -not [string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable("VPS_PASSWORD"))
    $usingKey = -not [string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable("VPS_KEY"))

    # Regra de escolha:
    #   - Com senha: precisa de plink (ssh nativo nao suporta)
    #   - Com chave: ssh ou plink servem
    #   - Sem senha e sem chave: assume agente SSH (ssh)

    if ($usingPassword -and -not $plinkPath) {
        Write-Err "VPS_PASSWORD definido mas plink.exe nao encontrado."
        Write-Err "Instale PuTTY (plink.exe) para usar senha: https://putty.org"
        Write-Err "Ou troque para chave SSH (VPS_KEY)."
        exit 1
    }

    if ($plinkPath) { return @{ Name = "plink"; Path = $plinkPath } }
    if ($sshCmd)   { return @{ Name = "ssh";   Path = $sshCmd.Source } }

    Write-Err "Nenhum cliente SSH encontrado."
    Write-Err "Instale UM destes:"
    Write-Err "  - OpenSSH (nativo Win 10/11): Settings > Apps > Optional Features > OpenSSH Client"
    Write-Err "  - PuTTY: https://putty.org (use plink.exe)"
    exit 1
}

function Invoke-Remote {
    param(
        [string]$RemoteCmd,
        [switch]$Interactive
    )

    $client = Get-SshClient
    $Server = [Environment]::GetEnvironmentVariable("VPS_SERVER")
    $User   = [Environment]::GetEnvironmentVariable("VPS_USER")
    $Port   = [Environment]::GetEnvironmentVariable("VPS_PORT")
    $Pass   = [Environment]::GetEnvironmentVariable("VPS_PASSWORD")
    $Key    = [Environment]::GetEnvironmentVariable("VPS_KEY")

    if (-not $Server) { Write-Err "VPS_SERVER nao definido no .env"; exit 1 }
    if (-not $User)   { Write-Err "VPS_USER nao definido no .env"; exit 1 }
    if (-not $Port)   { $Port = "22" }

    $target = if ($Port -ne "22") { "$User@$Server -p $Port" } else { "$User@$Server" }

    if ($client.Name -eq "plink") {
        # ---- PuTTY plink ----

        if ($Interactive) {
            # Modo interativo: NAO usa -batch, deixa o usuario confirmar host key
            $plinkArgs = @("-ssh", "-P", $Port)
            if ($Pass) { $plinkArgs += @("-pw", $Pass) }
            elseif ($Key) { $plinkArgs += @("-i", $Key) }
            $plinkArgs += @($target)
            $mode = "interactive"
        } else {
            # Modo batch: precisa do host key ja cacheado.
            # Para cachear a chave, o usuario roda UMA VEZ: remote.ps1 ssh
            $plinkArgs = @("-ssh", "-batch", "-P", $Port)
            if ($Pass) { $plinkArgs += @("-pw", $Pass) }
            elseif ($Key) { $plinkArgs += @("-i", $Key) }
            $plinkArgs += @($target, $RemoteCmd)
            $mode = "batch"
        }

        Write-Log "plink $target ($mode)"
        & $client.Path @plinkArgs
    }
    else {
        # ---- OpenSSH nativo (ssh.exe) ----
        $sshArgs = @("-p", $Port, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new")

        if ($Key) {
            $sshArgs += @("-i", $Key)
        } elseif ($Pass) {
            Write-Err "ssh.exe (OpenSSH) NAO suporta senha em batch mode no Windows."
            Write-Err "Opcoes:"
            Write-Err "  1) Use plink.exe (PuTTY) - suporta -pw"
            Write-Err "  2) Configure chave SSH: ssh-keygen + copie para VPS"
            Write-Err "  3) Use agente SSH (ssh-agent + ssh-add)"
            exit 1
        }

        if ($Interactive) {
            $sshArgs += @($target)
        } else {
            $sshArgs += @($target, $RemoteCmd)
        }

        Write-Log "ssh $target"
        & $client.Path @sshArgs
    }
}

# ---- Main ----

Read-EnvFile

$AppDir = [Environment]::GetEnvironmentVariable("APP_DIR")
if (-not $AppDir) { $AppDir = "/opt/gestor-local" }

switch ($Command) {
    "env" {
        Write-Log "Configuracao carregada de $EnvFile"
        Show-Env
    }

    "help" {
        Get-Help $PSCommandPath -Detailed | Out-String | Write-Host
    }

    "deploy" {
        Write-Log "Iniciando deploy remoto em $AppDir..."
        $RemoteCmd = "cd $AppDir && ./scripts/deploy.sh"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }

    "backup" {
        Write-Log "Iniciando backup remoto..."
        $RemoteCmd = "cd $AppDir && ./scripts/backup.sh"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }

    "restore" {
        if (-not $Arg) {
            Write-Err "Uso: .\remote.ps1 restore <arquivo-backup>"
            Write-Err "Exemplo: .\remote.ps1 restore backups/gestor_2026-06-19_0300.sql.gz"
            exit 1
        }
        Write-Warn "ATENCAO: restore VAI SOBRESCREVER o banco remoto."
        Write-Warn "O script remoto pede confirmacao digitando RESTORE."
        $RemoteCmd = "cd $AppDir && ./scripts/restore.sh $Arg"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }

    "smoke" {
        Write-Log "Rodando smoke test remoto..."
        $ServerName = [Environment]::GetEnvironmentVariable("VPS_SERVER")
        $RemoteCmd = "cd $AppDir && BASE_URL=https://$ServerName ./scripts/smoke-test.sh"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }

    "status" {
        $RemoteCmd = "cd $AppDir && docker compose -f docker-compose.prod.yml ps"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }

    "logs" {
        $service = if ($Arg) { $Arg } else { "app" }
        $RemoteCmd = "cd $AppDir && docker compose -f docker-compose.prod.yml logs -f --tail=100 $service"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }

    "restart" {
        $service = if ($Arg) { $Arg } else { "app" }
        $RemoteCmd = "cd $AppDir && docker compose -f docker-compose.prod.yml restart $service"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }

    "exec" {
        if (-not $Arg) {
            Write-Err "Uso: .\remote.ps1 exec <comando-remoto>"
            Write-Err "Exemplo: .\remote.ps1 exec 'docker ps -a'"
            exit 1
        }
        Write-Log "Executando comando arbitrario: $Arg"
        Invoke-Remote -RemoteCmd $Arg
    }

    "ssh" {
        Write-Log "Abrindo shell interativo (Ctrl+D ou 'exit' para sair)..."
        Invoke-Remote -Interactive
    }

    "setup" {
        Write-Log "Instalando automacoes na VPS (setup inicial)..."
        Write-Warn "Este comando roda scripts/vps-setup.sh na VPS."
        Write-Warn "Instala: Watchtower, cron de backup/heal/manutencao, logrotate, unattended-upgrades."
        $RemoteCmd = "cd $AppDir && bash scripts/vps-setup.sh"
        Invoke-Remote -RemoteCmd $RemoteCmd
    }
}
