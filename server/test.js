// test-upload.js
// Tests: Download audio from YouTube → Upload to TeraBox → Log file ID + details
// Run: node test-upload.js

import ytdl from "@distube/ytdl-core";
import TeraboxUploader from "terabox-upload-tool";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // 🔁 Replace with your test URL

const TERABOX_CREDENTIALS = {
  ndus:      process.env.TERABOX_NDUS,       // From browser cookies
  jsToken:   process.env.TERABOX_JS_TOKEN,   // From browser network tab
  appId:     process.env.TERABOX_APP_ID || "250528",
  uploadId:  process.env.TERABOX_UPLOAD_ID,  // From browser network tab
  browserId: process.env.TERABOX_BROWSER_ID, // From browser cookies
};

const TERABOX_UPLOAD_DIR = "/Music"; // Folder on TeraBox

// ─── STEP 1: DOWNLOAD FROM YOUTUBE ───────────────────────────────────────────

async function downloadFromYouTube(url) {
  console.log("\n🎵 Step 1: Fetching video info from YouTube...");

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title
    .replace(/[^a-z0-9\s\-_]/gi, "") // sanitize filename
    .trim()
    .replace(/\s+/g, "_");

  const outputPath = path.join(__dirname, `${title}.mp3`);

  console.log(`📄 Title   : ${info.videoDetails.title}`);
  console.log(`⏱  Duration: ${Math.floor(info.videoDetails.lengthSeconds / 60)}m ${info.videoDetails.lengthSeconds % 60}s`);
  console.log(`💾 Saving to: ${outputPath}`);
  console.log("\n⬇️  Step 2: Downloading audio...");

  await new Promise((resolve, reject) => {
    ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly",
    })
      .pipe(fs.createWriteStream(outputPath))
      .on("finish", resolve)
      .on("error", reject);
  });

  const stats = fs.statSync(outputPath);
  console.log(`✅ Download complete! Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  return { outputPath, title };
}

// ─── STEP 2: UPLOAD TO TERABOX ───────────────────────────────────────────────

async function uploadToTeraBox(filePath) {
  console.log("\n☁️  Step 3: Uploading to TeraBox...");

  // Validate credentials
  const missing = Object.entries(TERABOX_CREDENTIALS)
    .filter(([key, val]) => !val && key !== "browserId")
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing TeraBox credentials in .env: ${missing.join(", ")}`);
  }

  const uploader = new TeraboxUploader(TERABOX_CREDENTIALS);

  // Ensure upload directory exists
  try {
    await uploader.createDirectory(TERABOX_UPLOAD_DIR);
    console.log(`📁 Directory ensured: ${TERABOX_UPLOAD_DIR}`);
  } catch (e) {
    // Directory may already exist — that's fine
  }

  // Upload with progress
  const result = await uploader.uploadFile(
    filePath,
    (loaded, total) => {
      const pct = Math.round((loaded / total) * 100);
      process.stdout.write(`\r   Progress: ${pct}% (${(loaded / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB)`);
    },
    TERABOX_UPLOAD_DIR
  );

  console.log(""); // newline after progress

  if (!result.success) {
    throw new Error(`Upload failed: ${result.message}`);
  }

  return result;
}

// ─── STEP 3: FETCH DOWNLOAD LINK ─────────────────────────────────────────────

async function getStreamUrl(fsId) {
  console.log("\n🔗 Step 4: Fetching streaming URL...");

  const uploader = new TeraboxUploader(TERABOX_CREDENTIALS);
  const result = await uploader.downloadFile(fsId);

  return result.downloadLink;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("   YouTube → TeraBox Upload Test");
  console.log("═══════════════════════════════════════════");

  let filePath = null;

  try {
    // Step 1 & 2: Download from YouTube
    const { outputPath, title } = await downloadFromYouTube(YOUTUBE_URL);
    filePath = outputPath;

    // Step 3: Upload to TeraBox
    const uploadResult = await uploadToTeraBox(filePath);

    // Step 4: Get streaming URL
    const fsId = uploadResult.fileDetails?.fs_id;
    const streamUrl = fsId ? await getStreamUrl(fsId) : null;

    // ─── RESULT SUMMARY ───────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════");
    console.log("   ✅ SUCCESS — Save these to MongoDB");
    console.log("═══════════════════════════════════════════");
    console.log(`  title        : "${title}"`);
    console.log(`  teraboxFileId: "${fsId}"`);                    // ← store this in MongoDB
    console.log(`  teraboxPath  : "${TERABOX_UPLOAD_DIR}/${path.basename(filePath)}"`); // ← store this too
    console.log(`  streamUrl    : "${streamUrl}"`);               // ← DO NOT store (expires ~12hr)
    console.log("───────────────────────────────────────────");
    console.log("\n📌 Reminder: Store teraboxFileId in MongoDB, NOT the streamUrl.");
    console.log("   Call uploader.downloadFile(fsId) on each play request for a fresh URL.\n");

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    if (err.message.includes("credentials")) {
      console.log("\n📋 How to get TeraBox credentials:");
      console.log("   1. Open terabox.com and log in");
      console.log("   2. Open DevTools → Application → Cookies");
      console.log("      Copy: ndus, browserid");
      console.log("   3. Open DevTools → Network → filter 'api/list'");
      console.log("      Copy from request params: jsToken, app_id, upload_id");
      console.log("   4. Add all to your .env file\n");
    }
  } finally {
    // Cleanup temp file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🧹 Cleaned up temp file.");
    }
  }
}

main();
