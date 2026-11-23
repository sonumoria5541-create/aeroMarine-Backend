import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of process.cwd()
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aeromarine',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_key_12345',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_67890',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'AeroMarine <onboarding@resend.dev>',
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@aeromarine.local',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@aeromarine.local',
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'INR',
  appMode: process.env.APP_MODE || 'DEMO',
  realMoneyEnabled: process.env.REAL_MONEY_ENABLED === 'true',
  complianceApproved: process.env.COMPLIANCE_APPROVED === 'true',
  uploadProvider: process.env.UPLOAD_PROVIDER || 'local',
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    url: process.env.CLOUDINARY_URL || '',
  },
};
