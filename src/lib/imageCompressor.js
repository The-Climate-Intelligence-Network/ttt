/**
 * Compresses an image file below a specific size limit (default 1MB).
 * Converts the image to JPEG format and dynamically reduces resolution and quality if needed.
 * 
 * @param {File} file - The original image file.
 * @param {number} maxSizeBytes - Maximum size limit in bytes (default 1MB).
 * @returns {Promise<File>} Compressed File object.
 */
export async function compressImage(file, maxSizeBytes = 1024 * 1024) {
  // If the file is already small enough, we can return it directly.
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Downscale dimensions if the image is extremely large (max 1920px)
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;

        const getBlob = (q) => {
          return new Promise((res) => {
            canvas.toBlob((blob) => {
              res(blob);
            }, 'image/jpeg', q);
          });
        };

        const tryCompress = async (q) => {
          const blob = await getBlob(q);
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }
          
          console.log(`Image compression pass: quality=${q.toFixed(2)}, size=${(blob.size / 1024 / 1024).toFixed(2)} MB`);
          
          if (blob.size <= maxSizeBytes || q <= 0.1) {
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          } else {
            // Decelerate quality recursively
            await tryCompress(q - 0.15);
          }
        };

        tryCompress(quality).catch(reject);
      };
      
      img.onerror = (err) => reject(new Error('Failed to load image: ' + err.message));
    };
    
    reader.onerror = (err) => reject(new Error('Failed to read file: ' + err.message));
  });
}
