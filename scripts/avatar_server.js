const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

// Increase payload limit for large 3D file uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Force no caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  console.log(`[3D SERVER] ${req.method} ${req.url}`);
  next();
});

const avatarDir = path.join(__dirname, '..', 'avatar');
const modelsDir = path.join(avatarDir, 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// ----------------------------------------------------
// 3D METADATA PERSISTENCE HELPERS
// ----------------------------------------------------
function get3DMetadata() {
  const metaPath = path.join(modelsDir, '3d_metadata.json');
  if (fs.existsSync(metaPath)) {
    try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
  }
  return {};
}

function save3DMetadata(data) {
  const metaPath = path.join(modelsDir, '3d_metadata.json');
  try {
    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving 3d_metadata.json:', e);
  }
}

function get3DAdminHistory() {
  const histPath = path.join(modelsDir, '3d_admin_history.json');
  if (fs.existsSync(histPath)) {
    try { return JSON.parse(fs.readFileSync(histPath, 'utf8')); } catch (e) {}
  }
  return [];
}

function save3DAdminHistory(data) {
  const histPath = path.join(modelsDir, '3d_admin_history.json');
  try {
    fs.writeFileSync(histPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving 3d_admin_history.json:', e);
  }
}

// ----------------------------------------------------
// SERVE STATIC 3D FILES & WEBPAGES DIRECTLY
// ----------------------------------------------------
app.use('/avatar', express.static(avatarDir));
app.use('/avatar/web', express.static(path.join(avatarDir, 'web')));
app.use('/avatar/lib', express.static(path.join(avatarDir, 'lib')));
app.use('/avatar/models', express.static(modelsDir));

// Fallback route to serve ANY 3D asset file from avatar/models/
app.get('/avatar/models/:filename', (req, res) => {
  try {
    const fileName = decodeURIComponent(req.params.filename);
    const filePath = path.join(modelsDir, fileName);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      return res.sendFile(filePath);
    }
    const files = fs.existsSync(modelsDir) ? fs.readdirSync(modelsDir) : [];
    const match = files.find(f => f.toLowerCase() === fileName.toLowerCase());
    if (match) {
      return res.sendFile(path.join(modelsDir, match));
    }
    res.status(404).send('3D Model file not found');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ----------------------------------------------------
// SIMPLE DIRECT API ENDPOINTS
// ----------------------------------------------------

// GET /api/models (List all files in avatar/models/)
app.get(['/api/models', '/api/v1/assets', '/api/v1/admin/assets'], (req, res) => {
  try {
    const allMeta = get3DMetadata();
    const files = fs.existsSync(modelsDir) ? fs.readdirSync(modelsDir) : [];
    const models = files
      .filter(f => {
        const ext = f.toLowerCase().split('.').pop();
        return ['glb', 'gltf', 'fbx', 'obj'].includes(ext);
      })
      .map(f => {
        const stats = fs.statSync(path.join(modelsDir, f));
        const nameClean = f.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        const ext = f.split('.').pop().toLowerCase();

        let cat = ext === 'fbx' ? 'EMOTES' : 'AVATAR';
        const lowerName = f.toLowerCase();
        if (lowerName.includes('shirt')) cat = 'SHIRTS';
        else if (lowerName.includes('pant') || lowerName.includes('tripo')) cat = 'PANTS';
        else if (lowerName.includes('diamond') || lowerName.includes('gem') || lowerName.includes('prop') || lowerName.includes('item')) cat = 'ITEM';

        // Check thumbnail image
        let thumbUrl = '';
        const possibleThumb = `${f}_thumb.jpeg`;
        const possibleThumbPng = `${f}_thumb.png`;
        if (fs.existsSync(path.join(modelsDir, possibleThumb))) {
          thumbUrl = `http://192.168.31.39:8085/avatar/models/${encodeURIComponent(possibleThumb)}`;
        } else if (fs.existsSync(path.join(modelsDir, possibleThumbPng))) {
          thumbUrl = `http://192.168.31.39:8085/avatar/models/${encodeURIComponent(possibleThumbPng)}`;
        }

        const savedMeta = allMeta[f] || {};
        const diamondPrice = savedMeta.diamond_price !== undefined ? savedMeta.diamond_price : 590;
        const originalPrice = savedMeta.original_price !== undefined ? savedMeta.original_price : diamondPrice * 2;
        const discountPercent = savedMeta.discount_percent || '50% OFF';
        const statusVal = savedMeta.status || 'APPROVED';
        const uploaderVal = savedMeta.uploader || '@admin_creator';
        const genderVal = savedMeta.gender_target || (f.toLowerCase().includes('female') ? 'FEMALE' : (f.toLowerCase().includes('male') ? 'MALE' : 'UNISEX'));
        const descVal = savedMeta.description || '3D Asset Model hosted in VOEXI 3D Vault.';

        const isItemModel = cat === 'ITEM' || lowerName.includes('diamond') || lowerName.includes('gem');
        const typeName = cat === 'EMOTES' ? 'Emote' : (cat === 'SHIRTS' ? 'Shirt' : (cat === 'PANTS' ? 'Pant' : (isItemModel ? '3D Prop Item' : 'Avatar Character')));

        return {
          id: f,
          filename: f,
          name: savedMeta.name || nameClean,
          uploader: uploaderVal,
          type: savedMeta.type || typeName,
          category: savedMeta.category || cat,
          is_character: !isItemModel,
          diamond_price: diamondPrice,
          original_price: originalPrice,
          discount_percent: discountPercent,
          gender_target: genderVal,
          description: descVal,
          status: statusVal,
          image: thumbUrl,
          uri: `http://192.168.31.39:8085/avatar/models/${encodeURIComponent(f)}`,
          sizeMb: (stats.size / (1024 * 1024)).toFixed(1)
        };
      });

    res.json({ success: true, models, assets: models });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/assets/:filename (Update Asset Price / Status / Offer / Details & Log Admin History)
app.put(['/api/models/:filename', '/api/v1/admin/assets/:filename'], (req, res) => {
  try {
    const targetFile = decodeURIComponent(req.params.filename);
    const {
      diamond_price,
      original_price,
      discount_percent,
      status,
      name,
      uploader,
      category,
      gender_target,
      description
    } = req.body || {};

    const allMeta = get3DMetadata();
    const oldEntry = allMeta[targetFile] || {};

    const currentPrice = diamond_price !== undefined ? Number(diamond_price) : (oldEntry.diamond_price || 590);
    const currentOrigPrice = original_price !== undefined ? Number(original_price) : (oldEntry.original_price || currentPrice * 2);

    const updatedEntry = {
      ...(allMeta[targetFile] || {}),
      name: name || oldEntry.name,
      uploader: uploader ? (uploader.startsWith('@') ? uploader : '@' + uploader) : (oldEntry.uploader || '@admin_creator'),
      category: category || oldEntry.category || 'AVATAR',
      gender_target: gender_target || oldEntry.gender_target || 'UNISEX',
      diamond_price: currentPrice,
      original_price: currentOrigPrice,
      discount_percent: discount_percent || oldEntry.discount_percent || '50% OFF',
      status: status || oldEntry.status || 'APPROVED',
      description: description || oldEntry.description || '3D Asset Model in VOEXI Vault.'
    };

    allMeta[targetFile] = updatedEntry;
    save3DMetadata(allMeta);

    // LOG ADMIN AUDIT TRAIL HISTORY
    const vxAdminNumber = `VX_ADMIN_${Math.floor(1000 + Math.random() * 9000)}`;
    const historyEntry = {
      id: `hist_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      vx_admin_number: vxAdminNumber,
      admin_handle: updatedEntry.uploader,
      filename: targetFile,
      asset_name: updatedEntry.name || targetFile,
      old_price: oldEntry.diamond_price || 590,
      new_price: currentPrice,
      old_status: oldEntry.status || 'APPROVED',
      new_status: updatedEntry.status,
      category: updatedEntry.category,
      discount_percent: updatedEntry.discount_percent,
      timestamp: new Date().toISOString()
    };

    const historyList = get3DAdminHistory();
    historyList.unshift(historyEntry);
    save3DAdminHistory(historyList);

    console.log(`[3D SERVER] Saved Admin Audit History Log (${vxAdminNumber}): ${updatedEntry.name} changed by ${updatedEntry.uploader}`);
    res.json({ success: true, metadata: updatedEntry, historyEntry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/history (Get Admin Audit History Logs)
app.get(['/api/history', '/api/v1/admin/history'], (req, res) => {
  try {
    const history = get3DAdminHistory();
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/upload (Direct 3D File Upload Stream)
app.post(['/api/upload', '/api/v1/assets/upload'], (req, res) => {
  req.setTimeout(600000);
  res.setTimeout(600000);

  const rawFileName = req.query.fileName || req.headers['x-file-name'] || `model_${Date.now()}.glb`;
  const cleanFileName = decodeURIComponent(rawFileName).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const targetPath = path.join(modelsDir, cleanFileName);

  function finishUpload() {
    try {
      const stats = fs.statSync(targetPath);
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`[3D SERVER] Uploaded & Saved: ${cleanFileName} (${sizeMb} MB)`);
      res.json({
        success: true,
        name: cleanFileName,
        sizeMb,
        url: `/avatar/models/${encodeURIComponent(cleanFileName)}`
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    fs.writeFileSync(targetPath, req.body);
    finishUpload();
  } else {
    const writeStream = fs.createWriteStream(targetPath, { flags: 'w' });
    req.pipe(writeStream);
    writeStream.on('finish', finishUpload);
    writeStream.on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
    });
  }
});

// POST /api/upload-image (Save Thumbnail Image)
app.post('/api/upload-image', (req, res) => {
  req.setTimeout(600000);
  res.setTimeout(600000);

  const modelFileName = decodeURIComponent(req.query.modelFileName || '').trim();
  if (!modelFileName) {
    return res.status(400).json({ success: false, error: 'Model file name required' });
  }

  const rawExt = req.headers['x-image-ext'] || 'png';
  const imgFileName = `${modelFileName}_thumb.${rawExt}`;
  const imgPath = path.join(modelsDir, imgFileName);

  function finishImg() {
    try {
      const imageUrl = `http://192.168.31.39:8085/avatar/models/${encodeURIComponent(imgFileName)}`;
      console.log(`[3D SERVER] Saved thumbnail image for ${modelFileName}: ${imgFileName}`);
      res.json({ success: true, image: imageUrl });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    fs.writeFileSync(imgPath, req.body);
    finishImg();
  } else {
    const writeStream = fs.createWriteStream(imgPath, { flags: 'w' });
    req.pipe(writeStream);
    writeStream.on('finish', finishImg);
    writeStream.on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
    });
  }
});

// DELETE /api/models/:filename (Direct Physical File Delete)
app.delete(['/api/models/:filename', '/api/v1/admin/assets/:filename'], (req, res) => {
  try {
    const targetFile = decodeURIComponent(req.params.filename);
    const filePath = path.join(modelsDir, targetFile);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        const tmpPath = filePath + `.${Date.now()}.del`;
        try { fs.renameSync(filePath, tmpPath); } catch (e) {}
      }

      const allMeta = get3DMetadata();
      if (allMeta[targetFile]) {
        delete allMeta[targetFile];
        save3DMetadata(allMeta);
      }

      console.log(`[3D SERVER] Physically deleted file from disk: ${targetFile}`);
      return res.json({ success: true, message: `Deleted ${targetFile}` });
    }

    res.status(404).json({ success: false, error: 'File not found on disk' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// MASTER 3D VAULT & ASSET DASHBOARD (http://192.168.31.39:8085)
// ----------------------------------------------------
app.get('/', (req, res) => {
  const files = fs.existsSync(modelsDir) ? fs.readdirSync(modelsDir) : [];
  const allMeta = get3DMetadata();

  const modelFiles = files.filter(f => {
    const ext = f.toLowerCase().split('.').pop();
    return ['glb', 'gltf', 'fbx', 'obj'].includes(ext);
  });

  let totalBytes = 0;
  let avatarCount = 0;
  let propsCount = 0;
  let clothesCount = 0;
  let emotesCount = 0;

  const modelItems = modelFiles.map(f => {
    const stats = fs.statSync(path.join(modelsDir, f));
    totalBytes += stats.size;

    const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
    const ext = f.split('.').pop().toLowerCase();
    const lowerName = f.toLowerCase();

    let cat = ext === 'fbx' ? 'EMOTES' : 'AVATAR';
    if (lowerName.includes('shirt') || lowerName.includes('pant')) cat = 'CLOTHING';
    else if (lowerName.includes('diamond') || lowerName.includes('gem') || lowerName.includes('prop') || lowerName.includes('item')) cat = 'ITEM';

    const savedMeta = allMeta[f] || {};
    const finalCat = savedMeta.category || cat;

    if (finalCat === 'ITEM' || cat === 'ITEM') propsCount++;
    else if (finalCat === 'EMOTES' || ext === 'fbx') emotesCount++;
    else if (finalCat === 'CLOTHING' || finalCat === 'SHIRTS' || finalCat === 'PANTS') clothesCount++;
    else avatarCount++;

    // Check thumbnail image
    let thumbUrl = '';
    const possibleThumb = `${f}_thumb.jpeg`;
    const possibleThumbPng = `${f}_thumb.png`;
    if (fs.existsSync(path.join(modelsDir, possibleThumb))) {
      thumbUrl = `/avatar/models/${encodeURIComponent(possibleThumb)}`;
    } else if (fs.existsSync(path.join(modelsDir, possibleThumbPng))) {
      thumbUrl = `/avatar/models/${encodeURIComponent(possibleThumbPng)}`;
    }

    const diamondPrice = savedMeta.diamond_price !== undefined ? savedMeta.diamond_price : 590;
    const originalPrice = savedMeta.original_price !== undefined ? savedMeta.original_price : diamondPrice * 2;
    const discountPercent = savedMeta.discount_percent || '50% OFF';
    const statusVal = savedMeta.status || 'APPROVED';
    const uploaderVal = savedMeta.uploader || '@admin_creator';
    const genderVal = savedMeta.gender_target || (f.toLowerCase().includes('female') ? 'FEMALE' : (f.toLowerCase().includes('male') ? 'MALE' : 'UNISEX'));
    const descVal = savedMeta.description || '3D Asset Model hosted in VOEXI Vault.';

    const nameClean = (savedMeta.name || f.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')).replace(/[^a-zA-Z0-9 _.-]/g, '');

    return {
      filename: String(f).replace(/[^a-zA-Z0-9 _.-]/g, ''),
      name: nameClean,
      uploader: String(uploaderVal).replace(/[^a-zA-Z0-9 _.-@]/g, ''),
      sizeMb: sizeMb,
      ext: ext.toUpperCase(),
      category: String(finalCat).replace(/[^a-zA-Z0-9 _.-]/g, ''),
      gender_target: String(genderVal).replace(/[^a-zA-Z0-9 _.-]/g, ''),
      diamondPrice: diamondPrice,
      original_price: originalPrice,
      discount_percent: String(discountPercent).replace(/[^a-zA-Z0-9 _%.-]/g, ''),
      status: String(statusVal).replace(/[^a-zA-Z0-9 _.-]/g, ''),
      description: String(descVal).replace(/[^a-zA-Z0-9 _.-]/g, ' '),
      thumbUrl: thumbUrl,
      stageUrl: `/avatar/web/stage.html?model=/avatar/models/${encodeURIComponent(f)}`,
      downloadUrl: `/avatar/models/${encodeURIComponent(f)}`
    };
  });

  const totalStorageMb = (totalBytes / (1024 * 1024)).toFixed(1);

  const assetCardsGridHtml = modelItems.map(item => {
    const isFBX = item.ext === 'FBX';
    const iconSymbol = isFBX ? '💃' : (item.category === 'ITEM' ? '💎' : '📦');

    let thumbHtml = '<div class="thumb-3d-box"><div class="thumb-3d-icon">' + iconSymbol + '</div><div style="font-size:10px; font-weight:800; margin-top:4px;">3D MODEL ASSET</div></div>';
    if (item.thumbUrl) {
      thumbHtml = '<img src="' + item.thumbUrl + '" class="thumb-img" alt="' + item.name + '" />';
    }

    return '<div class="asset-card" data-cat="' + item.category + '" data-search="' + (item.name + ' ' + item.filename + ' ' + item.category).replace(/['"]/g, '').toLowerCase() + '">' +
      '<div class="thumb-area">' +
        '<span class="badge-cat">' + item.category + '</span>' +
        thumbHtml +
        '<span class="badge-fmt">' + item.ext + '</span>' +
        '<span class="badge-price">💎 ' + item.diamondPrice + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-title">' + item.name + '</div>' +
        '<div class="card-sub">' + item.filename + ' • ' + item.sizeMb + ' MB</div>' +
      '</div>' +
      '<div class="card-actions" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:4px;">' +
        '<button class="act-btn act-view"' +
          ' data-fn="' + encodeURIComponent(item.filename) + '"' +
          ' data-name="' + encodeURIComponent(item.name) + '"' +
          ' data-uploader="' + encodeURIComponent(item.uploader) + '"' +
          ' data-cat="' + encodeURIComponent(item.category) + '"' +
          ' data-gender="' + encodeURIComponent(item.gender_target) + '"' +
          ' data-price="' + item.diamondPrice + '"' +
          ' data-orig="' + item.original_price + '"' +
          ' data-discount="' + encodeURIComponent(item.discount_percent) + '"' +
          ' data-status="' + encodeURIComponent(item.status) + '"' +
          ' data-desc="' + encodeURIComponent(item.description) + '"' +
          ' data-size="' + item.sizeMb + '"' +
          ' data-ext="' + item.ext + '"' +
          ' data-url="' + encodeURIComponent(item.downloadUrl) + '"' +
          ' onclick="openDetailsFromButton(this)">📝 DETAILS</button>' +
        '<button class="act-btn act-view"' +
          ' data-url="' + encodeURIComponent(item.stageUrl) + '"' +
          ' data-name="' + encodeURIComponent(item.name) + '"' +
          ' onclick="openFull3DFromBtn(this)">🔍 FULL 3D</button>' +
        '<a class="act-btn act-dl" href="' + item.downloadUrl + '" download target="_blank">⬇️ DL</a>' +
        '<button class="act-btn act-del" data-fn="' + encodeURIComponent(item.filename) + '" onclick="deleteFileFromBtn(this)">🗑️ DEL</button>' +
      '</div>' +
    '</div>';
  }).join('');

  const emptyMessageHtml = modelFiles.length === 0 ? '<div style="color:#64748B; font-size:13px; text-align:center; padding:40px;">No 3D models in vault storage. Click Upload 3D Model above to add your first GLB/FBX model!</div>' : '';

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VOEXI 3D Avatar & Prop Vault Hub</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; background: #030308; color: #F1F5F9; padding: 0; margin: 0; overflow-x: hidden; }

        .top-bar { background: #080811; border-bottom: 1px solid #14142B; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-logo { background: linear-gradient(135deg, #A855F7, #00F2FE); color: #FFF; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
        .brand-title { font-size: 18px; font-weight: 900; letter-spacing: 1.5px; background: linear-gradient(135deg, #FFF, #00F2FE); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase; }
        .brand-sub { font-size: 11px; color: #64748B; font-weight: 600; margin-top: 2px; }
        .server-pill { background: rgba(0, 242, 254, 0.12); color: #00F2FE; border: 1px solid rgba(0, 242, 254, 0.3); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; }

        .main-container { max-width: 1240px; margin: 24px auto; padding: 0 20px; }

        .metrics-bar { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 24px; }
        @media (max-width: 950px) { .metrics-bar { grid-template-columns: repeat(3, 1fr); } }

        .metric-card { background: #080811; border: 1px solid #14142B; padding: 14px; border-radius: 14px; position: relative; overflow: hidden; }
        .metric-card::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: #00F2FE; }
        .metric-val { font-size: 18px; font-weight: 900; color: #FFF; }
        .metric-lbl { font-size: 9px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-top: 2px; }

        .controls-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 240px; position: relative; }
        .search-input { width: 100%; background: #080811; border: 1px solid #1E1E38; color: #FFF; padding: 12px 16px 12px 40px; border-radius: 12px; font-size: 13px; outline: none; }
        .search-input:focus { border-color: #00F2FE; box-shadow: 0 0 10px rgba(0, 242, 254, 0.2); }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748B; font-size: 14px; }

        .filter-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
        .tab-btn { background: #080811; border: 1px solid #1E1E38; color: #94A3B8; padding: 8px 14px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; white-space: nowrap; }
        .tab-btn.active, .tab-btn:hover { background: #00F2FE; color: #000; border-color: #00F2FE; }

        .upload-btn { background: linear-gradient(135deg, #A855F7, #00F2FE); color: #FFF; border: none; padding: 10px 16px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; }

        /* 3D ASSETS GRID LAYOUT (ROWS & COLUMNS) */
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
        .asset-card { background: #080811; border: 1px solid #14142B; border-radius: 16px; overflow: hidden; transition: transform 0.2s ease, border-color 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
        .asset-card:hover { transform: translateY(-3px); border-color: #00F2FE; box-shadow: 0 8px 20px rgba(0, 242, 254, 0.15); }

        .thumb-area { height: 170px; background: #03030A; display: flex; align-items: center; justify-content: center; position: relative; border-bottom: 1px solid #14142B; overflow: hidden; }
        .thumb-img { width: 100%; height: 100%; object-fit: cover; }
        .thumb-3d-box { text-align: center; color: #00F2FE; }
        .thumb-3d-icon { font-size: 48px; }

        .badge-cat { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.85); color: #00F2FE; border: 1px solid rgba(0, 242, 254, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; z-index: 5; }
        .badge-fmt { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.85); color: #C084FC; border: 1px solid rgba(192, 132, 252, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; z-index: 5; }
        .badge-price { position: absolute; bottom: 10px; left: 10px; background: rgba(234, 179, 8, 0.9); color: #000; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; z-index: 5; }

        .card-body { padding: 14px; flex: 1; }
        .card-title { font-size: 14px; font-weight: 800; color: #F1F5F9; word-break: break-all; line-height: 1.3; margin-bottom: 6px; }
        .card-sub { font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 10px; }

        .card-actions { padding: 10px 14px; background: #05050C; border-top: 1px solid #14142B; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .act-btn { padding: 8px 4px; border-radius: 8px; font-size: 10px; font-weight: 800; border: none; cursor: pointer; text-align: center; text-decoration: none; display: inline-block; white-space: nowrap; }
        .act-view { background: #161626; color: #00F2FE; border: 1px solid rgba(0, 242, 254, 0.3); }
        .act-view:hover { background: #00F2FE; color: #000; }
        .act-dl { background: linear-gradient(135deg, #A855F7, #00F2FE); color: #FFF; }
        .act-del { background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); }
        .act-del:hover { background: #EF4444; color: #FFF; }

        .modal-bg { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.88); backdrop-filter: blur(10px); z-index: 2000; justify-content: center; align-items: center; padding: 20px; }
        .modal-box { background: #080811; border: 1px solid #00F2FE; border-radius: 20px; width: 100%; max-width: 480px; padding: 26px; box-shadow: 0 0 35px rgba(0, 242, 254, 0.3); }
        .form-group { margin-bottom: 12px; }
        .form-lbl { font-size: 10px; font-weight: 800; color: #00F2FE; text-transform: uppercase; margin-bottom: 4px; display: block; }
        .form-input { width: 100%; background: #03030A; border: 1px solid #1E1E38; color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 12px; outline: none; }

        .toast { position: fixed; bottom: 25px; right: 25px; background: #00F2FE; color: #000; padding: 12px 20px; border-radius: 12px; font-weight: 800; font-size: 12px; display: none; z-index: 3000; box-shadow: 0 4px 20px rgba(0, 242, 254, 0.4); }
      </style>
    </head>
    <body>
      <div class="top-bar">
        <div class="brand">
          <div class="brand-logo">🎭</div>
          <div>
            <div class="brand-title">VOEXI 3D AVATAR & PROP VAULT</div>
            <div class="brand-sub">Storage Vault: ${modelsDir}</div>
          </div>
        </div>
        <div class="server-pill">
          <span style="width:8px; height:8px; background:#00F2FE; border-radius:50%; display:inline-block;"></span>
          3D SERVER ONLINE (PORT 8085)
        </div>
      </div>

      <div class="main-container">
        <!-- METRICS BAR -->
        <div class="metrics-bar">
          <div class="metric-card">
            <div class="metric-val">${modelFiles.length}</div>
            <div class="metric-lbl">📦 Total Assets</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${avatarCount}</div>
            <div class="metric-lbl">🎭 Avatars</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${propsCount}</div>
            <div class="metric-lbl">💎 3D Props / Items</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${clothesCount}</div>
            <div class="metric-lbl">👕 Clothing</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${emotesCount}</div>
            <div class="metric-lbl">💃 Emotes (FBX)</div>
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
            <input type="text" id="searchInput" class="search-input" placeholder="Search 3D character models, GLB, FBX, clothes, props..." onkeyup="filterAssets()" />
          </div>
          <div class="filter-tabs">
            <button class="tab-btn active" onclick="setFilter('ALL', this)">All Assets (${modelFiles.length})</button>
            <button class="tab-btn" onclick="setFilter('AVATAR', this)">🎭 Avatars (${avatarCount})</button>
            <button class="tab-btn" onclick="setFilter('ITEM', this)">💎 3D Props (${propsCount})</button>
            <button class="tab-btn" onclick="setFilter('CLOTHING', this)">👕 Clothes (${clothesCount})</button>
            <button class="tab-btn" onclick="setFilter('EMOTES', this)">💃 Emotes (${emotesCount})</button>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="upload-btn" style="background:rgba(168, 85, 247, 0.15); color:#C084FC; border:1px solid rgba(168, 85, 247, 0.4);" onclick="openAdminHistoryModal()">
              <span>📜 ADMIN LOGS</span>
            </button>
            <button class="upload-btn" onclick="openUploadModal()">
              <span>⚡ UPLOAD 3D MODEL</span>
            </button>
          </div>
        </div>

        <!-- 3D ASSET CARDS GRID (ROWS & COLUMNS) -->
        <div id="assetGrid" class="asset-grid">
          <!-- GRID_PLACEHOLDER -->
        </div>
        <!-- EMPTY_PLACEHOLDER -->
      </div>

      <!-- FULL 3D STAGE INSPECTION MODAL -->
      <div id="full3DStageModal" class="modal-bg">
        <div class="modal-box" style="max-width: 920px; width: 95%; height: 86vh; display: flex; flex-direction: column; padding: 18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span id="full3DModalTitle" style="font-size:15px; font-weight:900; color:#00F2FE;">🖥️ FULL 3D STAGE INSPECT</span>
              <span style="background:#14142B; color:#C084FC; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:800;">3D MODEL STAGE</span>
            </div>
            <button onclick="closeFull3DModal()" class="act-btn act-del" style="padding:6px 14px; font-size:11px;">✖ CLOSE STAGE</button>
          </div>
          <iframe id="full3DIframe" src="" style="flex:1; width:100%; border:1px solid #1E1E38; border-radius:14px; background:#000;"></iframe>
        </div>
      </div>

      <!-- 3D ASSET DETAILS & METADATA MODAL (FULL A-TO-Z PROPERTIES) -->
      <div id="detailsModal" class="modal-bg">
        <div class="modal-box" style="max-width: 620px;">
          <div style="font-size:16px; font-weight:900; color:#00F2FE; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <span>📝 3D ASSET DETAILS & ECONOMY PROPERTIES</span>
            <span style="cursor:pointer; color:#64748B;" onclick="closeDetailsModal()">✖</span>
          </div>

          <input type="hidden" id="detFilename" />

          <!-- CUSTOM THUMBNAIL COVER PREVIEW & UPLOAD -->
          <div style="background:#03030A; border:1px solid #1E1E38; border-radius:12px; padding:12px; margin-bottom:14px; text-align:center;">
            <div style="color:#00F2FE; font-weight:800; font-size:11px; margin-bottom:8px;">🖼️ 3D MODEL CUSTOM COVER THUMBNAIL:</div>
            <div style="width:100%; height:140px; background:#080811; border:1px dashed #1E1E38; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; margin-bottom:8px; position:relative;">
              <img id="detThumbImgPreview" src="" style="width:100%; height:100%; object-fit:cover; display:none;" />
              <div id="detThumbPlaceholder" style="color:#64748B; font-size:11px; font-weight:bold;">No Cover Image Set (Select Image File Below)</div>
            </div>
            <input type="file" id="detImageInput" accept="image/*" class="form-input" style="padding:6px; font-size:11px;" onchange="previewThumbnailFile(this)" />
          </div>

          <div style="background:#03030A; border:1px solid #1E1E38; border-radius:12px; padding:12px; margin-bottom:14px; font-size:11px;">
            <div style="color:#C084FC; font-weight:800; margin-bottom:6px;">📌 FILE SPECIFICATIONS & LIVE STREAM:</div>
            <div style="color:#FFF; display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Filename:</span> <b id="detFilenameTxt" style="color:#38BDF8;">file.glb</b>
            </div>
            <div style="color:#FFF; display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Size & Format:</span> <b id="detSizeTxt">10.3 MB • GLB</b>
            </div>
            <div style="color:#FFF; display:flex; justify-content:space-between;">
              <span>Stream URL:</span> <b id="detStreamUrlTxt" style="color:#22C55E; font-size:10px; word-break:break-all;">http://...</b>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-lbl">Display Name</label>
              <input type="text" id="detNameInput" class="form-input" placeholder="Display Name" />
            </div>

            <div class="form-group">
              <label class="form-lbl">Uploader Handle</label>
              <input type="text" id="detUploaderInput" class="form-input" placeholder="@admin_creator" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-lbl">Asset Category</label>
              <select id="detCategorySelect" class="form-input">
                <option value="AVATAR">🎭 AVATAR CHARACTER</option>
                <option value="ITEM">💎 3D PROP ITEM / GEMSTONE</option>
                <option value="CLOTHING">👕 CLOTHING (SHIRT/PANT)</option>
                <option value="EMOTES">💃 EMOTE ANIMATION (FBX)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-lbl">Gender Target</label>
              <select id="detGenderSelect" class="form-input">
                <option value="UNISEX">🌐 UNISEX / ALL</option>
                <option value="MALE">👨 MALE CHARACTER</option>
                <option value="FEMALE">👩 FEMALE CHARACTER</option>
              </select>
            </div>
          </div>

          <!-- DYNAMIC OFFER PSYCHOLOGY MATH CALCULATOR PILL -->
          <div id="detCalcPill" style="background:rgba(234, 179, 8, 0.15); color:#FFD700; border:1px solid rgba(234, 179, 8, 0.4); padding:6px 12px; border-radius:8px; font-size:10px; font-weight:900; margin-bottom:12px; display:none; text-align:center;">
            🔥 OFFER PSYCHOLOGY MATH: 50% OFF • USER SAVES 590 💎!
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-lbl">Diamond Price (💎)</label>
              <input type="number" id="detPriceInput" class="form-input" placeholder="590" oninput="autoCalculateDiscountMath()" />
            </div>

            <div class="form-group">
              <label class="form-lbl">Original Price (💎)</label>
              <input type="number" id="detOrigPriceInput" class="form-input" placeholder="1180" oninput="autoCalculateDiscountMath()" />
            </div>

            <div class="form-group">
              <label class="form-lbl">Offer / Discount Tag</label>
              <input type="text" id="detDiscountInput" class="form-input" placeholder="50% OFF" oninput="autoCalculateFromDiscountTag()" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-lbl">Approval Status</label>
            <select id="detStatusSelect" class="form-input">
              <option value="APPROVED">✅ APPROVED (STORE READY)</option>
              <option value="PENDING_REVIEW">⏳ PENDING REVIEW</option>
              <option value="FEATURED">🌟 FEATURED HERO DROP</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-lbl">Asset Description</label>
            <textarea id="detDescInput" class="form-input" rows="2" style="height:50px; resize:none;" placeholder="3D Asset Model description..."></textarea>
          </div>

          <div style="display:flex; gap:8px; margin-top:14px;">
            <button onclick="copyStreamUrl()" class="act-btn act-view" style="flex:1; padding:10px; font-size:11px;">📋 COPY STREAM URL</button>
            <button onclick="saveAssetDetails()" class="upload-btn" style="flex:1.5; justify-content:center; padding:10px; font-size:11px;">💾 SAVE PROPERTIES</button>
          </div>
        </div>
      </div>

      <!-- ADMIN AUDIT TRAIL HISTORY LOGS MODAL -->
      <div id="adminHistoryModal" class="modal-bg">
        <div class="modal-box" style="max-width: 680px;">
          <div style="font-size:16px; font-weight:900; color:#A855F7; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <span>📜 ADMIN AUDIT TRAIL HISTORY LOGS</span>
            <span style="cursor:pointer; color:#64748B;" onclick="closeAdminHistoryModal()">✖</span>
          </div>

          <div id="adminHistoryListContainer" style="max-height: 480px; overflow-y: auto;">
            <div style="color:#64748B; font-size:11px; text-align:center; padding:20px;">Loading admin history logs...</div>
          </div>
        </div>
      </div>

      <!-- UPLOAD MODAL -->
      <div id="uploadModal" class="modal-bg">
        <div class="modal-box">
          <div style="font-size:16px; font-weight:900; color:#00F2FE; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <span>⚡ UPLOAD 3D MODEL FILE</span>
            <span style="cursor:pointer; color:#64748B;" onclick="closeUploadModal()">✖</span>
          </div>
          <div class="form-group">
            <label class="form-lbl">SELECT 3D MODEL FILE (.GLB / .FBX / .GLTF / .OBJ)</label>
            <input type="file" id="modalFileInput" class="form-input" accept=".glb,.fbx,.gltf,.obj" />
          </div>
          <button onclick="submitUpload()" class="upload-btn" style="width:100%; justify-content:center; padding:12px; margin-top:16px;">🚀 UPLOAD TO 3D VAULT</button>
          <div id="uploadProgress" style="font-size:11px; color:#00F2FE; text-align:center; font-weight:800; margin-top:10px;"></div>
        </div>
      </div>

      <div id="toast" class="toast"></div>

      <script>
        let currentFilter = 'ALL';

        function showToast(msg) {
          const t = document.getElementById('toast');
          t.innerText = msg;
          t.style.display = 'block';
          setTimeout(() => { t.style.display = 'none'; }, 3000);
        }

        async function openAdminHistoryModal() {
          const modal = document.getElementById('adminHistoryModal');
          const container = document.getElementById('adminHistoryListContainer');
          if (modal) modal.style.display = 'flex';

          try {
            const res = await fetch('/api/v1/admin/history');
            const data = await res.json();
            if (data.success) {
              const list = data.history || [];
              if (list.length === 0) {
                container.innerHTML = '<div style="color:#22C55E; font-size:12px; text-align:center; padding:30px; font-weight:bold;">✅ NO ADMIN EDITS LOGGED YET! All 3D asset properties untouched.</div>';
              } else {
                container.innerHTML = list.map(function(h) {
                  return '<div style="background:#03030A; border:1px solid #1E1E38; border-radius:12px; padding:12px; margin-bottom:10px; font-size:11px;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid #14142B; padding-bottom:6px;">' +
                      '<span style="background:rgba(168, 85, 247, 0.2); color:#C084FC; border:1px solid rgba(168, 85, 247, 0.4); padding:3px 8px; border-radius:6px; font-weight:900; font-size:10px;">📌 ' + (h.vx_admin_number || 'VX_ADMIN') + '</span>' +
                      '<span style="color:#64748B; font-size:10px;">📅 ' + (h.timestamp ? new Date(h.timestamp).toLocaleString() : 'Just now') + '</span>' +
                    '</div>' +
                    '<div style="color:#FFF; font-weight:bold; margin-bottom:4px;">' +
                      'Asset: <span style="color:#38BDF8;">' + (h.asset_name || h.filename) + '</span> (' + h.filename + ')' +
                    '</div>' +
                    '<div style="color:#94A3B8; margin-bottom:4px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">' +
                      '<span>👤 Admin: <b style="color:#A855F7;">' + (h.admin_handle || '@admin_creator') + '</b></span>' +
                      '<span>Category: <b style="color:#00F2FE;">' + (h.category || 'AVATAR') + '</b></span>' +
                    '</div>' +
                    '<div style="background:#080811; padding:8px 10px; border-radius:8px; border:1px solid #14142B; margin-top:6px; color:#F1F5F9; font-size:10.5px;">' +
                      '💎 Price Changed: <s style="color:#EF4444;">💎 ' + (h.old_price || 590) + '</s> ➔ <b style="color:#22C55E;">💎 ' + (h.new_price || 590) + '</b> (' + (h.discount_percent || '50% OFF') + ')' +
                      '<br>' +
                      'Status: <b style="color:#00F2FE;">' + (h.new_status || 'APPROVED') + '</b>' +
                    '</div>' +
                  '</div>';
                }).join('');
              }
            }
          } catch(e) {
            container.innerHTML = '<div style="color:#EF4444; padding:20px; text-align:center;">Failed to load admin logs: ' + e.message + '</div>';
          }
        }

        function closeAdminHistoryModal() {
          const modal = document.getElementById('adminHistoryModal');
          if (modal) modal.style.display = 'none';
        }

        function openDetailsFromButton(btn) {
          const item = {
            filename: decodeURIComponent(btn.getAttribute('data-fn') || ''),
            name: decodeURIComponent(btn.getAttribute('data-name') || ''),
            uploader: decodeURIComponent(btn.getAttribute('data-uploader') || '@admin_creator'),
            category: decodeURIComponent(btn.getAttribute('data-cat') || 'AVATAR'),
            gender_target: decodeURIComponent(btn.getAttribute('data-gender') || 'UNISEX'),
            diamondPrice: Number(btn.getAttribute('data-price')) || 590,
            original_price: Number(btn.getAttribute('data-orig')) || 1180,
            discount_percent: decodeURIComponent(btn.getAttribute('data-discount') || '50% OFF'),
            status: decodeURIComponent(btn.getAttribute('data-status') || 'APPROVED'),
            description: decodeURIComponent(btn.getAttribute('data-desc') || '3D Asset Model hosted in VOEXI Vault.'),
            sizeMb: btn.getAttribute('data-size') || '0.0',
            ext: btn.getAttribute('data-ext') || 'GLB',
            downloadUrl: decodeURIComponent(btn.getAttribute('data-url') || '')
          };
          openDetailsModal(item);
        }

        function openFull3DFromBtn(btn) {
          const url = decodeURIComponent(btn.getAttribute('data-url') || '');
          const name = decodeURIComponent(btn.getAttribute('data-name') || '');
          openFull3DModal(url, name);
        }

        function deleteFileFromBtn(btn) {
          const fileName = decodeURIComponent(btn.getAttribute('data-fn') || '');
          deleteFile(fileName);
        }

        function autoCalculateDiscountMath() {
          const priceInput = document.getElementById('detPriceInput');
          const origPriceInput = document.getElementById('detOrigPriceInput');
          const discountInput = document.getElementById('detDiscountInput');
          const calcPill = document.getElementById('detCalcPill');

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

        function autoCalculateFromDiscountTag() {
          const priceInput = document.getElementById('detPriceInput');
          const origPriceInput = document.getElementById('detOrigPriceInput');
          const discountInput = document.getElementById('detDiscountInput');
          const calcPill = document.getElementById('detCalcPill');

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

        function previewThumbnailFile(input) {
          if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
              const img = document.getElementById('detThumbImgPreview');
              const placeholder = document.getElementById('detThumbPlaceholder');
              if (img && placeholder) {
                img.src = e.target.result;
                img.style.display = 'block';
                placeholder.style.display = 'none';
              }
            };
            reader.readAsDataURL(input.files[0]);
          }
        }

        function openDetailsModal(item) {
          document.getElementById('detFilename').value = item.filename;
          document.getElementById('detFilenameTxt').innerText = item.filename;
          document.getElementById('detSizeTxt').innerText = item.sizeMb + ' MB • ' + item.ext;
          document.getElementById('detStreamUrlTxt').innerText = item.uri || ('http://192.168.31.39:8085' + item.downloadUrl);
          document.getElementById('detNameInput').value = item.name || '';
          document.getElementById('detUploaderInput').value = item.uploader || '@admin_creator';
          document.getElementById('detCategorySelect').value = item.category || 'AVATAR';
          document.getElementById('detGenderSelect').value = item.gender_target || 'UNISEX';
          document.getElementById('detPriceInput').value = item.diamondPrice || item.diamond_price || 590;
          document.getElementById('detOrigPriceInput').value = item.original_price || (item.diamondPrice ? item.diamondPrice * 2 : 1180);
          document.getElementById('detDiscountInput').value = item.discount_percent || '50% OFF';
          document.getElementById('detStatusSelect').value = item.status || 'APPROVED';
          document.getElementById('detDescInput').value = item.description || '3D Asset Model hosted in VOEXI Vault.';

          const img = document.getElementById('detThumbImgPreview');
          const placeholder = document.getElementById('detThumbPlaceholder');
          if (item.thumbUrl) {
            if (img) { img.src = item.thumbUrl; img.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
          } else {
            if (img) img.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
          }

          autoCalculateDiscountMath();
          document.getElementById('detailsModal').style.display = 'flex';
        }

        function closeDetailsModal() {
          document.getElementById('detailsModal').style.display = 'none';
        }

        function copyStreamUrl() {
          const url = document.getElementById('detStreamUrlTxt').innerText;
          navigator.clipboard.writeText(url).then(() => showToast('📋 Copied Stream URL!'));
        }

        async function saveAssetDetails() {
          const filename = document.getElementById('detFilename').value;
          const name = document.getElementById('detNameInput').value.trim();
          const uploader = document.getElementById('detUploaderInput').value.trim();
          const category = document.getElementById('detCategorySelect').value;
          const gender_target = document.getElementById('detGenderSelect').value;
          const diamond_price = document.getElementById('detPriceInput').value;
          const original_price = document.getElementById('detOrigPriceInput').value;
          const discount_percent = document.getElementById('detDiscountInput').value.trim();
          const status = document.getElementById('detStatusSelect').value;
          const description = document.getElementById('detDescInput').value.trim();
          const imgInput = document.getElementById('detImageInput');

          try {
            // 1. Upload custom cover image thumbnail if selected
            if (imgInput && imgInput.files && imgInput.files[0]) {
              const file = imgInput.files[0];
              const ext = file.name.split('.').pop().toLowerCase() || 'jpeg';
              showToast('⏳ Uploading Cover Thumbnail...');

              await fetch('/api/upload-image?modelFileName=' + encodeURIComponent(filename), {
                method: 'POST',
                headers: { 'x-image-ext': ext },
                body: file
              });
            }

            // 2. Save metadata properties
            const res = await fetch('/api/v1/admin/assets/' + encodeURIComponent(filename), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, uploader, category, gender_target, diamond_price, original_price, discount_percent, status, description })
            });
            const data = await res.json();
            if (data.success) {
              showToast('💾 Saved Properties & Cover Image for ' + name);
              closeDetailsModal();
              setTimeout(() => location.reload(), 800);
            } else {
              alert('Error: ' + data.error);
            }
          } catch(e) {
            alert('Failed to save asset properties: ' + e.message);
          }
        }

        function setFilter(cat, btn) {
          currentFilter = cat;
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          filterAssets();
        }

        function filterAssets() {
          const query = document.getElementById('searchInput').value.toLowerCase().trim();
          document.querySelectorAll('.asset-card').forEach(card => {
            const cardCat = card.getAttribute('data-cat');
            const searchStr = card.getAttribute('data-search');

            const matchesCat = (currentFilter === 'ALL') || (currentFilter === cardCat);
            const matchesQuery = !query || searchStr.includes(query);

            if (matchesCat && matchesQuery) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          });
        }

        function openUploadModal() {
          document.getElementById('uploadModal').style.display = 'flex';
        }

        function closeUploadModal() {
          document.getElementById('uploadModal').style.display = 'none';
        }

        function openFull3DModal(stageUrl, modelName) {
          const modal = document.getElementById('full3DStageModal');
          const iframe = document.getElementById('full3DIframe');
          const title = document.getElementById('full3DModalTitle');
          if (modal && iframe) {
            iframe.src = stageUrl;
            if (title) title.innerText = '🖥️ 3D STAGE: ' + decodeURIComponent(modelName);
            modal.style.display = 'flex';
          }
        }

        function closeFull3DModal() {
          const modal = document.getElementById('full3DStageModal');
          const iframe = document.getElementById('full3DIframe');
          if (modal) modal.style.display = 'none';
          if (iframe) iframe.src = '';
        }

        async function submitUpload() {
          const input = document.getElementById('modalFileInput');
          const prog = document.getElementById('uploadProgress');
          if (!input.files || input.files.length === 0) {
            alert('Please select a 3D model file (.glb / .fbx)!');
            return;
          }

          const file = input.files[0];
          prog.innerText = '⏳ Uploading ' + file.name + ' (' + (file.size / (1024*1024)).toFixed(1) + ' MB)...';

          try {
            const res = await fetch('/api/v1/assets/upload?fileName=' + encodeURIComponent(file.name), {
              method: 'POST',
              body: file
            });
            const data = await res.json();
            if (data.success) {
              prog.innerText = '✅ Upload Complete!';
              showToast('Uploaded ' + file.name);
              setTimeout(() => location.reload(), 800);
            } else {
              prog.innerText = '❌ Error: ' + data.error;
            }
          } catch (e) {
            prog.innerText = '❌ Failed: ' + e.message;
          }
        }

        async function deleteFile(fileName) {
          if (!confirm('Delete 3D asset ' + decodeURIComponent(fileName) + ' from vault?')) return;
          try {
            const res = await fetch('/api/models/' + fileName, { method: 'DELETE' });
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
  `.replace('<!-- GRID_PLACEHOLDER -->', assetCardsGridHtml).replace('<!-- EMPTY_PLACEHOLDER -->', emptyMessageHtml);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(fullHtml);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'VOEXI Simple Direct 3D Avatar Media Server',
    port: 8085,
    timestamp: new Date().toISOString()
  });
});

const PORT = 8085;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 VOEXI SIMPLE DIRECT 3D MEDIA SERVER PORT ${PORT}`);
  console.log(`🌐 Web Dashboard: http://192.168.31.39:${PORT}`);
  console.log(`🎭 WebGL 3D Stage: http://192.168.31.39:${PORT}/avatar/web/stage.html`);
  console.log(`==================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n==================================================`);
    console.log(`🚀 VOEXI 3D SERVER IS ALREADY RUNNING & LIVE ON PORT ${PORT}`);
    console.log(`🌐 Web Dashboard: http://192.168.31.39:${PORT}`);
    console.log(`==================================================\n`);
  } else {
    console.error('3D Server error:', err);
  }
});
