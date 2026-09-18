const express = require('express');
const chatManager = require('../lib/chat/manager');
const twitch = require('../lib/twitch');
const youtube = require('../lib/youtube');
const kick = require('../lib/kick');

const router = express.Router();

const SENDERS = { twitch, youtube, kick };

router.get('/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  const send = (message) => res.write(`data: ${JSON.stringify(message)}\n\n`);
  const keepAlive = setInterval(() => res.write(':\n\n'), 30000);

  const unsubscribe = chatManager.subscribe(send);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

router.post('/send', async (req, res) => {
  const { message, platforms } = req.body || {};
  if (!message || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ ok: false, error: 'Falta message o platforms' });
  }

  const results = {};
  await Promise.allSettled(
    platforms.map(async (platform) => {
      const sender = SENDERS[platform];
      if (!sender) {
        results[platform] = { ok: false, error: 'Plataforma desconocida' };
        return;
      }
      try {
        await sender.sendChatMessage(message);
        results[platform] = { ok: true };
      } catch (err) {
        results[platform] = { ok: false, error: err.message };
      }
    })
  );

  res.json(results);
});

module.exports = router;
