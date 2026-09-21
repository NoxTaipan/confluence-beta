[🇬🇧 English](INSTALL.en.md) | 🇪🇸 **Español**

# Instalar Confluence Suite — guía completa

Esta guía cubre todas las formas de instalar las tres piezas de **Confluence Suite**: **Stream Info + Chat** (este repo), **Multistream** (plugin nativo de OBS) y **Stream Deck** (plugin de Elgato). Instalá solo las que necesites — ninguna depende de las otras, salvo donde se aclara.

| Pieza | Repo | Qué necesita para correr |
|---|---|---|
| Stream Info + Chat | `confluence-beta` (este repo) | Node.js |
| Multistream | [confluence-multistream](https://github.com/NoxTaipan/confluence-multistream) | Compilarlo desde código fuente (Visual Studio + CMake) — todavía no hay binario publicado |
| Stream Deck | [confluence-streamdeck-beta](https://github.com/NoxTaipan/confluence-streamdeck-beta) | Node.js, app de Elgato Stream Deck |

## Método 1 — Instalador automático (recomendado)

1. Descargá o hacé `git clone` de este repo (`confluence-beta`) si todavía no lo tenés.
2. Doble clic en **`install.bat`**, en la raíz del proyecto.
3. Elegí idioma (Español/English) y después elegí qué instalar desde el menú:
   ```
   [1] Todo (Stream Info + Chat, Multistream, Stream Deck)
   [2] Solo Stream Info + Chat (este repo)
   [3] Solo Multistream (plugin nativo de OBS)
   [4] Solo Stream Deck
   [0] Salir
   ```
4. Seguí las indicaciones en pantalla. Según lo que elijas, el instalador va a:
   - Chequear que tengas Node.js instalado (y mandarte a la página de descarga si no).
   - Correr `npm install` por vos.
   - Crear tu archivo `.env` a partir de `.env.example` y abrirlo en Notepad para que pegues tus credenciales OAuth.
   - Abrir las 3 páginas de registro OAuth en tu navegador (ver [Crear las apps OAuth](#crear-las-apps-oauth) abajo).
   - Opcionalmente, instalar la tarea de arranque automático con Windows.
   - Opcionalmente, arrancar el servidor ahí mismo.
   - Descargar `confluence-streamdeck-beta` al lado de este repo, correr `npm install` + `npm run build` + `npm run link`, y opcionalmente configurar la variable `CONFLUENCE_DIR` por vos.
   - Para Multistream: como todavía no hay binario publicado, descarga el código fuente al lado de este repo y te lleva a la guía de compilación — ver [Multistream](#multistream-compilar-desde-código-fuente) abajo.

**Lo que el instalador NO automatiza, a propósito:**
- Crear las 3 apps OAuth (Twitch/YouTube/Kick) — son formularios web en el sitio de cada plataforma, algunas piden 2FA. Ver los links y pasos abajo.
- Agregar los Custom Browser Docks dentro de OBS — OBS no tiene ningún gancho para scriptear esto, hay que hacerlo una vez desde **Docks → Custom Browser Docks** en su interfaz.
- Compilar el plugin nativo de Multistream — necesita un toolchain completo de C++ (Visual Studio + CMake) en tu máquina; ver abajo.

**Si PowerShell se niega a correr el script** (`no se puede cargar porque la ejecución de scripts está deshabilitada en este sistema`), es la política de scripts por defecto de Windows, no un bug. Podés simplemente hacer doble clic en `install.bat` (ya la esquiva por vos), o correr esto a mano en una ventana de PowerShell abierta en la carpeta del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

## Método 2 — Manual, paso a paso

Si preferís hacer todo a mano (o querés entender qué hace el instalador), acá está cada pieza en detalle completo.

### Stream Info + Chat (este repo)

```powershell
git clone https://github.com/NoxTaipan/confluence-beta.git
cd confluence-beta
npm install
```

Copiá `.env.example` a `.env` y completá las credenciales de tus apps OAuth (ver la sección siguiente), después:

```powershell
npm run dev
```

Dejá esa terminal abierta — sirve en `http://localhost:7773`. La configuración completa de los docks de OBS y el recorrido de funciones están en el [README principal](README.md#instalación).

**Opcional — arrancar solo con Windows:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-task.ps1
```

Si lo corrés de nuevo, actualiza la tarea existente. Para apagarlo: `powershell -File scripts\stop.ps1`.

### Crear las apps OAuth

Necesitás una app de desarrollador por cada plataforma que quieras usar — salteá las que no uses.

**Twitch** — [dev.twitch.tv/console/apps/create](https://dev.twitch.tv/console/apps/create)
1. Iniciá sesión con tu cuenta de Twitch, caés directo en **Register Your Application**.
2. Nombre: el que quieras. **OAuth Redirect URLs:** `http://localhost:7773/auth/twitch/callback`. Categoría: "Application Integration" (o similar).
3. Guardá. Te da un **Client ID**; click en **New Secret** para generar el **Client Secret** (se muestra una sola vez — copialo ya).

**YouTube (Google Cloud)** — [console.cloud.google.com](https://console.cloud.google.com/)
1. Creá un proyecto nuevo (o usá uno existente).
2. **APIs & Services → Library** → buscá **YouTube Data API v3** → **Enable**.
3. **APIs & Services → OAuth consent screen**: tipo **External**, completá nombre/email, agregá el scope `https://www.googleapis.com/auth/youtube`. Mientras la app esté en estado "Testing" (lo normal para uso personal), agregate como **Test user** con el mismo email de tu cuenta de YouTube.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, tipo **Web application**. **Authorized redirect URIs:** `http://localhost:7773/auth/youtube/callback`.
5. Copiá el **Client ID** y el **Client Secret**.

**Kick** — [kick.com/settings/developer](https://kick.com/settings/developer)
1. Activá la verificación en dos pasos (2FA) en tu cuenta de Kick primero — Kick la exige para desbloquear esta página.
2. Creá una app nueva desde esa página de configuración de Developer.
3. **Redirect URL:** `http://localhost:7773/auth/kick/callback`.
4. Copiá el **Client ID** y el **Client Secret**.

Pegá todo en `.env`:

```ini
PORT=7773

TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI=http://localhost:7773/auth/twitch/callback

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:7773/auth/youtube/callback

KICK_CLIENT_ID=
KICK_CLIENT_SECRET=
KICK_REDIRECT_URI=http://localhost:7773/auth/kick/callback
```

Si usás un `PORT` distinto de `7773`, actualizá las tres `REDIRECT_URI` (y la redirect URL configurada en cada plataforma) para que coincidan.

### Multistream (compilar desde código fuente)

Hoy no hay ningún build compilado publicado para esta pieza (no hay Release en GitHub, y `build_x64/` no está commiteado) — está documentado directamente en su repo. Para instalarlo hay que compilarlo una vez, vos mismo:

**Requisitos:** Visual Studio con el workload "Desktop development with C++", y CMake.

```powershell
git clone --branch obs-websocket-support https://github.com/NoxTaipan/confluence-multistream.git
cd confluence-multistream
mkdir build_x64
cd build_x64
cmake .. -G "Visual Studio 17 2022" -A x64 -DENABLE_QT=ON -DENABLE_FRONTEND_API=ON -DENABLE_WEBSOCKET=ON
cmake --build . --config Release
```

Cuando termine, volvé a la raíz del repo y corré el instalador que copia el plugin a OBS (como admin, con OBS **cerrado**):

```powershell
cd ..
powershell -ExecutionPolicy Bypass -File install.ps1
```

Guía completa: [CONFLUENCE-INSTALL.md](https://github.com/NoxTaipan/confluence-multistream/blob/obs-websocket-support/CONFLUENCE-INSTALL.md) en ese repo.

### Stream Deck

**Requisitos:** [Stream Deck app](https://www.elgato.com/downloads) 6.5+, Node.js 20 (LTS).

```powershell
git clone https://github.com/NoxTaipan/confluence-streamdeck-beta.git
cd confluence-streamdeck-beta
npm install
npm run build
```

Solo hace falta para la acción "Reiniciar Confluence" — apuntala a tu checkout local de `confluence-beta`:

```powershell
[Environment]::SetEnvironmentVariable("CONFLUENCE_DIR", "C:/ruta/a/tu/confluence-beta", "User")
```

Después instalá el plugin en tu Stream Deck app:

```powershell
npm run link
npm run restart
```

Las 9 acciones aparecen en la categoría **"Confluence Suite"** del panel de acciones de Stream Deck. Detalle completo por acción: [README de confluence-streamdeck-beta](https://github.com/NoxTaipan/confluence-streamdeck-beta#readme).

## Configurar OBS (todas las piezas)

Ninguno de los instaladores de arriba puede tocar la configuración propia de OBS — los docks hay que agregarlos una vez, a mano, desde su interfaz:

1. **Docks → Custom Browser Docks...** → agregá una fila con nombre `Confluence Stream Info` y URL `http://localhost:7773`, **Apply**.
2. Agregá otra fila con nombre `Confluence Chat` y URL `http://localhost:7773/currents.html`, **Apply**.
3. Si instalaste Multistream, su dock es un panel nativo de OBS, no un browser dock — aparece solo bajo **Docks** una vez instalado el plugin; activalo desde ahí.
4. (Opcional) Overlay Chat va dentro de una **escena** como Browser Source, no como dock — ver el [README principal](README.md#overlay-chat--el-chat-en-tu-escena) para los pasos exactos y los parámetros de URL.

## Solución de problemas

- **"la ejecución de scripts está deshabilitada en este sistema"** — usá `install.bat` (lo esquiva solo) o corré vos mismo `powershell -ExecutionPolicy Bypass -File install.ps1`.
- **Un dock muestra "server refused the connection"** — el servidor puede estar perfectamente sano; es Chromium que no reintenta solo la conexión después de abrir el dock antes de que el servidor estuviera listo. Click en **"Click here to retry"** en ese dock.
- **`invalid_grant: Token has been expired or revoked` (YouTube)** — tu app de Google Cloud está en modo "Testing", cuyos refresh tokens vencen a los 7 días de inactividad. Desconectá/reconectá YouTube desde el dock; para que no vuelva a pasar, publicá la app en Google Cloud Console.
- **No se encuentra Node.js** — instalá la versión LTS desde [nodejs.org](https://nodejs.org) y volvé a correr el instalador.
- **No se encuentra git** — no hace falta; `install.ps1` descarga un ZIP automáticamente si `git` no está en tu PATH.
