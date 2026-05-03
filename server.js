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

  exec(`yt-dlp "ytsearch5:${query}" --dump-json --no-playlist --flat-playlist`, (error, stdout, stderr) => {
    if (error) {
      console.error('Search error:', stderr);
      return res.status(500).json({ error: 'Search failed', details: stderr });
    }

    try {
      const lines = stdout.trim().split('\n').filter(Boolean);
      const tracks = lines.map(line => {
        try {
          const data = JSON.parse(line);
          return {
            id: data.id,
            title: data.title,
            artist: data.uploader || data.channel || 'Unknown',
            thumbnail: data.thumbnail,
            duration: data.duration,
          };
        } catch {
          return null;
        }
      }).filter(Boolean);

      res.json({ results: tracks });
    } catch (parseError) {
      res.status(500).json({ error: 'Parse failed', details: parseError.message });
    }
  });
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