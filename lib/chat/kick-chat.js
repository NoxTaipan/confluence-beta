const kick = require('../kick');
const seventv = require('./seventv');
const { buildKickSegments } = require('./emote-render');

// App key publico que usa el propio sitio kick.com para su chat en vivo -
// no hay endpoint oficial (docs.kick.com) para leer chat en tiempo real sin
// exponer un webhook publico, asi que se usa el mismo canal Pusher que el
// navegador de cualquier espectador usaria al abrir el chat.
const PUSHER_KEY = '32cbd69e4b950bf97679';
const PUSHER_URL = `wss://ws-us2.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
const RECONNECT_MS = 3000;
const LOOKUP_RETRY_MS = 15000;

async function fetchChannelInfo() {
  const tokenData = await kick.ensureToken();
  const res = await fetch('https://api.kick.com/public/v1/channels', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!res.ok) throw new Error(`Kick /channels failed: ${res.status}`);
  const data = await res.json();
  const channel = data.data[0];

  const infoRes = await fetch(`https://kick.com/api/v2/channels/${channel.slug}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!infoRes.ok) throw new Error(`Kick channel info failed: ${infoRes.status}`);
  const info = await infoRes.json();
  return { chatroomId: info.chatroom.id, broadcasterUserId: channel.broadcaster_user_id };
}

// El chatroom id y el mapa de emotes 7TV se cachean una vez resueltos - no
// cambian entre reconexiones del websocket, asi que no hace falta repetir
// esas llamadas HTTP cada vez.
function start(emit, onStatus) {
  let stopped = false;
  let ws = null;
  let cachedChatroomId = null;
  let emoteMap = {};

  async function connect() {
    if (stopped) return;
    onStatus('connecting');

    if (!cachedChatroomId) {
      try {
        const info = await fetchChannelInfo();
        cachedChatroomId = info.chatroomId;
        emoteMap = await seventv.fetchEmoteMap('kick', info.broadcasterUserId);
      } catch {
        onStatus('offline');
        if (!stopped) setTimeout(connect, LOOKUP_RETRY_MS);
        return;
      }
    }

    ws = new WebSocket(PUSHER_URL);

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.event === 'pusher:connection_established') {
        ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `chatrooms.${cachedChatroomId}.v2` } }));
        onStatus('online');
      } else if (msg.event === 'pusher:ping') {
        ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      } else if (msg.event === 'App\\Events\\ChatMessageEvent') {
        let data;
        try {
          data = JSON.parse(msg.data);
        } catch {
          return;
        }
        const text = data.content || '';
        emit({
          platform: 'kick',
          id: data.id || `kk-${Date.now()}-${Math.random()}`,
          author: data.sender?.username || 'unknown',
          color: data.sender?.identity?.color || null,
          text,
          segments: buildKickSegments(text, emoteMap),
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
