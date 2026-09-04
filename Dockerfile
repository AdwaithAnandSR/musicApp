FROM node:22-bookworm
WORKDIR /server

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages -U yt-dlp

COPY package*.json ./

COPY server/ .

RUN ls -la
RUN pwd

RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 8000

CMD ["npm", "start"]
