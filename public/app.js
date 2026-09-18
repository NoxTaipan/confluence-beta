const STORAGE_KEY = 'confluence-draft';
const selected = { twitchGameId: null, kickCategoryId: null, twitchGameName: null, kickCategoryName: null };

// Cacheado para poder re-renderizar los textos de conectar/desconectar cuando
// cambia el idioma, sin tener que volver a pedir el estado al servidor.
let lastStatus = {};

function renderStatus() {
  document.querySelectorAll('.platform-pill').forEach((pill) => {
    const platform = pill.dataset.platform;
    const connected = !!lastStatus[platform];
    pill.dataset.connected = connected;
    pill.querySelector('.state').textContent = connected ? t('state_disconnect') : t('state_connect');
  });
}

async function loadStatus() {
  const res = await fetch('/api/status');
  lastStatus = await res.json();
  renderStatus();
}

window.addEventListener('confluence-lang-changed', renderStatus);

// Mientras el popup de OAuth siga abierto no sabemos cuanto va a tardar el
// usuario en autorizar - se sondea el estado cada segundo hasta que lo
// cierre (con un limite de 2 minutos por si el navegador bloqueo el popup
// y nunca llega a "closed").
function pollWhileOpen(popup) {
  const interval = setInterval(() => {
    loadStatus();
    if (!popup || popup.closed) clearInterval(interval);
  }, 1000);
  setTimeout(() => clearInterval(interval), 120000);
}

document.querySelectorAll('.platform-pill').forEach((pill) => {
  const togglePill = async () => {
    const platform = pill.dataset.platform;
    if (pill.dataset.connected === 'true') {
      await fetch(`/auth/${platform}/disconnect`, { method: 'POST' });
      loadStatus();
    } else {
      const popup = window.open(`/auth/${platform}`, '_blank', 'width=500,height=700');
      pollWhileOpen(popup);
    }
  };
  pill.addEventListener('click', togglePill);
  pill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePill();
    }
  });
});

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function searchCategories(platform, query) {
  const endpoint = platform === 'twitch' ? '/api/search/twitch-games' : '/api/search/kick-categories';
  const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

document.querySelectorAll('.category-row[data-platform="twitch"], .category-row[data-platform="kick"]').forEach((row) => {
  const platform = row.dataset.platform;
  const input = row.querySelector('.category-search');
  const resultsBox = row.querySelector('.results');

  const runSearch = debounce(async (query) => {
    if (!query) {
      resultsBox.hidden = true;
      return;
    }
    const items = await searchCategories(platform, query);
    resultsBox.innerHTML = '';
    items.forEach((item) => {
      const div = document.createElement('div');
      div.textContent = item.name;
      div.addEventListener('click', () => {
        if (platform === 'twitch') {
          selected.twitchGameId = item.id;
          selected.twitchGameName = item.name;
        }
        if (platform === 'kick') {
          selected.kickCategoryId = item.id;
          selected.kickCategoryName = item.name;
        }
        setChip(platform, item.name);
        resultsBox.hidden = true;
        input.value = '';
      });
      resultsBox.appendChild(div);
    });
    resultsBox.hidden = items.length === 0;
  }, 350);

  input.addEventListener('input', () => runSearch(input.value.trim()));
});

function currentPayload() {
  const title = document.getElementById('title').value.trim();
  const tags = document
    .getElementById('tags')
    .value.split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    title: title || undefined,
    tags: tags.length ? tags : undefined,
    twitchGameId: selected.twitchGameId || undefined,
    kickCategoryId: selected.kickCategoryId || undefined,
    youtubeCategoryId: document.getElementById('youtube-category').value
  };
}

function logResult(platform, ok, error) {
  const log = document.getElementById('log');
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<span>${platform}</span><span class="${ok ? 'ok' : 'fail'}">${ok ? 'OK' : error}</span>`;
  log.prepend(row);
}

async function pushOne(platform) {
  const res = await fetch(`/api/push/${platform}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentPayload())
  });
  const data = await res.json();
  logResult(platform, data.ok, data.error);
}

document.querySelectorAll('[data-push]').forEach((btn) => {
  btn.addEventListener('click', () => pushOne(btn.dataset.push));
});

document.getElementById('push-all').addEventListener('click', async () => {
  const res = await fetch('/api/push-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentPayload())
  });
  const data = await res.json();
  Object.entries(data).forEach(([platform, r]) => logResult(platform, r.ok, r.error));
});

function setChip(platform, name) {
  const row = document.querySelector(`.category-row[data-platform="${platform}"]`);
  const chip = row.querySelector('.selected-chip');
  if (name) {
    chip.hidden = false;
    chip.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = name;
    const remove = document.createElement('span');
    remove.className = 'chip-remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      if (platform === 'twitch') {
        selected.twitchGameId = null;
        selected.twitchGameName = null;
      }
      if (platform === 'kick') {
        selected.kickCategoryId = null;
        selected.kickCategoryName = null;
      }
      setChip(platform, null);
    });
    chip.append(label, remove);
  } else {
    chip.hidden = true;
    chip.innerHTML = '';
  }
}

function saveDraft() {
  const draft = {
    title: document.getElementById('title').value,
    tags: document.getElementById('tags').value,
    youtubeCategoryId: document.getElementById('youtube-category').value,
    twitchGameId: selected.twitchGameId,
    twitchGameName: selected.twitchGameName,
    kickCategoryId: selected.kickCategoryId,
    kickCategoryName: selected.kickCategoryName
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // localStorage no disponible (ej. vista privada) - ignorar
  }
  const log = document.getElementById('log');
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<span>${t('log_saved')}</span><span class="ok">OK</span>`;
  log.prepend(row);
}

function restoreDraft() {
  let draft;
  try {
    draft = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    draft = null;
  }
  if (!draft) return;
  document.getElementById('title').value = draft.title || '';
  document.getElementById('tags').value = draft.tags || '';
  if (draft.youtubeCategoryId) document.getElementById('youtube-category').value = draft.youtubeCategoryId;
  selected.twitchGameId = draft.twitchGameId || null;
  selected.twitchGameName = draft.twitchGameName || null;
  selected.kickCategoryId = draft.kickCategoryId || null;
  selected.kickCategoryName = draft.kickCategoryName || null;
  setChip('twitch', selected.twitchGameName);
  setChip('kick', selected.kickCategoryName);
}

function clearAll() {
  document.getElementById('title').value = '';
  document.getElementById('tags').value = '';
  document.getElementById('youtube-category').selectedIndex = 0;
  selected.twitchGameId = null;
  selected.twitchGameName = null;
  selected.kickCategoryId = null;
  selected.kickCategoryName = null;
  setChip('twitch', null);
  setChip('kick', null);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}

document.getElementById('save-all').addEventListener('click', saveDraft);
document.getElementById('clear-all').addEventListener('click', clearAll);

restoreDraft();
loadStatus();
