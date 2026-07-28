#!/usr/bin/env bash
# exit on error
set -o errexit

echo "==> Installing server node dependencies..."
npm install

echo "==> Setting up binary dependencies (yt-dlp & ffmpeg)..."
mkdir -p bin

# Download yt-dlp binary if not present
if [ ! -f bin/yt-dlp ]; then
  echo "==> Downloading latest yt-dlp binary..."
  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
  chmod +x bin/yt-dlp
fi

# Download static ffmpeg binary if not present
if [ ! -f bin/ffmpeg ]; then
  echo "==> Downloading ffmpeg static binary..."
  curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
  tar -xf ffmpeg.tar.xz --strip-components=1 -C bin/ 2>/dev/null || true
  rm -f ffmpeg.tar.xz
  chmod +x bin/ffmpeg bin/ffprobe 2>/dev/null || true
fi

echo "==> Checking for client frontend build..."
if [ -d "../client" ]; then
  echo "==> Building client..."
  cd ../client
  npm install
  npm run build
  cd ../server
fi

echo "==> Render build complete!"
