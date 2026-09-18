🇬🇧 **English** | [🇪🇸 Español](README.es.md)

# Confluence (Beta)

**Confluence Suite** is a panel for streamers that unifies control of Twitch, YouTube and Kick inside OBS, as Custom Browser Docks. Public build by [NOX TAIPAN](https://github.com/NoxTaipan), built so any streamer can self-host it with their own OAuth credentials: everyone runs their own instance on their own PC, there is no shared server or central account — your tokens and your chat never leave your machine.

The suite has three pieces, each an independent dock/browser source:

| Piece | What it does | Added to OBS as |
|---|---|---|
| **Confluence Stream Info** | Publishes title, tags and category to all 3 platforms at once | Custom Browser Dock |
| **Confluence Chat** | Unified Twitch/YouTube/Kick chat, with a composer to reply | Custom Browser Dock |
| **Confluence Overlay Chat** | The same chat in read-only mode, to show on your scene | Browser Source |

## Features

### Stream Info — title, tags and category in one place

<img src="docs/screenshots/stream-info.png" alt="Confluence Stream Info dock" width="360" />

- Connect/disconnect each platform with one click (OAuth, popup window that closes itself).
- One title and one tag list shared across all 3 platforms.
- Category/game per platform: autocomplete search for Twitch and Kick, dropdown for YouTube.
- **"Publish to all 3"** in one click, or publish to a single platform.
- Save the form as a draft (persists in the browser) and restore it next time, or clear it all.
- Per-platform result log (OK / error) after each publish.

### Chat — all three platforms in one feed

<img src="docs/screenshots/chat.png" alt="Confluence Chat dock" width="360" />

- Unified live feed of Twitch, YouTube and Kick (Server-Sent Events, reconnects on its own).
- Per-platform filters with a status dot (connected/disconnected) to show or hide each one.
- Mention highlighting: set your username and your messages stand out in the feed.
- Native emotes from each platform rendered inline (includes 7TV on Twitch/Kick).
- Composer to reply: type once and send to every connected platform, or pick a single one per message, with an emoji picker.
- Clear the whole chat, or just one platform's.

### Overlay Chat — the chat on your scene
Meant as an OBS **Browser Source** (not a dock) to show the chat on screen while you stream. It's read-only and configured via query string in the URL, with no code editing needed:

```
http://localhost:7773/overlay.html?limit=8&fade=20&platforms=twitch,kick&position=bottom-left
```

| Parameter | What it controls | Default |
|---|---|---|
| `limit` | Maximum number of messages visible at once | `8` |
| `fade` | Seconds until a message fades out on its own (`0` = never) | `20` |
| `platforms` | Which platforms to show, comma-separated | `twitch,youtube,kick` |
| `position` | Corner of the feed: `bottom-left`, `bottom-right`, `top-left`, `top-right` | `bottom-left` |

## Installation

**Requirements:** [Node.js](https://nodejs.org) (LTS version) and OBS Studio already installed.

### 1. Download the project

```bash
git clone https://github.com/NoxTaipan/confluence-beta.git
cd confluence-beta
npm install
```

### 2. Create your OAuth apps

Confluence runs on **your own** credentials — there's no shared app or central server. You'll need to create a developer app on each platform you want to use (skip the ones you don't).

**Twitch**
1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console) with your Twitch account and go to **Applications → Register Your Application**.
2. Name: whatever you want. **OAuth Redirect URLs:** `http://localhost:7773/auth/twitch/callback`. Category: "Application Integration" (or similar).
3. Save. It gives you a **Client ID**; click **New Secret** to generate the **Client Secret** (only shown once, copy it right away).

**YouTube (Google Cloud)**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a new project (or use an existing one).
2. **APIs & Services → Library** → search for **YouTube Data API v3** → **Enable**.
3. **APIs & Services → OAuth consent screen**: type **External**, fill in name/email. Add `https://www.googleapis.com/auth/youtube` to the scopes list. While the app stays in "Testing" status (normal for personal use), add yourself under **Test users** with the same email as your YouTube account — otherwise Google rejects the login.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, type **Web application**. **Authorized redirect URIs:** `http://localhost:7773/auth/youtube/callback`.
5. Copy the **Client ID** and **Client Secret** it gives you when created.

**Kick**
1. Enable two-factor authentication (2FA) on your Kick account — Kick requires it to grant access to the developer panel.
2. **Account settings → Developer tab** → create a new app.
3. **Redirect URL:** `http://localhost:7773/auth/kick/callback`.
4. Copy the **Client ID** and **Client Secret**.

### 3. Configure `.env`

Copy `.env.example` to a new file named `.env` in the project root, and paste in what you got from each platform:

```ini
PORT=7773

TWITCH_CLIENT_ID=       # Client ID of your Twitch app
TWITCH_CLIENT_SECRET=   # Client Secret of that same app
TWITCH_REDIRECT_URI=http://localhost:7773/auth/twitch/callback   # already correct, don't touch

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:7773/auth/youtube/callback

KICK_CLIENT_ID=
KICK_CLIENT_SECRET=
KICK_REDIRECT_URI=http://localhost:7773/auth/kick/callback
```

If you're going to use a `PORT` other than `7773`, also update the three `REDIRECT_URI` values (and the Redirect URL configured on each platform) to match.

### 4. Start the server

```bash
npm run dev
```

Leave the terminal open — that's where the server runs. It serves on `http://localhost:7773` (or whichever port you set in `PORT`). Confirm it works by opening that URL in your browser before moving on to OBS.

## Configuring OBS

### 1. Add the Stream Info dock
**Docks → Custom Browser Docks...** (OBS top menu) → opens a window with a **Dock Name** / **URL** table. In the first empty row, enter a name (e.g. `Confluence Stream Info`) and the URL `http://localhost:7773`, then **Apply**. The dock appears as a new window you can dock anywhere inside OBS.

### 2. Add the Chat dock
In the same **Custom Browser Docks** window, add another row: name `Confluence Chat`, URL `http://localhost:7773/currents.html` → **Apply**.

### 3. Add the Overlay Chat to your scene (optional)
Unlike the two above, this one goes **inside a scene** (it shows up on stream), not as a dock:
1. In the **Sources** panel of the scene where you want to show the chat, click **+** → **Browser**.
2. Name: whatever you want → **OK**.
3. In the properties window: **URL** → `http://localhost:7773/overlay.html` (add whatever parameters you want, see the table above), **Width**/**Height** to fit the space you leave for it in your scene, and check **Shutdown source when not visible** so it doesn't keep using resources when you switch scenes.
4. **OK**, then position/resize it on the scene canvas like any other source.

### 4. Connect your accounts
Go to the **Confluence Stream Info** dock and click the pill for each platform (Twitch/YouTube/Kick) you want to use. A login window for that platform opens; authorize and it closes itself. The pill switches to showing "disconnect" once it's connected.

### 5. Using Confluence
- **Publish title/tags/category:** type the title and tags (comma-separated), search for the Twitch/Kick category (autocomplete) and pick the YouTube one (dropdown), then hit **Publish to all 3** — or the "Only Twitch/YouTube/Kick" buttons to update a single platform.
- **Chat:** the Chat dock shows all three feeds mixed together as soon as you have accounts connected. Use the chips at the top to filter by platform, the gear icon to configure mention highlighting or clear the chat, and the field at the bottom to reply (with a selector for which platforms to send each message to).

### Automatic startup (optional)

By default you start the server yourself with `npm run dev` each time, or by double-clicking `scripts/start-hidden.vbs` (leaves it running hidden, no console window). If you'd rather it start with Windows, there's a scheduled task ready to install:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-task.ps1
```

This creates the **"Confluence Autostart"** task, which launches the server hidden on every login — useful because OBS's Custom Browser Docks load their URL as soon as OBS opens, and it helps for the server to already be up before that. Turn it off manually at any time: `scripts/stop.ps1`. Logs at `scripts/confluence.log`.

> If a dock shows "server refused the connection" (for example if you opened it before the server finished starting), the server may be perfectly healthy — it's Chromium simply not retrying the connection on its own. Click **"Click here to retry"** on that dock and it will load.

## Multistream (optional)

<img src="docs/screenshots/multistream.png" alt="Confluence Multistream native dock" width="360" />

Confluence only handles title/category/tags and chat — sending the actual video to multiple destinations (multistream) is a separate matter and isn't included in this repo. If you also need that, [confluence-multistream](https://github.com/NoxTaipan/confluence-multistream) (a fork of obs-multi-rtmp with websocket support) is a **native OBS plugin** (not a web dock), completely independent of this project, which adds:

- **Start all / Stop all:** start or stop every configured destination at once.
- **Add new target:** add a new RTMP destination (YouTube, Kick, or any RTMP server), with **Start / Modify / Delete** per destination.
- A main Twitch stream row with its own toggle, separate from the extra destinations.
- A Confluence status indicator (online/offline) with **Restart** and **Repair** buttons to restart the Confluence server without leaving OBS.

It's optional and installed separately — see its own repository for instructions.

## Full suite

This repo is one piece of **Confluence Suite** — each one installs separately, use whichever you need:

| Repo | What it is |
|---|---|
| **confluence-beta** (this repo) | The web panel: title/tags/category + unified Twitch/YouTube/Kick chat. |
| [confluence-multistream](https://github.com/NoxTaipan/confluence-multistream) | Native OBS plugin for sending video to several RTMP destinations at once. Optional. |
| [confluence-streamdeck-beta](https://github.com/NoxTaipan/confluence-streamdeck-beta) | Elgato Stream Deck plugin to control all of the above from physical buttons. Optional. |

## Known limitations

- YouTube can only update a broadcast that's already live (it doesn't create a new one).
- Kick uses a relatively new public API; if category search or channel updates fail, check the current endpoints at [docs.kick.com](https://docs.kick.com).
- A Google Cloud app in "Testing" mode may occasionally ask to re-authenticate (move it to production in Google Cloud Console to avoid this).

## Support

Everything I publish on GitHub — including this repo — is free and open source, always. If it's useful to you and you want to support its upkeep, buy me a coffee:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/noxtaipan)

Separately, on [Gumroad](https://noxtaipan.gumroad.com/) I sell other products — that one does cost money, to be clear.

Issues and PRs are welcome.

## License

[MIT](LICENSE)
