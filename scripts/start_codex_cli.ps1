$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$NodeDir = Join-Path $Root ".tools\node-v22.13.1-win-x64"
$NpmCmd = Join-Path $NodeDir "npm.cmd"
$CodexCmd = Join-Path $NodeDir "codex.cmd"

if (-not (Test-Path $NpmCmd)) {
    Write-Host "Portable Node.js was not found." -ForegroundColor Red
    Write-Host "Run Start Scientific Figure Studio.bat once first, then try again."
    exit 1
}

if (-not (Test-Path $CodexCmd)) {
    Write-Host "Installing Codex CLI into the project portable Node.js..."
    & $NpmCmd install -g "@openai/codex@0.132.0"
}

$env:Path = "$NodeDir;$env:Path"
Set-Location $Root

Write-Host "Starting Codex CLI in $Root"
Write-Host "Tip: use Ctrl+C or /quit to leave the Codex session."
Write-Host ""

& $CodexCmd -C $Root @args
exit $LASTEXITCODE
