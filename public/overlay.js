// Overlay de solo lectura para OBS Browser Source - mismo SSE que el dock
// de control (Confluence Chat) pero sin composer, filtros ni ajustes.
// Configuracion via query string en la URL de la Browser Source, ya que
// un overlay dentro de la escena no tiene UI propia para eso:
//   ?limit=8            cantidad maxima de mensajes visibles a la vez
//   ?fade=20            segundos hasta que un mensaje se desvanece solo (0 = nunca)
//   ?platforms=twitch,kick   cuales plataformas mostrar (default: las 3)
//   ?position=bottom-left    bottom-left | bottom-right | top-left | top-right

const params = new URLSearchParams(location.search);

const MAX_MESSAGES = Math.max(1, parseInt(params.get('limit'), 10) || 8);
const fadeParam = params.get('fade');
const fadeSeconds = fadeParam === null ? 20 : parseInt(fadeParam, 10);
const FADE_MS = Math.max(0, Number.isFinite(fadeSeconds) ? fadeSeconds : 20) * 1000;
const ALLOWED_PLATFORMS = (params.get('platforms') || 'twitch,youtube,kick')
  .split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);
const POSITION = params.get('position') || 'bottom-left';

const feed = document.getElementById('overlay-feed');
feed.classList.add(`pos-${POSITION}`);

function appendMessage(msg) {
  if (!ALLOWED_PLATFORMS.includes(msg.platform)) return;

  const row = document.createElement('div');
  row.className = 'overlay-msg';
  row.dataset.platform = msg.platform;

  const icon = document.createElement('span');
  icon.className = 'platform-icon';
  icon.innerHTML = PLATFORM_ICONS[msg.platform] || '';

  const author = document.createElement('span');
  author.className = 'author';
  author.textContent = msg.author;
  if (msg.color) author.style.color = msg.color;

  const text = document.createElement('span');
  text.className = 'text';

  if (Array.isArray(msg.segments)) {
    msg.segments.forEach((seg) => {
      if (seg.type === 'emote') {
        const img = document.createElement('img');
        img.className = 'emote-img';
        img.src = seg.url;
        img.alt = seg.name;
        img.title = seg.name;
        text.appendChild(img);
      } else {
        text.appendChild(document.createTextNode(seg.value));
      }
    });
  } else {
    text.textContent = msg.text;
  }

  row.append(icon, author, text);
  feed.appendChild(row);

  while (feed.children.length > MAX_MESSAGES) {
    feed.firstChild.remove();
  }

  if (FADE_MS > 0) {
    setTimeout(() => {
      row.classList.add('fade-out');
      row.addEventListener('animationend', () => row.remove(), { once: true });
    }, FADE_MS);
  }
}

function connect() {
  const source = new EventSource('/api/chat/stream');
  source.onmessage = (ev) => {
    let data;
    try {
      data = JSON.parse(ev.data);
    } catch {
      return; // keepalive u otro dato no valido - ignorar
    }
    if (data.type === 'message') appendMessage(data);
  };
  // EventSource reintenta la conexion solo (comportamiento nativo del spec).
}

connect();
