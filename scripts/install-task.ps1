# Registra la tarea programada que arranca Confluence oculto al iniciar sesion en Windows,
# para que ya este listo antes de que OBS abra sus Custom Browser Docks.
# Correrlo de nuevo (por ejemplo tras mover la carpeta del proyecto) actualiza la tarea existente.

$ErrorActionPreference = "Stop"

$taskName = "Confluence Autostart"
$scriptDir = $PSScriptRoot
$vbsPath = Join-Path $scriptDir "start-hidden.vbs"

$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "Arranca el servidor de Confluence (oculto) al iniciar sesion, antes de que OBS abra sus Custom Browser Docks." `
    -RunLevel Limited | Out-Null

Write-Host "Tarea '$taskName' instalada. Se disparara en el proximo inicio de sesion."
