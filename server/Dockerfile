FROM node:18-bullseye

# Install python3 and ffmpeg which are required by yt-dlp
RUN apt-get update && apt-get install -y python3 ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy all server files
COPY . .

# Ensure yt-dlp binary is executable
RUN chmod +x bin/yt-dlp

EXPOSE 5000

CMD ["npm", "start"]
