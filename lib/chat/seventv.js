// Cliente minimo de la API publica de 7TV (https://7tv.io) - sin API key,
// de solo lectura. Si falla (canal sin 7TV configurado, servicio caido,
// etc.) se degrada a un mapa vacio sin romper el resto del chat.

function buildMap(emotes) {
  const map = {};
  for (const emote of emotes || []) {
    const host = emote?.data?.host;
    if (!host || !host.url) continue;
    const file = (host.files || []).find((f) => f.name === '1x.webp') || (host.files || [])[0];
    if (!file) continue;
    map[emote.name] = `https:${host.url}/${file.name}`;
  }
  return map;
}

async function fetchChannelEmotes(platform, platformUserId) {
  try {
    const res = await fetch(`https://7tv.io/v3/users/${platform}/${platformUserId}`);
    if (!res.ok) return {};
    const data = await res.json();
    return buildMap(data.emote_set?.emotes);
  } catch {
    return {};
  }
}

async function fetchGlobalEmotes() {
  try {
    const res = await fetch('https://7tv.io/v3/emote-sets/global');
    if (!res.ok) return {};
    const data = await res.json();
    return buildMap(data.emotes);
  } catch {
    return {};
  }
}

// Set del canal + global, canal gana en caso de choque de nombres.
async function fetchEmoteMap(platform, platformUserId) {
  const [global, channel] = await Promise.all([fetchGlobalEmotes(), fetchChannelEmotes(platform, platformUserId)]);
  return { ...global, ...channel };
}

module.exports = { fetchEmoteMap };
