import { v2 as cloudinary } from 'cloudinary';
import { config } from './env.js';
import fs from 'fs';
import path from 'path';

export const isCloudinaryConfigured = () => {
  return Boolean(
    config.cloudinary.url ||
    (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret)
  );
};

// Initialize Cloudinary if credentials exist
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Upload image buffer to Cloudinary with local disk fallback
 * @param {Buffer} fileBuffer - The uploaded file buffer from multer memory storage
 * @param {string} originalName - Original filename
 * @returns {Promise<{ url: string, publicId: string, provider: 'cloudinary' | 'local' }>}
 */
export const uploadPaymentProofToCloudinary = async (fileBuffer, originalName = 'screenshot.jpg') => {
  // If user has provided Cloudinary keys, upload to Cloudinary
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'aeromarine/deposit_proofs',
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary] Upload stream error:', error);
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              provider: 'cloudinary',
            });
          }
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  // Graceful local fallback if Cloudinary keys have not yet been pasted by user
  console.warn('[Storage Notice] Cloudinary keys not detected. Storing receipt in local uploads folder.');
  const uploadsDir = path.join(process.cwd(), 'uploads/deposits');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = path.extname(originalName) || '.jpg';
  const filename = `proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(uploadsDir, filename);

  await fs.promises.writeFile(filePath, fileBuffer);
  const localUrl = `/uploads/deposits/${filename}`;

  return {
    url: localUrl,
    publicId: filename,
    provider: 'local',
  };
};

export { cloudinary };
