🇬🇧 **English** | [🇪🇸 Español](INSTALL.es.md)

# Installing Confluence Suite — full guide

This guide covers every way to install the three pieces of **Confluence Suite**: **Stream Info + Chat** (this repo), **Multistream** (native OBS plugin), and **Stream Deck** (Elgato plugin). Pick whichever pieces you need — none of them require the others except where noted.

| Piece | Repo | What it needs to run |
|---|---|---|
| Stream Info + Chat | `confluence-beta` (this repo) | Node.js |
| Multistream | [confluence-multistream](https://github.com/NoxTaipan/confluence-multistream) | Built from source (Visual Studio + CMake) — no prebuilt binary is published yet |
| Stream Deck | [confluence-streamdeck-beta](https://github.com/NoxTaipan/confluence-streamdeck-beta) | Node.js, Elgato Stream Deck app |

## Method 1 — Automatic installer (recommended)

1. Download or `git clone` this repo (`confluence-beta`) if you haven't already.
2. Double-click **`install.bat`** in the project root.
3. Pick your language (Spanish/English) and then pick what to install from the menu:
   ```
   [1] Everything (Stream Info + Chat, Multistream, Stream Deck)
   [2] Only Stream Info + Chat (this repo)
   [3] Only Multistream (native OBS plugin)
   [4] Only Stream Deck
   [0] Exit
   ```
4. Follow the prompts. The installer will, depending on what you pick:
   - Check that Node.js is installed (and send you to the download page if it isn't).
   - Run `npm install` for you.
   - Create your `.env` file from `.env.example` and open it in Notepad so you can paste your OAuth credentials.
   - Open the 3 OAuth registration pages in your browser (see [OAuth apps](#creating-the-oauth-apps) below).
   - Optionally install the Windows autostart task.
   - Optionally start the server right away.
   - Download `confluence-streamdeck-beta` next to this repo, run `npm install` + `npm run build` + `npm run link`, and optionally set the `CONFLUENCE_DIR` environment variable for you.
   - For Multistream: since there's no published binary yet, it downloads the source next to this repo and points you at the build guide — see [Multistream](#multistream-build-from-source) below.

**What it cannot automate, on purpose:**
- Creating the 3 OAuth apps (Twitch/YouTube/Kick) — these are web forms on each platform's own site, some requiring 2FA. See the links and steps below.
- Adding the Custom Browser Docks inside OBS — OBS has no scripting hook for this, it has to be done once from **Docks → Custom Browser Docks** in its UI.
- Compiling the Multistream native plugin — that needs a full C++ toolchain (Visual Studio + CMake) on your machine; see below.

**If PowerShell refuses to run the script** (`cannot be loaded because running scripts is disabled on this system`), that's Windows' default script policy, not a bug. You can either just double-click `install.bat` (it already bypasses this for you), or run this yourself in a PowerShell window opened in the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

## Method 2 — Manual, step by step

If you'd rather do everything by hand (or want to understand what the installer does), here is each piece in full detail.

### Stream Info + Chat (this repo)

```powershell
git clone https://github.com/NoxTaipan/confluence-beta.git
cd confluence-beta
npm install
```

Copy `.env.example` to `.env` and fill in the credentials from your OAuth apps (see next section), then:

```powershell
npm run dev
```

Leave that terminal open — it serves on `http://localhost:7773`. Full OBS dock setup and feature walkthrough: see the [main README](README.en.md#installation).

**Optional — start automatically with Windows:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-task.ps1
```

Removes/updates the existing task if you run it again. To turn it off: `powershell -File scripts\stop.ps1`.

### Creating the OAuth apps

You need one developer app per platform you want to use — skip the ones you don't.

**Twitch** — [dev.twitch.tv/console/apps/create](https://dev.twitch.tv/console/apps/create)
1. Sign in with your Twitch account, you'll land directly on **Register Your Application**.
2. Name: anything you like. **OAuth Redirect URLs:** `http://localhost:7773/auth/twitch/callback`. Category: "Application Integration" (or similar).
3. Save. You get a **Client ID**; click **New Secret** to generate the **Client Secret** (shown once — copy it immediately).

**YouTube (Google Cloud)** — [console.cloud.google.com](https://console.cloud.google.com/)
1. Create a new project (or use an existing one).
2. **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.
3. **APIs & Services → OAuth consent screen**: type **External**, fill in name/email, add scope `https://www.googleapis.com/auth/youtube`. While the app is in "Testing" status (normal for personal use), add yourself under **Test users** with the same email as your YouTube account.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, type **Web application**. **Authorized redirect URIs:** `http://localhost:7773/auth/youtube/callback`.
5. Copy the **Client ID** and **Client Secret**.

**Kick** — [kick.com/settings/developer](https://kick.com/settings/developer)
1. Enable two-factor authentication (2FA) on your Kick account first — Kick requires it to unlock this page.
2. Create a new app from that Developer settings page.
3. **Redirect URL:** `http://localhost:7773/auth/kick/callback`.
4. Copy the **Client ID** and **Client Secret**.

Paste all of it into `.env`:

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

If you use a `PORT` other than `7773`, update all three `REDIRECT_URI` values (and the redirect URL registered on each platform) to match.

### Multistream (build from source)

There is currently no compiled build published for this piece (no GitHub Release, and `build_x64/` is not committed) — this is documented directly on its repo. To install it you need to build it yourself once:

**Requirements:** Visual Studio with the "Desktop development with C++" workload, and CMake.

```powershell
git clone --branch obs-websocket-support https://github.com/NoxTaipan/confluence-multistream.git
cd confluence-multistream
mkdir build_x64
cd build_x64
cmake .. -G "Visual Studio 17 2022" -A x64 -DENABLE_QT=ON -DENABLE_FRONTEND_API=ON -DENABLE_WEBSOCKET=ON
cmake --build . --config Release
```

Once that finishes, go back to the repo root and run the installer that copies the plugin into OBS (as admin, with OBS **closed**):

```powershell
cd ..
powershell -ExecutionPolicy Bypass -File install.ps1
```

Full guide: [CONFLUENCE-INSTALL.en.md](https://github.com/NoxTaipan/confluence-multistream/blob/obs-websocket-support/CONFLUENCE-INSTALL.en.md) in that repo.

### Stream Deck

**Requirements:** [Stream Deck app](https://www.elgato.com/downloads) 6.5+, Node.js 20 (LTS).

```powershell
git clone https://github.com/NoxTaipan/confluence-streamdeck-beta.git
cd confluence-streamdeck-beta
npm install
npm run build
```

Only needed for the "Restart Confluence" action — point it at your local `confluence-beta` checkout:

```powershell
[Environment]::SetEnvironmentVariable("CONFLUENCE_DIR", "C:/path/to/your/confluence-beta", "User")
```

Then install the plugin into your Stream Deck app:

```powershell
npm run link
npm run restart
```

The 9 actions appear under the **"Confluence Suite"** category in the Stream Deck actions panel. Full per-action detail: [confluence-streamdeck-beta README](https://github.com/NoxTaipan/confluence-streamdeck-beta#readme).

## Configuring OBS (all pieces)

None of the installers above can touch OBS's own configuration — OBS docks have to be added once, by hand, from its UI:

1. **Docks → Custom Browser Docks...** → add a row named `Confluence Stream Info` with URL `http://localhost:7773`, **Apply**.
2. Add another row named `Confluence Chat` with URL `http://localhost:7773/currents.html`, **Apply**.
3. If you installed Multistream, its dock is a native OBS plugin panel, not a browser dock — it appears automatically under **Docks** once the plugin is installed; enable it from there.
4. (Optional) Overlay Chat goes in a **scene** as a Browser Source, not a dock — see the [main README](README.en.md#overlay-chat--the-chat-on-your-scene) for the exact steps and URL parameters.

## Troubleshooting

- **"running scripts is disabled on this system"** — use `install.bat` (bypasses it automatically) or run `powershell -ExecutionPolicy Bypass -File install.ps1` yourself.
- **A dock shows "server refused the connection"** — the server may be perfectly healthy; it's Chromium not retrying the connection on its own after opening the dock before the server was ready. Click **"Click here to retry"** on that dock.
- **`invalid_grant: Token has been expired or revoked` (YouTube)** — your Google Cloud app is in "Testing" mode, whose refresh tokens expire after 7 days of inactivity. Disconnect/reconnect YouTube from the dock; to stop it recurring, publish the app in Google Cloud Console.
- **Node.js not found** — install the LTS release from [nodejs.org](https://nodejs.org) and re-run the installer.
- **git not found** — not required; `install.ps1` falls back to downloading a ZIP automatically when `git` isn't on your PATH.
