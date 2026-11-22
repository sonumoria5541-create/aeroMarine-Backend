import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { getOrCreateWallet } from './ledgerService.js';

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

export const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  // Clean whitespace and dashes
  let cleaned = phone.replace(/[\s-]/g, '');
  if (!cleaned.startsWith('+')) {
    // If 10 digits Indian number, add +91
    if (cleaned.length === 10) {
      cleaned = `+91${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }
  return cleaned;
};

export const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'AM';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateTokens = async (user, req) => {
  // Access Token
  const accessToken = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      phone: user.phone,
    },
    config.jwtAccessSecret,
    { expiresIn: config.accessTokenTtl }
  );

  // Refresh Token
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawRefreshToken);

  const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1';
  const userAgent = req?.headers?.['user-agent'] || 'Browser';

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshSession.create({
    user: user._id,
    tokenHash,
    deviceLabel: userAgent.slice(0, 100),
    ipAddress,
    userAgent,
    expiresAt,
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

export const rotateRefreshToken = async (oldRawToken, req) => {
  const oldHash = hashToken(oldRawToken);
  const session = await RefreshSession.findOne({ tokenHash: oldHash });

  if (!session) {
    throw new Error('Invalid refresh session');
  }

  // Detect reuse attack
  if (session.isRevoked) {
    // Revoke all sessions for this user for security
    await RefreshSession.updateMany({ user: session.user }, { isRevoked: true, revokedAt: new Date() });
    throw new Error('Refresh token reuse detected. All sessions revoked.');
  }

  if (new Date() > session.expiresAt) {
    throw new Error('Refresh session expired');
  }

  // Mark old session as revoked
  session.isRevoked = true;
  session.revokedAt = new Date();
  await session.save();

  // Find user
  const user = await User.findById(session.user);
  if (!user || user.status !== 'active') {
    throw new Error('User account is inactive or suspended');
  }

  // Generate new tokens
  return await generateTokens(user, req);
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = config.env === 'production';

  // Access Token Cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  // Refresh Token Cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
};

export const clearAuthCookies = (res) => {
  const isProduction = config.env === 'production';
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
};
