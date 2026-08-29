FROM node:18-bullseye

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy all server files
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
