const express = require('express');
const twitch = require('../lib/twitch');
const youtube = require('../lib/youtube');
const kick = require('../lib/kick');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    twitch: twitch.isConnected(),
    youtube: youtube.isConnected(),
    kick: kick.isConnected()
  });
});

router.get('/viewers', async (req, res) => {
  const jobs = { twitch, youtube, kick };
  // ?platforms=twitch,kick deja pedir solo un subconjunto - el dock lo usa
  // para no pegarle a una plataforma que el usuario apago con el toggle.
  const requested = req.query.platforms
    ? String(req.query.platforms).split(',').filter((name) => jobs[name])
    : Object.keys(jobs);
  const counts = {};
  await Promise.allSettled(
    requested.map(async (name) => {
      const lib = jobs[name];
      if (!lib.isConnected()) {
        counts[name] = null;
        return;
      }
      try {
        counts[name] = await lib.getViewerCount();
      } catch (err) {
        counts[name] = { error: err.message };
      }
    })
  );
  res.json(counts);
});

router.post('/clip/twitch', async (req, res) => {
  try {
    res.json({ ok: true, result: await twitch.createClip() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function pushTwitch({ title, tags, twitchGameId }) {
  return twitch.updateChannelInfo({ title, tags, gameId: twitchGameId });
}

async function pushYoutube({ title, tags, youtubeCategoryId }) {
  return youtube.updateChannelInfo({ title, tags, categoryId: youtubeCategoryId });
}

async function pushKick({ title, kickCategoryId }) {
  return kick.updateChannelInfo({ title, categoryId: kickCategoryId });
}

router.post('/push/twitch', async (req, res) => {
  try {
    res.json({ ok: true, result: await pushTwitch(req.body) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/push/youtube', async (req, res) => {
  try {
    res.json({ ok: true, result: await pushYoutube(req.body) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/push/kick', async (req, res) => {
  try {
    res.json({ ok: true, result: await pushKick(req.body) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/push-all', async (req, res) => {
  const jobs = { twitch: pushTwitch, youtube: pushYoutube, kick: pushKick };
  const results = {};
  await Promise.allSettled(
    Object.entries(jobs).map(async ([name, fn]) => {
      try {
        await fn(req.body);
        results[name] = { ok: true };
      } catch (err) {
        results[name] = { ok: false, error: err.message };
      }
    })
  );
  res.json(results);
});

module.exports = router;
