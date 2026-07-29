const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Updated input file name for context
const SVG_FILE = './s.svg'; 
const OUTPUT_DIR = './assets/images';

// Music App Theme Variables
// Using a sleek dark theme (#121212) as the default background, common for music apps
const BRAND_BG_COLOR = '#121212'; 

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateAssets() {
  console.log('Starting music app asset generation... 🎵');

  try {
    // 1. icon.png (1024x1024, solid brand background)
    await sharp(SVG_FILE)
      .resize(1024, 1024)
      .flatten({ background: BRAND_BG_COLOR })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'icon.png'));
    console.log('Generated: icon.png (1024x1024, dark theme background)');

    // 2. adaptive-icon.png (1024x1024, transparent background, scaled for safe zone)
    // We scale the logo to 65% to ensure it fits within Android's circular/squircle masks
    const paddedIcon = await sharp(SVG_FILE)
      .resize(665, 665)
      .toBuffer();

    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent
      }
    })
      .composite([{ input: paddedIcon, gravity: 'center' }])
      .png()
      .toFile(path.join(OUTPUT_DIR, 'adaptive-icon.png'));
    console.log('Generated: adaptive-icon.png (1024x1024, padded foreground)');

    // 3. splash-icon.png (1024x1024, transparent background)
    // Expo handles the background color and placement via app.json
    await sharp(SVG_FILE)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'splash-icon.png'));
    console.log('Generated: splash-icon.png (1024x1024)');

    // 4. favicon.png (48x48)
    await sharp(SVG_FILE)
      .resize(48, 48)
      .flatten({ background: BRAND_BG_COLOR })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'favicon.png'));
    console.log('Generated: favicon.png (48x48)');

    // 5. notification-icon.png (96x96, transparent)
    // CRITICAL FOR MUSIC APPS: Used for the ongoing playback notification in Android
    // Note: For Android, the source SVG should ideally be just white shapes with no background
    await sharp(SVG_FILE)
      .resize(96, 96)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'notification-icon.png'));
    console.log('Generated: notification-icon.png (96x96, for status bar playback)');

    console.log('\nAsset generation complete. Ready for Expo build! 🎧');
  } catch (error) {
    console.error('Error generating assets:', error);
  }
}

generateAssets();
