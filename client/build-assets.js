const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const MAIN_SVG = './master-music-logo.svg';
const NOTIFICATION_SVG = './notification-icon.svg';
const OUTPUT_DIR = './assets/images';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateMusicAssets() {
  console.log('Generating audio app assets...');

  try {
    // 1. App Icon
    await sharp(MAIN_SVG).resize(1024, 1024).flatten({ background: '#ffffff' }).png().toFile(path.join(OUTPUT_DIR, 'icon.png'));
    
    // 2. Adaptive Icon (Transparent foreground)
    const paddedIcon = await sharp(MAIN_SVG).resize(665, 665).toBuffer();
    await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } }
    }).composite([{ input: paddedIcon, gravity: 'center' }]).png().toFile(path.join(OUTPUT_DIR, 'adaptive-icon.png'));

    // 3. Splash Screen
    await sharp(MAIN_SVG).resize(1024, 1024).png().toFile(path.join(OUTPUT_DIR, 'splash-icon.png'));

    // 4. Favicon
    await sharp(MAIN_SVG).resize(48, 48).flatten({ background: '#ffffff' }).png().toFile(path.join(OUTPUT_DIR, 'favicon.png'));

    // 5. Media Player Notification Icon (96x96)
    await sharp(NOTIFICATION_SVG).resize(96, 96).png().toFile(path.join(OUTPUT_DIR, 'notification-icon.png'));

    console.log('Done! All assets, including media notification icons, are ready.');
  } catch (error) {
    console.error('Error generating assets:', error);
  }
}

generateMusicAssets();
