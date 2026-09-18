$pidFile = Join-Path $PSScriptRoot "confluence.pid"
if (Test-Path $pidFile) {
    $targetPid = Get-Content $pidFile -Raw
    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') {
        Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
