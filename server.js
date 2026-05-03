const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Search YouTube
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  const command = `yt-dlp "ytsearch5:${query}" --dump-json --no-playlist --flat-playlist`;

  exec(command, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: 'Search failed' });

    const results = stdout.trim().split('\n').map(line => {
      try {
        const data = JSON.parse(line);
        return {
          id: data.id,
          title: data.title,
          artist: data.uploader,
          thumbnail: data.thumbnail,
          duration: data.duration,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ results });
  });
});

// Get stream URL
app.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const command = `yt-dlp -f bestaudio --get-url https://www.youtube.com/watch?v=${videoId}`;

  exec(command, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: 'Failed to get stream URL' });
    const url = stdout.trim();
    res.json({ url });
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Greystone backend running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Greystone backend running on port ${PORT}`));