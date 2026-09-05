<div align="center">

  # 🎵 vividMusic

  **A modern, high-performance, and beautifully crafted music streaming platform built for mobile.**

  [![Expo](https://img.shields.io/badge/Expo-v57.0-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
  [![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_Search-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)

  <br />

  [Features](#-key-features) • [Screenshots](#-app-showcase) • [Tech Stack](#-tech-stack--architecture) • [Getting Started](#-getting-started) • [Project Structure](#-project-structure)

</div>

---

## 🌟 Overview

**vividMusic** is an elegant, feature-packed mobile music streaming & audio player application. Designed with modern UX principles, it seamlessly combines real-time full-text song discovery, dynamic adaptive interface color palette generation matching album artwork, synced lyrics playback, and smooth background audio controls.

---

## ✨ Key Features

- 🎨 **Adaptive Color Theming**: Automatically extracts vibrant accent palettes from album artwork in real time using `react-native-image-colors` to deliver an immersive visual vibe for every track.
- 🎤 **Synchronized Lyrics**: Enjoy real-time, timed lyric scrolling synchronized down to the second with active track playback.
- ⚡ **Lightning-Fast Search**: High-speed track and artist discovery powered by **MongoDB Atlas Full-Text Search**.
- 🎶 **Background Audio Control**: Built on `expo-audio` and native sound services, ensuring uninterrupted playback across lock screens and background apps.
- 📂 **Smart Playlists & Library**: Create, customize, and curate personal playlists with instant local caching powered by **Zustand** and **MMKV**.
- 🚀 **Silky 60 FPS Scrolling**: Uses `@shopify/flash-list` for ultra-lean memory usage and liquid-smooth scrolling performance across vast song catalogs.

---

## 📸 App Showcase

<div align="center">

| 🏠 Home Feed | 🔍 Fast Search | 📑 Playlists |
| :---: | :---: | :---: |
| <img src="./images/33183.jpg" width="240" alt="Home Feed" /> | <img src="./images/33184.jpg" width="240" alt="Search Screen" /> | <img src="./images/33185.jpg" width="240" alt="Playlists" /> |

| 🎵 Playlist Tracks | 🎧 Audio Player | 📜 Synced Lyrics |
| :---: | :---: | :---: |
| <img src="./images/33180.jpg" width="240" alt="Playlist View" /> | <img src="./images/33181.jpg" width="240" alt="Audio Player" /> | <img src="./images/33182.jpg" width="240" alt="Synced Lyrics" /> |

</div>

---

## 🛠 Tech Stack & Architecture

### **Client (Mobile App)**
- **Framework**: Expo (React Native `v0.86`) with `expo-router`
- **Language**: TypeScript (`v6.0`)
- **State Management**: Zustand & `@tanstack/react-query`
- **Audio Engine**: `expo-audio`
- **Animations & UX**: `react-native-reanimated`, `lottie-react-native`
- **UI Performance**: `@shopify/flash-list`, `react-native-image-colors`
- **Local Storage**: `react-native-mmkv`

### **Server (Backend API)**
- **Runtime**: Node.js & Express.js (ES Modules)
- **Database**: MongoDB Atlas (Mongoose ORM) with Full-Text Search Indexing
- **Media & Metadata Processing**: Cloudinary, Firebase Admin, `music-metadata`, `ytdl-core`, `play-dl`

---

## 📁 Project Structure

```text
musicApp/
├── client/                 # React Native / Expo Mobile App
│   ├── src/
│   │   ├── app/            # File-based routing (Expo Router)
│   │   ├── components/     # Reusable UI Components & Player controls
│   │   ├── hooks/          # Custom React Query & Audio Hooks
│   │   ├── store/          # Zustand State Stores (Player, Playlist, Theme)
│   │   └── utils/          # Helper functions & Color extractors
│   ├── assets/             # Fonts, icons, static assets
│   └── package.json
│
├── server/                 # Express Backend API
│   ├── config/             # DB & Cloud Service configurations
│   ├── handlers/           # Request controllers
│   ├── models/             # Mongoose schemas (Song, Playlist, User)
│   ├── routes/             # REST API endpoints
│   └── index.js            # Server entry point
│
├── images/                 # App Screenshots & Showcase assets
└── README.md
```

---
