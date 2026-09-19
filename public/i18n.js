// Soporte bilingue (ES/EN) compartido por los docks de Confluence. El idioma
// elegido persiste en localStorage y aplica a todos los docks abiertos (cada
// uno vuelve a leerlo en su propio DOMContentLoaded).
const I18N_KEY = 'confluence-lang';

const I18N_DICT = {
  es: {
    aria_toggle_twitch: 'Conectar o desconectar Twitch',
    aria_toggle_youtube: 'Conectar o desconectar YouTube',
    aria_toggle_kick: 'Conectar o desconectar Kick',
    state_connect: 'conectar',
    state_disconnect: 'desconectar',
    legend_shared_info: 'Info compartida',
    label_title: 'Titulo',
    placeholder_title: 'Titulo del stream',
    label_tags: 'Tags (separados por coma)',
    placeholder_tags: 'español, fps, ranked',
    legend_category: 'Categoria por plataforma',
    placeholder_search_game: 'Buscar juego...',
    placeholder_search_category: 'Buscar categoria...',
    btn_publish_all: 'Publicar a las 3',
    btn_only_twitch: 'Solo Twitch',
    btn_only_youtube: 'Solo YouTube',
    btn_only_kick: 'Solo Kick',
    btn_save_all: 'Guardar todo',
    btn_clear_all: 'Limpiar todo',
    btn_clear_log: 'Limpiar log',
    log_saved: 'Guardado',
    btn_clip_twitch: 'Crear clip (Twitch)',
    btn_clip_twitch_working: 'Creando clip...',
    aria_viewers_toggle_twitch: 'Mostrar u ocultar el contador de viewers de Twitch',
    aria_viewers_toggle_youtube: 'Mostrar u ocultar el contador de viewers de YouTube',
    aria_viewers_toggle_kick: 'Mostrar u ocultar el contador de viewers de Kick',
    aria_settings: 'Configuracion',
    settings_mentions: 'Resaltar menciones',
    placeholder_mention: 'ej: noxtaipan',
    settings_clear_chat: 'Limpiar chat',
    clear_all_neutral: 'Todo',
    aria_emojis: 'Emojis',
    placeholder_message: 'Escribe un mensaje...',
    aria_send: 'Enviar',
    target_all: 'Todos'
  },
  en: {
    aria_toggle_twitch: 'Connect or disconnect Twitch',
    aria_toggle_youtube: 'Connect or disconnect YouTube',
    aria_toggle_kick: 'Connect or disconnect Kick',
    state_connect: 'connect',
    state_disconnect: 'disconnect',
    legend_shared_info: 'Shared info',
    label_title: 'Title',
    placeholder_title: 'Stream title',
    label_tags: 'Tags (comma-separated)',
    placeholder_tags: 'spanish, fps, ranked',
    legend_category: 'Category per platform',
    placeholder_search_game: 'Search game...',
    placeholder_search_category: 'Search category...',
    btn_publish_all: 'Publish to all 3',
    btn_only_twitch: 'Only Twitch',
    btn_only_youtube: 'Only YouTube',
    btn_only_kick: 'Only Kick',
    btn_save_all: 'Save all',
    btn_clear_all: 'Clear all',
    btn_clear_log: 'Clear log',
    log_saved: 'Saved',
    btn_clip_twitch: 'Create clip (Twitch)',
    btn_clip_twitch_working: 'Creating clip...',
    aria_viewers_toggle_twitch: 'Show or hide the Twitch viewer count',
    aria_viewers_toggle_youtube: 'Show or hide the YouTube viewer count',
    aria_viewers_toggle_kick: 'Show or hide the Kick viewer count',
    aria_settings: 'Settings',
    settings_mentions: 'Highlight mentions',
    placeholder_mention: 'e.g. noxtaipan',
    settings_clear_chat: 'Clear chat',
    clear_all_neutral: 'All',
    aria_emojis: 'Emojis',
    placeholder_message: 'Type a message...',
    aria_send: 'Send',
    target_all: 'All'
  }
};

function confluenceLang() {
  try {
    return localStorage.getItem(I18N_KEY) || 'es';
  } catch {
    return 'es';
  }
}

function t(key) {
  const lang = confluenceLang();
  return (I18N_DICT[lang] && I18N_DICT[lang][key]) ?? I18N_DICT.es[key] ?? key;
}

function applyI18n() {
  const lang = confluenceLang();
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('.lang-toggle [data-lang]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  });

  window.dispatchEvent(new CustomEvent('confluence-lang-changed', { detail: { lang } }));
}

function setConfluenceLang(lang) {
  try {
    localStorage.setItem(I18N_KEY, lang);
  } catch {
    // localStorage no disponible - el cambio de idioma no persiste, no bloqueante
  }
  applyI18n();
}

document.addEventListener('DOMContentLoaded', () => {
  applyI18n();
  document.querySelectorAll('.lang-toggle [data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setConfluenceLang(btn.dataset.lang));
  });
});
