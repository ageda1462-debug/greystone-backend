const express = require('express');
const cors = require('cors');
const youtubeDl = require('youtube-dl-exec');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Greystone backend running' });
});

// Test yt-dlp installation
app.get('/test', (req, res) => {
  exec('yt-dlp --version', (error, stdout, stderr) => {
    if (error) {
      res.json({ installed: false, error: error.message, stderr });
    } else {
      res.json({ installed: true, version: stdout.trim() });
    }
  });
});

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
    console.error('Search error full:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message,
      stack: error.stack 
    });
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
    console.error('Stream error full:', error);
    res.status(500).json({ 
      error: 'Failed to get stream URL', 
      details: error.message,
      stack: error.stack
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Greystone backend running on port ${PORT}`));