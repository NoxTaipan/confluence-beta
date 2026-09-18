# Confluence (Beta)

Panel para publicar titulo, categoria y tags a la vez en Twitch, YouTube y Kick, mas un chat unificado de las tres plataformas — pensado para vivir dentro de OBS como Custom Browser Dock.

Build publica de [NOX TAIPAN](https://github.com/NoxTaipan) para que cualquier streamer lo pueda auto-hospedar con sus propias credenciales OAuth. Cada quien corre su propia instancia localmente; no hay ningun servidor compartido ni cuenta central.

## Uso

```bash
npm install
npm run dev
```

Sirve en `http://localhost:7773` (configurable via `PORT` en `.env`).

En OBS: **Docks → Custom Browser Docks** → URL `http://localhost:7773`.

## Primer uso

1. Completa `.env` (ver `.env.example`) con las credenciales OAuth de cada plataforma (Twitch Developer Console, Google Cloud Console, Kick Developer Portal).
2. Abre el dock, haz clic en cada pastilla (Twitch/YouTube/Kick) para autorizar. Se abre una ventana de login; al terminar se cierra sola.
3. Escribe titulo/tags, busca la categoria de Twitch y Kick, elige la de YouTube, y pulsa "Publicar a las 3" (o solo una plataforma).

## Arranque automatico

Confluence se arranca solo con el inicio de sesion de Windows, via una tarea programada llamada **"Confluence Autostart"** (dispara en el logon, corre `scripts/start-hidden.vbs` oculto). Esto es a proposito: los Custom Browser Docks de OBS cargan su URL apenas se restauran las ventanas, mientras que los scripts de OBS (Tools → Scripts) pueden tardar mas de un minuto en dispararse en un arranque con muchos plugins/docks — si Confluence dependiera solo de OBS para arrancar, los docks intentan conectar antes de que el servidor exista y quedan pegados en "server refused the connection" (CEF no reintenta solo).

Con la tarea programada, Confluence ya esta arriba antes de que abras OBS, y ademas queda corriendo en segundo plano aunque cierres OBS (no se apaga solo).

- Instalar/reinstalar la tarea: ver `scripts/install-task.ps1`.
- Apagar Confluence a mano: `scripts/stop.ps1`.
- Logs en `scripts/confluence.log`, PID en `scripts/confluence.pid`.

`scripts/obs-autostart.lua` (Tools → Scripts en OBS) sigue existiendo solo como respaldo: si por lo que sea Confluence no esta corriendo cuando abres OBS, lo arranca. Ya no lo detiene al cerrar OBS.

**Si un dock queda pegado en "server refused the connection"** (por ejemplo la primera vez, antes de instalar la tarea programada, o si reiniciaste el servidor a mano con uno de los docks ya abierto): dale clic a **"Click here to retry"** en ese dock. El servidor puede estar perfectamente sano — Chromium (CEF) simplemente no reintenta la conexion solo despues de fallar una vez, hay que pedirselo a mano.

## Multistream (video)

Confluence solo maneja titulo/categoria/tags. El envio del video en si a YouTube/Kick es un tema aparte — si tambien haces multistream nativo desde OBS, [confluence-multistream](https://github.com/NoxTaipan/confluence-multistream) (fork de obs-multi-rtmp con soporte websocket) es opcional y totalmente independiente de este proyecto.

## Limitaciones conocidas

- YouTube solo puede actualizar un broadcast que ya este en vivo.
- Kick usa una API publica relativamente nueva; si `updateChannelInfo`/`searchCategories` fallan, revisar los endpoints vigentes en https://docs.kick.com.
- El modo "Testing" de la app de Google puede pedir reautenticar cada tanto.

## Soporte

Este proyecto es gratis y de codigo abierto. Si te sirve y queres apoyar el mantenimiento:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/noxtaipan)

Issues y PRs son bienvenidos.
