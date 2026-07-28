# VividMusic YouTube Audio Migration Pipeline

A full-stack, reusable web application (Node.js/Express backend + React/Vite frontend) designed to automate YouTube audio migration for **VividMusic**. 

It extracts audio and cover art from YouTube URLs (videos, playlists, or channels), performs a pre-flight deduplication check against the VividMusic database API, enforces a strict 2-worker concurrency queue, and saves MP3s & cover thumbnails locally along with a structured `metadata.json` map.

---

## 🌟 Key Features

1. **Pre-flight Database Check**:
   - Calls `POST https://vivid-music.vercel.app/temp/isExists` with `{ ytId }`.
   - Skips songs that already exist in the database before starting the download.
2. **Concurrency Control (Strict 2 Workers)**:
   - Utilizes `p-limit` task queue to process **exactly 2 downloads concurrently**.
3. **Cookie Minimization & Sign-in Wall Bypass**:
   - Executes `yt-dlp` with the following flags to prevent rate-limiting and bypass sign-in requirements:
     - `--no-cookies`
     - `--no-cookies-from-browser`
     - `--extractor-args "youtube:player_client=android"`
4. **Local Storage (Strictly No Cloudinary)**:
   - Downloads MP3 audio to `downloads/songs/`.
   - Downloads cover thumbnail image to `downloads/covers/`.
   - Maintains a local index in `downloads/metadata.json`.
5. **Real-Time UI Dashboard**:
   - WebSockets for live status updates (`PENDING`, `CHECKING_DB`, `DOWNLOADING`, `SKIPPED`, `COMPLETED`, `FAILED`).
   - Pagination controls for `skip` (offset) and `limit` (count).
   - Built-in MP3 Audio Player in the browser for listening to downloaded tracks.
   - Streaming terminal console logs for debugging.

---

## 📂 Project Structure

```
web/
├── client/                  # React (Vite) Frontend Application
│   ├── src/
│   │   ├── App.jsx          # Main Dashboard & Interactive Studio
│   │   ├── index.css        # Custom Glassmorphic Dark Design System
│   │   └── main.jsx         # React Entry point
│   ├── index.html
│   ├── vite.config.js       # Vite proxy setup for /api & /downloads
│   └── package.json
├── server/                  # Node.js Express Backend & WebSocket Server
│   ├── src/
│   │   ├── index.js         # Express app, REST API & WebSocket server
│   │   └── services/
│   │       ├── ytdlp.js     # yt-dlp metadata extraction & MP3/cover download
│   │       ├── dbCheck.js   # POST /isExists API check integration
│   │       ├── queue.js     # 2-Worker Concurrency Queue Manager
│   │       └── metadataManager.js # Read/Write downloads/metadata.json
│   └── package.json
├── downloads/               # Created automatically on server start
│   ├── songs/               # Store MP3 files
│   ├── covers/              # Store JPG cover art
│   └── metadata.json        # Metadata mapping file
└── README.md
```

---

## 🛠️ Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **FFmpeg** (Required by `yt-dlp` for MP3 audio extraction):
  ```bash
  sudo apt-get install -y ffmpeg
  ```
- **yt-dlp** (Latest version):
  ```bash
  pip install -U yt-dlp
  ```

---

## 🚀 Getting Started

### 1. Install Backend Dependencies
```bash
cd server
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../client
npm install
```

---

## 💻 Running the Application

### Option A: Run Server & Client concurrently

1. **Start the Express Server** (Port 5000):
   ```bash
   cd server
   npm start
   ```

2. **Start the Frontend Dev Server** (Port 3000):
   ```bash
   cd client
   npm run dev
   ```

3. Open your browser and navigate to:
   **`http://localhost:3000`** (or `http://localhost:5000` if serving production build).

---

## 🔌 API Endpoints Summary

- `POST /api/migrate`: Submit YouTube migration job `{ url, skip, limit }`
- `GET /api/jobs`: List all past and active migration jobs
- `GET /api/jobs/:jobId`: Get detailed item statuses and logs for a job
- `POST /api/jobs/:jobId/cancel`: Cancel an ongoing migration job
- `GET /api/metadata`: Get array of downloaded tracks from `downloads/metadata.json`
- `GET /downloads/*`: Static file server for downloaded MP3s and cover images
- `WS /`: Real-time WebSocket connection for live job event streaming

---

## 📝 License
MIT - VividMusic Audio Migration Studio
