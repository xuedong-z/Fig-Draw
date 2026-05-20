$ErrorActionPreference = "SilentlyContinue"

$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root ".run"
$PidFiles = @(
    Join-Path $RunDir "backend.pid",
    Join-Path $RunDir "frontend.pid"
)

Write-Host "Stopping Scientific Figure Studio..."

foreach ($file in $PidFiles) {
    if (Test-Path $file) {
        $pidValue = Get-Content $file | Select-Object -First 1
        if ($pidValue) {
            Stop-Process -Id ([int]$pidValue) -Force
        }
        Remove-Item $file -Force
    }
}

foreach ($port in 3000, 8000) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen
    foreach ($connection in $connections) {
        Stop-Process -Id $connection.OwningProcess -Force
    }
}

Write-Host "Stopped."
