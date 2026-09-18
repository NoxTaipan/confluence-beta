const tokenStore = require('./token-store');

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const SCOPE = 'https://www.googleapis.com/auth/youtube';

function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
  if (!res.ok) throw new Error(`YouTube token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
  tokenStore.set('youtube', tokenData);
  return tokenData;
}

async function refresh(tokenData) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
  if (!res.ok) throw new Error(`YouTube token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const updated = {
    ...tokenData,
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
  tokenStore.set('youtube', updated);
  return updated;
}

function ensureToken() {
  return tokenStore.ensureFresh('youtube', refresh);
}

async function getActiveBroadcast() {
  const tokenData = await ensureToken();
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all',
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );
  if (!res.ok) throw new Error(`YouTube liveBroadcasts failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.items[0] || null;
}

async function updateChannelInfo({ title, categoryId, tags }) {
  const tokenData = await ensureToken();
  const broadcast = await getActiveBroadcast();
  if (!broadcast) throw new Error('No hay ningun stream de YouTube en vivo ahora mismo.');
  const snippet = { ...broadcast.snippet };
  if (title) snippet.title = title;
  if (categoryId) snippet.categoryId = categoryId;
  if (tags && tags.length) snippet.tags = tags;
  const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: broadcast.id, snippet })
  });
  if (!res.ok) throw new Error(`YouTube video update failed: ${res.status} ${await res.text()}`);
  return { ok: true };
}

async function sendChatMessage(message) {
  const tokenData = await ensureToken();
  const broadcast = await getActiveBroadcast();
  if (!broadcast) throw new Error('No hay ningun stream de YouTube en vivo ahora mismo.');
  const liveChatId = broadcast.snippet.liveChatId;
  const res = await fetch('https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        liveChatId,
        type: 'textMessageEvent',
        textMessageDetails: { messageText: message }
      }
    })
  });
  if (!res.ok) throw new Error(`YouTube send message failed: ${res.status} ${await res.text()}`);
  return { ok: true };
}

function isConnected() {
  return !!tokenStore.get('youtube');
}

module.exports = { buildAuthUrl, exchangeCode, updateChannelInfo, isConnected, ensureToken, getActiveBroadcast, sendChatMessage };
