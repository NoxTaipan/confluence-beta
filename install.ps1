# Confluence Suite - instalador unificado / unified installer
# Ver INSTALL.md (ES) / INSTALL.en.md (EN) para la guia completa.
# Uso: doble clic en install.bat, o: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = 'Stop'

$RepoRoot  = $PSScriptRoot
$SuiteRoot = Split-Path $RepoRoot -Parent
$GitHubOrg = 'NoxTaipan'

$StreamDeckRepo   = 'confluence-streamdeck-beta'
$StreamDeckBranch = 'master'
$MultistreamRepo   = 'confluence-multistream'
$MultistreamBranch = 'obs-websocket-support'

$TwitchAppUrl  = 'https://dev.twitch.tv/console/apps/create'
$GoogleCloudUrl = 'https://console.cloud.google.com/'
$KickDevUrl    = 'https://kick.com/settings/developer'

$Script:Lang = 'es'

function Pause-Exit {
    Read-Host "`nPresiona Enter para salir / Press Enter to exit"
    exit
}

function Pick-Language {
    Write-Host ''
    Write-Host '=== Confluence Suite - Instalador / Installer ===' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  [1] Espanol'
    Write-Host '  [2] English'
    $choice = Read-Host "`nElegi idioma / Choose language"
    if ($choice -eq '2') { $Script:Lang = 'en' } else { $Script:Lang = 'es' }
}

function Es { return $Script:Lang -eq 'es' }

function Ask-YesNo($esPrompt, $enPrompt) {
    $prompt = if (Es) { "$esPrompt [S/N]" } else { "$enPrompt [Y/N]" }
    $answer = Read-Host $prompt
    if (Es) { return $answer -match '^[sS]' }
    else    { return $answer -match '^[yY]' }
}

function Test-NodeJs {
    $node = Get-Command node -ErrorAction SilentlyContinue
    return [bool]$node
}

function Ensure-NodeJs {
    if (Test-NodeJs) { return $true }
    if (Es) {
        Write-Host "No se encontro Node.js instalado." -ForegroundColor Red
        Write-Host "Se necesita la version LTS. Abriendo la pagina de descarga..." -ForegroundColor Yellow
    } else {
        Write-Host "Node.js was not found on this machine." -ForegroundColor Red
        Write-Host "You need the LTS version. Opening the download page..." -ForegroundColor Yellow
    }
    Start-Process 'https://nodejs.org'
    if (Es) { Write-Host "Instala Node.js y volve a correr este instalador." -ForegroundColor Yellow }
    else    { Write-Host "Install Node.js and run this installer again." -ForegroundColor Yellow }
    return $false
}

function Test-GitCli {
    return [bool](Get-Command git -ErrorAction SilentlyContinue)
}

# Descarga un repo publico de GitHub a $destPath, con git si esta disponible, o como ZIP si no.
# Downloads a public GitHub repo into $destPath, using git if available, or as a ZIP if not.
function Download-Repo($repoName, $branch, $destPath) {
    if (Test-Path $destPath) {
        if (Es) { Write-Host "Ya existe '$destPath', se usa tal cual (no se vuelve a descargar)." -ForegroundColor Yellow }
        else    { Write-Host "'$destPath' already exists, using it as-is (not re-downloading)." -ForegroundColor Yellow }
        return $true
    }
    $url = "https://github.com/$GitHubOrg/$repoName"
    if (Test-GitCli) {
        if (Es) { Write-Host "Clonando $url ..." } else { Write-Host "Cloning $url ..." }
        git clone --branch $branch --single-branch "$url.git" $destPath
        return $true
    }
    if (Es) { Write-Host "git no esta instalado, descargando el ZIP de $url ..." }
    else    { Write-Host "git is not installed, downloading the ZIP from $url ..." }
    $tmpZip = Join-Path $env:TEMP "$repoName-$branch.zip"
    Invoke-WebRequest -Uri "$url/archive/refs/heads/$branch.zip" -OutFile $tmpZip
    $extractDir = Join-Path $env:TEMP "confluence-extract-$repoName"
    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
    Expand-Archive -Path $tmpZip -DestinationPath $extractDir -Force
    $inner = Join-Path $extractDir "$repoName-$branch"
    Move-Item $inner $destPath
    Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
    return $true
}

