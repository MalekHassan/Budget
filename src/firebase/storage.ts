import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Race a promise against a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timed out')), ms)
    ),
  ]);
}

/**
 * Compress an image file into a smaller JPEG base64 data URL.
 * Used as fallback when Firebase Storage upload fails (e.g. CORS on localhost).
 */
function compressToDataUrl(file: File, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a receipt image to Firebase Storage and return the download URL.
 * Falls back to a compressed base64 data URL if upload fails (e.g. CORS).
 */
export async function uploadReceiptImage(
  householdId: string,
  file: File
): Promise<string> {
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // Skip Storage on localhost (CORS blocked) — use base64 directly
  if (isLocalhost) {
    return compressToDataUrl(file);
  }

  // Try Firebase Storage on production
  try {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `receipts/${householdId}/${timestamp}.${ext}`;
    const storageRef = ref(storage, path);

    await withTimeout(uploadBytes(storageRef, file), 5000);
    return await getDownloadURL(storageRef);
  } catch {
    // Fallback: compress and return as base64 data URL
    return compressToDataUrl(file);
  }
}
