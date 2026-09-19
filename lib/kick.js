const crypto = require('crypto');
const tokenStore = require('./token-store');

// NOTA: API publica de Kick es relativamente nueva. Verificar endpoints/scopes
// contra https://docs.kick.com si algo de esto deja de funcionar.

const CLIENT_ID = process.env.KICK_CLIENT_ID;
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;
const REDIRECT_URI = process.env.KICK_REDIRECT_URI;
const SCOPE = 'user:read channel:read channel:write chat:write';

const pkceByState = new Map();

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildAuthUrl(state) {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  pkceByState.set(state, verifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state
  });
  return `https://id.kick.com/oauth/authorize?${params}`;
}

async function exchangeCode(code, state) {
  const verifier = pkceByState.get(state);
  pkceByState.delete(state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });
  const res = await fetch('https://id.kick.com/oauth/token', { method: 'POST', body: params });
  if (!res.ok) throw new Error(`Kick token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
  tokenStore.set('kick', tokenData);
  return tokenData;
}

async function refresh(tokenData) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token
  });
  const res = await fetch('https://id.kick.com/oauth/token', { method: 'POST', body: params });
  if (!res.ok) throw new Error(`Kick token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const updated = {
    ...tokenData,
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokenData.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000
  };
  tokenStore.set('kick', updated);
  return updated;
}

function ensureToken() {
  return tokenStore.ensureFresh('kick', refresh);
}

async function searchCategories(query) {
  const tokenData = await ensureToken();
  const params = new URLSearchParams({ limit: '10' });
  if (query) params.append('name', query);
  const res = await fetch(`https://api.kick.com/public/v2/categories?${params}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!res.ok) throw new Error(`Kick category search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const items = data.data || [];
  return items.map((c) => ({ id: c.id, name: c.name }));
}

async function updateChannelInfo({ title, categoryId }) {
  const tokenData = await ensureToken();
  const body = {};
  if (title) body.stream_title = title;
  if (categoryId) body.category_id = categoryId;
  const res = await fetch('https://api.kick.com/public/v1/channels', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Kick channel update failed: ${res.status} ${await res.text()}`);
  return { ok: true };
}

async function sendChatMessage(message) {
  const tokenData = await ensureToken();
  const channelsRes = await fetch('https://api.kick.com/public/v1/channels', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!channelsRes.ok) throw new Error(`Kick /channels failed: ${channelsRes.status} ${await channelsRes.text()}`);
  const channelsData = await channelsRes.json();
  const broadcasterUserId = channelsData.data[0].broadcaster_user_id;

  const res = await fetch('https://api.kick.com/public/v1/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'user', content: message, broadcaster_user_id: broadcasterUserId })
  });
  if (!res.ok) throw new Error(`Kick send message failed: ${res.status} ${await res.text()}`);
  return { ok: true };
}

// GET /public/v1/channels trae el viewer count actual en data[0].stream.viewer_count
// (0 si el streamer opto por no compartirlo, segun el schema publico de Kick).
async function getViewerCount() {
  const tokenData = await ensureToken();
  const res = await fetch('https://api.kick.com/public/v1/channels', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!res.ok) throw new Error(`Kick /channels failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const stream = data.data[0]?.stream;
  if (!stream || !stream.is_live) return null;
  return stream.viewer_count ?? null;
}

function isConnected() {
  return !!tokenStore.get('kick');
}

module.exports = {
  buildAuthUrl,
  exchangeCode,
  searchCategories,
  updateChannelInfo,
  isConnected,
  ensureToken,
  sendChatMessage,
  getViewerCount
};
