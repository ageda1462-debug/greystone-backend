const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// List of public Invidious instances to try
const INVIDIOUS_INSTANCES = [
  'https://invidious.io.lol',
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
];

async function fetchFromInvidious(path) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const response = await fetch(`${instance}${path}`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      continue;
    }
  }
  throw new Error('All Invidious instances failed');
}

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

// Search YouTube via Invidious
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  try {
    const data = await fetchFromInvidious(
      `/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`
    );

    const tracks = data.slice(0, 10).map(item => ({
      id: item.videoId,
      title: item.title,
      artist: item.author,
      thumbnail: item.videoThumbnails?.[0]?.url || '',
      duration: item.lengthSeconds,
    }));

    res.json({ results: tracks });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get stream URL via Invidious
app.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const data = await fetchFromInvidious(`/api/v1/videos/${videoId}?fields=adaptiveFormats,formatStreams`);

    // Find best audio format
    const audioFormats = data.adaptiveFormats
      ?.filter(f => f.type?.startsWith('audio/') && f.url)
      ?.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    if (audioFormats && audioFormats.length > 0) {
      return res.json({ url: audioFormats[0].url });
    }

    // Fallback to format streams
    const fallback = data.formatStreams?.find(f => f.url);
    if (fallback) {
      return res.json({ url: fallback.url });
    }

    res.status(500).json({ error: 'No audio stream found' });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to get stream URL', details: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Greystone backend running on port ${PORT}`));