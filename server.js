const express = require('express');
const cors = require('cors');
const youtubeDl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

// Search YouTube
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  try {
    const result = await youtubeDl(`ytsearch5:${query}`, {
      dumpJson: true,
      noPlaylist: true,
      flatPlaylist: true,
    });

    const results = Array.isArray(result) ? result : [result];
    const tracks = results.map(data => ({
      id: data.id,
      title: data.title,
      artist: data.uploader,
      thumbnail: data.thumbnail,
      duration: data.duration,
    })).filter(Boolean);

    res.json({ results: tracks });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get stream URL
app.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const result = await youtubeDl(`https://www.youtube.com/watch?v=${videoId}`, {
      format: 'bestaudio',
      getUrl: true,
    });

    res.json({ url: result });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message, stack: error.stack });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Greystone backend running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Greystone backend running on port ${PORT}`));