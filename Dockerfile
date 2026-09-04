FROM node:22-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages -U yt-dlp

# Install Node dependencies from server/
COPY server/package*.json ./

RUN npm install

# Copy the server application
COPY server/ ./

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
