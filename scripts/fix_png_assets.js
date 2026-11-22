const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to create PNG Chunk with CRC32
function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const bufToCrc = Buffer.concat([typeBuf, data]);

  // CRC32 table
  let crcTable = global._crcTable;
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[i] = c;
    }
    global._crcTable = crcTable;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bufToCrc.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bufToCrc[i]) & 0xFF];
  }
  crc = (crc ^ 0xFFFFFFFF) >>> 0;

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateValidPng(width = 64, height = 64) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT - Raw pixels (filter 0 + RGBA purple)
  const rawLines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      line[idx] = 168;     // R (Purple)
      line[idx + 1] = 85;  // G
      line[idx + 2] = 247; // B
      line[idx + 3] = 255; // Alpha
    }
    rawLines.push(line);
  }
  const rawData = Buffer.concat(rawLines);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const pngBuffer = generateValidPng(128, 128);
const targetDir = path.join(__dirname, '..', 'assets', 'images');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const filesToFix = [
  'icon.png',
  'logo_pro.png',
  'diamond_3d.png',
  'splash.png',
  'adaptive-icon.png',
  'favicon.png'
];

filesToFix.forEach(file => {
  const p = path.join(targetDir, file);
  fs.writeFileSync(p, pngBuffer);
  console.log(`✅ Generated valid PNG: ${file}`);
});

console.log('🎉 All PNG assets are 100% valid PNG files!');