function Open-OAuthLinks {
    if (Es) {
        Write-Host ''
        Write-Host "Paginas donde crear cada app OAuth (una por plataforma, salteate las que no uses):" -ForegroundColor Cyan
        Write-Host "  Twitch : $TwitchAppUrl"
        Write-Host "  Google/YouTube : $GoogleCloudUrl  (crea un proyecto, activa 'YouTube Data API v3', configura la pantalla de consentimiento y creas las credenciales OAuth ahi)"
        Write-Host "  Kick   : $KickDevUrl  (requiere 2FA activado en tu cuenta de Kick primero)"
        Write-Host "El detalle paso a paso de cada una esta en INSTALL.md / README.md."
    } else {
        Write-Host ''
        Write-Host "Pages where you create each OAuth app (one per platform, skip the ones you won't use):" -ForegroundColor Cyan
        Write-Host "  Twitch : $TwitchAppUrl"
        Write-Host "  Google/YouTube : $GoogleCloudUrl  (create a project, enable 'YouTube Data API v3', configure the consent screen, and create the OAuth credentials there)"
        Write-Host "  Kick   : $KickDevUrl  (requires 2FA enabled on your Kick account first)"
        Write-Host "Full step-by-step detail for each one is in INSTALL.en.md / README.en.md."
    }
    if (Ask-YesNo "Abrir las 3 paginas en el navegador ahora?" "Open all 3 pages in the browser now?") {
        Start-Process $TwitchAppUrl
        Start-Process $GoogleCloudUrl
        Start-Process $KickDevUrl
    }
}

function Install-StreamInfoChat {
    Write-Host ''
    if (Es) { Write-Host "=== Instalando Stream Info + Chat ===" -ForegroundColor Green }
    else    { Write-Host "=== Installing Stream Info + Chat ===" -ForegroundColor Green }

    if (-not (Ensure-NodeJs)) { return }

    Push-Location $RepoRoot
    try {
        if (Es) { Write-Host "Corriendo 'npm install'..." } else { Write-Host "Running 'npm install'..." }
        npm install

        $envPath = Join-Path $RepoRoot '.env'
        $envExamplePath = Join-Path $RepoRoot '.env.example'
        if (-not (Test-Path $envPath)) {
            Copy-Item $envExamplePath $envPath
            Open-OAuthLinks
            if (Es) { Write-Host "`nSe creo '.env' a partir de '.env.example'. Se abre en Notepad - pega ahi tus Client ID/Secret y guarda." -ForegroundColor Cyan }
            else    { Write-Host "`n'.env' was created from '.env.example'. Opening it in Notepad - paste your Client ID/Secret there and save." -ForegroundColor Cyan }
            Start-Process notepad $envPath -Wait
        } else {
            if (Es) { Write-Host "`nYa existe un archivo '.env', no se toca." -ForegroundColor Yellow }
            else    { Write-Host "`nA '.env' file already exists, leaving it as-is." -ForegroundColor Yellow }
            if (Ask-YesNo "Abrirlo en Notepad para revisarlo?" "Open it in Notepad to review it?") {
                Start-Process notepad $envPath -Wait
            }
        }

        if (Ask-YesNo "Instalar el arranque automatico con Windows (tarea programada)?" "Install automatic startup with Windows (scheduled task)?") {
            powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'scripts\install-task.ps1')
        }

        if (Ask-YesNo "Arrancar el servidor ahora?" "Start the server now?") {
            Start-Process cmd -ArgumentList '/k', 'npm start' -WorkingDirectory $RepoRoot
            Start-Sleep -Seconds 2
            if (Es) { Write-Host "Servidor arrancando en una ventana nueva. Confirma en http://localhost:7773 que responde." -ForegroundColor Green }
            else    { Write-Host "Server starting in a new window. Confirm it's responding at http://localhost:7773." -ForegroundColor Green }
        }

        if (Es) {
            Write-Host "`nFalta, a mano, dentro de OBS (Docks -> Custom Browser Docks):" -ForegroundColor Cyan
            Write-Host "  Confluence Stream Info -> http://localhost:7773"
            Write-Host "  Confluence Chat        -> http://localhost:7773/currents.html"
        } else {
            Write-Host "`nStill needed, by hand, inside OBS (Docks -> Custom Browser Docks):" -ForegroundColor Cyan
            Write-Host "  Confluence Stream Info -> http://localhost:7773"
            Write-Host "  Confluence Chat        -> http://localhost:7773/currents.html"
        }
    } finally {
        Pop-Location
    }
}

