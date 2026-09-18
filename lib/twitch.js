const tokenStore = require('./token-store');

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.TWITCH_REDIRECT_URI;
const SCOPE = 'channel:manage:broadcast user:write:chat';

function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    state
  });
  return `https://id.twitch.tv/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  });
  const res = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: params });
  if (!res.ok) throw new Error(`Twitch token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const broadcasterId = await fetchUserId(data.access_token);
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    broadcaster_id: broadcasterId
  };
  tokenStore.set('twitch', tokenData);
  return tokenData;
}

async function refresh(tokenData) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token
  });
  const res = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: params });
  if (!res.ok) throw new Error(`Twitch token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const updated = {
    ...tokenData,
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokenData.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
  tokenStore.set('twitch', updated);
  return updated;
}

function ensureToken() {
  return tokenStore.ensureFresh('twitch', refresh);
}

async function fetchUserId(accessToken) {
  const res = await fetch('https://api.twitch.tv/helix/users', {
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Twitch /users failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].id;
}

async function searchGames(query) {
  const tokenData = await ensureToken();
  const res = await fetch(`https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}&first=10`, {
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!res.ok) throw new Error(`Twitch category search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data.map((g) => ({ id: g.id, name: g.name, boxArtUrl: g.box_art_url }));
}

async function updateChannelInfo({ title, gameId, tags }) {
  const tokenData = await ensureToken();
  const body = {};
  if (title) body.title = title;
  if (gameId) body.game_id = gameId;
  if (tags && tags.length) body.tags = tags;
  const res = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${tokenData.broadcaster_id}`, {
    method: 'PATCH',
    headers: {
      'Client-Id': CLIENT_ID,
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Twitch channel update failed: ${res.status} ${await res.text()}`);
  return { ok: true };
}

async function sendChatMessage(message) {
  const tokenData = await ensureToken();
  const res = await fetch('https://api.twitch.tv/helix/chat/messages', {
    method: 'POST',
    headers: {
      'Client-Id': CLIENT_ID,
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      broadcaster_id: tokenData.broadcaster_id,
      sender_id: tokenData.broadcaster_id,
      message
    })
  });
  if (!res.ok) throw new Error(`Twitch send message failed: ${res.status} ${await res.text()}`);
  return { ok: true };
}

function isConnected() {
  return !!tokenStore.get('twitch');
}

module.exports = { buildAuthUrl, exchangeCode, searchGames, updateChannelInfo, isConnected, ensureToken, sendChatMessage };
