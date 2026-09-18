const express = require('express');
const twitch = require('../lib/twitch');
const kick = require('../lib/kick');

const router = express.Router();

router.get('/twitch-games', async (req, res) => {
  try {
    const results = await twitch.searchGames(req.query.q || '');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/kick-categories', async (req, res) => {
  try {
    const results = await kick.searchCategories(req.query.q || '');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
