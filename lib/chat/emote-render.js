// Helpers compartidos para convertir texto crudo de chat en una lista de
// "segments" ({type:'text',value} | {type:'emote',url,name}) - el cliente
// arma el DOM directo desde esto (nunca innerHTML con texto de usuario).

function textToSegments(text, emoteMap) {
  if (!text) return [];
  const parts = text.split(/(\s+)/).filter((p) => p.length > 0);
  return parts.map((part) => {
    if (/^\s+$/.test(part)) return { type: 'text', value: part };
    const url = emoteMap[part];
    return url ? { type: 'emote', url, name: part } : { type: 'text', value: part };
  });
}

// Twitch: tag IRC "emotes=id:start-end,start2-end2/id2:start-end" - las
// posiciones son offsets de unidades UTF-16 sobre el texto original, que
// coincide 1:1 con la indexacion de strings de JS.
function parseTwitchEmoteTag(tag) {
  if (!tag) return [];
  const ranges = [];
  tag.split('/').forEach((part) => {
    const [id, positions] = part.split(':');
    if (!id || !positions) return;
    positions.split(',').forEach((pos) => {
      const [start, end] = pos.split('-').map(Number);
      if (Number.isFinite(start) && Number.isFinite(end)) ranges.push({ id, start, end });
    });
  });
  return ranges.sort((a, b) => a.start - b.start);
}

function buildTwitchSegments(text, emotesTag, thirdPartyMap) {
  const ranges = parseTwitchEmoteTag(emotesTag);
  if (ranges.length === 0) return textToSegments(text, thirdPartyMap);

  const segments = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue; // rangos superpuestos/invalidos - ignorar
    if (range.start > cursor) {
      segments.push(...textToSegments(text.slice(cursor, range.start), thirdPartyMap));
    }
    segments.push({
      type: 'emote',
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${range.id}/default/dark/1.0`,
      name: text.slice(range.start, range.end + 1)
    });
    cursor = range.end + 1;
  }
  if (cursor < text.length) {
    segments.push(...textToSegments(text.slice(cursor), thirdPartyMap));
  }
  return segments;
}

// Kick: los emotes nativos vienen embebidos como texto literal
// "[emote:12345:Nombre]" dentro del mensaje.
const KICK_EMOTE_PATTERN = /\[emote:(\d+):([^\]]+)\]/g;

function buildKickSegments(text, thirdPartyMap) {
  KICK_EMOTE_PATTERN.lastIndex = 0;
  let match;
  let lastIndex = 0;
  const segments = [];

  while ((match = KICK_EMOTE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(...textToSegments(text.slice(lastIndex, match.index), thirdPartyMap));
    }
    segments.push({
      type: 'emote',
      url: `https://files.kick.com/emotes/${match[1]}/fullsize`,
      name: match[2]
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push(...textToSegments(text.slice(lastIndex), thirdPartyMap));
  }
  return segments;
}

module.exports = { buildTwitchSegments, buildKickSegments };
