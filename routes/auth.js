const express = require('express');
const crypto = require('crypto');
const twitch = require('../lib/twitch');
const youtube = require('../lib/youtube');
const kick = require('../lib/kick');
const tokenStore = require('../lib/token-store');
const chatManager = require('../lib/chat/manager');

const router = express.Router();
const platforms = { twitch, youtube, kick };

// Anti-CSRF: el state generado al iniciar el flujo se guarda aca y se exige
// de vuelta en el callback (de un solo uso, expira solo) - sin esto, alguien
// podria inducir a completar el login con el "code" de otra cuenta.
const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map(); // state -> { platform, expires }

function rememberState(state, platform) {
  const now = Date.now();
  for (const [key, entry] of pendingStates) {
    if (entry.expires < now) pendingStates.delete(key);
  }
  pendingStates.set(state, { platform, expires: now + STATE_TTL_MS });
}

function consumeState(state, platform) {
  const entry = state ? pendingStates.get(state) : null;
  if (state) pendingStates.delete(state);
  return !!entry && entry.platform === platform && entry.expires >= Date.now();
}

router.get('/:platform', (req, res) => {
  const name = req.params.platform;
  const platform = platforms[name];
  if (!platform) return res.status(404).send('Plataforma desconocida');
  const state = crypto.randomBytes(16).toString('hex');
  rememberState(state, name);
  res.redirect(platform.buildAuthUrl(state));
});

router.get('/:platform/callback', async (req, res) => {
  const name = req.params.platform;
  const platform = platforms[name];
  if (!platform) return res.status(404).send('Plataforma desconocida');
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`Error de autorizacion: ${error}`);
  if (!consumeState(state, name)) {
    return res.status(400).send('Estado de autorizacion invalido o expirado. Intenta conectar de nuevo desde Confluence.');
  }
  try {
    if (name === 'kick') {
      await platform.exchangeCode(code, state);
    } else {
      await platform.exchangeCode(code);
    }
    chatManager.connectPlatform(name);
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Confluence</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/style.css" />
        <style>
          body { display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; }
          .callback-card { max-width: 260px; }
          .callback-brand { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 28px; opacity: 0.7; }
          .callback-brand .mark { width: 12px; height: 12px; border-radius: 4px; background: linear-gradient(135deg, var(--accent), var(--twitch) 60%, var(--youtube)); }
          .callback-brand span { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
          .checkmark { width: 52px; height: 52px; border-radius: 50%; background: var(--accent-dim); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px; }
          h2 { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0 0 6px; }
          p { color: var(--muted); font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="callback-card">
          <div class="callback-brand"><div class="mark"></div><span>Confluence Suite</span></div>
          <div class="checkmark">✓</div>
          <h2>${displayName} conectado</h2>
          <p id="status-text">Cerrando esta ventana en 3 segundos...</p>
        </div>
        <script>
          setTimeout(() => {
            try { window.close(); } catch (e) {}
            document.getElementById('status-text').textContent = 'Ya puedes cerrar esta pestaña y volver al dock de OBS.';
          }, 3000);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Fallo al conectar ${name}: ${err.message}`);
  }
});

router.post('/:platform/disconnect', (req, res) => {
  const name = req.params.platform;
  if (!platforms[name]) return res.status(404).json({ error: 'Plataforma desconocida' });
  tokenStore.clear(name);
  chatManager.disconnectPlatform(name);
  res.json({ ok: true });
});

module.exports = router;