function Install-Multistream {
    Write-Host ''
    if (Es) { Write-Host "=== Instalando Multistream ===" -ForegroundColor Green }
    else    { Write-Host "=== Installing Multistream ===" -ForegroundColor Green }

    $destPath = Join-Path $SuiteRoot $MultistreamRepo
    $localFolderGuess = Join-Path $SuiteRoot 'obs-multi-rtmp-ws'
    if (Test-Path $localFolderGuess) { $destPath = $localFolderGuess }

    $builtDll = Join-Path $destPath 'build_x64\rundir\Release\obs-multi-rtmp.dll'
    if (Test-Path $builtDll) {
        if (Es) { Write-Host "Se encontro un build ya compilado en '$destPath'. Corriendo su install.ps1 (pide admin, cerra OBS antes)..." -ForegroundColor Cyan }
        else    { Write-Host "Found an already-built plugin in '$destPath'. Running its install.ps1 (asks for admin, close OBS first)..." -ForegroundColor Cyan }
        powershell -ExecutionPolicy Bypass -File (Join-Path $destPath 'install.ps1')
        return
    }

    Download-Repo $MultistreamRepo $MultistreamBranch $destPath | Out-Null

    if (Es) {
        Write-Host "`nEsta pieza es un plugin nativo de OBS (C++/Qt) y no tiene un binario publicado todavia" -ForegroundColor Yellow
        Write-Host "(no hay Releases en GitHub) - hay que compilarlo una vez con Visual Studio + CMake." -ForegroundColor Yellow
        Write-Host "Guia completa con los comandos exactos: $destPath\CONFLUENCE-INSTALL.md" -ForegroundColor Cyan
        Write-Host "Cuando termines de compilar (carpeta 'build_x64'), volve a correr este instalador y va a" -ForegroundColor Cyan
        Write-Host "detectar el build solo y copiarlo a OBS por vos." -ForegroundColor Cyan
    } else {
        Write-Host "`nThis piece is a native OBS plugin (C++/Qt) and has no published binary yet" -ForegroundColor Yellow
        Write-Host "(no Releases on GitHub) - it needs to be built once with Visual Studio + CMake." -ForegroundColor Yellow
        Write-Host "Full guide with the exact commands: $destPath\CONFLUENCE-INSTALL.en.md" -ForegroundColor Cyan
        Write-Host "Once you finish building it (a 'build_x64' folder appears), run this installer again and it" -ForegroundColor Cyan
        Write-Host "will detect the build on its own and copy it into OBS for you." -ForegroundColor Cyan
    }
    if (Ask-YesNo "Abrir la guia de compilacion ahora?" "Open the build guide now?") {
        $guide = if (Es) { Join-Path $destPath 'CONFLUENCE-INSTALL.md' } else { Join-Path $destPath 'CONFLUENCE-INSTALL.en.md' }
        Start-Process $guide
    }
}

