const EventEmitter = require('events');
const twitch = require('../twitch');
const kick = require('../kick');
const youtube = require('../youtube');
const twitchChat = require('./twitch-chat');
const kickChat = require('./kick-chat');
const youtubeChat = require('./youtube-chat');

const bus = new EventEmitter();
bus.setMaxListeners(0);

const CLIENTS = { twitch: twitchChat, youtube: youtubeChat, kick: kickChat };
const ACCOUNTS = { twitch, youtube, kick };

const status = { twitch: 'offline', youtube: 'offline', kick: 'offline' };
const stoppers = { twitch: null, youtube: null, kick: null };

let refCount = 0;

function emitMessage(message) {
  bus.emit('message', { type: 'message', ...message });
}

function setStatus(platform, value) {
  if (status[platform] === value) return;
  status[platform] = value;
  bus.emit('message', { type: 'status', platform, status: value });
}

function startPlatform(platform) {
  if (stoppers[platform]) return; // ya corriendo
  stoppers[platform] = CLIENTS[platform].start(emitMessage, (s) => setStatus(platform, s));
}

function stopPlatform(platform) {
  if (stoppers[platform]) {
    stoppers[platform]();
    stoppers[platform] = null;
  }
  setStatus(platform, 'offline');
}

// Las 3 conexiones (Twitch IRC, Kick Pusher, YouTube polling) solo se abren
// mientras haya al menos un dock de chat abierto - nada corriendo de fondo
// si nadie esta mirando el chat.
function startUpstreams() {
  Object.keys(CLIENTS).forEach((platform) => {
    if (ACCOUNTS[platform].isConnected()) startPlatform(platform);
    else setStatus(platform, 'offline');
  });
}

function stopUpstreams() {
  Object.keys(CLIENTS).forEach(stopPlatform);
}

// Se llaman desde /auth/:platform (conectar/desconectar) para que el chat
// reaccione al instante sin tener que cerrar y volver a abrir el dock.
function connectPlatform(platform) {
  if (refCount > 0 && CLIENTS[platform]) startPlatform(platform);
}

function disconnectPlatform(platform) {
  if (CLIENTS[platform]) stopPlatform(platform);
}

function subscribe(listener) {
  // snapshot del estado actual para que el dock recien abierto no se quede
  // en blanco esperando el proximo cambio
  Object.entries(status).forEach(([platform, value]) => {
    listener({ type: 'status', platform, status: value });
  });

  bus.on('message', listener);
  refCount += 1;
  if (refCount === 1) startUpstreams();

  return () => {
    bus.off('message', listener);
    refCount -= 1;
    if (refCount <= 0) {
      refCount = 0;
      stopUpstreams();
    }
  };
}

module.exports = { subscribe, connectPlatform, disconnectPlatform };
