import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage for direct Cloudinary streaming & local fallback handling
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/heic',
    'image/heif',
  ];
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload a valid image screenshot (JPG, PNG, WebP).'), false);
  }
};

export const uploadPaymentProof = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: imageFileFilter,
});

const mediaFileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
  ];
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid media type. Supported formats: JPG, PNG, WebP, GIF, SVG, MP4, WebM'), false);
  }
};

export const uploadMediaFile = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: mediaFileFilter,
});
