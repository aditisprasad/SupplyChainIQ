Write-Host "Starting SupplyChainIQ dev server on port 8080..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Launching Vite..." -ForegroundColor Yellow
    $proc = Start-Process -FilePath "node" -ArgumentList "node_modules/vite/bin/vite.js", "dev", "--port", "8080" -NoNewWindow -PassThru
    $proc.WaitForExit()
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Vite exited (code $($proc.ExitCode)), restarting in 2s..." -ForegroundColor Red
    Start-Sleep -Seconds 2
}
