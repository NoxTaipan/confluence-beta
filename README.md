# Confluence (Beta)

**Confluence Suite** es un panel para streamers que unifica el control de Twitch, YouTube y Kick dentro de OBS, como Custom Browser Docks. Build pública de [NOX TAIPAN](https://github.com/NoxTaipan), pensada para que cualquier streamer la auto-hospede con sus propias credenciales OAuth: cada quien corre su propia instancia en su propia PC, no hay servidor compartido ni cuenta central — tus tokens y tu chat nunca salen de tu maquina.

La suite tiene tres piezas, cada una un dock/browser source independiente:

| Pieza | Que hace | Se agrega en OBS como |
|---|---|---|
| **Confluence Stream Info** | Publica titulo, tags y categoria a la vez en las 3 plataformas | Custom Browser Dock |
| **Confluence Chat** | Chat unificado de Twitch/YouTube/Kick, con composer para responder | Custom Browser Dock |
| **Confluence Overlay Chat** | El mismo chat pero en modo lectura, para mostrar en escena | Browser Source |

## Funciones

### Stream Info — titulo, tags y categoria en un solo lugar
- Conecta/desconecta cada plataforma con un click (OAuth, ventana popup que se cierra sola).
- Un titulo y una lista de tags compartidos para las 3 plataformas.
- Categoria/juego por plataforma: buscador con autocompletado para Twitch y Kick, dropdown para YouTube.
- **"Publicar a las 3"** de un solo click, o publicar a una plataforma sola.
- Guardar el formulario como borrador (persiste en el navegador) y recuperarlo la proxima vez, o limpiarlo todo.
- Log de resultados por plataforma (OK / error) despues de cada publicacion.

### Chat — las tres plataformas en un solo feed
- Feed en vivo unificado de Twitch, YouTube y Kick (Server-Sent Events, reconecta solo).
- Filtros por plataforma con punto de estado (conectado/desconectado) para mostrar u ocultar cada una.
- Resaltado de menciones: configura tu usuario y tus mensajes destacan en el feed.
- Emotes nativos de cada plataforma renderizados en linea (incluye 7TV en Twitch/Kick).
- Composer para responder: escribe una vez y envia a todas las plataformas conectadas o elegí una sola por mensaje, con selector de emojis.
- Limpiar el chat completo o solo el de una plataforma.

### Overlay Chat — el chat en tu escena
Pensado como **Browser Source** de OBS (no un dock) para mostrar el chat en pantalla mientras stremeas. Es de solo lectura y se configura por query string en la URL, sin necesidad de tocar código:

```
http://localhost:7773/overlay.html?limit=8&fade=20&platforms=twitch,kick&position=bottom-left
```

| Parametro | Que controla | Default |
|---|---|---|
| `limit` | Cantidad maxima de mensajes visibles a la vez | `8` |
| `fade` | Segundos hasta que un mensaje se desvanece solo (`0` = nunca) | `20` |
| `platforms` | Que plataformas mostrar, separadas por coma | `twitch,youtube,kick` |
| `position` | Esquina del feed: `bottom-left`, `bottom-right`, `top-left`, `top-right` | `bottom-left` |

## Instalacion

**Requisitos:** [Node.js](https://nodejs.org) (LTS) y OBS Studio.

```bash
git clone https://github.com/NoxTaipan/confluence-beta.git
cd confluence-beta
npm install
```

### Credenciales OAuth

Confluence corre con **tus propias** apps de desarrollador — no hay credenciales compartidas. Copia `.env.example` a `.env` y completa cada bloque despues de crear la app correspondiente:

- **Twitch:** [Twitch Developer Console](https://dev.twitch.tv/console) → crear una app → Redirect URI: `http://localhost:7773/auth/twitch/callback`.
- **YouTube:** [Google Cloud Console](https://console.cloud.google.com/) → crear proyecto → habilitar **YouTube Data API v3** → credenciales OAuth 2.0 → Redirect URI: `http://localhost:7773/auth/youtube/callback`.
- **Kick:** activa 2FA en tu cuenta (requisito de Kick) → Configuracion de cuenta → pestaña **Developer** → crear una app → Redirect URI: `http://localhost:7773/auth/kick/callback`.

Cada Redirect URI ya viene precargada en `.env.example`; solo hace falta pegar el Client ID y Client Secret de cada plataforma.

### Arrancar el servidor

```bash
npm run dev
```

Sirve en `http://localhost:7773` (el puerto es configurable via `PORT` en `.env`).

## Uso

1. **Agregar los docks en OBS:** Docks → Custom Browser Docks → agregar dos, uno con URL `http://localhost:7773` (Stream Info) y otro con `http://localhost:7773/currents.html` (Chat). Para el overlay, agregalo como fuente **Browser** dentro de una escena con la URL de la seccion anterior.
2. **Conectar las cuentas:** en el dock de Stream Info, click en cada pastilla (Twitch/YouTube/Kick) para autorizar. Se abre una ventana de login que se cierra sola al terminar.
3. **Publicar:** escribi titulo y tags, buscá la categoria de Twitch/Kick y elegí la de YouTube, y pulsá "Publicar a las 3" (o solo una plataforma).
4. **Chatear:** el dock de Chat ya muestra los tres feeds combinados apenas conectes las cuentas; usá el composer de abajo para responder.

### Arranque automatico (opcional)

Por defecto arrancás el servidor vos mismo con `npm run dev` cada vez, o con doble-click a `scripts/start-hidden.vbs` (lo deja corriendo oculto, sin ventana de consola). Si preferis que arranque solo con Windows, hay una tarea programada lista para instalar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-task.ps1
```

Esto crea la tarea **"Confluence Autostart"**, que lanza el servidor oculto en cada inicio de sesion — util porque los Custom Browser Docks de OBS cargan su URL apenas se abre OBS, y conviene que el servidor ya este arriba antes de eso. Apagarlo a mano en cualquier momento: `scripts/stop.ps1`. Logs en `scripts/confluence.log`.

> Si un dock queda mostrando "server refused the connection" (por ejemplo si lo abriste antes de que el servidor terminara de arrancar), el servidor puede estar perfectamente sano — es Chromium que no reintenta la conexion solo. Click en **"Click here to retry"** en ese dock y carga.

## Multistream (opcional)

Confluence solo maneja titulo/categoria/tags y chat — el envio del video en si a varios destinos (multistream) es un tema aparte. Si tambien lo necesitas, [confluence-multistream](https://github.com/NoxTaipan/confluence-multistream) (fork de obs-multi-rtmp con soporte websocket) es un dock nativo de OBS totalmente independiente de este proyecto.

## Limitaciones conocidas

- YouTube solo puede actualizar un broadcast que ya este en vivo (no crea uno nuevo).
- Kick usa una API publica relativamente nueva; si la busqueda de categorias o la actualizacion de canal fallan, revisar los endpoints vigentes en [docs.kick.com](https://docs.kick.com).
- El modo "Testing" de una app de Google Cloud puede pedir reautenticar cada tanto (subila a produccion en Google Cloud Console para evitarlo).

## Soporte

Este proyecto es gratis y de codigo abierto. Si te sirve y queres apoyar el mantenimiento:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/noxtaipan)

Issues y PRs son bienvenidos.
