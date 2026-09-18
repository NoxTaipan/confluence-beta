const youtube = require('../youtube');

const OFFLINE_RECHECK_MS = 60000; // no hay stream en vivo - reintentar sin apurarse
const ERROR_RETRY_MS = 15000;
const MIN_POLL_MS = 5000; // minimo que YouTube permite entre polls

function start(emit, onStatus) {
  let stopped = false;
  let timer = null;
  let liveChatId = null;
  let pageToken;

  function schedule(fn, ms) {
    if (stopped) return;
    timer = setTimeout(fn, ms);
  }

  async function tick() {
    if (stopped) return;
    try {
      const tokenData = await youtube.ensureToken();

      if (!liveChatId) {
        onStatus('connecting');
        const broadcast = await youtube.getActiveBroadcast();
        liveChatId = broadcast?.snippet?.liveChatId || null;
        if (!liveChatId) {
          onStatus('offline');
          schedule(tick, OFFLINE_RECHECK_MS);
          return;
        }
      }

      const params = new URLSearchParams({ liveChatId, part: 'snippet,authorDetails' });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?${params}`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!res.ok) {
        // el chat/stream termino, o el id ya no es valido - reintentar desde cero
        console.error(`[youtube-chat] liveChatMessages failed: ${res.status} ${await res.text()}`);
        liveChatId = null;
        pageToken = undefined;
        onStatus('offline');
        schedule(tick, OFFLINE_RECHECK_MS);
        return;
      }

      onStatus('online');
      const data = await res.json();
      pageToken = data.nextPageToken;

      for (const item of data.items || []) {
        emit({
          platform: 'youtube',
          id: item.id,
          author: item.authorDetails?.displayName || 'unknown',
          color: null,
          text: item.snippet?.displayMessage || '',
          timestamp: Date.now()
        });
      }

      schedule(tick, Math.max(data.pollingIntervalMillis || 8000, MIN_POLL_MS));
    } catch (err) {
      console.error(`[youtube-chat] tick failed: ${err.message}`);
      onStatus('offline');
      schedule(tick, ERROR_RETRY_MS);
    }
  }

  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

module.exports = { start };
