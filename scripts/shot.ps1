# Dev helper: full-resolution screenshot of the local app with headless Edge.
# Usage: powershell -File scripts/shot.ps1 "?s=intake&overlay=01" out.png [light|dark] [1536,1024]
param([string]$Query = '', [string]$Out = 'shot.png', [string]$Theme = 'light', [string]$Size = '1536,1024')
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$profile = Join-Path $env:TEMP "edge-shot-profile"
$scheme = if ($Theme -eq 'dark') { '--force-dark-mode' } else { '' }
& $edge --headless=new --disable-gpu --hide-scrollbars $scheme --user-data-dir="$profile" --window-size=$Size --virtual-time-budget=9000 --screenshot="$Out" "http://localhost:3000/$Query" 2>$null | Out-Null
Get-Item $Out | Select-Object Name, Length
