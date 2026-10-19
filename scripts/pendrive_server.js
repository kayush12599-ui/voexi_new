const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Local directories inside project
const LOCAL_STORAGE_DIR = path.join(__dirname, '..', 'media_server_storage');
const ASSETS_IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

// Dynamically detect all storage directories
function getStorageDirectories() {
  const dirs = [LOCAL_STORAGE_DIR];
  if (fs.existsSync(ASSETS_IMAGES_DIR)) {
    dirs.push(ASSETS_IMAGES_DIR);
  }

  const possibleDrives = ['D:\\', 'E:\\', 'F:\\', 'G:\\', 'H:\\'];
  for (const drive of possibleDrives) {
    try {
      if (fs.existsSync(drive)) {
        fs.readdirSync(drive);
        dirs.push(drive);
      }
    } catch (e) {}
  }
  return [...new Set(dirs)];
}

// Scan all directories and aggregate all media files
function getAllMediaFiles() {
  const allDirs = getStorageDirectories();
  const fileList = [];
  const seenFiles = new Set();

  allDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(f => {
          if (!f.startsWith('$') && f !== 'System Volume Information' && f !== 'metadata.json' && f !== 'interactions.json' && f !== 'reports.json' && /\.(mp4|mov|avi|mkv|webm|jpg|jpeg|png|gif|webp|mp3|wav|m4a|aac|ogg|flac|txt|zip|rar|7z|tar|gz|glb|fbx|pdf|doc|docx)$/i.test(f)) {
            const fullPath = path.join(dir, f);
            try {
              const stats = fs.statSync(fullPath);
              if (stats.isFile() && !seenFiles.has(f.toLowerCase())) {
                seenFiles.add(f.toLowerCase());
                fileList.push({
                  filename: f,
                  dirPath: dir,
                  fullPath: fullPath,
                  stats: stats
                });
              }
            } catch (e) {}
          }
        });
      } catch (e) {}
    }
  });

  return fileList;
}

// Helper to extract clean filename from postId or full path/URL
function extractCleanFilename(inputKey) {
  if (!inputKey) return '';
  let str = String(inputKey).trim();
  try {
    str = decodeURIComponent(str);
  } catch (e) {}

  // If full URL or path was passed
  if (str.includes('/')) str = path.basename(str);
  if (str.includes('\\')) str = path.basename(str);
  if (str.includes('?')) str = str.split('?')[0];

  // Handle pendrive_media_0_filename.mp4
  if (str.includes('pendrive_media_')) {
    const parts = str.split('_');
    if (parts.length >= 4) {
      str = parts.slice(3).join('_');
    } else if (parts.length === 3) {
      str = parts.slice(2).join('_');
    }
  }

  return str.trim();
}

// Find a specific file across all storage directories
function findFileInStorage(fileName) {
  const cleanName = extractCleanFilename(fileName);
  if (!cleanName) return null;

  const allFiles = getAllMediaFiles();
  const lowerClean = cleanName.toLowerCase();

  // 1. Direct exact filename match
  const exact = allFiles.find(item => item.filename.toLowerCase() === lowerClean);
  if (exact) return exact;

  // 2. Direct path check in storage directories
  const storageDirs = getStorageDirectories();
  for (const dir of storageDirs) {
    const fullP = path.join(dir, cleanName);
    if (fs.existsSync(fullP)) {
      try {
        const stats = fs.statSync(fullP);
        if (stats.isFile()) {
          return { filename: cleanName, dirPath: dir, fullPath: fullP, stats };
        }
      } catch (e) {}
    }
  }

  // 3. Fuzzy match without spaces/underscores
  const rawTarget = lowerClean.replace(/[\s_]+/g, '');
  const fuzzy = allFiles.find(item => item.filename.toLowerCase().replace(/[\s_]+/g, '') === rawTarget);
  return fuzzy || null;
}

// Check if a custom thumbnail image exists
function findCustomThumbnailUrl(fileName, dirPath) {
  const cleanName = extractCleanFilename(fileName);
  const possibleThumbs = [
    `${cleanName}_thumb.jpg`,
    `${cleanName}_thumb.jpeg`,
    `${cleanName}_thumb.png`,
    `${cleanName}.jpg`,
    `${cleanName}.png`
  ];

  for (const t of possibleThumbs) {
    if (dirPath && fs.existsSync(path.join(dirPath, t))) {
      return `/${encodeURIComponent(t)}`;
    }
    if (fs.existsSync(path.join(LOCAL_STORAGE_DIR, t))) {
      return `/${encodeURIComponent(t)}`;
    }
  }
  return null;
}

// Metadata File Helpers
function getMediaMetadata() {
  const metaPath = path.join(LOCAL_STORAGE_DIR, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
  }
  return {};
}

function saveMediaMetadata(data) {
  const metaPath = path.join(LOCAL_STORAGE_DIR, 'metadata.json');
  try {
    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving metadata.json:', e);
  }
}

// Interactions (Likes, Views & Comments) Helpers
function getInteractionsData() {
  const pathStr = path.join(LOCAL_STORAGE_DIR, 'interactions.json');
  if (fs.existsSync(pathStr)) {
    try { return JSON.parse(fs.readFileSync(pathStr, 'utf8')); } catch (e) {}
  }
  return { likes: {}, views: {}, saves: {}, comments: {} };
}

