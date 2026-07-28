require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const WebSocket = require('ws');
const JobManager = require('./services/queue');
const { getMetadata } = require('./services/metadataManager');
const { isCloudinaryConfigured } = require('./services/cloudinary');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5000;
const DOWNLOADS_DIR = path.resolve(__dirname, '../../downloads');
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// Serve downloaded songs and covers statically
app.use('/downloads', express.static(DOWNLOADS_DIR));

// WebSocket Broadcasting Helper
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  // Send welcome ping
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to VividMusic WS Server' }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Initialize JobManager
const jobManager = new JobManager(DOWNLOADS_DIR, broadcast);

// --- REST API ROUTES ---

// Health & Environment Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    cloudinaryConfigured: isCloudinaryConfigured(),
    timestamp: new Date().toISOString()
  });
});

const { parseUrls } = require('./services/urlUtils');

// Submit a YouTube Audio Migration Job
app.post('/api/migrate', async (req, res) => {
  const { url, urls, skip = 0, limit = 0 } = req.body;
  const parsedUrls = parseUrls(urls || url);

  if (parsedUrls.length === 0) {
    return res.status(400).json({ error: 'A valid YouTube URL or array of YouTube URLs (e.g. ["url1", "url2"]) is required.' });
  }

  try {
    const jobId = await jobManager.startJob({
      url,
      urls: parsedUrls,
      skip: Math.max(0, parseInt(skip, 10) || 0),
      limit: Math.max(0, parseInt(limit, 10) || 0)
    });

    res.json({
      success: true,
      jobId,
      urls: parsedUrls,
      cloudinaryConfigured: isCloudinaryConfigured(),
      message: `Migration job initialized with ${parsedUrls.length} URL(s).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all jobs
app.get('/api/jobs', (req, res) => {
  res.json(jobManager.getAllJobs());
});

// Get detailed status of a specific job
app.get('/api/jobs/:jobId', (req, res) => {
  const job = jobManager.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }
  res.json(job);
});

// Cancel a job
app.post('/api/jobs/:jobId/cancel', (req, res) => {
  const success = jobManager.cancelJob(req.params.jobId);
  if (success) {
    res.json({ success: true, message: 'Cancellation signal sent.' });
  } else {
    res.status(400).json({ error: 'Job cannot be cancelled or was not found.' });
  }
});

// Get local downloaded metadata
app.get('/api/metadata', (req, res) => {
  const metadata = getMetadata(DOWNLOADS_DIR);
  res.json(metadata);
});

// Serve frontend dist build if present
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/downloads')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// Start Server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  VividMusic Audio Migration Server running on port ${PORT}`);
  console.log(`  Cloudinary Configured: ${isCloudinaryConfigured() ? 'YES' : 'NO (Using local fallback)'}`);
  console.log(`  Downloads directory: ${DOWNLOADS_DIR}`);
  console.log(`====================================================`);
});
