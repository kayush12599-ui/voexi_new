const fs = require('fs');
const path = require('path');

// Determine local storage directory
function getStorageDir() {
  const dDrivePath = 'D:\\vibroxe_media_storage';
  if (fs.existsSync(dDrivePath)) return dDrivePath;
  const cStorage = path.join(__dirname, '..', 'media_server_storage');
  if (!fs.existsSync(cStorage)) fs.mkdirSync(cStorage, { recursive: true });
  return cStorage;
}

const storageDir = getStorageDir();
console.log(`====================================================`);
console.log(`🚀 INITIALIZING LOCAL SERVER DATABASE TABLES`);
console.log(`📁 Storage Location: ${storageDir}`);
console.log(`====================================================\n`);

// 1. metadata.json (Posts & Media Table)
const metaPath = path.join(storageDir, 'metadata.json');
if (!fs.existsSync(metaPath)) {
  const defaultMetadata = {
    "sample_reel_001": {
      "id": "sample_reel_001",
      "filename": "sample_reel.mp4",
      "title": "VOEXI Neural Reel Release",
      "description": "High-speed 60FPS video broadcast on VOEXI spectrum.",
      "post_type": "Reels",
      "category": "Reels",
      "uploader": "VOEXI Official",
      "views_count": 1250,
      "likes_count": 340,
      "created_at": new Date().toISOString()
    }
  };
  fs.writeFileSync(metaPath, JSON.stringify(defaultMetadata, null, 2), 'utf8');
  console.log(`✅ Table [metadata.json] (Posts & Media) Initialized!`);
} else {
  console.log(`ℹ️ Table [metadata.json] exists (${fs.statSync(metaPath).size} bytes)`);
}

// 2. profiles.json (Users & Channels Table)
const profilesPath = path.join(storageDir, 'profiles.json');
if (!fs.existsSync(profilesPath)) {
  const defaultProfiles = {
    "admin_creator": {
      "id": "admin_creator",
      "username": "voexi_official",
      "channel_name": "VOEXI Official",
      "avatar_url": "https://ui-avatars.com/api/?name=VOEXI&background=A855F7&color=fff&bold=true",
      "role": "admin",
      "verification_status": "verified",
      "created_at": new Date().toISOString()
    }
  };
  fs.writeFileSync(profilesPath, JSON.stringify(defaultProfiles, null, 2), 'utf8');
  console.log(`✅ Table [profiles.json] (User Profiles) Initialized!`);
} else {
  console.log(`ℹ️ Table [profiles.json] exists (${fs.statSync(profilesPath).size} bytes)`);
}

// 3. interactions.json (Likes, Views & Comments Table)
const interactionsPath = path.join(storageDir, 'interactions.json');
if (!fs.existsSync(interactionsPath)) {
  const defaultInteractions = {
    "likes": { "sample_reel_001": 340 },
    "views": { "sample_reel_001": 1250 },
    "saves": {},
    "comments": {
      "sample_reel_001": [
        {
          "id": "cmt_001",
          "user": "VOEXI Official",
          "text": "Swagat hai VOEXI Network par! 🚀",
          "created_at": new Date().toISOString()
        }
      ]
    }
  };
  fs.writeFileSync(interactionsPath, JSON.stringify(defaultInteractions, null, 2), 'utf8');
  console.log(`✅ Table [interactions.json] (Likes & Comments) Initialized!`);
} else {
  console.log(`ℹ️ Table [interactions.json] exists (${fs.statSync(interactionsPath).size} bytes)`);
}

// 4. reports.json (Content Reports & Signal Audits Table)
const reportsPath = path.join(storageDir, 'reports.json');
if (!fs.existsSync(reportsPath)) {
  fs.writeFileSync(reportsPath, JSON.stringify([], null, 2), 'utf8');
  console.log(`✅ Table [reports.json] (Content Reports) Initialized!`);
} else {
  console.log(`ℹ️ Table [reports.json] exists (${fs.statSync(reportsPath).size} bytes)`);
}

// 5. events.json (Analytics & Watch Time Table)
const eventsPath = path.join(storageDir, 'events.json');
if (!fs.existsSync(eventsPath)) {
  const defaultEvents = { skips: {}, watches: {}, shares: {}, userHistory: {} };
  fs.writeFileSync(eventsPath, JSON.stringify(defaultEvents, null, 2), 'utf8');
  console.log(`✅ Table [events.json] (Analytics & Events) Initialized!`);
} else {
  console.log(`ℹ️ Table [events.json] exists (${fs.statSync(eventsPath).size} bytes)`);
}

console.log(`\n🎉 ALL 5 LOCAL SERVER DATABASE TABLES ARE 100% READY!`);