function saveInteractionsData(data) {
  const pathStr = path.join(LOCAL_STORAGE_DIR, 'interactions.json');
  try {
    fs.writeFileSync(pathStr, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving interactions.json:', e);
  }
}

// Content Reports & Signal Audits Helpers
function getReportsData() {
  const pathStr = path.join(LOCAL_STORAGE_DIR, 'reports.json');
  if (fs.existsSync(pathStr)) {
    try { return JSON.parse(fs.readFileSync(pathStr, 'utf8')); } catch (e) {}
  }
  return [];
}

function saveReportsData(data) {
  const pathStr = path.join(LOCAL_STORAGE_DIR, 'reports.json');
  try {
    fs.writeFileSync(pathStr, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving reports.json:', e);
  }
}

// Algorithm Events (Watch Time, Skips, Shares) Helpers
function getEventsData() {
  const pathStr = path.join(LOCAL_STORAGE_DIR, 'events.json');
  if (fs.existsSync(pathStr)) {
    try { return JSON.parse(fs.readFileSync(pathStr, 'utf8')); } catch (e) {}
  }
  return { skips: {}, watches: {}, shares: {}, userHistory: {} };
}

function saveEventsData(data) {
  const pathStr = path.join(LOCAL_STORAGE_DIR, 'events.json');
  try {
    fs.writeFileSync(pathStr, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving events.json:', e);
  }
}

// 🧠 VOEXI HYPER-RETAIN DOPAMINE AI RECOMMENDATION ENGINE (TIKTOK/INSTAGRAM V2)
function calculateViralAlgorithmScore(filename, stats, dirPath, userId) {
  const cleanName = extractCleanFilename(filename);
  const interactions = getInteractionsData();
  const events = getEventsData();
  const meta = getFileDetails(cleanName, stats, dirPath);

  const views = Math.max(1, (interactions.views && interactions.views[cleanName]) || meta.views || 1);
  const likes = (interactions.likes && interactions.likes[cleanName]) || meta.likes || 0;
  const commentsList = (interactions.comments && interactions.comments[cleanName]) || [];
  const comments = commentsList.length;

  const skips = (events.skips && events.skips[cleanName]) || 0;
  const watchRecords = (events.watches && events.watches[cleanName]) || [];
  const shares = (events.shares && events.shares[cleanName]) || 0;

  // 1. REPLAY LOOP MULTIPLIER (TikTok #1 Hook Secret: Did the user rewatch or loop the reel?)
  let totalWatchSec = 0;
  let rewatchLoops = 0;
  watchRecords.forEach(r => {
    const sec = Number(r.duration_sec || 0);
    totalWatchSec += sec;
    if (sec > 12) rewatchLoops++; // Reel watched till end or relooped
  });

  const avgWatchSec = watchRecords.length > 0 ? totalWatchSec / watchRecords.length : 5;
  const completionRatio = Math.min(3.0, avgWatchSec / 15);
  const loopBonus = rewatchLoops > 0 ? (rewatchLoops * 18) : 0; // Huge bonus for rewatched reels!

  // 2. ENGAGEMENT RATIOS WITH HYPER-WEIGHTS
  const likeRatio = likes / views;
  const shareRatio = shares / views;
  const commentRatio = comments / views;
  const skipRatio = skips / views;

  // 3. ZERO-LATENCY USER CATEGORY AFFINITY
  let categoryAffinity = 1.0;
  if (userId && events.userHistory && events.userHistory[userId]) {
    const userPref = events.userHistory[userId][meta.category] || 0;
    categoryAffinity += Math.min(2.5, userPref * 0.25);
  }

  // 4. TIME DECAY & VIRAL ACCELERATION
  const birthTime = stats && stats.birthtime ? new Date(stats.birthtime).getTime() : Date.now();
  const hoursOld = Math.max(0.1, (Date.now() - birthTime) / (1000 * 60 * 60));
  const freshnessBonus = Math.max(0.2, 1 / Math.pow(hoursOld + 2, 0.7));

  // 5. MASTER HYPER-RETAIN ALGORITHM SCORE FORMULA
  const score = (
    (completionRatio * 50) +
    (loopBonus) +
    (shareRatio * 45) + // Shares = Highest Viral Multiplier
    (commentRatio * 30) +
    (likeRatio * 20) -
    (skipRatio * 50)  // Fast Skip (<1.5s) = Hard Penalty
  ) * categoryAffinity * (1 + freshnessBonus);

  return {
    score: Number(Math.max(1, score).toFixed(2)),
    metrics: { views, likes, comments, shares, skips, rewatchLoops, avgWatchSec: Number(avgWatchSec.toFixed(1)), completionRatio: Number(completionRatio.toFixed(2)) }
  };
}

function getFileDetails(fileName, stats, dirPath) {
  const cleanName = extractCleanFilename(fileName);
  const allMeta = getMediaMetadata();
  const interactions = getInteractionsData();
  let meta = allMeta[cleanName];

  const ext = cleanName.split('.').pop().toLowerCase();
  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
  const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext);
  const isZip = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
  const isText = ['txt', 'pdf', 'doc', 'docx'].includes(ext);

  const birthTime = stats && stats.birthtime ? new Date(stats.birthtime) : new Date();
  const formattedDate = birthTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // 100% REAL LIKES & REAL VIEWS from interactions.json / metadata.json
  const realLikes = (interactions.likes && interactions.likes[cleanName] !== undefined)
    ? interactions.likes[cleanName]
    : (meta && meta.likes !== undefined ? meta.likes : 0);

  const realViews = (interactions.views && interactions.views[cleanName] !== undefined)
    ? interactions.views[cleanName]
    : (meta && meta.views !== undefined ? meta.views : 0);

  if (!meta) {
    const cleanTitle = cleanName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    const isAsset = dirPath && dirPath.includes('assets');
    const isRemixFile = cleanName.toLowerCase().includes('remix') || cleanName.toLowerCase().includes('duet');

    let defaultCat = "ENTERTAINMENT";
    if (isAsset) defaultCat = "APP_ASSETS";
    else if (isRemixFile) defaultCat = "REMIX";
    else if (isAudio) defaultCat = "SOUNDS";
    else if (isZip) defaultCat = "COMPRESSED_ARCHIVE";
    else if (isText) defaultCat = "WRITING";
    else if (cleanName.toLowerCase().includes('reel')) defaultCat = "REELS";
    else if (cleanName.toLowerCase().includes('story')) defaultCat = "STORY";
    else if (cleanName.toLowerCase().includes('live')) defaultCat = "LIVE";
    else if (cleanName.toLowerCase().includes('ai')) defaultCat = "NEURAL_AI";

    let descText = `HD Video content uploaded to VOEXI Cinema Vault.`;
    if (isText) {
      if (dirPath) {
        try { descText = fs.readFileSync(path.join(dirPath, cleanName), 'utf8'); } catch (e) {}
      }
    } else if (isAudio) {
      descText = `Audio sound track / music hosted on VOEXI Sound Hub.`;
    } else if (isAsset) {
      descText = `Official VOEXI App Image Asset.`;
    } else if (isRemixFile) {
      descText = `Official Audio / Video Remix created on VOEXI Platform.`;
    }

    meta = {
      filename: cleanName,
      title: cleanTitle,
      description: descText,
      uploader: isAsset ? "@voexi_system" : "@admin_creator",
      uploaded_at: formattedDate,
      category: defaultCat,
      tags: ["#voexi", `#${defaultCat.toLowerCase()}`],
      views: realViews,
      likes: realLikes,
      is_remix: isRemixFile,
      remix_source_file: null,
      remix_source_uploader: null,
      remix_count: 0
    };
  } else {
    meta.views = realViews;
    meta.likes = realLikes;
  }
  return meta;
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const rawUrl = req.url.split('?')[0];
  const urlPath = decodeURIComponent(rawUrl);

  // API Endpoint: Clear All Comments
  if (urlPath === '/api/comments/clear-all' && (req.method === 'DELETE' || req.method === 'POST')) {
    const interactions = getInteractionsData();
    interactions.comments = {};
    saveInteractionsData(interactions);
    console.log(`🧹 [MEDIA SERVER] Cleared all comments from interactions.json`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'All comments cleared' }));
  }

  // API Endpoint: /api/like (Supports both App & Web Likes)
  if ((req.method === 'POST' || req.method === 'PUT') && (urlPath === '/api/like' || urlPath === '/api/comments/like')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { postId, filename, isLiked } = JSON.parse(body || '{}');
        const targetRaw = filename || postId;
        const cleanName = extractCleanFilename(targetRaw);

        if (cleanName) {
          const interactions = getInteractionsData();
          if (!interactions.likes) interactions.likes = {};

          if (isLiked === false) {
            interactions.likes[cleanName] = Math.max(0, (interactions.likes[cleanName] || 1) - 1);
          } else {
            interactions.likes[cleanName] = (interactions.likes[cleanName] || 0) + 1;
          }

          saveInteractionsData(interactions);
          console.log(`❤️ [MEDIA SERVER] Like updated for ${cleanName}: Total Likes = ${interactions.likes[cleanName]}`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, likes: interactions.likes[cleanName] }));
        }
      } catch (e) {
        console.error('Error in /api/like:', e);
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
    });
    return;
  }

  // API Endpoint: /api/view (Real View Counter Increment)
  if (urlPath === '/api/view' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { filename, postId } = JSON.parse(body || '{}');
        const cleanName = extractCleanFilename(filename || postId);

        if (cleanName) {
          const interactions = getInteractionsData();
          if (!interactions.views) interactions.views = {};
          interactions.views[cleanName] = (interactions.views[cleanName] || 0) + 1;
          saveInteractionsData(interactions);

          console.log(`👁️ [MEDIA SERVER] View count incremented for ${cleanName}: Total Views = ${interactions.views[cleanName]}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, views: interactions.views[cleanName] }));
        }
      } catch (e) {}
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
    });
    return;
  }

  // API Endpoint: /api/event (Log Real-Time User Actions: Watch Time, Skip, Share)
  if (urlPath === '/api/event' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { filename, postId, userId, event_type, duration_sec, category } = JSON.parse(body || '{}');
        const cleanName = extractCleanFilename(filename || postId);

        if (cleanName && event_type) {
          const events = getEventsData();

          if (event_type === 'skip') {
            events.skips[cleanName] = (events.skips[cleanName] || 0) + 1;
          } else if (event_type === 'share') {
            events.shares[cleanName] = (events.shares[cleanName] || 0) + 1;
          } else if (event_type === 'watch') {
            if (!events.watches[cleanName]) events.watches[cleanName] = [];
            events.watches[cleanName].push({ duration_sec: Number(duration_sec || 0), at: new Date().toISOString() });
          }

          // User Category History Preference Increment
          if (userId && category) {
            if (!events.userHistory[userId]) events.userHistory[userId] = {};
            events.userHistory[userId][category] = (events.userHistory[userId][category] || 0) + 1;
          }

          saveEventsData(events);
          console.log(`🧠 [ALGORITHM ENGINE] Logged ${event_type} on ${cleanName} (User: ${userId || 'guest'})`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, event: event_type, filename: cleanName }));
        }
      } catch (e) {}
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid event payload' }));
    });
    return;
  }

  // API Endpoint: Get, Post or Delete Comments (Supports Real Username, Avatars, Voice, Image, Video attachments)
  if (urlPath === '/api/comments') {
    if (req.method === 'GET') {
      let rawParam = '';
      if (req.url.includes('?file=')) rawParam = req.url.split('?file=')[1].split('&')[0];
      else if (req.url.includes('?filename=')) rawParam = req.url.split('?filename=')[1].split('&')[0];
      else if (req.url.includes('?postId=')) rawParam = req.url.split('?postId=')[1].split('&')[0];
      else if (req.url.includes('?id=')) rawParam = req.url.split('?id=')[1].split('&')[0];

      const cleanName = extractCleanFilename(rawParam);
      const interactions = getInteractionsData();

      let comments = (interactions.comments && interactions.comments[cleanName]) || [];

      // Fallback Search: If no comments under cleanName, check if comments exist under rawParam or any key in interactions.comments
      if (comments.length === 0 && interactions.comments) {
        for (const [k, cList] of Object.entries(interactions.comments)) {
          if (extractCleanFilename(k) === cleanName || (rawParam && (k.includes(rawParam) || rawParam.includes(k)))) {
            comments = cList;
            break;
          }
        }
      }

      const likes = (interactions.likes && (interactions.likes[cleanName] || interactions.likes[rawParam])) || 0;
      const views = (interactions.views && (interactions.views[cleanName] || interactions.views[rawParam])) || 0;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, comments, likes, views }));
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const { filename, postId, user, avatar, text, type, media_url } = JSON.parse(body || '{}');
          const cleanName = extractCleanFilename(filename || postId);

          if (cleanName) {
            const interactions = getInteractionsData();
            if (!interactions.comments) interactions.comments = {};
            if (!interactions.comments[cleanName]) interactions.comments[cleanName] = [];

            let commentType = type || 'text';
            if (media_url) {
              if (media_url.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i) || commentType === 'voice') commentType = 'voice';
              else if (media_url.match(/\.(mp4|mov|avi|mkv|webm)$/i) || commentType === 'video') commentType = 'video';
              else if (media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || commentType === 'image') commentType = 'image';
            }

            const cleanUser = user ? (user.startsWith('@') ? user : '@' + user) : '@app_user';

            const newCmt = {
              id: `cmt_${Date.now()}_${Math.floor(Math.random()*1000)}`,
              user: cleanUser,
              avatar: avatar || 'https://via.placeholder.com/50',
              text: text || (commentType === 'voice' ? '🎙 Voice Signal' : (commentType === 'video' ? '🎬 Video Signal' : '🖼 Visual Signal')),
              type: commentType,
              media_url: media_url || null,
              created_at: new Date().toISOString()
            };

            interactions.comments[cleanName].unshift(newCmt);
            saveInteractionsData(interactions);

            console.log(`💬 [MEDIA SERVER] New comment on ${cleanName}: "${newCmt.text}" by ${cleanUser} [Type: ${commentType}]`);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, comment: newCmt, comments: interactions.comments[cleanName] }));
          }
        } catch (e) {
          console.error('Error posting comment:', e);
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
      });
      return;
    }

    if (req.method === 'DELETE') {
      const rawParam = req.url.includes('?file=') ? req.url.split('?file=')[1].split('&')[0] : '';
      const cleanName = extractCleanFilename(rawParam);
      const cmtId = req.url.includes('?cmtId=') ? decodeURIComponent(req.url.split('?cmtId=')[1].split('&')[0]) : '';

      if (cleanName && cmtId) {
        const interactions = getInteractionsData();
        if (interactions.comments && interactions.comments[cleanName]) {
          interactions.comments[cleanName] = interactions.comments[cleanName].filter(c => c.id !== cmtId);
          saveInteractionsData(interactions);
          console.log(`🗑️ [MEDIA SERVER] Deleted comment ${cmtId} from ${cleanName}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, comments: interactions.comments[cleanName] }));
        }
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Comment not found' }));
    }
  }

  // API Endpoint: /api/reports
  if (urlPath === '/api/reports') {
    if (req.method === 'GET') {
      const reports = getReportsData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, reports }));
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const {
            filename,
            postId,
            reporter,
            reporter_id,
            target_creator,
            target_creator_id,
            reason,
            description,
            risk_level,
            evidence_url,
            evidence_photo
          } = JSON.parse(body || '{}');

          const rawTarget = filename || postId;
          const cleanName = extractCleanFilename(rawTarget);

          if (cleanName && reason) {
            const fileObj = findFileInStorage(cleanName);
            const fileMeta = getFileDetails(cleanName, fileObj ? fileObj.stats : null, fileObj ? fileObj.dirPath : null);

            const mediaUrl = `http://192.168.31.39:${PORT}/${encodeURIComponent(cleanName)}`;
            const customThumb = findCustomThumbnailUrl(cleanName, fileObj ? fileObj.dirPath : null);
            const thumbUrl = customThumb ? `http://192.168.31.39:${PORT}${customThumb}` : mediaUrl;

            const reports = getReportsData();
            const newReport = {
              id: `rpt_${Date.now()}_${Math.floor(Math.random()*1000)}`,
              filename: cleanName,
              vx_number: cleanName,
              post_title: fileMeta.title || cleanName,
              category: fileMeta.category || 'ENTERTAINMENT',
              uploader: target_creator || fileMeta.uploader || '@creator',
              target_creator_id: target_creator_id || 'usr_creator',
              reporter: reporter ? (reporter.startsWith('@') ? reporter : '@' + reporter) : '@app_reporter',
              reporter_id: reporter_id || 'usr_reporter',
              reason: reason,
              description: description || 'Flagged signal reported by user.',
              risk_level: risk_level || 'medium',
              media_url: mediaUrl,
              thumbnail_url: thumbUrl,
              evidence_url: evidence_url || evidence_photo || null,
              status: 'pending',
              created_at: new Date().toISOString()
            };

            reports.unshift(newReport);
            saveReportsData(reports);

            console.log(`🚨 [MEDIA SERVER] Full A-to-Z Report logged for ${cleanName} (VX Number: ${cleanName}): "${reason}" by ${newReport.reporter}`);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, report: newReport }));
          }
        } catch (e) {
          console.error("Error creating report:", e);
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
      });
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const { reportId, status } = JSON.parse(body || '{}');
          if (reportId && status) {
            let reports = getReportsData();
            let found = false;
            reports = reports.map(r => {
              if (r.id === reportId) {
                found = true;
                return { ...r, status: status, resolved_at: new Date().toISOString() };
              }
              return r;
            });

            saveReportsData(reports);
            console.log(`✅ [MEDIA SERVER] Report ${reportId} status updated to: ${status}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, updated: found }));
          }
        } catch (e) {}
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
      });
      return;
    }

    if (req.method === 'DELETE') {
      const reportId = req.url.includes('?id=') ? decodeURIComponent(req.url.split('?id=')[1].split('&')[0]) : '';
      if (reportId) {
        let reports = getReportsData();
        reports = reports.filter(r => r.id !== reportId);
        saveReportsData(reports);
        console.log(`🗑️ [MEDIA SERVER] Report ${reportId} cleared`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Report ID required' }));
    }
  }

  // API Endpoint: Create Written Articles
  if ((req.method === 'POST' || req.method === 'PUT') && urlPath === '/api/create-post') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { title, content, uploader, category, tags } = JSON.parse(body || '{}');
        const cleanTitle = (title || 'Written Article').trim();
        const fileName = `writing_${Date.now()}_${cleanTitle.replace(/[^a-zA-Z0-9_.-]/g, '_')}.txt`;
        const targetPath = path.join(LOCAL_STORAGE_DIR, fileName);

        fs.writeFileSync(targetPath, content || cleanTitle, 'utf8');

        const allMeta = getMediaMetadata();
        const formattedDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        let cleanTags = ['#voexi', '#writing', '#article'];
        if (tags) {
          cleanTags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t);
        }

        allMeta[fileName] = {
          filename: fileName,
          title: cleanTitle,
          description: content || 'Written article / post created on VOEXI Platform.',
          uploader: uploader ? (uploader.startsWith('@') ? uploader : '@' + uploader) : '@admin_creator',
          uploaded_at: formattedDate,
          category: category || 'WRITING',
          tags: cleanTags,
          views: 0,
          likes: 0
        };
        saveMediaMetadata(allMeta);

        console.log(`✍️ [MEDIA SERVER] Saved new written post: "${cleanTitle}"`);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, name: fileName, metadata: allMeta[fileName] }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // API Endpoint: Metadata
  if (urlPath === '/api/metadata') {
    if (req.method === 'GET') {
      const fileName = req.url.includes('?file=') ? decodeURIComponent(req.url.split('?file=')[1].split('&')[0]) : '';
      if (fileName) {
        const fileObj = findFileInStorage(fileName);
        const details = getFileDetails(fileName, fileObj ? fileObj.stats : null, fileObj ? fileObj.dirPath : null);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, metadata: details }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, metadata: getMediaMetadata() }));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const {
            filename,
            title,
            description,
            uploader,
            category,
            tags,
            diamond_price,
            original_price,
            discount_percent,
            status,
            is_remix,
            remix_source_file,
            remix_source_uploader
          } = JSON.parse(body || '{}');
          const cleanName = extractCleanFilename(filename);

          if (cleanName) {
            const allMeta = getMediaMetadata();
            const fileObj = findFileInStorage(cleanName);
            const existing = getFileDetails(cleanName, fileObj ? fileObj.stats : null, fileObj ? fileObj.dirPath : null);

            let cleanTags = existing.tags;
            if (Array.isArray(tags)) {
              cleanTags = tags;
            } else if (typeof tags === 'string') {
              cleanTags = tags.split(',').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t);
            }

            allMeta[cleanName] = {
              ...existing,
              title: title || existing.title,
              description: description || existing.description,
              uploader: uploader ? (uploader.startsWith('@') ? uploader : '@' + uploader) : existing.uploader,
              category: category || existing.category,
              tags: cleanTags,
              diamond_price: diamond_price !== undefined ? Number(diamond_price) : (existing.diamond_price || 0),
              original_price: original_price !== undefined ? Number(original_price) : (existing.original_price || 0),
              discount_percent: discount_percent || existing.discount_percent || '50% OFF',
              status: status || existing.status || 'APPROVED',
              is_remix: is_remix !== undefined ? is_remix : existing.is_remix,
              remix_source_file: remix_source_file || existing.remix_source_file,
              remix_source_uploader: remix_source_uploader || existing.remix_source_uploader
            };

            saveMediaMetadata(allMeta);
            console.log(`📝 [MEDIA SERVER] Metadata updated for ${cleanName}: "${allMeta[cleanName].title}"`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, metadata: allMeta[cleanName] }));
          }
        } catch (e) {
          console.error('Error updating metadata:', e);
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
      });
      return;
    }
  }

  // API Endpoint: Delete Media File
  if (req.method === 'DELETE' || urlPath.startsWith('/api/delete')) {
    let targetFileName = '';
    if (req.url.includes('?file=')) {
      targetFileName = decodeURIComponent(req.url.split('?file=')[1].split('&')[0]);
    } else {
      targetFileName = decodeURIComponent(urlPath.replace('/api/delete', '').replace(/^\//, ''));
    }

    const cleanName = extractCleanFilename(targetFileName);

    if (cleanName) {
      const fileObj = findFileInStorage(cleanName);
      if (fileObj && fs.existsSync(fileObj.fullPath)) {
        try { fs.unlinkSync(fileObj.fullPath); } catch (e) {}

        const allMeta = getMediaMetadata();
        if (allMeta[cleanName]) {
          delete allMeta[cleanName];
          saveMediaMetadata(allMeta);
        }

        console.log(`🗑️ [MEDIA SERVER] Deleted file from disk: ${cleanName}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: `Deleted ${cleanName}` }));
      }
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'File not found' }));
  }

  // API Endpoint: Upload File
  if ((req.method === 'POST' || req.method === 'PUT') && (urlPath.startsWith('/api/upload') || urlPath.startsWith('/upload'))) {
    let rawFileName = req.headers['x-file-name'] || '';
    let titleParam = req.headers['x-title'] || '';
    let descParam = req.headers['x-description'] || '';
    let uploaderParam = req.headers['x-uploader'] || '';
    let catParam = req.headers['x-category'] || '';
    let tagsParam = req.headers['x-tags'] || '';

    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      if (!rawFileName) rawFileName = parsedUrl.searchParams.get('fileName') || parsedUrl.searchParams.get('filename') || '';
      if (!titleParam) titleParam = parsedUrl.searchParams.get('title') || '';
      if (!descParam) descParam = parsedUrl.searchParams.get('desc') || parsedUrl.searchParams.get('description') || '';
      if (!uploaderParam) uploaderParam = parsedUrl.searchParams.get('uploader') || '';
      if (!catParam) catParam = parsedUrl.searchParams.get('category') || '';
      if (!tagsParam) tagsParam = parsedUrl.searchParams.get('tags') || '';
    } catch(e) {}

    if (!rawFileName) rawFileName = `media_${Date.now()}.mp4`;

    const isRemixParam = req.headers['x-is-remix'] === 'true' || req.url.includes('?isRemix=true') || catParam === 'REMIX';
    const remixSourceFile = req.headers['x-remix-source-file'] || (req.url.includes('?remixSource=') ? decodeURIComponent(req.url.split('?remixSource=')[1].split('&')[0]) : null);
    const remixSourceUploader = req.headers['x-remix-source-uploader'] || (req.url.includes('?remixUploader=') ? decodeURIComponent(req.url.split('?remixUploader=')[1].split('&')[0]) : null);

    const cleanFileName = extractCleanFilename(rawFileName).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetPath = path.join(LOCAL_STORAGE_DIR, cleanFileName);

    const reqChunks = [];
    req.on('data', chunk => reqChunks.push(chunk));
    req.on('end', () => {
      let fileBuffer = Buffer.concat(reqChunks);

      const reqContentType = req.headers['content-type'] || '';
      if (reqContentType.includes('multipart/form-data')) {
        // Find boundary header end (\r\n\r\n)
        const headerEndPattern = Buffer.from('\r\n\r\n');
        const headerEndIndex = fileBuffer.indexOf(headerEndPattern);

        if (headerEndIndex !== -1) {
          let bodyData = fileBuffer.slice(headerEndIndex + 4);
          const boundaryPattern = Buffer.from('\r\n--');
          const boundaryIndex = bodyData.lastIndexOf(boundaryPattern);

          if (boundaryIndex !== -1) {
            fileBuffer = bodyData.slice(0, boundaryIndex);
          } else {
            fileBuffer = bodyData;
          }
        }
      }

      fs.writeFileSync(targetPath, fileBuffer);
      const stats = fs.existsSync(targetPath) ? fs.statSync(targetPath) : { size: 0 };
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);

      const allMeta = getMediaMetadata();
      const ext = cleanFileName.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
      const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext);

      const formattedDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      let defaultCat = catParam || (isRemixParam ? 'REMIX' : (isVideo ? 'ENTERTAINMENT' : (isAudio ? 'SOUNDS' : 'PHOTOS')));

      if (remixSourceFile && allMeta[remixSourceFile]) {
        allMeta[remixSourceFile].remix_count = (allMeta[remixSourceFile].remix_count || 0) + 1;
      }

      let defaultTags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t) : ['#voexi', `#${defaultCat.toLowerCase()}`];
      if (isRemixParam && !defaultTags.includes('#remix')) {
        defaultTags.push('#remix', '#duet');
      }

      allMeta[cleanFileName] = {
        filename: cleanFileName,
        title: titleParam || cleanFileName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        description: descParam || (isRemixParam ? `Official Audio/Video Remix created on VOEXI Platform.` : (isVideo ? 'HD Video content uploaded to VOEXI Cinema Vault.' : (isAudio ? 'Music / Sound track uploaded to VOEXI Sound Hub.' : 'Photo asset uploaded to VOEXI Vault.'))),
        uploader: uploaderParam ? (uploaderParam.startsWith('@') ? uploaderParam : '@' + uploaderParam) : '@admin_creator',
        uploaded_at: formattedDate,
        category: defaultCat,
        tags: defaultTags,
        views: 0,
        likes: 0,
        is_remix: isRemixParam,
        remix_source_file: remixSourceFile,
        remix_source_uploader: remixSourceUploader,
        remix_count: 0
      };
      saveMediaMetadata(allMeta);

      console.log(`✅ [MEDIA SERVER] Saved upload: ${cleanFileName} (${sizeMb} MB)`);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, name: cleanFileName, sizeMb, metadata: allMeta[cleanFileName], url: `/${encodeURIComponent(cleanFileName)}` }));
    });

    req.on('error', (err) => {
      console.error('❌ [MEDIA SERVER] Upload error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
    return;
  }

  // Dynamic files.json endpoint for VOEXI App (With Instagram/TikTok Neural Algorithm Ranking)
  if (req.method === 'GET' && (urlPath === '/files.json' || urlPath === '/api/feed')) {
    const userId = req.url.includes('userId=') ? req.url.split('userId=')[1].split('&')[0] : '';
    const allFiles = getAllMediaFiles();
    const interactions = getInteractionsData();
    const reports = getReportsData();

    const jsonList = allFiles.map((item, i) => {
      const cleanName = item.filename;
      const meta = getFileDetails(cleanName, item.stats, item.dirPath);
      const ext = cleanName.split('.').pop().toLowerCase();

      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
      const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext);
      const isText = ext === 'txt';

      let postType = 'Video';
      if (meta.category === 'REMIX' || meta.is_remix) postType = 'Remix';
      else if (meta.category === 'REELS' || cleanName.toLowerCase().includes('reel')) postType = 'Reel';
      else if (meta.category === 'WRITING' || isText) postType = 'Writing';
      else if (meta.category === 'STORY' || cleanName.toLowerCase().includes('story')) postType = 'Story';
      else if (meta.category === 'SOUNDS' || isAudio) postType = 'Audio';
      else if (meta.category === 'LIVE' || cleanName.toLowerCase().includes('live')) postType = 'Live';
      else if (meta.category === 'NEURAL_AI' || cleanName.toLowerCase().includes('ai')) postType = 'Neural';
      else if (!isVideo) postType = 'Photo';

      const url = `http://192.168.31.39:${PORT}/${encodeURIComponent(cleanName)}`;
      const customThumb = findCustomThumbnailUrl(cleanName, item.dirPath);
      const thumbUrl = customThumb ? `http://192.168.31.39:${PORT}${customThumb}` : url;

      const commentsList = (interactions.comments && interactions.comments[cleanName]) || [];
      const totalLikes = (interactions.likes && interactions.likes[cleanName] !== undefined) ? interactions.likes[cleanName] : (meta.likes || 0);
      const totalViews = (interactions.views && interactions.views[cleanName] !== undefined) ? interactions.views[cleanName] : (meta.views || 0);
      const fileReports = reports.filter(r => r.filename === cleanName);

      const algo = calculateViralAlgorithmScore(cleanName, item.stats, item.dirPath, userId);

      return {
        id: `pendrive_media_${i}_${cleanName}`,
        filename: cleanName,
        title: meta.title,
        description: meta.description,
        uploader: meta.uploader,
        uploaded_at: meta.uploaded_at,
        category: meta.category,
        tags: meta.tags,
        algorithm_score: algo.score,
        algorithm_metrics: algo.metrics,
        views: totalViews,
        media_url: url,
        thumbnail_url: thumbUrl,
        video_url: isVideo ? url : undefined,
        audio_url: isAudio ? url : undefined,
        post_type: postType,
        is_reel: postType === 'Reel' || postType === 'Remix',
        is_remix: Boolean(meta.is_remix),
        remix_source_file: meta.remix_source_file,
        remix_source_uploader: meta.remix_source_uploader,
        remix_count: meta.remix_count || 0,
        created_at: meta.uploaded_at,
        likes_count: totalLikes,
        comments_count: commentsList.length,
        comments: commentsList,
        reports_count: fileReports.length,
        reports: fileReports
      };
    });

    // SORT BY NEURAL VIRALITY SCORE DESCENDING (HIGHEST VIRAL SCORE FIRST)
    jsonList.sort((a, b) => b.algorithm_score - a.algorithm_score);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(jsonList));
  }

  // Root Directory Dashboard
  if (req.method === 'GET' && (urlPath === '/' || urlPath === '')) {
    const allFiles = getAllMediaFiles();
    const storageDirs = getStorageDirectories();
    const reportsList = getReportsData();
    const pendingReports = reportsList.filter(r => r.status === 'pending');

    let totalBytes = 0;
    let reelsCount = 0;
    let remixCount = 0;
    let writingCount = 0;
    let storyCount = 0;
    let soundCount = 0;
    let liveCount = 0;
    let neuralCount = 0;
    let videoCount = 0;
    let photoCount = 0;

    const mediaItems = allFiles.map(item => {
      totalBytes += item.stats ? item.stats.size : 0;
      const ext = item.filename.split('.').pop().toLowerCase();

      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
      const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext);
      const isText = ext === 'txt';
      const isPhoto = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

      const details = getFileDetails(item.filename, item.stats, item.dirPath);
      const cat = details.category ? details.category.toUpperCase() : 'ENTERTAINMENT';

      if (cat === 'REMIX' || details.is_remix) remixCount++;
      else if (cat === 'REELS' || item.filename.toLowerCase().includes('reel')) reelsCount++;
      else if (cat === 'WRITING' || isText) writingCount++;
      else if (cat === 'STORY' || item.filename.toLowerCase().includes('story')) storyCount++;
      else if (cat === 'SOUNDS' || isAudio) soundCount++;
      else if (cat === 'LIVE' || item.filename.toLowerCase().includes('live')) liveCount++;
      else if (cat === 'NEURAL_AI' || item.filename.toLowerCase().includes('ai')) neuralCount++;
      else if (isVideo) videoCount++;
      else photoCount++;

      const customThumb = findCustomThumbnailUrl(item.filename, item.dirPath);
      const hasReports = reportsList.some(r => r.filename === item.filename && r.status === 'pending');

      return {
        filename: item.filename,
        dirPath: item.dirPath,
        sizeMb: item.stats ? (item.stats.size / (1024 * 1024)).toFixed(1) : '0.0',
        ext: ext.toUpperCase(),
        isVideo,
        isAudio,
        isText,
        isPhoto,
        customThumb,
        hasReports,
        ...details
      };
    });

    const totalStorageMb = (totalBytes / (1024 * 1024)).toFixed(1);

    const mediaCardsGridHtml = mediaItems.map(item => {
      let typeTag = 'VIDEO';
      let iconSymbol = '🎬';
      if (item.category === 'REMIX' || item.is_remix) { typeTag = 'REMIX'; iconSymbol = '🔀'; }
      else if (item.category === 'REELS') { typeTag = 'REELS'; iconSymbol = '🎬'; }
      else if (item.category === 'WRITING' || item.isText) { typeTag = 'WRITING'; iconSymbol = '✍️'; }
      else if (item.category === 'STORY') { typeTag = 'STORY'; iconSymbol = '📸'; }
      else if (item.category === 'SOUNDS' || item.isAudio) { typeTag = 'SOUNDS'; iconSymbol = '🎵'; }
      else if (item.category === 'LIVE') { typeTag = 'LIVE'; iconSymbol = '🔴'; }
      else if (item.category === 'NEURAL_AI') { typeTag = 'NEURAL_AI'; iconSymbol = '🧠'; }
      else if (!item.isVideo) { typeTag = 'PHOTO'; iconSymbol = '🖼️'; }

      const fileUrl = '/' + encodeURIComponent(item.filename);

      let thumbElement = '';
      if (item.customThumb) {
        thumbElement = '<img src="' + item.customThumb + '" class="thumb-img" alt="' + item.title + '" />';
      } else if (item.isVideo) {
        thumbElement = '<video src="' + fileUrl + '#t=0.5" preload="metadata" muted playsinline class="thumb-video" onmouseover="this.play()" onmouseout="this.pause();this.currentTime=0.5;"></video><div class="play-overlay">▶</div>';
      } else if (item.isPhoto) {
        thumbElement = '<img src="' + fileUrl + '" class="thumb-img" alt="' + item.title + '" />';
      } else if (item.isAudio || item.category === 'SOUNDS' || item.category === 'SOUND') {
        thumbElement = '<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; background:linear-gradient(135deg, #090919, #1C0A35); padding:10px; box-sizing:border-box;"><div style="font-size:28px; filter:drop-shadow(0 2px 8px rgba(56,189,248,0.5)); margin-bottom:2px;">🎵</div><div style="font-size:9px; font-weight:900; color:#38BDF8; letter-spacing:1px; margin-bottom:6px;">VOEXI SOUND TRACK</div><audio src="' + fileUrl + '" controls style="width:95%; height:32px; outline:none; border-radius:16px; accent-color:#F43F5E;"></audio></div>';
      } else if (item.isText) {
        thumbElement = '<div style="padding:15px; text-align:left; font-size:11px; color:#94A3B8; overflow:hidden;"><div style="color:#F43F5E; font-weight:900; margin-bottom:4px;">✍️ WRITTEN POST</div>' + (item.description || '').substring(0, 100) + '...</div>';
      }

      const safeTitle = (item.title || '').replace(/['"]/g, '');
      const safeUploader = (item.uploader || '').replace(/['"]/g, '');
      const safeDesc = (item.description || '').replace(/['"]/g, '');
      const safeCat = (item.category || 'ENTERTAINMENT').replace(/['"]/g, '');

      return '<div class="media-card ' + (item.hasReports ? 'reported' : '') + '" data-type="' + typeTag + '" data-cat="' + safeCat + '" data-search="' + (safeTitle + ' ' + safeUploader + ' ' + item.filename + ' ' + (item.tags || []).join(' ')).toLowerCase() + '">' +
        '<div class="thumb-area">' +
          '<span class="badge-cat">' + safeCat + '</span>' +
          (item.hasReports ? '<span class="badge-reported">🚨 REPORTED</span>' : '') +
          (item.remix_source_uploader ? '<span class="badge-remix-source">🔀 ' + item.remix_source_uploader + '</span>' : '') +
          thumbElement +
          '<span class="badge-fmt">' + item.ext + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-title">' + item.title + '</div>' +
          '<div class="card-uploader">👤 ' + item.uploader + ' • <span style="color:#64748B; font-weight:600;">' + item.uploaded_at + '</span></div>' +
          '<div class="card-desc">' + item.description + '</div>' +
          '<div class="card-tags" style="margin-top:8px;">' +
            (item.tags || []).map(t => '<span class="card-tag">' + t + '</span>').join('') +
          '</div>' +
          '<div class="card-stats">' +
            '<span>👁️ <span id="views_' + encodeURIComponent(item.filename) + '">' + item.views + '</span> views</span>' +
            '<span>❤️ <span id="likes_' + encodeURIComponent(item.filename) + '">' + item.likes + '</span> likes</span>' +
            '<span>📦 ' + item.sizeMb + ' MB</span>' +
          '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<button class="act-btn act-play" onclick="playInCinemaByFilename(\'' + encodeURIComponent(item.filename) + '\')">' + (item.isVideo ? '▶ CINEMA' : (item.isAudio || item.category === 'SOUNDS' ? '🎵 PLAY SOUND' : (item.isText ? '📖 READ' : '👁 VIEW'))) + '</button>' +
          '<button class="act-btn act-remix" onclick="openRemixModalByFilename(\'' + encodeURIComponent(item.filename) + '\')">🔀 REMIX</button>' +
          '<button class="act-btn act-edit" onclick="openEditModalByFilename(\'' + encodeURIComponent(item.filename) + '\')">✏ EDIT</button>' +
          '<button class="act-btn act-del" onclick="deleteFileByFilename(\'' + encodeURIComponent(item.filename) + '\')">🗑 DELETE</button>' +
        '</div>' +
      '</div>';
    }).join('');

    const emptyMediaMessageHtml = mediaItems.length === 0 ? '<div style="color:#64748B; font-size:13px; text-align:center; padding:40px;">No content in storage vault. Click "Write Post" or "Upload Media" above to create your first VOEXI post!</div>' : '';

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VOEXI Master Content & Moderation Hub</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; background: #030308; color: #F1F5F9; padding: 0; margin: 0; overflow-x: hidden; }

          .top-bar { background: #080811; border-bottom: 1px solid #14142B; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand-logo { background: linear-gradient(135deg, #E11D48, #F43F5E); color: #FFF; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px rgba(225, 29, 72, 0.4); }
          .brand-title { font-size: 18px; font-weight: 900; letter-spacing: 1.5px; background: linear-gradient(135deg, #FFF, #FDA4AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase; }
          .brand-sub { font-size: 11px; color: #64748B; font-weight: 600; margin-top: 2px; }
          .server-pill { background: rgba(225, 29, 72, 0.12); color: #F43F5E; border: 1px solid rgba(225, 29, 72, 0.3); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; }

          .main-container { max-width: 1240px; margin: 24px auto; padding: 0 20px; }

          .cinema-stage { display: none; background: #080811; border: 1px solid #E11D48; border-radius: 20px; padding: 22px; margin-bottom: 28px; box-shadow: 0 10px 35px rgba(225, 29, 72, 0.25); position: relative; }
          .cinema-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #1E1E38; }
          .cinema-title { font-size: 15px; font-weight: 900; color: #F43F5E; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .cinema-close { background: rgba(255,255,255,0.1); border: none; color: #FFF; padding: 6px 14px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 12px; }
          .cinema-close:hover { background: #E11D48; }

          .cinema-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; }
          @media (max-width: 900px) { .cinema-grid { grid-template-columns: 1fr; } }

          .cinema-player-area { width: 100%; text-align: center; }
          .cinema-player-area video, .cinema-player-area img { width: 100%; max-height: 490px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); object-fit: contain; background: #000; }
          .text-article-box { background: #03030A; border: 1px solid #1E1E38; padding: 20px; border-radius: 12px; text-align: left; font-size: 14px; line-height: 1.6; color: #F1F5F9; max-height: 480px; overflow-y: auto; white-space: pre-wrap; }

          .cinema-meta-panel { background: #03030A; border: 1px solid #1E1E38; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; max-height: 520px; overflow: hidden; }
          .meta-heading { font-size: 15px; font-weight: 900; color: #FFF; margin-bottom: 6px; line-height: 1.3; }
          .meta-uploader { display: inline-flex; align-items: center; gap: 6px; background: rgba(225, 29, 72, 0.15); color: #F43F5E; border: 1px solid rgba(225, 29, 72, 0.3); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-bottom: 8px; }
          .meta-desc { font-size: 11px; color: #94A3B8; line-height: 1.4; margin-bottom: 8px; background: #080811; padding: 8px 10px; border-radius: 8px; border: 1px solid #14142B; max-height: 60px; overflow-y: auto; }
          .meta-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
          .tag-pill { background: #14142B; color: #38BDF8; font-size: 9px; font-weight: 800; padding: 3px 6px; border-radius: 6px; }

          .comments-container { background: #080811; border: 1px solid #1E1E38; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; flex: 1; min-height: 0; }
          .comments-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 900; color: #F43F5E; margin-bottom: 8px; border-bottom: 1px solid #14142B; padding-bottom: 6px; letter-spacing: 0.5px; }
          .comments-list { flex: 1; overflow-y: auto; background: #03030A; border: 1px solid #14142B; border-radius: 10px; padding: 8px 10px; margin-bottom: 8px; max-height: 200px; }

          .comment-item { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #14142B; font-size: 11px; position: relative; }
          .comment-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .comment-user { color: #38BDF8; font-weight: 800; font-size: 10px; display: flex; justify-content: space-between; align-items: center; }
          .comment-text { color: #F1F5F9; margin-top: 3px; font-weight: 500; word-break: break-word; line-height: 1.3; }
          .comment-del-btn { color: #EF4444; cursor: pointer; font-size: 10px; opacity: 0.7; font-weight: bold; background: none; border: none; }
          .comment-del-btn:hover { opacity: 1; text-decoration: underline; }

          .comment-input-row { display: flex; gap: 6px; margin-top: auto; }

          .metrics-bar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 24px; }
          @media (max-width: 950px) { .metrics-bar { grid-template-columns: repeat(3, 1fr); } }

          .metric-card { background: #080811; border: 1px solid #14142B; padding: 14px; border-radius: 14px; position: relative; overflow: hidden; }
          .metric-card::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: #E11D48; }
          .metric-val { font-size: 18px; font-weight: 900; color: #FFF; }
          .metric-lbl { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-top: 2px; }

          .controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
          .search-box { flex: 1; min-width: 240px; position: relative; }
          .search-input { width: 100%; background: #080811; border: 1px solid #1E1E38; color: #FFF; padding: 12px 16px 12px 40px; border-radius: 12px; font-size: 13px; outline: none; }
          .search-input:focus { border-color: #E11D48; box-shadow: 0 0 10px rgba(225, 29, 72, 0.2); }
          .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748B; font-size: 14px; }

          .filter-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
          .tab-btn { background: #080811; border: 1px solid #1E1E38; color: #94A3B8; padding: 8px 14px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; white-space: nowrap; }
          .tab-btn.active, .tab-btn:hover { background: #E11D48; color: #FFF; border-color: #E11D48; }

          .action-buttons-group { display: flex; gap: 8px; }
          .upload-btn { background: linear-gradient(135deg, #E11D48, #F43F5E); color: #FFF; border: none; padding: 10px 16px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; }
          .write-btn { background: #14142B; color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 10px 16px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; }
          .report-hub-btn { background: rgba(225, 29, 72, 0.15); color: #F43F5E; border: 1px solid rgba(225, 29, 72, 0.4); padding: 10px 16px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; }

          .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
          .media-card { background: #080811; border: 1px solid #14142B; border-radius: 16px; overflow: hidden; transition: transform 0.2s ease, border-color 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
          .media-card:hover { transform: translateY(-3px); border-color: #E11D48; box-shadow: 0 8px 20px rgba(225, 29, 72, 0.15); }
          .media-card.reported { border-color: #EF4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }

          .thumb-area { height: 160px; background: #000; display: flex; align-items: center; justify-content: center; position: relative; border-bottom: 1px solid #14142B; overflow: hidden; }
          .thumb-video, .thumb-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
          .media-card:hover .thumb-video, .media-card:hover .thumb-img { transform: scale(1.05); }
          .play-overlay { position: absolute; width: 44px; height: 44px; background: rgba(225, 29, 72, 0.85); color: #FFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; pointer-events: none; opacity: 0.85; transition: all 0.2s ease; box-shadow: 0 0 15px rgba(225, 29, 72, 0.5); }
          .media-card:hover .play-overlay { transform: scale(1.15); opacity: 1; background: #E11D48; }

          .badge-cat { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.85); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; z-index: 5; }
          .badge-fmt { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.85); color: #F43F5E; border: 1px solid rgba(244, 63, 94, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; z-index: 5; }
          .badge-reported { position: absolute; bottom: 10px; left: 10px; background: #EF4444; color: #FFF; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; z-index: 5; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
          .badge-remix-source { position: absolute; bottom: 10px; right: 10px; background: rgba(168, 85, 247, 0.85); color: #FFF; border: 1px solid #A855F7; padding: 3px 8px; border-radius: 6px; font-size: 8px; font-weight: 900; z-index: 5; }

          .card-body { padding: 14px; flex: 1; }
          .card-title { font-size: 14px; font-weight: 800; color: #F1F5F9; word-break: break-all; line-height: 1.3; margin-bottom: 6px; }
          .card-uploader { font-size: 11px; font-weight: 800; color: #F43F5E; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
          .card-desc { font-size: 11px; color: #94A3B8; margin-bottom: 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
          .card-tag { font-size: 9px; color: #38BDF8; background: #14142B; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
          .card-stats { font-size: 10px; color: #64748B; font-weight: 700; display: flex; justify-content: space-between; border-top: 1px solid #14142B; padding-top: 8px; }

          .audio-player-wrapper { width: 100%; margin-top: 8px; }
          .audio-player-wrapper audio { width: 100%; height: 32px; border-radius: 6px; }

          .card-actions { padding: 10px 14px; background: #05050C; border-top: 1px solid #14142B; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
          .act-btn { padding: 7px 2px; border-radius: 8px; font-size: 9px; font-weight: 800; border: none; cursor: pointer; text-align: center; text-decoration: none; display: inline-block; white-space: nowrap; }
          .act-play { background: #18182B; color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3); }
          .act-play:hover { background: #38BDF8; color: #000; }
          .act-remix { background: rgba(168, 85, 247, 0.15); color: #C084FC; border: 1px solid rgba(168, 85, 247, 0.3); }
          .act-remix:hover { background: #A855F7; color: #FFF; }
          .act-edit { background: rgba(244, 63, 94, 0.15); color: #F43F5E; border: 1px solid rgba(244, 63, 94, 0.3); }
          .act-edit:hover { background: #F43F5E; color: #FFF; }
          .act-del { background: rgba(255,255,255,0.05); color: #64748B; border: 1px solid #14142B; }
          .act-del:hover { background: #EF4444; color: #FFF; }

          .modal-bg { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.88); backdrop-filter: blur(10px); z-index: 2000; justify-content: center; align-items: center; padding: 20px; }
          .modal-box { background: #080811; border: 1px solid #E11D48; border-radius: 20px; width: 100%; max-width: 580px; padding: 26px; box-shadow: 0 0 35px rgba(225, 29, 72, 0.3); max-height: 90vh; overflow-y: auto; }
          .modal-title { font-size: 16px; font-weight: 900; color: #F43F5E; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
          .form-group { margin-bottom: 12px; }
          .form-lbl { font-size: 10px; font-weight: 800; color: #38BDF8; text-transform: uppercase; margin-bottom: 4px; display: block; }
          .form-input, .form-textarea, .form-select { width: 100%; background: #03030A; border: 1px solid #1E1E38; color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 12px; outline: none; }

          .toast { position: fixed; bottom: 25px; right: 25px; background: #E11D48; color: #FFF; padding: 12px 20px; border-radius: 12px; font-weight: 800; font-size: 12px; display: none; z-index: 3000; box-shadow: 0 4px 20px rgba(225, 29, 72, 0.4); }
        </style>
      </head>
      <body>
        <div class="top-bar">
          <div class="brand">
            <div class="brand-logo">🎥</div>
            <div>
              <div class="brand-title">VOEXI MASTER CONTENT HUB</div>
              <div class="brand-sub">Scanning Locations: ${storageDirs.join(', ')}</div>
            </div>
          </div>
          <div class="server-pill">
            <span style="width:8px; height:8px; background:#F43F5E; border-radius:50%; display:inline-block;"></span>
            MEDIA SERVER ONLINE (PORT 8080)
          </div>
        </div>

        <div class="main-container">
          <!-- CINEMA THEATER STAGE -->
          <div id="cinemaStage" class="cinema-stage">
            <div class="cinema-header">
              <div id="cinemaTitle" class="cinema-title">🎬 WIDESCREEN CINEMA THEATER</div>
              <button class="cinema-close" onclick="closeCinema()">✖ Close Theater</button>
            </div>
            <div class="cinema-grid">
              <div id="cinemaPlayer" class="cinema-player-area"></div>

              <div class="cinema-meta-panel">
                <div>
                  <div id="cMetaTitle" class="meta-heading">Content Title</div>
                  <div id="cMetaUploader" class="meta-uploader">👤 @uploader</div>
                  <div id="cMetaDesc" class="meta-desc">Description text...</div>
                  <div id="cMetaTags" class="meta-tags"></div>
                </div>

                <div class="comments-container">
                  <div class="comments-header">
                    <span>💬 AUDIENCE COMMENTS (<span id="cCommentCount">0</span>)</span>
                    <button id="likeBtn" onclick="toggleLikeCurrentVideo()" style="padding:4px 10px; font-size:10px; background:#E11D48; color:#FFF; border:none; border-radius:6px; font-weight:900; cursor:pointer; display:flex; align-items:center; gap:4px;">❤️ LIKES (<span id="cLikeCount">0</span>)</button>
                  </div>
                  <div id="cCommentsList" class="comments-list">
                    <div style="color:#64748B; font-size:11px; text-align:center; padding:12px;">Loading studio comments...</div>
                  </div>
                  <div class="comment-input-row">
                    <input type="text" id="cInputText" class="form-input" placeholder="Post official admin comment..." style="margin-bottom:0; font-size:11px;" onkeyup="if(event.key==='Enter') postNewComment()" />
                    <button onclick="postNewComment()" class="upload-btn" style="padding:8px 12px; white-space:nowrap; font-size:11px;">💬 POST</button>
                  </div>
                </div>

                <div style="font-size:10px; color:#64748B; font-weight:700; display:flex; justify-content:space-between; border-top:1px solid #14142B; padding-top:6px;">
                  <span id="cMetaDate">📅 Date</span>
                  <span id="cMetaViews">👁️ <span id="cViewsCountText">0</span> Views</span>
                </div>
              </div>
            </div>
          </div>

          <!-- METRICS BAR -->
          <div class="metrics-bar">
            <div class="metric-card">
              <div class="metric-val">${reelsCount}</div>
              <div class="metric-lbl">🎬 Reels</div>
            </div>
            <div class="metric-card">
              <div class="metric-val">${remixCount}</div>
              <div class="metric-lbl">🔀 Remixes</div>
            </div>
            <div class="metric-card">
              <div class="metric-val">${writingCount}</div>
              <div class="metric-lbl">✍️ Articles</div>
            </div>
            <div class="metric-card">
              <div class="metric-val">${soundCount}</div>
              <div class="metric-lbl">🎵 Sounds</div>
            </div>
            <div class="metric-card">
              <div class="metric-val">${neuralCount}</div>
              <div class="metric-lbl">🧠 Neural AI</div>
            </div>
            <div class="metric-card">
              <div class="metric-val">${videoCount}</div>
              <div class="metric-lbl">📹 HD Videos</div>
            </div>
            <div class="metric-card">
              <div class="metric-val">${totalStorageMb} MB</div>
              <div class="metric-lbl">💾 Storage</div>
            </div>
          </div>

          <!-- CONTROLS & CATEGORY FILTER TABS -->
          <div class="controls-row">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="searchInput" class="search-input" placeholder="Search reels, remixes, articles, music, AI content, title, uploader..." onkeyup="filterMedia()" />
            </div>
            <div class="filter-tabs">
              <button class="tab-btn active" onclick="setFilter('ALL', this)">All Content (${mediaItems.length})</button>
              <button class="tab-btn" onclick="setFilter('REMIX', this)">🔀 Remixes (${remixCount})</button>
              <button class="tab-btn" onclick="setFilter('REELS', this)">🎬 Reels (${reelsCount})</button>
              <button class="tab-btn" onclick="setFilter('WRITING', this)">✍️ Writing (${writingCount})</button>
              <button class="tab-btn" onclick="setFilter('STORY', this)">📸 Story (${storyCount})</button>
              <button class="tab-btn" onclick="setFilter('SOUNDS', this)">🎵 Sounds (${soundCount})</button>
              <button class="tab-btn" onclick="setFilter('LIVE', this)">🔴 Live (${liveCount})</button>
              <button class="tab-btn" onclick="setFilter('NEURAL_AI', this)">🧠 Neural (${neuralCount})</button>
              <button class="tab-btn" onclick="setFilter('VIDEO', this)">📹 Videos (${videoCount})</button>
              <button class="tab-btn" onclick="setFilter('PHOTO', this)">🖼️ Photos (${photoCount})</button>
            </div>
            <div class="action-buttons-group">
              <button class="report-hub-btn" onclick="openReportsHubModal()">
                <span>🚨 AUDITS (${pendingReports.length})</span>
              </button>
              <button class="write-btn" onclick="openWriteModal()">
                <span>✍️ WRITE</span>
              </button>
              <button class="upload-btn" onclick="openUploadModal()">
                <span>📤 UPLOAD</span>
              </button>
            </div>
          </div>

          <!-- MEDIA CARDS GRID -->
          <div id="mediaGrid" class="media-grid">
            <!-- MEDIA_GRID_PLACEHOLDER -->
          </div>
          <!-- EMPTY_MEDIA_PLACEHOLDER -->
        </div>

        <!-- CREATE REMIX / DUET MODAL -->
        <div id="remixModal" class="modal-bg">
          <div class="modal-box">
            <div class="modal-title">
              <span>🔀 CREATE AUDIO / REEL REMIX DUET</span>
              <span style="cursor:pointer; color:#64748B;" onclick="closeRemixModal()">✖</span>
            </div>
            <div style="background:#03030A; border:1px solid #1E1E38; border-radius:12px; padding:12px; margin-bottom:14px; font-size:11px;">
              <div style="color:#A855F7; font-weight:900; margin-bottom:4px;">REMIX SOURCE CONTENT:</div>
              <div id="remixSourceTitle" style="color:#FFF; font-weight:bold;">Source Title</div>
              <div id="remixSourceUploader" style="color:#38BDF8; font-weight:bold;">@original_creator</div>
            </div>
            <input type="hidden" id="remixSourceFile" />
            <input type="hidden" id="remixSourceUploaderInput" />

            <div class="form-group">
              <label class="form-lbl">Select Your Remix Video/Audio File</label>
              <input type="file" id="remixFileInput" accept="video/*,audio/*" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Remix Title</label>
              <input type="text" id="remixTitle" class="form-input" placeholder="e.g. Cyberpunk Remix ft. @original" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Remixer Handle</label>
              <input type="text" id="remixUploader" class="form-input" value="@remix_master" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Remix Notes / Description</label>
              <textarea id="remixDesc" class="form-textarea" rows="2" placeholder="Tell viewers what you remixed..."></textarea>
            </div>
            <button onclick="publishRemixDuet()" class="upload-btn" style="width:100%; justify-content:center; padding:12px; margin-top:10px; background:linear-gradient(135deg, #A855F7, #C084FC);">🔀 PUBLISH REMIX DUET</button>
            <div id="remixProgress" style="font-size:11px; color:#C084FC; text-align:center; font-weight:800; margin-top:10px;"></div>
          </div>
        </div>

        <!-- MODERATION & REPORTS HUB MODAL -->
        <div id="reportsHubModal" class="modal-bg">
          <div class="modal-box" style="max-width: 680px;">
            <div class="modal-title">
              <span>🚨 CONTENT REPORTS & SIGNAL AUDITS HUB</span>
              <span style="cursor:pointer; color:#64748B;" onclick="closeReportsHubModal()">✖</span>
            </div>

            <div id="reportTabGroup" style="display:flex; gap:6px; margin-bottom:14px; overflow-x:auto;">
              <button class="tab-btn active" onclick="loadReportsList('ALL', this)">ALL REPORTS</button>
              <button class="tab-btn" onclick="loadReportsList('pending', this)">🚨 PENDING</button>
              <button class="tab-btn" onclick="loadReportsList('resolved', this)">✅ RESOLVED</button>
              <button class="tab-btn" onclick="loadReportsList('dismissed', this)">🚫 DISMISS</button>
            </div>

            <div id="reportsListContainer" style="max-height: 480px; overflow-y: auto;">
              <div style="color:#64748B; font-size:11px; text-align:center; padding:20px;">Loading moderation audits...</div>
            </div>
          </div>
        </div>

        <!-- WRITE POST MODAL -->
        <div id="writeModal" class="modal-bg">
          <div class="modal-box">
            <div class="modal-title">
              <span>✍️ CREATE WRITTEN ARTICLE / POST</span>
              <span style="cursor:pointer; color:#64748B;" onclick="closeWriteModal()">✖</span>
            </div>
            <div class="form-group">
              <label class="form-lbl">Article / Post Title</label>
              <input type="text" id="wTitle" class="form-input" placeholder="e.g. Future of AI in Creator Economy" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Author Handle</label>
              <input type="text" id="wUploader" class="form-input" value="@admin_creator" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Article Content / Story</label>
              <textarea id="wContent" class="form-textarea" rows="6" placeholder="Write your full post content here..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-lbl">Hashtags</label>
              <input type="text" id="wTags" class="form-input" placeholder="writing, article, voexi, thoughts" />
            </div>
            <button onclick="publishWrittenPost()" class="upload-btn" style="width:100%; justify-content:center; padding:12px; margin-top:10px;">✍️ PUBLISH ARTICLE</button>
          </div>
        </div>

        <!-- EDIT METADATA MODAL -->
        <div id="editModal" class="modal-bg">
          <div class="modal-box" style="max-width: 620px;">
            <div class="modal-title">
              <span>✏ EDIT CONTENT METADATA & ECONOMY PROPERTIES</span>
              <span style="cursor:pointer; color:#64748B;" onclick="closeEditModal()">✖</span>
            </div>

            <input type="hidden" id="editFilename" />

            <div style="background:#03030A; border:1px solid #1E1E38; border-radius:12px; padding:12px; margin-bottom:14px; font-size:11px;">
              <div style="color:#F43F5E; font-weight:800; margin-bottom:4px;">📌 FILE SPECIFICATIONS & DIRECT STREAM:</div>
              <div style="color:#FFF; display:flex; justify-content:space-between; margin-bottom:2px;">
                <span>Filename:</span> <b id="editFilenameTxt" style="color:#38BDF8;">file.mp4</b>
              </div>
              <div style="color:#FFF; display:flex; justify-content:space-between;">
                <span>Direct Stream URL:</span> <b id="editStreamUrlTxt" style="color:#22C55E; font-size:10px; word-break:break-all;">http://...</b>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div class="form-group">
                <label class="form-lbl">Title</label>
                <input type="text" id="editTitle" class="form-input" placeholder="Title" />
              </div>
              <div class="form-group">
                <label class="form-lbl">Uploader Handle</label>
                <input type="text" id="editUploader" class="form-input" placeholder="@creator_name" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-lbl">Category</label>
              <select id="editCategory" class="form-select">
                <option value="REMIX">🔀 REMIX</option>
                <option value="REELS">🎬 REELS</option>
                <option value="WRITING">✍️ WRITING</option>
                <option value="STORY">📸 STORY</option>
                <option value="SOUNDS">🎵 SOUNDS</option>
                <option value="LIVE">🔴 LIVE</option>
                <option value="NEURAL_AI">🧠 NEURAL_AI</option>
                <option value="ENTERTAINMENT">📹 ENTERTAINMENT</option>
                <option value="GAMING">🎮 GAMING</option>
                <option value="VLOGS">🎥 VLOGS</option>
                <option value="APP_ASSETS">📱 APP_ASSETS</option>
                <option value="PHOTOS">🖼️ PHOTOS</option>
              </select>
            </div>

            <!-- DYNAMIC OFFER PSYCHOLOGY MATH CALCULATOR PILL -->
            <div id="editCalcPill" style="background:rgba(234, 179, 8, 0.15); color:#FFD700; border:1px solid rgba(234, 179, 8, 0.4); padding:6px 12px; border-radius:8px; font-size:10px; font-weight:900; margin-bottom:12px; display:none; text-align:center;">
              🔥 OFFER PSYCHOLOGY MATH: 50% OFF • USER SAVES 500 💎!
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
              <div class="form-group">
                <label class="form-lbl">Diamond Price (💎)</label>
                <input type="number" id="editPriceInput" class="form-input" placeholder="0" oninput="autoCalculateMediaDiscountMath()" />
              </div>

              <div class="form-group">
                <label class="form-lbl">Original Price (💎)</label>
                <input type="number" id="editOrigPriceInput" class="form-input" placeholder="0" oninput="autoCalculateMediaDiscountMath()" />
              </div>

              <div class="form-group">
                <label class="form-lbl">Offer / Discount Tag</label>
                <input type="text" id="editDiscountInput" class="form-input" placeholder="50% OFF" oninput="autoCalculateMediaFromDiscountTag()" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-lbl">Description / Story Content</label>
              <textarea id="editDesc" class="form-textarea" rows="3" placeholder="Description or content..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-lbl">Hashtags (comma separated)</label>
              <input type="text" id="editTags" class="form-input" placeholder="cinema, reels, remix, voexi" />
            </div>

            <div style="display:flex; gap:8px; margin-top:14px;">
              <button onclick="copyMediaStreamUrl()" class="act-btn act-play" style="flex:1; padding:10px; font-size:11px;">📋 COPY STREAM URL</button>
              <button onclick="saveMetadataChanges()" class="upload-btn" style="flex:1.5; justify-content:center; padding:10px; font-size:11px;">💾 SAVE METADATA</button>
            </div>
          </div>
        </div>

        <!-- UPLOAD MODAL -->
        <div id="uploadModal" class="modal-bg">
          <div class="modal-box">
            <div class="modal-title">
              <span>📤 UPLOAD MEDIA (VIDEO, AUDIO, PHOTO)</span>
              <span style="cursor:pointer; color:#64748B;" onclick="closeUploadModal()">✖</span>
            </div>
            <div class="form-group">
              <label class="form-lbl">Select Video, Audio or Photo File</label>
              <input type="file" id="mediaInput" accept="video/*,audio/*,image/*" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Title</label>
              <input type="text" id="upTitle" class="form-input" placeholder="e.g. My Viral Reel / Song Track" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Uploader Handle</label>
              <input type="text" id="upUploader" class="form-input" value="@admin_creator" />
            </div>
            <div class="form-group">
              <label class="form-lbl">Category</label>
              <select id="upCategory" class="form-select">
                <option value="REELS">🎬 REELS</option>
                <option value="REMIX">🔀 REMIX / DUET</option>
                <option value="SOUNDS">🎵 SOUNDS / MUSIC</option>
                <option value="STORY">📸 STORY</option>
                <option value="LIVE">🔴 LIVE STREAM RECORDING</option>
                <option value="NEURAL_AI">🧠 NEURAL AI GENERATED</option>
                <option value="ENTERTAINMENT">📹 ENTERTAINMENT</option>
                <option value="GAMING">🎮 GAMING</option>
                <option value="VLOGS">🎥 VLOGS</option>
                <option value="PHOTOS">🖼️ PHOTOS</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-lbl">Description</label>
              <textarea id="upDesc" class="form-textarea" rows="2" placeholder="Description..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-lbl">Hashtags</label>
              <input type="text" id="upTags" class="form-input" placeholder="reels, music, voexi, viral" />
            </div>
            <button onclick="uploadMediaWithDetails()" class="upload-btn" style="width:100%; justify-content:center; padding:12px; margin-top:10px;">⚡ START UPLOAD</button>
            <div id="uploadProgress" style="font-size:11px; color:#F43F5E; text-align:center; font-weight:800; margin-top:10px;"></div>
          </div>
        </div>

        <div id="toast" class="toast"></div>

        <script>
          const ALL_MEDIA_ITEMS = ${JSON.stringify(mediaItems)};
          let currentFilter = 'ALL';
          let currentCinemaFile = '';

          function showToast(msg) {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.style.display = 'block';
            setTimeout(() => { t.style.display = 'none'; }, 3000);
          }

          function playInCinemaByFilename(encFilename) {
            const fileName = decodeURIComponent(encFilename);
            const item = ALL_MEDIA_ITEMS.find(m => m.filename === fileName) || { filename: fileName, title: fileName, category: 'ENTERTAINMENT' };
            playInCinema(item);
          }

          function openRemixModalByFilename(encFilename) {
            const fileName = decodeURIComponent(encFilename);
            const item = ALL_MEDIA_ITEMS.find(m => m.filename === fileName) || { filename: fileName, title: fileName, uploader: '@creator' };
            openRemixModal(item);
          }

          function openEditModalByFilename(encFilename) {
            const fileName = decodeURIComponent(encFilename);
            const item = ALL_MEDIA_ITEMS.find(m => m.filename === fileName) || { filename: fileName, title: fileName, uploader: '@creator' };
            openEditModal(item);
          }

          function deleteFileByFilename(encFilename) {
            const fileName = decodeURIComponent(encFilename);
            deleteFile(fileName);
          }

          function playInCinema(item) {
            currentCinemaFile = item.filename;
            const url = '/' + item.filename;
            const stage = document.getElementById('cinemaStage');
            const player = document.getElementById('cinemaPlayer');

            document.getElementById('cinemaTitle').innerText = '🎬 ' + item.category + ': ' + item.title;
            document.getElementById('cMetaTitle').innerText = item.title;
            document.getElementById('cMetaUploader').innerText = '👤 Uploaded by ' + item.uploader + (item.remix_source_uploader ? ' (Remixed from ' + item.remix_source_uploader + ')' : '');
            document.getElementById('cMetaDesc').innerText = item.description;
            document.getElementById('cMetaDate').innerText = '📅 ' + item.uploaded_at;
            document.getElementById('cViewsCountText').innerText = item.views || 0;

            const tagsArea = document.getElementById('cMetaTags');
            tagsArea.innerHTML = (item.tags || []).map(t => '<span class="tag-pill">' + t + '</span>').join('');

            if (item.isVideo) {
              player.innerHTML = '<video src="' + url + '" controls autoplay style="width:100%; border-radius:12px;"></video>';
            } else if (item.isAudio || item.category === 'SOUNDS' || item.category === 'SOUND') {
              player.innerHTML = '<div style="padding:40px 20px; background:linear-gradient(135deg, #090919, #1C0A35); border-radius:16px; border:1px solid #A855F7; text-align:center;"><div style="font-size:64px; margin-bottom:10px; filter:drop-shadow(0 0 15px rgba(56,189,248,0.6));">🎵</div><div style="font-size:16px; font-weight:900; color:#FFF; margin-bottom:4px;">' + (item.title || 'Sound Track') + '</div><div style="font-size:12px; font-weight:bold; color:#38BDF8; margin-bottom:20px;">👤 ' + item.uploader + '</div><audio src="' + url + '" controls autoplay style="width:100%; height:45px; border-radius:22px; outline:none;"></audio></div>';
            } else if (item.isText) {
              player.innerHTML = '<div class="text-article-box">' + item.description + '</div>';
            } else {
              player.innerHTML = '<img src="' + url + '" style="max-width:100%; max-height:480px; object-fit:contain; border-radius:12px;" />';
            }

            stage.style.display = 'block';
            stage.scrollIntoView({ behavior: 'smooth' });

            loadCinemaComments(item.filename);
          }

          async function loadCinemaComments(fileName) {
            try {
              const res = await fetch('/api/comments?file=' + encodeURIComponent(fileName));
              const data = await res.json();
              if (data.success) {
                const list = data.comments || [];
                const likes = data.likes || 0;
                const views = data.views || 0;

                document.getElementById('cCommentCount').innerText = list.length;
                document.getElementById('cLikeCount').innerText = likes;
                document.getElementById('cViewsCountText').innerText = views;

                const lel = document.getElementById('likes_' + encodeURIComponent(fileName));
                if (lel) lel.innerText = likes;

                const listContainer = document.getElementById('cCommentsList');
                if (list.length === 0) {
                  listContainer.innerHTML = '<div style="color:#64748B; font-size:11px; text-align:center; padding:12px;">No comments yet. Post an official admin comment below!</div>';
                } else {
                  listContainer.innerHTML = list.map(c => \`
                    <div class="comment-item">
                      <div class="comment-user">
                        <span>👤 \${c.user || '@viewer'}</span>
                        <div>
                          <span style="color:#64748B; font-weight:600; font-size:9px; margin-right:6px;">\${c.created_at ? new Date(c.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                          <button class="comment-del-btn" onclick="deleteComment('\${c.id}')">🗑</button>
                        </div>
                      </div>
                      <div class="comment-text">\${c.text || ''}</div>
                      \${renderCommentAttachmentHtml(c)}
                    </div>
                  \`).join('');
                }
              }
            } catch (e) {
              console.error('Error loading comments:', e);
            }
          }

          async function postNewComment() {
            const input = document.getElementById('cInputText');
            const text = input.value.trim();
            if (!text || !currentCinemaFile) return;

            try {
              const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: currentCinemaFile, user: '@admin_studio', text: text, type: 'text' })
              });
              const data = await res.json();
              if (data.success) {
                input.value = '';
                loadCinemaComments(currentCinemaFile);
                showToast('💬 Admin Comment Posted!');
              }
            } catch (e) {
              alert('Error posting comment: ' + e.message);
            }
          }

          async function deleteComment(cmtId) {
            if (!confirm('Delete this comment from studio logs?')) return;
            try {
              const res = await fetch('/api/comments?file=' + encodeURIComponent(currentCinemaFile) + '&cmtId=' + encodeURIComponent(cmtId), {
                method: 'DELETE'
              });
              const data = await res.json();
              if (data.success) {
                loadCinemaComments(currentCinemaFile);
                showToast('🗑 Comment deleted!');
              }
            } catch(e) {
              alert('Error deleting comment: ' + e.message);
            }
          }

          async function toggleLikeCurrentVideo() {
            if (!currentCinemaFile) return;
            try {
              const res = await fetch('/api/comments/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: currentCinemaFile })
              });
              const data = await res.json();
              if (data.success) {
                loadCinemaComments(currentCinemaFile);
                showToast('❤️ Liked!');
              }
            } catch(e) {}
          }

          function openRemixModal(item) {
            document.getElementById('remixSourceFile').value = item.filename;
            document.getElementById('remixSourceUploaderInput').value = item.uploader;
            document.getElementById('remixSourceTitle').innerText = item.title;
            document.getElementById('remixSourceUploader').innerText = '👤 Uploaded by ' + item.uploader;
            document.getElementById('remixTitle').value = item.title + ' (Remix)';
            document.getElementById('remixModal').style.display = 'flex';
          }

          function closeRemixModal() {
            document.getElementById('remixModal').style.display = 'none';
          }

          async function publishRemixDuet() {
            const input = document.getElementById('remixFileInput');
            const prog = document.getElementById('remixProgress');
            const sourceFile = document.getElementById('remixSourceFile').value;
            const sourceUploader = document.getElementById('remixSourceUploaderInput').value;

            if (!input.files || input.files.length === 0) {
              alert('Please select your remix video/audio file!');
              return;
            }

            const file = input.files[0];
            const title = document.getElementById('remixTitle').value.trim();
            const uploader = document.getElementById('remixUploader').value.trim();
            const desc = document.getElementById('remixDesc').value.trim();

            prog.innerText = '⏳ Uploading Remix ' + file.name + '...';

            try {
              const headers = {
                'x-title': title || 'Remix of ' + sourceFile,
                'x-uploader': uploader || '@remix_master',
                'x-category': 'REMIX',
                'x-description': desc || ('Remixed from ' + sourceFile + ' by ' + sourceUploader),
                'x-is-remix': 'true',
                'x-remix-source-file': sourceFile,
                'x-remix-source-uploader': sourceUploader,
                'x-tags': 'remix, duet, voexi'
              };

              const res = await fetch('/api/upload?fileName=' + encodeURIComponent(file.name), {
                method: 'POST',
                headers: headers,
                body: file
              });
              const data = await res.json();
              if (data.success) {
                prog.innerText = '✅ Remix Published Successfully!';
                showToast('🔀 Published Remix Duet!');
                closeRemixModal();
                setTimeout(() => location.reload(), 1000);
              } else {
                prog.innerText = '❌ Error: ' + data.error;
              }
            } catch (e) {
              prog.innerText = '❌ Failed: ' + e.message;
            }
          }

          function openReportsHubModal() {
            document.getElementById('reportsHubModal').style.display = 'flex';
            loadReportsList('ALL');
          }

          function closeReportsHubModal() {
            document.getElementById('reportsHubModal').style.display = 'none';
          }

          let currentReportFilter = 'ALL';

          async function loadReportsList(statusFilter = currentReportFilter, btn) {
            currentReportFilter = statusFilter;

            const container = document.getElementById('reportsListContainer');
            try {
              const res = await fetch('/api/reports');
              const data = await res.json();
              if (data.success) {
                const allReports = data.reports || [];
                const pendingCount = allReports.filter(r => (r.status || 'pending').toLowerCase() === 'pending').length;
                const resolvedCount = allReports.filter(r => (r.status || '').toLowerCase() === 'resolved').length;
                const dismissedCount = allReports.filter(r => (r.status || '').toLowerCase() === 'dismissed').length;

                // Dynamic update of tab counts
                const tabGroup = document.getElementById('reportTabGroup');
                if (tabGroup) {
                  tabGroup.innerHTML = \`
                    <button class="tab-btn \${statusFilter === 'ALL' ? 'active' : ''}" onclick="loadReportsList('ALL', this)">ALL REPORTS (\${allReports.length})</button>
                    <button class="tab-btn \${statusFilter === 'pending' ? 'active' : ''}" onclick="loadReportsList('pending', this)">🚨 PENDING (\${pendingCount})</button>
                    <button class="tab-btn \${statusFilter === 'resolved' ? 'active' : ''}" onclick="loadReportsList('resolved', this)">✅ RESOLVED (\${resolvedCount})</button>
                    <button class="tab-btn \${statusFilter === 'dismissed' ? 'active' : ''}" onclick="loadReportsList('dismissed', this)">🚫 DISMISS (\${dismissedCount})</button>
                  \`;
                }

                let list = allReports;
                if (statusFilter !== 'ALL') {
                  list = allReports.filter(r => (r.status || 'pending').toLowerCase() === statusFilter.toLowerCase());
                }

                if (list.length === 0) {
                  container.innerHTML = \`
                    <div style="text-align:center; padding:35px 20px; background:#03030A; border-radius:14px; border:1px solid #1E1E38;">
                      <div style="font-size:36px; margin-bottom:10px;">📋</div>
                      <div style="color:#F1F5F9; font-size:13px; font-weight:bold; margin-bottom:6px;">No reports found under "\${statusFilter.toUpperCase()}" status filter</div>
                      <div style="color:#64748B; font-size:11px; margin-bottom:15px;">Click below to log a test signal audit and test resolving/dismissing live!</div>
                      <button onclick="createDemoReportSignal()" class="upload-btn" style="margin:0 auto; padding:8px 16px; font-size:11px;">⚡ LOG TEST AUDIT SIGNAL</button>
                    </div>
                  \`;
                } else {
                  container.innerHTML = list.map(r => {
                    const rawFileKey = r.vx_number || r.filename || r.content_id || r.postId || r.post_id || r.signalId || r.file || '';
                    const cleanName = extractCleanFilename(rawFileKey);

                    const fileObj = findFileInStorage(cleanName);
                    const fileMeta = getFileDetails(cleanName, fileObj ? fileObj.stats : null, fileObj ? fileObj.dirPath : null);

                    const realVxDisplay = cleanName || rawFileKey || 'VX_Media_File';
                    const realCategory = r.category || fileMeta.category || 'ENTERTAINMENT';

                    const mediaUrl = r.media_url || \`http://192.168.31.39:\${PORT}/\${encodeURIComponent(cleanName)}\`;

                    const isVideo = mediaUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                    const isPhoto = mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                    let mediaPreviewHtml = '';
                    if (isVideo) {
                      mediaPreviewHtml = '<div class="report-preview-box" style="margin:8px 0; background:#000; border-radius:10px; overflow:hidden; border:1px solid #14142B; max-height:180px; text-align:center;"><video src="' + mediaUrl + '#t=0.5" controls style="max-width:100%; max-height:170px; object-fit:contain;"></video></div>';
                    } else if (isPhoto) {
                      mediaPreviewHtml = '<div class="report-preview-box" style="margin:8px 0; background:#000; border-radius:10px; overflow:hidden; border:1px solid #14142B; max-height:180px; text-align:center;"><img src="' + mediaUrl + '" style="max-width:100%; max-height:170px; object-fit:contain;" /></div>';
                    }

                    // Extract Evidence Photos Array / URL
                    let evidenceHtml = '';
                    const evidenceList = r.evidence_photos || (r.evidence_url ? [r.evidence_url] : (r.evidence_photo ? [r.evidence_photo] : []));
                    if (Array.isArray(evidenceList) && evidenceList.length > 0) {
                      evidenceHtml = \`
                        <div style="margin:8px 0; background:#080811; padding:10px; border-radius:10px; border:1px solid #1E1E38;">
                          <div style="color:#38BDF8; font-weight:bold; font-size:10px; margin-bottom:6px;">📸 REPORTER ATTACHED EVIDENCE SCREENSHOTS (\${evidenceList.length}):</div>
                          <div style="display:flex; gap:8px; overflow-x:auto;">
                            \${evidenceList.map(pUrl => \`<img src="\${pUrl}" style="max-width:240px; max-height:180px; border-radius:8px; object-fit:contain; border:1px solid #1E1E38;" />\`).join('')}
                          </div>
                        </div>
                      \`;
                    }

                    // Extract Creator Details
                    const targetUserObj = r.reported_profile || {};
                    const creatorName = r.uploader || r.target_creator || targetUserObj.channel_name || targetUserObj.username || fileMeta.uploader || '@creator';
                    const creatorId = r.target_creator_id || r.reported_user_id || 'usr_creator';

                    // Extract Reporter Details
                    const reporterUserObj = r.reporter_profile || {};
                    const reporterName = r.reporter || r.reporter_handle || reporterUserObj.username || reporterUserObj.email || '@reporter';
                    const reporterId = r.reporter_id || 'usr_reporter';

                    // Extract Details / Log
                    const detailsLog = r.description || r.evidence_message || r.details || r.log || r.reason || 'Flagged signal audit logged by user.';

                    return \`
                      <div class="report-item-card" style="background:#03030A; border:1px solid #1E1E38; border-radius:14px; padding:16px; margin-bottom:12px;">
                        <div class="report-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #14142B; padding-bottom:6px;">
                          <span class="report-reason" style="color:#F43F5E; font-weight:900; font-size:13px;">🚨 SIGNAL AUDIT: \${r.reason || 'CONTENT_FLAGGED'}</span>
                          <span class="report-badge \${r.status === 'pending' ? 'badge-pending' : 'badge-resolved'}">\${r.status || 'pending'}</span>
                        </div>

                        <div style="background:#14142B; color:#38BDF8; padding:4px 10px; border-radius:6px; font-size:10px; font-weight:800; display:inline-block; margin-bottom:8px; border:1px solid rgba(56,189,248,0.3);">
                          📌 VX NUMBER / FILE: \${realVxDisplay} (\${realCategory})
                        </div>

                        \${mediaPreviewHtml}
                        \${evidenceHtml}

                        <div style="font-size:11px; color:#94A3B8; margin-bottom:4px; display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                          <span>👤 <b>Target Creator:</b> <span style="color:#C084FC; font-weight:bold;">\${creatorName}</span> (ID: \${creatorId})</span>
                          <span style="font-size:9px; font-weight:900; padding:2px 6px; border-radius:4px; background:#EAB308; color:#000;">RISK: \${(r.risk_level || 'medium').toUpperCase()}</span>
                        </div>

                        <div style="font-size:11px; color:#94A3B8; margin-bottom:6px; display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                          <span>🚩 <b>Reported By:</b> <span style="color:#38BDF8; font-weight:bold;">\${reporterName}</span> (ID: \${reporterId})</span>
                          <span style="color:#64748B;">📅 \${r.created_at ? new Date(r.created_at).toLocaleString() : 'Just now'}</span>
                        </div>

                        <div style="background:#080811; padding:8px 10px; border-radius:8px; border:1px solid #14142B; margin:8px 0; font-size:11px; color:#F1F5F9; line-height:1.4;">
                          <b style="color:#F43F5E;">Audit Details:</b> \${detailsLog}
                        </div>

                        <div style="display:flex; gap:8px; margin-top:10px;">
                          \${r.status !== 'resolved' ? \`<button onclick="updateReportStatus('\${r.id}', 'resolved')" class="act-btn act-play" style="padding:8px 12px; font-size:10px;">✅ RESOLVE AUDIT</button>\` : '<span style="color:#22C55E; font-weight:bold; font-size:10px; padding:4px 8px; background:rgba(34,197,94,0.15); border-radius:6px;">✅ RESOLVED</span>'}
                          \${r.status !== 'dismissed' ? \`<button onclick="updateReportStatus('\${r.id}', 'dismissed')" class="act-btn act-edit" style="padding:8px 12px; font-size:10px;">🚫 DISMISS SIGNAL</button>\` : '<span style="color:#64748B; font-weight:bold; font-size:10px; padding:4px 8px; background:rgba(255,255,255,0.05); border-radius:6px;">🚫 DISMISSED</span>'}
                          <button onclick="deleteFile('\${encodeURIComponent(realVxDisplay)}')" class="act-btn act-del" style="padding:8px 12px; font-size:10px;">🗑 DELETE FILE FROM DISK</button>
                        </div>
                      </div>
                    \`;
                  }).join('');
                }
              }
            } catch (e) {
              container.innerHTML = '<div style="color:#EF4444; text-align:center; padding:20px;">Failed to load reports: ' + e.message + '</div>';
            }
          }

          async function createDemoReportSignal() {
            try {
              const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  filename: 'VX_1789922592840_584.mp4',
                  reporter: '@admin_tester',
                  reason: 'COMMUNITY_SAFETY',
                  description: 'Test signal audit report logged for moderation testing.',
                  risk_level: 'high'
                })
              });
              const data = await res.json();
              if (data.success) {
                showToast('⚡ Test Audit Signal Created!');
                loadReportsList('ALL');
              }
            } catch(e) {}
          }

          async function updateReportStatus(reportId, status) {
            try {
              const res = await fetch('/api/reports', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportId, status })
              });
              const data = await res.json();
              if (data.success) {
                showToast('✅ Report ' + status);
                loadReportsList();
              }
            } catch(e) {}
          }

          function closeCinema() {
            const stage = document.getElementById('cinemaStage');
            document.getElementById('cinemaPlayer').innerHTML = '';
            stage.style.display = 'none';
          }

          function setFilter(type, btn) {
            currentFilter = type;
            document.querySelectorAll('.filter-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            filterMedia();
          }

          function filterMedia() {
            const query = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
            document.querySelectorAll('.media-card').forEach(card => {
              const cardType = (card.getAttribute('data-type') || '').toUpperCase();
              const cardCat = (card.getAttribute('data-cat') || '').toUpperCase();
              const searchStr = (card.getAttribute('data-search') || '').toLowerCase();

              let matchesType = false;
              if (currentFilter === 'ALL') {
                matchesType = true;
              } else if (currentFilter === 'REMIX') {
                matchesType = cardType === 'REMIX' || cardCat === 'REMIX';
              } else if (currentFilter === 'REELS') {
                matchesType = cardType === 'REELS' || cardCat === 'REELS';
              } else if (currentFilter === 'WRITING') {
                matchesType = cardType === 'WRITING' || cardCat === 'WRITING';
              } else if (currentFilter === 'STORY') {
                matchesType = cardType === 'STORY' || cardCat === 'STORY';
              } else if (currentFilter === 'SOUNDS') {
                matchesType = cardType === 'SOUNDS' || cardCat === 'SOUNDS';
              } else if (currentFilter === 'LIVE') {
                matchesType = cardType === 'LIVE' || cardCat === 'LIVE';
              } else if (currentFilter === 'NEURAL_AI') {
                matchesType = cardType === 'NEURAL_AI' || cardCat === 'NEURAL_AI';
              } else if (currentFilter === 'VIDEO') {
                matchesType = cardType === 'VIDEO' || cardCat === 'ENTERTAINMENT' || cardCat === 'VIDEO' || cardCat === 'VLOGS' || cardCat === 'GAMING';
              } else if (currentFilter === 'PHOTO') {
                matchesType = cardType === 'PHOTO' || cardCat === 'PHOTO' || cardCat === 'PHOTOS';
              } else {
                matchesType = cardType === currentFilter || cardCat === currentFilter;
              }

              const matchesQuery = !query || searchStr.includes(query);

              if (matchesType && matchesQuery) {
                card.style.display = 'flex';
              } else {
                card.style.display = 'none';
              }
            });
          }

          function openWriteModal() {
            document.getElementById('writeModal').style.display = 'flex';
          }

          function closeWriteModal() {
            document.getElementById('writeModal').style.display = 'none';
          }

          async function publishWrittenPost() {
            const title = document.getElementById('wTitle').value.trim();
            const uploader = document.getElementById('wUploader').value.trim();
            const content = document.getElementById('wContent').value.trim();
            const tags = document.getElementById('wTags').value.trim();

            if (!title || !content) {
              alert('Please enter both title and article content!');
              return;
            }

            try {
              const res = await fetch('/api/create-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, uploader, category: 'WRITING', tags })
              });
              const data = await res.json();
              if (data.success) {
                showToast('✍️ Published Article: ' + title);
                closeWriteModal();
                setTimeout(() => location.reload(), 800);
              } else {
                alert('Error: ' + data.error);
              }
            } catch (e) {
              alert('Failed to publish post: ' + e.message);
            }
          }

          function autoCalculateMediaDiscountMath() {
            const priceInput = document.getElementById('editPriceInput');
            const origPriceInput = document.getElementById('editOrigPriceInput');
            const discountInput = document.getElementById('editDiscountInput');
            const calcPill = document.getElementById('editCalcPill');

            if (!priceInput || !origPriceInput || !discountInput) return;

            const p = parseFloat(priceInput.value) || 0;
            const orig = parseFloat(origPriceInput.value) || 0;

            if (orig > 0 && p > 0 && orig > p) {
              const saved = orig - p;
              const pct = Math.round((saved / orig) * 100);
              discountInput.value = pct + '% OFF';
              if (calcPill) {
                calcPill.innerText = '🔥 OFFER PSYCHOLOGY MATH: ' + pct + '% OFF • USER SAVES ' + saved + ' 💎!';
                calcPill.style.display = 'block';
              }
            } else if (p > 0 && orig > 0 && orig <= p) {
              if (calcPill) {
                calcPill.innerText = '⚠️ Note: Set Original Price higher than Diamond Price (e.g. ' + (p * 2) + ' 💎) to calculate offer discount.';
                calcPill.style.display = 'block';
              }
            } else if (calcPill) {
              calcPill.style.display = 'none';
            }
          }

          function autoCalculateMediaFromDiscountTag() {
            const priceInput = document.getElementById('editPriceInput');
            const origPriceInput = document.getElementById('editOrigPriceInput');
            const discountInput = document.getElementById('editDiscountInput');
            const calcPill = document.getElementById('editCalcPill');

            if (!priceInput || !origPriceInput || !discountInput) return;

            const p = parseFloat(priceInput.value) || 0;
            const rawTag = discountInput.value || '';
            const match = rawTag.match(/\d+/);

            if (match && p > 0) {
              const pct = Math.min(99, Math.max(1, parseInt(match[0])));
              const calcOrig = Math.round(p / (1 - (pct / 100)));
              origPriceInput.value = calcOrig;
              const saved = calcOrig - p;

              if (calcPill) {
                calcPill.innerText = '🔥 OFFER PSYCHOLOGY MATH: ' + pct + '% OFF • USER SAVES ' + saved + ' 💎!';
                calcPill.style.display = 'block';
              }
            }
          }

          function openEditModalFromBtn(btn) {
            const item = {
              filename: decodeURIComponent(btn.getAttribute('data-fn') || ''),
              title: decodeURIComponent(btn.getAttribute('data-title') || ''),
              uploader: decodeURIComponent(btn.getAttribute('data-uploader') || '@admin_creator'),
              category: decodeURIComponent(btn.getAttribute('data-cat') || 'ENTERTAINMENT'),
              diamond_price: Number(btn.getAttribute('data-price')) || 0,
              original_price: Number(btn.getAttribute('data-orig')) || 0,
              discount_percent: decodeURIComponent(btn.getAttribute('data-discount') || '50% OFF'),
              description: decodeURIComponent(btn.getAttribute('data-desc') || ''),
              tags: decodeURIComponent(btn.getAttribute('data-tags') || '').split(',').map(t => t.trim()).filter(Boolean)
            };
            openEditModal(item);
          }

          function openEditModal(item) {
            if (!item) return;
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val !== undefined && val !== null ? val : ''; };
            const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt !== undefined && txt !== null ? txt : ''; };

            setVal('editFilename', item.filename || '');
            setTxt('editFilenameTxt', item.filename || '');
            setTxt('editStreamUrlTxt', 'http://192.168.31.39:8080/' + encodeURIComponent(item.filename || ''));
            setVal('editTitle', item.title || '');
            setVal('editUploader', item.uploader || '@admin_creator');
            setVal('editCategory', item.category || 'ENTERTAINMENT');
            setVal('editPriceInput', item.diamond_price || item.price || 0);
            setVal('editOrigPriceInput', item.original_price || ((item.diamond_price || item.price) ? (item.diamond_price || item.price) * 2 : 0));
            setVal('editDiscountInput', item.discount_percent || '50% OFF');
            setVal('editDesc', item.description || '');
            setVal('editTags', Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''));

            try { autoCalculateMediaDiscountMath(); } catch(e){}

            const modal = document.getElementById('editModal');
            if (modal) modal.style.display = 'flex';
          }

          function closeEditModal() {
            document.getElementById('editModal').style.display = 'none';
          }

          function copyMediaStreamUrl() {
            const url = document.getElementById('editStreamUrlTxt').innerText;
            navigator.clipboard.writeText(url).then(() => showToast('📋 Copied Stream URL!'));
          }

          async function saveMetadataChanges() {
            const filename = document.getElementById('editFilename').value;
            const title = document.getElementById('editTitle').value.trim();
            const uploader = document.getElementById('editUploader').value.trim();
            const category = document.getElementById('editCategory').value;
            const diamond_price = document.getElementById('editPriceInput').value;
            const original_price = document.getElementById('editOrigPriceInput').value;
            const discount_percent = document.getElementById('editDiscountInput').value.trim();
            const description = document.getElementById('editDesc').value.trim();
            const tags = document.getElementById('editTags').value.trim();

            try {
              const res = await fetch('/api/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, title, uploader, category, diamond_price, original_price, discount_percent, description, tags })
              });
              const data = await res.json();
              if (data.success) {
                showToast('📝 Saved Metadata for ' + title);
                closeEditModal();
                setTimeout(() => location.reload(), 800);
              } else {
                alert('Error: ' + data.error);
              }
            } catch (e) {
              alert('Failed to save metadata: ' + e.message);
            }
          }

          function openUploadModal() {
            document.getElementById('uploadModal').style.display = 'flex';
          }

          function closeUploadModal() {
            document.getElementById('uploadModal').style.display = 'none';
          }

          async function uploadMediaWithDetails() {
            const input = document.getElementById('mediaInput');
            const prog = document.getElementById('uploadProgress');
            if (!input.files || input.files.length === 0) {
              alert('Please select a video, audio, or photo file!');
              return;
            }

            const file = input.files[0];
            const title = document.getElementById('upTitle').value.trim();
            const uploader = document.getElementById('upUploader').value.trim();
            const category = document.getElementById('upCategory').value;
            const desc = document.getElementById('upDesc').value.trim();
            const tags = document.getElementById('upTags').value.trim();

            prog.innerText = '⏳ Uploading ' + file.name + ' (' + (file.size / (1024*1024)).toFixed(1) + ' MB)...';

            try {
              const headers = {
                'x-title': title || file.name,
                'x-uploader': uploader || '@admin_creator',
                'x-category': category,
                'x-description': desc,
                'x-tags': tags
              };

              const res = await fetch('/api/upload?fileName=' + encodeURIComponent(file.name), {
                method: 'POST',
                headers: headers,
                body: file
              });
              const data = await res.json();
              if (data.success) {
                prog.innerText = '✅ Upload Complete!';
                showToast('Uploaded ' + file.name);
                setTimeout(() => location.reload(), 1000);
              } else {
                prog.innerText = '❌ Error: ' + data.error;
              }
            } catch (e) {
              prog.innerText = '❌ Failed: ' + e.message;
            }
          }

          async function deleteFile(fileName) {
            if (!confirm('Delete ' + decodeURIComponent(fileName) + '?')) return;
            try {
              const res = await fetch('/api/delete?file=' + fileName, { method: 'DELETE' });
              const data = await res.json();
              if (data.success) {
                showToast('Deleted ' + decodeURIComponent(fileName));
                setTimeout(() => location.reload(), 800);
              }
            } catch(e) {
              alert('Delete error: ' + e.message);
            }
          }
        </script>
      </body>
      </html>
    `.replace('<!-- MEDIA_GRID_PLACEHOLDER -->', mediaCardsGridHtml).replace('<!-- EMPTY_MEDIA_PLACEHOLDER -->', emptyMediaMessageHtml);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fullHtml);
    return;
  }

  const relativePath = urlPath.substring(1);
  const fileObj = findFileInStorage(relativePath);

  if (req.method === 'PUT' || req.method === 'POST') {
    const targetPath = path.join(LOCAL_STORAGE_DIR, path.basename(relativePath));
    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    req.on('end', () => {
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end('File Uploaded Successfully');
      console.log(`✅ [MEDIA SERVER] Saved new media file: ${targetPath}`);
    });

    writeStream.on('error', (err) => {
      res.writeHead(500);
      res.end('Write Error');
      console.error('❌ [MEDIA SERVER] File write error:', err);
    });
  } else if (req.method === 'GET') {
    if (fileObj && fs.existsSync(fileObj.fullPath)) {
      if (fileObj.stats.isDirectory()) {
        fs.readdir(fileObj.fullPath, (dirErr, files) => {
          if (dirErr) {
            res.writeHead(500);
            return res.end('Directory Error');
          }
          const fileList = (files || []).map(f => `<li><a href="${urlPath}/${encodeURIComponent(f)}">${f}</a></li>`).join('');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`<h2>📁 Folder: ${urlPath}</h2><ul>${fileList}</ul>`);
        });
        return;
      }

      const filePath = fileObj.fullPath;
      const stat = fileObj.stats;
      const totalSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();

      // MIME Type Resolver
      let contentType = 'application/octet-stream';
      if (ext === '.m4a' || ext === '.mp4') contentType = 'audio/mp4';
      if (ext === '.mp3') contentType = 'audio/mpeg';
      if (ext === '.wav') contentType = 'audio/wav';
      if (ext === '.aac') contentType = 'audio/aac';
      if (ext === '.ogg') contentType = 'audio/ogg';
      if (ext === '.flac') contentType = 'audio/flac';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.gif') contentType = 'image/gif';
      if (ext === '.webp') contentType = 'image/webp';
      if (ext === '.mp4') contentType = 'video/mp4';
      if (ext === '.webm') contentType = 'video/webm';
      if (ext === '.zip') contentType = 'application/zip';
      if (ext === '.rar') contentType = 'application/x-rar-compressed';
      if (ext === '.7z') contentType = 'application/x-7z-compressed';
      if (ext === '.gz' || ext === '.tar') contentType = 'application/gzip';
      if (ext === '.glb') contentType = 'model/gltf-binary';
      if (ext === '.fbx') contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';

      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
          res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
          return res.end();
        }

        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        return fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File Not Found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('==========================================================');
    console.log(`🚀 VOEXI Media Server is ALREADY RUNNING & LIVE at http://192.168.31.39:${PORT}`);
    console.log('==========================================================');
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('==========================================================');
  console.log(`🚀 VOEXI Media Server LIVE at http://192.168.31.39:${PORT}`);
  console.log(`📁 Scanning Storage Directories: ${getStorageDirectories().join(', ')}`);
  console.log('==========================================================');
});
