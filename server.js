const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Greystone backend running' });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    status: 'ok',
    youtubeApiKey: YOUTUBE_API_KEY ? 'set' : 'missing',
    rapidApiKey: RAPIDAPI_KEY ? 'set' : 'missing'
  });
});

// Search YouTube using official API
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: 'YouTube API error', details: err });
    }

    const data = await response.json();

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

// Get stream URL via RapidAPI
app.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const response = await fetch(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY,
        }
      }
    );

    const data = await response.json();

    if (data.status !== 'ok') {
      return res.status(500).json({ error: 'Failed to get stream URL', details: data });
    }

    res.json({ 
      url: data.link,
      title: data.title,
      duration: data.duration
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to get stream URL', details: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Greystone backend running on port ${PORT}`));