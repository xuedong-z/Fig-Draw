$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$ToolsDir = Join-Path $Root ".tools"
$RunDir = Join-Path $Root ".run"
$LogDir = Join-Path $Root "logs"
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$VenvDir = Join-Path $Root ".venv"

$NodeVersion = "22.13.1"
$NodeName = "node-v$NodeVersion-win-x64"
$NodeDir = Join-Path $ToolsDir $NodeName
$NodeZip = Join-Path $ToolsDir "$NodeName.zip"
$NodeUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeName.zip"
$NodeExe = Join-Path $NodeDir "node.exe"
$NpmCmd = Join-Path $NodeDir "npm.cmd"

$UvDir = Join-Path $ToolsDir "uv"
$UvZip = Join-Path $ToolsDir "uv.zip"
$UvExe = Join-Path $UvDir "uv.exe"
$UvUrl = "https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip"

$BackendPidFile = Join-Path $RunDir "backend.pid"
$FrontendPidFile = Join-Path $RunDir "frontend.pid"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-Directory($Path) {
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Test-Port($Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Url($Url, $TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

Ensure-Directory $ToolsDir
Ensure-Directory $RunDir
Ensure-Directory $LogDir

Write-Host "Scientific Figure Studio launcher"
Write-Host "First launch may take several minutes because dependencies are prepared automatically."

if ((Test-Port 8000) -and (Test-Port 3000)) {
    Write-Step "App already appears to be running"
    Start-Process "http://127.0.0.1:3000"
    exit 0
}

Write-Step "Preparing portable Node.js"
if (-not (Test-Path $NodeExe)) {
    Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip
    Expand-Archive -Path $NodeZip -DestinationPath $ToolsDir -Force
}
$env:Path = "$NodeDir;$env:Path"
& $NodeExe --version | Out-Host

Write-Step "Preparing portable Python environment"
if (-not (Test-Path $UvExe)) {
    Ensure-Directory $UvDir
    Invoke-WebRequest -Uri $UvUrl -OutFile $UvZip
    Expand-Archive -Path $UvZip -DestinationPath $UvDir -Force
}
if (-not (Test-Path (Join-Path $VenvDir "Scripts\python.exe"))) {
    & $UvExe python install 3.12
    & $UvExe venv $VenvDir --python 3.12
}
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

Write-Step "Installing backend dependencies"
& $UvExe pip install --python $PythonExe -r (Join-Path $BackendDir "requirements.txt")

Write-Step "Installing frontend dependencies"
Push-Location $FrontendDir
try {
    & $NpmCmd install
}
finally {
    Pop-Location
}

Write-Step "Starting backend API on http://127.0.0.1:8000"
if (-not (Test-Port 8000)) {
    $backendOut = Join-Path $LogDir "backend.out.log"
    $backendErr = Join-Path $LogDir "backend.err.log"
    $backend = Start-Process -FilePath $PythonExe `
        -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput $backendOut `
        -RedirectStandardError $backendErr `
        -WindowStyle Hidden `
        -PassThru
    Set-Content -Path $BackendPidFile -Value $backend.Id
}

if (-not (Wait-Url "http://127.0.0.1:8000/api/health" 60)) {
    Write-Host "Backend did not start. See logs\backend.err.log" -ForegroundColor Red
    exit 1
}

Write-Step "Starting web app on http://127.0.0.1:3000"
if (-not (Test-Port 3000)) {
    $frontendOut = Join-Path $LogDir "frontend.out.log"
    $frontendErr = Join-Path $LogDir "frontend.err.log"
    $command = "`"$NpmCmd`" run dev -- --hostname 127.0.0.1 --port 3000"
    $frontend = Start-Process -FilePath "cmd.exe" `
        -ArgumentList @("/c", $command) `
        -WorkingDirectory $FrontendDir `
        -RedirectStandardOutput $frontendOut `
        -RedirectStandardError $frontendErr `
        -WindowStyle Hidden `
        -PassThru
    Set-Content -Path $FrontendPidFile -Value $frontend.Id
}

if (-not (Wait-Url "http://127.0.0.1:3000" 90)) {
    Write-Host "Frontend did not start. See logs\frontend.err.log" -ForegroundColor Red
    exit 1
}

Write-Step "Opening Scientific Figure Studio"
Start-Process "http://127.0.0.1:3000"

Write-Host ""
Write-Host "Ready."
Write-Host "Use sample data from backend\sample_data to test the full workflow."
Write-Host "Double-click Stop Scientific Figure Studio.bat when finished."
