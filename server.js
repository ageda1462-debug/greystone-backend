const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Greystone backend running' });
});

// Test endpoint
app.get('/test', (req, res) => {
  exec('yt-dlp --version', (error, stdout) => {
    res.json({ 
      ytdlp: error ? 'not found' : stdout.trim(),
      youtubeApiKey: YOUTUBE_API_KEY ? 'set' : 'missing'
    });
  });
});

// Search YouTube using official API
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: 'YouTube API error', details: err });
    }

    const data = await response.json();

    // Get video durations
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );
    const detailsData = await detailsResponse.json();

    const durationMap = {};
    detailsData.items.forEach(item => {
      const iso = item.contentDetails.duration;
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);
      const seconds = parseInt(match[3] || 0);
      durationMap[item.id] = hours * 3600 + minutes * 60 + seconds;
    });

    const tracks = data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      duration: durationMap[item.id.videoId] || 0,
    }));

    res.json({ results: tracks });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get stream URL using yt-dlp with cookies
app.get('/stream/:videoId', (req, res) => {
  const { videoId } = req.params;

  exec(
    `yt-dlp -f bestaudio --get-url --cookies /app/cookies.txt --no-warnings https://www.youtube.com/watch?v=${videoId}`,
    { timeout: 30000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error('Stream error:', stderr);
        return res.status(500).json({ error: 'Failed to get stream URL', details: stderr });
      }

      const url = stdout.trim().split('\n')[0];
      if (!url) {
        return res.status(500).json({ error: 'No URL found' });
      }

      res.json({ url });
    }
  );
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Greystone backend running on port ${PORT}`));