function Install-StreamDeck {
    Write-Host ''
    if (Es) { Write-Host "=== Instalando Stream Deck ===" -ForegroundColor Green }
    else    { Write-Host "=== Installing Stream Deck ===" -ForegroundColor Green }

    if (-not (Ensure-NodeJs)) { return }

    $destPath = Join-Path $SuiteRoot $StreamDeckRepo
    Download-Repo $StreamDeckRepo $StreamDeckBranch $destPath | Out-Null

    Push-Location $destPath
    try {
        if (Es) { Write-Host "Corriendo 'npm install' y 'npm run build'..." } else { Write-Host "Running 'npm install' and 'npm run build'..." }
        npm install
        npm run build

        if (Ask-YesNo "Configurar la ruta a tu 'confluence-beta' ahora (necesaria para 'Reiniciar Confluence')?" "Configure the path to your 'confluence-beta' now (needed for 'Restart Confluence')?") {
            [Environment]::SetEnvironmentVariable('CONFLUENCE_DIR', $RepoRoot, 'User')
            if (Es) { Write-Host "Variable CONFLUENCE_DIR configurada en '$RepoRoot'." -ForegroundColor Green }
            else    { Write-Host "CONFLUENCE_DIR variable set to '$RepoRoot'." -ForegroundColor Green }
        }

        if (Es) { Write-Host "Instalando el plugin en tu Stream Deck app ('npm run link')..." }
        else    { Write-Host "Installing the plugin into your Stream Deck app ('npm run link')..." }
        npm run link

        if (Es) {
            Write-Host "`nListo. Las 9 acciones aparecen en la categoria 'Confluence Suite' del panel de Stream Deck." -ForegroundColor Green
            Write-Host "Si configuraste CONFLUENCE_DIR recien, reinicia la Stream Deck app para que la tome." -ForegroundColor Cyan
        } else {
            Write-Host "`nDone. The 9 actions show up under the 'Confluence Suite' category in the Stream Deck panel." -ForegroundColor Green
            Write-Host "If you just set CONFLUENCE_DIR, restart the Stream Deck app so it picks it up." -ForegroundColor Cyan
        }
    } finally {
        Pop-Location
    }
}

# ---------- main ----------

Pick-Language

$done = $false
while (-not $done) {
    Write-Host ''
    if (Es) {
        Write-Host "Que queres instalar?" -ForegroundColor Cyan
        Write-Host "  [1] Todo (Stream Info + Chat, Multistream, Stream Deck)"
        Write-Host "  [2] Solo Stream Info + Chat (este repo)"
        Write-Host "  [3] Solo Multistream (plugin nativo de OBS)"
        Write-Host "  [4] Solo Stream Deck"
        Write-Host "  [0] Salir"
        $opt = Read-Host "`nElegi una opcion"
    } else {
        Write-Host "What do you want to install?" -ForegroundColor Cyan
        Write-Host "  [1] Everything (Stream Info + Chat, Multistream, Stream Deck)"
        Write-Host "  [2] Only Stream Info + Chat (this repo)"
        Write-Host "  [3] Only Multistream (native OBS plugin)"
        Write-Host "  [4] Only Stream Deck"
        Write-Host "  [0] Exit"
        $opt = Read-Host "`nPick an option"
    }

    switch ($opt) {
        '1' { Install-StreamInfoChat; Install-Multistream; Install-StreamDeck }
        '2' { Install-StreamInfoChat }
        '3' { Install-Multistream }
        '4' { Install-StreamDeck }
        '0' { $done = $true }
        default {
            if (Es) { Write-Host "Opcion invalida." -ForegroundColor Red }
            else    { Write-Host "Invalid option." -ForegroundColor Red }
        }
    }
}

if (Es) { Write-Host "`nListo por ahora. Gracias por usar Confluence Suite." -ForegroundColor Green }
else    { Write-Host "`nDone for now. Thanks for using Confluence Suite." -ForegroundColor Green }
Pause-Exit
