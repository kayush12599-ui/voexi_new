const CLOUD_NAME = 'dnskqvyvz';
const UPLOAD_PRESET = 'voexi_unsigned';

/**
 * VOEXI Cloudinary Engine
 * Supports Video, Audio, and Images with smart extension handling.
 */
export const uploadToCloudinary = (
  uri: string,
  resourceType: 'image' | 'video' | 'audio' | 'auto' = 'auto',
  onProgress?: (percent: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    // Determine real resource type (Cloudinary uses 'video' for audio too)
    const isAudio = resourceType === 'audio' || uri.toLowerCase().endsWith('.m4a') || uri.toLowerCase().endsWith('.mp3');
    const actualResourceType = (resourceType === 'image') ? 'image' : 'video';

    formData.append('file', {
      uri: uri,
      type: isAudio ? 'audio/mpeg' : (actualResourceType === 'video' ? 'video/mp4' : 'image/jpeg'),
      name: `upload_${Date.now()}.${isAudio ? 'm4a' : (actualResourceType === 'video' ? 'mp4' : 'jpg')}`,
    } as any);

    formData.append('upload_preset', UPLOAD_PRESET.trim());

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        let finalUrl = data.secure_url;

        // Apply transformations ONLY for real videos, not audio
        if (actualResourceType === 'video' && !isAudio) {
           finalUrl = finalUrl.replace('/video/upload/', '/video/upload/q_auto,vc_h264/');
           if (!finalUrl.toLowerCase().endsWith('.mp4')) {
             finalUrl += '.mp4';
           }
        }

        console.log("✅ Cloudinary Final URL:", finalUrl);
        resolve(finalUrl);
      } else {
        const error = JSON.parse(xhr.responseText);
        reject(new Error(error.error?.message || 'Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};
