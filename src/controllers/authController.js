import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { config } from '../config/env.js';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.jwtAccessSecret, { expiresIn: '30d' });
};

const setTokenCookie = (res, token) => {
  res.cookie('aeromarine_token', token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
    domain: config.cookieDomain || undefined,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const login = async (req, res) => {
  try {
    const rawPhone = (req.body.phone || req.body.mobile || '').toString().trim();
    const phone = rawPhone.replace(/\D/g, '').slice(-10); // Extract clean 10-digit phone
    const { password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ status: 'failed', message: 'Missing mobile number or password' });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ status: 'failed', message: 'Please enter a valid 10-digit mobile number' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ status: 'failed', message: 'Invalid phone number or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ status: 'failed', message: 'Invalid phone number or password' });
    }

    const token = generateToken(user._id, user.role);
    setTokenCookie(res, token);

    return res.json({
      status: 'success',
      message: 'Login Successful! Redirecting...',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ status: 'failed', message: 'Internal server error during login' });
  }
};

export const register = async (req, res) => {
  try {
    const rawPhone = (req.body.phone || req.body.mobile || '').toString().trim();
    const phone = rawPhone.replace(/\D/g, '').slice(-10);
    const { password, inviteCode } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ status: 'failed', message: 'Please provide mobile number and password' });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ status: 'failed', message: 'Phone number must be exactly 10 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ status: 'failed', message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ status: 'failed', message: 'Phone number is already registered. Please login.' });
    }

    // Verify inviter if code provided
    let referrerCode = null;
    if (inviteCode && inviteCode.toString().trim()) {
      const referrer = await User.findOne({ inviteCode: inviteCode.toString().trim() });
      if (referrer) {
        referrerCode = referrer.inviteCode;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      phone,
      password: hashedPassword,
      invitedBy: referrerCode,
      wallet: {
        availableBalance: 0,
        rechargeBalance: 0,
        totalIncome: 0,
        totalWithdrawn: 0,
      },
      spinsLeft: 1,
    });

    await newUser.save();

    const token = generateToken(newUser._id, newUser.role);
    setTokenCookie(res, token);

    return res.status(201).json({
      status: 'success',
      message: 'Registration Successful! Redirecting...',
      token,
      user: newUser.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ status: 'failed', message: 'Internal server error during registration' });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.json({
      status: 'success',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error retrieving profile' });
  }
};

export const updateBank = async (req, res) => {
  try {
    const { realName, ifsc, accountNumber } = req.body;

    if (!realName || !ifsc || !accountNumber) {
      return res.status(400).json({ status: 'failed', message: 'Please fill in real name, IFSC code, and account number.' });
    }

    const cleanRealName = realName.toString().trim().slice(0, 100);
    const cleanIfsc = ifsc.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    const cleanAccount = accountNumber.toString().trim().replace(/[^0-9]/g, '').slice(0, 30);

    if (cleanAccount.length < 8) {
      return res.status(400).json({ status: 'failed', message: 'Bank account number must be at least 8 digits' });
    }

    if (cleanIfsc.length !== 11) {
      return res.status(400).json({ status: 'failed', message: 'IFSC code must be exactly 11 characters (e.g., HDFC0001234)' });
    }

    req.user.bankAccount = {
      realName: cleanRealName,
      ifsc: cleanIfsc,
      accountNumber: cleanAccount,
      isBound: true,
    };

    await req.user.save();

    return res.json({
      status: 'success',
      message: 'Bank details saved successfully',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Auth] Bank update error:', error);
    return res.status(500).json({ status: 'failed', message: 'Error saving bank details' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'failed', message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ status: 'failed', message: 'New password must be at least 6 characters' });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ status: 'failed', message: 'Current password is incorrect' });
    }

    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    return res.json({
      status: 'success',
      message: 'Password updated successfully',
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error updating password' });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    if (avatar && typeof avatar === 'string') {
      req.user.avatar = avatar.slice(0, 20);
      await req.user.save();
    }
    return res.json({
      status: 'success',
      message: 'Avatar updated',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ status: 'failed', message: 'Error saving avatar' });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('aeromarine_token', {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
    domain: config.cookieDomain || undefined,
  });
  return res.json({ status: 'success', message: 'Logged out successfully' });
};
