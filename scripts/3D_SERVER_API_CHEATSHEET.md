# 🚀 VOEXI 3D Avatar Server REST API V1 Cheatsheet

**Server Base URL**: `http://192.168.31.39:8085` (or `http://localhost:8085`)

---

## 1. 📤 Upload 3D Asset API (`POST /api/v1/assets/upload`)
Uploads a 3D model (`.glb`, `.fbx`, `.gltf`) directly to the server storage bucket and records it in the 3D Vault database.

### Request:
- **URL**: `http://192.168.31.39:8085/api/v1/assets/upload`
- **Method**: `POST`
- **Query Parameters**:
  - `fileName`: Name of the file (e.g., `CyberPants.glb` or `Capoeira.fbx`)
  - `itemName`: Custom Display Name (e.g., `Cyber Neon Pants`)
  - `category`: Category (`EMOTES`, `AVATAR`, `SHIRTS`, `PANTS`, `HAIR`, `GEAR`, `SHOES`, `SOCKS`, `BUNDLES`)
  - `diamonds`: Diamond Cost (e.g., `590`)
  - `creator`: Creator Handle (e.g., `@admin_staff`)
- **Body**: Binary 3D File Stream / Blob

### Example JavaScript (`fetch`):
```javascript
async function upload3DModel(file, itemName, category, diamonds) {
  const url = `http://192.168.31.39:8085/api/v1/assets/upload?fileName=${encodeURIComponent(file.name)}&itemName=${encodeURIComponent(itemName)}&category=${encodeURIComponent(category)}&diamonds=${encodeURIComponent(diamonds)}`;

  const response = await fetch(url, {
    method: 'POST',
    body: file
  });

  const data = await response.json();
  console.log("Uploaded 3D Asset:", data);
}
```

---

## 2. 🖼️ Upload Thumbnail Image API (`POST /api/upload-image`)
Saves a `.png` / `.jpg` preview thumbnail image for an uploaded 3D asset file.

### Request:
- **URL**: `http://192.168.31.39:8085/api/upload-image?modelFileName=CyberPants.glb`
- **Method**: `POST`
- **Headers**:
  - `x-image-ext`: File Extension (`png`, `jpg`, `jpeg`, `webp`)
- **Body**: Binary Image File Stream / Blob

---

## 3. 📦 Get Approved Store Assets API (`GET /api/v1/assets`)
Returns all `APPROVED` assets for the Mobile App Store & Web Stage.

### Request:
- **URL**: `http://192.168.31.39:8085/api/v1/assets`
- **Method**: `GET`
- **Response**:
```json
{
  "success": true,
  "models": [
    {
      "id": "vx_1789922592840_584",
      "filename": "CyberPants.glb",
      "name": "Cyber Neon Pants",
      "type": "Pant",
      "category": "PANTS",
      "diamond_price": 590,
      "status": "APPROVED",
      "image": "http://192.168.31.39:8085/avatar/models/CyberPants.glb_thumb.png",
      "uri": "http://192.168.31.39:8085/avatar/models/CyberPants.glb",
      "sizeMb": "15.4"
    }
  ]
}
```

---

## 4. 👑 Admin Moderation Assets List API (`GET /api/v1/admin/assets`)
Returns ALL assets (Pending, Approved, Rejected) for the Admin Control Panel.

- **URL**: `http://192.168.31.39:8085/api/v1/admin/assets`
- **Method**: `GET`

---

## 5. ⚙️ Admin Update Asset Status & Price API (`PUT /api/v1/admin/assets/:id`)
Updates asset status or overrides Diamond price.

- **URL**: `http://192.168.31.39:8085/api/v1/admin/assets/vx_1789922592840_584`
- **Method**: `PUT`
- **JSON Body**:
```json
{
  "status": "APPROVED",
  "diamond_price": 1180
}
```

---

## 6. 🗑️ Purge & Delete Asset API (`DELETE /api/v1/admin/assets/:id`)
Purges the asset and thumbnail from disk storage bucket and database table.

- **URL**: `http://192.168.31.39:8085/api/v1/admin/assets/vx_1789922592840_584`
- **Method**: `DELETE`

---

## 7. 🔄 Storage Sync API (`GET /api/sync`)
Syncs Port 8080 (`media_server_storage`) and Port 8085 (`avatar/models`).

- **URL**: `http://192.168.31.39:8085/api/sync`
- **Method**: `GET`
