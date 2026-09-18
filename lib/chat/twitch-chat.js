const twitch = require('../twitch');
const seventv = require('./seventv');
const { buildTwitchSegments } = require('./emote-render');

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const RECONNECT_MS = 3000;
const LOOKUP_RETRY_MS = 15000;

async function fetchChannelInfo() {
  const tokenData = await twitch.ensureToken();
  const res = await fetch(`https://api.twitch.tv/helix/users?id=${tokenData.broadcaster_id}`, {
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!res.ok) throw new Error(`Twitch /users failed: ${res.status}`);
  const data = await res.json();
  return { login: data.data[0].login, broadcasterId: tokenData.broadcaster_id };
}

function parseTags(tagStr) {
  const tags = {};
  tagStr.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    tags[pair.slice(0, idx)] = pair.slice(idx + 1);
  });
  return tags;
}

// Conexion anonima de solo lectura (justinfanNNNN) - Twitch permite leer
// el chat de cualquier canal sin token, solo hace falta el login del canal
// (que se cachea junto con el mapa de emotes 7TV una vez resueltos, para no
// repetir esas consultas en cada reconexion del websocket).
function start(emit, onStatus) {
  let stopped = false;
  let ws = null;
  let cachedLogin = null;
  let emoteMap = {};

  async function connect() {
    if (stopped) return;
    onStatus('connecting');

    if (!cachedLogin) {
      try {
        const info = await fetchChannelInfo();
        cachedLogin = info.login;
        emoteMap = await seventv.fetchEmoteMap('twitch', info.broadcasterId);
      } catch {
        onStatus('offline');
        if (!stopped) setTimeout(connect, LOOKUP_RETRY_MS);
        return;
      }
    }

    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    ws.addEventListener('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 90000)}`);
      ws.send(`JOIN #${cachedLogin}`);
      onStatus('online');
    });

    ws.addEventListener('message', (ev) => {
      const lines = String(ev.data).split('\r\n').filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('PING')) {
          ws.send('PONG :tmi.twitch.tv');
          continue;
        }
        const match = line.match(/^(?:@(\S+) )?:(\S+)!\S+ PRIVMSG #\S+ :(.*)$/);
        if (!match) continue;
        const [, tagStr, userPart, text] = match;
        const tags = tagStr ? parseTags(tagStr) : {};
        emit({
          platform: 'twitch',
          id: tags.id || `tw-${Date.now()}-${Math.random()}`,
          author: tags['display-name'] || userPart,
          color: tags.color || null,
          text,
          segments: buildTwitchSegments(text, tags.emotes, emoteMap),
          timestamp: Date.now()
        });
      }
    });

    ws.addEventListener('close', () => {
      if (stopped) return;
      onStatus('connecting');
      setTimeout(connect, RECONNECT_MS);
    });
    ws.addEventListener('error', () => {});
  }

  connect();

  return () => {
    stopped = true;
    if (ws) ws.close();
  };
}

module.exports = { start };
