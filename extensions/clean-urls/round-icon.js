// Script to add rounded corners to icon with true transparency
const sharp = require('sharp');
const path = require('path');

const INPUT = 'C:/Users/Jackg/.gemini/antigravity/brain/5854236f-6417-4d63-9a4d-2b4999f793e4/clean_urls_icon_1766099347343.png';
const OUTPUT = path.join(__dirname, 'assets', 'extension-icon.png');

const SIZE = 512;
const RADIUS = 100; // Corner radius

async function addRoundedCorners() {
    // Create a rounded rectangle SVG mask
    const roundedMask = Buffer.from(
        `<svg width="${SIZE}" height="${SIZE}">
      <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
    </svg>`
    );

    // Load the original image, resize if needed, and apply the mask
    await sharp(INPUT)
        .resize(SIZE, SIZE)
        .composite([
            {
                input: roundedMask,
                blend: 'dest-in'
            }
        ])
        .png()
        .toFile(OUTPUT);

    console.log('✅ Created icon with rounded corners:', OUTPUT);
}

addRoundedCorners().catch(console.error);
